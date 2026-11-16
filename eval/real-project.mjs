#!/usr/bin/env node
/**
 * Đo trên dự án thật viết bằng Tailwind v4.
 *
 *   node eval/real-project.mjs                       # fixture shadcn/ui v4 (eval/fixtures/shadcn-v4)
 *   node eval/real-project.mjs --css=<entry.css> --src=<thư mục nguồn> [--import=name=path ...]
 *
 * - Ứng viên: class quét từ mã nguồn, chỉ giữ class mà Tailwind (với CSS của dự án) sinh được CSS.
 * - Phía Tailwind: compile(entry.css) — gồm plugin, @theme, @utility, @custom-variant của dự án.
 * - Phía @porbit/style: "không build" — parseTailwindStylesheet(entry, { resolve }) + tailwindV4Dialect,
 *   import của dự án đọc từ đĩa, plugin lấy từ bản đóng gói sẵn (`@porbit/style/tailwind-plugins`).
 * - So computed style ở 3 trạng thái (mặc định, mở, đóng — thuộc tính `data-*`/`aria-*` trên phần tử và
 *   trên cha `.group`/anh `.peer`) và trong `.dark`.
 * Kết quả in ra và ghi eval/REAL-PROJECT.md.
 */
import { __unstable__loadDesignSystem, compile } from 'tailwindcss'
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const args = (name) => process.argv.filter((a) => a.startsWith(`--${name}=`)).map((a) => a.slice(name.length + 3))
// Mặc định: fixture shadcn/ui v4 trong eval/fixtures (xem README ở đó).
const fixture = path.join(root, 'eval/fixtures/shadcn-v4')
const useFixture = !arg('css')
const entryPath = path.resolve(arg('css') || path.join(fixture, 'app.css'))
const srcDir = path.resolve(arg('src') || path.join(fixture, 'ui'))
const label = arg('label') || (useFixture ? 'shadcn/ui v4' : path.basename(srcDir))
const imports = Object.fromEntries(args('import').map((pair) => pair.split('=')).map(([k, v]) => [k, path.resolve(v)]))
if (useFixture) {
    imports['tw-animate-css'] = path.join(root, 'node_modules/tw-animate-css/dist/tw-animate.css')
    imports['./shadcn-tailwind.css'] = path.join(fixture, 'shadcn-tailwind.css')
}

const entry = fs.readFileSync(entryPath, 'utf8')
const loadStylesheet = async (id, base) => {
    if (imports[id]) return { base, path: imports[id], content: fs.readFileSync(imports[id], 'utf8') }
    const file = id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')
    return { base, path: file, content: fs.readFileSync(path.join(twDir, file), 'utf8') }
}

// Phía "không build": import của dự án đọc từ đĩa, còn lại dùng plugin đóng gói sẵn.
const plugins = await import(path.join(root, 'dist/tailwind-plugins.mjs')).catch(() => null)
const resolve = (id) => (imports[id] ? fs.readFileSync(imports[id], 'utf8') : plugins?.resolveTailwindPlugin(id) ?? null)

const { extractCandidates, extractFromClasses } = await import(path.join(root, 'dist/index.mjs'))
const tw = await import(path.join(root, 'dist/tailwind.mjs'))

const ds = await __unstable__loadDesignSystem(entry, { base: path.dirname(entryPath), loadStylesheet })
const sources = []
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(tsx?|jsx?|html|vue|svelte)$/.test(e.name) && sources.push(path.join(dir, e.name))))
walk(srcDir)
const found = new Set()
for (const file of sources) for (const c of extractCandidates(fs.readFileSync(file, 'utf8'))) found.add(c)
const twCssList = ds.candidatesToCss([...found])
const candidates = [...found].filter((_, i) => twCssList[i])

// Tổ hợp thật: mỗi chuỗi class trong mã (chuỗi trong cn()/cva()/className) và chuỗi gốc của cva() ghép
// với từng biến thể — kiểm thứ tự cascade giữa các class cùng phần tử (`px-4 has-[>svg]:px-3`, `p-2 px-4`...).
const validSet = new Set(candidates)
const combos = new Set()
for (const file of sources) {
    const text = fs.readFileSync(file, 'utf8')
    const toList = (literal) => {
        const tokens = literal.trim().split(/\s+/)
        const ok = tokens.filter((t) => validSet.has(t))
        return tokens.length >= 2 && ok.length / tokens.length >= 0.8 ? ok : null
    }
    for (const m of text.matchAll(/(["'`])((?:(?!\1)[^\\\n])+)\1/g)) {
        const list = toList(m[2])
        if (list && list.length >= 2) combos.add(list.join(' '))
    }
    for (const m of text.matchAll(/cva\(\s*(["'`])([^"'`]+)\1([\s\S]*?)\n\)/g)) {
        const base = toList(m[2])
        if (!base) continue
        for (const v of m[3].matchAll(/(["'`])((?:(?!\1)[^\\\n])+)\1/g)) {
            const list = toList(v[2])
            if (list) combos.add([...base, ...list].join(' '))
        }
    }
}
const comboList = [...combos]

const compiler = await compile(entry, { base: path.dirname(entryPath), loadStylesheet })
const twCss = compiler.build(candidates)

const variantsOf = (c) => {
    const parts = []
    let depth = 0
    let start = 0
    for (let i = 0; i < c.length; i++) {
        if (c[i] === '[' || c[i] === '(') depth++
        else if (c[i] === ']' || c[i] === ')') depth--
        else if (c[i] === ':' && depth === 0) {
            parts.push(c.slice(start, i))
            start = i + 1
        }
    }
    return parts
}

const modes = []
const sheet = tw.parseTailwindStylesheet(entry, { resolve })
if (sheet.unresolved.length) console.warn('chưa giải được:', sheet.unresolved)
modes.push({ name: 'không build (parseTailwindStylesheet)', dialect: tw.tailwindV4Dialect({ preflight: true, darkMode: 'class', theme: sheet.theme, css: sheet.css, utilities: sheet.utilities, variants: sheet.variants }) })
// Plugin PostCSS (thay @tailwindcss/postcss): chạy postcss thật trên file CSS của dự án, tự quét mã nguồn.
if (useFixture) {
    const { default: postcss } = await import('postcss')
    const { default: presenceStylePostcss } = await import(path.join(root, 'dist/postcss.mjs'))
    const processed = await postcss([presenceStylePostcss({ base: srcDir })]).process(entry, { from: entryPath })
    modes.push({ name: 'plugin PostCSS (@porbit/style/postcss)', dialect: modes[0].dialect, css: processed.css })
}

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
const signatures = async (css, html, dark) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.setContent(`<!doctype html><html${dark ? ' class="dark"' : ''}><head><style>${css}</style></head><body>${html}</body></html>`)
    const result = await page.evaluate(() => {
        const props = [...getComputedStyle(document.body)].filter((p) => !p.startsWith('--') || p.startsWith('--tw-')).sort()
        const sig = (el) => {
            const cs = getComputedStyle(el)
            return props.map((p) => (el.dataset.anim && /^(transform|rotate|scale|translate|opacity|filter|height)$/.test(p) ? '' : p + ':' + cs.getPropertyValue(p))).join(';')
        }
        return [...document.querySelectorAll('[data-k]')].map((el) => [sig(el), ...[...el.children].map(sig)].join('|'))
    })
    await page.close()
    return result
}
const diff = (a, b, css) => {
    const map = (s) => new Map(s.split(';').filter(Boolean).map((x) => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1)]))
    const out = []
    a.split('|').forEach((part, i) => {
        const ma = map(part)
        const mb = map(b.split('|')[i] || '')
        for (const [k, v] of ma) {
            if (mb.get(k) === v) continue
            if (k.startsWith('--tw-') && mb.get(k) === undefined && !new RegExp(`var\\(${k}(?![\\w-])`).test(css)) continue
            out.push(`${i ? `con${i}.` : ''}${k}: tw=${v} | ours=${mb.get(k)}`)
        }
    })
    return out
}

// Trạng thái thử: mặc định, "mở/bật" và "đóng/tắt" (thuộc tính đặt trên phần tử và trên cha `.group`/anh `.peer`)
// để biến thể `data-*`, `aria-*`, `@custom-variant data-open`... thật sự được kiểm.
const STATES = {
    'mặc định': '',
    'mở': 'data-state="open" data-open data-active data-checked data-selected="true" data-disabled data-orientation="horizontal" data-side="bottom" data-inset="true" data-size="sm" data-variant="outline" data-slot="x" aria-invalid="true" aria-expanded="true" aria-selected="true" aria-checked="true" aria-disabled="true"',
    'đóng': 'data-state="closed" data-closed data-unchecked data-orientation="vertical" data-side="left" aria-invalid="false" aria-expanded="false"',
}
const htmlFor = (attrs, list = candidates) => list.map((c) => `<div class="group peer" ${attrs}><span class="peer" ${attrs}></span><div data-k ${attrs} class="${escapeHtml(c)}"${/animate|slide|fade|zoom|spin/.test(c) ? ' data-anim="1"' : ''}><i>a</i><i>b</i></div></div>`).join('')
const lines = [`# Đo Trên Dự Án Thật: ${label}`, '', `${sources.length} file nguồn, ${found.size} ứng viên, **${candidates.length} class Tailwind hợp lệ** (Tailwind ${JSON.parse(fs.readFileSync(path.join(twDir, 'package.json'), 'utf8')).version}, Chromium, so computed style ở trạng thái mặc định, mở, đóng và trong \`.dark\`).`, '', `| Chế độ | Chuyển được | ${Object.keys(STATES).map((k) => `Khớp (${k})`).join(' | ')} | Khớp (.dark) |`, `| :--- | ---: | ${Object.keys(STATES).map(() => '---: | ').join('')}---: |`]
const details = []
const summary = {}
for (const mode of modes) {
    const unsupported = candidates.filter((c) => !mode.dialect(c))
    const order = process.env.REVERSE ? [...candidates].reverse() : candidates
    const oursCss = mode.css ?? (await extractFromClasses(order, { hashClassName: false, silent: true, minify: true, dialects: [mode.dialect] })).css
    const counts = {}
    let twDefault = null
    const exercised = {}
    const runs = [...Object.entries(STATES).map(([name, attrs]) => [name, attrs, false]), ['.dark', '', true]]
    for (const [name, attrs, dark] of runs) {
        const html = htmlFor(attrs)
        const [a, b] = await Promise.all([signatures(twCss, html, dark), signatures(oursCss, html, dark)])
        const failed = candidates.map((c, i) => [c, diff(a[i], b[i], oursCss)]).filter(([, d]) => d.length)
        counts[name] = candidates.length - failed.length
        // Số class mà chính Tailwind cho style khác lượt mặc định: chứng tỏ lượt này kiểm được biến thể.
        if (!twDefault) twDefault = a
        else exercised[name] = a.filter((sig, i) => sig !== twDefault[i]).length
        details.push(`### ${mode.name} — ${name}: lệch ${failed.length}`, '', ...failed.slice(0, 40).map(([c, d]) => `- \`${c}\`: ${d.slice(0, 2).map((x) => '`' + x.slice(0, 140) + '`').join('; ')}`), '')
    }
    const pct = (n) => `${n}/${candidates.length} (${((100 * n) / candidates.length).toFixed(1)}%)`
    lines.push(`| ${mode.name} | ${pct(candidates.length - unsupported.length)} | ${runs.map(([name]) => pct(counts[name])).join(' | ')} |`)
    summary[mode.name] = { converted: candidates.length - unsupported.length, total: candidates.length, matched: counts, exercised }
    lines.push('', `Số class Tailwind đổi style so với lượt mặc định (biến thể được kiểm): ${Object.entries(exercised).map(([k, n]) => `${k} ${n}`).join(', ')}.`)
    // Tổ hợp thật (nhiều class trên một phần tử).
    const comboCounts = {}
    for (const [name, attrs, dark] of runs) {
        const html = htmlFor(attrs, comboList)
        const [a, b] = await Promise.all([signatures(twCss, html, dark), signatures(oursCss, html, dark)])
        const failed = comboList.map((c, i) => [c, diff(a[i], b[i], oursCss)]).filter(([, d]) => d.length)
        comboCounts[name] = comboList.length - failed.length
        details.push(`### ${mode.name} — tổ hợp, ${name}: lệch ${failed.length}`, '', ...failed.slice(0, 25).map(([c, d]) => `- \`${c}\`: ${d.slice(0, 2).map((x) => '`' + x.slice(0, 140) + '`').join('; ')}`), '')
    }
    summary[mode.name].combos = { total: comboList.length, matched: comboCounts }
    lines.push('', `Tổ hợp thật (${comboList.length} chuỗi class của component, nhiều class trên một phần tử): ${runs.map(([name]) => `${name} ${comboCounts[name]}/${comboList.length}`).join(' · ')}.`)
    const byVariant = {}
    for (const c of unsupported) {
        const v = variantsOf(c).join(':') || '(gốc)'
        ;(byVariant[v] ||= []).push(c)
    }
    details.push(`### ${mode.name} — chưa chuyển (${unsupported.length})`, '', ...Object.entries(byVariant).sort((a, b) => b[1].length - a[1].length).slice(0, 30).map(([v, list]) => `- \`${v}\` (${list.length}): ${list.slice(0, 6).map((c) => '`' + c + '`').join(' ')}`), '')
}
await browser.close()
lines.push('', ...details)
fs.writeFileSync(path.join(root, `eval/REAL-PROJECT.md`), lines.join('\n'))
fs.writeFileSync(path.join(root, `eval/real-project.json`), JSON.stringify({ label, candidates: candidates.length, summary }, null, 2) + '\n')
console.log(lines.filter((l) => l.startsWith('|') || l.startsWith('Tổ hợp')).join('\n'))
