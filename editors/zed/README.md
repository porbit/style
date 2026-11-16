# PresenceStyle cho Zed

Extension Zed khởi chạy language server `presence-style lsp` của [`@porbit/style`](https://github.com/porbit/style) qua Node mà Zed quản lý: gợi ý class Tailwind v4/x-css (kèm ô màu), hover hiện CSS, ô màu trong file, gạch lỗi và quick fix, code action sắp xếp class.

Server được chọn theo thứ tự:

1. `lsp.presence-style.binary` trong `settings.json` của Zed,
2. `@porbit/style` cài trong dự án (`node_modules/@porbit/style`, bản có language server — từ 1.0),
3. `@porbit/style` mới nhất trên npm, Zed tự cài vào thư mục của extension.

## Cài bản phát triển

Cần Rust cài bằng `rustup` (Zed tự build sang WebAssembly bằng toolchain này):

1. Zed → command palette → `zed: install dev extension` → chọn thư mục `editors/zed`.
2. Mở dự án có class Tailwind/x-css; nhật ký: `zed: open log`, `dev: open language server logs`.

Kiểm tra mã Rust biên dịch được (không cần Zed):

```bash
cd editors/zed
cargo build --release --target wasm32-wasip2   # cần: rustup target add wasm32-wasip2
```

## Thiết lập

```json
{
  "lsp": {
    "presence-style": {
      "initialization_options": {
        "tailwindStylesheet": "src/app.css",
        "tailwindFunctions": ["tv"]
      }
    }
  },
  "languages": {
    "TSX": { "language_servers": ["...", "presence-style"] }
  }
}
```

Server mặc định chạy cùng các server khác của ngôn ngữ (HTML, JavaScript, TSX, TypeScript, Vue.js, Svelte, Astro, PHP, Markdown). Dự án dùng `@porbit/style` thay Tailwind có thể tắt server Tailwind có sẵn của Zed: `"language_servers": ["!tailwindcss-language-server", "..."]`.

Server tự chọn (ví dụ bản đang phát triển):

```json
{ "lsp": { "presence-style": { "binary": { "path": "node", "arguments": ["/đường/dẫn/style/dist/cli-bin.js", "lsp"] } } } }
```

## Phát hành lên Zed Extensions

1. Thư mục `editors/zed` đã có `LICENSE` (Apache-2.0, chép từ gốc repo) — registry của Zed yêu cầu.
2. Fork `zed-industries/extensions`, thêm repo này làm submodule `extensions/presence-style`, và mục trong `extensions.toml`:

   ```toml
   [presence-style]
   submodule = "extensions/presence-style"
   path = "editors/zed"
   version = "0.1.0"
   ```

3. `pnpm sort-extensions`, mở PR. Mỗi lần phát hành: tăng `version` trong `extension.toml` và `extensions.toml`, cập nhật submodule.
