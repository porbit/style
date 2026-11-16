# Đo Trên Dự Án Thật: HyperUI

369 file nguồn, 1621 ứng viên, **619 class Tailwind hợp lệ** (Tailwind 4.3.5, Chromium, so computed style ở trạng thái mặc định (1280 px), mở, đóng, trong `.dark`, khi ép `:hover`/`:focus`/`:focus-visible`/`:active` trên phần tử, cha `.group` và anh `.peer`, và ở độ rộng 375/768/1600 px).

| Chế độ | Chuyển được | Khớp (mặc định) | Khớp (mở) | Khớp (đóng) | Khớp (.dark) | Khớp (:hover) | Khớp (:focus) | Khớp (:focus-visible) | Khớp (:active) | Khớp (375px) | Khớp (768px) | Khớp (1600px) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| không build (parseTailwindStylesheet) | 611/619 (98.7%) | 608/619 (98.2%) | 608/619 (98.2%) | 608/619 (98.2%) | 608/619 (98.2%) | 607/619 (98.1%) | 608/619 (98.2%) | 608/619 (98.2%) | 607/619 (98.1%) | 608/619 (98.2%) | 608/619 (98.2%) | 608/619 (98.2%) |

Số class Tailwind đổi style so với lượt mặc định (biến thể được kiểm): mở 0, đóng 0, .dark 69, :hover 28, :focus 15, :focus-visible 17, :active 30, 375px 24, 768px 10, 1600px 3.

Tổ hợp thật (766 chuỗi class của component, nhiều class trên một phần tử): mặc định 675/766 · mở 675/766 · đóng 675/766 · .dark 675/766 · :hover 683/766 · :focus 675/766 · :focus-visible 675/766 · :active 683/766 · 375px 673/766 · 768px 675/766 · 1600px 675/766.
| plugin PostCSS (@porbit/style/postcss) | 611/619 (98.7%) | 608/619 (98.2%) | 608/619 (98.2%) | 608/619 (98.2%) | 608/619 (98.2%) | 607/619 (98.1%) | 608/619 (98.2%) | 608/619 (98.2%) | 607/619 (98.1%) | 608/619 (98.2%) | 608/619 (98.2%) | 608/619 (98.2%) |

Số class Tailwind đổi style so với lượt mặc định (biến thể được kiểm): mở 0, đóng 0, .dark 69, :hover 28, :focus 15, :focus-visible 17, :active 30, 375px 24, 768px 10, 1600px 3.

Tổ hợp thật (766 chuỗi class của component, nhiều class trên một phần tử): mặc định 675/766 · mở 675/766 · đóng 675/766 · .dark 675/766 · :hover 683/766 · :focus 675/766 · :focus-visible 675/766 · :active 683/766 · 375px 673/766 · 768px 675/766 · 1600px 675/766.

### không build (parseTailwindStylesheet) — mặc định: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — mở: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — đóng: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — .dark: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — :hover: lệch 12

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `hover:shadow-[-1px_-1px_0_0]`: `--tw-shadow: tw=-1px -1px 0 0 currentcolor | ours=-1px -1px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — :focus: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — :focus-visible: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — :active: lệch 12

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `hover:shadow-[-1px_-1px_0_0]`: `--tw-shadow: tw=-1px -1px 0 0 currentcolor | ours=-1px -1px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — 375px: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — 768px: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — 1600px: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### không build (parseTailwindStylesheet) — tổ hợp, mặc định: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — tổ hợp, mở: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — tổ hợp, đóng: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — tổ hợp, .dark: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #fff 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #fff 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #fff 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — tổ hợp, :hover: lệch 83

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — tổ hợp, :focus: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — tổ hợp, :focus-visible: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — tổ hợp, :active: lệch 83

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — tổ hợp, 375px: lệch 93

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=151px`; `inset-inline-start: tw=151px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=151px`; `inset-inline-start: tw=151px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=151px`; `inset-inline-start: tw=151px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=151px`; `inset-inline-start: tw=151px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=343px`; `inset-inline-start: tw=343px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=343px`; `inset-inline-start: tw=343px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=343.406px | ours=355.406px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=343.406px | ours=355.406px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `sr-only sm:not-sr-only sm:inline`: `bottom: tw=-19545px | ours=-19555px`; `inset-block-end: tw=-19545px | ours=-19555px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19894px | ours=-19904px`; `inset-block-end: tw=-19894px | ours=-19904px`
- `sr-only sm:not-sr-only sm:block`: `bottom: tw=-19869px | ours=-19879px`; `inset-block-end: tw=-19869px | ours=-19879px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19990px | ours=-20000px`; `inset-block-end: tw=-19990px | ours=-20000px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-20054px | ours=-20064px`; `inset-block-end: tw=-20054px | ours=-20064px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-20054px | ours=-20064px`; `inset-block-end: tw=-20054px | ours=-20064px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — tổ hợp, 768px: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=544px`; `inset-inline-start: tw=544px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=544px`; `inset-inline-start: tw=544px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=544px`; `inset-inline-start: tw=544px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=544px`; `inset-inline-start: tw=544px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=736px`; `inset-inline-start: tw=736px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=736px`; `inset-inline-start: tw=736px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=736.406px | ours=748.406px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=736.406px | ours=748.406px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19974px | ours=-19984px`; `inset-block-end: tw=-19974px | ours=-19984px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-20046px | ours=-20056px`; `inset-block-end: tw=-20046px | ours=-20056px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-20110px | ours=-20120px`; `inset-block-end: tw=-20110px | ours=-20120px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-20110px | ours=-20120px`; `inset-block-end: tw=-20110px | ours=-20120px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — tổ hợp, 1600px: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1376px`; `inset-inline-start: tw=1376px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1376px`; `inset-inline-start: tw=1376px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1376px`; `inset-inline-start: tw=1376px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1376px`; `inset-inline-start: tw=1376px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1568px`; `inset-inline-start: tw=1568px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1568px`; `inset-inline-start: tw=1568px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1568.41px | ours=1580.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1568.41px | ours=1580.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### không build (parseTailwindStylesheet) — chưa chuyển (8)

- `(gốc)` (5): `end-0` `start-3` `text-sm/none` `start-0` `text-xs/none`
- `peer-checked` (2): `peer-checked:start-6` `peer-checked:start-8`
- `group-open` (1): `group-open:start-0`

### plugin PostCSS (@porbit/style/postcss) — mặc định: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — mở: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — đóng: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — .dark: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — :hover: lệch 12

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `hover:shadow-[-1px_-1px_0_0]`: `--tw-shadow: tw=-1px -1px 0 0 currentcolor | ours=-1px -1px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — :focus: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — :focus-visible: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — :active: lệch 12

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `hover:shadow-[-1px_-1px_0_0]`: `--tw-shadow: tw=-1px -1px 0 0 currentcolor | ours=-1px -1px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — 375px: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — 768px: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — 1600px: lệch 11

- `end-0`: `inset-inline-end: tw=0px | ours=auto`; `right: tw=0px | ours=auto`
- `start-3`: `inset-inline-start: tw=12px | ours=auto`; `left: tw=12px | ours=auto`
- `text-sm/none`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `start-0`: `inset-inline-start: tw=0px | ours=auto`; `left: tw=0px | ours=auto`
- `text-[10px]/6`: `block-size: tw=24px | ours=15px`; `height: tw=24px | ours=15px`
- `text-xs/none`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `shadow-[4px_4px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor | ours=4px 4px 0 0`
- `shadow-[2px_2px_0_0]`: `--tw-shadow: tw=2px 2px 0 0 currentcolor | ours=2px 2px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0,12px_12px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor, 12px 12px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0,12px 12px 0 0`
- `shadow-[4px_4px_0_0,8px_8px_0_0]`: `--tw-shadow: tw=4px 4px 0 0 currentcolor, 8px 8px 0 0 currentcolor | ours=4px 4px 0 0,8px 8px 0 0`
- `bg-[repeating-linear-gradient(45deg,var(--tw-gradient-from)_0,var(--tw-gradient-from)_10px,var(--tw-gradient-to)_10px,var(--tw-gradient-to)_20px)]`: `background-image: tw=repeating-linear-gradient(45deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 10px, rgba(0, 0, 0, 0) 2`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, mặc định: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, mở: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, đóng: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, .dark: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #fff 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #fff 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #fff 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :hover: lệch 83

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :focus: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :focus-visible: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, :active: lệch 83

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1056px`; `inset-inline-start: tw=1056px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1248px`; `inset-inline-start: tw=1248px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1248.41px | ours=1260.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 375px: lệch 93

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=151px`; `inset-inline-start: tw=151px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=151px`; `inset-inline-start: tw=151px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=151px`; `inset-inline-start: tw=151px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=151px`; `inset-inline-start: tw=151px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=343px`; `inset-inline-start: tw=343px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=343px`; `inset-inline-start: tw=343px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=343.406px | ours=355.406px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=343.406px | ours=355.406px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `sr-only sm:not-sr-only sm:inline`: `bottom: tw=-19545px | ours=-19555px`; `inset-block-end: tw=-19545px | ours=-19555px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19894px | ours=-19904px`; `inset-block-end: tw=-19894px | ours=-19904px`
- `sr-only sm:not-sr-only sm:block`: `bottom: tw=-19869px | ours=-19879px`; `inset-block-end: tw=-19869px | ours=-19879px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19990px | ours=-20000px`; `inset-block-end: tw=-19990px | ours=-20000px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-20054px | ours=-20064px`; `inset-block-end: tw=-20054px | ours=-20064px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-20054px | ours=-20064px`; `inset-block-end: tw=-20054px | ours=-20064px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 768px: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=544px`; `inset-inline-start: tw=544px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=544px`; `inset-inline-start: tw=544px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=544px`; `inset-inline-start: tw=544px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=544px`; `inset-inline-start: tw=544px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=736px`; `inset-inline-start: tw=736px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=736px`; `inset-inline-start: tw=736px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=736.406px | ours=748.406px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=736.406px | ours=748.406px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19974px | ours=-19984px`; `inset-block-end: tw=-19974px | ours=-19984px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-20046px | ours=-20056px`; `inset-block-end: tw=-20046px | ours=-20056px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-20110px | ours=-20120px`; `inset-block-end: tw=-20110px | ours=-20120px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-20110px | ours=-20120px`; `inset-block-end: tw=-20110px | ours=-20120px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — tổ hợp, 1600px: lệch 91

- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1376px`; `inset-inline-start: tw=1376px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1376px`; `inset-inline-start: tw=1376px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-600 dark:bg-gray-800`: `inset-inline-end: tw=0px | ours=1376px`; `inset-inline-start: tw=1376px | ours=0px`
- `absolute end-0 top-12 z-auto w-56 divide-y divide-gray-200 overflow-hidden rounded border border-gray-300 bg-white shadow-sm`: `inset-inline-end: tw=0px | ours=1376px`; `inset-inline-start: tw=1376px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700 dark:text-gray-200`: `inset-inline-end: tw=0px | ours=1568px`; `inset-inline-start: tw=1568px | ours=0px`
- `absolute inset-y-0 end-0 grid w-8 place-content-center text-gray-700`: `inset-inline-end: tw=0px | ours=1568px`; `inset-inline-start: tw=1568px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 dark:bg-gray-900 dark:text-white`: `inset-inline-end: tw=1568.41px | ours=1580.41px`; `inset-inline-start: tw=12px | ours=0px`
- `absolute inset-y-0 start-3 bg-white px-0.5 text-sm font-medium text-gray-700 transition-transform peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5`: `inset-inline-end: tw=1568.41px | ours=1580.41px`; `inset-inline-start: tw=12px | ours=0px`
- `text-sm/none font-medium text-gray-700`: `block-size: tw=14px | ours=24px`; `font-size: tw=14px | ours=16px`
- `absolute start-0 rounded-full bg-blue-500 text-white dark:text-gray-900`: `bottom: tw=-19774px | ours=-19784px`; `inset-block-end: tw=-19774px | ours=-19784px`
- `absolute end-0 rounded-full bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900`: `bottom: tw=-19846px | ours=-19856px`; `inset-block-end: tw=-19846px | ours=-19856px`
- `absolute start-0 rounded-full bg-blue-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `absolute end-0 rounded-full bg-gray-500 text-white`: `bottom: tw=-19910px | ours=-19920px`; `inset-block-end: tw=-19910px | ours=-19920px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold dark:bg-gray-800`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-blue-500 text-center text-[10px]/6 font-bold text-white`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `size-6 rounded-full bg-gray-100 text-center text-[10px]/6 font-bold`: `line-height: tw=24px | ours=15px`; `con1.line-height: tw=24px | ours=15px`
- `text-xs/none font-medium text-gray-700 dark:text-gray-200`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `text-xs/none font-medium text-gray-700`: `block-size: tw=12px | ours=24px`; `font-size: tw=12px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:text-white`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `mt-2 inline-block rounded-sm border border-blue-600 bg-blue-600 px-4 py-2 text-sm/none font-medium text-white hover:bg-transparent hover:text-blue-600`: `block-size: tw=32px | ours=42px`; `font-size: tw=14px | ours=16px`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden dark:border-white dark:bg-gray-900 dark:text-white dark:shadow-white dark:hover:bg-yellow-700 dark:focus:bg-yellow-700`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `flex cursor-pointer items-center justify-between gap-4 border-2 border-black bg-white px-4 py-3 font-medium text-gray-900 shadow-[4px_4px_0_0] shadow-black hover:bg-yellow-200 focus:bg-yellow-200 focus:outline-hidden`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black dark:divide-white dark:border-white dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `divide-y-2 divide-black border-2 border-black shadow-[4px_4px_0_0] shadow-black`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`
- `border-2 bg-blue-100 p-4 text-blue-900 shadow-[4px_4px_0_0] shadow-black dark:bg-blue-800 dark:text-blue-50 dark:shadow-white`: `--tw-shadow: tw=4px 4px 0 0 color-mix(in oklab, #000 100%, transparent) | ours=4px 4px 0 0`; `box-shadow: tw=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0p`

### plugin PostCSS (@porbit/style/postcss) — chưa chuyển (8)

- `(gốc)` (5): `end-0` `start-3` `text-sm/none` `start-0` `text-xs/none`
- `peer-checked` (2): `peer-checked:start-6` `peer-checked:start-8`
- `group-open` (1): `group-open:start-0`
