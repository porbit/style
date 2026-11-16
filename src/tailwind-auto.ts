/**
 * Bản CDN thay `@tailwindcss/browser`: viết class Tailwind v4 trong HTML, CSS sinh lúc chạy.
 *
 *   <script type="module" src="https://unpkg.com/@porbit/style/dist/tailwind-auto.mjs"></script>
 *
 * Tuỳ chọn qua thuộc tính của thẻ script: `data-preflight="false"`, `data-dark="class"`.
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
    presenceStyle.cssObserve(document, {
        hashClassName: false,
        dialects: [tailwindV4Dialect({
            preflight: attr('data-preflight') !== 'false',
            darkMode: attr('data-dark') === 'class' ? 'class' : 'media',
            theme,
            utilities,
            variants,
            css: css.trim(),
        })],
    })
}

if (typeof document !== 'undefined') void start()

export { tailwindV4Dialect }
export default presenceStyle
