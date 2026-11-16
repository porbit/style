#!/usr/bin/env node
/**
 * Sắp class: so `@porbit/style/prettier` với prettier-plugin-tailwindcss trên fixture shadcn/ui v4.
 * Cùng `tailwindStylesheet` (CSS của dự án) và `tailwindFunctions: ["cn", "cva"]`; so nguyên văn file sau định dạng.
 *
 *   npm run build && node eval/prettier-sort.mjs
 *
 * Thêm một tập chuỗi class đã xáo trộn (mọi class của dự án) để kiểm cả trường hợp thứ tự ban đầu ngẫu nhiên.
 * Kết quả: eval/prettier-sort.json.
 */
import * as prettier from 'prettier'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const fixture = path.join(root, 'eval/fixtures/shadcn-v4')
// Stylesheet tạm với đường dẫn tuyệt đối để cả hai plugin cùng giải được @import.
// Thư mục tạm trong repo để plugin gốc tìm được gói `tailwindcss`.
const tmp = fs.mkdtempSync(path.join(root, 'eval', '.tmp-prettier-'))
const stylesheet = path.join(tmp, 'app.css')
fs.writeFileSync(stylesheet, fs.readFileSync(path.join(fixture, 'app.css'), 'utf8')
    .replace('@import "tw-animate-css";', `@import "${path.join(root, 'node_modules/tw-animate-css/dist/tw-animate.css')}";`)
    .replace('@import "shadcn/tailwind.css";', `@import "${path.join(fixture, 'shadcn-tailwind.css')}";`))

const plugins = {
    'prettier-plugin-tailwindcss': path.join(root, 'node_modules/prettier-plugin-tailwindcss/dist/index.mjs'),
    '@porbit/style/prettier': path.join(root, 'dist/prettier.mjs'),
}
const format = (source, filepath, plugin) =>
    prettier.format(source, { filepath, plugins: [plugin], tailwindStylesheet: stylesheet, tailwindFunctions: ['cn', 'cva'], printWidth: 100000 })

const files = fs.readdirSync(path.join(fixture, 'ui')).map((f) => path.join(fixture, 'ui', f))
// Thêm file tổng hợp: mọi chuỗi class của dự án, xáo trộn, đặt trong className và cn().
let seed = 3
const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const strings = []
const looksLikeClasses = (text) => text.trim().split(/\s+/).length >= 2 && text.trim().split(/\s+/).every((t) => /^[\w!:\-[\]/.*&>_@()=%#,'+~]+$/.test(t) && /[a-z]/.test(t))
for (const file of files) for (const m of fs.readFileSync(file, 'utf8').matchAll(/"([^"\n{}$`<>]*\s[^"\n{}$`<>]*)"/g)) if (looksLikeClasses(m[1]) && !m[1].includes("'")) strings.push(m[1])
const shuffled = strings.map((s) => s.split(/\s+/).filter(Boolean).map((c) => [random(), c]).sort((a, b) => a[0] - b[0]).map(([, c]) => c).join('  '))
const synthetic = path.join(tmp, 'shuffled.tsx')
fs.writeFileSync(synthetic, `export const A = () => (<>\n${shuffled.map((s, i) => (i % 2 ? `<div className="${s} ${s.split(' ')[0]}" />` : `<div className={cn("${s}", ok && " ${s} ")} />`)).join('\n')}\n</>)\n`)

let identical = 0
let strings_ = 0
let stringsSame = 0
const mismatches = []
for (const file of [...files, synthetic]) {
    const source = fs.readFileSync(file, 'utf8')
    const [a, b] = await Promise.all(Object.values(plugins).map((plugin) => format(source, file, plugin)))
    if (a === b) identical++
    const la = a.split('\n')
    const lb = b.split('\n')
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
        if (!/class|cn\(|cva\(|"/.test(la[i] || '')) continue
        strings_++
        if (la[i] === lb[i]) stringsSame++
        else if (mismatches.length < 12) mismatches.push({ file: path.basename(file), tailwind: (la[i] || '').trim().slice(0, 240), ours: (lb[i] || '').trim().slice(0, 240) })
    }
}
const total = files.length + 1
const report = { files: total, identical, lines: strings_, linesIdentical: stringsSame, mismatches }
console.log(`Prettier: ${identical}/${total} file giống hệt prettier-plugin-tailwindcss; ${stringsSame}/${strings_} dòng có chuỗi class giống hệt`)
for (const m of mismatches.slice(0, 6)) console.log(`  ✗ ${m.file}\n    tailwind: ${m.tailwind}\n    ours:     ${m.ours}`)
fs.writeFileSync(path.join(root, 'eval/prettier-sort.json'), JSON.stringify(report, null, 2) + '\n')
fs.rmSync(tmp, { recursive: true, force: true })
