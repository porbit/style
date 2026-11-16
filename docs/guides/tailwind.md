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
| Dự án nâng cấp từ v3 (`@config`): extend, thay hẳn theme, `prefix`, `important`, `corePlugins`, `.ts`, cờ CSS v4, `presets` + `blocklist` + `theme.container`, plugin tự viết (`matchVariant` giá trị tuỳ ý, `@apply` trong plugin) | 10 cấu hình, 100% |
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
| `@config "./tailwind.config.js"`/`.ts` (v3): theme/extend, màu lồng `DEFAULT`, `fontSize` dạng mảng, `screens`, `darkMode`, `prefix`, `important`, `corePlugins`, `presets`, `blocklist`, `theme.container`, plugin | Có (Node), chi tiết bên dưới |
| Plugin `tw-animate-css`, `tailwindcss-animate`, `@tailwindcss/forms`, `@tailwindcss/typography` | Đóng gói sẵn (dùng được cả trên CDN) |
| Plugin JS khác (`@plugin "x"` bất kỳ, `plugins: [require('x')]`) | Có (Node: PostCSS, CLI, LSP), không cần cài `tailwindcss`, kể cả `matchVariant` với giá trị tuỳ ý (`name-[x]:`, `name-[x]/mod:`) và `@apply` trong CSS-in-JS |
| `@source not inline("p-4 {m,p}x-2")` (class bị chặn, cả chế độ không build) | Có |
| Class v3 cũ còn hợp lệ ở v4 (`flex-shrink-0`, `bg-gradient-to-r`, `rounded`...) | Có |
| IntelliSense | `presence-style lsp`: gợi ý class Tailwind (cả theme của dự án), ô màu, hover CSS ([editors](./editors.md)) |
| prettier-plugin-tailwindcss | `@porbit/style/prettier` (mục 6) |
| tailwind-merge | `@porbit/style/merge` (mục 6) |

### Cấu hình v3 qua `@config`

Đọc như Tailwind 4.3.5 đọc cùng file (đo bằng `eval/real-project.mjs` trên `eval/fixtures/v3-config/*`):

- **`presets`**: gộp theo thứ tự của Tailwind — preset lồng trước, rồi preset, rồi chính cấu hình. `theme.x` của cấu hình sau thay của cấu hình trước, `theme.extend` cộng dồn (gộp sâu), plugin của preset chạy trước plugin của cấu hình; `darkMode`, `prefix`, `important`, `blocklist` lấy cấu hình cuối có khai báo (nên `blocklist` của cấu hình thay hẳn của preset). Hàm trong `extend` đọc chính khoá đang giải (`extend.colors` gọi `theme('colors.x')`) không thấy giá trị, như Tailwind.
- **`blocklist`**: Tailwind v4 vẫn đọc — class trùng **đúng cả chuỗi** (kể cả biến thể: chặn `p-4` không chặn `md:p-4`) không sinh CSS; mục RegExp bị bỏ qua. Đổi thành `@source not inline("...")`, có hiệu lực ở cả chế độ không build. (`@apply` một class bị chặn: Tailwind báo lỗi, ở đây bỏ qua class đó.)
- **`theme.container`** (và `extend.container`): `center` → `margin-inline: auto`, `padding` (chuỗi, hoặc object có `DEFAULT` và khoá breakpoint), `screens` → cộng vào `container` sẵn có của v4 đúng thuật toán compat của Tailwind (`max-width: none` từ breakpoint nhỏ nhất rồi `max-width` theo từng màn hình; `padding` theo breakpoint gắn vào màn hình cùng tên). Breakpoint lấy từ cấu hình (`theme.screens`/`extend.screens`) hoặc mặc định v4; breakpoint chỉ khai báo trong `@theme` của CSS chưa được tính.
- **Plugin**: `matchVariant` nhận giá trị có tên (`values`, `DEFAULT`), giá trị tuỳ ý `name-[x]:` (`_` là khoảng trắng), modifier `name-[x]/mod:`, ghép sau `group-`/`peer-`/`hover:`...; `sort` quyết định thứ tự giữa các giá trị có tên. `@apply` trong CSS-in-JS (`'.btn': { '@apply px-4 py-2': {}, '&:hover': { '@apply underline': {} } }`) như `@apply` trong `@utility`. Chưa hỗ trợ: thứ tự giữa giá trị tuỳ ý và giá trị có tên theo `sort` (giá trị tuỳ ý luôn xếp sau — chỉ khác khi hai biến thể của cùng plugin đặt cùng thuộc tính trên một phần tử), `matchVariant` mà kết quả không là mẫu của giá trị (dùng giá trị để rẽ nhánh: chỉ giá trị có tên).
- Bỏ qua như Tailwind v4: `corePlugins`, `separator`, `safelist`, `future`, `experimental`.

Plugin cộng đồng đã thử qua `@config` (so computed style với Tailwind 4.3.5 + chính plugin):

| Plugin | Kết quả |
| :--- | :--- |
| `tailwindcss-radix`, `@headlessui/tailwindcss`, `tailwind-children`, `tailwind-gradient-mask-image`, `tailwindcss-animation-delay`, `tailwindcss-opentype`, `tailwindcss-highlights`, `tailwindcss-bg-patterns`, `tailwindcss-elevation`, `tailwindcss-intersect`, `tailwindcss-debug-screens` | 100% class và biến thể |
| `@tailwindcss/container-queries` (v3) | 100%: Tailwind v4 có sẵn `@container`, `@container/main`, `@md:`, `@[300px]:`, `@max-[300px]/main:` nên không cần chạy plugin |
| `@tailwindcss/aspect-ratio` (v3) | Plugin vẫn chạy như Tailwind v4: `aspect-w-*`, `aspect-h-*`, `aspect-none` khớp; plugin thay `theme.aspectRatio` nên `aspect-video`/`aspect-square` mất như Tailwind. Chưa: `aspect-1`…`aspect-16` (khoá `--aspect-*` tự định nghĩa) |
| `@tailwindcss/line-clamp`, `tailwindcss-fluid-type`, `tailwindcss-3d`, `tailwind-clip-path`, `tailwindcss-text-fill`, `@savvywombat/tailwindcss-grid-areas`, `tailwindcss-hero-patterns`, `preline/plugin` (v2) | Chính Tailwind v4 báo lỗi build (API riêng của v3: `variants()`, `addDefaults`, selector có `/`). Ở đây không lỗi build: phần plugin chạy được vẫn dùng, phần lỗi ghi trong `messages` của bộ nạp; `line-clamp-*` đã có sẵn trong v4 |

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
| CSS tĩnh + `tailwind-auto data-hybrid` | 300 / 300 | 2,3 ms | 44,4 KB |

**Thứ tự cascade như Tailwind.** Khi một class động và một class tĩnh cùng phần tử đụng nhau (cùng thuộc tính, cùng specificity), Tailwind quyết định bên thắng bằng thứ tự rule: `px-4` đứng sau `p-2` nên thắng, dù class nào có trong mã nguồn. Rule sinh lúc chạy vì thế không nằm ở sheet riêng (luôn đứng sau CSS tĩnh, nên `p-2` động sẽ đè `px-4` tĩnh) mà được chèn bằng CSSOM vào khối `@layer` của CSS tĩnh cùng nguồn, đúng vị trí theo thứ tự Tailwind:

- Khối đích: `@layer lN` cuối cùng (CSS do plugin PostCSS/Vite/CLI của `@porbit/style` build) hoặc `@layer utilities` (CSS do chính Tailwind build). `<style>` và `<link>` cùng nguồn đều được; `<link>` khác nguồn (CDN không có CORS) không đọc được CSSOM, runtime rơi về sheet riêng như trước.
- Vị trí: tìm nhị phân theo thứ tự Tailwind (`compare` của phương ngữ) giữa các rule có sẵn; khoá của rule tĩnh là class đầu tiên trong selector, rule không có class (preflight, theme) đứng trước mọi utility. Biến thể `hover:` gộp vào nhóm `@media (hover: hover)` có sẵn khi liền kề.
- Không cần cấu hình; chỉ áp cho `data-hybrid`. Lõi engine nhận tuỳ chọn `preload.staticBlock` (hàm trả khối `@layer` đích theo layer); cách dựng khối cho Tailwind ở `src/hybrid.ts`.

| 34 cặp xung đột × 8 trang lai (`eval/hybrid-order.mjs`, so với CSS Tailwind build đủ mọi class) | Trước | Sau |
| :--- | ---: | ---: |
| CSS tĩnh `<style>`/`<link>` của `@porbit/style`, A tĩnh + B động | 28 / 34 | **34 / 34** |
| CSS tĩnh `<style>`/`<link>` của `@porbit/style`, B tĩnh + A động | 11 / 34 | **34 / 34** |
| CSS do Tailwind build + runtime, hai chiều | 27 + 9 / 68 | **68 / 68** |
| Tổng (8 trang: HTML ban đầu, chèn lúc chạy, `<link>`, CSS Tailwind) | 153 / 272 | **272 / 272** |

Cặp đo gồm `p`/`px`, `inset`/`top`, `rounded`/`rounded-t`, `border`/`border-x`, `gap`/`gap-x`, màu cùng thuộc tính, `hover:` với `hover:`, `md:`/`lg:`/`2xl:` với nhau và với class gốc. Hiệu năng (`node eval/runtime-bench.mjs --hybrid`, CSS tĩnh 19,5 KB, 1.395 rule): tải ban đầu và 10 × 200 phần tử không đổi trong sai số, chèn 2.000 phần tử 81 → 57 ms (trung vị 11 lượt); bản CDN +0,3 KB gzip (44,4 KB).

Giới hạn: CSS tĩnh bị thay sau khi tải (HMR của Vite khi dev) làm mất rule runtime đã chèn vào sheet cũ — tải lại trang; CSS tĩnh khác nguồn vẫn theo thứ tự sheet như trước.
