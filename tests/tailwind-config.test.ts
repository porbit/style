import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { tailwindConfigToCss } from '../src/tailwind-config'
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
        expect(css).toContain('@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));')
        expect(unsupported).toContain('prefix')
    })

    it('@config trong stylesheet: dialect nhận theme của cấu hình JS', () => {
        const dir = mkdtempSync(join(tmpdir(), 'ps-config-'))
        writeFileSync(join(dir, 'tailwind.config.js'), "module.exports = { darkMode: 'class', theme: { extend: { colors: { brand: { DEFAULT: '#0a64e8', 900: '#06306e' } }, spacing: { 18: '4.5rem' } } } }")
        const sheet = parseTailwindStylesheet('@import "tailwindcss"; @config "./tailwind.config.js";', { loadConfig: createConfigLoader(dir) })
        expect(sheet.unresolved).toEqual([])
        const d = tailwindV4Dialect({ theme: sheet.theme, variants: sheet.variants })
        expect(d('bg-brand')).toEqual(['background-color[var(--color-brand,_#0a64e8)]'])
        expect(d('p-18')).toEqual(['padding[var(--spacing-18,_4.5rem)]'])
        expect(d('dark:text-brand-900')).toEqual(['color[var(--color-brand-900,_#06306e)]@:where(.dark,;.dark;*)'])
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
