# Đo Trên Nhiều Dự Án Thật

Sinh bởi `npm run build && node eval/real-project.mjs --all` (tailwindcss@4.3.5, Chromium). Mỗi class hợp lệ của dự án (quét từ mã nguồn, chỉ giữ class mà Tailwind sinh được CSS với chính file CSS của dự án: `@theme`, `@utility`, `@custom-variant`, `@plugin`) được render hai lần — với CSS do Tailwind thật sinh và với CSS do @porbit/style sinh — rồi so TOÀN BỘ computed style của phần tử và hai phần tử con.

Lượt đo: **mặc định** (1280 px) · **mở**/**đóng** (`data-state`, `data-open`, `aria-*`... đặt trên phần tử, cha `.group`, anh `.peer`) · **.dark** · **:hover**, **:focus** (kèm `:focus-within`), **:focus-visible** (kèm `:focus`), **:active** (kèm `:hover`) ép bằng CDP `CSS.forcePseudoState` trên phần tử, cha `.group`, anh `.peer` · **375/768/1600px** (độ rộng khung nhìn). Hai chế độ: "không build" (`parseTailwindStylesheet` + `tailwindV4Dialect`) và plugin PostCSS. Ô **in đậm** là lượt có lệch.

## Từng Class

| Dự án | Chế độ | Class | Chuyển được | mặc định | mở | đóng | .dark | :hover | :focus | :focus-visible | :active | 375px | 768px | 1600px |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shadcn/ui v4 | không build | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 |
| shadcn/ui v4 | PostCSS | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 |
| coss ui | không build | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 |
| coss ui | PostCSS | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 |
| daisyUI 5 | không build | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 |
| daisyUI 5 | PostCSS | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 |
| HyperUI | không build | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 |
| HyperUI | PostCSS | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 |
| Magic UI | không build | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 |
| Magic UI | PostCSS | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 |
| TailAdmin Vue | không build | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 |
| TailAdmin Vue | PostCSS | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 |
| v3-extend | không build | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 |
| v3-extend | PostCSS | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 |
| v3-replace | không build | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 |
| v3-replace | PostCSS | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 |

## Tổ Hợp (Chuỗi Class Thật Trên Một Phần Tử)

| Dự án | Chế độ | Tổ hợp | mặc định | mở | đóng | .dark | :hover | :focus | :focus-visible | :active | 375px | 768px | 1600px |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shadcn/ui v4 | không build | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 |
| shadcn/ui v4 | PostCSS | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 |
| coss ui | không build | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 |
| coss ui | PostCSS | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 |
| daisyUI 5 | không build | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 |
| daisyUI 5 | PostCSS | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 |
| HyperUI | không build | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 |
| HyperUI | PostCSS | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 |
| Magic UI | không build | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 |
| Magic UI | PostCSS | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 |
| TailAdmin Vue | không build | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 |
| TailAdmin Vue | PostCSS | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 |
| v3-extend | không build | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 |
| v3-extend | PostCSS | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 |
| v3-replace | không build | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| v3-replace | PostCSS | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |

## Lượt Có Chạm Biến Thể Không

Số class mà chính Tailwind cho computed style khác lượt mặc định (0 nghĩa là lượt đó không kiểm được biến thể nào của dự án).

| Dự án | mở | đóng | .dark | :hover | :focus | :focus-visible | :active | 375px | 768px | 1600px |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shadcn/ui v4 | 39 | 18 | 23 | 13 | 6 | 15 | 15 | 20 | 7 | 7 |
| coss ui | 42 | 17 | 45 | 16 | 3 | 11 | 18 | 70 | 5 | 5 |
| daisyUI 5 | 5 | 0 | 29 | 5 | 6 | 13 | 5 | 39 | 30 | 23 |
| HyperUI | 0 | 0 | 69 | 28 | 15 | 17 | 30 | 24 | 10 | 3 |
| Magic UI | 3 | 1 | 28 | 22 | 0 | 1 | 24 | 25 | 18 | 11 |
| TailAdmin Vue | 0 | 0 | 59 | 17 | 7 | 8 | 17 | 72 | 48 | 9 |
| v3-extend | 0 | 0 | 2 | 1 | 4 | 4 | 1 | 14 | 8 | 5 |
| v3-replace | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 2 | 0 |

## Nguồn

- **shadcn/ui v4** — shadcn/ui `new-york-v4/ui`, MIT. Chi tiết lệch: `eval/REAL-PROJECT.md`.
- **coss ui** — [coss ui](https://github.com/origin-space/originui) (Origin UI nay là coss.com/ui, dựng trên Base UI) `packages/ui/src/components` + `packages/ui/src/styles/globals.css` (commit 0da83f8), MIT, © coss.com và Origin UI. Chi tiết lệch: `eval/REAL-PROJECT-coss-ui.md`.
- **daisyUI 5** — Trang mẫu tự viết theo ví dụ trong tài liệu [daisyUI](https://daisyui.com) 5 (`daisyui@5.8.1`, plugin `@plugin "daisyui"`), daisyUI: MIT, © Pouya Saadeghi. Chi tiết lệch: `eval/REAL-PROJECT-daisyui.md`.
- **HyperUI** — [HyperUI](https://github.com/markmead/hyperui) `public/examples/{application,neobrutalism}` + `src/styles/component.css` (commit 3032a06), MIT, © Mark Mead. Chi tiết lệch: `eval/REAL-PROJECT-hyperui.md`.
- **Magic UI** — [Magic UI](https://github.com/magicuidesign/magicui) `apps/www/registry/magicui` + `apps/www/styles/globals.css` (commit 6f7b531), MIT, © Magic UI. Chi tiết lệch: `eval/REAL-PROJECT-magicui.md`.
- **TailAdmin Vue** — [TailAdmin Vue](https://github.com/TailAdmin/vue-tailwind-admin-dashboard) qua gói npm [`@dynamia-tools/tailadmin-vue`](https://www.npmjs.com/package/@dynamia-tools/tailadmin-vue)@26.9.7 `src/components` (bỏ `ext/`) + `src/assets/theme.css`, MIT, © TailAdmin. Chi tiết lệch: `eval/REAL-PROJECT-tailadmin.md`.
- **v3-extend** — `tailwind.config.js` kiểu v3 với `theme.extend` (tự viết). Chi tiết lệch: `eval/REAL-PROJECT-v3-extend.md`.
- **v3-replace** — cấu hình v3 thay hẳn theme (tự viết). Chi tiết lệch: `eval/REAL-PROJECT-v3-replace.md`.

Nguồn, giấy phép và phần đã chỉnh của từng fixture: README trong `eval/fixtures/<tên>/`.

## Phân Tích Lệch

Ghi lại khi đo lần đầu; mục nào đã sửa có ghi **Đã sửa**. Nhóm theo nguyên nhân dự đoán; số liệu từ lượt mặc định, chế độ
"không build" (chế độ PostCSS cho cùng kết quả). Chi tiết từng class: các file `REAL-PROJECT-*.md`.

### 1. Biến theme chỉ được CSS của dự án đọc không được phát ra (coss ui: lệch 1331/1331) — Đã sửa

**Đã sửa:** CSS nền của phương ngữ khai báo `:root,:host{...}` ở layer thấp nhất cho mọi biến theme mà CSS của dự án
(sau `@apply`) đọc qua `var(--x)`, kể cả biến mà giá trị theme đọc; `@theme static` luôn phát; `--alpha()`/`--spacing()`/
`--theme()`/`theme()` được khai triển trong mọi CSS và trong giá trị `@theme`. coss ui: 0 → 1289/1331 ở lượt mặc định,
tổ hợp 0 → 287/379 (đúng như đo chẩn đoán dưới). Phần còn lại thuộc các nhóm 3–12 (giải giá trị utility).

coss ui khai báo màu ngữ nghĩa ngoài `@theme`: `:root { --border: --alpha(var(--color-black) / 8%); --foreground: var(--color-neutral-800) }`
rồi `@layer base { * { @apply border-border outline-ring/50 } }`. Tailwind phát `--color-black`, `--color-neutral-800`...
vào `:root` vì CSS của dự án dùng chúng. @porbit/style chỉ nhúng giá trị dự phòng trong `var()` của utility
(`border-color: var(--color-border, var(--border))`) nên `--border` tham chiếu biến không tồn tại: mọi phần tử có
`border-color` = currentColor (đen) thay vì `oklab(0 0 0 / 0.08)`, chữ thành đen. Thêm nữa, `--alpha()` trong CSS ngoài
`@theme` (`:root`, `.dark`) được giữ nguyên thay vì khai triển thành `color-mix(in oklab, … 8%, transparent)`.
Hướng sửa: khi dựng `css` của `parseTailwindStylesheet`, khai triển `--alpha()`/`--spacing()`/`--theme()` và phát mọi
biến theme mà CSS đó (sau `@apply`) đọc qua `var(--…)`.

Đo chẩn đoán (không commit): khai triển `--alpha()` và thêm tay khối `:root` khai báo 25 biến màu đó thì coss ui
đạt 1288/1331 (96,8%) ở lượt mặc định, 1285–1291 ở các lượt khác, tổ hợp 287/379 (mở: 274/379); phần còn lại thuộc các nhóm dưới.
Cùng phép đo sau luồng H (giá trị utility, mục 2–11): 1331/1331 ở mọi lượt trừ "đóng" 1330 (`not-[[class^='h-']]:` — biến thể), tổ hợp 379/379 (đóng: 377).

### 2. Class phương ngữ không nhận rơi xuống cú pháp x-css gốc và sinh CSS sai (nguy hiểm)

**Đã sửa (luồng H):** `XCSSDialect.owns(class)`; phương ngữ Tailwind giữ class có gốc là họ/utility Tailwind (hoặc của dự án) và giá trị viết kiểu Tailwind, engine không thử x-css nữa (`z-01` không sinh gì như Tailwind; `m-10px`, `dF`, `cRed@:hover` vẫn là x-css).

`z-1` → `z-index:-1`, `z-2` → `z-index:-2` (Magic UI, coss ui): phần tử bị đẩy ra sau thay vì lên trước.
`opacity-64` → `opacity:-64` (hiển thị như 0). Tailwind v4 nhận mọi số nguyên trần cho các họ này; phương ngữ dựng từ
`getClassList()` (z-0/10/…/50, opacity bước 5) nên trả null, rồi `extractFromClasses` hiểu class theo ngữ pháp x-css
(`z` + `-1`). Nên: khi phương ngữ Tailwind bật, class có dạng utility Tailwind mà phương ngữ không nhận thì không sinh gì
(hoặc nhận đủ giá trị trần, xem mục 3).

### 3. Giá trị trần ngoài bảng `getClassList()`

**Đã sửa (luồng H):** bộ sinh dò từng mẫu họ bằng Tailwind (`37`, `13.25`, `0.3`, `3/7`, `0`) và ghi dấu `#int`/`#pint`/`#q`/`#num`/`#frac` vào bộ giá trị; số phải viết chuẩn như Tailwind (`z-01`, `p-.5` không hợp lệ).

`z-1`, `z-2`, `opacity-64`, `scale-84`, `scale-98`, `scale-120`, `rotate-10`, `duration-450`, `duration-0`, `delay-0`
(coss ui, Magic UI; cả dạng có biến thể `data-disabled:opacity-64`, `sm:data-ending-style:scale-98`...). Tailwind nhận mọi số
(`z-<integer>`, `opacity-<number>`, `scale-<number>`, `rotate-<number>`, `duration-<number>`).

### 4. `start-*` / `end-*` (inset-inline-start/end)

**Đã sửa (luồng H):** bộ sinh thêm class dò (`4`, `37`, `1/2`, `3/7`) cho mọi gốc trong `ds.utilities.keys("functional")` để họ vắng giá trị số trong getClassList có mẫu.

HyperUI: `start-0`, `start-3`, `end-0`, `peer-checked:start-6/8`, `group-open:start-0` — chỉ 8 class nhưng nằm trong
**62 tổ hợp** (dropdown, ô nhập có icon, toggle). coss ui: `end-0`, `end-0.5`, `end-2`, `after:start-1/2`.
Tailwind 4.3.5 vẫn sinh (không còn trong `getClassList()` vì đã có `inset-s-*`/`inset-e-*`).

### 5. `--spacing()` / `--theme()` trong giá trị tuỳ ý

**Đã sửa (luồng H):** khai triển `--spacing()`, `--theme(--x[/a][, dự phòng])`, `--alpha()` trong giá trị tuỳ ý và thuộc tính tuỳ ý như Tailwind; tách `+`/`-` sau số có đơn vị chữ (`1lh+…`).

coss ui (~25 class): `px-[calc(--spacing(3)-1px)]`, `py-[max(--spacing(4),4vh)]`, `w-[calc(100%-(--spacing(12)))]`,
`pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(4))]`, `inset-shadow-[0_1px_--theme(--color-black/4%)]`,
`[--composer-padding:--spacing(2)]`. Được "chuyển" nhưng giữ nguyên `--spacing(3)` → khai báo không hợp lệ (padding 0).
Tailwind thay bằng `calc(var(--spacing) * 3)` và `color-mix(...)`.

### 6. Modifier line-height của `text-*`

**Đã sửa (luồng H):** `/none` (=1), `/tight` (`--leading-*`), bội 0.25, `/[x]`, `/(--x)`; cỡ chữ tuỳ ý được thêm `line-height`.

`text-sm/none`, `text-xs/none` (HyperUI, không chuyển → cỡ chữ 16px), `text-[10px]/6` (modifier bị bỏ, chỉ còn
`font-size:10px`), `sm:text-xs/(--text-xs--line-height)`, `text-[calc(...)]/none` (coss ui).

### 7. Bóng tuỳ ý không có màu: `shadow-[4px_4px_0_0]`

**Đã sửa (luồng H):** mô phỏng `replaceShadowColors` của Tailwind 4.3 (cả inset-/drop-/text-shadow, nhiều lớp).

HyperUI neobrutalism (5 class, 30 tổ hợp với `shadow-black`/`dark:shadow-white`): Tailwind chèn
`var(--tw-shadow-color, currentcolor)` vào từng lớp bóng (`--tw-shadow: 4px 4px 0 0 var(--tw-shadow-color, currentcolor)`)
nên `shadow-black` đổi được màu; phương ngữ giữ `--tw-shadow: 4px 4px 0 0` nên `shadow-black` vô tác dụng.

### 8. Modifier độ mờ của bóng: `shadow-xs/5`, `shadow-sm/5`, `shadow-lg/5`

**Đã sửa (luồng H):** `--tw-*-shadow-alpha` + `oklab(from … l a b / 5%)` (currentcolor: color-mix) như Tailwind.

coss ui (cả `data-checked:shadow-sm/5`, `in-data-[variant=card]:shadow-xs/5`...): không chuyển. Tailwind đặt
`--tw-shadow-alpha: 5%` và màu `oklab(from … l a b / 5%)`.

### 9. Giá trị tuỳ ý của nền

**Đã sửa (luồng H):** mẫu theo gợi ý kiểu (dò `bg-[length:…]`…), loại `image`/`position`/`size`/`var` dò từ Tailwind; `bg-size-[…]`, `bg-position-[…]`, `filter-[…]`, `mask-size-(…)` có mẫu (gốc lấy từ `ds.utilities`).

- `bg-[length:200%]` → `background-position:200%`: bỏ qua gợi ý kiểu `length:` (phải là `background-size`). Magic UI.
- `bg-[linear-gradient(a),linear-gradient(b),linear-gradient(c)]` (nhiều lớp) và
  `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,...)]` → `background-color:…` (không hợp lệ) thay vì
  `background-image`: suy luận kiểu không nhận ra danh sách ảnh / `repeating-*-gradient`. Magic UI, HyperUI.
- `bg-size-[…]`, `bg-position-[…]` (`bg-size-[200%_auto]`, `bg-position-[0_0]`, `after:bg-size-[100%_200%]`): không chuyển. Magic UI.

### 10. Cú pháp khác chưa chuyển

**Đã sửa phần giá trị (luồng H):** `(kiểu:--x)`, `filter-[…]`, `mask-*-(--x)`. Còn `not-[&:hover]:` (biến thể, ngoài phạm vi luồng H).

`border-(length:--border-beam-width)` và `text-(color:--shiki-dark)!` (gợi ý kiểu trong cú pháp biến `(kiểu:--x)`),
`filter-[url(#threshold)_blur(0.6px)]` (`filter-[…]` tuỳ ý), `mask-position-(--x)`/`mask-size-(--x)` (coss ui). Magic UI.
**Đã sửa:** `not-[&:hover]:duration-1000` (`not-[…]`/`has-[…]`/`in-[…]`/`group-[…]` với selector có `&`, `[>img]`,
`[@media…]`); Magic UI 575 → 576/586 ở lượt mặc định, tổ hợp 237 → 238/245.

### 11. `@utility container` trùng tên utility có sẵn

**Đã sửa (luồng H):** `@apply` trong `@utility` (phần có biến thể/media thành rule riêng của utility) — trước đây bị bỏ nên phần của dự án mất; utility của dự án/plugin trùng gốc sẵn có giữ cả phần sẵn có khi có modifier (`scrollbar-thumb-red-500/50`).

Magic UI: `@utility container { @apply 3xl:max-w-screen-2xl mx-auto max-w-[1400px] px-4 lg:px-8 }`. Tailwind gộp với
`container` có sẵn và phần của dự án thắng (`max-width:1400px` ở 1280 px); @porbit/style cho `1280px` (container có sẵn
thắng hoặc phần của dự án bị bỏ). coss ui có `@utility container` tương tự (`max-w-[1416px]`).

### 12. Lệch kéo theo (không phải lỗi riêng)

`fixed`, `sr-only`, `absolute start-0 …` lệch `bottom`/`inset-block-end` vài px: vị trí phụ thuộc chiều cao trang, mà
trang lệch vì các phần tử phía trên lệch chiều cao (mục 4–6, 10). Hết khi các mục kia được sửa.

### 13. daisyUI 5: component trong layer con, at-rule lồng trong utility của plugin — Đã sửa

Đo lần đầu (engine 1.0.0, cùng bộ đo): chuyển được 161/410 class, khớp 10/410 ở lượt mặc định (`[data-theme=dark]`
241/410), tổ hợp 5/242, cả hai chế độ. Nguyên nhân và cách sửa:

1. **At-rule lồng trong rule của component bị bỏ** (249 class "chưa chuyển"): daisyUI đặt gần như mọi khai báo trong
   `@layer daisyui.l1.l2.l3 { ... }` (cả `l1`, `l1.l2`, `l1.l2.l3.l4`), kèm `@supports`, `@media`, `@starting-style`,
   `@scope (&)` lồng trong rule. API plugin chỉ nhận `@media`, phương ngữ bỏ mọi at-rule khác trong `@utility`.
   **Sửa:** `utilityRules` giữ chuỗi at-rule của từng rule (`Rule.at`), `place()` nối sau at-rule của biến thể thành key
   nội tuyến lồng `[@media_x{@layer_y]`, engine (`core.ts`) bọc lần lượt; khai báo đứng sau một khối lồng thành rule mới
   (giữ thứ tự cascade như CSS lồng). `@scope (&) { :where(:scope > x) }` (join) đổi thành rule con với `:scope` → `&`.
2. **Preflight thắng component:** Tailwind đặt component trong `@layer utilities` (→ `utilities.daisyui.l1...`), cao hơn
   `@layer base`. Ta để preflight/CSS nền thẳng trong `l0`, mà khai báo thẳng trong một layer luôn thắng layer con của nó
   (`* { padding: 0 }` đè `.btn { padding-inline }`). **Sửa:** CSS nền vào layer con `l0.theme`/`l0.base`/`l0.components`,
   thứ tự khai báo ở đầu CSS nền (`@layer l0{@layer theme, base, components;}`): thấp hơn mọi utility và mọi layer con
   của plugin, `!important` của nền thắng utility như Tailwind.
3. **Biến theme tự tham chiếu:** `config.theme.extend.colors.primary = 'var(--color-primary)'` thành
   `@theme { --color-primary: var(--color-primary) }`; ta phát `:root{--color-base-content: var(--color-base-content)}`
   (vòng lặp → biến hỏng, chữ đen) vì CSS nền đọc biến đó. Tailwind coi theme cấu hình là `reference` nên không phát.
   **Sửa:** không phát và không dùng làm giá trị dự phòng biến theme có giá trị đúng bằng `var(<chính nó>)`.
4. **Dấu `;` trong giá trị:** data URL của `loading-*` có `values='0;0.475;1'`; engine đọc `;` trong giá trị là khoảng
   trắng. **Sửa:** phương ngữ mã hoá `;` thành `';` (dấu `;` thật của engine).
5. **Bộ đo:** animation 0,25 s (`toast`, `rating`) có lúc chạy xong trước khi đo (máy bận, lượt ép trạng thái chậm) và
   biến khỏi `getAnimations()`, hai phía lệch ngẫu nhiên. Đóng băng dòng thời gian animation bằng CDP
   `Animation.setPlaybackRate` 0 trước khi nạp trang. Lượt tối của fixture đặt `data-theme="dark"` (khoá `dark` của
   `fixture.json`); plugin JS chưa đóng gói chạy qua API giả lập ở cả chế độ "không build".

Sau sửa: 410/410 ở 10/11 lượt và 409/410 ở `:focus-visible`, tổ hợp 242/242 (`:focus-visible` 241/242), cả hai chế độ (lệch cuối: xem dưới).

**Đã sửa (lệch cuối, `diff` ở `:focus-visible`):** `outline-style: var(--tw-outline-style)` của daisyUI. Tailwind chỉ
đăng ký `@property --tw-outline-style` (giá trị đầu `solid`) khi trang có utility sẵn có cần nó (`outline-*`); fixture
không có nên biến không tồn tại → `none`. Ta từng đăng ký sẵn cả 127 biến `--tw-*` → `solid`. Cùng loại: daisyUI còn
đọc `--tw-border-style`, `--tw-duration`, `--tw-scale-x/y` mà không tự đặt. **Sửa:** mỗi class Tailwind kèm nhóm
`@property` mà Tailwind đăng ký cho utility đó (nhóm = các biến Tailwind luôn đăng ký cùng nhau; quy tắc chọn nhóm sinh
từ Tailwind trong `scripts/gen-tailwind-map.mjs` và kiểm trên mọi class của `getClassList`), engine thêm vào sheet gốc
một lần (`XCSSDialect.baseRules`); `@apply` trong CSS của dự án đăng ký sẵn trong CSS nền. Sau sửa: 410/410 mọi lượt,
tổ hợp 242/242, cả hai chế độ.

### 14. TailAdmin Vue: `--font-*: initial` xoá cả `--font-weight-*` — Đã sửa

Đo lần đầu (engine 1.0.0): 694/697 class chuyển được, khớp 691/697 ở mọi lượt, tổ hợp 277/342 (cả hai chế độ). Ba class
"chưa chuyển" là `font-medium`/`font-semibold`/`font-bold`. `@theme { --font-*: initial; --font-outfit: ... }` xoá namespace `--font-`;
Tailwind giữ namespace con `--font-weight-*`/`--font-size-*` (`ignoredThemeKeyMap`: cả `--inset-shadow-*`,
`--text-shadow-*`...), ta xoá luôn nên `font-medium`/`font-semibold`/`font-bold` và `@utility menu-item { @apply
font-medium ... }` mất `font-weight`. **Sửa:** `clearedBy()` bỏ qua namespace con như Tailwind. Sau sửa: 697/697 mọi
lượt, tổ hợp 342/342, cả hai chế độ.

### Về độ tin cậy của phép đo

- Mỗi lượt tua `transition-*` tới giá trị cuối (`CSSTransition.finish()`) và dừng `animate-*` ở thời điểm 0
  (`CSSAnimation.pause()`, `currentTime = 0`) trên cả hai phía, nên kết quả không phụ thuộc thời điểm đo mà vẫn so
  được giá trị `transition-*`/`animation-*` khai báo. Kiểm: chạy bộ đo mặc định 5 lần liên tiếp cho cùng một kết quả.
- Cột "Lượt có chạm biến thể" trừ phần thay đổi do trình duyệt (outline mặc định của `:focus-visible`, kích thước theo
  khung nhìn) bằng một phần tử mốc không có class; vẫn chỉ là ước lượng.
- Lượt `:hover`/`:focus`... ép trạng thái trên mọi phần tử đo cùng lúc, cha `.group` và anh `.peer`; không kiểm
  `:disabled`, `:checked` thật (phần tử là `div`), `group-hover/tên`, `peer-*/tên` có tên.
- Tổ hợp chỉ là chuỗi literal (và gốc `cva()` + từng biến thể), không phải toàn bộ class mà component render ra.
