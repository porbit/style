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

if (typeof document !== 'undefined') {
    // `<style type="text/tailwindcss">@theme { --color-brand: ... }</style>` như @tailwindcss/browser.
    const theme: Record<string, string> = {}
    const utilities: Record<string, string> = {}
    let css = ''
    document.querySelectorAll('style[type="text/tailwindcss"]').forEach((style) => {
        const parsed = parseTailwindStylesheet(style.textContent || '')
        Object.assign(theme, parsed.theme)
        Object.assign(utilities, parsed.utilities)
        css += parsed.css + '\n'
    })
    presenceStyle.cssObserve(document, {
        hashClassName: false,
        dialects: [tailwindV4Dialect({
            preflight: attr('data-preflight') !== 'false',
            darkMode: attr('data-dark') === 'class' ? 'class' : 'media',
            theme,
            utilities,
            css: css.trim(),
        })],
    })
}

export { tailwindV4Dialect }
export default presenceStyle
