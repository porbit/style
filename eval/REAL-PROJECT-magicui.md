# Đo Trên Dự Án Thật: Magic UI

80 file nguồn, 2484 ứng viên, **586 class Tailwind hợp lệ** (Tailwind 4.3.5, Chromium, so computed style ở trạng thái mặc định (1280 px), mở, đóng, trong `.dark`, khi ép `:hover`/`:focus`/`:focus-visible`/`:active` trên phần tử, cha `.group` và anh `.peer`, và ở độ rộng 375/768/1600 px).

| Chế độ | Chuyển được | Khớp (mặc định) | Khớp (mở) | Khớp (đóng) | Khớp (.dark) | Khớp (:hover) | Khớp (:focus) | Khớp (:focus-visible) | Khớp (:active) | Khớp (375px) | Khớp (768px) | Khớp (1600px) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| không build (parseTailwindStylesheet) | 572/586 (97.6%) | 575/586 (98.1%) | 575/586 (98.1%) | 575/586 (98.1%) | 573/586 (97.8%) | 576/586 (98.3%) | 575/586 (98.1%) | 575/586 (98.1%) | 576/586 (98.3%) | 575/586 (98.1%) | 575/586 (98.1%) | 575/586 (98.1%) |

Số class Tailwind đổi style so với lượt mặc định (biến thể được kiểm): mở 3, đóng 1, .dark 28, :hover 22, :focus 0, :focus-visible 1, :active 24, 375px 25, 768px 18, 1600px 11.

Tổ hợp thật (245 chuỗi class của component, nhiều class trên một phần tử): mặc định 237/245 · mở 237/245 · đóng 237/245 · .dark 237/245 · :hover 238/245 · :focus 237/245 · :focus-visible 237/245 · :active 238/245 · 375px 237/245 · 768px 237/245 · 1600px 237/245.
| plugin PostCSS (@porbit/style/postcss) | 572/586 (97.6%) | 575/586 (98.1%) | 575/586 (98.1%) | 575/586 (98.1%) | 573/586 (97.8%) | 576/586 (98.3%) | 575/586 (98.1%) | 575/586 (98.1%) | 576/586 (98.3%) | 575/586 (98.1%) | 575/586 (98.1%) | 575/586 (98.1%) |

Số class Tailwind đổi style so với lượt mặc định (biến thể được kiểm): mở 3, đóng 1, .dark 28, :hover 22, :focus 0, :focus-visible 1, :active 24, 375px 25, 768px 18, 1600px 11.

Tổ hợp thật (245 chuỗi class của component, nhiều class trên một phần tử): mặc định 237/245 · mở 237/245 · đóng 237/245 · .dark 237/245 · :hover 238/245 · :focus 237/245 · :focus-visible 237/245 · :active 238/245 · 375px 237/245 · 768px 237/245 · 1600px 237/245.

### không build (parseTailwindStylesheet) — mặc định: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### không build (parseTailwindStylesheet) — mở: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7368px | ours=-7362px`; `inset-block-end: tw=-7368px | ours=-7362px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### không build (parseTailwindStylesheet) — đóng: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### không build (parseTailwindStylesheet) — .dark: lệch 13

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7394px | ours=-7388px`; `inset-block-end: tw=-7394px | ours=-7388px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### không build (parseTailwindStylesheet) — :hover: lệch 10

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### không build (parseTailwindStylesheet) — :focus: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### không build (parseTailwindStylesheet) — :focus-visible: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### không build (parseTailwindStylesheet) — :active: lệch 10

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### không build (parseTailwindStylesheet) — 375px: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-6511px | ours=-6505px`; `inset-block-end: tw=-6511px | ours=-6505px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=none`; `max-width: tw=1400px | ours=none`

### không build (parseTailwindStylesheet) — 768px: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-6904px | ours=-6898px`; `inset-block-end: tw=-6904px | ours=-6898px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=768px`; `max-width: tw=1400px | ours=768px`

### không build (parseTailwindStylesheet) — 1600px: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7712px | ours=-7706px`; `inset-block-end: tw=-7712px | ours=-7706px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `inline-size: tw=1536px | ours=1600px`; `margin-inline-end: tw=32px | ours=0px`

### không build (parseTailwindStylesheet) — tổ hợp, mặc định: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — tổ hợp, mở: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — tổ hợp, đóng: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — tổ hợp, .dark: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — tổ hợp, :hover: lệch 7

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — tổ hợp, :focus: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — tổ hợp, :focus-visible: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — tổ hợp, :active: lệch 7

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — tổ hợp, 375px: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — tổ hợp, 768px: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — tổ hợp, 1600px: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### không build (parseTailwindStylesheet) — chưa chuyển (14)

- `(gốc)` (8): `bg-size-[var(--bg-size)_100%]` `bg-size-[var(--shiny-width)_100%]` `bg-position-[0_0]` `bg-size-[200%_auto]` `border-(length:--border-beam-width)` `z-1`
- `after` (2): `after:bg-size-[0.06em_0.06em]` `after:bg-size-[100%_200%]`
- `dark:[&>pre]` (1): `dark:[&>pre]:text-(color:--shiki-dark)!`
- `dark:[&_span]` (1): `dark:[&_span]:text-(color:--shiki-dark)!`
- `not-[&:hover]` (1): `not-[&:hover]:duration-1000`
- `before` (1): `before:bg-size-[100%_200%]`

### plugin PostCSS (@porbit/style/postcss) — mặc định: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### plugin PostCSS (@porbit/style/postcss) — mở: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7368px | ours=-7362px`; `inset-block-end: tw=-7368px | ours=-7362px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### plugin PostCSS (@porbit/style/postcss) — đóng: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### plugin PostCSS (@porbit/style/postcss) — .dark: lệch 13

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7394px | ours=-7388px`; `inset-block-end: tw=-7394px | ours=-7388px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### plugin PostCSS (@porbit/style/postcss) — :hover: lệch 10

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### plugin PostCSS (@porbit/style/postcss) — :focus: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### plugin PostCSS (@porbit/style/postcss) — :focus-visible: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### plugin PostCSS (@porbit/style/postcss) — :active: lệch 10

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7392px | ours=-7386px`; `inset-block-end: tw=-7392px | ours=-7386px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=1280px`; `max-width: tw=1400px | ours=1280px`

### plugin PostCSS (@porbit/style/postcss) — 375px: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-6511px | ours=-6505px`; `inset-block-end: tw=-6511px | ours=-6505px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=none`; `max-width: tw=1400px | ours=none`

### plugin PostCSS (@porbit/style/postcss) — 768px: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-6904px | ours=-6898px`; `inset-block-end: tw=-6904px | ours=-6898px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `max-inline-size: tw=1400px | ours=768px`; `max-width: tw=1400px | ours=768px`

### plugin PostCSS (@porbit/style/postcss) — 1600px: lệch 11

- `bg-position-[0_0]`: `background-position: tw=0px 0px | ours=0% 0%`
- `bg-size-[200%_auto]`: `background-size: tw=200% auto | ours=auto`
- `border-(length:--border-beam-width)`: `block-size: tw=30px | ours=24px`; `border-block-end-width: tw=3px | ours=0px`
- `fixed`: `bottom: tw=-7712px | ours=-7706px`; `inset-block-end: tw=-7712px | ours=-7706px`
- `z-1`: `z-index: tw=1 | ours=-1`
- `not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0s`
- `filter-[url(#threshold)_blur(0.6px)]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `bg-[length:200%]`: `background-position: tw=0% 0% | ours=200% 50%`; `background-size: tw=200% auto | ours=auto`
- `bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `container`: `inline-size: tw=1536px | ours=1600px`; `margin-inline-end: tw=32px | ours=0px`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, mặc định: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, mở: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, đóng: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, .dark: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :hover: lệch 7

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :focus: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :focus-visible: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :active: lệch 7

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 375px: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 768px: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 1600px: lệch 8

- `animate-aurora relative bg-size-[200%_auto] bg-clip-text text-transparent`: `background-size: tw=200% auto | ours=auto`
- `pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect`: `border-block-end-width: tw=3px | ours=0px`; `border-block-start-width: tw=3px | ours=0px`
- `relative isolate z-1 size-full overflow-hidden rounded-2xl border-2 border-white`: `z-index: tw=1 | ours=-1`
- `stroke-gray-400/30 transition-all duration-100 ease-in-out not-[&:hover]:duration-1000`: `transition-duration: tw=1s | ours=0.1s`
- `relative mx-auto h-16 w-full max-w-3xl text-center font-sans text-[40pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`: `filter: tw=url("#threshold") blur(0.6px) | ours=none`
- `z-1 rounded-[2.5rem] object-cover`: `z-index: tw=1 | ours=-1`
- `border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-primary-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`
- `border border-input border-b-transparent bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] bg-[length:200%] text-accent-foreground before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:[filter:blur(0.75rem)] dark:bg-[linear-gradient(#0a0a0a,#0a0a0a),linear-gradient(#0a0a0a_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]`: `background-attachment: tw=scroll, scroll, scroll | ours=scroll`; `background-blend-mode: tw=normal, normal, normal | ours=normal`

### plugin PostCSS (@porbit/style/postcss) — chưa chuyển (14)

- `(gốc)` (8): `bg-size-[var(--bg-size)_100%]` `bg-size-[var(--shiny-width)_100%]` `bg-position-[0_0]` `bg-size-[200%_auto]` `border-(length:--border-beam-width)` `z-1`
- `after` (2): `after:bg-size-[0.06em_0.06em]` `after:bg-size-[100%_200%]`
- `dark:[&>pre]` (1): `dark:[&>pre]:text-(color:--shiki-dark)!`
- `dark:[&_span]` (1): `dark:[&_span]:text-(color:--shiki-dark)!`
- `not-[&:hover]` (1): `not-[&:hover]:duration-1000`
- `before` (1): `before:bg-size-[100%_200%]`
