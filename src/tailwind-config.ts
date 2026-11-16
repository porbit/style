/**
 * `tailwind.config.js` (Tailwind v3) -> CSS Tailwind v4 (`@theme`, `@custom-variant`, `@plugin`), theo cách
 * `@config` của Tailwind v4 đọc cấu hình JS:
 *   - `theme.x` thay cả namespace (`--color-*: initial`), `theme.extend.x` bổ sung,
 *   - màu lồng nhau -> `--color-brand-500`, khoá `DEFAULT` -> `--color-brand`,
 *   - `fontSize: { hero: ['3rem', { lineHeight: '1' }] }` -> `--text-hero`, `--text-hero--line-height`,
 *   - `darkMode: 'class' | 'selector' | ['class', '.x'] | ['variant', '...']` -> `@custom-variant dark`,
 *   - `plugins: [require('@tailwindcss/forms')]` -> `@plugin "@tailwindcss/forms"` (plugin đóng gói sẵn).
 * Chưa hỗ trợ: `prefix`, `important`, `corePlugins`, hàm `theme(({ theme }) => ...)` phức tạp.
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
export const tailwindConfigToCss = (config: Json, options: ConvertConfigOptions = {}): { css: string; content: string[]; unsupported: string[] } => {
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
    if (decls.length || keyframeCss.length) lines.push(`@theme {\n  ${[...decls, ...keyframeCss].join('\n  ')}\n}`)

    const dark = cfg.darkMode
    if (dark === 'class' || dark === 'selector') lines.push('@custom-variant dark (&:where(.dark, .dark *));')
    else if (Array.isArray(dark) && (dark[0] === 'class' || dark[0] === 'selector')) lines.push(`@custom-variant dark (&:where(${dark[1]}, ${dark[1]} *));`)
    else if (Array.isArray(dark) && dark[0] === 'variant') lines.push(`@custom-variant dark (${[].concat(dark[1]).join(', ')});`)

    for (const plugin of cfg.plugins || []) {
        const name = Object.entries(options.knownPlugins || {}).find(([, value]) => value === plugin || (value as Json)?.default === plugin)?.[0]
        if (name) lines.push(`@plugin "${name}";`)
        else unsupported.push('plugins[…]')
    }
    for (const key of ['prefix', 'important', 'corePlugins', 'separator']) if (cfg[key] !== undefined && cfg[key] !== false && cfg[key] !== '') unsupported.push(key)
    const content = (Array.isArray(cfg.content) ? cfg.content : cfg.content?.files || []).filter((x: unknown) => typeof x === 'string')
    return { css: lines.join('\n'), content, unsupported }
}
