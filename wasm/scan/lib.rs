//! Bộ quét class ứng viên theo byte cho build tĩnh trên Node (biên dịch ra WASM, nhúng vào
//! `src/scan-wasm-generated.ts`; dựng lại: `node scripts/gen-scan-wasm.mjs`).
//!
//! Cùng kết quả — cùng tập, cùng thứ tự — với `createScanner` của `src/scan.ts` (và `extractCandidates` của
//! `src/extract.ts`) chạy trên chuỗi `readFileSync(file, 'utf8')`, nhưng quét thẳng trên byte UTF-8 của file:
//!   - mọi ký tự cú pháp (nháy, ngoặc, `class=`, ký tự token) là ASCII; byte >= 0x80 không bao giờ là ký tự token;
//!   - khoảng trắng Unicode của `\s` (U+00A0, U+1680, U+2000–200A, U+2028/2029, U+202F, U+205F, U+3000, U+FEFF) nhận
//!     theo dãy byte UTF-8 của chúng; byte ASCII không bao giờ bị nuốt vào dãy nhiều byte khi giải mã (kể cả dãy
//!     hỏng, thay bằng U+FFFD), byte đầu của các dãy trên không bao giờ là byte nối tiếp — nên vị trí cú pháp, khoảng
//!     trắng và ranh giới token trùng với bản chuỗi;
//!   - token bắt đầu và kết thúc ở byte ASCII: giải mã riêng dãy byte của token cho đúng chuỗi con tương ứng; token
//!     dài >= 2 byte khi và chỉ khi dài >= 2 đơn vị UTF-16 (ký tự đầu là ASCII).
//! Nhanh nhờ tìm dấu nháy/xuống dòng/`class` bằng SIMD (16 byte một lần), băm theo từ 8 byte, ghi nhớ theo nội dung
//! chuỗi (như bản JS) và bảng intern token dùng chung giữa các file.
//!
//! Giao diện (mọi số là u32): JS đọc file thẳng vào vùng `input_ptr(len)`, gọi `scan(len)`, đọc `count` số hiệu
//! token ở `out_ptr()` và `fresh_len()` số hiệu ở `fresh_ptr()` (token chưa gặp trong lượt từ `begin()`). Token mới
//! (số hiệu từ số token cũ tới `token_count()`) đọc ở `token_table()` (cặp vị trí đầu, độ dài trong `token_bytes()`).
//! Vùng nhớ có thể lớn lên sau mỗi lần gọi: JS lấy lại view khi `memory.buffer` đổi.
#![no_std]
#![allow(static_mut_refs)]

use core::arch::wasm32::*;

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    unreachable()
}

/// Cấp phát tiến (bump) từ cuối vùng dữ liệu, lớn lên bằng `memory.grow`; vùng cũ khi nhân đôi bỏ đi (không đáng kể).
static mut HEAP_END: usize = 0;

unsafe fn alloc(bytes: usize) -> *mut u8 {
    extern "C" {
        static __heap_base: u8;
    }
    if HEAP_END == 0 {
        HEAP_END = &__heap_base as *const u8 as usize;
    }
    // Căn 16 byte; chừa 16 byte cuối để đọc SIMD/u64 quá cuối dữ liệu không ra ngoài bộ nhớ.
    let start = (HEAP_END + 15) & !15;
    let end = start + bytes + 16;
    let have = memory_size(0) * 65536;
    if end > have {
        let pages = (end - have + 65535) / 65536;
        if memory_grow(0, pages) == usize::MAX {
            unreachable()
        }
    }
    HEAP_END = end;
    start as *mut u8
}

struct Buf<T: Copy> {
    ptr: *mut T,
    len: usize,
    cap: usize,
}

impl<T: Copy> Buf<T> {
    const fn new() -> Self {
        Buf { ptr: core::ptr::null_mut(), len: 0, cap: 0 }
    }
    unsafe fn reserve(&mut self, total: usize) {
        if total <= self.cap {
            return;
        }
        let mut cap = if self.cap == 0 { 1024 } else { self.cap * 2 };
        while cap < total {
            cap *= 2;
        }
        let ptr = alloc(cap * core::mem::size_of::<T>()) as *mut T;
        if self.len > 0 {
            core::ptr::copy_nonoverlapping(self.ptr, ptr, self.len);
        }
        self.ptr = ptr;
        self.cap = cap;
    }
    /// Vùng mới `len` phần tử, giá trị 0.
    unsafe fn zeroed(&mut self, len: usize) {
        if len > self.cap {
            self.ptr = alloc(len * core::mem::size_of::<T>()) as *mut T;
            self.cap = len;
        }
        core::ptr::write_bytes(self.ptr as *mut u8, 0, len * core::mem::size_of::<T>());
        self.len = len;
    }
    #[inline(always)]
    unsafe fn push(&mut self, value: T) {
        if self.len == self.cap {
            self.reserve(self.len + 1);
        }
        *self.ptr.add(self.len) = value;
        self.len += 1;
    }
    #[inline(always)]
    unsafe fn get(&self, i: usize) -> T {
        *self.ptr.add(i)
    }
    #[inline(always)]
    unsafe fn set(&mut self, i: usize, value: T) {
        *self.ptr.add(i) = value
    }
}

static mut INPUT: Buf<u8> = Buf::new();
static mut OUT: Buf<u32> = Buf::new();
static mut FRESH: Buf<u32> = Buf::new();
/// Byte của mọi token (nối liền), và bảng (vị trí đầu, độ dài) theo số hiệu.
static mut BYTES: Buf<u8> = Buf::new();
static mut TABLE: Buf<u32> = Buf::new();
/// Bảng băm intern (địa chỉ mở): số hiệu + 1 (0 = trống) và giá trị băm.
static mut SLOTS: Buf<u32> = Buf::new();
static mut HASHES: Buf<u32> = Buf::new();
static mut MASK: usize = 0;
/// `MARKS[id] == CALL`: token đã có trong kết quả lần gọi hiện tại; `ROUNDS[id] == ROUND`: đã báo trong lượt.
static mut MARKS: Buf<u32> = Buf::new();
static mut ROUNDS: Buf<u32> = Buf::new();
static mut CALL: u32 = 0;
static mut ROUND: u32 = 1;
/// Vị trí dấu nháy mở của giá trị class không xuống dòng (lượt 2 bỏ qua chuỗi đó).
static mut SEEN: Buf<u32> = Buf::new();

/// Ghi nhớ theo nội dung chuỗi (giá trị class, chuỗi trích dẫn): HTML/JSX lặp lại rất nhiều chuỗi giống hệt nhau.
/// Mục k: `MEMO_ENTRY[5k..]` = (băm, vị trí nội dung trong MEMO_BYTES, độ dài, vị trí số hiệu trong MEMO_IDS, số lượng).
static mut MEMO_SLOTS: Buf<u32> = Buf::new();
static mut MEMO_MASK: usize = 0;
static mut MEMO_ENTRY: Buf<u32> = Buf::new();
static mut MEMO_BYTES: Buf<u8> = Buf::new();
static mut MEMO_IDS: Buf<u32> = Buf::new();
static mut RECORDING: bool = false;
const MEMO_MIN: usize = 16;
const MEMO_LIMIT: usize = 1 << 22;

/// 1 = ký tự đầu token ([A-Za-z0-9_]), 2 = ký tự thân token ([A-Za-z0-9_@:%#.;!()[\]/*+~<>=$&|^?'-]).
static CHAR: [u8; 256] = {
    let mut t = [0u8; 256];
    let mut c = 0;
    while c < 128 {
        let ch = c as u8;
        if ch.is_ascii_alphanumeric() || ch == b'_' {
            t[c] = 3;
        }
        c += 1;
    }
    let body = b"@:%#.;!()[]/*+~<>=$&|^?'-";
    let mut k = 0;
    while k < body.len() {
        t[body[k] as usize] = 2;
        k += 1;
    }
    t
};

/// Độ dài (byte) của khoảng trắng `\s` bắt đầu ở `i` (trong `[i, end)`), 0 nếu không phải.
#[inline(always)]
unsafe fn space_len(s: *const u8, i: usize, end: usize) -> usize {
    let c = *s.add(i);
    if c < 0x80 {
        return (c == 32 || (9..=13).contains(&c)) as usize;
    }
    let b1 = if i + 1 < end { *s.add(i + 1) } else { 0 };
    match c {
        0xc2 => (b1 == 0xa0) as usize * 2,
        0xe1 | 0xe2 | 0xe3 | 0xef => {
            if i + 2 >= end {
                return 0;
            }
            let b2 = *s.add(i + 2);
            let hit = match c {
                0xe1 => b1 == 0x9a && b2 == 0x80,
                0xe2 => (b1 == 0x80 && ((0x80..=0x8a).contains(&b2) || b2 == 0xa8 || b2 == 0xa9 || b2 == 0xaf)) || (b1 == 0x81 && b2 == 0x9f),
                0xe3 => b1 == 0x80 && b2 == 0x80,
                _ => b1 == 0xbb && b2 == 0xbf,
            };
            hit as usize * 3
        }
        _ => 0,
    }
}

/// Băm `s[start, end)` theo từ 8 byte (vùng nhớ luôn đọc được quá cuối 16 byte: xem `alloc`).
#[inline(always)]
unsafe fn hash_bytes(s: *const u8, start: usize, end: usize) -> u32 {
    const K: u64 = 0x9e37_79b9_7f4a_7c15;
    let mut h: u64 = (end - start) as u64;
    let mut i = start;
    while i + 8 <= end {
        let w = (s.add(i) as *const u64).read_unaligned();
        h = (h ^ w).wrapping_mul(K);
        h ^= h >> 32;
        i += 8;
    }
    if i < end {
        let w = (s.add(i) as *const u64).read_unaligned() & (u64::MAX >> (64 - 8 * (end - i)));
        h = (h ^ w).wrapping_mul(K);
        h ^= h >> 32;
    }
    h = h.wrapping_mul(K);
    (h >> 32) as u32
}

#[inline(always)]
unsafe fn same(a: *const u8, b: *const u8, len: usize) -> bool {
    let mut k = 0;
    while k + 8 <= len {
        if (a.add(k) as *const u64).read_unaligned() != (b.add(k) as *const u64).read_unaligned() {
            return false;
        }
        k += 8;
    }
    while k < len {
        if *a.add(k) != *b.add(k) {
            return false;
        }
        k += 1;
    }
    true
}

/// Vị trí đầu tiên của `ch` trong `s[from, n)`, hoặc `n`.
#[inline(always)]
unsafe fn find(s: *const u8, ch: u8, from: usize, n: usize) -> usize {
    let mut i = from;
    let needle = u8x16_splat(ch);
    while i + 16 <= n {
        let m = u8x16_bitmask(u8x16_eq(v128_load(s.add(i) as *const v128), needle));
        if m != 0 {
            return i + m.trailing_zeros() as usize;
        }
        i += 16;
    }
    while i < n && *s.add(i) != ch {
        i += 1;
    }
    i
}

/// Vị trí đầu tiên của `class` trong `s[from, n)`, hoặc `n`.
#[inline(always)]
unsafe fn find_class(s: *const u8, from: usize, n: usize) -> usize {
    let mut i = from;
    let c = u8x16_splat(b'c');
    let e = u8x16_splat(b's');
    while i + 20 <= n {
        let mut m = u8x16_bitmask(v128_and(u8x16_eq(v128_load(s.add(i) as *const v128), c), u8x16_eq(v128_load(s.add(i + 4) as *const v128), e))) as u32;
        while m != 0 {
            let at = i + m.trailing_zeros() as usize;
            if *s.add(at + 1) == b'l' && *s.add(at + 2) == b'a' && *s.add(at + 3) == b's' {
                return at;
            }
            m &= m - 1;
        }
        i += 16;
    }
    while i + 5 <= n {
        if *s.add(i) == b'c' && *s.add(i + 1) == b'l' && *s.add(i + 2) == b'a' && *s.add(i + 3) == b's' && *s.add(i + 4) == b's' {
            return i;
        }
        i += 1;
    }
    n
}

#[inline(always)]
unsafe fn take(id: u32) {
    let i = id as usize;
    if MARKS.get(i) != CALL {
        MARKS.set(i, CALL);
        OUT.push(id);
        if ROUNDS.get(i) != ROUND {
            ROUNDS.set(i, ROUND);
            FRESH.push(id);
        }
    }
}

#[inline(always)]
unsafe fn emit(id: u32) {
    if RECORDING {
        MEMO_IDS.push(id);
    }
    take(id);
}

unsafe fn grow_table() {
    let (old_slots, old_hashes, old_len) = (SLOTS.ptr, HASHES.ptr, SLOTS.len);
    let size = (MASK + 1) * 2;
    MASK = size - 1;
    // Vùng mới (không dùng lại vùng cũ: còn đọc).
    SLOTS = Buf::new();
    HASHES = Buf::new();
    SLOTS.zeroed(size);
    HASHES.zeroed(size);
    for i in 0..old_len {
        let v = *old_slots.add(i);
        if v == 0 {
            continue;
        }
        let h = *old_hashes.add(i);
        let mut slot = h as usize & MASK;
        while SLOTS.get(slot) != 0 {
            slot = (slot + 1) & MASK;
        }
        SLOTS.set(slot, v);
        HASHES.set(slot, h);
    }
}

/// Thêm token `s[start, end)` (bỏ đuôi cú pháp như `trimSourceSyntaxTail`).
unsafe fn add(s: *const u8, start: usize, mut end: usize) {
    while end > start {
        let ch = *s.add(end - 1);
        if ch == b'\'' {
            end -= 1;
            continue;
        }
        if ch == b')' || ch == b']' {
            let open = if ch == b')' { b'(' } else { b'[' };
            let mut depth: i32 = 0;
            for i in start..end {
                let c = *s.add(i);
                if c == open {
                    depth += 1
                } else if c == ch {
                    depth -= 1
                }
            }
            if depth < 0 {
                end -= 1;
                continue;
            }
        }
        break;
    }
    let length = end - start;
    if length < 2 {
        return;
    }
    let hash = hash_bytes(s, start, end);
    let mut slot = hash as usize & MASK;
    loop {
        let v = SLOTS.get(slot);
        if v == 0 {
            break;
        }
        if HASHES.get(slot) == hash {
            let id = (v - 1) as usize;
            if TABLE.get(id * 2 + 1) as usize == length && same(BYTES.ptr.add(TABLE.get(id * 2) as usize), s.add(start), length) {
                emit(v - 1);
                return;
            }
        }
        slot = (slot + 1) & MASK;
    }
    let id = (TABLE.len / 2) as u32;
    let at = BYTES.len;
    BYTES.reserve(at + length);
    core::ptr::copy_nonoverlapping(s.add(start), BYTES.ptr.add(at), length);
    BYTES.len = at + length;
    TABLE.push(at as u32);
    TABLE.push(length as u32);
    if id as usize >= MARKS.len {
        let n = MARKS.len * 2;
        let (old_marks, old_rounds, old) = (MARKS.ptr, ROUNDS.ptr, MARKS.len);
        MARKS = Buf::new();
        ROUNDS = Buf::new();
        MARKS.zeroed(n);
        ROUNDS.zeroed(n);
        core::ptr::copy_nonoverlapping(old_marks, MARKS.ptr, old);
        core::ptr::copy_nonoverlapping(old_rounds, ROUNDS.ptr, old);
    }
    SLOTS.set(slot, id + 1);
    HASHES.set(slot, hash);
    emit(id);
    if (id as usize + 1) * 2 > MASK {
        grow_table();
    }
}

/// Tách token trong `s[from, to)` như `text.match(CLASS_TOKEN_REGEX)`.
unsafe fn collect(s: *const u8, from: usize, to: usize) {
    let mut i = from;
    while i < to {
        if CHAR[*s.add(i) as usize] & 1 == 0 {
            i += 1;
            continue;
        }
        let start = i;
        i += 1;
        while i < to {
            let d = *s.add(i);
            if d == b'[' {
                // `\[[^\[\]\s"'`]*\]` trước; không đóng được thì `[` là một ký tự thân thường.
                let mut k = i + 1;
                while k < to {
                    let e = *s.add(k);
                    if e == b'[' || e == b']' || e == b'"' || e == b'\'' || e == b'`' {
                        break;
                    }
                    if (e <= 32 || e >= 0xc2) && space_len(s, k, to) > 0 {
                        break;
                    }
                    k += 1;
                }
                i = if k < to && *s.add(k) == b']' { k + 1 } else { i + 1 };
                continue;
            }
            if CHAR[d as usize] & 2 != 0 {
                i += 1;
                continue;
            }
            break;
        }
        add(s, start, i);
    }
}

unsafe fn memo_reset() {
    MEMO_MASK = 4095;
    MEMO_SLOTS.zeroed(MEMO_MASK + 1);
    MEMO_ENTRY.len = 0;
    MEMO_BYTES.len = 0;
    MEMO_IDS.len = 0;
}

/// Như `collect`, qua bộ ghi nhớ theo nội dung cho chuỗi đủ dài.
unsafe fn collect_memo(s: *const u8, from: usize, to: usize) {
    let length = to - from;
    if length < MEMO_MIN {
        collect(s, from, to);
        return;
    }
    let hash = hash_bytes(s, from, to);
    let mut slot = hash as usize & MEMO_MASK;
    loop {
        let v = MEMO_SLOTS.get(slot);
        if v == 0 {
            break;
        }
        let e = (v - 1) as usize * 5;
        if MEMO_ENTRY.get(e) == hash && MEMO_ENTRY.get(e + 2) as usize == length && same(MEMO_BYTES.ptr.add(MEMO_ENTRY.get(e + 1) as usize), s.add(from), length) {
            let at = MEMO_ENTRY.get(e + 3) as usize;
            let count = MEMO_ENTRY.get(e + 4) as usize;
            for k in at..at + count {
                take(MEMO_IDS.get(k));
            }
            return;
        }
        slot = (slot + 1) & MEMO_MASK;
    }
    // Giới hạn bộ nhớ (tiến trình watch chạy lâu): quá ~4 MB nội dung thì bắt đầu lại.
    if MEMO_BYTES.len + length > MEMO_LIMIT {
        memo_reset();
        slot = hash as usize & MEMO_MASK;
    }
    let ids_at = MEMO_IDS.len;
    RECORDING = true;
    collect(s, from, to);
    RECORDING = false;
    let at = MEMO_BYTES.len;
    MEMO_BYTES.reserve(at + length);
    core::ptr::copy_nonoverlapping(s.add(from), MEMO_BYTES.ptr.add(at), length);
    MEMO_BYTES.len = at + length;
    let index = MEMO_ENTRY.len / 5;
    MEMO_ENTRY.push(hash);
    MEMO_ENTRY.push(at as u32);
    MEMO_ENTRY.push(length as u32);
    MEMO_ENTRY.push(ids_at as u32);
    MEMO_ENTRY.push((MEMO_IDS.len - ids_at) as u32);
    // `collect` không đụng bảng ghi nhớ: `slot` vẫn là ô trống đầu tiên của chuỗi dò.
    MEMO_SLOTS.set(slot, index as u32 + 1);
    if (index + 1) * 2 > MEMO_MASK {
        let (old, old_len) = (MEMO_SLOTS.ptr, MEMO_SLOTS.len);
        MEMO_MASK = (MEMO_MASK + 1) * 2 - 1;
        MEMO_SLOTS = Buf::new();
        MEMO_SLOTS.zeroed(MEMO_MASK + 1);
        for i in 0..old_len {
            let v = *old.add(i);
            if v == 0 {
                continue;
            }
            let mut slot = MEMO_ENTRY.get((v - 1) as usize * 5) as usize & MEMO_MASK;
            while MEMO_SLOTS.get(slot) != 0 {
                slot = (slot + 1) & MEMO_MASK;
            }
            MEMO_SLOTS.set(slot, v);
        }
    }
}

#[inline(always)]
unsafe fn skip_spaces(s: *const u8, mut j: usize, n: usize) -> usize {
    while j < n {
        let len = space_len(s, j, n);
        if len == 0 {
            break;
        }
        j += len;
    }
    j
}

unsafe fn run(s: *const u8, n: usize) {
    SEEN.len = 0;
    // 1) Vùng class/className: /(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}|`([^`]*)`)/g
    // (thử `class` trước rồi mới `className` ở cùng vị trí).
    let mut newline: usize = 0;
    let mut has_newline = false;
    let mut pos = 0usize;
    loop {
        let at = find_class(s, pos, n);
        if at >= n {
            break;
        }
        pos = at + 1;
        for alt in 0..2 {
            let mut j = at + 5;
            if alt == 1 {
                if !(j + 4 <= n && *s.add(j) == b'N' && *s.add(j + 1) == b'a' && *s.add(j + 2) == b'm' && *s.add(j + 3) == b'e') {
                    break;
                }
                j += 4;
            }
            j = skip_spaces(s, j, n);
            if j >= n || *s.add(j) != b'=' {
                continue;
            }
            j = skip_spaces(s, j + 1, n);
            if j >= n {
                continue;
            }
            let open = *s.add(j);
            let close_ch = match open {
                b'"' => b'"',
                b'\'' => b'\'',
                b'{' => b'}',
                b'`' => b'`',
                _ => continue,
            };
            let close = find(s, close_ch, j + 1, n);
            if close >= n {
                continue;
            }
            collect_memo(s, j + 1, close);
            if open != b'{' {
                if !has_newline || newline < j {
                    newline = find(s, b'\n', j, n);
                    has_newline = true;
                }
                if newline > close {
                    SEEN.push(j as u32);
                }
            }
            pos = close + 1;
            break;
        }
    }

    // 2) Mọi chuỗi trích dẫn trên một dòng: /"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g
    let mut seen_at = 0usize;
    let mut dq = find(s, b'"', 0, n);
    let mut sq = find(s, b'\'', 0, n);
    let mut bt = find(s, b'`', 0, n);
    let mut nl = find(s, b'\n', 0, n);
    loop {
        let q = if dq < sq { if dq < bt { dq } else { bt } } else if sq < bt { sq } else { bt };
        if q >= n {
            break;
        }
        let quote = *s.add(q);
        if nl < q {
            nl = find(s, b'\n', q + 1, n);
        }
        let close = find(s, quote, q + 1, n);
        let mut next = q + 1;
        if close < nl {
            while seen_at < SEEN.len && (SEEN.get(seen_at) as usize) < q {
                seen_at += 1;
            }
            if seen_at >= SEEN.len || SEEN.get(seen_at) as usize != q {
                collect_memo(s, q + 1, close);
            }
            next = close + 1;
        }
        // Dấu nháy kế tiếp của từng loại tính từ `next`; dấu đóng vừa tìm chính là dấu kế tiếp cùng loại.
        if dq < next {
            dq = if quote == b'"' && close >= next { close } else { find(s, b'"', next, n) };
        }
        if sq < next {
            sq = if quote == b'\'' && close >= next { close } else { find(s, b'\'', next, n) };
        }
        if bt < next {
            bt = if quote == b'`' && close >= next { close } else { find(s, b'`', next, n) };
        }
    }
}

/// Bảng intern làm lại từ đầu (số hiệu cũ hết nghĩa).
#[no_mangle]
pub unsafe extern "C" fn reset() {
    MASK = 4095;
    SLOTS.zeroed(MASK + 1);
    HASHES.zeroed(MASK + 1);
    MARKS.zeroed(4096);
    ROUNDS.zeroed(4096);
    TABLE.len = 0;
    BYTES.len = 0;
    CALL = 0;
    ROUND = 1;
    memo_reset();
}

/// Vùng nhận nội dung file (ít nhất `len` byte).
#[no_mangle]
pub unsafe extern "C" fn input_ptr(len: u32) -> u32 {
    if (len as usize) > INPUT.cap {
        INPUT.len = 0;
        INPUT.reserve(len as usize);
    }
    INPUT.ptr as u32
}

/// Bắt đầu một lượt mới (cho `fresh`).
#[no_mangle]
pub unsafe extern "C" fn begin() {
    ROUND += 1;
}

/// Quét `len` byte ở vùng nhận; trả số token (khác nhau, theo thứ tự xuất hiện đầu tiên) ở `out_ptr()`.
#[no_mangle]
pub unsafe extern "C" fn scan(len: u32) -> u32 {
    if MASK == 0 {
        reset();
    }
    CALL += 1;
    OUT.len = 0;
    FRESH.len = 0;
    OUT.reserve(256);
    FRESH.reserve(256);
    run(INPUT.ptr, len as usize);
    OUT.len as u32
}

#[no_mangle]
pub unsafe extern "C" fn out_ptr() -> u32 {
    OUT.ptr as u32
}
#[no_mangle]
pub unsafe extern "C" fn fresh_ptr() -> u32 {
    FRESH.ptr as u32
}
#[no_mangle]
pub unsafe extern "C" fn fresh_len() -> u32 {
    FRESH.len as u32
}
#[no_mangle]
pub unsafe extern "C" fn token_count() -> u32 {
    (TABLE.len / 2) as u32
}
#[no_mangle]
pub unsafe extern "C" fn token_table() -> u32 {
    TABLE.ptr as u32
}
#[no_mangle]
pub unsafe extern "C" fn token_bytes() -> u32 {
    BYTES.ptr as u32
}
/// Số lần gọi `scan` và số lượt từ lần `reset` (JS làm lại bảng trước khi bộ đếm tràn).
#[no_mangle]
pub unsafe extern "C" fn calls() -> u32 {
    CALL
}
#[no_mangle]
pub unsafe extern "C" fn rounds() -> u32 {
    ROUND
}
