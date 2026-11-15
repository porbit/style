# Đánh Giá Và Định Hướng: PresenceStyle So Với Tailwind Và Các Framework CSS

Tài liệu này trả lời ba câu hỏi: PresenceStyle (`@porbit/style`) hơn và kém gì so với các lựa chọn hiện có, nên tối ưu tiếp theo hướng nào, và làm sao để người dùng lẫn agent AI chọn nó thay cho Tailwind trong đúng trường hợp. Số liệu đo trên bản 0.5.0; chỗ nào là nhận định chứ không phải đo lường đều ghi rõ.

## 1. Nhận Định Thị Trường (Nói Thẳng)

Tailwind **không** lỗi thời. Bản v4 (2025) viết lại engine bằng Rust, cấu hình bằng CSS, vẫn là lựa chọn mặc định của phần lớn dự án mới và là cú pháp mà các mô hình AI viết thành thạo nhất vì xuất hiện dày đặc trong dữ liệu huấn luyện. Thứ đang cũ đi là **các framework component đóng** (Bootstrap, Bulma, Foundation): giao diện na ná nhau, ghi đè khó, tuỳ biến phải chiến với framework.

Vì vậy định vị đúng cho PresenceStyle không phải "thay Tailwind ở mọi nơi", mà là **thắng rõ ở những chỗ Tailwind yếu về cấu trúc** và **không thua ở phần còn lại**. Định vị sai ("Tailwind đã chết") làm mất uy tín ngay với người đánh giá kỹ thuật.

## 2. Bảng So Sánh

| Tiêu chí | PresenceStyle 0.5 | Tailwind v4 | UnoCSS | StyleX / Panda | Bootstrap |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Sinh CSS | Runtime (observer) + trích xuất tĩnh | Build-time | Build-time, có chế độ runtime | Build-time | CSS dựng sẵn |
| Cần bước build | Không bắt buộc | Có | Không bắt buộc | Có | Không |
| JS runtime gửi tới trình duyệt | ~18 KB gzip (lõi), 31 KB bản CDN | 0 | 0 (build) | ~0 | Tuỳ plugin |
| Class sinh động lúc chạy (CMS, page builder, dữ liệu người dùng) | Có, tự động | Không (phải safelist) | Có ở chế độ runtime | Không | Không |
| Viết mọi property CSS không cần cấu hình | Có (từ vựng mở) | Phần lớn qua arbitrary value | Qua preset/rule | Có (object style) | Không |
| Thứ tự ưu tiên tường minh | Có (layer số `0–23` trong class) | Theo thứ tự sinh, `!` | Theo layer preset | Theo thứ tự merge | Specificity |
| Shadow DOM / Web Component | Có (adoptedStyleSheets theo root) | Thủ công | Thủ công | Thủ công | Thủ công |
| Độ dễ đọc class | Thấp hơn (`bdra8px`, `fnw600`) | Cao (`rounded-lg`, `font-semibold`) | Cao (tương thích Tailwind) | Cao (tên CSS) | Cao |
| AI viết đúng không cần hỗ trợ | Thấp | Rất cao | Cao | Trung bình | Rất cao |
| AI có công cụ tự kiểm tra (MCP) | Có, sẵn trong package | Không chính thức | Không | Không | Không |
| Hệ sinh thái (IntelliSense, Prettier, UI kit) | Mới bắt đầu | Rất lớn | Lớn | Trung bình | Rất lớn |

Đo trên bản 0.5.0 (Chromium, 3.000 node × 20 class): quét lần đầu ~20–27 ms; 20.000 lần `clsx` ~40–97 ms. Kích thước: lõi engine 18,3 KB gzip; bộ chuyển Tailwind 11,4 KB gzip; dictionary 5,3 KB; danh sách property chuẩn 2,7 KB; bộ component 6,8 KB.

## 3. Ưu Thế Thật Sự (Nơi Nên Chọn PresenceStyle)

1. **Giao diện do người dùng hoặc dữ liệu quyết định**: page builder, CMS, theme marketplace, email/landing page tạo động, nội dung từ API. Tailwind chỉ sinh CSS cho class nhìn thấy lúc build; PresenceStyle sinh cho mọi class xuất hiện lúc chạy.
2. **Không có bước build**: trang tĩnh, prototype, nhúng widget vào website bên thứ ba, môi trường chỉ có một thẻ `<script>`.
3. **Web Component / Shadow DOM**: mỗi shadow root có stylesheet riêng, không rò rỉ style.
4. **Mọi CSS là một class**: không phải sửa cấu hình để dùng `view-transition-name`, `content-visibility`, `-webkit-line-clamp`, custom property.
5. **Ưu tiên tường minh bằng layer**: `2bdra999px` thắng chắc chắn, không phụ thuộc thứ tự file như Tailwind/Bootstrap.
6. **Agent AI có vòng tự kiểm tra**: MCP `explain_class` trả lỗi và cách sửa ngay khi agent viết sai; đây là điểm khác biệt mà không framework nào kể trên đóng gói sẵn.

## 4. Điểm Yếu Cần Thừa Nhận

1. **Chi phí runtime**: 18–31 KB JS và thời gian parse ở client. Tailwind là 0. Với trang tĩnh nội dung cố định, đây là điểm thua thẳng.
2. **Độ dễ đọc**: alias ngắn (`bdra`, `fnw`, `oflyA`) tiết kiệm ký tự nhưng khó đọc với người mới và với reviewer; đổi lại không ngắn hơn Tailwind bao nhiêu (xem mục 5).
3. **AI chưa "biết" cú pháp**: không có trong dữ liệu huấn luyện, nên agent dễ nhầm `fz` với `fns`, `df` với `dF`, `hover:` với `@:hover`. Không có MCP thì tỉ lệ lỗi cao.
4. **Thứ tự rule theo lần xuất hiện đầu tiên**: hai class cùng property, cùng layer thì class xuất hiện sau **trên trang** thắng, không phải sau **trong thuộc tính**. Bộ component đã tránh bằng quy ước layer, nhưng người viết tay dễ dính.
5. **Kiểm tra ở Node không có `CSS.supports`**: trích xuất tĩnh không loại được giá trị sai ngữ nghĩa (`w100p`).
6. **Hệ sinh thái**: chưa có extension IntelliSense, plugin Prettier, plugin Vite; tài liệu chỉ có tiếng Việt; parity với engine Rust của 0.4–0.5 chưa kiểm chứng.

## 5. Phát Hiện Từ Số Liệu (Cần Xử Lý)

Chạy bộ chuyển Tailwind trên 5 chuỗi class phổ biến: tổng 460 ký tự Tailwind → 470 ký tự x-css (+2,2%). Nghĩa là **lợi thế "class ngắn hơn" hiện chưa tồn tại** ở đầu ra của bộ chuyển. Nguyên nhân cụ thể:

| Tailwind | Bộ chuyển xuất ra | Cách viết x-css gọn |
| :--- | :--- | :--- |
| `items-center` | `ai[center]` | `aiC` |
| `justify-between` | `jc[space-between]` | `jcSp` |
| `h-10` | `h[40px]` | `h40px` |
| `mx-auto` | `mx[auto]` | `mxA` |
| `grid-cols-1` | `gtc[repeat(1,minmax(0,1fr))]` | `gtc1fr` hoặc `gtc[minmax(0,1fr)]` |
| `border border-slate-200` | `bdw1px bds[solid] bdcCurrentColor bdc#e2e8f0` | `bd[1px_solid_#e2e8f0]` |
| `transition-opacity` | `tran0.2s` (mất tên property) | `tran[opacity_.15s]` |

Hai rủi ro chính xác (không chỉ thẩm mỹ):
1. `bdcCurrentColor` và `bdc#e2e8f0` cùng layer cùng property: màu viền đúng hay sai phụ thuộc class nào xuất hiện trước trên trang (mục 4.4).
2. `transition-opacity` thành `transition: 0.2s` áp cho mọi property, khác hành vi gốc.

## 6. Phương Án Tối Ưu Đề Xuất

Xếp theo thứ tự ưu tiên; mỗi mục ghi lợi ích đo được hoặc ước lượng và điều kiện chấp nhận.

### Giai đoạn 1 — Sửa nhanh, rủi ro thấp (1–2 tuần)

| # | Việc | Lợi ích | Điều kiện xong |
| :--- | :--- | :--- | :--- |
| 1.1 | Tách bộ chuyển Tailwind sang subpath `@porbit/style/tailwind`; bản CDN `index-auto` chỉ chứa lõi | Bản CDN 31 KB → ~19 KB gzip (−40%) | Export cũ vẫn chạy (re-export có cảnh báo deprecate 1 bản) |
| 1.2 | Bộ chuyển Tailwind xuất dạng chính tắc ngắn (`aiC`, `jcSp`, `h40px`, `bd[...]` gộp) | Class ngắn hơn Tailwind ~15–25% (ước lượng từ bảng mục 5); hết xung đột `bdc` | Test: không cặp class nào cùng property cùng layer trong output |
| 1.3 | Sửa `transition-*` giữ đúng property | Đúng hành vi Tailwind | Test so khớp declaration |
| 1.4 | Cảnh báo xung đột lúc dev: khi một phần tử có hai class cùng property cùng layer, cùng selector, in `console.warn` (tắt bằng `silent`) | Loại bỏ lớp lỗi khó thấy nhất của atomic CSS | Chỉ chạy khi không `silent` |

### Giai đoạn 2 — Hiệu năng runtime (2–4 tuần)

| # | Việc | Lợi ích | Điều kiện xong |
| :--- | :--- | :--- | :--- |
| 2.1 | **Static-first + hydrate**: CLI sinh CSS kèm manifest class; runtime nạp manifest và bỏ qua mọi class đã có | Trang đã trích xuất gần như 0 ms xử lý ở client; runtime chỉ lo class động | Benchmark: quét đầu < 2 ms trên trang 3.000 node đã trích xuất |
| 2.2 | Tạo stylesheet theo media khi cần thay vì 12 sheet rỗng | Khởi tạo nhanh hơn trên máy yếu | Giữ đúng thứ tự cascade (test đa trình duyệt) |
| 2.3 | Gom `insertRule` thành một `replaceSync` khi batch lớn | Ít lần tính lại style ở lần quét đầu | Benchmark Chromium/Firefox/WebKit, chỉ bật khi thắng |
| 2.4 | Plugin Vite/webpack chạy `extract` ở dev server | CSS có ngay khi HMR, không chờ observer | Peer dependency tuỳ chọn, không vào lõi |

### Giai đoạn 3 — Trải nghiệm người viết (song song)

| # | Việc | Lợi ích |
| :--- | :--- | :--- |
| 3.1 | Extension VS Code: gợi ý alias, hover hiện CSS, gạch đỏ class không sinh CSS (dùng lại `explain_class`) | Xoá điểm yếu "khó đọc / khó nhớ" |
| 3.2 | Chế độ **alias dài dễ đọc** song song alias ngắn (`rounded8px` = `bdra8px`, `semibold`...) hoặc nhận luôn tên Tailwind phổ biến ở runtime | Người từ Tailwind và AI viết đúng ngay lần đầu |
| 3.3 | Plugin Prettier sắp xếp class theo media → layer → property | Diff gọn, review dễ |
| 3.4 | Tài liệu tiếng Anh song song | Mở rộng người dùng và tăng xác suất xuất hiện trong dữ liệu AI |

### Giai đoạn 4 — Định hướng cho AI (quan trọng nhất cho mục tiêu "AI dùng thay Tailwind")

| # | Việc | Lý do |
| :--- | :--- | :--- |
| 4.1 | Phát hành `llms.txt` và `llms-full.txt` ở trang tài liệu (cú pháp rút gọn + bảng alias + lỗi hay gặp) | Agent có web tra cứu đúng nguồn trong vài nghìn token |
| 4.2 | Mẫu `AGENTS.md` / `CLAUDE.md` cho dự án người dùng (in bằng `presence-style init --agents`): quy tắc cú pháp, "luôn gọi `explain_class` trước khi trả lời" | Agent trong dự án tự tuân thủ, không cần người nhắc |
| 4.3 | Tool MCP `fix_classes`: nhận chuỗi class, trả bản đã sửa tự động (`df`→`dF`, `fz`→`fns`, `hover:`→`@:`) | Agent sửa trong một lượt thay vì đọc gợi ý rồi tự sửa |
| 4.4 | Bộ đánh giá (eval) công khai: 30 yêu cầu UI, đo % class hợp lệ khi agent viết **có** và **không** MCP, so với Tailwind | Bằng chứng số để thuyết phục; phát hiện alias nào AI hay sai để thêm alias phụ |
| 4.5 | Nhận cú pháp Tailwind ở runtime như một "phương ngữ" (`flex items-center` sinh CSS trực tiếp, không cần chuyển đổi) | Xoá hoàn toàn rào cản AI: agent viết Tailwind quen tay vẫn chạy, có thể dần chuyển sang x-css |

Mục 4.5 là đòn bẩy lớn nhất: nó biến lợi thế huấn luyện của Tailwind thành lợi thế của PresenceStyle (chạy không cần build, nhận class động). Chi phí là thêm ~11 KB vào runtime nếu bật, nên đặt sau một tuỳ chọn `dialect: 'tailwind'`.

## 7. Thông Điệp Định Vị Đề Xuất

> **PresenceStyle — utility CSS không cần build, cho giao diện sinh động.** Viết được mọi CSS thành class, ưu tiên tường minh bằng layer, chạy trong Shadow DOM, và có sẵn MCP để agent AI tự kiểm tra từng class.

Hướng dẫn chọn nhanh để đưa vào README:

| Dự án của bạn | Nên dùng |
| :--- | :--- |
| Ứng dụng có build, giao diện cố định, cần 0 KB JS cho CSS | Tailwind, hoặc PresenceStyle + `extract` (static-first) |
| Page builder, CMS, nội dung/giao diện do dữ liệu quyết định | **PresenceStyle** |
| Trang tĩnh, widget nhúng, không có bước build | **PresenceStyle** (bản CDN) |
| Web Component / micro-frontend dùng Shadow DOM | **PresenceStyle** |
| Nhóm làm việc chủ yếu qua agent AI | **PresenceStyle + MCP** (sau khi có 4.3–4.5), hoặc Tailwind nếu không cài được MCP |

## 8. Chỉ Số Theo Dõi

| Chỉ số | Hiện tại (0.5.0) | Mục tiêu |
| :--- | :--- | :--- |
| Bản CDN (gzip) | 31,4 KB | ≤ 20 KB (sau 1.1) |
| Quét đầu, 3.000 node | 20–27 ms | < 2 ms với static-first (2.1) |
| Độ dài class so với Tailwind (bộ chuyển) | +2,2% | −15% (sau 1.2) |
| % class hợp lệ do agent viết, có MCP | chưa đo | ≥ 98% (đo bằng 4.4) |
| % class hợp lệ do agent viết, không MCP | chưa đo | đo để làm mốc |
| Kiểm thử đa trình duyệt cho component | Chromium | Chromium + Firefox + WebKit + mobile trong CI |
