# presence_style

Rust workspace cho PresenceStyle, nằm trong thư mục `presence_style/` của repo `porbit/style`, cạnh engine Node (`src/`). Các crate được quản lý bởi workspace `presence_style/Cargo.toml`.

## Crates

1. `x-core` / package `presence-style-core`
   - Parser contract tương thích cú pháp x-css hiện tại.
   - Resolve property/value cơ bản.
   - Registry sinh class name ổn định và CSS text.

2. `x-css` / package `presence-style-css`
   - Facade crate cho app/framework dùng chung.
   - Re-export `presence-style-core`.
   - Giữ feature placeholders `yew`, `leptos`, `sycamore` để thêm adapter mỏng sau mà không đổi crate layout.

## Dictionary & parity với engine Node (single source of truth)

- `x-core/src/dictionary_generated.rs` là file **@generated**, KHÔNG sửa tay. Nó được sinh từ
  dictionary canonical của engine Node (`src/dictionary.ts`, `src/css-properties.ts`) qua, chạy ở gốc repo:

  ```bash
  PRESENCE_STYLE_RUST_TESTS_DIR=presence_style/x-core/tests \
  PRESENCE_STYLE_RUST_DICT_OUT=presence_style/x-core/src/dictionary_generated.rs \
  npm run gen
  ```

- Parity được kiểm chứng bằng `x-core/tests/conformance.rs`: chạy engine Rust trên **ground truth**
  sinh từ engine Node (`x-core/tests/conformance.core.json`) và so theo tuple ngữ nghĩa
  `{accepted, media, layer, selector, declarations}`. Hiện khớp **100% / 3314 case**, gồm từ vựng mở
  (tên CSS đầy đủ, `-webkit-*`, `--bien[...]`), `_` trong `[...]`, số âm `-.5rem`, chuỗi `&` và các giá trị
  /selector không an toàn (bị từ chối như Node). Ngoài ra CSS hai engine sinh cho 8 màn hình mẫu được so
  trên Chromium ở 3 độ rộng: 0 khác biệt computed style.

  ```bash
  cargo test --manifest-path x-core/Cargo.toml --test conformance
  ```

  Chi tiết pipeline: `spec/README.md` ở gốc repo.

## CSS sinh ra và thứ tự cascade

`css_text()` sinh cùng mô hình với engine Node:

1. Bắt đầu bằng `@layer l0, l1, ..., l23;` (hằng `LAYER_ORDER_STATEMENT`), nên layer cao luôn thắng.
2. Mỗi rule bọc `@layer lN{...}`; rule giữ thứ tự chèn.
3. Khối `@media` theo thứ tự breakpoint (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `sma`...), breakpoint tự khai báo
   nằm ở vị trí khai báo sau cùng (last-write-wins).

Trước 0.2.0, Rust không bọc `@layer` và sắp media theo chuỗi query (bảng chữ cái), nên `sm:` đè `xl:` trên màn
hình rộng và `md:cRed` đè `5cBlue`.

## Hiệu năng

`XCoreRegistry` ghi nhớ kết quả từng token và cache `css_text()` cho tới khi có rule mới. Đo bằng
`cargo run --release -p presence-style-core --example bench_registry` (3.000 dòng class):

| Thao tác | 0.1.0 | 0.2.0 |
| :--- | ---: | ---: |
| `clsx` lần đầu | 34–46 ms | 2–3 ms |
| `clsx` lặp 20 lần (re-render) | 690–770 ms | 36–38 ms |
| `css_text()` × 200 | 6–7 ms | 0,04–0,06 ms |

## Raw class name

Mặc định registry trả class hash dạng `D...`. Nếu muốn giữ nguyên token x-css ở output:

```rust
use presence_style_css::{XCoreConfig, XCss};

let mut config = XCoreConfig::default();
config.hash_class_name = false;

let mut xcss = XCss::with_config(config);
let class_name = xcss.clsx("dF aiC p10px");
assert_eq!(class_name, "dF aiC p10px");
```

Viết gọn hơn:

```rust
use presence_style_css::XCss;

let xcss = XCss::raw();
let class_name = xcss.c("dF aiC p10px");
let css = xcss.style();
```

Ví dụ runnable:

```bash
cd presence_style
cargo run -p presence-style-css --example hash_modes
cargo run -p presence-style-css --example raw_prefix_breakpoint
```

## Test

```bash
cd presence_style
cargo test -p presence-style-core -p presence-style-css
```

## Framework examples

Ví dụ sử dụng với Yew, Leptos, Sycamore nằm trong:

```text
presence_style/examples/
```

Mỗi ví dụ là app Trunk độc lập:

```bash
cd presence_style/examples/yew-basic
trunk serve
```

Ví dụ đầy đủ cho hash mode:

```bash
cd presence_style/examples/leptos-hash-complete
trunk serve
```

Ví dụ viết class trực tiếp, không gọi `xcss.c(...)` trong markup:

```bash
cd presence_style/examples/leptos-direct-class
trunk serve
```

Ví dụ `leptos-hash-complete` có thêm `leptos_router` với 3 route:

- `/`
- `/login`
- `/register`
