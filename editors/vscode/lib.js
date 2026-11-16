'use strict'
/**
 * Logic thuần của extension (không phụ thuộc API `vscode`), để kiểm thử được bằng Node:
 * đọc thiết lập, chọn language server (gói `@porbit/style` của dự án hoặc bản đóng gói kèm extension),
 * dựng `initializationOptions` và bộ chọn tài liệu.
 */
const fs = require('fs')
const path = require('path')

const SECTION = 'presenceStyle'
const DEFAULT_LANGUAGES = ['html', 'javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'vue', 'svelte', 'astro', 'mdx', 'php']
const CONFIG_FILE = 'presence-style.config.json'
/** Thiết lập mà đổi thì phải khởi động lại server (các thiết lập khác gửi qua didChangeConfiguration). */
const RESTART_KEYS = ['enable', 'languages', 'server', 'serverPath', 'nodePath']

/** Chuẩn hoá thiết lập từ `get(key, default)` (WorkspaceConfiguration.get). */
const readSettings = (get) => {
    const list = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()) : [])
    const text = (value) => (typeof value === 'string' ? value.trim() : '')
    const languages = list(get('languages', DEFAULT_LANGUAGES))
    const server = get('server', 'auto')
    return {
        enable: get('enable', true) !== false,
        languages: languages.length ? languages : DEFAULT_LANGUAGES,
        tailwindFunctions: list(get('tailwindFunctions', [])),
        tailwindStylesheet: text(get('tailwindStylesheet', '')),
        configFile: text(get('configFile', CONFIG_FILE)) || CONFIG_FILE,
        server: server === 'workspace' || server === 'bundled' ? server : 'auto',
        serverPath: text(get('serverPath', '')),
        nodePath: text(get('nodePath', '')),
    }
}

/** Thiết lập gửi cho server (`initializationOptions` và `workspace/didChangeConfiguration`). */
const serverSettings = (settings) => {
    const out = { configFile: settings.configFile }
    if (settings.tailwindFunctions.length) out.tailwindFunctions = settings.tailwindFunctions
    if (settings.tailwindStylesheet) out.tailwindStylesheet = settings.tailwindStylesheet
    return { [SECTION]: out }
}

/**
 * Bộ chọn tài liệu cho các ngôn ngữ đã chọn: có `pattern` (thư mục workspace) -> file trên đĩa trong thư mục đó;
 * không có -> file chưa lưu, thêm mọi file trên đĩa khi `files` (cửa sổ không mở thư mục nào).
 */
const documentSelector = (languages, pattern, { files = false } = {}) =>
    languages.flatMap((language) =>
        pattern ? [{ scheme: 'file', language, pattern }] : [...(files ? [{ scheme: 'file', language }] : []), { scheme: 'untitled', language }],
    )

/** Thư mục gói `@porbit/style` mà `dir` (gốc workspace) nhìn thấy qua node_modules; null nếu không có. */
const findWorkspacePackage = (dir) => {
    try {
        return path.dirname(require.resolve('@porbit/style/package.json', { paths: [dir] }))
    } catch (_error) {
        // Gói cũ không xuất "./package.json": dò node_modules từ dir lên gốc.
        for (let current = path.resolve(dir); ; current = path.dirname(current)) {
            const candidate = path.join(current, 'node_modules', '@porbit', 'style')
            if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate
            if (path.dirname(current) === current) return null
        }
    }
}

/**
 * Chọn server cho một thư mục workspace:
 *   1. `serverPath` (đường dẫn tới cli-bin.js hoặc script server, tương đối với workspace),
 *   2. `@porbit/style` cài trong dự án (có language server: khoá "./lsp" trong exports) — dùng đúng phiên bản dự án,
 *   3. bản đóng gói kèm extension (`server/presence-style-lsp.js`).
 * `server: "workspace"` bỏ bước 3, `server: "bundled"` bỏ bước 2.
 * @returns {{ module: string, args: string[], source: 'custom' | 'workspace' | 'bundled', version?: string } | { error: string }}
 */
const resolveServer = ({ folder, settings, bundled, exists = fs.existsSync, findPackage = findWorkspacePackage, readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8')) }) => {
    if (settings.serverPath) {
        const module = folder ? path.resolve(folder, settings.serverPath) : path.resolve(settings.serverPath)
        return exists(module) ? { module, args: ['lsp'], source: 'custom' } : { error: `Không tìm thấy presenceStyle.serverPath: ${module}` }
    }
    if (settings.server !== 'bundled' && folder) {
        const dir = findPackage(folder)
        if (dir) {
            try {
                const pkg = readJson(path.join(dir, 'package.json'))
                const bin = pkg.bin && (typeof pkg.bin === 'string' ? pkg.bin : pkg.bin['presence-style'])
                const module = bin && path.join(dir, bin)
                if (pkg.exports && pkg.exports['./lsp'] && module && exists(module)) return { module, args: ['lsp'], source: 'workspace', version: pkg.version }
            } catch (_error) {
                // package.json hỏng: dùng bản đóng gói
            }
        }
        if (settings.server === 'workspace') return { error: `Không tìm thấy @porbit/style (có language server) trong node_modules của ${folder}` }
    }
    return exists(bundled) ? { module: bundled, args: [], source: 'bundled' } : { error: `Thiếu server đóng gói kèm extension: ${bundled}` }
}

/** Đổi thiết lập có cần khởi động lại server không (`affects(key)` = ConfigurationChangeEvent.affectsConfiguration). */
const needsRestart = (affects) => RESTART_KEYS.some((key) => affects(`${SECTION}.${key}`))

module.exports = { SECTION, DEFAULT_LANGUAGES, CONFIG_FILE, readSettings, serverSettings, documentSelector, findWorkspacePackage, resolveServer, needsRestart }
