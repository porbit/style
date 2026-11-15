import { describe, expect, it } from 'vitest'
import { xcss } from '../src/core'
import { tailwindDialect } from '../src/tailwind'

const cssFor = (classes: string, options: Parameters<typeof tailwindDialect>[0] = {}) => {
    const built = xcss({ hashClassName: false, silent: true, dialects: [tailwindDialect(options)] }).buildCss(undefined)
    const out = built.clsx(classes)
    const css = built.getCssString()
    built.destroy()
    return { out, css }
}

describe('phương ngữ Tailwind ở runtime', () => {
    it('sinh CSS cho class Tailwind, giữ nguyên tên class', () => {
        const { out, css } = cssFor('flex items-center p-4 md:grid-cols-3 hover:bg-slate-50 w-1/2 text-[14px]')
        expect(out).toBe('flex items-center p-4 md:grid-cols-3 hover:bg-slate-50 w-1/2 text-[14px]')
        expect(css).toContain('.flex{display:flex}')
        expect(css).toContain('.p-4{padding:16px}')
        expect(css).toContain('.hover\\:bg-slate-50:hover{background-color:#f8fafc}')
        expect(css).toMatch(/@media screen and \(min-width: 768px\) \{\n@layer l0\{\.md\\:grid-cols-3\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}\}/)
        expect(css).toContain('width:50%')
        expect(css).toContain('font-size:14px')
    })

    it('class x-css vẫn chạy song song; class lạ không sinh CSS', () => {
        const { css } = cssFor('dF aiC btn')
        expect(css).toContain('.dF{display:flex}')
        expect(css).not.toContain('btn')
    })

    it('z-10 hiểu theo Tailwind (z-index:10), không phải x-css (z-index:-10)', () => {
        expect(cssFor('z-10').css).toContain('z-index:10')
    })

    it('border không ép border-color, để màu chỉ định thắng ở mọi thứ tự', () => {
        const { css } = cssFor('border-slate-200 border')
        expect(css).toContain('.border{border-width:1px;border-style:solid}')
        expect(css).not.toMatch(/currentColor/i)
    })

    it('duration-* thắng mặc định của transition ở mọi thứ tự rule', () => {
        const { css } = cssFor('duration-300 transition-opacity ease-in')
        expect(css).toContain('.duration-300{--tw-duration:300ms;transition-duration:300ms}')
        expect(css).toContain('transition-duration:var(--tw-duration,150ms)')
        expect(css).toContain('transition-timing-function:var(--tw-ease,cubic-bezier(0.4,0,0.2,1))')
        expect(css).toContain('--tw-ease:cubic-bezier(0.4,0,1,1)')
    })

    it('dark: theo darkMode class', () => {
        expect(cssFor('dark:bg-black', { darkMode: 'class' }).css).toContain(':is(.dark *){background-color:#000000}')
    })

    it('bật hash vẫn rút gọn tên class Tailwind', () => {
        const built = xcss({ silent: true, dialects: [tailwindDialect()] }).buildCss(undefined)
        const out = built.clsx('flex btn')
        expect(out).toMatch(/^D\w+ btn$/)
        built.destroy()
    })
})
