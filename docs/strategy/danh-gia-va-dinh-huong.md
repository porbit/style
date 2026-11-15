# Đánh Giá Và Định Hướng: PresenceStyle So Với Tailwind Và Các Framework CSS

> **Cập nhật 0.7.1:** lộ trình giai đoạn 1–4 đã làm xong. Phần [Đánh giá lại sau khi dùng thử](#9-đánh-giá-lại-sau-khi-dùng-thử-071) ở cuối tài liệu ghi số liệu đo được, các lỗi chỉ lộ ra khi dựng trang thật, và nhận định mới. Các mục 1–8 giữ nguyên để so sánh trước/sau.

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

### Giai đoạn 1 — Sửa nhanh, rủi ro thấp — **đã làm ở 0.6.0**

Kết quả: bản CDN 31,4 → 21,4 KB gzip; output bộ chuyển (chế độ `compact`) ngắn hơn Tailwind 4,6%; `transition-*` chính xác; hết xung đột `border-color`; MCP có `fix_classes` (mục 4.3 làm sớm). Mục 1.4 được làm ở dạng công cụ tĩnh (`findClassConflicts`, cảnh báo trong Tailwind helper và MCP) thay vì kiểm tra lúc chạy, để không thêm chi phí runtime. Mục tiêu −15% độ dài chưa đạt: phần chênh còn lại nằm ở `grid-cols-*` (`gtc[repeat(n,minmax(0,1fr))]`) và `transition-*` đầy đủ, hai chỗ ưu tiên đúng hành vi hơn độ ngắn.

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
| 4.3 | **Đã làm (0.6.0).** Tool MCP `fix_classes`: nhận chuỗi class, trả bản đã sửa tự động (`df`→`dF`, `fz`→`fns`, `hover:`→`@:`) | Agent sửa trong một lượt thay vì đọc gợi ý rồi tự sửa |
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
| Bản CDN (gzip) | 21,4 KB (0.6.0; 0.5.0 là 31,4 KB) | ≤ 20 KB |
| Quét đầu, 3.000 node | 20–27 ms | < 2 ms với static-first (2.1) |
| Độ dài class so với Tailwind (bộ chuyển, `compact`) | −4,6% (0.6.0; 0.5.0 là +2,2%) | −15% |
| % class hợp lệ do agent viết, có MCP | chưa đo | ≥ 98% (đo bằng 4.4) |
| % class hợp lệ do agent viết, không MCP | chưa đo | đo để làm mốc |
| Kiểm thử đa trình duyệt cho component | Chromium | Chromium + Firefox + WebKit + mobile trong CI |

## 9. Đánh Giá Lại Sau Khi Dùng Thử (0.7.1)

### 9.1 Đã làm gì

| Giai đoạn | Hạng mục | Trạng thái |
| :--- | :--- | :--- |
| 1 | Tách Tailwind helper khỏi bản CDN; `compact`; sửa `transition-*`, xung đột `border-color`; `fix_classes` | Xong (0.6.0) |
| 2.1 | Static-first: `preload`, `skipInitialScan`, `extract --manifest` | Xong |
| 2.2 / 2.3 | Lazy stylesheet / gom `insertRule` | **Đo rồi không làm**: 12 sheet rỗng tốn 0,1 ms; 300 rule `insertRule` 0,6 ms so với `replaceSync` 0,5 ms |
| 2.4 | Plugin Vite (CSS ảo, manifest, cập nhật nóng, `components`) | Xong |
| 3.1 | Extension VS Code (diagnostic, quick fix, hover, gợi ý, sắp xếp) | Xong, **chưa chạy trong VS Code thật**: chỉ kiểm thử với API giả lập |
| 3.2 | Alias dài dễ đọc | Thay bằng phương ngữ Tailwind (4.5): người muốn tên dễ đọc viết thẳng Tailwind |
| 3.3 | Sắp xếp class | Làm dạng `presence-style sort` + lệnh trong extension, không làm plugin Prettier |
| 3.4 | README tiếng Anh | Xong |
| 4.1 | `llms.txt`, `llms-full.txt` | Xong (~1.200 token) |
| 4.2 | `presence-style init --agents --mcp [--tailwind]` | Xong |
| 4.3 | `fix_classes` | Xong, khái quát lại sau khi đo |
| 4.4 | Bộ đánh giá `eval/` | Xong, có giới hạn (mục 9.3) |
| 4.5 | Phương ngữ Tailwind ở runtime | Xong |

### 9.2 Số liệu đo (Chromium)

| Chỉ số | 0.5.0 | 0.7.1 |
| :--- | :--- | :--- |
| Bản CDN `index-auto` (gzip) | 31,4 KB | 22,0 KB |
| Khởi tạo + quét 3.000 node, runtime thuần | 23–31 ms | 21–31 ms (không đổi, đúng kỳ vọng) |
| Khởi tạo, static-first + `skipInitialScan` | — | **2,7–3 ms** |
| App mẫu (Vite, core + phương ngữ Tailwind + component) | — | JS 36 KB gzip, CSS tĩnh 0,8 KB (2,9 KB khi `components: true`) |
| Class x-css do agent viết, hợp lệ trên trình duyệt | — | 99,1% → 99,8% sau `fix_classes` |
| Class Tailwind do agent viết, chạy qua phương ngữ | — | 98,6% → 100% sau khi bổ sung 4 nhóm utility |
| `fix_classes` trên tập lỗi độc lập | — | 8/21 (bản đầu) → **18/20 trên tập mới** |

### 9.3 Những gì chỉ lộ ra khi dùng thật

Ba lỗi không test đơn vị nào bắt được, chỉ lộ ra khi dựng một trang cửa hàng bằng Vite với phương ngữ Tailwind, component mẫu và static-first:

1. **`skipInitialScan` làm mất style của component.** Recipe sinh class trong JavaScript (`${button()}`) nên bước build không thấy; tuỳ chọn lại bỏ hẳn lần quét đầu, nên card và nút hiện trần. Sửa: dời lượt quét sang lúc rảnh, thêm `components: true`. Bài học: tối ưu "bỏ qua việc" phải có lối bù khi giả định sai.
2. **`check` báo nhầm class Tailwind** trong dự án bật phương ngữ vì cấu hình JSON không chứa được hàm. Sửa: `"dialects": ["tailwind"]`.
3. **Tách chunk ESM phá build trình duyệt** (shim Node bị gom vào chunk chung) và làm bản CDN nặng hơn. Đã thử và bỏ.

Về độ chính xác của `fix_classes`: bản đầu chỉ đạt 8/21 trên tập lỗi chưa thấy. Các quy tắc ban đầu khớp đúng những ví dụ đã nghĩ ra chứ không khái quát. Sau khi viết lại theo nguyên lý (tên CSS viết liền, đoán chữ viết tắt, từ khoá có dấu gạch, thói quen Tailwind), tập độc lập mới đạt 18/20.

Giới hạn của số liệu AI: cả hai lượt viết do **một** agent đã đọc toàn bộ mã nguồn thực hiện, nên 99% không đại diện cho một mô hình chưa từng thấy x-css. Xem `eval/README.md`.

### 9.4 Nhận định mới

1. **Rào cản AI lớn nhất đã được gỡ bằng phương ngữ, không phải bằng dạy AI cú pháp mới.** Agent viết Tailwind quen tay đạt 98,6% class sinh CSS qua phương ngữ ngay lần đầu, không cần build (100% sau khi bổ sung đúng các utility mà lượt viết này lộ ra, nên con số 100% có thiên lệch). Với x-css, agent vẫn tự đoán alias (`bdf`, `fvn`) và cần `fix_classes`/`check` để bắt. Định hướng nên đổi từ "AI dùng x-css thay Tailwind" sang **"AI viết Tailwind hoặc x-css, PresenceStyle chạy cả hai mà không cần build"**.
2. **Ưu thế thật vẫn là không cần build và class động.** Toast thêm lúc chạy và class Tailwind ghép động đều có CSS; Tailwind build-time không làm được nếu không safelist. Static-first thu hẹp khoảng cách hiệu năng với Tailwind (3 ms khởi tạo) nhưng vẫn còn ~22–36 KB JavaScript; Tailwind là 0.
3. **x-css có lợi thế thật về độ ngắn:** 8 màn hình viết bằng x-css dùng 3.824 ký tự class, so với 4.505 ký tự khi viết bằng Tailwind (−15%). Đây là số đo trên cùng nội dung, khác con số −4,6% ở mục 6, vốn là output của bộ chuyển tự động.
4. **Rủi ro còn lại**: extension VS Code chưa chạy thật; phương ngữ chưa có gradient, `animate-*`, `prose`, `container`; ring dùng box-shadow nên đè `shadow-*`; `opacity-50` khi tắt phương ngữ là `opacity:-50`; parity với engine Rust chưa kiểm từ 0.4.

### 9.5 Việc nên làm tiếp

| Ưu tiên | Việc | Lý do |
| :--- | :--- | :--- |
| 1 | Publish 0.7.1 lên npm | Lệnh MCP, `init`, plugin Vite chỉ dùng được sau khi có trên npm (hiện npm vẫn là 0.4.0) |
| 2 | Chạy `eval/` với 3–4 mô hình chưa thấy x-css, có và không có MCP | Thay số liệu "một agent" bằng số đại diện |
| 3 | Đóng gói và thử extension trong VS Code thật | Phần duy nhất mới kiểm bằng API giả lập |
| 4 | Ring/shadow ghép bằng biến như Tailwind v4 | Hết cảnh ring đè bóng đổ |
| 5 | Cập nhật engine Rust và chạy conformance | Parity chưa kiểm từ 0.4 |

## 10. Engine Rust Và Đề Xuất Tối Ưu Tiếp (0.7.2)

### 10.1 Phân tích `presence_style` khi tích hợp

| Hạng mục | Tình trạng khi nhận | Đã làm |
| :--- | :--- | :--- |
| Parity với Node | Khớp 3274 case của bộ dữ liệu trước 0.4; lệch 13/3294 với Node 0.7 (thiếu từ vựng mở, `--bien[...]`, `_`, `-.5rem`) | Khớp 3314/3314, thêm case chuỗi `&` và giá trị không an toàn |
| Thứ tự cascade | Không bọc `@layer`; media sắp theo chuỗi query nên `sm:` đè `xl:`, `md:cRed` đè `5cBlue` | Cùng mô hình với Node; so trên Chromium: 0 khác biệt computed style |
| An toàn khi sinh CSS ở server | Không chặn `}` `<` `/*` hay ngoặc/nháy hở trong giá trị | Chặn như Node |
| Hiệu năng | Không memo, `css_text()` dựng lại mỗi lần | Memo + cache: lặp nhanh ~20 lần, `css_text()` ~150 lần |
| Ví dụ framework | `g16px` (grid) dùng như gap ở 32 chỗ | Sửa thành `gap16px`; cả 5 ví dụ biên dịch được |

Khi làm việc này cũng lộ ra **hai lỗi thứ tự layer ở engine Node** (runtime sau hai khung hình, và CSS tĩnh). Bộ conformance không bắt được vì nó so từng class riêng; chỉ thấy khi render nhiều class cùng lúc trên trình duyệt. Bài học: cần thêm bước so *hiển thị* bên cạnh so *tuple*.

### 10.2 Đề xuất tối ưu tiếp

| Ưu tiên | Đề xuất | Lợi ích | Ghi chú |
| :--- | :--- | :--- | :--- |
| 1 | CI GitHub Actions: `npm run verify`, `cargo test`, so hiển thị Node/Rust trên Chromium, `eval/score.cjs` | Chặn lỗi kiểu 10.1 trước khi merge | Cần quyền `workflows` cho GitHub App khi đẩy file `.github/workflows` |
| 2 | Rust SSR + Node hydrate: `XCoreRegistry::manifest()` xuất cùng định dạng `preload` | App Leptos/Yew render CSS ở server, runtime JS (hoặc wasm) chỉ lo class động; khởi tạo ~3 ms như static-first | Hai engine đã khớp ngữ nghĩa nên ghép được |
| 3 | Thống nhất cách đặt tên hash: Node dùng FNV-1a như Rust (`stable_class_name`) | Tên class giống nhau giữa server Rust và client Node, giữa các lần build; bỏ được registry key trong `localStorage` (phần phức tạp nhất của `core.ts`) | Tên dài hơn (~13 ký tự so với 2–4); nên là tuỳ chọn trước khi đổi mặc định |
| 4 | `x-css` (wasm): `MutationObserver` + chỉ ghi lại `<style>` khi có rule mới | Ví dụ direct-class hiện chỉ quét DOM một lần; class đổi theo state không có CSS | Cần kiểm thử trên trình duyệt bằng wasm-bindgen trước khi phát hành |
| 5 | Phương ngữ Tailwind cho Rust (port `tailwindDialect`) | App Rust viết class Tailwind như phía JS | Bộ chuyển ~1.700 dòng TS; nên sinh bảng ánh xạ từ TS như dictionary |
| 6 | Publish npm 0.7.2 và crates.io 0.2.0 | Lệnh `npx`, `init`, plugin Vite, MCP dùng được | npm hiện vẫn 0.4.0 |

Không đề xuất: thay engine JS bằng Rust/wasm trong trình duyệt. Engine JS đã xử lý 20.000 lần `clsx` trong ~13 ms; chi phí qua lại ranh giới JS–wasm và tải thêm file wasm lớn hơn phần có thể tiết kiệm.

## 11. So Sánh Với Tailwind: Mục Tiêu Thay Thế Hoàn Toàn (0.8.0)

### 11.1 Phát hiện ban đầu

Đo bằng chính Tailwind (danh sách 23.286 class từ `getClassList()` của tailwindcss 4.3.5), bộ chuyển viết tay trước đây chỉ phủ **17,4%** class (24,8% theo họ utility), và dùng breakpoint của x-css (`lg` = 992px) thay vì của Tailwind (1024px). Con số "100%" ở mục 9 chỉ đúng trên 8 trang mẫu.

### 11.2 Phương án đã làm

1. **Sinh dữ liệu từ chính Tailwind** (`scripts/gen-tailwind-map.mjs`): chạy compiler trên toàn bộ danh sách class, rút về 916 mẫu khai báo theo 347 họ, thăm dò giá trị tuỳ ý theo kiểu, lấy theme, `@property`, keyframes, preflight. 136 KB thô, ~34 KB gzip.
2. **Phương ngữ v4** (`tailwindV4Dialect`): khai báo nguyên văn của Tailwind, theme nhúng làm dự phòng, breakpoint/container/dark/hover đúng Tailwind, biến thể ghép, độ mờ `/50`, `!`, `@theme`, `@utility`, `@apply`.
3. **Engine**: selector `&` (bọc class), at-rule ngoài `@media` (container query, `@supports`, `@starting-style`), phương ngữ tự mang breakpoint/base CSS, cờ `trusted` bỏ `CSS.supports` cho khai báo đã kiểm ở nguồn.
4. **CSS tĩnh `minify`**: bỏ `@property`/`@keyframes` không dùng, gộp `@layer`.
5. **CLI đọc file đồng bộ**: build 6.200 file từ 1,3–1,5 s xuống 0,33–0,40 s.
6. **Bộ đo khớp Tailwind thật** (`eval/tailwind-parity.mjs`) đưa vào cổng `check:all`.

Trong lúc đo phát hiện và sửa thêm: khi kiểm bằng `CSS.supports`, cả class `backdrop-blur-*` bị bỏ trên Chromium vì một khai báo `-webkit-backdrop-filter`; `data-preflight` không đọc được với `<script type="module">`; mẫu có `{v}` trong tên property bị giải nén sai; tên font có khoảng trắng bị mã hoá sai.

### 11.3 Kết quả đo

| Trục | Tailwind 4.3.5 | @porbit/style 0.8.0 | Đánh giá |
| :--- | :--- | :--- | :--- |
| Độ khớp class gốc | — | 23.285 / 23.286 (99,996%) | **Ngang** (khác: `container`) |
| Độ khớp biến thể (23 kịch bản) | — | 680 / 680 | **Ngang** |
| Độ phủ biến thể | 403 | 385 (95,5%) | Thiếu 18 tổ hợp lồng hiếm |
| Theme, `@utility`, `@apply` | Có | 28 / 28 kịch bản; chưa có `@apply` kèm biến thể, `@utility` dạng hàm, `@custom-variant` | Gần ngang |
| Không build (runtime) | `@tailwindcss/browser` 75,3 KB gzip, "không dùng production" | 55,6 KB gzip (−26%), tới khi có style nhanh hơn ~35% | **Vượt** |
| Build tĩnh | Oxide (Rust) | Ngang ở 248 và 6.200 file | **Ngang** |
| CSS tĩnh | 4,81 KB gzip | 4,70 KB gzip | **Ngang** |
| Plugin (typography, forms, animate) | Có | Chưa | **Thua** |
| IntelliSense/Prettier chính thức, hệ sinh thái | Rất lớn | Extension VS Code, `sort` riêng | **Thua** |
| Cú pháp x-css ngắn, class sinh động không safelist, Shadow DOM, ưu tiên bằng layer, MCP cho AI, engine Rust | Không | Có | **Vượt** |

### 11.4 Kết luận: đã thay thế được chưa?

- **Phần utility class (cái người dùng viết hằng ngày): đạt.** Một trang viết bằng Tailwind v4 hiển thị như Tailwind, đo được trên 23.286 class và 680 tổ hợp biến thể, ở cả chế độ build lẫn không build.
- **Chế độ không build: vượt trội rõ** — nhẹ hơn, nhanh hơn và dùng được cho production, trong khi bản tương ứng của Tailwind không khuyến nghị cho production.
- **Chế độ build: ngang**, không vượt. Ưu thế không nằm ở tốc độ build mà ở việc cùng một bộ class chạy được cả có lẫn không có build, và class sinh động không cần safelist.
- **Chưa thay thế hoàn toàn** ở phần cấu hình nâng cao và hệ sinh thái: plugin chính thức, `@custom-variant`, `@utility` dạng hàm, `@apply` kèm biến thể, IntelliSense/Prettier chính thức. Dự án phụ thuộc các phần này chưa nên chuyển.

### 11.5 Tối ưu tiếp để đóng khoảng cách

| Ưu tiên | Việc | Mức độ |
| :--- | :--- | :--- |
| 1 | `@utility` dạng hàm (`tab-*` với `--value()`) và `@custom-variant` trong `parseTailwindStylesheet` | Vừa |
| 2 | `@apply` kèm biến thể: sinh rule lồng (`.btn:hover {...}`) | Vừa |
| 3 | Plugin phổ biến: sinh dữ liệu cho `tailwindcss-animate` (shadcn/ui) và `@tailwindcss/forms` bằng cùng bộ sinh (chạy compiler kèm plugin) | Vừa |
| 4 | Một class nhiều rule (`container`, `not-hover`) và ba điều kiện media trở lên: cho phương ngữ trả nhiều nhóm token | Lớn (đổi engine) |
| 5 | Language server dùng chung cho VS Code/Neovim/Zed dựa trên `@porbit/style/analyze` | Lớn |
| 6 | Đo trên mã thật: chạy bộ đo với các dự án mã nguồn mở viết bằng Tailwind v4 (shadcn/ui, Catalyst mẫu) | Nhỏ, nên làm sớm |

