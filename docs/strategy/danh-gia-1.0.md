# @porbit/style 1.0 So Với Tailwind CSS 4.3.5

Bản đánh giá này chỉ ghi số đo được. Mỗi con số có script trong `eval/` và file kết quả JSON để chạy lại; chuẩn so sánh luôn là **chính Tailwind 4.3.5** (compiler thật, `@tailwindcss/postcss`, `@tailwindcss/browser`), đo computed style trên Chromium 153. Ngày đo: 16/11/2026.

## 1. Tóm Tắt

| Trục | Kết quả | So với Tailwind |
| :--- | :--- | :--- |
| Hiển thị mọi class Tailwind | 23.286/23.286 class, 956/956 tổ hợp biến thể, 403/403 biến thể | **Ngang** |
| Dự án mã nguồn mở thật (4 dự án, 11 lượt trạng thái/độ rộng) | 3.305/3.305 class, 1.650/1.650 chuỗi class thật | **Ngang** |
| Ứng dụng Next.js 15 thật | 0 khác biệt hiển thị | **Ngang** |
| Nâng cấp từ v3 (`@config`) | 8 cấu hình, 100% | **Ngang** |
| Plugin JS (không cần cài `tailwindcss`) | 9 gói, 100% class và biến thể | **Ngang** |
| CSS build ra (Next.js) | 3,62 KB so với 3,88 KB gzip | **Vượt** (−6,6%) |
| Dung lượng cài đặt (PostCSS) | 1,6 MB so với ~25 MB | **Vượt** (−94%) |
| Bản không build (CDN) | 44,1 KB so với 75,3 KB gzip | **Vượt** (−41%) |
| Runtime: tải / chèn 2.000 / 10 × 200 phần tử | 232 / 67 / 207 ms so với 258 / 96 / 1.149 ms | **Vượt** (tới 5,5 lần) |
| Gộp class (thay tailwind-merge) | 100% mặc định; **38/38 so với 25/38** với cấu hình dự án | **Vượt** |
| Sắp class (thay prettier-plugin-tailwindcss) | 46/46 file giống hệt | **Ngang** |
| Class sinh lúc chạy (CMS, ghép chuỗi, UI do AI sinh) | 300/300 sau 2,3 ms; Tailwind build 9/300 | **Vượt** |
| Cộng đồng, tài liệu, thời gian có mặt | Mới | **Thua** |

## 2. Độ Khớp Hiển Thị

| Phần | Khớp | Script |
| :--- | ---: | :--- |
| Mọi class trong `getClassList()` | 23.286 / 23.286 | `eval/tailwind-parity.mjs` |
| Tổ hợp biến thể (26 kịch bản: responsive, dark, hover/focus ép, group/peer lồng, has/not/in, container, ba điều kiện...) | 956 / 956 | như trên |
| Đường runtime trong trình duyệt | 3.327 / 3.327 | như trên |
| Theme, `@utility`, `@apply` | 28 / 28 | như trên |
| Biến thể Tailwind hỗ trợ | 403 / 403 | `eval/tailwind-variants.mjs` |
| Thứ tự rule (cascade) như `getClassOrder` | 100% (class gốc, một và hai biến thể, shadcn/ui) | `eval/tailwind-order.mjs` |

**Dự án thật** (`eval/real-project.mjs --all`): mỗi class hợp lệ và mỗi chuỗi class thật của component được đo ở 11 lượt — mặc định, `data-state`/`aria-*` mở và đóng (trên phần tử, cha `.group`, anh `.peer`), `.dark`, `:hover`, `:focus`, `:focus-visible`, `:active` ép qua DevTools, độ rộng 375/768/1280/1600 px — ở cả chế độ không build lẫn plugin PostCSS; animation dừng ở khung đầu để kết quả lặp lại được.

| Dự án (giấy phép MIT) | Class | Chuỗi class thật |
| :--- | ---: | ---: |
| shadcn/ui v4 (45 component, tw-animate-css, `@custom-variant`) | 769 / 769 | 260 / 260 |
| HyperUI (HTML, `@plugin` forms/typography) | 619 / 619 | 766 / 766 |
| Magic UI (`@utility container`, theme riêng) | 586 / 586 | 245 / 245 |
| coss ui (Base UI, `--alpha()`, biến theme trong CSS) | 1.331 / 1.331 | 379 / 379 |

**Next.js 15** (`bash eval/next-parity.sh`): cùng một ứng dụng build production bằng `@tailwindcss/postcss` và bằng `@porbit/style/postcss`, so computed style mọi phần tử ở hai độ rộng, có hover: **0 khác biệt** (chỉ lệch dưới 0,02 px do Tailwind làm tròn số qua Lightning CSS).

**Cấu hình v3** (`@config "./tailwind.config.js"`): extend, thay hẳn theme, `prefix`, `important` (cả dạng selector), `corePlugins`, `tailwind.config.ts`, cờ CSS v4 `prefix(tw) important` — 8 fixture, 100% ở mọi trạng thái.

**Plugin JS** (`eval/tailwind-js-plugins.mjs`, plugin chạy qua API giả lập, không cài `tailwindcss`):

| Gói | Class | Biến thể |
| :--- | ---: | ---: |
| tailwindcss-motion | 2.228 / 2.228 | — |
| tailwindcss-animate | 456 / 456 | — |
| tailwind-scrollbar (cả `nocompatible`) | 294 / 294 · 456 / 456 | 5 / 5 |
| tailwindcss-animated, tailwind-scrollbar-hide | 100% | — |
| tailwindcss-react-aria-components (cả prefix) | — | 312 / 312 |
| @tailwindcss/forms, @tailwindcss/typography | 100% | 198 / 198 |

## 3. Hiệu Năng Và Dung Lượng

| Tiêu chí | Tailwind 4.3.5 | @porbit/style 1.0 | Script |
| :--- | ---: | ---: | :--- |
| Bản không build (gzip) | 75,3 KB (`@tailwindcss/browser`) | **44,1 KB** | `check:all` bước `size` |
| Tải ban đầu tới khi có style, 973 phần tử | 257,8 ms | **231,8 ms** | `eval/runtime-bench.mjs` |
| Chèn 2.000 phần tử | 95,9 ms | **66,9 ms** | như trên |
| Chèn 200 phần tử × 10 lần | 1.148,9 ms | **207,0 ms** | như trên |
| Cài đặt cho đường PostCSS | ~25 MB (Oxide, Lightning CSS, WASM dự phòng) | **1,6 MB** | đo `du` trên ứng dụng Next.js |
| CSS ứng dụng Next.js (gzip) | 3,88 KB | **3,62 KB** | `eval/next-parity.sh` |
| tailwind-merge so với gộp class | 8,3 KB gzip, 1,05 MB cài | 1,5 KB + bảng 3,2 KB | `eval/merge-accuracy.mjs` |

Số runtime là trung vị của 9 lượt trên Chromium headless; máy chia sẻ nên số tuyệt đối dao động, chênh lệch tương đối ổn định giữa các lượt.

## 4. Hệ Sinh Thái: Thay Từng Công Cụ

| Thay | Bằng | Kết quả đo |
| :--- | :--- | :--- |
| `@tailwindcss/postcss` | `@porbit/style/postcss` (đổi một dòng) | Next.js 0 khác biệt; mọi dự án ở mục 2 đo qua cả đường PostCSS |
| `@tailwindcss/browser` | `tailwind-auto.mjs` | 3.327/3.327 runtime; dùng được cho production |
| `tailwind-merge` | `@porbit/style/merge` | 1.326/1.326 cặp mặc định (bằng tailwind-merge); 38/38 với theme/`@utility`/`@custom-variant` của dự án (tailwind-merge 25/38, bằng không gộp) |
| `prettier-plugin-tailwindcss` | `@porbit/style/prettier` | 46/46 file giống hệt, không cần cài `tailwindcss` |
| Tailwind IntelliSense | `presence-style lsp` | Gợi ý class (cả theme dự án), ô màu, hover CSS; mọi editor LSP |
| Safelist cho class động | `tailwind-auto.mjs data-hybrid` | 300/300 class sinh lúc chạy có style sau 2,3 ms (`@tailwindcss/browser` 38,2 ms; Tailwind build 9/300) |

## 5. Chỗ Còn Thua Hoặc Chưa Có

- **Hiếm gặp:** bóng nhiều lớp có từ hai phần không phải màu, `border-[10%]`, `shadow-(--x)/50`, modifier trên utility tĩnh.
- **Cấu hình v3 chưa có:** `presets`, `blocklist`, `theme.container`; khi vừa có `important` của CSS vừa có `important: '#app'` của `@config` thì mất `!important`.
- **Plugin JS:** `matchVariant` với giá trị tuỳ ý, `@apply` trong CSS-in-JS của plugin, at-rule ngoài `@media` trong utility của plugin. daisyUI chưa đo.
- **`tailwind-auto.mjs`** không chạy class viết tắt x-css (dùng `index-auto.mjs` cho x-css).
- **Class động trong chế độ lai:** rule sinh lúc chạy nằm sau CSS tĩnh nên thứ tự với class tĩnh cùng phần tử có thể khác Tailwind.
- **Chưa đo lại ở 1.0:** tốc độ build tĩnh hàng nghìn file (0.9: ngang Tailwind CLI).
- **Cộng đồng:** Tailwind có hệ sinh thái, tài liệu và câu trả lời sẵn có rất lớn.

## 6. Chạy Lại Toàn Bộ

```bash
npm ci
npm run check:all                       # 11 bước: typecheck, unit, build, size, package, generated, rust, browser, tailwind, projects, eval
node eval/real-project.mjs --all        # bảng eval/REAL-PROJECTS.md
node eval/runtime-bench.mjs             # eval/runtime-bench.json
bash eval/next-parity.sh                # cần mạng: cài next/react vào thư mục tạm
```
