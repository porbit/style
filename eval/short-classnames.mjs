#!/usr/bin/env node
/**
 * Đo tuỳ chọn rút gọn tên class lúc build (`shortClassNames`, `@porbit/style/shorten`) trên dự án thật.
 *
 *   npm run build && node eval/short-classnames.mjs                 # shadcn-v4, hyperui, magicui, coss-ui
 *   node eval/short-classnames.mjs --fixture=hyperui                # một fixture
 *
 * Mỗi fixture: CSS sinh bằng plugin PostCSS (`compileTailwindCss`, như build thật) -> `createShortClassNames`
 * với CSS và TOÀN BỘ file nguồn -> CSS và mã đã đổi tên.
 * - Kích thước: CSS (thô/gzip/brotli), mã nguồn (thô/gzip) và mã TSX đã minify bằng esbuild (thô/gzip).
 * - Tính nhất quán: trong mã đã biến đổi không còn tên gốc nào của class đã đổi tên đứng ngoài chuỗi class
 *   nhận diện được (`findUnrecognized`), số chuỗi class trước/sau bằng nhau.
 * - Tính đúng: render bằng Chromium bản gốc (CSS + mã gốc) và bản rút gọn, so TOÀN BỘ computed style.
 *   (1) Mọi chuỗi class trong mã (`findClassStrings`, kể cả chuỗi không đổi tên) thành một phần tử, bọc trong cha
 *       `.group` (+ mọi `group/tên`) và có anh `.peer` (+ `peer/tên`) — so phần tử và hai phần tử con ở 11 lượt như
 *       eval/real-project.mjs: mặc định, mở/đóng (`data-*`/`aria-*`), `.dark`, ép :hover/:focus/:focus-visible/
 *       :active (CDP), 375/768/1600 px.
 *   (2) File HTML (HyperUI): render nguyên trang trước/sau, so MỌI phần tử ở 1280 px, 375 px, ép :hover và
 *       :focus-visible trên mọi phần tử.
 * Kết quả in ra và ghi eval/short-classnames.json.
 */
import { chromium } from 'playwright'
import { transform } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const fixturesDir = path.join(root, 'eval/fixtures')
const FIXTURES = arg('fixture') ? [arg('fixture')] : ['shadcn-v4', 'hyperui', 'magicui', 'coss-ui']
const FUNCTIONS = ['cn', 'clsx', 'cx', 'cva', 'tv', 'tw', 'twMerge', 'twJoin']

const { compileTailwindCss } = await import(path.join(root, 'dist/postcss.mjs'))
const { createShortClassNames } = await import(path.join(root, 'dist/shorten.mjs'))
const { findClassStrings } = await import(path.join(root, 'dist/analyze.mjs'))

const gzip = (s) => zlib.gzipSync(Buffer.from(s), { level: 9 }).length
const brotli = (s) => zlib.brotliCompressSync(Buffer.from(s)).length
const bytes = (s) => Buffer.byteLength(s)
const pct = (a, b) => (a ? (100 * (a - b)) / a : 0)

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

// Chữ ký computed style (như eval/real-project.mjs): mọi thuộc tính, transition chạy hết, animation dừng ở 0.
const signatures = async (css, html, run = {}, selector = '[data-k]', withChildren = true) => {
    const page = await browser.newPage({ viewport: { width: run.width || 1280, height: 800 } })
    // Animation dừng ngay từ đầu ở cả hai phía: không thì animation ngắn (`animate-out` 150 ms) có thể đã kết thúc ở
    // phía này nhưng chưa ở phía kia khi đo, lệch ngẫu nhiên (`filter: blur(0px)` / `none`).
    const style = `<style>${css}</style><style>*,::before,::after{animation-play-state:paused!important}</style>`
    await page.setContent(html.includes('<html') ? html.replace('</head>', `${style}</head>`) : `<!doctype html><html${run.dark ? ' class="dark"' : ''}><head>${style}</head><body>${html}</body></html>`)
    if (run.force) {
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('DOM.enable')
        await cdp.send('CSS.enable')
        const { root: doc } = await cdp.send('DOM.getDocument', { depth: 0 })
        const nodes = new Set()
        for (const s of run.forceSelectors || ['[data-k]', '[data-g]', '[data-p]']) for (const id of (await cdp.send('DOM.querySelectorAll', { nodeId: doc.nodeId, selector: s })).nodeIds) nodes.add(id)
        await Promise.all([...nodes].map((nodeId) => cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: run.force })))
    }
    const result = await page.evaluate(
        ([sel, children]) => {
            void document.body.offsetWidth
            for (const a of document.getAnimations()) {
                if (a instanceof CSSTransition) a.finish()
                else if (a instanceof CSSAnimation) {
                    a.pause()
                    a.currentTime = 0
                }
            }
            const props = [...getComputedStyle(document.body)].filter((p) => !p.startsWith('--') || p.startsWith('--tw-')).sort()
            const sig = (el) => {
                const cs = getComputedStyle(el)
                return props.map((p) => p + ':' + cs.getPropertyValue(p)).join(';')
            }
            const pseudo = (el, which) => {
                const cs = getComputedStyle(el, which)
                return cs.content && cs.content !== 'none' ? props.map((p) => p + ':' + cs.getPropertyValue(p)).join(';') : ''
            }
            return [...document.querySelectorAll(sel)].map((el) => [sig(el), pseudo(el, '::before'), pseudo(el, '::after'), ...(children ? [...el.children].map(sig) : [])].join('|'))
        },
        [selector, withChildren],
    )
    await page.close()
    return result
}
const firstDiff = (a, b) => {
    const pa = a.split(/[|;]/)
    const pb = b.split(/[|;]/)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) if (pa[i] !== pb[i]) return `${pa[i]} ≠ ${pb[i]}`
    return ''
}

const STATES = {
    'mặc định': '',
    'mở': 'data-state="open" data-open data-active data-checked data-selected="true" data-disabled data-orientation="horizontal" data-side="bottom" data-inset="true" data-size="sm" data-variant="outline" data-slot="x" aria-invalid="true" aria-expanded="true" aria-selected="true" aria-checked="true" aria-disabled="true"',
    'đóng': 'data-state="closed" data-closed data-unchecked data-orientation="vertical" data-side="left" aria-invalid="false" aria-expanded="false"',
}
const FORCED = { ':hover': ['hover'], ':focus': ['focus', 'focus-within'], ':focus-visible': ['focus', 'focus-visible', 'focus-within'], ':active': ['hover', 'active'] }
const RUNS = [
    ...Object.entries(STATES).map(([name, attrs]) => ({ name, attrs })),
    { name: '.dark', attrs: '', dark: true },
    ...Object.entries(FORCED).map(([name, force]) => ({ name, attrs: '', force })),
    ...[375, 768, 1600].map((width) => ({ name: `${width}px`, attrs: '', width })),
]
const PAGE_RUNS = [
    { name: 'mặc định' },
    { name: '375px', width: 375 },
    { name: ':hover', force: ['hover'], forceSelectors: ['*'] },
    { name: ':focus-visible', force: ['focus', 'focus-visible', 'focus-within'], forceSelectors: ['*'] },
]

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) walk(full, out)
        else if (/\.(tsx?|jsx?|html|vue|svelte)$/.test(e.name)) out.push(full)
    }
    return out
}

const results = {}
for (const name of FIXTURES) {
    const dir = path.join(fixturesDir, name)
    const meta = fs.existsSync(path.join(dir, 'fixture.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'fixture.json'), 'utf8')) : { label: 'shadcn/ui v4', css: 'app.css', src: 'ui' }
    const entryPath = path.join(dir, meta.css)
    const srcDir = path.join(dir, meta.src)
    const files = walk(srcDir)
    const sources = Object.fromEntries(files.map((f) => [path.relative(dir, f), fs.readFileSync(f, 'utf8')]))
    const t0 = performance.now()
    const { css } = await compileTailwindCss(fs.readFileSync(entryPath, 'utf8'), { base: srcDir, from: entryPath })
    const t1 = performance.now()
    const short = createShortClassNames({ css, sources })
    const shortCss = short.rewriteCss(css)
    const shortSources = Object.fromEntries(Object.entries(sources).map(([f, code]) => [f, short.rewriteSource(code)]))
    const t2 = performance.now()

    // Kích thước.
    const allSrc = Object.values(sources).join('\n')
    const allShort = Object.values(shortSources).join('\n')
    const minify = async (map) => {
        const out = []
        for (const [f, code] of Object.entries(map)) {
            if (!/\.[jt]sx?$/.test(f)) continue
            out.push((await transform(code, { loader: f.endsWith('x') ? 'tsx' : 'ts', minify: true, jsx: 'automatic', format: 'esm' })).code)
        }
        return out.join('\n')
    }
    const minBefore = await minify(sources)
    const minAfter = await minify(shortSources)
    const size = {
        css: { before: { raw: bytes(css), gzip: gzip(css), brotli: brotli(css) }, after: { raw: bytes(shortCss), gzip: gzip(shortCss), brotli: brotli(shortCss) } },
        source: { before: { raw: bytes(allSrc), gzip: gzip(allSrc) }, after: { raw: bytes(allShort), gzip: gzip(allShort) } },
    }
    if (minBefore) size.minifiedJs = { before: { raw: bytes(minBefore), gzip: gzip(minBefore) }, after: { raw: bytes(minAfter), gzip: gzip(minAfter) } }

    // Nhất quán: không còn tên gốc của class đã đổi tên ngoài chuỗi class; số chuỗi class trước/sau bằng nhau.
    const leftovers = {}
    const pairs = []
    let pairMismatch = 0
    for (const [f, code] of Object.entries(shortSources)) {
        const left = short.findUnrecognized(code)
        if (left.length) leftovers[f] = left
        const a = findClassStrings(sources[f], { functions: FUNCTIONS })
        const b = findClassStrings(code, { functions: FUNCTIONS })
        if (a.length !== b.length) {
            pairMismatch++
            continue
        }
        a.forEach((r, i) => pairs.push([r.value, b[i].value]))
    }

    // Phần tử từ chuỗi class (bỏ phần template {...}), không trùng lặp.
    const clean = (v) => v.replace(/\{[^{}]*\}/g, ' ').replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter((t) => t && !/[{}$\\]/.test(t)).join(' ')
    const seen = new Set()
    const elements = []
    for (const [a, b] of pairs) {
        const ca = clean(a)
        if (!ca || seen.has(ca)) continue
        seen.add(ca)
        elements.push([ca, clean(b)])
    }
    const cssClasses = [...short.map.keys(), ...short.skipped.keys()]
    const groups = cssClasses.filter((c) => /^group(\/[\w-]+)?$/.test(c))
    const peers = cssClasses.filter((c) => /^peer(\/[\w-]+)?$/.test(c))
    const rename = (list) => list.map((c) => short.map.get(c) ?? c).join(' ')
    const htmlFor = (attrs, list, side) =>
        list
            .map((pair) => `<div data-g class="${escapeHtml(side ? rename(groups) : groups.join(' '))}" ${attrs}><span data-p class="${escapeHtml(side ? rename(peers) : peers.join(' '))}" ${attrs}></span><div data-k ${attrs} class="${escapeHtml(pair[side])}"><i>a</i><i>b</i></div></div>`)
            .join('')
    const matched = {}
    const failures = []
    for (const run of RUNS) {
        const [a, b] = await Promise.all([signatures(css, htmlFor(run.attrs, elements, 0), run), signatures(shortCss, htmlFor(run.attrs, elements, 1), run)])
        let ok = 0
        a.forEach((s, i) => {
            if (s === b[i]) ok++
            else if (failures.length < 20) failures.push(`${run.name}: \`${elements[i][0].slice(0, 120)}\` — ${firstDiff(s, b[i]).slice(0, 200)}`)
        })
        matched[run.name] = ok
    }
    const result = {
        label: meta.label,
        files: files.length,
        cssClasses: cssClasses.length,
        renamed: short.map.size,
        skipped: [...short.skipped.values()].reduce((acc, r) => ({ ...acc, [r]: (acc[r] || 0) + 1 }), {}),
        timeMs: { compileCss: Math.round(t1 - t0), shorten: Math.round(t2 - t1) },
        size,
        consistency: { leftovers, pairMismatch, classStrings: pairs.length },
        elements: { total: elements.length, matched },
        failures,
    }
    // Trang HTML nguyên vẹn (HyperUI).
    const pages = Object.keys(sources).filter((f) => f.endsWith('.html'))
    if (pages.length) {
        const pageMatched = {}
        let total = 0
        for (const run of PAGE_RUNS) {
            let ok = 0
            let count = 0
            // Chạy song song 8 trang mỗi lượt (mỗi trang một tab), so theo thứ tự file.
            const sigs = new Map()
            for (let i = 0; i < pages.length; i += 8) {
                await Promise.all(
                    pages.slice(i, i + 8).map(async (f) => {
                        sigs.set(f, await Promise.all([signatures(css, sources[f], run, 'body, body *', false), signatures(shortCss, shortSources[f], run, 'body, body *', false)]))
                    }),
                )
            }
            for (const f of pages) {
                const [a, b] = sigs.get(f)
                count += a.length
                if (a.length !== b.length) {
                    failures.push(`${run.name}: ${f} số phần tử khác (${a.length}/${b.length})`)
                    continue
                }
                a.forEach((s, i) => {
                    if (s === b[i]) ok++
                    else if (failures.length < 40) failures.push(`${run.name}: ${f} phần tử #${i} — ${firstDiff(s, b[i]).slice(0, 200)}`)
                })
            }
            pageMatched[run.name] = ok
            total = count
        }
        result.pages = { files: pages.length, elements: total, matched: pageMatched }
    }
    results[name] = result
    const s = size
    const line = (label, x) => `${label} ${x.before.raw} -> ${x.after.raw} B (-${pct(x.before.raw, x.after.raw).toFixed(1)}%), gzip ${x.before.gzip} -> ${x.after.gzip} B (-${pct(x.before.gzip, x.after.gzip).toFixed(1)}%)`
    console.log(`\n== ${meta.label}: ${files.length} file, ${result.cssClasses} class trong CSS, đổi tên ${result.renamed}, giữ ${JSON.stringify(result.skipped)}`)
    console.log('  ' + line('CSS', s.css))
    console.log('  ' + line('mã nguồn', s.source))
    if (s.minifiedJs) console.log('  ' + line('JS minify', s.minifiedJs))
    console.log(`  nhất quán: ${Object.keys(leftovers).length ? 'LỖI ' + JSON.stringify(leftovers).slice(0, 300) : 'không còn tên gốc'}; lệch số chuỗi ${pairMismatch}`)
    console.log(`  computed style (${elements.length} phần tử): ${RUNS.map((r) => `${r.name} ${matched[r.name]}/${elements.length}`).join(' · ')}`)
    if (result.pages) console.log(`  trang HTML (${pages.length} trang, ${result.pages.elements} phần tử): ${PAGE_RUNS.map((r) => `${r.name} ${result.pages.matched[r.name]}/${result.pages.elements}`).join(' · ')}`)
    if (failures.length) console.log('  lệch:\n    ' + failures.slice(0, 10).join('\n    '))
}
await browser.close()

const ok = Object.values(results).every(
    (r) =>
        !Object.keys(r.consistency.leftovers).length &&
        !r.consistency.pairMismatch &&
        Object.values(r.elements.matched).every((n) => n === r.elements.total) &&
        (!r.pages || Object.values(r.pages.matched).every((n) => n === r.pages.elements)),
)
if (!arg('fixture')) fs.writeFileSync(path.join(root, 'eval/short-classnames.json'), JSON.stringify({ ok, fixtures: results }, null, 2) + '\n')
console.log(`\n${ok ? 'ĐẠT' : 'CHƯA ĐẠT'}: 100% khớp computed style và không còn tên gốc ngoài chuỗi class`)
if (!ok) process.exitCode = 1
