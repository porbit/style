/**
 * MCP server (Model Context Protocol) cho @porbit/style.
 *
 * Chạy qua stdio, không phụ thuộc thư viện ngoài:
 *   npx -y @porbit/style mcp
 *
 * Cung cấp cho agent (Claude Code, Codex, Cursor, VS Code, Gemini CLI, ...) các công cụ:
 * giải thích class, sinh CSS, trích xuất CSS từ mã nguồn, tra dictionary,
 * chuyển Tailwind, và lấy component mẫu.
 */
import { readFile, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type XCSSConfig } from './core'
import { AGENT_RULES } from './agent-rules'
import { findClassConflicts } from './class-tools'
import { explainClass, fixClasses, generateCssFor, searchDictionary } from './analyze'
import { SHORT_PROPERTIES, SPECIFIC_VALUES, COMMON_VALUES } from './dictionary'
export { suggestClassFix } from './analyze'
import { extractCandidates, extractFromClasses } from './extract'
import { convertTailwindClasses, tailwindFixFallback, type TailwindConversionMode } from './tailwind'
import { setTailwindFallback } from './analyze'
import { collectFiles, DEFAULT_EXTENSIONS } from './files'
import {
    COMPONENT_SNIPPETS,
    createComponentTheme,
    getComponentSnippet,
    ui,
    type UiRecipeName,
} from './components'

declare const __PRESENCE_STYLE_VERSION__: string

// Công cụ Node (MCP, CLI) có sẵn bộ chuyển Tailwind: dùng để gợi ý sửa `w-full` -> `w100%`.
setTailwindFallback(tailwindFixFallback)

const SERVER_NAME = 'presence-style'
const SERVER_VERSION = typeof __PRESENCE_STYLE_VERSION__ === 'string' ? __PRESENCE_STYLE_VERSION__ : '0.0.0'
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const MAX_FILES = 5000
const MAX_FILE_BYTES = 2 * 1024 * 1024

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type JsonObject = { [key: string]: any }

interface JsonRpcRequest {
    jsonrpc: '2.0'
    id?: string | number | null
    method: string
    params?: JsonObject
}

interface ToolDefinition {
    name: string
    title: string
    description: string
    inputSchema: JsonObject
    annotations?: JsonObject
    run: (args: JsonObject, ctx: ServerContext) => Promise<ToolResult> | ToolResult
}

interface ToolResult {
    text: string
    structured?: JsonObject
    isError?: boolean
}

export interface ServerContext {
    /** Thư mục gốc được phép đọc khi trích xuất từ file. */
    root: string
}

// ---------------------------------------------------------------------------
// Tiện ích
// ---------------------------------------------------------------------------

const getPackageRoot = (): string => {
    // tsup bật shims nên `__dirname` có ở cả bản CJS và ESM; dist/ nằm ngay dưới gốc package.
    try {
        if (typeof __dirname === 'string') return resolve(__dirname, '..')
    } catch (_error) {
        // ignore
    }
    try {
        return resolve(dirname(fileURLToPath(import.meta.url)), '..')
    } catch (_error) {
        return process.cwd()
    }
}

const readPackageFile = async (path: string): Promise<string | null> => {
    try {
        return await readFile(join(getPackageRoot(), path), 'utf8')
    } catch (_error) {
        return null
    }
}

const splitClasses = (input: unknown): string[] => {
    const raw = Array.isArray(input) ? input.join(' ') : typeof input === 'string' ? input : ''
    return [...new Set(raw.split(/\s+/).filter(Boolean))]
}

const asConfig = (value: unknown): XCSSConfig => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const config = { ...(value as XCSSConfig) }
    // Không cho phép nạp dictionary từ URL tuỳ ý qua MCP.
    if (typeof config.dictionaryImport === 'string') delete config.dictionaryImport
    delete (config as any).cache
    return config
}

const resolveInsideRoot = (root: string, target: string): string => {
    const absolute = isAbsolute(target) ? resolve(target) : resolve(root, target)
    const rel = relative(root, absolute)
    if (rel.startsWith('..') || isAbsolute(rel)) {
        throw new Error(`Đường dẫn nằm ngoài thư mục được phép (${root}): ${target}`)
    }
    return absolute
}

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2)

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }

const recipeNames = Object.keys(ui) as UiRecipeName[]

export const TOOLS: ToolDefinition[] = [
    {
        name: 'explain_class',
        title: 'Giải thích class x-css',
        description:
            'Tách từng class x-css thành media/layer/property/value/selector, cho biết CSS sinh ra, và gợi ý sửa khi class không hợp lệ. Dùng trước khi viết class mới để chắc chắn cú pháp đúng.',
        inputSchema: {
            type: 'object',
            properties: {
                classes: { type: 'string', description: 'Một hoặc nhiều class cách nhau bằng khoảng trắng, ví dụ "dF aiC md:gtc[repeat(3,1fr)] cRed@:hover".' },
                config: { type: 'object', description: 'Tuỳ chọn XCSSConfig (breakpoints, theme, aliases, prefix...).' },
            },
            required: ['classes'],
        },
        annotations: READ_ONLY,
        run: (args) => {
            const config = asConfig(args.config)
            const items = splitClasses(args.classes).slice(0, 200).map((token) => explainClass(token, config))
            const invalid = items.filter((i) => !i.valid).length
            const conflicts = findClassConflicts(items.map((i) => String(i.class)))
            const summary =
                `${items.length} class, ${items.length - invalid} hợp lệ, ${invalid} không sinh CSS` +
                (conflicts.length ? `, ${conflicts.length} nhóm xung đột (cùng property, cùng layer: class thắng phụ thuộc thứ tự rule trên trang — giữ một class hoặc nâng layer).` : '.')
            return {
                text: summary + '\n' + formatJson({ items, conflicts }) + '\nLưu ý: kiểm tra ở Node không có CSS.supports; giá trị sai ngữ nghĩa CSS (ví dụ `w100p`) chỉ bị loại trên trình duyệt.',
                structured: { summary, items, conflicts },
            }
        },
    },
    {
        name: 'fix_classes',
        title: 'Tự sửa class x-css',
        description:
            'Nhận chuỗi class (có thể viết sai hoặc theo thói quen Tailwind như `hover:`), trả chuỗi đã sửa: `df`→`dF`, `fz14px`→`fns14px`, `hover:cRed`→`cRed@:hover`, `op0.5`→`opc0.5`. Class không sửa được giữ nguyên và được liệt kê. Gọi tool này trước khi trả code cho người dùng.',
        inputSchema: {
            type: 'object',
            properties: {
                classes: { type: 'string' },
                compact: { type: 'boolean', description: 'Rút gọn thêm `ai[center]`→`aiC`... (mặc định true).' },
                config: { type: 'object' },
            },
            required: ['classes'],
        },
        annotations: READ_ONLY,
        run: (args) => {
            const input = String(args.classes || '').split(/\s+/).filter(Boolean).slice(0, 500).join(' ')
            const structured = fixClasses(input, { compact: args.compact !== false, config: asConfig(args.config) })
            const { changes, unresolved, conflicts } = structured
            return { text: structured.output + '\n\n' + formatJson({ changes, unresolved, conflicts }), structured }
        },
    },
    {
        name: 'generate_css',
        title: 'Sinh CSS từ class',
        description: 'Sinh CSS tĩnh (đã bọc @layer/@media) cho danh sách class x-css. Có thể kèm CSS theme của bộ component.',
        inputSchema: {
            type: 'object',
            properties: {
                classes: { type: 'string', description: 'Các class cách nhau bằng khoảng trắng.' },
                hashClassName: { type: 'boolean', description: 'true: rút gọn tên class (kèm classMap). Mặc định false để đọc dễ.' },
                includeTheme: { type: 'boolean', description: 'Thêm CSS token --ps-* của bộ component vào đầu kết quả.' },
                config: { type: 'object', description: 'Tuỳ chọn XCSSConfig.' },
            },
            required: ['classes'],
        },
        annotations: READ_ONLY,
        run: async (args) => {
            const classes = splitClasses(args.classes)
            const config = asConfig(args.config)
            const result = await extractFromClasses(classes, {
                silent: true,
                ...config,
                hashClassName: args.hashClassName === true,
            })
            const css = (args.includeTheme ? createComponentTheme() + '\n' : '') + result.css
            const unmatched = args.hashClassName === true
                ? classes.filter((c) => !(c in result.classMap))
                : classes.filter((c) => !generateCssFor([c], config).trim())
            return {
                text: css + (unmatched.length ? `\n/* Không sinh CSS: ${unmatched.join(' ')} */` : ''),
                structured: { css, matched: result.matched, unmatched, classMap: result.classMap },
            }
        },
    },
    {
        name: 'extract_css',
        title: 'Trích xuất CSS từ mã nguồn',
        description:
            'Quét mã nguồn (chuỗi `source`, hoặc file/thư mục trong `paths` thuộc workspace) để tìm class x-css và sinh CSS tĩnh. Chỉ đọc, không ghi file.',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'Mã nguồn HTML/JSX/Vue... cần quét.' },
                paths: { type: 'array', items: { type: 'string' }, description: 'File hoặc thư mục (tương đối với workspace).' },
                extensions: { type: 'array', items: { type: 'string' }, description: `Phần mở rộng cần quét. Mặc định: ${DEFAULT_EXTENSIONS.join(',')}` },
                safelist: { type: 'array', items: { type: 'string' } },
                hashClassName: { type: 'boolean' },
                config: { type: 'object' },
            },
        },
        annotations: READ_ONLY,
        run: async (args, ctx) => {
            const candidates = new Set<string>()
            if (typeof args.source === 'string') extractCandidates(args.source).forEach((c) => candidates.add(c))

            const files: string[] = []
            const extensions = Array.isArray(args.extensions) && args.extensions.length
                ? args.extensions.map((e: string) => String(e).replace(/^\./, ''))
                : DEFAULT_EXTENSIONS
            for (const target of Array.isArray(args.paths) ? args.paths : []) {
                const absolute = resolveInsideRoot(ctx.root, String(target))
                files.push(...(await collectFiles(absolute, extensions)))
                if (files.length > MAX_FILES) throw new Error(`Quá nhiều file (> ${MAX_FILES}); hãy thu hẹp đường dẫn.`)
            }
            for (const file of files) {
                const info = await stat(file).catch(() => null)
                if (!info || info.size > MAX_FILE_BYTES) continue
                extractCandidates(await readFile(file, 'utf8').catch(() => '')).forEach((c) => candidates.add(c))
            }
            if (!candidates.size && !(args.safelist || []).length) {
                return { text: 'Không tìm thấy class nào. Truyền `source` hoặc `paths`.', isError: true }
            }

            const result = await extractFromClasses([...candidates], {
                silent: true,
                ...asConfig(args.config),
                safelist: Array.isArray(args.safelist) ? args.safelist : [],
                hashClassName: args.hashClassName === true,
            })
            const stats = { files: files.length, candidates: result.candidates.length, matched: result.matched }
            return {
                text: `/* ${stats.files} file, ${stats.candidates} ứng viên, ${stats.matched} class sinh CSS */\n${result.css}`,
                structured: { ...stats, css: result.css, classMap: result.classMap },
            }
        },
    },
    {
        name: 'lookup_dictionary',
        title: 'Tra alias property/value',
        description:
            'Tìm alias x-css theo tên CSS hoặc alias (ví dụ "font-size", "justify", "bdra"), kèm các value viết tắt. Mọi property CSS chuẩn cũng viết được bằng tên đầy đủ.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                limit: { type: 'number', description: 'Số kết quả tối đa (mặc định 10).' },
            },
            required: ['query'],
        },
        annotations: READ_ONLY,
        run: (args) => {
            const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50)
            const items = searchDictionary(String(args.query || ''), limit)
            const commonValues = Object.fromEntries(Object.entries(COMMON_VALUES).map(([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), v]))
            return {
                text: items.length
                    ? formatJson({ results: items, commonValues })
                    : `Không có alias cho "${args.query}". Viết tên CSS đầy đủ: \`${String(args.query).trim()}[gia-tri]\`.`,
                structured: { results: items, commonValues },
            }
        },
    },
    {
        name: 'convert_tailwind',
        title: 'Chuyển class Tailwind sang x-css',
        description: 'Chuyển chuỗi utility Tailwind sang x-css, kèm danh sách token cần rà soát hoặc chưa hỗ trợ.',
        inputSchema: {
            type: 'object',
            properties: {
                classes: { type: 'string' },
                mode: { type: 'string', enum: ['legacy', 'safe', 'strict'], description: 'Mặc định safe.' },
                darkMode: { type: 'string', enum: ['media', 'class'] },
                compact: { type: 'boolean', description: 'Rút gọn output (`aiC` thay cho `ai[center]`). Mặc định true.' },
            },
            required: ['classes'],
        },
        annotations: READ_ONLY,
        run: (args) => {
            const mode = (['legacy', 'safe', 'strict'].includes(args.mode) ? args.mode : 'safe') as TailwindConversionMode
            const result = convertTailwindClasses(String(args.classes || ''), {
                mode,
                preserveUnknown: mode === 'strict' ? false : undefined,
                darkMode: args.darkMode === 'class' ? 'class' : 'media',
                compact: args.compact !== false,
            })
            const structured = {
                output: result.output,
                converted: result.converted,
                ambiguous: result.ambiguous,
                unsupported: result.unsupported,
                warnings: result.warnings,
            }
            return { text: result.output + '\n\n' + formatJson(structured), structured }
        },
    },
    {
        name: 'list_components',
        title: 'Liệt kê component mẫu',
        description: 'Danh sách component mẫu (button, card, form, alert, navbar, tabs, table, modal...) và các recipe kèm variant.',
        inputSchema: { type: 'object', properties: {} },
        annotations: READ_ONLY,
        run: () => {
            const snippets = COMPONENT_SNIPPETS.map(({ name, title, description, recipes }) => ({ name, title, description, recipes }))
            const recipes = Object.fromEntries(recipeNames.map((name) => [name, ui[name].variantKeys]))
            return { text: formatJson({ snippets, recipes }), structured: { snippets, recipes } }
        },
    },
    {
        name: 'get_component',
        title: 'Lấy component mẫu',
        description:
            'Trả HTML mẫu của một component (theo `name` trong list_components), hoặc chuỗi class của một recipe với variant (`recipe` + `props`). Cần nạp CSS theme (get_theme) để token --ps-* có giá trị.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Tên snippet, ví dụ "card".' },
                recipe: { type: 'string', enum: recipeNames, description: 'Tên recipe, ví dụ "button".' },
                props: { type: 'object', description: 'Variant cho recipe, ví dụ {"variant":"outline","size":"sm"}.' },
            },
        },
        annotations: READ_ONLY,
        run: (args) => {
            if (typeof args.recipe === 'string') {
                const fn = (ui as Record<string, (p?: any) => string>)[args.recipe]
                if (!fn) return { text: `Không có recipe "${args.recipe}". Có: ${recipeNames.join(', ')}`, isError: true }
                const classes = fn(args.props && typeof args.props === 'object' ? args.props : undefined)
                return { text: classes, structured: { recipe: args.recipe, classes } }
            }
            const snippet = getComponentSnippet(String(args.name || ''))
            if (!snippet) {
                return { text: `Không có component "${args.name}". Có: ${COMPONENT_SNIPPETS.map((s) => s.name).join(', ')}`, isError: true }
            }
            return { text: snippet.html, structured: { ...snippet } }
        },
    },
    {
        name: 'get_theme',
        title: 'Sinh CSS theme cho component',
        description: 'Sinh CSS khai báo token --ps-* (màu, bo góc, bóng, font) cho chế độ sáng/tối. Ghi đè token bằng `light` / `dark`.',
        inputSchema: {
            type: 'object',
            properties: {
                light: { type: 'object', description: 'Ví dụ {"primary":"#7c3aed","radius":"12px"}.' },
                dark: { description: 'Token chế độ tối, hoặc false để tắt.' },
                darkMode: { type: 'string', enum: ['media', 'class'] },
            },
        },
        annotations: READ_ONLY,
        run: (args) => {
            const css = createComponentTheme({
                light: args.light && typeof args.light === 'object' ? args.light : undefined,
                dark: args.dark === false ? false : args.dark && typeof args.dark === 'object' ? args.dark : undefined,
                darkMode: args.darkMode === 'class' ? 'class' : 'media',
            })
            return { text: css, structured: { css } }
        },
    },
]

// ---------------------------------------------------------------------------
// Resources & prompts
// ---------------------------------------------------------------------------

interface ResourceDefinition {
    uri: string
    name: string
    title: string
    description: string
    mimeType: string
    read: () => Promise<string>
}

const missing = (path: string) => `Không tìm thấy ${path} trong package.`

const RESOURCES: ResourceDefinition[] = [
    {
        uri: 'presence-style://docs/spec',
        name: 'spec',
        title: 'Đặc tả cú pháp x-css',
        description: 'Thứ tự tách selector → media → layer → property → value và quy tắc chuẩn hoá.',
        mimeType: 'text/markdown',
        read: async () => (await readPackageFile('spec/SPEC.md')) ?? missing('spec/SPEC.md'),
    },
    {
        uri: 'presence-style://docs/quick-design',
        name: 'quick-design',
        title: 'Hướng dẫn thiết kế nhanh',
        description: 'Quy trình 5 bước, bảng alias hay dùng và lỗi thường gặp.',
        mimeType: 'text/markdown',
        read: async () => (await readPackageFile('docs/guides/thiet-ke-nhanh.md')) ?? missing('docs/guides/thiet-ke-nhanh.md'),
    },
    {
        uri: 'presence-style://docs/open-vocabulary',
        name: 'open-vocabulary',
        title: 'Từ vựng mở',
        description: 'Cách viết bất kỳ property/giá trị CSS nào khi chưa có alias.',
        mimeType: 'text/markdown',
        read: async () => (await readPackageFile('docs/guides/tu-vung-mo.md')) ?? missing('docs/guides/tu-vung-mo.md'),
    },
    {
        uri: 'presence-style://docs/agent-rules',
        name: 'agent-rules',
        title: 'Quy tắc viết class cho agent',
        description: 'Bản rút gọn cú pháp, alias hay nhầm và quy trình kiểm tra (giống khối trong AGENTS.md).',
        mimeType: 'text/markdown',
        read: async () => AGENT_RULES,
    },
    {
        uri: 'presence-style://docs/components',
        name: 'components',
        title: 'Bộ component mẫu',
        description: 'Cách dùng recipe, theme --ps-* và ghi đè bằng layer.',
        mimeType: 'text/markdown',
        read: async () => (await readPackageFile('docs/guides/components.md')) ?? missing('docs/guides/components.md'),
    },
    {
        uri: 'presence-style://dictionary.json',
        name: 'dictionary',
        title: 'Dictionary đầy đủ',
        description: 'SHORT_PROPERTIES, COMMON_VALUES, SPECIFIC_VALUES dạng JSON.',
        mimeType: 'application/json',
        read: async () => JSON.stringify({ SHORT_PROPERTIES, COMMON_VALUES, SPECIFIC_VALUES }),
    },
    {
        uri: 'presence-style://theme.css',
        name: 'theme',
        title: 'CSS theme mặc định',
        description: 'Token --ps-* cho bộ component (sáng + tối theo hệ điều hành).',
        mimeType: 'text/css',
        read: async () => createComponentTheme(),
    },
]

const PROMPTS = [
    {
        name: 'build_ui',
        title: 'Dựng giao diện bằng x-css',
        description: 'Hướng dẫn agent dựng một màn hình bằng cú pháp @porbit/style và bộ component mẫu.',
        arguments: [{ name: 'request', description: 'Mô tả giao diện cần dựng.', required: true }],
    },
]

const buildUiPrompt = (request: string): string =>
    `Dựng giao diện sau bằng @porbit/style (x-css): ${request}\n\n${AGENT_RULES}\nƯu tiên recipe có sẵn (list_components / get_component) và token --ps-* (get_theme). Ghi đè class của recipe bằng layer 2 trở lên.\n`

// ---------------------------------------------------------------------------
// JSON-RPC
// ---------------------------------------------------------------------------

class RpcError extends Error {
    constructor(public code: number, message: string) {
        super(message)
    }
}

export const handleRequest = async (request: JsonRpcRequest, ctx: ServerContext): Promise<Json | undefined> => {
    const params = request.params || {}
    switch (request.method) {
        case 'initialize': {
            const requested = String(params.protocolVersion || '')
            const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0]
            return {
                protocolVersion,
                capabilities: { tools: {}, resources: {}, prompts: {} },
                serverInfo: { name: SERVER_NAME, title: 'PresenceStyle', version: SERVER_VERSION },
                instructions:
                    'Công cụ cho @porbit/style (utility CSS x-css). Gọi fix_classes để tự sửa class trước khi trả code, explain_class để hiểu từng class, lookup_dictionary để tìm alias, list_components/get_component để lấy component mẫu, generate_css/extract_css để sinh CSS tĩnh.',
            }
        }
        case 'ping':
            return {}
        case 'tools/list':
            return {
                tools: TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({
                    name,
                    title,
                    description,
                    inputSchema,
                    annotations,
                })) as unknown as Json,
            }
        case 'tools/call': {
            const tool = TOOLS.find((t) => t.name === params.name)
            if (!tool) throw new RpcError(-32602, `Tool không tồn tại: ${params.name}`)
            try {
                const result = await tool.run(params.arguments || {}, ctx)
                return {
                    content: [{ type: 'text', text: result.text }],
                    ...(result.structured ? { structuredContent: result.structured } : {}),
                    isError: result.isError === true,
                } as Json
            } catch (error) {
                return { content: [{ type: 'text', text: (error as Error).message }], isError: true }
            }
        }
        case 'resources/list':
            return {
                resources: RESOURCES.map(({ uri, name, title, description, mimeType }) => ({ uri, name, title, description, mimeType })),
            }
        case 'resources/templates/list':
            return { resourceTemplates: [] }
        case 'resources/read': {
            const resource = RESOURCES.find((r) => r.uri === params.uri)
            if (!resource) throw new RpcError(-32002, `Resource không tồn tại: ${params.uri}`)
            return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: await resource.read() }] }
        }
        case 'prompts/list':
            return { prompts: PROMPTS as unknown as Json }
        case 'prompts/get': {
            if (params.name !== 'build_ui') throw new RpcError(-32602, `Prompt không tồn tại: ${params.name}`)
            const text = buildUiPrompt(String(params.arguments?.request || 'một trang đăng nhập'))
            return { description: PROMPTS[0].description, messages: [{ role: 'user', content: { type: 'text', text } }] }
        }
        default:
            if (request.method.startsWith('notifications/')) return undefined
            throw new RpcError(-32601, `Method không hỗ trợ: ${request.method}`)
    }
}

const respond = async (message: JsonRpcRequest, ctx: ServerContext): Promise<JsonObject | null> => {
    const isNotification = message.id === undefined || message.id === null
    try {
        if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
            throw new RpcError(-32600, 'Invalid Request')
        }
        const result = await handleRequest(message, ctx)
        if (isNotification) return null
        return { jsonrpc: '2.0', id: message.id, result: result ?? {} }
    } catch (error) {
        if (isNotification) return null
        const code = error instanceof RpcError ? error.code : -32603
        return { jsonrpc: '2.0', id: message.id ?? null, error: { code, message: (error as Error).message } }
    }
}

export interface McpServerOptions {
    root?: string
    input?: NodeJS.ReadableStream
    output?: NodeJS.WritableStream
}

/** Khởi động MCP server qua stdio (JSON-RPC, mỗi thông điệp một dòng). */
export const startMcpServer = (options: McpServerOptions = {}): Promise<void> => {
    const ctx: ServerContext = { root: resolve(options.root || process.env.PRESENCE_STYLE_MCP_ROOT || process.cwd()) }
    const input = options.input || process.stdin
    const output = options.output || process.stdout
    const write = (payload: JsonObject) => output.write(JSON.stringify(payload) + '\n')

    return new Promise((resolveDone) => {
        let buffer = ''
        let queue = Promise.resolve()

        const processLine = (line: string) => {
            const text = line.trim()
            if (!text) return
            let parsed: any
            try {
                parsed = JSON.parse(text)
            } catch (_error) {
                write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
                return
            }
            // Xử lý tuần tự để phản hồi giữ đúng thứ tự yêu cầu.
            queue = queue.then(async () => {
                if (Array.isArray(parsed)) {
                    const replies = (await Promise.all(parsed.map((m) => respond(m, ctx)))).filter(Boolean)
                    if (replies.length) output.write(JSON.stringify(replies) + '\n')
                    return
                }
                const reply = await respond(parsed, ctx)
                if (reply) write(reply)
            })
        }

        if (typeof (input as any).setEncoding === 'function') (input as any).setEncoding('utf8')
        input.on('data', (chunk: string | Buffer) => {
            buffer += chunk.toString()
            let index: number
            while ((index = buffer.indexOf('\n')) !== -1) {
                processLine(buffer.slice(0, index))
                buffer = buffer.slice(index + 1)
            }
        })
        input.on('end', () => {
            if (buffer) processLine(buffer)
            queue.then(() => resolveDone())
        })
    })
}
