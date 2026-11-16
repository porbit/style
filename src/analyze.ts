/**
 * Phân tích class x-css thuần logic (không DOM, không file): giải thích, gợi ý sửa,
 * tra dictionary, vị trí class trong mã nguồn và sắp xếp. Dùng chung cho MCP server,
 * lệnh `presence-style sort`/`check` và extension VS Code.
 *
 * Import: `@porbit/style/analyze`.
 */
import { LAYER_ORDER_STATEMENT, xcss, type XCSSConfig } from './core'
import { parseClassName } from './parser'
import { COMMON_VALUES, SHORT_PROPERTIES, SPECIFIC_VALUES } from './dictionary'
import { compactClassToken, findClassConflicts, getConflictKey, type ClassConflict } from './class-tools'
import { isOpenPropertyName, standardCssProperties } from './css-properties'

export { findClassConflicts, compactClassToken, type ClassConflict } from './class-tools'

const STANDARD_PROPERTY_SET = new Set<string>(standardCssProperties())

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

// CSS nền theo cấu hình (câu khai báo layer, base, @property của phương ngữ): cache theo đối tượng cấu hình.
const baselineCache = new WeakMap<object, string>()
const baselineCss = (config: XCSSConfig): string => {
    const cached = baselineCache.get(config)
    if (cached !== undefined) return cached
    const built = xcss({ silent: true, ...config, hashClassName: false }).buildCss(undefined)
    const css = built.getCssString()
    built.destroy()
    baselineCache.set(config, css)
    return css
}

/** CSS mà các class sinh thêm (đã bỏ phần nền luôn có: khai báo layer, base, @property của phương ngữ). */
export const generateCssFor = (classes: string[], config: XCSSConfig = {}): string => {
    const engine = xcss({ silent: true, ...config, hashClassName: false })
    const built = engine.buildCss(undefined)
    built.clsx(classes.join(' '))
    const css = built.getCssString()
    built.destroy()
    const base = baselineCss(config)
    return css.startsWith(base) ? css.slice(base.length) : css.replace(LAYER_ORDER_STATEMENT, '')
}

// Tên màu CSS: dùng để chọn đúng điểm tách khi value viết thường dính vào property (`cred` -> `cRed`).
const NAMED_COLORS = new Set(
    ('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor')
        .split(' '),
)

// Từ khoá CSS hợp lệ của các property hay dùng (ngoài alias trong dictionary), để nhận ra
// `dflex` -> `dFlex`, `wsnowrap` -> `wsNowrap`, `cur-pointer` -> `crPointer`.
const PROPERTY_KEYWORDS: Record<string, string[]> = {
    display: ['flex', 'grid', 'block', 'inline', 'none', 'contents', 'table', 'inline-flex', 'inline-block', 'inline-grid', 'flow-root'],
    'white-space': ['nowrap', 'normal', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'],
    position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
    cursor: ['pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'wait', 'help', 'crosshair', 'not-allowed', 'none'],
    'text-transform': ['uppercase', 'lowercase', 'capitalize', 'none'],
    'text-align': ['left', 'right', 'center', 'justify', 'start', 'end'],
    'text-decoration': ['none', 'underline', 'overline'],
    overflow: ['hidden', 'auto', 'scroll', 'visible', 'clip'],
    'overflow-x': ['hidden', 'auto', 'scroll', 'visible', 'clip'],
    'overflow-y': ['hidden', 'auto', 'scroll', 'visible', 'clip'],
    visibility: ['hidden', 'visible', 'collapse'],
    'pointer-events': ['none', 'auto'],
    'user-select': ['none', 'text', 'all', 'auto'],
    'flex-wrap': ['wrap', 'nowrap'],
    'font-style': ['italic', 'normal'],
    'object-fit': ['cover', 'contain', 'fill', 'none'],
    'font-weight': ['bold', 'normal', 'lighter', 'bolder'],
    'flex-direction': ['row', 'column'],
}
// Từ khoá chung chỉ hợp lệ với một số property (`hidden` không dùng được cho vertical-align).
const COMMON_VALUE_SCOPE: Record<string, RegExp> = {
    h: /^(overflow|visibility|backface-visibility|border.*style|outline-style|content-visibility)/,
    vis: /^(overflow|visibility|backface-visibility|content-visibility)/,
    col: /^(visibility|border-collapse)$/,
    sol: /^(border|outline|text-decoration)/,
    das: /^(border|outline|text-decoration)/,
    dot: /^(border|outline|text-decoration)/,
    dub: /^(border|outline|text-decoration)/,
    tr: /color$|^(background|border|outline|fill|stroke)$/,
    cc: /color$|^(background|border|outline|fill|stroke)$/,
}

/**
 * Từ khoá CSS thật (có dấu gạch) ứng với phần value viết liền: `inlineblock` -> `inline-block`.
 * Trả `null` nếu không phải từ khoá có dấu gạch.
 */
const hyphenatedKeyword = (alias: string, rest: string): string | null => {
    const cssName = SHORT_PROPERTIES[alias] || alias
    const found = PROPERTY_KEYWORDS[cssName]?.find((kw) => kw.includes('-') && kw.replace(/-/g, '') === rest)
    return found || null
}

/** Value viết thường `rest` có phải giá trị đã biết của property `alias` không. */
const isKnownValue = (alias: string, rest: string): boolean => {
    const cssName = SHORT_PROPERTIES[alias] || alias
    if (SPECIFIC_VALUES[alias]?.[rest] !== undefined) return true
    if (PROPERTY_KEYWORDS[cssName]?.some((kw) => kw === rest || kw.replace(/-/g, '') === rest)) return true
    if (/color$/.test(cssName) && NAMED_COLORS.has(rest)) return true
    // Từ khoá chung viết tắt (`n`) hoặc viết đủ (`none`).
    const commonKey = COMMON_VALUES[rest] !== undefined ? rest : COMMON_KEY_BY_VALUE[rest]
    if (commonKey !== undefined) {
        const scope = COMMON_VALUE_SCOPE[commonKey]
        return !scope || scope.test(cssName)
    }
    return false
}

const COMMON_KEY_BY_VALUE: Record<string, string> = Object.fromEntries(
    Object.entries(COMMON_VALUES).map(([key, value]) => [value.toLowerCase(), key]),
)

// Tên CSS bỏ dấu gạch -> tên CSS: `fontsize` -> font-size, `boxshadow` -> box-shadow.
const PROPERTY_BY_COMPACT_NAME: Record<string, string> = {}
for (const name of [...standardCssProperties(), ...Object.values(SHORT_PROPERTIES)]) {
    const compact = name.replace(/-/g, '')
    if (!PROPERTY_BY_COMPACT_NAME[compact]) PROPERTY_BY_COMPACT_NAME[compact] = name
}
const COMPACT_NAMES_BY_LENGTH = Object.keys(PROPERTY_BY_COMPACT_NAME).sort((a, b) => b.length - a.length)

// Đoán property từ chữ viết tắt tự nghĩ ra: `bdf` -> backdrop-filter, `fvn` -> font-variant-numeric,
// `wbo` -> -webkit-box-orient. Các chữ cái phải theo thứ tự, phủ mọi đoạn của tên CSS;
// ưu tiên tên có nhiều chữ khớp đúng đầu đoạn. Chỉ trả kết quả khi không mơ hồ.
const ABBREVIATION_CANDIDATES = [...new Set<string>([
    ...standardCssProperties(),
    ...Object.values(SHORT_PROPERTIES),
    '-webkit-box-orient', '-webkit-line-clamp', '-webkit-text-stroke', '-webkit-font-smoothing', '-webkit-tap-highlight-color',
])]
const guessPropertyFromAbbreviation = (abbr: string): string | null => {
    if (abbr.length < 2 || abbr.length > 6 || !/^[a-z]+$/.test(abbr)) return null
    let best: string | null = null
    let bestScore = -1
    let tie = false
    for (const name of ABBREVIATION_CANDIDATES) {
        const segments = name.replace(/^-/, '').split('-')
        if (segments.length < 2 || segments.length > abbr.length || name[0] === '-' && segments[0] !== 'webkit') continue
        if (segments[0][0] !== abbr[0]) continue
        // Ghép tham lam từng chữ vào đoạn, mỗi đoạn phải có ít nhất một chữ.
        let i = 0
        let score = 0
        let ok = true
        for (let seg = 0; seg < segments.length && ok; seg++) {
            const text = segments[seg]
            const remainingSegments = segments.length - seg - 1
            let pos = 0
            let matched = 0
            while (i < abbr.length && abbr.length - i > remainingSegments) {
                const found = text.indexOf(abbr[i], pos)
                if (found === -1) break
                if (matched === 0 && found === 0) score++
                pos = found + 1
                matched++
                i++
                if (remainingSegments > 0 && matched >= 1 && abbr.length - i <= remainingSegments) break
                if (remainingSegments > 0 && segments[seg + 1][0] === abbr[i]) break
            }
            if (matched === 0) ok = false
        }
        if (!ok || i !== abbr.length) continue
        if (score > bestScore) {
            best = name
            bestScore = score
            tie = false
        } else if (score === bestScore) {
            tie = true
        }
    }
    return best && !tie && bestScore >= 2 ? best : null
}

// Alias chính tắc khi một property có nhiều alias (xem docs/guides/thiet-ke-nhanh.md mục 8).
const CANONICAL_ALIASES: Record<string, string> = {
    'border-radius': 'bdra',
    'font-weight': 'fnw',
    'max-width': 'mw',
    'font-family': 'ff',
    'box-shadow': 'bxsh',
}
const ALIAS_BY_PROPERTY: Record<string, string> = { ...CANONICAL_ALIASES }
for (const [alias, cssName] of Object.entries(SHORT_PROPERTIES)) {
    if (CANONICAL_ALIASES[cssName]) continue
    if (!ALIAS_BY_PROPERTY[cssName] || alias.length < ALIAS_BY_PROPERTY[cssName].length) ALIAS_BY_PROPERTY[cssName] = alias
}

const STATE_PREFIX = /^(hover|focus|focus-visible|focus-within|active|visited|disabled|checked|first|last|odd|even|placeholder|before|after):(.+)$/
const PSEUDO_ELEMENTS = new Set(['placeholder', 'before', 'after'])
const STATE_SELECTOR: Record<string, string> = { first: ':first-child', last: ':last-child', odd: ':nth-child(odd)', even: ':nth-child(even)' }

/**
 * Đề xuất bản sửa tự động cho một class không sinh CSS. Chỉ trả kết quả khi bản sửa
 * thật sự sinh được CSS; ngược lại trả `null`.
 */
let tailwindFallback: ((token: string) => string[] | null) | null = null

/**
 * Bật gợi ý sửa theo nghĩa Tailwind (`w-full` -> `w100%`). Tách thành tuỳ chọn để
 * `@porbit/style/analyze` không kéo bộ chuyển Tailwind vào bundle khi không cần.
 */
export const setTailwindFallback = (convert: ((token: string) => string[] | null) | null): void => {
    tailwindFallback = convert
}

// Property độ dài: số khác 0 không có đơn vị (`mt-4`, `w10`) là CSS sai, nhưng ở Node
// không có CSS.supports nên engine vẫn sinh. Coi là không hợp lệ khi tìm bản sửa.
const LENGTH_PROPERTY = /^(margin|padding|width|height|min-width|min-height|max-width|max-height|top|right|bottom|left|inset|gap|row-gap|column-gap|border-radius|font-size|letter-spacing|border-width|outline-offset|flex-basis)/
const hasUnitlessLength = (token: string): boolean => {
    const parsed = parseClassName(token)
    if (!parsed) return false
    const cssName = SHORT_PROPERTIES[parsed.prop] || parsed.prop
    const value = parsed.val.replace(/^!/, '')
    return LENGTH_PROPERTY.test(cssName) && /^-?(?:\d*\.)?\d+$/.test(value) && Number(value) !== 0
}

// Giá trị sai kiểu mà engine không có CSS.supports (Node, Rust) vẫn sinh: `g16px` là
// `grid: 16px` (trình duyệt bỏ qua), gần như chắc chắn người viết muốn `gap`.
const SINGLE_LENGTH = /^-?(?:\d*\.)?\d+(?:px|rem|em|%|vh|vw|ch|ex|vmin|vmax|pt)$/
const VALUE_TYPE_MISTAKES: Record<string, string> = { grid: 'gap' }
const hasValueTypeMistake = (token: string): string | null => {
    const parsed = parseClassName(token)
    if (!parsed) return null
    const cssName = SHORT_PROPERTIES[parsed.prop] || parsed.prop
    const value = parsed.val.replace(/^!/, '')
    return VALUE_TYPE_MISTAKES[cssName] && SINGLE_LENGTH.test(value) ? VALUE_TYPE_MISTAKES[cssName] : null
}

/** Sai ngữ nghĩa CSS dù engine (không có CSS.supports) vẫn sinh được rule. */
export const looksSemanticallyInvalid = (token: string): boolean => hasUnitlessLength(token) || hasValueTypeMistake(token) !== null

export const suggestClassFix = (token: string, config: XCSSConfig = {}): string | null => {
    const valid = (candidate: string) => !looksSemanticallyInvalid(candidate) && generateCssFor([candidate], config).trim().length > 0
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
                if (SHORT_PROPERTIES[alias] && isKnownValue(alias, rest)) {
                    // `dinlineblock`: viết liền thì `dInlineblock` sai CSS; dùng từ khoá thật rồi rút gọn (`dIb`).
                    const keyword = hyphenatedKeyword(alias, rest)
                    candidates.push(keyword ? compactClassToken(head + alias + '[' + keyword + ']' + tail) : head + alias + capitalize(rest) + tail)
                }
            }
        }
        // `ttu` -> `ttrU`: alias sai (tt) + value thường.
        if (parsed.val === '') {
            for (const [wrong, right] of Object.entries(COMMON_MISTAKES)) {
                const rest = parsed.prop.slice(wrong.length)
                if (rest && parsed.prop.startsWith(wrong) && isKnownValue(right, rest)) {
                    candidates.push(head + right + capitalize(rest) + tail)
                }
            }
            // `cur-pointer` -> `crP`: kiểu Tailwind `property-giá-trị`.
            const dash = parsed.prop.lastIndexOf('-')
            if (dash > 0) {
                const left = parsed.prop.slice(0, dash)
                const right = COMMON_MISTAKES[left] || (SHORT_PROPERTIES[left] ? left : '') || ALIAS_BY_PROPERTY[left] || ''
                const rest = parsed.prop.slice(dash + 1).replace(/-/g, '')
                if (right && rest && isKnownValue(right, rest)) {
                    candidates.push(compactClassToken(head + right + '[' + parsed.prop.slice(dash + 1) + ']' + tail))
                }
            }
        }
        // `fz14px` -> `fns14px`, `op0.5` -> `opc0.5`.
        const renamed = COMMON_MISTAKES[parsed.prop] || (parsed.prop === 'op' && /^[\d.]/.test(parsed.val) ? 'opc' : '')
        if (renamed) candidates.push(head + renamed + parsed.val + tail)
        // `g16px` -> `gap16px`: property nhận sai kiểu giá trị.
        const typeFix = hasValueTypeMistake(input)
        if (typeFix) candidates.push(head + (ALIAS_BY_PROPERTY[typeFix] || typeFix) + parsed.val + tail)
        // `fontsize14px` -> `fns14px`, `colorRed` -> `cRed`: tên CSS viết liền, dính value.
        const lowered = (parsed.prop + parsed.val).toLowerCase()
        const compactName = COMPACT_NAMES_BY_LENGTH.find((name) => name.length >= 4 && lowered.startsWith(name) && lowered.length > name.length)
        const rawValue = compactName ? (parsed.prop + parsed.val).slice(compactName.length) : ''
        // Phần còn lại phải giống một value: số, `#`, `[`, chữ hoa đầu, hoặc từ khoá đã biết.
        const valueLike = !!compactName && (/^[\d#[.!-]|^[A-Z]/.test(rawValue) || isKnownValue(PROPERTY_BY_COMPACT_NAME[compactName], rawValue))
        if (compactName && valueLike) {
            const cssName = PROPERTY_BY_COMPACT_NAME[compactName]
            const alias = ALIAS_BY_PROPERTY[cssName]
            const value = rawValue.startsWith('[') ? rawValue : /^[a-z]/.test(rawValue) ? capitalize(rawValue) : rawValue
            if (alias) candidates.push(head + alias + value + tail)
            else candidates.push(head + cssName + (rawValue.startsWith('[') ? rawValue : `[${rawValue}]`) + tail)
        }
        // `bdf[blur(4px)]` -> `bkdf[blur(4px)]`: alias tự đặt, đoán theo chữ viết tắt.
        if (parsed.val && !SHORT_PROPERTIES[parsed.prop] && !STANDARD_PROPERTY_SET.has(parsed.prop)) {
            const guessed = guessPropertyFromAbbreviation(parsed.prop)
            if (guessed) {
                const alias = ALIAS_BY_PROPERTY[guessed]
                const value = parsed.val.startsWith('[') || alias ? parsed.val : `[${parsed.val}]`
                candidates.push(head + (alias || guessed) + value + tail)
            }
        }
        // `cred` -> `cRed`.
        if (/^[a-z]/.test(parsed.val)) candidates.push(head + parsed.prop + capitalize(parsed.val) + tail)
        return candidates.find(valid) ?? null
    }

    // Thói quen Tailwind (`w-full`, `mt-4`, `hover:underline`): đổi bằng bộ chuyển Tailwind
    // khi kết quả là đúng một token x-css sinh được CSS.
    if (tailwindFallback) {
        const converted = tailwindFallback(token)
        if (converted && converted.length === 1 && valid(converted[0])) return compactClassToken(converted[0])
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
    // Luật ngữ nghĩa x-css (`p-4` thiếu đơn vị) không áp cho class do phương ngữ (Tailwind) dịch.
    const fromDialect = !!config.dialects?.some((dialect) => {
        try {
            return !!dialect(token)
        } catch (_error) {
            return false
        }
    })
    const valid = css.length > 0 && (fromDialect || !looksSemanticallyInvalid(token))
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
export interface SortOptions {
    mediaOrder?: string[]
    /**
     * Thứ tự kiểu Tailwind (`tailwindV4Dialect().compare`): sắp như prettier-plugin-tailwindcss — class lạ
     * đứng trước, `...` cuối, bỏ class trùng, gộp khoảng trắng.
     */
    compare?: (a: string, b: string) => number
    /** Hàm có đối số là chuỗi class (`cn`, `clsx`, `cva`, `tw`...): chuỗi bên trong cũng được sắp. */
    functions?: string[]
}

/** Port `sortClasses` của prettier-plugin-tailwindcss: cùng xử lý khoảng trắng, trùng lặp và `...`. */
export const sortTailwindClassString = (
    classStr: string,
    compare: (a: string, b: string) => number,
    { removeDuplicates = true, collapseWhitespace = true }: { removeDuplicates?: boolean; collapseWhitespace?: boolean } = {},
): string => {
    if (typeof classStr !== 'string' || classStr === '' || classStr.includes('{{')) return classStr
    if (collapseWhitespace && /^[\t\r\f\n ]+$/.test(classStr)) return ' '
    const parts = classStr.split(/([\t\r\f\n ]+)/)
    const classes = parts.filter((_, i) => i % 2 === 0)
    let whitespace = parts.filter((_, i) => i % 2 !== 0)
    if (classes[classes.length - 1] === '') classes.pop()
    if (collapseWhitespace) whitespace = whitespace.map(() => ' ')
    const isDots = (name: string) => name === '...' || name === '…'
    const sorted = classes.map((name, index) => ({ name, index })).sort((a, b) => {
        if (isDots(a.name)) return 1
        if (isDots(b.name)) return -1
        if (a.name === b.name) return 0
        return compare(a.name, b.name) || a.index - b.index
    })
    const removed = new Set<number>()
    let list = sorted
    if (removeDuplicates) {
        const seen = new Set<string>()
        // Chỉ bỏ trùng class đã biết (class lạ có thể mang nghĩa riêng của thư viện khác).
        const known = (name: string) => compare(name, '\u0000__unknown__') > 0
        list = sorted.filter(({ name }, index) => {
            if (seen.has(name)) {
                removed.add(index)
                return false
            }
            if (known(name)) seen.add(name)
            return true
        })
    }
    whitespace = whitespace.filter((_, index) => !removed.has(index + 1))
    let result = ''
    for (let i = 0; i < list.length; i++) result += `${list[i].name}${whitespace[i] ?? ''}`
    if (collapseWhitespace) result = result.replace(/^\s+/, '').replace(/\s+$/, '')
    return result
}

export const sortClasses = (input: string, options: SortOptions = {}): string => {
    if (options.compare) return sortTailwindClassString(input, options.compare)
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

/**
 * Mọi chuỗi class trong mã nguồn: thuộc tính `class`/`className` (cả chuỗi trong biểu thức `className={a ? "x" : "y"}`)
 * và chuỗi là đối số (kể cả trong object/mảng, trừ khoá object) của các hàm `functions` (`cn("...")`, `cva("...", {...})`).
 */
export const findClassStrings = (source: string, options: { functions?: string[] } = {}): ClassAttributeRange[] => {
    const ranges = new Map<number, ClassAttributeRange>()
    for (const range of findClassAttributes(source)) ranges.set(range.start, range)
    // Quét một biểu thức (từ `open` tới ngoặc đóng tương ứng), thu chuỗi không phải khoá object.
    const collect = (open: number) => {
        let depth = 0
        for (let i = open; i < source.length; i++) {
            const ch = source[i]
            if (ch === '(' || ch === '[' || ch === '{') depth++
            else if (ch === ')' || ch === ']' || ch === '}') {
                depth--
                if (depth === 0) return
            } else if (ch === '"' || ch === "'" || ch === '`') {
                let end = i + 1
                while (end < source.length && source[end] !== ch) {
                    if (source[end] === '\\') end++
                    end++
                }
                const value = source.slice(i + 1, end)
                let after = end + 1
                while (/\s/.test(source[after] || '')) after++
                const isKey = source[after] === ':' && !/[?]\s*$/.test(source.slice(Math.max(0, i - 40), i))
                if (!isKey && !(ch === '`' && value.includes('${')) && (ch !== "'" || !value.includes('\n'))) {
                    if (!ranges.has(i + 1)) ranges.set(i + 1, { start: i + 1, end, value })
                }
                i = end
            } else if (ch === '/' && source[i + 1] === '/') {
                while (i < source.length && source[i] !== '\n') i++
            }
        }
    }
    const attr = /\b(?:class|className)\s*=\s*\{/g
    for (let m = attr.exec(source); m; m = attr.exec(source)) collect(m.index + m[0].length - 1)
    if (options.functions?.length) {
        const names = options.functions.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
        const call = new RegExp(`(?<![\\w.$])(?:${names})\\s*\\(`, 'g')
        for (let m = call.exec(source); m; m = call.exec(source)) collect(m.index + m[0].length - 1)
    }
    return [...ranges.values()].sort((a, b) => a.start - b.start)
}

/** Sắp xếp class trong mọi thuộc tính class tĩnh (và đối số của `functions`) của một file nguồn. */
export const sortClassesInSource = (source: string, options: SortOptions = {}): string => {
    let output = ''
    let cursor = 0
    const ranges = options.compare || options.functions ? findClassStrings(source, options) : findClassAttributes(source)
    for (const range of ranges) {
        if (range.start < cursor) continue
        if (options.compare) {
            const sorted = sortTailwindClassString(range.value, options.compare)
            output += source.slice(cursor, range.start) + sorted
            cursor = range.end
            continue
        }
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
