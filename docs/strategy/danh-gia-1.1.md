# @porbit/style 1.1 So Với Tailwind CSS 4.3.5

Bản đánh giá này chỉ ghi số đo được. Mỗi con số có script trong `eval/` và file kết quả JSON để chạy lại. Chuẩn so sánh luôn là **chính Tailwind 4.3.5**: compiler thật, `@tailwindcss/postcss`, `@tailwindcss/browser`, CLI với Oxide. Computed style đo trên Chromium. Ngày đo: 16/11/2026. Bản trước: `danh-gia-1.0.md`.

Máy đo có 4 lõi và được dùng chung. Mọi số thời gian là trung vị, hai phía chạy xen kẽ trong cùng một lần đo. Số tuyệt đối dao động giữa các lần chạy, chênh lệch tương đối thì ổn định.

## 1. Tóm Tắt

| Trục | 1.1 | So với Tailwind | Thay đổi từ 1.0 |
| :--- | :--- | :--- | :--- |
| Hiển thị mọi class và biến thể Tailwind | 100%; 415/415 biến thể; theme tuỳ chỉnh 50/50 | **Ngang** | +12 biến thể: at-rule lồng nhau, `@container/tên` |
| Dự án mã nguồn mở thật (6 dự án, 11 lượt trạng thái và độ rộng) | 4.412/4.412 class, 2.234/2.234 chuỗi class thật | **Ngang** | thêm daisyUI 5 và TailAdmin |
| Cấu hình v3 (`@config`) | 10 cấu hình, 100% | **Ngang** | thêm `presets`, `blocklist`, `theme.container` |
| Plugin JS (không cài `tailwindcss`) | Mọi gói đo được 100%, gồm cả bản đóng gói | **Ngang** | `tailwindcss-animate` đóng gói 445 → 447/447; daisyUI 410/410 |
| Bản không build (CDN, gzip) | **40,9 KB** | **Vượt** (−46%, Tailwind 75,3 KB) | 44,1 → 40,9 KB |
| Runtime: chèn 2.000 / 10 × 200 phần tử | **54,7 / 172,4 ms** | **Vượt** (10 × 200 nhanh hơn 5,4 lần) | |
| Class sinh lúc chạy (chế độ lai) | 300/300 sau **2,2 ms**; cascade đúng 476/476 cặp | **Vượt** (Tailwind build 9/300) | cascade 153/272 → 476/476 |
| Build tĩnh có cache / build lại | 6.000 file: **306 / 295 ms**; HTML: **131 / 162 ms** | **Vượt** (Tailwind 449 / 333 ms; 219 / 190 ms) | cache quét lưu trên đĩa (mới) |
| Build tĩnh lần đầu, chưa có cache | 6.000 file **429 ms**; HTML 247 ms | 6.000 file **vượt** (−4,5%); HTML **thua** (+13%) | trước đây chậm hơn ~45% |
| CSS build ra | 6.000 file: **305,6 KB**; coss ui 204,8 KB; shadcn 94,9 KB | **Vượt** ở đa số dự án (Tailwind 317,0 / 242,2 / 100,0 KB) | bỏ CSS rác của token không phải class |
| Rút gọn tên class (Tailwind không có) | Next.js 15.5/16, Turbopack và webpack, Vite, Rspack, CLI: CSS gzip −8 … −19%, HTML −22% | **Vượt** | mới |
| Cài đặt | gói 1,37 MB giải nén | **Vượt** (Tailwind ~25 MB) | |
| Gộp class, sắp class | 100%; 46/46 file Prettier | Gộp class **vượt**; sắp class **ngang** | |
| Editor | LSP cho VS Code, Zed, Neovim, Helix (ô màu, hover, gợi ý, sắp class) | **Ngang** | extension VS Code/Zed mới |
| Cộng đồng, tài liệu, thời gian có mặt | Mới | **Thua** | |

## 2. Độ Khớp Hiển Thị

| Phần | Khớp | Script |
| :--- | ---: | :--- |
| Mọi class trong `getClassList()`, tổ hợp biến thể, đường runtime | 100% (`check:all` đòi 100%) | `eval/tailwind-parity.mjs` |
| Biến thể Tailwind hỗ trợ | 415 / 415 | `eval/tailwind-variants.mjs` |
| Theme, `@utility`, `@apply`, khoá theme tự định nghĩa (75 namespace) | 50 / 50 | `eval/tailwind-parity.mjs` |
| Thứ tự rule như `getClassOrder` (kể cả `matchVariant` có `sort`) | 100% | `eval/tailwind-order.mjs` |
| Chế độ lai: class tĩnh với class động xung đột (8 trang, có HMR) | 476 / 476 | `eval/hybrid-order.mjs` |

**Dự án thật** (`eval/real-project.mjs --all`, bước `projects` của `check:all`):
- Đo cả hai chế độ: không build và PostCSS.
- Có 11 lượt: mặc định, mở/đóng, `.dark` hoặc `data-theme`, ép `:hover`/`:focus`/`:focus-visible`/`:active`, và các độ rộng 375–1600 px.

| Dự án (MIT) | Class | Chuỗi class thật |
| :--- | ---: | ---: |
| shadcn/ui v4 | 769 / 769 | 260 / 260 |
| HyperUI | 619 / 619 | 766 / 766 |
| Magic UI | 586 / 586 | 245 / 245 |
| coss ui | 1.331 / 1.331 | 379 / 379 |
| daisyUI 5 (`@plugin "daisyui"`, ba theme) | 410 / 410 | 242 / 242 |
| TailAdmin Vue (dashboard) | 697 / 697 | 342 / 342 |

**Lệch duy nhất còn biết:** thứ tự giữa `state-[open]` và `state-[open]/menu`, tức `matchVariant` có `sort`, cùng giá trị nhưng khác modifier. Chính Tailwind không cố định thứ tự này: hàm so của nó trả 1 ở cả hai chiều, nên kết quả tuỳ thứ tự class xuất hiện trong mã.

## 3. Hiệu Năng Và Dung Lượng

| Tiêu chí | Tailwind 4.3.5 | @porbit/style 1.1 | Script |
| :--- | ---: | ---: | :--- |
| Bản không build, trang chỉ dùng class (gzip) | 75,3 KB | **40,9 KB** | `check:all` bước `size` |
| Trang có `<style type="text/tailwindcss">` | 75,3 KB | **47 KB** (thêm 6,1 KB nạp động) | như trên |
| Tải ban đầu, 973 phần tử | 211,8 ms | 210,4 ms (ngang) | `eval/runtime-bench.mjs` |
| Chèn 2.000 phần tử | 85,5 ms | **54,7 ms** | như trên |
| Chèn 200 phần tử × 10 lần | 935,6 ms | **172,4 ms** | như trên |
| 300 class sinh lúc chạy (CMS, AI) | build: 9/300; browser: 27,1 ms | **300/300 sau 2,2 ms** | `eval/dynamic-classes.mjs` |
| Build 6.000 file: lần đầu / có cache / build lại | 449 / 449 / 333 ms | **429 / 306 / 295 ms** | `eval/build-bench.mjs` |
| Build 6.273 trang HTML: lần đầu / có cache / build lại | **219** / 219 / 190 ms | 247 / **131** / **162** ms | như trên |
| CSS build 6.000 file | 317,0 KB | **305,6 KB** | như trên |
| Cài đặt (đường PostCSS) | ~25 MB | **1,37 MB** | `check:all` bước `package` |

## 4. Tính Năng Tailwind Không Có

- **Rút gọn tên class khi build:**
  - Chạy với Next.js 15.5/16 (cả Turbopack lẫn webpack), Vite, Rspack, CLI và API.
  - Tự giữ tên những class có thể xung đột khi dự án dùng tailwind-merge.
  - Trên shadcn/Next.js 16, 3.170/3.170 phần tử khớp; CSS gzip −8,5%, HTML −22%.
  - Trên 4 dự án ở chế độ Vite, CSS gzip −10 … −19%.
- **Chế độ lai:** CSS tĩnh cộng runtime, thứ tự cascade đúng như Tailwind, kể cả khi Vite thay CSS lúc dev.
- **Gộp class theo cấu hình dự án** (theme, `@utility`, `@custom-variant`): 38/38, tailwind-merge 25/38.
- **Cache quét lưu trên đĩa:** build trong tiến trình mới chỉ quét lại file đã đổi.

## 5. Chỗ Còn Thua Hoặc Chưa Có

- **Build lần đầu, chưa có cache, trên bộ toàn trang HTML: chậm hơn 13%.**
  - Gần hết thời gian là đọc file và quét bằng JS một luồng; Oxide của Tailwind là Rust đa luồng.
  - Đã thử song song hoá bằng `worker_threads`, cả ba cách đều chậm hơn.
  - Muốn vượt cần bộ quét native hoặc WASM.
  - Với 6.000 file mã nguồn, ta đã nhanh hơn 4,5%. Khi đã có cache, ta nhanh hơn ở mọi bộ đo.
- **Chỉ đo trên Chromium.** Bộ đo đã có `--browser=firefox|webkit`, nhưng máy đo không có hai trình duyệt này.
- **Rút gọn tên class:** Turbopack dưới Next 15.5 chưa hỗ trợ. Dự án dùng tailwind-merge chỉ giảm khoảng một nửa so với dự án không dùng.
- **`tailwind-auto.mjs`** không chạy class viết tắt x-css; dùng `index-auto.mjs` cho x-css.
- **Cộng đồng:** Tailwind có hệ sinh thái, tài liệu và câu trả lời sẵn có rất lớn.

## 6. Chạy Lại Toàn Bộ

```bash
npm ci
npm run check:all                       # 11 bước, ~20 phút; check:fast ~35 s bỏ hai bước so Tailwind trên trình duyệt
node eval/real-project.mjs --all        # thêm --browser=firefox|webkit trên máy có trình duyệt đó
node eval/runtime-bench.mjs
node eval/build-bench.mjs --tw=<thư mục có tailwindcss + @tailwindcss/oxide>
bash eval/next-short-classnames.sh      # cần mạng: cài next vào thư mục tạm
```
