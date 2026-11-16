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

Thuộc tính thẻ script: `data-preflight="false"` (tắt reset), `data-dark="class"` (dark theo `.dark`).

Plugin có sẵn (`@porbit/style/tailwind-plugins`): `tw-animate-css` (và tên cũ `tailwindcss-animate`), `@tailwindcss/forms`, `@tailwindcss/typography` (kể cả biến thể `prose-headings:`...). Chúng được sinh bằng cách chạy chính Tailwind kèm plugin (`npm run gen:tailwind-plugins`) và nằm ở file riêng (8,3 KB gzip), chỉ tải khi stylesheet có `@import`/`@plugin` tương ứng.

Khác `@tailwindcss/browser` (Tailwind ghi rõ "không dùng cho production"), bản này nhẹ hơn và nhanh hơn, xem mục 4.

## 2. Có Build (Vite) — 0 KB JavaScript Như Tailwind

```js
// vite.config.js
import fs from 'node:fs'
import presenceStyle from '@porbit/style/vite'
import { tailwindV4Dialect, parseTailwindStylesheet } from '@porbit/style/tailwind'
import { resolveTailwindPlugin } from '@porbit/style/tailwind-plugins'

// Đọc @theme / @utility / @custom-variant / @apply / plugin từ CSS của dự án.
const sheet = parseTailwindStylesheet(fs.readFileSync('src/app.css', 'utf8'), { resolve: resolveTailwindPlugin })

export default {
  plugins: [presenceStyle({ dialects: [tailwindV4Dialect({ preflight: true, theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, css: sheet.css })] })],
}
```

```js
// main.js — chỉ CSS tĩnh, không cần runtime
import 'virtual:presence-style.css'
```

CSS được thu gọn (`minify`): chỉ giữ `@property`/`@keyframes` đang dùng. Cần class sinh động lúc chạy thì thêm runtime với `preload` (xem [static-first](./static-first.md)).

CLI không bundler (`tailwindCss` trỏ tới CSS của dự án, đọc cả `@import` tương đối và gói trong `node_modules`):

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
| Biến thể Tailwind được hỗ trợ | 403 / 403 (100%) |
| Plugin: tw-animate-css · forms · typography | 486/486 · 7/7 · 35/35 |
| Dự án thật: shadcn/ui v4 (45 component, `@custom-variant`, `@utility`, `@apply`, tw-animate-css) ở 4 trạng thái (mặc định, mở, đóng, `.dark`) | 769 / 769 mỗi trạng thái |

Chạy lại: `npm run check:tailwind`. Chi tiết: [eval/TAILWIND-PARITY.md](../../eval/TAILWIND-PARITY.md), [eval/REAL-PROJECT.md](../../eval/REAL-PROJECT.md). Đo dự án của bạn:

```bash
npm run build
node eval/real-project.mjs --css=src/app.css --src=src --import=tw-animate-css=node_modules/tw-animate-css/dist/tw-animate.css
```

## 4. Hiệu Năng So Với Tailwind

| Tiêu chí | Tailwind 4.3.5 | @porbit/style |
| :--- | ---: | ---: |
| Runtime không build (gzip / brotli) | 75,3 / 61,5 KB (`@tailwindcss/browser`) | 58,0 / 47,0 KB (+8,3 KB khi dùng plugin) |
| Runtime: tới khi có style, 973 phần tử | 196–222 ms | 150–172 ms |
| Runtime: thêm 2.000 phần tử | 87–90 ms | 83–85 ms |
| Build tĩnh 248 file | 189–242 ms (CLI, Oxide) | 154–208 ms |
| Build tĩnh 6.200 file (25 MB) | 315–358 ms | 327–399 ms |
| CSS tĩnh cùng trang (gzip) | 4,81 KB | 4,70 KB |

## 5. Hỗ Trợ Cấu Hình Nâng Cao

| Tailwind | @porbit/style |
| :--- | :--- |
| `@theme`, `@theme inline`, `@keyframes` trong theme | Có |
| `@utility name {}` và `@utility name-* { x: --value(...) }` (`number`, `integer`, `ratio`, `percentage`, `--ns-*`, `[type]`, `"literal"`, `--modifier()`, `--spacing()`, `--alpha()`, selector lồng `&`, `@media` lồng) | Có |
| `@custom-variant x (&:...)`, `(@media ...)`, dạng khối có `@slot`, danh sách selector, dùng sau `group-`/`peer-`/`not-`/`has-` | Có |
| `@apply` kèm biến thể, độ mờ, `!important`; `@layer base/components` | Có |
| Plugin `tw-animate-css`/`tailwindcss-animate`, `@tailwindcss/forms`, `@tailwindcss/typography` | Đóng gói sẵn |
| Plugin JS khác (`@plugin "x"` bất kỳ) | Chưa: thêm vào `scripts/gen-tailwind-plugins.mjs` để sinh sẵn |
| Class v3 cũ còn hợp lệ ở v4 (`flex-shrink-0`, `bg-gradient-to-r`, `break-words`...) | Có |
| IntelliSense | Language server riêng `presence-style lsp` ([editors](./editors.md)) |
| Plugin Prettier sắp xếp class | `presence-style sort` / code action của LSP |
