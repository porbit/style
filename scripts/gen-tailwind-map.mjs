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
    // Gốc họ class đứng một mình (`rounded`, `shadow`...): hợp lệ nhưng có thể vắng trong getClassList.
    for (const name of new Set(classList.map((c) => c.replace(/-[^-]+$/, '')))) legacy.push(name)
    const known = new Set(classList)
    const css = ds.candidatesToCss(legacy)
    legacy.forEach((name, i) => css[i] && !known.has(name) && classList.push(name))
}
// Utility mà Tailwind vẫn sinh với giá trị trần nhưng getClassList không liệt kê giá trị số (`start-4`,
// `end-0.5`, `aspect-3/7`...): thêm vài class dò (số, phân số) cho mỗi gốc utility của Tailwind để họ đó có
// mẫu; class dò chỉ dùng dựng mẫu, không lưu thành class tường minh (xem `probeOnly`).
const FUNCTIONAL_ROOTS = [...ds.utilities.keys('functional')]
const probeOnly = new Set()
{
    const known = new Set(classList)
    const extra = []
    for (const r of FUNCTIONAL_ROOTS) for (const sign of ['', '-']) for (const v of ['4', '37', '1/2', '3/7']) extra.push(`${sign}${r}-${v}`)
    const css = ds.candidatesToCss(extra)
    extra.forEach((name, i) => {
        if (!css[i] || known.has(name)) return
        known.add(name)
        classList.push(name)
        probeOnly.add(name)
    })
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
    if (approximate && !probeOnly.has(name)) approximateClasses.add(name)
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
    else if (!probeOnly.has(name)) unsupported.push(name)
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
    if (!assigned.has(name) && !probeOnly.has(name)) explicit[name] = ruleKey(rule)
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
// Giá trị trần ngoài bảng liệt kê: dò từng mẫu họ bằng chính Tailwind với giá trị lạ. Họ nhận được ghi dấu
// trong bộ giá trị (`#int 0 10 ... auto`: mọi số nguyên không âm, kèm giá trị liệt kê), như Tailwind kiểm `--value(integer)`...
//   #int  số nguyên không âm (`z-1`, `scale-84`, `duration-450`),
//   #pint số nguyên dương (`grid-cols-37`; `grid-cols-0` không hợp lệ),
//   #q    bội của 0.25 (`opacity-64`, `opacity-7.5`),
//   #num  số không âm bất kỳ,
//   #frac phân số a/b (`aspect-3/7`, `w-3/7`).
// Số viết chuẩn như Tailwind (`String(Number(v)) === v`: không nhận `01`, `1.50`). Họ spacing nhận bội 0.25
// vẫn lưu -1 như trước.
const BARE_PROBES = [['#int', '37'], ['#q', '13.25'], ['#num', '0.3'], ['#frac', '3/7'], ['#zero', '0']]
// So sau khi bỏ khoảng trắng quanh `/`: Tailwind viết phân số liệt kê `1/2` nhưng phân số trần `3 / 7`
// (cùng giá trị tính).
const sameBare = (template, value, key) => normalizeKey(instantiate(template, value)).replace(/ \/ /g, '/') === normalizeKey(key).replace(/ \/ /g, '/')
const bareKinds = new Map() // group -> ['#int', ...]
{
    const list = [...usedGroups]
    const names = list.flatMap((group) => BARE_PROBES.map(([, v]) => `${group.root}-${v}`))
    const out = ds.candidatesToCss(names)
    list.forEach((group, g) => {
        const ok = BARE_PROBES.filter(([, v], p) => {
            const css = out[g * BARE_PROBES.length + p]
            const rule = css && parseClassCss(`${group.root}-${v}`, css)
            return !!rule && sameBare(group.template, v, ruleKey(rule))
        }).map(([kind]) => kind)
        // `grid-cols-0` không hợp lệ (Tailwind: số nguyên dương) dù `grid-cols-37` hợp lệ.
        let numberKind = ['#num', '#q', '#int'].find((kind) => ok.includes(kind))
        if (numberKind === '#int' && !ok.includes('#zero') && !group.values.includes('0')) numberKind = '#pint'
        bareKinds.set(group, [numberKind, ok.includes('#frac') ? '#frac' : null].filter(Boolean))
    })
}
const families = {} // root -> [[templateIdx, valueSetIdx | -1 (số bất kỳ bội 0.25)]]
for (const group of usedGroups) {
    const members = group.names.filter((n) => assigned.get(n) === group)
    // Class dò chỉ dùng để dựng mẫu: không thành giá trị liệt kê.
    const values = members.filter((n) => !probeOnly.has(n)).map((n) => group.values[group.names.indexOf(n)])
    const kinds = bareKinds.get(group)
    const numeric = SPACING_TEMPLATE.test(group.template) && kinds.includes('#q') && values.every((v) => /^\d+(\.\d+)?$/.test(v))
    if (numeric) {
        ;(families[group.root] ||= []).push([internTemplate(group.template), -1])
        continue
    }
    // Giá trị liệt kê vẫn giữ (gợi ý của editor dựng từ đây) cạnh dấu loại.
    if (!values.length && !kinds.length) continue
    ;(families[group.root] ||= []).push([internTemplate(group.template), internValues([...kinds, ...values])])
}

// ---------------------------------------------------------------------------
// Giá trị tuỳ ý: thăm dò từng họ với giá trị mẫu theo kiểu
// ---------------------------------------------------------------------------

// Loại suy từ giá trị (bộ giải mã đoán loại theo cùng thứ tự): `image` (url()/gradient, cả danh sách nhiều lớp),
// `position` (`left 3px`), `size` (`3px auto`) — cần cho `bg-[...]`, nơi Tailwind chọn background-image/
// -position/-size theo loại thay vì màu.
// `var`: giá trị bắt đầu bằng `var(` (cả cú pháp `bg-(--x)`) — Tailwind không đoán loại, dùng nhánh mặc định của họ
// (`font-(--x)` -> font-weight trong khi `font-[probe]` -> font-family).
const PROBES = { length: '3px', color: '#123456', number: '7', any: 'probe', image: 'url(probe)', position: 'left_3px', size: '3px_auto', var: 'var(--probe)' }
// Gợi ý kiểu (`bg-[length:200%]`, `border-(length:--x)`): Tailwind dùng thẳng loại được gợi ý.
const HINT_PROBES = { color: '#123456', length: '3px', percentage: '3%', number: '7', integer: '7', url: 'url(probe)', image: 'url(probe)', position: '3px', 'bg-size': '3px', size: '3px', 'line-width': '3px', 'family-name': 'probe', 'absolute-size': 'probe', 'relative-size': 'probe', angle: '7deg' }
// Loại mà bộ giải mã dùng khi gặp gợi ý (khớp `arbitraryKind` trong src/tailwind-v4-core.ts); mẫu gợi ý chỉ lưu khi khác.
const HINT_KIND = { color: 'color', number: 'number', integer: 'number', length: 'length', percentage: 'length', 'line-width': 'length', url: 'image', image: 'image', position: 'position', 'bg-size': 'size', size: 'size' }
// Gốc utility chỉ nhận giá trị tuỳ ý (`bg-size-[...]`, `filter-[...]`, `mask-size-(--x)`) không có trong getClassList.
const roots = new Set([...Object.keys(families), ...classList.map((n) => splitsOf(n)[0]?.[0]).filter(Boolean), ...FUNCTIONAL_ROOTS])
const arbitrary = {} // root -> { kind: templateIdx }
const hints = {} // root -> { hint: templateIdx }
const templateOfProbe = (name, css, shown) => {
    if (!css) return undefined
    const rule = parseClassCss(name, css)
    if (!rule) return undefined
    const key = ruleKey(rule)
    return key.includes(shown) ? internTemplate(key.split(shown).join('{a}')) : undefined
}
const probeCandidates = []
for (const rootName of roots) for (const [kind, value] of Object.entries(PROBES)) probeCandidates.push([rootName, kind, value])
const probeCss = ds.candidatesToCss(probeCandidates.map(([r, , v]) => `${r}-[${v}]`))
probeCandidates.forEach(([rootName, kind, value], index) => {
    const t = templateOfProbe(`${rootName}-[${value}]`, probeCss[index], value.replace(/_/g, ' '))
    if (t !== undefined) (arbitrary[rootName] ||= {})[kind] = t
})
for (const kinds of Object.values(arbitrary)) {
    if (kinds.var === kinds.any) delete kinds.var
    // Loại mới chỉ giữ khi mẫu đặt giá trị vào thuộc tính ảnh/vị trí/kích thước (`bg-*`, `mask-*`) và khác `any`:
    // nơi khác (`font-[3px_auto]` -> font-weight) Tailwind đoán theo loại riêng của họ, bộ giải mã không mô phỏng.
    for (const kind of ['image', 'position', 'size']) {
        const text = kinds[kind] === undefined ? '' : JSON.parse(templates[kinds[kind]])[1].filter(([, v]) => v.includes('{a}')).map(([p]) => p).join(' ')
        if (kinds[kind] === kinds.any || !/(image|position|size)\b/.test(text)) delete kinds[kind]
    }
}
{
    const list = []
    for (const rootName of Object.keys(arbitrary)) for (const [hint, value] of Object.entries(HINT_PROBES)) list.push([rootName, hint, value])
    const css = ds.candidatesToCss(list.map(([r, h, v]) => `${r}-[${h}:${v}]`))
    list.forEach(([rootName, hint, value], index) => {
        const t = templateOfProbe(`${rootName}-[${hint}:${value}]`, css[index], value)
        if (t === undefined) return
        const kinds = arbitrary[rootName]
        const kind = HINT_KIND[hint] ?? 'any'
        if ((kinds[kind] ?? kinds.any ?? kinds.length) !== t) (hints[rootName] ||= {})[hint] = t
    })
}

// Khoá theme tự định nghĩa (`@theme { --aspect-wide: 3/1 }` -> `aspect-wide`, `--z-index-modal`, `--opacity-x`...):
// theme mặc định chỉ có vài khoá (`--aspect-video`, lưu tường minh) hoặc không có khoá nào ở nhiều namespace, nên
// họ chưa có mẫu đọc `var(--ns-{v})`. Dò bằng chính Tailwind: mỗi namespace Tailwind đọc (`themeKeys` trong bản
// build: mảng `["--x",...]` + namespace của theme.css) với một khoá lạ, trên mọi gốc utility. Mẫu thu được thường là mẫu giá trị tuỳ ý
// `any` của họ với `{a}` = `var(--ns-{v})`: chỉ ghi namespace (`themeRoots`: `ns:gốc gốc|...`), bộ giải mã dựng lại
// khi theme của dự án có biến đó; mẫu khác (`scale-*` đặt ba biến) thêm vào họ với bộ giá trị là khoá mặc định.
const THEME_PROBE = 'zzqprobe'
const THEME_SIDES = ['b', 'be', 'bs', 'e', 'l', 'r', 's', 't', 'x', 'y']
// Loại giá trị tuỳ ý dùng làm mẫu theo namespace (cùng quy tắc với `themeKind` trong src/tailwind-v4.ts).
const themeKind = (ns) => (/color|fill|stroke$/.test(ns) ? 'color' : /width|thickness|positions/.test(ns) ? 'length' : /image/.test(ns) ? 'image' : 'any')
const defaultThemeVars = {}
for (const m of readTw('theme.css').matchAll(/(--[\w.-]+(?:\\.[\w-]+)*)\s*:\s*([^;]+);/g)) defaultThemeVars[m[1]] = m[2]
const themeNamespaces = [...new Set([
    ...[...readTw('dist/lib.js').matchAll(/\[("--[\w-]+"(?:,"--[\w-]+")*)\]/g)].flatMap((m) => [...m[1].matchAll(/"(--[\w-]+)"/g)].map((k) => k[1])),
    ...Object.keys(defaultThemeVars).map((k) => k.match(/^(--[a-z]+(?:-[a-z]+)*?)-[^-]/)?.[1]).filter(Boolean),
])].filter((ns) => !/^--(spacing|default-.*|modifier|value)$/.test(ns))
const themeFamilies = []
const themeRoots = {} // ns (không `--`) -> [gốc]
{
    const probeValue = (ns) => (/color/.test(ns) ? '#123456' : ns === '--aspect' ? '3 / 1' : '7px')
    const rootList = [...new Set([...Object.keys(families), ...FUNCTIONAL_ROOTS])]
    for (const ns of themeNamespaces) {
        const probeDs = await __unstable__loadDesignSystem(`@import "tailwindcss";\n@theme { ${ns}-${THEME_PROBE}: ${probeValue(ns)}; }`, { base: twDir, loadStylesheet })
        const out = probeDs.candidatesToCss(rootList.map((r) => `${r}-${THEME_PROBE}`))
        rootList.forEach((rootName, index) => {
            const rule = out[index] && parseClassCss(`${rootName}-${THEME_PROBE}`, out[index])
            if (!rule) return
            const template = ruleKey(rule).split(THEME_PROBE).join('{v}')
            if (!template.includes(`var(${ns}-{v})`)) return
            // Họ đã có mẫu đọc namespace này (`text-*` bỏ `--line-height` khi thiếu, bóng đổ dựng lại): bộ giải mã lo.
            if ((families[rootName] || []).some(([t]) => templates[t].includes(`var(${ns}-{v})`)) || /shadow/.test(ns)) return
            const kinds = arbitrary[rootName] || {}
            // Bộ giải mã chọn mẫu `color` cho namespace màu (`--background-color`, `--fill`), còn lại `any`.
            const any = kinds[themeKind(ns)] ?? kinds.any ?? kinds.length
            if (any !== undefined && templates[any].split('{a}').join(`var(${ns}-{v})`) === template) {
                ;(themeRoots[ns.slice(2)] ||= []).push(rootName)
                return
            }
            const keys = Object.keys(defaultThemeVars).filter((k) => k.startsWith(ns + '-') && !k.slice(ns.length + 1).includes('--')).map((k) => k.slice(ns.length + 1))
            ;(families[rootName] ||= []).push([internTemplate(template), internValues(keys)])
            themeFamilies.push(`${rootName}(${ns})`)
        })
    }
}

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
const FALLBACK_WRAP = ['@layer l0{@supports ((-webkit-hyphens: none) and (not (margin-trim: block))) or ((-moz-orient: inline) and (not (color:rgb(from red r g b)))){*,::before,::after,::backdrop{', '}}}']
// Dạng gọn của @property: `x` (syntax "*", không initial-value), [x, initial] hoặc [x, initial, chỉ số syntax]
// với tên `--tw-x`; bộ giải mã dựng lại đúng chuỗi trên (kiểm ở cuối file).
const propertySyntaxes = ['*']
const propertyList = [...propertyBlocks].map(([name, block]) => {
    const m = block.match(/^@property --tw-([\w-]+) \{ syntax: "([^"]*)"; inherits: false;(?: initial-value: ([^;]*);)? \}$/)
    if (!m || `--tw-${m[1]}` !== name) throw new Error(`@property chưa nén được: ${block}`)
    if (!propertySyntaxes.includes(m[2])) propertySyntaxes.push(m[2])
    const syntax = propertySyntaxes.indexOf(m[2])
    if (m[3] === undefined && syntax) throw new Error(`@property có syntax nhưng không có initial-value: ${block}`)
    return m[3] === undefined ? m[1] : syntax ? [m[1], m[3], syntax] : [m[1], m[3]]
})

// @property chỉ đăng ký khi utility sẵn có cần nó được dùng, như Tailwind (không đăng ký sẵn cả bảng): CSS của dự
// án/plugin đọc `--tw-*` mà không tự đặt (daisyUI: `outline-style: var(--tw-outline-style)`) chỉ thấy giá trị khởi
// tạo khi trang có utility đăng ký biến đó. Quy tắc (bộ giải mã: `propertyRules` trong src/tailwind-v4.ts): utility
// đăng ký cả NHÓM (các biến Tailwind luôn đăng ký cùng nhau, ví dụ 14 biến của shadow/ring) của mỗi biến nó đặt
// (`--tw-x:`) hoặc đọc không kèm dự phòng (`var(--tw-x)`), trừ biến trong PROPERTY_NO_SET khi đặt (`outline-solid`,
// `ring-red-500`, `content-none` không đăng ký), trong PROPERTY_NO_READ khi đọc (`bg-linear-to-r` đọc
// `--tw-gradient-stops` mà không đăng ký); đọc kèm dự phòng (`var(--tw-x, ...)`) chỉ tính với PROPERTY_FALLBACK_READ.
// Kiểm trên mọi class của getClassList: lệch ghi ở `propertyMismatch`, chỉ còn class cũ `transform`/`filter`/
// `backdrop-filter` (đọc `var(--tw-x, )` như `transform-gpu` không đăng ký) và `text-shadow-none` (không đọc biến nào):
// biến đọc kèm dự phòng rỗng mà không đăng ký cho cùng computed style.
const PROPERTY_NO_SET = ['border-style', 'outline-style', 'ring-color', 'inset-ring-color', 'ring-offset-color', 'ring-offset-width', 'ring-offset-shadow', 'mask-radial-shape', 'mask-radial-size', 'mask-radial-position', 'gradient-position', 'gradient-via-stops', 'content']
const PROPERTY_NO_READ = ['gradient-stops', 'ring-offset-width', 'ring-offset-color']
const PROPERTY_FALLBACK_READ = ['text-shadow-color']
const propertyTriggers = (css) => {
    const out = new Set()
    for (const m of css.matchAll(/(--tw-[\w-]+)\s*:/g)) if (!PROPERTY_NO_SET.includes(m[1].slice(5))) out.add(m[1])
    for (const m of css.matchAll(/var\((--tw-[\w-]+)\s*([),])/g)) if (m[2] === ')' ? !PROPERTY_NO_READ.includes(m[1].slice(5)) : PROPERTY_FALLBACK_READ.includes(m[1].slice(5))) out.add(m[1])
    return out
}
// Nhóm: biến có cùng tập class đăng ký nó (biến không class nào đăng ký: nhóm riêng).
const registeredBy = classList.map((name, index) => {
    const css = cssList[index] || ''
    return { name, css: css.replace(/@property[^{]*\{[^}]*\}/g, ''), registered: new Set([...css.matchAll(/@property\s+(--[\w-]+)/g)].map((m) => m[1])) }
})
const propertyAtom = new Map()
for (const name of propertyBlocks.keys()) {
    const signature = registeredBy.map((c) => (c.registered.has(name) ? 1 : 0)).join('')
    propertyAtom.set(name, signature.includes('1') ? signature : name)
}
const propertyMismatch = []
for (const { name, css, registered } of registeredBy) {
    const atoms = new Set([...propertyTriggers(css)].filter((v) => propertyAtom.has(v)).map((v) => propertyAtom.get(v)))
    const derived = [...propertyBlocks.keys()].filter((v) => atoms.has(propertyAtom.get(v)))
    if (derived.length !== registered.size || derived.some((v) => !registered.has(v))) propertyMismatch.push(name)
}
const PROPERTY_KNOWN_MISMATCH = ['transform', 'filter', 'backdrop-filter', 'text-shadow-none']
if (propertyMismatch.some((name) => !PROPERTY_KNOWN_MISMATCH.includes(name))) throw new Error(`Quy tắc đăng ký @property lệch Tailwind: ${propertyMismatch.slice(0, 20).join(' ')}`)
// Bảng gọn xếp lại theo nhóm (thứ tự xuất @property không ảnh hưởng gì); `+` trước tên: mục đầu của một nhóm; dấu
// sau tên: `!` thuộc PROPERTY_NO_SET, `?` thuộc PROPERTY_NO_READ, `~` thuộc PROPERTY_FALLBACK_READ.
const atomOrder = [...new Set(propertyAtom.values())]
const groupedProperties = [...propertyBlocks.keys()]
    .map((name, index) => [name, propertyList[index]])
    .sort((a, b) => atomOrder.indexOf(propertyAtom.get(a[0])) - atomOrder.indexOf(propertyAtom.get(b[0])))
    .map(([name, entry], index, all) => {
        const short = name.slice(5)
        const label = (index && propertyAtom.get(all[index - 1][0]) === propertyAtom.get(name) ? '' : '+') + short +
            (PROPERTY_NO_SET.includes(short) ? '!' : '') + (PROPERTY_NO_READ.includes(short) ? '?' : '') + (PROPERTY_FALLBACK_READ.includes(short) ? '~' : '')
        return typeof entry === 'string' ? label : [label, ...entry.slice(1)]
    })

const preflightCss = readTw('preflight.css')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@layer base\s*\{([\s\S]*)\}\s*$/, '$1')
    .replace(/\s+/g, ' ')
    // `--theme(--x, dự phòng)` là hàm lúc build của Tailwind, kết quả là `var(--x, dự phòng)`.
    .replace(/--theme\(\s*/g, 'var(')
    .trim()

// Dạng trung gian: mỗi mẫu/rule là [chỉ số selector, ...chỉ số khai báo `prop:value`] trỏ vào bảng dùng
// chung. Bước nén cho bản phân phối (cuối file) đổi tiếp sang dạng gọn hơn.
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
// Bảng màu: họ đủ 11 sắc độ dạng `oklch(L% C H)` (H có thể là `none`: zinc, neutral...) nén thành chuỗi
// `red:L C H,...|blue:...` (nhẹ hơn ~1 KB gzip).
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const paletteTheme = { ...theme }
const palette = []
for (const family of new Set(Object.keys(theme).map((k) => k.match(/^--color-([a-z]+)-\d+$/)?.[1]).filter(Boolean))) {
    const values = SHADES.map((shade) => theme[`--color-${family}-${shade}`]?.match(/^oklch\(([\d.]+)% ([\d.]+) ([\d.]+|none)\)$/))
    const familyKeys = Object.keys(theme).filter((k) => k.startsWith(`--color-${family}-`))
    if (values.some((m) => !m) || familyKeys.length !== SHADES.length) continue
    palette.push(`${family}:${values.map((m) => `${m[1]} ${m[2]} ${m[3]}`).join(',')}`)
    familyKeys.forEach((k) => delete paletteTheme[k])
}
const STRUCTURE = {
    version: twVersion,
    theme: paletteTheme,
    palette: palette.join('|'),
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
    hints,
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
    themeFamilies: themeFamilies.length,
    themeRoots: Object.values(themeRoots).flat().length,
    propertyMismatch: propertyMismatch.length,
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
    if (probeOnly.has(name)) continue
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

// ---------------------------------------------------------------------------
// Nén cho bản phân phối (bộ giải mã ở đầu src/tailwind-v4-core.ts dựng lại đúng các bảng trên)
// ---------------------------------------------------------------------------
// 1. Khai báo tách thành [chỉ số thuộc tính, chỉ số giá trị] và nằm thẳng trong rule: rule gọn là
//    [selector?, prop, value, prop, value...] (độ dài lẻ thì phần tử đầu là selector, vắng là selector 0).
//    Bảng thuộc tính bắt đầu bằng bảng thứ tự của Tailwind (TW_ORDER.properties chỉ còn là số phần tử).
// 2. Class tường minh dựng được từ mẫu của họ bằng cách thay một biểu thức `xs[x]` bằng hằng
//    (`h-full`: `height:calc(var(--spacing) * {v})` -> `height:100%`) lưu thành [j, x, chỉ số lits] với lits
//    là chuỗi `full=100%|px=1px` dùng chung giữa các họ. Mẫu giá trị tuỳ ý dựng cùng cách ([j, x, chỉ số giá trị]).
// 3. Mọi thứ theo gốc gộp vào `roots[gốc] = [arbitrary, derived, ...mẫu của họ]`; mẫu họ là [bộ giá trị, ...rule gọn].
// 4. Bộ giá trị trùng khoá một namespace của theme mặc định (bảng màu) lưu thành `@--color-`.
const ARBITRARY_KINDS = ['length', 'color', 'number', 'any', 'image', 'position', 'size', 'var']
const compactData = () => {
    const S = STRUCTURE
    const ruleOf = (packed) => ({ sel: packed[0], decls: packed.slice(1).map((i) => S.decls[i]) })
    const textOf = (rule) => rule.sel + '\n' + rule.decls.join('\n')
    const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // L sao cho `target` = mẫu với mọi `x` thay bằng L (null nếu không có).
    const solve = (templateText, x, target) => {
        if (!templateText.includes(x)) return null
        const parts = templateText.split(x)
        const m = target.match(new RegExp('^' + parts.map(escapeRe).join('([^]*?)') + '$'))
        if (!m || m.slice(2).some((l) => l !== m[1])) return null
        return parts.join(m[1]) === target ? m[1] : null
    }
    const xsSet = new Set(['calc(var(--spacing) * {v})', 'calc(var(--spacing) * -{v})', 'var(--color-{v})', 'calc({f} * 100%)'])
    for (const t of S.templates) for (const i of t.slice(1)) for (const m of S.decls[i].matchAll(/var\(--[\w-]*?\{v\}\)/g)) xsSet.add(m[0])
    xsSet.add('{v}')
    const xs = [...xsSet]
    const rules = []
    const use = (rule) => (rules.push(rule), rule)
    const derive = (rootName, rule) => {
        const entries = S.families[rootName]
        if (!entries) return null
        const target = textOf(rule)
        for (let j = 0; j < entries.length; j++) {
            const t = ruleOf(S.templates[entries[j][0]])
            if (t.sel !== rule.sel || t.decls.length !== rule.decls.length) continue
            for (let x = 0; x < xs.length; x++) {
                const l = solve(textOf(t), xs[x], target)
                if (l !== null && !/[|=\n]/.test(l)) return [j, x, l]
            }
        }
        return null
    }
    const familyRules = Object.fromEntries(Object.entries(S.families).map(([r, entries]) => [r, entries.map(([t, s]) => ({ s, rule: use(ruleOf(S.templates[t])) }))]))
    const derivedGroups = {}
    const explicitRules = {}
    for (const [name, packed] of Object.entries(S.explicit)) {
        const rule = ruleOf(packed)
        const split = splitsOf(name).reverse().find(([r, suffix]) => !/[|=]/.test(suffix) && derive(r, rule))
        if (!split) {
            explicitRules[name] = use(rule)
            continue
        }
        const [j, x, l] = derive(split[0], rule)
        const groups = (derivedGroups[split[0]] ||= new Map())
        if (!groups.has(`${j},${x}`)) groups.set(`${j},${x}`, [])
        groups.get(`${j},${x}`).push(`${split[1]}=${l}`)
    }
    const lits = []
    const derived = Object.fromEntries(Object.entries(derivedGroups).map(([r, groups]) => [r, [...groups].map(([key, pairs]) => {
        const text = pairs.sort().join('|')
        if (!lits.includes(text)) lits.push(text)
        return [...key.split(',').map(Number), lits.indexOf(text)]
    })]))
    const valCount = new Map()
    const count = (v) => valCount.set(v, (valCount.get(v) || 0) + 1)
    const tplRules = []
    const tplIndex = new Map()
    const specOf = (r, t) => {
        const rule = ruleOf(S.templates[t])
        const d = derive(r, rule)
        if (d) return count(d[2]), { d }
        if (!tplIndex.has(t)) tplIndex.set(t, tplRules.push(use(rule)) - 1)
        return tplIndex.get(t)
    }
    const arbitrarySpecs = Object.fromEntries(Object.entries(S.arbitrary).map(([r, spec]) => {
        if (typeof spec === 'number') return [r, specOf(r, spec)]
        for (const kind of Object.keys(spec)) if (!ARBITRARY_KINDS.includes(kind)) throw new Error(`Loại giá trị tuỳ ý lạ: ${kind}`)
        const list = ARBITRARY_KINDS.map((kind) => (spec[kind] === undefined ? null : specOf(r, spec[kind])))
        // Bỏ null cuối nhưng giữ tối thiểu 4 phần tử (mảng 3 phần tử là mẫu dựng [j, x, giá trị]).
        while (list.length > 4 && list.at(-1) === null) list.pop()
        return [r, list]
    }))
    // Mẫu theo gợi ý kiểu: { gốc: { gợi ý: spec } }.
    const hintSpecs = Object.fromEntries(Object.entries(S.hints).map(([r, map]) => [r, Object.fromEntries(Object.entries(map).map(([hint, t]) => [hint, specOf(r, t)]))]))
    for (const rule of rules) for (const d of rule.decls) count(d.slice(d.indexOf(':') + 1))
    // Giá trị hay gặp có chỉ số nhỏ.
    const vals = [...valCount].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([v]) => v)
    const valIndex = new Map(vals.map((v, i) => [v, i]))
    const props = [...propertyOrder]
    const pack = (rule) => {
        const out = rule.sel ? [rule.sel] : []
        for (const d of rule.decls) {
            const colon = d.indexOf(':')
            const prop = d.slice(0, colon)
            if (!props.includes(prop)) props.push(prop)
            out.push(props.indexOf(prop), valIndex.get(d.slice(colon + 1)))
        }
        return out
    }
    const packSpec = (s) => (s === null || typeof s === 'number' ? s : [s.d[0], s.d[1], valIndex.get(s.d[2])])
    const roots = {}
    for (const r of new Set([...Object.keys(S.families), ...Object.keys(S.arbitrary)])) {
        const spec = arbitrarySpecs[r]
        roots[r] = [spec === undefined ? null : Array.isArray(spec) ? spec.map(packSpec) : packSpec(spec), derived[r] ?? 0, ...(familyRules[r] || []).map(({ s, rule }) => [s, ...pack(rule)])]
    }
    const hintsOut = Object.fromEntries(Object.entries(hintSpecs).map(([r, map]) => [r, Object.fromEntries(Object.entries(map).map(([hint, spec]) => [hint, packSpec(spec)]))]))
    // Khoá theme mặc định (kể cả bảng màu) theo namespace, như bộ giải mã tính.
    const nsKeys = (ns) => Object.keys(theme).filter((k) => k.startsWith(ns) && !k.slice(ns.length).includes('--')).map((k) => k.slice(ns.length)).sort().join(' ')
    const namespaces = new Set(Object.keys(theme).flatMap((k) => k.slice(2).split('-').slice(0, -1).map((_, i, parts) => `--${parts.slice(0, i + 1).join('-')}-`)))
    const sets = S.valueSets.map((set) => [...namespaces].map((ns) => '@' + ns).find((ns) => nsKeys(ns.slice(1)) === set) ?? set)
    stats.explicitStored = Object.keys(explicitRules).length
    stats.derived = Object.keys(S.explicit).length - stats.explicitStored
    return {
        version: S.version,
        theme: S.theme,
        palette: S.palette,
        props,
        vals,
        sels: S.sels,
        xs,
        lits,
        valueSets: sets,
        roots,
        hints: hintsOut,
        explicit: Object.fromEntries(Object.entries(explicitRules).map(([name, rule]) => [name, pack(rule)])),
        tpl: tplRules.map(pack),
        properties: groupedProperties,
        syntaxes: propertySyntaxes,
        fallback: FALLBACK_WRAP,
        keyframes,
    }
}
// Thứ tự khoá chỉ ảnh hưởng kích thước nén: gzip chỉ nhìn lại 32 KB nên đặt các bảng giống nhau gần nhau.
// Thứ tự dưới đây tìm bằng thử (gzip của dist/tailwind-auto.mjs nhỏ hơn ~0,6 KB so với thứ tự dựng); bộ giải mã đọc theo tên.
// Gốc âm, cạnh: xem dưới. Bảng namespace -> gốc nằm ở file riêng: chỉ phần đọc stylesheet (theme của dự án) cần,
// bản CDN nạp động nó cùng tailwind-stylesheet.mjs.
    // Gốc âm (`-inset`) không ghi: bộ giải mã thêm khi gốc dương có trong danh sách và gốc âm có mẫu tuỳ ý.
const THEME_ROOTS_TEXT = Object.entries(themeRoots).map(([ns, list]) => {
        for (const r of list) if (!r.startsWith('-') && arbitrary['-' + r] && !list.includes('-' + r)) throw new Error(`themeRoots: thiếu gốc âm -${r} (${ns})`)
        let rest = list.filter((r) => !(r.startsWith('-') && list.includes(r.slice(1))))
        // `m*` = `m mb mbe ... my`, `border-*` = `border border-b ... border-y` (chỉ gốc có mẫu tuỳ ý).
        for (const r of [...rest]) for (const sep of ['', '-']) {
            const group = [r, ...THEME_SIDES.map((side) => r + sep + side)].filter((x) => arbitrary[x])
            if (group.length > 3 && group.every((x) => rest.includes(x))) rest = [...rest.filter((x) => !group.includes(x)), r + sep + '*']
        }
        return `${ns}:${rest.join(' ')}`
}).join('|')
const DIST_KEY_ORDER = ['version', 'palette', 'tpl', 'roots', 'explicit', 'hints', 'props', 'properties', 'xs', 'vals', 'syntaxes', 'lits', 'valueSets', 'fallback', 'theme', 'keyframes', 'sels']
const DIST = (() => {
    const data = compactData()
    if (Object.keys(data).sort().join() !== [...DIST_KEY_ORDER].sort().join()) throw new Error('DIST_KEY_ORDER thiếu/thừa khoá của dữ liệu nén')
    return Object.fromEntries(DIST_KEY_ORDER.map((key) => [key, data[key]]))
})()
// Bộ giải mã dựng lại CSS @property từ dạng gọn: kiểm khớp từng ký tự (từng khối và khai báo dự phòng).
{
    const list = DIST.properties.map((e) => (typeof e === 'string' ? [e] : e)).map(([n, ...rest]) => [n.replace(/[+!?~]/g, ''), ...rest])
    const rebuilt = [
        ...list.map(([n, init, syntax]) => `@property --tw-${n} { syntax: "${DIST.syntaxes[syntax || 0]}"; inherits: false;${init === undefined ? '' : ` initial-value: ${init};`} }`).sort(),
        DIST.fallback[0] + list.map(([n, init]) => `--tw-${n}:${init ?? 'initial'}`).sort().join(';') + DIST.fallback[1],
        ...DIST.keyframes,
    ].join('\n')
    const original = [...[...propertyBlocks.values()].sort(), FALLBACK_WRAP[0] + [...fallbackDecls].sort().join(';') + FALLBACK_WRAP[1], ...keyframes].join('\n')
    if (rebuilt !== original) throw new Error('Dạng gọn của @property không dựng lại đúng CSS gốc')
}
const DIST_ORDER = { ...ORDER, properties: propertyOrder.length }

const header = `// @generated bởi scripts/gen-tailwind-map.mjs từ tailwindcss@${twVersion} — KHÔNG sửa tay.\n// ${JSON.stringify(stats)}\n`
const body = `${header}
/** Dữ liệu phương ngữ dạng nén; giải mã ở đầu src/tailwind-v4-core.ts (định dạng: xem bước nén trong script sinh). */
export const TW_DATA = ${JSON.stringify(DIST)} as const

/** Preflight (reset) của Tailwind, bọc trong layer thấp nhất \`l0\`. */
export const TW_PREFLIGHT_CSS = ${JSON.stringify('@layer l0{' + preflightCss + '}')}

/**
 * Thứ tự class của Tailwind: số thuộc tính đầu của TW_DATA.props là bảng thứ tự thuộc tính, [loại, thứ tự]
 * của gốc biến thể, chiều so sánh của nhóm breakpoint/container.
 */
export const TW_ORDER = ${JSON.stringify(DIST_ORDER)} as const

/** Class chuyển gần đúng (bỏ @media lồng của Tailwind). */
export const TW_APPROXIMATE: readonly string[] = ${JSON.stringify([...approximateClasses].filter((n) => parsed.has(n) && !probeOnly.has(n)).sort())}

/** Class Tailwind chưa có dạng chuyển được (nhiều rule, @media lồng). */
export const TW_UNSUPPORTED: readonly string[] = ${JSON.stringify(unsupported)}
`
fs.writeFileSync(path.join(root, 'src/tailwind-generated.ts'), body)
fs.writeFileSync(path.join(root, 'src/tailwind-theme-roots-generated.ts'), `// @generated bởi scripts/gen-tailwind-map.mjs từ tailwindcss@${twVersion} — KHÔNG sửa tay.

/**
 * Namespace theme -> gốc utility đọc khoá tự định nghĩa của namespace đó qua mẫu giá trị tuỳ ý (\`ns:gốc gốc|...\`;
 * \`m*\`/\`border-*\`: gốc cùng các cạnh; gốc âm đi cùng gốc dương). Giải mã ở src/tailwind-v4-core.ts (THEME_ROOTS).
 */
export const TW_THEME_ROOTS: string = ${JSON.stringify(THEME_ROOTS_TEXT)}
`)
console.log(`[gen-tailwind-map] tailwindcss@${twVersion} -> src/tailwind-generated.ts`)
console.log('  ' + JSON.stringify(stats))
console.log('  họ thêm mẫu khoá theme tự định nghĩa: ' + themeFamilies.join(' '))
console.log(`  kích thước: ${(body.length / 1024).toFixed(1)} KB`)
