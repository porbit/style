/**
 * Rút gọn tên class lúc build (opt-in): `inline-flex items-center` -> `a b`, trong CSS sinh ra và trong mã nguồn.
 *
 *   import { shortenClasses } from '@porbit/style/shorten'
 *   const out = shortenClasses({ css, sources: { 'src/App.tsx': code } })
 *   out.css, out.sources['src/App.tsx'], out.map
 *
 * Nguyên tắc an toàn: một class chỉ được đổi tên khi MỌI lần nó xuất hiện trong mã nguồn đều nằm trong chuỗi class
 * nhận diện chắc chắn (thuộc tính `class`/`className`, đối số chuỗi của `cn`/`clsx`/`cva`/`tw`...). Chỉ cần một lần xuất
 * hiện ở chỗ khác (`'flex'` trong biến, `querySelector('.x')`, `classList.add('x')`, `class:x` của Svelte, khoá object
 * của `clsx`, mẩu ghép động `bg-${màu}`...) là class đó giữ nguyên tên ở MỌI nơi. Đổi tên là song ánh trên tên class
 * nên CSS và HTML luôn khớp nhau; class không đổi tên vẫn chạy như cũ.
 *
 * Bảng ánh xạ xác định (cùng đầu vào -> cùng tên): class dùng nhiều được tên ngắn trước, hoà thì theo thứ tự mã ký tự.
 */
import { findClassAttributes, findClassStrings } from './analyze'

/** Hàm có đối số là chuỗi class (giống `tailwindFunctions` của prettier-plugin-tailwindcss). */
export const DEFAULT_CLASS_FUNCTIONS: readonly string[] = ['cn', 'clsx', 'cx', 'cva', 'tv', 'tw', 'twMerge', 'twJoin']
/** Class thường do thư viện JS gắn lúc chạy (next-themes gắn `dark`/`light` lên `<html>`): không bao giờ đổi tên. */
export const DEFAULT_SHORT_EXCLUDE: readonly string[] = ['dark', 'light']

export interface ShortClassNamesOptions {
    /** Class không đổi tên: tên chính xác hoặc RegExp (cộng thêm `DEFAULT_SHORT_EXCLUDE`). */
    exclude?: Array<string | RegExp>
    /** Tiền tố cho mọi tên mới (ví dụ `x-` -> `x-a`, `x-b`). Phải là định danh CSS không cần escape. */
    prefix?: string
    /** Hàm có đối số là chuỗi class. Mặc định `DEFAULT_CLASS_FUNCTIONS`. */
    functions?: string[]
}

/** Lý do một class trong CSS không được đổi tên. */
export type ShortClassSkipReason =
    /** Nằm trong `exclude` hoặc `DEFAULT_SHORT_EXCLUDE`. */
    | 'exclude'
    /** Xuất hiện trong mã ở chỗ không phải chuỗi class nhận diện chắc chắn. */
    | 'unrecognized'
    /** Có thể được ghép động (`bg-${x}`, `'bg-' + x`, `p-{size}`). */
    | 'dynamic'
    /** Bị selector thuộc tính `[class*="..."]`/`[class^=...]` nhắm theo chuỗi con. */
    | 'attribute-selector'
    /** Directive `class:x` của Svelte. */
    | 'directive'
    /** Tên có ký tự escape/khoảng trắng (khác nhau giữa mã nguồn và CSS). */
    | 'escape'
    /** Không thấy trong chuỗi class nào của mã nguồn (safelist, class do thư viện gắn...). */
    | 'unused'

export interface ClassToken {
    start: number
    end: number
    token: string
}

export interface ClassStringRange {
    start: number
    end: number
    value: string
    /** Token class (đã bỏ phần `{...}`/`<%...%>` của template). */
    tokens: ClassToken[]
}

// ---------------------------------------------------------------------------
// Tên ngắn
// ---------------------------------------------------------------------------

const FIRST = 'abcdefghijklmnopqrstuvwxyz'
const REST = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Tên ngắn thứ `index`: a..z, rồi a0..z9 (chữ đầu luôn là chữ thường, sau là chữ thường/số). Không có `-`/`_` nên
 * không trùng utility Tailwind dạng `p-4`, không phân biệt hoa thường nên an toàn cả ở quirks mode.
 */
export const shortClassName = (index: number): string => {
    let n = index
    let length = 1
    let count = FIRST.length
    while (n >= count) {
        n -= count
        length++
        count *= REST.length
    }
    let name = ''
    for (let i = length - 1; i > 0; i--) {
        name = REST[n % REST.length] + name
        n = Math.floor(n / REST.length)
    }
    return FIRST[n] + name
}

// ---------------------------------------------------------------------------
// CSS: đọc và đổi tên class trong selector
// ---------------------------------------------------------------------------

const isIdentChar = (c: string | undefined): boolean => c !== undefined && (/[A-Za-z0-9_-]/.test(c) || c.charCodeAt(0) >= 0x80)
const isIdentStart = (text: string, i: number): boolean => {
    const c = text[i]
    if (c === undefined) return false
    if (c === '\\') return text[i + 1] !== undefined && text[i + 1] !== '\n'
    if (c === '-') {
        const next = text[i + 1]
        return next === '-' || (next !== undefined && (/[A-Za-z_]/.test(next) || next.charCodeAt(0) >= 0x80)) || (next === '\\' && text[i + 2] !== undefined && text[i + 2] !== '\n')
    }
    return /[A-Za-z_]/.test(c) || c.charCodeAt(0) >= 0x80
}

/** Đọc một định danh CSS (có escape) từ vị trí `i`: tên đã giải escape và vị trí kết thúc. */
const readIdent = (text: string, i: number): { name: string; end: number } => {
    let name = ''
    let j = i
    while (j < text.length) {
        const c = text[j]
        if (c === '\\') {
            const next = text[j + 1]
            if (next === undefined || next === '\n') break
            const hex = /^[0-9a-fA-F]{1,6}/.exec(text.slice(j + 1, j + 7))
            if (hex) {
                let code = parseInt(hex[0], 16)
                if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) code = 0xfffd
                name += String.fromCodePoint(code)
                j += 1 + hex[0].length
                if (text[j] === '\r' && text[j + 1] === '\n') j += 2
                else if (/[ \t\n\r\f]/.test(text[j] ?? '')) j++
                continue
            }
            name += next
            j += 2
            continue
        }
        if (!isIdentChar(c)) break
        name += c
        j++
    }
    return { name, end: j }
}

/** Giải escape CSS của một chuỗi (`\31 0` -> `10`, `\:` -> `:`). */
export const unescapeCss = (text: string): string => {
    let out = ''
    for (let i = 0; i < text.length; i++) {
        if (text[i] !== '\\' || i + 1 >= text.length) {
            out += text[i]
            continue
        }
        const hex = /^[0-9a-fA-F]{1,6}/.exec(text.slice(i + 1, i + 7))
        if (hex) {
            let code = parseInt(hex[0], 16)
            if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) code = 0xfffd
            out += String.fromCodePoint(code)
            i += hex[0].length
            if (/[ \t\n\r\f]/.test(text[i + 1] ?? '')) i++
            continue
        }
        out += text[++i]
    }
    return out
}

/** Escape một tên class để dùng trong selector (thuật toán `CSS.escape`). */
export const escapeCssIdent = (value: string): string => {
    let out = ''
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i)
        const ch = value[i]
        if (code === 0) out += '�'
        else if ((code >= 1 && code <= 0x1f) || code === 0x7f || (i === 0 && code >= 0x30 && code <= 0x39) || (i === 1 && code >= 0x30 && code <= 0x39 && value.charCodeAt(0) === 0x2d)) out += `\\${code.toString(16)} `
        else if (i === 0 && value.length === 1 && code === 0x2d) out += '\\-'
        else if (code >= 0x80 || /[A-Za-z0-9_-]/.test(ch)) out += ch
        else out += '\\' + ch
    }
    return out
}

/** Selector thuộc tính trên `class` (`[class*="size-"]`): nhắm theo chuỗi con nên chặn đổi tên class liên quan. */
export interface ClassAttributeSelector {
    operator: '=' | '~=' | '|=' | '^=' | '$=' | '*='
    value: string
}

const skipQuoted = (text: string, i: number): number => {
    const quote = text[i]
    let j = i + 1
    while (j < text.length && text[j] !== quote) {
        if (text[j] === '\\') j++
        else if (text[j] === '\n') break
        j++
    }
    return Math.min(j + 1, text.length)
}

const ATTRIBUTE = /^\s*(?:[\w*-]*\|)?([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"((?:[^"\\]|\\[\s\S])*)"|'((?:[^'\\]|\\[\s\S])*)'|([^\s\]'"]+)))?\s*(?:[iIsS]\s*)?$/

const parseClassAttribute = (body: string): ClassAttributeSelector | null => {
    const m = ATTRIBUTE.exec(body)
    if (!m || m[1].toLowerCase() !== 'class' || !m[2]) return null
    return { operator: m[2] as ClassAttributeSelector['operator'], value: unescapeCss(m[3] ?? m[4] ?? m[5] ?? '') }
}

/**
 * Đổi tên class trong MỘT selector (không đụng chuỗi, nội dung `[...]`, id, tên thẻ). `rename` trả `undefined` để giữ.
 */
export const renameSelectorClasses = (
    selector: string,
    rename: (name: string) => string | undefined,
    onAttribute?: (attribute: ClassAttributeSelector) => void,
): string => {
    let out = ''
    let i = 0
    while (i < selector.length) {
        const c = selector[i]
        if (c === '"' || c === "'") {
            const end = skipQuoted(selector, i)
            out += selector.slice(i, end)
            i = end
        } else if (c === '/' && selector[i + 1] === '*') {
            const close = selector.indexOf('*/', i + 2)
            const end = close === -1 ? selector.length : close + 2
            out += selector.slice(i, end)
            i = end
        } else if (c === '[') {
            let j = i + 1
            while (j < selector.length && selector[j] !== ']') {
                if (selector[j] === '"' || selector[j] === "'") j = skipQuoted(selector, j)
                else j += selector[j] === '\\' ? 2 : 1
            }
            const attribute = parseClassAttribute(selector.slice(i + 1, j))
            if (attribute && onAttribute) onAttribute(attribute)
            out += selector.slice(i, j + 1)
            i = j + 1
        } else if (c === '.' && isIdentStart(selector, i + 1)) {
            const { name, end } = readIdent(selector, i + 1)
            const next = rename(name)
            out += next === undefined ? selector.slice(i, end) : '.' + escapeCssIdent(next)
            i = end
        } else if (c === '\\' || isIdentChar(c) || c === '#') {
            // Tên thẻ, id, tên pseudo-class, số: đọc trọn để `.`/escape bên trong không bị hiểu nhầm.
            const start = c === '#' ? i + 1 : i
            const { end } = readIdent(selector, start)
            const stop = Math.max(end, i + 1)
            out += selector.slice(i, stop)
            i = stop
        } else {
            out += c
            i++
        }
    }
    return out
}

// At-rule chứa rule con (selector bên trong được đổi tên); at-rule khác (keyframes, font-face, property...) chép nguyên.
const NESTING_AT_RULES = new Set(['media', 'supports', 'layer', 'container', 'scope', 'document', '-moz-document', 'starting-style'])

const findBlockEnd = (css: string, open: number): number => {
    let depth = 0
    for (let i = open; i < css.length; i++) {
        const c = css[i]
        if (c === '"' || c === "'") i = skipQuoted(css, i) - 1
        else if (c === '/' && css[i + 1] === '*') {
            const close = css.indexOf('*/', i + 2)
            i = close === -1 ? css.length : close + 1
        } else if (c === '\\') i++
        else if (c === '{') depth++
        else if (c === '}' && --depth === 0) return i + 1
    }
    return css.length
}

const stripLeadingComments = (text: string): string => text.replace(/^(?:\s|\/\*[\s\S]*?\*\/)*/, '')

/**
 * Duyệt CSS, gọi `visit` cho mỗi selector của style rule (kể cả rule lồng, rule trong `@media`/`@supports`/`@layer`/
 * `@container`) và prelude của `@scope`/`@supports` (`selector(.x)`); khối `@keyframes`, `@font-face`, `@property`...
 * và khai báo được chép nguyên.
 */
export const mapCssSelectors = (css: string, visit: (selector: string) => string): string => {
    let out = ''
    let i = 0
    const n = css.length
    while (i < n) {
        let j = i
        let depth = 0
        let stop = ''
        while (j < n) {
            const c = css[j]
            if (c === '"' || c === "'") {
                j = skipQuoted(css, j)
                continue
            }
            if (c === '/' && css[j + 1] === '*') {
                const close = css.indexOf('*/', j + 2)
                j = close === -1 ? n : close + 2
                continue
            }
            if (c === '\\') {
                j += 2
                continue
            }
            if (c === '(' || c === '[') depth++
            else if ((c === ')' || c === ']') && depth > 0) depth--
            else if (depth === 0 && (c === '{' || c === ';' || c === '}')) {
                stop = c
                break
            }
            j++
        }
        const segment = css.slice(i, j)
        if (stop === '{') {
            const head = stripLeadingComments(segment)
            if (head.startsWith('@')) {
                const name = (/^@([\w-]+)/.exec(head)?.[1] ?? '').toLowerCase()
                if (!NESTING_AT_RULES.has(name)) {
                    const end = findBlockEnd(css, j)
                    out += css.slice(i, end)
                    i = end
                    continue
                }
                out += (name === 'scope' || name === 'supports' ? visit(segment) : segment) + '{'
            } else out += visit(segment) + '{'
            i = j + 1
            continue
        }
        out += segment + stop
        i = j + 1
    }
    return out
}

export interface CssClassInfo {
    /** Tên class (đã giải escape) -> số lần xuất hiện trong selector. */
    classes: Map<string, number>
    /** Selector thuộc tính trên `class`. */
    attributes: ClassAttributeSelector[]
}

/** Mọi class xuất hiện trong selector của một stylesheet. */
export const collectCssClasses = (css: string): CssClassInfo => {
    const classes = new Map<string, number>()
    const attributes: ClassAttributeSelector[] = []
    mapCssSelectors(css, (selector) => {
        renameSelectorClasses(
            selector,
            (name) => {
                classes.set(name, (classes.get(name) ?? 0) + 1)
                return undefined
            },
            (attribute) => attributes.push(attribute),
        )
        return selector
    })
    return { classes, attributes }
}

/** Đổi tên class trong mọi selector của stylesheet. */
export const renameCssClasses = (css: string, rename: Map<string, string> | ((name: string) => string | undefined)): string => {
    const fn = typeof rename === 'function' ? rename : (name: string) => rename.get(name)
    return mapCssSelectors(css, (selector) => renameSelectorClasses(selector, fn))
}

// ---------------------------------------------------------------------------
// Mã nguồn: chuỗi class nhận diện chắc chắn
// ---------------------------------------------------------------------------

/** Che chú thích (`// ...` đầu dòng, `/* ... *\/` đầu dòng hoặc sau `{`, `<!-- -->`) bằng khoảng trắng, giữ vị trí. */
export const maskComments = (source: string): string => {
    const blank = (text: string) => text.replace(/[^\n]/g, ' ')
    return source
        .replace(/<!--[\s\S]*?-->/g, blank)
        .replace(/(^|\n)([ \t]*\{?[ \t]*)(\/\*[\s\S]*?\*\/)/g, (_m, nl: string, lead: string, body: string) => nl + lead + blank(body))
        .replace(/(^|\n)([ \t]*)(\/\/[^\n]*)/g, (_m, nl: string, lead: string, body: string) => nl + lead + blank(body))
}

// Hàm nhận object `{ 'class': điều_kiện }` (khoá là class). cva/tv dùng khoá làm tên biến thể nên không có ở đây.
const KEY_FUNCTIONS = new Set(['cn', 'clsx', 'cx', 'classnames', 'classNames'])
// Thuộc tính class phụ của component (đứng sau khoảng trắng): `classNames`, `iconClassName`, `contentClassName`...
const EXTRA_ATTRIBUTE_EXPRESSION = /(?<=\s)(?:classNames|[a-z][A-Za-z0-9]*ClassNames?)\s*=\s*\{/g
const EXTRA_ATTRIBUTE_STRING = /(?<=\s)(?:classNames|[a-z][A-Za-z0-9]*ClassNames?)\s*=\s*(["'])/g
const KEYWORDS = new Set(['return', 'typeof', 'void', 'in', 'of', 'await', 'yield', 'case', 'else', 'do', 'delete', 'instanceof', 'throw', 'new'])
const CLASS_KEYS = new Set(['class', 'className'])

const prevNonSpace = (source: string, i: number): string => {
    let j = i - 1
    while (j >= 0 && /\s/.test(source[j])) j--
    return source[j] ?? ''
}
const nextNonSpace = (source: string, i: number): number => {
    let j = i
    while (j < source.length && /\s/.test(source[j])) j++
    return j
}

interface Frame {
    kind: 'root' | 'call' | 'other-call' | 'group' | 'object' | 'array' | 'index'
    /** Tên hàm của khung `call`. */
    callee?: string
    /** Khoá dẫn tới object này (`variants: {` -> `variants`). */
    key?: string
    /** Khoá hiện tại bên trong object. */
    current?: string
}

/**
 * Phân loại từng chuỗi trong biểu thức class (`className={...}`, đối số của `functions`): chuỗi là class thật, hay là
 * giá trị khác (toán hạng so sánh `x === 'outline'`, đối số của hàm khác `buttonVariants({ variant: 'outline' })`,
 * `defaultVariants`/`compoundVariants` của cva/tv, truy cập `obj['x']`). Trả vị trí bắt đầu nội dung chuỗi.
 */
interface FoundString {
    end: number
    value: string
    quote: string
    /** Tìm thấy ngoài phạm vi `findClassStrings` (khoá object của `clsx`, thuộc tính `*ClassName`/`classNames`). */
    extra: boolean
}

const classifyExpressionStrings = (source: string, functions: readonly string[]): { ok: Map<number, FoundString>; bad: Set<number> } => {
    const ok = new Map<number, FoundString>()
    const bad = new Set<number>()
    const fnSet = new Set(functions)
    const record = (start: number, found: FoundString) => {
        const old = ok.get(start)
        ok.set(start, old ? { ...old, extra: old.extra || found.extra } : found)
    }
    const visit = (open: number, rootKind: Frame['kind'], extra: boolean) => {
        const stack: Frame[] = []
        for (let i = open; i < source.length; i++) {
            const ch = source[i]
            const top = stack[stack.length - 1]
            if (ch === '(' || ch === '[' || ch === '{') {
                let frame: Frame
                if (!stack.length) frame = { kind: rootKind }
                else if (ch === '(') {
                    const before = source.slice(Math.max(0, i - 80), i)
                    const callee = /([A-Za-z_$][\w$]*)\s*$/.exec(before)
                    if (!callee || KEYWORDS.has(callee[1])) frame = { kind: 'group' }
                    else {
                        const member = /\.\s*$/.test(before.slice(0, callee.index))
                        frame = fnSet.has(callee[1]) && !member ? { kind: 'call', callee: callee[1] } : { kind: 'other-call' }
                    }
                } else {
                    // Khoá dẫn tới object/mảng con: khoá hiện tại của object cha, hoặc khoá của mảng cha
                    // (`compoundVariants: [{ ... }]`).
                    const key = top?.kind === 'object' ? top.current : top?.kind === 'array' ? top.key : undefined
                    if (ch === '[') frame = { kind: /[\w$)\]]/.test(prevNonSpace(source, i)) ? 'index' : 'array', key }
                    else frame = { kind: 'object', key }
                }
                stack.push(frame)
                continue
            }
            if (ch === ')' || ch === ']' || ch === '}') {
                stack.pop()
                if (!stack.length) return
                continue
            }
            if (ch === '/' && source[i + 1] === '/') {
                while (i < source.length && source[i] !== '\n') i++
                continue
            }
            if (ch === '/' && source[i + 1] === '*') {
                const close = source.indexOf('*/', i + 2)
                i = close === -1 ? source.length : close + 1
                continue
            }
            if (ch === '"' || ch === "'" || ch === '`') {
                let end = i + 1
                while (end < source.length && source[end] !== ch) {
                    if (source[end] === '\\') end++
                    end++
                }
                const value = source.slice(i + 1, end)
                const after = nextNonSpace(source, end + 1)
                const prev = prevNonSpace(source, i)
                if (top?.kind === 'object' && (prev === '{' || prev === ',') && source[after] === ':') {
                    top.current = value
                    // Khoá object của `clsx`/`cn` (`cn({ 'h-2.5 w-2.5': x })`) là chuỗi class.
                    const owner = stack[stack.length - 2]?.kind === 'array' ? stack[stack.length - 3] : stack[stack.length - 2]
                    if (owner?.kind === 'call' && KEY_FUNCTIONS.has(owner.callee!) && !stack.some((f) => f.kind === 'other-call' || f.kind === 'index')) {
                        record(i + 1, { end, value, quote: ch, extra: true })
                    }
                    i = end
                    continue
                }
                let accept = !stack.some((f) => f.kind === 'other-call' || f.kind === 'index')
                // Đường khoá: khoá dẫn tới mỗi object lồng nhau, cộng khoá hiện tại.
                const path = stack.flatMap((f) => (f.key ? [f.key] : []))
                const own = top?.kind === 'object' ? top.current : undefined
                if (own) path.push(own)
                if (path.includes('defaultVariants')) accept = false
                if (path.some((k) => /^compound/.test(k)) && !(own && CLASS_KEYS.has(own))) accept = false
                const before = source.slice(Math.max(0, i - 4), i)
                if (/(?:[!=]==?|(?<!=)[<>]=?)\s*$/.test(before) || /^(?:[!=]=|[<>])/.test(source.slice(after, after + 2))) accept = false
                if (accept) record(i + 1, { end, value, quote: ch, extra })
                else bad.add(i + 1)
                i = end
                continue
            }
            if (top?.kind === 'object' && /[A-Za-z_$]/.test(ch) && !/[\w$]/.test(source[i - 1] ?? '')) {
                const key = /^[A-Za-z_$][\w$]*/.exec(source.slice(i, i + 80))![0]
                const after = nextNonSpace(source, i + key.length)
                const prev = prevNonSpace(source, i)
                if ((prev === '{' || prev === ',') && source[after] === ':' && source[after + 1] !== ':') top.current = key
                i += key.length - 1
            }
        }
    }
    const attr = /\b(?:class|className)\s*=\s*\{/g
    for (let m = attr.exec(source); m; m = attr.exec(source)) visit(m.index + m[0].length - 1, 'root', false)
    // Prop class của component: `classNames={{ root: "..." }}` (react-day-picker, sonner), `iconClassName={cn(...)}`.
    for (const m of source.matchAll(EXTRA_ATTRIBUTE_EXPRESSION)) visit(m.index! + m[0].length - 1, 'root', true)
    if (functions.length) {
        const names = functions.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
        const call = new RegExp(`(?<![\\w.$])(?:${names})\\s*\\(`, 'g')
        for (let m = call.exec(source); m; m = call.exec(source)) visit(m.index + m[0].length - 1, 'call', false)
    }
    return { ok, bad }
}

/** Token của một chuỗi class, bỏ phần template `{...}`, `{{...}}`, `<%...%>` (Svelte/Vue/Angular/ERB). */
const tokenizeClassValue = (value: string, offset: number): ClassToken[] => {
    const tokens: ClassToken[] = []
    let depth = 0
    let i = 0
    while (i < value.length) {
        const c = value[i]
        if (c === '<' && value[i + 1] === '%') {
            const close = value.indexOf('%>', i + 2)
            i = close === -1 ? value.length : close + 2
            continue
        }
        if (c === '{') {
            depth++
            i++
            continue
        }
        if (c === '}') {
            depth = Math.max(0, depth - 1)
            i++
            continue
        }
        if (/\s/.test(c) || depth > 0) {
            i++
            continue
        }
        let j = i
        while (j < value.length && !/\s/.test(value[j]) && value[j] !== '{' && value[j] !== '}' && !(value[j] === '<' && value[j + 1] === '%')) j++
        // Token dính `{`/`}` (`p-{size}`) là mẩu ghép động: không phải class.
        const glued = value[j] === '{' || value[j] === '<' || value[i - 1] === '}' || value[i - 1] === '>'
        const token = value.slice(i, j)
        if (!glued && !token.includes('\\')) tokens.push({ start: offset + i, end: offset + j, token })
        i = j
    }
    return tokens
}

/**
 * Chuỗi class nhận diện chắc chắn trong một file: thuộc tính `class="..."`/`className="..."` tĩnh (đứng sau khoảng
 * trắng — không phải `:class`, `[class]`, `data-class`) và chuỗi trong `className={...}`/đối số của `functions` mà
 * `findClassStrings` tìm ra và đúng là class (xem `classifyExpressionStrings`). Không chồng lấn, theo thứ tự.
 */
export const findShortenableClassRanges = (source: string, functions: readonly string[] = DEFAULT_CLASS_FUNCTIONS): ClassStringRange[] => {
    const attributes = new Set(findClassAttributes(source).map((r) => r.start))
    const { ok, bad } = classifyExpressionStrings(source, functions)
    const ranges: Array<{ start: number; end: number; value: string }> = []
    const seen = new Set<number>()
    for (const range of findClassStrings(source, { functions: [...functions] })) {
        seen.add(range.start)
        let accept: boolean
        if (attributes.has(range.start)) {
            const before = source.slice(Math.max(0, range.start - 80), range.start)
            const m = /(class|className)\s*=\s*(?:\{\s*)?["']$/.exec(before)
            const at = m ? range.start - before.length + m.index : -1
            accept = at >= 0 && (at === 0 || /\s/.test(source[at - 1]))
        } else accept = ok.has(range.start) && !bad.has(range.start)
        if (accept) ranges.push(range)
    }
    // Phần mở rộng ngoài `findClassStrings`: khoá object của clsx/cn, prop `classNames`/`*ClassName`.
    for (const [start, found] of ok) {
        if (!found.extra || seen.has(start) || bad.has(start)) continue
        if ((found.quote === '`' && found.value.includes('${')) || (found.quote === "'" && found.value.includes('\n'))) continue
        ranges.push({ start, end: found.end, value: found.value })
    }
    for (const m of source.matchAll(EXTRA_ATTRIBUTE_STRING)) {
        const start = m.index! + m[0].length
        const end = source.indexOf(m[1], start)
        if (end === -1 || seen.has(start)) continue
        const value = source.slice(start, end)
        if (m[1] === "'" && value.includes('\n')) continue
        ranges.push({ start, end, value })
    }
    ranges.sort((a, b) => a.start - b.start)
    const out: ClassStringRange[] = []
    let cursor = 0
    for (const range of ranges) {
        if (range.start < cursor) continue
        out.push({ ...range, tokens: tokenizeClassValue(range.value, range.start) })
        cursor = range.end
    }
    return out
}

// Ký tự làm một lần xuất hiện của tên class thành một phần của token lớn hơn (không phải class đứng riêng).
// `<`/`/` trước tên: thẻ (`<table>`, `</table>`) hoặc phần sau `/` (`peer/menu-button`), không phải class đứng riêng.
const PART_BEFORE = /[A-Za-z0-9_$\-:!@</]/
const PART_AFTER = /[A-Za-z0-9_$\-/!]/
const isPartAfter = (text: string, i: number) => {
    const c = text[i]
    return c !== undefined && (PART_AFTER.test(c) || (c === '.' && /[0-9]/.test(text[i + 1] ?? '')))
}

/** Vị trí mọi lần xuất hiện "đứng riêng" của các tên trong `names` (đã che chú thích). */
const findStandaloneOccurrences = (text: string, names: Set<string>, maxLength: number, onHit: (name: string, at: number) => void, quoted: string[]) => {
    const run = /[^\s"'`]+/g
    for (let m = run.exec(text); m; m = run.exec(text)) {
        const word = m[0]
        const starts: number[] = []
        const ends: number[] = []
        for (let k = 0; k <= word.length; k++) {
            if (k < word.length && (k === 0 || !PART_BEFORE.test(word[k - 1]))) starts.push(k)
            if (k > 0 && !isPartAfter(word, k)) ends.push(k)
        }
        let e0 = 0
        for (const s of starts) {
            while (e0 < ends.length && ends[e0] <= s) e0++
            for (let e = e0; e < ends.length && ends[e] - s <= maxLength; e++) {
                const sub = word.slice(s, ends[e])
                if (names.has(sub)) onHit(sub, m.index + s)
            }
        }
    }
    // Tên chứa dấu nháy (`[&_svg:not([class*='size-'])]:size-4`) không nằm gọn trong một "từ": tìm thẳng.
    for (const name of quoted) {
        for (let at = text.indexOf(name); at !== -1; at = text.indexOf(name, at + 1)) {
            if (at > 0 && PART_BEFORE.test(text[at - 1])) continue
            if (isPartAfter(text, at + name.length)) continue
            onHit(name, at)
        }
    }
}

interface SourceFacts {
    /** Class trong CSS có lần xuất hiện không nằm trong chuỗi class nhận diện được. */
    unrecognized: Set<string>
    /** Số lần xuất hiện trong chuỗi class nhận diện được. */
    covered: Map<string, number>
    /** Mẩu ghép động: class sinh lúc chạy bắt đầu bằng `[0]` và kết thúc bằng `[1]`. */
    dynamic: Map<string, [string, string]>
    directives: Set<string>
    attributes: ClassAttributeSelector[]
    /** Token trong mọi chuỗi của mã (tên mới không được trùng). */
    words: Set<string>
}

const LITERALS = /(["'])((?:(?!\1)[^\\\n]|\\.)*)\1|`((?:[^`\\]|\\[\s\S])*)`/g

/**
 * Token dính phần nội suy trong một chuỗi (`bg-${c}`, `w-[${n}px]`, `p-{size}`, `text-{{ color }}`, `<%= x %>-500`):
 * cặp (đầu, cuối) mà class sinh lúc chạy chắc chắn có.
 */
const gluedFragments = (content: string): Array<[string, string]> => {
    if (!/[{%]/.test(content)) return []
    let masked = ''
    let depth = 0
    for (let i = 0; i < content.length; i++) {
        const c = content[i]
        if (depth === 0 && c === '<' && content[i + 1] === '%') {
            const close = content.indexOf('%>', i + 2)
            masked += '\u0000'
            i = close === -1 ? content.length : close + 1
        } else if (depth === 0 && c === '$' && content[i + 1] === '{') {
            masked += '\u0000'
            depth = 1
            i++
        } else if (c === '{') {
            if (depth === 0) masked += '\u0000'
            depth++
        } else if (c === '}' && depth > 0) depth--
        else if (depth === 0) masked += c
    }
    const out: Array<[string, string]> = []
    for (const token of masked.split(/\s+/)) {
        const first = token.indexOf('\u0000')
        if (first === -1) continue
        out.push([token.slice(0, first), token.slice(token.lastIndexOf('\u0000') + 1)])
    }
    return out
}

const analyzeSource = (code: string, names: Set<string>, maxLength: number, quoted: string[], functions: readonly string[], facts: SourceFacts) => {
    const masked = maskComments(code)
    const coveredAt = new Map<number, string>()
    for (const range of findShortenableClassRanges(code, functions)) {
        for (const { start, token } of range.tokens) {
            coveredAt.set(start, token)
            facts.words.add(token)
            if (names.has(token)) facts.covered.set(token, (facts.covered.get(token) ?? 0) + 1)
        }
    }
    findStandaloneOccurrences(masked, names, maxLength, (name, at) => {
        if (coveredAt.get(at) !== name) facts.unrecognized.add(name)
    }, quoted)
    // Mẩu ghép động trong chuỗi: `bg-${x}`, `p-{size}`, `{{x}}-500`, `'bg-' + x`, `x + '-500'`, `'bg-'` đứng riêng.
    // Chỉ giữ phía "giống mẩu class": đầu kết thúc bằng `-`/`:`/`/`/`[`/`(` (`bg-`, `hover:`, `w-[`), cuối bắt đầu
    // bằng `-`/`:`/`/` (`-500`, `:flex`). `${n}px`, `${t}s`, `#${id}` là giá trị CSS/URL, không phải class.
    const dynamic = (start: string, end: string) => {
        const head = /[-:/[(!@]$/.test(start) ? start : ''
        const tail = /^[-:/!]/.test(end) ? end : ''
        if (head || tail) facts.dynamic.set(head + '\u0000' + tail, [head, tail])
    }
    for (const m of masked.matchAll(LITERALS)) {
        const content = m[2] ?? m[3] ?? ''
        for (const word of content.split(/\s+/)) if (word && word.length <= 8) facts.words.add(word)
        for (const [start, end] of gluedFragments(content)) dynamic(start, end)
        const single = content.trim()
        if (single && !/\s/.test(single)) {
            if (/[-:/[(]$/.test(single)) dynamic(single, '')
            if (/^[-:/]/.test(single)) dynamic('', single)
        }
    }
    for (const m of masked.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1\s*\+/g)) if (m[2] && !/\s$/.test(m[2])) dynamic(m[2].split(/\s+/).pop()!, '')
    for (const m of masked.matchAll(/\+\s*(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) if (m[2] && !/^\s/.test(m[2])) dynamic('', m[2].split(/\s+/)[0])
    for (const m of masked.matchAll(/\bclass:([^\s=>/{}]+)/g)) facts.directives.add(m[1])
    for (const m of masked.matchAll(/\[\s*class\s*([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s'"]+))\s*(?:[iIsS]\s*)?\]/g)) {
        facts.attributes.push({ operator: m[1] as ClassAttributeSelector['operator'], value: m[2] ?? m[3] ?? m[4] ?? '' })
    }
}

const attributeMatches = (attribute: ClassAttributeSelector, name: string): boolean => {
    const pieces = attribute.value.split(/\s+/).filter(Boolean)
    if (!pieces.length) return false
    switch (attribute.operator) {
        case '=':
        case '~=':
            return pieces.includes(name)
        case '|=':
            return name === attribute.value || name.startsWith(attribute.value + '-')
        case '^=':
            return name.startsWith(pieces[0]) || (pieces.length > 1 && pieces.includes(name))
        case '$=':
            return name.endsWith(pieces[pieces.length - 1]) || (pieces.length > 1 && pieces.includes(name))
        case '*=': {
            const value = attribute.value
            if (pieces.length > 1) return pieces.some((piece) => name.includes(piece))
            // `[class*=" h-"]`: một class (không đứng đầu) bắt đầu bằng `h-`.
            const lead = /^\s/.test(value)
            const trail = /\s$/.test(value)
            return lead && trail ? name === pieces[0] : lead ? name.startsWith(pieces[0]) : trail ? name.endsWith(pieces[0]) : name.includes(pieces[0])
        }
    }
}

/**
 * Điều kiện để tên mới bị đúng các selector `[class...]` nhắm tên cũ: bắt đầu bằng `start`, chứa `contain`, kết thúc
 * bằng `end`. `null` khi không giữ được (giá trị nhiều mảnh, `~=`/`=`/`|=`...).
 */
const attributeRequirement = (matching: ClassAttributeSelector[]): { start: string; contain: string; end: string } | null => {
    const starts: string[] = []
    const ends: string[] = []
    const contains: string[] = []
    for (const a of matching) {
        const piece = a.value.trim()
        if (!piece || /\s/.test(piece)) return null
        const lead = /^\s/.test(a.value)
        const trail = /\s$/.test(a.value)
        if (a.operator === '*=' && !(lead && trail)) (lead ? starts : trail ? ends : contains).push(piece)
        else if (a.operator === '^=' && !lead && !trail) starts.push(piece)
        else if (a.operator === '$=' && !lead && !trail) ends.push(piece)
        else return null
    }
    const longest = (list: string[]) => list.reduce((a, b) => (b.length > a.length ? b : a), '')
    const start = longest(starts)
    const end = longest(ends)
    if (!starts.every((x) => start.startsWith(x)) || !ends.every((x) => end.endsWith(x))) return null
    const rest = contains.filter((x) => !start.includes(x) && !end.includes(x))
    const contain = longest(rest)
    if (!rest.every((x) => contain.includes(x))) return null
    return { start, contain, end }
}

// ---------------------------------------------------------------------------
// Bảng ánh xạ
// ---------------------------------------------------------------------------

export interface ShortClassNamesInput extends ShortClassNamesOptions {
    /** CSS đã sinh (một hoặc nhiều stylesheet). */
    css: string | string[]
    /** Mã nguồn dùng class: mảng chuỗi hoặc `{ tệp: mã }`. */
    sources: string[] | Record<string, string>
}

export interface ShortClassNames {
    /** Tên gốc -> tên ngắn. */
    map: Map<string, string>
    /** Class có trong CSS nhưng giữ nguyên tên, kèm lý do. */
    skipped: Map<string, ShortClassSkipReason>
    /** Đổi tên class trong selector của một stylesheet. */
    rewriteCss(css: string): string
    /** Đổi tên token trong chuỗi class nhận diện được của một file nguồn. */
    rewriteSource(code: string): string
    /** Như `rewriteSource`, kèm sourcemap v3 (null khi không đổi gì) cho bundler. */
    rewriteSourceWithMap(code: string, file: string): { code: string; map: SourceMapV3 | null }
    /** Class đã đổi tên nhưng còn xuất hiện "đứng riêng" ngoài chuỗi class nhận diện được trong `code` (phải rỗng). */
    findUnrecognized(code: string): string[]
    /** Chẩn đoán: mẩu ghép động (đầu, cuối) và selector `[class...]` đã thấy. */
    fragments: Array<[string, string]>
    attributes: ClassAttributeSelector[]
}

interface Replacement {
    start: number
    end: number
    text: string
}

export interface SourceMapV3 {
    version: 3
    sources: string[]
    sourcesContent: string[]
    names: string[]
    mappings: string
}

const applyReplacements = (code: string, list: Replacement[]): string => {
    let out = ''
    let cursor = 0
    for (const { start, end, text } of list) {
        out += code.slice(cursor, start) + text
        cursor = end
    }
    return out + code.slice(cursor)
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const vlq = (value: number): string => {
    let n = value < 0 ? (-value << 1) | 1 : value << 1
    let out = ''
    do {
        let digit = n & 31
        n >>>= 5
        if (n) digit |= 32
        out += BASE64[digit]
    } while (n)
    return out
}

/**
 * Sourcemap cho phép thay token trong dòng (tên class không chứa xuống dòng): mỗi dòng có đoạn ở cột 0 và ở đầu/cuối
 * mỗi token đã thay, trỏ về đúng cột gốc.
 */
const replacementSourceMap = (code: string, list: Replacement[], file: string): SourceMapV3 => {
    const lines: string[] = []
    let prevLine = 0
    let prevCol = 0
    let index = 0
    let lineStart = 0
    const lineCount = code.split('\n').length
    for (let line = 0; line < lineCount; line++) {
        const lineEnd = code.indexOf('\n', lineStart) === -1 ? code.length : code.indexOf('\n', lineStart)
        // Cặp (cột sinh ra, cột gốc) của dòng này: đầu mỗi từ/dấu (như `hires: 'boundary'` của magic-string), bỏ
        // phần bên trong token đã thay.
        const points: Array<[number, number]> = []
        let shift = 0
        const text = code.slice(lineStart, lineEnd)
        const words = /[\w$]+|[^\w$\s]/g
        for (let m = words.exec(text); ; m = words.exec(text)) {
            const col = m ? m.index : text.length
            while (index < list.length && list[index].start - lineStart <= col && list[index].start < lineEnd) {
                const r = list[index++]
                points.push([r.start - lineStart + shift, r.start - lineStart])
                shift += r.text.length - (r.end - r.start)
                points.push([r.end - lineStart + shift, r.end - lineStart])
                words.lastIndex = Math.max(words.lastIndex, r.end - lineStart)
            }
            if (!m) break
            const last = points[points.length - 1]
            if (!last || m.index > last[1]) points.push([m.index + shift, m.index])
        }
        if (!points.length || points[0][0] !== 0) points.unshift([0, 0])
        let genCol = 0
        const segments: string[] = []
        for (const [gen, orig] of points) {
            segments.push(vlq(gen - genCol) + vlq(0) + vlq(line - prevLine) + vlq(orig - prevCol))
            genCol = gen
            prevLine = line
            prevCol = orig
        }
        lines.push(segments.join(','))
        lineStart = lineEnd + 1
    }
    return { version: 3, sources: [file], sourcesContent: [code], names: [], mappings: lines.join(';') }
}

const PREFIX = /^[A-Za-z_][\w-]*$/
const VALUE_KEYWORDS = new Set(['xs', 'sm', 'md', 'lg', 'xl', 'px', 'lh', 'min', 'max', 'fit', 'svh', 'lvh', 'dvh', 'svw', 'lvw', 'dvw', 'auto', 'full', 'none', 'base'])

/** Tạo bảng ánh xạ từ CSS và toàn bộ mã nguồn dùng class. */
export const createShortClassNames = (input: ShortClassNamesInput): ShortClassNames => {
    const { prefix = '', functions = DEFAULT_CLASS_FUNCTIONS } = input
    if (prefix && !PREFIX.test(prefix)) throw new Error(`prefix không hợp lệ cho shortClassNames: "${prefix}" (cần dạng [A-Za-z_][A-Za-z0-9_-]*)`)
    const exclude = [...DEFAULT_SHORT_EXCLUDE, ...(input.exclude ?? [])]
    const isExcluded = (name: string) => exclude.some((rule) => (typeof rule === 'string' ? rule === name : ((rule.lastIndex = 0), rule.test(name))))
    const sheets = Array.isArray(input.css) ? input.css : [input.css]
    const sources = Array.isArray(input.sources) ? input.sources : Object.values(input.sources)

    const cssCount = new Map<string, number>()
    const attributes: ClassAttributeSelector[] = []
    for (const css of sheets) {
        const info = collectCssClasses(css)
        info.classes.forEach((count, name) => cssCount.set(name, (cssCount.get(name) ?? 0) + count))
        attributes.push(...info.attributes)
    }
    const names = new Set(cssCount.keys())
    let maxLength = 0
    const quoted: string[] = []
    for (const name of names) {
        maxLength = Math.max(maxLength, name.length)
        if (/["'`]/.test(name)) quoted.push(name)
    }
    const facts: SourceFacts = { unrecognized: new Set(), covered: new Map(), dynamic: new Map(), directives: new Set(), attributes, words: new Set() }
    for (const code of sources) analyzeSource(code, names, maxLength, quoted, functions, facts)
    const fragments = [...facts.dynamic.values()]
    const isDynamic = (name: string) => fragments.some(([start, end]) => name.length >= start.length + end.length && name.startsWith(start) && name.endsWith(end))
    const attributesOf = (name: string) => facts.attributes.filter((a) => attributeMatches(a, name))

    const skipped = new Map<string, ShortClassSkipReason>()
    const chosen: string[] = []
    // Class bị `[class*="size-"]` nhắm (`size-4`): tên mới giữ chuỗi con đó (`size-a`) để selector vẫn khớp như cũ.
    const requirements = new Map<string, { start: string; contain: string; end: string }>()
    for (const name of names) {
        let reason: ShortClassSkipReason | null = null
        const matching = attributesOf(name)
        const requirement = matching.length ? attributeRequirement(matching) : null
        if (/[\\\s]/.test(name)) reason = 'escape'
        else if (isExcluded(name)) reason = 'exclude'
        else if (facts.directives.has(name)) reason = 'directive'
        else if (matching.length && !requirement) reason = 'attribute-selector'
        else if (isDynamic(name)) reason = 'dynamic'
        else if (facts.unrecognized.has(name)) reason = 'unrecognized'
        else if (!facts.covered.get(name)) reason = 'unused'
        if (reason) skipped.set(name, reason)
        else {
            chosen.push(name)
            if (requirement) requirements.set(name, requirement)
        }
    }
    // Dùng nhiều (trong mã + trong CSS) -> tên ngắn trước; hoà thì theo thứ tự mã ký tự (không phụ thuộc locale).
    const weight = (name: string) => (facts.covered.get(name) ?? 0) + (cssCount.get(name) ?? 0)
    chosen.sort((a, b) => weight(b) - weight(a) || (a < b ? -1 : a > b ? 1 : 0))

    const reserved = new Set<string>([...names, ...facts.words, ...exclude.filter((x): x is string => typeof x === 'string')])
    // Tên mới phải bị đúng những selector `[class...]` nhắm tên cũ (thường là không cái nào). `ad*` bị bộ lọc chặn
    // quảng cáo ẩn theo class (`##.ad`, `##.ads`...): không bao giờ dùng.
    const usable = (next: string, old: string) => {
        if (reserved.has(next) || /^ad/i.test(next) || isDynamic(next)) return false
        const before = attributesOf(old)
        const after = attributesOf(next)
        return before.length === after.length && before.every((a, i) => a === after[i])
    }
    const map = new Map<string, string>()
    const counters = new Map<string, number>()
    for (const name of chosen) {
        const req = requirements.get(name) ?? { start: '', contain: '', end: '' }
        const head = req.start + req.contain + prefix
        const key = head + '\u0000' + req.end
        let index = counters.get(key) ?? 0
        let next = ''
        for (let tries = 0; tries < 100000; tries++) {
            const short = shortClassName(index++)
            // `h-px`, `text-sm`... là utility thật: tên giữ chuỗi con không dùng từ khoá giá trị của Tailwind.
            if (req.start + req.contain && VALUE_KEYWORDS.has(short)) continue
            const candidate = head + short + req.end
            if (usable(candidate, name)) {
                next = candidate
                break
            }
        }
        counters.set(key, index)
        if (next) map.set(name, next)
        else skipped.set(name, 'attribute-selector')
    }

    const replacements = (code: string): Replacement[] => {
        const list: Replacement[] = []
        if (!map.size) return list
        for (const range of findShortenableClassRanges(code, functions)) {
            for (const { start, end, token } of range.tokens) {
                const next = map.get(token)
                if (next !== undefined) list.push({ start, end, text: next })
            }
        }
        return list
    }
    const rewriteSource = (code: string): string => applyReplacements(code, replacements(code))
    const rewriteSourceWithMap = (code: string, file: string) => {
        const list = replacements(code)
        return { code: applyReplacements(code, list), map: list.length ? replacementSourceMap(code, list, file) : null }
    }
    const findUnrecognized = (code: string): string[] => {
        const keys = new Set(map.keys())
        const local: SourceFacts = { unrecognized: new Set(), covered: new Map(), dynamic: new Map(), directives: new Set(), attributes: [], words: new Set() }
        analyzeSource(code, keys, maxLength, [...keys].filter((k) => /["'`]/.test(k)), functions, local)
        return [...local.unrecognized, ...[...local.directives].filter((d) => keys.has(d))]
    }
    return { map, skipped, rewriteCss: (css) => (map.size ? renameCssClasses(css, map) : css), rewriteSource, rewriteSourceWithMap, findUnrecognized, fragments, attributes: facts.attributes }
}

export interface ShortenClassesResult<C extends string | string[], S extends string[] | Record<string, string>> {
    css: C
    sources: S
    /** Tên gốc -> tên ngắn. */
    map: Record<string, string>
    /** Class giữ nguyên tên -> lý do. */
    skipped: Record<string, ShortClassSkipReason>
}

/**
 * Rút gọn tên class trong CSS và mã nguồn (dùng thủ công, CLI, hoặc sau plugin PostCSS). `sources` phải là TOÀN BỘ
 * mã có thể dùng class (mọi file được bundle, kể cả HTML); class xuất hiện ở file không đưa vào có thể bị đổi tên sai.
 */
export const shortenClasses = <C extends string | string[], S extends string[] | Record<string, string>>(
    input: ShortClassNamesOptions & { css: C; sources: S },
): ShortenClassesResult<C, S> => {
    const short = createShortClassNames(input)
    const css = (Array.isArray(input.css) ? input.css.map(short.rewriteCss) : short.rewriteCss(input.css as string)) as C
    const sources = (Array.isArray(input.sources)
        ? input.sources.map(short.rewriteSource)
        : Object.fromEntries(Object.entries(input.sources).map(([file, code]) => [file, short.rewriteSource(code)]))) as S
    return { css, sources, map: Object.fromEntries(short.map), skipped: Object.fromEntries(short.skipped) }
}
