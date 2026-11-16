# Editor: Language Server Dùng Chung

`presence-style lsp` là language server (LSP) chạy qua stdio, không cần cài thêm gì ngoài `@porbit/style`. Một server cho mọi editor hỗ trợ LSP.

| Tính năng | Mô tả |
| :--- | :--- |
| Chẩn đoán | Class x-css không sinh CSS (kèm bản sửa), class xung đột cùng thuộc tính |
| Hover | CSS thật mà class sinh ra, kể cả class Tailwind khi bật phương ngữ |
| Gợi ý | Alias và giá trị x-css khi con trỏ ở trong `class`/`className` |
| Code action | Quick fix (`c-red` → `c[red]`, `w-full` → `w100%`), "sắp xếp class trong file" |

Server đọc `presence-style.config.json` ở gốc workspace và đọc lại khi file này (hoặc file `.css`) được lưu.

## Dự Án Tailwind v4

```json
{
  "hashClassName": false,
  "dialects": ["tailwind"],
  "darkMode": "class",
  "tailwindCss": "src/app.css"
}
```

Với `tailwindCss`, server hiểu `@theme`, `@utility` (cả dạng hàm `tab-*`), `@custom-variant`, `@apply` và `@import`/`@plugin` của dự án (`tw-animate-css`, `@tailwindcss/forms`, `@tailwindcss/typography` có sẵn nếu không tìm thấy trong `node_modules`). Class Tailwind hợp lệ không bị gạch; hover hiện đúng CSS mà trang nhận. Cùng khoá này được CLI `extract`/`check` dùng.

## VS Code

Cài extension trong `editors/vscode` (gạch lỗi, quick fix, hover, gợi ý, lệnh sắp xếp). Hoặc dùng server với một extension LSP chung.

## Neovim (0.11+)

```lua
vim.lsp.config('presence_style', {
  cmd = { 'npx', 'presence-style', 'lsp' },
  filetypes = { 'html', 'javascriptreact', 'typescriptreact', 'vue', 'svelte', 'astro' },
  root_markers = { 'presence-style.config.json', 'package.json' },
})
vim.lsp.enable('presence_style')
```

Neovim cũ hơn (nvim-lspconfig):

```lua
local configs = require('lspconfig.configs')
configs.presence_style = {
  default_config = {
    cmd = { 'npx', 'presence-style', 'lsp' },
    filetypes = { 'html', 'javascriptreact', 'typescriptreact', 'vue', 'svelte', 'astro' },
    root_dir = require('lspconfig.util').root_pattern('presence-style.config.json', 'package.json'),
  },
}
require('lspconfig').presence_style.setup({})
```

## Helix

```toml
# .helix/languages.toml
[language-server.presence-style]
command = "npx"
args = ["presence-style", "lsp"]

[[language]]
name = "html"
language-servers = ["vscode-html-language-server", "presence-style"]

[[language]]
name = "tsx"
language-servers = ["typescript-language-server", "presence-style"]
```

## Zed

Zed chỉ chạy language server khai báo trong một extension. Khi đã có extension đăng ký server tên `presence-style`, cấu hình trong `settings.json`:

```json
{
  "lsp": {
    "presence-style": { "binary": { "path": "npx", "arguments": ["presence-style", "lsp"] } }
  },
  "languages": {
    "TSX": { "language_servers": ["...", "presence-style"] },
    "HTML": { "language_servers": ["...", "presence-style"] }
  }
}
```

Extension Zed chưa được phát hành; trong lúc chờ, dùng `presence-style check`/`sort` ở terminal của Zed.

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
startLanguageServer({ input, output })       // server trên luồng bất kỳ
```
