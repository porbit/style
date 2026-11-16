# Fixture: Magic UI

Dùng cho `eval/real-project.mjs --fixture=magicui` (đo @porbit/style trên dự án Tailwind v4 thật).

- Nguồn: [Magic UI](https://github.com/magicuidesign/magicui), commit `6f7b531e77659855d4bc1bec8e20fdb0c8199b20`
  (2026-11-13, `tailwindcss` ^4.3.5).
- Giấy phép: MIT, © Magic UI — bản gốc ở [LICENSE](./LICENSE).
- `components/*.tsx`: nguyên văn `apps/www/registry/magicui` (80 component hiệu ứng: marquee, shimmer,
  border-beam, orbiting-circles, animated-beam...).
- `app.css`: nguyên văn `apps/www/styles/globals.css` của trang tài liệu: `@import "tailwindcss"`,
  `@import "tw-animate-css"`, `@custom-variant dark`, `@custom-variant fixed`, `@theme inline` với hơn 20
  `--animate-*` và `@keyframes`, `@utility container`/`container-wrapper` (có `@apply 3xl:fixed:max-w-[...]`),
  `@utility extend-touch-target` (`@media (pointer: coarse)`), `@layer base`/`components` với `@apply`.

Không chỉnh nội dung. `tw-animate-css` được trỏ tới `node_modules/tw-animate-css/dist/tw-animate.css`
(khai báo trong `fixture.json`).

Điểm đáng chú ý: nhiều giá trị tuỳ ý và biến CSS trong class (`[--duration:40s]`,
`animate-marquee`, `bg-[length:200%]`, `[mask-clip:padding-box,border-box]`).
