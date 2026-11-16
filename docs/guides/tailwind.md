# Dùng Thay Tailwind v4

`@porbit/style` chạy class Tailwind v4 với kết quả hiển thị **như Tailwind**: dữ liệu phương ngữ được sinh từ chính compiler của Tailwind (`npm run gen:tailwind`), và mỗi bản phát hành được đo so với Tailwind thật trên Chromium (`eval/tailwind-parity.mjs`).

## 1. Không Build (thay `@tailwindcss/browser`)

```html
<script type="module" src="https://unpkg.com/@porbit/style/dist/tailwind-auto.mjs"></script>

<style type="text/tailwindcss">
  @import "tailwindcss";
  @import "tw-animate-css";                 /* plugin đóng gói sẵn, chỉ tải khi dùng */
  @plugin "@tailwindcss/typography";
  @custom-variant dark (&:where(.dark, .dark *));
  @custom-variant data-open { &:where([data-state="open"]) { @slot; } }
  @theme {
    --color-brand: #0a64e8;
    --radius-blob: 2rem;
    --breakpoint-3xl: 112rem;
  }
  @utility tab-* { tab-size: --value(integer); }
  .btn { @apply inline-flex items-center px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand/90 md:px-6; }
</style>

<button class="btn data-open:fade-in-50" data-state="open">Đăng nhập</button>
<article class="prose dark:prose-invert">...</article>
```

Thuộc tính thẻ script: `data-preflight="false"` (tắt reset), `data-dark="class"` (dark theo `.dark`), `data-hybrid` (trang đã có CSS tĩnh: chỉ sinh CSS cho class mới xuất hiện lúc chạy, xem mục 7).

Plugin có sẵn (`@porbit/style/tailwind-plugins`): `tw-animate-css` (và tên cũ `tailwindcss-animate`), `@tailwindcss/forms`, `@tailwindcss/typography` (kể cả biến thể `prose-headings:`...). Chúng được sinh bằng cách chạy chính Tailwind kèm plugin (`npm run gen:tailwind-plugins`) và nằm ở file riêng (8,3 KB gzip), chỉ tải khi stylesheet có `@import`/`@plugin` tương ứng.

Khác `@tailwindcss/browser` (Tailwind ghi rõ "không dùng cho production"), bản này nhẹ hơn và nhanh hơn, xem mục 4.

## 2. Có Build — 0 KB JavaScript Như Tailwind

### PostCSS (Next.js, Remix, Astro, Angular, Vite...) — đổi một dòng

```js
// postcss.config.mjs
export default { plugins: { '@porbit/style/postcss': {} } }   // thay '@tailwindcss/postcss'
```

File CSS giữ nguyên như dự án Tailwind v4 (`@import "tailwindcss"`, `@theme`, `@utility`, `@custom-variant`, `@apply`, `@plugin`, `@config`). Plugin tự quét mã nguồn (bỏ `node_modules` và thư mục trong `.gitignore`), hiểu `@source "../x"`, `@source not`, `@source inline("{hover:,}bg-red-{100..900..100}")`, `source(none)`, và báo dependency cho chế độ watch. Tuỳ chọn: `base`, `optimize` (mặc định bật), `mergeTable` (mục 6).

Đo trên Next.js 15 (build production, cùng một ứng dụng build bằng hai plugin): **0 khác biệt hiển thị** so với `@tailwindcss/postcss` (chỉ lệch dưới 0,02 px do Tailwind làm tròn số), CSS **3,67 KB** so với 3,97 KB gzip. Chạy lại: `bash eval/next-parity.sh`.

### Vite (module ảo)

```js
// vite.config.js
import fs from 'node:fs'
import presenceStyle from '@porbit/style/vite'
import { tailwindV4Dialect, parseTailwindStylesheet } from '@porbit/style/tailwind'
import { resolveTailwindPlugin } from '@porbit/style/tailwind-plugins'

const sheet = parseTailwindStylesheet(fs.readFileSync('src/app.css', 'utf8'), { resolve: resolveTailwindPlugin })
export default {
  plugins: [presenceStyle({ dialects: [tailwindV4Dialect({ preflight: true, theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, css: sheet.css })] })],
}
```

```js
import 'virtual:presence-style.css'
import { cn } from 'virtual:presence-style-merge'   // gộp class, bảng theo class của dự án (mục 6)
```

Vite cũng chạy plugin PostCSS ở trên nếu dự án dùng `postcss.config`.

### CLI

```bash
echo '{"hashClassName":false,"dialects":["tailwind"],"preflight":true,"tailwindCss":"src/app.css"}' > presence-style.config.json
npx presence-style extract src --out dist/app.css --minify
```

## 3. Độ Khớp Đo Được (tailwindcss 4.3.5, Chromium)

So **toàn bộ computed style** của phần tử và phần tử con giữa CSS Tailwind sinh và CSS `@porbit/style` sinh.

| Phần | Khớp |
| :--- | ---: |
| Mọi class trong danh sách của Tailwind (kể cả `container`) | 23.286 / 23.286 |
| Biến thể: responsive, max-*, khoảng, dark, hover/focus, group/peer (có tên, lồng nhau), has/not/in, nth, aria/data, rtl, container query (cả `not-@md`), supports, print, before/after, ba điều kiện (`md:dark:hover`), độ mờ `/50`, `!`, giá trị tuỳ ý | 956 / 956 |
| Đường runtime trong trình duyệt (`tailwind-auto.mjs`) | 3.327 / 3.327 |
| Theme tuỳ chỉnh, `@utility`, `@apply` | 28 / 28 |
| Thứ tự rule (cascade) như Tailwind: class gốc, một biến thể, hai biến thể, shadcn/ui | 100% mỗi tập (`eval/tailwind-order.mjs`) |
| Biến thể Tailwind được hỗ trợ | 403 / 403 (100%) |
| Plugin: tw-animate-css · forms · typography | 486/486 · 7/7 · 35/35 |
| Dự án thật: shadcn/ui v4 (45 component, `@custom-variant`, `@utility`, `@apply`, tw-animate-css) ở 4 trạng thái (mặc định, mở, đóng, `.dark`), cả qua plugin PostCSS | 769 / 769 mỗi trạng thái |
| shadcn/ui: 260 chuỗi class thật của component (nhiều class trên một phần tử), kể cả khi đảo thứ tự quét file | 260 / 260 |
| Dự án nâng cấp từ v3 (`@config "./tailwind.config.js"`): extend và thay hẳn theme | 61/61 · 18/18 mỗi trạng thái |

Chạy lại: `npm run check:tailwind`. Chi tiết: [eval/TAILWIND-PARITY.md](../../eval/TAILWIND-PARITY.md), [eval/REAL-PROJECT.md](../../eval/REAL-PROJECT.md). Đo dự án của bạn:

```bash
npm run build
node eval/real-project.mjs --css=src/app.css --src=src --import=tw-animate-css=node_modules/tw-animate-css/dist/tw-animate.css
```

## 4. Hiệu Năng So Với Tailwind

| Tiêu chí | Tailwind 4.3.5 | @porbit/style |
| :--- | ---: | ---: |
| Runtime không build (gzip) | 75,3 KB (`@tailwindcss/browser`) | 62,9 KB (+8,3 KB khi dùng plugin) |
| Runtime: tới khi có style, 973 phần tử | 188–220 ms | 152–180 ms |
| Runtime: thêm 2.000 phần tử | 70–83 ms | 77–110 ms (chèn rule đúng thứ tự cascade) |
| Build tĩnh 248 file | 189–242 ms (CLI, Oxide) | 154–208 ms |
| Build tĩnh 6.200 file (25 MB) | 315–358 ms | 327–399 ms |
| CSS tĩnh cùng trang (gzip) | 4,81 KB | 4,70 KB |
| Next.js 15, cùng ứng dụng (CSS gzip) | 3,97 KB (`@tailwindcss/postcss`) | 3,67 KB |

## 5. Hỗ Trợ Cấu Hình Nâng Cao

| Tailwind | @porbit/style |
| :--- | :--- |
| `@theme`, `@theme inline`, `--color-*: initial`, `@keyframes` trong theme | Có |
| `@utility name {}` và `@utility name-* { x: --value(...) }` (`number`, `integer`, `ratio`, `percentage`, `--ns-*`, `[type]`, `"literal"`, `--modifier()`, `--spacing()`, `--alpha()`, selector lồng `&`, `@media` lồng) | Có |
| `@custom-variant x (&:...)`, `(@media ...)`, dạng khối có `@slot`, danh sách selector, dùng sau `group-`/`peer-`/`not-`/`has-` | Có |
| `@apply` kèm biến thể, độ mờ, `!important`; `@layer base/components` | Có |
| `@config "./tailwind.config.js"` (v3): theme/extend, màu lồng `DEFAULT`, `fontSize` dạng mảng, `screens`, `darkMode`, plugin quen thuộc | Có (Node). Chưa: `prefix`, `important`, `corePlugins` |
| Plugin `tw-animate-css`/`tailwindcss-animate`, `@tailwindcss/forms`, `@tailwindcss/typography` | Đóng gói sẵn |
| Plugin JS khác (`@plugin "x"` bất kỳ) | Chưa: thêm vào `scripts/gen-tailwind-plugins.mjs` để sinh sẵn |
| Class v3 cũ còn hợp lệ ở v4 (`flex-shrink-0`, `bg-gradient-to-r`, `rounded`...) | Có |
| IntelliSense | `presence-style lsp`: gợi ý class Tailwind (cả theme của dự án), ô màu, hover CSS ([editors](./editors.md)) |
| prettier-plugin-tailwindcss | `@porbit/style/prettier` (mục 6) |
| tailwind-merge | `@porbit/style/merge` (mục 6) |

## 6. Công Cụ Hệ Sinh Thái: Prettier, tailwind-merge

**Sắp class (thay prettier-plugin-tailwindcss)** — cùng tên tuỳ chọn, không cần cài `tailwindcss`:

```json
{ "plugins": ["@porbit/style/prettier"], "tailwindStylesheet": "./src/app.css", "tailwindFunctions": ["cn", "cva"] }
```

Đo trên 45 component shadcn/ui và một file xáo trộn mọi chuỗi class: **46/46 file giống hệt** prettier-plugin-tailwindcss 0.8.1 (`eval/prettier-sort.mjs`). `presence-style sort` và code action của LSP dùng cùng thứ tự khi bật phương ngữ Tailwind.

**Gộp class xung đột (thay tailwind-merge)** — dựa trên khai báo CSS thật, không bảng nhóm viết tay:

```js
import { cn } from '@porbit/style/merge'          // kèm dữ liệu Tailwind (Node, hoặc trang đã dùng tailwind-auto)
cn('px-2 py-1 bg-red-500', active && 'p-4 bg-blue-500')   // 'p-4 bg-blue-500'

// Bản nhẹ cho ứng dụng build: 1,5 KB + bảng sinh từ class của dự án
import { cn } from 'virtual:presence-style-merge'                       // Vite
// PostCSS: { '@porbit/style/postcss': { mergeTable: 'src/lib/merge-table.json' } }
import table from './merge-table.json'
import { clsx, createMerge } from '@porbit/style/merge/lite'
export const cn = (...a) => createMerge({ table })(clsx(...a))
```

| Đo bằng hiển thị thật (`eval/merge-accuracy.mjs`) | Không gộp | tailwind-merge 3.7 | @porbit/style |
| :--- | ---: | ---: | ---: |
| Tailwind mặc định: 1.326 cặp từ shadcn/ui và utility hay ghi đè | 84,5% | 100% | **100%** |
| Cấu hình của dự án (theme, `@utility`, `@custom-variant`, tw-animate-css), không cấu hình thêm | 65,8% | 65,8% | **100%** |
| Dung lượng (gzip) | — | 8,3 KB | 1,5 KB + bảng 3,2 KB (shadcn/ui) |
| 20.000 lần gộp chuỗi class thật | — | 219–243 ms | 82–148 ms (lite) |

## 7. Class Động Trong Chế Độ Build

Tailwind build chỉ có CSS cho class viết sẵn trong mã nguồn; class ghép chuỗi (`bg-${color}-500`), nội dung CMS hay HTML do AI sinh lúc chạy không có style nếu không safelist. Thêm runtime ở chế độ lai — chỉ sinh CSS cho class mới, đọc theme từ CSS tĩnh:

```html
<link rel="stylesheet" href="/app.css">  <!-- CSS tĩnh từ PostCSS/Vite/CLI -->
<script type="module" src="https://unpkg.com/@porbit/style/dist/tailwind-auto.mjs" data-hybrid></script>
```

| 300 phần tử chèn lúc chạy, 411 class không có trong mã nguồn (`eval/dynamic-classes.mjs`) | Hiển thị đúng | Có style sau | JS (gzip) |
| :--- | ---: | ---: | ---: |
| Tailwind build (CSS tĩnh) | 9 / 300 | — | 0 KB |
| `@tailwindcss/browser` | 300 / 300 | 29,9 ms | 73,9 KB |
| CSS tĩnh + `tailwind-auto data-hybrid` | 300 / 300 | 2,4 ms | 62,9 KB |

Giới hạn: rule sinh lúc chạy nằm sau CSS tĩnh, nên khi một class động và một class tĩnh cùng phần tử đụng nhau (`p-2` tĩnh, `px-4` động) thứ tự có thể khác Tailwind.
