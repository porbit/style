#!/usr/bin/env node
/**
 * Hiệu năng runtime trong trình duyệt: so dist/tailwind-auto.mjs với @tailwindcss/browser.
 *
 *   npm run build && node eval/runtime-bench.mjs [--runs=9] [--ours=dist/tailwind-auto.mjs] [--no-write]
 *
 * `--ours=a.mjs,b.mjs` so nhiều bản build cùng lúc (trước/sau một thay đổi), xen kẽ trong từng lượt.
 * `--hybrid`: chế độ lai — trang có CSS tĩnh (plugin PostCSS build từ eval/runs/tailwind) và `data-hybrid`, chỉ đo
 * bản của @porbit/style (class mới lúc chạy chèn vào khối @layer của CSS tĩnh); ghi eval/runtime-bench-hybrid.json.
 *
 * Mỗi lượt mở một trang mới (context riêng, không có cache localStorage) gồm ~970 phần tử ghép từ
 * eval/runs/tailwind/*.html, rồi đo:
 *   - ready:    từ đầu <head> tới khi phần tử thăm dò có style (margin-top: 7px);
 *   - burst:    chèn 2.000 phần tử với ~330 class mới (innerHTML một lần) tới khi phần tử cuối có style;
 *   - steps:    chèn 200 phần tử 10 lần liên tiếp (mỗi lần ~60 class mới), chờ style rồi mới chèn tiếp;
 *               ghi tổng thời gian 10 lần.
 * "Có style" được kiểm sau khung hình kế tiếp, SAU mọi callback đã đăng ký (setTimeout → rAF → setTimeout),
 * công bằng cho engine xử lý mutation trong microtask lẫn trong requestAnimationFrame. Kèm theo, cho burst và
 * steps: thời gian luồng chính bận và thời gian style recalc (CDP Performance.getMetrics).
 * In trung vị và khoảng [min–max] qua các lượt; ghi eval/runtime-bench.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const args = process.argv.slice(2)
const arg = (name, fallback) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`))
    return hit ? hit.slice(name.length + 3) : fallback
}
const runs = Number(arg('runs', 9))
const oursPaths = arg('ours', 'dist/tailwind-auto.mjs').split(',').map((file) => path.resolve(root, file))
const write = !args.includes('--no-write')
const hybrid = args.includes('--hybrid')
const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)

const twBrowser = fs.readFileSync(path.join(path.dirname(require.resolve('@tailwindcss/browser/package.json')), 'dist/index.global.js'), 'utf8')
const runsDir = path.join(root, 'eval/runs/tailwind')
const pages = fs.readdirSync(runsDir).filter((f) => f.endsWith('.html')).sort().map((f) => fs.readFileSync(path.join(runsDir, f), 'utf8')).join('\n')
// `backdrop-blur-sm` bị bỏ: raster phần mềm của Chromium headless vẽ blur rất chậm (hàng trăm ms mỗi khung),
// che mất chi phí của engine.
const body = Array.from({ length: 12 }, () => pages.replace(/backdrop-blur-sm/g, '')).join('\n') + '<div id="probe" class="mt-[7px] bg-emerald-600/40 md:p-[9px]">x</div>'

// Lai: CSS tĩnh cho class của trang ban đầu (thẻ dò `#probe` không có trong đó, runtime sinh).
const staticCss = hybrid
    ? (await (await import(path.join(root, 'dist/postcss.mjs'))).compileTailwindCss('@import "tailwindcss";', { base: runsDir })).css
    : ''
const engines = [
    ...(hybrid ? [] : [['@tailwindcss/browser', `<script>${twBrowser}</script>`]]),
    ...oursPaths.map((file, index) => [
        oursPaths.length > 1 ? `@porbit/style ${path.relative(root, file)}` : '@porbit/style tailwind-auto',
        // Đường dẫn chứa `tailwind-auto`: bản CDN tìm thẻ script của nó theo tên để đọc `data-*`.
        `${hybrid ? `<style>${staticCss}</style>` : ''}<script type="module" src="/ours${index}/tailwind-auto.mjs"${hybrid ? ' data-hybrid' : ''}></script>`,
        fs.readFileSync(file, 'utf8'),
    ]),
]

// Chạy trong trang: chờ tới khi `test()` đúng, kiểm sau khung hình kế tiếp.
const waitStyled = (t0, test) => new Promise((resolve) => {
    const check = () => (test() ? resolve(performance.now() - t0) : schedule())
    const schedule = () => setTimeout(() => requestAnimationFrame(() => setTimeout(check, 0)), 0)
    schedule()
})

const idle = () => new Promise((r) => setTimeout(() => requestAnimationFrame(() => setTimeout(r, 50)), 0))

// Dựng sẵn HTML ngoài phần đo để thời gian luồng chính (CDP) chỉ gồm việc chèn và việc của engine.
const prepare = () => {
    let burst = ''
    for (let i = 0; i < 2000; i++) {
        burst += `<div class="flex items-center gap-${i % 12} p-${i % 10} text-${['sm', 'base', 'lg'][i % 3]} bg-sky-${(i % 9 + 1) * 100} hover:bg-sky-900 rounded-${['md', 'lg', 'xl'][i % 3]} mt-[${i % 300}px]">x</div>`
    }
    // 10 lần × 200 phần tử; mỗi lần ~60 class mới (giá trị tuỳ ý, màu, biến thể).
    const colors = ['red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan', 'indigo', 'violet', 'pink']
    const steps = colors.map((color, k) => {
        let h = ''
        for (let i = 0; i < 200; i++) {
            h += `<div class="grid gap-${i % 8} ml-[${k * 40 + (i % 40)}px] bg-${color}-${(i % 9 + 1) * 100} hover:text-${color}-700 md:pl-[${k * 10 + (i % 10)}px] border-${color}-${(i % 5 + 1) * 100}">y</div>`
        }
        return h
    })
    window.__html = { burst, steps }
}

const phases = {
    async ready() {
        const probe = document.getElementById('probe')
        const ms = await waitStyled(window.__t0, () => getComputedStyle(probe).marginTop === '7px')
        await idle()
        return ms
    },
    async burst() {
        const box = document.createElement('div')
        document.body.appendChild(box)
        const t0 = performance.now()
        box.innerHTML = window.__html.burst
        const last = box.lastElementChild
        const ms = await waitStyled(t0, () => getComputedStyle(last).marginTop === `${1999 % 300}px`)
        await idle()
        return ms
    },
    async steps() {
        const times = []
        for (let k = 0; k < 10; k++) {
            const part = document.createElement('div')
            const t0 = performance.now()
            part.innerHTML = window.__html.steps[k]
            document.body.appendChild(part)
            const end = part.lastElementChild
            times.push(await waitStyled(t0, () => getComputedStyle(end).marginLeft === `${k * 40 + 39}px`))
        }
        await idle()
        return times
    },
}

// Thời gian luỹ kế của luồng chính (CDP Performance.getMetrics), giây -> ms. `busy` = TaskDuration (mọi việc trên
// luồng chính: JS, parse, style, layout). Không dùng ScriptDuration: khi thử, nó gần như không ghi nhận phần
// biên dịch của @tailwindcss/browser (chạy trong microtask) nên không so được giữa hai engine.
const cdpMetrics = async (cdp) => {
    const { metrics } = await cdp.send('Performance.getMetrics')
    const pick = (name) => (metrics.find((m) => m.name === name)?.value || 0) * 1000
    return { busy: pick('TaskDuration'), style: pick('RecalcStyleDuration') }
}

const measure = async (page) => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Performance.enable')
    const run = (name) => page.evaluate(`(${phases[name].toString().replace(/^async \w+\(/, 'async function(')})()`)
    await page.evaluate(`window.waitStyled=${waitStyled.toString()};window.idle=${idle.toString()};(${prepare.toString()})()`)
    const ready = await run('ready')
    const m0 = await cdpMetrics(cdp)
    const burst = await run('burst')
    const m1 = await cdpMetrics(cdp)
    const steps = await run('steps')
    const m2 = await cdpMetrics(cdp)
    return {
        ready,
        burst,
        burstBusy: m1.busy - m0.busy,
        burstStyle: m1.style - m0.style,
        steps: steps.reduce((a, b) => a + b, 0),
        stepMax: Math.max(...steps),
        stepsBusy: m2.busy - m1.busy,
        stepsStyle: m2.style - m1.style,
    }
}

const browser = await chromium.launch({ executablePath })
const samples = {}
for (let run = 0; run < runs; run++) {
    // Xen kẽ engine trong mỗi lượt để nhiễu máy chia đều cho cả hai.
    for (const [name, script, source] of engines) {
        const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
        await page.route('http://bench.local/**', (route) => {
            const url = new URL(route.request().url())
            if (url.pathname.endsWith('.mjs')) return route.fulfill({ contentType: 'text/javascript', body: source })
            return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><script>window.__t0=performance.now()</script>${script}</head><body>${body}</body></html>` })
        })
        await page.goto('http://bench.local/')
        const result = await measure(page)
        await page.close()
        const bucket = (samples[name] ||= {})
        for (const key in result) (bucket[key] ||= []).push(Math.round(result[key] * 10) / 10)
    }
}
const browserVersion = browser.version()
await browser.close()

const stat = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = sorted.length >> 1
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    const r = (x) => Math.round(x * 10) / 10
    return { median: r(median), min: r(sorted[0]), max: r(sorted[sorted.length - 1]) }
}
const labels = {
    ready: 'tải ban đầu (ms)',
    burst: 'chèn 2.000 phần tử (ms)',
    burstBusy: '2.000: luồng chính bận (ms)',
    burstStyle: '2.000: style recalc (ms)',
    steps: '10 × 200 phần tử, tổng (ms)',
    stepMax: '10 × 200, lần chậm nhất (ms)',
    stepsBusy: '10 × 200: luồng chính bận (ms)',
    stepsStyle: '10 × 200: style recalc (ms)',
}
const summary = {}
const table = {}
for (const [name, bucket] of Object.entries(samples)) {
    summary[name] = {}
    for (const [key, label] of Object.entries(labels)) {
        const s = stat(bucket[key])
        summary[name][key] = s
        ;(table[label] ||= {})[name] = `${s.median} [${s.min}–${s.max}]`
    }
}
console.log(`phần tử ban đầu: ${(body.match(/class="/g) || []).length}; ${runs} lượt; trung vị [min–max]`)
console.table(table)
if (write) {
    const out = {
        date: new Date().toISOString().slice(0, 10),
        browser: `Chromium ${browserVersion}`,
        runs,
        initialElements: (body.match(/class="/g) || []).length,
        metrics: labels,
        results: summary,
        samples,
    }
    const file = hybrid ? 'eval/runtime-bench-hybrid.json' : 'eval/runtime-bench.json'
    fs.writeFileSync(path.join(root, file), JSON.stringify(hybrid ? { ...out, staticCssKb: Math.round(staticCss.length / 102.4) / 10 } : out, null, 2) + '\n')
    console.log(`Đã ghi ${file}`)
}
