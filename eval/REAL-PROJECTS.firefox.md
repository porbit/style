# Đo Trên Nhiều Dự Án Thật

Sinh bởi `npm run build && node eval/real-project.mjs --all --browser=firefox` (tailwindcss@4.3.5, Firefox). Mỗi class hợp lệ của dự án (quét từ mã nguồn, chỉ giữ class mà Tailwind sinh được CSS với chính file CSS của dự án: `@theme`, `@utility`, `@custom-variant`, `@plugin`) được render hai lần — với CSS do Tailwind thật sinh và với CSS do @porbit/style sinh — rồi so TOÀN BỘ computed style của phần tử và hai phần tử con.

Lượt đo: **mặc định** (1280 px) · **mở**/**đóng** (`data-state`, `data-open`, `aria-*`... đặt trên phần tử, cha `.group`, anh `.peer`) · **.dark** · **:hover**, **:focus** (kèm `:focus-within`), **:focus-visible** (kèm `:focus`), **:active** (kèm `:hover`) ép bằng CDP `CSS.forcePseudoState` trên phần tử, cha `.group`, anh `.peer` · **375/768/1600px** (độ rộng khung nhìn). Hai chế độ: "không build" (`parseTailwindStylesheet` + `tailwindV4Dialect`) và plugin PostCSS. Ô **in đậm** là lượt có lệch.

## Từng Class

| Dự án | Chế độ | Class | Chuyển được | mặc định | mở | đóng | .dark | 375px | 768px | 1600px |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shadcn/ui v4 | không build | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 |
| shadcn/ui v4 | PostCSS | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 | 769 |
| coss ui | không build | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 |
| coss ui | PostCSS | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 | 1331 |
| daisyUI 5 | không build | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 |
| daisyUI 5 | PostCSS | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 | 410 |
| HyperUI | không build | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 |
| HyperUI | PostCSS | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 | 619 |
| Magic UI | không build | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 |
| Magic UI | PostCSS | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 | 586 |
| TailAdmin Vue | không build | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 |
| TailAdmin Vue | PostCSS | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 | 697 |
| v3-extend | không build | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 |
| v3-extend | PostCSS | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 | 66 |
| v3-replace | không build | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 |
| v3-replace | PostCSS | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 | 18 |

## Tổ Hợp (Chuỗi Class Thật Trên Một Phần Tử)

| Dự án | Chế độ | Tổ hợp | mặc định | mở | đóng | .dark | 375px | 768px | 1600px |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| shadcn/ui v4 | không build | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 |
| shadcn/ui v4 | PostCSS | 260 | 260 | 260 | 260 | 260 | 260 | 260 | 260 |
| coss ui | không build | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 |
| coss ui | PostCSS | 379 | 379 | 379 | 379 | 379 | 379 | 379 | 379 |
| daisyUI 5 | không build | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 |
| daisyUI 5 | PostCSS | 242 | 242 | 242 | 242 | 242 | 242 | 242 | 242 |
| HyperUI | không build | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 |
| HyperUI | PostCSS | 766 | 766 | 766 | 766 | 766 | 766 | 766 | 766 |
| Magic UI | không build | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 |
| Magic UI | PostCSS | 245 | 245 | 245 | 245 | 245 | 245 | 245 | 245 |
| TailAdmin Vue | không build | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 |
| TailAdmin Vue | PostCSS | 342 | 342 | 342 | 342 | 342 | 342 | 342 | 342 |
| v3-extend | không build | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 |
| v3-extend | PostCSS | 12 | 12 | 12 | 12 | 12 | 12 | 12 | 12 |
| v3-replace | không build | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| v3-replace | PostCSS | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |

## Lượt Có Chạm Biến Thể Không

Số class mà chính Tailwind cho computed style khác lượt mặc định (0 nghĩa là lượt đó không kiểm được biến thể nào của dự án).

| Dự án | mở | đóng | .dark | 375px | 768px | 1600px |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| shadcn/ui v4 | 39 | 18 | 23 | 20 | 7 | 7 |
| coss ui | 42 | 17 | 46 | 70 | 5 | 5 |
| daisyUI 5 | 5 | 0 | 29 | 39 | 30 | 23 |
| HyperUI | 0 | 0 | 69 | 24 | 10 | 3 |
| Magic UI | 3 | 1 | 28 | 25 | 18 | 11 |
| TailAdmin Vue | 0 | 0 | 59 | 72 | 48 | 9 |
| v3-extend | 0 | 0 | 2 | 14 | 8 | 5 |
| v3-replace | 0 | 0 | 0 | 5 | 2 | 0 |

## Nguồn

- **shadcn/ui v4** — shadcn/ui `new-york-v4/ui`, MIT. Chi tiết lệch: `eval/REAL-PROJECT.firefox.md`.
- **coss ui** — [coss ui](https://github.com/origin-space/originui) (Origin UI nay là coss.com/ui, dựng trên Base UI) `packages/ui/src/components` + `packages/ui/src/styles/globals.css` (commit 0da83f8), MIT, © coss.com và Origin UI. Chi tiết lệch: `eval/REAL-PROJECT-coss-ui.firefox.md`.
- **daisyUI 5** — Trang mẫu tự viết theo ví dụ trong tài liệu [daisyUI](https://daisyui.com) 5 (`daisyui@5.8.1`, plugin `@plugin "daisyui"`), daisyUI: MIT, © Pouya Saadeghi. Chi tiết lệch: `eval/REAL-PROJECT-daisyui.firefox.md`.
- **HyperUI** — [HyperUI](https://github.com/markmead/hyperui) `public/examples/{application,neobrutalism}` + `src/styles/component.css` (commit 3032a06), MIT, © Mark Mead. Chi tiết lệch: `eval/REAL-PROJECT-hyperui.firefox.md`.
- **Magic UI** — [Magic UI](https://github.com/magicuidesign/magicui) `apps/www/registry/magicui` + `apps/www/styles/globals.css` (commit 6f7b531), MIT, © Magic UI. Chi tiết lệch: `eval/REAL-PROJECT-magicui.firefox.md`.
- **TailAdmin Vue** — [TailAdmin Vue](https://github.com/TailAdmin/vue-tailwind-admin-dashboard) qua gói npm [`@dynamia-tools/tailadmin-vue`](https://www.npmjs.com/package/@dynamia-tools/tailadmin-vue)@26.9.7 `src/components` (bỏ `ext/`) + `src/assets/theme.css`, MIT, © TailAdmin. Chi tiết lệch: `eval/REAL-PROJECT-tailadmin.firefox.md`.
- **v3-extend** — `tailwind.config.js` kiểu v3 với `theme.extend` (tự viết). Chi tiết lệch: `eval/REAL-PROJECT-v3-extend.firefox.md`.
- **v3-replace** — cấu hình v3 thay hẳn theme (tự viết). Chi tiết lệch: `eval/REAL-PROJECT-v3-replace.firefox.md`.

Nguồn, giấy phép và phần đã chỉnh của từng fixture: README trong `eval/fixtures/<tên>/`.
