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
import { xcss, type XCSSConfig } from './core'
import { parseClassName } from './parser'
import { compactClassToken, findClassConflicts } from './class-tools'
import { SHORT_PROPERTIES, SPECIFIC_VALUES, COMMON_VALUES } from './dictionary'
import { extractCandidates, extractFromClasses } from './extract'
import { convertTailwindClasses, type TailwindConversionMode } from './tailwind'
import { collectFiles, DEFAULT_EXTENSIONS } from './files'
import {
    COMPONENT_SNIPPETS,
    createComponentTheme,
    getComponentSnippet,
    ui,
    type UiRecipeName,
} from './components'

declare const __PRESENCE_STYLE_VERSION__: string

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

const PROPERTY_BY_CSS_NAME = (() => {
    const map: Record<string, string[]> = {}
    for (const [alias, name] of Object.entries(SHORT_PROPERTIES)) {
        ;(map[name] ||= []).push(alias)
    }
    return map
})()

// Lỗi hay gặp: alias sai -> alias đúng (theo docs/guides/thiet-ke-nhanh.md).
const COMMON_MISTAKES: Record<string, string> = {
    fz: 'fns', fs: 'fns', minh: 'mih', mnh: 'mih', mah: 'mh', maxh: 'mh', maxw: 'mw', zi: 'z',
    ou: 'oli', out: 'oli', cur: 'cr', tt: 'ttr', bgcolor: 'bgc', col: 'c', color: 'c',
    rounded: 'bdra', radius: 'bdra', shadow: 'bxsh', bs: 'bxsh', fd: 'fxd', items: 'ai', justify: 'jc',
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

const generateCssFor = (classes: string[], config: XCSSConfig) => {
    const engine = xcss({ silent: true, ...config, hashClassName: false })
    const built = engine.buildCss(undefined)
    built.clsx(classes.join(' '))
    const css = built.getCssString()
    built.destroy()
    return css
}

// Tên màu CSS: dùng để chọn đúng điểm tách khi value viết thường dính vào property (`cred` -> `cRed`).
const NAMED_COLORS = new Set(
    ('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor')
        .split(' '),
)

/** Value viết thường `rest` có phải giá trị đã biết của property `alias` không. */
const isKnownValue = (alias: string, rest: string): boolean => {
    const cssName = SHORT_PROPERTIES[alias] || ''
    return (
        SPECIFIC_VALUES[alias]?.[rest] !== undefined ||
        COMMON_VALUES[rest] !== undefined ||
        (/color$/.test(cssName) && NAMED_COLORS.has(rest))
    )
}

const STATE_PREFIX = /^(hover|focus|focus-visible|focus-within|active|visited|disabled|checked|first|last|odd|even|placeholder|before|after):(.+)$/
const PSEUDO_ELEMENTS = new Set(['placeholder', 'before', 'after'])
const STATE_SELECTOR: Record<string, string> = { first: ':first-child', last: ':last-child', odd: ':nth-child(odd)', even: ':nth-child(even)' }

/**
 * Đề xuất bản sửa tự động cho một class không sinh CSS. Chỉ trả kết quả khi bản sửa
 * thật sự sinh được CSS; ngược lại trả `null`.
 */
export const suggestClassFix = (token: string, config: XCSSConfig = {}): string | null => {
    const valid = (candidate: string) => generateCssFor([candidate], config).trim().length > 0
    // `op` là object-position nên `op0.5` vẫn "hợp lệ" ở Node; gần như luôn là nhầm với opacity.
    const opacityTypo = token.match(/^((?:[\w-]+:)?\d*)op([\d.]+)(@.*)?$/)
    if (opacityTypo) return opacityTypo[1] + 'opc' + opacityTypo[2] + (opacityTypo[3] || '')
    if (valid(token)) return null

    const tryFix = (input: string): string | null => {
        if (valid(input)) return input
        const parsed = parseClassName(input)
        if (!parsed) return null
        const head = (parsed.mq ? parsed.mq + ':' : '') + parsed.layer
        const tail = parsed.selector ? '@' + parsed.selector : ''
        const candidates: string[] = []
        // `df` -> `dF`: value viết thường dính vào property.
        if (parsed.val === '') {
            for (let i = parsed.prop.length - 1; i > 0; i--) {
                const alias = parsed.prop.slice(0, i)
                const rest = parsed.prop.slice(i)
                // Ở Node không có CSS.supports, value bất kỳ đều "hợp lệ": chỉ nhận điểm tách
                // khi phần value là giá trị đã biết (alias, từ khoá chung, tên màu).
                if (SHORT_PROPERTIES[alias] && isKnownValue(alias, rest)) candidates.push(head + alias + capitalize(rest) + tail)
            }
        }
        // `fz14px` -> `fns14px`, `op0.5` -> `opc0.5`.
        const renamed = COMMON_MISTAKES[parsed.prop] || (parsed.prop === 'op' && /^[\d.]/.test(parsed.val) ? 'opc' : '')
        if (renamed) candidates.push(head + renamed + parsed.val + tail)
        // `cred` -> `cRed`.
        if (/^[a-z]/.test(parsed.val)) candidates.push(head + parsed.prop + capitalize(parsed.val) + tail)
        return candidates.find(valid) ?? null
    }

    // `hover:cRed` -> `cRed@:hover` (thói quen Tailwind).
    const state = token.match(STATE_PREFIX)
    if (state) {
        const [, name, rest] = state
        if (rest.includes('@')) return null
        const selector = STATE_SELECTOR[name] || (PSEUDO_ELEMENTS.has(name) ? '::' + name : ':' + name)
        return tryFix(rest + '@' + selector)
    }
    return tryFix(token)
}

const explainOne = (token: string, config: XCSSConfig): JsonObject => {
    const parsed = parseClassName(token)
    const css = generateCssFor([token], config).trim()
    const valid = css.length > 0
    const hints: string[] = []

    if (!valid) {
        if (/^(hover|focus|active|disabled|group-hover|first|last|odd|even):/.test(token)) {
            const [state, rest] = token.split(/:(.*)/s)
            hints.push(`Selector đặt ở hậu tố "@": viết \`${rest}@:${state}\` thay cho \`${token}\`.`)
        }
        if (parsed) {
            const prop = parsed.prop
            const known =
                !!SHORT_PROPERTIES[prop] || !!PROPERTY_BY_CSS_NAME[prop] || prop.startsWith('--') || prop.startsWith('[')
            // `df` -> `dF`, `posa` -> `posA`: value viết thường bị dính vào property.
            const split = !known && parsed.val === ''
                ? [...Array(prop.length).keys()].slice(1).map((i) => [prop.slice(0, i), prop.slice(i)]).find(([a]) => SHORT_PROPERTIES[a])
                : undefined
            if (split) {
                hints.push(`Value chữ phải viết hoa ký tự đầu: \`${split[0]}${capitalize(split[1])}\` (${SHORT_PROPERTIES[split[0]]}).`)
            } else if (!known) {
                const fix = COMMON_MISTAKES[prop]
                if (fix) {
                    hints.push(`Property \`${prop}\` không tồn tại; dùng \`${fix}\` (${SHORT_PROPERTIES[fix]}).`)
                } else {
                    const near = Object.keys(SHORT_PROPERTIES).filter((a) => a.startsWith(prop.slice(0, 2))).slice(0, 6)
                    hints.push(
                        `Property \`${prop}\` không có trong dictionary và không phải tên CSS chuẩn.` +
                            (near.length ? ` Alias gần giống: ${near.map((a) => `\`${a}\`=${SHORT_PROPERTIES[a]}`).join(', ')}.` : '') +
                            ' Có thể viết tên CSS đầy đủ với giá trị trong ngoặc vuông, ví dụ `view-transition-name[hero]`.',
                    )
                }
            }
            if (!split && parsed.val === '' && !prop.startsWith('[')) {
                hints.push(
                    'Thiếu value. Value dạng chữ phải viết hoa ký tự đầu để tách khỏi property: `dF` (không phải `df`), `posA` (không phải `posa`).',
                )
            }
            if (/^[a-z]/.test(parsed.val)) {
                hints.push(`Value chữ nên viết hoa ký tự đầu: \`${parsed.prop}${capitalize(parsed.val)}\`.`)
            }
            if (prop === 'op' && /^[0-9.]/.test(parsed.val)) {
                hints.push('`op` là object-position; opacity là `opc`, ví dụ `opc0.8`.')
            }
            if (/^[a-z]+\(/.test(parsed.val) || /calc\(/.test(parsed.val)) {
                hints.push('Giá trị có hàm/khoảng trắng nên bọc `[]` và dùng `_` cho khoảng trắng: `w[calc(100%_-_10px)]`.')
            }
        } else {
            hints.push('Không tách được class. Cú pháp: `[media:][layer]property value[@selector]`, ví dụ `md:2bgc#0a64e8@:hover`.')
        }
    }

    return {
        class: token,
        valid,
        parsed: parsed
            ? {
                  media: parsed.mq || 'default',
                  layer: parsed.layer || '0',
                  property: parsed.prop,
                  cssProperty: SHORT_PROPERTIES[parsed.prop] || parsed.prop,
                  value: parsed.val,
                  selector: parsed.selector || '',
              }
            : null,
        css: valid ? css : '',
        /** Bản sửa tự động (nếu có), cùng logic với tool fix_classes. */
        suggestion: valid ? null : suggestClassFix(token, config),
        hints,
    }
}

const searchDictionary = (query: string, limit: number): JsonObject[] => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const results: Array<{ score: number; item: JsonObject }> = []
    for (const [alias, cssName] of Object.entries(SHORT_PROPERTIES)) {
        let score = 0
        if (alias === q) score = 100
        else if (cssName === q) score = 95
        else if (cssName.startsWith(q)) score = 70
        else if (alias.startsWith(q)) score = 60
        else if (cssName.includes(q)) score = 40
        if (!score) continue
        const values = SPECIFIC_VALUES[alias] || {}
        results.push({
            score,
            item: {
                alias,
                property: cssName,
                values: Object.fromEntries(Object.entries(values).map(([k, v]) => [alias + capitalize(k), v])),
            },
        })
    }
    results.sort((a, b) => b.score - a.score || String(a.item.alias).length - String(b.item.alias).length)
    return results.slice(0, limit).map((r) => r.item)
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
            const items = splitClasses(args.classes).slice(0, 200).map((token) => explainOne(token, config))
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
            const config = asConfig(args.config)
            const tokens = String(args.classes || '').split(/\s+/).filter(Boolean).slice(0, 500)
            const changes: Array<{ from: string; to: string }> = []
            const unresolved: string[] = []
            const output = tokens.map((token) => {
                const fixed = suggestClassFix(token, config)
                let result = fixed ?? token
                if (!fixed && !generateCssFor([token], config).trim()) unresolved.push(token)
                if (args.compact !== false) result = compactClassToken(result)
                if (result !== token) changes.push({ from: token, to: result })
                return result
            })
            const conflicts = findClassConflicts(output)
            const structured = { output: output.join(' '), changes, unresolved, conflicts }
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
            const commonValues = Object.fromEntries(Object.entries(COMMON_VALUES).map(([k, v]) => [capitalize(k), v]))
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

const buildUiPrompt = (request: string): string => `Dựng giao diện sau bằng @porbit/style (x-css): ${request}

Quy tắc bắt buộc:
1. Cú pháp class: [media:][layer]property value[@selector]. Ví dụ: md:2bgc#0a64e8@:hover.
2. Value dạng chữ viết hoa ký tự đầu (dF, aiC, posA). Khoảng trắng trong value viết bằng ";" (p8px;16px) hoặc "_" trong [] (w[calc(100%_-_2rem)]).
3. Trạng thái dùng hậu tố: cRed@:hover, không dùng hover:cRed. Breakpoint mobile-first: sm md lg xl 2xl; sma/mda/lga/xla là max-width.
4. Property chưa có alias: viết tên CSS đầy đủ, ví dụ view-transition-name[hero]. Biến CSS: bgc--brand -> var(--brand).
5. Ưu tiên recipe có sẵn (gọi list_components / get_component) và token --ps-* (get_theme). Ghi đè class của recipe bằng layer cao hơn, ví dụ 1bdra999px.
6. Trước khi trả kết quả, gọi fix_classes cho các class tự viết; class còn trong "unresolved" thì tra lookup_dictionary hoặc viết tên CSS đầy đủ. Không để hai class cùng property cùng layer trên một phần tử.`

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
