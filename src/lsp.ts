/**
 * Language server (LSP) cho @porbit/style, chạy qua stdio, không phụ thuộc thư viện:
 *
 *   npx presence-style lsp
 *
 * Dùng được với mọi editor hỗ trợ LSP (VS Code, Neovim, Zed, Helix, Sublime, JetBrains...):
 *   - chẩn đoán: class x-css không sinh CSS (kèm bản sửa), class xung đột cùng thuộc tính,
 *   - hover: CSS thật mà class sinh ra (kể cả class Tailwind khi bật `"dialects": ["tailwind"]`),
 *   - gợi ý alias/giá trị trong thuộc tính class,
 *   - ô màu (`textDocument/documentColor`) cho class màu,
 *   - code action: quick fix và "sắp xếp class trong file".
 * Cấu hình đọc từ presence-style.config.json ở gốc workspace (theo dõi thay đổi khi lưu).
 * Client có thể gửi thêm thiết lập qua `initializationOptions` hoặc `workspace/didChangeConfiguration`
 * (`settings.presenceStyle`): `tailwindFunctions`, `tailwindStylesheet`, `configFile` (xem `ServerSettings`).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTailwindFallback } from './analyze'
import { resolveConfigFile } from './config-file'
import type { XCSSConfig } from './core'
import { createConfigLoader, createStylesheetReader } from './files'
import { createLanguageService, type ServiceDiagnostic } from './language-service'
import { tailwindFixFallback } from './tailwind'

declare const __PRESENCE_STYLE_VERSION__: string

type Json = Record<string, any>
interface Position {
    line: number
    character: number
}

/** Offset <-> vị trí dòng/cột (UTF-16, như LSP mặc định). */
const lineStarts = (text: string): number[] => {
    const starts = [0]
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1)
    return starts
}
const toPosition = (starts: number[], offset: number): Position => {
    let low = 0
    let high = starts.length - 1
    while (low < high) {
        const mid = (low + high + 1) >> 1
        if (starts[mid] <= offset) low = mid
        else high = mid - 1
    }
    return { line: low, character: offset - starts[low] }
}
const toOffset = (starts: number[], text: string, position: Position): number =>
    Math.min(text.length, (starts[position.line] ?? text.length) + position.character)

const CONFIG_FILE = 'presence-style.config.json'

/** Thiết lập từ editor (extension VS Code/Zed gửi qua `initializationOptions` / `didChangeConfiguration`). */
export interface ServerSettings {
    /** Hàm có đối số là chuỗi class (`cn`, `cva`, `tv`...), thêm vào danh sách mặc định. */
    tailwindFunctions?: string[]
    /** CSS của dự án Tailwind v4 (`src/app.css`), tương đối với gốc workspace: ghi đè `tailwindCss` của file cấu hình và bật phương ngữ Tailwind. */
    tailwindStylesheet?: string
    /** Tên file cấu hình thay cho `presence-style.config.json`. */
    configFile?: string
}

const SETTING_KEYS = ['tailwindFunctions', 'tailwindStylesheet', 'configFile']
const settingsObject = (input: unknown): Json | null => {
    if (!input || typeof input !== 'object') return null
    const source = input as Json
    const raw = source.presenceStyle ?? source['presence-style'] ?? source
    return raw && typeof raw === 'object' ? raw : null
}
/** `settings` của didChangeConfiguration có thiết lập cho server này không (Neovim/Zed gửi `{}` khi người dùng không đặt gì). */
export const hasServerSettings = (input: unknown): boolean => {
    if (!input || typeof input !== 'object') return false
    const source = input as Json
    if (source.presenceStyle || source['presence-style']) return true
    return SETTING_KEYS.some((key) => key in source)
}

/** Lấy thiết lập từ `initializationOptions`/`settings`: dạng phẳng hoặc lồng trong `presenceStyle`/`presence-style`. */
export const readServerSettings = (input: unknown): ServerSettings => {
    const raw = settingsObject(input)
    if (!raw) return {}
    const settings: ServerSettings = {}
    if (Array.isArray(raw.tailwindFunctions)) settings.tailwindFunctions = raw.tailwindFunctions.filter((name: unknown) => typeof name === 'string' && name)
    if (typeof raw.tailwindStylesheet === 'string' && raw.tailwindStylesheet.trim()) settings.tailwindStylesheet = raw.tailwindStylesheet.trim()
    if (typeof raw.configFile === 'string' && raw.configFile.trim()) settings.configFile = raw.configFile.trim()
    return settings
}

/** Đọc file cấu hình JSON của workspace (thô, chưa chuẩn hoá); lỗi/thiếu file -> null. */
const readRawConfig = (rootDir: string, file: string): Json | null => {
    try {
        const raw = JSON.parse(readFileSync(join(rootDir, file), 'utf8'))
        return raw && typeof raw === 'object' ? raw : null
    } catch (_error) {
        return null
    }
}

/** Đọc cấu hình workspace; lỗi/thiếu file -> cấu hình rỗng (hoặc chỉ phương ngữ Tailwind khi có `tailwindStylesheet`). */
export const loadWorkspaceConfig = (rootDir: string | null, settings: ServerSettings = {}): XCSSConfig => {
    if (!rootDir) return {}
    const raw: Json = readRawConfig(rootDir, settings.configFile || CONFIG_FILE) ?? {}
    delete raw.safelist
    delete raw.tailwindFunctions
    if (settings.tailwindStylesheet) {
        raw.tailwindCss = settings.tailwindStylesheet
        if (!Array.isArray(raw.dialects) || !raw.dialects.length) raw.dialects = ['tailwind']
    }
    try {
        return resolveConfigFile(raw, { readStylesheet: createStylesheetReader(rootDir), loadConfig: createConfigLoader(rootDir) })
    } catch (_error) {
        return {}
    }
}

/** `#rrggbb` -> màu LSP (kênh 0..1). */
const toLspColor = (hex: string) => ({
    red: parseInt(hex.slice(1, 3), 16) / 255,
    green: parseInt(hex.slice(3, 5), 16) / 255,
    blue: parseInt(hex.slice(5, 7), 16) / 255,
    alpha: 1,
})

export interface LanguageServerOptions {
    input?: NodeJS.ReadableStream
    output?: NodeJS.WritableStream
    /** Độ trễ gom thay đổi trước khi chẩn đoán lại (ms). */
    debounce?: number
}

export const startLanguageServer = (options: LanguageServerOptions = {}): { stop: () => void } => {
    const input = options.input ?? process.stdin
    const output = options.output ?? process.stdout
    const debounce = options.debounce ?? 150
    setTailwindFallback(tailwindFixFallback)

    let rootDir: string | null = null
    let settings: ServerSettings = {}
    const service = createLanguageService({})
    const documents = new Map<string, { text: string; version: number; starts: number[] }>()
    const timers = new Map<string, ReturnType<typeof setTimeout>>()

    const send = (message: Json) => {
        const body = JSON.stringify({ jsonrpc: '2.0', ...message })
        output.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`)
    }
    const notify = (method: string, params: Json) => send({ method, params })

    const toLspDiagnostic = (doc: { starts: number[] }, d: ServiceDiagnostic) => ({
        range: { start: toPosition(doc.starts, d.start), end: toPosition(doc.starts, d.end) },
        severity: d.severity === 'warning' ? 2 : 3,
        code: d.code,
        source: 'presence-style',
        message: d.message,
        data: d.suggestion ? { suggestion: d.suggestion } : undefined,
    })

    const publish = (uri: string) => {
        const doc = documents.get(uri)
        if (!doc) return
        let diagnostics: Json[] = []
        try {
            diagnostics = service.diagnose(doc.text).map((d) => toLspDiagnostic(doc, d))
        } catch (_error) {
            diagnostics = []
        }
        notify('textDocument/publishDiagnostics', { uri, version: doc.version, diagnostics })
    }
    const schedule = (uri: string) => {
        clearTimeout(timers.get(uri))
        timers.set(uri, setTimeout(() => {
            timers.delete(uri)
            publish(uri)
        }, debounce))
    }
    const applySettings = () => {
        // Hàm khai báo trong file cấu hình (`"tailwindFunctions": ["tv"]`) cộng với thiết lập của editor.
        const fromFile = rootDir ? readRawConfig(rootDir, settings.configFile || CONFIG_FILE)?.tailwindFunctions : null
        service.setFunctions([...(Array.isArray(fromFile) ? fromFile : []), ...(settings.tailwindFunctions ?? [])])
        service.setConfig(loadWorkspaceConfig(rootDir, settings))
    }
    const reloadConfig = () => {
        applySettings()
        documents.forEach((_doc, uri) => schedule(uri))
    }

    const handlers: Record<string, (params: Json) => unknown> = {
        initialize: (params) => {
            const rootUri: string | undefined = params.rootUri ?? params.workspaceFolders?.[0]?.uri
            rootDir = rootUri?.startsWith('file:') ? fileURLToPath(rootUri) : params.rootPath ?? null
            settings = readServerSettings(params.initializationOptions)
            applySettings()
            return {
                capabilities: {
                    textDocumentSync: { openClose: true, change: 1, save: { includeText: false } },
                    hoverProvider: true,
                    colorProvider: true,
                    completionProvider: { triggerCharacters: ['"', "'", ' ', '`', ':', '-'], resolveProvider: true },
                    codeActionProvider: { codeActionKinds: ['quickfix', 'source'] },
                },
                serverInfo: { name: 'presence-style', version: typeof __PRESENCE_STYLE_VERSION__ === 'string' ? __PRESENCE_STYLE_VERSION__ : '0.0.0' },
            }
        },
        shutdown: () => null,
        'textDocument/hover': (params) => {
            const doc = documents.get(params.textDocument.uri)
            if (!doc) return null
            const result = service.hover(doc.text, toOffset(doc.starts, doc.text, params.position))
            if (!result) return null
            return {
                contents: { kind: 'markdown', value: result.markdown },
                range: { start: toPosition(doc.starts, result.start), end: toPosition(doc.starts, result.end) },
            }
        },
        'textDocument/completion': (params) => {
            const doc = documents.get(params.textDocument.uri)
            if (!doc) return null
            const offset = toOffset(doc.starts, doc.text, params.position)
            const items = service.completions(doc.text, offset)
            const KIND = { property: 10, value: 12, class: 21, color: 16, variant: 14 } as const
            const end = toPosition(doc.starts, offset)
            return {
                isIncomplete: false,
                items: items.map((item, index) => ({
                    label: item.label,
                    detail: item.detail || undefined,
                    kind: KIND[item.kind],
                    // Màu: VS Code hiện ô màu khi `documentation` là mã màu.
                    documentation: item.color,
                    sortText: String(index).padStart(6, '0'),
                    textEdit: item.replaceStart !== undefined ? { range: { start: toPosition(doc.starts, item.replaceStart), end }, newText: item.label } : undefined,
                    command: item.kind === 'variant' ? { title: 'Gợi ý tiếp', command: 'editor.action.triggerSuggest' } : undefined,
                    // Mục màu giữ `documentation` là mã màu (ô màu); mục class lấy CSS khi được chọn.
                    data: item.kind === 'class' ? { name: item.label } : undefined,
                })),
            }
        },
        'completionItem/resolve': (item) => {
            if (!item?.data?.name) return item
            const info = service.explain(item.data.name)
            return info.valid ? { ...item, documentation: { kind: 'markdown', value: '```css\n' + info.css.trim() + '\n```' } } : item
        },
        'textDocument/documentColor': (params) => {
            const doc = documents.get(params.textDocument.uri)
            if (!doc) return []
            return service.colors(doc.text).map((item) => ({
                range: { start: toPosition(doc.starts, item.start), end: toPosition(doc.starts, item.end) },
                color: toLspColor(item.color),
            }))
        },
        // Ô màu chỉ để xem: không đề xuất đổi class khi chọn màu khác.
        'textDocument/colorPresentation': () => [],
        'textDocument/codeAction': (params) => {
            const uri = params.textDocument.uri
            const doc = documents.get(uri)
            if (!doc) return []
            const start = toOffset(doc.starts, doc.text, params.range.start)
            const end = toOffset(doc.starts, doc.text, params.range.end)
            return service.codeActions(doc.text, start, end).map((action) => ({
                title: action.title,
                kind: action.kind,
                isPreferred: action.preferred,
                diagnostics: action.diagnostic ? [toLspDiagnostic(doc, action.diagnostic)] : undefined,
                edit: {
                    changes: {
                        [uri]: action.edits.map((e) => ({ range: { start: toPosition(doc.starts, e.start), end: toPosition(doc.starts, e.end) }, newText: e.newText })),
                    },
                },
            }))
        },
    }

    const notifications: Record<string, (params: Json) => void> = {
        initialized: () => {},
        exit: () => {
            stop()
            if (!options.input) process.exit(0)
        },
        'textDocument/didOpen': (params) => {
            const { uri, text, version } = params.textDocument
            documents.set(uri, { text, version, starts: lineStarts(text) })
            schedule(uri)
        },
        'textDocument/didChange': (params) => {
            const { uri, version } = params.textDocument
            const text = params.contentChanges?.[params.contentChanges.length - 1]?.text
            if (typeof text !== 'string') return
            documents.set(uri, { text, version, starts: lineStarts(text) })
            schedule(uri)
        },
        'textDocument/didClose': (params) => {
            const uri = params.textDocument.uri
            documents.delete(uri)
            clearTimeout(timers.get(uri))
            notify('textDocument/publishDiagnostics', { uri, diagnostics: [] })
        },
        'textDocument/didSave': (params) => {
            if (String(params.textDocument.uri).endsWith(settings.configFile || CONFIG_FILE) || /\.css$/.test(params.textDocument.uri)) reloadConfig()
        },
        'workspace/didChangeWatchedFiles': () => reloadConfig(),
        'workspace/didChangeConfiguration': (params) => {
            // Client gửi `settings` (VS Code: `{ presenceStyle: {...} }`); rỗng/không liên quan thì giữ thiết lập cũ
            // (thường là từ initializationOptions).
            if (hasServerSettings(params?.settings)) settings = readServerSettings(params.settings)
            reloadConfig()
        },
    }

    const dispatch = (message: Json) => {
        const { id, method, params = {} } = message
        if (id !== undefined && method && handlers[method]) {
            try {
                send({ id, result: handlers[method](params) ?? null })
            } catch (error) {
                send({ id, error: { code: -32603, message: (error as Error).message } })
            }
        } else if (id !== undefined && method) {
            send({ id, error: { code: -32601, message: `Không hỗ trợ ${method}` } })
        } else if (method && notifications[method]) {
            try {
                notifications[method](params)
            } catch (_error) {
                // Thông báo không có phản hồi: bỏ qua lỗi để server tiếp tục chạy.
            }
        }
    }

    // Khung tin nhắn LSP: `Content-Length: N\r\n\r\n<N byte JSON>`.
    let buffer = Buffer.alloc(0)
    const onData = (chunk: Buffer | string) => {
        buffer = Buffer.concat([buffer, typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk])
        for (;;) {
            const headerEnd = buffer.indexOf('\r\n\r\n')
            if (headerEnd === -1) return
            const length = Number(/content-length:\s*(\d+)/i.exec(buffer.subarray(0, headerEnd).toString('ascii'))?.[1])
            if (!Number.isFinite(length)) {
                buffer = buffer.subarray(headerEnd + 4)
                continue
            }
            if (buffer.length < headerEnd + 4 + length) return
            const body = buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString('utf8')
            buffer = buffer.subarray(headerEnd + 4 + length)
            try {
                dispatch(JSON.parse(body))
            } catch (_error) {
                // JSON hỏng: bỏ qua tin nhắn.
            }
        }
    }
    input.on('data', onData)
    const stop = () => {
        input.off('data', onData)
        timers.forEach((timer) => clearTimeout(timer))
        timers.clear()
    }
    return { stop }
}
