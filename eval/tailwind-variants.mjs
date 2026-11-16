#!/usr/bin/env node
/**
 * Độ phủ biến thể: lấy mọi biến thể từ Tailwind (getVariants), ghép thành dạng dùng được
 * (`group` -> `group-hover`, `data` -> `data-[state=open]`, `@-sm` -> `@sm`...), chỉ giữ dạng mà
 * compiler Tailwind sinh được CSS, rồi đếm dạng @porbit/style (phương ngữ v4) chuyển được.
 *   npm run build && node eval/tailwind-variants.mjs
 */
import { __unstable__loadDesignSystem } from 'tailwindcss'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const loadStylesheet = async (id, base) => ({ base, path: id, content: fs.readFileSync(path.join(twDir, id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')), 'utf8') })
const ds = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: twDir, loadStylesheet })
const { tailwindV4Dialect } = await import(path.join(root, 'dist/tailwind-v4.mjs'))
const dialect = tailwindV4Dialect()

const complete = (name) => {
    if (/^@-/.test(name)) name = '@' + name.slice(2)
    if (/(^|-)(aria)$/.test(name)) return name + '-checked'
    if (/(^|-)(data)$/.test(name)) return name + '-[state=open]'
    if (/(^|-)nth(-last)?(-of-type)?$/.test(name)) return name + '-3'
    if (/(^|-)supports$/.test(name)) return name + '-[display:grid]'
    if (/(^|-)(group|peer|in|has|not)$/.test(name)) return name + '-hover'
    if (/(^|-)(min|max)$/.test(name)) return name + '-md'
    if (/(^|-)@(min|max)?$/.test(name)) return name.replace(/@(min|max)?$/, (m) => m + (m.length > 1 ? '-md' : 'md'))
    return name
}
const names = new Set()
for (const v of ds.getVariants()) {
    if (v.values?.length) for (const x of v.values) names.add(complete(`${v.name}-${x}`))
    else names.add(complete(v.name))
}
for (const extra of ['not-[.x]', 'in-[.x]', 'has-[.x]', 'group-[.x]', 'peer-[.x]', 'nth-[2n+1]', 'aria-[sort=ascending]', '@sm/main', 'group-hover/item', 'peer-checked/name', 'starting']) names.add(extra)
// Hai at-rule nội tuyến lồng nhau (container trong container, media/supports/starting quanh container query).
for (const extra of ['@[300px]:@max-[500px]', 'md:@[300px]', '@md:md', '@md:hover', 'supports-[display:grid]:@md', 'md:supports-[display:grid]', '@sm/main:@max-lg', 'not-dark:@md', 'md:not-@2xl', 'starting:md', 'print:@md', 'supports-grid:not-supports-[display:flex]']) names.add(extra)
const all = [...names]
const twCss = ds.candidatesToCss(all.map((n) => `${n}:p-4`))
const valid = all.filter((_, i) => twCss[i])
const unsupported = valid.filter((n) => !dialect(`${n}:p-4`))
const report = { tailwindVariants: valid.length, supported: valid.length - unsupported.length, percent: Number((100 * (valid.length - unsupported.length) / valid.length).toFixed(1)), unsupported }
fs.writeFileSync(path.join(root, 'eval/tailwind-variants.json'), JSON.stringify(report, null, 2) + '\n')
console.log(`Biến thể Tailwind hợp lệ: ${valid.length}; @porbit/style hỗ trợ: ${report.supported} (${report.percent}%)`)
console.log('Chưa hỗ trợ:', unsupported.join(' '))
