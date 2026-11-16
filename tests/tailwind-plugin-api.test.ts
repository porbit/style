import { describe, expect, it } from 'vitest'
import postcss from 'postcss'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
    applyTailwindPluginOutput,
    createPlugin,
    createTailwindPluginLoader,
    flattenColorPalette,
    parsePluginOptions,
    requireWithTailwindShims,
    runTailwindPlugin,
    TAILWIND_COLORS,
    TAILWIND_DEFAULT_THEME,
    type TailwindPluginApi,
} from '../src/tailwind-plugin-api'
import { parseTailwindStylesheet, tailwindV4Dialect } from '../src/tailwind-v4'
import { extractFromClasses } from '../src/extract'
import presenceStylePostcss from '../src/postcss'

/** Plugin -> stylesheet -> dialect -> CSS của các class. */
const cssOf = async (plugin: unknown, classes: string[], options: Parameters<typeof runTailwindPlugin>[1] = {}) => {
    const output = runTailwindPlugin(plugin, options)
    const sheet = applyTailwindPluginOutput(parseTailwindStylesheet(output.css), output)
    const dialect = tailwindV4Dialect({ theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, css: sheet.css })
    const result = await extractFromClasses(classes, { hashClassName: false, silent: true, minify: true, dialects: [dialect] })
    return { css: result.css, output, dialect }
}

const project = (files: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-plugin-api-'))
    for (const [name, content] of Object.entries(files)) {
        mkdirSync(join(dir, name, '..'), { recursive: true })
        writeFileSync(join(dir, name), content)
    }
    return dir
}

describe('tailwind-plugin-api: addUtilities / addComponents', () => {
    it('utility tĩnh, selector lồng `&`, camelCase -> kebab, số, mảng (fallback), @keyframes, danh sách selector', async () => {
        const plugin = createPlugin(({ addUtilities, addComponents }) => {
            addUtilities({
                '@keyframes wiggle': { '0%, 100%': { transform: 'rotate(-3deg)' }, '50%': { transform: 'rotate(3deg)' } },
                '.scrollbar-hide': { msOverflowStyle: 'none', WebkitAppearance: 'none', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } },
                '.content-auto, .content-visible': { contentVisibility: 'auto', zIndex: 3, display: ['block', 'flex'] },
                '.group-x:hover .lift': { transform: 'translateY(-1px)' },
            })
            addComponents({ '.card': { padding: '1rem', '@media (min-width: 640px)': { padding: '2rem' } } })
        })
        const { css, output } = await cssOf(plugin, ['scrollbar-hide', 'content-auto', 'content-visible', 'lift', 'card', 'md:card'])
        expect(output.classes).toEqual(expect.arrayContaining(['scrollbar-hide', 'content-auto', 'content-visible', 'group-x', 'lift', 'card']))
        expect(output.css).toContain('@keyframes wiggle')
        // `msOverflowStyle` -> `ms-overflow-style` (như Tailwind) không phải thuộc tính chuẩn: chỉ bỏ khai báo đó.
        expect(css).toContain('.scrollbar-hide{-webkit-appearance:none;scrollbar-width:none}')
        expect(output.unsupported).toContain('scrollbar-hide: bỏ thuộc tính không chuẩn ms-overflow-style')
        expect(css).toContain('.scrollbar-hide::-webkit-scrollbar{display:none}')
        expect(css).toMatch(/\.content-auto\{content-visibility:auto;z-index:3;display:block;display:flex\}/)
        expect(css).toContain('.group-x:hover .lift{transform:translateY(-1px)}')
        expect(css).toContain('.card{padding:1rem}')
        expect(css).toMatch(/@media \(min-width: ?640px\)\{\.card\{padding:2rem\}/)
    })

    it('selector lồng nhắc lại class (`:where(.prose > :last-child)`) đi theo class kèm biến thể', async () => {
        const plugin = ({ addComponents }: TailwindPluginApi) => addComponents({ '.prose': { color: 'red', ':where(.prose > :last-child)': { marginBottom: '0' } } })
        const { css } = await cssOf(plugin, ['md:prose'])
        expect(css).toContain('.md\\:prose :where(.md\\:prose > :last-child){margin-bottom:0}')
    })

    it('component kiểu daisyUI: @layer con của utility, @supports, @scope (&); nền dưới component', async () => {
        const plugin = ({ addBase, addComponents, addUtilities }: TailwindPluginApi) => {
            addBase({ ':root': { '--color-base-100': '#fff' } })
            addComponents({
                '.btn': {
                    '@layer daisyui.l1.l2.l3': { paddingInline: '1rem', '@supports (color: color-mix(in lab, red, red))': { color: 'blue' } },
                    '&:hover': { '@layer daisyui.l1': { color: 'red' } },
                },
            })
            addUtilities({ '.join': { display: 'inline-flex', '@scope (&)': { ':where(:scope > :first-child)': { '--join-ss': '0' } } } })
        }
        const { css, output } = await cssOf(plugin, ['btn', 'join'])
        expect(output.unsupported).toEqual([])
        expect(css).toContain('@layer daisyui.l1.l2.l3{.btn{padding-inline:1rem}}')
        expect(css).toContain('@layer daisyui.l1.l2.l3{@supports (color: color-mix(in lab, red, red)){.btn{color:blue}}}')
        expect(css).toContain('@layer daisyui.l1{.btn:hover{color:red}}')
        expect(css).toContain(':where(.join > :first-child){--join-ss:0}')
        // addBase -> layer con `base` của l0, khai báo trước mọi layer con của component (thấp hơn).
        expect(css.indexOf('@layer theme, base, components;')).toBeLessThan(css.indexOf('@layer daisyui'))
        expect(css).toContain('@layer base{:root{--color-base-100: #fff;}}')
    })
})

describe('tailwind-plugin-api: matchUtilities', () => {
    it('values (DEFAULT, giá trị âm, phân số), giá trị tuỳ ý, giá trị trần', async () => {
        const plugin = createPlugin(({ matchUtilities, theme }) => {
            matchUtilities({ tab: (value) => ({ tabSize: value }) }, { values: { DEFAULT: '4', 2: '2', 8: '8' } })
            matchUtilities({ nudge: (value) => ({ '--nudge': value }) }, { values: { ...theme('spacing'), '1/2': '50%' }, supportsNegativeValues: true, type: 'length' })
            matchUtilities({ fade: (value) => ({ '--fade': value }) }, { values: theme('opacity') })
        })
        const { css, output, dialect } = await cssOf(plugin, ['tab', 'tab-8', 'nudge-4', '-nudge-4', 'nudge-0.5', 'nudge-1/2', 'nudge-[13px]', 'fade-50', 'fade-37'])
        expect(output.classes).toEqual(expect.arrayContaining(['tab', 'tab-2', 'tab-8', 'nudge-4', 'nudge-1/2', 'fade-50']))
        // `nudge-0.5`, `nudge-1/2` không viết được bằng `@utility`: nằm trong `utilities` để gộp.
        expect(output.css).not.toContain('@utility nudge-0.5')
        expect(output.utilities['nudge-0.5']).toBe('--nudge: 0.125rem;')
        expect(css).toContain('.tab{tab-size:4}')
        expect(css).toContain('.tab-8{tab-size:8}')
        expect(css).toContain('.nudge-4{--nudge:1rem}')
        expect(css).toContain('.-nudge-4{--nudge:calc(1rem * -1)}')
        expect(css).toContain('.nudge-0\\.5{--nudge:0.125rem}')
        expect(css).toContain('.nudge-1\\/2{--nudge:50%}')
        expect(css).toContain('.nudge-\\[13px\\]{--nudge:13px}')
        expect(css).toContain('.fade-50{--fade:0.5}')
        expect(css).toContain('.fade-37{--fade:37%}')
        expect(dialect('nudge-[red]')).toBeNull()
    })

    it('modifiers khai báo sẵn và độ mờ màu (`/50`)', async () => {
        const plugin = createPlugin(({ matchUtilities, theme }) => {
            matchUtilities(
                { 'motion-dur': (value, { modifier }) => ({ [modifier ? `--dur-${modifier}` : '--dur']: value }) },
                { values: { 100: '100ms', 300: '300ms' }, modifiers: { scale: 'scale', opacity: 'opacity' } },
            )
            matchUtilities({ glow: (value) => ({ '--glow': value }) }, { values: flattenColorPalette(theme('colors')), type: 'color' })
        })
        const { css } = await cssOf(plugin, ['motion-dur-300', 'motion-dur-300/scale', 'glow-red-500', 'glow-red-500/50', 'glow-[#123456]'])
        expect(css).toContain('.motion-dur-300{--dur:300ms}')
        expect(css).toContain('.motion-dur-300\\/scale{--dur-scale:300ms}')
        expect(css).toContain('.glow-red-500{--glow:oklch(63.7% 0.237 25.331)}')
        expect(css).toMatch(/\.glow-red-500\\\/50\{--glow:color-mix\(in oklab, ?var\(--color-red-500, ?oklch\(63\.7% 0\.237 25\.331\)\) 50%, ?transparent\)\}/)
        expect(css).toContain('.glow-\\[\\#123456\\]{--glow:#123456}')
    })
})

describe('tailwind-plugin-api: addBase, addVariant, matchVariant', () => {
    it('addBase -> @layer base; addVariant chuỗi/mảng/object @slot/CSS; matchVariant theo values', async () => {
        const plugin = createPlugin(({ addBase, addVariant, matchVariant }) => {
            addBase({ h1: { fontSize: '2rem' }, ':root': { '--brand': '#0a64e8' } })
            addVariant('optional', '&:optional')
            addVariant('hocus', ['&:hover', '&:focus'])
            addVariant('supports-grid', '@supports (display: grid)')
            addVariant('can-hover', { '@media (hover: hover)': { '&:hover': '@slot' } })
            addVariant('inverted', '@media (inverted-colors: inverted) { &:not(.x) }')
            matchVariant('nth', (value) => `&:nth-child(${value})`, { values: { 1: '1', 3: '3', odd: 'odd' } })
        })
        const { css, output } = await cssOf(plugin, ['optional:flex', 'hocus:flex', 'supports-grid:flex', 'can-hover:flex', 'inverted:flex', 'nth-3:flex'])
        expect(output.css).toMatch(/@layer base \{ h1 \{ font-size: 2rem; \} :root \{ --brand: #0a64e8; \} \}/)
        expect(Object.keys(output.variants)).toEqual(['optional', 'hocus', 'supports-grid', 'can-hover', 'inverted', 'nth-1', 'nth-3', 'nth-odd'])
        expect(css).toContain('.optional\\:flex:optional{display:flex}')
        expect(css).toContain('.hocus\\:flex:hover{display:flex}')
        expect(css).toContain('.hocus\\:flex:focus{display:flex}')
        expect(css).toMatch(/@supports \(display: ?grid\)\{\.supports-grid\\:flex\{display:flex\}/)
        expect(css).toMatch(/@media \(hover: ?hover\)\{\.can-hover\\:flex:hover\{display:flex\}/)
        expect(css).toMatch(/@media \(inverted-colors: ?inverted\)\{\.inverted\\:flex:not\(\.x\)\{display:flex\}/)
        expect(css).toContain('.nth-3\\:flex:nth-child(3){display:flex}')
        expect(output.unsupported).toContain('nth-[…]: matchVariant với giá trị tuỳ ý')
    })
})

describe('tailwind-plugin-api: theme(), config(), e()', () => {
    it('theme() đọc theme v4 + theme compat v3 + config.theme của plugin + @theme của dự án, như Tailwind 4.3.5', () => {
        const seen: Record<string, unknown> = {}
        const plugin = createPlugin(
            ({ theme, config, e, prefix, corePlugins }) => {
                seen.red = theme('colors.red.500')
                seen.redAlpha = theme('colors.red.500/50')
                seen.brand = theme('colors.brand')
                seen.spacing4 = theme('spacing.4')
                seen.spacing25 = theme('spacing[2.5]')
                seen.radiusLg = theme('borderRadius.lg')
                seen.fontSizeSm = theme('fontSize.sm')
                seen.missing = theme('colors.nope', 'fallback')
                seen.custom = theme('animationX')
                seen.durationDefault = theme('transitionDuration.DEFAULT')
                seen.cssVar = theme('--color-brand')
                seen.prefix = config('prefix')
                seen.escaped = e('w-1/2')
                seen.prefixed = prefix('.x')
                seen.core = corePlugins('preflight')
            },
            { theme: { extend: { animationX: ({ theme }: { theme: (p: string) => Record<string, string> }) => ({ a: '1', ...theme('opacity') }) } } },
        )
        runTailwindPlugin(plugin, { theme: { '--color-brand': '#0a64e8' } })
        expect(seen.red).toBe('oklch(63.7% 0.237 25.331)')
        // Tailwind nhân modifier số với 100 (giữ nguyên hành vi gốc).
        expect(seen.redAlpha).toBe('color-mix(in oklab, oklch(63.7% 0.237 25.331) 5000%, transparent)')
        expect(seen.brand).toBe('#0a64e8')
        expect(seen.cssVar).toBe('#0a64e8')
        expect(seen.spacing4).toBe('1rem')
        expect(seen.spacing25).toBe('0.625rem')
        expect(seen.radiusLg).toBe('0.5rem')
        expect(seen.fontSizeSm).toEqual(['0.875rem', { lineHeight: 'calc(1.25 / 0.875)' }])
        expect(seen.missing).toBe('fallback')
        expect(seen.custom).toMatchObject({ a: '1', 0: '0', 50: '0.5', 100: '1' })
        expect(seen.durationDefault).toBe('150ms')
        expect(seen.prefix).toBe('')
        expect(seen.escaped).toBe('w-1\\/2')
        expect(seen.prefixed).toBe('.x')
        expect(seen.core).toBe(true)
    })

    it('config.theme của plugin -> @theme cho utility sẵn có (animate-*), keyframes', async () => {
        const plugin = createPlugin(() => {}, { theme: { extend: { animation: { wiggle: 'wiggle 1s ease-in-out infinite' }, keyframes: { wiggle: { '50%': { transform: 'rotate(3deg)' } } } } } })
        const { css, output } = await cssOf(plugin, ['animate-wiggle'])
        expect(output.css).toContain('--animate-wiggle: wiggle 1s ease-in-out infinite;')
        expect(css).toMatch(/\.animate-wiggle\{animation:var\(--animate-wiggle, ?wiggle 1s ease-in-out infinite\)\}/)
    })

    it('plugin.withOptions, flattenColorPalette, defaultTheme, colors', () => {
        const factory = createPlugin.withOptions((options: { name?: string } = {}) => ({ addUtilities }) => addUtilities({ [`.${options.name ?? 'x'}`]: { color: 'red' } }))
        expect(runTailwindPlugin(factory, { options: { name: 'hello' } }).classes).toEqual(['hello'])
        expect(runTailwindPlugin(factory).classes).toEqual(['x'])
        expect(flattenColorPalette({ red: { 500: '#f00', DEFAULT: '#e00' }, white: '#fff' })).toEqual({ 'red-500': '#f00', red: '#e00', white: '#fff' })
        expect(TAILWIND_COLORS.sky[500]).toMatch(/^oklch\(/)
        expect(typeof TAILWIND_DEFAULT_THEME.margin).toBe('function')
        expect(parsePluginOptions('nocompatible: true; themes: light, dark; size: 4; name: "x";')).toEqual({ nocompatible: true, themes: ['light', 'dark'], size: 4, name: 'x' })
    })
})

describe('tailwind-plugin-api: nạp plugin từ dự án không cài tailwindcss', () => {
    it('require("tailwindcss/plugin" | "colors" | "defaultTheme" | "lib/util/flattenColorPalette") dùng bản thay (CJS và ESM)', () => {
        const dir = project({
            'plugin.cjs': `const plugin = require('tailwindcss/plugin')
const colors = require('tailwindcss/colors')
const defaultTheme = require('tailwindcss/defaultTheme')
const flatten = require('tailwindcss/lib/util/flattenColorPalette')
module.exports = plugin(({ addUtilities }) => addUtilities({ '.brand': { color: colors.sky[500], margin: typeof defaultTheme.margin, '--n': String(Object.keys(flatten({ a: { b: 'c' } }))) } }))`,
            'plugin.mjs': `import plugin from 'tailwindcss/plugin'
import colors from 'tailwindcss/colors.js'
export default plugin(({ addUtilities }) => addUtilities({ '.esm': { color: colors.white } }))`,
        })
        const cjs = runTailwindPlugin(requireWithTailwindShims(dir, './plugin.cjs'))
        expect(cjs.utilities.brand).toBe(`color: ${TAILWIND_COLORS.sky[500]}; margin: function; --n: a-b;`)
        const esm = runTailwindPlugin(requireWithTailwindShims(dir, './plugin.mjs'))
        expect(esm.utilities.esm).toBe('color: #fff;')
    })

    it('loader: @plugin "./x.js", phần không viết được bằng CSS gộp qua apply()', () => {
        const dir = project({
            'x.cjs': `module.exports = function ({ matchUtilities }) { matchUtilities({ gap2: (v) => ({ gap: v }) }, { values: { '0.5': '2px', 4: '16px' } }) }`,
        })
        const loader = createTailwindPluginLoader(dir)
        const sheet = loader.apply(parseTailwindStylesheet('@plugin "./x.cjs";', { resolve: (id) => loader.resolve(id) }))
        expect(sheet.utilities['gap2-4']).toBe('gap: 16px;')
        expect(sheet.utilities['gap2-0.5']).toBe('gap: 2px;')
        expect(sheet.unresolved).toEqual([])
        expect(loader.files[0]).toMatch(/x\.cjs$/)
    })

    it('PostCSS: @plugin JS, @plugin có tuỳ chọn, plugin trong tailwind.config.js (@config)', async () => {
        const dir = project({
            'src/page.html': '<div class="tab-8 hello brand-pad text-brand nudge-0.5 big:flex"></div>',
            'src/tab.cjs': `module.exports = require('tailwindcss/plugin')(({ matchUtilities }) => matchUtilities({ tab: (v) => ({ tabSize: v }) }, { values: { 8: '8' } }))`,
            'src/opts.cjs': `module.exports = require('tailwindcss/plugin').withOptions((o = {}) => ({ addUtilities }) => addUtilities({ ['.' + (o.name || 'none')]: { color: 'red' } }))`,
            'src/tailwind.config.cjs': `const plugin = require('tailwindcss/plugin')
module.exports = {
  theme: { extend: { colors: { brand: '#0a64e8' } } },
  plugins: [plugin(({ addUtilities, matchUtilities, addVariant, theme }) => {
    addUtilities({ '.brand-pad': { padding: theme('spacing.4'), color: theme('colors.brand') } })
    matchUtilities({ nudge: (v) => ({ '--nudge': v }) }, { values: theme('spacing') })
    addVariant('big', '@media (min-width: 900px)')
  })],
}`,
        })
        const css = '@import "tailwindcss"; @config "./tailwind.config.cjs"; @plugin "./tab.cjs"; @plugin "./opts.cjs" { name: hello; }'
        const out = (await postcss([presenceStylePostcss({ base: dir })]).process(css, { from: join(dir, 'src/app.css') })).css
        expect(out).toContain('.tab-8{tab-size:8}')
        expect(out).toContain('.hello{color:red}')
        expect(out).toContain('.brand-pad{padding:1rem;color:#0a64e8}')
        expect(out).toMatch(/\.text-brand\{color:var\(--color-brand, ?#0a64e8\)\}/)
        expect(out).toContain('.nudge-0\\.5{--nudge:0.125rem}')
        expect(out).toMatch(/@media \(min-width: ?900px\)\{\.big\\:flex\{display:flex\}/)
    })
})
