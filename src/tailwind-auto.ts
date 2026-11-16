/**
 * Bản CDN thay `@tailwindcss/browser`: viết class Tailwind v4 trong HTML, CSS sinh lúc chạy.
 *
 *   <script type="module" src="https://unpkg.com/@porbit/style/dist/tailwind-auto.mjs"></script>
 *
 * Tuỳ chọn qua thuộc tính của thẻ script: `data-preflight="false"`, `data-dark="class"`,
 * `data-hybrid` (trang đã có CSS tĩnh: chỉ sinh CSS cho class mới xuất hiện lúc chạy).
 *
 * Chỉ dành cho class Tailwind. Để gọn (52,1 -> 40,9 KB gzip), bản build ESM này tắt hai phần của lõi
 * (cờ `__XCSS_DICTIONARY__`/`__XCSS_CACHE__` trong tsup.config.ts, xem đầu src/core.ts):
 *   - Từ điển x-css: class viết tắt x-css (`dF`, `p16`, `cRed`...) KHÔNG sinh CSS trên trang này; engine chạy
 *     như `dictionaryImport: false` (CSS của class Tailwind không đổi). Cần x-css thì dùng `index-auto.mjs`.
 *   - Cache localStorage, đồng bộ khoá giữa tab, nạp CSS từ cache lúc khởi tạo (`cache.loadOnInit` không có tác dụng).
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
// Chế độ lai cũng ở file riêng (`./tailwind-hybrid.mjs`, từ src/hybrid.ts): chỉ trang có `data-hybrid` tải.
type HybridModule = typeof import('./hybrid')
const loadHybrid = (): Promise<HybridModule | null> =>
    import(/* @vite-ignore */ new URL('./tailwind-hybrid.mjs', import.meta.url).href).catch(() => null)

const start = async () => {
    // `<style type="text/tailwindcss">@theme { --color-brand: ... }</style>` như @tailwindcss/browser.
    const sources = [...document.querySelectorAll('style[type="text/tailwindcss"]')].map((style) => style.textContent || '')
    const needsPlugins = sources.some((text) => /@(import|plugin)\s+["'](?!tailwindcss)/.test(text))
    const plugins = needsPlugins ? await loadPlugins() : null
    const theme: Record<string, string> = {}
    const utilities: Record<string, string> = {}
    const variants: Record<string, string> = {}
    // `@import "tailwindcss" prefix(tw) important`: lấy giá trị cuối cùng có khai báo trong các thẻ <style>.
    let prefix: string | undefined
    let important: boolean | string | undefined
    const blocklist: string[] = []
    let css = ''
    for (const text of sources) {
        const parsed = parseTailwindStylesheet(text, { resolve: plugins?.resolveTailwindPlugin })
        Object.assign(theme, parsed.theme)
        Object.assign(utilities, parsed.utilities)
        Object.assign(variants, parsed.variants)
        if (parsed.prefix !== undefined) prefix = parsed.prefix
        if (parsed.important !== undefined) important = parsed.important
        if (parsed.blocklist) blocklist.push(...parsed.blocklist)
        css += parsed.css + '\n'
        parsed.unresolved.forEach((id) => console.warn(`[presence-style] Không tìm thấy "${id}" (plugin chưa đóng gói sẵn).`))
    }
    const hybrid = attr('data-hybrid') !== null
    const hybridModule = hybrid ? await loadHybrid() : null
    const existing = hybridModule ? hybridModule.readStaticCss() : null
    const dialect = tailwindV4Dialect({
        // Lai: CSS tĩnh đã có preflight và CSS nền của dự án.
        preflight: !hybrid && attr('data-preflight') !== 'false',
        darkMode: attr('data-dark') === 'class' ? 'class' : 'media',
        theme: existing ? { ...existing.theme, ...theme } : theme,
        utilities,
        variants,
        prefix,
        important,
        blocklist,
        css: hybrid ? '' : css.trim(),
    })
    presenceStyle.cssObserve(document, {
        hashClassName: false,
        // Bản build này không có từ điển x-css (xem đầu file).
        dictionaryImport: false,
        // Lai: rule sinh lúc chạy chèn vào khối @layer của CSS tĩnh, đúng thứ tự Tailwind (staticLayerBlock).
        preload: existing && hybridModule ? { classes: existing.classes, staticBlock: hybridModule.staticLayerBlock(dialect.compare!) } : undefined,
        dialects: [dialect],
    })
}

if (typeof document !== 'undefined') void start()

export { tailwindV4Dialect }
export default presenceStyle
