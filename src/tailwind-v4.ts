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

type Rule = { sel: string; decls: Array<[string, string]> }

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
const splitTopLevel = (value: string) => {
    const parts: string[] = []
    let depth = 0
    let start = 0
    for (let i = 0; i < value.length; i++) {
        if (value[i] === '(') depth++
        else if (value[i] === ')') depth--
        else if (value[i] === ',' && depth === 0) {
            parts.push(value.slice(start, i).trim())
            start = i + 1
        }
    }
    parts.push(value.slice(start).trim())
    return parts
}
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
    all.forEach(([key]) => registeredKeys.add(key))
    return all.map(([key, query]) => ({ [`tw-${key}`]: query }))
}

const arbitraryInner = (raw: string) => raw.replace(/\\_/g, '\u0000').replace(/_/g, ' ').replace(/\u0000/g, '_')

/**
 * Mảnh selector của một "trạng thái" dùng được sau `not-`, `has-`, `in-`, `group-`, `peer-`:
 * `hover` -> `:hover`, `[.x]` -> `:is(.x)`, `nth-3` -> `:nth-child(3)`, `has-checked` -> `:has(:checked)`.
 */
const stateFragment = (state: string): string | null => {
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
const applyVariants = (variants: string[], baseSel: string, darkMode: 'media' | 'class'): { media: string; sel: string } | null => {
    let sel = baseSel.includes('&') ? baseSel : '&' + baseSel
    const media: string[] = []
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
        // group-*/peer-* (kể cả có tên `group-hover/item`), in-*: trạng thái của tổ tiên/anh em.
        const relation = variant.match(/^(group|peer|in)-(.+?)(?:\/([\w-]+))?$/)
        if (relation) {
            const fragment = stateFragment(relation[2])
            if (!fragment) return null
            if (relation[2] === 'hover') media.push('hover')
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
        if (arbitrary && arbitrary[1].startsWith('@')) {
            if (inline) return null
            inline = `[${arbitrary[1]}]`
            continue
        }
        const fragment = stateFragment(variant)
        if (fragment) {
            sel = sel.replace('&', '&' + fragment)
            continue
        }
        return null
    }
    if (pseudoElement) sel = sel.replace('&', '&' + pseudoElement)

    const unique = [...new Set(media)]
    if (inline) return unique.length ? null : { media: inline, sel }
    let mediaKey = ''
    if (unique.length === 1) mediaKey = unique[0]
    else if (unique.length === 2) {
        // Khớp tên key đã đăng ký: `md+max-lg`, `md+hover`, `max-sm+dark`, `dark+hover`.
        const [a, b] = unique
        mediaKey = registeredKeys.has(`${a}+${b}`) ? `${a}+${b}` : registeredKeys.has(`${b}+${a}`) ? `${b}+${a}` : ''
        if (!mediaKey) return null
    } else if (unique.length > 2) return null
    return { media: mediaKey ? `tw-${mediaKey}` : '', sel }
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

export const tailwindV4Dialect = (options: TailwindV4DialectOptions = {}): XCSSDialect => {
    const darkMode = options.darkMode ?? 'media'
    const ownTheme = options.theme && Object.keys(options.theme).length ? { ...defaultTheme, ...options.theme } : defaultTheme
    const activate = () => {
        if (theme === ownTheme) return
        theme = ownTheme
        RESPONSIVE = keysByNamespace('--breakpoint-')
        CONTAINER_SIZES = keysByNamespace('--container-')
    }
    activate()
    // `@utility name { ... }`: rule tường minh của người dùng, ưu tiên hơn dữ liệu Tailwind.
    const userUtilities = new Map<string, Rule>()
    for (const [name, body] of Object.entries(options.utilities || {})) {
        const decls = body.split(';').map((d) => d.trim()).filter(Boolean).map((d): [string, string] => {
            const colon = d.indexOf(':')
            return [d.slice(0, colon).trim(), d.slice(colon + 1).trim()]
        }).filter(([p, v]) => p && v)
        if (decls.length) userUtilities.set(name, { sel: '', decls })
    }
    const resolveAny = (name: string) => userUtilities.get(name) ?? resolveBase(name)
    // `@apply a b c;` trong CSS bổ sung: mở rộng thành khai báo (chỉ class gốc, không biến thể).
    const expandApply = (text: string) => text.replace(/@apply\s+([^;}]+);?/g, (_m, list: string) => list.trim().split(/\s+/).map((name) => {
        const important = name.endsWith('!') || name.startsWith('!')
        const rule = resolveAny(name.replace(/^!|!$/g, ''))
        if (!rule || rule.sel) return `/* @apply ${name}: chưa hỗ trợ */`
        return rule.decls.map(([p, v]) => `${p}:${withThemeFallback(v)}${important ? ' !important' : ''};`).join('')
    }).join(''))
    const dialect = ((className: string): string[] | null => {
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

        const placed = applyVariants(parts, rule.sel, darkMode)
        if (!placed) return null
        let decls = rule.decls
        // before:/after: cần `content` như Tailwind.
        if (/::(before|after)/.test(placed.sel) && !decls.some(([p]) => p === 'content')) {
            decls = [['content', 'var(--tw-content)'], ...decls]
        }
        const sel = placed.sel === '&' ? '' : placed.sel.startsWith('&') && placed.sel.indexOf('&', 1) === -1 ? placed.sel.slice(1) : placed.sel
        const suffix = sel ? '@' + sel.replace(/\s+/g, ';') : ''
        const prefix = placed.media ? placed.media + ':' : ''
        return decls.map(([prop, value]) => {
            // `--tw-blur: ;` (rỗng) của Tailwind: dùng `initial`, cùng kết quả khi biến được đọc
            // bằng `var(--tw-blur,)` vì engine không nhận giá trị rỗng.
            const finalValue = value.trim() === '' && prop.startsWith('--') ? 'initial' : withThemeFallback(value)
            return `${prefix}${prop}${important ? '!' : ''}[${encodeValue(finalValue)}]${suffix}`
        })
    }) as XCSSDialect
    // Khai báo lấy nguyên văn từ compiler Tailwind: không cần CSS.supports cho từng khai báo.
    dialect.trusted = true
    dialect.breakpoints = buildBreakpoints(darkMode)
    dialect.baseCss = [
        TW_PROPERTIES_CSS,
        options.preflight ? TW_PREFLIGHT_CSS : '',
        options.css ? expandApply(options.css) : '',
    ].filter(Boolean).join('\n')
    return dialect
}

/** Phiên bản Tailwind mà dữ liệu được sinh từ. */
export const TAILWIND_DATA_VERSION = TW_DATA.version

/**
 * Đọc stylesheet viết theo Tailwind v4 (`<style type="text/tailwindcss">`):
 *   - `@theme { --color-brand: #0a64e8; @keyframes wiggle {...} }` -> theme + keyframes,
 *   - CSS thường được giữ nguyên; `@import "tailwindcss"`, `@source`, `@plugin`, `@config` bị bỏ qua.
 * (`@apply`, `@utility`, `@custom-variant` chưa hỗ trợ.)
 */
export const parseTailwindStylesheet = (source: string): { theme: Record<string, string>; css: string; utilities: Record<string, string> } => {
    const theme: Record<string, string> = {}
    const utilities: Record<string, string> = {}
    let css = ''
    const text = source.replace(/\/\*[\s\S]*?\*\//g, '')
    let i = 0
    const readBlock = (start: number): number => {
        let depth = 0
        for (let k = start; k < text.length; k++) {
            if (text[k] === '{') depth++
            else if (text[k] === '}') {
                depth--
                if (depth === 0) return k
            }
        }
        return text.length - 1
    }
    while (i < text.length) {
        const rest = text.slice(i)
        const directive = rest.match(/^\s*@(import|source|plugin|config|reference)\b[^;]*;/)
        if (directive) {
            i += directive[0].length
            continue
        }
        const utilityHead = rest.match(/^\s*@utility\s+([\w-]+)\s*\{/)
        if (utilityHead) {
            const open = i + utilityHead[0].length - 1
            const close = readBlock(open)
            utilities[utilityHead[1]] = text.slice(open + 1, close).trim()
            i = close + 1
            continue
        }
        const themeHead = rest.match(/^\s*@theme\b[^{]*\{/)
        if (themeHead) {
            const open = i + themeHead[0].length - 1
            const close = readBlock(open)
            const body = text.slice(open + 1, close)
            for (const kf of body.match(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) || []) css += kf + '\n'
            for (const decl of body.replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '').matchAll(/(--[\w.-]+)\s*:\s*([^;]+);/g)) {
                theme[decl[1]] = decl[2].trim()
            }
            i = close + 1
            continue
        }
        const nextAt = [text.indexOf('@theme', i + 1), text.indexOf('@utility', i + 1)].filter((n) => n !== -1)
        const end = nextAt.length ? Math.min(...nextAt) : text.length
        css += text.slice(i, end)
        i = end
    }
    return { theme, css: css.trim(), utilities }
}
