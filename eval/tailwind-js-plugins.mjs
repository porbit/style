#!/usr/bin/env node
/**
 * Plugin JS Tailwind chạy qua API giả lập (`src/tailwind-plugin-api.ts`, không cần tailwindcss) so với
 * Tailwind 4.3.5 thật + chính plugin đó.
 *
 *   npm run build && node eval/tailwind-js-plugins.mjs [tên-plugin...]
 *
 * Với mỗi plugin:
 *   - class: mọi class mới trong `getClassList()` của Tailwind (khi có `@plugin`) + vài class thêm (modifier,
 *     giá trị tuỳ ý, giá trị trần). Mỗi class đặt trên một cây HTML mẫu; so computed style của mọi phần tử con
 *     (kể cả giả phần tử `::before`, `::-webkit-scrollbar`... khi plugin có) giữa CSS Tailwind và CSS @porbit/style.
 *     Animation được dừng ở thời điểm 0 để so được.
 *   - biến thể: mọi biến thể mới hoặc bị plugin đổi (`getVariants()`, kể cả dạng ghép `group-x`, `not-x`), so rule
 *     của `v:flex`: cùng điều kiện at-rule, cùng khai báo, selector chọn cùng tập phần tử trên một cây DOM ngẫu nhiên.
 *   - base (`addBase`): một phần tử không class.
 * @porbit/style: `createTailwindPluginLoader` (dist/postcss) -> `parseTailwindStylesheet` -> `tailwindV4Dialect`
 * -> `extractFromClasses`, cùng các bước plugin PostCSS dùng. @tailwindcss/forms, typography và tailwindcss-animate
 * có bản đóng gói sẵn; ở đây đo chính đường JS. Kết quả: eval/tailwind-js-plugins.json.
 */
import { __unstable__loadDesignSystem, compile } from 'tailwindcss'
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const twDir = path.dirname(require.resolve('tailwindcss/package.json'))
const loadStylesheet = async (id, base) => {
    const file = id === 'tailwindcss' ? 'index.css' : id.replace(/^tailwindcss\//, '')
    return { base, path: file, content: fs.readFileSync(path.join(twDir, file), 'utf8') }
}
// Plugin ESM (`export default`): lấy `default` như @tailwindcss/node.
const loadModule = async (id, base) => {
    const mod = require(id)
    return { base, path: id, module: mod?.__esModule || mod?.[Symbol.toStringTag] === 'Module' ? mod.default : mod }
}
const versionOf = (id) => JSON.parse(fs.readFileSync(path.join(root, 'node_modules', id, 'package.json'), 'utf8')).version

const { extractFromClasses } = await import(path.join(root, 'dist/index.mjs'))
const tw = await import(path.join(root, 'dist/tailwind.mjs'))
const { createTailwindPluginLoader } = await import(path.join(root, 'dist/postcss.mjs'))
const { resolveTailwindPlugin } = await import(path.join(root, 'dist/tailwind-plugins.mjs'))

const PROSE_TREE = '<h1>T</h1><h2>S</h2><p class="lead">L</p><p>a <a href="#">b</a> <strong>c</strong> <code>d</code> <kbd>k</kbd></p><blockquote><p>q</p></blockquote><ul><li>x</li><li>y</li></ul><ol><li>z</li></ol><pre><code>p</code></pre><table><thead><tr><th>h</th></tr></thead><tbody><tr><td>v</td></tr></tbody></table><hr><figure><img alt=""><figcaption>f</figcaption></figure>'
const FORM_TREE = '<input type="text"><input type="email"><input type="checkbox" checked><input type="radio"><select><option>a</option></select><select multiple><option>a</option></select><textarea></textarea><input type="file">'
const SCROLL_TREE = '<div style="height:300px">x</div>'
const PROSE_EXTRA = ['prose prose-headings:underline', 'prose prose-a:text-blue-600', 'prose dark:prose-invert', 'prose md:prose-lg', 'prose prose-p:my-2 prose-code:text-red-500', 'prose prose-img:rounded-xl']
const SCROLLBAR_PSEUDOS =['::-webkit-scrollbar', '::-webkit-scrollbar-thumb', '::-webkit-scrollbar-track', '::-webkit-scrollbar-corner']

const PLUGINS = [
    {
        id: 'tailwindcss-animate',
        extra: ['fade-in-37', 'zoom-in-[0.8]', 'slide-in-from-top-[10px]', 'spin-in-[12deg]', 'animate-in fade-in zoom-in-95', 'md:slide-out-to-left-1/2', 'hover:fade-out-25', '-slide-in-from-left-2', 'duration-[2s]', 'delay-[150ms]'],
    },
    { id: 'tailwind-scrollbar', tree: SCROLL_TREE, style: 'overflow:scroll;height:100px', pseudos: SCROLLBAR_PSEUDOS, extra: ['scrollbar-thumb-red-500/50', 'scrollbar-track-[#123456]', 'scrollbar-thumb-[rgb(1,2,3)]/25', 'scrollbar-thin scrollbar-thumb-sky-700 scrollbar-track-sky-300'], plain: true },
    { id: 'tailwind-scrollbar', label: 'tailwind-scrollbar (nocompatible)', options: { nocompatible: true }, tree: SCROLL_TREE, style: 'overflow:scroll;height:100px', pseudos: SCROLLBAR_PSEUDOS, extra: ['scrollbar-w-[3px]', 'scrollbar-thumb-rounded-[4px]', 'scrollbar scrollbar-w-2 scrollbar-h-0.5'] },
    { id: 'tailwind-scrollbar-hide', tree: SCROLL_TREE, style: 'overflow:scroll;height:100px', pseudos: SCROLLBAR_PSEUDOS },
    { id: 'tailwindcss-animated', extra: ['animate-duration-[1234ms]', 'animate-delay-[50ms]', 'animate-iteration-[7]', 'animate-wiggle animate-infinite animate-ease-in-out'] },
    {
        id: 'tailwindcss-motion',
        extra: ['motion-duration-300/scale', 'motion-delay-100/opacity', 'motion-ease-spring-bouncy/rotate', 'motion-scale-loop-50/reset', 'motion-preset-fade motion-duration-2000', 'motion-translate-x-in-[10px]', 'motion-bg-in-red-500', '-motion-rotate-in-45'],
    },
    { id: 'tailwindcss-react-aria-components', variantsOnly: true },
    { id: 'tailwindcss-react-aria-components', label: 'tailwindcss-react-aria-components (prefix: rac)', options: { prefix: 'rac' }, variantsOnly: true },
    { id: '@tailwindcss/forms', tree: FORM_TREE, plain: true },
    { id: '@tailwindcss/typography', tree: PROSE_TREE, extra: PROSE_EXTRA },
    // Bản đóng gói sẵn của cùng plugin (tailwindcss-animate -> tw-animate-css) đo trên cùng bộ class, để so hai đường.
    { id: 'tailwindcss-animate', label: 'tailwindcss-animate (bản đóng gói: tw-animate-css)', bundled: true },
    { id: '@tailwindcss/forms', label: '@tailwindcss/forms (bản đóng gói)', bundled: true, tree: FORM_TREE, plain: true },
    { id: '@tailwindcss/typography', label: '@tailwindcss/typography (bản đóng gói)', bundled: true, tree: PROSE_TREE, extra: PROSE_EXTRA },
]

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

/** Chữ ký computed style của từng `[data-k]` (phần tử + con + giả phần tử). */
const signatures = async (css, html, pseudos) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${html}<div data-ref></div></body></html>`)
    const result = await page.evaluate((pseudos) => {
        // Dừng animation ở thời điểm 0: hai bên so được, không phụ thuộc thời gian.
        for (const animation of document.getAnimations()) {
            animation.pause()
            animation.currentTime = 0
        }
        const rootStyle = getComputedStyle(document.documentElement)
        const props = [...getComputedStyle(document.body)].filter((p) => !p.startsWith('--') || p.startsWith('--tw-')).sort()
        const sig = (el, pseudo) => {
            const cs = getComputedStyle(el, pseudo || null)
            // Biến CSS của plugin (`--scrollbar-thumb`), bỏ biến theme thừa hưởng từ `:root`.
            const custom = [...cs].filter((p) => p.startsWith('--') && !props.includes(p) && cs.getPropertyValue(p) !== rootStyle.getPropertyValue(p))
            return [...props, ...custom.sort()].map((p) => p + ':' + cs.getPropertyValue(p).trim()).join(';')
        }
        // `ref`: phần tử không class — giá trị `--tw-*` mặc định (@property) để biết khi nào thiếu biến là vô hại.
        const ref = sig(document.querySelector('[data-ref]'), '')
        return { ref, cases: [...document.querySelectorAll('[data-k]')].map((el) => [el, ...el.querySelectorAll('*')].flatMap((node) => ['', ...pseudos].map((pseudo) => sig(node, pseudo)))) }
    }, pseudos)
    await page.close()
    return result
}
const diff = (a, b, ref) => {
    const map = (s) => new Map(s.split(';').filter(Boolean).map((x) => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1)]))
    const out = []
    const defaults = map(ref)
    a.forEach((part, i) => {
        const ma = map(part)
        const mb = map(b[i] || '')
        for (const [k, v] of ma) if (mb.get(k) !== v && !(k.startsWith('--tw-') && mb.get(k) === undefined && defaults.get(k) === v)) out.push(`#${i} ${k}: tw=${v} | ours=${mb.get(k)}`)
        for (const [k, v] of mb) if (!ma.has(k) && !k.startsWith('--tw-')) out.push(`#${i} ${k}: tw=(không có) | ours=${v}`)
    })
    return out
}

/** Rule (điều kiện at-rule | selector | khai báo) của từng class, chuẩn hoá qua CSSOM. */
const ruleSets = async (css, classNames) => {
    const page = await browser.newPage()
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body></body></html>`)
    const result = await page.evaluate((classNames) => {
        const rules = []
        const walk = (list, conditions) => {
            for (const rule of list) {
                if (rule instanceof CSSStyleRule) {
                    const decls = [...rule.style].map((p) => `${p}:${rule.style.getPropertyValue(p)}`).sort().join(';')
                    rules.push([conditions.join(' / '), rule.selectorText, decls])
                    if (rule.cssRules?.length) walk(rule.cssRules, [...conditions, rule.selectorText])
                } else if (rule instanceof CSSLayerBlockRule) walk(rule.cssRules, conditions)
                else if (rule.cssRules) walk(rule.cssRules, [...conditions, rule.cssText.slice(0, rule.cssText.indexOf('{')).trim()])
            }
        }
        walk(document.styleSheets[0].cssRules, [])
        return classNames.map((name) => {
            const token = new RegExp(('.' + CSS.escape(name)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w\\\\-])')
            return rules.filter(([, sel]) => token.test(sel))
        })
    }, classNames)
    await page.close()
    return result
}

/**
 * So nghĩa selector của biến thể: hai cách viết tương đương (`:is(.group:x .c)` và `.c:is(.group:x *)`) phải
 * chọn đúng cùng tập phần tử trên một cây DOM ngẫu nhiên (cố định hạt giống) dựng từ thuộc tính/class/thẻ có
 * trong selector. Trạng thái (`:hover`, `:focus`...) được đổi thành thuộc tính `[data-ps-hover]` để thử được;
 * giả phần tử (`::-webkit-scrollbar-thumb:hover`) tách ra làm khoá nhóm. Nhóm theo (điều kiện at-rule, giả phần tử,
 * khai báo): mỗi nhóm của hai bên phải khớp nhau.
 */
const STATES = ['hover', 'focus', 'focus-visible', 'focus-within', 'active', 'visited', 'checked', 'disabled', 'enabled', 'invalid', 'valid', 'user-invalid', 'user-valid', 'required', 'optional', 'read-only', 'read-write', 'indeterminate', 'placeholder-shown', 'target', 'open', 'popover-open', 'default', 'autofill', 'in-range', 'out-of-range']
const sameSelectors = async (names, rulesA, rulesB) => {
    const subject = (name) => new RegExp(('.' + cssEscape(name)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w\\\\-])', 'g')
    const normalize = (name, rules) => {
        const groups = new Map()
        for (const [cond, sel, decls] of rules) {
            for (const part of splitSelectors(sel)) {
                let pseudo = ''
                let text = part.replace(subject(name), '.__s').replace(/::[\w-]+(?:\([^)]*\))?(?::[\w-]+)*/g, (m) => {
                    pseudo += m
                    return ''
                })
                for (const state of STATES) text = text.replace(new RegExp(`:${state}(?![\\w(-])`, 'g'), `[data-ps-${state}]`)
                const key = `${cond} | ${pseudo} | ${decls}`
                groups.set(key, [...(groups.get(key) || []), text || '*'])
            }
        }
        return groups
    }
    const all = names.map((name, i) => [normalize(name, rulesA[i]), normalize(name, rulesB[i])])
    // Từ vựng cho cây DOM: thuộc tính, class, thẻ xuất hiện trong mọi selector.
    const attrs = new Map()
    const classes = new Set(['group', 'peer'])
    const tags = new Set(['div', 'span', 'p'])
    for (const pair of all) for (const groups of pair) for (const sels of groups.values()) for (const sel of sels) {
        for (const m of sel.matchAll(/\[([\w-]+)(?:[~|^$*]?=["']?([^"'\]]*)["']?)?\]/g)) {
            if (m[1] === 'class' && m[2]) classes.add(m[2])
            else attrs.set(m[1], new Set([...(attrs.get(m[1]) || []), m[2] ?? '']))
        }
        for (const m of sel.matchAll(/\.((?:\\.|[\w-])+)/g)) if (m[1] !== '__s') classes.add(m[1].replace(/\\(.)/g, '$1'))
        for (const m of sel.matchAll(/(?:^|[\s>+~(,])([a-z][a-z0-9]*)(?=[\s.:[#>+~),]|$)/g)) tags.add(m[1])
    }
    let seed = 7
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const pick = (list) => list[Math.floor(random() * list.length)]
    const attrList = [...attrs]
    const node = (depth) => {
        const tag = pick([...tags])
        const own = [...classes].filter(() => random() < 0.2)
        if (random() < 0.5) own.push('__s')
        const attributes = attrList.filter(() => random() < 0.25).map(([name, values]) => `${name}="${pick([...values])}"`)
        const children = depth < 3 ? Array.from({ length: 1 + Math.floor(random() * 3) }, () => node(depth + 1)).join('') : ''
        const isVoid = /^(input|img|br|hr|meta|link|area|base|col|embed|source|track|wbr)$/.test(tag)
        return `<${tag} class="${own.join(' ')}" ${attributes.join(' ')}>${isVoid ? '' : children + `</${tag}>`}`
    }
    const fixture = Array.from({ length: 40 }, () => node(0)).join('')
    const page = await browser.newPage()
    await page.setContent(`<!doctype html><html><body>${fixture}</body></html>`)
    const result = await page.evaluate(({ all, states }) => {
        const elements = [...document.body.querySelectorAll('*')]
        // Trạng thái ngẫu nhiên cho phần tử (đặt sau khi dựng để mọi thẻ đều có thể mang).
        let seed = 11
        const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
        for (const el of elements) for (const state of states) if (random() < 0.3) el.setAttribute(`data-ps-${state}`, '')
        const vector = (sels) => {
            try {
                return elements.map((el) => (sels.some((sel) => el.matches(sel)) ? '1' : '0')).join('')
            } catch (error) {
                return 'lỗi: ' + error.message
            }
        }
        return all.map(([a, b]) => {
            const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])]
            return keys.length > 0 && keys.every((key) => a[key] && b[key] && vector(a[key]) === vector(b[key]))
        })
    }, { all: all.map(([a, b]) => [Object.fromEntries(a), Object.fromEntries(b)]), states: STATES })
    await page.close()
    return result
}
const cssEscape = (value) => value.replace(/[^\w-]/g, (ch) => '\\' + ch).replace(/^(\d)/, '\\3$1 ')
const splitSelectors = (text) => {
    const parts = []
    let depth = 0
    let start = 0
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\\') i++
        else if (text[i] === '(' || text[i] === '[') depth++
        else if (text[i] === ')' || text[i] === ']') depth--
        else if (text[i] === ',' && depth === 0) {
            parts.push(text.slice(start, i).trim())
            start = i + 1
        }
    }
    parts.push(text.slice(start).trim())
    return parts.filter(Boolean)
}

const only = new Set(process.argv.slice(2))
const report = {}
const base = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: root, loadStylesheet, loadModule })
const knownClasses = new Set(base.getClassList().map(([n]) => n))
const baseVariantCss = new Map()
for (const plugin of PLUGINS) {
    const label = plugin.label || plugin.id
    if (only.size && !only.has(plugin.id) && !only.has(label)) continue
    const optionBlock = plugin.options ? ` { ${Object.entries(plugin.options).map(([k, v]) => `${k}: ${v};`).join(' ')} }` : ';'
    const source = `@import "tailwindcss";\n@plugin "${plugin.id}"${optionBlock}`
    const ds = await __unstable__loadDesignSystem(source, { base: root, loadStylesheet, loadModule })
    const listed = plugin.variantsOnly ? [] : ds.getClassList().map(([n]) => n).filter((n) => !knownClasses.has(n))
    // Class có trong getClassList nhưng chính Tailwind không sinh được CSS (tên có emoji...): không tính.
    const listedCss = ds.candidatesToCss(listed)
    const own = listed.filter((_, i) => listedCss[i])
    const tailwindRejected = listed.filter((_, i) => !listedCss[i])

    // Biến thể mới hoặc bị plugin đổi (so CSS của `v:flex` với Tailwind gốc).
    const variantNames = []
    for (const v of ds.getVariants()) {
        if (v.isArbitrary && !v.values?.length) continue
        for (const name of v.values?.length ? v.values.map((x) => `${v.name}-${x}`) : [v.name]) variantNames.push(name)
    }
    const pluginVariantCss = ds.candidatesToCss(variantNames.map((v) => `${v}:flex`))
    const missing = variantNames.filter((v) => !baseVariantCss.has(v))
    base.candidatesToCss(missing.map((v) => `${v}:flex`)).forEach((css, i) => baseVariantCss.set(missing[i], css))
    const variants = variantNames.filter((v, i) => pluginVariantCss[i] && pluginVariantCss[i] !== baseVariantCss.get(v))

    // Class thêm: chỉ giữ class mà Tailwind sinh được CSS.
    const extraCss = ds.candidatesToCss((plugin.extra || []).flatMap((c) => c.split(' ')))
    const extraInvalid = (plugin.extra || []).flatMap((c) => c.split(' ')).filter((_, i) => !extraCss[i])
    const extra = (plugin.extra || []).filter((c) => c.split(' ').every((x) => !extraInvalid.includes(x)))
    const cases = [...own, ...extra]
    const classes = [...new Set([...cases.flatMap((c) => c.split(' ')), ...variants.map((v) => `${v}:flex`)])]
    // `m-1` để Tailwind phát `--spacing` như trong dự án thật.
    const twCss = (await compile(source, { base: root, loadStylesheet, loadModule })).build([...classes, 'm-1'])

    const loader = createTailwindPluginLoader(root)
    // `bundled`: đo bản đóng gói sẵn (@porbit/style/tailwind-plugins) thay cho đường JS, để so hai đường.
    const resolvePlugin = plugin.bundled ? resolveTailwindPlugin : (id) => loader.resolve(id, plugin.options)
    const sheet = loader.apply(tw.parseTailwindStylesheet(`@import "tailwindcss";\n@plugin "${plugin.id}";`, { resolve: resolvePlugin }))
    const dialect = tw.tailwindV4Dialect({ preflight: true, darkMode: 'media', theme: sheet.theme, css: sheet.css, utilities: sheet.utilities, variants: sheet.variants })
    const unsupported = classes.filter((c) => !dialect(c))
    const ours = (await extractFromClasses(classes, { hashClassName: false, silent: true, minify: true, dialects: [dialect] })).css

    const classFailed = []
    const variantFailed = []
    let classCases = 0
    if (cases.length || plugin.plain) {
        const attrs = (c) => `data-k class="${c}"${plugin.style ? ` style="${plugin.style}"` : ''}`
        const tree = plugin.tree ?? '<span>a</span>'
        const html = cases.map((c) => `<div ${attrs(c)}>${tree}</div>`).join('') + (plugin.plain ? `<div ${attrs('')}>${tree}</div>` : '')
        const pseudos = plugin.pseudos ?? ['::before', '::after']
        const [a, b] = await Promise.all([signatures(twCss, html, pseudos), signatures(ours, html, pseudos)])
        const names = [...cases, ...(plugin.plain ? ['(không class: base)'] : [])]
        names.forEach((c, i) => {
            const d = diff(a.cases[i], b.cases[i], a.ref)
            if (d.length) classFailed.push({ class: c, diff: d.slice(0, 3) })
        })
        classCases = names.length
    }
    const variantCases = variants.length
    if (variants.length) {
        const names = variants.map((v) => `${v}:flex`)
        const [a, b] = await Promise.all([ruleSets(twCss, names), ruleSets(ours, names)])
        const same = await sameSelectors(names, a, b)
        names.forEach((c, i) => {
            if (!same[i]) variantFailed.push({ variant: c, diff: [`tw: ${a[i].map((r) => r.join(' | ')).join(' || ')}`, `ours: ${b[i].map((r) => r.join(' | ')).join(' || ')}`] })
        })
    }
    const pct = (ok, all) => (all ? Number((100 * ok / all).toFixed(2)) : 100)
    const entry = {
        version: versionOf(plugin.id),
        classes: { cases: classCases, matched: classCases - classFailed.length, percent: pct(classCases - classFailed.length, classCases) },
        variants: { cases: variantCases, matched: variantCases - variantFailed.length, percent: pct(variantCases - variantFailed.length, variantCases) },
        unsupported,
        tailwindRejected: [...tailwindRejected, ...extraInvalid],
        notes: Object.values(loader.messages).flat(),
        failedClasses: classFailed.slice(0, 15),
        failedVariants: variantFailed.slice(0, 40).map((f) => f.variant),
        failedVariantDetails: variantFailed.slice(0, 5),
    }
    report[label] = entry
    const line = (name, e) => `${name} ${e.matched}/${e.cases} (${e.percent}%)`
    console.log(`${label}@${entry.version}: ${line('class', entry.classes)}, ${line('biến thể', entry.variants)}${unsupported.length ? `; chưa chuyển: ${unsupported.slice(0, 8).join(' ')}${unsupported.length > 8 ? ' …' : ''}` : ''}`)
    for (const f of classFailed.slice(0, 5)) console.log(`  ✗ ${f.class}: ${f.diff.slice(0, 2).join(' ; ').slice(0, 300)}`)
    for (const f of variantFailed.slice(0, 3)) console.log(`  ✗ ${f.variant}: ${f.diff.join(' ; ').slice(0, 300)}`)
}
await browser.close()
if (!only.size) fs.writeFileSync(path.join(root, 'eval/tailwind-js-plugins.json'), JSON.stringify(report, null, 2) + '\n')
console.log('\nplugin: khớp/tổng (class | biến thể)')
for (const [label, e] of Object.entries(report)) console.log(`  ${label}: class ${e.classes.matched}/${e.classes.cases}, biến thể ${e.variants.matched}/${e.variants.cases}`)
