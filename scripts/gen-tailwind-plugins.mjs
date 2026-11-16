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

// Bản plugin được ghim chính xác trong devDependencies: sinh với bản khác (node_modules cũ) sẽ làm
// dữ liệu đóng gói lệch với package.json, nên dừng lại và yêu cầu `npm ci`.
const pinned = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).devDependencies
for (const id of ['@tailwindcss/forms', '@tailwindcss/typography', 'tailwindcss-animate', 'tw-animate-css', 'tailwindcss']) {
    if (versionOf(id) !== pinned[id]) {
        console.error(`${id}: node_modules có ${versionOf(id)}, package.json ghim ${pinned[id]} — chạy \`npm ci\` rồi sinh lại.`)
        process.exit(1)
    }
}

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
const compiled = async (css) => blocks((await compile(css, { base: root, loadStylesheet, loadModule })).build([]))
const baseLayer = async (css) => (await compiled(css)).filter((b) => b.head === '@layer base').map((b) => b.body).join('\n')
const preflight = squash(await baseLayer(BASE_CSS))
// Khối cấp ngoài không thuộc layer mà Tailwind luôn phát cho plugin (`@keyframes enter/exit` từ `theme.extend.keyframes`
// của tailwindcss-animate): thiếu thì `animate-in` không có keyframes, `transform` tính ra `none` thay vì ma trận đơn vị.
const topLevel = async (css) => (await compiled(css)).filter((b) => b.head && !b.head.startsWith('@layer')).map((b) => squash(`${b.head}{${b.body}}`))
const baseTopLevel = new Set(await topLevel(BASE_CSS))

const fromJsPlugin = async (id) => {
    const css = `${BASE_CSS}\n@plugin "${id}";`
    const ds = await designSystem(css)
    const parts = [`/* ${id}@${versionOf(id)} (MIT) — sinh bởi scripts/gen-tailwind-plugins.mjs */`]
    const base = squash(await baseLayer(css))
    const extraBase = base.startsWith(preflight) ? base.slice(preflight.length) : base
    if (extraBase.trim()) parts.push(`@layer base{${extraBase}}`)
    parts.push(...(await topLevel(css)).filter((block) => !baseTopLevel.has(block)))
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
for (const id of ['@tailwindcss/forms', '@tailwindcss/typography', 'tailwindcss-animate']) {
    const result = await fromJsPlugin(id)
    plugins[id] = result.css
    stats[id] = { classes: result.classes, variants: result.variants, bytes: result.css.length }
}

// ---------------------------------------------------------------------------
// Nén LZ77 dạng chữ (giải nén: `unpackPluginCss` trong src/tailwind-plugins.ts). CSS plugin lặp nhiều (typography
// lặp selector `:where(...):not(:where([class~="not-prose"],...))`): 117 -> ~40 KB trong mỗi bản build (CDN + CJS),
// gzip không tăng vì chỉ thay đoạn lặp dài (từ PACK_MIN ký tự), đoạn ngắn để gzip lo.
// Định dạng: ký tự thường giữ nguyên; `` `abc `` = chép lại (a*64+b) ký tự trước đó, độ dài c+PACK_MIN (chép chồng
// được, như LZ77); hai dấu `` ` `` liền nhau là một dấu `` ` ``. Chữ số: PACK_CHARS.
// ---------------------------------------------------------------------------
const PACK_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$'
const PACK_MIN = 24
const PACK_WINDOW = 64 * 64 - 1
const PACK_MAX = PACK_MIN + 63
const pack = (text) => {
    let out = ''
    const index = new Map()
    const remember = (k) => {
        const key = text.substr(k, PACK_MIN)
        if (!index.has(key)) index.set(key, [])
        index.get(key).push(k)
    }
    for (let i = 0; i < text.length;) {
        let best = 0
        let distance = 0
        const candidates = index.get(text.substr(i, PACK_MIN)) || []
        for (let c = candidates.length - 1; c >= 0 && i - candidates[c] <= PACK_WINDOW; c--) {
            let n = 0
            while (n < PACK_MAX && i + n < text.length && text[candidates[c] + n] === text[i + n]) n++
            if (n > best) [best, distance] = [n, i - candidates[c]]
            if (n === PACK_MAX) break
        }
        if (best >= PACK_MIN) {
            out += '`' + PACK_CHARS[distance >> 6] + PACK_CHARS[distance & 63] + PACK_CHARS[best - PACK_MIN]
            for (let k = i; k < i + best; k++) remember(k)
            i += best
        } else {
            out += text[i] === '`' ? '``' : text[i]
            remember(i)
            i++
        }
    }
    return out
}
// Cùng thuật toán với `unpackPluginCss` (src/tailwind-plugins.ts): kiểm khớp từng ký tự trước khi ghi.
const unpack = (packed) => {
    let out = ''
    let i = 0
    for (let at = packed.indexOf('`'); at !== -1; at = packed.indexOf('`', i)) {
        out += packed.slice(i, at)
        if (packed[at + 1] === '`') {
            out += '`'
            i = at + 2
            continue
        }
        const distance = PACK_CHARS.indexOf(packed[at + 1]) * 64 + PACK_CHARS.indexOf(packed[at + 2])
        for (let length = PACK_CHARS.indexOf(packed[at + 3]) + PACK_MIN; length > 0;) {
            const from = out.length - distance
            const piece = out.slice(from, from + Math.min(length, distance))
            out += piece
            length -= piece.length
        }
        i = at + 4
    }
    return out + packed.slice(i)
}
const packed = Object.fromEntries(Object.entries(plugins).map(([id, css]) => {
    const text = pack(css)
    if (unpack(text) !== css) throw new Error(`Nén CSS của ${id} không giải nén lại đúng`)
    stats[id].packed = text.length
    return [id, text]
}))

const out = `// File sinh tự động bởi scripts/gen-tailwind-plugins.mjs — không sửa tay.
// Plugin Tailwind phổ biến viết lại thành CSS Tailwind v4 cho \`parseTailwindStylesheet\`, nén LZ77 dạng chữ
// (giải nén bằng \`unpackPluginCss\` trong src/tailwind-plugins.ts; định dạng: xem script sinh).
export const TAILWIND_PLUGIN_CSS_PACKED: Record<string, string> = ${JSON.stringify(packed, null, 1)}
`
fs.writeFileSync(path.join(root, 'src/tailwind-plugins-generated.ts'), out)
console.log('[gen-tailwind-plugins] -> src/tailwind-plugins-generated.ts')
console.log(' ', JSON.stringify(stats))
