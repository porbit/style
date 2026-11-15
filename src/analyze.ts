/**
 * Phân tích class x-css thuần logic (không DOM, không file): giải thích, gợi ý sửa,
 * tra dictionary, vị trí class trong mã nguồn và sắp xếp. Dùng chung cho MCP server,
 * lệnh `presence-style sort`/`check` và extension VS Code.
 *
 * Import: `@porbit/style/analyze`.
 */
import { xcss, type XCSSConfig } from './core'
import { parseClassName } from './parser'
import { COMMON_VALUES, SHORT_PROPERTIES, SPECIFIC_VALUES } from './dictionary'
import { compactClassToken, findClassConflicts, getConflictKey, type ClassConflict } from './class-tools'
import { STANDARD_CSS_PROPERTIES, isOpenPropertyName } from './css-properties'

export { findClassConflicts, compactClassToken, type ClassConflict } from './class-tools'

const STANDARD_PROPERTY_SET = new Set<string>(STANDARD_CSS_PROPERTIES)

/**
 * Token có "dạng x-css" không: property là alias trong dictionary, tên CSS chuẩn hoặc
 * custom property. Class của thư viện khác (`btn`, `card-title`) trả false.
 */
export const isXcssLike = (token: string): boolean => {
    const parsed = parseClassName(token)
    if (!parsed || !parsed.prop) return false
    const prop = parsed.prop
    if (prop.startsWith('[')) return true
    return !!SHORT_PROPERTIES[prop] || STANDARD_PROPERTY_SET.has(prop) || isOpenPropertyName(prop)
}

export interface ClassExplanation {
    class: string
    valid: boolean
    parsed: {
        media: string
        layer: string
        property: string
        cssProperty: string
        value: string
        selector: string
    } | null
    css: string
    /** Bản sửa tự động (nếu có). */
    suggestion: string | null
    hints: string[]
}

export interface DictionaryMatch {
    alias: string
    property: string
    values: Record<string, string>
}

const PROPERTY_BY_CSS_NAME = (() => {
    const map: Record<string, string[]> = {}
    for (const [alias, name] of Object.entries(SHORT_PROPERTIES)) {
        ;(map[name] ||= []).push(alias)
    }
    return map
})()

// Lỗi hay gặp: alias sai -> alias đúng (theo docs/guides/thiet-ke-nhanh.md).
export const COMMON_MISTAKES: Record<string, string> = {
    fz: 'fns', fs: 'fns', minh: 'mih', mnh: 'mih', mah: 'mh', maxh: 'mh', maxw: 'mw', zi: 'z',
    ou: 'oli', out: 'oli', cur: 'cr', tt: 'ttr', bgcolor: 'bgc', col: 'c', color: 'c',
    rounded: 'bdra', radius: 'bdra', shadow: 'bxsh', bs: 'bxsh', fd: 'fxd', items: 'ai', justify: 'jc',
}

export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

export const generateCssFor = (classes: string[], config: XCSSConfig = {}): string => {
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

export const explainClass = (token: string, config: XCSSConfig = {}): ClassExplanation => {
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

export const searchDictionary = (query: string, limit = 10): DictionaryMatch[] => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const results: Array<{ score: number; item: DictionaryMatch }> = []
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
    results.sort((a, b) => b.score - a.score || a.item.alias.length - b.item.alias.length)
    return results.slice(0, limit).map((r) => r.item)
}


// ---------------------------------------------------------------------------
// Phân tích cả chuỗi class
// ---------------------------------------------------------------------------

export interface ClassListAnalysis {
    items: ClassExplanation[]
    conflicts: ClassConflict[]
}

export const analyzeClasses = (input: string, config: XCSSConfig = {}): ClassListAnalysis => {
    const tokens = [...new Set(input.split(/\s+/).filter(Boolean))]
    return { items: tokens.map((token) => explainClass(token, config)), conflicts: findClassConflicts(tokens) }
}

/** Sửa tự động cả chuỗi class (cùng logic tool MCP `fix_classes`). */
export const fixClasses = (
    input: string,
    options: { compact?: boolean; config?: XCSSConfig } = {},
): { output: string; changes: Array<{ from: string; to: string }>; unresolved: string[]; conflicts: ClassConflict[] } => {
    const config = options.config || {}
    const changes: Array<{ from: string; to: string }> = []
    const unresolved: string[] = []
    const output = input.split(/\s+/).filter(Boolean).map((token) => {
        const fixed = suggestClassFix(token, config)
        let result = fixed ?? token
        if (!fixed && !generateCssFor([token], config).trim()) unresolved.push(token)
        if (options.compact !== false) result = compactClassToken(result)
        if (result !== token) changes.push({ from: token, to: result })
        return result
    })
    return { output: output.join(' '), changes, unresolved, conflicts: findClassConflicts(output) }
}

// ---------------------------------------------------------------------------
// Vị trí class trong mã nguồn
// ---------------------------------------------------------------------------

export interface ClassAttributeRange {
    /** Vị trí bắt đầu/kết thúc của NỘI DUNG thuộc tính (không gồm dấu nháy). */
    start: number
    end: number
    value: string
}

export interface ClassTokenRange {
    start: number
    end: number
    token: string
}

/**
 * Tìm nội dung tĩnh của `class="..."`, `class='...'`, `className="..."`, `className='...'`
 * và `className={"..."}` / `className={'...'}`. Biểu thức động (`{cond ? a : b}`, template
 * có `${}`) bị bỏ qua để không sửa nhầm mã.
 */
export const findClassAttributes = (source: string): ClassAttributeRange[] => {
    const ranges: ClassAttributeRange[] = []
    const pattern = /\b(?:class|className)\s*=\s*(?:\{\s*)?(["'])/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(source)) !== null) {
        const quote = match[1]
        const start = match.index + match[0].length
        const end = source.indexOf(quote, start)
        if (end === -1) break
        const value = source.slice(start, end)
        if (!value.includes('\n') || quote === '"') ranges.push({ start, end, value })
        pattern.lastIndex = end + 1
    }
    return ranges
}

/** Tách từng token class kèm vị trí tuyệt đối trong mã nguồn. */
export const findClassTokens = (source: string): ClassTokenRange[] => {
    const tokens: ClassTokenRange[] = []
    for (const range of findClassAttributes(source)) {
        const re = /\S+/g
        let m: RegExpExecArray | null
        while ((m = re.exec(range.value)) !== null) {
            tokens.push({ start: range.start + m.index, end: range.start + m.index + m[0].length, token: m[0] })
        }
    }
    return tokens
}

// ---------------------------------------------------------------------------
// Sắp xếp class
// ---------------------------------------------------------------------------

const DEFAULT_MEDIA_ORDER = ['default', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'sma', 'mda', 'lga', 'xla']

// Nhóm property theo thứ tự đọc: vị trí → bố cục → kích thước → khoảng cách → chữ → màu nền
// → viền → hiệu ứng → chuyển động. Property không khớp nhóm nào đứng cuối.
const PROPERTY_GROUPS: RegExp[] = [
    /^(position|inset|top|right|bottom|left|z-index|float|clear)$/,
    /^(display|visibility|box-sizing|isolation|contain|content-visibility)$/,
    /^(flex|order|align|justify|place|gap|row-gap|column-gap|grid)/,
    /^(width|height|min-|max-|aspect-ratio|inline-size|block-size)/,
    /^(margin|padding|space)/,
    /^(overflow|overscroll|scroll|object-)/,
    /^(font|line-height|letter-spacing|text-|white-space|word-|overflow-wrap|hyphens|vertical-align|list-style|content$)/,
    /^(color|accent-color|caret-color)$/,
    /^(background|fill|stroke)/,
    /^(border|outline|border-radius)/,
    /^(box-shadow|opacity|filter|backdrop-filter|mix-blend-mode|cursor|pointer-events|user-select|appearance|resize)/,
    /^(transform|translate|scale|rotate|transition|animation|will-change)/,
]

const groupIndex = (cssProperty: string): number => {
    const index = PROPERTY_GROUPS.findIndex((re) => re.test(cssProperty))
    return index === -1 ? PROPERTY_GROUPS.length : index
}

/**
 * Sắp xếp class theo thứ tự ổn định: class không phải x-css (giữ thứ tự gốc) → media
 * (mặc định trước, rồi sm → md → lg...) → layer → nhóm property → selector → tên.
 * Thứ tự class KHÔNG đổi kết quả CSS; sắp xếp chỉ để dễ đọc và diff gọn.
 */
export const sortClasses = (input: string, options: { mediaOrder?: string[] } = {}): string => {
    const mediaOrder = options.mediaOrder || DEFAULT_MEDIA_ORDER
    const tokens = input.split(/\s+/).filter(Boolean)
    const foreign: string[] = []
    const known: Array<{ token: string; key: Array<number | string> }> = []
    tokens.forEach((token, index) => {
        const conflictKey = getConflictKey(token)
        if (!conflictKey || !isXcssLike(token)) {
            foreign.push(token)
            return
        }
        const [media, layer, property, selector] = conflictKey.split('|')
        const mediaRank = mediaOrder.indexOf(media)
        known.push({
            token,
            key: [mediaRank === -1 ? mediaOrder.length : mediaRank, Number(layer), selector ? 1 : 0, groupIndex(property), property, selector, index],
        })
    })
    known.sort((a, b) => {
        for (let i = 0; i < a.key.length; i++) {
            if (a.key[i] < b.key[i]) return -1
            if (a.key[i] > b.key[i]) return 1
        }
        return 0
    })
    return [...foreign, ...known.map((k) => k.token)].join(' ')
}

/** Sắp xếp class trong mọi thuộc tính class tĩnh của một file nguồn. */
export const sortClassesInSource = (source: string, options: { mediaOrder?: string[] } = {}): string => {
    let output = ''
    let cursor = 0
    for (const range of findClassAttributes(source)) {
        if (/[{}$`]/.test(range.value)) continue
        const sorted = sortClasses(range.value, options)
        const leading = range.value.match(/^\s*/)![0]
        const trailing = range.value.match(/\s*$/)![0]
        const normalized = range.value.trim() ? leading + sorted + trailing : range.value
        // Chỉ thay khi thứ tự đổi (giữ nguyên khoảng trắng nhiều dòng của người viết nếu không đổi).
        const same = range.value.trim().split(/\s+/).join(' ') === sorted
        output += source.slice(cursor, range.start) + (same ? range.value : normalized)
        cursor = range.end
    }
    return output + source.slice(cursor)
}

/** Danh sách alias property (cho gợi ý tự động hoàn thành). */
export const listPropertyAliases = (): Array<{ alias: string; property: string; values: string[] }> =>
    Object.entries(SHORT_PROPERTIES).map(([alias, property]) => ({
        alias,
        property,
        values: Object.keys(SPECIFIC_VALUES[alias] || {}).map((key) => alias + capitalize(key)),
    }))
