/**
 * `tailwind.config.js` (Tailwind v3) -> CSS Tailwind v4 (`@theme`, `@custom-variant`, `@plugin`), theo cách
 * `@config` của Tailwind v4 đọc cấu hình JS:
 *   - `theme.x` thay cả namespace (`--color-*: initial`), `theme.extend.x` bổ sung,
 *   - màu lồng nhau -> `--color-brand-500`, khoá `DEFAULT` -> `--color-brand`,
 *   - `fontSize: { hero: ['3rem', { lineHeight: '1' }] }` -> `--text-hero`, `--text-hero--line-height`,
 *   - `darkMode: 'class' | 'selector' | ['class', '.x'] | ['variant', '...']` -> `@custom-variant dark`
 *     (`class` -> `&:is(.dark *)`, `selector` -> `&:where(.dark, .dark *)` như mã tương thích của Tailwind v4),
 *   - `plugins: [require('@tailwindcss/forms')]` -> `@plugin "@tailwindcss/forms"` (plugin đóng gói sẵn),
 *   - `prefix: 'tw-'` -> `@import "tailwindcss" prefix(tw);` (Tailwind v4 bỏ `-` cuối; class viết `tw:flex`,
 *     không nhận `tw-flex` kiểu v3),
 *   - `important: true` -> `@import "tailwindcss" important;` (mọi khai báo utility `!important`),
 *   - `important: '#app'` -> `#app { @tailwind utilities; }` (đúng cách Tailwind v4 bọc utility: `#app .p-2`).
 * Tailwind v4 bỏ qua (nên ở đây cũng bỏ qua, báo trong `ignored`): `corePlugins` (preflight vẫn chạy, utility
 * vẫn sinh), `separator`, `safelist`, `future`, `experimental`.
 * Chưa hỗ trợ (báo trong `unsupported`): `presets`, `blocklist`, hàm `theme(({ theme }) => ...)` phức tạp.
 */

type Json = Record<string, any>

// Khoá theme v3 -> namespace v4.
const NAMESPACES: Record<string, string> = {
    colors: '--color',
    spacing: '--spacing',
    screens: '--breakpoint',
    containers: '--container',
    fontFamily: '--font',
    fontSize: '--text',
    fontWeight: '--font-weight',
    letterSpacing: '--tracking',
    lineHeight: '--leading',
    borderRadius: '--radius',
    boxShadow: '--shadow',
    dropShadow: '--drop-shadow',
    blur: '--blur',
    aspectRatio: '--aspect',
    animation: '--animate',
    transitionTimingFunction: '--ease',
    perspective: '--perspective',
    maxWidth: '--container',
    textShadow: '--text-shadow',
    insetShadow: '--inset-shadow',
}
// Khoá màu riêng (`backgroundColor`, `textColor`...) dùng chung namespace màu như @config của Tailwind.
const COLOR_ALIASES = ['backgroundColor', 'textColor', 'borderColor', 'ringColor', 'fill', 'stroke', 'accentColor', 'caretColor', 'outlineColor', 'divideColor', 'placeholderColor', 'textDecorationColor', 'boxShadowColor']

const flatten = (value: unknown, prefix: string, out: Record<string, string>) => {
    if (value === null || value === undefined) return
    if (typeof value === 'string' || typeof value === 'number') {
        out[prefix] = String(value)
        return
    }
    if (Array.isArray(value)) {
        out[prefix] = value.join(', ')
        return
    }
    if (typeof value === 'object') {
        for (const [key, inner] of Object.entries(value as Json)) {
            flatten(inner, key === 'DEFAULT' ? prefix : `${prefix}-${key.replace(/\./g, '_')}`, out)
        }
    }
}

const themeNamespace = (key: string, value: unknown, theme: (path: string) => unknown): Record<string, string> => {
    const ns = NAMESPACES[key] || (COLOR_ALIASES.includes(key) ? '--color' : null)
    if (!ns) return {}
    const resolved = typeof value === 'function' ? (value as (helpers: Json) => unknown)({ theme, colors: {} }) : value
    const out: Record<string, string> = {}
    if (!resolved || typeof resolved !== 'object') return out
    for (const [name, raw] of Object.entries(resolved as Json)) {
        const base = name === 'DEFAULT' ? ns : `${ns}-${name.replace(/\./g, '_')}`
        if (key === 'fontSize' && Array.isArray(raw)) {
            out[base] = String(raw[0])
            const extra = raw[1]
            if (typeof extra === 'string') out[`${base}--line-height`] = extra
            else if (extra && typeof extra === 'object') {
                if (extra.lineHeight) out[`${base}--line-height`] = String(extra.lineHeight)
                if (extra.letterSpacing) out[`${base}--letter-spacing`] = String(extra.letterSpacing)
                if (extra.fontWeight) out[`${base}--font-weight`] = String(extra.fontWeight)
            }
            continue
        }
        if (key === 'screens' && raw && typeof raw === 'object' && !Array.isArray(raw)) {
            if ((raw as Json).min) out[base] = String((raw as Json).min)
            continue
        }
        if (key === 'fontFamily' && Array.isArray(raw)) {
            out[base] = (Array.isArray(raw[0]) ? raw[0] : raw).join(', ')
            continue
        }
        if (key === 'colors' || COLOR_ALIASES.includes(key)) flatten(raw, base, out)
        else if (typeof raw === 'string' || typeof raw === 'number') out[base] = String(raw)
        else if (Array.isArray(raw)) out[base] = raw.join(', ')
    }
    return out
}

export interface ConvertConfigOptions {
    /** Tên gói của plugin (so khớp hàm trong `plugins`): `{ '@tailwindcss/forms': require('@tailwindcss/forms') }`. */
    knownPlugins?: Record<string, unknown>
}

/** Cấu hình JS kiểu Tailwind v3 -> CSS Tailwind v4 mà `parseTailwindStylesheet` đọc được. */
export const tailwindConfigToCss = (config: Json, options: ConvertConfigOptions = {}): { css: string; content: string[]; unsupported: string[]; ignored: string[] } => {
    const cfg = (config && (config.default ?? config)) as Json
    const lines: string[] = []
    const unsupported: string[] = []
    const theme = (cfg.theme || {}) as Json
    const extend = (theme.extend || {}) as Json
    const lookup = (path: string): unknown => path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Json)[key] : undefined), { ...theme, ...extend })
    const decls: string[] = []
    for (const [key, value] of Object.entries(theme)) {
        if (key === 'extend') continue
        const ns = NAMESPACES[key] || (COLOR_ALIASES.includes(key) ? '--color' : null)
        if (!ns) {
            unsupported.push(`theme.${key}`)
            continue
        }
        // `theme.colors` (không qua extend): thay cả namespace như @config của Tailwind.
        // (Tailwind v4 giữ spacing mặc định khi cấu hình thay `spacing`; `screens` xem dialect: breakpoint mặc định vẫn chạy.)
        if (key !== 'spacing' && !COLOR_ALIASES.includes(key)) decls.push(`${ns}-*: initial;`)
        for (const [name, v] of Object.entries(themeNamespace(key, value, lookup))) decls.push(`${name}: ${v};`)
    }
    for (const [key, value] of Object.entries(extend)) {
        if (!(NAMESPACES[key] || COLOR_ALIASES.includes(key))) {
            if (key !== 'keyframes') unsupported.push(`theme.extend.${key}`)
            continue
        }
        for (const [name, v] of Object.entries(themeNamespace(key, value, lookup))) decls.push(`${name}: ${v};`)
    }
    const keyframes = { ...(theme.keyframes || {}), ...(extend.keyframes || {}) } as Json
    const keyframeCss = Object.entries(keyframes).map(([name, frames]) => `@keyframes ${name} { ${Object.entries(frames as Json).map(([step, props]) => `${step} { ${Object.entries(props as Json).map(([p, v]) => `${p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}: ${v};`).join(' ')} }`).join(' ')} }`)
    // `prefix` qua @config (Tailwind 4.3): `transition*` vẫn đọc `var(--default-transition-duration)` /
    // `var(--default-transition-timing-function)` không tiền tố trong khi theme chỉ còn tên `--tw-...`, nên hai
    // biến này không xác định (thời lượng 0s, `ease`). Ghi lại đúng hiện tượng đó bằng cách bỏ hai biến.
    const prefixed = typeof cfg.prefix === 'string' && /^[a-z]+-?$/.test(cfg.prefix)
    if (prefixed) decls.push('--default-transition-duration: initial;', '--default-transition-timing-function: initial;')
    if (decls.length || keyframeCss.length) lines.push(`@theme {\n  ${[...decls, ...keyframeCss].join('\n  ')}\n}`)

    // Như mã tương thích của Tailwind v4: `class` -> `&:is(.x *)`, `selector` -> `&:where(.x, .x *)`,
    // `variant` -> nguyên văn (mọi selector phải có `&`, nếu không Tailwind bỏ cả cấu hình, dark theo media).
    const [darkKind, darkSelector = '.dark'] = Array.isArray(cfg.darkMode) ? cfg.darkMode : [cfg.darkMode]
    if (darkKind === 'class') lines.push(`@custom-variant dark (&:is(${darkSelector} *));`)
    else if (darkKind === 'selector') lines.push(`@custom-variant dark (&:where(${darkSelector}, ${darkSelector} *));`)
    else if (darkKind === 'variant') {
        const list = ([] as unknown[]).concat(darkSelector)
        if (list.every((s) => typeof s === 'string' && s !== '.dark' && s.includes('&'))) lines.push(`@custom-variant dark (${list.join(', ')});`)
        else unsupported.push('darkMode')
    }

    for (const plugin of cfg.plugins || []) {
        const name = Object.entries(options.knownPlugins || {}).find(([, value]) => value === plugin || (value as Json)?.default === plugin)?.[0]
        if (name) lines.push(`@plugin "${name}";`)
        else unsupported.push('plugins[…]')
    }

    // `prefix`/`important: true` -> tuỳ chọn của `@import "tailwindcss"` (cú pháp CSS của Tailwind v4).
    const flags: string[] = []
    if (typeof cfg.prefix === 'string' && cfg.prefix !== '') {
        // Tailwind v4 bỏ một `-` cuối (`tw-` -> `tw`) rồi chỉ nhận chữ thường a-z (khác thì báo lỗi build).
        const prefix = cfg.prefix.endsWith('-') ? cfg.prefix.slice(0, -1) : cfg.prefix
        if (/^[a-z]+$/.test(prefix)) flags.push(`prefix(${prefix})`)
        else unsupported.push('prefix')
    }
    if (cfg.important === true) flags.push('important')
    if (flags.length) lines.unshift(`@import "tailwindcss" ${flags.join(' ')};`)
    // `important: '#app'`: Tailwind v4 thay `@tailwind utilities` bằng `#app { @tailwind utilities; }`.
    if (typeof cfg.important === 'string' && cfg.important.trim()) lines.push(`${cfg.important.trim()} { @tailwind utilities; }`)

    if (cfg.presets !== undefined) unsupported.push('presets')
    if (Array.isArray(cfg.blocklist) && cfg.blocklist.length) unsupported.push('blocklist')
    // Tailwind v4 không đọc các khoá này từ `@config` (corePlugins: preflight và mọi utility vẫn chạy).
    const ignored = ['corePlugins', 'separator', 'safelist', 'future', 'experimental'].filter((key) => cfg[key] !== undefined)
    const content = (Array.isArray(cfg.content) ? cfg.content : cfg.content?.files || []).filter((x: unknown) => typeof x === 'string')
    return { css: lines.join('\n'), content, unsupported, ignored }
}

/** Hàm `require` tối thiểu (từ `createRequire`) dùng để nạp cấu hình. */
type RequireLike = ((id: string) => any) & { cache?: Record<string, unknown> }

/**
 * Bỏ kiểu TypeScript đơn giản hay gặp trong `tailwind.config.ts` (khi Node không tự bỏ kiểu được):
 * `import type`, `import { type X }`, `export type/interface`, `satisfies X`, `as const`/`as X`, chú thích
 * kiểu của biến (`const x: T =`). Không xử lý: generic, enum, namespace, kiểu của tham số hàm.
 */
export const stripSimpleTypes = (source: string): string => {
    let out = source
        .replace(/^\s*import\s+type\s[^;]*?from\s*["'][^"']+["'];?/gm, '')
        .replace(/^[ \t]*(export\s+)?type\s+[\w$]+[^=\n]*=[^;\n]*;?[ \t]*$/gm, '')
        .replace(/\btype\s+[\w$]+\s*,?\s*(?=[\w$}])/g, (match, offset: number, text: string) => (/import\s*\{[^}]*$/.test(text.slice(0, offset)) ? '' : match))
    // `interface X { ... }` (kể cả `export`): bỏ cả khối, tính ngoặc lồng.
    for (let m = /^\s*(export\s+)?interface\s+[\w$]+[^{]*\{/m.exec(out); m; m = /^\s*(export\s+)?interface\s+[\w$]+[^{]*\{/m.exec(out)) {
        let depth = 1
        let i = m.index + m[0].length
        while (i < out.length && depth > 0) {
            if (out[i] === '{') depth++
            else if (out[i] === '}') depth--
            i++
        }
        out = out.slice(0, m.index) + out.slice(i)
    }
    // `as` của dòng import/export (`import * as Colors`, `{ a as B }`) là đổi tên, không phải ép kiểu: giữ nguyên.
    return out
        .split('\n')
        .map((line) => (/^\s*(import\b|export\s*[{*])/.test(line) ? line : line.replace(/\s+as\s+(const|[A-Z][\w$.]*(\s*<[^;\n]*>)?)(?=[\s;,)\]}]|$)/g, '')))
        .join('\n')
        .replace(/\s+satisfies\s+[\w$.]+(\s*<[^;\n]*>)?/g, '')
        .replace(/\b(const|let|var)(\s+[\w$]+)\s*:\s*[^=;\n]+=/g, '$1$2 =')
}

/** `{ a, b as c, default as d }` -> `const { a, b: c } = require(id); const d = __default(require(id));`. */
const namedImports = (names: string, id: string): string => {
    const list = names.split(',').map((name) => name.trim()).filter(Boolean)
    const defaults = list.filter((name) => /^default\s+as\s+/.test(name)).map((name) => `const ${name.replace(/^default\s+as\s+/, '')} = __default(require(${id}));`)
    const rest = list.filter((name) => !/^default\s+as\s+/.test(name)).map((name) => name.replace(/\s+as\s+/, ': '))
    return (rest.length ? `const { ${rest.join(', ')} } = require(${id}); ` : '') + defaults.join(' ')
}

/** ESM đơn giản -> CommonJS để chạy bằng `new Function` (import mặc định/tên/namespace, `export default`). */
const esmToCommonJs = (source: string): string =>
    source
        .replace(/^\s*import\s+([\w$]+)\s*,\s*\{([^}]*)\}\s*from\s*(["'][^"']+["']);?/gm, (_m, def: string, names: string, id: string) => `const ${def} = __default(require(${id})); ${namedImports(names, id)}`)
        .replace(/^\s*import\s+\*\s+as\s+([\w$]+)\s+from\s*(["'][^"']+["']);?/gm, 'const $1 = require($2);')
        .replace(/^\s*import\s+\{([^}]*)\}\s*from\s*(["'][^"']+["']);?/gm, (_m, names: string, id: string) => namedImports(names, id))
        .replace(/^\s*import\s+([\w$]+)\s+from\s*(["'][^"']+["']);?/gm, 'const $1 = __default(require($2));')
        .replace(/^\s*import\s*(["'][^"']+["']);?/gm, 'require($1);')
        .replace(/\bimport\.meta\.url\b/g, "require('node:url').pathToFileURL(__filename).href")
        .replace(/\bimport\.meta\.(dirname|filename)\b/g, (_m, key: string) => `__${key}`)
        .replace(/^\s*export\s+default\s+/m, 'module.exports.default = ')
        .replace(/^(\s*)export\s+(const|let|var|function|class)\s/gm, '$1$2 ')

/**
 * Nạp file cấu hình Tailwind (`.js`, `.cjs`, `.mjs`, `.ts`, `.mts`, `.cts`) bằng `req` (từ `createRequire`).
 * Thử `req(file)` trước: Node ≥ 22.12 nạp được ESM, Node ≥ 22.18/23.6 tự bỏ kiểu TypeScript. Nếu `req` lỗi với
 * file TypeScript (Node 20, Node 22 cũ): bỏ kiểu bằng `module.stripTypeScriptTypes` của Node (≥ 22.13) hoặc
 * `stripSimpleTypes`, đổi ESM sang CommonJS rồi chạy. Không hỗ trợ ở nhánh dự phòng: `await` cấp cao nhất,
 * `export { x as default }`, cú pháp TypeScript ngoài phạm vi `stripSimpleTypes`.
 *
 * Người tích hợp (src/files.ts `createConfigLoader`): thay `const config = req(file)` bằng
 * `const config = loadTailwindConfigFile(file, req)`.
 */
export const loadTailwindConfigFile = (file: string, req: RequireLike): unknown => {
    try {
        return req(file)
    } catch (error) {
        if (!/\.[cm]?ts$/.test(file)) throw error
        const { readFileSync } = req('node:fs') as { readFileSync: (path: string, encoding: string) => string }
        const nodeModule = req('node:module') as { createRequire: (path: string) => RequireLike; stripTypeScriptTypes?: (code: string) => string }
        const source = readFileSync(file, 'utf8')
        let code: string
        try {
            code = nodeModule.stripTypeScriptTypes ? nodeModule.stripTypeScriptTypes(source) : stripSimpleTypes(source)
        } catch (_stripError) {
            code = stripSimpleTypes(source)
        }
        return evaluateConfigSource(code, file, nodeModule.createRequire(file))
    }
}

/** Chạy mã cấu hình (ESM hoặc CommonJS, đã bỏ kiểu) với `require` tương đối theo file cấu hình. */
export const evaluateConfigSource = (code: string, file: string, req: RequireLike): unknown => {
    const module: { exports: Json } = { exports: {} }
    const dir = file.replace(/[\\/][^\\/]*$/, '')
    const interop = (value: any) => (value && value.__esModule && 'default' in value ? value.default : value)
    new Function('module', 'exports', 'require', '__filename', '__dirname', '__default', esmToCommonJs(code))(module, module.exports, req, file, dir, interop)
    return module.exports
}
