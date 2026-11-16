import { describe, expect, it } from 'vitest'
import { xcss } from '../src/core'
import { minifyCss } from '../src/minify'
import { resolveConfigFile } from '../src/config-file'
import { extractFromClasses } from '../src/extract'
import { parseTailwindStylesheet, tailwindV4Dialect } from '../src/tailwind-v4'
import { resolveTailwindPlugin, TAILWIND_PLUGINS } from '../src/tailwind-plugins'

const css = (classes: string, options: Parameters<typeof tailwindV4Dialect>[0] = {}) => {
    const built = xcss({ hashClassName: false, silent: true, dialects: [tailwindV4Dialect(options)] }).buildCss(undefined)
    built.clsx(classes)
    const out = built.getCssString()
    built.destroy()
    return out
}

describe('phương ngữ Tailwind v4 (sinh từ chính Tailwind)', () => {
    it('khai báo nguyên văn của Tailwind, theme nhúng làm giá trị dự phòng', () => {
        const out = css('p-4 bg-red-500 text-sm shadow-md')
        expect(out).toContain('.p-4{padding:calc(var(--spacing, 0.25rem) * 4)}')
        expect(out).toContain('background-color:var(--color-red-500, oklch(63.7% 0.237 25.331))')
        expect(out).toContain('box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow)')
        expect(out).toContain('@property --tw-shadow')
    })

    it('breakpoint đúng của Tailwind (lg = 64rem), container query và at-rule nội tuyến', () => {
        const out = css('lg:p-4 @md:p-2 supports-[display:grid]:grid starting:opacity-0')
        expect(out).toContain('@media (width >= 64rem)')
        expect(out).toContain('@container (width >= 28rem){')
        expect(out).toContain('@supports (display:grid){')
        expect(out).toContain('@starting-style{')
    })

    it('biến thể ghép: not-, has-, group-*/name, in-, nth-, rtl', () => {
        const dialect = tailwindV4Dialect()
        for (const c of ['not-first:p-4', 'has-checked:p-4', 'group-hover/item:p-4', 'in-focus:p-4', 'nth-3:p-4', 'rtl:p-4', 'peer-checked/name:p-4', 'not-dark:p-4']) {
            expect(dialect(c), c).not.toBeNull()
        }
        expect(css('in-focus:p-4')).toContain(':where(:focus) .in-focus\\:p-4')
        expect(css('space-x-4')).toContain(':where(.space-x-4 > :not(:last-child))')
    })

    it('độ mờ màu, line-height modifier, !important, giá trị tuỳ ý', () => {
        expect(css('bg-red-500/50')).toContain('color-mix(in oklab, var(--color-red-500')
        expect(css('text-sm/6')).toContain('line-height:calc(var(--spacing, 0.25rem) * 6)')
        expect(css('p-4!')).toContain('!important')
        expect(css('w-[calc(100%-2rem)]')).toContain('width:calc(100% - 2rem)')
        // Khoảng trắng trong chuỗi có nháy được escape (trình duyệt đọc là "Segoe UI Emoji").
        expect(css('font-sans')).toContain('Segoe\\000020UI')
    })

    it('theme tuỳ chỉnh: màu, bo góc, breakpoint, shadow', () => {
        const theme = { '--color-brand': '#0a64e8', '--radius-blob': '2rem', '--breakpoint-3xl': '112rem', '--shadow-soft': '0 2px 8px rgb(0 0 0 / 0.2)' }
        const out = css('bg-brand rounded-blob 3xl:p-4 shadow-soft', { theme })
        expect(out).toContain('background-color:var(--color-brand, #0a64e8)')
        expect(out).toContain('var(--radius-blob, 2rem)')
        expect(out).toContain('@media (width >= 112rem)')
        expect(out).toContain('var(--tw-shadow-color, rgb(0 0 0 / 0.2))')
        expect(css('bg-brand')).not.toContain('--color-brand')
    })

    it('đọc stylesheet kiểu Tailwind: @theme, keyframes, CSS thường', () => {
        const parsed = parseTailwindStylesheet('@import "tailwindcss";\n@theme { --color-brand: #f00; @keyframes wiggle { 50% { rotate: 3deg } } }\n.card { padding: 1rem }')
        expect(parsed.theme).toEqual({ '--color-brand': '#f00' })
        expect(parsed.css).toContain('@keyframes wiggle')
        expect(parsed.css).toMatch(/\.card\s*\{\s*padding: 1rem\s*\}/)
        expect(parsed.css).not.toContain('@import')
    })

    it('một class nhiều rule: container, not-hover, ≥3 điều kiện media', () => {
        const out = css('container not-hover:flex md:dark:hover:underline')
        expect(out).toContain('.container{width:100%}')
        expect(out).toMatch(/@media \(width >= 48rem\)\{\.container\{max-width:48rem\}/)
        expect(out).toContain('.not-hover\\:flex:not(:hover){display:flex}')
        expect(out).toMatch(/@media not \(hover: hover\)\{\.not-hover\\:flex\{display:flex\}/)
        expect(out).toMatch(/@media \(hover: hover\) and \(prefers-color-scheme: dark\) and \(width >= 48rem\)\{\.md\\:dark\\:hover\\:underline:hover\{/)
    })

    it('@custom-variant: dạng ngắn, dạng khối @slot (nhiều selector), at-rule, dùng sau group-', () => {
        const sheet = parseTailwindStylesheet(`
            @custom-variant dark (&:is(.dark *));
            @custom-variant data-open { &:where([data-state="open"]), &:where([data-open]:not([data-open="false"])) { @slot; } }
            @custom-variant pointer-fine (@media (pointer: fine));`)
        const out = css('dark:flex data-open:block group-data-open:grid pointer-fine:underline', { variants: sheet.variants })
        expect(out).toContain('.dark\\:flex:is(.dark *){display:flex}')
        expect(out).toContain('.data-open\\:block:where([data-state="open"]){display:block}')
        expect(out).toContain('.data-open\\:block:where([data-open]:not([data-open="false"])){display:block}')
        expect(out).toContain(':where(.group):is(*:where([data-state="open"]), *:where([data-open]:not([data-open="false"]))) *')
        expect(out).toMatch(/@media \(pointer: fine\)\{\.pointer-fine\\:underline\{/)
    })

    it('@utility dạng hàm: --value(number/integer/ratio/--theme-*/[type]/"literal"), --modifier, selector lồng', () => {
        const sheet = parseTailwindStylesheet(`
            @theme { --tab-wide: 12; }
            @utility tab-* { tab-size: --value(integer, --tab-*, [integer], "auto"); }
            @utility fade-* { opacity: calc(--value(number) / 100); opacity: --value([percentage]); }
            @utility ratio-* { aspect-ratio: --value(ratio); }
            @utility tint-* { color: --value([color]); opacity: --modifier(number); }
            @utility no-scrollbar { scrollbar-width: none; &::-webkit-scrollbar { display: none; } }`)
        const d = tailwindV4Dialect({ theme: sheet.theme, utilities: sheet.utilities })
        expect(d('tab-4')).toEqual(['tab-size[4]'])
        expect(d('tab-wide')).toEqual(['tab-size[var(--tab-wide,_12)]'])
        expect(d('tab-auto')).toEqual(['tab-size[auto]'])
        expect(d('tab-[7]')).toEqual(['tab-size[7]'])
        expect(d('tab-x')).toBeNull()
        expect(d('fade-2.5')).toEqual(['opacity[calc(2.5_/_100)]'])
        expect(d('fade-2.3')).toBeNull()
        expect(d('fade-[40%]')).toEqual(['opacity[40%]'])
        expect(d('ratio-16/9')).toEqual(['aspect-ratio[16_/_9]'])
        expect(d('tint-[#f00]/1')).toEqual(['color[#f00]', 'opacity[1]'])
        expect(d('no-scrollbar')).toEqual(['scrollbar-width[none]', 'display[none]@::-webkit-scrollbar'])
        expect(d('md:no-scrollbar')).toEqual(['[@media_(width_>=_48rem)]:scrollbar-width[none]', '[@media_(width_>=_48rem)]:display[none]@::-webkit-scrollbar'])
    })

    it('@apply kèm biến thể, modifier, !important; @layer base về layer nền', () => {
        const out = css('flex', {
            preflight: false,
            css: '@layer base { * { @apply border-red-500 outline-red-500/50; } } .btn { @apply px-4 hover:underline md:py-2 !font-bold; }',
        })
        expect(out).toContain('@layer l0{*{border-color:var(--color-red-500')
        expect(out).toContain('outline-color:color-mix(in oklab, var(--color-red-500')
        expect(out).toContain('.btn{padding-inline:calc(var(--spacing, 0.25rem) * 4);--tw-font-weight:var(--font-weight-bold, 700) !important;font-weight:var(--font-weight-bold, 700) !important;}')
        expect(out).toMatch(/@media \(hover: hover\)\{\.btn:hover\{text-decoration-line:underline;\}\}/)
        expect(out).toMatch(/@media \(width >= 48rem\)\{\.btn\{padding-block:/)
        expect(out).not.toContain('chưa hỗ trợ')
    })

    it('thứ tự rule như Tailwind: không phụ thuộc thứ tự gặp class (`px-4` thắng `p-2`)', async () => {
        const d = tailwindV4Dialect()
        expect(['px-4', 'hover:flex', 'p-2', 'md:p-1', 'focus:flex', 'flex'].sort(d.compare!)).toEqual(['flex', 'p-2', 'px-4', 'hover:flex', 'focus:flex', 'md:p-1'])
        for (const order of [['px-4', 'p-2'], ['p-2', 'px-4']]) {
            const out = (await extractFromClasses(order, { hashClassName: false, silent: true, dialects: [d] })).css
            expect(out.indexOf('.p-2{')).toBeLessThan(out.indexOf('.px-4{'))
        }
        // Class không thuộc phương ngữ đứng trước (như prettier-plugin-tailwindcss).
        expect(['flex', 'my-btn', 'p-2'].sort(d.compare!)).toEqual(['my-btn', 'flex', 'p-2'])
    })

    it('plugin đóng gói sẵn: tw-animate-css, forms, typography (biến thể prose-*)', () => {
        expect(TAILWIND_PLUGINS).toEqual(expect.arrayContaining(['tw-animate-css', '@tailwindcss/forms', '@tailwindcss/typography', 'tailwindcss-animate']))
        const sheet = parseTailwindStylesheet('@import "tailwindcss"; @import "tw-animate-css"; @plugin "@tailwindcss/typography"; @plugin "@tailwindcss/forms"; @plugin "khong-co";', { resolve: resolveTailwindPlugin })
        expect(sheet.unresolved).toEqual(['khong-co'])
        const d = tailwindV4Dialect({ theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, css: sheet.css })
        expect(d('fade-in-50')).toEqual(['--tw-enter-opacity[calc(50/100)]', '--tw-enter-opacity[var(--percentage-50,_.5)]'])
        expect(d('slide-in-from-start')).toEqual(['--tw-enter-translate-x[-100%]@:dir(ltr)', '--tw-enter-translate-x[100%]@:dir(rtl)'])
        // Trùng tên utility sẵn có (`delay-*`): cả hai cùng áp như Tailwind.
        expect(d('delay-150')).toEqual(['transition-delay[150ms]', 'animation-delay[calc(150*1ms)]', 'animation-delay[var(--animation-delay-150,_.15s)]', '--tw-animation-delay[calc(150*1ms)]', '--tw-animation-delay[var(--animation-delay-150,_.15s)]'])
        expect(d('prose')!.length).toBeGreaterThan(100)
        expect(d('prose-headings:underline')![0]).toContain(':where(h1,;h2,;h3,;h4,;h5,;h6,;th)')
        expect(d('form-input')).not.toBeNull()
        expect(tailwindV4Dialect({ preflight: false, css: sheet.css }).baseCss).toContain("input:where([type='text'])")
    })

    it('cấu hình JSON "dialects": ["tailwind"] dùng bản v4', () => {
        const config = resolveConfigFile({ dialects: ['tailwind', 'tailwind-legacy'] })
        expect(config.dialects).toHaveLength(2)
        expect((config.dialects![0] as any).baseCss).toContain('@property')
    })
})

describe('minify CSS tĩnh', () => {
    it('bỏ @property/@keyframes không dùng, gộp @layer, giữ thứ tự rule', async () => {
        const { css: full } = await extractFromClasses(['p-4', 'shadow-md', 'sm:p-2'], { hashClassName: false, dialects: [tailwindV4Dialect()] })
        const min = minifyCss(full)
        expect(min.length).toBeLessThan(full.length * 0.7)
        expect(min).toContain('@property --tw-shadow{')
        expect(min).not.toContain('@property --tw-gradient-from')
        expect(min).not.toContain('@keyframes spin')
        expect(min.indexOf('.p-4')).toBeLessThan(min.indexOf('.shadow-md'))
        expect(min.match(/@layer l0\{/g)!.length).toBeLessThan(full.match(/@layer l0\{/g)!.length)
    })

    it('giữ keyframes khi animation đang dùng', () => {
        const min = minifyCss('@keyframes spin{to{rotate:1turn}}@keyframes ping{}@layer l0{.a{animation:var(--animate-spin, spin 1s linear infinite)}}')
        expect(min).toContain('@keyframes spin')
        expect(min).not.toContain('@keyframes ping')
    })
})
