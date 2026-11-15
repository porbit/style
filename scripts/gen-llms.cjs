#!/usr/bin/env node
/**
 * Sinh llms.txt (chỉ mục + quy tắc rút gọn) và llms-full.txt (toàn bộ tài liệu) cho agent AI.
 * Nguồn quy tắc: src/agent-rules.ts (dùng chung với `presence-style init --agents` và MCP).
 */
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')

const root = path.resolve(__dirname, '..')
const pkg = require(path.join(root, 'package.json'))
const bundled = esbuild.buildSync({
    entryPoints: [path.join(root, 'src/agent-rules.ts')],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
})
const mod = { exports: {} }
new Function('module', 'exports', bundled.outputFiles[0].text)(mod, mod.exports)
const { AGENT_RULES } = mod.exports

const BASE = 'https://raw.githubusercontent.com/porbit/style/main/'
const DOCS = [
    ['README.en.md', 'Overview (English): install, syntax, Tailwind dialect, static-first, components, MCP, CLI'],
    ['docs/guides/thiet-ke-nhanh.md', 'Hướng dẫn thiết kế nhanh: quy trình 5 bước, bảng alias hay dùng, lỗi thường gặp'],
    ['docs/guides/tu-vung-mo.md', 'Từ vựng mở: viết mọi property/giá trị CSS khi chưa có alias'],
    ['docs/guides/components.md', 'Bộ component mẫu: recipe, theme --ps-*, ghi đè bằng layer'],
    ['docs/guides/static-first.md', 'Static-first và plugin Vite'],
    ['docs/guides/mcp.md', 'MCP server: cài cho từng agent, danh sách tool'],
    ['DICTIONARY.md', 'Toàn bộ alias property và value'],
    ['spec/SPEC.md', 'Đặc tả cú pháp chuẩn'],
]

const index = `# PresenceStyle (@porbit/style)

> Utility CSS engine mở: class viết tắt (x-css) được đổi thành CSS lúc chạy (không cần build) hoặc lúc build. Mọi property CSS viết được thành class; ưu tiên tường minh bằng layer số. Có phương ngữ Tailwind ở runtime, bộ component mẫu, plugin Vite và MCP server. Phiên bản ${pkg.version}.

${AGENT_RULES.trim()}

## Tài liệu

${DOCS.map(([file, desc]) => `- [${file}](${BASE}${file}): ${desc}`).join('\n')}

## Tuỳ chọn

- [llms-full.txt](${BASE}llms-full.txt): toàn bộ tài liệu trên trong một file
`

const full = [index, ...DOCS.map(([file]) => `\n\n---\n\n<!-- ${file} -->\n\n` + fs.readFileSync(path.join(root, file), 'utf8'))].join('')

fs.writeFileSync(path.join(root, 'llms.txt'), index)
fs.writeFileSync(path.join(root, 'llms-full.txt'), full)
console.log(`llms.txt ${index.length} ký tự, llms-full.txt ${full.length} ký tự`)
