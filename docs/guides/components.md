# Bộ Component Mẫu

`@porbit/style/components` cung cấp các **recipe**: hàm trả về chuỗi class x-css theo variant, giống cách `cva` hoặc các bộ UI của Tailwind hoạt động. Không có component đóng gói, không phụ thuộc framework: dùng được với HTML thuần, React, Vue, Svelte, Astro...

Xem toàn bộ mẫu trực quan ở `demo/components.html` (chạy `npm run build` rồi mở qua một static server tại gốc repo).

## 1. Bật Theme Và Engine

Màu, bo góc, bóng đổ, font của recipe đều đọc từ CSS custom property `--ps-*`. Nạp theme một lần qua tuỳ chọn `base`:

```js
import xcss from '@porbit/style'
import { componentTheme } from '@porbit/style/components'

xcss.cssObserve(document, { base: componentTheme })
```

Đổi theme theo thương hiệu, hoặc chuyển chế độ tối sang dạng class `.dark`:

```js
import { createComponentTheme } from '@porbit/style/components'

const theme = createComponentTheme({
  light: { primary: '#7c3aed', 'primary-hover': '#6d28d9', radius: '12px' },
  dark: { primary: '#a78bfa' },
  darkMode: 'class', // mặc định 'media' (theo hệ điều hành)
})
xcss.cssObserve(document, { base: theme })
```

Danh sách token: `bg surface fg muted muted-hover muted-fg border border-strong primary primary-hover primary-fg primary-soft success success-soft warning warning-soft danger danger-hover danger-fg danger-soft info info-soft ring radius radius-lg shadow shadow-lg font`.

## 2. Dùng Recipe

```js
import { button, card, cardBody, badge } from '@porbit/style/components'

button()                                   // solid, md
button({ variant: 'outline', size: 'sm' })
button({ variant: 'danger', block: 'true' })
badge({ tone: 'success' })
```

React:

```jsx
import { clsx } from '@porbit/style'
import { button } from '@porbit/style/components'

export const Button = ({ variant, size, className, ...props }) => (
  <button className={clsx(button({ variant, size, class: className }))} {...props} />
)
```

| Recipe | Variant |
| :--- | :--- |
| `button` | `variant`: solid, secondary, outline, ghost, danger, link · `size`: sm, md, lg, icon · `block`: true |
| `badge` | `tone`: neutral, primary, success, warning, danger, info |
| `card` + `cardHeader` `cardTitle` `cardDescription` `cardBody` `cardFooter` | `elevated`: true/false · `interactive`: true |
| `label` `input` `textarea` `select` `checkbox` `helperText` | `input.size`: sm, md, lg · `input.invalid`: true · `helperText.tone`: muted, danger |
| `alert` | `tone`: info, success, warning, danger |
| `avatar` | `size`: sm, md, lg |
| `navbar` `navLink` | `navLink.active`: true |
| `tabs` `tab` | `tab.active`: true |
| `table` `tableHead` `tableRow` `tableCell` | |
| `modalOverlay` `modal` | |
| `progress` `progressBar` `skeleton` `spinner` | |
| `breadcrumb` `pagination` `pageItem` | `pageItem.active`: true |
| `tooltip` `tooltipContent` | |
| `container` `stack` `grid` | `stack.gap`: sm, md, lg · `grid.cols`: 2, 3, 4 |

HTML mẫu đầy đủ của từng nhóm nằm trong `COMPONENT_SNIPPETS` (cũng lấy được qua tool MCP `get_component`).

## 3. Ghi Đè Bằng Layer

Atomic CSS có một quy luật dễ quên: khi hai class cùng đặt một thuộc tính với cùng độ ưu tiên, **rule xuất hiện trước trên trang thua**, không phụ thuộc thứ tự viết trong thuộc tính `class`. Bộ component tránh hẳn tình huống này bằng cascade layer:

| Layer | Dùng cho |
| :--- | :--- |
| `0` | class nền của recipe |
| `1` | variant cần thắng class nền (`active`, `invalid`, `block`, cỡ chữ của `input`) |
| `2` trở lên | class ghi đè của bạn |

```js
button({ class: '2bdra999px 2p0;28px' })   // nút bo tròn, rộng hơn
card({ class: '2bdc--ps-primary' })         // viền màu chủ đạo
```

## 4. Tự Viết Recipe

```js
import { recipe } from '@porbit/style/components'

export const chip = recipe({
  base: 'dIF aiC gap6px h28px p0;10px bdra999px fns13px',
  variants: {
    tone: { neutral: 'bgc--ps-muted', brand: 'bgc--ps-primary-soft c--ps-primary' },
    removable: { true: '1pr4px' },
  },
  compoundVariants: [{ tone: 'brand', removable: 'true', class: 'bd[1px_solid_currentColor]' }],
  defaultVariants: { tone: 'neutral' },
})
```

Kết quả recipe được memo theo tổ hợp props nên gọi trong mỗi lần render không tốn chi phí đáng kể.
