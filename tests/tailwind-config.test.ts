import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { evaluateConfigSource, loadTailwindConfigFile, stripSimpleTypes, tailwindConfigToCss } from '../src/tailwind-config'
import { createConfigLoader } from '../src/files'
import { parseTailwindStylesheet, tailwindV4Dialect } from '../src/tailwind-v4'

describe('tailwind.config.js (v3) -> CSS v4', () => {
    it('extend, màu lồng có DEFAULT, fontSize dạng mảng, darkMode, thay namespace', () => {
        const { css, unsupported } = tailwindConfigToCss({
            darkMode: ['class', '[data-theme="dark"]'],
            theme: {
                colors: { ink: { DEFAULT: '#111', soft: { DEFAULT: '#333', faint: '#999' } } },
                extend: {
                    fontSize: { hero: ['3rem', { lineHeight: '1', letterSpacing: '-0.02em' }], lead: ['1.25rem', '1.75rem'] },
                    spacing: { gutter: '1.5rem' },
                    fontFamily: { display: ['"Playfair Display"', 'serif'] },
                },
            },
            prefix: 'tw-',
        })
        expect(css).toContain('--color-*: initial;')
        expect(css).toContain('--color-ink: #111;')
        expect(css).toContain('--color-ink-soft-faint: #999;')
        expect(css).toContain('--text-hero--letter-spacing: -0.02em;')
        expect(css).toContain('--text-lead--line-height: 1.75rem;')
        expect(css).toContain('--font-display: "Playfair Display", serif;')
        // `class` như mã tương thích của Tailwind v4: `&:is(<selector> *)` (không phải `:where`).
        expect(css).toContain('@custom-variant dark (&:is([data-theme="dark"] *));')
        expect(css).toContain('@import "tailwindcss" prefix(tw);')
        expect(unsupported).toEqual([])
    })

    it('@config trong stylesheet: dialect nhận theme của cấu hình JS', () => {
        const dir = mkdtempSync(join(tmpdir(), 'ps-config-'))
        writeFileSync(join(dir, 'tailwind.config.js'), "module.exports = { darkMode: 'class', theme: { extend: { colors: { brand: { DEFAULT: '#0a64e8', 900: '#06306e' } }, spacing: { 18: '4.5rem' } } } }")
        const sheet = parseTailwindStylesheet('@import "tailwindcss"; @config "./tailwind.config.js";', { loadConfig: createConfigLoader(dir) })
        expect(sheet.unresolved).toEqual([])
        const d = tailwindV4Dialect({ theme: sheet.theme, variants: sheet.variants })
        expect(d('bg-brand')).toEqual(['background-color[var(--color-brand,_#0a64e8)]'])
        expect(d('p-18')).toEqual(['padding[var(--spacing-18,_4.5rem)]'])
        expect(d('dark:text-brand-900')).toEqual(['color[var(--color-brand-900,_#06306e)]@:is(.dark;*)'])
    })

    it('thay hẳn bảng màu: màu mặc định không còn; thay screens: breakpoint mặc định vẫn chạy như Tailwind', () => {
        const d = tailwindV4Dialect({ theme: { '--color-*': 'initial', '--color-ink': '#111', '--breakpoint-*': 'initial', '--breakpoint-tablet': '640px' } })
        expect(d('bg-ink')).not.toBeNull()
        expect(d('bg-red-500')).toBeNull()
        expect(d('tablet:p-2')).not.toBeNull()
        expect(d('md:p-4')).not.toBeNull()
        // Breakpoint mặc định không còn giá trị theme: xếp trước breakpoint của dự án.
        expect(['tablet:p-2', 'md:p-4'].sort(d.compare!)).toEqual(['md:p-4', 'tablet:p-2'])
    })
})

// Hành vi đo trên Tailwind 4.3.5 (`compile('@import "tailwindcss"; @config "./x.js"')`), xem eval/fixtures/v3-config/*.
describe('prefix / important / corePlugins của cấu hình v3 (như Tailwind v4)', () => {
    it('đổi cấu hình: prefix -> prefix(...), important -> cờ import hoặc selector bọc utility, corePlugins bị bỏ qua', () => {
        const prefixed = tailwindConfigToCss({ prefix: 'tw-' })
        expect(prefixed.css).toContain('@import "tailwindcss" prefix(tw);')
        // Tailwind 4.3: `transition*` đọc `--default-transition-*` không tiền tố, không xác định khi prefix đến từ @config.
        expect(prefixed.css).toContain('--default-transition-duration: initial;')
        expect(tailwindConfigToCss({ prefix: 'TW' }).unsupported).toEqual(['prefix'])
        expect(tailwindConfigToCss({ prefix: 'tw', important: true }).css).toContain('@import "tailwindcss" prefix(tw) important;')
        expect(tailwindConfigToCss({ important: '#app' }).css).toBe('#app { @tailwind utilities; }')
        const ignored = tailwindConfigToCss({ corePlugins: { preflight: false }, separator: '_', safelist: ['p-1'] })
        expect(ignored).toMatchObject({ css: '', unsupported: [], ignored: ['corePlugins', 'separator', 'safelist'] })
        expect(tailwindConfigToCss({ presets: [{}], blocklist: ['p-1'] }).unsupported).toEqual(['presets', 'blocklist'])
    })

    it('darkMode như mã tương thích của Tailwind v4', () => {
        const dark = (darkMode: unknown) => tailwindConfigToCss({ darkMode }).css
        expect(dark('class')).toBe('@custom-variant dark (&:is(.dark *));')
        expect(dark(['class', '.x'])).toBe('@custom-variant dark (&:is(.x *));')
        expect(dark('selector')).toBe('@custom-variant dark (&:where(.dark, .dark *));')
        expect(dark(['selector', '.x'])).toBe('@custom-variant dark (&:where(.x, .x *));')
        expect(dark(['variant', '&:is(.x *)'])).toBe('@custom-variant dark (&:is(.x *));')
        // Selector không có `&`: Tailwind bỏ cả cấu hình (dark theo media).
        expect(dark(['variant', '@media (x)'])).toBe('')
        expect(dark('media')).toBe('')
    })

    it('stylesheet: prefix(...)/important của import, selector bọc utility; prefix của CSS thắng @config', () => {
        const sheet = parseTailwindStylesheet('@import "tailwindcss" prefix(tw) important; .a { color: red }')
        expect(sheet).toMatchObject({ prefix: 'tw', important: true })
        const both = parseTailwindStylesheet('@import "tailwindcss" prefix(ab); @config "./c.js";', { loadConfig: () => '@import "tailwindcss" prefix(tw);' })
        expect(both.prefix).toBe('ab')
        expect(parseTailwindStylesheet('@config "./c.js";', { loadConfig: () => '@import "tailwindcss" prefix(tw);' }).prefix).toBe('tw')
        const wrapped = parseTailwindStylesheet('@import "tailwindcss"; #app { @tailwind utilities; }')
        expect(wrapped.important).toBe('#app')
        expect(wrapped.css).toBe('')
        expect(parseTailwindStylesheet('@import "tailwindcss" prefix(TW);').unresolved).toEqual(['prefix(TW)'])
    })

    it('dialect prefix: chỉ nhận `tw:` đứng đầu, group/peer thành `.tw\\:group`, @apply cũng cần tiền tố', () => {
        const d = tailwindV4Dialect({ prefix: 'tw-', css: '.card { @apply tw:p-2; } .bad { @apply p-2; }' })
        expect(d('tw:flex')).toEqual(['display[flex]'])
        expect(d('flex')).toBeNull()
        expect(d('tw-flex')).toBeNull()
        expect(d('hover:tw:flex')).toBeNull()
        expect(d('tw:!p-2')).toEqual(['padding![calc(var(--spacing,_0.25rem)_*_2)]'])
        expect(d('tw:group-hover:p-1')?.[0]).toContain('@:is(:where(.tw\\:group):hover;*)')
        expect(d('tw:peer-checked/x:p-1')?.[0]).toContain(':where(.tw\\:peer\\/x):checked')
        expect(d.baseCss).toContain('.card{padding:calc(var(--spacing, 0.25rem) * 2);}')
        expect(d.baseCss).toContain('@apply p-2: chưa hỗ trợ')
        expect(d.classList!().slice(0, 50).every((name) => name.startsWith('tw:'))).toBe(true)
        expect(['tw:p-2', 'p-2', 'tw:flex'].sort(d.compare!)).toEqual(['p-2', 'tw:flex', 'tw:p-2'])
        expect(() => tailwindV4Dialect({ prefix: 'Tw' })).toThrow(/invalid/)
        // Dialect không tiền tố: `.group` như cũ.
        expect(tailwindV4Dialect()('group-hover:p-1')?.[0]).toContain(':where(.group)')
    })

    it('dialect important: true -> mọi khai báo !important (kể cả biến CSS), @apply giữ nguyên', () => {
        const d = tailwindV4Dialect({ important: true, css: '.card { @apply p-2; }' })
        expect(d('p-2')).toEqual(['padding![calc(var(--spacing,_0.25rem)_*_2)]'])
        expect(d('font-bold')).toEqual(['--tw-font-weight[var(--font-weight-bold,_700)_!important]', 'font-weight![var(--font-weight-bold,_700)]'])
        expect(d.baseCss).toContain('.card{padding:calc(var(--spacing, 0.25rem) * 2);}')
    })

    it("dialect important: '#app' -> `&` thành `:is(#app &)` (cùng độ ưu tiên với `#app .x` của Tailwind)", () => {
        const d = tailwindV4Dialect({ important: '#app', css: '.card { @apply p-2; }' })
        expect(d('p-2')).toEqual(['padding[calc(var(--spacing,_0.25rem)_*_2)]@:is(#app;&)'])
        expect(d('hover:p-2')).toEqual(['[@media_(hover:_hover)]:padding[calc(var(--spacing,_0.25rem)_*_2)]@:is(#app;&):hover'])
        expect(d('*:p-1')).toEqual(['padding[var(--spacing,_0.25rem)]@:is(:is(#app;&);>;*)'])
        expect(d('!m-1')).toEqual(['margin![var(--spacing,_0.25rem)]@:is(#app;&)'])
        expect(d.baseCss).toContain('.card{padding:calc(var(--spacing, 0.25rem) * 2);}')
    })

    it('theme `--x: initial` (không `*`) bỏ đúng biến đó như @theme của Tailwind', () => {
        const d = tailwindV4Dialect({ theme: { '--default-transition-duration': 'initial' } })
        expect(d('transition-colors')?.join(' ')).toContain('var(--tw-duration,_var(--default-transition-duration))')
        expect(tailwindV4Dialect()('transition-colors')?.join(' ')).toContain('var(--default-transition-duration,_150ms)')
    })

    it('@config + prefix/important qua createConfigLoader', () => {
        const dir = mkdtempSync(join(tmpdir(), 'ps-config-'))
        writeFileSync(join(dir, 'tailwind.config.js'), "module.exports = { prefix: 'tw-', important: '#app', corePlugins: { preflight: false } }")
        const sheet = parseTailwindStylesheet('@import "tailwindcss"; @config "./tailwind.config.js";', { loadConfig: createConfigLoader(dir) })
        expect(sheet).toMatchObject({ prefix: 'tw', important: '#app', unresolved: [] })
        const d = tailwindV4Dialect({ theme: sheet.theme, prefix: sheet.prefix, important: sheet.important })
        expect(d('tw:p-2')).toEqual(['padding[calc(var(--spacing,_0.25rem)_*_2)]@:is(#app;&)'])
    })
})

describe('nạp tailwind.config.ts', () => {
    const TS_SOURCE = [
        "import type { Config } from 'tailwindcss'",
        "import { type Theme, default as plugin } from 'tailwindcss/plugin'",
        'interface Brand { DEFAULT: string; nested: { a: string } }',
        "export type Mode = 'class' | 'media'",
        "const brand: Brand = { DEFAULT: '#0a64e8', nested: { a: '#fff' } }",
        "const mode = 'class' as Mode",
        'export default {',
        '  darkMode: mode,',
        "  prefix: 'tw',",
        "  theme: { extend: { colors: { brand }, spacing: { 18: '4.5rem' } as const } },",
        '  plugins: [plugin(() => {})],',
        '} satisfies Config',
    ].join('\n')

    it('stripSimpleTypes + evaluateConfigSource: ESM TypeScript thường gặp', () => {
        const stripped = stripSimpleTypes("import defaultTheme from 'tailwindcss/defaultTheme'\n" + TS_SOURCE.replace("colors: { brand }", "colors: { brand }, fontFamily: { sans: ['Inter', ...defaultTheme.fontFamily.sans] }"))
        expect(stripped).not.toMatch(/import type|interface|satisfies|as const|as Mode|: Brand|type Theme/)
        const config = evaluateConfigSource(stripped, join(process.cwd(), 'tailwind.config.ts'), createRequire(join(process.cwd(), 'noop.js'))) as { default: Record<string, any> }
        expect(config.default.prefix).toBe('tw')
        expect(config.default.darkMode).toBe('class')
        expect(config.default.theme.extend.fontFamily.sans.slice(1)).toEqual(require('tailwindcss/defaultTheme').fontFamily.sans)
    })

    it('loadTailwindConfigFile: nếu `require` lỗi (Node cũ) thì bỏ kiểu rồi chạy', () => {
        const dir = mkdtempSync(join(tmpdir(), 'ps-config-ts-'))
        const file = join(dir, 'tailwind.config.ts')
        // Không import gói ngoài: thư mục tạm không thấy node_modules của dự án.
        writeFileSync(file, TS_SOURCE.replace(/^import \{ type Theme.*$/m, 'const plugin = (fn) => ({ handler: fn })'))
        const real = createRequire(join(dir, 'noop.js'))
        // Giả lập Node không nạp được `.ts` và không có `module.stripTypeScriptTypes`.
        const oldNode = Object.assign((id: string) => {
            if (id === file) throw new Error('Unknown file extension ".ts"')
            if (id === 'node:module') return { createRequire }
            return real(id)
        }, { cache: real.cache })
        const config = loadTailwindConfigFile(file, oldNode) as { default: Record<string, any> }
        expect(config.default.theme.extend.colors.brand.DEFAULT).toBe('#0a64e8')
        const { css } = tailwindConfigToCss(config)
        expect(css).toContain('@import "tailwindcss" prefix(tw);')
        expect(css).toContain('--color-brand-nested-a: #fff;')
        // Node có `stripTypeScriptTypes` (≥ 22.13): dùng bản của Node.
        const withStrip = Object.assign((id: string) => {
            if (id === file) throw new Error('Unknown file extension ".ts"')
            return real(id)
        }, { cache: real.cache })
        expect((loadTailwindConfigFile(file, withStrip) as { default: Record<string, any> }).default.prefix).toBe('tw')
        // Nạp thẳng bằng require (Node ≥ 22.18 tự bỏ kiểu).
        if ((process.features as { typescript?: string }).typescript) expect((loadTailwindConfigFile(file, real) as { default: Record<string, any> }).default.prefix).toBe('tw')
        // File JS: lỗi của require được ném lại nguyên vẹn.
        expect(() => loadTailwindConfigFile(join(dir, 'missing.js'), real)).toThrow()
    })
})
