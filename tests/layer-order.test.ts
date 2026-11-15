import { describe, expect, it } from 'vitest'
import { LAYER_ORDER_STATEMENT, xcss } from '../src/core'
import { extractFromClasses } from '../src/extract'

describe('thứ tự cascade layer', () => {
    it('CSS tĩnh khai báo thứ tự l0..l23 TRƯỚC mọi rule @layer', async () => {
        const { css } = await extractFromClasses(['2cRed', 'cBlue', 'md:5m0'], { hashClassName: false })
        expect(LAYER_ORDER_STATEMENT).toBe(`@layer ${Array.from({ length: 24 }, (_, i) => 'l' + i).join(', ')};`)
        expect(css.indexOf(LAYER_ORDER_STATEMENT)).toBe(0)
        expect(css.indexOf('@layer l2{')).toBeGreaterThan(LAYER_ORDER_STATEMENT.length)
    })

    it('base CSS người dùng đứng sau câu khai báo', () => {
        const built = xcss({ base: 'body{margin:0}' }).buildCss(undefined)
        expect(built.getCssString().startsWith(`${LAYER_ORDER_STATEMENT}\nbody{margin:0}`)).toBe(true)
        built.destroy()
    })

    it('không còn dòng trống thừa giữa các khối media', async () => {
        const { css } = await extractFromClasses(['p1px', 'xl:p2px'], { hashClassName: false })
        expect(css).not.toMatch(/\n\n/)
    })
})
