/**
 * Phương ngữ Tailwind v4 dựng từ dữ liệu sinh tự động (src/tailwind-generated.ts) bằng chính
 * compiler của Tailwind. Mỗi class Tailwind được đổi thành các token x-css (khai báo nguyên văn của
 * Tailwind, kể cả biến `--tw-*`), nên CSS sinh ra khớp Tailwind thay vì "gần giống".
 *
 *   import { tailwindV4Dialect } from '@porbit/style/tailwind'
 *   xcss.cssObserve(document, { dialects: [tailwindV4Dialect({ preflight: true })] })
 */
import type { XCSSDialect } from './core'
import { TW_DATA, TW_PREFLIGHT_CSS, TW_PROPERTIES_CSS } from './tailwind-generated'

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
}

const defaultTheme = TW_DATA.theme as Record<string, string>
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
const families = TW_DATA.families as unknown as Record<string, Array<[number, number]>>
const explicit = TW_DATA.explicit as unknown as Record<string, readonly number[]>
const arbitraryTemplates = TW_DATA.arbitrary as unknown as Record<string, number | Record<string, number>>
const templates = TW_DATA.templates as unknown as readonly number[][]
const sels = TW_DATA.sels as readonly string[]
const declTable = TW_DATA.decls as readonly string[]
const valueSetCache: Array<Set<string> | undefined> = []
const valueSet = (index: number): Set<string> =>
    (valueSetCache[index] ||= new Set((TW_DATA.valueSets as readonly string[])[index].split(' ')))

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
        if (depth > 0 && (ch === '+' || ch === '-') && /[\w%)]/.test(prev) && /[\w(.]/.test(next) &&
            !/[a-z-]/i.test(prev === ')' ? '' : prev.replace(/[\d%]/, '')) ) {
            out += ` ${ch} `
            continue
        }
        out += ch
    }
    return out.replace(/\s+/g, ' ')
}
const decodeArbitrary = (raw: string) => spaceMathOperators(raw.replace(/\\_/g, '\u0000').replace(/_/g, ' ').replace(/\u0000/g, '_'))

const COLOR_VALUE = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\(.*\)|currentcolor|transparent|var\(--color-[\w-]+\))$/i
const LENGTH_VALUE = /^(-?(\d*\.)?\d+(px|r?em|%|vh|vw|dvh|dvw|svh|svw|lvh|lvw|vmin|vmax|ch|ex|lh|rlh|cm|mm|in|pt|pc|cq[whib]|cqmin|cqmax)|0|(calc|min|max|clamp)\(.*\))$/i
const NUMBER_VALUE = /^-?(\d*\.)?\d+$/

const arbitraryKind = (value: string): { kind: string; value: string } => {
    const hint = value.match(/^(length|color|number|percentage|url|image|family-name|absolute-size|relative-size|position|bg-size|line-width|integer|any):(.*)$/)
    if (hint) {
        const kind = hint[1] === 'color' ? 'color' : hint[1] === 'number' || hint[1] === 'integer' ? 'number' : hint[1] === 'length' || hint[1] === 'percentage' || hint[1] === 'line-width' ? 'length' : 'any'
        return { kind, value: hint[2] }
    }
    if (COLOR_VALUE.test(value)) return { kind: 'color', value }
    if (NUMBER_VALUE.test(value)) return { kind: 'number', value }
    if (LENGTH_VALUE.test(value)) return { kind: 'length', value }
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

const resolveBase = (name: string): Rule | null => {
    const direct = explicit[name]
    if (direct) return unpack(direct)

    // Thuộc tính tuỳ ý: `[mask-type:luminance]`.
    const property = name.match(/^\[([a-z-]+):(.+)\]$/)
    if (property) return { sel: '', decls: [[property[1], decodeArbitrary(property[2])]] }

    for (const [root, value] of splitRoots(name)) {
        const arbitrary = value.match(/^\[(.+)\]$/)
        if (arbitrary) {
            const options = arbitraryTemplates[root]
            if (options === undefined) continue
            const { kind, value: raw } = arbitraryKind(decodeArbitrary(arbitrary[1]))
            const index = typeof options === 'number' ? options : options[kind] ?? options.any ?? options.length
            if (index === undefined) continue
            return unpack(templates[index], (t) => t.split('{a}').join(raw))
        }
        // Giá trị theo biến CSS kiểu Tailwind v4: `bg-(--brand)`.
        const variable = value.match(/^\((--[\w-]+)\)$/)
        if (variable) {
            const options = arbitraryTemplates[root]
            if (options === undefined) continue
            const index = typeof options === 'number' ? options : options.color ?? options.any ?? options.length
            if (index !== undefined) return unpack(templates[index], (t) => t.split('{a}').join(`var(${variable[1]})`))
            continue
        }
        const entries = families[root]
        if (!entries) continue
        for (const [templateIndex, setIndex] of entries) {
            const accepted = setIndex === -1
                ? NUMBER_VALUE.test(value) && Number.isInteger(Number(value) * 4)
                : valueSet(setIndex).has(value)
            if (accepted) return unpack(templates[templateIndex], (t) => fill(t, value))
        }
        if (theme !== defaultTheme) {
            const shadow = themeShadow(name)
            if (shadow) return shadow
            for (const [templateIndex] of entries) {
                let prefixes = themePrefixCache.get(templateIndex)
                if (!prefixes) {
                    const text = templates[templateIndex].slice(1).map((i) => declTable[i]).join(';')
                    prefixes = [...text.matchAll(/var\((--[\w-]*?)\{v\}\)/g)].map((m) => m[1])
                    themePrefixCache.set(templateIndex, prefixes)
                }
                if (prefixes.length && prefixes.every((prefix) => theme[prefix + value] !== undefined)) {
                    return unpack(templates[templateIndex], (t) => fill(t, value))
                }
            }
        }
    }
    return null
}

// Bóng đổ từ theme (`--shadow-soft`): Tailwind nhúng giá trị và bọc từng màu trong
// `var(--tw-shadow-color, màu)` thay vì đọc `var(--shadow-soft)`. Dựng lại từ rule `*-sm` làm mẫu.
const SHADOW_FAMILIES: Record<string, { ns: string; target: string; color: string }> = {
    shadow: { ns: '--shadow-', target: '--tw-shadow', color: '--tw-shadow-color' },
    'inset-shadow': { ns: '--inset-shadow-', target: '--tw-inset-shadow', color: '--tw-inset-shadow-color' },
    'text-shadow': { ns: '--text-shadow-', target: 'text-shadow', color: '--tw-text-shadow-color' },
    'drop-shadow': { ns: '--drop-shadow-', target: '--tw-drop-shadow-size', color: '--tw-drop-shadow-color' },
}
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

// `bg-red-500/50` (độ mờ màu) và `text-sm/6` (line-height).
const applyModifier = (rule: Rule, modifier: string): Rule | null => {
    const arbitrary = modifier.match(/^\[(.+)\]$/)
    if (rule.decls.some(([prop]) => prop === 'font-size')) {
        const lineHeight = arbitrary ? decodeArbitrary(arbitrary[1]) : NUMBER_VALUE.test(modifier) ? `calc(var(--spacing) * ${modifier})` : null
        if (!lineHeight) return null
        return { sel: rule.sel, decls: rule.decls.map(([p, v]) => [p, p === 'line-height' ? lineHeight : v]) }
    }
    const percent = arbitrary
        ? (NUMBER_VALUE.test(arbitrary[1]) ? `${Number(arbitrary[1]) * 100}%` : arbitrary[1])
        : NUMBER_VALUE.test(modifier) ? `${modifier}%` : null
    if (!percent) return null
    let changed = false
    const decls = rule.decls.map(([prop, value]): [string, string] => {
        const next = value.replace(/var\(--color-[\w-]+\)|currentcolor|#[0-9a-fA-F]{3,8}\b/g, (color) => {
            changed = true
            return `color-mix(in oklab, ${color} ${percent}, transparent)`
        })
        return [prop, next]
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

const breakpointValue = (key: string) => theme[`--breakpoint-${key}`]
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
    if (max && RESPONSIVE.includes(max[1])) return `(width < ${breakpointValue(max[1])})`
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
 * Mảnh selector của một "trạng thái" dùng được sau `not-`, `has-`, `in-`, `group-`, `peer-`:
 * `hover` -> `:hover`, `[.x]` -> `:is(.x)`, `nth-3` -> `:nth-child(3)`, `has-checked` -> `:has(:checked)`.
 */
const stateFragment = (state: string): string | null => {
    if (CUSTOM_VARIANTS[state]) return customFragment(CUSTOM_VARIANTS[state])
    if (PSEUDO_CLASSES[state]) return PSEUDO_CLASSES[state]
    const arbitrary = state.match(/^\[(.+)\]$/)
    if (arbitrary) {
        const inner = arbitraryInner(arbitrary[1])
        return inner.includes('&') ? null : `:is(${inner})`
    }
    const nth = state.match(/^nth(-last)?(-of-type)?-(?:\[(.+)\]|(\d+))$/)
    if (nth) return `:nth${nth[1] || ''}${nth[2] ? '-of-type' : '-child'}(${nth[3] ? arbitraryInner(nth[3]) : nth[4]})`
    const attr = state.match(/^(aria|data)-(?:\[(.+)\]|([a-z-]+))$/)
    if (attr) return `[${attr[1]}-${attr[2] ? arbitraryInner(attr[2]) : attr[1] === 'aria' ? `${attr[3]}="true"` : attr[3]}]`
    if (state === 'ltr' || state === 'rtl') return `:where(:dir(${state}), [dir="${state}"], [dir="${state}"] *)`
    // Quan hệ lồng: `group-peer-hover` = .group đứng sau .peer đang hover; `in-hover` = nằm trong phần tử hover.
    const relation = state.match(/^(group|peer|in)-(.+?)(?:\/([\w-]+))?$/)
    if (relation) {
        const inner = stateFragment(relation[2])
        if (!inner) return null
        const marker = relation[3] ? `${relation[1]}\\/${relation[3]}` : relation[1]
        if (relation[1] === 'in') return `:is(:where(${inner}) *)`
        return relation[1] === 'group' ? `:is(:where(.${marker})${inner} *)` : `:is(:where(.${marker})${inner} ~ *)`
    }
    const has = state.match(/^has-(.+)$/)
    if (has) {
        const inner = stateFragment(has[1])
        return inner ? `:has(${inner})` : null
    }
    const not = state.match(/^not-(.+)$/)
    if (not) {
        const inner = stateFragment(not[1])
        return inner ? `:not(${inner})` : null
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
        if (notMedia && mediaOf(notMedia[1], darkMode)) {
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
        // group-*/peer-* (kể cả có tên `group-hover/item`), in-*: trạng thái của tổ tiên/anh em.
        const relation = variant.match(/^(group|peer|in)-(.+?)(?:\/([\w-]+))?$/)
        if (relation) {
            const fragment = stateFragment(relation[2])
            if (!fragment) return null
            if (/(^|-)hover$/.test(relation[2])) media.push('hover')
            const marker = relation[3] ? `${relation[1]}\\/${relation[3]}` : relation[1]
            if (relation[1] === 'in') sel = `:where(${fragment}) ` + sel
            else sel = sel.replace('&', relation[1] === 'group' ? `&:is(:where(.${marker})${fragment} *)` : `&:is(:where(.${marker})${fragment} ~ *)`)
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
        const fragment = stateFragment(variant)
        if (fragment) {
            // `has-group-hover`: Tailwind bọc trong `@media (hover: hover)`.
            if (/^has-.*-hover$/.test(variant)) media.push('hover')
            sel = sel.replace('&', '&' + fragment)
            continue
        }
        return null
    }
    if (pseudoElement) sel = sel.replace('&', '&' + pseudoElement)

    const unique = [...new Set(media)]
    if (inline) return unique.length || queries.length ? null : { media: inline, sel }
    if (!queries.length) {
        if (unique.length <= 1) return { media: unique.length ? `tw-${unique[0]}` : '', sel }
        if (unique.length === 2) {
            // Khớp tên key đã đăng ký: `md+max-lg`, `md+hover`, `max-sm+dark`, `dark+hover`.
            const [a, b] = unique
            const key = registeredKeys.has(`${a}+${b}`) ? `${a}+${b}` : registeredKeys.has(`${b}+${a}`) ? `${b}+${a}` : ''
            if (key) return { media: `tw-${key}`, sel }
        }
    }
    // ≥3 điều kiện (`md:dark:hover:`) hoặc tổ hợp chưa đăng ký: at-rule nội tuyến `@media a and b and c`.
    const all = [...unique.map((key) => MEDIA_QUERY.get(key)), ...queries]
    if (all.some((query) => query === undefined || query.startsWith('@'))) return null
    return { media: encodeArbitrary(`@media ${[...new Set(all)].join(' and ')}`), sel }
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

/** Áp giá trị (và modifier) vào `@utility name-*`. */
const evaluateUtility = (utility: UserUtility, value: string | null, modifier: string | null): Rule[] | null => {
    let matched = !utility.functional
    const rules: Rule[] = []
    for (const rule of utility.rules) {
        const decls = new Map<string, string>()
        for (const [prop, raw] of rule.decls) {
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
            // Cùng thuộc tính khai báo nhiều lần: khai báo sau thắng (như cascade).
            decls.delete(prop)
            decls.set(prop, next)
        }
        if (decls.size) rules.push({ sel: rule.sel, query: rule.query, decls: [...decls] })
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

/** Mảnh selector của biến thể tự định nghĩa khi dùng sau `group-`, `peer-`, `not-`, `has-`, `in-`. */
const customFragment = (alternatives: string[][]): string | null => {
    const fragments: string[] = []
    for (const steps of alternatives) {
        if (steps.length !== 1) return null
        const sel = arbitraryInner(steps[0].slice(1, -1))
        if (!sel.startsWith('&') || sel.indexOf('&', 1) !== -1) return null
        fragments.push(sel.slice(1))
    }
    return fragments.length === 1 ? fragments[0] : `:is(${fragments.map((f) => '*' + f).join(', ')})`
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

export const tailwindV4Dialect = (options: TailwindV4DialectOptions = {}): XCSSDialect => {
    const darkMode = options.darkMode ?? 'media'
    const ownTheme = options.theme && Object.keys(options.theme).length ? { ...defaultTheme, ...options.theme } : defaultTheme
    const ownVariants: Record<string, string[][]> = {}
    for (const [name, body] of Object.entries(options.variants || {})) {
        const compiled = compileCustomVariant(body)
        if (compiled) ownVariants[name] = compiled
    }
    const activate = () => {
        CUSTOM_VARIANTS = ownVariants
        if (theme === ownTheme) return
        theme = ownTheme
        RESPONSIVE = keysByNamespace('--breakpoint-')
        CONTAINER_SIZES = keysByNamespace('--container-')
    }
    activate()
    const breakpoints = buildBreakpoints(darkMode)

    // `@utility name { ... }` / `@utility name-* { --value(...) }`: utility của người dùng (kể cả plugin CSS
    // như tw-animate-css). Trùng tên với utility sẵn có thì cả hai cùng áp (như Tailwind).
    const staticUtilities = new Map<string, UserUtility>()
    const functionalUtilities: Array<[string, UserUtility]> = []
    for (const [name, body] of Object.entries(options.utilities || {})) {
        const utility = compileUserUtility(body.includes(':') || body.includes('{') ? body : '')
        if (name.endsWith('-*')) functionalUtilities.push([name.slice(0, -2), utility])
        else staticUtilities.set(name, utility)
    }
    functionalUtilities.sort((a, b) => b[0].length - a[0].length)
    const userRules = (name: string): Rule[] | null => {
        const own = staticUtilities.get(name)
        if (own) return evaluateUtility(own, null, null)
        for (const [prefix, utility] of functionalUtilities) {
            if (!name.startsWith(prefix + '-')) continue
            let value = name.slice(prefix.length + 1)
            let modifier: string | null = null
            const slash = value.lastIndexOf('/')
            if (utility.usesModifier && slash > 0 && !value.slice(slash).includes(']')) {
                modifier = value.slice(slash + 1)
                value = value.slice(0, slash)
            }
            const rules = evaluateUtility(utility, value, modifier)
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
    const resolveAny = (name: string): Rule | null => {
        const builtin = name === 'container' ? containerRule() : resolveBase(name)
        const own = userRules(name)
        if (!own) return builtin
        return builtin ? chain([builtin, ...own]) : chain(own)
    }

    /** Mỗi biến thể tự định nghĩa có thể có nhiều phương án (danh sách selector = nhiều rule). */
    const expandVariants = (parts: string[]): string[][] => {
        let lists: string[][] = [[]]
        for (const variant of parts) {
            // `not-hover`, `not-group-hover`...: `:not(...)` + `@media not (hover: hover)` như Tailwind.
            const notHover = /^not-((group|peer|in)-)*hover(\/[\w-]+)?$/.test(variant)
            const alternatives = ownVariants[variant] ?? (notHover ? [[variant], ['[@media_not_(hover:_hover)]']] : [[variant]])
            lists = lists.flatMap((list) => alternatives.map((steps) => [...list, ...steps]))
        }
        return lists
    }

    type Placed = { media: string; sel: string; decls: Array<[string, string]> }
    /** Class Tailwind -> các rule đã đặt chỗ (selector có `&`, media key/at-rule nội tuyến, khai báo). */
    const place = (className: string): { placed: Placed[]; important: boolean } | null => {
        activate()
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

        let rule = resolveAny(base)
        if (!rule) {
            const slash = base.lastIndexOf('/')
            if (slash > 0 && !base.slice(slash).includes(']')) {
                const resolved = resolveAny(base.slice(0, slash))
                rule = resolved && applyModifier(resolved, base.slice(slash + 1))
            }
        }
        if (!rule) return null

        const rules = [rule, ...(rule.more || [])]
        const placed: Placed[] = []
        for (const variantList of expandVariants(parts)) {
            for (const each of rules) {
                if (!each.decls.length) continue
                const at = applyVariants(variantList, each.sel, darkMode, each.query)
                if (!at) return null
                let decls = each.decls
                // before:/after: cần `content` như Tailwind.
                if (/::(before|after)/.test(at.sel) && !decls.some(([p]) => p === 'content')) {
                    decls = [['content', 'var(--tw-content)'], ...decls]
                }
                placed.push({ ...at, decls })
            }
        }
        return placed.length ? { placed, important } : null
    }

    // `@apply a md:b hover:c/50 !d;` trong CSS bổ sung: khai báo gốc đặt tại chỗ, biến thể thành rule riêng.
    const applyTo = (selector: string, list: string): { inline: string; extra: string } => {
        let inline = ''
        let extra = ''
        const parentSel = splitTopLevel(selector).length > 1 ? `:is(${selector})` : selector
        for (const name of list.trim().split(/\s+/)) {
            const result = place(name)
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
        const result = place(className)
        if (!result) return null
        // Utility người dùng trùng utility sẵn có cho cùng khai báo (`tab-4`): bỏ token lặp.
        const seen = new Set<string>()
        return result.placed.flatMap(({ media, sel: placedSel, decls }) => {
            const sel = placedSel === '&' ? '' : placedSel.startsWith('&') && placedSel.indexOf('&', 1) === -1 ? placedSel.slice(1) : placedSel
            const suffix = sel ? '@' + sel.replace(/\s+/g, ';') : ''
            const prefix = media ? media + ':' : ''
            return decls.map(([prop, value]) => {
                // `--tw-blur: ;` (rỗng) của Tailwind: dùng `initial`, cùng kết quả khi biến được đọc
                // bằng `var(--tw-blur,)` vì engine không nhận giá trị rỗng.
                const finalValue = value.trim() === '' && prop.startsWith('--') ? 'initial' : withThemeFallback(value)
                return `${prefix}${prop}${result.important ? '!' : ''}[${encodeValue(finalValue)}]${suffix}`
            }).filter((token) => !seen.has(token) && !!seen.add(token))
        })
    }) as XCSSDialect
    // Khai báo lấy nguyên văn từ compiler Tailwind: không cần CSS.supports cho từng khai báo.
    dialect.trusted = true
    dialect.breakpoints = breakpoints
    dialect.baseCss = [
        TW_PROPERTIES_CSS,
        options.preflight ? themedPreflight() : '',
        options.css ? layerBaseCss(options.css.includes('@apply') ? expandApply(options.css) : options.css) : '',
    ].filter(Boolean).join('\n')
    return dialect
}

/** Phiên bản Tailwind mà dữ liệu được sinh từ. */
export const TAILWIND_DATA_VERSION = TW_DATA.version

export interface TailwindStylesheet {
    theme: Record<string, string>
    css: string
    utilities: Record<string, string>
    variants: Record<string, string>
    /** `@import`/`@plugin` không giải được (ngoài `tailwindcss`). */
    unresolved: string[]
}

export interface ParseTailwindOptions {
    /** Trả nội dung CSS cho `@import "x"` / `@plugin "x"` (ví dụ plugin đóng gói sẵn); null nếu không có. */
    resolve?: (id: string) => string | null
}

/**
 * Đọc stylesheet viết theo Tailwind v4 (`<style type="text/tailwindcss">`, `app.css`):
 *   - `@theme { --color-brand: #0a64e8; @keyframes wiggle {...} }` -> theme + keyframes,
 *   - `@utility name {...}`, `@utility name-* { x: --value(...) }` -> utilities,
 *   - `@custom-variant name (&:is(.dark *));` hoặc dạng khối có `@slot` -> variants,
 *   - CSS còn lại giữ nguyên (`@apply` được dialect mở rộng); `@import "tailwindcss"`, `@source`, `@config` bị bỏ qua.
 */
export const parseTailwindStylesheet = (source: string, options: ParseTailwindOptions = {}): TailwindStylesheet => {
    const sheet: TailwindStylesheet = { theme: {}, css: '', utilities: {}, variants: {}, unresolved: [] }
    const seen = new Set<string>()
    const KEYFRAMES = /@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g
    const read = (text: string) => {
        for (const item of parseCssItems(text.replace(/\/\*[\s\S]*?\*\//g, ''))) {
            if ('decl' in item) continue
            if ('at' in item) {
                const load = item.at.match(/^@(import|plugin)\s+(?:url\()?["']([^"']+)["']/)
                if (load) {
                    const id = load[2]
                    if (id === 'tailwindcss' || id.startsWith('tailwindcss/') || seen.has(id)) continue
                    seen.add(id)
                    const content = options.resolve?.(id)
                    if (content) read(content)
                    else sheet.unresolved.push(id)
                    continue
                }
                const variant = item.at.match(/^@custom-variant\s+([\w-]+)\s+([\s\S]+)$/)
                if (variant) sheet.variants[variant[1]] = variant[2].trim()
                else if (!/^@(source|config|reference|tailwind|import|plugin)\b/.test(item.at)) sheet.css += item.at + ';\n'
                continue
            }
            const utility = item.head.match(/^@utility\s+(-?[\w-]+(?:-\*)?)$/)
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
                for (const kf of item.body.match(KEYFRAMES) || []) sheet.css += kf + '\n'
                for (const decl of item.body.replace(KEYFRAMES, '').matchAll(/(--[\w.-]+(?:\\.[\w-]+)*)\s*:\s*([^;]+);/g)) {
                    sheet.theme[decl[1].replace(/\\\./g, '.')] = decl[2].trim()
                }
                continue
            }
            if (/^@plugin\b/.test(item.head)) continue
            sheet.css += `${item.head}{${item.body}}\n`
        }
    }
    read(source)
    sheet.css = sheet.css.trim()
    return sheet
}
