# Fixture: HyperUI

Dùng cho `eval/real-project.mjs --fixture=hyperui` (đo @porbit/style trên dự án Tailwind v4 thật).

- Nguồn: [HyperUI](https://github.com/markmead/hyperui) của Mark Mead, commit `3032a061e08f493c99a4a03031ac694d4bc42446`
  (2026-11-15, `tailwindcss` ^4.3.5).
- Giấy phép: MIT, © Mark Mead — bản gốc ở [LICENSE](./LICENSE).
- `examples/application/**`, `examples/neobrutalism/**`: nguyên văn `public/examples/application` và
  `public/examples/neobrutalism` (HTML thuần: 295 + 74 file, mỗi component có bản sáng và bản `-dark`).
  Bỏ `marketing` và `templates` cho gọn (nhiều chữ nội dung, ít class mới).
- `app.css`: `src/styles/component.css` (CSS dùng để render từng component trong khung xem trước):
  `@import 'tailwindcss' source(none)`, `@plugin '@tailwindcss/forms'`, `@plugin '@tailwindcss/typography'`,
  `@custom-variant dark (&:where(.dark, .dark *))`, `@theme { --font-sans }`.

Chỉnh so với bản gốc:

1. Bỏ dòng `@import url('https://fonts.googleapis.com/...')` (font web, không liên quan utility; tránh tải mạng).
2. `@source '../../public/examples'` đổi thành `@source './examples'` theo vị trí mới.

Điểm đáng chú ý: dùng plugin JS `@tailwindcss/forms` và `@tailwindcss/typography` (phía Tailwind nạp từ
`node_modules`, phía @porbit/style dùng bản đóng gói sẵn `@porbit/style/tailwind-plugins`), nhiều `peer-*`,
`group-*`, `focus:`/`hover:`, `dark:` dạng `:where()`.
