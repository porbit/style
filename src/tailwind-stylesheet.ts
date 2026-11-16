/**
 * Đọc CSS viết theo Tailwind v4 của người dùng: stylesheet (`@theme`, `@utility`, `@custom-variant`, `@plugin`,
 * `@source not inline`...), `@utility`/`@custom-variant` đã đọc, `@apply` và hàm theme trong CSS của dự án.
 * Tách khỏi phương ngữ (src/tailwind-v4-core.ts) để bản CDN `tailwind-auto` chỉ tải phần này (file tự chứa
 * `tailwind-stylesheet.mjs`) khi trang có `<style type="text/tailwindcss">`. Không import dữ liệu Tailwind hay
 * trạng thái của phương ngữ: phần cần từ phương ngữ truyền qua tham số (`StylesheetHost`, theme).
 */
import { encodeArbitrary, normalizeTailwindPrefix, replaceCssFunction, splitTopLevel, arbitraryInner, type Rule } from './tailwind-css-text'

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
            const k = blockEnd(text, j + 1)
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

/** Selector lồng (`&:hover`, `.a &`, `::x`) ghép với selector cha có `&`. */
const nestSelector = (parent: string, child: string) => {
    const own = child.includes('&') ? child : `& ${child}`
    return parent === '&' ? own : own.replace(/&/g, parent)
}

/** Cây khối của một `@utility` -> danh sách rule (rule đầu là khai báo cấp ngoài). */
const utilityRules = (body: string): Rule[] => {
    const rules: Rule[] = []
    const walk = (text: string, sel: string, query: string | undefined, at: string[] | undefined) => {
        let rule: Rule = { sel, decls: [], query, at }
        rules.push(rule)
        for (const item of parseCssItems(text)) {
            if ('decl' in item) rule.decls.push(item.decl)
            // `@apply a b` giữ chỗ (thứ tự so với khai báo khác) dưới dạng khai báo giả `@apply`.
            else if ('at' in item && /^@apply\s/.test(item.at)) rule.decls.push(['@apply', item.at.slice(7).trim()])
            else if ('head' in item) {
                const media = item.head.match(/^@media\s+(.+)$/)
                // Media lồng trong at-rule khác giữ đúng chỗ (`@layer x { @media y {...} }`).
                if (media && !at) walk(item.body, sel, query ? `${query} and ${media[1]}` : media[1], at)
                else if (media || /^@(layer|supports|container|starting-style)\b/.test(item.head)) walk(item.body, sel, query, [...(at || []), item.head.replace(/\s+/g, ' ')])
                else if (!item.head.startsWith('@')) {
                    for (const part of splitTopLevel(item.head)) walk(item.body, nestSelector(sel, part), query, at)
                } else continue
                // Khai báo sau khối lồng (`a: 1; @supports (...) { a: 2 } b: 3;`) là rule mới để giữ thứ tự cascade.
                rule = { sel, decls: [], query, at }
                rules.push(rule)
            }
        }
    }
    walk(body, '&', undefined, undefined)
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
const resolveFunctionalArg = (args: string, raw: string, theme: Record<string, string>): string | null => {
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

type UserUtility = { rules: Rule[]; functional: boolean; usesModifier: boolean }

const compileUserUtility = (body: string): UserUtility => ({
    rules: utilityRules(body),
    functional: body.includes('--value('),
    usesModifier: body.includes('--modifier('),
})

/** `@apply` trong `@utility`: khai báo đặt tại chỗ + rule riêng cho phần có biến thể. */
type ApplyInUtility = (list: string, sel: string, query: string | undefined) => { decls: Array<[string, string]>; rules: Rule[] }

/** Áp giá trị (và modifier) vào `@utility name-*`. */
const evaluateUtility = (utility: UserUtility, value: string | null, modifier: string | null, theme: Record<string, string>, apply?: ApplyInUtility): Rule[] | null => {
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
                next = value === null ? null : replaceCssFunction(next, '--value', (args) => resolveFunctionalArg(args, value, theme))
                if (next !== null) matched = true
            }
            if (next !== null && next.includes('--modifier(')) {
                next = modifier === null ? null : replaceCssFunction(next, '--modifier', (args) => resolveFunctionalArg(args, modifier, theme))
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
        if (decls.length) rules.push({ sel: rule.sel, query: rule.query, at: rule.at, decls })
        rules.push(...extra)
    }
    return matched && rules.length ? rules : null
}

/**
 * `@custom-variant` -> các phương án, mỗi phương án là chuỗi biến thể tuỳ ý (`[&:where(...)]`,
 * `[@media_...]`). Danh sách selector (`&:a, &:b`) thành nhiều phương án = nhiều rule như Tailwind.
 */
export const compileCustomVariant = (body: string): string[][] | null => {
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

/** Vị trí ngay sau `}` đóng khối bắt đầu ở `start` (sau `{`), bỏ qua ngoặc trong chuỗi. */
const blockEnd = (text: string, start: number): number => {
    let depth = 1
    let k = start
    for (let quote = ''; k < text.length && depth > 0; k++) {
        const ch = text[k]
        if (quote) {
            if (ch === '\\') k++
            else if (ch === quote) quote = ''
        } else if (ch === '"' || ch === "'") quote = ch
        else if (ch === '{') depth++
        else if (ch === '}') depth--
    }
    return k
}

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
export const usedThemeCss = (css: string, values: Record<string, string>): string => {
    const used = new Set<string>()
    const visit = (text: string) => {
        for (const m of text.matchAll(/var\(\s*(--(?:[\w-]|\\.)+)/g)) {
            // `--spacing-0\.5` -> tên theme `--spacing-0.5`.
            const name = m[1].replace(/\\/g, '')
            // `--color-primary: var(--color-primary)` (theme cấu hình của plugin như daisyUI, Tailwind coi là
            // `reference` nên không phát): khai báo ở `:root` sẽ thành vòng lặp, xoá giá trị thật của dự án.
            if (values[name] === undefined || used.has(name) || values[name].trim() === `var(${name})`) continue
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
 * `defaultTheme`: theme mặc định của Tailwind (`TAILWIND_DEFAULT_THEME`) cho `--theme()`; src/tailwind-v4.ts truyền sẵn.
 */
export const parseTailwindStylesheet = (source: string, options: ParseTailwindOptions = {}, defaultTheme: Record<string, string> = {}): TailwindStylesheet => {
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

/**
 * Đọc nhiều stylesheet theo thứ tự (các thẻ `<style type="text/tailwindcss">` của bản CDN) thành một: khoá sau ghi đè,
 * `prefix`/`important` lấy giá trị khai báo cuối cùng, `css`/`blocklist`/`unresolved` nối lại.
 */
export const parseTailwindStylesheets = (sources: string[], options: ParseTailwindOptions = {}, defaultTheme: Record<string, string> = {}): TailwindStylesheet => {
    const out: TailwindStylesheet = { theme: {}, css: '', utilities: {}, variants: {}, unresolved: [] }
    for (const text of sources) {
        const parsed = parseTailwindStylesheet(text, options, defaultTheme)
        Object.assign(out.theme, parsed.theme)
        Object.assign(out.utilities, parsed.utilities)
        Object.assign(out.variants, parsed.variants)
        if (parsed.prefix !== undefined) out.prefix = parsed.prefix
        if (parsed.important !== undefined) out.important = parsed.important
        if (parsed.blocklist) (out.blocklist ??= []).push(...parsed.blocklist)
        out.css += parsed.css + '\n'
        out.unresolved.push(...parsed.unresolved)
    }
    out.css = out.css.trim()
    return out
}

/** Phần phương ngữ cho CSS của người dùng: đặt chỗ một class (`@apply`), at-rule của media key, dự phòng theme. */
export interface StylesheetHost {
    place: (name: string, inUtilities: boolean) => { placed: Array<{ media: string; sel: string; decls: Array<[string, string]> }>; important: boolean } | null
    atRuleOf: (media: string) => string | null
    withThemeFallback: (value: string) => string
}

/**
 * `@utility name { ... }` / `@utility name-* { --value(...) }` của dự án/plugin -> tra rule theo tên class.
 * `theme`: theme của dialect (`--value(--x-*)`).
 */
export const userUtilities = (utilities: Record<string, string>, theme: Record<string, string>, host: StylesheetHost) => {
    const staticUtilities = new Map<string, UserUtility>()
    const functionalUtilities: Array<[string, UserUtility]> = []
    for (const [name, body] of Object.entries(utilities)) {
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
            const result = host.place(name, false)
            applying.delete(name)
            if (!result) continue
            for (const placed of result.placed) {
                let media: string | undefined
                if (placed.media) {
                    const at = host.atRuleOf(placed.media)
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
    const rules = (name: string): Rule[] | null => {
        const own = staticUtilities.get(name)
        if (own) return evaluateUtility(own, null, null, theme, applyInUtility)
        for (const [prefix, utility] of functionalUtilities) {
            if (!name.startsWith(prefix + '-')) continue
            let value = name.slice(prefix.length + 1)
            let modifier: string | null = null
            const slash = value.lastIndexOf('/')
            if (utility.usesModifier && slash > 0 && !value.slice(slash).includes(']')) {
                modifier = value.slice(slash + 1)
                value = value.slice(0, slash)
            }
            const rules = evaluateUtility(utility, value, modifier, theme, applyInUtility)
            if (rules) return rules
        }
        return null
    }
    return {
        names: [...staticUtilities.keys()],
        has: (name: string) => staticUtilities.has(name),
        functional: (root: string) => functionalUtilities.some(([name]) => name === root),
        rules,
    }
}

/**
 * CSS của dự án (`css` của dialect): mở rộng `@apply`, đưa `@layer base/components/theme` vào layer con của `l0`,
 * khai triển `--alpha()`/`--spacing()`/`--theme()` theo `theme`.
 */
export const projectCss = (css: string, theme: Record<string, string>, host: StylesheetHost): string => {
    // `@apply a md:b hover:c/50 !d;` trong CSS bổ sung: khai báo gốc đặt tại chỗ, biến thể thành rule riêng.
    const applyTo = (selector: string, list: string): { inline: string; extra: string } => {
        let inline = ''
        let extra = ''
        const parentSel = splitTopLevel(selector).length > 1 ? `:is(${selector})` : selector
        for (const name of list.trim().split(/\s+/)) {
            const result = host.place(name, false)
            if (!result) {
                inline += `/* @apply ${name}: chưa hỗ trợ */`
                continue
            }
            for (const { media, sel, decls } of result.placed) {
                const body = decls.map(([p, v]) => `${p}:${v.trim() === '' && p.startsWith('--') ? 'initial' : host.withThemeFallback(v)}${result.important ? ' !important' : ''};`).join('')
                if (!media && sel === '&') {
                    inline += body
                    continue
                }
                const rule = `${sel.replace(/&/g, parentSel)}{${body}}`
                const wrapper = media ? host.atRuleOf(media) : ''
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
                // `@layer utilities` của dự án: cùng layer với utility; `@layer base/components/theme` đổi sau (layerBaseCss).
                const head = /^@layer\s+utilities$/.test(item.head) ? '@layer l0' : item.head
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
    // `@layer base/components/theme` của dự án/plugin -> layer con cùng tên của `l0` (`@layer l0{@layer base{...}}`),
    // thứ tự `theme, base, components` khai báo ở đầu CSS nền: thấp hơn mọi utility (nằm thẳng trong `l0`) và thấp hơn
    // layer con mà utility của plugin tự đặt (`@layer daisyui.l1` của daisyUI), như `@layer base` < `@layer utilities`
    // của Tailwind. Để thẳng trong `l0` thì preflight (`*{padding:0}`) thắng component của daisyUI.
    const layerBaseCss = (text: string): string => {
        let out = ''
        let from = 0
        const head = /@layer\s+(base|components|theme)\s*\{/g
        for (let m = head.exec(text); m; m = head.exec(text)) {
            const k = blockEnd(text, head.lastIndex)
            out += text.slice(from, m.index) + `@layer l0{@layer ${m[1]}{${layerBaseCss(text.slice(head.lastIndex, k - 1))}}}`
            from = head.lastIndex = k
        }
        return out + text.slice(from)
    }
    return expandThemeFunctions(layerBaseCss(css.includes('@apply') ? expandApply(css) : css), theme)
}
