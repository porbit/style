#!/usr/bin/env node
/**
 * Thứ tự cascade ở chế độ lai (CSS tĩnh build sẵn + `tailwind-auto.mjs data-hybrid` sinh class mới lúc chạy).
 *
 *   npm run build && node eval/hybrid-order.mjs [--no-write]
 *
 * Mỗi cặp class xung đột (cùng thuộc tính, cùng layer/specificity) nằm trên một phần tử: một class có trong CSS
 * tĩnh (plugin PostCSS `compileTailwindCss` build từ mã nguồn), class kia chỉ xuất hiện lúc chạy nên runtime sinh.
 * Tailwind quyết định bên thắng bằng thứ tự rule (`px-4` sau `p-2` nên thắng), không phụ thuộc class nào có trước.
 * Chạy hai chiều (A tĩnh + B động, rồi B tĩnh + A động), CSS tĩnh nạp bằng `<style>` và bằng `<link>` cùng nguồn;
 * thêm trường hợp CSS tĩnh do chính Tailwind build (`@layer utilities`) và runtime chỉ sinh class mới.
 *
 * Chuẩn: CSS Tailwind thật build đủ mọi class. Đối chứng: CSS tĩnh của @porbit/style build đủ mọi class (tách lỗi
 * thứ tự khỏi lỗi sinh CSS của từng class). So style tính toán của từng phần tử (cặp `hover:` đo khi rê chuột).
 * Kết quả: eval/hybrid-order.json. Mã thoát 1 khi chế độ lai sai cặp nào.
 */
import { compile } from 'tailwindcss'
import { chromium } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const write = !process.argv.includes('--no-write')
// `--auto=đường/dẫn.mjs`: đo một bản build khác của tailwind-auto (ví dụ bản trước khi sửa).
const autoPath = (process.argv.find((a) => a.startsWith('--auto=')) || '').slice(7) || path.join(root, 'dist/tailwind-auto.mjs')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const loadStylesheet = async (id, base) => ({ base, path: id, content: fs.readFileSync(path.join(twDir, id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')), 'utf8') })
const { compileTailwindCss } = await import(path.join(root, 'dist/postcss.mjs'))
const ENTRY = '@import "tailwindcss";'

// Cặp xung đột [A, B]: mỗi class chỉ xuất hiện một lần trong cả danh sách (một phía của trang là tĩnh, phía kia động).
const PAIRS = [
    ['p-2', 'px-4'],
    ['p-3', 'py-5'],
    ['m-2', 'mt-6'],
    ['mx-3', 'ml-7'],
    ['inset-0', 'top-2'],
    ['inset-x-1', 'left-3'],
    ['rounded-lg', 'rounded-t-none'],
    ['rounded-xl', 'rounded-bl-sm'],
    ['border-2', 'border-x-4'],
    ['border-4', 'border-t-8'],
    ['gap-2', 'gap-x-6'],
    ['overflow-hidden', 'overflow-x-auto'],
    ['bg-red-500', 'bg-blue-500'],
    ['text-green-600', 'text-amber-600'],
    ['flex', 'hidden'],
    ['grid-cols-2', 'grid-cols-3'],
    ['opacity-50', 'opacity-75'],
    ['font-bold', 'font-light'],
    ['w-4', 'size-8'],
    ['scroll-m-2', 'scroll-mt-4'],
    ['bg-sky-200', 'hover:bg-rose-300', 'hover'],
    ['text-sky-800', 'hover:text-rose-800', 'hover'],
    ['hover:p-1', 'p-6', 'hover'],
    ['hover:bg-lime-300', 'hover:bg-teal-300', 'hover'],
    ['hover:px-3', 'hover:p-7', 'hover'],
    ['p-5', 'md:p-8'],
    ['mx-1', 'md:mx-5'],
    ['md:px-2', 'md:p-9'],
    ['sm:pt-3', 'md:pt-7'],
    ['md:mt-1', 'lg:mt-3'],
    ['md:rounded-md', 'md:rounded-tr-2xl'],
    ['md:w-10', 'w-20'],
    ['lg:p-4', '2xl:p-10'],
    ['2xl:mx-2', 'xl:mx-8'],
]

const sideClasses = (side) => PAIRS.map((pair) => pair[side])
const allClasses = PAIRS.flatMap((pair) => [pair[0], pair[1]])
if (new Set(allClasses).size !== allClasses.length) throw new Error('cặp class trùng nhau')

const twCompile = async (classes) => (await compile(ENTRY, { base: twDir, loadStylesheet })).build([...classes])
// CSS tĩnh của @porbit/style: plugin PostCSS quét thư mục mã nguồn tạm chứa đúng các class của một phía.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hybrid-order-'))
const oursCompile = async (classes) => {
    fs.writeFileSync(path.join(tmp, 'index.html'), `<div class="${classes.join(' ')}"></div>`)
    return (await compileTailwindCss(ENTRY, { base: tmp })).css
}
const referenceCss = await twCompile(allClasses)
const oursFullCss = await oursCompile(allClasses)
const staticA = await oursCompile(sideClasses(0))
const staticB = await oursCompile(sideClasses(1))
// CSS do Tailwind build (CLI/PostCSS chính hãng, `@layer utilities`) + runtime của @porbit/style cho class mới.
const twStaticA = await twCompile(sideClasses(0))
const twStaticB = await twCompile(sideClasses(1))
fs.rmSync(tmp, { recursive: true, force: true })
const auto = fs.readFileSync(path.resolve(autoPath), 'utf8')

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

// Phần tử đặt sẵn trong HTML (runtime quét lần đầu) và phần tử chèn lúc chạy (MutationObserver): cả hai đường.
const markup = PAIRS.map((pair, i) => `<div data-k="${i}" class="${pair[0]} ${pair[1]}"><i>x</i></div>`).join('')
// `hmr`: sau khi runtime đã chèn rule, thay CSS tĩnh như HMR của Vite (`style`: đặt lại textContent của `<style>`;
// `link`: chèn `<link>` mới, bỏ cái cũ khi nạp xong) rồi mới đo.
const HMR = {
    style: () => {
        const style = document.querySelector('style')
        style.textContent = style.textContent + '\n/* hmr */'
    },
    link: () => new Promise((resolve) => {
        const old = document.querySelector('link[rel=stylesheet]')
        const next = document.createElement('link')
        next.rel = 'stylesheet'
        next.href = '/app.css?t=' + Date.now()
        next.onload = () => {
            old.remove()
            resolve()
        }
        old.after(next)
    }),
}
const run = async ({ head, css = '', inject = false, hmr }) => {
    const page = await browser.newPage({ viewport: { width: 1600, height: 800 } })
    await page.route('http://hybrid.local/**', (route) => {
        const url = new URL(route.request().url())
        if (url.pathname === '/tailwind-auto.mjs') return route.fulfill({ contentType: 'text/javascript', body: auto })
        // Phần nạp động (`tailwind-hybrid.mjs`, `tailwind-stylesheet.mjs`...) cạnh bản tailwind-auto đang đo.
        if (url.pathname.endsWith('.mjs')) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(path.dirname(path.resolve(autoPath)), path.basename(url.pathname)), 'utf8') })
        if (url.pathname === '/app.css') return route.fulfill({ contentType: 'text/css', body: css })
        return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>${head}</head><body><div id="app">${inject ? '' : markup}</div></body></html>` })
    })
    await page.goto('http://hybrid.local/')
    await page.waitForTimeout(150)
    if (inject) await page.evaluate((html) => { document.getElementById('app').innerHTML = html }, markup)
    await page.waitForTimeout(150)
    if (hmr) {
        await page.evaluate(HMR[hmr])
        await page.waitForTimeout(150)
    }
    const sigs = []
    for (let i = 0; i < PAIRS.length; i++) {
        // Rời phần tử trước (bố cục trở về trạng thái thường), rồi rê vào góc trên trái: padding đổi khi hover
        // không đẩy con trỏ ra ngoài phần tử.
        await page.mouse.move(1599, 799)
        const box = PAIRS[i][2] === 'hover' ? await page.locator(`[data-k="${i}"]`).boundingBox() : null
        if (box) await page.mouse.move(box.x + 1, box.y + 1)
        sigs.push(await page.evaluate((k) => {
            const props = [...getComputedStyle(document.body)].filter((p) => !p.startsWith('--')).sort()
            const one = (el) => { const cs = getComputedStyle(el); return props.map((p) => p + ':' + cs.getPropertyValue(p)).join(';') }
            const el = document.querySelector(`[data-k="${k}"]`)
            return one(el) + '|' + one(el.firstElementChild)
        }, i))
    }
    await page.close()
    return sigs
}

const reference = await run({ head: `<style>${referenceCss}</style>` })
const script = '<script type="module" src="/tailwind-auto.mjs" data-hybrid></script>'
const variants = {
    'đối chứng: CSS tĩnh @porbit/style đủ mọi class': { head: `<style>${oursFullCss}</style>` },
    'lai <style>: A tĩnh, B động (HTML ban đầu)': { head: `<style>${staticA}</style>${script}` },
    'lai <style>: B tĩnh, A động (HTML ban đầu)': { head: `<style>${staticB}</style>${script}` },
    'lai <style>: A tĩnh, B động (chèn lúc chạy)': { head: `<style>${staticA}</style>${script}`, inject: true },
    'lai <style>: B tĩnh, A động (chèn lúc chạy)': { head: `<style>${staticB}</style>${script}`, inject: true },
    'lai <link>: A tĩnh, B động (chèn lúc chạy)': { head: `<link rel="stylesheet" href="/app.css">${script}`, css: staticA, inject: true },
    'lai <link>: B tĩnh, A động (chèn lúc chạy)': { head: `<link rel="stylesheet" href="/app.css">${script}`, css: staticB, inject: true },
    'lai <style>: A tĩnh, B động, HMR thay <style>': { head: `<style>${staticA}</style>${script}`, inject: true, hmr: 'style' },
    'lai <style>: B tĩnh, A động, HMR thay <style>': { head: `<style>${staticB}</style>${script}`, hmr: 'style' },
    'lai <link>: A tĩnh, B động, HMR thay <link>': { head: `<link rel="stylesheet" href="/app.css">${script}`, css: staticA, inject: true, hmr: 'link' },
    'lai <link>: B tĩnh, A động, HMR thay <link>': { head: `<link rel="stylesheet" href="/app.css">${script}`, css: staticB, inject: true, hmr: 'link' },
    'lai, CSS Tailwind build: A tĩnh, B động, HMR thay <style>': { head: `<style>${twStaticA}</style>${script}`, inject: true, hmr: 'style' },
    'lai, CSS Tailwind build: A tĩnh, B động': { head: `<style>${twStaticA}</style>${script}`, inject: true },
    'lai, CSS Tailwind build: B tĩnh, A động': { head: `<style>${twStaticB}</style>${script}`, inject: true },
}
const report = { pairs: PAIRS.length, variants: {} }
let failed = 0
console.log(`${PAIRS.length} cặp class xung đột, mỗi phía một trang`)
for (const [name, options] of Object.entries(variants)) {
    const sigs = await run(options)
    const wrong = PAIRS.map((pair, i) => (sigs[i] === reference[i] ? null : `${pair[0]} ${pair[1]}`)).filter(Boolean)
    report.variants[name] = { correct: PAIRS.length - wrong.length, total: PAIRS.length, wrong }
    if (wrong.length) failed++
    console.log(`  ${name}: ${PAIRS.length - wrong.length}/${PAIRS.length}${wrong.length ? ` — sai: ${wrong.join(', ')}` : ''}`)
}
await browser.close()
if (write) fs.writeFileSync(path.join(root, 'eval/hybrid-order.json'), JSON.stringify(report, null, 2) + '\n')
process.exit(failed ? 1 : 0)
