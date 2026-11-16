/**
 * Chế độ lai của bản CDN Tailwind (`tailwind-auto.mjs data-hybrid`): trang đã có CSS tĩnh build sẵn, runtime chỉ
 * sinh CSS cho class mới. Đọc stylesheet cùng nguồn (class đã có, biến theme) và chỉ cho engine khối `@layer` của
 * CSS tĩnh để chèn rule mới đúng thứ tự Tailwind. Tách khỏi src/tailwind-auto.ts để test được không cần trang.
 */
import type { XCSSPreloadManifest, XCSSStaticBlock } from './core'

// Khối `@layer` của CSS tĩnh mà runtime đã nhận để chèn rule (staticLayerBlock): theo dõi để biết CSS tĩnh bị thay.
const usedBlocks = new Set<CSSRule>()

// Tên class trong selector đã serialize, bỏ escape: `.md\\:p-4` -> `md:p-4`, `.\\32 xl\\:p-4` -> `2xl:p-4`.
export const selectorClassNames = (selector: string): string[] =>
    [...selector.matchAll(/\.((?:\\[\da-fA-F]{1,6} ?|\\[^\da-fA-F]|[\w-])+)/g)].map((m) =>
        m[1].replace(/\\([\da-fA-F]{1,6}) ?|\\(.)/g, (_m, hex: string, ch: string) => ch ?? String.fromCodePoint(parseInt(hex, 16))))

/**
 * Chế độ lai (`data-hybrid`): trang đã có CSS tĩnh (PostCSS/Vite/CLI), runtime chỉ sinh CSS cho class mới
 * xuất hiện lúc chạy (`bg-${color}-500`, nội dung CMS, HTML do AI sinh). Đọc từ stylesheet cùng nguồn:
 * tên class đã có rule và biến theme ở `:root`.
 */
export const readStaticCss = (): { classes: string[]; theme: Record<string, string> } => {
    const classes = new Set<string>()
    const theme: Record<string, string> = {}
    const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
            const style = rule as CSSStyleRule
            if (typeof style.selectorText === 'string') {
                for (const name of selectorClassNames(style.selectorText)) classes.add(name)
                if (/(^|,)\s*:root\b/.test(style.selectorText)) {
                    for (let i = 0; i < style.style.length; i++) {
                        const prop = style.style[i]
                        if (prop.startsWith('--') && !prop.startsWith('--tw-')) theme[prop] = style.style.getPropertyValue(prop).trim()
                    }
                }
            }
            const nested = (rule as CSSGroupingRule).cssRules
            if (nested && nested.length) walk(nested)
        }
    }
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            walk(sheet.cssRules)
        } catch (_error) {
            // stylesheet khác nguồn: không đọc được
        }
    }
    return { classes: [...classes], theme }
}

/**
 * Lai: rule sinh lúc chạy nằm ở sheet riêng, luôn sau CSS tĩnh, nên khi class động và class tĩnh cùng phần tử
 * đụng nhau (`px-4` tĩnh, `p-2` động) bên thắng theo thứ tự sheet chứ không theo thứ tự Tailwind (`px-4` thắng).
 * Engine chèn rule vào khối `@layer lN` cuối cùng của CSS tĩnh cùng nguồn (CSS do Tailwind build: `@layer
 * utilities`), đúng vị trí theo `compare`. Khoá của rule có sẵn: class đầu tiên trong selector (rule không có class
 * như preflight, theme đứng trước mọi utility); nhóm `@media`/`@supports` chỉ chứa style rule tính từng rule con.
 * Gọi lại mỗi khi engine dựng lại khối nên rule đã chèn cũng có khoá.
 */
export const staticLayerBlock = (compare: (a: string, b: string) => number) => (layer: number): XCSSStaticBlock | undefined => {
    const blocks: Record<string, CSSLayerBlockRule> = {}
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            for (const rule of Array.from(sheet.cssRules)) if (rule instanceof CSSLayerBlockRule) blocks[rule.name] = rule
        } catch (_error) {
            // stylesheet khác nguồn
        }
    }
    const b = blocks['l' + layer] || blocks.utilities
    if (!b) return
    usedBlocks.add(b)
    const g: any[] = []
    const k: XCSSStaticBlock['k'] = []
    for (const rule of Array.from(b.cssRules) as any[]) {
        const inner = rule.selectorText == null && rule.cssRules ? (Array.from(rule.cssRules) as any[]) : []
        const grouped = inner.length > 0 && inner.every((x) => x.selectorText != null)
        if (grouped) rule.w = rule.cssText.slice(0, rule.cssText.indexOf('{')).trim()
        for (let x of grouped ? inner : [rule]) {
            while (x && x.selectorText == null) x = x.cssRules?.[0]
            const name = selectorClassNames(x ? x.selectorText : '')[0]
            g.push(grouped ? rule : null)
            k.push(name ? { compare, name } : undefined)
        }
    }
    return { b, g, k }
}

/**
 * HMR của CSS tĩnh (Vite thay `<style>` hoặc chèn `<link>` mới rồi bỏ cái cũ): rule runtime đã chèn vào sheet cũ mất
 * theo. Theo dõi `<head>` (thêm/bỏ/sửa `<style>`, `<link>`) và sự kiện `load` của `<link>`: khi một khối đã dùng không
 * còn thuộc stylesheet nào của trang, chèn lại mọi rule runtime vào khối của CSS tĩnh mới (`preload.reinsert`), đúng
 * vị trí theo thứ tự Tailwind. Trả hàm ngắt theo dõi.
 */
export const watchStaticCss = (preload: XCSSPreloadManifest): (() => void) => {
    const check = () => {
        const live = new Set(Array.from(document.styleSheets))
        if (![...usedBlocks].some((block) => !block.parentStyleSheet || !live.has(block.parentStyleSheet))) return
        usedBlocks.clear()
        preload.reinsert?.()
    }
    const observer = new MutationObserver(check)
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    const onLoad = (event: Event) => {
        if ((event.target as Element)?.tagName === 'LINK') check()
    }
    document.addEventListener('load', onLoad, true)
    return () => {
        observer.disconnect()
        document.removeEventListener('load', onLoad, true)
    }
}
