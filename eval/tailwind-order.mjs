#!/usr/bin/env node
/**
 * Thứ tự class: so `dialect.compare` của @porbit/style với `getClassOrder` của Tailwind thật.
 * Thứ tự này quyết định rule nào thắng khi hai class cùng phần tử đụng nhau (`p-2 px-4`) và là thứ tự
 * mà prettier-plugin-tailwindcss sắp class.
 *
 *   npm run build && node eval/tailwind-order.mjs
 *
 * Đo: sắp mỗi tập bằng Tailwind, đếm cặp liền kề mà @porbit/style xếp ngược. Ghi eval/tailwind-order.json.
 */
import { __unstable__loadDesignSystem } from 'tailwindcss'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const fixture = path.join(root, 'eval/fixtures/shadcn-v4')
const imports = {
    'tw-animate-css': path.join(root, 'node_modules/tw-animate-css/dist/tw-animate.css'),
    './shadcn-tailwind.css': path.join(fixture, 'shadcn-tailwind.css'),
}
const loadStylesheet = async (id, base) => {
    if (imports[id]) return { base, path: id, content: fs.readFileSync(imports[id], 'utf8') }
    const file = id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')
    return { base, path: file, content: fs.readFileSync(path.join(twDir, file), 'utf8') }
}
const tw = await import(path.join(root, 'dist/tailwind.mjs'))
const { extractCandidates } = await import(path.join(root, 'dist/index.mjs'))
const { resolveTailwindPlugin } = await import(path.join(root, 'dist/tailwind-plugins.mjs'))

// Xáo trộn có hạt giống: kết quả lặp lại được.
let seed = 7
const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const shuffle = (list) => list.map((x) => [random(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x)

const measure = (name, ds, dialect, list) => {
    const known = ds.getClassOrder(list).filter(([, order]) => order !== null).sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)).map(([c]) => c)
    const ours = known.filter((c) => dialect(c))
    const wrong = []
    for (let i = 1; i < ours.length; i++) if (dialect.compare(ours[i - 1], ours[i]) > 0) wrong.push(`${ours[i - 1]} > ${ours[i]}`)
    const pairs = Math.max(1, ours.length - 1)
    const result = { classes: ours.length, pairs, wrong: wrong.length, percent: Number((100 * (1 - wrong.length / pairs)).toFixed(3)), sample: wrong.slice(0, 12) }
    console.log(`${name}: ${ours.length} class, ${pairs - wrong.length}/${pairs} cặp kề đúng thứ tự (${result.percent}%)`)
    wrong.slice(0, 8).forEach((w) => console.log('   ✗', w))
    return result
}

const report = {}
{
    const ds = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: twDir, loadStylesheet })
    const dialect = tw.tailwindV4Dialect()
    const classes = shuffle(ds.getClassList().map(([n]) => n))
    report.base = measure('Class gốc', ds, dialect, classes)

    const variants = JSON.parse(fs.readFileSync(path.join(root, 'eval/tailwind-variants.json'), 'utf8'))
    const variantNames = [...new Set(ds.getVariants().flatMap((v) => (v.values?.length ? v.values.map((x) => `${v.name}-${x}`) : [v.name])))].filter((v) => !v.endsWith('-'))
    const sample = ['p-4', 'px-2', 'flex', 'bg-red-500', 'text-sm', 'shadow-md', 'rounded-lg', 'translate-x-2', 'w-[3px]', 'space-x-2']
    const extra = ['md:max-lg', 'dark:md:hover', 'group-hover/item', 'peer-checked/name', 'data-[state=open]', 'aria-[sort=ascending]', 'min-[600px]', 'max-[900px]', '@md/main', '@min-[300px]', 'not-[.x]', 'has-[>svg]', '[&_svg]', '[@media(width>=10px)]', 'group-data-[x=1]', 'in-[.x]', 'nth-[2n+1]', 'supports-[display:grid]']
    const single = shuffle([...variantNames, ...extra].flatMap((v) => sample.map((c) => `${v}:${c}`)))
    report.variants = measure('Một biến thể', ds, dialect, single)
    const pool = [...variantNames.slice(0, 120), ...extra]
    const combos = shuffle(Array.from({ length: 4000 }, () => `${pool[Math.floor(random() * pool.length)]}:${pool[Math.floor(random() * pool.length)]}:${sample[Math.floor(random() * sample.length)]}`))
    report.combos = measure('Hai biến thể', ds, dialect, combos)
    void variants
}
{
    const entry = fs.readFileSync(path.join(fixture, 'app.css'), 'utf8')
    const ds = await __unstable__loadDesignSystem(entry, { base: fixture, loadStylesheet })
    const sheet = tw.parseTailwindStylesheet(entry, { resolve: (id) => (imports[id] ? fs.readFileSync(imports[id], 'utf8') : resolveTailwindPlugin(id)) })
    const dialect = tw.tailwindV4Dialect({ darkMode: 'class', theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, variantOrder: sheet.variantOrder, css: sheet.css })
    const found = new Set()
    for (const file of fs.readdirSync(path.join(fixture, 'ui'))) for (const c of extractCandidates(fs.readFileSync(path.join(fixture, 'ui', file), 'utf8'))) found.add(c)
    report.shadcn = measure('shadcn/ui v4 (theme, @utility, @custom-variant của dự án)', ds, dialect, shuffle([...found]))
}
{
    // Plugin JS của cấu hình v3 (`@config`): nhóm `matchVariant` có `sort` — giá trị tuỳ ý xếp xen giữa giá trị có tên.
    const dir = path.join(root, 'eval/fixtures/v3-config/plugins')
    const entry = fs.readFileSync(path.join(dir, 'app.css'), 'utf8')
    const loadModule = async (id, base) => ({ base, path: id, module: require(id.startsWith('.') ? path.resolve(base, id) : require.resolve(id, { paths: [base, root] })) })
    const ds = await __unstable__loadDesignSystem(entry, { base: dir, loadStylesheet, loadModule })
    const { createTailwindPluginLoader, createConfigLoader } = await import(path.join(root, 'dist/postcss.mjs'))
    const jsPlugins = createTailwindPluginLoader(dir)
    const sheet = jsPlugins.apply(tw.parseTailwindStylesheet(entry, { resolve: (id) => resolveTailwindPlugin(id) || jsPlugins.resolve(id), loadConfig: createConfigLoader(dir, jsPlugins) }))
    const dialect = tw.tailwindV4Dialect({ darkMode: 'class', theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, variantOrder: sheet.variantOrder, css: sheet.css })
    const variantList = ['mq-small', 'mq-big', 'mq-[700px]', 'mq-[900px]', 'mq-[1300px]', 'mq-[500px]', 'nth-odd', 'nth-even', 'nth-3', 'nth-[2n_+_1]', 'state-on', 'state-[open]', 'state-[closed]', 'md', 'hover', 'dark']
    // Không đo `state-[open]/menu` cạnh `state-[open]`: cùng giá trị, khác modifier thì `matchVariant` của Tailwind
    // không phân thứ tự (so sánh trả 1 cả hai chiều) — kết quả theo thứ tự gặp class, không cố định.
    const utilities = ['p-4', 'p-2', 'px-3', 'font-bold', 'bg-brand', 'text-white']
    const list = shuffle([...variantList.flatMap((v) => utilities.map((u) => `${v}:${u}`)), ...variantList.flatMap((v) => variantList.map((w) => `${v}:${w}:p-4`))])
    report.plugins = measure('Plugin JS của cấu hình v3 (matchVariant có sort)', ds, dialect, list)
}
fs.writeFileSync(path.join(root, 'eval/tailwind-order.json'), JSON.stringify(report, null, 2) + '\n')
