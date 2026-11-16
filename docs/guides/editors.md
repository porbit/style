# Editor: Language Server Dùng Chung

`presence-style lsp` là language server (LSP) chạy qua stdio, không cần cài thêm gì ngoài `@porbit/style`. Một server cho mọi editor hỗ trợ LSP.

| Tính năng | Mô tả |
| :--- | :--- |
| Chẩn đoán | Class x-css không sinh CSS (kèm bản sửa), class xung đột cùng thuộc tính |
| Hover | CSS thật mà class sinh ra, kể cả class Tailwind khi bật phương ngữ |
| Gợi ý | Class Tailwind (cả theme/`@utility` của dự án) kèm ô màu và CSS khi chọn, biến thể sau `md:hover:`; alias x-css với dự án x-css. Cả trong `cn()`/`clsx()`/`cva()` |
| Code action | Quick fix (`c-red` → `c[red]`, `w-full` → `w100%`), "sắp xếp class trong file" (thứ tự như prettier-plugin-tailwindcss khi bật phương ngữ Tailwind) |
| Ô màu | `textDocument/documentColor`: ô màu cạnh class màu (`bg-red-500`, `text-brand` theo `@theme`, `c[#f00]`) |

Server đọc `presence-style.config.json` ở gốc workspace và đọc lại khi file này (hoặc file `.css`) được lưu hoặc client báo file thay đổi (`workspace/didChangeWatchedFiles`).

### Thiết lập từ editor

Ngoài file cấu hình, client gửi thiết lập qua `initializationOptions` (khi khởi động) hoặc `workspace/didChangeConfiguration` (`settings`), dạng phẳng hoặc lồng dưới `presenceStyle`:

| Khoá | Ý nghĩa |
| :--- | :--- |
| `tailwindFunctions` | Hàm có đối số là chuỗi class (`["tv"]`), thêm vào `cn`, `clsx`, `cva`, `tw`, `twMerge`, `twJoin`: gợi ý, hover, ô màu và sắp xếp hiểu chuỗi trong các hàm này. Cũng đọc được từ khoá `tailwindFunctions` của file cấu hình |
| `tailwindStylesheet` | CSS của dự án Tailwind v4 (`src/app.css`), tương đối với gốc workspace. Ghi đè `tailwindCss` và bật phương ngữ Tailwind kể cả khi không có file cấu hình |
| `configFile` | Tên file cấu hình thay cho `presence-style.config.json` |

### Lệnh khởi chạy

Mọi editor chạy cùng một lệnh: `presence-style lsp` (bin của `@porbit/style`, giao tiếp qua stdio). Trong dự án đã cài `@porbit/style`, `npx presence-style lsp` dùng bin trong `node_modules`. Dự án chưa cài: `npx -y --package=@porbit/style presence-style lsp` (chỉ định rõ gói, vì trên npm không có gói tên `presence-style`).

Kiểm tra server chạy đúng (khởi chạy qua stdio, gửi initialize/didOpen/completion/hover/documentColor trên file TSX):

```bash
node scripts/lsp-smoke.cjs                                    # server của repo (dist/cli-bin.js)
node scripts/lsp-smoke.cjs --server node_modules/@porbit/style/dist/cli-bin.js
```

## Dự Án Tailwind v4

```json
{
  "hashClassName": false,
  "dialects": ["tailwind"],
  "darkMode": "class",
  "tailwindCss": "src/app.css"
}
```

Với `tailwindCss`, server hiểu `@config "./tailwind.config.js"` (v3), `@theme`, `@utility` (cả dạng hàm `tab-*`), `@custom-variant`, `@apply` và `@import`/`@plugin` của dự án (`tw-animate-css`, `@tailwindcss/forms`, `@tailwindcss/typography` có sẵn nếu không tìm thấy trong `node_modules`). Class Tailwind hợp lệ không bị gạch; hover hiện đúng CSS mà trang nhận. Cùng khoá này được CLI `extract`/`check` dùng.

## VS Code

Extension trong `editors/vscode` là client LSP (`vscode-languageclient`) của chính server này:

- Ưu tiên `@porbit/style` cài trong dự án (đúng phiên bản dự án), không có thì dùng server đóng gói kèm extension; chọn bằng `presenceStyle.server` (`auto`/`workspace`/`bundled`) hoặc `presenceStyle.serverPath`.
- Thiết lập: `presenceStyle.enable`, `presenceStyle.languages`, `presenceStyle.tailwindFunctions`, `presenceStyle.tailwindStylesheet`, `presenceStyle.configFile`, `presenceStyle.nodePath`, `presenceStyle.trace.server`.
- Lệnh: **PresenceStyle: Sắp xếp class trong file**, **Khởi động lại language server**, **Mở nhật ký (Output)**.
- Mỗi thư mục của workspace nhiều gốc có một server riêng; không chạy trong workspace chưa tin cậy (Restricted Mode).

Cài từ mã nguồn:

```bash
npm run build                      # gốc repo
cd editors/vscode && npm install
npm test                           # đóng gói + smoke test server kèm extension
npm run package                    # -> presence-style-0.2.0.vsix
code --install-extension presence-style-0.2.0.vsix
```

```json
// .vscode/settings.json
{
  "presenceStyle.tailwindStylesheet": "src/app.css",
  "presenceStyle.tailwindFunctions": ["tv"]
}
```

**Trùng với Tailwind CSS IntelliSense:** cả hai cùng gợi ý, hover và vẽ ô màu. Với dự án dùng `@porbit/style` thay Tailwind, tắt extension Tailwind CSS IntelliSense cho workspace đó (Extensions → Tailwind CSS IntelliSense → *Disable (Workspace)*); ngược lại, muốn giữ extension Tailwind thì đặt `"presenceStyle.enable": false`.

Phát hành (publisher `porbit`): tạo publisher và Personal Access Token (Azure DevOps, quyền *Marketplace → Manage*), rồi `npx vsce login porbit` và `npx vsce publish --no-dependencies` trong `editors/vscode` (Open VSX: `npx ovsx publish presence-style-<version>.vsix -p <token>`).

## Neovim (0.11+)

```lua
vim.lsp.config('presence_style', {
  cmd = { 'npx', 'presence-style', 'lsp' },
  filetypes = { 'html', 'javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'vue', 'svelte', 'astro' },
  root_markers = { 'presence-style.config.json', 'package.json' },
  -- Tuỳ chọn: thiết lập gửi cho server.
  init_options = { presenceStyle = { tailwindStylesheet = 'src/app.css', tailwindFunctions = { 'tv' } } },
})
vim.lsp.enable('presence_style')
```

Neovim cũ hơn (nvim-lspconfig):

```lua
local configs = require('lspconfig.configs')
configs.presence_style = {
  default_config = {
    cmd = { 'npx', 'presence-style', 'lsp' },
    filetypes = { 'html', 'javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'vue', 'svelte', 'astro' },
    root_dir = require('lspconfig.util').root_pattern('presence-style.config.json', 'package.json'),
    init_options = { presenceStyle = { tailwindFunctions = { 'tv' } } },
  },
}
require('lspconfig').presence_style.setup({})
```

Ô màu (Neovim 0.12+): `vim.lsp.document_color.enable(true, bufnr)` trong `LspAttach`.

## Helix

```toml
# .helix/languages.toml (hoặc ~/.config/helix/languages.toml)
[language-server.presence-style]
command = "npx"
args = ["presence-style", "lsp"]
# `config` được gửi làm initializationOptions.
config = { presenceStyle = { tailwindStylesheet = "src/app.css", tailwindFunctions = ["tv"] } }

[[language]]
name = "html"
language-servers = ["vscode-html-language-server", "presence-style"]

[[language]]
name = "tsx"
language-servers = ["typescript-language-server", "presence-style"]

[[language]]
name = "jsx"
language-servers = ["typescript-language-server", "presence-style"]

[[language]]
name = "vue"
language-servers = ["vuels", "presence-style"]

[[language]]
name = "svelte"
language-servers = ["svelteserver", "presence-style"]
```

Kiểm tra: `hx --health tsx`. Helix 25.01+ vẽ ô màu từ `documentColor` (`editor.lsp.display-color-swatches`).

## Zed

Extension trong `editors/zed` (Rust → WebAssembly, `zed_extension_api`) đăng ký server `presence-style` và chạy nó bằng Node của Zed: ưu tiên `node_modules/@porbit/style` của dự án, không có thì Zed tự cài `@porbit/style` từ npm vào thư mục extension.

Cài bản phát triển (cần Rust qua `rustup`): command palette → `zed: install dev extension` → chọn `editors/zed`. Thiết lập trong `settings.json`:

```json
{
  "lsp": {
    "presence-style": {
      "initialization_options": { "tailwindStylesheet": "src/app.css", "tailwindFunctions": ["tv"] }
    }
  },
  "languages": {
    "TSX": { "language_servers": ["!tailwindcss-language-server", "..."] }
  }
}
```

Server chạy cùng server khác của HTML, JavaScript, TSX, TypeScript, Vue.js, Svelte, Astro, PHP, Markdown. Dự án dùng `@porbit/style` thay Tailwind có thể tắt server Tailwind có sẵn của Zed như ví dụ trên. Chạy server tự chọn: `"binary": { "path": "node", "arguments": ["/đường/dẫn/dist/cli-bin.js", "lsp"] }` trong `lsp.presence-style`.

Phát hành lên Zed Extensions: xem `editors/zed/README.md` (PR vào `zed-industries/extensions` với `path = "editors/zed"`).

## Sublime Text (gói LSP), Emacs (eglot)

```json
// LSP.sublime-settings
{ "clients": { "presence-style": { "enabled": true, "command": ["npx", "presence-style", "lsp"], "selector": "text.html | source.tsx | source.jsx | source.vue | source.svelte" } } }
```

```elisp
(add-to-list 'eglot-server-programs '((web-mode tsx-ts-mode) . ("npx" "presence-style" "lsp")))
```

## Dùng Trong Công Cụ Riêng

```js
import { createLanguageService, startLanguageServer } from '@porbit/style/lsp'

const service = createLanguageService({ dialects: [] })
service.diagnose('<div class="dF c-red">')   // [{ code: 'invalid-class', suggestion: 'c[red]', ... }]
service.hover(text, offset)                  // { markdown: '```css\n...```' }
service.colors('<div class="bg#0af">')       // [{ start, end, color: '#00aaff' }]
service.setFunctions(['tv'])                 // chuỗi trong tv("...") cũng là class
startLanguageServer({ input, output })       // server trên luồng bất kỳ
```
