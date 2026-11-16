# Đo Trên Dự Án Thật: coss ui

56 file nguồn, 2260 ứng viên, **1331 class Tailwind hợp lệ** (Tailwind 4.3.5, Chromium, so computed style ở trạng thái mặc định (1280 px), mở, đóng, trong `.dark`, khi ép `:hover`/`:focus`/`:focus-visible`/`:active` trên phần tử, cha `.group` và anh `.peer`, và ở độ rộng 375/768/1600 px).

| Chế độ | Chuyển được | Khớp (mặc định) | Khớp (mở) | Khớp (đóng) | Khớp (.dark) | Khớp (:hover) | Khớp (:focus) | Khớp (:focus-visible) | Khớp (:active) | Khớp (375px) | Khớp (768px) | Khớp (1600px) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| không build (parseTailwindStylesheet) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1330/1331 (99.9%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) |

Số class Tailwind đổi style so với lượt mặc định (biến thể được kiểm): mở 42, đóng 17, .dark 45, :hover 16, :focus 3, :focus-visible 11, :active 18, 375px 70, 768px 5, 1600px 5.

Tổ hợp thật (379 chuỗi class của component, nhiều class trên một phần tử): mặc định 379/379 · mở 379/379 · đóng 377/379 · .dark 379/379 · :hover 379/379 · :focus 379/379 · :focus-visible 379/379 · :active 379/379 · 375px 379/379 · 768px 379/379 · 1600px 379/379.
| plugin PostCSS (@porbit/style/postcss) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1330/1331 (99.9%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) | 1331/1331 (100.0%) |

Số class Tailwind đổi style so với lượt mặc định (biến thể được kiểm): mở 42, đóng 17, .dark 45, :hover 16, :focus 3, :focus-visible 11, :active 18, 375px 70, 768px 5, 1600px 5.

Tổ hợp thật (379 chuỗi class của component, nhiều class trên một phần tử): mặc định 379/379 · mở 379/379 · đóng 377/379 · .dark 379/379 · :hover 379/379 · :focus 379/379 · :focus-visible 379/379 · :active 379/379 · 375px 379/379 · 768px 379/379 · 1600px 379/379.

### không build (parseTailwindStylesheet) — mặc định: lệch 0


### không build (parseTailwindStylesheet) — mở: lệch 0


### không build (parseTailwindStylesheet) — đóng: lệch 1

- `data-[orientation=vertical]:not-[[class^='h-']]:not-[[class*='_h-']]:self-stretch`: `align-self: tw=stretch | ours=auto`

### không build (parseTailwindStylesheet) — .dark: lệch 0


### không build (parseTailwindStylesheet) — :hover: lệch 0


### không build (parseTailwindStylesheet) — :focus: lệch 0


### không build (parseTailwindStylesheet) — :focus-visible: lệch 0


### không build (parseTailwindStylesheet) — :active: lệch 0


### không build (parseTailwindStylesheet) — 375px: lệch 0


### không build (parseTailwindStylesheet) — 768px: lệch 0


### không build (parseTailwindStylesheet) — 1600px: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, mặc định: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, mở: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, đóng: lệch 2

- `shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:not-[[class^='h-']]:not-[[class*='_h-']]:self-stretch`: `align-self: tw=stretch | ours=auto`
- `shrink-0 bg-border data-[orientation=horizontal]:my-0.5 data-[orientation=vertical]:my-1.5 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:not-[[class^='h-']]:not-[[class*='_h-']]:self-stretch`: `align-self: tw=stretch | ours=auto`

### không build (parseTailwindStylesheet) — tổ hợp, .dark: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, :hover: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, :focus: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, :focus-visible: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, :active: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, 375px: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, 768px: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, 1600px: lệch 0


### không build (parseTailwindStylesheet) — chưa chuyển (0)


### plugin PostCSS (@porbit/style/postcss) — mặc định: lệch 0


### plugin PostCSS (@porbit/style/postcss) — mở: lệch 0


### plugin PostCSS (@porbit/style/postcss) — đóng: lệch 1

- `data-[orientation=vertical]:not-[[class^='h-']]:not-[[class*='_h-']]:self-stretch`: `align-self: tw=stretch | ours=auto`

### plugin PostCSS (@porbit/style/postcss) — .dark: lệch 0


### plugin PostCSS (@porbit/style/postcss) — :hover: lệch 0


### plugin PostCSS (@porbit/style/postcss) — :focus: lệch 0


### plugin PostCSS (@porbit/style/postcss) — :focus-visible: lệch 0


### plugin PostCSS (@porbit/style/postcss) — :active: lệch 0


### plugin PostCSS (@porbit/style/postcss) — 375px: lệch 0


### plugin PostCSS (@porbit/style/postcss) — 768px: lệch 0


### plugin PostCSS (@porbit/style/postcss) — 1600px: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, mặc định: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, mở: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, đóng: lệch 2

- `shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:not-[[class^='h-']]:not-[[class*='_h-']]:self-stretch`: `align-self: tw=stretch | ours=auto`
- `shrink-0 bg-border data-[orientation=horizontal]:my-0.5 data-[orientation=vertical]:my-1.5 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:not-[[class^='h-']]:not-[[class*='_h-']]:self-stretch`: `align-self: tw=stretch | ours=auto`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, .dark: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :hover: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :focus: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :focus-visible: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :active: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 375px: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 768px: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 1600px: lệch 0


### plugin PostCSS (@porbit/style/postcss) — chưa chuyển (0)

