# Từ Vựng Mở: Viết Được Mọi CSS

`@porbit/style` không phải bộ class có sẵn mà là **công thức** để mô tả CSS. Bảng alias trong [DICTIONARY.md](../../DICTIONARY.md) chỉ là lối tắt. **Mọi khai báo CSS** (property + giá trị) đều viết được thành một class; các cấu trúc không phải khai báo (at-rule như `@keyframes`, `@font-face`, `@container`) đi theo đường riêng ở mục 7. Tài liệu này là bản đồ để người và AI tự khám phá mà không gặp giới hạn không giải thích.

## 1. Công Thức Tổng Quát

```text
[media:][layer]<property><value>[@selector]
```

Chỉ cần nhớ ba quy tắc:

1. **Property**: dùng alias viết tắt (`bgc`) hoặc **tên CSS đầy đủ** (`background-color`). Cả hai cùng hợp lệ.
2. **Value**: dùng value viết tắt (`Red`, `F`), giá trị thô (`10px`, `#fff`), hoặc **ngoặc vuông** `[...]` cho giá trị bất kỳ.
3. **Mọi thứ khác đi theo dấu**: `md:` (media), số đứng đầu (layer), `@...` (selector), `!` (important), `&` (gộp).

## 2. Ba Lối Vào Cho Một Property

| Cần viết | Cách viết | Kết quả |
| :--- | :--- | :--- |
| Property có alias | `bgcRed` | `background-color: Red` |
| Property chuẩn chưa có alias | `view-transition-name[hero]` | `view-transition-name: hero` |
| Custom property | `--brand[#0a64e8]` | `--brand: #0a64e8` |
| Property có tiền tố nhà cung cấp | `-webkit-line-clamp[3]` | `-webkit-line-clamp: 3` |

Danh sách property chuẩn được chấp nhận nằm ở `src/css-properties.ts` (`STANDARD_CSS_PROPERTIES`). Property không có trong danh sách và không có tiền tố nhà cung cấp sẽ bị từ chối khi từ điển đang bật; đặt `dictionaryImport: false` để bỏ kiểm tra tên property.

## 3. Giá Trị Bất Kỳ Trong Ngoặc Vuông

Trong `[...]`:

| Ký tự | Ý nghĩa | Ví dụ | Kết quả |
| :--- | :--- | :--- | :--- |
| `_` | khoảng trắng | `w[calc(100%_-_2rem)]` | `width: calc(100% - 2rem)` |
| `;` | khoảng trắng (cách viết cũ) | `w[calc(100%;-;2rem)]` | `width: calc(100% - 2rem)` |
| `\_` | dấu gạch dưới nguyên văn | `ff[Foo\_Bar]` | `font-family: Foo_Bar` |
| `".."` `'..'` | chuỗi có nháy giữ nguyên, kể cả `_` | `content["a_b"]` | `content: "a_b"` |
| `,` | giữ nguyên | `ff[Inter,system-ui,sans-serif]` | `font-family: Inter,system-ui,sans-serif` |
| `url(...)` | giữ nguyên, kể cả `_` | `bgi[url(/a_b.png)]` | `background-image: url(/a_b.png)` |

Nhờ vậy mọi hàm CSS đều viết được: `clamp()`, `min()`, `max()`, `color-mix()`, `oklch()`, `repeat()`, `minmax()`, `cubic-bezier()`, `linear-gradient()`.

## 4. Điều Kiện Và Ngữ Cảnh: Selector Và Media

| Muốn | Cách viết |
| :--- | :--- |
| Trạng thái | `cRed@:hover` `cRed@:focus-visible` `cRed@:disabled` |
| Phần tử giả | `cRed@::before` `cRed@::placeholder` |
| Thuộc tính | `cRed@[aria-expanded=true]` `cRed@[data-open=true]` |
| Phần tử con / anh em | `cRed@>li` `cRed@+li` `cRed@;li` (hậu duệ) |
| Khi cha có trạng thái | `cRed@:is(.group:hover;*)` |
| Khi anh em trước có trạng thái | `cRed@:is(.peer:checked~*)` |
| Khi tổ tiên có lớp | `cRed@:is(.dark;*)` |
| Hàm chọn | `cRed@:has(>img)` `cRed@:not(:disabled)` |
| Breakpoint có sẵn | `md:cRed` (xs sm md lg xl 2xl sma mda lga xla) |
| Media tuỳ ý | khai báo `breakpoints: [{ dark: '(prefers-color-scheme: dark)' }]` rồi `dark:cRed` |

Media tuỳ ý dùng cho mọi truy vấn (khai báo trong cấu hình, kể cả khi trích xuất tĩnh: `extractFromClasses(classes, { breakpoints: [...] })`): `print`, `(prefers-reduced-motion: reduce)`, `(min-width: 900px)`, `(orientation: landscape)`.

Dấu `;` trong selector là khoảng trắng; ví dụ `@;li` là `li` bên trong phần tử.

## 5. Cách Khám Phá Dành Cho AI Và Người

1. **Có alias không?** Tìm tên CSS gốc trong [DICTIONARY.md](../../DICTIONARY.md) (cột Property). Có thì dùng alias.
2. **Không có alias?** Viết tên CSS đầy đủ rồi đặt giá trị trong `[...]`: `<ten-css>[<gia-tri>]`.
3. **Giá trị có khoảng trắng hoặc hàm?** Dùng `_` thay khoảng trắng trong `[...]`.
4. **Cần điều kiện?** Thêm `@selector` hoặc tiền tố `media:`.
5. **Cần ghi đè?** Tăng layer (số đứng đầu) hoặc dùng `!`.
6. **Không chắc có sinh CSS không?** Chạy `npx presence-style extract <file>` hoặc `extractFromClasses([...])` và xem `matched`.

Khi một tên đầy đủ trùng với alias của property khác, alias thắng: `r10px` là `right:10px` (không phải thuộc tính SVG `r`), `d[none]` là `display:none` (không phải `d` của SVG path). Muốn dùng property SVG trùng tên, viết trong CSS thường.

Quy tắc dự phòng: `<ten-css-day-du>[<gia-tri>]` luôn đúng với bất kỳ property CSS chuẩn nào.

## 6. Mở Rộng Vocabulary

| Nhu cầu | Cách làm |
| :--- | :--- |
| Thêm tên giá trị dùng lại (là bí danh giá trị, **không** tạo custom property CSS) | `theme: { brand: '#0a64e8' }` rồi `cBrand` → `color:#0a64e8` |
| Dùng biến CSS | khai báo `base: ':root{--brand:#0a64e8}'`, rồi `c--brand` → `color:var(--brand)`; hoặc đặt giá trị cục bộ `--brand[#0a64e8]` |
| Gộp nhiều khai báo thành một tên | `aliases: { card: ['padding:16px', 'border-radius:12px'] }` rồi `[card]` |
| Thêm breakpoint hoặc media | `breakpoints: [{ tablet: 'screen and (min-width: 900px)' }]` |
| Thêm alias property hoặc value mới | dùng `dictionaryImport` trỏ tới module từ điển riêng |
| Bỏ kiểm tra tên property | `dictionaryImport: false`: nhận mọi tên property không kiểm tra, nhưng **mất toàn bộ alias viết tắt** và không còn composite `mx`/`px`; chỉ dùng khi bạn viết toàn tên đầy đủ |

## 7. Giới Hạn Thật Sự (Không Che Giấu)

0. **Class là mã, không phải dữ liệu.** Engine sinh CSS từ bất kỳ class nào xuất hiện trong DOM, kể cả giá trị như `bgi[url(//ten-mien-la/x)]` (làm trình duyệt gửi yêu cầu mạng) hay `ff[url(...)]`. Đừng hiển thị thuộc tính `class` do người dùng cuối nhập mà chưa lọc. Nếu cần nhận class từ nguồn không tin cậy, dùng `excludes`/`excludePrefixes` hoặc chỉ cho phép danh sách class đã duyệt (`safelist` + tắt observer).

1. **Trích xuất tĩnh không kiểm tra được giá trị sai.** Không có `CSS.supports` ngoài trình duyệt nên `w[banana]` vẫn sinh `width:banana`; trình duyệt sẽ bỏ qua khai báo đó. Giá trị chứa `{`, `}`, `<`, `/*` luôn bị từ chối.
2. **Class ghép chuỗi động** (`'m' + n + 'px'`) không quét tĩnh được; đưa vào `safelist`.
3. **`@keyframes`, `@font-face`, `@property`, `@container`, `@supports`** là at-rule, không phải một class. Viết chúng trong `base` (CSS gốc đưa vào trang trước các rule class, ví dụ `base: '@keyframes spin{to{transform:rotate(360deg)}}'`) hoặc file CSS thường; class gọi chúng bằng `anin[spin]` hoặc `ani[spin_1s_linear_infinite]`.
4. **Một class chỉ mang một media.** `md:dark:cRed` không hợp lệ. Muốn "màn hình `md` và chế độ tối", khai báo một breakpoint tổ hợp: `breakpoints: [{ mddark: 'screen and (min-width: 768px) and (prefers-color-scheme: dark)' }]` rồi dùng `mddark:cRed`.
5. **`translate`, `scale`, `rotate`** là property riêng lẻ của CSS hiện đại, không cộng dồn như `transform`. Muốn kết hợp, dùng `tra[...]` (transform) một lần.
