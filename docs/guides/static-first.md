# Static-First: CSS Sinh Sẵn Lúc Build, Runtime Chỉ Lo Phần Động

Runtime của `@porbit/style` sinh CSS cho mọi class nó thấy trong DOM. Với trang có nội dung cố định, phần lớn việc đó có thể làm sẵn lúc build. Static-first gồm hai phần:

1. **Build**: trích xuất CSS tĩnh và một *manifest* (danh sách class đã có CSS).
2. **Runtime**: nạp manifest qua tuỳ chọn `preload`; engine bỏ qua các class đó và chỉ sinh CSS cho class phát sinh lúc chạy (dữ liệu từ API, nội dung người dùng, component tải muộn).

## Số Liệu Đo (Chromium, 3.000 node × 21 class, trung vị 5 lần)

| Chế độ | Khởi tạo + quét lần đầu |
| :--- | :--- |
| Runtime thuần | 23–25 ms |
| Static-first (`preload`) | 15–19 ms |
| Static-first + `skipInitialScan` | **2,7 ms** |

Phần lớn chi phí runtime nằm ở việc duyệt DOM (khoảng 126.000 token class), không ở việc sinh CSS. Vì vậy lợi ích lớn nhất đến từ `skipInitialScan`: khi HTML ban đầu được render từ cùng lần build đã trích xuất CSS, engine không cần quét lại.

## Với Vite

```js
// vite.config.js
import presenceStyle from '@porbit/style/vite'

export default {
  plugins: [presenceStyle({ include: ['src', 'index.html'] })],
}
```

```js
// src/main.js
import 'virtual:presence-style.css'
import manifest from 'virtual:presence-style-manifest'
import xcss from '@porbit/style'

xcss.cssObserve(document, {
  hashClassName: false,                       // khớp với CSS tĩnh (plugin mặc định không hash)
  preload: { ...manifest, skipInitialScan: true },
})
```

Plugin quét các file trong `include` (mặc định `src` và `index.html`), sinh CSS ảo `virtual:presence-style.css` ở cả dev server và build, và cập nhật nóng khi một file đổi class (chỉ quét lại file đó). Không cần cài thêm gói nào ngoài `vite`.

## Không Dùng Bundler

```bash
npx presence-style extract src --out public/presence.css --manifest public/presence-manifest.json --config presence-style.config.json
```

```html
<link rel="stylesheet" href="/presence.css" />
<script type="module">
  import xcss from 'https://unpkg.com/@porbit/style/dist/index.mjs'
  const manifest = await fetch('/presence-manifest.json').then((r) => r.json())
  xcss.cssObserve(document, { hashClassName: false, preload: { ...manifest, skipInitialScan: true } })
</script>
```

Dùng `index.mjs` (không phải `index-auto.mjs`, vốn tự observe ngay khi import nên không kịp nhận manifest). File cấu hình nên đặt `"hashClassName": false` để class trong HTML trùng tên với CSS tĩnh. Nếu build bật hash, `manifest.classMap` mang tên rút gọn và runtime trả đúng tên đó qua `clsx()`; HTML phải được sinh qua `clsx()` của cùng cấu hình.

## Khi Nào Không Nên Bật `skipInitialScan`

- HTML ban đầu có class không nằm trong nguồn được quét (template ở CMS, chuỗi ghép động như `'m' + size + 'px'`): các class đó sẽ không có CSS cho tới khi DOM đổi. Thêm chúng vào `safelist` hoặc tắt `skipInitialScan`.
- Không chắc CSS tĩnh và HTML đến từ cùng một lần build.

## Các Tối Ưu Đã Đo Và Không Làm

| Ý tưởng | Đo được | Quyết định |
| :--- | :--- | :--- |
| Tạo stylesheet theo media khi cần (thay vì 12 sheet lúc khởi tạo) | Tạo + adopt 12 sheet rỗng: 0,1 ms | Không làm: lợi ích không đáng so với rủi ro sai thứ tự cascade |
| Gom `insertRule` thành một `replaceSync` | 300 rule: 0,6 ms so với 0,5 ms | Không làm: chênh lệch không đáng kể |
| Khởi tạo engine trên document rỗng | 0,4 ms | Đã đủ nhẹ |
