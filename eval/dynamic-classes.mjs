#!/usr/bin/env node
/**
 * Class động trong chế độ build: class không có trong mã nguồn (ghép chuỗi `bg-${color}-500`, nội dung CMS,
 * HTML do AI sinh lúc chạy).
 *
 *   npm run build && node eval/dynamic-classes.mjs
 *
 * Trang có CSS tĩnh build từ mã nguồn (fixture shadcn/ui); sau khi tải, chèn phần tử với class mới.
 *   - Chuẩn: CSS Tailwind build đủ mọi class.
 *   - Tailwind build: chỉ CSS tĩnh (class mới không có CSS nếu không safelist).
 *   - @tailwindcss/browser: runtime của Tailwind (75 KB gzip, "không dùng cho production").
 *   - @porbit/style: CSS tĩnh + `tailwind-auto.mjs data-hybrid` (chỉ sinh CSS cho class mới).
 * Đo số phần tử hiển thị đúng và thời gian từ lúc chèn tới khi có style. Kết quả: eval/dynamic-classes.json.
 */
import { __unstable__loadDesignSystem, compile } from 'tailwindcss'
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const loadStylesheet = async (id, base) => ({ base, path: id, content: fs.readFileSync(path.join(twDir, id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')), 'utf8') })
const { extractCandidates } = await import(path.join(root, 'dist/index.mjs'))
const { compileTailwindCss } = await import(path.join(root, 'dist/postcss.mjs'))
const ENTRY = '@import "tailwindcss";'
const ds = await __unstable__loadDesignSystem(ENTRY, { base: twDir, loadStylesheet })

// Class trong mã nguồn (CSS tĩnh build từ đây).
const fixture = path.join(root, 'eval/fixtures/shadcn-v4/ui')
const sourceClasses = new Set()
for (const file of fs.readdirSync(fixture)) for (const c of extractCandidates(fs.readFileSync(path.join(fixture, file), 'utf8'))) sourceClasses.add(c)

// Class động: ghép màu/sắc độ, giá trị tuỳ ý, biến thể — không có trong mã nguồn.
let seed = 5
const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = (list) => list[Math.floor(random() * list.length)]
const COLORS = ['red', 'orange', 'amber', 'lime', 'emerald', 'teal', 'cyan', 'sky', 'indigo', 'violet', 'fuchsia', 'rose', 'slate', 'stone']
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
const makers = [
    () => `bg-${pick(COLORS)}-${pick(SHADES)}`,
    () => `text-${pick(COLORS)}-${pick(SHADES)}`,
    () => `border-${pick(COLORS)}-${pick(SHADES)}/${pick(['30', '50', '70'])}`,
    () => `w-[${Math.floor(random() * 400) + 10}px]`,
    () => `mt-[${Math.floor(random() * 90) + 1}px]`,
    () => `grid-cols-${Math.floor(random() * 11) + 2}`,
    () => `md:p-${pick(['7', '9', '11', '13', '15'])}`,
    () => `rounded-[${Math.floor(random() * 30)}px]`,
    () => `shadow-${pick(COLORS)}-${pick(SHADES)}`,
    () => `tracking-[${(random() * 0.3).toFixed(2)}em]`,
    () => `hover:bg-${pick(COLORS)}-${pick(SHADES)}`,
    () => `leading-[${(1 + random()).toFixed(2)}]`,
]
const dynamic = []
while (dynamic.length < 300) {
    const list = [makers[dynamic.length % makers.length](), pick(makers)(), 'p-4', 'flex']
    const cls = [...new Set(list)].filter((c) => ds.candidatesToCss([c])[0]).join(' ')
    if (cls.split(' ').some((c) => !sourceClasses.has(c))) dynamic.push(cls)
}
const dynamicClasses = new Set(dynamic.flatMap((s) => s.split(' ')))
const newOnes = [...dynamicClasses].filter((c) => !sourceClasses.has(c))

const twCompile = async (classes) => (await compile(ENTRY, { base: twDir, loadStylesheet })).build([...classes])
const referenceCss = await twCompile([...sourceClasses, ...dynamicClasses])
const twStaticCss = await twCompile(sourceClasses)
// CSS tĩnh của @porbit/style: plugin PostCSS trên cùng mã nguồn.
const oursStatic = (await compileTailwindCss(ENTRY, { base: fixture })).css
const twBrowser = fs.readFileSync(path.join(root, 'node_modules/@tailwindcss/browser/dist/index.global.js'), 'utf8')
const auto = fs.readFileSync(path.join(root, 'dist/tailwind-auto.mjs'), 'utf8')
const gz = (text) => (zlib.gzipSync(Buffer.from(text)).length / 1024).toFixed(1)

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
const html = dynamic.map((cls, i) => `<div data-k="${i}" class="${cls}"><i>x</i></div>`).join('')
const run = async (head) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.route('http://dyn.local/**', (route) => {
        const url = new URL(route.request().url())
        if (url.pathname === '/tailwind-auto.mjs') return route.fulfill({ contentType: 'text/javascript', body: auto })
        return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>${head}</head><body><div id="app"></div></body></html>` })
    })
    await page.goto('http://dyn.local/')
    await page.waitForTimeout(300)
    // Chèn nội dung "lúc chạy" và chờ tới khi phần tử đầu có style (tối đa 2 s).
    const elapsed = await page.evaluate(async (markup) => {
        const t0 = performance.now()
        document.getElementById('app').innerHTML = markup
        const probe = document.querySelector('[data-k]')
        const before = getComputedStyle(document.body).padding
        for (let i = 0; i < 120; i++) {
            if (getComputedStyle(probe).paddingTop === '16px') return performance.now() - t0
            await new Promise((r) => requestAnimationFrame(r))
        }
        return before === null ? -1 : -1
    }, html)
    await page.waitForTimeout(200)
    const sigs = await page.evaluate(() => {
        const props = [...getComputedStyle(document.body)].filter((p) => !p.startsWith('--')).sort()
        const sig = (el) => { const cs = getComputedStyle(el); return props.map((p) => p + ':' + cs.getPropertyValue(p)).join(';') }
        return [...document.querySelectorAll('[data-k]')].map((el) => sig(el) + '|' + sig(el.firstElementChild))
    })
    await page.close()
    return { elapsed, sigs }
}

const reference = await run(`<style>${referenceCss}</style>`)
const variants = {
    'Tailwind build (CSS tĩnh)': { head: `<style>${twStaticCss}</style>`, js: '0' },
    '@tailwindcss/browser': { head: `<script>${twBrowser}</script>`, js: gz(twBrowser) },
    '@porbit/style: CSS tĩnh + tailwind-auto data-hybrid': { head: `<style>${oursStatic}</style><script type="module" src="/tailwind-auto.mjs" data-hybrid></script>`, js: gz(auto) },
}
const report = { elements: dynamic.length, newClasses: newOnes.length, variants: {} }
console.log(`${dynamic.length} phần tử chèn lúc chạy, ${newOnes.length} class không có trong mã nguồn`)
for (const [name, { head, js }] of Object.entries(variants)) {
    const { elapsed, sigs } = await run(head)
    const correct = sigs.filter((s, i) => s === reference.sigs[i]).length
    report.variants[name] = { correct, total: dynamic.length, msToStyle: Number(elapsed.toFixed(1)), jsKbGzip: Number(js) }
    console.log(`  ${name}: ${correct}/${dynamic.length} hiển thị đúng · có style sau ${elapsed < 0 ? 'không bao giờ' : elapsed.toFixed(1) + ' ms'} · JS ${js} KB gzip`)
}
await browser.close()
fs.writeFileSync(path.join(root, 'eval/dynamic-classes.json'), JSON.stringify(report, null, 2) + '\n')
