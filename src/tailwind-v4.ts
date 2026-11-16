/**
 * Phương ngữ Tailwind v4 dựng từ dữ liệu sinh tự động (src/tailwind-generated.ts) bằng chính
 * compiler của Tailwind. Mỗi class Tailwind được đổi thành các token x-css (khai báo nguyên văn của
 * Tailwind, kể cả biến `--tw-*`), nên CSS sinh ra khớp Tailwind thay vì "gần giống".
 *
 *   import { tailwindV4Dialect } from '@porbit/style/tailwind'
 *   xcss.cssObserve(document, { dialects: [tailwindV4Dialect({ preflight: true })] })
 */
import type { XCSSDialect } from './core'

declare const __XCSS_EDITOR__: boolean | undefined
const EDITOR_BUILD = typeof __XCSS_EDITOR__ === 'undefined' || __XCSS_EDITOR__
import { TW_DATA, TW_ORDER, TW_PREFLIGHT_CSS } from './tailwind-generated'

/** Một rule: selector (`&` là phần tử), khai báo; `query` là điều kiện media riêng (`container`); `more` là rule kèm theo. */
type Rule = { sel: string; decls: Array<[string, string]>; query?: string; more?: Rule[] }

export interface TailwindV4DialectOptions {
    /**
     * Theme bổ sung/ghi đè như `@theme` của Tailwind: `{ '--color-brand': '#0a64e8', '--breakpoint-3xl': '120rem' }`.
     * Class dùng token mới (`bg-brand`, `3xl:p-4`, `rounded-blob`) được nhận nếu họ utility đọc biến đó.
     */
    theme?: Record<string, string>
    /** CSS bổ sung đặt cùng base của phương ngữ (ví dụ `@keyframes`); `@apply` bên trong được mở rộng. */
    css?: string
    /** Utility tự định nghĩa như `@utility tab-4 { tab-size: 4 }`: `{ 'tab-4': 'tab-size: 4' }`. */
    utilities?: Record<string, string>
    /**
     * Biến thể tự định nghĩa như `@custom-variant`: `{ dark: '&:is(.dark *)', 'pointer-coarse': '@media (pointer: coarse)' }`
     * hoặc dạng khối `{ 'data-open': '{ &:where([data-state="open"]) { @slot; } }' }`.
     */
    variants?: Record<string, string>
    /** Thêm preflight (reset) của Tailwind vào base CSS. Mặc định false. */
    preflight?: boolean
    /** `media` (mặc định, như Tailwind v4): theo hệ điều hành. `class`: theo `.dark` ở tổ tiên. */
    darkMode?: 'media' | 'class'
    /**
     * Tiền tố như `@import "tailwindcss" prefix(tw)`: class viết `tw:flex`, `tw:hover:bg-red-500` (tiền tố đứng
     * trước mọi biến thể); class không tiền tố không được nhận; `group`/`peer` thành `tw:group`/`tw:peer`.
     * Nhận cả kiểu v3 `'tw-'` (bỏ một dấu `-` cuối như Tailwind v4); tiền tố khác chữ thường a-z báo lỗi.
     * Biến theme trong CSS sinh ra giữ tên không tiền tố (`var(--color-red-500, …)`), giá trị như Tailwind.
     */
    prefix?: string
    /**
     * `true` (như `@import "tailwindcss" important` / `important: true` của cấu hình v3): mọi khai báo
     * utility thêm `!important`. Chuỗi selector (`'#app'`, `important: '#app'` của cấu hình v3): utility chỉ áp
     * trong phần tử đó (`#app .p-2`, cùng độ ưu tiên như Tailwind). `@apply` không bị ảnh hưởng (như Tailwind).
     */
    important?: boolean | string
    /**
     * Class không sinh CSS (như `@source not inline("...")` / `blocklist` của cấu hình v3): so khớp đúng cả chuỗi
     * class (kể cả tiền tố, biến thể), như Tailwind v4.
     */
    blocklist?: string[]
}

/** Chuẩn hoá tiền tố như Tailwind v4: bỏ một `-` cuối (kiểu v3 `tw-`), chỉ nhận chữ thường a-z. */
export const normalizeTailwindPrefix = (prefix: string): string => {
    const value = prefix.endsWith('-') ? prefix.slice(0, -1) : prefix
    if (!/^[a-z]+$/.test(value)) throw new Error(`The prefix "${value}" is invalid. Prefixes must be lowercase ASCII letters (a-z) only.`)
    return value
}

// Bảng màu nén (`red:97.1 0.013 17.38,...|...`) -> `--color-red-50: oklch(97.1% 0.013 17.38)`.
const defaultTheme: Record<string, string> = { ...(TW_DATA.theme as Record<string, string>) }
const PALETTE_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
for (const entry of (TW_DATA.palette as string).split('|').filter(Boolean)) {
    const [family, values] = entry.split(':')
    values.split(',').forEach((value, i) => {
        const [l, c, h] = value.split(' ')
        defaultTheme[`--color-${family}-${PALETTE_SHADES[i]}`] = `oklch(${l}% ${c} ${h})`
    })
}
// Theme của phiên bản phương ngữ đang chạy (mặc định + theme người dùng). JS chạy đơn luồng nên đặt
// lại ở đầu mỗi lần gọi phương ngữ là đủ.
let theme: Record<string, string> = defaultTheme
let RESPONSIVE = ['sm', 'md', 'lg', 'xl', '2xl']
let CONTAINER_SIZES = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl']
const remValue = (value: string | undefined) => {
    const m = (value || '').match(/^(-?[\d.]+)(rem|px|em)$/)
    return m ? Number(m[1]) * (m[2] === 'px' ? 1 / 16 : 1) : Number.POSITIVE_INFINITY
}
const keysByNamespace = (ns: string) =>
    Object.keys(theme).filter((k) => k.startsWith(ns) && !k.slice(ns.length).includes('--')).map((k) => k.slice(ns.length))
        .sort((a, b) => remValue(theme[ns + a]) - remValue(theme[ns + b]))

// Họ utility đọc biến theme theo giá trị (`var(--color-{v})`): giá trị ngoài bảng mặc định được nhận nếu
// theme có biến tương ứng (`bg-brand` khi có `--color-brand`).
const themePrefixCache = new Map<number, string[]>()
/** Tiền tố biến theme mà mẫu đọc theo giá trị: `var(--color-{v})` -> `--color-`. */
const templatePrefixes = (templateIndex: number): string[] => {
    let prefixes = themePrefixCache.get(templateIndex)
    if (!prefixes) {
        const text = templates[templateIndex].slice(1).map((i) => declTable[i]).join(';')
        prefixes = [...text.matchAll(/var\((--[\w-]*?)\{v\}\)/g)].map((m) => m[1])
        themePrefixCache.set(templateIndex, prefixes)
    }
    return prefixes
}
/** Namespace theme bị thay hẳn trong dialect đang hoạt động. */
let RESET_NAMESPACES: string[] = []

// ---------------------------------------------------------------------------
// Giải mã dữ liệu nén (định dạng: bước nén cuối scripts/gen-tailwind-map.mjs)
// ---------------------------------------------------------------------------

/** Rule gọn: [selector?, prop, value, prop, value...]; độ dài lẻ thì phần tử đầu là selector. */
type CompactRule = readonly number[]
/** Mẫu giá trị tuỳ ý: chỉ số trong `tpl`, hoặc [mẫu thứ j của họ, biểu thức xs[x], chỉ số giá trị thay vào]. */
type ArbitrarySpec = number | readonly [number, number, number]
const DATA = TW_DATA as unknown as {
    props: readonly string[]
    vals: readonly string[]
    sels: readonly string[]
    xs: readonly string[]
    lits: readonly string[]
    valueSets: readonly string[]
    /** gốc -> [giá trị tuỳ ý (spec hoặc [length, color, number, any]), class dựng từ mẫu [j, x, chỉ số lits] | 0, ...[bộ giá trị, ...rule gọn]] */
    roots: Record<string, readonly unknown[]>
    explicit: Record<string, CompactRule>
    tpl: readonly CompactRule[]
    properties: ReadonlyArray<string | readonly [string, string, number?]>
    syntaxes: readonly string[]
    fallback: readonly [string, string]
    keyframes: readonly string[]
    /** gốc -> { gợi ý kiểu (`length`, `color`...): spec } khi mẫu của gợi ý khác mẫu suy từ loại giá trị. */
    hints: Record<string, Record<string, ArbitrarySpec>>
}
const sels = DATA.sels
/** Bảng khai báo `prop:value` dùng chung; rule giải mã là [chỉ số selector, ...chỉ số khai báo]. */
const declTable: string[] = []
const declIndex = new Map<string, number>()
const internDecl = (text: string): number => {
    let index = declIndex.get(text)
    if (index === undefined) declIndex.set(text, (index = declTable.push(text) - 1))
    return index
}
const decodeRule = (rule: CompactRule, from = 0): number[] => {
    const odd = (rule.length - from) & 1
    const out = [odd ? rule[from] : 0]
    for (let i = from + odd; i < rule.length; i += 2) out.push(internDecl(DATA.props[rule[i]] + ':' + DATA.vals[rule[i + 1]]))
    return out
}
/** Rule dựng từ mẫu: thay mọi biểu thức `xs[x]` bằng `literal` (`height:calc(var(--spacing) * {v})` -> `height:100%`). */
const deriveRule = (template: number[], x: number, literal: string): number[] =>
    [template[0], ...template.slice(1).map((index) => internDecl(declTable[index].split(DATA.xs[x]).join(literal)))]
const templates: number[][] = []
const families: Record<string, Array<[number, number]>> = {}
const explicit: Record<string, number[]> = {}
const arbitraryTemplates: Record<string, number | Record<string, number>> = {}
/** Mẫu theo gợi ý kiểu: `bg-[length:200%]` -> background-size (giá trị trần `bg-[200%]` là background-position). */
const hintTemplates: Record<string, Record<string, number>> = {}
for (const root in DATA.roots) {
    const entries = DATA.roots[root].slice(2) as CompactRule[]
    if (entries.length) families[root] = entries.map((entry) => [templates.push(decodeRule(entry, 1)) - 1, entry[0]])
}
const tplBase = templates.length
for (const rule of DATA.tpl) templates.push(decodeRule(rule))
// Thứ tự trong mảng loại của dữ liệu (xem bước nén của scripts/gen-tailwind-map.mjs).
const ARBITRARY_KINDS = ['length', 'color', 'number', 'any', 'image', 'position', 'size', 'var']
for (const root in DATA.roots) {
    const [arbitrary, derived] = DATA.roots[root] as [ArbitrarySpec | ReadonlyArray<ArbitrarySpec | null> | null, ReadonlyArray<readonly [number, number, number]> | 0]
    const familyTemplate = (j: number) => templates[families[root][j][0]]
    if (derived) {
        for (const [j, x, lit] of derived) {
            for (const pair of DATA.lits[lit].split('|')) {
                const eq = pair.indexOf('=')
                explicit[`${root}-${pair.slice(0, eq)}`] = deriveRule(familyTemplate(j), x, pair.slice(eq + 1))
            }
        }
    }
    if (arbitrary === null) continue
    const one = (spec: ArbitrarySpec): number =>
        typeof spec === 'number' ? tplBase + spec : templates.push(deriveRule(familyTemplate(spec[0]), spec[1], DATA.vals[spec[2]])) - 1
    if (typeof arbitrary === 'number' || arbitrary.length === 3) arbitraryTemplates[root] = one(arbitrary as ArbitrarySpec)
    else {
        const kinds: Record<string, number> = {}
        arbitrary.forEach((spec, i) => {
            if (spec !== null) kinds[ARBITRARY_KINDS[i]] = one(spec as ArbitrarySpec)
        })
        arbitraryTemplates[root] = kinds
    }
    const hints = DATA.hints[root]
    if (hints) hintTemplates[root] = Object.fromEntries(Object.entries(hints).map(([hint, spec]) => [hint, one(spec)]))
}
for (const name in DATA.explicit) explicit[name] = decodeRule(DATA.explicit[name])
const valueSetCache: Array<Set<string> | undefined> = []
/** Bộ giá trị `a b c`; `@--color-` là mọi khoá của namespace đó trong theme mặc định. Không gồm dấu `#...`. */
const valueSet = (index: number): Set<string> => {
    const text = DATA.valueSets[index]
    if (text[0] !== '@') return (valueSetCache[index] ||= new Set(text.split(' ').filter((v) => v[0] !== '#')))
    const ns = text.slice(1)
    return (valueSetCache[index] ||= new Set(Object.keys(defaultTheme).filter((k) => k.startsWith(ns) && !k.slice(ns.length).includes('--')).map((k) => k.slice(ns.length))))
}
// Số viết chuẩn như Tailwind (`String(Number(v)) === v`): `z-01`, `p-1.50`, `p-.5` không hợp lệ.
const canonicalNumber = (v: string) => /^\d+(\.\d+)?$/.test(v) && String(Number(v)) === v
/** Giá trị trần theo loại (dấu trong bộ giá trị, dò từ Tailwind khi sinh dữ liệu). */
const BARE_TESTS: Record<string, (v: string) => boolean> = {
    '#int': (v) => canonicalNumber(v) && Number.isInteger(Number(v)),
    '#pint': (v) => canonicalNumber(v) && Number.isInteger(Number(v)) && Number(v) > 0,
    '#q': (v) => canonicalNumber(v) && Number.isInteger(Number(v) * 4),
    '#num': canonicalNumber,
    '#frac': (v) => /^\d+\/\d+$/.test(v) && v.split('/').every(canonicalNumber),
}
const bareKindCache: Array<string[] | undefined> = []
const bareKinds = (index: number): string[] =>
    (bareKindCache[index] ||= DATA.valueSets[index][0] === '@' ? [] : DATA.valueSets[index].split(' ').filter((v) => v[0] === '#'))
/** Bộ giá trị thứ `index` nhận `value`: giá trị liệt kê hoặc giá trị trần đúng loại (`z-1`, `opacity-64`, `aspect-3/7`). */
const acceptsValue = (index: number, value: string): boolean =>
    index === -1 ? BARE_TESTS['#q'](value) : valueSet(index).has(value) || bareKinds(index).some((kind) => BARE_TESTS[kind](value))
/** Bảng thứ tự thuộc tính của Tailwind (getClassOrder). */
const ORDER_PROPERTIES = DATA.props.slice(0, TW_ORDER.properties)
/** @property, dự phòng (trình duyệt chưa hỗ trợ @property) và keyframes Tailwind cần (base CSS của phương ngữ). */
const PROPERTIES_CSS = (() => {
    const list = DATA.properties.map((entry) => (typeof entry === 'string' ? [entry] : entry)) as Array<readonly [string, string?, number?]>
    return [
        ...list.map(([name, initial, syntax]) => `@property --tw-${name} { syntax: "${DATA.syntaxes[syntax || 0]}"; inherits: false;${initial === undefined ? '' : ` initial-value: ${initial};`} }`),
        DATA.fallback[0] + list.map(([name, initial]) => `--tw-${name}:${initial ?? 'initial'}`).join(';') + DATA.fallback[1],
        ...DATA.keyframes,
    ].join('\n')
})()

// ---------------------------------------------------------------------------
// Tra rule của phần gốc (không biến thể)
// ---------------------------------------------------------------------------

// Rule nén: [chỉ số selector, ...chỉ số khai báo]; `map` thay {v}/{f}/{a} trong giá trị.
const unpack = (packed: readonly number[], map: (text: string) => string = (t) => t): Rule => ({
    sel: sels[packed[0]],
    decls: packed.slice(1).map((index) => {
        const text = declTable[index]
        const colon = text.indexOf(':')
        // `{v}` có thể nằm cả trong tên property (`mask-{v}: no-{v}`, `--tw-divide-{v}`).
        return [map(text.slice(0, colon)), map(text.slice(colon + 1))] as [string, string]
    }),
})

const spacedFraction = (value: string) => value.replace('/', ' / ')
// Tailwind rút gọn `calc(var(--spacing) * 0)` -> `0px` và `* 1` -> `var(--spacing)`; làm y hệt để
// cả biến `--tw-*` (không được trình duyệt tính lại) cũng khớp.
const fill = (template: string, value: string) =>
    template
        .split('calc(var(--spacing) * {v})').join(value === '0' ? '0px' : value === '1' ? 'var(--spacing)' : 'calc(var(--spacing) * {v})')
        .split('{v}').join(value)
        .split('{f}').join(spacedFraction(value))

// Giá trị tuỳ ý theo quy ước Tailwind: `_` là khoảng trắng, `\_` giữ gạch dưới; trong calc/min/
// max/clamp thêm khoảng trắng quanh `+` `-` như Tailwind (`calc(100%-2rem)` -> `calc(100% - 2rem)`).
const MATH_FUNCTION = /(calc|min|max|clamp)\(/
const spaceMathOperators = (value: string) => {
    if (!MATH_FUNCTION.test(value)) return value
    let out = ''
    let depth = 0
    for (let i = 0; i < value.length; i++) {
        const ch = value[i]
        if (ch === '(') depth++
        else if (ch === ')') depth--
        const prev = value[i - 1] ?? ''
        const next = value[i + 1] ?? ''
        if (depth > 0 && (ch === '+' || ch === '-') && /[\w%)]/.test(prev) && /[\w(.]/.test(next)) {
            // Toán tử khi phía trước là `)` hoặc một số (có đơn vị: `1lh`, `100%`); trong tên (`safe-area-inset`,
            // `--x-y`) và số mũ (`1e+3`) thì không.
            let start = i
            while (start > 0 && /[\w.%-]/.test(value[start - 1])) start--
            const word = value.slice(start, i)
            if (prev === ')' || (/^-?[\d.]/.test(word) && !/^-?[\d.]+e$/i.test(word))) {
                out += ` ${ch} `
                continue
            }
        }
        out += ch
    }
    return out.replace(/\s+/g, ' ')
}
const underscoreToSpace = (raw: string) => raw.replace(/\\_/g, '\u0000').replace(/_/g, ' ').replace(/\u0000/g, '_')

/** `5` -> `5%`, `[0.05]` -> `5%`, `[5%]` -> `5%`, `(--x)` -> `var(--x)`; null nếu không hợp lệ (như Tailwind: bội 0.25). */
const alphaOf = (modifier: string): string | null => {
    const arbitrary = modifier.match(/^\[(.+)\]$/)
    if (arbitrary) return NUMBER_VALUE.test(arbitrary[1]) ? `${Number(arbitrary[1]) * 100}%` : arbitrary[1]
    const variable = modifier.match(/^\((--[\w-]+)\)$/)
    if (variable) return `var(${variable[1]})`
    return BARE_TESTS['#q'](modifier) ? `${modifier}%` : null
}
const mixAlpha = (color: string, alpha: string) => `color-mix(in oklab, ${color} ${alpha}, transparent)`

/**
 * Hàm lúc build của Tailwind trong giá trị tuỳ ý: `--spacing(3)` -> `calc(var(--spacing) * 3)`,
 * `--alpha(red / 50%)` -> `color-mix(...)`, `--theme(--color-black/4%)` -> `color-mix(in oklab, var(--color-black) 4%, transparent)`,
 * `--theme(--x, dự phòng)`. Null khi `--theme()` đọc biến không có trong theme mà không có dự phòng (Tailwind bỏ class).
 */
const expandValueThemeFunctions = (value: string): string | null => {
    if (!value.includes('--')) return value
    let out: string | null = replaceCssFunction(value, '--spacing', (args) => {
        const inner = expandValueThemeFunctions(args.trim())
        if (inner === null) return null
        return inner === '0' ? '0px' : inner === '1' ? 'var(--spacing)' : `calc(var(--spacing) * ${inner})`
    })
    if (out === null) return null
    out = replaceCssFunction(out, '--alpha', (args) => {
        const inner = expandValueThemeFunctions(args)
        const parts = inner === null ? [] : splitTopLevel(inner, '/')
        const alpha = parts[1] && (NUMBER_VALUE.test(parts[1]) ? `${Number(parts[1]) * 100}%` : parts[1])
        return parts.length === 2 && alpha ? mixAlpha(parts[0], alpha) : null
    })
    if (out === null) return null
    return replaceCssFunction(out, '--theme', (args) => {
        const [head, ...rest] = splitTopLevel(args)
        const fallback = rest.length ? expandValueThemeFunctions(rest.join(', ')) : undefined
        const [name, alphaText] = splitTopLevel(head, '/')
        if (!/^--[\w.-]+$/.test(name) || fallback === null) return null
        const alpha = alphaText === undefined ? null : NUMBER_VALUE.test(alphaText) ? `${Number(alphaText) * 100}%` : alphaText
        const ref = theme[name] !== undefined ? (fallback === undefined ? `var(${name})` : `var(${name}, ${fallback})`) : fallback
        if (ref === undefined) return null
        return alpha ? mixAlpha(ref, alpha) : ref
    })
}
/** Giá trị tuỳ ý theo quy ước Tailwind (`_` là khoảng trắng, hàm `--spacing()`/`--theme()`/`--alpha()`, khoảng trắng quanh `+`/`-`). */
const decodeArbitrary = (raw: string): string | null => {
    const expanded = expandValueThemeFunctions(underscoreToSpace(raw))
    return expanded === null ? null : spaceMathOperators(expanded)
}

const COLOR_VALUE = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\(.*\)|currentcolor|transparent|var\(--color-[\w-]+\))$/i
const LENGTH_VALUE = /^(-?(\d*\.)?\d+(px|r?em|%|vh|vw|dvh|dvw|svh|svw|lvh|lvw|vmin|vmax|ch|ex|lh|rlh|cm|mm|in|pt|pc|cq[whib]|cqmin|cqmax)|0|(calc|min|max|clamp)\(.*\))$/i
const NUMBER_VALUE = /^-?(\d*\.)?\d+$/
// Như `inferDataType` của Tailwind: ảnh (url()/gradient, cả danh sách nhiều lớp), vị trí và kích thước nền.
const IMAGE_FUNCTION = /^(url|element|image|cross-fade|image-set|(repeating-)?(conic|linear|radial)-gradient)\(/i
const isImageValue = (value: string) => {
    let count = 0
    for (const part of splitTopLevel(value)) {
        if (part.startsWith('var(')) continue
        if (!IMAGE_FUNCTION.test(part)) return false
        count++
    }
    return count > 0
}
// Độ dài/phần trăm như Tailwind khi đoán vị trí/kích thước: phải có đơn vị (`0` không phải độ dài).
const STRICT_LENGTH = /^(-?(\d*\.)?\d+(px|r?em|%|vh|vw|dvh|dvw|svh|svw|lvh|lvw|vmin|vmax|vi|vb|ch|ex|cap|ic|lh|rlh|cm|mm|q|in|pt|pc|cq[whib]|cqmin|cqmax)|(calc|min|max|clamp|--spacing)\(.*\))$/i
const isPositionValue = (value: string) => {
    let count = 0
    for (const part of splitTopLevel(value, ' ')) {
        if (part.startsWith('var(')) continue
        if (!/^(center|top|right|bottom|left)$/.test(part) && !STRICT_LENGTH.test(part)) return false
        count++
    }
    return count > 0
}
const isSizeValue = (value: string) => {
    let count = 0
    for (const size of splitTopLevel(value)) {
        if (size === 'cover' || size === 'contain') {
            count++
            continue
        }
        const values = splitTopLevel(size, ' ')
        if (values.length !== 1 && values.length !== 2) return false
        if (values.every((v) => v === 'auto' || STRICT_LENGTH.test(v))) count++
    }
    return count > 0
}
// Gợi ý kiểu `[kiểu:giá trị]` như bộ đọc class của Tailwind (mọi tên chữ thường).
const TYPE_HINT = /^([a-z-]+):(.*)$/
// Gợi ý kiểu -> loại (khớp HINT_KIND trong scripts/gen-tailwind-map.mjs); gợi ý có mẫu riêng nằm trong `hintTemplates`.
const HINT_KIND: Record<string, string> = { color: 'color', number: 'number', integer: 'number', length: 'length', percentage: 'length', 'line-width': 'length', url: 'image', image: 'image', position: 'position', 'bg-size': 'size', size: 'size' }

const arbitraryKind = (value: string): { kind: string; value: string; hint?: string } => {
    const hint = value.match(TYPE_HINT)
    if (hint) return { kind: HINT_KIND[hint[1]] ?? 'any', value: hint[2], hint: hint[1] }
    // Như `inferDataType` của Tailwind: giá trị bắt đầu bằng `var(` không đoán loại (nhánh mặc định của họ).
    if (value.startsWith('var(')) return { kind: 'var', value }
    if (COLOR_VALUE.test(value)) return { kind: 'color', value }
    if (isImageValue(value)) return { kind: 'image', value }
    if (NUMBER_VALUE.test(value)) return { kind: 'number', value }
    if (LENGTH_VALUE.test(value)) return { kind: 'length', value }
    if (isPositionValue(value)) return { kind: 'position', value }
    if (isSizeValue(value)) return { kind: 'size', value }
    return { kind: 'any', value }
}

const splitRoots = (name: string): Array<[string, string]> => {
    const negative = name.startsWith('-') ? '-' : ''
    const body = negative ? name.slice(1) : name
    const out: Array<[string, string]> = []
    // Gốc dài trước: `border-t-red-500` thử `border-t-red` rồi `border-t`, `border`.
    for (let index = body.lastIndexOf('-'); index > 0; index = body.lastIndexOf('-', index - 1)) {
        out.push([negative + body.slice(0, index), body.slice(index + 1)])
    }
    return out
}

// Bóng đổ: biến màu/độ mờ của từng họ (`shadow-black` đặt `--tw-shadow-color`).
const SHADOW_FAMILIES: Record<string, { ns: string; target: string; color: string; alpha: string }> = {
    shadow: { ns: '--shadow-', target: '--tw-shadow', color: '--tw-shadow-color', alpha: '--tw-shadow-alpha' },
    'inset-shadow': { ns: '--inset-shadow-', target: '--tw-inset-shadow', color: '--tw-inset-shadow-color', alpha: '--tw-inset-shadow-alpha' },
    'text-shadow': { ns: '--text-shadow-', target: 'text-shadow', color: '--tw-text-shadow-color', alpha: '--tw-text-shadow-alpha' },
    'drop-shadow': { ns: '--drop-shadow-', target: '--tw-drop-shadow-size', color: '--tw-drop-shadow-color', alpha: '--tw-drop-shadow-alpha' },
}
const SHADOW_KEYWORD = /^(inset|inherit|initial|revert|unset)$/
const SHADOW_MATH = /^(calc|clamp|max|min|--spacing)$/
const SHADOW_COLOR_FUNCTION = /^(color(-mix)?|contrast-color|device-cmyk|hsla?|hwb|o?lab|o?lch|light-dark|rgba?|--alpha)$/
/**
 * Như `replaceShadowColors` của Tailwind 4.3: lớp bóng có ít nhất hai độ dài thì màu của lớp (`#...`, hàm màu, hoặc
 * phần lạ duy nhất như `red`, `var(--x)`) được bọc bằng `wrap`; lớp không có màu thì thêm `wrap(currentcolor)`.
 * Khác Tailwind (để gọn, không mang bảng tên màu): lớp có từ hai phần lạ trở lên (`var(--y) red`) giữ nguyên.
 */
const replaceShadowColors = (input: string, wrap: (color: string) => string): string =>
    splitTopLevel(input).map((shadow) => {
        const parts = splitTopLevel(shadow, ' ')
        let lengths = 0
        let unknown = 0
        let candidate = -1
        let replaced = -1
        for (let i = 0; i < parts.length && replaced === -1; i++) {
            const part = parts[i]
            const lower = part.toLowerCase()
            const fn = lower.match(/^([\w-]+)\(/)
            if (fn) {
                if (SHADOW_COLOR_FUNCTION.test(fn[1])) replaced = i
                else if (SHADOW_MATH.test(fn[1])) lengths++
                else {
                    candidate = i
                    unknown++
                }
                continue
            }
            if (SHADOW_KEYWORD.test(lower)) continue
            if (/^-?(\d+|\.\d+)/.test(lower)) lengths++
            else if (part[0] === '#') replaced = i
            else {
                candidate = i
                unknown++
            }
        }
        if (replaced === -1) {
            if (lengths < 2) return shadow
            if (unknown === 0) return `${shadow} ${wrap('currentcolor')}`
            if (unknown !== 1) return shadow
            replaced = candidate
        }
        return parts.map((part, i) => (i === replaced ? wrap(part) : part)).join(' ')
    }).join(', ')

/** Bóng tuỳ ý (`shadow-[4px_4px_0_0]`): màu vào `var(--tw-shadow-color, …)`; inset/drop-shadow áp cho từng lớp. */
const shadowArbitrary = (root: string, template: readonly number[], raw: string): Rule => {
    const family = SHADOW_FAMILIES[root]
    const layers = splitTopLevel(replaceShadowColors(raw, (color) => `var(${family.color}, ${color})`))
    return unpack(template, (t) => {
        if (t === 'drop-shadow({a})') return layers.map((layer) => `drop-shadow(${layer})`).join(' ')
        if (t === 'inset {a}') return layers.map((layer) => `inset ${layer}`).join(', ')
        return t.split('{a}').join(layers.join(', '))
    })
}

/** Mẫu giá trị tuỳ ý đặt `{a}` vào thuộc tính màu (`background-color`, `fill`, `--tw-shadow-color`, `--tw-gradient-from`...). */
const COLOR_PROPERTY = /(^|-)color$|^(fill|stroke)$|^--tw-gradient-(from|via|to)$|^--tw-scrollbar-(thumb|track)$/
const isColorTemplate = (index: number) => templates[index].slice(1).some((i) => {
    const text = declTable[i]
    const colon = text.indexOf(':')
    return COLOR_PROPERTY.test(text.slice(0, colon)) && text.includes('{a}', colon)
})

/**
 * Phần gốc (không biến thể) -> rule. `modifier` (`/50`, `/6`, `/(--x)`) áp như Tailwind: độ mờ của màu (cả màu
 * tuỳ ý `bg-[red]/50`), line-height của cỡ chữ, độ mờ của bóng.
 */
const resolveBase = (name: string, modifier: string | null = null): Rule | null => {
    const done = (rule: Rule | null): Rule | null => (rule && modifier !== null ? applyModifier(rule, modifier) : rule)
    const direct = explicit[name]
    if (direct) return done(unpack(direct))

    // Thuộc tính tuỳ ý: `[mask-type:luminance]`, `[--x:--spacing(2)]`.
    const property = name.match(/^\[([a-z-]+):(.+)\]$/)
    if (property) {
        const value = decodeArbitrary(property[2])
        return value === null || modifier !== null ? null : { sel: '', decls: [[property[1], value]] }
    }

    for (const [root, value] of splitRoots(name)) {
        // Giá trị tuỳ ý `bg-[...]` và theo biến CSS kiểu Tailwind v4 `bg-(--brand)`, `border-(length:--w)`.
        const arbitrary = value.match(/^\[(.+)\]$/)
        const variable = arbitrary ? null : value.match(/^\((?:([a-z-]+):)?(--[\w-]+)\)$/)
        if (arbitrary || variable) {
            const options = arbitraryTemplates[root]
            if (options === undefined) continue
            let kind: string
            let raw: string
            let hint: string | undefined
            if (arbitrary) {
                const decoded = decodeArbitrary(arbitrary[1])
                if (decoded === null) return null
                ;({ kind, value: raw, hint } = arbitraryKind(decoded))
            } else {
                const [, typeHint, name] = variable as RegExpMatchArray
                hint = typeHint
                // Không gợi ý kiểu: Tailwind không đoán loại của `var()`, dùng nhánh mặc định của utility.
                kind = hint ? HINT_KIND[hint] ?? 'any' : 'var'
                raw = `var(${name})`
            }
            const hinted = hint === undefined ? undefined : hintTemplates[root]?.[hint]
            const index = hinted ?? (typeof options === 'number' ? options : options[kind] ?? options.any ?? options.length)
            if (index === undefined) continue
            const isColor = isColorTemplate(index)
            if (SHADOW_FAMILIES[root] && !isColor) return done(shadowArbitrary(root, templates[index], raw))
            // Màu tuỳ ý + độ mờ: `bg-[red]/50` -> `color-mix(in oklab, red 50%, transparent)`.
            if (modifier !== null && isColor) {
                const alpha = alphaOf(modifier)
                if (!alpha) return null
                const mixed = mixAlpha(raw, alpha)
                return unpack(templates[index], (t) => t.split('{a}').join(mixed))
            }
            return done(unpack(templates[index], (t) => t.split('{a}').join(raw)))
        }
        const entries = families[root]
        if (!entries) continue
        // Giá trị liệt kê trước giá trị trần: Tailwind viết `mask-linear-45` là `45deg` nhưng số trần là `calc(1deg * 37)`.
        const ordered = [...entries.filter(([, set]) => set !== -1 && valueSet(set).has(value)), ...entries]
        for (const [templateIndex, setIndex] of ordered) {
            // Giá trị trong `--spacing-*` (`p-gutter`, `p-18` từ cấu hình): Tailwind ưu tiên `var(--spacing-x)` trước hệ số.
            if (theme[`--spacing-${value}`] !== undefined && /var\(--spacing\) \* -?\{v\}/.test(templates[templateIndex].slice(1).map((i) => declTable[i]).join(';'))) {
                const named = `var(--spacing-${value})`
                return done(unpack(templates[templateIndex], (t) => t
                    .replace(/calc\(var\(--spacing\) \* -\{v\}\)/g, `calc(${named} * -1)`)
                    .replace(/calc\(var\(--spacing\) \* \{v\}\)/g, named)
                    .split('{v}').join(value)))
            }
            let accepted = acceptsValue(setIndex, value)
            // Namespace bị thay (`--color-*: initial`): giá trị mặc định không còn (`bg-red-500`).
            if (accepted && RESET_NAMESPACES.length) {
                const prefixes = templatePrefixes(templateIndex)
                if (prefixes.some((prefix) => RESET_NAMESPACES.some((ns) => prefix.startsWith(ns)) && theme[prefix + value] === undefined)) accepted = false
            }
            if (accepted) return done(unpack(templates[templateIndex], (t) => fill(t, value)))
        }
        if (theme !== defaultTheme) {
            const shadow = themeShadow(name)
            if (shadow) return done(shadow)
            for (const [templateIndex] of entries) {
                const prefixes = templatePrefixes(templateIndex)
                if (prefixes.length && prefixes.every((prefix) => theme[prefix + value] !== undefined)) {
                    const rule = unpack(templates[templateIndex], (t) => fill(t, value))
                    // `text-hero` khi theme không có `--text-hero--line-height`: Tailwind bỏ khai báo đó.
                    rule.decls = rule.decls.filter(([, v]) => [...v.matchAll(/var\((--[\w.-]+--[\w-]+)\)/g)].every((m) => theme[m[1]] !== undefined))
                    // `fontSize: ['3.5rem', { letterSpacing, fontWeight }]`: Tailwind thêm hai khai báo này.
                    if (prefixes.includes('--text-')) {
                        if (theme[`--text-${value}--letter-spacing`] !== undefined) rule.decls.push(['letter-spacing', `var(--tw-tracking, var(--text-${value}--letter-spacing))`])
                        if (theme[`--text-${value}--font-weight`] !== undefined) rule.decls.push(['font-weight', `var(--tw-font-weight, var(--text-${value}--font-weight))`])
                    }
                    return done(rule)
                }
            }
        }
    }
    return null
}

// Bóng đổ từ theme (`--shadow-soft`): Tailwind nhúng giá trị và bọc từng màu trong
// `var(--tw-shadow-color, màu)` thay vì đọc `var(--shadow-soft)`. Dựng lại từ rule `*-sm` làm mẫu.
const COLOR_TOKEN = /(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color)\([^()]*\)|#[0-9a-fA-F]{3,8}\b|\b(?:black|white|transparent|currentcolor)\b/gi
const themeShadow = (name: string): Rule | null => {
    const match = name.match(/^(shadow|inset-shadow|text-shadow|drop-shadow)-(.+)$/)
    if (!match) return null
    const family = SHADOW_FAMILIES[match[1]]
    const value = theme[family.ns + match[2]]
    const reference = explicit[`${match[1]}-sm`]
    if (value === undefined || !reference) return null
    const wrap = (text: string) => text.replace(COLOR_TOKEN, (color) => `var(${family.color}, ${color})`)
    const rule = unpack(reference)
    rule.decls = rule.decls.map(([prop, current]): [string, string] => {
        if (prop === family.target) {
            if (match[1] === 'drop-shadow') return [prop, splitTopLevel(value).map((part) => `drop-shadow(${wrap(part)})`).join(' ')]
            return [prop, splitTopLevel(value).map(wrap).join(', ')]
        }
        // Giống Tailwind 4.3: `drop-shadow(var(--drop-shadow-x))`. Với giá trị nhiều lớp, Tailwind sinh
        // `drop-shadow(a, b)` không hợp lệ (filter: none); giữ nguyên hành vi để khớp.
        if (match[1] === 'drop-shadow' && prop === '--tw-drop-shadow') return [prop, `drop-shadow(var(${family.ns}${match[2]}))`]
        return [prop, current]
    })
    return rule
}

/** Thay mọi `var(--tw-x-color, MÀU)` (ngoặc cân) trong `value` bằng `var(--tw-x-color, fn(MÀU))`. */
const mapShadowColorVars = (value: string, colorVar: string, fn: (color: string) => string): string => {
    const head = `var(${colorVar}, `
    let out = ''
    let i = 0
    for (let at = value.indexOf(head); at !== -1; at = value.indexOf(head, i)) {
        let depth = 1
        let k = at + 4
        while (k < value.length && depth > 0) {
            if (value[k] === '(') depth++
            else if (value[k] === ')') depth--
            k++
        }
        out += value.slice(i, at) + head + fn(value.slice(at + head.length, k - 1)) + ')'
        i = k
    }
    return out + value.slice(i)
}

// `bg-red-500/50` (độ mờ màu), `text-sm/6` (line-height), `shadow-sm/5` (độ mờ bóng).
const applyModifier = (rule: Rule, modifier: string): Rule | null => {
    const arbitrary = modifier.match(/^\[(.+)\]$/)
    if (rule.decls.some(([prop]) => prop === 'font-size')) {
        // Như Tailwind: `[x]`, `(--x)`, bội 0.25 của spacing, `none` = 1, khoá `--leading-*` của theme.
        const variable = modifier.match(/^\((--[\w-]+)\)$/)
        const lineHeight = arbitrary ? decodeArbitrary(arbitrary[1])
            : variable ? `var(${variable[1]})`
            : BARE_TESTS['#q'](modifier) ? `calc(var(--spacing) * ${modifier})`
            : modifier === 'none' ? '1'
            : theme[`--leading-${modifier}`] !== undefined ? `var(--leading-${modifier})` : null
        if (!lineHeight) return null
        const decls = rule.decls.map(([p, v]): [string, string] => [p, p === 'line-height' ? lineHeight : v])
        if (!decls.some(([p]) => p === 'line-height')) decls.push(['line-height', lineHeight])
        return { sel: rule.sel, decls }
    }
    const percent = alphaOf(modifier)
    if (!percent) return null
    // Bóng có sẵn/tuỳ ý: `--tw-shadow-alpha: 5%`, màu `oklab(from MÀU l a b / 5%)` (currentcolor: color-mix) như Tailwind.
    const family = Object.values(SHADOW_FAMILIES).find((f) => rule.decls.some(([prop]) => prop === f.target))
    if (family) {
        const decls = rule.decls.map(([prop, value]): [string, string] => [prop, prop !== family.target ? value : mapShadowColorVars(value, family.color, (color) =>
            color.toLowerCase() === 'currentcolor' ? mixAlpha(color, percent) : `oklab(from ${color} l a b / ${percent})`)])
        // `drop-shadow-sm/5`: Tailwind đọc lại kích thước đã đổi màu thay vì `drop-shadow(var(--drop-shadow-sm))`.
        const final = family.alpha === '--tw-drop-shadow-alpha' ? decls.map(([prop, value]): [string, string] => [prop, prop === '--tw-drop-shadow' ? 'var(--tw-drop-shadow-size)' : value]) : decls
        return { sel: rule.sel, decls: [[family.alpha, arbitrary ? arbitrary[1] : percent], ...final] }
    }
    let changed = false
    const decls = rule.decls.map(([prop, value]): [string, string] => {
        // Màu dự phòng của biến màu (`var(--tw-ring-color, currentcolor)` của `ring-2`) không phải màu của class:
        // Tailwind không nhận `ring-2/50`.
        const fallbacks: string[] = []
        const masked = value.replace(/var\(--tw-[\w-]*color, (?:var\(--color-[\w-]+\)|currentcolor|#[0-9a-fA-F]{3,8})\)/g, (m) => `\u0000${fallbacks.push(m) - 1}\u0000`)
        const next = masked.replace(/var\(--color-[\w-]+\)|currentcolor|#[0-9a-fA-F]{3,8}\b/g, (color) => {
            changed = true
            return mixAlpha(color, percent)
        })
        return [prop, next.replace(/\u0000(\d+)\u0000/g, (_, i) => fallbacks[Number(i)])]
    })
    return changed ? { sel: rule.sel, decls } : null
}

// ---------------------------------------------------------------------------
// Biến thể
// ---------------------------------------------------------------------------

const PSEUDO_CLASSES: Record<string, string> = {
    hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible', 'focus-within': ':focus-within', active: ':active',
    visited: ':visited', target: ':target', first: ':first-child', last: ':last-child', only: ':only-child',
    odd: ':nth-child(odd)', even: ':nth-child(even)', 'first-of-type': ':first-of-type', 'last-of-type': ':last-of-type',
    'only-of-type': ':only-of-type', empty: ':empty', disabled: ':disabled', enabled: ':enabled', checked: ':checked',
    indeterminate: ':indeterminate', default: ':default', optional: ':optional', required: ':required', valid: ':valid',
    invalid: ':invalid', 'user-valid': ':user-valid', 'user-invalid': ':user-invalid', 'in-range': ':in-range',
    'out-of-range': ':out-of-range', 'placeholder-shown': ':placeholder-shown', autofill: ':autofill',
    'read-only': ':read-only', open: ':is([open], :popover-open, :open)', inert: ':is([inert], [inert] *)',
}
const PSEUDO_ELEMENTS: Record<string, string> = {
    before: '::before', after: '::after', placeholder: '::placeholder', file: '::file-selector-button',
    marker: '::marker', selection: '::selection', 'first-line': '::first-line', 'first-letter': '::first-letter',
    backdrop: '::backdrop', 'details-content': '::details-content',
}

/**
 * Breakpoint mặc định khi theme thay hẳn `--breakpoint-*` (`screens` của cấu hình v3): như Tailwind, biến thể
 * `sm`...`2xl` vẫn chạy với giá trị cũ nhưng không có giá trị theme (khi sắp thứ tự coi như null).
 */
let GHOST_BREAKPOINTS: Record<string, string> = {}
const breakpointValue = (key: string) => theme[`--breakpoint-${key}`] ?? GHOST_BREAKPOINTS[key]
const MEDIA_FEATURES: Record<string, string> = {
    dark: '(prefers-color-scheme: dark)',
    print: 'print',
    'motion-safe': '(prefers-reduced-motion: no-preference)',
    'motion-reduce': '(prefers-reduced-motion: reduce)',
    portrait: '(orientation: portrait)',
    landscape: '(orientation: landscape)',
    'contrast-more': '(prefers-contrast: more)',
    'contrast-less': '(prefers-contrast: less)',
    'forced-colors': '(forced-colors: active)',
    'inverted-colors': '(inverted-colors: inverted)',
    noscript: '(scripting: none)',
    'pointer-none': '(pointer: none)',
    'pointer-coarse': '(pointer: coarse)',
    'pointer-fine': '(pointer: fine)',
    'any-pointer-none': '(any-pointer: none)',
    'any-pointer-coarse': '(any-pointer: coarse)',
    'any-pointer-fine': '(any-pointer: fine)',
}
const HOVER_MEDIA = '(hover: hover)'

/** Điều kiện media của một biến thể (null nếu không phải biến thể media). */
const mediaOf = (variant: string, darkMode: 'media' | 'class'): string | null => {
    const min = variant.replace(/^min-/, '')
    if (RESPONSIVE.includes(min)) return `(width >= ${breakpointValue(min)})`
    const max = variant.match(/^max-(.+)$/)
    if (max && RESPONSIVE.includes(max[1]) && !GHOST_BREAKPOINTS[max[1]]) return `(width < ${breakpointValue(max[1])})`
    if (variant === 'dark' && darkMode === 'class') return null
    return MEDIA_FEATURES[variant] ?? null
}
const mediaKeyOf = (variant: string) => (variant.startsWith('min-') && RESPONSIVE.includes(variant.slice(4)) ? variant.slice(4) : variant)

// Media key đăng ký trước với engine theo thứ tự cascade của Tailwind (max-* giảm dần, rồi sm..2xl),
// cộng container query (@sm..@7xl) và tổ hợp hay dùng. Một class x-css chỉ mang một media key.
const registeredKeys = new Set<string>()
/** Điều kiện của từng media key (`md` -> `(width >= 48rem)`), dùng khi gộp ≥3 điều kiện hoặc cho `@apply`. */
const MEDIA_QUERY = new Map<string, string>()
/** Biến thể tự định nghĩa của dialect đang hoạt động. */
let CUSTOM_VARIANTS: Record<string, string[][]> = {}
/** Chỗ giữ giá trị/modifier trong thân biến thể hàm `name-*` (`matchVariant` của plugin JS, xem tailwind-plugin-api). */
const VARIANT_VALUE_PLACEHOLDER = '__porbit_variant_value__'
const VARIANT_MODIFIER_PLACEHOLDER = '__porbit_variant_modifier__'
/** Biến thể hàm của dialect đang hoạt động: [gốc, thân không modifier, thân có modifier (null: không nhận modifier)], gốc dài trước. */
let FUNCTIONAL_VARIANTS: Array<[string, string, string | null]> = []
/**
 * Biến thể tự định nghĩa theo tên, kể cả biến thể hàm với giá trị tuỳ ý (`tab-[2]`, `tab-[2]/x` của `matchVariant`):
 * thay giá trị (đã đổi `_` thành khoảng trắng như Tailwind) vào thân rồi dịch như `@custom-variant` (lưu lại theo tên).
 */
const customVariant = (name: string): string[][] | undefined => {
    if (CUSTOM_VARIANTS[name]) return CUSTOM_VARIANTS[name]
    for (const [root, body, withModifier] of FUNCTIONAL_VARIANTS) {
        if (!name.startsWith(root + '-[')) continue
        const [head, modifier] = splitModifier(name.slice(root.length + 1))
        const template = modifier === null ? body : withModifier
        if (!/^\[.+\]$/.test(head) || template === null) return
        const mod = modifier === null ? '' : arbitraryInner(modifier.replace(/^\[(.+)\]$/, '$1'))
        const compiled = compileCustomVariant(template.split(VARIANT_VALUE_PLACEHOLDER).join(arbitraryInner(head.slice(1, -1))).split(VARIANT_MODIFIER_PLACEHOLDER).join(mod))
        return compiled ? (CUSTOM_VARIANTS[name] = compiled) : undefined
    }
}
/** Tiền tố class đã escape cho selector (`tw\:`) của dialect đang hoạt động: `group`/`peer` thành `.tw\:group`. */
let MARKER_PREFIX = ''
const buildBreakpoints = (darkMode: 'media' | 'class') => {
    const singles: Array<[string, string]> = []
    for (const key of [...RESPONSIVE].reverse()) singles.push([`max-${key}`, `(width < ${breakpointValue(key)})`])
    for (const key of RESPONSIVE) singles.push([key, `(width >= ${breakpointValue(key)})`])
    const features = Object.entries(MEDIA_FEATURES).filter(([key]) => !(key === 'dark' && darkMode === 'class'))
    const all: Array<[string, string]> = [...singles, ...features, ['hover', HOVER_MEDIA]]
    const combos = ['hover', 'dark', 'motion-safe', 'motion-reduce', 'print'].filter((k) => !(k === 'dark' && darkMode === 'class'))
    for (const [key, query] of singles) {
        for (const extra of combos) all.push([`${key}+${extra}`, `${query} and ${extra === 'hover' ? HOVER_MEDIA : MEDIA_FEATURES[extra]}`])
    }
    if (darkMode === 'media') all.push(['dark+hover', `${MEDIA_FEATURES.dark} and ${HOVER_MEDIA}`])
    RESPONSIVE.forEach((min, i) => RESPONSIVE.slice(i + 1).forEach((max) => {
        all.push([`${min}+max-${max}`, `(width >= ${breakpointValue(min)}) and (width < ${breakpointValue(max)})`])
    }))
    // Container query: query bắt đầu bằng `@` nên engine bọc rule trong at-rule, vẫn giữ thứ tự sheet.
    // Tên key không chứa `@` (x-css dùng `@` cuối cùng làm điểm bắt đầu selector): `c-md`, `c-max-md`.
    for (const size of [...CONTAINER_SIZES].reverse()) all.push([`c-max-${size}`, `@container (width < ${theme[`--container-${size}`]})`])
    for (const size of CONTAINER_SIZES) all.push([`c-${size}`, `@container (width >= ${theme[`--container-${size}`]})`])
    all.forEach(([key, query]) => {
        registeredKeys.add(key)
        MEDIA_QUERY.set(key, query)
    })
    return all.map(([key, query]) => ({ [`tw-${key}`]: query }))
}

const arbitraryInner = (raw: string) => raw.replace(/\\_/g, '\u0000').replace(/_/g, ' ').replace(/\u0000/g, '_')

/**
 * Một phương án của biến thể "trạng thái": at-rule bọc ngoài (`@media (hover: hover)`) và selector tương đối
 * (`&` là phần tử: `&:hover`, `& :is(h1)`). `relative`: biến thể tuỳ ý bắt đầu bằng tổ hợp (`[>img]`).
 */
type StateAlt = { at: string[]; sel: string; relative?: boolean }

/**
 * `&` -> `*` khi selector của biến thể nằm trong `:has()`/`:where()`/`:not()` như Tailwind; `*` đứng trước
 * pseudo/thuộc tính/class bị bỏ khi in (`*:hover` -> `:hover`), còn trước khoảng trắng thì giữ (`* :is(h1)`).
 */
const starred = (sel: string) => splitTopLevel(sel).map((part) => part.replace(/&(?=[:.[#])/g, '').replace(/&/g, '*')).join(', ')

/** Phủ định at-rule cho `not-` như Tailwind: `@media (x)` -> `@media not (x)`, bỏ `not` có sẵn; null nếu không được. */
const negateAtRule = (rule: string): string | null => {
    const m = rule.match(/^@(media|supports|container)(?:\s+|(?=\())([\s\S]+)$/)
    if (!m || splitTopLevel(m[2]).length > 1) return null
    // `@container main (width > 1px)` -> `@container main not (...)`: tên container đứng trước điều kiện.
    const name = m[1] === 'container' ? m[2].match(/^(?!not\s)[\w-]+\s+(?=\(|not\s)/)?.[0] ?? '' : ''
    const rest = m[2].trim().slice(name.length)
    return `@${m[1]} ${name}${/^not\s/.test(rest) ? rest.replace(/^not\s+/, '') : `not ${rest}`}`
}

/**
 * Các phương án của một "trạng thái" dùng được một mình hoặc sau `not-`, `has-`, `in-`, `group-`, `peer-`
 * (null nếu không phải trạng thái): `hover` -> `@media (hover: hover)` + `&:hover`, `[.x]` -> `&:is(.x)`,
 * `nth-3` -> `&:nth-child(3)`, biến thể tự định nghĩa nhiều bước (`@media` + selector) giữ nguyên at-rule.
 * Ghép như Tailwind: `group-`/`peer-` thay `&` bằng `:where(.group)`, `has-`/`in-`/`not-` thay `&` bằng `*`;
 * `not-` của biến thể có at-rule thành hai phương án (selector phủ định HOẶC at-rule phủ định).
 */
const stateAlternatives = (state: string): StateAlt[] | null => {
    const custom = customVariant(state)
    if (custom) {
        const alts: StateAlt[] = []
        for (const steps of custom) {
            const alt: StateAlt = { at: [], sel: '&' }
            for (const step of steps) {
                const inner = step.startsWith('[') && step.endsWith(']') ? arbitraryInner(step.slice(1, -1)) : null
                if (inner === null) return null
                if (inner.startsWith('@')) alt.at.push(inner)
                else if (inner.includes('&')) {
                    // Bước trong lồng trong bước ngoài: `&` của bước trong là selector của bước ngoài.
                    const outer = alt.sel
                    alt.sel = inner.replace(/&/g, () => outer)
                } else return null
            }
            // Phương án cùng at-rule gộp thành danh sách selector (`&:a, &:b`), như một rule của Tailwind.
            const same = alts.find((other) => other.at.join() === alt.at.join())
            if (same) same.sel += `, ${alt.sel}`
            else alts.push(alt)
        }
        return alts.length ? alts : null
    }
    if (state === 'hover') return [{ at: [`@media ${HOVER_MEDIA}`], sel: '&:hover' }]
    if (PSEUDO_CLASSES[state]) return [{ at: [], sel: '&' + PSEUDO_CLASSES[state] }]
    const arbitrary = state.match(/^\[(.+)\]$/)
    if (arbitrary) {
        const inner = arbitraryInner(arbitrary[1])
        if (inner.startsWith('@')) return [{ at: [inner], sel: '&' }]
        if (inner.includes('&')) return [{ at: [], sel: inner }]
        if (/^[>+~]/.test(inner)) return [{ at: [], sel: `&${inner}`, relative: true }]
        return [{ at: [], sel: `&:is(${inner})` }]
    }
    const nth = state.match(/^nth(-last)?(-of-type)?-(?:\[(.+)\]|(\d+))$/)
    if (nth) return [{ at: [], sel: `&:nth${nth[1] || ''}${nth[2] ? '-of-type' : '-child'}(${nth[3] ? arbitraryInner(nth[3]) : nth[4]})` }]
    const attr = state.match(/^(aria|data)-(?:\[(.+)\]|([a-z-]+))$/)
    if (attr) return [{ at: [], sel: `&[${attr[1]}-${attr[2] ? arbitraryInner(attr[2]) : attr[1] === 'aria' ? `${attr[3]}="true"` : attr[3]}]` }]
    if (state === 'ltr' || state === 'rtl') return [{ at: [], sel: `&:where(:dir(${state}), [dir="${state}"], [dir="${state}"] *)` }]
    // Quan hệ: `group-peer-hover` = .group đứng sau .peer đang hover; `in-hover` = nằm trong phần tử hover.
    const relation = state.match(/^(group|peer|in|has)-(.+?)(?:\/([\w-]+))?$/)
    if (relation) {
        const [, kind, innerState, name] = relation
        if (name && (kind === 'in' || kind === 'has')) return null
        const inner = stateAlternatives(innerState)
        // Như Tailwind: cần đúng một rule selector cho mỗi phương án (`group-not-hover`, `has-[@media...]` không hợp lệ).
        // Biến thể có giả phần tử (`::before`) không ghép được.
        if (!inner || inner.some((alt) => alt.sel === '&' || alt.sel.includes('::') || (alt.relative && kind !== 'has'))) return null
        const marker = `:where(.${MARKER_PREFIX}${name ? `${kind}\\/${name}` : kind})`
        return inner.map(({ at, sel, relative }) => {
            if (kind === 'has') return { at, sel: `&:has(${relative ? sel.slice(1) : starred(sel)})` }
            if (kind === 'in') return { at, sel: `:where(${starred(sel)}) &` }
            const list = splitTopLevel(sel).map((part) => part.replace(/&/g, marker))
            const target = list.length > 1 ? `:is(${list.join(', ')})` : list[0]
            return { at, sel: kind === 'group' ? `&:is(${target} *)` : `&:is(${target} ~ *)` }
        })
    }
    const not = state.match(/^not-(.+)$/)
    if (not) {
        const inner = stateAlternatives(not[1])
        if (!inner || inner.length !== 1) return null
        const [{ at, sel, relative }] = inner
        if (relative || at.length > 1 || sel.includes('::')) return null
        const out: StateAlt[] = []
        if (sel !== '&') out.push({ at: [], sel: `&:not(${starred(sel)})` })
        if (at.length) {
            const negated = negateAtRule(at[0])
            if (!negated) return null
            out.push({ at: [negated], sel: '&' })
        }
        return out.length ? out : null
    }
    return null
}

/** Biến thể at-rule không đăng ký trước: `supports-[...]`, `starting`, `@sm/main`. Trả key nội tuyến `[@...]`. */
const inlineAtRule = (variant: string): string | null => {
    const encode = (query: string) => `[${query.replace(/_/g, '\\_').replace(/\s+/g, '_')}]`
    if (variant === 'starting') return encode('@starting-style')
    const supports = variant.match(/^(not-)?supports-(?:\[(.+)\]|([a-z-]+))$/)
    if (supports) {
        const condition = supports[2] ? arbitraryInner(supports[2]) : `${supports[3]}: var(--tw)`
        const wrapped = /^[a-z-]+:/.test(condition) && !condition.startsWith('selector(') ? `(${condition})` : condition
        return encode(`@supports ${supports[1] ? 'not ' : ''}${wrapped}`)
    }
    const named = variant.match(/^@(min-|max-)?([\w]+)\/([\w-]+)$/)
    if (named && theme[`--container-${named[2]}`]) {
        return encode(`@container ${named[3]} (width ${named[1] === 'max-' ? '<' : '>='} ${theme[`--container-${named[2]}`]})`)
    }
    // `@[300px]`, `@min-[30rem]`, `@max-[300px]/main`: container query giá trị tuỳ ý (có thể kèm tên).
    const arbitrary = variant.match(/^@(min-|max-)?\[([^\]]+)\](?:\/([\w-]+))?$/)
    if (arbitrary) return encode(`@container ${arbitrary[3] ? arbitrary[3] + ' ' : ''}(width ${arbitrary[1] === 'max-' ? '<' : '>='} ${arbitraryInner(arbitrary[2])})`)
    return null
}

/**
 * Áp các biến thể lên selector `&...`. Trả null khi có biến thể chưa hỗ trợ.
 * Media: gom thành một key (`tw-md+hover`) vì mỗi class x-css chỉ mang một media/at-rule.
 */
const applyVariants = (variants: string[], baseSel: string, darkMode: 'media' | 'class', extraQuery?: string): { media: string; sel: string } | null => {
    let sel = baseSel.includes('&') ? baseSel : '&' + baseSel
    const media: string[] = []
    // Điều kiện media không có key đăng ký (`[@media_...]`, media riêng của rule): gộp bằng `and`.
    const queries: string[] = extraQuery ? [extraQuery] : []
    let inline = ''
    let pseudoElement = ''
    const atContainer = (v: string) => {
        const m = v.match(/^@(min-|max-)?([\w]+)$/)
        return m && CONTAINER_SIZES.includes(m[2]) ? `c-${m[1] === 'max-' ? 'max-' : ''}${m[2]}` : null
    }
    // Tailwind áp biến thể từ phải sang trái (biến thể gần class nhất trước).
    for (const variant of [...variants].reverse()) {
        if (mediaOf(variant, darkMode)) {
            media.push(mediaKeyOf(variant))
            continue
        }
        const container = atContainer(variant)
        if (container) {
            media.push(container)
            continue
        }
        const atRule = inlineAtRule(variant)
        if (atRule) {
            if (inline) return null
            inline = atRule
            continue
        }
        if (variant === 'dark') {
            sel = sel.replace('&', '&:where(.dark, .dark *)')
            continue
        }
        if (variant === 'hover') {
            media.push('hover')
            sel = sel.replace('&', '&:hover')
            continue
        }
        if (PSEUDO_ELEMENTS[variant]) {
            pseudoElement = PSEUDO_ELEMENTS[variant] + pseudoElement
            continue
        }
        if (variant === '*') {
            sel = sel.replace('&', ':is(& > *)')
            continue
        }
        if (variant === '**') {
            sel = sel.replace('&', ':is(& *)')
            continue
        }
        // `in-range`, `in-*`... : pseudo-class trùng tiền tố phải xét trước.
        if (PSEUDO_CLASSES[variant]) {
            sel = sel.replace('&', '&' + PSEUDO_CLASSES[variant])
            continue
        }
        // `not-dark`, `not-md`...: phủ định media -> `@media not (...)` (at-rule nội tuyến).
        const notMedia = variant.match(/^not-(.+)$/)
        // Biến thể tự định nghĩa cùng tên (`@custom-variant dark (&:is(.dark *))`) thắng media sẵn có.
        if (notMedia && !CUSTOM_VARIANTS[notMedia[1]] && mediaOf(notMedia[1], darkMode)) {
            if (inline) return null
            inline = `[${('@media not ' + mediaOf(notMedia[1], darkMode)).replace(/\s+/g, '_')}]`
            continue
        }
        // `not-@md`: `@container not (width >= 28rem)`.
        const notContainer = notMedia && atContainer(notMedia[1])
        if (notContainer) {
            if (inline) return null
            inline = encodeArbitrary((MEDIA_QUERY.get(notContainer) as string).replace(/^@container\s+/, '@container not '))
            continue
        }
        const arbitrary = variant.match(/^\[(.+)\]$/)
        if (arbitrary && arbitrary[1].includes('&')) {
            sel = sel.replace('&', arbitraryInner(arbitrary[1]))
            continue
        }
        const arbitraryMedia = arbitrary && arbitraryInner(arbitrary[1]).match(/^@media\s+(.+)$/)
        if (arbitraryMedia && !/^not\b/.test(arbitraryMedia[1])) {
            queries.push(arbitraryMedia[1])
            continue
        }
        if (arbitrary && arbitrary[1].startsWith('@')) {
            if (inline) return null
            inline = `[${arbitrary[1]}]`
            continue
        }
        // group-*/peer-* (kể cả có tên `group-hover/item`), in-*, has-*, not-*, aria-*, data-*, nth-*...: trạng thái
        // của phần tử/tổ tiên/anh em/con. At-rule của trạng thái (`@media (hover: hover)` của `hover` sẵn có hoặc
        // của biến thể tự định nghĩa) đi theo; biến thể tự định nghĩa tên `...-hover` không có media nếu không khai báo.
        // Nhiều phương án (`not-hover`) đã được `expandVariants` tách thành nhiều danh sách bước.
        const alts = stateAlternatives(variant)
        if (!alts || alts.length !== 1 || alts[0].relative) return null
        for (const rule of alts[0].at) {
            const query = rule.match(/^@media\s+([\s\S]+)$/)
            if (query && query[1] === HOVER_MEDIA) media.push('hover')
            else if (query && !/^not\b/.test(query[1])) queries.push(query[1])
            else {
                if (inline) return null
                inline = encodeArbitrary(rule)
            }
        }
        const own = alts[0].sel
        sel = sel.replace('&', () => own)
    }
    if (pseudoElement) sel = sel.replace('&', '&' + pseudoElement)

    const unique = [...new Set(media)]
    if (inline) return unique.length || queries.length ? null : { media: inline, sel }
    // Mọi điều kiện thành at-rule nội tuyến trong sheet mặc định: thứ tự rule theo `compare` (như Tailwind),
    // không phụ thuộc thứ tự các sheet media. Nhiều điều kiện media gộp bằng `and` (`md:dark:hover:`).
    const all = [...new Set([...unique.map((key) => MEDIA_QUERY.get(key)), ...queries])]
    if (!all.length) return { media: '', sel }
    if (all.some((query) => query === undefined)) return null
    const container = all.filter((query) => (query as string).startsWith('@'))
    if (container.length) return container.length === 1 && all.length === 1 ? { media: encodeArbitrary(container[0] as string), sel } : null
    return { media: encodeArbitrary(`@media ${all.join(' and ')}`), sel }
}

// ---------------------------------------------------------------------------
// Rule -> token x-css
// ---------------------------------------------------------------------------

// `var(--color-red-500)` -> `var(--color-red-500, oklch(...))`: chạy được khi chưa khai báo theme,
// vẫn ghi đè được bằng cách khai báo biến (như theme của Tailwind).
const withThemeFallback = (value: string, depth = 0): string =>
    value.replace(/var\((--[\w.-]+)\)/g, (match, name: string) => {
        const fallback = theme[name]
        if (fallback === undefined || depth > 2) return match
        return `var(${name}, ${withThemeFallback(fallback, depth + 1)})`
    })

/**
 * Giá trị theme của `name` đã thay hết `var(--theme-khác)` bằng giá trị (như Tailwind đặt biến ở
 * `:root`). `null` khi biến không có trong theme hoặc chuỗi tham chiếu vòng (`--font-sans: var(--font-sans)`
 * của shadcn) — trình duyệt coi biến đó không hợp lệ và dùng giá trị dự phòng.
 */
const resolveThemeValue = (name: string, seen: string[] = []): string | null => {
    const value = theme[name]
    if (value === undefined || seen.includes(name)) return null
    let broken = false
    const resolved = value.replace(/var\((--[\w.-]+)\)/g, (match, ref: string) => {
        if (theme[ref] === undefined) return match
        const inner = resolveThemeValue(ref, [...seen, name])
        if (inner === null) broken = true
        return inner === null ? match : `var(${ref}, ${inner})`
    })
    return broken ? null : resolved
}

// Preflight đọc `var(--default-font-family, ...)`: thay dự phòng bằng giá trị theme hiện tại.
const themedPreflight = (): string => {
    const css = TW_PREFLIGHT_CSS
    let out = ''
    let i = 0
    const pattern = /var\((--[\w.-]+),/g
    for (let m = pattern.exec(css); m; m = pattern.exec(css)) {
        let depth = 1
        let k = m.index + 4
        while (k < css.length && depth > 0) {
            if (css[k] === '(') depth++
            else if (css[k] === ')') depth--
            k++
        }
        const value = resolveThemeValue(m[1])
        if (value === null) continue
        out += css.slice(i, m.index) + `var(${m[1]}, ${value})`
        i = k
        pattern.lastIndex = k
    }
    return out + css.slice(i)
}

// Token x-css không chứa khoảng trắng: ngoài chuỗi dùng `_`; trong chuỗi có nháy (`"Segoe UI"`) dùng
// escape CSS `\000020` vì bộ giải mã giữ nguyên nội dung trong nháy.
const encodeValue = (value: string) =>
    value
        .replace(/"[^"]*"|'[^']*'/g, (quoted) => quoted.replace(/ /g, '\\000020'))
        .replace(/_/g, '\\_')
        .replace(/\s+/g, '_')

const splitVariants = (name: string): string[] => {
    const parts: string[] = []
    let depth = 0
    let start = 0
    for (let i = 0; i < name.length; i++) {
        const ch = name[i]
        if (ch === '[' || ch === '(') depth++
        else if (ch === ']' || ch === ')') depth--
        else if (ch === ':' && depth === 0) {
            parts.push(name.slice(start, i))
            start = i + 1
        }
    }
    parts.push(name.slice(start))
    return parts
}

// ---------------------------------------------------------------------------
// CSS của người dùng: @utility, @custom-variant, @apply
// ---------------------------------------------------------------------------

type CssItem = { decl: [string, string] } | { head: string; body: string } | { at: string }

/** Tách thân một khối CSS thành khai báo, khối con (`head { body }`) và câu lệnh `@x ...;`. */
const parseCssItems = (text: string): CssItem[] => {
    const items: CssItem[] = []
    let i = 0
    while (i < text.length) {
        while (i < text.length && /[\s;]/.test(text[i])) i++
        if (i >= text.length) break
        let j = i
        let quote = ''
        let parens = 0
        while (j < text.length) {
            const ch = text[j]
            if (quote) {
                if (ch === '\\') j++
                else if (ch === quote) quote = ''
            } else if (ch === '"' || ch === "'") quote = ch
            else if (ch === '(') parens++
            else if (ch === ')') parens--
            else if (parens === 0 && (ch === '{' || ch === ';' || ch === '}')) break
            j++
        }
        const head = text.slice(i, j).trim()
        if (text[j] === '{') {
            let depth = 1
            let k = j + 1
            quote = ''
            while (k < text.length && depth > 0) {
                const ch = text[k]
                if (quote) {
                    if (ch === '\\') k++
                    else if (ch === quote) quote = ''
                } else if (ch === '"' || ch === "'") quote = ch
                else if (ch === '{') depth++
                else if (ch === '}') depth--
                k++
            }
            items.push({ head, body: text.slice(j + 1, k - 1) })
            i = k
            continue
        }
        if (head.startsWith('@')) items.push({ at: head })
        else if (head) {
            const colon = head.indexOf(':')
            if (colon > 0) items.push({ decl: [head.slice(0, colon).trim(), head.slice(colon + 1).trim()] })
        }
        i = j + 1
    }
    return items
}

/** Tách theo dấu phẩy ở cấp ngoài cùng (không tách trong ngoặc/nháy). */
const splitTopLevel = (text: string, separator = ','): string[] => {
    const parts: string[] = []
    let depth = 0
    let quote = ''
    let start = 0
    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (quote) {
            if (ch === '\\') i++
            else if (ch === quote) quote = ''
        } else if (ch === '"' || ch === "'") quote = ch
        else if (ch === '(' || ch === '[') depth++
        else if (ch === ')' || ch === ']') depth--
        else if (ch === separator && depth === 0) {
            parts.push(text.slice(start, i))
            start = i + 1
        }
    }
    parts.push(text.slice(start))
    return parts.map((p) => p.trim()).filter(Boolean)
}

/** Selector lồng (`&:hover`, `.a &`, `::x`) ghép với selector cha có `&`. */
const nestSelector = (parent: string, child: string) => {
    const own = child.includes('&') ? child : `& ${child}`
    return parent === '&' ? own : own.replace(/&/g, parent)
}

/** Cây khối của một `@utility` -> danh sách rule (rule đầu là khai báo cấp ngoài). */
const utilityRules = (body: string): Rule[] => {
    const rules: Rule[] = []
    const walk = (text: string, sel: string, query: string | undefined) => {
        const rule: Rule = { sel, decls: [], query }
        rules.push(rule)
        for (const item of parseCssItems(text)) {
            if ('decl' in item) rule.decls.push(item.decl)
            // `@apply a b` giữ chỗ (thứ tự so với khai báo khác) dưới dạng khai báo giả `@apply`.
            else if ('at' in item && /^@apply\s/.test(item.at)) rule.decls.push(['@apply', item.at.slice(7).trim()])
            else if ('head' in item) {
                const media = item.head.match(/^@media\s+(.+)$/)
                if (media) walk(item.body, sel, query ? `${query} and ${media[1]}` : media[1])
                else if (!item.head.startsWith('@')) {
                    for (const part of splitTopLevel(item.head)) walk(item.body, nestSelector(sel, part), query)
                }
            }
        }
    }
    walk(body, '&', undefined)
    return rules
}

const isNumberValue = (v: string) => /^\d*\.?\d+$/.test(v)
// Kiểu giá trị trong ngoặc vuông (`[length]`, `[color]`...): ước lượng như Tailwind; `var()` hợp mọi kiểu.
const BRACKET_TYPES: Record<string, RegExp> = {
    length: /^(-?(\d*\.?\d+)(px|r?em|ch|ex|lh|rlh|vw|vh|vmin|vmax|dvh|dvw|svh|svw|lvh|lvw|cq\w+|cm|mm|in|pt|pc|q)|0)$|^(calc|min|max|clamp)\(/,
    percentage: /^-?\d*\.?\d+%$|^(calc|min|max|clamp)\(/,
    number: /^-?\d*\.?\d+$|^(calc|min|max|clamp)\(/,
    integer: /^-?\d+$|^(calc|min|max|clamp)\(/,
    duration: /^-?\d*\.?\d+m?s$|^(calc|min|max|clamp)\(/,
    angle: /^-?\d*\.?\d+(deg|rad|grad|turn)$|^(calc|min|max|clamp)\(/,
    color: /^(#[\da-f]{3,8}|(rgb|hsl|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)a?\(|transparent$|currentcolor$|[a-z]+$)/i,
    url: /^url\(/,
    image: /^(url|(repeating-)?(linear|radial|conic)-gradient|image-set|cross-fade)\(/,
}

/** `--value(...)`/`--modifier(...)`: thử lần lượt từng tham số như Tailwind, null nếu không khớp. */
const resolveFunctionalArg = (args: string, raw: string): string | null => {
    const bracket = raw.match(/^\[(.+)\]$/)
    const shorthand = raw.match(/^\((--[\w-]+)\)$/)
    const inner = bracket ? arbitraryInner(bracket[1]) : shorthand ? `var(${shorthand[1]})` : null
    for (const arg of splitTopLevel(args)) {
        if (/^--[\w-]+-\*$/.test(arg)) {
            const key = arg.slice(0, -1) + raw
            if (inner === null && theme[key] !== undefined) return `var(${key})`
            continue
        }
        const literal = arg.match(/^["'](.*)["']$/)
        if (literal) {
            if (inner === null && raw === literal[1]) return raw
            continue
        }
        const typed = arg.match(/^\[([\w*-]+)\]$/)
        if (typed) {
            if (inner !== null && (typed[1] === '*' || inner.startsWith('var(') || BRACKET_TYPES[typed[1]]?.test(inner))) return inner
            continue
        }
        if (inner !== null) continue
        if (arg === 'number' && isNumberValue(raw) && (Number(raw) * 4) % 1 === 0) return raw
        if (arg === 'integer' && /^\d+$/.test(raw)) return raw
        if (arg === 'percentage' && /^\d*\.?\d+%$/.test(raw)) return raw
        if (arg === 'ratio') {
            const ratio = raw.match(/^(\d+)\/(\d+)$/)
            if (ratio) return `${ratio[1]} / ${ratio[2]}`
        }
    }
    return null
}

/** Thay mọi `name(...)` trong chuỗi bằng `fn(nội dung)`; null nếu một lần thay thất bại. */
const replaceCssFunction = (value: string, name: string, fn: (args: string) => string | null): string | null => {
    let out = ''
    let i = 0
    for (let at = value.indexOf(name + '(', i); at !== -1; at = value.indexOf(name + '(', i)) {
        let depth = 1
        let k = at + name.length + 1
        while (k < value.length && depth > 0) {
            if (value[k] === '(') depth++
            else if (value[k] === ')') depth--
            k++
        }
        const replaced = fn(value.slice(at + name.length + 1, k - 1))
        if (replaced === null) return null
        out += value.slice(i, at) + replaced
        i = k
    }
    return out + value.slice(i)
}

type UserUtility = { rules: Rule[]; functional: boolean; usesModifier: boolean }

const compileUserUtility = (body: string): UserUtility => ({
    rules: utilityRules(body),
    functional: body.includes('--value('),
    usesModifier: body.includes('--modifier('),
})

/** `@apply` trong `@utility`: khai báo đặt tại chỗ + rule riêng cho phần có biến thể. */
type ApplyInUtility = (list: string, sel: string, query: string | undefined) => { decls: Array<[string, string]>; rules: Rule[] }

/** Áp giá trị (và modifier) vào `@utility name-*`. */
const evaluateUtility = (utility: UserUtility, value: string | null, modifier: string | null, apply?: ApplyInUtility): Rule[] | null => {
    let matched = !utility.functional
    const rules: Rule[] = []
    for (const rule of utility.rules) {
        const decls: Array<[string, string]> = []
        const extra: Rule[] = []
        for (const [prop, raw] of rule.decls) {
            if (prop === '@apply') {
                const applied = apply?.(raw, rule.sel, rule.query)
                if (applied) {
                    decls.push(...applied.decls)
                    extra.push(...applied.rules)
                }
                continue
            }
            let next: string | null = raw
            if (next.includes('--value(')) {
                next = value === null ? null : replaceCssFunction(next, '--value', (args) => resolveFunctionalArg(args, value))
                if (next !== null) matched = true
            }
            if (next !== null && next.includes('--modifier(')) {
                next = modifier === null ? null : replaceCssFunction(next, '--modifier', (args) => resolveFunctionalArg(args, modifier))
            }
            if (next === null) continue
            next = replaceCssFunction(next, '--spacing', (args) => `calc(var(--spacing) * ${args.trim()})`) as string
            next = replaceCssFunction(next, '--alpha', (args) => {
                const [color, alpha] = args.split('/').map((s) => s.trim())
                return alpha ? `color-mix(in oklab, ${color} ${alpha}, transparent)` : color
            }) as string
            // Cùng thuộc tính khai báo nhiều lần: giữ cả hai như Tailwind (khai báo sau thắng khi hợp lệ).
            decls.push([prop, next])
        }
        if (decls.length) rules.push({ sel: rule.sel, query: rule.query, decls })
        rules.push(...extra)
    }
    return matched && rules.length ? rules : null
}

const encodeArbitrary = (text: string) => `[${text.replace(/_/g, '\\_').replace(/\s+/g, '_')}]`

/**
 * `@custom-variant` -> các phương án, mỗi phương án là chuỗi biến thể tuỳ ý (`[&:where(...)]`,
 * `[@media_...]`). Danh sách selector (`&:a, &:b`) thành nhiều phương án = nhiều rule như Tailwind.
 */
const compileCustomVariant = (body: string): string[][] | null => {
    const short = body.trim()
    if (!short.includes('{')) {
        const text = short.replace(/^\(([\s\S]*)\)$/, '$1').trim()
        if (text.startsWith('@')) return [[encodeArbitrary(text)]]
        return splitTopLevel(text).map((sel) => [encodeArbitrary(sel.includes('&') ? sel : `& ${sel}`)])
    }
    const walk = (text: string): string[][] => {
        const items = parseCssItems(text)
        if (items.some((item) => 'at' in item && item.at === '@slot')) return [[]]
        const out: string[][] = []
        for (const item of items) {
            if (!('head' in item)) continue
            const inner = walk(item.body)
            if (!inner.length) continue
            const heads = item.head.startsWith('@') ? [encodeArbitrary(item.head)] : splitTopLevel(item.head).map((sel) => encodeArbitrary(sel.includes('&') ? sel : `& ${sel}`))
            for (const head of heads) for (const rest of inner) out.push([head, ...rest])
        }
        return out
    }
    const result = walk(short.replace(/^\{([\s\S]*)\}$/, '$1'))
    return result.length ? result : null
}

/** Media key (`tw-md`) hoặc at-rule nội tuyến (`[@media_...]`) -> phần đầu at-rule CSS. */
const atRuleOf = (media: string): string | null => {
    if (media.startsWith('tw-')) {
        const query = MEDIA_QUERY.get(media.slice(3))
        return query === undefined ? null : query.startsWith('@') ? query : `@media ${query}`
    }
    const inline = media.match(/^\[(.+)\]$/)
    return inline ? arbitraryInner(inline[1]) : null
}

// ---------------------------------------------------------------------------
// Thứ tự class như Tailwind (getClassOrder): dùng cho thứ tự rule trong CSS (cascade) và sắp xếp class.
// ---------------------------------------------------------------------------

type OrderVariant =
    | { kind: 'arbitrary'; key: string; selector: string }
    | { kind: 'static'; key: string; root: string }
    | { kind: 'functional'; key: string; root: string; value: { kind: 'named' | 'arbitrary'; value: string } | null; modifier: string | null }
    | { kind: 'compound'; key: string; root: string; variant: OrderVariant; modifier: string | null }

const PROPERTY_INDEX = new Map<string, number>(ORDER_PROPERTIES.map((p, i) => [p, i]))
/** Gốc biến thể của dialect đang hoạt động: [loại, thứ tự]; biến thể tự định nghĩa nối sau. */
let ORDER_ROOTS: Record<string, readonly [string, number]> = TW_ORDER.variants
const FUNCTIONAL_ROOTS = Object.keys(TW_ORDER.variants).filter((k) => TW_ORDER.variants[k as keyof typeof TW_ORDER.variants][0] === 'f').sort((a, b) => b.length - a.length)
const COMPOUND_ROOTS = Object.keys(TW_ORDER.variants).filter((k) => TW_ORDER.variants[k as keyof typeof TW_ORDER.variants][0] === 'c')
const GROUP_DIRECTION = TW_ORDER.groups as Record<string, 'asc' | 'desc'>

/** Tách `x/name` (ngoài ngoặc) -> [x, name]. */
const splitModifier = (text: string): [string, string | null] => {
    let depth = 0
    for (let i = text.length - 1; i >= 0; i--) {
        const ch = text[i]
        if (ch === ']' || ch === ')') depth++
        else if (ch === '[' || ch === '(') depth--
        else if (ch === '/' && depth === 0) return [text.slice(0, i), text.slice(i + 1)]
    }
    return [text, null]
}

const orderVariantCache = new Map<string, OrderVariant | null>()
const parseOrderVariant = (variant: string): OrderVariant | null => {
    const cached = orderVariantCache.get(variant)
    if (cached !== undefined) return cached
    let result: OrderVariant | null = null
    if (/^\[.*\]$/.test(variant)) {
        // Như Tailwind: `[svg]` -> `&:is(svg)`, `[&_svg]` -> `& svg`.
        const inner = arbitraryInner(variant.slice(1, -1))
        result = { kind: 'arbitrary', key: variant, selector: inner.startsWith('@') || inner.includes('&') ? inner : `&:is(${inner})` }
    }
    else if (ORDER_ROOTS[variant] && ORDER_ROOTS[variant][0] === 's') result = { kind: 'static', key: variant, root: variant }
    // Biến thể hàm của plugin (`tab-[2]`): nhóm riêng `tab-*` xếp sau các giá trị có tên, như `matchVariant` của Tailwind.
    for (const [root] of result ? [] : FUNCTIONAL_VARIANTS) {
        if (!variant.startsWith(root + '-[')) continue
        const [rest, modifier] = splitModifier(variant.slice(root.length + 1))
        if (/^\[.+\]$/.test(rest)) result = { kind: 'functional', key: variant, root: `${root}-*`, value: { kind: 'arbitrary', value: rest.slice(1, -1) }, modifier }
        break
    }
    if (!result) {
        for (const root of COMPOUND_ROOTS) {
            if (!variant.startsWith(root + '-')) continue
            const [rest, modifier] = root === 'group' || root === 'peer' ? splitModifier(variant.slice(root.length + 1)) : [variant.slice(root.length + 1), null]
            const inner = parseOrderVariant(rest)
            if (inner) result = { kind: 'compound', key: variant, root, variant: inner, modifier }
            break
        }
    }
    if (!result) {
        for (const root of FUNCTIONAL_ROOTS) {
            const prefix = root === '@' ? '@' : root + '-'
            if (variant !== root && !variant.startsWith(prefix)) continue
            if (root === '@' && /^@(min|max)-/.test(variant)) continue
            const [rest, modifier] = splitModifier(variant === root ? '' : variant.slice(prefix.length))
            const value = rest === '' ? null : rest.startsWith('[') ? { kind: 'arbitrary' as const, value: rest.slice(1, -1) } : { kind: 'named' as const, value: rest }
            result = { kind: 'functional', key: variant, root, value, modifier }
            break
        }
    }
    orderVariantCache.set(variant, result)
    return result
}

/** So hai giá trị breakpoint/container như Tailwind: theo đơn vị, rồi theo số. */
const compareBreakpointValues = (a: string, b: string, direction: 'asc' | 'desc'): number => {
    if (a === b) return 0
    const ia = a.indexOf('(')
    const ib = b.indexOf('(')
    const ua = ia === -1 ? a.replace(/[\d.]+/g, '') : a.slice(0, ia)
    const ub = ib === -1 ? b.replace(/[\d.]+/g, '') : b.slice(0, ib)
    const result = (ua === ub ? 0 : ua < ub ? -1 : 1) || (direction === 'asc' ? parseFloat(a) - parseFloat(b) : parseFloat(b) - parseFloat(a))
    return Number.isNaN(result) ? (a < b ? -1 : 1) : result
}
const groupValue = (variant: OrderVariant): string | null => {
    const container = variant.kind !== 'arbitrary' && variant.root.startsWith('@')
    const ns = container ? '--container-' : '--breakpoint-'
    if (variant.kind === 'static') return theme[ns + variant.root] ?? null
    if (variant.kind !== 'functional' || !variant.value || (!container && variant.modifier)) return null
    const value = variant.value.kind === 'arbitrary' ? arbitraryInner(variant.value.value) : theme[ns + variant.value.value]
    return !value || value.includes('var(') ? null : value
}

const compareOrderVariants = (a: OrderVariant, b: OrderVariant): number => {
    if (a.key === b.key) return 0
    if (a.kind === 'arbitrary' && b.kind === 'arbitrary') return a.selector < b.selector ? -1 : 1
    if (a.kind === 'arbitrary') return 1
    if (b.kind === 'arbitrary') return -1
    const oa = ORDER_ROOTS[a.root]?.[1] ?? 0
    const ob = ORDER_ROOTS[b.root]?.[1] ?? 0
    if (oa !== ob) return oa - ob
    if (a.kind === 'compound' && b.kind === 'compound') {
        const inner = compareOrderVariants(a.variant, b.variant)
        if (inner !== 0) return inner
        return a.modifier && b.modifier ? (a.modifier < b.modifier ? -1 : 1) : a.modifier ? 1 : b.modifier ? -1 : 0
    }
    const direction = GROUP_DIRECTION[oa]
    if (direction) {
        const va = groupValue(a)
        const vb = groupValue(b)
        if (va === null) return direction === 'asc' ? -1 : 1
        if (vb === null) return direction === 'asc' ? 1 : -1
        return compareBreakpointValues(va, vb, direction)
    }
    if (a.root !== b.root) return a.root < b.root ? -1 : 1
    const fa = a.kind === 'functional' ? a.value : null
    const fb = b.kind === 'functional' ? b.value : null
    if (fa === null) return -1
    if (fb === null || (fa.kind === 'arbitrary' && fb.kind !== 'arbitrary')) return 1
    return (fa.kind !== 'arbitrary' && fb.kind === 'arbitrary') || fa.value < fb.value ? -1 : 1
}

/** So tên như Tailwind: số trong chuỗi so theo giá trị (`p-2` < `p-10`). */
const compareNatural = (a: string, b: string): number => {
    const n = Math.min(a.length, b.length)
    for (let i = 0; i < n; i++) {
        let ca = a.charCodeAt(i)
        let cb = b.charCodeAt(i)
        if (ca >= 48 && ca <= 57 && cb >= 48 && cb <= 57) {
            let ea = i + 1
            let eb = i + 1
            for (ca = a.charCodeAt(ea); ca >= 48 && ca <= 57;) ca = a.charCodeAt(++ea)
            for (cb = b.charCodeAt(eb); cb >= 48 && cb <= 57;) cb = b.charCodeAt(++eb)
            const da = a.slice(i, ea)
            const db = b.slice(i, eb)
            const diff = Number(da) - Number(db)
            if (diff) return diff
            if (da < db) return -1
            if (da > db) return 1
            continue
        }
        if (ca !== cb) return ca - cb
    }
    return a.length - b.length
}

export interface TailwindOrderKey {
    /** Biến thể đã sắp giảm dần (để so như bitmask của Tailwind). */
    variants: OrderVariant[]
    /** Chỉ số thuộc tính trong bảng thứ tự của Tailwind, tăng dần. */
    properties: number[]
    /** Số khai báo. */
    count: number
    name: string
}

const propertySort = (decls: Array<[string, string]>): { properties: number[]; count: number } => {
    const seen = new Set<number>()
    let count = 0
    for (const [prop, value] of decls) {
        count++
        if (prop === '--tw-sort') {
            const index = PROPERTY_INDEX.get(value.trim())
            if (index !== undefined) {
                seen.add(index)
                break
            }
        }
        const index = PROPERTY_INDEX.get(prop)
        if (index !== undefined) seen.add(index)
    }
    return { properties: [...seen].sort((x, y) => x - y), count }
}

/** So hai khoá như `o.sort(...)` trong compiler của Tailwind. */
export const compareTailwindOrderKeys = (a: TailwindOrderKey, b: TailwindOrderKey): number => {
    // Bitmask biến thể: tập có biến thể "cao" nhất (khác nhau) đứng sau.
    for (let i = 0; ; i++) {
        const va = a.variants[i]
        const vb = b.variants[i]
        if (!va && !vb) break
        if (!va) return -1
        if (!vb) return 1
        const c = compareOrderVariants(va, vb)
        if (c !== 0) return c
    }
    let h = 0
    while (h < a.properties.length && h < b.properties.length && a.properties[h] === b.properties[h]) h++
    const pa = a.properties[h] ?? Infinity
    const pb = b.properties[h] ?? Infinity
    if (pa !== pb) return pa - pb
    return b.count - a.count || compareNatural(a.name, b.name)
}

const sortVariantsDesc = (variants: OrderVariant[]): OrderVariant[] => {
    const sorted = [...variants].sort((x, y) => compareOrderVariants(y, x))
    return sorted.filter((v, i) => i === 0 || compareOrderVariants(sorted[i - 1], v) !== 0)
}

export const tailwindV4Dialect = (options: TailwindV4DialectOptions = {}): XCSSDialect => {
    const darkMode = options.darkMode ?? 'media'
    // Tiền tố `tw` -> class `tw:...`; selector của `group`/`peer` là `.tw\:group`.
    const prefix = options.prefix ? normalizeTailwindPrefix(options.prefix) : ''
    const markerPrefix = prefix ? `${prefix}\\:` : ''
    // `important: true` -> mọi khai báo `!important`; `important: '#app'` -> `&` thành `:is(#app &)`.
    const importantAll = options.important === true
    const importantSelector = typeof options.important === 'string' && options.important.trim() ? options.important.trim() : ''
    const blocklist = new Set(options.blocklist ?? [])
    // `--color-*: initial` (hoặc `--*: initial`): bỏ cả namespace mặc định như `@theme` của Tailwind.
    const resetNamespaces = Object.entries(options.theme || {}).filter(([k, v]) => k.endsWith('*') && v.trim() === 'initial').map(([k]) => k.slice(0, -1))
    // `--x: initial` (không `*`): bỏ đúng biến đó như `@theme` của Tailwind (dùng khi `prefix` đến từ `@config`).
    const removedKeys = new Set(Object.entries(options.theme || {}).filter(([k, v]) => !k.endsWith('*') && v.trim() === 'initial').map(([k]) => k))
    const ownTheme = options.theme && Object.keys(options.theme).length
        ? Object.fromEntries([
            ...Object.entries(defaultTheme).filter(([k]) => !resetNamespaces.some((ns) => k.startsWith(ns))),
            ...Object.entries(options.theme).filter(([k]) => !k.endsWith('*')),
        ].filter(([k]) => !removedKeys.has(k)))
        : defaultTheme
    const ownVariants: Record<string, string[][]> = {}
    // `name-*` (thân có chỗ giữ giá trị) và `name-*/*` (có modifier): biến thể hàm của `matchVariant`.
    const functionalVariants: typeof FUNCTIONAL_VARIANTS = []
    // Biến thể tự định nghĩa: tên mới xếp sau mọi biến thể sẵn có (như `@custom-variant` của Tailwind),
    // tên trùng (`dark`) giữ thứ tự cũ.
    const ownRoots: Record<string, readonly [string, number]> = { ...TW_ORDER.variants }
    let lastOrder = Math.max(...Object.values(ownRoots).map(([, order]) => order))
    for (const [name, body] of Object.entries(options.variants || {})) {
        if (name.endsWith('-*/*')) continue
        if (name.endsWith('-*')) {
            functionalVariants.push([name.slice(0, -2), body, options.variants?.[`${name}/*`] ?? null])
            if (!ownRoots[name]) ownRoots[name] = ['f', ++lastOrder]
            continue
        }
        const compiled = compileCustomVariant(body)
        if (!compiled) continue
        ownVariants[name] = compiled
        if (!ownRoots[name]) ownRoots[name] = ['s', ++lastOrder]
    }
    functionalVariants.sort((a, b) => b[0].length - a[0].length)
    const ghostBreakpoints: Record<string, string> = resetNamespaces.includes('--breakpoint-')
        ? Object.fromEntries(Object.entries(defaultTheme).filter(([k]) => k.startsWith('--breakpoint-') && ownTheme[k] === undefined).map(([k, v]) => [k.slice(13), v]))
        : {}
    const activate = () => {
        CUSTOM_VARIANTS = ownVariants
        FUNCTIONAL_VARIANTS = functionalVariants
        RESET_NAMESPACES = resetNamespaces
        MARKER_PREFIX = markerPrefix
        if (ORDER_ROOTS !== ownRoots) {
            ORDER_ROOTS = ownRoots
            orderVariantCache.clear()
        }
        if (theme === ownTheme) return
        theme = ownTheme
        GHOST_BREAKPOINTS = ghostBreakpoints
        RESPONSIVE = [...Object.keys(ghostBreakpoints), ...keysByNamespace('--breakpoint-')]
        CONTAINER_SIZES = keysByNamespace('--container-')
    }
    activate()
    // Breakpoint tự định nghĩa (`--breakpoint-3xl`, `tablet` từ cấu hình v3): cùng nhóm thứ tự với `sm`...`2xl`.
    for (const key of RESPONSIVE) if (!ownRoots[key]) ownRoots[key] = ['s', TW_ORDER.variants.sm[1]]
    orderVariantCache.clear()
    const breakpoints = buildBreakpoints(darkMode)

    // `@utility name { ... }` / `@utility name-* { --value(...) }`: utility của người dùng (kể cả plugin CSS
    // như tw-animate-css). Trùng tên với utility sẵn có thì cả hai cùng áp (như Tailwind).
    const staticUtilities = new Map<string, UserUtility>()
    const functionalUtilities: Array<[string, UserUtility]> = []
    for (const [name, body] of Object.entries(options.utilities || {})) {
        const utility = compileUserUtility(/[:{]|@apply\s/.test(body) ? body : '')
        if (name.endsWith('-*')) functionalUtilities.push([name.slice(0, -2), utility])
        else staticUtilities.set(name, utility)
    }
    functionalUtilities.sort((a, b) => b[0].length - a[0].length)
    // `@apply` trong `@utility` (`@utility container { @apply mx-auto max-w-[1400px] lg:px-8 }`): khai báo không
    // biến thể đặt tại chỗ, phần có biến thể/media thành rule riêng của utility. Media nội tuyến đổi về điều kiện
    // `@media`; at-rule khác (`@container`, `@supports`) chưa hỗ trợ trong `@utility` nên bỏ.
    const applying = new Set<string>()
    const applyInUtility: ApplyInUtility = (list, sel, query) => {
        const decls: Array<[string, string]> = []
        const rules: Rule[] = []
        for (const name of list.split(/\s+/).filter(Boolean)) {
            if (applying.has(name)) continue
            applying.add(name)
            const result = place(name, false)
            applying.delete(name)
            if (!result) continue
            for (const placed of result.placed) {
                let media: string | undefined
                if (placed.media) {
                    const at = atRuleOf(placed.media)
                    if (!at || !at.startsWith('@media ')) continue
                    media = at.slice(7)
                }
                const childSel = sel === '&' ? placed.sel : placed.sel.replace(/&/g, sel)
                if (!media && placed.sel === '&') decls.push(...placed.decls)
                else rules.push({ sel: childSel, decls: placed.decls, query: [query, media].filter(Boolean).join(' and ') || undefined })
            }
        }
        return { decls, rules }
    }
    const userRules = (name: string): Rule[] | null => {
        const own = staticUtilities.get(name)
        if (own) return evaluateUtility(own, null, null, applyInUtility)
        for (const [prefix, utility] of functionalUtilities) {
            if (!name.startsWith(prefix + '-')) continue
            let value = name.slice(prefix.length + 1)
            let modifier: string | null = null
            const slash = value.lastIndexOf('/')
            if (utility.usesModifier && slash > 0 && !value.slice(slash).includes(']')) {
                modifier = value.slice(slash + 1)
                value = value.slice(0, slash)
            }
            const rules = evaluateUtility(utility, value, modifier, applyInUtility)
            if (rules) return rules
        }
        return null
    }
    const chain = (rules: Rule[]): Rule => ({ ...rules[0], more: [...(rules[0].more || []), ...rules.slice(1)] })
    // `container`: width 100% + max-width theo từng breakpoint (một class, nhiều rule có media riêng).
    const containerRule = (): Rule => ({
        sel: '',
        decls: [['width', '100%']],
        more: RESPONSIVE.map((key) => ({ sel: '', decls: [['max-width', breakpointValue(key)] as [string, string]], query: `(width >= ${breakpointValue(key)})` })),
    })
    /** Utility sẵn có, kể cả modifier (`text-sm/none`, `shadow-xs/5`, `bg-[red]/50`). */
    const resolveBuiltin = (name: string): Rule | null => {
        if (name === 'container') return containerRule()
        // `@container/main`, `@container-normal/[x]`, `@container-size`: `container-type` (+ `container-name`) như Tailwind.
        const query = name.match(/^@container(?:-(normal|size))?(?:\/(?:\[(.+)\]|([\w-]+)))?$/)
        if (query && (query[1] === 'size' || query[2] || query[3])) {
            const label = query[2] ? arbitraryInner(query[2]) : query[3]
            return { sel: '', decls: [['container-type', query[1] ?? 'inline-size'], ...(label ? [['container-name', label] as [string, string]] : [])] }
        }
        const direct = resolveBase(name)
        if (direct) return direct
        const [head, modifier] = splitModifier(name)
        return modifier === null || !head ? null : resolveBase(head, modifier)
    }
    // Utility của dự án/plugin trùng tên utility sẵn có (`@utility container`, `scrollbar-thumb-*` của plugin, kể cả
    // khi có modifier): cả hai cùng áp, phần của dự án đứng sau nên thắng như Tailwind.
    const resolveAny = (name: string): Rule | null => {
        const builtin = resolveBuiltin(name)
        const own = userRules(name)
        if (own) return builtin ? chain([builtin, ...own]) : chain(own)
        if (builtin) return builtin
        // Utility của dự án không khai báo `--modifier()` mà class có modifier: áp độ mờ lên kết quả (như trước).
        const [head, modifier] = splitModifier(name)
        if (modifier === null) return null
        const plain = userRules(head)
        return plain && applyModifier(chain(plain), modifier)
    }

    /** Mỗi biến thể tự định nghĩa có thể có nhiều phương án (danh sách selector = nhiều rule). */
    const expandVariants = (parts: string[]): string[][] => {
        let lists: string[][] = [[]]
        for (const variant of parts) {
            // Trạng thái ghép nhiều phương án: `not-hover`, `not-group-hover`... = `:not(...)` HOẶC
            // `@media not (hover: hover)`; `group-x`/`has-x` với biến thể tự định nghĩa nhiều phương án khác at-rule.
            let alternatives = customVariant(variant)
            if (!alternatives && /^(group|peer|in|has|not)-/.test(variant)) {
                const alts = stateAlternatives(variant)
                if (alts && alts.length > 1) alternatives = alts.map(({ at, sel }) => [...at.map(encodeArbitrary), encodeArbitrary(sel)])
            }
            const steps = alternatives ?? [[variant]]
            lists = lists.flatMap((list) => steps.map((each) => [...list, ...each]))
        }
        return lists
    }

    type Placed = { media: string; sel: string; decls: Array<[string, string]> }
    /** Class Tailwind -> các rule đã đặt chỗ (selector có `&`, media key/at-rule nội tuyến, khai báo). */
    /** `inUtilities`: class sinh utility (áp `important` của dialect); false cho `@apply` (Tailwind không áp). */
    const place = (fullName: string, inUtilities = true): { placed: Placed[]; important: boolean; base: Array<[string, string]>; signature: string; root: string; variants: string[] } | null => {
        activate()
        // Có tiền tố: chỉ nhận `tw:...` (kể cả trong `@apply`, như Tailwind), tiền tố đứng trước mọi biến thể.
        if (prefix && !fullName.startsWith(prefix + ':')) return null
        const className = prefix ? fullName.slice(prefix.length + 1) : fullName
        const parts = splitVariants(className)
        let base = parts.pop() as string
        let important = false
        if (base.endsWith('!')) {
            important = true
            base = base.slice(0, -1)
        } else if (base.startsWith('!')) {
            important = true
            base = base.slice(1)
        }

        const rule = resolveAny(base)
        if (!rule) return null

        const rules = [rule, ...(rule.more || [])]
        const baseDecls: Array<[string, string]> = rules.flatMap((each) => each.decls)
        const baseSignature = (rule.sel || '') + '|' + rule.decls.map(([p]) => p).join(',')
        const placed: Placed[] = []
        for (const variantList of expandVariants(parts)) {
            for (const each of rules) {
                if (!each.decls.length) continue
                const at = applyVariants(variantList, each.sel, darkMode, each.query)
                if (!at) return null
                // `important: '#app'`: Tailwind bọc `@tailwind utilities` trong `#app { }` -> `#app .x`,
                // `:is(:where(.group):hover :is(#app .x))`... `:is(#app &)` cùng phạm vi và độ ưu tiên.
                if (importantSelector && inUtilities) at.sel = at.sel.replace(/&/g, `:is(${importantSelector} &)`)
                let decls = each.decls
                // before:/after: cần `content` như Tailwind.
                if (/::(before|after)/.test(at.sel) && !decls.some(([p]) => p === 'content')) {
                    decls = [['content', 'var(--tw-content)'], ...decls]
                }
                placed.push({ ...at, decls })
            }
        }
        if (placed.some((p) => /::(before|after)/.test(p.sel)) && !baseDecls.some(([p]) => p === 'content')) baseDecls.unshift(['content', 'var(--tw-content)'])
        if (importantAll && inUtilities) important = true
        return placed.length ? { placed, important, base: baseDecls, signature: baseSignature, root: base, variants: parts } : null
    }

    // Khoá thứ tự kiểu Tailwind cho từng class (null: không phải class của phương ngữ).
    const orderCache = new Map<string, TailwindOrderKey | null>()
    const lastPlaced = new Map<string, ReturnType<typeof place>>()
    const orderKey = (className: string): TailwindOrderKey | null => {
        let key = orderCache.get(className)
        if (key !== undefined) return key
        // Kết quả place() của lần dịch class (engine gọi dialect trước khi chèn rule) dùng lại, không tính lại.
        const result = lastPlaced.get(className) ?? place(className)
        lastPlaced.delete(className)
        if (!result) key = null
        else {
            const variants = result.variants.map((v) => parseOrderVariant(v) ?? ({ kind: 'arbitrary', key: v, selector: v } as OrderVariant))
            // Khoá của Tailwind có `--tw-sort` ẩn/`@media` lồng mà khai báo đầu ra không có: dùng bảng sinh sẵn.
            const override = (TW_ORDER.classes as Record<string, readonly number[]>)[result.root] ?? (TW_ORDER.signatures as Record<string, readonly number[]>)[result.signature]
            const sort = override ? { properties: override.slice(1), count: override[0] } : propertySort(result.base)
            key = { variants: sortVariantsDesc(variants), ...sort, name: className }
        }
        if (orderCache.size > 20000) orderCache.clear()
        orderCache.set(className, key)
        return key
    }
    /** So hai class theo thứ tự của Tailwind; class không thuộc phương ngữ đứng trước (như prettier-plugin-tailwindcss). */
    const compare = (a: string, b: string): number => {
        const ka = orderKey(a)
        const kb = orderKey(b)
        if (!ka || !kb) return ka ? 1 : kb ? -1 : 0
        activate()
        return compareTailwindOrderKeys(ka, kb)
    }

    // `@apply a md:b hover:c/50 !d;` trong CSS bổ sung: khai báo gốc đặt tại chỗ, biến thể thành rule riêng.
    const applyTo = (selector: string, list: string): { inline: string; extra: string } => {
        let inline = ''
        let extra = ''
        const parentSel = splitTopLevel(selector).length > 1 ? `:is(${selector})` : selector
        for (const name of list.trim().split(/\s+/)) {
            const result = place(name, false)
            if (!result) {
                inline += `/* @apply ${name}: chưa hỗ trợ */`
                continue
            }
            for (const { media, sel, decls } of result.placed) {
                const body = decls.map(([p, v]) => `${p}:${v.trim() === '' && p.startsWith('--') ? 'initial' : withThemeFallback(v)}${result.important ? ' !important' : ''};`).join('')
                if (!media && sel === '&') {
                    inline += body
                    continue
                }
                const rule = `${sel.replace(/&/g, parentSel)}{${body}}`
                const wrapper = media ? atRuleOf(media) : ''
                if (media && !wrapper) {
                    inline += `/* @apply ${name}: chưa hỗ trợ */`
                    continue
                }
                extra += wrapper ? `${wrapper}{${rule}}` : rule
            }
        }
        return { inline, extra }
    }
    const expandApply = (text: string): string => {
        let out = ''
        for (const item of parseCssItems(text)) {
            if ('decl' in item) out += `${item.decl[0]}:${item.decl[1]};`
            else if ('at' in item) out += item.at + ';'
            else if (/^@(keyframes|font-face|property|counter-style|page)\b/.test(item.head) || !item.body.includes('@apply')) out += `${item.head}{${item.body}}`
            else if (item.head.startsWith('@')) {
                // `@layer base/components` của dự án: đặt cùng layer nền (thấp hơn utility) như Tailwind.
                const head = /^@layer\s+(base|components|theme|utilities)$/.test(item.head) ? '@layer l0' : item.head
                out += `${head}{${expandApply(item.body)}}`
            } else {
                let body = ''
                let extra = ''
                for (const child of parseCssItems(item.body)) {
                    if ('decl' in child) body += `${child.decl[0]}:${child.decl[1]};`
                    else if ('at' in child && child.at.startsWith('@apply ')) {
                        const applied = applyTo(item.head, child.at.slice(7))
                        body += applied.inline
                        extra += applied.extra
                    } else if ('at' in child) body += child.at + ';'
                    else body += `${child.head}{${child.body}}`
                }
                out += `${item.head}{${body}}${extra}`
            }
        }
        return out
    }
    const layerBaseCss = (text: string) => text.replace(/@layer\s+(base|components|theme)\s*\{/g, '@layer l0{')

    const dialect = ((className: string): string[] | null => {
        if (blocklist.has(className)) return null
        const result = place(className)
        if (!result) return null
        if (lastPlaced.size > 200) lastPlaced.clear()
        lastPlaced.set(className, result)
        // Utility người dùng trùng utility sẵn có cho cùng khai báo (`tab-4`): bỏ token lặp.
        const seen = new Set<string>()
        return result.placed.flatMap(({ media, sel: placedSel, decls }) => {
            const sel = placedSel === '&' ? '' : placedSel.startsWith('&') && placedSel.indexOf('&', 1) === -1 ? placedSel.slice(1) : placedSel
            // Khoảng trắng trong chuỗi có nháy (`[class*=' h-']`) viết `\20 `: engine đọc `';` là dấu `;` thật.
            const suffix = sel ? '@' + sel.replace(/(["'])((?:(?!\1).)*)\1/g, (_m, q: string, inner: string) => q + inner.replace(/ /g, '\\20 ') + q).replace(/\s+/g, ';') : ''
            const prefix = media ? media + ':' : ''
            return decls.map(([prop, value]) => {
                // `--tw-blur: ;` (rỗng) của Tailwind: dùng `initial`, cùng kết quả khi biến được đọc
                // bằng `var(--tw-blur,)` vì engine không nhận giá trị rỗng.
                const finalValue = value.trim() === '' && prop.startsWith('--') ? 'initial' : withThemeFallback(value)
                // Biến CSS không nhận dạng `--x![...]` của engine: ghi `!important` vào giá trị (`--x: v !important`).
                if (result.important && prop.startsWith('--')) return `${prefix}${prop}[${encodeValue(finalValue + ' !important')}]${suffix}`
                return `${prefix}${prop}${result.important ? '!' : ''}[${encodeValue(finalValue)}]${suffix}`
            }).filter((token) => !seen.has(token) && !!seen.add(token))
        })
    }) as XCSSDialect
    // Class có dạng utility Tailwind (gốc là họ/utility của Tailwind hoặc của dự án, giá trị viết kiểu Tailwind) mà
    // phương ngữ không sinh được (giá trị Tailwind không nhận, biến thể chưa hỗ trợ): engine không thử cú pháp x-css,
    // nên `z-1` không thành `z-index:-1`. Class x-css thật (`m-10px`, `dF`, `cRed@:hover`) không bị giữ.
    const TAILWIND_VALUE = /^(\[.+\]|\((?:[a-z-]+:)?--[\w-]+\)|\d+(\.\d+)?(\/\d+)?|[a-z][a-z0-9.-]*|\d+x[sl]|\d+xl)$/
    dialect.owns = (fullName: string): boolean => {
        activate()
        // Class bị chặn vẫn là class Tailwind: engine không thử cú pháp x-css.
        if (blocklist.has(fullName)) return true
        if (prefix && !fullName.startsWith(prefix + ':')) return false
        let base = splitVariants(prefix ? fullName.slice(prefix.length + 1) : fullName).pop() as string
        if (base.endsWith('!')) base = base.slice(0, -1)
        else if (base.startsWith('!')) base = base.slice(1)
        if (explicit[base] || staticUtilities.has(base) || base === 'container') return true
        const [head] = splitModifier(base)
        return splitRoots(head).some(([root, value]) =>
            (families[root] !== undefined || arbitraryTemplates[root] !== undefined || functionalUtilities.some(([name]) => name === root)) && TAILWIND_VALUE.test(value))
    }
    // Khai báo lấy nguyên văn từ compiler Tailwind: không cần CSS.supports cho từng khai báo.
    dialect.trusted = true
    dialect.breakpoints = breakpoints
    dialect.compare = compare
    // Danh sách class/biến thể chỉ dùng cho editor (LSP): bản CDN (`__XCSS_EDITOR__` = false) bỏ hẳn phần này.
    if (EDITOR_BUILD) {
        // Danh sách class (cho gợi ý của editor): class tường minh, họ × bộ giá trị, giá trị theme của dự án,
        // `@utility` của dự án. Chỉ giữ class mà phương ngữ thật sự sinh được CSS.
        let classListCache: string[] | null = null
        dialect.classList = () => {
            if (classListCache) return classListCache
            activate()
            const names = new Set<string>(Object.keys(explicit))
            const SPACING = ['0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48', '52', '56', '60', '64', '72', '80', '96']
            for (const [root, entries] of Object.entries(families)) {
                for (const [templateIndex, setIndex] of entries) {
                    if (setIndex === -1) SPACING.forEach((v) => names.add(`${root}-${v}`))
                    else valueSet(setIndex).forEach((v) => names.add(`${root}-${v}`))
                    if (ownTheme !== defaultTheme) {
                        const text = templates[templateIndex].slice(1).map((i) => declTable[i]).join(';')
                        for (const m of text.matchAll(/var\((--[\w-]*?)\{v\}\)/g)) {
                            for (const key of Object.keys(options.theme || {})) {
                                const suffix = key.slice(m[1].length)
                                if (key.startsWith(m[1]) && suffix && !suffix.includes('--')) names.add(`${root}-${suffix}`)
                            }
                        }
                    }
                }
            }
            for (const [name] of staticUtilities) names.add(name)
            names.add('container')
            classListCache = [...names].map((name) => (prefix ? `${prefix}:${name}` : name)).filter((name) => !!dialect(name)).sort(compare)
            return classListCache
        }
        /** Tên biến thể dùng được trước `:` (cho gợi ý). */
        dialect.variantList = () => {
            activate()
            const list = Object.entries(ORDER_ROOTS).filter(([, [kind]]) => kind === 's').map(([name]) => name)
            for (const key of RESPONSIVE) list.push(`max-${key}`)
            for (const size of CONTAINER_SIZES) list.push(`@${size}`, `@max-${size}`)
            for (const state of ['hover', 'focus', 'focus-visible', 'focus-within', 'active', 'checked', 'disabled', 'invalid']) list.push(`group-${state}`, `peer-${state}`)
            list.push('aria-checked', 'aria-disabled', 'aria-expanded', 'aria-invalid', 'aria-selected', 'has-checked', 'not-first', 'not-last')
            return [...new Set(list)]
        }
    }
    // CSS của dự án: mở rộng `@apply`, khai triển `--alpha()`/`--spacing()`/`--theme()`; biến theme mà CSS đó
    // đọc (`--border: var(--color-black)`) được khai báo ở `:root` trong layer thấp nhất, trước preflight và
    // CSS nền (như `@layer theme` của Tailwind). Utility không cần: giá trị theme đã nằm trong `var(--x, …)`.
    const projectCss = options.css ? expandThemeFunctions(layerBaseCss(options.css.includes('@apply') ? expandApply(options.css) : options.css), ownTheme) : ''
    const themeCss = projectCss ? usedThemeCss(projectCss, ownTheme) : ''
    dialect.baseCss = [
        PROPERTIES_CSS,
        themeCss ? `@layer l0{${themeCss}}` : '',
        options.preflight ? themedPreflight() : '',
        projectCss,
    ].filter(Boolean).join('\n')
    return dialect
}

/** Phiên bản Tailwind mà dữ liệu được sinh từ. */
export const TAILWIND_DATA_VERSION = TW_DATA.version

// ---------------------------------------------------------------------------
// Hàm theme trong CSS của dự án (`--alpha()`, `--spacing()`, `--theme()`, `theme()`) và biến theme ở `:root`
// ---------------------------------------------------------------------------

/**
 * Khai triển hàm theme như Tailwind v4 trong mọi CSS (ngoài `@theme`, cả `:root`, `.dark`, `@apply`):
 *   `--alpha(c / 8%)` -> `color-mix(in oklab, c 8%, transparent)`, `--spacing(3)` -> `calc(var(--spacing) * 3)`,
 *   `--theme(--x)` -> `var(--x)` (biến `@theme inline`, có chữ `inline`, hoặc trong điều kiện `@media`/`@container`:
 *   giá trị), `--theme(--x / 50%)` -> `color-mix(...)`, `--theme(--x, dự phòng)` khi theme không có `--x`,
 *   `theme(--x)` (cú pháp cũ) -> giá trị. `values`: theme; `inline`: tên biến của `@theme inline`.
 */
const expandThemeFunctions = (text: string, values: Record<string, string>, inline: ReadonlySet<string> = new Set()): string =>
    // Điều kiện at-rule không đọc được `var()`: thay bằng giá trị.
    text.replace(/(@(?:media|container|supports)\b[^{};]*)|[^@]+|@/g, (part, prelude?: string) => {
        const withAlpha = (args: string, color: (c: string) => string) => {
            const [c, alpha] = splitTopLevel(args, '/')
            return alpha ? `color-mix(in oklab, ${color(c)} ${alpha}, transparent)` : color(c)
        }
        let out = replaceCssFunction(part, '--theme', (args) => {
            const [head, ...fallback] = splitTopLevel(args)
            return withAlpha(head, (path) => {
                const name = path.replace(/\s+inline$/, '')
                if (values[name] === undefined) return fallback.join(', ') || `var(${name})`
                return prelude || name !== path || inline.has(name) ? values[name] : `var(${name})`
            })
        }) as string
        // `theme(--x)` cú pháp cũ: luôn là giá trị.
        out = out.replace(/(^|[^\w-])theme\(\s*(--[\w.-]+)\s*\)/g, (match, before: string, name: string) => (values[name] === undefined ? match : before + values[name]))
        out = replaceCssFunction(out, '--spacing', (args) => `calc(var(--spacing) * ${args.trim()})`) as string
        return replaceCssFunction(out, '--alpha', (args) => withAlpha(args, (c) => c)) as string
    })

/**
 * Khối `:root,:host{...}` khai báo các biến theme mà `css` đọc qua `var(--x)` (kể cả biến theme mà giá trị của
 * chúng đọc), theo thứ tự của theme — như `@layer theme` của Tailwind chỉ phát biến được dùng. Rỗng nếu không có.
 */
const usedThemeCss = (css: string, values: Record<string, string>): string => {
    const used = new Set<string>()
    const visit = (text: string) => {
        for (const m of text.matchAll(/var\(\s*(--(?:[\w-]|\\.)+)/g)) {
            // `--spacing-0\.5` -> tên theme `--spacing-0.5`.
            const name = m[1].replace(/\\/g, '')
            if (values[name] === undefined || used.has(name)) continue
            used.add(name)
            visit(values[name])
        }
    }
    visit(css)
    const decls = Object.keys(values).filter((name) => used.has(name)).map((name) => `${name.replace(/\./g, '\\.')}:${values[name]};`).join('')
    return decls && `:root,:host{${decls}}`
}

export interface TailwindStylesheet {
    theme: Record<string, string>
    css: string
    utilities: Record<string, string>
    variants: Record<string, string>
    /** `@import`/`@plugin` không giải được (ngoài `tailwindcss`). */
    unresolved: string[]
    /** Tiền tố (`@import "tailwindcss" prefix(tw)` hoặc `prefix` của `@config`): truyền vào `tailwindV4Dialect({ prefix })`. */
    prefix?: string
    /**
     * `true`: `@import "tailwindcss" important` / `important: true` của `@config`. Chuỗi: selector bọc utility
     * (`#app { @tailwind utilities; }` — cách Tailwind v4 áp `important: '#app'` của `@config`). Truyền vào
     * `tailwindV4Dialect({ important })`.
     */
    important?: boolean | string
    /** Class bị chặn (`@source not inline("...")`, `blocklist` của `@config`): truyền vào `tailwindV4Dialect({ blocklist })`. */
    blocklist?: string[]
}

export interface ParseTailwindOptions {
    /** Trả nội dung CSS cho `@import "x"` / `@plugin "x"` (ví dụ plugin đóng gói sẵn); null nếu không có. */
    resolve?: (id: string) => string | null
    /**
     * Nạp `@config "./tailwind.config.js"` (cấu hình JS kiểu v3): trả CSS v4 tương đương (xem `tailwindConfigToCss`),
     * null nếu không đọc được. Chỉ có ở Node (`createConfigLoader`).
     */
    loadConfig?: (id: string) => string | null
}

/** Mở rộng ngoặc nhọn như `@source inline()` của Tailwind: `{a,b}`, dãy `{1..3}`, `{0..100..25}`. */
export const expandBraces = (pattern: string): string[] => {
    const match = pattern.match(/^(.*?)\{([^{}]*)\}(.*)$/s)
    if (!match) return [pattern]
    const [, before, body, after] = match
    let options: string[]
    const range = body.match(/^(-?\d+)\.\.(-?\d+)(?:\.\.(\d+))?$/)
    if (range) {
        const [from, to, step] = [Number(range[1]), Number(range[2]), Number(range[3]) || 1]
        options = []
        for (let v = from; from <= to ? v <= to : v >= to; v += from <= to ? step : -step) options.push(String(v))
    } else options = body.split(',')
    return options.flatMap((option) => expandBraces(before + option + after))
}

/**
 * Đọc stylesheet viết theo Tailwind v4 (`<style type="text/tailwindcss">`, `app.css`):
 *   - `@theme { --color-brand: #0a64e8; @keyframes wiggle {...} }` -> theme + keyframes,
 *   - `@utility name {...}`, `@utility name-* { x: --value(...) }` -> utilities,
 *   - `@custom-variant name (&:is(.dark *));` hoặc dạng khối có `@slot` -> variants,
 *   - `@import "tailwindcss" prefix(tw) important` -> `prefix`, `important`; `#app { @tailwind utilities; }` -> `important: '#app'`,
 *   - `@source not inline("p-4 {m,p}-2")` -> `blocklist` (class không sinh CSS),
 *   - CSS còn lại giữ nguyên (`@apply` được dialect mở rộng); `@import "tailwindcss"`, `@source`, `@config` bị bỏ qua,
 *   - `--alpha()`/`--spacing()`/`--theme()`/`theme()` trong CSS và trong giá trị `@theme` được khai triển; biến của
 *     `@theme static` thành khối `@layer theme{:root,:host{...}}` đầu `css` (biến theme mà CSS đọc do dialect phát).
 * Truyền kết quả cho dialect: `tailwindV4Dialect({ theme, css, utilities, variants, prefix, important, blocklist })`.
 */
export const parseTailwindStylesheet = (source: string, options: ParseTailwindOptions = {}): TailwindStylesheet => {
    const sheet: TailwindStylesheet = { theme: {}, css: '', utilities: {}, variants: {}, unresolved: [] }
    const seen = new Set<string>()
    const KEYFRAMES = /@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g
    // Như Tailwind v4: tiền tố của CSS thắng tiền tố của `@config`; `important` của hai nơi cộng dồn.
    let cssPrefix: string | undefined
    let configPrefix: string | undefined
    let importantAll = false
    let importantSelector = ''
    // `@theme inline`: `--theme(--x)` thay bằng giá trị; `@theme static`: biến luôn được khai báo ở `:root`.
    const inlineKeys = new Set<string>()
    const staticKeys = new Set<string>()
    const read = (text: string, fromConfig = false) => {
        for (const item of parseCssItems(text.replace(/\/\*[\s\S]*?\*\//g, ''))) {
            if ('decl' in item) continue
            if ('at' in item) {
                const load = item.at.match(/^@(import|plugin)\s+(?:url\()?["']([^"']+)["']\)?/)
                if (load) {
                    const id = load[2]
                    if (id === 'tailwindcss' || id.startsWith('tailwindcss/')) {
                        // Tuỳ chọn của import: `prefix(tw)`, `important` (bỏ qua `layer(...)`, `source(...)`, `theme(...)`).
                        const params = item.at.slice(load[0].length).replace(/\b(layer|source|theme)\([^)]*\)/g, '')
                        const ownPrefix = params.match(/\bprefix\(\s*([^)\s]*)\s*\)/)?.[1]
                        if (ownPrefix !== undefined) {
                            if (fromConfig) configPrefix ??= ownPrefix
                            else cssPrefix ??= ownPrefix
                        }
                        if (/(^|\s)important(\s|$)/.test(params)) importantAll = true
                        continue
                    }
                    if (seen.has(id)) continue
                    seen.add(id)
                    const content = options.resolve?.(id)
                    if (content) read(content)
                    else sheet.unresolved.push(id)
                    continue
                }
                const configFile = item.at.match(/^@config\s+["']([^"']+)["']/)
                if (configFile) {
                    const converted = options.loadConfig?.(configFile[1])
                    if (converted !== null && converted !== undefined) read(converted, true)
                    else sheet.unresolved.push(configFile[1])
                    continue
                }
                // `@source not inline("p-4 {m,p}-2")`: class bị chặn (ngoặc nhọn mở rộng như Tailwind).
                const blocked = item.at.match(/^@source\s+not\s+inline\(\s*(["'])([\s\S]*)\1\s*\)$/)
                if (blocked) {
                    for (const part of blocked[2].trim().split(/\s+/).filter(Boolean)) (sheet.blocklist ??= []).push(...expandBraces(part))
                    continue
                }
                const variant = item.at.match(/^@custom-variant\s+([\w-]+)\s+([\s\S]+)$/)
                if (variant) sheet.variants[variant[1]] = variant[2].trim()
                else if (!/^@(source|config|reference|tailwind|import|plugin)\b/.test(item.at)) sheet.css += item.at + ';\n'
                continue
            }
            // Tên có `.`/`/` (`slide-in-from-bottom-0.5`, `-1/2`): chỉ có trong plugin đóng gói sẵn, Tailwind không cho viết trong CSS.
            const utility = item.head.match(/^@utility\s+(-?[\w./-]+?(?:-\*)?)$/)
            if (utility) {
                sheet.utilities[utility[1]] = item.body.trim()
                continue
            }
            const variant = item.head.match(/^@custom-variant\s+([\w-]+)$/)
            if (variant) {
                sheet.variants[variant[1]] = `{${item.body}}`
                continue
            }
            if (/^@theme\b/.test(item.head)) {
                const isInline = /\binline\b/.test(item.head)
                const isStatic = /\bstatic\b/.test(item.head)
                for (const kf of item.body.match(KEYFRAMES) || []) sheet.css += kf + '\n'
                for (const decl of item.body.replace(KEYFRAMES, '').matchAll(/(--[\w.-]*(?:\\.[\w-]+)*\*?)\s*:\s*([^;]+);/g)) {
                    const name = decl[1].replace(/\\\./g, '.')
                    sheet.theme[name] = decl[2].trim()
                    if (isInline) inlineKeys.add(name)
                    else inlineKeys.delete(name)
                    if (isStatic) staticKeys.add(name)
                }
                continue
            }
            if (/^@plugin\b/.test(item.head)) continue
            // `#app { @tailwind utilities; }`: utility chỉ áp trong `#app` (Tailwind v4 đổi `important: '#app'` thành vậy).
            if (!item.head.startsWith('@') && /^@tailwind\s+utilities\b[^;{}]*;?$/.test(item.body.trim())) {
                importantSelector ||= item.head.trim()
                continue
            }
            sheet.css += `${item.head}{${item.body}}\n`
        }
    }
    read(source)
    // Hàm theme trong giá trị theme (`--spacing-x: --spacing(3)`) và trong CSS của dự án, như Tailwind.
    // `--theme()` tra theme mặc định cộng theme của dự án.
    const values = { ...defaultTheme, ...sheet.theme }
    for (const [name, value] of Object.entries(sheet.theme)) sheet.theme[name] = expandThemeFunctions(value, values, inlineKeys)
    sheet.css = expandThemeFunctions(sheet.css.trim(), { ...defaultTheme, ...sheet.theme }, inlineKeys)
    const statics = [...staticKeys].filter((name) => sheet.theme[name] !== undefined && sheet.theme[name] !== 'initial')
    if (statics.length) {
        sheet.css = `@layer theme{:root,:host{${statics.map((name) => `${name.replace(/\./g, '\\.')}:${sheet.theme[name]};`).join('')}}}\n${sheet.css}`
    }
    const prefix = cssPrefix ?? configPrefix
    if (prefix !== undefined) {
        try {
            sheet.prefix = normalizeTailwindPrefix(prefix)
        } catch (_error) {
            // Tailwind v4 báo lỗi với tiền tố không phải chữ thường a-z: ghi lại để công cụ cảnh báo.
            sheet.unresolved.push(`prefix(${prefix})`)
        }
    }
    // Có cả hai (`important` của CSS và `important: '#app'` của @config): giữ selector (giới hạn đã biết).
    if (importantSelector) sheet.important = importantSelector
    else if (importantAll) sheet.important = true
    return sheet
}
