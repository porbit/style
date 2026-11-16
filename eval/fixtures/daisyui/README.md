# Fixture: daisyUI 5

Dùng cho `eval/real-project.mjs --fixture=daisyui` (đo @porbit/style trên dự án Tailwind v4 dùng plugin JS daisyUI).

- Plugin: [daisyUI](https://daisyui.com) `5.8.1` (devDependency ghim đúng phiên bản trong `package.json` gốc), nạp bằng
  `@plugin "daisyui" { themes: light --default, dark --prefersdark, cupcake; logs: false; }` như hướng dẫn cài đặt.
- Giấy phép daisyUI: MIT, © Pouya Saadeghi — bản gốc ở [LICENSE](./LICENSE).
- `pages/*.html`: trang tĩnh tự viết, ghép từ ví dụ trong tài liệu daisyUI 5 (tên class, cấu trúc HTML), nội dung tiếng
  Việt: `dashboard.html` (drawer + navbar + stats + bảng + timeline + alert + footer), `components.html` (hero, btn đủ màu/
  kiểu/cỡ, card, modal, dropdown, tabs, menu, badge, status, loading, avatar, collapse, steps, tooltip, divider, chat,
  rating, skeleton, countdown, mask, indicator, link, mockup, dock, list, carousel, diff, stack), `forms.html` (fieldset,
  input, validator, floating-label, textarea, file-input, select, checkbox, toggle, radio, range, filter, join, table).
- Ba trang đặt `data-theme` khác nhau (`light`, `cupcake`, `dark`); lượt "tối" của bộ đo đặt `data-theme="dark"` trên
  `<html>` (khoá `"dark"` trong `fixture.json`) thay cho `class="dark"`.

Điểm đáng chú ý của daisyUI 5 với engine:

- Component (`addComponents`) xếp vào layer con `@layer daisyui.l1.l2.l3` ... `@layer daisyui` lồng trong rule — Tailwind
  đặt chúng trong `@layer utilities`, nên utility thường (`bg-primary`, `p-4`) luôn thắng component, còn component thắng
  `@layer base` (preflight). Có cả `@supports`, `@media`, `@starting-style`, `@scope (&)` lồng trong rule.
- Theme: `addBase` với `:where(:root), [data-theme=light]`, `@media (prefers-color-scheme: dark)`, `@property`, `@keyframes`.
- `config.theme.extend.colors` dạng `primary: var(--color-primary)` (tự tham chiếu, Tailwind coi là `reference`).
- Data URL trong `mask-image` có dấu `;` (`values='0;0.475;1'`) và nhiều selector `:where()`, `:is()`, `:has()`.
