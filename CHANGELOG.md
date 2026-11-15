# Lịch Sử Thay Đổi

## 0.6.0

Giai đoạn 1 của lộ trình tối ưu (`docs/strategy/danh-gia-va-dinh-huong.md`).

**Thêm mới**
- Subpath `@porbit/style/tailwind` cho Tailwind migration helper. Bản CDN `index-auto` chỉ còn lõi runtime: 31,4 KB → 21,4 KB gzip (−32%). Import từ `@porbit/style` vẫn có đủ API như cũ.
- `findClassConflicts`, `compactClassToken`, `compactClasses`: phát hiện hai class cùng đặt một property ở cùng media/layer/selector, và rút gọn token khi CSS không đổi (`ai[center]` → `aiC`, `h[40px]` → `h40px`, `bgc#ffffff` → `bgc#fff`).
- Tuỳ chọn `compact` cho `convertTailwindClasses`. Trên 5 chuỗi mẫu, output từ dài hơn Tailwind 2,2% thành ngắn hơn 4,6%.
- Tool MCP `fix_classes`: tự sửa `df` → `dF`, `fz14px` → `fns14px`, `hover:cRed` → `cRed@:hover`, `op0.5` → `opc0.5`, kèm danh sách class không sửa được và xung đột. `explain_class` trả thêm `suggestion` và `conflicts`; `convert_tailwind` mặc định rút gọn.

**Sửa lỗi**
- `transition`, `transition-colors/opacity/shadow/transform/all/none`, `transition-[...]`, `transition-discrete` đổi chính xác (property + 150ms + easing mặc định của Tailwind), không còn thành `transition: 0.2s` áp cho mọi property. `duration-*`/`ease-*` đứng ở vị trí bất kỳ đều thay mặc định.
- `border` kèm màu viền (`border border-slate-200`) không còn sinh hai class cùng đặt `border-color`, vốn khiến màu viền phụ thuộc thứ tự class xuất hiện trên trang.

**Thay đổi hành vi cần biết**
- Tailwind helper: `transition` không còn nằm trong `approximateConverted`/`reviewRequired`; nhóm `motion-basic` chuyển từ `partial` sang `exact`.
- Tailwind helper: `bdcCurrentColor` bị bỏ khi chuỗi có màu viền rõ ràng cùng media/layer/selector.
- Xung đột do người viết tạo (`p-4 p-2`) được giữ nguyên nhưng thêm cảnh báo vào `warnings`.


## 0.5.0

**Thêm mới**
- Bộ component mẫu `@porbit/style/components`: hàm `recipe()` (variant, compound variant, default, memo) và recipe cho button, badge, card, form, alert, avatar, navbar, tabs, table, modal, progress, skeleton, spinner, breadcrumb, pagination, tooltip, container, stack, grid. Theme bằng token `--ps-*` với `createComponentTheme()` (sáng/tối, `darkMode: 'media' | 'class'`). Trang demo `demo/components.html`.
- MCP server không phụ thuộc thư viện ngoài: `npx -y @porbit/style mcp`. Tool `explain_class`, `generate_css`, `extract_css`, `lookup_dictionary`, `convert_tailwind`, `list_components`, `get_component`, `get_theme`; resource tài liệu và prompt `build_ui`.
- Lệnh `presence-style mcp-config [client]` in cấu hình cài cho Claude Code, Claude Desktop, Codex, Cursor, VS Code, Windsurf, Gemini CLI, Cline, Zed, opencode.
- Hướng dẫn `docs/guides/components.md`, `docs/guides/mcp.md`; README bổ sung lệnh cài pnpm/yarn/bun.

**Hiệu năng**
- Mỗi cặp (class nguồn, tên class xuất) chỉ dựng rule một lần cho mỗi engine; lần gặp sau bỏ qua toàn bộ parse, dựng chuỗi rule và tra Set.
- `clsx()` memo theo chuỗi đầu vào và không phát sự kiện/microtask khi mọi class đã có CSS.
- Không còn ghi thử `localStorage` khi khởi tạo engine nếu chưa bật `cache.loadOnInit`.
- Đo trên Chromium (3.000 node, 20 class/node): quét DOM lần đầu ~40–68 ms → ~20–27 ms; 20.000 lần `clsx` ~180–270 ms → ~40–97 ms. Burst 2.000 node mới không đổi đáng kể (chi phí chủ yếu ở layout của trình duyệt).

**Sửa lỗi**
- `buildCss()` và `exportCache()` ném `SecurityError` khi trình duyệt chặn truy cập `localStorage` (iframe sandbox, `about:blank`, chặn bộ nhớ trang).
- Tài liệu thiết kế nhanh ghi alias `max-height` là `mah`; alias đúng là `mh`.


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
