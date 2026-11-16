# PresenceStyle cho VS Code

Extension chính thức của [`@porbit/style`](https://github.com/porbit/style): client của language server `presence-style lsp`. Hiểu class **Tailwind v4** (phương ngữ `"dialects": ["tailwind"]`, kể cả `@theme`/`@utility`/`@custom-variant` của dự án) và class **x-css**.

| Tính năng | Mô tả |
| :--- | :--- |
| Gợi ý | Class Tailwind/x-css trong `class`, `className`, `cn()`, `clsx()`, `cva()`, `tw`, `twMerge()`, `twJoin()` và hàm khai báo ở `presenceStyle.tailwindFunctions`; gợi ý sau tiền tố biến thể (`md:hover:`); mục màu có ô màu; chọn mục thì hiện CSS |
| Hover | CSS thật mà class sinh ra (cả trong `cn("...")`) |
| Ô màu | Ô màu cạnh class màu (`bg-red-500`, `text-brand`, `c[#f00]`) |
| Chẩn đoán | Class x-css không sinh CSS kèm **quick fix** (`c-red` → `c[red]`, `w-full` → `w100%`), class xung đột cùng thuộc tính |
| Sắp xếp | Lệnh **PresenceStyle: Sắp xếp class trong file** (thứ tự như `prettier-plugin-tailwindcss` khi bật phương ngữ Tailwind); cũng có trong menu *Source Action* |

## Language server dùng bản nào?

1. `presenceStyle.serverPath` nếu đặt.
2. `@porbit/style` cài trong dự án (`node_modules` của thư mục workspace) — đúng phiên bản dự án đang dùng.
3. Bản đóng gói kèm extension (khi dự án chưa cài `@porbit/style`).

Đổi bằng `presenceStyle.server`: `auto` (mặc định), `workspace`, `bundled`. Xem bản đang chạy: lệnh **PresenceStyle: Mở nhật ký (Output)**.

Mỗi thư mục của workspace nhiều gốc có một server riêng, đọc cấu hình của thư mục đó.

## Cấu hình dự án

`presence-style.config.json` ở gốc workspace (server đọc lại khi file này, file `.css` hoặc `tailwind.config.*` thay đổi):

```json
{ "hashClassName": false, "dialects": ["tailwind"], "darkMode": "class", "tailwindCss": "src/app.css" }
```

Dự án Tailwind v4 không muốn thêm file cấu hình: đặt `presenceStyle.tailwindStylesheet` là `src/app.css`.

## Thiết lập

| Khoá | Mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `presenceStyle.enable` | `true` | Bật/tắt (theo thư mục workspace) |
| `presenceStyle.languages` | html, javascript(react), typescript(react), vue, svelte, astro, mdx, php | Ngôn ngữ được phục vụ |
| `presenceStyle.tailwindFunctions` | `[]` | Hàm có đối số là chuỗi class, ví dụ `["tv"]` |
| `presenceStyle.tailwindStylesheet` | `""` | CSS của dự án Tailwind v4; bật phương ngữ Tailwind |
| `presenceStyle.configFile` | `presence-style.config.json` | File cấu hình |
| `presenceStyle.server` | `auto` | Nguồn server: `auto` / `workspace` / `bundled` |
| `presenceStyle.serverPath` | `""` | Đường dẫn server tự chọn |
| `presenceStyle.nodePath` | `""` | Node chạy server (mặc định: Node của VS Code) |
| `presenceStyle.trace.server` | `off` | Ghi tin nhắn LSP vào Output |

## Dùng cùng Tailwind CSS IntelliSense

Hai extension cùng gợi ý, hover và vẽ ô màu nên sẽ thấy mục trùng. Với dự án dùng `@porbit/style` thay Tailwind, tắt *Tailwind CSS IntelliSense* cho workspace đó (Extensions → Tailwind CSS IntelliSense → **Disable (Workspace)**), hoặc tắt PresenceStyle bằng `"presenceStyle.enable": false` trong `.vscode/settings.json` nếu muốn giữ extension Tailwind.

## Bảo mật

Extension không chạy trong chế độ Restricted Mode (workspace chưa tin cậy): language server đọc `tailwind.config.js`/plugin của dự án và có thể chạy `@porbit/style` trong `node_modules` của dự án.

## Phát triển

```bash
npm run build                 # ở gốc repo: dist/lsp.js
cd editors/vscode
npm install
npm test                      # đóng gói rồi smoke test server kèm extension qua stdio
npm run package               # -> presence-style-<version>.vsix
code --install-extension presence-style-0.2.0.vsix
```
