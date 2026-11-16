/**
 * Gộp class xung đột (thay `tailwind-merge`), dựa trên khai báo CSS thật mà class sinh ra:
 *
 *   import { cn } from '@porbit/style/merge'
 *   cn('px-2 py-1 bg-red-500', isActive && 'p-4 bg-blue-500')  // 'p-4 bg-blue-500'
 *
 * Mỗi class quy về các "ô": (điều kiện media/at-rule, selector, !important, thuộc tính longhand). Class đứng
 * trước bị bỏ khi mọi ô của nó bị class đứng sau chiếm: `px-2 p-4` -> `p-4`, `p-4 px-2` giữ cả hai,
 * `shadow-md shadow-red-500` giữ cả hai (khác thuộc tính), `leading-6 text-sm` giữ cả hai (v4: `text-sm`
 * đọc `--tw-leading`). Không có bảng nhóm viết tay nên đúng cả với `@utility`, plugin, theme của dự án.
 *
 * Gói nhẹ cho bản build: `createMerge({ table })` với bảng sinh sẵn từ class của dự án (`buildMergeTable`).
 */
import type { XCSSDialect } from './core'

export type ClassValue = string | number | null | undefined | false | ClassValue[] | Record<string, unknown>

/** Như `clsx`: chuỗi, mảng lồng, object `{ class: điều kiện }`; bỏ giá trị rỗng/false. */
export const clsx = (...inputs: ClassValue[]): string => {
    let out = ''
    const add = (value: ClassValue) => {
        if (!value && value !== 0) return
        if (typeof value === 'string' || typeof value === 'number') out += (out ? ' ' : '') + value
        else if (Array.isArray(value)) value.forEach(add)
        else if (typeof value === 'object') for (const key in value) if (value[key]) out += (out ? ' ' : '') + key
    }
    inputs.forEach(add)
    return out
}

// Shorthand -> longhand (cả phía vật lý và logic). Thuộc tính không có trong bảng là chính nó.
const SIDES = ['top', 'right', 'bottom', 'left']
const LOGICAL = ['inline-start', 'inline-end', 'block-start', 'block-end']
const boxFamily = (base: string, suffix = ''): Record<string, string[]> => {
    const name = (side: string) => `${base}-${side}${suffix}`
    return {
        [`${base}${suffix}`]: [...SIDES, ...LOGICAL].map(name),
        [`${base}-inline${suffix}`]: ['left', 'right', 'inline-start', 'inline-end'].map(name),
        [`${base}-block${suffix}`]: ['top', 'bottom', 'block-start', 'block-end'].map(name),
    }
}
const LONGHANDS: Record<string, string[]> = {
    ...boxFamily('padding'),
    ...boxFamily('margin'),
    ...boxFamily('scroll-margin'),
    ...boxFamily('scroll-padding'),
    inset: ['top', 'right', 'bottom', 'left', 'inset-inline-start', 'inset-inline-end', 'inset-block-start', 'inset-block-end'],
    'inset-inline': ['left', 'right', 'inset-inline-start', 'inset-inline-end'],
    'inset-block': ['top', 'bottom', 'inset-block-start', 'inset-block-end'],
    ...boxFamily('border', '-width'),
    ...boxFamily('border', '-color'),
    ...boxFamily('border', '-style'),
    'border-radius': ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', 'border-start-start-radius', 'border-start-end-radius', 'border-end-start-radius', 'border-end-end-radius'],
    gap: ['row-gap', 'column-gap'],
    overflow: ['overflow-x', 'overflow-y'],
    'overscroll-behavior': ['overscroll-behavior-x', 'overscroll-behavior-y'],
    'place-content': ['align-content', 'justify-content'],
    'place-items': ['align-items', 'justify-items'],
    'place-self': ['align-self', 'justify-self'],
    flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
    'grid-column': ['grid-column-start', 'grid-column-end'],
    'grid-row': ['grid-row-start', 'grid-row-end'],
    'text-decoration': ['text-decoration-line', 'text-decoration-style', 'text-decoration-color', 'text-decoration-thickness'],
    outline: ['outline-width', 'outline-style', 'outline-color'],
    transition: ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay', 'transition-behavior'],
    animation: ['animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state'],
    'list-style': ['list-style-type', 'list-style-position', 'list-style-image'],
    columns: ['column-width', 'column-count'],
}
// `border` (border-top...) = width + style + color của mỗi cạnh.
for (const side of ['', ...[...SIDES, ...LOGICAL, 'inline', 'block'].map((s) => '-' + s)]) {
    const key = `border${side}`
    LONGHANDS[key] = ['width', 'style', 'color'].flatMap((part) => LONGHANDS[`border${side}-${part}`] || [`border${side}-${part}`])
}
export const longhandsOf = (prop: string): string[] => LONGHANDS[prop] || [prop]

/** Token x-css của phương ngữ -> [media, prop, important, selector]. */
const parseToken = (token: string): [string, string, boolean, string] | null => {
    let media = ''
    let rest = token
    if (rest.startsWith('[')) {
        let depth = 0
        let i = 0
        for (; i < rest.length; i++) {
            if (rest[i] === '[') depth++
            else if (rest[i] === ']' && --depth === 0) break
        }
        if (rest[i + 1] !== ':') return null
        media = rest.slice(0, i + 1)
        rest = rest.slice(i + 2)
    } else {
        const colon = rest.indexOf(':')
        const bracket = rest.indexOf('[')
        if (colon !== -1 && (bracket === -1 || colon < bracket)) {
            media = rest.slice(0, colon)
            rest = rest.slice(colon + 1)
        }
    }
    const open = rest.indexOf('[')
    if (open <= 0) return null
    let prop = rest.slice(0, open)
    const important = prop.endsWith('!')
    if (important) prop = prop.slice(0, -1)
    let depth = 0
    let close = open
    for (; close < rest.length; close++) {
        if (rest[close] === '[') depth++
        else if (rest[close] === ']' && --depth === 0) break
    }
    const selector = rest.slice(close + 1).replace(/^@/, '')
    return [media, prop, important, selector]
}

/** Ô của một class (null: không biết class, luôn giữ). */
export const classSlots = (className: string, dialect?: XCSSDialect, fallback?: (className: string) => string[] | null): string[] | null => {
    const tokens = dialect ? dialect(className) : null
    if (tokens && tokens.length) {
        const slots = new Set<string>()
        for (const token of tokens) {
            const parsed = parseToken(token)
            if (!parsed) return null
            const [rawMedia, prop, important, selector] = parsed
            // `md:hover:` và `hover:md:` cho cùng điều kiện, khác thứ tự `and`.
            const media = rawMedia.startsWith('[@media_') ? '[@media_' + rawMedia.slice(8, -1).split('_and_').sort().join('_and_') + ']' : rawMedia
            for (const longhand of longhandsOf(prop)) slots.add(`${media}|${selector}|${important ? '!' : ''}|${longhand}`)
        }
        return [...slots]
    }
    return fallback ? fallback(className) : null
}

export interface MergeTable {
    /** Bảng ô dùng chung. */
    s: string[]
    /** Nhóm: chỉ số ô (class cùng tập ô dùng chung một nhóm). */
    g: number[][]
    /** Tên class của từng nhóm, nối bằng dấu cách (nén tốt hơn object). */
    n: string[]
}

/** Tách `md:hover:!p-4` -> [biến thể đã sắp, important, class gốc]. */
export const splitVariantPrefix = (className: string): [string, boolean, string] => {
    const parts: string[] = []
    let depth = 0
    let start = 0
    for (let i = 0; i < className.length; i++) {
        const ch = className[i]
        if (ch === '[' || ch === '(') depth++
        else if (ch === ']' || ch === ')') depth--
        else if (ch === ':' && depth === 0) {
            parts.push(className.slice(start, i))
            start = i + 1
        }
    }
    let base = className.slice(start)
    let important = false
    if (base.startsWith('!') || base.endsWith('!')) {
        important = true
        base = base.replace(/^!|!$/g, '')
    }
    return [parts.sort().join(':'), important, base]
}

/**
 * Bảng gộp cho một tập class (sinh lúc build): chỉ lưu class gốc; biến thể tách lúc chạy.
 * `createMerge({ table })` không cần dữ liệu phương ngữ.
 */
export const buildMergeTable = (classes: Iterable<string>, dialect?: XCSSDialect, fallback?: (className: string) => string[] | null): MergeTable => {
    const table: MergeTable = { s: [], g: [], n: [] }
    const slotIndex = new Map<string, number>()
    const groupIndex = new Map<string, number>()
    const bases = new Set<string>()
    for (const name of classes) bases.add(splitVariantPrefix(name)[2])
    for (const name of bases) {
        const own = classSlots(name, dialect, fallback)?.map((slot) => slot.replace(/\|\|/, '|'))
        if (!own) continue
        const ids = own.map((slot) => {
            let i = slotIndex.get(slot)
            if (i === undefined) {
                i = table.s.length
                slotIndex.set(slot, i)
                table.s.push(slot)
            }
            return i
        }).sort((x, y) => x - y)
        const key = ids.join(',')
        let g = groupIndex.get(key)
        if (g === undefined) {
            g = table.g.length
            groupIndex.set(key, g)
            table.g.push(ids)
            table.n.push(name)
        } else table.n[g] += ' ' + name
    }
    return table
}

export interface MergeOptions {
    /** Phương ngữ (ví dụ `tailwindV4Dialect()`): ô tính từ khai báo thật. */
    dialect?: XCSSDialect
    /** Bảng sinh sẵn (`buildMergeTable`): dùng trước phương ngữ. */
    table?: MergeTable
    /** Kích thước bộ nhớ đệm kết quả. Mặc định 500. */
    cacheSize?: number
    /** Ô cho class ngoài phương ngữ (ví dụ class x-css); null = class lạ, luôn giữ. */
    fallback?: (className: string) => string[] | null
}

export const createMerge = (options: MergeOptions = {}) => {
    const { dialect, table, cacheSize = 500, fallback } = options
    const slotCache = new Map<string, string[] | null>()
    const fromTable = new Map<string, string[]>()
    if (table) table.n.forEach((names, g) => {
        const slots = table.g[g].map((i) => table.s[i])
        for (const name of names.split(' ')) fromTable.set(name, slots)
    })
    const slotsOf = (name: string): string[] | null => {
        if (table) {
            const [variants, important, base] = splitVariantPrefix(name)
            const known = fromTable.get(base)
            if (known) return known.map((slot) => `${variants}|${important ? '!' : ''}|${slot}`)
            if (!dialect && !fallback) return null
        }
        let slots = slotCache.get(name)
        if (slots === undefined) {
            slots = classSlots(name, dialect, fallback)
            if (slotCache.size > 5000) slotCache.clear()
            slotCache.set(name, slots)
        }
        return slots
    }
    const results = new Map<string, string>()
    return (...inputs: ClassValue[]): string => {
        const input = clsx(...inputs)
        const cached = results.get(input)
        if (cached !== undefined) return cached
        const tokens = input.split(/\s+/).filter(Boolean)
        const claimed = new Set<string>()
        const keep: string[] = []
        // Duyệt từ phải sang trái: class sau thắng.
        for (let i = tokens.length - 1; i >= 0; i--) {
            const token = tokens[i]
            const slots = slotsOf(token)
            if (!slots) {
                keep.push(token)
                continue
            }
            if (slots.every((slot) => claimed.has(slot))) continue
            slots.forEach((slot) => claimed.add(slot))
            keep.push(token)
        }
        const output = keep.reverse().join(' ')
        if (results.size >= cacheSize) results.clear()
        results.set(input, output)
        return output
    }
}
