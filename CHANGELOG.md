# Lịch Sử Thay Đổi

## 0.4.0

Mở rộng phạm vi biểu đạt: mọi khai báo CSS đều viết được thành một class.

**Thêm mới**
- Nhận tên đầy đủ của mọi property CSS chuẩn (`view-transition-name[hero]`, `content-visibility[auto]`), property có tiền tố nhà cung cấp (`-webkit-line-clamp[3]`) và custom property `--ten[gia-tri]`.
- `_` trong `[...]` là khoảng trắng: `w[calc(100%_-_2rem)]`. `\_` giữ dấu gạch dưới; chuỗi có nháy, `url(...)` và `attr(...)` được giữ nguyên.
- Số âm bắt đầu bằng dấu chấm: `m-.5rem`.
- Tailwind helper: `grid-cols-*`, `grid-rows-*`, `col-*`, `row-*`, vị trí phân số (`top-1/2`), `duration-*`, `delay-*`, `ease-*`, `scale-*`, `rotate-*`, `translate-x/y-*`, `blur-*`, `backdrop-blur-*`, `brightness-*`, `space-x/y-*`, `divide-x/y`, `border-t/r/b/l/x/y`, `line-clamp-*`, `sr-only`, màu có độ mờ (`bg-black/50`), giá trị tuỳ ý (`text-[14px]`, `z-[60]`, `bg-[url(...)]`), biến thể `group-*`, `peer-*`, `aria-*`, `data-[...]`, `[&…]`, `dark:`, `print:`. Tuỳ chọn `darkMode: 'media' | 'class'`.
- Hướng dẫn mới: `docs/guides/thiet-ke-nhanh.md`, `docs/guides/tu-vung-mo.md`; bảng alias chính tắc trong `DICTIONARY.md`.

**Sửa lỗi**
- `extract`, `extractFromClasses` và CLI báo `matched = 0` khi `hashClassName: false`.
- Trích xuất tĩnh và CLI sinh CSS thoát khỏi khối rule (`}`, `<`, `/*`, dấu `\` cuối, ngoặc hoặc nháy hở) nay bị từ chối.
- Token bóng đổ của Tailwind helper chứa khoảng trắng nên vỡ trong thuộc tính `class`.
- Bộ quét tĩnh không nhận dấu phẩy nằm trong `[...]`.
- Helper không còn âm thầm bỏ một media khi có hai media (`md:dark:`).
- 21 ví dụ trong `DICTIONARY.md` và 2 alias trong demo sinh giá trị mà trình duyệt từ chối; đã sửa và kiểm trên Chromium, Firefox, WebKit.
- `extractFromClasses` coi chuỗi có khoảng trắng là nhiều class, nên `matched` và `candidates` đúng theo từng class.
- `gen-spec` và `gen-rust-dict` không còn phụ thuộc đường dẫn ngoài repository.

**Lưu ý bảo mật**
- Thuộc tính `class` là đầu vào có quyền sinh CSS (ví dụ `bgi[url(//ten-mien-la/x)]` gây yêu cầu mạng). Không render `class` do người dùng cuối kiểm soát khi chưa lọc; xem mục "Bảo Mật Khi Dùng Với Nội Dung Không Tin Cậy" trong README.

**Thay đổi hành vi cần biết**
- Tailwind helper xuất `fnw*` (thay vì `fw*`) cho `font-*`.
- `duration-*`, `delay-*`, `ease-*`, `group-*`, `peer-*`, `dark:` trước đây được giữ nguyên/không hỗ trợ, nay được đổi.
- `--tenGiaTri` (custom property không có ngoặc vuông) bị từ chối vì mơ hồ với `prop--value`.

**Chưa kiểm chứng**
- Parity với engine Rust: 20 case mới trong `spec/conformance.core.json` chưa chạy trên Rust.

## 0.3.1
- Sửa `matched` khi tắt hash, chặn giá trị thoát khối rule khi trích xuất tĩnh, sửa token shadow của Tailwind helper, nhận dấu phẩy trong ngoặc vuông, làm rõ cascade layer.
