# PresenceStyle — Đặc Tả Chuẩn (canonical)

Tài liệu này là **nguồn chân lý hình thức** cho cú pháp x-css, dùng chung cho mọi engine
(Node `@porbit/style`, Rust `presence_style`). Mọi engine PHẢI sinh ra cùng một CSS ngữ nghĩa
cho cùng một class, được kiểm chứng bằng [conformance.core.json](./conformance.core.json).

> Tài liệu này mô tả **đúng hành vi engine Node hiện tại** (nguồn chân lý). Khi engine đổi,
> chạy lại `node scripts/gen-spec.cjs` để cập nhật dictionary.json + conformance, rồi đồng bộ engine khác.

## 1. Hình dạng class

```
[Media]:[Layer][prop][val][@Selector]
```

Thứ tự tách (bắt buộc, khớp `src/parser.ts`):

1. **Selector**: ký tự `@` cuối cùng nằm NGOÀI `[]`. Phần sau `@` là selector; cắt khỏi class.
2. **Media**: ký tự `:` đầu tiên nằm NGOÀI `[]`. Phần trước `:` là media key.
3. **Layer**: chuỗi chữ số liên tiếp ở đầu phần còn lại.
4. **Prop**: quét trái→phải theo bảng quyết định (mục 3).
5. **Val**: phần còn lại sau prop.

Điều kiện loại bỏ sớm (`parseClassName` trả `null`):

- `class.length < 2`.
- `[]` không cân bằng (thừa/thiếu).
- Sau khi tách layer, ký tự đầu của phần còn lại là `&`.
- Không có ký tự prop nào (prop rỗng).

Trường hợp đặc biệt: nếu phần còn lại bắt đầu bằng `[` và có `]` đóng → prop = `[...]`
(alias group), val = rỗng.

## 2. Bảng breakpoint mặc định (theo thứ tự)

| key | query |
|-----|-------|
| `default` | *(không bọc @media)* |
| `xs` | `screen and (max-width: 575px)` |
| `sm` | `screen and (min-width: 576px)` |
| `md` | `screen and (min-width: 768px)` |
| `lg` | `screen and (min-width: 992px)` |
| `xl` | `screen and (min-width: 1200px)` |
| `2xl` | `screen and (min-width: 1400px)` |
| `sma` | `screen and (max-width: 768px)` |
| `mda` | `screen and (max-width: 992px)` |
| `lga` | `screen and (max-width: 1200px)` |
| `xla` | `screen and (max-width: 1400px)` |

`breakpoints` custom được nối vào sau; trùng key → khai báo sau ghi đè (last-write-wins).
Media key không nằm trong tập hợp lệ → class bị từ chối.

## 3. Bảng quyết định quét `prop`

Quét từ vị trí đầu của phần còn lại; với ký tự tại `i`:

| Ký tự | Điều kiện | Hành động |
|-------|-----------|-----------|
| `-` hoặc `.` | ký tự kế là chữ số | dừng prop (val bắt đầu) |
| `-` | ký tự kế là `.` rồi một chữ số (`m-.5rem`) | dừng prop (val bắt đầu) |
| `-` | gặp `--` và đã có ≥1 ký tự prop | dừng prop (val = CSS var) |
| `--` ở đầu | prop là `--ten` rồi `[` | custom property, val là phần `[...]` (xem mục 4.1) |
| `-` hoặc `.` | còn lại | thuộc prop, tiếp tục |
| `a`–`z` | luôn | thuộc prop, tiếp tục |
| khác (`A-Z`, `0-9`, `#`, `!`, `[`, `(`, `%`, …) | luôn | dừng prop (val bắt đầu) |

## 4. Phân giải `prop` → tên CSS

1. Nếu `prop` ∈ `SHORT_PROPERTIES` → tên CSS = giá trị map.
2. Ngược lại → tên CSS = chính `prop` (cho phép viết đầy đủ như `color`, `margin-top`).

**Gating "known property"** (khi dictionary bật): class hợp lệ chỉ khi `prop` là một trong:

- (a) key trong `SHORT_PROPERTIES`;
- (b) composite `mx my px py bdx bdy`;
- (c) tên CSS đầy đủ là giá trị của `SHORT_PROPERTIES`;
- (d) tên property CSS chuẩn trong `STANDARD_CSS_PROPERTIES` (`src/css-properties.ts`), ví dụ
  `view-transition-name`, `content-visibility`, `anchor-name`, `field-sizing`;
- (e) property có tiền tố nhà cung cấp `-webkit-`, `-moz-`, `-ms-`, `-o-`;
- (f) custom property `--ten` — chỉ ở dạng có ngoặc vuông `--ten[gia-tri]` (xem 4.1).

Không thuộc nhóm nào → từ chối. Khi `dictionaryImport: false` không áp dụng gating, mọi tên đều được nhận.

### 4.1 Custom property

`--ten[gia-tri]` sinh `--ten:gia-tri`. Dạng `--tenGiaTri` (không ngoặc vuông) bị từ chối vì mơ hồ với
`prop--value` (CSS variable làm value, ví dụ `bgc--brand` → `background-color:var(--brand)`).
Parser nhận `--ten` là property khi ký tự `[` xuất hiện sau tên chỉ gồm `[a-zA-Z0-9_-]`.

## 5. Phân giải `val`

Theo đúng `propToValue` (`src/core.ts`):

1. `val` bắt đầu `!` → bật `important`, bỏ `!`.
2. `val` bắt đầu `--` → `var(<val>)`.
3. `val` dạng `[...]` → bỏ `[` `]`, rồi giải mã `_` thành khoảng trắng (`\\_` giữ dấu gạch dưới;
   nội dung `url(...)` được giữ nguyên). `w[calc(100%_-_2rem)]` → `width:calc(100% - 2rem)`.
4. Ngược lại — tra dictionary theo **2 lượt**, mỗi lượt specific TRƯỚC common:
   - lượt 1 khóa = `lowercaseFirst(val)` (chỉ hạ ký tự đầu): `SPECIFIC_VALUES[prop][k] ?? exts[k]`
   - lượt 2 khóa = `val.toLowerCase()` (hạ toàn bộ): `SPECIFIC_VALUES[prop][k] ?? exts[k]`
   - `exts = { ...COMMON_VALUES, ...theme }` (theme ghi đè).
   - không khớp → giữ nguyên `val`.
5. Thay `;`/`';`: regex `(';|;)` — `';` → `;`, `;` đơn → khoảng trắng (một lượt duy nhất).
6. Nếu rỗng → từ chối.
7. Ghép: `<tên CSS>:<val>[ !important]`.

**Composite** (sau khi có `vxx`):

| prop | declarations |
|------|--------------|
| `mx` | `margin-left:V;margin-right:V` |
| `my` | `margin-top:V;margin-bottom:V` |
| `px` | `padding-left:V;padding-right:V` |
| `py` | `padding-top:V;padding-bottom:V` |
| `bdx`| `border-left:V;border-right:V` |
| `bdy`| `border-top:V;border-bottom:V` |

8. **Validation CSS** (chỉ trình duyệt, `typeof CSS !== 'undefined'`): mọi declaration phải
   `CSS.supports(...)`; nếu không → từ chối. Ở SSR/Node KHÔNG áp dụng bước này
   (⇒ conformance được sinh ở chế độ SSR để engine không-DOM như Rust có thể khớp).
   Thay vào đó, ở SSR/Node giá trị sau khi chuẩn hóa bị từ chối nếu chứa `{`, `}`, `<`
   hoặc chuỗi mở comment `/*`, để không thể thoát khỏi khối rule hoặc thẻ `<style>`.

## 6. Selector

- `selectorStr = replaceSemicolons(parsed.selector)` (cùng quy tắc mục 5.5).
- Trình duyệt: hợp lệ khi `CSS.supports("selector(.<cls><selectorStr>)")`.
- SSR/Node: hợp lệ theo `isLikelyValidSelectorFallback` — loại nếu chứa `{`/`}`,
  ngoặc tròn không cân bằng, chứa `<` hoặc `/*`, hoặc là ký tự đơn `# ( ) , > + ~`.

## 7. Layer & cascade

- Layer mặc định `0`; engine tạo sẵn `l0`..`l23`.
- Trình duyệt hỗ trợ `@layer`: rule bọc `@layer l<N>{ <rule> }`.
- Không hỗ trợ `@layer`: rule không bọc (theo thứ tự chèn). *(Khác biệt trình bày, không ảnh hưởng tuple ngữ nghĩa.)*

## 8. Hợp đồng conformance

`conformance.core.json`: mảng `{ input, accepted, media, layer, selector, declarations }` —
chỉ gồm tính năng cross-engine (parser + dictionary; KHÔNG aliases/theme/excludes/prefix).
So khớp theo **tuple ngữ nghĩa**, KHÔNG so tên class (hash/escape mỗi engine khác nhau):

- `accepted`: class có sinh ra rule không.
- `media`: chuỗi query (`''` nếu default).
- `layer`: số.
- `selector`: đã thay `;`/`';`.
- `declarations`: chuỗi `prop:val;...` từ engine Node (nguồn chân lý value-resolution).
