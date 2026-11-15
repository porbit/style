#!/usr/bin/env node
/**
 * Kiểm tra trên trình duyệt thật (Chromium) những lỗi mà test đơn vị không thấy:
 *   1. Thứ tự cascade layer ở CSS tĩnh và ở runtime (kể cả sau vài khung hình).
 *   2. Mọi class của bộ component được trình duyệt chấp nhận.
 *   3. CSS do engine Node và engine Rust sinh cho cùng tập class hiển thị giống nhau.
 *
 * Dùng bản build trong dist/ (chạy `npm run build` trước). In JSON kết quả; mã thoát 1 khi có lỗi,
 * 2 khi không có trình duyệt (bỏ qua). Trình duyệt: Playwright mặc định, hoặc CHROMIUM_PATH.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
const rustBin = path.join(root, 'presence_style/target/release/examples/css_from_stdin')

const launch = async () => {
    let chromium
    try {
        ;({ chromium } = require('playwright'))
    } catch (_error) {
        return null
    }
    const candidates = [process.env.CHROMIUM_PATH, undefined, '/opt/pw-browsers/chromium'].filter((v, i, a) => a.indexOf(v) === i)
    for (const executablePath of candidates) {
        try {
            return await chromium.launch(executablePath ? { executablePath } : {})
        } catch (_error) {
            // thử ứng viên tiếp theo
        }
    }
    return null
}

const servePage = async (browser, body = '<html><head></head><body></body></html>') => {
    const page = await browser.newPage()
    await page.route('http://check.local/**', (route) => {
        const url = new URL(route.request().url())
        if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body })
        route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(dist, url.pathname)) })
    })
    await page.goto('http://check.local/')
    return page
}

const checks = {
    async layerStatic(browser) {
        const { extractFromClasses } = require(path.join(dist, 'index.js'))
        const { css } = await extractFromClasses(['2cRed', 'cBlue'], { hashClassName: false })
        const page = await browser.newPage()
        await page.setContent(`<style>${css}</style><div id="a" class="2cRed cBlue">x</div>`)
        const color = await page.evaluate(() => getComputedStyle(document.getElementById('a')).color)
        await page.close()
        return { ok: color === 'rgb(255, 0, 0)', detail: `2cRed cBlue -> ${color}` }
    },

    async layerRuntime(browser) {
        const page = await servePage(browser, '<html><head></head><body><div id="a" class="2cRed cBlue">x</div></body></html>')
        const result = await page.evaluate(async () => {
            const xcss = (await import('/index.mjs')).default
            xcss.cssObserve(document, { hashClassName: false })
            await new Promise((r) => setTimeout(r, 200))
            const b = document.createElement('div')
            b.className = '7cGreen 3cOrange'
            document.body.appendChild(b)
            await new Promise((r) => setTimeout(r, 100))
            return { a: getComputedStyle(document.getElementById('a')).color, b: getComputedStyle(b).color }
        })
        await page.close()
        return { ok: result.a === 'rgb(255, 0, 0)' && result.b === 'rgb(0, 128, 0)', detail: JSON.stringify(result) }
    },

    async components(browser) {
        const page = await servePage(browser)
        const bad = await page.evaluate(async () => {
            const core = (await import('/index.mjs')).default
            const { getComponentClasses } = await import('/components.mjs')
            return getComponentClasses().filter((token) => {
                const engine = core.css({ silent: true }).buildCss(undefined)
                const rejected = engine.clsx(token) === token
                engine.destroy()
                return rejected
            })
        })
        await page.close()
        return { ok: bad.length === 0, detail: bad.length ? `bị từ chối: ${bad.join(' ')}` : 'mọi class hợp lệ' }
    },

    async rustParity(browser) {
        if (!fs.existsSync(rustBin)) return { ok: true, skipped: true, detail: 'chưa build engine Rust (cargo build --release --example css_from_stdin)' }
        const { extractFromClasses } = require(path.join(dist, 'index.js'))
        const runs = path.join(root, 'eval/runs')
        const html = fs.readdirSync(runs)
            .filter((run) => !run.startsWith('tailwind'))
            .flatMap((run) => fs.readdirSync(path.join(runs, run)).filter((f) => f.endsWith('.html')).map((f) => fs.readFileSync(path.join(runs, run, f), 'utf8')))
            .join('\n') +
            // Xung đột layer/media có chủ đích: bắt lỗi thứ tự cascade mà trang mẫu không chạm tới.
            '<div class="2cRed cBlue">a</div><div class="md:cRed 5cBlue">b</div>' +
            '<div class="sm:p1px xl:p3px md:p2px">c</div><div class="xs:m1px m2px 3m4px lg:3m5px">d</div>' +
            '<div class="md:dF&aiC@:hover dB">e</div>'
        const tokens = [...new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean))]
        const nodeCss = (await extractFromClasses(tokens, { hashClassName: false })).css
        const rustCss = execFileSync(rustBin, { input: tokens.join(' ') }).toString()
        const props = ['display', 'position', 'color', 'background-color', 'padding', 'margin', 'width', 'height', 'font-size', 'font-weight',
            'border-top-width', 'border-top-color', 'border-radius', 'gap', 'grid-template-columns', 'box-shadow', 'opacity', 'transform',
            'text-align', 'flex-direction', 'align-items', 'justify-content', 'overflow', 'z-index', 'line-height', 'letter-spacing']
        const snapshot = async (css, width) => {
            const page = await browser.newPage({ viewport: { width, height: 900 } })
            await page.setContent(`<style>${css}</style>${html}`)
            const values = await page.evaluate((props) => [...document.querySelectorAll('body *')].map((el) => props.map((k) => getComputedStyle(el).getPropertyValue(k)).join('|')), props)
            await page.close()
            return values
        }
        const diffs = []
        for (const width of [390, 800, 1300]) {
            const a = await snapshot(nodeCss, width)
            const b = await snapshot(rustCss, width)
            const count = a.filter((value, index) => value !== b[index]).length
            if (count) diffs.push(`${width}px: ${count}/${a.length}`)
        }
        return { ok: diffs.length === 0, detail: diffs.length ? `khác nhau ở ${diffs.join(', ')}` : `${tokens.length} class, 3 độ rộng, 0 khác biệt` }
    },
}

;(async () => {
    if (!fs.existsSync(path.join(dist, 'index.mjs'))) {
        console.error('Thiếu dist/. Chạy `npm run build` trước.')
        process.exit(1)
    }
    const browser = await launch()
    if (!browser) {
        console.log(JSON.stringify({ skipped: true, reason: 'không khởi động được Chromium (đặt CHROMIUM_PATH hoặc chạy npx playwright install chromium)' }))
        process.exit(2)
    }
    const results = {}
    for (const [name, run] of Object.entries(checks)) {
        try {
            results[name] = await run(browser)
        } catch (error) {
            results[name] = { ok: false, detail: error.message }
        }
    }
    await browser.close()
    console.log(JSON.stringify(results))
    process.exit(Object.values(results).every((r) => r.ok) ? 0 : 1)
})()
