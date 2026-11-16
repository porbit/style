# Fixture: coss ui (Origin UI)

Dùng cho `eval/real-project.mjs --fixture=coss-ui` (đo @porbit/style trên dự án Tailwind v4 thật).

- Nguồn: [coss ui](https://github.com/origin-space/originui) — Origin UI nay là coss.com/ui (hệ thiết kế
  của Cal.com, dựng trên Base UI), commit `0da83f8508d3d5fa5ea757015dbf50a73ecd089d` (2026-11-14,
  `tailwindcss` >=4.1.17).
- Giấy phép: MIT, © coss.com và Origin UI — bản gốc ở [LICENSE](./LICENSE).
- `components/*.tsx`: nguyên văn `packages/ui/src/components` (56 component).
- `app.css`: `packages/ui/src/styles/globals.css`: `@import "tailwindcss"`, `@custom-variant dark`,
  `@custom-variant fixed`, `@theme inline` (`--breakpoint-3xl/4xl`, màu ngữ nghĩa, `--animate-*`, `@keyframes`),
  biến `:root`/`.dark` viết bằng `--alpha(var(--color-black) / 8%)` và `color-mix()`,
  `@layer base { * { @apply border-border outline-ring/50 } }`, `@utility container`.

Chỉnh so với bản gốc:

1. Bỏ `@source "../../../apps/**/*.{ts,tsx}"` (trỏ tới các ứng dụng khác của monorepo).
2. `@source "../**/*.{ts,tsx}"` đổi thành `@source "./components/**/*.{ts,tsx}"` theo vị trí mới.

Điểm đáng chú ý: biến thể của Base UI (`data-starting-style:`, `data-ending-style:`, `data-pressed:`,
`data-highlighted:`, `not-data-disabled:`, `in-data-[...]`), hàm `--alpha()`/`--spacing()`/`--theme()`
trong CSS và trong giá trị tuỳ ý, giá trị trần ngoài bảng (`opacity-64`, `scale-98`, `z-1`, `shadow-xs/5`).
