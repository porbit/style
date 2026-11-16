#!/usr/bin/env node
/**
 * Sinh dữ liệu phương ngữ Tailwind TỪ CHÍNH Tailwind (devDependency `tailwindcss`):
 *   - chạy compiler trên toàn bộ danh sách class của Tailwind (getClassList),
 *   - rút từng class về mẫu khai báo theo họ (`p-{v}` -> padding: calc(var(--spacing) * {v})),
 *   - thăm dò giá trị tuỳ ý (`p-[3px]`, `bg-[#123456]`) để học mẫu cho `[...]`,
 *   - lấy theme (biến `--color-*`, `--spacing`...), `@property`, keyframes và preflight.
 * Kết quả: src/tailwind-generated.ts (KHÔNG sửa tay). Chạy: npm run gen:tailwind
 */
import { __unstable__loadDesignSystem } from 'tailwindcss'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const twVersion = JSON.parse(fs.readFileSync(path.join(twDir, 'package.json'), 'utf8')).version
const readTw = (file) => fs.readFileSync(path.join(twDir, file), 'utf8')
const loadStylesheet = async (id, base) => {
    const file = id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')
    return { base, path: file, content: readTw(file) }
}

const ds = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: twDir, loadStylesheet })
const classList = ds.getClassList().map(([name]) => name)
// Class cũ (v3) Tailwind v4 vẫn sinh CSS nhưng không liệt kê trong getClassList: rất hay gặp ở dự án
// nâng cấp từ v3 (`flex-shrink-0`, `bg-gradient-to-r`, `break-words`...).
{
    const legacy = ['break-words', 'overflow-ellipsis', 'decoration-slice', 'decoration-clone', 'order-none', 'filter', 'backdrop-filter', 'blur', 'drop-shadow',
        'flex-grow', 'flex-grow-0', 'flex-shrink', 'flex-shrink-0', 'transform', 'transform-cpu', 'transform-gpu', 'transform-none']
    for (const pos of ['left-top', 'left-bottom', 'right-top', 'right-bottom']) legacy.push(`bg-${pos}`, `object-${pos}`)
    for (const dir of ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl']) legacy.push(`bg-gradient-to-${dir}`)
    for (const key of ['sm', 'md', 'lg', 'xl', '2xl']) legacy.push(`max-w-screen-${key}`)
    const known = new Set(classList)
    const css = ds.candidatesToCss(legacy)
    legacy.forEach((name, i) => css[i] && !known.has(name) && classList.push(name))
}

// ---------------------------------------------------------------------------
// Phân tích CSS của một class
// ---------------------------------------------------------------------------

const cssEscape = (value) => {
    let out = ''
    for (let i = 0; i < value.length; i++) {
        const ch = value[i]
        const code = value.charCodeAt(i)
        if ((code >= 0x30 && code <= 0x39 && (i === 0 || (i === 1 && value[0] === '-')))) {
            out += '\\' + code.toString(16) + ' '
        } else if (code >= 0x80 || ch === '-' || ch === '_' || /[a-zA-Z0-9]/.test(ch)) {
            out += ch
        } else {
            out += '\\' + ch
        }
    }
    return out
}

const propertyBlocks = new Map() // --tw-x -> khối @property
const approximateClasses = new Set()
const splitDecls = (body) => {
    const decls = []
    let depth = 0
    let quote = ''
    let start = 0
    for (let i = 0; i <= body.length; i++) {
        const ch = body[i]
        if (quote) {
            if (ch === quote && body[i - 1] !== '\\') quote = ''
            continue
        }
        if (ch === '"' || ch === "'") quote = ch
        else if (ch === '(') depth++
        else if (ch === ')') depth--
        else if ((ch === ';' && depth === 0) || i === body.length) {
            const text = body.slice(start, i).trim()
            start = i + 1
            if (!text) continue
            const colon = text.indexOf(':')
            if (colon <= 0) return null
            decls.push([text.slice(0, colon).trim(), text.slice(colon + 1).trim()])
        }
    }
    return decls
}

/**
 * CSS một class -> { sel, decls } với `sel` là hậu tố ('' | '::placeholder' | ':where(& > ...)').
 * Trả null khi có cấu trúc chưa hỗ trợ (nhiều rule, @media lồng...).
 */
const parseClassCss = (name, css) => {
    let text = css.replace(/@property\s+(--[\w-]+)\s*\{[^}]*\}/g, (block, prop) => {
        propertyBlocks.set(prop, block.replace(/\s+/g, ' ').trim())
        return ''
    }).trim()
    // `@supports (...)` lồng (gradient nội suy oklab): trình duyệt hiện đại dùng nhánh này,
    // nên khai báo bên trong ghi đè khai báo cùng tên ở ngoài.
    // `@media` lồng (`container`, `outline-hidden`): bỏ, giữ phần ngoài (gần đúng).
    let approximate = false
    const overrides = []
    text = text.replace(/@supports[^{]*\{([^{}]*)\}/g, (_block, inner) => {
        overrides.push(...(splitDecls(inner) || []))
        return ''
    })
    text = text.replace(/@media[^{]*\{[^{}]*\}/g, () => {
        approximate = true
        return ''
    })
    // Rule lồng `&:...`/`@media` trong class (container) có thể để lại khối rỗng.
    text = text.replace(/\{\s*\}/g, '{}')
    const match = text.match(/^([^{}]+)\{([^{}]*)\}$/)
    if (!match) return null
    const selector = match[1].trim()
    const escaped = '.' + cssEscape(name)
    let sel
    if (selector === escaped) sel = ''
    else if (selector.startsWith(escaped)) sel = selector.slice(escaped.length)
    else if (selector.includes(escaped)) sel = selector.split(escaped).join('&')
    else return null
    let decls = splitDecls(match[2])
    if (!decls || !decls.length) return null
    for (const [prop, value] of overrides) {
        const index = decls.findIndex(([p]) => p === prop)
        if (index === -1) decls.push([prop, value])
        else decls[index] = [prop, value]
    }
    if (approximate) approximateClasses.add(name)
    return { sel, decls, approximate }
}

const ruleKey = (rule) => JSON.stringify([rule.sel, rule.decls])

// ---------------------------------------------------------------------------
// Class có tên: gom theo họ + mẫu
// ---------------------------------------------------------------------------

const cssList = ds.candidatesToCss(classList)
const parsed = new Map()
const unsupported = []
classList.forEach((name, index) => {
    const rule = cssList[index] && parseClassCss(name, cssList[index])
    if (rule) parsed.set(name, rule)
    else unsupported.push(name)
})

const splitsOf = (name) => {
    const neg = name.startsWith('-') ? '-' : ''
    const parts = (neg ? name.slice(1) : name).split('-')
    const out = []
    for (let k = 1; k < parts.length; k++) out.push([neg + parts.slice(0, k).join('-'), parts.slice(k).join('-')])
    return out
}

// root -> [{ value, key }]
const byRoot = new Map()
for (const [name, rule] of parsed) {
    const key = ruleKey(rule)
    for (const [rootName, value] of splitsOf(name)) {
        if (!byRoot.has(rootName)) byRoot.set(rootName, [])
        byRoot.get(rootName).push({ name, value, key })
    }
}

// `{v}`: giá trị nguyên văn; `{f}`: phân số viết cách (`1/2` -> `1 / 2`).
const spacedFraction = (value) => value.replace('/', ' / ')
const instantiate = (template, value) => template.split('{v}').join(value).split('{f}').join(spacedFraction(value))
const templatize = (key, value) => {
    if (value.includes('/') && key.includes(spacedFraction(value))) return key.split(spacedFraction(value)).join('{f}')
    return key.includes(value) ? key.split(value).join('{v}') : null
}
// Tailwind rút gọn `calc(var(--spacing) * 1)` -> `var(--spacing)` và `* 0` -> `0px`: so sánh sau khi
// chuẩn hoá, vì runtime sinh dạng đầy đủ (giá trị CSS tương đương).
const normalizeKey = (key) => key
    .replace(/calc\(var\(--spacing\) \* 1\)/g, 'var(--spacing)')
    .replace(/calc\(var\(--spacing\) \* -1\)/g, 'calc(var(--spacing) * -1)')
    .replace(/calc\(var\(--spacing\) \* 0\)/g, '0px')
const sameRule = (template, value, key) => normalizeKey(instantiate(template, value)) === normalizeKey(key)

// Mỗi root: tìm các mẫu phủ được nhiều thành viên nhất (thử mẫu rút từ vài thành viên).
const groups = [] // { root, template, values:Set, names:[] }
for (const [rootName, members] of byRoot) {
    if (members.length < 2) continue
    let remaining = members
    while (remaining.length >= 2) {
        let best = null
        const probes = remaining.slice(0, 12)
        // Thử thêm mẫu suy từ thành viên số >= 2 (Tailwind rút gọn 0 và 1 nên chúng không làm mẫu được).
        const numericProbe = remaining.find((m) => /^\d+(\.\d+)?$/.test(m.value) && Number(m.value) >= 2)
        if (numericProbe && !probes.includes(numericProbe)) probes.push(numericProbe)
    for (const probe of probes) {
            const template = templatize(probe.key, probe.value)
            if (!template) continue
            const matched = remaining.filter((m) => sameRule(template, m.value, m.key))
            if (!best || matched.length > best.matched.length) best = { template, matched }
        }
        if (!best || best.matched.length < 2) break
        groups.push({ root: rootName, template: best.template, values: best.matched.map((m) => m.value), names: best.matched.map((m) => m.name) })
        const used = new Set(best.matched)
        remaining = remaining.filter((m) => !used.has(m))
    }
}

// Mỗi class chọn nhóm lớn nhất chứa nó; class không vào nhóm nào được lưu tường minh.
groups.sort((a, b) => b.names.length - a.names.length)
const assigned = new Map()
for (const group of groups) {
    for (const name of group.names) if (!assigned.has(name)) assigned.set(name, group)
}
const usedGroups = new Set(assigned.values())
const explicit = {}
for (const [name, rule] of parsed) {
    if (!assigned.has(name)) explicit[name] = ruleKey(rule)
}

// Bảng mẫu và tập giá trị dùng chung (chống lặp: bảng màu xuất hiện ở hàng chục họ).
const templates = []
const templateIndex = new Map()
const internTemplate = (t) => {
    if (!templateIndex.has(t)) {
        templateIndex.set(t, templates.length)
        templates.push(t)
    }
    return templateIndex.get(t)
}
const valueSets = []
const valueSetIndex = new Map()
const internValues = (values) => {
    const key = [...values].sort().join(' ')
    if (!valueSetIndex.has(key)) {
        valueSetIndex.set(key, valueSets.length)
        valueSets.push(key)
    }
    return valueSetIndex.get(key)
}
const SPACING_TEMPLATE = /var\(--spacing\) \* \{v\}/
const families = {} // root -> [[templateIdx, valueSetIdx | -1 (số bất kỳ bội 0.25)]]
for (const group of usedGroups) {
    const members = group.names.filter((n) => assigned.get(n) === group)
    const values = members.map((n) => group.values[group.names.indexOf(n)])
    const numeric = SPACING_TEMPLATE.test(group.template) && values.every((v) => /^\d+(\.\d+)?$/.test(v))
    ;(families[group.root] ||= []).push([internTemplate(group.template), numeric ? -1 : internValues(values)])
}

// ---------------------------------------------------------------------------
// Giá trị tuỳ ý: thăm dò từng họ với giá trị mẫu theo kiểu
// ---------------------------------------------------------------------------

const PROBES = { length: '3px', color: '#123456', number: '7', any: 'probe' }
const roots = new Set([...Object.keys(families), ...classList.map((n) => splitsOf(n)[0]?.[0]).filter(Boolean)])
const arbitrary = {} // root -> { kind: templateIdx }
const probeCandidates = []
for (const rootName of roots) for (const [kind, value] of Object.entries(PROBES)) probeCandidates.push([rootName, kind, value])
const probeCss = ds.candidatesToCss(probeCandidates.map(([r, , v]) => `${r}-[${v}]`))
probeCandidates.forEach(([rootName, kind, value], index) => {
    const css = probeCss[index]
    if (!css) return
    const rule = parseClassCss(`${rootName}-[${value}]`, css)
    if (!rule) return
    const key = ruleKey(rule)
    if (!key.includes(value)) return
    ;(arbitrary[rootName] ||= {})[kind] = internTemplate(key.split(value).join('{a}'))
})

// ---------------------------------------------------------------------------
// Theme, @property, keyframes, preflight
// ---------------------------------------------------------------------------

const themeCss = readTw('theme.css')
const theme = {}
for (const m of themeCss.matchAll(/(--[\w.-]+(?:\\.[\w-]+)*)\s*:\s*([^;]+);/g)) theme[m[1].replace(/\\\./g, '.')] = m[2].trim().replace(/\s+/g, ' ').replace(/--theme\((--[\w.-]+), initial\)/g, 'var($1)')
const keyframes = [...themeCss.matchAll(/@keyframes\s+([\w-]+)\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g)].map((m) => m[0].replace(/\s+/g, ' '))

const fallbackDecls = [...propertyBlocks].map(([name, block]) => {
    const initial = block.match(/initial-value:\s*([^;]+);/)
    return `${name}:${initial ? initial[1].trim() : 'initial'}`
})
// @property + dự phòng cho trình duyệt chưa hỗ trợ @property (giống `@layer properties` của Tailwind).
const propertiesCss = [
    ...propertyBlocks.values(),
    `@layer l0{@supports ((-webkit-hyphens: none) and (not (margin-trim: block))) or ((-moz-orient: inline) and (not (color:rgb(from red r g b)))){*,::before,::after,::backdrop{${fallbackDecls.join(';')}}}}`,
    ...keyframes,
].join('\n')

const preflightCss = readTw('preflight.css')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@layer base\s*\{([\s\S]*)\}\s*$/, '$1')
    .replace(/\s+/g, ' ')
    // `--theme(--x, dự phòng)` là hàm lúc build của Tailwind, kết quả là `var(--x, dự phòng)`.
    .replace(/--theme\(\s*/g, 'var(')
    .trim()

// Nén: mỗi mẫu/rule là [chỉ số selector, ...chỉ số khai báo] trỏ vào bảng dùng chung
// (`box-shadow: var(--tw-inset-shadow), ...` lặp ở hàng trăm mẫu chỉ lưu một lần).
const sels = []
const selIndex = new Map()
const decls = []
const declIndex = new Map()
const internIn = (table, index, key) => {
    if (!index.has(key)) {
        index.set(key, table.length)
        table.push(key)
    }
    return index.get(key)
}
const packRule = (json) => {
    const [sel, list] = JSON.parse(json)
    return [internIn(sels, selIndex, sel), ...list.map(([prop, value]) => internIn(decls, declIndex, prop + ':' + value))]
}
const STRUCTURE = {
    version: twVersion,
    theme,
    sels,
    decls,
    templates: templates.map(packRule),
    valueSets,
    families,
    explicit: Object.fromEntries(Object.entries(explicit).map(([name, json]) => [name, packRule(json)])),
    // Họ dùng cùng một mẫu cho mọi loại giá trị (253/299) lưu một số thay vì bảng theo loại.
    arbitrary: Object.fromEntries(Object.entries(arbitrary).map(([name, kinds]) => {
        const unique = [...new Set(Object.values(kinds))]
        return [name, unique.length === 1 ? unique[0] : kinds]
    })),
}
const stats = {
    classList: classList.length,
    parsed: parsed.size,
    unsupported: unsupported.length,
    families: Object.keys(families).length,
    templates: templates.length,
    valueSets: valueSets.length,
    explicit: Object.keys(explicit).length,
    arbitraryRoots: Object.keys(arbitrary).length,
    properties: propertyBlocks.size,
    approximate: approximateClasses.size,
}

// ---------------------------------------------------------------------------
// Thứ tự class của Tailwind (getClassOrder): bảng thuộc tính + thứ tự gốc biến thể
// ---------------------------------------------------------------------------

// Bảng thứ tự thuộc tính không được export: đọc từ bản build của Tailwind (kiểm bằng eval/tailwind-order.mjs).
const libSource = readTw('dist/lib.js')
const propertyOrderMatch = libSource.match(/var [A-Za-z_$][\w$]*=(\["container-type","pointer-events"[^\]]*\])/)
if (!propertyOrderMatch) throw new Error('Không tìm thấy bảng thứ tự thuộc tính trong tailwindcss/dist/lib.js')
const propertyOrder = JSON.parse(propertyOrderMatch[1])
const variantRoots = {}
for (const [name, info] of ds.variants.entries()) variantRoots[name] = [info.kind === 'static' ? 's' : info.kind === 'functional' ? 'f' : info.kind === 'compound' ? 'c' : 'a', info.order]
// Nhóm có hàm so sánh riêng: breakpoint/min (tăng dần), max (giảm dần), @/@min (tăng), @max (giảm).
const groupDirection = {}
for (const [name, dir] of [['max', 'desc'], ['min', 'asc'], ['@max', 'desc'], ['@', 'asc']]) groupDirection[variantRoots[name][1]] = dir
// Khoá thuộc tính của Tailwind tính trên AST (có `--tw-sort` ẩn, `@media` lồng) có thể khác khoá tính từ
// khai báo đầu ra. Lưu phần khác theo chữ ký thuộc tính (`prop,prop,...`); chữ ký mơ hồ thì lưu theo class.
const ourSort = (decls) => {
    const seen = new Set()
    for (const [prop] of decls) {
        const index = propertyOrder.indexOf(prop)
        if (index !== -1) seen.add(index)
    }
    return { order: [...seen].sort((a, b) => a - b), count: decls.length }
}
const sameSort = (a, b) => a.count === b.count && a.order.length === b.order.length && a.order.every((x, i) => x === b.order[i])
const bySignature = new Map()
const classSort = {}
for (const [name, rule] of parsed) {
    const candidate = ds.parseCandidate(name)[0]
    const node = candidate && ds.compileAstNodes(candidate)[0]
    if (!node) continue
    const tw = node.propertySort
    const signature = (rule.sel || '') + '|' + rule.decls.map(([p]) => p).join(',')
    if (sameSort(tw, ourSort(rule.decls))) {
        if (!bySignature.has(signature)) bySignature.set(signature, null)
        else if (bySignature.get(signature) !== null) bySignature.set(signature, 'conflict')
        continue
    }
    const value = [tw.count, ...tw.order]
    const previous = bySignature.get(signature)
    if (previous === undefined) bySignature.set(signature, value)
    else if (previous === null || previous === 'conflict' || previous.join() !== value.join()) bySignature.set(signature, 'conflict')
    classSort[name] = value
}
const sortOverrides = {}
for (const [signature, value] of bySignature) if (Array.isArray(value)) sortOverrides[signature] = value
for (const name of Object.keys(classSort)) {
    const signature = (parsed.get(name).sel || '') + '|' + parsed.get(name).decls.map(([p]) => p).join(',')
    if (Array.isArray(bySignature.get(signature))) delete classSort[name]
}
const ORDER = { properties: propertyOrder, variants: variantRoots, groups: groupDirection, signatures: sortOverrides, classes: classSort }
console.log(`  thứ tự: ${Object.keys(sortOverrides).length} chữ ký, ${Object.keys(classSort).length} class riêng`)

const header = `// @generated bởi scripts/gen-tailwind-map.mjs từ tailwindcss@${twVersion} — KHÔNG sửa tay.\n// ${JSON.stringify(stats)}\n`
const body = `${header}
export const TW_DATA = ${JSON.stringify(STRUCTURE)} as const

/** @property, dự phòng và keyframes Tailwind cần (đặt vào base CSS của phương ngữ). */
export const TW_PROPERTIES_CSS = ${JSON.stringify(propertiesCss)}

/** Preflight (reset) của Tailwind, bọc trong layer thấp nhất \`l0\`. */
export const TW_PREFLIGHT_CSS = ${JSON.stringify('@layer l0{' + preflightCss + '}')}

/** Thứ tự class của Tailwind: bảng thuộc tính, [loại, thứ tự] của gốc biến thể, chiều so sánh của nhóm breakpoint/container. */
export const TW_ORDER = ${JSON.stringify(ORDER)} as const

/** Class chuyển gần đúng (bỏ @media lồng của Tailwind). */
export const TW_APPROXIMATE: readonly string[] = ${JSON.stringify([...approximateClasses].sort())}

/** Class Tailwind chưa có dạng chuyển được (nhiều rule, @media lồng). */
export const TW_UNSUPPORTED: readonly string[] = ${JSON.stringify(unsupported)}
`
fs.writeFileSync(path.join(root, 'src/tailwind-generated.ts'), body)
console.log(`[gen-tailwind-map] tailwindcss@${twVersion} -> src/tailwind-generated.ts`)
console.log('  ' + JSON.stringify(stats))
console.log(`  kích thước: ${(body.length / 1024).toFixed(1)} KB`)
