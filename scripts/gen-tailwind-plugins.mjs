#!/usr/bin/env node
/**
 * Đóng gói sẵn plugin Tailwind phổ biến cho dialect Tailwind v4 (không cần build):
 *
 *   node scripts/gen-tailwind-plugins.mjs  ->  src/tailwind-plugins-generated.ts
 *
 * - Plugin viết bằng CSS (tw-animate-css): giữ nguyên CSS (`@theme`, `@utility name-*`...).
 * - Plugin JS (@tailwindcss/forms, @tailwindcss/typography): chạy chính Tailwind có và không có plugin,
 *   lấy phần chênh lệch rồi viết lại thành CSS Tailwind v4 mà `parseTailwindStylesheet` đọc được:
 *   base -> `@layer base {...}`, class mới -> `@utility name {...}` (selector lồng `&`),
 *   biến thể mới (`prose-headings:`) -> `@custom-variant`.
 */
import { __unstable__loadDesignSystem, compile } from 'tailwindcss'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const readTw = (file) => fs.readFileSync(path.join(twDir, file), 'utf8')
const loadStylesheet = async (id, base) => {
    const file = id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')
    return { base, path: file, content: readTw(file) }
}
const loadModule = async (id, base) => ({ base, path: id, module: require(id) })
const pkgDir = (id) => path.join(root, 'node_modules', id)
const versionOf = (id) => JSON.parse(fs.readFileSync(path.join(pkgDir(id), 'package.json'), 'utf8')).version

const cssEscape = (value) => value.replace(/[^\w-]/g, (ch) => '\\' + ch).replace(/^(\d)/, '\\3$1 ')

/** Khối CSS cấp ngoài: [{ head, body }] hoặc { text } cho câu lệnh. */
const blocks = (css) => {
    const out = []
    let i = 0
    while (i < css.length) {
        while (i < css.length && /\s/.test(css[i])) i++
        if (i >= css.length) break
        let j = i
        let quote = ''
        let parens = 0
        while (j < css.length) {
            const ch = css[j]
            if (quote) {
                if (ch === '\\') j++
                else if (ch === quote) quote = ''
            } else if (ch === '"' || ch === "'") quote = ch
            else if (ch === '(') parens++
            else if (ch === ')') parens--
            else if (parens === 0 && (ch === '{' || ch === ';')) break
            j++
        }
        if (css[j] !== '{') {
            out.push({ text: css.slice(i, j + 1).trim() })
            i = j + 1
            continue
        }
        let depth = 1
        let k = j + 1
        quote = ''
        while (k < css.length && depth > 0) {
            const ch = css[k]
            if (quote) {
                if (ch === '\\') k++
                else if (ch === quote) quote = ''
            } else if (ch === '"' || ch === "'") quote = ch
            else if (ch === '{') depth++
            else if (ch === '}') depth--
            k++
        }
        out.push({ head: css.slice(i, j).trim(), body: css.slice(j + 1, k - 1) })
        i = k
    }
    return out
}
const splitTop = (text) => {
    const parts = []
    let depth = 0
    let start = 0
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '(' || text[i] === '[') depth++
        else if (text[i] === ')' || text[i] === ']') depth--
        else if (text[i] === ',' && depth === 0) {
            parts.push(text.slice(start, i).trim())
            start = i + 1
        }
    }
    parts.push(text.slice(start).trim())
    return parts.filter(Boolean)
}
const squash = (css) => css.replace(/\s+/g, ' ').replace(/\s*([{};])\s*/g, '$1').trim()

/** CSS của một class (đã biên dịch) -> thân `@utility` với selector lồng `&`. */
const toUtilityBody = (css, className) => {
    const escaped = '.' + cssEscape(className)
    // `nested`: bên trong rule của class, selector con (không có class) là selector lồng tương đối.
    const walk = (text, nested = false) => {
        let out = ''
        for (const block of blocks(text)) {
            if (!block.head) continue
            if (block.head.startsWith('@')) {
                const inner = walk(block.body, nested)
                if (inner) out += `${block.head}{${inner}}`
                continue
            }
            // Selector lồng không có `&` là hậu duệ của rule cha (CSS nesting): `:where(.prose > p)` -> `& :where(& > p)`.
            const sels = nested
                ? splitTop(block.head).map((sel) => (sel.includes('&') ? sel : '& ' + sel.split(escaped).join('&')))
                : splitTop(block.head).filter((sel) => sel.includes(escaped)).map((sel) => sel.split(escaped).join('&'))
            if (!sels.length) continue
            const decls = blocks(block.body).filter((b) => b.text).map((b) => b.text).join('')
            const children = walk(block.body, true)
            out += sels.length === 1 && sels[0] === '&' ? decls + children : `${sels.join(',')}{${decls}${children}}`
        }
        return out
    }
    return squash(walk(css))
}

/** `v:flex` đã biên dịch -> thân `@custom-variant` (selector có `&`, at-rule bọc ngoài thành dạng khối). */
const toVariantBody = (css, variant) => {
    const escaped = '.' + cssEscape(`${variant}:flex`)
    const walk = (text) => {
        for (const block of blocks(text)) {
            if (!block.head) continue
            if (block.head.startsWith('@')) {
                const inner = walk(block.body)
                if (inner) return `{${block.head}{${inner.startsWith('{') ? inner.slice(1, -1) : `${inner}{@slot;}`}}}`
                continue
            }
            const sels = splitTop(block.head).filter((sel) => sel.includes(escaped)).map((sel) => sel.split(escaped).join('&'))
            if (sels.length) return sels.join(', ')
        }
        return null
    }
    const result = walk(css)
    return result && !result.startsWith('{') ? `(${result})` : result
}

const designSystem = (css) => __unstable__loadDesignSystem(css, { base: root, loadStylesheet, loadModule })

const BASE_CSS = '@import "tailwindcss";'
const baseDs = await designSystem(BASE_CSS)
const baseClasses = new Set(baseDs.getClassList().map(([name]) => name))
const baseVariants = new Set(baseDs.getVariants().map((v) => v.name))
const baseLayer = async (css) => {
    const compiler = await compile(css, { base: root, loadStylesheet, loadModule })
    const out = compiler.build([])
    return blocks(out).filter((b) => b.head === '@layer base').map((b) => b.body).join('\n')
}
const preflight = squash(await baseLayer(BASE_CSS))

const fromJsPlugin = async (id) => {
    const css = `${BASE_CSS}\n@plugin "${id}";`
    const ds = await designSystem(css)
    const parts = [`/* ${id}@${versionOf(id)} (MIT) — sinh bởi scripts/gen-tailwind-plugins.mjs */`]
    const base = squash(await baseLayer(css))
    const extraBase = base.startsWith(preflight) ? base.slice(preflight.length) : base
    if (extraBase.trim()) parts.push(`@layer base{${extraBase}}`)
    const classes = ds.getClassList().map(([name]) => name).filter((name) => !baseClasses.has(name))
    const compiled = ds.candidatesToCss(classes)
    classes.forEach((name, i) => {
        if (!compiled[i]) return
        const body = toUtilityBody(compiled[i], name)
        if (body) parts.push(`@utility ${name}{${body}}`)
    })
    const variants = ds.getVariants().map((v) => v.name).filter((name) => !baseVariants.has(name))
    const variantCss = ds.candidatesToCss(variants.map((v) => `${v}:flex`))
    variants.forEach((name, i) => {
        const body = variantCss[i] && toVariantBody(variantCss[i], name)
        if (body) parts.push(`@custom-variant ${name} ${body}${body.startsWith('(') ? ';' : ''}`)
    })
    return { css: parts.join('\n'), classes: classes.length, variants: variants.length }
}

const plugins = {}
const stats = {}
const animate = fs.readFileSync(path.join(pkgDir('tw-animate-css'), 'dist/tw-animate.css'), 'utf8')
plugins['tw-animate-css'] = `/* tw-animate-css@${versionOf('tw-animate-css')} (MIT) */\n${animate.replace(/\/\*[\s\S]*?\*\//g, '').trim()}`
stats['tw-animate-css'] = { bytes: plugins['tw-animate-css'].length }
for (const id of ['@tailwindcss/forms', '@tailwindcss/typography']) {
    const result = await fromJsPlugin(id)
    plugins[id] = result.css
    stats[id] = { classes: result.classes, variants: result.variants, bytes: result.css.length }
}

const out = `// File sinh tự động bởi scripts/gen-tailwind-plugins.mjs — không sửa tay.
// Plugin Tailwind phổ biến viết lại thành CSS Tailwind v4 cho \`parseTailwindStylesheet\`.
export const TAILWIND_PLUGIN_CSS: Record<string, string> = ${JSON.stringify(plugins, null, 1)}
`
fs.writeFileSync(path.join(root, 'src/tailwind-plugins-generated.ts'), out)
console.log('[gen-tailwind-plugins] -> src/tailwind-plugins-generated.ts')
console.log(' ', JSON.stringify(stats))
