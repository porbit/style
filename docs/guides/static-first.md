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

Phần lớn chi phí runtime nằm ở việc duyệt DOM (khoảng 126.000 token class), không ở việc sinh CSS. Vì vậy lợi ích lớn nhất đến từ `skipInitialScan`: engine không quét DOM trước paint đầu mà **dời lượt quét sang lúc trình duyệt rảnh** (`requestIdleCallback`, tối đa 500 ms). Class đã có trong manifest bị bỏ qua ngay, nên lượt quét dời này rẻ; class không có trong CSS tĩnh (ví dụ do JavaScript sinh trước khi gọi `cssObserve`) vẫn có CSS, chỉ chậm hơn một nhịp.

## Với Vite

```js
// vite.config.js
import presenceStyle from '@porbit/style/vite'
import { tailwindDialect } from '@porbit/style/tailwind'

export default {
  plugins: [
    presenceStyle({
      include: ['src', 'index.html'],
      components: true,                 // nếu dùng @porbit/style/components
      dialects: [tailwindDialect()],    // nếu viết class Tailwind
    }),
  ],
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

## Class Không Quét Được Từ Mã Nguồn

Bước build chỉ thấy class viết dạng chuỗi trong mã nguồn. Các class sau không có trong CSS tĩnh và sẽ hiện **không có style trong một nhịp** (tới lượt quét dời) nếu bật `skipInitialScan`:

- Class do recipe component sinh trong JS (`${button()}`): bật `components: true` ở plugin Vite, hoặc `--components` ở CLI, để đưa toàn bộ 190 class của bộ component vào CSS tĩnh (+~2 KB gzip).
- Chuỗi ghép động (`'m' + size + 'px'`), template ở CMS: thêm vào `safelist`.

Phát hiện này đến từ việc dựng thử một trang thật: trước bản 0.7.1, `skipInitialScan` bỏ hẳn lần quét đầu nên card/button do recipe sinh không bao giờ có CSS.

## Các Tối Ưu Đã Đo Và Không Làm

| Ý tưởng | Đo được | Quyết định |
| :--- | :--- | :--- |
| Tạo stylesheet theo media khi cần (thay vì 12 sheet lúc khởi tạo) | Tạo + adopt 12 sheet rỗng: 0,1 ms | Không làm: lợi ích không đáng so với rủi ro sai thứ tự cascade |
| Gom `insertRule` thành một `replaceSync` | 300 rule: 0,6 ms so với 0,5 ms | Không làm: chênh lệch không đáng kể |
| Khởi tạo engine trên document rỗng | 0,4 ms | Đã đủ nhẹ |
