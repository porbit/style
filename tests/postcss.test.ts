import { describe, expect, it } from 'vitest'
import postcss from 'postcss'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import presenceStylePostcss, { expandBraces } from '../src/postcss'

const project = (files: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-postcss-'))
    for (const [name, content] of Object.entries(files)) {
        mkdirSync(join(dir, name, '..'), { recursive: true })
        writeFileSync(join(dir, name), content)
    }
    return dir
}
const run = async (dir: string, css: string, file = 'src/app.css') => {
    const result = await postcss([presenceStylePostcss({ base: dir })]).process(css, { from: join(dir, file) })
    return result
}

describe('@porbit/style/postcss', () => {
    it('thay @import "tailwindcss" bằng CSS từ mã nguồn, có preflight, theme, @apply, plugin', async () => {
        const dir = project({ 'src/page.tsx': '<div className="flex p-2 px-4 bg-brand md:grid prose" />' })
        const out = (await run(dir, '@import "tailwindcss"; @plugin "@tailwindcss/typography"; @theme { --color-brand: #0a64e8; } .btn { @apply px-4 hover:underline; }')).css
        expect(out).toContain('.flex{display:flex}')
        expect(out).toMatch(/background-color:var\(--color-brand, ?#0a64e8\)/)
        expect(out).toMatch(/@media \(width >= 48rem\)\{\.md\\:grid\{display:grid\}/)
        expect(out).toMatch(/box-sizing: ?border-box/)
        expect(out).toContain('.btn{padding-inline:')
        expect(out.indexOf('.p-2{')).toBeLessThan(out.indexOf('.px-4{'))
        expect(out).toContain('.prose{')
        expect(out).not.toContain('@import')
    })

    it('@source thêm/bớt thư mục, @source inline() mở rộng ngoặc, .gitignore, source(none)', async () => {
        const dir = project({
            'src/a.tsx': '<div className="flex" />',
            'lib/b.tsx': '<div className="grid" />',
            'src/legacy/c.tsx': '<div className="hidden" />',
            'generated/d.tsx': '<div className="block" />',
            '.gitignore': 'generated/\n',
        })
        const css = '@import "tailwindcss"; @source "../lib"; @source not "./legacy"; @source inline("{hover:,}bg-red-{100..300..100}");'
        const out = (await run(dir, css)).css
        expect(out).toContain('.flex{')
        expect(out).toContain('.grid{')
        expect(out).not.toContain('.hidden{')
        expect(out).not.toContain('.block{')
        expect(out).toContain('.bg-red-200{')
        expect(out).toContain('.hover\\:bg-red-300:hover{')
        const none = (await run(dir, '@import "tailwindcss" source(none); @source inline("underline");')).css
        expect(none).toContain('.underline{')
        expect(none).not.toContain('.flex{')
        expect(expandBraces('p-{1..3}')).toEqual(['p-1', 'p-2', 'p-3'])
    })

    it('file CSS không dùng Tailwind giữ nguyên; báo dependency cho chế độ watch', async () => {
        const dir = project({ 'src/a.tsx': '<div className="flex" />' })
        expect((await run(dir, '.a { color: red }')).css).toBe('.a { color: red }')
        const result = await run(dir, '@import "tailwindcss";')
        expect(result.messages).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'dir-dependency', dir })]))
    })
})
