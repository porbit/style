/**
 * Công cụ thuần logic trên chuỗi class x-css: phát hiện xung đột và rút gọn token.
 * Không phụ thuộc DOM hay engine, dùng chung cho Tailwind helper, MCP và người dùng.
 */
import { parseClassName } from './parser'
import { COMMON_VALUES, SHORT_PROPERTIES, SPECIFIC_VALUES } from './dictionary'

/**
 * Khoá xung đột của một token: hai token có cùng khoá cùng đặt một property CSS
 * trong cùng media, layer và selector. Khi đó token nào thắng phụ thuộc thứ tự rule
 * xuất hiện trên trang, không phụ thuộc thứ tự trong thuộc tính `class`.
 * Trả `null` cho token không tách được, alias nhóm `[...]` và chuỗi `&`.
 */
export const getConflictKey = (token: string): string | null => {
    if (!token || token.includes('&')) return null
    const parsed = parseClassName(token)
    if (!parsed || !parsed.prop || parsed.prop.startsWith('[')) return null
    const property = SHORT_PROPERTIES[parsed.prop] || parsed.prop
    return `${parsed.mq || 'default'}|${Number(parsed.layer) || 0}|${property}|${parsed.selector || ''}`
}

export interface ClassConflict {
    /** Property CSS bị đặt nhiều lần. */
    property: string
    media: string
    layer: number
    selector: string
    /** Các token xung đột, theo thứ tự xuất hiện. */
    tokens: string[]
}

/** Liệt kê các nhóm token xung đột trong một danh sách class. */
export const findClassConflicts = (input: string | string[]): ClassConflict[] => {
    const tokens = (Array.isArray(input) ? input.join(' ') : input).split(/\s+/).filter(Boolean)
    const groups = new Map<string, string[]>()
    for (const token of tokens) {
        const key = getConflictKey(token)
        if (!key) continue
        const list = groups.get(key)
        if (list) {
            if (!list.includes(token)) list.push(token)
        } else {
            groups.set(key, [token])
        }
    }
    const conflicts: ClassConflict[] = []
    groups.forEach((list, key) => {
        if (list.length < 2) return
        const [media, layer, property, selector] = key.split('|')
        conflicts.push({ property, media, layer: Number(layer), selector, tokens: list })
    })
    return conflicts
}

/**
 * Bỏ token bị ghi đè: với mỗi khoá xung đột chỉ giữ token xuất hiện SAU CÙNG
 * (cùng ý nghĩa người viết mong đợi). Trả danh sách đã lọc và các token bị bỏ.
 */
export const dedupeConflictingClasses = (tokens: string[]): { tokens: string[]; removed: Array<{ token: string; replacedBy: string }> } => {
    const winner = new Map<string, string>()
    for (const token of tokens) {
        const key = getConflictKey(token)
        if (key) winner.set(key, token)
    }
    const removed: Array<{ token: string; replacedBy: string }> = []
    const seen = new Set<string>()
    const kept: string[] = []
    for (const token of tokens) {
        if (seen.has(token)) continue
        seen.add(token)
        const key = getConflictKey(token)
        const win = key ? winner.get(key) : undefined
        if (win && win !== token) {
            removed.push({ token, replacedBy: win })
            continue
        }
        kept.push(token)
    }
    return { tokens: kept, removed }
}

// Value viết tắt dùng chung chỉ nhận các khoá dễ đọc; bỏ những khoá khó hiểu (`cc`, `sol`...).
const COMMON_ALIAS_WHITELIST = new Set(['n', 'a', 'h', 'c', 's', 'e'])

const reverseValueIndex = new Map<string, Map<string, string>>()
const getReverseValues = (prop: string): Map<string, string> => {
    let index = reverseValueIndex.get(prop)
    if (index) return index
    index = new Map()
    const specific = SPECIFIC_VALUES[prop] || {}
    const add = (key: string, value: string) => {
        const current = index!.get(value)
        if (!current || key.length < current.length) index!.set(value, key)
    }
    for (const key of COMMON_ALIAS_WHITELIST) {
        // Chỉ dùng khoá chung khi property không định nghĩa lại khoá đó với nghĩa khác.
        if (specific[key] === undefined && COMMON_VALUES[key]) add(key, COMMON_VALUES[key])
    }
    for (const [key, value] of Object.entries(specific)) add(key, value)
    reverseValueIndex.set(prop, index)
    return index
}

const PLAIN_VALUE = /^-?(?:\d|\.\d|#)[\w.%#-]*$/

const sameShape = (candidate: string, prop: string, val: string): boolean => {
    const parsed = parseClassName(candidate)
    return !!parsed && parsed.prop === prop && parsed.val === val
}

/**
 * Rút gọn một token x-css sang dạng tương đương ngắn hơn khi chắc chắn sinh cùng CSS:
 * `ai[center]` → `aiC`, `jc[space-between]` → `jcSp`, `h[40px]` → `h40px`, `mx[auto]` → `mxA`,
 * `bgc#ffffff` → `bgc#fff`.
 * Token không rút gọn được an toàn được giữ nguyên.
 */
export const compactClassToken = (token: string): string => {
    const parsed = parseClassName(token)
    if (!parsed || !parsed.prop || parsed.prop.startsWith('[') || parsed.prop.startsWith('-')) return token
    let { val } = parsed
    let important = ''
    if (val.startsWith('!')) {
        important = '!'
        val = val.slice(1)
    }
    const prefix = (parsed.mq ? parsed.mq + ':' : '') + parsed.layer + parsed.prop
    const suffix = parsed.selector ? '@' + parsed.selector : ''

    // `#ffffff` -> `#fff`: cùng màu, ngắn hơn 3 ký tự.
    const hex = val.match(/^#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3$/)
    if (hex) return prefix + important + '#' + hex[1] + hex[2] + hex[3] + suffix

    if (!val.startsWith('[') || !val.endsWith(']')) return token
    const inner = val.slice(1, -1)
    if (!inner || inner.includes('[') || inner.includes('\\')) return token

    let compactVal: string | null = null

    const alias = getReverseValues(parsed.prop).get(inner)
    if (alias) {
        compactVal = important + alias.charAt(0).toUpperCase() + alias.slice(1)
    } else if (PLAIN_VALUE.test(inner)) {
        compactVal = important + inner
    }

    if (!compactVal) return token
    const candidate = prefix + compactVal + suffix
    if (candidate.length >= token.length) return token
    return sameShape(candidate, parsed.prop, compactVal) ? candidate : token
}

/** Rút gọn mọi token trong một chuỗi class (giữ thứ tự). */
export const compactClasses = (input: string): string =>
    input.split(/\s+/).filter(Boolean).map(compactClassToken).join(' ')
