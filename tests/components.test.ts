import { describe, expect, it } from 'vitest'
import { xcss } from '../src/core'
import { button, COMPONENT_SNIPPETS, createComponentTheme, getComponentSnippet, recipe, ui } from '../src/components'

const allTokens = (): string[] => {
    const tokens = new Set<string>()
    for (const fn of Object.values(ui)) {
        const combos: Record<string, string>[] = [{}]
        for (const [key, values] of Object.entries(fn.variantKeys)) {
            for (const value of values as string[]) combos.push({ [key]: value })
        }
        combos.forEach((props) => (fn as any)(props).split(/\s+/).forEach((t: string) => t && tokens.add(t)))
    }
    for (const snippet of COMPONENT_SNIPPETS) {
        for (const match of snippet.html.matchAll(/class="([^"]*)"/g)) {
            match[1].split(/\s+/).forEach((t) => t && tokens.add(t))
        }
    }
    return [...tokens]
}

describe('bộ component mẫu', () => {
    it('mọi class trong recipe và snippet đều sinh CSS', async () => {
        const engine = xcss({ silent: true })
        const built = engine.buildCss(undefined)
        await engine.ready
        const rejected = allTokens().filter((token) => built.clsx(token) === token)
        expect(rejected).toEqual([])
        built.destroy()
    })

    it('recipe áp default, variant, class bổ sung và memo kết quả', () => {
        const solid = button()
        expect(solid).toContain('bgc--ps-primary')
        expect(solid).toContain('h40px')
        expect(button({ variant: 'danger', size: 'sm', class: '2bdra999px' })).toMatch(/bgc--ps-danger .*h32px.*2bdra999px$/)
        expect(button()).toBe(solid)
    })

    it('compoundVariants chỉ áp khi khớp đủ điều kiện', () => {
        const r = recipe({
            base: 'dF',
            variants: { tone: { a: 'cRed', b: 'cBlue' }, size: { s: 'fns12px', l: 'fns18px' } },
            compoundVariants: [{ tone: 'a', size: 'l', class: 'fnw700' }],
            defaultVariants: { tone: 'a', size: 's' },
        })
        expect(r()).toBe('dF cRed fns12px')
        expect(r({ size: 'l' })).toBe('dF cRed fns18px fnw700')
        expect(r({ tone: 'b', size: 'l' })).toBe('dF cBlue fns18px')
    })

    it('theme cho phép ghi đè token và bỏ token không an toàn', () => {
        const css = createComponentTheme({ light: { primary: '#7c3aed', evil: 'red}body{x:y' }, darkMode: 'class' })
        expect(css).toContain('--ps-primary:#7c3aed')
        expect(css).not.toContain('evil')
        expect(css).toContain('.dark{')
        expect(createComponentTheme({ dark: false })).not.toContain('prefers-color-scheme')
    })

    it('tra snippet theo tên', () => {
        expect(getComponentSnippet('CARD')?.html).toContain('<article')
        expect(getComponentSnippet('khong-co')).toBeUndefined()
    })
})
