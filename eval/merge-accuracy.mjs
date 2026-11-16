#!/usr/bin/env node
/**
 * Độ đúng khi gộp class xung đột: `@porbit/style/merge` so với tailwind-merge, chuẩn là hiển thị thật.
 *
 *   npm run build && node eval/merge-accuracy.mjs
 *
 * Với mỗi cặp `a b` (class sau phải thắng — cách dùng `cn(base, override)`):
 *   - Chuẩn: CSS Tailwind của `a` + CSS của `b` được nâng ưu tiên và chỉ áp cho phần tử của cặp đó.
 *   - Mỗi cách gộp cho ra chuỗi class, hiển thị bằng CSS Tailwind bình thường; so computed style với chuẩn.
 * Cặp lấy từ class của shadcn/ui (cùng gốc, gốc liên quan như p/px/pt, rounded/rounded-t, text-sm/leading)
 * và cặp ngẫu nhiên. Kết quả: eval/merge-accuracy.json.
 */
import { __unstable__loadDesignSystem, compile } from 'tailwindcss'
import { chromium } from 'playwright'
import { twMerge } from 'tailwind-merge'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const loadStylesheet = async (id, base) => ({ base, path: id, content: fs.readFileSync(path.join(twDir, id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')), 'utf8') })
const { cn: ours } = await import(path.join(root, 'dist/merge.mjs'))
const { extractCandidates } = await import(path.join(root, 'dist/index.mjs'))

const ds = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: twDir, loadStylesheet })
const compiler = await compile('@import "tailwindcss";', { base: twDir, loadStylesheet })

// Class của shadcn/ui (hợp lệ với Tailwind mặc định) + một số utility hay ghi đè.
const fixture = path.join(root, 'eval/fixtures/shadcn-v4/ui')
const found = new Set(['p-0', 'p-1', 'p-4', 'px-1', 'px-6', 'py-0', 'pt-2', 'pb-0', 'pl-3', 'pr-8', 'ps-2', 'pe-4', 'm-0', 'mx-auto', 'my-2', 'mt-4', 'ml-2', 'inset-0', 'top-0', 'left-4', 'inset-x-2', 'rounded', 'rounded-none', 'rounded-full', 'rounded-t-lg', 'rounded-l-none', 'rounded-tl-sm', 'border', 'border-0', 'border-2', 'border-t', 'border-x-4', 'border-red-500', 'border-t-blue-500', 'border-dashed', 'text-xs', 'text-lg', 'text-red-500', 'leading-tight', 'leading-8', 'font-bold', 'font-mono', 'shadow-lg', 'shadow-none', 'shadow-red-500', 'ring-0', 'ring-4', 'ring-blue-500', 'gap-0', 'gap-x-8', 'gap-y-1', 'overflow-auto', 'overflow-x-hidden', 'flex-1', 'flex-none', 'grow', 'shrink-0', 'basis-1/2', 'w-full', 'w-4', 'h-12', 'size-12', 'min-w-0', 'max-w-sm', 'bg-blue-500', 'bg-transparent', 'bg-linear-to-r', 'from-red-500', 'opacity-0', 'opacity-100', 'transition', 'transition-none', 'duration-500', 'ease-in', 'grid-cols-2', 'grid-cols-3', 'col-span-2', 'col-start-1', 'justify-start', 'items-end', 'hidden', 'block', 'inline-flex', 'translate-x-1', 'translate-y-2', 'scale-90', 'rotate-45', 'z-10', 'z-50', 'outline-none', 'outline-2', 'underline', 'no-underline', 'decoration-2', 'tracking-wide', 'whitespace-normal', 'truncate', 'line-clamp-2'])
for (const file of fs.readdirSync(fixture)) for (const c of extractCandidates(fs.readFileSync(path.join(fixture, file), 'utf8'))) found.add(c)
// Bỏ animation (hiển thị phụ thuộc thời gian).
const valid = [...found].filter((c) => !/animate-|^(fade|zoom|spin|slide)-|:(fade|zoom|spin|slide)-/.test(c) && ds.candidatesToCss([c])[0])
const baseOf = (c) => c.slice(c.lastIndexOf(':') + 1).replace(/^!|!$/g, '')
const variantOf = (c) => c.slice(0, c.lastIndexOf(':') + 1)
const stem = (c) => baseOf(c).replace(/-\[.*\]$|-\(.*\)$|\/.*$/, '').replace(/-[^-]+$/, '')
const RELATED = [['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'], ['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me'], ['inset', 'inset-x', 'inset-y', 'top', 'right', 'bottom', 'left', 'start', 'end'], ['rounded', 'rounded-t', 'rounded-b', 'rounded-l', 'rounded-r', 'rounded-tl', 'rounded-tr', 'rounded-bl', 'rounded-br', 'rounded-s', 'rounded-e'], ['border', 'border-t', 'border-b', 'border-x', 'border-y', 'border-l', 'border-r'], ['text', 'leading', 'font'], ['shadow', 'ring', 'inset-shadow'], ['gap', 'gap-x', 'gap-y'], ['overflow', 'overflow-x', 'overflow-y'], ['flex', 'grow', 'shrink', 'basis'], ['w', 'h', 'size', 'min-w', 'max-w'], ['bg', 'from', 'to', 'via'], ['transition', 'duration', 'ease', 'delay'], ['translate', 'translate-x', 'translate-y', 'scale', 'rotate'], ['outline', 'ring', 'border'], ['grid-cols', 'col-span', 'col-start'], ['hidden', 'block', 'inline-flex', 'flex', 'grid', 'inline', 'inline-block']]
const relatedOf = new Map()
for (const group of RELATED) for (const s of group) relatedOf.set(s, new Set([...(relatedOf.get(s) || []), ...group]))
let seed = 11
const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = (list) => list[Math.floor(random() * list.length)]
const pairs = new Set()
const byStem = new Map()
for (const c of valid) (byStem.get(stem(c)) || byStem.set(stem(c), []).get(stem(c))).push(c)
for (const c of valid) {
    const same = (byStem.get(stem(c)) || []).filter((x) => x !== c && variantOf(x) === variantOf(c))
    if (same.length) pairs.add(`${c} ${pick(same)}`)
    const rel = [...(relatedOf.get(stem(c)) || relatedOf.get(baseOf(c).split('-')[0]) || [])].flatMap((s) => byStem.get(s) || []).filter((x) => x !== c && variantOf(x) === variantOf(c))
    if (rel.length) pairs.add(`${c} ${pick(rel)}`)
    pairs.add(`${c} ${pick(valid)}`)
}
const pairList = (process.env.PAIRS ? process.env.PAIRS.split(',') : [...pairs]).filter((p) => p.split(' ')[0] !== p.split(' ')[1])

const escapeClass = (c) => c.replace(/[^\w-]/g, (ch) => '\\' + ch)
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
const render = async (css, items) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${items.map(([id, cls]) => `<div id="${id}"><div data-k class="${cls}"><i>a</i></div></div>`).join('')}</body></html>`)
    const sigs = await page.evaluate(() => {
        const props = [...getComputedStyle(document.body)].filter((p) => !p.startsWith('--')).sort()
        const sig = (el) => { const cs = getComputedStyle(el); return props.map((p) => p + ':' + cs.getPropertyValue(p)).join(';') }
        return [...document.querySelectorAll('[data-k]')].map((el) => sig(el) + '|' + sig(el.firstElementChild))
    })
    await page.close()
    return sigs
}

const evaluate = async (label, list, css, methods) => {
    const ids = list.map((_, i) => `p${i}`)
    const allClasses = [...new Set(list.flatMap((p) => p.split(' ')))]
    const baseCss = css.compiler.build(allClasses)
    const truthCss = baseCss + list.map((p, i) => {
        const [, b] = p.split(' ')
        const cssB = css.ds.candidatesToCss([b])[0].split(`.${escapeClass(b)}`).join(`.${escapeClass(b)}:is(#${ids[i]} *, #${ids[i]})`)
        return `@layer utilities {\n${cssB}\n}`
    }).join('\n')
    const truth = await render(truthCss, list.map((p, i) => [ids[i], p]))
    const result = { pairs: list.length, methods: {} }
    console.log(`\n${label}: ${list.length} cặp`)
    for (const [name, fn] of Object.entries(methods)) {
        const outputs = list.map((p) => fn(p))
        const sigs = await render(baseCss, outputs.map((cls, i) => [ids[i], cls]))
        const wrong = list.map((p, i) => [p, outputs[i]]).filter((_, i) => sigs[i] !== truth[i])
        result.methods[name] = { correct: list.length - wrong.length, percent: Number((100 * (1 - wrong.length / list.length)).toFixed(2)), sample: wrong.slice(0, 15).map(([p, o]) => `${p} -> ${o}`) }
        console.log(`  ${name}: ${list.length - wrong.length}/${list.length} cặp hiển thị đúng (${result.methods[name].percent}%)`)
        wrong.slice(0, 5).forEach(([p, o]) => console.log(`     ✗ ${p} -> ${o}`))
    }
    return result
}

const report = {}
const lite = await import(path.join(root, 'dist/merge-lite.mjs'))
const twDefault = (await import(path.join(root, 'dist/tailwind.mjs'))).tailwindV4Dialect()
// Bảng sinh lúc build từ class của dự án (như plugin Vite/CLI làm).
const liteDefault = lite.createMerge({ table: lite.buildMergeTable(pairList.flatMap((p) => p.split(' ')), twDefault) })
report.tailwind = await evaluate('Tailwind mặc định (class của shadcn/ui và utility hay ghi đè)', pairList, { ds, compiler }, {
    'không gộp': (s) => s,
    'tailwind-merge 3.7': (s) => twMerge(s),
    '@porbit/style/merge': (s) => ours(s),
    '@porbit/style/merge/lite + bảng': (s) => liteDefault(s),
})

// (Không dùng `content-visibility: hidden`: trình duyệt bỏ tính style của phần tử con nên phép đo dao động.)
// Cấu hình riêng của dự án: tailwind-merge chỉ đúng khi cấu hình tay (extendTailwindMerge); @porbit/style đọc từ CSS.
const PROJECT_CSS = `@import "tailwindcss";
@import "tw-animate-css";
@theme { --text-hero: 3.5rem; --text-tiny: 0.625rem; --color-brand: #0a64e8; --radius-blob: 2rem; --shadow-soft: 0 2px 8px rgb(0 0 0 / 0.08); --spacing-gutter: 1.5rem; --font-display: Georgia, serif; --tracking-loose: 0.08em; --leading-snugger: 1.2; }
@utility tab-* { tab-size: --value(integer); }
@utility snap-x-strict { scroll-snap-type: x mandatory; }
@utility snap-none-x { scroll-snap-type: none; }
@custom-variant pointer-fine (@media (pointer: fine));`
const animatePath = path.join(root, 'node_modules/tw-animate-css/dist/tw-animate.css')
const loadProject = async (id, base) => (id === 'tw-animate-css' ? { base, path: id, content: fs.readFileSync(animatePath, 'utf8') } : loadStylesheet(id, base))
const ds2 = await __unstable__loadDesignSystem(PROJECT_CSS, { base: twDir, loadStylesheet: loadProject })
const compiler2 = await compile(PROJECT_CSS, { base: twDir, loadStylesheet: loadProject })
const tw = await import(path.join(root, 'dist/tailwind.mjs'))
const { createMerge, clsx } = await import(path.join(root, 'dist/merge.mjs'))
const { resolveTailwindPlugin } = await import(path.join(root, 'dist/tailwind-plugins.mjs'))
const sheet = tw.parseTailwindStylesheet(PROJECT_CSS, { resolve: resolveTailwindPlugin })
const projectMerge = createMerge({ dialect: tw.tailwindV4Dialect({ theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants }) })
const PROJECT_PAIRS = [
    'text-sm text-hero', 'text-hero text-sm', 'text-tiny text-lg', 'text-red-500 text-hero', 'text-hero text-brand', 'text-brand text-red-500',
    'bg-brand bg-red-500', 'bg-red-500 bg-brand', 'border-brand border-red-500', 'rounded-md rounded-blob', 'rounded-blob rounded-t-none', 'rounded-blob rounded-lg',
    'shadow-md shadow-soft', 'shadow-soft shadow-none', 'shadow-soft shadow-red-500', 'p-4 p-gutter', 'px-gutter px-2', 'gap-gutter gap-4', 'm-gutter mx-0',
    'font-sans font-display', 'font-display font-bold', 'tracking-wide tracking-loose', 'leading-tight leading-snugger',
    'tab-4 tab-8', 'tab-8 tab-2', 'snap-x-strict snap-none-x', 'snap-none-x snap-x-strict',
    'fade-in-0 fade-in-50', 'zoom-in-95 zoom-in-50', 'slide-in-from-top-2 slide-in-from-top-8', 'slide-in-from-left-2 slide-in-from-left-4', 'spin-in-45 spin-in-90',
    'duration-200 duration-500', 'delay-100 delay-300', 'repeat-1 repeat-infinite',
    'pointer-fine:p-2 pointer-fine:p-4', 'pointer-fine:bg-brand pointer-fine:bg-red-500', 'pointer-fine:text-hero pointer-fine:text-sm',
]
const projectLite = lite.createMerge({ table: lite.buildMergeTable(PROJECT_PAIRS.flatMap((p) => p.split(' ')), tw.tailwindV4Dialect({ theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants })) })
const projectPairs = PROJECT_PAIRS.filter((p) => p.split(' ').every((c) => ds2.candidatesToCss([c])[0]))
report.project = await evaluate('Cấu hình riêng của dự án (theme, @utility, @custom-variant, tw-animate-css), không cấu hình thêm', projectPairs, { ds: ds2, compiler: compiler2 }, {
    'không gộp': (s) => s,
    'tailwind-merge 3.7': (s) => twMerge(s),
    '@porbit/style/merge': (s) => projectMerge(clsx(s)),
    '@porbit/style/merge/lite + bảng': (s) => projectLite(s),
})
report.pairs = pairList.length
await browser.close()
fs.writeFileSync(path.join(root, 'eval/merge-accuracy.json'), JSON.stringify(report, null, 2) + '\n')
