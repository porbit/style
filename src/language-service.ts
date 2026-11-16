/**
 * Dịch vụ ngôn ngữ thuần logic (không phụ thuộc editor): chẩn đoán, hover, gợi ý, quick fix,
 * sắp xếp class. Dùng chung cho language server (`presence-style lsp`) và extension VS Code.
 * Mọi vị trí là offset ký tự (UTF-16) trong văn bản.
 */
import {
    explainClass,
    findClassAttributes,
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
    kind: 'property' | 'value'
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
    explain(token: string): ClassExplanation
    /** Đổi cấu hình (file cấu hình thay đổi). */
    setConfig(config: XCSSConfig): void
}

// Token chứa cú pháp mẫu (`${x}`, `{a}`) là biểu thức động, không kiểm.
const isDynamic = (token: string) => /[{}$`]/.test(token)

export const createLanguageService = (initialConfig: XCSSConfig = {}): LanguageService => {
    let config = initialConfig
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

    const tokenAt = (text: string, offset: number) => findClassTokens(text).find((range) => offset >= range.start && offset <= range.end) || null

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
    const completions = (text: string, offset: number): ServiceCompletion[] => {
        if (!findClassAttributes(text).some((r) => offset >= r.start && offset <= r.end)) return []
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
        const sorted = sortClassesInSource(text)
        if (sorted !== text) {
            actions.push({ title: 'PresenceStyle: sắp xếp class trong file', kind: 'source', edits: [{ start: 0, end: text.length, newText: sorted }] })
        }
        return actions
    }

    const setConfig = (next: XCSSConfig) => {
        config = next
        explainCache.clear()
    }

    return { diagnose, hover, completions, codeActions, explain, setConfig }
}
