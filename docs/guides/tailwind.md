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

Đo trên Next.js 15 (build production, cùng một ứng dụng build bằng hai plugin): **0 khác biệt hiển thị** so với `@tailwindcss/postcss` (chỉ lệch dưới 0,02 px do Tailwind làm tròn số), CSS **3,62 KB** so với 3,88 KB gzip. Chạy lại: `bash eval/next-parity.sh`.

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
| Plugin đóng gói: tw-animate-css · tailwindcss-animate · forms · typography | 486/486 · 445/447 · 7/7 · 35/35 (198/198 biến thể) |
| Plugin JS bất kỳ, chạy không cần cài `tailwindcss` (tailwindcss-motion, tailwindcss-animate, tailwind-scrollbar, tailwindcss-animated, react-aria-components...) | 100% class và biến thể (`eval/tailwind-js-plugins.mjs`) |
| Dự án thật (11 lượt: mặc định, `data-*`/`aria-*` mở/đóng, `.dark`, `:hover`/`:focus`/`:focus-visible`/`:active` ép, 375–1600 px; cả không build và PostCSS): shadcn/ui v4 · HyperUI · Magic UI · coss ui | 769/769 · 619/619 · 586/586 · 1331/1331 |
| Chuỗi class thật của component (nhiều class trên một phần tử) | 260/260 · 766/766 · 245/245 · 379/379 |
| Dự án nâng cấp từ v3 (`@config`): extend, thay hẳn theme, `prefix`, `important`, `corePlugins`, `.ts`, cờ CSS v4 | 8 cấu hình, 100% |
| Ứng dụng Next.js 15 thật (`bash eval/next-parity.sh`) | 0 khác biệt |

Chạy lại: `npm run check:tailwind`. Chi tiết: [eval/TAILWIND-PARITY.md](../../eval/TAILWIND-PARITY.md), [eval/REAL-PROJECTS.md](../../eval/REAL-PROJECTS.md), bản đánh giá [danh-gia-1.0](../strategy/danh-gia-1.0.md). Đo dự án của bạn:

```bash
npm run build
node eval/real-project.mjs --css=src/app.css --src=src --import=tw-animate-css=node_modules/tw-animate-css/dist/tw-animate.css
```

## 4. Hiệu Năng So Với Tailwind

| Tiêu chí | Tailwind 4.3.5 | @porbit/style |
| :--- | ---: | ---: |
| Runtime không build (gzip) | 75,3 KB (`@tailwindcss/browser`) | 44,1 KB (+ file plugin khi dùng) |
| Runtime: tới khi có style, 973 phần tử (trung vị) | 257,8 ms | 231,8 ms |
| Runtime: thêm 2.000 phần tử | 95,9 ms | 66,9 ms |
| Runtime: thêm 200 phần tử × 10 lần | 1.148,9 ms | 207,0 ms |
| Cài đặt cho đường PostCSS | ~25 MB (Oxide, Lightning CSS) | 1,6 MB |
| Build tĩnh 248 file | 189–242 ms (CLI, Oxide) | 154–208 ms |
| Build tĩnh 6.200 file (25 MB) | 315–358 ms | 327–399 ms |
| CSS tĩnh cùng trang (gzip) | 4,81 KB | 4,70 KB |
| Next.js 15, cùng ứng dụng (CSS gzip) | 3,88 KB (`@tailwindcss/postcss`) | 3,62 KB |

## 5. Hỗ Trợ Cấu Hình Nâng Cao

| Tailwind | @porbit/style |
| :--- | :--- |
| `@theme`, `@theme inline`, `--color-*: initial`, `@keyframes` trong theme | Có |
| `@utility name {}` và `@utility name-* { x: --value(...) }` (`number`, `integer`, `ratio`, `percentage`, `--ns-*`, `[type]`, `"literal"`, `--modifier()`, `--spacing()`, `--alpha()`, selector lồng `&`, `@media` lồng) | Có |
| `@custom-variant x (&:...)`, `(@media ...)`, dạng khối có `@slot`, danh sách selector, dùng sau `group-`/`peer-`/`not-`/`has-` | Có |
| `@apply` kèm biến thể, độ mờ, `!important`; `@layer base/components` | Có |
| `@config "./tailwind.config.js"`/`.ts` (v3): theme/extend, màu lồng `DEFAULT`, `fontSize` dạng mảng, `screens`, `darkMode`, `prefix`, `important`, `corePlugins`, plugin | Có (Node). Chưa: `presets`, `blocklist`, `theme.container` |
| Plugin `tw-animate-css`, `tailwindcss-animate`, `@tailwindcss/forms`, `@tailwindcss/typography` | Đóng gói sẵn (dùng được cả trên CDN) |
| Plugin JS khác (`@plugin "x"` bất kỳ, `plugins: [require('x')]`) | Có (Node: PostCSS, CLI, LSP), không cần cài `tailwindcss`. Chưa: `matchVariant` giá trị tuỳ ý, `@apply` trong plugin |
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
| `@tailwindcss/browser` | 300 / 300 | 38,2 ms | 73,9 KB |
| CSS tĩnh + `tailwind-auto data-hybrid` | 300 / 300 | 2,3 ms | 44,1 KB |

Giới hạn: rule sinh lúc chạy nằm sau CSS tĩnh, nên khi một class động và một class tĩnh cùng phần tử đụng nhau (`p-2` tĩnh, `px-4` động) thứ tự có thể khác Tailwind.

## 8. Rút Gọn Tên Class Lúc Build (Tuỳ Chọn)

Tailwind không có tính năng này: khi build, đổi tên class thành tên ngắn (`inline-flex items-center gap-2` → `a b c`) trong CSS **và** trong mã nguồn. Class dùng nhiều được tên ngắn trước; cùng đầu vào luôn ra cùng bảng ánh xạ. Mặc định tắt.

```js
// vite.config.js — chỉ chạy khi `vite build`, dev server giữ nguyên tên
presenceStyle({ dialects: [tailwindV4Dialect(/* ... */)], shortClassNames: true })
presenceStyle({ shortClassNames: { exclude: ['js-toggle', /^swiper-/], prefix: 'x' } })
```

```bash
# Bước build trước bundler: CSS (đã sinh, hoặc file có @import "tailwindcss") + mã nguồn -> bản rút gọn
npx presence-style shorten src --css src/app.css --out-css build/app.css --out-dir build --map build/class-map.json
```

```js
// API thủ công (ví dụ sau plugin PostCSS, hoặc trong script build riêng)
import { shortenClasses } from '@porbit/style/shorten'
const out = shortenClasses({ css, sources: { 'src/App.tsx': code }, exclude: [/^js-/] })
out.css; out.sources['src/App.tsx']; out.map /* tên gốc -> tên ngắn */; out.skipped /* class giữ nguyên -> lý do */
```

Tuỳ chọn: `exclude` (tên hoặc RegExp; luôn kèm `dark`, `light` vì thư viện theme gắn lúc chạy), `prefix` (đặt trước mọi tên mới, nên dùng khi trang có runtime lai ở mục 7 hoặc CSS ngoài bundle), `functions` (hàm có đối số là chuỗi class, mặc định `cn clsx cx cva tv tw twMerge twJoin`).

**Nguyên tắc an toàn: chỉ đổi tên class mà MỌI lần xuất hiện trong mã đều nằm trong chuỗi class nhận diện chắc chắn.** Chuỗi class nhận diện chắc chắn là thuộc tính `class="..."`/`className="..."` tĩnh, chuỗi trong `className={...}` và đối số của `cn`/`clsx`/`cva`/`tv`..., khoá object của `clsx`/`cn` (`cn({ 'p-4': on })`), prop `classNames={{...}}`/`*ClassName`. Không tính các chuỗi là toán hạng so sánh (`variant === 'outline'`), đối số hàm khác (`buttonVariants({ variant: 'outline' })`), `defaultVariants`/`compoundVariants` (trừ `class`), hay `obj['x']`. Class còn xuất hiện ở bất kỳ chỗ nào khác thì **giữ nguyên tên ở mọi nơi**, trong CSS lẫn mã, nên kết quả luôn nhất quán:

| Trường hợp | Ví dụ | Xử lý |
| :--- | :--- | :--- |
| Chuỗi ngoài ngữ cảnh class | `const c = 'hidden'`, `classList.add('open')`, `querySelector('.card')`, `<input hidden>` | giữ tên (`unrecognized`) |
| Ghép chuỗi động | `` `bg-${c}-500` ``, `'text-' + size`, `p-{size}` (Svelte), `'bg-'` | giữ mọi class khớp đầu/cuối (`dynamic`) |
| Selector thuộc tính trên class | `[&_svg:not([class*='size-'])]:size-4` của shadcn | tên mới giữ chuỗi con (`size-4` → `size-a`); không giữ được thì giữ tên |
| Directive Svelte | `class:active={x}` | giữ tên (`directive`) |
| Selector phức trong CSS | `group-hover:`, `peer-*`, `group/tên`, `in-*`, `has-[...]`, `*:`, `[&_.x]`, `@container/tên`, lồng `&`, `@media`/`@supports`/`@layer` | đổi tên đúng từng class trong selector; `@keyframes`, giá trị khai báo, chuỗi không bị đụng |
| Tên mới | chỉ `[a-z][a-z0-9]*` (không `-`, không trùng utility như `p-4`, an toàn ở quirks mode), không trùng class/chuỗi đang có, không bắt đầu bằng `ad` (bộ chặn quảng cáo ẩn `.ad`, `.ads`) | |

Đo trên 4 dự án thật (`npm run check:short-classnames`, kết quả `eval/short-classnames.json`): CSS sinh bằng plugin PostCSS, rồi render bản gốc và bản rút gọn bằng Chromium, so TOÀN BỘ computed style của mọi chuỗi class trong mã (11 lượt như mục 3: mặc định, `data-*`/`aria-*` mở/đóng, `.dark`, ép `:hover`/`:focus`/`:focus-visible`/`:active`, 375/768/1600 px) và của mọi phần tử trong 369 trang HTML của HyperUI (1280/375 px, ép `:hover`/`:focus-visible`).

| Dự án | Class đổi tên | CSS thô | CSS gzip | Mã TSX đã minify (esbuild) thô · gzip | Mã nguồn thô · gzip | Computed style khớp |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| shadcn/ui v4 (45 file) | 752 / 789 | 95,0 → 75,9 KB (**−20,1%**) | 13,9 → 11,4 KB (**−18,1%**) | −33,8% · −17,5% | −21,7% · −15,7% | 355 × 11 lượt, 100% |
| HyperUI (369 trang HTML) | 594 / 775 | 77,6 → 69,9 KB (−10,0%) | 13,0 → 11,7 KB (−9,8%) | — | −19,5% · −12,2% | 882 × 11 lượt + 5.339 phần tử × 4 lượt, 100% |
| Magic UI (80 file) | 536 / 653 | 83,8 → 73,7 KB (−12,0%) | 15,2 → 13,4 KB (−11,8%) | −8,7% · −4,8% | −4,3% · −3,7% | 320 × 11 lượt, 100% |
| coss ui (56 file) | 1.203 / 1.352 | 205,2 → 163,8 KB (**−20,2%**) | 27,0 → 21,9 KB (**−18,6%**) | −36,5% · −21,2% | −24,1% · −19,5% | 553 × 11 lượt, 100% |

Không còn tên gốc của class đã đổi tên nằm ngoài chuỗi class trong mã đã biến đổi (kiểm bằng `findUnrecognized`). Class giữ nguyên tên chủ yếu vì xuất hiện ở chỗ khác chuỗi class (HyperUI: "class" sinh từ dữ liệu path SVG; Magic UI: `flex`, `absolute`... trong biến và style), hoặc không có trong mã (safelist, chỉ nằm trong biến thể khác).

Giới hạn đã biết:

- Chỉ phân tích các file đưa vào (`include` của Vite, đường dẫn của CLI, `sources` của API). Class được dùng ở file khác — thư viện trong `node_modules` dùng class Tailwind, file JSON/Markdown/CMS, test e2e chọn theo class, CSS nằm ngoài bundle (CDN, `public/`) — phải đưa vào `include` hoặc `exclude`. Plugin Vite cảnh báo khi một module ngoài `include` có chuỗi nhiều class chứa class đã đổi tên.
- Mã đọc class theo mẫu (`className.includes('size-')`, RegExp trên class) không nhận diện được: thêm vào `exclude`.
- Plugin Vite: chỉ lúc `vite build` (module đã đổi kèm sourcemap); CSS nhúng thành chuỗi JS (`?inline`, `?raw`) không được đổi.
- Plugin PostCSS không thể sửa mã nguồn nên không có tuỳ chọn này: dùng plugin Vite, lệnh `shorten` hoặc `shortenClasses`.
