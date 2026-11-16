# Fixture: TailAdmin Vue

Dùng cho `eval/real-project.mjs --fixture=tailadmin` (đo @porbit/style trên một ứng dụng dashboard Tailwind v4 thật).

- Nguồn: [TailAdmin Vue](https://github.com/TailAdmin/vue-tailwind-admin-dashboard) (template dashboard quản trị
  Vue 3 + Tailwind CSS 4), lấy qua gói npm [`@dynamia-tools/tailadmin-vue`](https://www.npmjs.com/package/@dynamia-tools/tailadmin-vue)
  phiên bản `26.9.7` — bản tách phần dùng lại được của TailAdmin Vue, đồng bộ thủ công với upstream. Máy đo không tải
  được GitHub nên lấy từ npm.
- Giấy phép: MIT, © TailAdmin — bản gốc ở [LICENSE](./LICENSE).
- `components/**`: nguyên văn `src/components` của gói (58 file `.vue`/`.ts`: layout có sidebar/header/menu người dùng/
  thông báo, trang ecommerce, biểu đồ, form, bảng, hồ sơ, modal, alert, badge, button...). Bỏ `components/ext/**` (phần
  Dynamia Tools thêm vào, không có trong TailAdmin gốc).
- `app.css`: nguyên văn `src/assets/theme.css` (`@import 'tailwindcss'`, `@custom-variant dark (&:is(.dark *))`, `@theme`
  với `--font-*: initial`, `--breakpoint-*: initial` + breakpoint riêng `2xsm`/`xsm`/`3xl`, bảng màu `brand`/`gray`/
  `success`..., cỡ chữ `text-theme-*`, bóng `shadow-theme-*`; `@layer base` có `@apply`; nhiều `@utility` dùng `@apply`
  kèm `dark:`/`group-hover:`; CSS thường cho apexcharts/jsvectormap/flatpickr có `@apply !...`).

Chỉnh so với bản gốc: không có (`main.css` của gói chỉ thêm `@import url(...)` font Google nên không dùng).

Mã nguồn là SFC Vue (`<template>` + `:class` động); bộ đo quét class bằng `extractCandidates` như các fixture khác.
