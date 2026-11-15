import { describe, expect, it } from 'vitest'
import { xcss } from '../src/core'
import { minifyCss } from '../src/minify'
import { resolveConfigFile } from '../src/config-file'
import { extractFromClasses } from '../src/extract'
import { parseTailwindStylesheet, tailwindV4Dialect } from '../src/tailwind-v4'

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
        expect(parsed.css).toContain('.card { padding: 1rem }')
        expect(parsed.css).not.toContain('@import')
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
