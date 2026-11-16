#!/usr/bin/env node
/**
 * Đo trên dự án thật viết bằng Tailwind v4.
 *
 *   node eval/real-project.mjs                       # fixture shadcn/ui v4 (eval/fixtures/shadcn-v4)
 *   node eval/real-project.mjs --fixture=<tên>       # eval/fixtures/<tên>/fixture.json (hyperui, magicui, coss-ui...)
 *   node eval/real-project.mjs --css=<entry.css> --src=<thư mục nguồn> [--import=name=path ...]
 *   node eval/real-project.mjs --all                 # chạy mọi dự án rồi tổng hợp eval/REAL-PROJECTS.md
 *   node eval/real-project.mjs --summary             # chỉ tổng hợp lại eval/REAL-PROJECTS.md từ các file JSON
 *
 * - Ứng viên: class quét từ mã nguồn, chỉ giữ class mà Tailwind (với CSS của dự án) sinh được CSS.
 * - Phía Tailwind: compile(entry.css) — gồm plugin, @theme, @utility, @custom-variant của dự án.
 * - Phía @porbit/style: "không build" — parseTailwindStylesheet(entry, { resolve }) + tailwindV4Dialect,
 *   import của dự án đọc từ đĩa, plugin lấy từ bản đóng gói sẵn (`@porbit/style/tailwind-plugins`).
 * - So computed style ở 3 trạng thái (mặc định, mở, đóng — thuộc tính `data-*`/`aria-*` trên phần tử và
 *   trên cha `.group`/anh `.peer`), trong `.dark`, khi ép `:hover`/`:focus`/`:focus-visible`/`:active`
 *   (CDP `CSS.forcePseudoState` trên phần tử, cha `.group` và anh `.peer`) và ở các độ rộng 375/768/1600 px
 *   (lượt mặc định là 1280 px).
 * Kết quả in ra và ghi eval/REAL-PROJECT.md (dự án khác: eval/REAL-PROJECT-<nhãn>.md + .json).
 */
import { __unstable__loadDesignSystem, compile } from 'tailwindcss'
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const twVersion = JSON.parse(fs.readFileSync(path.join(twDir, 'package.json'), 'utf8')).version
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const args = (name) => process.argv.filter((a) => a.startsWith(`--${name}=`)).map((a) => a.slice(name.length + 3))
const flag = (name) => process.argv.includes(`--${name}`)
const fixturesDir = path.join(root, 'eval/fixtures')

// Các dự án của bảng tổng hợp: fixture mặc định (shadcn/ui), mọi eval/fixtures/<tên>/fixture.json, hai fixture v3.
const PROJECTS = [
    { name: 'shadcn-v4', file: 'eval/real-project.json', argv: [], source: 'shadcn/ui `new-york-v4/ui`, MIT' },
    ...fs
        .readdirSync(fixturesDir)
        .filter((d) => fs.existsSync(path.join(fixturesDir, d, 'fixture.json')))
        .sort()
        .map((d) => {
            const meta = JSON.parse(fs.readFileSync(path.join(fixturesDir, d, 'fixture.json'), 'utf8'))
            return { name: d, file: `eval/real-project-${d}.json`, argv: [`--fixture=${d}`], source: `${meta.source}, ${meta.license}` }
        }),
    { name: 'v3-extend', file: 'eval/real-project-v3-extend.json', argv: ['--css=eval/fixtures/v3-config/app.css', '--src=eval/fixtures/v3-config/src', '--label=v3-extend'], source: '`tailwind.config.js` kiểu v3 với `theme.extend` (tự viết)' },
    { name: 'v3-replace', file: 'eval/real-project-v3-replace.json', argv: ['--css=eval/fixtures/v3-config/replace/app.css', '--src=eval/fixtures/v3-config/replace', '--label=v3-replace'], source: 'cấu hình v3 thay hẳn theme (tự viết)' },
]
// Bảng tổng hợp eval/REAL-PROJECTS.md từ các file JSON đã có.
const writeSummary = () => {
    const rows = PROJECTS.filter((p) => fs.existsSync(path.join(root, p.file))).map((p) => ({ ...p, data: JSON.parse(fs.readFileSync(path.join(root, p.file), 'utf8')) }))
    const runNames = [...new Set(rows.flatMap((r) => Object.values(r.data.summary).flatMap((m) => Object.keys(m.matched))))]
    const cell = (n, total) => (n === undefined ? '—' : n === total ? `${n}` : `**${n}**`)
    const short = (mode) => (mode.startsWith('plugin') ? 'PostCSS' : 'không build')
    const out = [
        '# Đo Trên Nhiều Dự Án Thật',
        '',
        `Sinh bởi \`npm run build && node eval/real-project.mjs --all\` (tailwindcss@${twVersion}, Chromium). Mỗi class hợp lệ của dự án (quét từ mã nguồn, chỉ giữ class mà Tailwind sinh được CSS với chính file CSS của dự án: \`@theme\`, \`@utility\`, \`@custom-variant\`, \`@plugin\`) được render hai lần — với CSS do Tailwind thật sinh và với CSS do @porbit/style sinh — rồi so TOÀN BỘ computed style của phần tử và hai phần tử con.`,
        '',
        'Lượt đo: **mặc định** (1280 px) · **mở**/**đóng** (`data-state`, `data-open`, `aria-*`... đặt trên phần tử, cha `.group`, anh `.peer`) · **.dark** · **:hover**, **:focus** (kèm `:focus-within`), **:focus-visible** (kèm `:focus`), **:active** (kèm `:hover`) ép bằng CDP `CSS.forcePseudoState` trên phần tử, cha `.group`, anh `.peer` · **375/768/1600px** (độ rộng khung nhìn). Hai chế độ: "không build" (`parseTailwindStylesheet` + `tailwindV4Dialect`) và plugin PostCSS. Ô **in đậm** là lượt có lệch.',
        '',
        '## Từng Class',
        '',
        `| Dự án | Chế độ | Class | Chuyển được | ${runNames.join(' | ')} |`,
        `| :--- | :--- | ---: | ---: | ${runNames.map(() => '---:').join(' | ')} |`,
    ]
    for (const r of rows) for (const [mode, m] of Object.entries(r.data.summary)) out.push(`| ${r.data.label} | ${short(mode)} | ${m.total} | ${cell(m.converted, m.total)} | ${runNames.map((k) => cell(m.matched[k], m.total)).join(' | ')} |`)
    out.push('', '## Tổ Hợp (Chuỗi Class Thật Trên Một Phần Tử)', '', `| Dự án | Chế độ | Tổ hợp | ${runNames.join(' | ')} |`, `| :--- | :--- | ---: | ${runNames.map(() => '---:').join(' | ')} |`)
    for (const r of rows) for (const [mode, m] of Object.entries(r.data.summary)) if (m.combos) out.push(`| ${r.data.label} | ${short(mode)} | ${m.combos.total} | ${runNames.map((k) => cell(m.combos.matched[k], m.combos.total)).join(' | ')} |`)
    out.push('', '## Lượt Có Chạm Biến Thể Không', '', 'Số class mà chính Tailwind cho computed style khác lượt mặc định (0 nghĩa là lượt đó không kiểm được biến thể nào của dự án).', '', `| Dự án | ${runNames.slice(1).join(' | ')} |`, `| :--- | ${runNames.slice(1).map(() => '---:').join(' | ')} |`)
    for (const r of rows) {
        const m = Object.values(r.data.summary)[0]
        out.push(`| ${r.data.label} | ${runNames.slice(1).map((k) => m.exercised?.[k] ?? '—').join(' | ')} |`)
    }
    out.push('', '## Nguồn', '', ...rows.map((r) => `- **${r.data.label}** — ${r.source}. Chi tiết lệch: \`${r.file.replace('real-project', 'REAL-PROJECT').replace('.json', '.md')}\`.`), '', 'Nguồn, giấy phép và phần đã chỉnh của từng fixture: README trong `eval/fixtures/<tên>/`.', '')
    // Phần phân tích viết tay (từ "## Phân Tích Lệch" trở đi) được giữ nguyên khi dựng lại bảng.
    const file = path.join(root, 'eval/REAL-PROJECTS.md')
    const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    const keep = old.indexOf('## Phân Tích Lệch')
    fs.writeFileSync(file, out.join('\n') + (keep >= 0 ? '\n' + old.slice(keep) : ''))
    console.log(out.filter((l) => l.startsWith('|')).join('\n'))
}
if (flag('summary') || flag('all')) {
    if (flag('all')) {
        for (const p of PROJECTS) {
            console.log(`\n== ${p.name}`)
            const r = spawnSync(process.execPath, [new URL(import.meta.url).pathname, ...p.argv], { cwd: root, stdio: 'inherit' })
            if (r.status !== 0) process.exitCode = 1
        }
    }
    writeSummary()
    process.exit()
}

// Fixture: mặc định shadcn/ui v4 (eval/fixtures/shadcn-v4, xem README ở đó). `--fixture=<tên>` đọc
// eval/fixtures/<tên>/fixture.json: { label, css, src, imports: { "id": "đường dẫn tương đối với thư mục fixture" } }.
const fixtureName = arg('fixture')
const fixture = path.join(fixturesDir, fixtureName || 'shadcn-v4')
const meta = fixtureName ? JSON.parse(fs.readFileSync(path.join(fixture, 'fixture.json'), 'utf8')) : null
const useFixture = !arg('css') && !fixtureName
const entryPath = path.resolve(arg('css') || path.join(fixture, meta?.css || 'app.css'))
const srcDir = path.resolve(arg('src') || path.join(fixture, meta?.src || 'ui'))
const label = arg('label') || meta?.label || (useFixture ? 'shadcn/ui v4' : path.basename(srcDir))
const imports = Object.fromEntries(args('import').map((pair) => pair.split('=')).map(([k, v]) => [k, path.resolve(v)]))
if (useFixture) {
    imports['tw-animate-css'] = path.join(root, 'node_modules/tw-animate-css/dist/tw-animate.css')
    imports['./shadcn-tailwind.css'] = path.join(fixture, 'shadcn-tailwind.css')
}
for (const [id, file] of Object.entries(meta?.imports || {})) imports[id] = path.resolve(fixture, file)

const entry = fs.readFileSync(entryPath, 'utf8')
// Plugin JS và `@config` (cấu hình kiểu v3) của dự án.
const loadModule = async (id, base) => ({ base, path: id, module: require(id.startsWith('.') ? path.resolve(base, id) : require.resolve(id, { paths: [base, root] })) })
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

const ds = await __unstable__loadDesignSystem(entry, { base: path.dirname(entryPath), loadStylesheet, loadModule })
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

const compiler = await compile(entry, { base: path.dirname(entryPath), loadStylesheet, loadModule })
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
const { createConfigLoader, createTailwindPluginLoader } = await import(path.join(root, 'dist/postcss.mjs'))
// Plugin JS của `@config` chạy qua API giả lập; `apply` gộp utility/biến thể có tên không viết được bằng CSS
// (`x-0.5`, biến thể hàm `name-*` của `matchVariant`).
const jsPlugins = createTailwindPluginLoader(path.dirname(entryPath))
const sheet = jsPlugins.apply(tw.parseTailwindStylesheet(entry, { resolve, loadConfig: createConfigLoader(path.dirname(entryPath), jsPlugins) }))
if (sheet.unresolved.length) console.warn('chưa giải được:', sheet.unresolved)
modes.push({ name: 'không build (parseTailwindStylesheet)', dialect: tw.tailwindV4Dialect({ preflight: true, darkMode: arg('dark') === 'media' ? 'media' : 'class', theme: sheet.theme, css: sheet.css, utilities: sheet.utilities, variants: sheet.variants, prefix: sheet.prefix, important: sheet.important, blocklist: sheet.blocklist }) })
// Plugin PostCSS (thay @tailwindcss/postcss): chạy postcss thật trên file CSS của dự án, tự quét mã nguồn.
{
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
const signatures = async (css, html, run = {}) => {
    const page = await browser.newPage({ viewport: { width: run.width || 1280, height: 800 } })
    await page.setContent(`<!doctype html><html${run.dark ? ' class="dark"' : ''}><head><style>${css}</style></head><body>${html}</body></html>`)
    // Ép trạng thái giả (:hover/:focus...) như DevTools, trên phần tử đo, cha `.group` và anh `.peer`.
    if (run.force) {
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('DOM.enable')
        await cdp.send('CSS.enable')
        const { root: doc } = await cdp.send('DOM.getDocument', { depth: 0 })
        const nodes = new Set()
        for (const selector of ['[data-k]', '.group', '.peer']) for (const id of (await cdp.send('DOM.querySelectorAll', { nodeId: doc.nodeId, selector })).nodeIds) nodes.add(id)
        await Promise.all([...nodes].map((nodeId) => cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: run.force })))
    }
    const result = await page.evaluate(() => {
        // Đổi trạng thái (ép :hover...) làm `transition-*` chạy: đo ở giá trị cuối, không phải giữa chừng
        // (giá trị giữa chừng phụ thuộc thời điểm đo, hai phía lệch ngẫu nhiên).
        void document.body.offsetWidth
        // `animate-*` (CSSAnimation) dừng ở thời điểm 0 cho hai phía như nhau (không thì `background-position`
        // của animate-gradient/aurora... lệch theo thời điểm đo).
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
// Trạng thái ép bằng CDP: tập lớp giả gần với thao tác thật (focus-visible kéo theo focus, active kéo theo hover).
const FORCED = {
    ':hover': ['hover'],
    ':focus': ['focus', 'focus-within'],
    ':focus-visible': ['focus', 'focus-visible', 'focus-within'],
    ':active': ['hover', 'active'],
}
// Độ rộng khung nhìn (lượt mặc định là 1280 px = xl): dưới sm, đúng md, đúng 3xl của shadcn/coss (1600px).
const WIDTHS = [375, 768, 1600]
const runs = [
    ...Object.entries(STATES).map(([name, attrs]) => ({ name, attrs })),
    { name: '.dark', attrs: '', dark: true },
    ...Object.entries(FORCED).map(([name, force]) => ({ name, attrs: '', force })),
    ...WIDTHS.map((width) => ({ name: `${width}px`, attrs: '', width })),
]
// Phía Tailwind giống nhau giữa hai chế độ: nhớ chữ ký theo (lượt, danh sách).
const twCache = new Map()
const twSignatures = (run, kind, html) => {
    const key = run.name + '|' + kind
    if (!twCache.has(key)) twCache.set(key, signatures(twCss, html, run))
    return twCache.get(key)
}
// Phần tử cuối không có class: mốc để biết lượt nào đổi style chỉ vì trình duyệt (outline mặc định của
// :focus-visible, kích thước theo khung nhìn), không phải vì biến thể của dự án.
const htmlFor = (attrs, list = candidates) => [...list, ''].map((c) => `<div class="group peer" ${attrs}><span class="peer" ${attrs}></span><div data-k ${attrs} class="${escapeHtml(c)}"${/animate|slide|fade|zoom|spin/.test(c) ? ' data-anim="1"' : ''}><i>a</i><i>b</i></div></div>`).join('')
// Class được lượt này "chạm": tập thuộc tính đổi so với lượt mặc định khác hẳn của phần tử mốc.
const changedProps = (before, after) => {
    const out = new Set()
    const pa = before.split('|')
    after.split('|').forEach((part, i) => {
        const a = new Set((pa[i] || '').split(';'))
        for (const x of part.split(';')) if (!a.has(x)) out.add(i + '.' + x.slice(0, x.indexOf(':')))
    })
    return out
}
const exercisedCount = (base, sig) => {
    const ref = changedProps(base.at(-1), sig.at(-1))
    return sig.slice(0, -1).filter((s, i) => [...changedProps(base[i], s)].some((p) => !ref.has(p))).length
}
const lines = [`# Đo Trên Dự Án Thật: ${label}`, '', `${sources.length} file nguồn, ${found.size} ứng viên, **${candidates.length} class Tailwind hợp lệ** (Tailwind ${twVersion}, Chromium, so computed style ở trạng thái mặc định (1280 px), mở, đóng, trong \`.dark\`, khi ép \`:hover\`/\`:focus\`/\`:focus-visible\`/\`:active\` trên phần tử, cha \`.group\` và anh \`.peer\`, và ở độ rộng ${WIDTHS.join('/')} px).`, '', `| Chế độ | Chuyển được | ${runs.map((r) => `Khớp (${r.name})`).join(' | ')} |`, `| :--- | ---: | ${runs.map(() => '---:').join(' | ')} |`]
const details = []
const summary = {}
for (const mode of modes) {
    const unsupported = candidates.filter((c) => !mode.dialect(c))
    const order = process.env.REVERSE ? [...candidates].reverse() : candidates
    const oursCss = mode.css ?? (await extractFromClasses(order, { hashClassName: false, silent: true, minify: true, dialects: [mode.dialect] })).css
    const counts = {}
    let twDefault = null
    const exercised = {}
    for (const run of runs) {
        const { name } = run
        const html = htmlFor(run.attrs)
        const [a, b] = await Promise.all([twSignatures(run, 'class', html), signatures(oursCss, html, run)])
        const failed = candidates.map((c, i) => [c, diff(a[i], b[i], oursCss)]).filter(([, d]) => d.length)
        counts[name] = candidates.length - failed.length
        // Số class mà chính Tailwind cho style khác lượt mặc định: chứng tỏ lượt này kiểm được biến thể.
        if (!twDefault) twDefault = a
        else exercised[name] = exercisedCount(twDefault, a)
        details.push(`### ${mode.name} — ${name}: lệch ${failed.length}`, '', ...failed.slice(0, 40).map(([c, d]) => `- \`${c}\`: ${d.slice(0, 2).map((x) => '`' + x.slice(0, 140) + '`').join('; ')}`), '')
    }
    const pct = (n) => `${n}/${candidates.length} (${((100 * n) / candidates.length).toFixed(1)}%)`
    lines.push(`| ${mode.name} | ${pct(candidates.length - unsupported.length)} | ${runs.map(({ name }) => pct(counts[name])).join(' | ')} |`)
    summary[mode.name] = { converted: candidates.length - unsupported.length, total: candidates.length, matched: counts, exercised }
    lines.push('', `Số class Tailwind đổi style so với lượt mặc định (biến thể được kiểm): ${Object.entries(exercised).map(([k, n]) => `${k} ${n}`).join(', ')}.`)
    // Tổ hợp thật (nhiều class trên một phần tử).
    const comboCounts = {}
    for (const run of runs) {
        const { name } = run
        const html = htmlFor(run.attrs, comboList)
        const [a, b] = await Promise.all([twSignatures(run, 'combo', html), signatures(oursCss, html, run)])
        const failed = comboList.map((c, i) => [c, diff(a[i], b[i], oursCss)]).filter(([, d]) => d.length)
        comboCounts[name] = comboList.length - failed.length
        details.push(`### ${mode.name} — tổ hợp, ${name}: lệch ${failed.length}`, '', ...failed.slice(0, 25).map(([c, d]) => `- \`${c}\`: ${d.slice(0, 2).map((x) => '`' + x.slice(0, 140) + '`').join('; ')}`), '')
    }
    summary[mode.name].combos = { total: comboList.length, matched: comboCounts }
    lines.push('', `Tổ hợp thật (${comboList.length} chuỗi class của component, nhiều class trên một phần tử): ${runs.map(({ name }) => `${name} ${comboCounts[name]}/${comboList.length}`).join(' · ')}.`)
    const byVariant = {}
    for (const c of unsupported) {
        const v = variantsOf(c).join(':') || '(gốc)'
        ;(byVariant[v] ||= []).push(c)
    }
    details.push(`### ${mode.name} — chưa chuyển (${unsupported.length})`, '', ...Object.entries(byVariant).sort((a, b) => b[1].length - a[1].length).slice(0, 30).map(([v, list]) => `- \`${v}\` (${list.length}): ${list.slice(0, 6).map((c) => '`' + c + '`').join(' ')}`), '')
}
await browser.close()
lines.push('', ...details)
// Fixture mặc định: eval/REAL-PROJECT.md; dự án khác: eval/REAL-PROJECT-<nhãn>.md.
const suffix = useFixture ? '' : '-' + (fixtureName || label.replace(/[^\w-]+/g, '-'))
fs.writeFileSync(path.join(root, `eval/REAL-PROJECT${suffix}.md`), lines.join('\n'))
fs.writeFileSync(path.join(root, `eval/real-project${suffix}.json`), JSON.stringify({ label, candidates: candidates.length, summary }, null, 2) + '\n')
console.log(lines.filter((l) => l.startsWith('|') || l.startsWith('Tổ hợp')).join('\n'))
