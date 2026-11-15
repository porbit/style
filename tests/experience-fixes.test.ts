import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getComponentClasses, button, card } from '../src/components'
import { resolveConfigFile } from '../src/config-file'
import { xcss } from '../src/core'
import { runCli } from '../src/cli'
import { runInit } from '../src/init'
import presenceStyle from '../src/vite'

describe('sửa lỗi phát hiện khi trải nghiệm', () => {
    let dir = ''
    afterEach(async () => {
        vi.restoreAllMocks()
        if (dir) await rm(dir, { recursive: true, force: true })
        dir = ''
    })

    it('getComponentClasses phủ mọi class recipe sinh ra', () => {
        const all = new Set(getComponentClasses())
        for (const token of `${button({ variant: 'danger', size: 'lg' })} ${card({ interactive: 'true' })}`.split(' ')) {
            expect(all.has(token)).toBe(true)
        }
    })

    it('resolveConfigFile đổi "dialects": ["tailwind"] thành hàm phương ngữ', () => {
        const config = resolveConfigFile({ dialects: ['tailwind', 'khong-co'], hashClassName: false })
        expect(config.dialects).toHaveLength(1)
        const built = xcss({ ...config, silent: true }).buildCss(undefined)
        built.clsx('flex')
        expect(built.getCssString()).toContain('.flex{display:flex}')
        built.destroy()
    })

    it('check dùng presence-style.config.json ở thư mục hiện tại: class Tailwind không bị báo khi bật phương ngữ', async () => {
        dir = await mkdtemp(join(tmpdir(), 'ps-exp-'))
        await writeFile(join(dir, 'App.jsx'), '<div className="flex items-center fz14px" />')
        const out: string[] = []
        vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => (out.push(String(chunk)), true))
        vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
        const cwd = process.cwd()
        vi.spyOn(process, 'cwd').mockReturnValue(dir)
        try {
            process.chdir(dir)
            expect(await runCli(['check', '.'])).toBe(1)
            expect(out.join('')).toContain('`flex` không sinh CSS')
            out.length = 0
            await writeFile(join(dir, 'presence-style.config.json'), JSON.stringify({ dialects: ['tailwind'] }))
            expect(await runCli(['check', '.'])).toBe(1)
            const text = out.join('')
            expect(text).not.toContain('`flex`')
            expect(text).toContain('`fz14px` không sinh CSS')
        } finally {
            process.chdir(cwd)
        }
    })

    it('init --tailwind ghi phương ngữ vào cấu hình', async () => {
        dir = await mkdtemp(join(tmpdir(), 'ps-exp-'))
        await runInit({ cwd: dir, tailwind: true })
        expect(JSON.parse(await readFile(join(dir, 'presence-style.config.json'), 'utf8')).dialects).toEqual(['tailwind'])
    })

    it('plugin Vite components: true đưa class recipe vào CSS tĩnh', async () => {
        dir = await mkdtemp(join(tmpdir(), 'ps-exp-'))
        await writeFile(join(dir, 'index.html'), '<div class="dF"></div>')
        const plugin = presenceStyle({ include: ['index.html'], components: true })
        plugin.configResolved({ root: dir })
        const css = (await plugin.load(plugin.resolveId('virtual:presence-style.css')!)) as string
        expect(css).toContain('background-color:var(--ps-primary)')
        expect(css).toContain('display:flex')
    })
})
