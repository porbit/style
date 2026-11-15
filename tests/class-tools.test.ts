import { describe, expect, it } from 'vitest'
import { compactClassToken, compactClasses, dedupeConflictingClasses, findClassConflicts, getConflictKey } from '../src/class-tools'
import { xcss } from '../src/core'
import { convertTailwindClasses } from '../src/tailwind'

const cssOf = (token: string): string => {
    const built = xcss({ hashClassName: false, silent: true }).buildCss(undefined)
    built.clsx(token)
    const css = built.getCssString()
    built.destroy()
    // Bỏ phần selector để so declaration.
    return css.replace(/\.[^{]+\{/g, '{')
}

describe('class-tools', () => {
    it('khoá xung đột gồm media, layer, property CSS, selector', () => {
        expect(getConflictKey('md:2bgc#fff@:hover')).toBe('md|2|background-color|:hover')
        expect(getConflictKey('bgcRed')).toBe(getConflictKey('background-color[blue]'))
        expect(getConflictKey('dF&aiC')).toBeNull()
    })

    it('phát hiện và gỡ xung đột, giữ token sau cùng', () => {
        expect(findClassConflicts('p10px m0 p20px md:p4px')).toEqual([
            { property: 'padding', media: 'default', layer: 0, selector: '', tokens: ['p10px', 'p20px'] },
        ])
        expect(findClassConflicts('p10px 1p20px')).toEqual([])
        const result = dedupeConflictingClasses(['p10px', 'cRed', 'p20px', 'cRed'])
        expect(result.tokens).toEqual(['cRed', 'p20px'])
        expect(result.removed).toEqual([{ token: 'p10px', replacedBy: 'p20px' }])
    })

    it('rút gọn token và giữ nguyên CSS sinh ra', () => {
        const cases: Array<[string, string]> = [
            ['ai[center]', 'aiC'],
            ['jc[space-between]', 'jcSp'],
            ['h[40px]', 'h40px'],
            ['mx[auto]', 'mxA'],
            ['md:ai[center]@:hover', 'md:aiC@:hover'],
            ['2bgc[#fff]', '2bgc#fff'],
            ['c[!red]', 'c[!red]'],
            ['bgc#ffffff', 'bgc#fff'],
            ['md:c!#aabbcc@:hover', 'md:c!#abc@:hover'],
            ['c#0f172a', 'c#0f172a'],
            ['w[calc(100%_-_1rem)]', 'w[calc(100%_-_1rem)]'],
            ['gtc[repeat(2,1fr)]', 'gtc[repeat(2,1fr)]'],
        ]
        for (const [input, expected] of cases) {
            const output = compactClassToken(input)
            expect(output).toBe(expected)
            // `#ffffff` và `#fff` là cùng màu nhưng khác chuỗi CSS.
            const normalizeHex = (css: string) => css.replace(/#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3\b/gi, '#$1$2$3')
            expect(normalizeHex(cssOf(output))).toBe(normalizeHex(cssOf(input)))
        }
        expect(compactClasses('dF ai[center]  h[40px]')).toBe('dF aiC h40px')
    })
})

describe('Tailwind helper: mặc định ngầm và compact', () => {
    it('duration/ease thắng mặc định của transition ở mọi vị trí', () => {
        const out = convertTailwindClasses('duration-300 transition-opacity ease-in').output.split(' ')
        expect(out).toContain('trandur300ms')
        expect(out).not.toContain('trandur150ms')
        expect(out).toContain('tranp[opacity]')
        expect(findClassConflicts(out)).toEqual([])
    })

    it('màu viền ngầm chỉ bị bỏ khi cùng media có màu rõ', () => {
        const out = convertTailwindClasses('border md:border md:border-red-500').output.split(' ')
        expect(out).toContain('bdcCurrentColor')
        expect(out).not.toContain('md:bdcCurrentColor')
        expect(out).toContain('md:bdc#ef4444')
    })

    it('xung đột do người viết chỉ cảnh báo, không tự bỏ', () => {
        const result = convertTailwindClasses('p-4 p-2')
        expect(result.output).toBe('p16px p8px')
        expect(result.warnings.some((w) => w.message.includes('padding'))).toBe(true)
    })

    it('compact cho output ngắn hơn mà CSS không đổi', () => {
        const input = 'flex items-center justify-between h-10 mx-auto'
        const normal = convertTailwindClasses(input).output
        const compact = convertTailwindClasses(input, { compact: true }).output
        expect(compact).toBe('dF aiC jcSp h40px mxA')
        expect(compact.length).toBeLessThan(normal.length)
    })
})
