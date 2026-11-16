/**
 * Phương ngữ Tailwind v4 dựng từ dữ liệu sinh tự động (src/tailwind-generated.ts) bằng chính
 * compiler của Tailwind. Mỗi class Tailwind được đổi thành các token x-css (khai báo nguyên văn của
 * Tailwind, kể cả biến `--tw-*`), nên CSS sinh ra khớp Tailwind thay vì "gần giống".
 *
 *   import { tailwindV4Dialect } from '@porbit/style/tailwind'
 *   xcss.cssObserve(document, { dialects: [tailwindV4Dialect({ preflight: true })] })
 *
 * File này là lõi phương ngữ, không có phần đọc CSS của người dùng (`@utility`, `@custom-variant`, `@apply`,
 * CSS của dự án: src/tailwind-stylesheet.ts, bật bằng `useTailwindStylesheet`). Mã khác import src/tailwind-v4.ts
 * (bản đủ); chỉ bản CDN `tailwind-auto` import thẳng file này để nạp phần kia khi cần.
 */
import type { XCSSDialect } from './core'

declare const __XCSS_EDITOR__: boolean | undefined
const EDITOR_BUILD = typeof __XCSS_EDITOR__ === 'undefined' || __XCSS_EDITOR__
import { TW_DATA, TW_ORDER, TW_PREFLIGHT_CSS } from './tailwind-generated'
import { arbitraryInner, encodeArbitrary, normalizeTailwindPrefix, replaceCssFunction, splitTopLevel, type Rule, type TailwindVariantOrder } from './tailwind-css-text'
import type { StylesheetHost } from './tailwind-stylesheet'

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
    /**
     * Thứ tự trong nhóm biến thể của `matchVariant` (plugin JS): `{ mq: { keys, compare } }` — giá trị có tên (`mq-big`)
     * và giá trị tuỳ ý (`mq-[900px]`) chung một nhóm, xếp theo `compare` (`sort` của plugin) như Tailwind. Lấy từ
     * `sheet.variantOrder` sau `applyTailwindPluginOutput`/`loader.apply(sheet)`.
     */
    variantOrder?: Record<string, TailwindVariantOrder>
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

export type { TailwindVariantOrder } from './tailwind-css-text'

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
// Namespace con không bị xoá theo namespace cha (`ignoredThemeKeyMap` của Tailwind): `--font-*: initial` giữ
// `--font-weight-*` (TailAdmin: `font-medium` vẫn là 500).
const KEPT_SUB_NAMESPACES: Record<string, string[]> = {
    '--font-': ['--font-weight-', '--font-size-'],
    '--inset-': ['--inset-shadow-', '--inset-ring-'],
    '--text-': ['--text-color-', '--text-decoration-color-', '--text-decoration-thickness-', '--text-indent-', '--text-shadow-', '--text-underline-offset-'],
    '--grid-column-': ['--grid-column-start-', '--grid-column-end-'],
    '--grid-row-': ['--grid-row-start-', '--grid-row-end-'],
}
/** Biến theme `key` có bị `--ns-*: initial` (một trong `namespaces`) xoá không. */
const clearedBy = (namespaces: string[], key: string) => namespaces.some((ns) => key.startsWith(ns) && !KEPT_SUB_NAMESPACES[ns]?.some((sub) => key.startsWith(sub)))

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
// Gốc -> [namespace theme, loại mẫu tuỳ ý] cho khoá tự định nghĩa (`aspect-wide`): đến cùng phần đọc stylesheet
// (useTailwindStylesheet, xem `themeRoots` trong src/tailwind-stylesheet.ts) vì khoá tự định nghĩa chỉ có khi dự án có theme.
let THEME_ROOTS: Record<string, Array<[string, string]>> = {}
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
// @property chỉ đăng ký theo utility sẵn có được dùng, như Tailwind (CSS của plugin đọc `--tw-outline-style` mà không
// đặt chỉ thấy giá trị khởi tạo khi trang có utility đăng ký biến đó). Bảng xếp theo nhóm biến Tailwind luôn đăng
// ký cùng nhau (`+` trước tên: mục đầu một nhóm); mỗi nhóm thành các rule `@property` + dự phòng cho trình
// duyệt chưa hỗ trợ @property. Quy tắc chọn nhóm: xem PROPERTY_NO_SET trong scripts/gen-tailwind-map.mjs.
// Biến -> [nhóm, dấu sau tên trong bảng (`!` đặt không đăng ký, `?` đọc không đăng ký, `~` đọc kèm dự phòng vẫn đăng ký)].
const PROPERTY_GROUP = new Map<string, [number, string]>()
const PROPERTY_GROUP_RULES: string[][] = []
{
    const fallbacks: string[] = []
    for (const entry of DATA.properties) {
        const [raw, initial, syntax] = typeof entry === 'string' ? [entry] : entry
        const [, plus, short, flags] = raw.match(/^(\+?)([\w-]+)(.*)$/) as RegExpMatchArray
        const name = '--tw-' + short
        if (plus) {
            fallbacks.push('')
            PROPERTY_GROUP_RULES.push([])
        }
        const group = PROPERTY_GROUP_RULES.length - 1
        PROPERTY_GROUP.set(name, [group, flags])
        PROPERTY_GROUP_RULES[group].push(`@property ${name} { syntax: "${DATA.syntaxes[syntax || 0]}"; inherits: false;${initial === undefined ? '' : ` initial-value: ${initial};`} }`)
        fallbacks[group] += `${fallbacks[group] ? ';' : ''}${name}:${initial ?? 'initial'}`
    }
    fallbacks.forEach((decls, group) => PROPERTY_GROUP_RULES[group].push(DATA.fallback[0] + decls + DATA.fallback[1]))
}
/** Thêm vào `out` nhóm @property mà các khai báo của một utility sẵn có làm Tailwind đăng ký. */
const propertyGroups = (decls: ReadonlyArray<readonly [string, string]>, out: Set<number>) => {
    // `skip`: dấu làm lần đặt/đọc này không đăng ký; `need`: dấu bắt buộc (đọc kèm dự phòng).
    const add = (name: string, skip: string, need = '') => {
        const entry = PROPERTY_GROUP.get(name)
        if (entry && !entry[1].includes(skip) && entry[1].includes(need)) out.add(entry[0])
    }
    for (const [prop, value] of decls) {
        add(prop, '!')
        for (const m of value.matchAll(/var\((--tw-[\w-]+)\s*([),])/g)) m[2] === ')' ? add(m[1], '?') : add(m[1], '#', '~')
    }
}
const propertyCss = (groups: Set<number>): string[] => [...groups].flatMap((group) => PROPERTY_GROUP_RULES[group])

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
        const entries = families[root] || []
        if (!entries.length && !THEME_ROOTS[root]) continue
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
                if (prefixes.some((prefix) => clearedBy(RESET_NAMESPACES, prefix) && theme[prefix + value] === undefined)) accepted = false
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
            // Khoá theme tự định nghĩa của namespace mà theme mặc định ít/không có khoá (`aspect-wide` khi có
            // `--aspect-wide`): mẫu giá trị tuỳ ý của họ đọc `var(--ns-x)`, như Tailwind.
            for (const [ns, kind] of THEME_ROOTS[root] || []) {
                const options = arbitraryTemplates[root]
                const key = `${ns}-${value}`
                if (theme[key] === undefined || options === undefined || KEPT_SUB_NAMESPACES[ns + '-']?.some((sub) => key.startsWith(sub))) continue
                const index = typeof options === 'number' ? options : options[kind] ?? options.any ?? options.length
                // Màu + độ mờ (`accent-brand/50`): `color-mix(...)` như giá trị tuỳ ý.
                const alpha = modifier !== null && kind === 'color' ? alphaOf(modifier) : null
                if (modifier !== null && kind === 'color' && !alpha) return null
                const v = alpha ? mixAlpha(`var(${key})`, alpha) : `var(${key})`
                return alpha ? unpack(templates[index], (t) => t.split('{a}').join(v)) : done(unpack(templates[index], (t) => t.split('{a}').join(v)))
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
/** Nhóm thứ tự `matchVariant` của dialect đang hoạt động (xem `variantOrder`). */
let VARIANT_ORDER: Record<string, TailwindVariantOrder> | undefined
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
        const compiled = STYLESHEET?.compileCustomVariant(template.split(VARIANT_VALUE_PLACEHOLDER).join(arbitraryInner(head.slice(1, -1))).split(VARIANT_MODIFIER_PLACEHOLDER).join(mod))
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
    // At-rule khác `@media` gộp được (`@container`, `@supports`, `@starting-style`, `@media not`...), văn bản thô theo
    // thứ tự áp (trong ra ngoài): lồng thành chuỗi `[@a{@b]` như Tailwind lồng (`@[300px]:@max-[500px]:`, `md:@md:`).
    const atRules: string[] = []
    const inline = (encoded: string) => atRules.push(arbitraryInner(encoded.slice(1, -1)))
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
            inline(atRule)
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
            atRules.push('@media not ' + mediaOf(notMedia[1], darkMode))
            continue
        }
        // `not-@md`: `@container not (width >= 28rem)`.
        const notContainer = notMedia && atContainer(notMedia[1])
        if (notContainer) {
            atRules.push((MEDIA_QUERY.get(notContainer) as string).replace(/^@container\s+/, '@container not '))
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
            inline(variant)
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
            else atRules.push(rule)
        }
        const own = alts[0].sel
        sel = sel.replace('&', () => own)
    }
    if (pseudoElement) sel = sel.replace('&', '&' + pseudoElement)

    // Mọi điều kiện thành at-rule nội tuyến trong sheet mặc định: thứ tự rule theo `compare` (như Tailwind),
    // không phụ thuộc thứ tự các sheet media. Nhiều điều kiện media gộp bằng `and` (`md:dark:hover:`) ở ngoài cùng,
    // container query của breakpoint (`@md`) và at-rule khác lồng bên trong theo thứ tự biến thể (cùng điều kiện).
    const all = [...new Set([...[...new Set(media)].map((key) => MEDIA_QUERY.get(key)), ...queries])]
    if (all.some((query) => query === undefined)) return null
    const plain = (all as string[]).filter((query) => !query.startsWith('@'))
    const chain = [...(plain.length ? [`@media ${plain.join(' and ')}`] : []), ...(all as string[]).filter((query) => query.startsWith('@')), ...atRules.reverse()]
    return { media: chain.length ? encodeArbitrary(chain.join('{')) : '', sel }
}

// ---------------------------------------------------------------------------
// Rule -> token x-css
// ---------------------------------------------------------------------------

// `var(--color-red-500)` -> `var(--color-red-500, oklch(...))`: chạy được khi chưa khai báo theme,
// vẫn ghi đè được bằng cách khai báo biến (như theme của Tailwind).
const withThemeFallback = (value: string, depth = 0): string =>
    value.replace(/var\((--[\w.-]+)\)/g, (match, name: string) => {
        const fallback = theme[name]
        // `--color-primary: var(--color-primary)` (theme cấu hình của daisyUI): dự phòng là chính nó, bỏ.
        if (fallback === undefined || depth > 2 || fallback.trim() === match) return match
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
        // Engine đọc `;` trong giá trị là khoảng trắng, `';` là dấu `;` thật (`values='0;0.475;1'` trong data URL của daisyUI).
        .replace(/;/g, "';")

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
// CSS của người dùng (@utility, @custom-variant, @apply, CSS của dự án): ở src/tailwind-stylesheet.ts
// ---------------------------------------------------------------------------

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
        if (!variant.startsWith(root + '-[') || !ORDER_ROOTS[root + '-*']) continue
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
    // Nhóm `matchVariant` (plugin JS) xếp theo `sort`: phần đọc stylesheet lo (bản CDN không có plugin JS).
    const grouped = VARIANT_ORDER && STYLESHEET?.compareVariantGroups(a, b, VARIANT_ORDER)
    if (grouped) return grouped
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
    // `@custom-variant`/`@utility`/CSS của dự án chỉ dịch được khi đã có phần đọc stylesheet (useTailwindStylesheet).
    const stylesheet = STYLESHEET
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
            ...Object.entries(defaultTheme).filter(([k]) => !clearedBy(resetNamespaces, k)),
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
    if (stylesheet) for (const [name, body] of Object.entries(options.variants || {})) {
        if (name.endsWith('-*/*')) continue
        if (name.endsWith('-*')) {
            functionalVariants.push([name.slice(0, -2), body, options.variants?.[`${name}/*`] ?? null])
            if (!ownRoots[name]) ownRoots[name] = ['f', ++lastOrder]
            continue
        }
        const compiled = stylesheet.compileCustomVariant(body)
        if (!compiled) continue
        ownVariants[name] = compiled
        if (!ownRoots[name]) ownRoots[name] = ['s', ++lastOrder]
    }
    functionalVariants.sort((a, b) => b[0].length - a[0].length)
    // Nhóm `matchVariant` (`mq-big`, `mq-small`, `mq-*`): chung một thứ tự gốc, trong nhóm so bằng `compare`.
    const variantOrder = options.variantOrder
    if (variantOrder) stylesheet?.variantGroups(ownRoots, variantOrder, TW_ORDER.variants)
    const ghostBreakpoints: Record<string, string> = resetNamespaces.includes('--breakpoint-')
        ? Object.fromEntries(Object.entries(defaultTheme).filter(([k]) => k.startsWith('--breakpoint-') && ownTheme[k] === undefined).map(([k, v]) => [k.slice(13), v]))
        : {}
    const activate = () => {
        CUSTOM_VARIANTS = ownVariants
        FUNCTIONAL_VARIANTS = functionalVariants
        VARIANT_ORDER = variantOrder
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
    // như tw-animate-css), dịch ở src/tailwind-stylesheet.ts. Trùng tên với utility sẵn có thì cả hai cùng áp (như Tailwind).
    let applied: Set<number> | null = null
    const host: StylesheetHost = {
        place: (name, inUtilities) => {
            const result = place(name, inUtilities)
            if (result && applied) result.groups.forEach((group) => applied!.add(group))
            return result
        },
        atRuleOf,
        withThemeFallback,
    }
    const user = stylesheet && options.utilities && Object.keys(options.utilities).length ? stylesheet.userUtilities(options.utilities, ownTheme, host) : null
    const userRules = (name: string): Rule[] | null => (user ? user.rules(name) : null)
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
    // Rule sẵn có của lần gọi resolveAny ngoài cùng gần nhất (đặt ngay trước khi trả, sau mọi lần gọi lồng của `@apply`):
    // nguồn của nhóm @property cần đăng ký.
    let lastBuiltin: Rule | null = null
    const resolveAny = (name: string): Rule | null => {
        const builtin = resolveBuiltin(name)
        const own = userRules(name)
        lastBuiltin = builtin
        if (own) return builtin ? chain([builtin, ...own]) : chain(own)
        if (builtin) return builtin
        // Utility của dự án không khai báo `--modifier()` mà class có modifier: áp độ mờ lên kết quả (như trước).
        const [head, modifier] = splitModifier(name)
        if (modifier === null) return null
        const plain = userRules(head)
        lastBuiltin = null
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
    const place = (fullName: string, inUtilities = true): { placed: Placed[]; important: boolean; base: Array<[string, string]>; signature: string; root: string; variants: string[]; groups: Set<number> } | null => {
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
        const groups = new Set<number>()
        for (const each of lastBuiltin ? [lastBuiltin, ...(lastBuiltin.more || [])] : []) propertyGroups(each.decls, groups)

        const rules = [rule, ...(rule.more || [])]
        const baseDecls: Array<[string, string]> = rules.flatMap((each) => each.decls)
        const baseSignature = (rule.sel || '') + '|' + rule.decls.map(([p]) => p).join(',')
        const placed: Placed[] = []
        for (const variantList of expandVariants(parts)) {
            for (const each of rules) {
                if (!each.decls.length) continue
                const at = applyVariants(variantList, each.sel, darkMode, each.query)
                if (!at) return null
                // At-rule riêng của rule (`@layer daisyui.l1`, `@supports ...`): nối sau at-rule của biến thể thành chuỗi
                // lồng `[@media_x{@layer_y]` (engine bọc theo thứ tự). Thứ tự lồng không đổi tên layer hay điều kiện.
                if (each.at?.length) {
                    const outer = at.media ? atRuleOf(at.media) : ''
                    if (outer === null) return null
                    at.media = encodeArbitrary([outer, ...each.at].filter(Boolean).join('{'))
                }
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
        if (placed.some((p) => /::(before|after)/.test(p.sel))) {
            // before:/after: đọc `--tw-content`: Tailwind đăng ký biến này cả khi utility tự đặt `content`.
            propertyGroups([['content', 'var(--tw-content)']], groups)
            if (!baseDecls.some(([p]) => p === 'content')) baseDecls.unshift(['content', 'var(--tw-content)'])
        }
        if (importantAll && inUtilities) important = true
        return placed.length ? { placed, important, base: baseDecls, signature: baseSignature, root: base, variants: parts, groups } : null
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

    const dialect = ((className: string): string[] | null => {
        if (blocklist.has(className)) return null
        const result = place(className)
        if (!result) return null
        if (lastPlaced.size > 200) lastPlaced.clear()
        lastPlaced.set(className, result)
        // Utility người dùng trùng utility sẵn có cho cùng khai báo (`tab-4`): bỏ token lặp.
        const seen = new Set<string>()
        lastBase = result.groups.size ? [className, propertyCss(result.groups)] : null
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
    // Rule nền class cần (`@property` của utility sẵn có), engine hỏi ngay sau khi dịch class: thêm vào sheet gốc một lần.
    let lastBase: [string, string[]] | null = null
    dialect.baseRules = (className) => (lastBase && lastBase[0] === className ? lastBase[1] : undefined)
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
        if (explicit[base] || user?.has(base) || base === 'container') return true
        const [head] = splitModifier(base)
        return splitRoots(head).some(([root, value]) =>
            (families[root] !== undefined || arbitraryTemplates[root] !== undefined || !!user?.functional(root)) && TAILWIND_VALUE.test(value))
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
            user?.names.forEach((name) => names.add(name))
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
    // Nhóm @property của utility được `@apply` trong CSS của dự án: đăng ký sẵn trong CSS nền (như Tailwind).
    applied = new Set<number>()
    const projectCss = stylesheet && options.css ? stylesheet.projectCss(options.css, ownTheme, host) : ''
    const appliedGroups = applied
    applied = null
    const themeCss = stylesheet && projectCss ? stylesheet.usedThemeCss(projectCss, ownTheme) : ''
    dialect.baseCss = [
        BASE_LAYER_ORDER,
        propertyCss(appliedGroups).join('\n'),
        DATA.keyframes.join('\n'),
        themeCss ? `@layer l0{@layer theme{${themeCss}}}` : '',
        options.preflight ? themedPreflight().replace(/^@layer l0\{([\s\S]*)\}$/, '@layer l0{@layer base{$1}}') : '',
        projectCss,
    ].filter(Boolean).join('\n')
    return dialect
}

/** Thứ tự layer con của CSS nền trong `l0` (như `@layer theme, base, components` của Tailwind), trước mọi utility. */
const BASE_LAYER_ORDER = '@layer l0{@layer theme, base, components;}'

/** Phiên bản Tailwind mà dữ liệu được sinh từ. */
export const TAILWIND_DATA_VERSION = TW_DATA.version

/** Phần đọc CSS của người dùng mà phương ngữ cần (src/tailwind-stylesheet.ts). */
export type TailwindStylesheetSupport = Pick<typeof import('./tailwind-stylesheet'), 'compileCustomVariant' | 'userUtilities' | 'projectCss' | 'usedThemeCss' | 'themeRoots' | 'variantGroups' | 'compareVariantGroups'>
let STYLESHEET: TailwindStylesheetSupport | null = null
/**
 * Bật `@custom-variant`/`@utility`/CSS của dự án (`variants`, `utilities`, `css` của dialect) cho các dialect tạo sau đó.
 * src/tailwind-v4.ts gọi sẵn; bản CDN `tailwind-auto` chỉ gọi khi trang có `<style type="text/tailwindcss">` (nạp động
 * `tailwind-stylesheet.mjs`), nên trang chỉ dùng class không tải phần này.
 */
export const useTailwindStylesheet = (support: TailwindStylesheetSupport): void => {
    if (STYLESHEET !== support) THEME_ROOTS = support.themeRoots()
    STYLESHEET = support
}
/** Theme mặc định của Tailwind (cho `--theme()` khi đọc stylesheet). */
export { defaultTheme as TAILWIND_DEFAULT_THEME }
