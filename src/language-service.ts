/**
 * Dịch vụ ngôn ngữ thuần logic (không phụ thuộc editor): chẩn đoán, hover, gợi ý, quick fix,
 * sắp xếp class. Dùng chung cho language server (`presence-style lsp`) và extension VS Code.
 * Mọi vị trí là offset ký tự (UTF-16) trong văn bản.
 */
import {
    explainClass,
    findClassAttributes,
    findClassStrings,
    findClassConflicts,
    findClassTokens,
    isXcssLike,
    listPropertyAliases,
    sortClassesInSource,
    type ClassExplanation,
} from './analyze'
import type { XCSSConfig } from './core'

export interface ServiceDiagnostic {
    start: number
    end: number
    severity: 'warning' | 'information'
    code: 'invalid-class' | 'conflict'
    message: string
    suggestion: string | null
}

export interface ServiceHover {
    start: number
    end: number
    markdown: string
}

export interface ServiceCompletion {
    label: string
    detail: string
    kind: 'property' | 'value' | 'class' | 'color' | 'variant'
    /** Offset bắt đầu đoạn được thay (sau tiền tố biến thể `md:hover:`); không có thì client tự xác định từ. */
    replaceStart?: number
    /** Mã màu hex (cho ô màu của editor). */
    color?: string
}

/** Ô màu cho class màu (`bg-red-500`, `c[#f00]`): `textDocument/documentColor`. */
export interface ServiceColor {
    start: number
    end: number
    /** `#rrggbb` */
    color: string
}

export interface ServiceEdit {
    start: number
    end: number
    newText: string
}

export interface ServiceCodeAction {
    title: string
    kind: 'quickfix' | 'source'
    edits: ServiceEdit[]
    /** Chẩn đoán mà hành động này sửa (để editor ghép với dấu gạch). */
    diagnostic?: ServiceDiagnostic
    preferred?: boolean
}

export interface LanguageService {
    diagnose(text: string): ServiceDiagnostic[]
    hover(text: string, offset: number): ServiceHover | null
    completions(text: string, offset: number): ServiceCompletion[]
    codeActions(text: string, start: number, end: number): ServiceCodeAction[]
    colors(text: string): ServiceColor[]
    explain(token: string): ClassExplanation
    /** Đổi cấu hình (file cấu hình thay đổi). */
    setConfig(config: XCSSConfig): void
    /** Thêm hàm có đối số là chuỗi class (giống `tailwindFunctions` của Prettier), ngoài `cn`/`clsx`/`cva`/`tw`/`twMerge`/`twJoin`. */
    setFunctions(functions: readonly string[]): void
}

const COMPLETION_FUNCTIONS = ['cn', 'clsx', 'cva', 'tw', 'twMerge', 'twJoin']

/** `oklch(63.7% 0.237 25.331)` / `#abc` -> `#rrggbb` (để editor hiện ô màu). */
export const cssColorToHex = (value: string): string | null => {
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    if (hex) return hex[1].length === 3 ? '#' + [...hex[1]].map((c) => c + c).join('').toLowerCase() : '#' + hex[1].toLowerCase()
    const m = value.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*[\d.%]+\s*)?\)$/i)
    if (!m) return null
    const L = Number(m[1]) / (m[2] ? 100 : 1)
    const C = Number(m[3])
    const h = (Number(m[4]) * Math.PI) / 180
    const a = C * Math.cos(h)
    const b = C * Math.sin(h)
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    const rgb = [
        4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
    ].map((x) => {
        const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(x, 0) ** (1 / 2.4) - 0.055
        return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
    })
    return '#' + rgb.join('')
}

const COLOR_PROPS = /^(color|background-color|border(-[a-z]+)?-color|outline-color|text-decoration-color|fill|stroke|accent-color|caret-color|--tw-[a-z-]*color)$/
/** Màu của class (từ token của phương ngữ): giá trị màu cuối trong khai báo thuộc tính màu. */
const colorOfTokens = (tokens: string[]): string | null => {
    for (const token of tokens) {
        const m = token.match(/^(?:[^:[]*:)?([\w-]+)!?\[(.*)\]/)
        if (!m || !COLOR_PROPS.test(m[1])) continue
        const value = m[2].replace(/\\_/g, '\u0000').replace(/_/g, ' ').replace(/\u0000/g, '_')
        const literals = value.match(/oklch\([^()]*\)|#[0-9a-f]{3,8}\b/gi)
        const hex = literals && cssColorToHex(literals[literals.length - 1])
        if (hex) return hex
    }
    return null
}

/** Màu của CSS đã sinh (x-css: `color:#f00`, `background-color:oklch(...)`). */
const colorOfCss = (css: string): string | null => {
    for (const m of css.matchAll(/(?:^|[{;\s])([\w-]+)\s*:\s*([^;{}]+)/g)) {
        if (!COLOR_PROPS.test(m[1]) && m[1] !== 'background') continue
        const literals = m[2].match(/oklch\([^()]*\)|#[0-9a-f]{3,8}\b/gi)
        const hex = literals && cssColorToHex(literals[literals.length - 1])
        if (hex) return hex
    }
    return null
}

// Token chứa cú pháp mẫu (`${x}`, `{a}`) là biểu thức động, không kiểm.
const isDynamic = (token: string) => /[{}$`]/.test(token)

export const createLanguageService = (initialConfig: XCSSConfig = {}): LanguageService => {
    let config = initialConfig
    let functions = COMPLETION_FUNCTIONS
    const explainCache = new Map<string, ClassExplanation>()

    const explain = (token: string): ClassExplanation => {
        let info = explainCache.get(token)
        if (!info) {
            info = explainClass(token, config)
            if (explainCache.size > 5000) explainCache.clear()
            explainCache.set(token, info)
        }
        return info
    }

    const usesDialect = () => !!(config.dialects && config.dialects.length)

    const diagnose = (text: string): ServiceDiagnostic[] => {
        const result: ServiceDiagnostic[] = []
        for (const { start, end, token } of findClassTokens(text)) {
            if (isDynamic(token)) continue
            const info = explain(token)
            if (info.valid) continue
            // Class của thư viện khác (`btn`, `card`) không bị gạch, trừ khi có bản sửa rõ ràng.
            // Với dialect (Tailwind), class không có dạng x-css cũng không gạch: có thể do CSS của dự án.
            if (!info.parsed && !info.suggestion) continue
            if (!info.suggestion && (!isXcssLike(token) || usesDialect())) continue
            result.push({
                start,
                end,
                severity: 'warning',
                code: 'invalid-class',
                message: info.suggestion
                    ? `\`${token}\` không sinh CSS. Sửa thành \`${info.suggestion}\`.`
                    : `\`${token}\` không sinh CSS. ${info.hints[0] || ''}`.trim(),
                suggestion: info.suggestion || null,
            })
        }
        for (const range of findClassAttributes(text)) {
            for (const conflict of findClassConflicts(range.value)) {
                // Gạch token đầu của nhóm xung đột (token sẽ "thua" theo ý người viết).
                const first = conflict.tokens[0]
                const match = new RegExp(`(^|\\s)${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`).exec(range.value)
                const offset = match ? match.index + match[1].length : 0
                result.push({
                    start: range.start + offset,
                    end: range.start + offset + first.length,
                    severity: 'information',
                    code: 'conflict',
                    message: `Xung đột ${conflict.property}: ${conflict.tokens.join(' ')}. Class thắng phụ thuộc thứ tự rule trên trang; giữ một class hoặc nâng layer.`,
                    suggestion: null,
                })
            }
        }
        return result
    }

    /** Token trong thuộc tính class và trong đối số của `functions` (`cn("...")`). */
    const classTokens = (text: string) => {
        const tokens: Array<{ start: number; end: number; token: string }> = []
        for (const range of findClassStrings(text, { functions })) {
            for (const m of range.value.matchAll(/\S+/g)) tokens.push({ start: range.start + m.index!, end: range.start + m.index! + m[0].length, token: m[0] })
        }
        return tokens
    }
    const tokenAt = (text: string, offset: number) => classTokens(text).find((range) => offset >= range.start && offset <= range.end) || null

    const hover = (text: string, offset: number): ServiceHover | null => {
        const range = tokenAt(text, offset)
        if (!range || isDynamic(range.token)) return null
        const info = explain(range.token)
        const lines: string[] = []
        if (info.valid) {
            lines.push('```css', info.css.trim(), '```')
        } else {
            if (!info.parsed && !info.suggestion) return null
            lines.push(`**Không sinh CSS.**${info.suggestion ? ` Sửa thành \`${info.suggestion}\`.` : ''}`)
            info.hints.forEach((hint) => lines.push('- ' + hint))
        }
        if (info.parsed) {
            const p = info.parsed
            lines.push('', `media \`${p.media}\` · layer \`${p.layer}\` · property \`${p.cssProperty}\` · value \`${p.value || '—'}\`${p.selector ? ` · selector \`${p.selector}\`` : ''}`)
        }
        return { start: range.start, end: range.end, markdown: lines.join('\n') }
    }

    let aliasCache: ServiceCompletion[] | null = null
    let dialectCache: { list: ServiceCompletion[]; variants: ServiceCompletion[] } | null = null
    const dialectCompletions = () => {
        const dialect = config.dialects?.find((d) => typeof d.classList === 'function')
        if (!dialect) return null
        if (!dialectCache) {
            const list = dialect.classList!().map((name): ServiceCompletion => {
                const tokens = dialect(name) || []
                const color = colorOfTokens(tokens)
                return color ? { label: name, detail: color, kind: 'color', color } : { label: name, detail: '', kind: 'class' }
            })
            const variants = (dialect.variantList?.() || []).map((name): ServiceCompletion => ({ label: name + ':', detail: 'biến thể', kind: 'variant' }))
            dialectCache = { list, variants }
        }
        return dialectCache
    }
    const completions = (text: string, offset: number): ServiceCompletion[] => {
        const attribute = findClassStrings(text, { functions }).find((r) => offset >= r.start && offset <= r.end)
        if (!attribute) return []
        const fromDialect = dialectCompletions()
        if (fromDialect) {
            // Token đang gõ và tiền tố biến thể: `md:hover:bg-re|` -> thay `bg-re`.
            const before = text.slice(attribute.start, offset)
            const tokenStart = attribute.start + before.search(/\S*$/)
            const typed = text.slice(tokenStart, offset)
            let depth = 0
            let cut = 0
            for (let i = 0; i < typed.length; i++) {
                if (typed[i] === '[' || typed[i] === '(') depth++
                else if (typed[i] === ']' || typed[i] === ')') depth--
                else if (typed[i] === ':' && depth === 0) cut = i + 1
            }
            const replaceStart = tokenStart + cut
            return [...fromDialect.variants, ...fromDialect.list].map((item) => ({ ...item, replaceStart }))
        }
        if (!aliasCache) {
            aliasCache = []
            for (const item of listPropertyAliases()) {
                aliasCache.push({ label: item.alias, detail: item.property, kind: 'property' })
                item.values.forEach((value) => aliasCache!.push({ label: value, detail: item.property, kind: 'value' }))
            }
        }
        return aliasCache
    }

    const codeActions = (text: string, start: number, end: number): ServiceCodeAction[] => {
        const actions: ServiceCodeAction[] = []
        for (const diagnostic of diagnose(text)) {
            if (!diagnostic.suggestion || diagnostic.end < start || diagnostic.start > end) continue
            actions.push({
                title: `Sửa thành ${diagnostic.suggestion}`,
                kind: 'quickfix',
                edits: [{ start: diagnostic.start, end: diagnostic.end, newText: diagnostic.suggestion }],
                diagnostic,
                preferred: true,
            })
        }
        const compare = config.dialects?.find((dialect) => typeof dialect.compare === 'function')?.compare
        const sorted = sortClassesInSource(text, compare ? { compare, functions } : {})
        if (sorted !== text) {
            actions.push({ title: 'PresenceStyle: sắp xếp class trong file', kind: 'source', edits: [{ start: 0, end: text.length, newText: sorted }] })
        }
        return actions
    }

    const colorCache = new Map<string, string | null>()
    const colorOf = (token: string): string | null => {
        if (colorCache.has(token)) return colorCache.get(token)!
        let color: string | null = null
        const dialect = config.dialects?.find((d) => typeof d.classList === 'function')
        if (dialect) color = colorOfTokens(dialect(token) || [])
        if (!color) {
            const info = explain(token)
            if (info.valid) color = colorOfCss(info.css)
        }
        if (colorCache.size > 5000) colorCache.clear()
        colorCache.set(token, color)
        return color
    }
    const colors = (text: string): ServiceColor[] => {
        const result: ServiceColor[] = []
        for (const { start, end, token } of classTokens(text)) {
            if (isDynamic(token)) continue
            const color = colorOf(token)
            if (color) result.push({ start, end, color })
        }
        return result
    }

    const setConfig = (next: XCSSConfig) => {
        config = next
        explainCache.clear()
        colorCache.clear()
        dialectCache = null
    }
    const setFunctions = (list: readonly string[]) => {
        const extra = list.filter((name) => typeof name === 'string' && /^[\w$.]+$/.test(name))
        functions = [...new Set([...COMPLETION_FUNCTIONS, ...extra])]
    }

    return { diagnose, hover, completions, codeActions, colors, explain, setConfig, setFunctions }
}
