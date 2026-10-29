import { describe, it, expect } from 'vitest'
import { xcss } from '../src/core'

describe('xcss prefix', () => {
    it('should ignore classes without prefix when prefix is set', () => {
        const { clsx } = xcss({ prefix: 'fk-' }).buildCss()
        // m10px is valid xcss but missing prefix
        // Should return original string because it's ignored
        expect(clsx('m10px')).toBe('m10px')
    })

    it('should process classes with prefix', () => {
        const { clsx } = xcss({ prefix: 'fk-' }).buildCss()
        // fk-m10px has prefix
        const result = clsx('fk-m10px')
        // result should be a generated class (D...)
        // It should NOT be the input string
        expect(result).not.toBe('fk-m10px')
        // Check format D...
        expect(result).toMatch(/^D[A-Z0-9]+$/)
    })

    it('should handle mixed classes', () => {
        const { clsx } = xcss({ prefix: 'fk-' }).buildCss()
        const res = clsx('m10px fk-p20px container')
        // m10px -> ignored -> m10px
        // fk-p20px -> processed -> D...
        // container -> ignored -> container
        const parts = res.split(' ')
        expect(parts).toContain('m10px')
        expect(parts).toContain('container')
        // Ensure one part is generated class
        expect(parts.some(p => p.startsWith('D'))).toBe(true)
        expect(parts.length).toBe(3)
    })
})
