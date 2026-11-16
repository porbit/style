/**
 * Bản CDN thay `@tailwindcss/browser`: viết class Tailwind v4 trong HTML, CSS sinh lúc chạy.
 *
 *   <script type="module" src="https://unpkg.com/@porbit/style/dist/tailwind-auto.mjs"></script>
 *
 * Tuỳ chọn qua thuộc tính của thẻ script: `data-preflight="false"`, `data-dark="class"`,
 * `data-hybrid` (trang đã có CSS tĩnh: chỉ sinh CSS cho class mới xuất hiện lúc chạy).
 */
import presenceStyle from './core'
import { parseTailwindStylesheet, tailwindV4Dialect } from './tailwind-v4'

// `document.currentScript` luôn là null với <script type="module">: tìm thẻ theo đường dẫn.
const script = typeof document !== 'undefined'
    ? ((document.currentScript as HTMLScriptElement | null) ??
        [...document.querySelectorAll<HTMLScriptElement>('script[src]')].find((el) => /tailwind-auto/.test(el.src)) ??
        null)
    : null
const attr = (name: string) => script?.getAttribute(name) ?? null

// Plugin đóng gói sẵn (`@import "tw-animate-css"`, `@plugin "@tailwindcss/forms"`...) nằm ở file riêng,
// chỉ tải khi stylesheet cần, để bản CDN không nặng thêm.
type PluginModule = { resolveTailwindPlugin: (id: string) => string | null }
const loadPlugins = (): Promise<PluginModule | null> =>
    import(/* @vite-ignore */ new URL('./tailwind-plugins.mjs', import.meta.url).href).catch(() => null)

/**
 * Chế độ lai (`data-hybrid`): trang đã có CSS tĩnh (PostCSS/Vite/CLI), runtime chỉ sinh CSS cho class mới
 * xuất hiện lúc chạy (`bg-${color}-500`, nội dung CMS, HTML do AI sinh). Đọc từ stylesheet cùng nguồn:
 * tên class đã có rule và biến theme ở `:root`.
 */
const readStaticCss = (): { classes: string[]; theme: Record<string, string> } => {
    const classes = new Set<string>()
    const theme: Record<string, string> = {}
    // Bỏ escape của CSS: `md\\:p-4` -> `md:p-4`, `\\31 0` -> `10`.
    const unescape = (name: string) => name.replace(/\\([0-9a-fA-F]{1,6}) ?/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16))).replace(/\\(.)/g, '$1')
    const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
            const style = rule as CSSStyleRule
            if (typeof style.selectorText === 'string') {
                for (const m of style.selectorText.matchAll(/\.((?:\\.|[\w-])+)/g)) classes.add(unescape(m[1]))
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

const start = async () => {
    // `<style type="text/tailwindcss">@theme { --color-brand: ... }</style>` như @tailwindcss/browser.
    const sources = [...document.querySelectorAll('style[type="text/tailwindcss"]')].map((style) => style.textContent || '')
    const needsPlugins = sources.some((text) => /@(import|plugin)\s+["'](?!tailwindcss)/.test(text))
    const plugins = needsPlugins ? await loadPlugins() : null
    const theme: Record<string, string> = {}
    const utilities: Record<string, string> = {}
    const variants: Record<string, string> = {}
    let css = ''
    for (const text of sources) {
        const parsed = parseTailwindStylesheet(text, { resolve: plugins?.resolveTailwindPlugin })
        Object.assign(theme, parsed.theme)
        Object.assign(utilities, parsed.utilities)
        Object.assign(variants, parsed.variants)
        css += parsed.css + '\n'
        parsed.unresolved.forEach((id) => console.warn(`[presence-style] Không tìm thấy "${id}" (plugin chưa đóng gói sẵn).`))
    }
    const hybrid = attr('data-hybrid') !== null
    const existing = hybrid ? readStaticCss() : null
    presenceStyle.cssObserve(document, {
        hashClassName: false,
        preload: existing ? { classes: existing.classes } : undefined,
        dialects: [tailwindV4Dialect({
            // Lai: CSS tĩnh đã có preflight và CSS nền của dự án.
            preflight: !hybrid && attr('data-preflight') !== 'false',
            darkMode: attr('data-dark') === 'class' ? 'class' : 'media',
            theme: existing ? { ...existing.theme, ...theme } : theme,
            utilities,
            variants,
            css: hybrid ? '' : css.trim(),
        })],
    })
}

if (typeof document !== 'undefined') void start()

export { tailwindV4Dialect }
export default presenceStyle
