#!/usr/bin/env node
/**
 * Đo độ khớp với Tailwind THẬT trên Chromium.
 *
 * Phần A (class gốc): mọi class trong danh sách của Tailwind (getClassList). Mỗi class được render
 * hai lần — với CSS do Tailwind sinh và với CSS do @porbit/style (phương ngữ v4) sinh — rồi so
 * TOÀN BỘ computed style của phần tử và hai phần tử con.
 * Phần B (biến thể): tổ hợp biến thể (responsive, dark, hover/focus ép bằng DevTools, group, peer,
 * before/after, aria, data, *, độ mờ /50, !important, giá trị tuỳ ý) trên một tập class mẫu.
 *
 *   npm run build && node eval/tailwind-parity.mjs [--limit=N]
 * Kết quả: eval/TAILWIND-PARITY.md và eval/tailwind-parity.json
 */
import { __unstable__loadDesignSystem, compile } from 'tailwindcss'
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const twVersion = JSON.parse(fs.readFileSync(path.join(twDir, 'package.json'), 'utf8')).version
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.slice(8)) : Infinity

const loadStylesheet = async (id, base) => {
    const file = id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')
    return { base, path: file, content: fs.readFileSync(path.join(twDir, file), 'utf8') }
}
const ds = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: twDir, loadStylesheet })
const twCompile = async (classes, extra = '') => {
    const compiler = await compile('@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n' + extra, { base: twDir, loadStylesheet })
    return compiler.build(classes)
}

const { extractFromClasses } = await import(path.join(root, 'dist/index.mjs'))
const { tailwindV4Dialect } = await import(path.join(root, 'dist/tailwind.mjs'))
const oursCss = async (classes, options = {}) =>
    (await extractFromClasses(classes, { hashClassName: false, silent: true, minify: true, dialects: [tailwindV4Dialect(options)] })).css

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

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// So theo property có ở phía Tailwind (mọi property chuẩn + biến --tw-* Tailwind đăng ký cho nhóm
// class đang đo). Biến --tw-* chỉ có ở phía @porbit/style (đăng ký sẵn cả 127 biến) không ảnh hưởng.
// Chữ ký computed style của mỗi phần tử kiểm tra + hai phần tử con (+ ::before/::after nếu cần).
const SIGNATURE = (opts) => {
    // Biến theme (`--color-*`, `--spacing`...) Tailwind khai báo trên :root, còn @porbit/style nhúng
    // giá trị dự phòng trong var(): bỏ qua chúng, nhưng vẫn so `--tw-*` (biến utility đặt trên phần tử).
    const props = [...getComputedStyle(document.body)].filter((p) => !p.startsWith('--') || p.startsWith('--tw-')).sort()
    const sig = (el, pseudo) => {
        const cs = getComputedStyle(el, pseudo)
        let out = ''
        for (const p of props) {
            if (opts.skipAnimated && /^(transform|rotate|scale|translate|opacity)$/.test(p) && el.dataset.anim) continue
            out += p + ':' + cs.getPropertyValue(p) + ';'
        }
        return out
    }
    return [...document.querySelectorAll('[data-k]')].map((el) => {
        const parts = [sig(el), ...[...el.children].map((c) => sig(c))]
        if (opts.pseudo) parts.push(sig(el, '::before'), sig(el, '::after'))
        return parts.join('|')
    })
}

const renderSignatures = async (css, html, setup = {}) => {
    const page = await browser.newPage({ viewport: setup.viewport || { width: 1024, height: 800 } })
    if (setup.colorScheme || setup.media) await page.emulateMedia({ colorScheme: setup.colorScheme, media: setup.media })
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`)
    if (setup.force) {
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('DOM.enable')
        await cdp.send('CSS.enable')
        const { root: doc } = await cdp.send('DOM.getDocument', { depth: -1 })
        for (const [selector, states] of setup.force) {
            const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: doc.nodeId, selector })
            for (const nodeId of nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states })
        }
    }
    const signatures = await page.evaluate(SIGNATURE, { skipAnimated: true, pseudo: !!setup.pseudo })
    await page.close()
    return signatures
}

// Đường runtime trong trình duyệt: tailwind-auto.mjs (CSS.supports, MutationObserver, adoptedStyleSheets).
const autoCode = fs.readFileSync(path.join(root, 'dist/tailwind-auto.mjs'), 'utf8')
const renderRuntime = async (html, setup = {}, headExtra = '') => {
    const page = await browser.newPage({ viewport: setup.viewport || { width: 1024, height: 800 } })
    await page.route('http://parity.local/**', (route) => {
        const url = new URL(route.request().url())
        if (url.pathname === '/tailwind-auto.mjs') return route.fulfill({ contentType: 'text/javascript', body: autoCode })
        // File tailwind-auto nạp động (`tailwind-stylesheet.mjs` khi có <style type="text/tailwindcss">, plugin, lai).
        if (/^\/tailwind-[\w-]+\.mjs$/.test(url.pathname)) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'dist', url.pathname.slice(1)), 'utf8') })
        route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>${headExtra}<script type="module" src="/tailwind-auto.mjs" data-preflight="false"></script></head><body>${html}<div id="sentinel" class="mt-[7px]"></div></body></html>` })
    })
    await page.goto('http://parity.local/')
    await page.waitForFunction(() => getComputedStyle(document.getElementById('sentinel')).marginTop === '7px')
    await page.evaluate(() => document.getElementById('sentinel').remove())
    if (setup.force) {
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('DOM.enable')
        await cdp.send('CSS.enable')
        const { root: doc } = await cdp.send('DOM.getDocument', { depth: -1 })
        for (const [selector, states] of setup.force) {
            const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: doc.nodeId, selector })
            for (const nodeId of nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states })
        }
    }
    const signatures = await page.evaluate(SIGNATURE, { skipAnimated: true, pseudo: !!setup.pseudo })
    await page.close()
    return signatures
}

// Biến `--tw-*` Tailwind đăng ký nhưng không rule nào đọc (vd `--tw-shadow-alpha`) có thể bị bỏ khi
// minify: chỉ tính lệch nếu CSS của @porbit/style có đọc biến đó (`var(--tw-x`).
const diffProps = (a, b, oursCss = '') => {
    const map = (s) => new Map(s.split(';').filter(Boolean).map((x) => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1)]))
    const pa = a.split('|')
    const pb = b.split('|')
    const out = []
    pa.forEach((part, i) => {
        const ma = map(part)
        const mb = map(pb[i] || '')
        for (const [k, v] of ma) {
            if (mb.get(k) === v) continue
            if (k.startsWith('--tw-') && mb.get(k) === undefined && oursCss && !new RegExp(`var\\(${k}(?![\\w-])`).test(oursCss)) continue
            out.push(`${i ? `con${i}.` : ''}${k}: tw=${v} | ours=${mb.get(k)}`)
        }
    })
    return out
}

// ---------------------------------------------------------------------------
// Phần A
// ---------------------------------------------------------------------------
const classList = ds.getClassList().map(([n]) => n).slice(0, limit)
const CHUNK = 2500
const failuresA = []
let checkedA = 0
const startedA = Date.now()
for (let offset = 0; offset < classList.length; offset += CHUNK) {
    const chunk = classList.slice(offset, offset + CHUNK)
    const html = chunk.map((c) => `<div data-k class="${escapeHtml(c)}"${c.startsWith('animate-') ? ' data-anim="1"' : ''}><i>a</i><i>b</i></div>`).join('')
    const cssA = await oursCss(chunk)
    const [tw, ours] = await Promise.all([renderSignatures(await twCompile(chunk), html), renderSignatures(cssA, html)])
    chunk.forEach((c, i) => {
        checkedA++
        const diff = tw[i] === ours[i] ? [] : diffProps(tw[i], ours[i], cssA)
        if (diff.length) failuresA.push({ class: c, diff: diff.slice(0, 4) })
    })
    process.stdout.write(`\rPhần A: ${checkedA}/${classList.length}, lệch ${failuresA.length}`)
}
console.log(` (${((Date.now() - startedA) / 1000).toFixed(0)} s)`)

// ---------------------------------------------------------------------------
// Phần C: đường runtime trong trình duyệt, mẫu 1/7 danh sách class
// ---------------------------------------------------------------------------
const sampleC = classList.filter((_, i) => i % 7 === 0)
const failuresC = []
for (let offset = 0; offset < sampleC.length; offset += CHUNK) {
    const chunk = sampleC.slice(offset, offset + CHUNK)
    const html = chunk.map((c) => `<div data-k class="${escapeHtml(c)}"${c.startsWith('animate-') ? ' data-anim="1"' : ''}><i>a</i><i>b</i></div>`).join('')
    const [tw, ours] = await Promise.all([renderSignatures(await twCompile(chunk), html), renderRuntime(html)])
    chunk.forEach((c, i) => {
        const diff = tw[i] === ours[i] ? [] : diffProps(tw[i], ours[i])
        if (diff.length) failuresC.push({ class: c, diff: diff.slice(0, 4) })
    })
}
console.log(`Phần C (runtime trình duyệt): ${sampleC.length - failuresC.length}/${sampleC.length}`)

// ---------------------------------------------------------------------------
// Phần D: theme tuỳ chỉnh, @utility, @apply qua `@theme` (Tailwind) / `<style type="text/tailwindcss">` (@porbit/style)
// ---------------------------------------------------------------------------
const THEME_BLOCK = `@theme {
  --color-brand: #0a64e8;
  --color-brand-soft: oklch(95% 0.03 250);
  --radius-blob: 2rem;
  --breakpoint-3xl: 112rem;
  --font-display: "Inter Display", "Segoe UI", sans-serif;
  --text-huge: 3.5rem;
  --text-huge--line-height: 1.05;
  --shadow-soft: 0 2px 8px rgb(0 0 0 / 0.2);
  --inset-shadow-soft: inset 0 1px 3px rgb(0 0 0 / 0.3);
  --drop-shadow-soft: 0 3px 6px rgb(0 0 0 / 0.25);
  --drop-shadow-double: 0 1px 1px rgb(0 0 0 / 0.1), 0 4px 8px rgb(10 100 232 / 0.3);
  --text-shadow-soft: 0 1px 2px rgb(0 0 0 / 0.3);
  --animate-wiggle: wiggle 1s ease-in-out infinite;
  --container-8xl: 96rem;
  --aspect-wide: 3 / 1;
  --z-index-modal: 50;
  --opacity-faint: 15%;
  --width-sidebar: 17rem;
  --margin-gutter: 13px;
  --padding-card: 11px;
  --inset-edge: 7px;
  --rotate-tilt: 7deg;
  --scale-big: 130%;
  --cursor-hand: pointer;
  --grid-template-columns-app: 200px 1fr;
  --border-width-thick: 5px;
  --background-color-paper: #f5f0e1;
  --ring-width-thick: 6px;
  --transition-duration-slow: 700ms;
  --line-clamp-short: 2;
  --columns-news: 3;
  --order-hero: 7;
  --gap-gutter: 9px;
  @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
}`
const CUSTOM_CSS = `@utility tab-4 { tab-size: 4; }
@utility content-auto { content-visibility: auto; contain-intrinsic-size: auto 500px; }
.btn { @apply inline-flex items-center px-4 py-2 rounded-lg bg-brand text-white font-semibold shadow-soft; }
.card { @apply p-6 rounded-blob border border-slate-200; margin-top: 3px; }`
const themeClasses = ['btn', 'card', 'tab-4', 'content-auto', 'hover:tab-4', 'md:content-auto', 'bg-brand', 'text-brand', 'border-brand/50', 'bg-brand-soft', 'ring-brand', 'rounded-blob', 'rounded-t-blob', 'font-display', 'text-huge', 'shadow-soft', 'inset-shadow-soft', 'drop-shadow-soft', 'drop-shadow-double', 'text-shadow-soft', 'animate-wiggle', '3xl:p-4', '3xl:bg-brand', 'max-3xl:p-2', 'max-w-8xl', 'fill-brand', 'decoration-brand', 'hover:bg-brand',
    // Khoá tự định nghĩa của namespace theme mặc định ít/không có khoá (`--aspect-*`, `--z-index-*`, `--width-*`...).
    'aspect-wide', 'z-modal', 'opacity-faint', 'w-sidebar', 'm-gutter', '-mt-gutter', 'p-card', 'top-edge', '-left-edge', 'rotate-tilt', 'scale-big', 'cursor-hand',
    'grid-cols-app', 'border-thick', 'bg-paper', 'ring-thick', 'duration-slow', 'line-clamp-short', 'columns-news', 'order-hero', 'gap-gutter', 'md:aspect-wide']
const themeHtml = themeClasses.map((c) => `<div data-k class="${escapeHtml(c)}"${c.startsWith('animate-') ? ' data-anim="1"' : ''}><i>a</i><i>b</i></div>`).join('')
const themeSetup = { viewport: { width: 1900, height: 800 }, force: [['[data-k]', ['hover']]] }
const [twTheme, oursTheme] = await Promise.all([
    renderSignatures(await twCompile(themeClasses, THEME_BLOCK + '\n' + CUSTOM_CSS), themeHtml, themeSetup),
    renderRuntime(themeHtml, themeSetup, `<style type="text/tailwindcss">@import "tailwindcss";\n${THEME_BLOCK}\n${CUSTOM_CSS}</style>`),
])
const failuresD = []
themeClasses.forEach((c, i) => {
    const diff = twTheme[i] === oursTheme[i] ? [] : diffProps(twTheme[i], oursTheme[i])
    if (diff.length) failuresD.push({ class: c, diff: diff.slice(0, 3) })
})
console.log(`Phần D (theme tuỳ chỉnh): ${themeClasses.length - failuresD.length}/${themeClasses.length}`)

// ---------------------------------------------------------------------------
// Phần B: biến thể
// ---------------------------------------------------------------------------
const SAMPLE = ['p-4', 'bg-red-500', 'text-sm', 'shadow-md', 'ring-2', 'flex', 'rounded-lg', 'border-2', 'opacity-50', 'translate-x-2', 'font-bold', 'underline']
const scenarios = [
    { name: 'sm/md/lg/xl/2xl ở 1300px', variants: ['sm', 'md', 'lg', 'xl', '2xl'], setup: { viewport: { width: 1300, height: 800 } } },
    { name: 'sm/md/lg ở 700px', variants: ['sm', 'md', 'lg'], setup: { viewport: { width: 700, height: 800 } } },
    { name: 'max-* ở 700px', variants: ['max-sm', 'max-md', 'max-lg', 'max-xl'], setup: { viewport: { width: 700, height: 800 } } },
    { name: 'khoảng md:max-lg ở 900px', variants: ['md:max-lg'], setup: { viewport: { width: 900, height: 800 } } },
    { name: 'dark (media)', variants: ['dark'], setup: { colorScheme: 'dark' } },
    { name: 'hover/focus/active (ép trạng thái)', variants: ['hover', 'focus', 'active', 'focus-visible'], setup: { force: [['[data-k]', ['hover', 'focus', 'active', 'focus-visible']]] } },
    { name: 'md:hover ở 1000px', variants: ['md:hover'], setup: { viewport: { width: 1000, height: 800 }, force: [['[data-k]', ['hover']]] } },
    { name: 'group-hover / peer-focus', variants: ['group-hover', 'peer-focus'], wrap: 'group', setup: { force: [['.group', ['hover']], ['.peer', ['focus']]] } },
    { name: 'aria-checked / data-[state=open]', variants: ['aria-checked', 'data-[state=open]'], attrs: 'aria-checked="true" data-state="open"' },
    { name: 'first/last/odd (con)', variants: ['*'], setup: {} },
    { name: 'before/after', variants: ['before', 'after'], setup: { pseudo: true } },
    { name: 'not-/nth-/odd/even giữa anh em', variants: ['not-first', 'nth-2', 'nth-last-1', 'not-[.x]', 'odd', 'even', 'nth-of-type-2'] },
    { name: 'has-checked / has-[input:checked]', variants: ['has-checked', 'has-[input:checked]'], inner: '<input type="checkbox" checked>' },
    { name: 'group-has-checked / peer-checked/name / group-hover/item', variants: ['group-has-checked', 'peer-checked/name', 'group-hover/item'], wrap: 'named', setup: { force: [['.group\\/item', ['hover']]] } },
    { name: 'rtl / ltr', variants: ['rtl', 'ltr'], attrs: 'dir="rtl"' },
    { name: 'container query @md/@lg/@2xl/@max-lg', variants: ['@md', '@lg', '@2xl', '@max-lg', '@min-sm'], wrap: 'container' },
    { name: 'container có tên @md/main', variants: ['@md/main', '@2xl/main'], wrap: 'named-container' },
    { name: 'supports-[display:grid] / not-supports', variants: ['supports-[display:grid]', 'not-supports-[display:grid]', 'supports-grid'] },
    { name: 'print', variants: ['print'], setup: { media: 'print' } },
    { name: 'not-dark ở chế độ sáng / not-md ở 700px', variants: ['not-dark', 'not-md'], setup: { viewport: { width: 700, height: 800 } } },
    { name: 'in-focus / in-[.x]', variants: ['in-focus', 'in-[.x]'], wrap: 'focus', setup: { force: [['.wrap', ['focus']]] } },
    { name: 'quan hệ lồng group-/peer-/in-/has-/not- (hover ép)', variants: ['group-group-hover', 'group-peer-hover', 'group-in-hover', 'peer-group-hover', 'peer-peer-hover', 'peer-in-hover', 'in-group-hover', 'in-peer-hover', 'in-in-hover', 'has-group-hover', 'has-peer-hover', 'has-in-hover', 'not-group-hover', 'not-peer-hover', 'not-in-hover', 'not-hover'], wrap: 'nested', setup: { force: [['[data-h]', ['hover']]] } },
    { name: 'not-@md / not-@max-md trong container', variants: ['not-@md', 'not-@max-md', 'not-@min-md', 'not-@2xl'], wrap: 'container' },
    { name: 'hai at-rule nội tuyến lồng nhau (container 600px, 1000px, hover ép)', variants: ['@[300px]:@max-[700px]', '@[300px]:@max-[500px]', 'md:@[300px]', 'lg:@[300px]', '@md:md', '@md:hover', 'supports-[display:grid]:@md', 'md:supports-[display:grid]', 'not-dark:@md', 'md:not-@2xl', '@2xl:md'], wrap: 'container', setup: { viewport: { width: 1000, height: 800 }, force: [['[data-k]', ['hover']]] } },
    { name: 'ba điều kiện md:dark:hover ở 1000px', variants: ['md:dark:hover', 'dark:md:hover', 'md:max-xl:hover'], setup: { viewport: { width: 1000, height: 800 }, colorScheme: 'dark', force: [['[data-k]', ['hover']]] } },
    { name: 'độ mờ /50 và !important', base: ['bg-red-500/50', 'text-blue-600/25', 'border-black/10', 'p-4!', '!m-2', 'text-sm/6'] },
    { name: 'giá trị tuỳ ý', base: ['p-[13px]', 'w-[calc(100%-2rem)]', 'bg-[#123456]', 'grid-cols-[1fr_2fr]', 'text-[22px]', 'm-[-5px]', '-m-[3px]', 'top-[10%]', 'shadow-[0_2px_4px_red]', 'bg-(--brand)', '[mask-type:luminance]', 'z-[60]', 'leading-[1.7]', 'tracking-[0.2em]'] },
]
const resultsB = []
for (const scenario of scenarios) {
    const classes = scenario.base || scenario.variants.flatMap((v) => SAMPLE.map((c) => `${v}:${c}`))
    const item = (c) => {
        const el = `<div data-k class="${escapeHtml(c)}" ${scenario.attrs || ''} style="--brand:#0a64e8"><i>a</i><i>b</i>${scenario.inner || ''}</div>`
        if (scenario.wrap === 'group') return `<div class="group"><input class="peer">${el}</div>`
        if (scenario.wrap === 'named') return `<div class="group group/item"><input type="checkbox" checked class="peer/name">${el.replace('<i>a</i>', '<i>a</i><input type="checkbox" checked>')}</div>`
        if (scenario.wrap === 'container') return `<div style="container-type:inline-size;width:600px">${el}</div>`
        if (scenario.wrap === 'named-container') return `<div style="container:main / inline-size;width:600px">${el}</div>`
        if (scenario.wrap === 'focus') return `<div class="wrap x" tabindex="0">${el}</div>`
        if (scenario.wrap === 'nested') {
            const inner = el.replace('<i>a</i>', '<b class="group peer" data-h><i>x</i></b><i>a</i>')
            return `<div class="group peer" data-h><span class="peer" data-h></span><div class="group peer" data-h><span class="peer" data-h></span>${inner}</div></div>`
        }
        return el
    }
    const html = classes.map(item).join('')
    const cssB = await oursCss(classes)
    const [tw, ours] = await Promise.all([
        renderSignatures(await twCompile(classes), html, scenario.setup || {}),
        renderSignatures(cssB, html, scenario.setup || {}),
    ])
    const failed = []
    classes.forEach((c, i) => {
        const diff = tw[i] === ours[i] ? [] : diffProps(tw[i], ours[i], cssB)
        if (diff.length) failed.push({ class: c, diff: diff.slice(0, 3) })
    })
    resultsB.push({ scenario: scenario.name, total: classes.length, failed })
    console.log(`Phần B: ${scenario.name}: ${classes.length - failed.length}/${classes.length}`)
}
await browser.close()

// ---------------------------------------------------------------------------
// Báo cáo
// ---------------------------------------------------------------------------
const passA = checkedA - failuresA.length
const totalB = resultsB.reduce((a, r) => a + r.total, 0)
const passB = resultsB.reduce((a, r) => a + r.total - r.failed.length, 0)
const family = (c) => c.replace(/^-/, '').split('-').slice(0, 2).join('-')
const byFamily = {}
for (const f of failuresA) (byFamily[family(f.class)] ||= []).push(f)
const report = {
    tailwind: twVersion,
    base: { checked: checkedA, matched: passA, percent: Number(((100 * passA) / checkedA).toFixed(2)) },
    variants: { checked: totalB, matched: passB, percent: Number(((100 * passB) / totalB).toFixed(2)) },
    theme: { checked: themeClasses.length, matched: themeClasses.length - failuresD.length },
    runtime: { checked: sampleC.length, matched: sampleC.length - failuresC.length, percent: Number(((100 * (sampleC.length - failuresC.length)) / sampleC.length).toFixed(2)) },
    failingFamilies: Object.fromEntries(Object.entries(byFamily).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => [k, v.length])),
}
// Chạy mẫu (--limit, dùng trong check:all) ghi file riêng, không đè báo cáo đầy đủ đã commit.
const sample = Number.isFinite(limit)
fs.writeFileSync(path.join(root, sample ? 'eval/tailwind-parity.sample.json' : 'eval/tailwind-parity.json'), JSON.stringify(report, null, 2) + '\n')
const md = [
    '# Độ Khớp Với Tailwind Thật',
    '',
    `Sinh bởi \`node eval/tailwind-parity.mjs\` với tailwindcss@${twVersion}, Chromium. So TOÀN BỘ computed style của phần tử và hai phần tử con giữa CSS Tailwind sinh và CSS @porbit/style (phương ngữ v4) sinh.`,
    '',
    '| Phần | Khớp | Tỉ lệ |',
    '| :--- | ---: | ---: |',
    `| A. Mọi class trong danh sách của Tailwind | ${passA}/${checkedA} | ${report.base.percent}% |`,
    `| B. Biến thể, độ mờ, !important, giá trị tuỳ ý | ${passB}/${totalB} | ${report.variants.percent}% |`,
    `| D. Theme tuỳ chỉnh, \`@utility\`, \`@apply\` (\`<style type="text/tailwindcss">\`) | ${themeClasses.length - failuresD.length}/${themeClasses.length} | ${(100 * (themeClasses.length - failuresD.length) / themeClasses.length).toFixed(1)}% |`,
    `| C. Đường runtime trong trình duyệt (tailwind-auto.mjs, mẫu 1/7 danh sách) | ${report.runtime.matched}/${report.runtime.checked} | ${report.runtime.percent}% |`,
    '',
    '## Phần B theo kịch bản',
    '',
    '| Kịch bản | Khớp |',
    '| :--- | ---: |',
    ...resultsB.map((r) => `| ${r.scenario} | ${r.total - r.failed.length}/${r.total} |`),
    '',
    '## Lệch (tối đa 60 dòng)',
    '',
    ...[...failuresA, ...failuresC, ...failuresD, ...resultsB.flatMap((r) => r.failed)].slice(0, 60).map((f) => `- \`${f.class}\`: ${f.diff.map((d) => '`' + d.slice(0, 160) + '`').join('; ')}`),
    '',
]
if (!sample) fs.writeFileSync(path.join(root, 'eval/TAILWIND-PARITY.md'), md.join('\n'))
console.log(JSON.stringify(report.base), JSON.stringify(report.variants), JSON.stringify(report.runtime))
console.log('Họ lệch:', JSON.stringify(report.failingFamilies).slice(0, 600))
