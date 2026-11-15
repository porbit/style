# MCP Server Cho Agent AI

`@porbit/style` có sẵn một MCP server (Model Context Protocol) chạy qua stdio. Khi cài vào agent (Claude Code, Codex, Cursor, VS Code Copilot, Gemini CLI, Windsurf, Cline, Zed, opencode...), agent có thể tự kiểm tra cú pháp class, tra alias, sinh CSS và lấy component mẫu thay vì đoán.

Server không cần cài thêm thư viện nào: chỉ cần Node.js 20 trở lên.

```bash
npx -y @porbit/style mcp
```

## Cài Đặt Nhanh Theo Từng Agent

In lệnh cài cho mọi agent, hoặc cho một agent cụ thể:

```bash
npx -y @porbit/style mcp-config
```

```bash
npx -y @porbit/style mcp-config codex
```

### Claude Code

```bash
claude mcp add presence-style --scope user -- npx -y @porbit/style mcp
```

Dùng chung cho cả nhóm (ghi vào `.mcp.json` ở gốc dự án, nên commit file này):

```bash
claude mcp add presence-style --scope project -- npx -y @porbit/style mcp
```

Kiểm tra bằng `claude mcp list` hoặc gõ `/mcp` trong phiên Claude Code.

### OpenAI Codex CLI

```bash
codex mcp add presence-style -- npx -y @porbit/style mcp
```

Hoặc thêm vào `~/.codex/config.toml`:

```toml
[mcp_servers.presence-style]
command = "npx"
args = ["-y", "@porbit/style", "mcp"]
```

### Gemini CLI

```bash
gemini mcp add presence-style npx -y @porbit/style mcp
```

### VS Code (GitHub Copilot)

```bash
code --add-mcp '{"name":"presence-style","command":"npx","args":["-y","@porbit/style","mcp"]}'
```

Hoặc tạo `.vscode/mcp.json`:

```json
{
  "servers": {
    "presence-style": { "type": "stdio", "command": "npx", "args": ["-y", "@porbit/style", "mcp"] }
  }
}
```

### Cursor, Windsurf, Claude Desktop, Cline / Roo Code

Các client này dùng chung khoá `mcpServers`:

| Client | File cấu hình |
| :--- | :--- |
| Cursor | `.cursor/mcp.json` (dự án) hoặc `~/.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Claude Desktop | `claude_desktop_config.json` (Settings → Developer → Edit Config) |
| Cline / Roo Code | `cline_mcp_settings.json` (MCP Servers → Configure) |

```json
{
  "mcpServers": {
    "presence-style": { "command": "npx", "args": ["-y", "@porbit/style", "mcp"] }
  }
}
```

### Zed (`settings.json`)

```json
{
  "context_servers": {
    "presence-style": { "source": "custom", "command": "npx", "args": ["-y", "@porbit/style", "mcp"] }
  }
}
```

### opencode (`opencode.json`)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "presence-style": { "type": "local", "command": ["npx", "-y", "@porbit/style", "mcp"], "enabled": true }
  }
}
```

### Windows

Nếu client báo không tìm thấy `npx`, đổi `"command": "npx"` thành `"command": "cmd"` và thêm `"/c", "npx"` vào đầu `args`:

```json
{ "command": "cmd", "args": ["/c", "npx", "-y", "@porbit/style", "mcp"] }
```

### Dùng Bản Cài Trong Dự Án Hoặc Bản Đang Phát Triển

Khi đã `npm install -D @porbit/style`, trỏ thẳng vào bin trong dự án để không tải lại mỗi lần:

```json
{ "command": "node", "args": ["node_modules/@porbit/style/dist/cli-bin.js", "mcp"] }
```

Khi phát triển chính repo này: `npm run build` rồi dùng `node dist/cli-bin.js mcp` (hoặc `npm run mcp`).

## Công Cụ (Tools)

| Tool | Việc làm |
| :--- | :--- |
| `explain_class` | Tách class thành media/layer/property/value/selector, trả CSS sinh ra và gợi ý sửa lỗi (`df` → `dF`, `fz14px` → `fns14px`, `hover:cRed` → `cRed@:hover`). |
| `generate_css` | Sinh CSS tĩnh cho danh sách class, tuỳ chọn kèm CSS theme của component. |
| `extract_css` | Quét `source` hoặc file/thư mục trong workspace và sinh CSS. Chỉ đọc, không ghi file. |
| `lookup_dictionary` | Tìm alias theo tên CSS hoặc alias (`font-size` → `fns`), kèm value viết tắt. |
| `convert_tailwind` | Chuyển class Tailwind sang x-css (mặc định mode `safe`). |
| `list_components` | Liệt kê component mẫu và variant của từng recipe. |
| `get_component` | Lấy HTML mẫu (`name`) hoặc chuỗi class của recipe (`recipe` + `props`). |
| `get_theme` | Sinh CSS token `--ps-*` với màu/bo góc tuỳ chỉnh. |

Ngoài ra server cung cấp resource (đặc tả cú pháp, hướng dẫn thiết kế, từ vựng mở, dictionary JSON, theme CSS) và prompt `build_ui` để agent dựng giao diện theo đúng quy tắc.

## An Toàn

1. `extract_css` chỉ đọc file nằm trong thư mục gốc (thư mục chạy server). Đổi bằng `--root <thư-mục>` hoặc biến môi trường `PRESENCE_STYLE_MCP_ROOT`.
2. Server không ghi file, không gọi mạng; tuỳ chọn `dictionaryImport` dạng URL và `cache` bị bỏ qua khi truyền qua MCP.
3. Kiểm tra ở Node không có `CSS.supports`, nên giá trị sai ngữ nghĩa CSS (ví dụ `w100p`) chỉ bị phát hiện trên trình duyệt.
