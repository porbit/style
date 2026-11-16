#!/usr/bin/env node
/**
 * So computed style TOÀN TRANG giữa hai bản build Next.js đang chạy (gốc và rút gọn tên class), và đo kích thước.
 *
 *   node eval/next-short-compare.cjs --a=http://localhost:3201 --b=http://localhost:3202 [--path=/] \
 *        [--dir-a=.next-gốc --dir-b=.next-rút-gọn] [--json=kết-quả.json]
 *
 * Mỗi lượt (375/768/1440 px; ép :hover, :focus-visible lên mọi phần tử bằng CDP): mọi phần tử của trang, mọi thuộc
 * tính (trừ biến CSS không phải `--tw-*`), kèm ::before/::after. Transition chạy hết, animation dừng ở 0. Cũng kiểm
 * tra số phần tử bằng nhau và bản B thật sự dùng tên class khác (đã rút gọn).
 * Kích thước (khi có --dir-a/--dir-b): CSS (`static/css`), JS (`static/chunks`), HTML + RSC payload dựng sẵn (`server/app`).
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { chromium } = require('playwright')

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const A = arg('a')
const B = arg('b')
const PAGE = arg('path') || '/'
if (!A || !B) {
    console.error('Cần --a=<url> --b=<url>')
    process.exit(2)
}

const RUNS = [
    { name: '1440', width: 1440 },
    { name: '768', width: 768 },
    { name: '375', width: 375 },
    { name: '1440 :hover', width: 1440, force: [':hover'] },
    { name: '1440 :focus-visible', width: 1440, force: [':focus-visible', ':focus'] },
]

const launch = async () => {
    const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)
    return chromium.launch(executablePath ? { executablePath } : {})
}

const waitFor = async (url) => {
    for (let i = 0; i < 120; i++) {
        try {
            if ((await fetch(url)).ok) return
        } catch (_error) {
            /* chưa chạy */
        }
        await new Promise((r) => setTimeout(r, 500))
    }
    throw new Error('Không kết nối được ' + url)
}

const snapshot = async (browser, base, run) => {
    const page = await browser.newPage({ viewport: { width: run.width, height: 900 } })
    await page.goto(base + PAGE, { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: '*,::before,::after{animation-play-state:paused!important;caret-color:transparent!important}' })
    if (run.force) {
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('DOM.enable')
        await cdp.send('CSS.enable')
        const { root } = await cdp.send('DOM.getDocument', { depth: 0 })
        const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'body, body *' })
        await Promise.all(nodeIds.map((nodeId) => cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: run.force })))
    }
    const result = await page.evaluate(() => {
        void document.body.offsetWidth
        for (const a of document.getAnimations()) {
            if (a instanceof CSSTransition) a.finish()
            else {
                a.pause()
                a.currentTime = 0
            }
        }
        const props = [...getComputedStyle(document.body)].filter((p) => !p.startsWith('--') || p.startsWith('--tw-')).sort()
        const sig = (cs) => props.map((p) => p + ':' + cs.getPropertyValue(p)).join(';')
        const pseudo = (el, which) => {
            const cs = getComputedStyle(el, which)
            return cs.content && cs.content !== 'none' ? sig(cs) : ''
        }
        const els = [...document.querySelectorAll('body, body *')].filter((el) => !['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NEXT-ROUTE-ANNOUNCER'].includes(el.tagName))
        return {
            classes: els.map((el) => el.getAttribute('class') || ''),
            styles: els.map((el) => el.tagName + '|' + sig(getComputedStyle(el)) + '|' + pseudo(el, '::before') + '|' + pseudo(el, '::after')),
        }
    })
    await page.close()
    return result
}

const sizes = (dir) => {
    const walk = (d, test) => (fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).map((f) => path.join(d, f)).filter((f) => test(f) && fs.statSync(f).isFile()) : [])
    const measure = (files) => files.reduce((acc, f) => {
        const buf = fs.readFileSync(f)
        acc.raw += buf.length
        acc.gzip += zlib.gzipSync(buf, { level: 9 }).length
        return acc
    }, { files: files.length, raw: 0, gzip: 0 })
    return {
        css: measure(walk(path.join(dir, 'static/css'), (f) => f.endsWith('.css'))),
        js: measure(walk(path.join(dir, 'static/chunks'), (f) => f.endsWith('.js'))),
        html: measure(walk(path.join(dir, 'server/app'), (f) => f.endsWith('.html'))),
        rsc: measure(walk(path.join(dir, 'server/app'), (f) => f.endsWith('.rsc'))),
    }
}

;(async () => {
    await waitFor(A + PAGE)
    await waitFor(B + PAGE)
    const browser = await launch()
    const report = { runs: [], elements: 0, mismatched: 0, renamedElements: 0 }
    for (const run of RUNS) {
        const a = await snapshot(browser, A, run)
        const b = await snapshot(browser, B, run)
        if (a.styles.length !== b.styles.length) {
            report.runs.push({ run: run.name, error: `số phần tử khác nhau: ${a.styles.length} / ${b.styles.length}` })
            report.mismatched += Math.max(a.styles.length, b.styles.length)
            continue
        }
        let diff = 0
        const samples = []
        a.styles.forEach((s, i) => {
            if (s === b.styles[i]) return
            diff++
            if (samples.length < 3) {
                const x = s.split(';')
                const y = b.styles[i].split(';')
                samples.push({ a: a.classes[i], b: b.classes[i], props: x.filter((p, k) => p !== y[k]).slice(0, 4).join(' ; ') + ' <> ' + y.filter((p, k) => p !== x[k]).slice(0, 4).join(' ; ') })
            }
        })
        const renamed = a.classes.filter((c, i) => c !== b.classes[i]).length
        report.runs.push({ run: run.name, elements: a.styles.length, mismatched: diff, samples })
        report.elements += a.styles.length
        report.mismatched += diff
        report.renamedElements = Math.max(report.renamedElements, renamed)
    }
    await browser.close()
    const dirA = arg('dir-a')
    const dirB = arg('dir-b')
    if (dirA && dirB) report.sizes = { a: sizes(dirA), b: sizes(dirB) }
    for (const r of report.runs) {
        if (r.error) console.log(`✗ ${r.run}: ${r.error}`)
        else console.log(`${r.mismatched ? '✗' : '✓'} ${r.run}: ${r.elements - r.mismatched}/${r.elements} phần tử khớp`)
        for (const s of r.samples || []) {
            const x = s.a.split(/\s+/)
            const y = s.b.split(/\s+/)
            console.log(`    class (${x.length} -> ${y.length} token) "${s.a.slice(0, 160)}": ${s.props.slice(0, 400)}`)
        }
    }
    console.log(`Tổng: ${report.elements - report.mismatched}/${report.elements} phần tử khớp computed style; ${report.renamedElements} phần tử có class đã đổi tên`)
    if (report.sizes) {
        const pct = (x, y) => (x ? ((100 * (y - x)) / x).toFixed(1) : '0.0')
        for (const key of ['css', 'js', 'html', 'rsc']) {
            const x = report.sizes.a[key]
            const y = report.sizes.b[key]
            console.log(`${key.toUpperCase().padEnd(4)} thô ${x.raw} -> ${y.raw} B (${pct(x.raw, y.raw)}%), gzip ${x.gzip} -> ${y.gzip} B (${pct(x.gzip, y.gzip)}%)`)
        }
    }
    const out = arg('json')
    if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n')
    process.exit(report.mismatched || !report.renamedElements ? 1 : 0)
})()
