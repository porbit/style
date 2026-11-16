#!/usr/bin/env node
/**
 * Khớp plugin đóng gói sẵn (`@porbit/style/tailwind-plugins`) với Tailwind thật + plugin gốc.
 *
 *   npm run build && node eval/tailwind-plugins.mjs
 *
 * Với mỗi plugin: mọi class mới của plugin (và biến thể `prose-*:` của typography) được đặt trên một
 * cây HTML mẫu; so computed style của mọi phần tử con giữa CSS Tailwind và CSS @porbit/style.
 * Kết quả: eval/tailwind-plugins.json.
 */
import { __unstable__loadDesignSystem, compile } from 'tailwindcss'
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const loadStylesheet = async (id, base) => {
    if (id === 'tw-animate-css') return { base, path: id, content: fs.readFileSync(path.join(root, 'node_modules/tw-animate-css/dist/tw-animate.css'), 'utf8') }
    const file = id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')
    return { base, path: file, content: fs.readFileSync(path.join(twDir, file), 'utf8') }
}
const loadModule = async (id, base) => ({ base, path: id, module: require(id) })

const { extractFromClasses } = await import(path.join(root, 'dist/index.mjs'))
const tw = await import(path.join(root, 'dist/tailwind.mjs'))
const { resolveTailwindPlugin } = await import(path.join(root, 'dist/tailwind-plugins.mjs'))

const PROSE_TREE = '<h1>T</h1><h2>S</h2><p class="lead">L</p><p>a <a href="#">b</a> <strong>c</strong> <code>d</code> <kbd>k</kbd></p><blockquote><p>q</p></blockquote><ul><li>x</li><li>y</li></ul><ol><li>z</li></ol><pre><code>p</code></pre><table><thead><tr><th>h</th></tr></thead><tbody><tr><td>v</td></tr></tbody></table><hr><figure><img alt=""><figcaption>f</figcaption></figure>'
const FORM_TREE = '<input type="text"><input type="email"><input type="checkbox" checked><input type="radio"><select><option>a</option></select><select multiple><option>a</option></select><textarea></textarea><input type="file">'
const PLUGINS = [
    {
        id: 'tw-animate-css',
        source: '@import "tailwindcss";\n@import "tw-animate-css";',
        extra: ['fade-in-50', 'zoom-in-95', 'slide-in-from-top-2', 'slide-in-from-left-1/2', 'spin-in-45', 'blur-in-sm', 'duration-300', 'delay-150', 'fade-out-[0.3]', 'slide-out-to-end-4', 'repeat-infinite', 'direction-reverse', 'fill-mode-forwards', 'md:fade-in-25', 'hover:zoom-out-90'],
        tree: '<span>a</span>',
        // Animation chạy: bỏ thuộc tính bị animation thay đổi theo thời gian.
        skip: /^(transform|rotate|scale|translate|opacity|filter|height)$/,
    },
    { id: '@tailwindcss/forms', source: '@import "tailwindcss";\n@plugin "@tailwindcss/forms";', extra: [], tree: FORM_TREE, plain: FORM_TREE },
    {
        id: '@tailwindcss/typography',
        source: '@import "tailwindcss";\n@plugin "@tailwindcss/typography";',
        extra: ['prose prose-headings:underline', 'prose prose-a:text-blue-600', 'prose dark:prose-invert', 'prose md:prose-lg', 'prose prose-p:my-2 prose-code:text-red-500', 'prose prose-img:rounded-xl'],
        tree: PROSE_TREE,
    },
]

const launch = async () => {
    for (const executablePath of [process.env.CHROMIUM_PATH, undefined, '/opt/pw-browsers/chromium']) {
        try {
            return await chromium.launch(executablePath ? { executablePath } : {})
        } catch (error) {
            if (executablePath === '/opt/pw-browsers/chromium') throw error
        }
    }
}
const browser = await launch()
const signatures = async (css, html, skip) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`)
    const result = await page.evaluate((skipSource) => {
        const skip = skipSource ? new RegExp(skipSource) : null
        const props = [...getComputedStyle(document.body)].filter((p) => !p.startsWith('--') || p.startsWith('--tw-')).sort()
        const sig = (el) => {
            const cs = getComputedStyle(el)
            return props.filter((p) => !(skip && skip.test(p))).map((p) => p + ':' + cs.getPropertyValue(p)).join(';')
        }
        return [...document.querySelectorAll('[data-k]')].map((el) => [el, ...el.querySelectorAll('*')].map(sig).join('|'))
    }, skip?.source)
    await page.close()
    return result
}
const diff = (a, b) => {
    const map = (s) => new Map(s.split(';').filter(Boolean).map((x) => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1)]))
    const out = []
    a.split('|').forEach((part, i) => {
        const ma = map(part)
        const mb = map(b.split('|')[i] || '')
        for (const [k, v] of ma) if (mb.get(k) !== v && !(k.startsWith('--tw-') && mb.get(k) === undefined)) out.push(`#${i} ${k}: tw=${v} | ours=${mb.get(k)}`)
    })
    return out
}

const report = {}
for (const plugin of PLUGINS) {
    const base = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: root, loadStylesheet, loadModule })
    const known = new Set(base.getClassList().map(([n]) => n))
    const ds = await __unstable__loadDesignSystem(plugin.source, { base: root, loadStylesheet, loadModule })
    const own = ds.getClassList().map(([n]) => n).filter((n) => !known.has(n))
    const cases = [...own, ...plugin.extra]
    const classes = [...new Set(cases.flatMap((c) => c.split(' ')))]
    // `m-1` để Tailwind phát `--spacing` như trong dự án thật (plugin đọc `var(--spacing)`).
    const twCss = (await compile(plugin.source, { base: root, loadStylesheet, loadModule })).build([...classes, 'm-1'])

    const sheet = tw.parseTailwindStylesheet(plugin.source, { resolve: resolveTailwindPlugin })
    const dialect = tw.tailwindV4Dialect({ preflight: true, darkMode: 'media', theme: sheet.theme, css: sheet.css, utilities: sheet.utilities, variants: sheet.variants })
    const unsupported = classes.filter((c) => !dialect(c))
    const ours = (await extractFromClasses(classes, { hashClassName: false, silent: true, minify: true, dialects: [dialect] })).css

    const html = cases.map((c) => `<div data-k class="${c}">${plugin.tree}</div>`).join('') + (plugin.plain ? `<div data-k>${plugin.plain}</div>` : '')
    const [a, b] = await Promise.all([signatures(twCss, html, plugin.skip), signatures(ours, html, plugin.skip)])
    const failed = [...cases, ...(plugin.plain ? ['(không class: base)'] : [])].map((c, i) => [c, diff(a[i], b[i])]).filter(([, d]) => d.length)
    const total = cases.length + (plugin.plain ? 1 : 0)
    report[plugin.id] = { cases: total, matched: total - failed.length, unsupported, failed: failed.slice(0, 15).map(([c, d]) => ({ class: c, diff: d.slice(0, 3) })) }
    console.log(`${plugin.id}: ${total - failed.length}/${total} khớp${unsupported.length ? `, chưa chuyển: ${unsupported.join(' ')}` : ''}`)
    for (const [c, d] of failed.slice(0, 8)) console.log(`  ✗ ${c}: ${d.slice(0, 2).join(' ; ').slice(0, 300)}`)
}
await browser.close()
fs.writeFileSync(path.join(root, 'eval/tailwind-plugins.json'), JSON.stringify(report, null, 2) + '\n')
