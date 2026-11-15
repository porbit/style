# Dùng Thay Tailwind v4

`@porbit/style` chạy class Tailwind v4 với kết quả hiển thị **như Tailwind**: dữ liệu phương ngữ được sinh từ chính compiler của Tailwind (`npm run gen:tailwind`), và mỗi bản phát hành được đo so với Tailwind thật trên Chromium (`eval/tailwind-parity.mjs`).

## 1. Không Build (thay `@tailwindcss/browser`)

```html
<script type="module" src="https://unpkg.com/@porbit/style/dist/tailwind-auto.mjs"></script>

<style type="text/tailwindcss">
  @import "tailwindcss";
  @theme {
    --color-brand: #0a64e8;
    --radius-blob: 2rem;
    --breakpoint-3xl: 112rem;
  }
  @utility tab-4 { tab-size: 4; }
  .btn { @apply inline-flex items-center px-4 py-2 rounded-lg bg-brand text-white; }
</style>

<button class="btn hover:bg-brand/90 md:px-6">Đăng nhập</button>
```

Thuộc tính thẻ script: `data-preflight="false"` (tắt reset), `data-dark="class"` (dark theo `.dark`).

Khác `@tailwindcss/browser` (Tailwind ghi rõ "không dùng cho production"), bản này nhẹ hơn và nhanh hơn, xem mục 4.

## 2. Có Build (Vite) — 0 KB JavaScript Như Tailwind

```js
// vite.config.js
import fs from 'node:fs'
import presenceStyle from '@porbit/style/vite'
import { tailwindV4Dialect, parseTailwindStylesheet } from '@porbit/style/tailwind'

// Đọc @theme / @utility / @apply từ CSS của dự án (tuỳ chọn).
const sheet = parseTailwindStylesheet(fs.readFileSync('src/app.css', 'utf8'))

export default {
  plugins: [presenceStyle({ dialects: [tailwindV4Dialect({ preflight: true, ...sheet })] })],
}
```

```js
// main.js — chỉ CSS tĩnh, không cần runtime
import 'virtual:presence-style.css'
```

CSS được thu gọn (`minify`): chỉ giữ `@property`/`@keyframes` đang dùng. Cần class sinh động lúc chạy thì thêm runtime với `preload` (xem [static-first](./static-first.md)).

CLI không bundler:

```bash
echo '{"hashClassName":false,"dialects":["tailwind"],"preflight":true}' > presence-style.config.json
npx presence-style extract src --out dist/app.css --minify
```

## 3. Độ Khớp Đo Được (tailwindcss 4.3.5, Chromium)

So **toàn bộ computed style** của phần tử và phần tử con giữa CSS Tailwind sinh và CSS `@porbit/style` sinh.

| Phần | Khớp |
| :--- | ---: |
| Mọi class trong danh sách của Tailwind | 23.285 / 23.286 |
| Biến thể: responsive, max-*, khoảng, dark, hover/focus, group/peer (có tên), has/not/in, nth, aria/data, rtl, container query, supports, print, before/after, độ mờ `/50`, `!`, giá trị tuỳ ý | 680 / 680 |
| Đường runtime trong trình duyệt (`tailwind-auto.mjs`) | 3.327 / 3.327 |
| Theme tuỳ chỉnh, `@utility`, `@apply` | 28 / 28 |
| Biến thể Tailwind được hỗ trợ | 385 / 403 (95,5%) |

Chạy lại: `npm run check:tailwind`. Chi tiết: [eval/TAILWIND-PARITY.md](../../eval/TAILWIND-PARITY.md).

## 4. Hiệu Năng So Với Tailwind

| Tiêu chí | Tailwind 4.3.5 | @porbit/style |
| :--- | ---: | ---: |
| Runtime không build (gzip / brotli) | 75,3 / 61,5 KB (`@tailwindcss/browser`) | 55,6 / 45,0 KB |
| Runtime: tới khi có style, 973 phần tử | 223–247 ms | 143–163 ms |
| Runtime: thêm 2.000 phần tử | 89–100 ms | 78–93 ms |
| Build tĩnh 248 file | 189–242 ms (CLI, Oxide) | 154–208 ms |
| Build tĩnh 6.200 file (25 MB) | 315–358 ms | 327–399 ms |
| CSS tĩnh cùng trang (gzip) | 4,81 KB | 4,70 KB |

## 5. Chưa Hỗ Trợ

| Hạng mục | Ghi chú |
| :--- | :--- |
| `container` | Một class cần nhiều khối `@media`; chỉ có `width: 100%` |
| 18 biến thể lồng nhiều tầng | `group-peer-hover`, `not-@md`... |
| `not-hover` | Chỉ có phần selector, thiếu `@media not (hover: hover)` |
| `@apply` kèm biến thể (`@apply hover:...`), `@custom-variant`, `@utility` dạng hàm (`tab-*`) | Chỉ hỗ trợ `@apply` class gốc và `@utility` tên cố định |
| Plugin (`@tailwindcss/typography`, `forms`, `tailwindcss-animate`) | Chưa có |
| Một class tối đa hai điều kiện media/container | Ba điều kiện trở lên (`md:dark:hover:`) không sinh CSS |
| Công cụ hệ sinh thái chính thức (IntelliSense, plugin Prettier) | Có extension VS Code và `presence-style sort` riêng |
