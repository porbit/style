/**
 * Bộ quét theo byte cho `scanFiles` (chỉ Node): đọc file thẳng vào bộ nhớ của module WASM (wasm/scan/lib.rs, nhúng
 * ở ./scan-wasm-generated) và quét trên byte UTF-8, không giải mã cả file thành chuỗi; chỉ token mới (lần đầu gặp
 * trong tiến trình) mới thành chuỗi JS. Cùng kết quả — cùng tập, cùng thứ tự — với `createScanner` của ./scan trên
 * `readFileSync(file, 'utf8')` (lý do: đầu wasm/scan/lib.rs; `tests/scan.test.ts` so trên mọi fixture, chuỗi ngẫu
 * nhiên và byte UTF-8 hỏng).
 *
 * Vì sao nhanh hơn bản JS ở build đầu (tiến trình mới): mã WASM đã biên dịch sẵn (không phải chờ JIT nóng lên), tìm
 * dấu nháy/`class` bằng SIMD, không cấp phát chuỗi cho từng file (ít việc cho GC), đọc file vào cùng một vùng nhớ.
 * Nạp module (~15 KB) chỉ khi `scanFiles` cần, đồng bộ (`new WebAssembly.Module`) — dưới 1 ms.
 *
 * Không có WebAssembly (hoặc SIMD), nạp lỗi, hay đặt `PRESENCE_STYLE_WASM=0`: trả null, `scanFiles` dùng bản JS.
 */
import { readFileSync, readSync } from 'node:fs'
import { SCAN_WASM } from './scan-wasm-generated'

interface Exports {
    memory: WebAssembly.Memory
    reset(): void
    input_ptr(len: number): number
    begin(): void
    scan(len: number): number
    out_ptr(): number
    fresh_ptr(): number
    fresh_len(): number
    token_count(): number
    token_table(): number
    token_bytes(): number
    calls(): number
    rounds(): number
}

export interface ByteScanner {
    begin(): void
    /**
     * Đọc file đang mở `fd` (`size` byte theo fstat, như `readFileSync(fd)`) và quét; số hiệu token ghi vào
     * `idArena()` từ vị trí `idStart()` (như `Scanner.ids`), token chưa gặp trong lượt thêm vào `fresh`. Trả số token.
     * Đọc lỗi (thư mục...): ném lỗi như `readFileSync`.
     */
    scanFd(fd: number, size: number, fresh: string[]): number
    /** Như `scanFd` cho nội dung có sẵn (byte UTF-8). */
    scanBuffer(content: Uint8Array, fresh: string[]): number
    idArena(): Int32Array
    idStart(): number
    token(id: number): string
    generation(): number
}

export const createByteScanner = (): ByteScanner | null => {
    const env = process.env.PRESENCE_STYLE_WASM
    if (env !== undefined && /^(0|false|off|no)$/i.test(env)) return null
    let w: Exports
    try {
        if (typeof WebAssembly !== 'object') return null
        w = new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(SCAN_WASM, 'base64')), {}).exports as unknown as Exports
    } catch (_error) {
        return null
    }
    // View trên bộ nhớ WASM; lấy lại khi bộ nhớ lớn lên (`memory.buffer` đổi, view cũ hết dùng được).
    let buffer = w.memory.buffer
    let bytes = Buffer.from(buffer)
    let words = new Int32Array(buffer)
    const refresh = (): void => {
        if (w.memory.buffer !== buffer) {
            buffer = w.memory.buffer
            bytes = Buffer.from(buffer)
            words = new Int32Array(buffer)
        }
    }
    let byId: string[] = []
    let gen = 0
    let arena = new Int32Array(0)
    let arenaUsed = 0

    /** Chuẩn bị một lần quét: làm lại bảng khi cần, trả vị trí vùng nhận (ít nhất `size` byte). */
    const prepare = (size: number): number => {
        // Bảng quá lớn (tiến trình watch chạy lâu, mã sinh token ngẫu nhiên) hoặc bộ đếm sắp tràn: làm lại từ đầu.
        if (byId.length > 1 << 19 || w.calls() > 1 << 30 || w.rounds() > 1 << 30) {
            w.reset()
            byId = []
            gen++
        }
        const at = w.input_ptr(size)
        refresh()
        return at
    }

    const scanFd = (fd: number, size: number, fresh: string[]): number => {
        if (size <= 0) {
            // Kích thước không biết trước (file đặc biệt, fstat báo 0): đọc hết như readFileSync rồi quét.
            return scanBuffer(readFileSync(fd), fresh)
        }
        // Như readFileSync(fd): đọc tới đủ `size` byte hoặc hết file.
        const at = prepare(size)
        let length = 0
        for (let n; length < size && (n = readSync(fd, bytes, at + length, size - length, null)) !== 0; ) length += n
        return finish(length, fresh)
    }

    const scanBuffer = (content: Uint8Array, fresh: string[]): number => {
        const at = prepare(content.length)
        bytes.set(content, at)
        return finish(content.length, fresh)
    }

    const finish = (length: number, fresh: string[]): number => {
        const count = w.scan(length)
        refresh()
        // Token mới: chuỗi (bản sao phẳng) từ byte UTF-8 của nó.
        const total = w.token_count()
        if (total > byId.length) {
            const table = w.token_table() >> 2
            const base = w.token_bytes()
            for (let id = byId.length; id < total; id++) {
                const start = base + words[table + id * 2]
                byId.push(bytes.toString('utf8', start, start + words[table + id * 2 + 1]))
            }
        }
        const freshAt = w.fresh_ptr() >> 2
        const freshEnd = freshAt + w.fresh_len()
        for (let k = freshAt; k < freshEnd; k++) fresh.push(byId[words[k]])
        if (arenaUsed + count > arena.length) {
            // Hết chỗ: vùng mới (vùng cũ vẫn đúng cho các mục đã trỏ vào nó).
            arena = new Int32Array(Math.max(1 << 16, count * 2))
            arenaUsed = 0
        }
        const out = w.out_ptr() >> 2
        arena.set(words.subarray(out, out + count), arenaUsed)
        arenaUsed += count
        return count
    }

    return {
        begin: () => w.begin(),
        scanFd,
        scanBuffer,
        idArena: () => arena,
        idStart: () => arenaUsed,
        token: (id: number): string => byId[id],
        generation: () => gen,
    }
}
