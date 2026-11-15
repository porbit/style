/**
 * Mẫu lệnh / cấu hình cài MCP server `presence-style` cho các agent phổ biến.
 * In ra bằng: `npx @porbit/style mcp-config <client>`.
 */

export const MCP_CLIENTS = [
    'claude',
    'claude-desktop',
    'codex',
    'cursor',
    'vscode',
    'windsurf',
    'gemini',
    'cline',
    'zed',
    'opencode',
    'json',
] as const

export type McpClient = (typeof MCP_CLIENTS)[number]

const NAME = 'presence-style'
const COMMAND = 'npx'
const ARGS = ['-y', '@porbit/style', 'mcp']

const json = (value: unknown) => JSON.stringify(value, null, 2)
const stdioServer = { command: COMMAND, args: ARGS }

const SECTIONS: Record<McpClient, { title: string; body: string }> = {
    claude: {
        title: 'Claude Code',
        body: `# Cài cho riêng bạn (mọi dự án)
claude mcp add ${NAME} --scope user -- ${COMMAND} ${ARGS.join(' ')}

# Hoặc dùng chung cho cả nhóm: ghi vào .mcp.json ở gốc dự án
claude mcp add ${NAME} --scope project -- ${COMMAND} ${ARGS.join(' ')}

# Kiểm tra
claude mcp list`,
    },
    'claude-desktop': {
        title: 'Claude Desktop (claude_desktop_config.json)',
        body: json({ mcpServers: { [NAME]: stdioServer } }),
    },
    codex: {
        title: 'OpenAI Codex CLI',
        body: `codex mcp add ${NAME} -- ${COMMAND} ${ARGS.join(' ')}

# Hoặc thêm vào ~/.codex/config.toml
[mcp_servers.${NAME}]
command = "${COMMAND}"
args = [${ARGS.map((a) => `"${a}"`).join(', ')}]`,
    },
    cursor: {
        title: 'Cursor (.cursor/mcp.json hoặc ~/.cursor/mcp.json)',
        body: json({ mcpServers: { [NAME]: stdioServer } }),
    },
    vscode: {
        title: 'VS Code / GitHub Copilot (.vscode/mcp.json)',
        body: `${json({ servers: { [NAME]: { type: 'stdio', ...stdioServer } } })}

# Hoặc bằng dòng lệnh
code --add-mcp '${JSON.stringify({ name: NAME, ...stdioServer })}'`,
    },
    windsurf: {
        title: 'Windsurf (~/.codeium/windsurf/mcp_config.json)',
        body: json({ mcpServers: { [NAME]: stdioServer } }),
    },
    gemini: {
        title: 'Gemini CLI',
        body: `gemini mcp add ${NAME} ${COMMAND} ${ARGS.join(' ')}

# Hoặc thêm vào ~/.gemini/settings.json
${json({ mcpServers: { [NAME]: stdioServer } })}`,
    },
    cline: {
        title: 'Cline / Roo Code (cline_mcp_settings.json)',
        body: json({ mcpServers: { [NAME]: { ...stdioServer, disabled: false } } }),
    },
    zed: {
        title: 'Zed (settings.json)',
        body: json({ context_servers: { [NAME]: { source: 'custom', ...stdioServer } } }),
    },
    opencode: {
        title: 'opencode (opencode.json)',
        body: json({
            $schema: 'https://opencode.ai/config.json',
            mcp: { [NAME]: { type: 'local', command: [COMMAND, ...ARGS], enabled: true } },
        }),
    },
    json: {
        title: 'Cấu hình chung (mọi client dùng khoá "mcpServers")',
        body: json({ mcpServers: { [NAME]: stdioServer } }),
    },
}

export const renderMcpConfig = (client?: McpClient): string => {
    const keys = client ? [client] : MCP_CLIENTS
    const blocks = keys.map((key) => `## ${SECTIONS[key].title}\n\n${SECTIONS[key].body}\n`)
    const footer = client
        ? ''
        : `\nWindows: nếu client không tìm thấy npx, thay "command": "npx" bằng "command": "cmd" và thêm "/c", "npx" vào đầu args.\nGiới hạn thư mục được đọc bằng --root <thư-mục> hoặc biến môi trường PRESENCE_STYLE_MCP_ROOT.\n`
    return blocks.join('\n') + footer
}
