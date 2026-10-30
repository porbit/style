import { describe, expect, it } from 'vitest'

import {
    TAILWIND_COVERAGE_MATRIX,
    assessTailwindMigrationReadiness,
    getTailwindCoverageMatrix,
} from '../src/tailwind-readiness'
import { convertTailwindClasses } from '../src/tailwind'

describe('tailwind migration readiness', () => {
    it('returns a machine-readable coverage matrix for production tooling', () => {
        const matrix = getTailwindCoverageMatrix()

        expect(matrix).toBe(TAILWIND_COVERAGE_MATRIX)
        expect(matrix.some((entry) => entry.group === 'layout-core' && entry.support === 'exact')).toBe(true)
        expect(matrix.some((entry) => entry.group === 'motion' && entry.support === 'exact')).toBe(true)
        expect(matrix.some((entry) => entry.group === 'transform-effects' && entry.support === 'partial')).toBe(true)
        expect(matrix.some((entry) => entry.group === 'manual-review' && entry.support === 'manual')).toBe(true)
    })

    it('marks fully supported classes as safe to auto-apply', () => {
        const report = assessTailwindMigrationReadiness(
            'flex items-center justify-between gap-4 p-4 bg-white text-slate-900 rounded-lg border border-slate-200',
        )

        expect(report.releaseDecision).toBe('safe')
        expect(report.safeToAutoApply).toBe(true)
        expect(report.blocked).toEqual([])
        expect(report.reviewRequired).toEqual([])
        expect(report.autoApplyOutput).toContain('dF')
        expect(report.autoApplyOutput).toContain('ai[center]')
        expect(report.autoApplyOutput).toContain('jc[space-between]')
        expect(report.autoApplyOutput).toContain('p16px')
    })

    it('keeps approximate conversions out of auto-apply output for real-product usage', () => {
        const report = assessTailwindMigrationReadiness('transition flex')

        expect(report.releaseDecision).toBe('review')
        expect(report.safeToAutoApply).toBe(false)
        expect(report.autoApplyOutput).toBe('dF')
        expect(report.approximateConverted).toEqual(['tran0.2s'])
        expect(report.reviewRequired).toEqual(['transition'])
        expect(report.blocked).toEqual([])
    })

    it('blocks unsupported or ambiguous utilities in safe migration mode', () => {
        const report = assessTailwindMigrationReadiness(
            'hover:supports-[display:grid]:bg-slate-50 prose md:fxd[row] p-4',
        )

        expect(report.releaseDecision).toBe('blocked')
        expect(report.safeToAutoApply).toBe(false)
        expect(report.autoApplyOutput).toBe('md:fxd[row] p16px')
        expect(report.blocked).toEqual(['hover:supports-[display:grid]:bg-slate-50', 'prose'])
        expect(report.passthroughXcss).toEqual(['md:fxd[row]'])
        expect(report.exactConverted).toEqual(['p16px'])
    })

    it('mọi ví dụ được khai báo `exact` phải đổi được và sinh CSS thật', async () => {
        const { extractFromClasses } = await import('../src/extract')
        for (const entry of getTailwindCoverageMatrix().filter((e) => e.support === 'exact')) {
            for (const example of entry.examples) {
                const detail = convertTailwindClasses(example, { mode: 'safe', darkMode: 'class' }).details[0]
                expect(detail.status, `${entry.group}: ${example}`).toBe('converted')
                const css = await extractFromClasses(detail.outputs, { hashClassName: false })
                expect(css.matched, `${entry.group}: ${example} -> ${detail.outputs.join(' ')}`).toBe(detail.outputs.length)
            }
        }
    })

    it('mọi ví dụ `manual` không bị đổi sai: được giữ nguyên hoặc báo không hỗ trợ', () => {
        for (const entry of getTailwindCoverageMatrix().filter((e) => e.support === 'manual')) {
            for (const example of entry.examples) {
                const detail = convertTailwindClasses(example, { mode: 'safe' }).details[0]
                expect(detail.status, `${entry.group}: ${example}`).not.toBe('converted')
            }
        }
    })
})
