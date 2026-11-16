# Fixture: shadcn/ui v4

Dùng cho `eval/real-project.mjs` (đo @porbit/style trên dự án Tailwind v4 thật).

- `ui/*.tsx`: component `new-york-v4/ui` của [shadcn/ui](https://github.com/shadcn-ui/ui) (MIT, © shadcn).
- `shadcn-tailwind.css`: `packages/shadcn/src/tailwind.css` của shadcn/ui (MIT) — `@custom-variant data-open`..., `@utility no-scrollbar`, `scroll-fade`...
- `app.css`: stylesheet của ứng dụng mẫu: `@import "tailwindcss"; @import "tw-animate-css"; @import "./shadcn-tailwind.css";`,
  `@custom-variant dark`, `@theme inline`, biến màu `:root`/`.dark`, `@layer base { @apply ... }`.

Chạy: `npm run build && npm run eval:real`.
