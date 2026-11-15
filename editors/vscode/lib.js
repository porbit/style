'use strict'
/**
 * Logic thuần của extension (không phụ thuộc API `vscode`), để kiểm thử được bằng Node.
 * Mọi vị trí là offset ký tự trong văn bản.
 */

/**
 * @param {typeof import('@porbit/style/analyze')} analyze
 */
const createLanguageService = (analyze) => {
    const explainCache = new Map()
    let cachedConfigKey = ''

    const explain = (token, config) => {
        const key = JSON.stringify(config || {}) + ((config && config.dialects && config.dialects.length) || 0)
        if (key !== cachedConfigKey) {
            explainCache.clear()
            cachedConfigKey = key
        }
        let info = explainCache.get(token)
        if (!info) {
            info = analyze.explainClass(token, config || {})
            if (explainCache.size > 5000) explainCache.clear()
            explainCache.set(token, info)
        }
        return info
    }

    /** Lỗi class (không sinh CSS) và xung đột trong từng thuộc tính class. */
    const diagnose = (text, config) => {
        const result = []
        for (const { start, end, token } of analyze.findClassTokens(text)) {
            if (/[{}$`]/.test(token)) continue
            const info = explain(token, config)
            if (info.valid || !info.parsed) continue
            if (!info.suggestion && !analyze.isXcssLike(token)) continue
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
        for (const range of analyze.findClassAttributes(text)) {
            for (const conflict of analyze.findClassConflicts(range.value)) {
                // Gạch dưới token đầu tiên của nhóm xung đột (token sẽ "thua" theo ý người viết).
                const first = conflict.tokens[0]
                const re = /\S+/g
                let match
                let offset = 0
                while ((match = re.exec(range.value)) !== null) {
                    if (match[0] === first) {
                        offset = match.index
                        break
                    }
                }
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

    /** Token class tại vị trí con trỏ (nếu con trỏ nằm trong thuộc tính class). */
    const tokenAt = (text, offset) => {
        for (const range of analyze.findClassTokens(text)) {
            if (offset >= range.start && offset <= range.end) return range
        }
        return null
    }

    /** Nội dung hover dạng Markdown cho token tại vị trí. */
    const hover = (text, offset, config) => {
        const range = tokenAt(text, offset)
        if (!range) return null
        const info = explain(range.token, config)
        const lines = []
        if (info.valid) {
            lines.push('```css', info.css.trim(), '```')
        } else {
            lines.push(`**Không sinh CSS.**${info.suggestion ? ` Sửa thành \`${info.suggestion}\`.` : ''}`)
            info.hints.forEach((hint) => lines.push('- ' + hint))
        }
        if (info.parsed) {
            const p = info.parsed
            lines.push('', `media \`${p.media}\` · layer \`${p.layer}\` · property \`${p.cssProperty}\` · value \`${p.value || '—'}\`${p.selector ? ` · selector \`${p.selector}\`` : ''}`)
        }
        return { start: range.start, end: range.end, markdown: lines.join('\n') }
    }

    /** Có đang ở trong thuộc tính class không (để chỉ gợi ý ở đó). */
    const inClassAttribute = (text, offset) =>
        analyze.findClassAttributes(text).some((r) => offset >= r.start && offset <= r.end)

    let aliasCache = null
    const completions = () => {
        if (!aliasCache) {
            aliasCache = []
            for (const item of analyze.listPropertyAliases()) {
                aliasCache.push({ label: item.alias, detail: item.property, kind: 'property' })
                item.values.forEach((value) => aliasCache.push({ label: value, detail: item.property, kind: 'value' }))
            }
        }
        return aliasCache
    }

    return { diagnose, hover, tokenAt, inClassAttribute, completions, explain }
}

module.exports = { createLanguageService }
