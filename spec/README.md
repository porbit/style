# PresenceStyle — Chuẩn hóa đa engine (single source of truth)

Thư mục này là **lớp chuẩn hóa** đảm bảo engine Node (`@porbit/style`) và engine Rust
(`presence_style`) sinh ra cùng một CSS ngữ nghĩa cho cùng một class.

## Nguyên tắc: không chép tay

Mọi tạo tác đều **sinh tự động từ chính engine Node thật** (nguồn chân lý), không gõ tay,
để loại bỏ rủi ro nhận diện sai token / lệch mapping.

```
src/dictionary.ts ──(gen-spec)──▶ spec/dictionary.json ──(gen-rust-dict)──▶ x-core/src/dictionary_generated.rs
src/{core,parser}.ts ──(gen-spec, chạy engine thật)──▶ spec/conformance.core.json ──▶ x-core/tests/conformance.core.json
```

## Tập tin

| File | Vai trò | Sinh bởi |
|------|---------|----------|
| [SPEC.md](./SPEC.md) | Đặc tả hình thức cú pháp (grammar, parse order, value resolution) | tay (mô tả engine) |
| [dictionary.json](./dictionary.json) | 3 bảng dictionary canonical | `npm run gen:spec` từ `src/dictionary.ts` |
| [conformance.core.json](./conformance.core.json) | Ground truth: `{input, accepted, media, layer, selector, declarations}` | `npm run gen:spec` chạy engine Node SSR |

## Lệnh

```bash
npm run gen:spec    # dictionary.json + conformance.core.json (copy sang Rust nếu đặt PRESENCE_STYLE_RUST_TESTS_DIR)
npm run gen:rust    # dictionary_generated.rs; cần đối số đường dẫn hoặc PRESENCE_STYLE_RUST_DICT_OUT
npm run gen         # cả hai
```

## Cổng kiểm chứng (verification gates)

- **Node** ([tests/conformance.test.ts](../tests/conformance.test.ts)): chạy lại engine Node trên
  toàn bộ ground truth → khóa hành vi, bắt regression. Khi cố ý đổi engine, chạy lại `npm run gen:spec`.
- **Rust** (`x-core/tests/conformance.rs`): chạy engine Rust trên cùng ground truth → đảm bảo parity.
  Lần đo parity gần nhất khớp **100% / 3274 case** (bản 0.3.x). Từ 0.4.0 bộ ground truth có **3294 case** (2698 accepted, 596 rejected): 20 case mới (property chuẩn viết đủ tên, custom property `--ten[...]`, `_` trong ngoặc vuông, số âm `-.5`) **chưa được chạy trên engine Rust**, nên parity của 0.4.0 là `NOT_TESTED` cho tới khi engine Rust được cập nhật và chạy lại.

## So khớp theo tuple ngữ nghĩa

Hai engine có thuật toán hash (`D...` sizeLast vs FNV-1a) và escape khác nhau ở **tên class**,
nên conformance KHÔNG so tên class mà so tuple `{accepted, media-query, layer, selector, declarations}`:

- `declarations` lấy trực tiếp từ `getCssString()` của Node (nguồn chân lý value-resolution).
- `media`/`layer`/`selector` lấy từ `parseClassName()` (đã export) + bảng breakpoint tĩnh.

## Phạm vi parity hiện tại (cross-engine)

✅ Parser (tách token), dictionary đầy đủ (406 prop), value resolution (specific→common 2 lượt,
`!important`, `var(--x)`, arbitrary `[...]`, thay `;`/`';`), composite (mx/my/px/py/bdx/bdy),
gating known-property, media/breakpoint, layer, selector + validation fallback, escape spec, prefix.

⏳ Chưa đưa vào parity (Node-only, không ảnh hưởng CSS runtime cốt lõi): aliases `[name]` /
`&`-chain, theme tokens, `excludes`/`excludePrefixes`, Tailwind migration helper, cache multitab,
`CSS.supports` validation (chỉ chạy ở trình duyệt; conformance sinh ở SSR nên không áp dụng),
wasm-pack bindings cho npm. Đây là các bước mở rộng tiếp theo.
