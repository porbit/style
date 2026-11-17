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
 * Phần đọc `<style type="text/tailwindcss">` nạp động từ `tailwind-stylesheet.mjs` chỉ khi trang có thẻ đó
 * (45,0 -> 40,0 KB cho trang chỉ dùng class). `tailwindV4Dialect` export từ file này chỉ dịch `utilities`/
 * `variants`/`css` sau khi phần đó đã nạp; cần dùng trực tiếp thì import từ `@porbit/style/tailwind-v4`.
 */
// Dữ liệu Tailwind (tailwind-generated) được nạp qua tailwind-v4-core và nằm đầu file build, nên gzip đã gặp
// chuỗi giống nhau sớm (nhỏ hơn ~0,9 KB). Không import trần ở đây: `sideEffects` của package.json khiến esbuild bỏ qua.
import { TAILWIND_DEFAULT_THEME, tailwindV4Dialect, useTailwindStylesheet } from './tailwind-v4-core'
import presenceStyle, { type XCSSPreloadManifest } from './core'

// `document.currentScript` luôn là null với <script type="module">: tìm thẻ theo đường dẫn.
const script = typeof document !== 'undefined'
    ? ((document.currentScript as HTMLScriptElement | null) ??
        [...document.querySelectorAll<HTMLScriptElement>('script[src]')].find((el) => /tailwind-auto/.test(el.src)) ??
        null)
    : null
const attr = (name: string) => script?.getAttribute(name) ?? null

// Phần đọc `<style type="text/tailwindcss">` (`@theme`, `@utility`, `@custom-variant`, `@apply`, src/tailwind-stylesheet.ts)
// nằm ở file riêng `./tailwind-stylesheet.mjs`: trang chỉ dùng class không tải phần này.
type StylesheetModule = typeof import('./tailwind-stylesheet')
const loadStylesheet = (): Promise<StylesheetModule | null> =>
    import(/* @vite-ignore */ new URL('./tailwind-stylesheet.mjs', import.meta.url).href).catch(() => null)
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
    const hybrid = attr('data-hybrid') !== null
    // Tải song song phần đọc stylesheet, plugin và chế độ lai.
    const [stylesheet, plugins, hybridModule] = await Promise.all([
        sources.length ? loadStylesheet() : null,
        needsPlugins ? loadPlugins() : null,
        hybrid ? loadHybrid() : null,
    ])
    if (stylesheet) useTailwindStylesheet(stylesheet)
    else if (sources.length) console.warn('[presence-style] Không tải được tailwind-stylesheet.mjs: bỏ qua <style type="text/tailwindcss">.')
    // Các thẻ <style> gộp theo thứ tự (`prefix`/`important` lấy giá trị khai báo cuối cùng).
    const sheet = stylesheet?.parseTailwindStylesheets(sources, { resolve: plugins?.resolveTailwindPlugin }, TAILWIND_DEFAULT_THEME)
    sheet?.unresolved.forEach((id) => console.warn(`[presence-style] Không tìm thấy "${id}" (plugin chưa đóng gói sẵn).`))
    const existing = hybridModule ? hybridModule.readStaticCss() : null
    const dialect = tailwindV4Dialect({
        // Lai: CSS tĩnh đã có preflight và CSS nền của dự án.
        preflight: !hybrid && attr('data-preflight') !== 'false',
        darkMode: attr('data-dark') === 'class' ? 'class' : 'media',
        theme: existing ? { ...existing.theme, ...sheet?.theme } : sheet?.theme,
        utilities: sheet?.utilities,
        variants: sheet?.variants,
        prefix: sheet?.prefix,
        important: sheet?.important,
        blocklist: sheet?.blocklist,
        css: hybrid ? '' : sheet?.css,
    })
    // Lai: rule sinh lúc chạy chèn vào khối @layer của CSS tĩnh, đúng thứ tự Tailwind (staticLayerBlock); CSS tĩnh bị
    // thay sau khi tải (HMR) thì chèn lại vào sheet mới (watchStaticCss).
    const preload = existing && hybridModule ? { classes: existing.classes, staticBlock: hybridModule.staticLayerBlock(dialect.compare!) } as XCSSPreloadManifest : undefined
    if (preload && hybridModule) hybridModule.watchStaticCss(preload)
    presenceStyle.cssObserve(document, {
        hashClassName: false,
        // Bản build này không có từ điển x-css (xem đầu file).
        dictionaryImport: false,
        preload,
        dialects: [dialect],
    })
}

if (typeof document !== 'undefined') void start()

export { tailwindV4Dialect }
export default presenceStyle
