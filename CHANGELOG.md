# Lịch Sử Thay Đổi

## Chưa phát hành

**Giấy phép**
- Thống nhất giấy phép Apache-2.0 (file `LICENSE` vốn là Apache-2.0; `package.json`, README, crate Rust và extension từng ghi MIT).

**Hiệu năng build tĩnh** (plugin PostCSS, CLI; CSS đầu ra không đổi từng byte)
- 6.000 file (fixture nhân bản, `eval/build-bench.mjs`, trung vị, cùng lần đo): build trong tiến trình mới 1147 → 676–707 ms (Tailwind CLI v4: 747 ms), build lại trong cùng tiến trình 747 → 492 ms (Tailwind: 516 ms). Máy 4 lõi đang bận, số đo dao động; xem `eval/build-bench.json`.
- Trích xuất với `hashClassName: false` không còn dựng engine thứ hai chỉ để đếm class khớp (mỗi class từng được giải và dựng rule hai lần).
- Bộ quét ứng viên cho Node (`src/scan.ts`) quét theo mã ký tự, cùng kết quả và thứ tự với `extractCandidates`; build lần đầu (hoặc khi nhiều file đổi) có từ 1.500 file thì đọc + quét thêm bằng `worker_threads` nếu máy còn lõi rảnh (`PRESENCE_STYLE_WORKERS=0` để tắt, số khác để ép).
- `minifyCss` nhanh hơn ~2 lần (tách khối bằng regex, nhớ thân khối giữa hai lượt, tập biến dùng tính một lần); liệt kê file không còn gọi `path.join`/`path.relative` cho từng file.
- `compileTailwindCss` trả thêm `timings` (thời gian từng pha).

**Rút gọn tên class cho Next.js / webpack / Rspack**
- `@porbit/style/webpack` (`PresenceStyleWebpackPlugin` + loader `@porbit/style/webpack-loader`) và `withPresenceStyle(nextConfig, { shortClassNames })` của `@porbit/style/next`: chỉ khi build production bằng webpack; bảng ánh xạ dựng một lần trước khi biên dịch, ghi ra `.next/cache/presence-style/short-class-names.json` và dùng chung cho loader (mã nguồn), plugin PostCSS (tuỳ chọn mới `shortClassNames: true`) và file CSS của bundle. Turbopack chưa hỗ trợ (giữ nguyên tên; dùng `next build --webpack`).
- Next.js 15 thật (`eval/next-short-classnames.sh`): ứng dụng shadcn/ui computed style khớp 3.170/3.170 phần tử (5 lượt); xem docs/guides/tailwind.md mục 8.
- Sửa `shortClassNames` (cả Vite/CLI/API) với tailwind-merge: `cn("px-4", "px-2")` không gộp được khi tên đã đổi (ứng dụng shadcn đo được 63% phần tử lệch). Tuỳ chọn mới `merge` (mặc định `'auto'`: bật khi mã dùng tailwind-merge/tailwind-variants/`@porbit/style/merge`) giữ tên gốc cho class có đối thủ cùng thuộc tính và cho tên giữ chuỗi con (`text-a`). Plugin webpack: file không qua loader (`public/`, `.md`, `.html`...) chỉ dùng để giữ tên class (`opaqueSources` của `createShortClassNames`).

**Sửa**
- Bản 1.0.0 trên npm đóng gói CSS của `@tailwindcss/typography` 0.5.4 (sinh từ `node_modules` cũ) thay vì 0.5.20 đã khai báo. Plugin đóng gói giờ được ghim đúng phiên bản trong `devDependencies`; `gen:tailwind-plugins` dừng nếu `node_modules` lệch với bản ghim.

**Editor**
- Language server: ô màu (`textDocument/documentColor`) cho class màu Tailwind/x-css; thiết lập từ editor qua `initializationOptions`/`workspace/didChangeConfiguration` (`tailwindFunctions`, `tailwindStylesheet`, `configFile`); hover và ô màu trong đối số `cn()`/`clsx()`/`cva()` và hàm ở `tailwindFunctions` (file cấu hình cũng nhận khoá `tailwindFunctions`).
- Extension VS Code (`editors/vscode`, 0.2.0) viết lại thành client LSP: ưu tiên `@porbit/style` cài trong dự án, không có thì dùng server đóng gói kèm; sẵn sàng đóng gói Marketplace (`npm run package`).
- Extension Zed (`editors/zed`): chạy `presence-style lsp` bằng Node của Zed, tự cài `@porbit/style` từ npm khi dự án chưa có.
- `scripts/lsp-smoke.cjs`: smoke test server qua stdio (initialize, completion, hover, documentColor, code action), chạy trên gói đã `npm pack` trong bước `package` của `check:all`.

## 1.0.0

Bản phát hành đầu tiên dùng thay Tailwind cho dự án thật: đo trên 4 dự án mã nguồn mở, 8 cấu hình v3, 9 gói plugin JS và một ứng dụng Next.js thật (xem `docs/strategy/danh-gia-1.0.md`).

**Đóng gói**
- Gói npm 6,8 MB → 1,37 MB giải nén (0,38 MB nén): entry trình duyệt tự chứa, entry Node dùng chung chunk; bỏ file không đọc lúc chạy. Bước `package` trong `check:all` kiểm mọi `exports` bằng `require` và `import`.
- Bản CDN `tailwind-auto.mjs` 62,9 → 44,1 KB gzip: dữ liệu Tailwind mã hoá gọn (32,8 → 20,7 KB) giải mã lúc nạp; bỏ từ điển x-css, cache và phần chỉ dùng cho editor khỏi bản này (class viết tắt x-css không chạy trên `tailwind-auto`; dùng `index-auto` cho x-css).

**Hiệu năng runtime**
- Rule chèn vào khối `@layer` có sẵn thay vì tạo khối mới mỗi lần (mỗi khối mới làm Chromium tính lại style cả trang): chèn 2.000 phần tử nhanh hơn `@tailwindcss/browser`, 10 lượt × 200 phần tử nhanh hơn ~6 lần. Bộ đo `eval/runtime-bench.mjs`.

**Thêm mới**
- Plugin JS Tailwind bất kỳ (`@plugin "x"`, `plugins: [require('x')]`) chạy qua API giả lập (`addUtilities`, `matchUtilities`, `addVariant`, `matchVariant`, `addBase`, `theme()`...) mà không cần cài `tailwindcss`. Đóng gói sẵn thêm `tailwindcss-animate` (bỏ bí danh sai sang `tw-animate-css`).
- Cấu hình v3: `prefix`, `important` (`true` và selector), `corePlugins`/`separator`/`safelist` như Tailwind v4 (bỏ qua), `tailwind.config.ts`; CSS v4 `@import "tailwindcss" prefix(tw) important`.
- Bộ đo dự án thật ép `:hover`/`:focus`/`:focus-visible`/`:active`, 4 độ rộng, dừng animation/transition để kết quả ổn định; thêm HyperUI, Magic UI, coss ui. Bước `projects` trong `check:all` (không được tụt dưới mốc).

**Sửa lỗi (phương ngữ Tailwind v4)**
- Class phương ngữ không nhận không còn rơi xuống cú pháp x-css (`z-1` từng ra `z-index:-1`): `XCSSDialect.owns()`.
- Giá trị trần ngoài danh sách (`z-1`, `opacity-64`, `scale-84`, `duration-450`, `delay-0`), `start-*`/`end-*`, `--spacing()`/`--theme()`/`--alpha()` trong giá trị tuỳ ý, modifier line-height (`/none`, `/tight`, `text-[10px]/6`), màu và độ mờ của bóng (`shadow-[4px_4px_0_0] shadow-black`, `shadow-sm/5`), nền theo gợi ý kiểu (`bg-[length:200%]`, gradient nhiều lớp), `(kiểu:--x)`, `filter-[…]`, `@apply` trong `@utility`.
- Biến theme mà CSS của dự án đọc (`:root { --border: --alpha(var(--color-black) / 8%) }`) được khai báo ở `:root,:host` trong layer thấp nhất như `@layer theme` của Tailwind; `@theme static` luôn phát. `--alpha()`, `--spacing()`, `--theme()`, `theme()` được khai triển trong mọi CSS của dự án và giá trị `@theme`. coss ui: 0 → 1289/1331 class khớp.
- Biến thể ghép như Tailwind: `has-`/`in-`/`not-` thay `&` bằng `*` (`has-prose-headings:` → `:has(* :is(...))`); `group-`/`peer-`/`in-`/`has-`/`not-` với biến thể tự định nghĩa nhiều bước (`@media` + selector) giữ at-rule; biến thể tên `...-hover` không còn bị thêm `@media (hover: hover)`; `not-[&:hover]:`, `has-[.x_&]:`, `has-[>img]:`, `not-[@media…]:`; `not-dark` dùng `@custom-variant dark` của dự án. Plugin JS: typography 169 → 198/198, react-aria-components 307 → 312/312 biến thể.

**Thay đổi cần biết**
- `tailwind-auto.mjs` không chạy class viết tắt x-css và không có cache localStorage.
- `@plugin "tailwindcss-animate"` dùng bản đóng gói thật của gói này (trước là bí danh sang `tw-animate-css`, khác giá trị).

## 0.10.0

Thay Tailwind và các công cụ quanh nó bằng một dòng cấu hình, có số đo cho từng phần (`npm run check:tailwind`).

**Sửa lỗi quan trọng**
- Thứ tự rule (cascade) phụ thuộc thứ tự gặp class: hai class cùng phần tử đụng nhau (`p-2 pr-2.5`) có thể hiển thị khác Tailwind tuỳ thứ tự quét file. Nay `tailwindV4Dialect().compare` mô phỏng `getClassOrder` của Tailwind (khớp 100%) và engine chèn rule đúng vị trí; điều kiện media/container của Tailwind thành at-rule nội tuyến trong sheet mặc định.

**Thêm mới**
- `@porbit/style/postcss`: thay `@tailwindcss/postcss` (Next.js, Remix, Astro, Vite...). `@source`, `@source not`, `@source inline()`, `source(...)`, `.gitignore`, watch, `mergeTable`. Next.js 15: 0 khác biệt hiển thị, CSS nhỏ hơn 7,5%.
- `@porbit/style/merge` (`cn`, `twMerge`, `createMerge`, `buildMergeTable`) và `@porbit/style/merge/lite`; `virtual:presence-style-merge`; lệnh `presence-style merge-table`.
- `@porbit/style/prettier`: sắp class như prettier-plugin-tailwindcss (`tailwindStylesheet`, `tailwindFunctions`, `tailwindPreserveDuplicates`, `tailwindPreserveWhitespace`). `presence-style sort` và LSP dùng cùng thứ tự; `findClassStrings` đọc chuỗi trong `cn()`/`cva()`/biểu thức `className`.
- LSP: gợi ý class Tailwind (`dialect.classList()`, cả theme/`@utility` của dự án), biến thể, ô màu (oklch → hex), CSS khi chọn mục.
- `@config "./tailwind.config.js"` (v3): `tailwindConfigToCss`, `createConfigLoader`; theme/extend, reset namespace, `darkMode`, plugin quen thuộc.
- `tailwind-auto.mjs data-hybrid`: trang có CSS tĩnh, runtime chỉ sinh CSS cho class mới (đọc class và theme từ CSSOM).
- Theme: `--color-*: initial`; giá trị đặt tên `--spacing-*` (`p-gutter`); `letter-spacing`/`font-weight` của `--text-*`; class gốc đứng một mình (`rounded`).
- Bộ đo: `eval/tailwind-order.mjs`, `eval/prettier-sort.mjs`, `eval/merge-accuracy.mjs`, `eval/dynamic-classes.mjs`, `eval/next-parity.sh`; `real-project.mjs` thêm tổ hợp class thật, chế độ PostCSS và hai fixture v3.

**Thay đổi cần biết**
- Token của phương ngữ Tailwind dùng at-rule nội tuyến (`[@media_(width_>=_48rem)]:...`) thay vì media key `tw-md`.
- `@utility` giữ mọi khai báo trùng tên như Tailwind (khai báo sau thắng khi hợp lệ).
- `tailwind-auto` 62,9 KB gzip (ngân sách 63 KB): +4,9 KB cho thứ tự cascade chính xác.

## 0.9.0

Đóng các khoảng cách còn lại với Tailwind v4 và đo trên dự án thật. Đo trên Chromium so với tailwindcss 4.3.5 (`npm run check:tailwind`).

**Thêm mới**
- `parseTailwindStylesheet(source, { resolve })`: `@custom-variant` (dạng ngắn, at-rule, dạng khối `@slot`, danh sách selector), `@utility name-*` với `--value()`/`--modifier()`/`--spacing()`/`--alpha()`, selector và `@media` lồng; `@import`/`@plugin` giải qua `resolve`, trả thêm `variants` và `unresolved`.
- `tailwindV4Dialect({ variants })`; `@apply` kèm biến thể, độ mờ, `!important`; `@layer base/components` vào layer nền; utility người dùng trùng tên utility sẵn có cùng áp như Tailwind.
- Một class nhiều rule: `container`, `not-hover`, `not-group-hover`..., ba điều kiện media trở lên (`md:dark:hover`), `not-@md`, quan hệ lồng (`group-peer-hover`, `has-group-hover`...). Độ phủ biến thể 403/403.
- `@porbit/style/tailwind-plugins`: tw-animate-css (và `tailwindcss-animate`), `@tailwindcss/forms`, `@tailwindcss/typography`, sinh bằng `npm run gen:tailwind-plugins`. `tailwind-auto` chỉ tải khi stylesheet có `@import`/`@plugin`.
- Class v3 còn hợp lệ ở v4 (`flex-shrink-0`, `bg-gradient-to-r`, `break-words`, `max-w-screen-*`...).
- `presence-style lsp` và `@porbit/style/lsp` (`startLanguageServer`, `createLanguageService`): language server qua stdio cho mọi editor; hướng dẫn `docs/guides/editors.md`.
- Cấu hình `"tailwindCss": "src/app.css"`: CLI, LSP đọc `@theme`/`@utility`/`@custom-variant`/plugin của dự án (`resolveConfigFile(config, { readStylesheet })`, `createStylesheetReader`).
- Bộ đo `eval/real-project.mjs` (fixture shadcn/ui v4, 4 trạng thái), `eval/tailwind-plugins.mjs`; cả hai nằm trong bước `tailwind` của `check:all`. Thêm 3 kịch bản biến thể vào `eval/tailwind-parity.mjs`.

**Sửa lỗi**
- Engine: class có token khác selector/media bị bỏ cả class; nay sinh nhiều rule. Rule có selector trình duyệt không hỗ trợ bị bỏ riêng thay vì bỏ cả class.
- Preflight chứa `--theme(...)` chưa dịch (font của `html` không hợp lệ); nay là `var(...)` theo theme của dự án.
- `@layer base` của dự án nằm sau thứ tự layer của engine nên đè utility.
- `minify` bỏ `@property` chỉ dùng trong `@keyframes`.
- `explainClass` báo `p-4` không hợp lệ khi phương ngữ Tailwind đã sinh CSS.

**Kết quả đo**
- 23.286/23.286 class, 956/956 tổ hợp biến thể, 3.327/3.327 runtime, plugin 528/528, shadcn/ui v4 769/769 ở mỗi trạng thái.
- `tailwind-auto` 58,0 KB gzip (ngân sách 59 KB); `@tailwindcss/browser` 75,3 KB.

## 0.8.0

Chạy class Tailwind v4 với kết quả như Tailwind. Đo trên Chromium so với tailwindcss 4.3.5 (`npm run check:tailwind`).

**Thêm mới**
- `tailwindV4Dialect()` (`@porbit/style/tailwind`, `@porbit/style/tailwind-v4`): dữ liệu sinh từ chính compiler Tailwind (`npm run gen:tailwind`, `src/tailwind-generated.ts`). Khớp 23.285/23.286 class, 680/680 tổ hợp biến thể, 3.327/3.327 qua đường runtime, 385/403 biến thể. Breakpoint, container query, dark, hover, group/peer có tên, has/not/in, nth, rtl, supports, starting, độ mờ `/50`, `!`, giá trị tuỳ ý, `bg-(--x)`.
- Theme tuỳ chỉnh (`theme`), `@utility` tên cố định (`utilities`), `@apply` class gốc trong CSS bổ sung (`css`); `parseTailwindStylesheet()` đọc `@theme`/`@utility`/`@apply`.
- `dist/tailwind-auto.mjs`: thay `@tailwindcss/browser` (55,6 KB so với 75,3 KB gzip), đọc `<style type="text/tailwindcss">`, `data-preflight`, `data-dark`.
- Engine: selector có `&` (`@:where(&;>;*)`), breakpoint có query `@...` (container/supports), media key nội tuyến `[@...]`, phương ngữ mang `breakpoints`/`baseCss`/`trusted`. Engine Rust hỗ trợ các dạng này.
- `minify` cho CSS tĩnh (`extract`, CLI `--minify`, plugin Vite mặc định bật).
- Bộ đo `eval/tailwind-parity.mjs`, `eval/tailwind-variants.mjs`; bước `tailwind` trong `check:all`; ngân sách `tailwind-auto` ≤ 57 KB.
- Hướng dẫn `docs/guides/tailwind.md`; mục 11 trong `docs/strategy/danh-gia-va-dinh-huong.md`.

**Hiệu năng**
- CLI `extract`/`check`/`sort` đọc file đồng bộ: 6.200 file từ 1,3–1,5 s xuống 0,33–0,40 s (ngang Tailwind CLI).

**Thay đổi hành vi cần biết**
- Cấu hình JSON `"dialects": ["tailwind"]` nay là phương ngữ v4; bản cũ dùng `"tailwind-legacy"`. `tailwindDialect()` (bản cũ, breakpoint x-css) giữ nguyên để không phá mã đang dùng.
- `getCssString()` có thể chứa base CSS của phương ngữ (`@property`...). `analyze.generateCssFor` trừ phần nền này.


## 0.7.3

**Công cụ phát triển**
- Cổng kiểm tra cục bộ thay cho CI: `npm run check:all` (typecheck, unit, build, ngân sách dung lượng, file sinh tự động, engine Rust, kiểm tra trên Chromium, ngưỡng bộ đánh giá) và `check:quick`.
- Git hook trong `.githooks` (`npm run hooks:install`): `pre-commit` chạy cổng nhanh, `pre-push` chạy cổng đầy đủ. `prepublishOnly` chạy cổng đầy đủ.
- `scripts/browser-checks.cjs`: thứ tự layer (CSS tĩnh và runtime), class bộ component, so hiển thị CSS Node/Rust kèm trang xung đột layer/media có chủ đích.
- `eval/score.cjs` ghi thêm `eval/results.json`; tự tìm Chromium (Playwright, `CHROMIUM_PATH`, `/opt/pw-browsers/chromium`).


## 0.7.2

Tích hợp và tối ưu engine Rust `presence_style` (x-core 0.2.0), sửa lỗi thứ tự cascade ở cả hai engine.

**Sửa lỗi (engine Node)**
- Runtime trình duyệt, cấu hình mặc định: thẻ `<style>` khai báo thứ tự layer trùng id với thẻ bootloader nên bị `removeBootloaderStyle()` xoá sau hai khung hình; từ đó layer được xếp theo lần xuất hiện và layer thấp có thể thắng layer cao (`7cGreen 3cOrange` ra màu cam). Nay câu `@layer l0, ..., l23;` nằm ở đầu stylesheet gốc của engine và thẻ khai báo có id riêng (`<styleId>-layers`).
- CSS tĩnh (`extract`, CLI, plugin Vite, static-first) không khai báo thứ tự layer, nên `2cRed cBlue` ra màu xanh. Nay CSS tĩnh luôn bắt đầu bằng `LAYER_ORDER_STATEMENT`.
- Bỏ dòng trống thừa trong CSS tĩnh.
- `check`/`fix_classes`/extension: nhận ra `g16px` (`grid: 16px`, trình duyệt bỏ qua) và gợi ý `gap16px`.

**Engine Rust (x-core / x-css 0.2.0)**
- Parity với Node 0.7: tên CSS đầy đủ (586 tên), `-webkit-*`, `--bien[...]`, `_` trong `[...]`, `-.5rem`, chuỗi `&`, chặn giá trị/selector có thể thoát khối rule. Conformance 3314/3314 case; so hiển thị trên Chromium: 0 khác biệt.
- `css_text()` khai báo thứ tự layer, bọc `@layer lN{}`, sắp media theo thứ tự breakpoint (trước đây theo bảng chữ cái nên `sm:` đè `xl:`).
- Ghi nhớ kết quả từng token và cache `css_text()`: `clsx` lặp ~20 lần nhanh hơn, `css_text()` ~150 lần nhanh hơn.
- Rule giữ thứ tự chèn (giống Node); `rules()` trả theo thứ tự này.
- Ví dụ Yew/Leptos/Sycamore dùng `g<N>px` (grid) thay vì `gap<N>px`: đã sửa 32 chỗ.
- `Cargo.toml` trỏ `repository`/`homepage` về GitHub thay vì đường dẫn máy cục bộ.

**Bộ dữ liệu**
- `spec/dictionary.json` có thêm khoá `STANDARD_CSS_PROPERTIES`.
- Conformance thêm case chuỗi `&` và giá trị/selector không an toàn (3294 → 3314).


## 0.7.1

Sửa lỗi phát hiện khi dựng thử một trang thật (Vite + phương ngữ Tailwind + component mẫu + static-first).

**Sửa lỗi**
- `preload.skipInitialScan` bỏ hẳn lần quét đầu nên class do JavaScript sinh trước khi observe (ví dụ `${button()}`) không bao giờ có CSS. Nay lượt quét được dời sang lúc trình duyệt rảnh: paint đầu vẫn nhanh (~3–4 ms với trang mẫu), class thiếu vẫn được bù.
- `presence-style check` báo nhầm class Tailwind trong dự án bật phương ngữ: file cấu hình nhận `"dialects": ["tailwind"]`; CLI, MCP và extension VS Code đều hiểu khoá này.

**Thêm mới**
- `getComponentClasses()`; tuỳ chọn `components: true` cho plugin Vite và `--components` cho `extract`.
- `extract`, `check`, `sort` tự đọc `presence-style.config.json` ở thư mục hiện tại khi không truyền `--config`.
- `presence-style init --tailwind`.

**Đã thử và không làm**
- Tách chunk dùng chung cho bản ESM (`splitting`): bản CDN tăng 21,4 → 24,9 KB gzip và phải tải 7 file nối tiếp; shim Node của MCP/Vite bị gom vào chunk dùng chung làm Vite build lỗi.


## 0.7.0

Giai đoạn 2–4 của lộ trình (`docs/strategy/danh-gia-va-dinh-huong.md`).

**Hiệu năng (giai đoạn 2)**
- Static-first: tuỳ chọn `preload` (manifest class đã có CSS tĩnh) và `preload.skipInitialScan`. 3.000 node trên Chromium: khởi tạo ~24 ms → ~15–19 ms (`preload`) → ~2,7 ms (`skipInitialScan`).
- `presence-style extract --manifest`, `createPreloadManifest`, `ExtractResult.matchedClasses`.
- Plugin Vite `@porbit/style/vite`: CSS ảo `virtual:presence-style.css` và manifest `virtual:presence-style-manifest` cho dev và build, cập nhật nóng theo file.
- Đã đo và không làm: tạo stylesheet theo media khi cần (12 sheet rỗng chỉ tốn 0,1 ms), gom `insertRule` (300 rule: 0,6 ms so với 0,5 ms).

**Trải nghiệm người viết (giai đoạn 3)**
- `@porbit/style/analyze`: `explainClass`, `analyzeClasses`, `fixClasses`, `sortClasses`, `sortClassesInSource`, `findClassAttributes`, `findClassTokens`, `isXcssLike`.
- `presence-style check` (lỗi và xung đột theo `file:dòng:cột`, mã thoát 1) và `presence-style sort [--write|--check]`.
- Extension VS Code trong `editors/vscode`: diagnostic, quick fix, hover CSS, gợi ý alias, lệnh sắp xếp.
- README tiếng Anh `README.en.md`.

**Cho AI (giai đoạn 4)**
- Phương ngữ runtime: tuỳ chọn `dialects` và `tailwindDialect()` — viết thẳng class Tailwind, không cần build.
- `presence-style init [--agents] [--mcp]`: config, khối quy tắc trong `AGENTS.md`/`CLAUDE.md`, cấu hình MCP cho Claude Code, Cursor, VS Code.
- `llms.txt`, `llms-full.txt` (`npm run gen:llms`); resource MCP `presence-style://docs/agent-rules`.
- Bộ đánh giá `eval/`: chấm class trên Chromium thật và độ chính xác của `fix_classes` trên tập độc lập (18/20 ở lần chạy đầu).
- `fix_classes` khái quát hơn: tên CSS viết liền (`fontsize14px`), alias tự đoán (`bdf` → `bkdf`), từ khoá có dấu gạch (`dinlineblock` → `dIb`), kiểu `property-giá-trị` (`cur-pointer` → `crP`), thói quen Tailwind (`w-full` → `w100%`, `mt-4` → `mt16px`); không đoán bừa (`vah`, `xyz123` giữ nguyên).
- Tailwind helper bổ sung `ring-*`, `ring-{màu}`, `accent-*`, `caret-*`, `tabular-nums` và nhóm `*-nums`, `border-collapse`/`border-separate`.

**Thay đổi hành vi cần biết**
- Bảng coverage: nhóm `ring` chuyển từ `manual` sang `partial` (ring dùng box-shadow nên thay bóng đổ `shadow-*` trên cùng phần tử).
- Alias chính tắc được ưu tiên khi gợi ý sửa (`bdra`, `fnw`, `mw`, `ff`, `bxsh`).


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
