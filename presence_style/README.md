# presence_style

Rust workspace cho PresenceStyle, đã tách khỏi `PresenceNodejs/PresenceStyle`.

Nhóm này nằm trong `PresenceRs/presence_style`; các crate được quản lý bởi workspace `PresenceRs/presence_style/Cargo.toml`.

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
  dictionary canonical của engine Node (`PresenceNodejs/PresenceStyle/src/dictionary.ts`) qua:

  ```bash
  cd /Volumes/Demo/dev/Presence/PresenceNodejs/PresenceStyle
  npm run gen          # gen:spec (dictionary.json + conformance) + gen:rust (dictionary_generated.rs)
  ```

- Parity được kiểm chứng bằng `x-core/tests/conformance.rs`: chạy engine Rust trên **ground truth**
  sinh từ engine Node (`x-core/tests/conformance.core.json`) và so theo tuple ngữ nghĩa
  `{accepted, media, layer, selector, declarations}`. Hiện khớp **100% / 3274 case**.

  ```bash
  cargo test --manifest-path x-core/Cargo.toml --test conformance
  ```

  Chi tiết pipeline: `PresenceNodejs/PresenceStyle/spec/README.md`.

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
cd /Volumes/Demo/dev/Presence/PresenceRs/presence_style
cargo run -p presence-style-css --example hash_modes
cargo run -p presence-style-css --example raw_prefix_breakpoint
```

## Test

```bash
cd /Volumes/Demo/dev/Presence/PresenceRs/presence_style
cargo test -p presence-style-core -p presence-style-css
```

## Framework examples

Ví dụ sử dụng với Yew, Leptos, Sycamore nằm trong:

```text
PresenceRs/presence_style/examples/
```

Mỗi ví dụ là app Trunk độc lập:

```bash
cd /Volumes/Demo/dev/Presence/PresenceRs/presence_style/examples/yew-basic
trunk serve
```

Ví dụ đầy đủ cho hash mode:

```bash
cd /Volumes/Demo/dev/Presence/PresenceRs/presence_style/examples/leptos-hash-complete
trunk serve
```

Ví dụ viết class trực tiếp, không gọi `xcss.c(...)` trong markup:

```bash
cd /Volumes/Demo/dev/Presence/PresenceRs/presence_style/examples/leptos-direct-class
trunk serve
```

Ví dụ `leptos-hash-complete` có thêm `leptos_router` với 3 route:

- `/`
- `/login`
- `/register`
