# Hướng Dẫn Thiết Kế Nhanh Một Giao Diện

Tài liệu này dẫn từ con số 0 đến một giao diện hoàn chỉnh bằng `@porbit/style`. Mọi class trong tài liệu đã được chạy thử với engine để xác nhận sinh ra CSS. Tra cứu đầy đủ nằm ở [DICTIONARY.md](../../DICTIONARY.md); đặc tả cú pháp nằm ở [spec/SPEC.md](../../spec/SPEC.md).

## 1. Bật Engine

```html
<script type="module">
  import xcss from 'https://unpkg.com/@porbit/style@latest/dist/index.mjs';
  xcss.cssObserve(document, { theme: { brand: '#0a64e8', ink: '#0f172a' } });
</script>
```

`theme` khai báo token màu để dùng như value: `cBrand`, `bgcBrand`. Token ghi đè mọi value viết tắt cùng tên trong `COMMON_VALUES`.

## 2. Đọc Một Class Trong 10 Giây

```text
md : 2 bgc #0a64e8 @:hover
│    │ │   │        └─ selector (tùy chọn): hậu tố @, ví dụ @:hover, @::before, @;li
│    │ │   └────────── value: #0a64e8 | Red | 10px | [calc(100%;-;10px)]
│    │ └────────────── property viết tắt: bgc = background-color
│    └──────────────── layer (tùy chọn): số, càng lớn càng ưu tiên
└───────────────────── media (tùy chọn): xs sm md lg xl 2xl sma mda lga xla hoặc key tự khai báo
```

Bốn quy tắc đủ dùng cho 90% trường hợp:

1. **Property là chữ thường liền nhau**, dừng ở ký tự đầu tiên không phải `a-z` (chữ hoa, số, `#`, `!`, `[`, `%`).
2. **Value dạng chữ phải viết hoa ký tự đầu**: `dF` (flex), `aiC` (center), `posR` (relative). Viết `df` là sai vì `df` bị đọc là property.
3. **Khoảng trắng trong value viết bằng `;`**: `p8px;16px` → `padding: 8px 16px`.
4. **Value phức tạp bọc trong `[]`**: `w[calc(100%;-;10px)]`, `bxsh[0;8px;24px;rgba(15,23,42,.12)]`.

## 3. Quy Trình 5 Bước

| Bước | Việc làm | Class thường dùng |
| :--- | :--- | :--- |
| 1 | Dựng khung bằng flex/grid | `dF` `fxdC` `dG` `gtc[repeat(3;1fr)]` |
| 2 | Căn chỉnh và khoảng cách | `aiC` `jcC` `jcSp` `gap16px` `p24px` `mb12px` |
| 3 | Kích thước | `w100%` `w400px` `mw400px` `h40px` `mih100vh` |
| 4 | Màu, viền, bóng | `bgc#fff` `cBrand` `bd1px;solid;#e2e8f0` `bdra12px` `bxsh[...]` |
| 5 | Trạng thái và responsive | `opc0.9@:hover` `bgcBrand@:focus` `md:dG` `sma:dN` |

## 4. Ví Dụ Hoàn Chỉnh: Thẻ Đăng Nhập

```html
<body class="m0 mih100vh dF aiC jcC bgc#f1f5f9">
  <form class="w100% mw400px p32px bgc#ffffff bdra16px bxsh[0;8px;24px;rgba(15,23,42,.12)] dF fxdC gap16px">
    <h1 class="m0 fns24px fnw700 cInk">Đăng nhập</h1>
    <input class="h40px p0;12px bd1px;solid;#cbd5e1 bdra8px fns14px bdcBrand@:focus" />
    <input class="h40px p0;12px bd1px;solid;#cbd5e1 bdra8px fns14px" type="password" />
    <button class="h40px bdN bdra8px bgcBrand cWhite fnw600 crP opc0.9@:hover">Tiếp tục</button>
  </form>
</body>
```

Đọc nhanh: `dF fxdC gap16px` = flex dọc, cách nhau 16px; `bdcBrand@:focus` = đổi màu viền khi focus; `crP` = `cursor:pointer`.

## 5. Ví Dụ Responsive: Lưới Thẻ

```html
<section class="dG gtc1fr gap16px p16px md:gtc[repeat(2;1fr)] lg:gtc[repeat(3;1fr)]">
  <article class="p20px bgc#ffffff bd1px;solid;#e2e8f0 bdra12px">
    <h2 class="m0 mb8px fns18px fnw600">Tiêu đề</h2>
    <p class="m0 c#475569 lh1.5">Nội dung mô tả.</p>
  </article>
</section>
```

Thiết kế theo hướng mobile-first: class không có tiền tố áp cho mọi màn hình; `md:` và `lg:` chỉ áp từ độ rộng `768px` và `992px` trở lên. Muốn ẩn ở màn hình nhỏ dùng `sma:dN` (áp khi rộng tối đa `768px`).

## 6. Gộp Nhiều Utility Cùng Selector

Dùng `&` để gộp, mọi phần phải cùng media, layer và selector:

```html
<div class="md:dF&aiC&jcC"></div>
<li class="cRed&fnw600@;li"></li>
```

Class `md:dF&aiC&jcC` sinh một rule duy nhất gồm `display:flex;align-items:center;justify-content:center`.

## 7. Bảng Tra Nhanh Các Alias Hay Dùng

| Nhóm | Alias | CSS |
| :--- | :--- | :--- |
| Hiển thị | `dF` `dG` `dB` `dN` | `display: flex / grid / block / none` |
| Flex | `fxdC` `fxdR` `fx1` `fxw[wrap]` | `flex-direction`, `flex`, `flex-wrap` |
| Căn chỉnh | `aiC` `jcC` `jcSp` `plcC` `pliC` | `align-items`, `justify-content`, `place-content`, `place-items` |
| Khoảng cách | `m` `mt` `mb` `ml` `mr` `mx` `my` `p` `pt` `pb` `pl` `pr` `px` `py` `gap` | `margin`, `padding`, `gap` (trục `x`/`y` là alias ghép) |
| Kích thước | `w` `h` `mw` `mih` `mah` | `width`, `height`, `max-width`, `min-height`, `max-height` |
| Vị trí | `posR` `posA` `posF` `posSt` `t0` `l0` `z10` | `position`, `top`, `left`, `z-index` |
| Màu | `c` `bgc` `bdc` | `color`, `background-color`, `border-color` |
| Chữ | `fns` `fnw` `lh` `lts` `taC` `ttrU` `tdN` | `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-align`, `text-transform`, `text-decoration` |
| Viền | `bd` `bdN` `bdra` `bdw` `bds` | `border`, `border-radius`, `border-width`, `border-style` |
| Hiệu ứng | `bxsh` `opc` `tran` `crP` `oflH` `oflyA` | `box-shadow`, `opacity`, `transition`, `cursor`, `overflow` |

## 8. Nhầm Lẫn Thường Gặp

| Dễ nhầm | Dùng đúng | Lý do |
| :--- | :--- | :--- |
| `fz14px`, `fs14px` | `fns14px` | Font-size là `fns`. |
| `minh100vh`, `mnh100vh` | `mih100vh` | Min-height là `mih`. |
| `zi10` | `z10` | Z-index là `z`. |
| `ouN`, `outN` | `outlineN` hoặc `oliN` | Outline là `oli` hoặc tên đầy đủ `outline`. |
| `ttU` | `ttrU` | Text-transform là `ttr`. |
| `op0.8` | `opc0.8` | `op` là object-position. |
| `bdbr` cho bo góc dưới phải | `bdbrr` | `bdbr` là `box-decoration-break`. |
| `cC` cho màu | `c#...` hoặc `cBrand` | `cC` nghĩa là `color:center` (không hợp lệ, bị trình duyệt từ chối). |
| `hover:cRed` | `cRed@:hover` | Selector đặt ở hậu tố `@`. |

Mẹo kiểm tra nhanh: nếu class không ra CSS, mở `DICTIONARY.md` và tìm alias theo tên CSS gốc (ví dụ tìm `min-height`).

## 9. Quy Tắc Layer Cần Nhớ

1. Dùng layer `0` đến `23`; engine khai báo sẵn thứ tự `l0 → l23`.
2. Layer ngoài dải (ví dụ `24cRed`, `30cRed`) vẫn hoạt động nhưng thứ tự giữa chúng theo lần xuất hiện đầu tiên, không theo số. Tránh phụ thuộc vào chúng.
3. Layer (cascade layer) được xét **trước** media: một class layer cao thắng class layer thấp kể cả khi class layer thấp nằm trong media khớp. Ví dụ ở màn hình `md`, `5cBlue` thắng `md:cRed` vì `l5` đứng sau `l0`. Muốn ghi đè theo breakpoint, đặt cùng layer hoặc layer cao hơn: `md:5cRed`.
4. Trong cùng layer, media khai báo sau trong danh sách (`sm` → `md` → `lg`) thắng media trước.

## 10. Khi Dùng Với Trích Xuất Tĩnh

Class chứa dấu phẩy, ví dụ `ff[Inter,system-ui,sans-serif]`, hoạt động ở runtime nhưng bộ quét tĩnh không nhận vì dấu phẩy thuộc cú pháp mã nguồn. Hãy thêm class đó vào `safelist`:

```json
{ "safelist": ["ff[Inter,system-ui,sans-serif]"] }
```
