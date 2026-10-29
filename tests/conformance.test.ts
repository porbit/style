import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { xcss } from '../src/core'
import { parseClassName } from '../src/parser'

type Case = {
    input: string
    accepted: boolean
    media?: string
    layer?: number
    selector?: string
    declarations?: string | null
}

const cases: Case[] = JSON.parse(
    readFileSync(fileURLToPath(new URL('../spec/conformance.core.json', import.meta.url)), 'utf8'),
)

const MEDIA_TABLE: Record<string, string> = {
    default: '',
    xs: 'screen and (max-width: 575px)',
    sm: 'screen and (min-width: 576px)',
    md: 'screen and (min-width: 768px)',
    lg: 'screen and (min-width: 992px)',
    xl: 'screen and (min-width: 1200px)',
    '2xl': 'screen and (min-width: 1400px)',
    sma: 'screen and (max-width: 768px)',
    mda: 'screen and (max-width: 992px)',
    lga: 'screen and (max-width: 1200px)',
    xla: 'screen and (max-width: 1400px)',
}

const replaceSemicolons = (s: string) =>
    (s || '').replace(/(';|;)/g, (v) => (v === "';" ? ';' : ' '))

const extractDeclarations = (cssText: string): string | null => {
    const open = cssText.lastIndexOf('{')
    if (open === -1) return null
    const close = cssText.indexOf('}', open)
    if (close === -1) return null
    return cssText.slice(open + 1, close)
}

const runNode = (input: string): Case => {
    const instance = xcss({ hashClassName: false })
    const { clsx, getCssString } = instance.buildCss()
    clsx(input)
    const css = getCssString().trim()
    if (!css) return { input, accepted: false }
    const parsed = parseClassName(input) || { mq: '', layer: '', prop: '', val: '', selector: '' }
    const mediaKey = parsed.mq || 'default'
    return {
        input,
        accepted: true,
        media: MEDIA_TABLE[mediaKey] !== undefined ? MEDIA_TABLE[mediaKey] : '',
        layer: Number(parsed.layer || '0') || 0,
        selector: replaceSemicolons(parsed.selector),
        declarations: extractDeclarations(css),
    }
}

// Khóa hành vi engine Node theo ground truth. Nếu thay đổi core.ts làm lệch output,
// test này bắt được; khi cố ý đổi, chạy lại `node scripts/gen-spec.cjs`.
describe('conformance: Node engine vs ground truth', () => {
    it(`re-derive khớp 100% trên ${cases.length} case`, () => {
        const mismatches: string[] = []
        for (const expected of cases) {
            const actual = runNode(expected.input)
            const same =
                actual.accepted === expected.accepted &&
                (!expected.accepted ||
                    (actual.media === expected.media &&
                        actual.layer === expected.layer &&
                        actual.selector === expected.selector &&
                        actual.declarations === expected.declarations))
            if (!same) {
                mismatches.push(
                    `${expected.input}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`,
                )
            }
        }
        expect(mismatches.slice(0, 20)).toEqual([])
        expect(mismatches.length).toBe(0)
    })
})
