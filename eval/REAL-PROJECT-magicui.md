# Đo Trên Dự Án Thật: Magic UI

80 file nguồn, 2484 ứng viên, **586 class Tailwind hợp lệ** (Tailwind 4.3.5, Chromium, so computed style ở trạng thái mặc định (1280 px), mở, đóng, trong `.dark`, khi ép `:hover`/`:focus`/`:focus-visible`/`:active` trên phần tử, cha `.group` và anh `.peer`, và ở độ rộng 375/768/1600 px).

| Chế độ | Chuyển được | Khớp (mặc định) | Khớp (mở) | Khớp (đóng) | Khớp (.dark) | Khớp (:hover) | Khớp (:focus) | Khớp (:focus-visible) | Khớp (:active) | Khớp (375px) | Khớp (768px) | Khớp (1600px) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| không build (parseTailwindStylesheet) | 585/586 (99.8%) | 585/586 (99.8%) | 585/586 (99.8%) | 585/586 (99.8%) | 585/586 (99.8%) | 586/586 (100.0%) | 585/586 (99.8%) | 585/586 (99.8%) | 586/586 (100.0%) | 585/586 (99.8%) | 585/586 (99.8%) | 585/586 (99.8%) |

Số class Tailwind đổi style so với lượt mặc định (biến thể được kiểm): mở 3, đóng 1, .dark 28, :hover 22, :focus 0, :focus-visible 1, :active 24, 375px 25, 768px 18, 1600px 11.

Tổ hợp thật (245 chuỗi class của component, nhiều class trên một phần tử): mặc định 244/245 · mở 244/245 · đóng 244/245 · .dark 244/245 · :hover 245/245 · :focus 244/245 · :focus-visible 244/245 · :active 245/245 · 375px 244/245 · 768px 244/245 · 1600px 244/245.
| plugin PostCSS (@porbit/style/postcss) | 585/586 (99.8%) | 585/586 (99.8%) | 585/586 (99.8%) | 585/586 (99.8%) | 585/586 (99.8%) | 586/586 (100.0%) | 585/586 (99.8%) | 585/586 (99.8%) | 586/586 (100.0%) | 585/586 (99.8%) | 585/586 (99.8%) | 585/586 (99.8%) |

Số class Tailwind đổi style so với lượt mặc định (biến thể được kiểm): mở 3, đóng 1, .dark 28, :hover 22, :focus 0, :focus-visible 1, :active 24, 375px 25, 768px 18, 1600px 11.

Tổ hợp thật (245 chuỗi class của component, nhiều class trên một phần tử): mặc định 244/245 · mở 244/245 · đóng 244/245 · .dark 244/245 · :hover 245/245 · :focus 244/245 · :focus-visible 244/245 · :active 245/245 · 375px 244/245 · 768px 244/245 · 1600px 244/245.

### không build (parseTailwindStylesheet) — mặc định: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### không build (parseTailwindStylesheet) — mở: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### không build (parseTailwindStylesheet) — đóng: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### không build (parseTailwindStylesheet) — .dark: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### không build (parseTailwindStylesheet) — :hover: lệch 0


### không build (parseTailwindStylesheet) — :focus: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### không build (parseTailwindStylesheet) — :focus-visible: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### không build (parseTailwindStylesheet) — :active: lệch 0


### không build (parseTailwindStylesheet) — 375px: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### không build (parseTailwindStylesheet) — 768px: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### không build (parseTailwindStylesheet) — 1600px: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### không build (parseTailwindStylesheet) — tổ hợp, mặc định: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### không build (parseTailwindStylesheet) — tổ hợp, mở: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### không build (parseTailwindStylesheet) — tổ hợp, đóng: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### không build (parseTailwindStylesheet) — tổ hợp, .dark: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### không build (parseTailwindStylesheet) — tổ hợp, :hover: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, :focus: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### không build (parseTailwindStylesheet) — tổ hợp, :focus-visible: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### không build (parseTailwindStylesheet) — tổ hợp, :active: lệch 0


### không build (parseTailwindStylesheet) — tổ hợp, 375px: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### không build (parseTailwindStylesheet) — tổ hợp, 768px: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### không build (parseTailwindStylesheet) — tổ hợp, 1600px: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### không build (parseTailwindStylesheet) — chưa chuyển (1)

- `not-[&:hover]` (1): `not-[&:hover]:duration-1000`

### plugin PostCSS (@porbit/style/postcss) — mặc định: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### plugin PostCSS (@porbit/style/postcss) — mở: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### plugin PostCSS (@porbit/style/postcss) — đóng: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### plugin PostCSS (@porbit/style/postcss) — .dark: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### plugin PostCSS (@porbit/style/postcss) — :hover: lệch 0


### plugin PostCSS (@porbit/style/postcss) — :focus: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### plugin PostCSS (@porbit/style/postcss) — :focus-visible: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### plugin PostCSS (@porbit/style/postcss) — :active: lệch 0


### plugin PostCSS (@porbit/style/postcss) — 375px: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### plugin PostCSS (@porbit/style/postcss) — 768px: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### plugin PostCSS (@porbit/style/postcss) — 1600px: lệch 1

- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, mặc định: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, mở: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, đóng: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, .dark: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :hover: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :focus: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :focus-visible: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :active: lệch 0


### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 375px: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 768px: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 1600px: lệch 1

- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`

### plugin PostCSS (@porbit/style/postcss) — chưa chuyển (1)

- `not-[&:hover]` (1): `not-[&:hover]:duration-1000`
