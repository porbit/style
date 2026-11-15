import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { xcss } from '../src/core'
import { createPreloadManifest, extractFromClasses } from '../src/extract'
import presenceStyle from '../src/vite'

describe('static-first: manifest preload', () => {
    it('class trong manifest không sinh lại CSS ở runtime', async () => {
        const result = await extractFromClasses(['m10px', 'cRed', 'bogus-x'], { hashClassName: false })
        const manifest = createPreloadManifest(result, { hashClassName: false })
        expect(manifest.classes).toEqual(['m10px', 'cRed'])

        const built = xcss({ hashClassName: false, preload: manifest }).buildCss(undefined)
        expect(built.clsx('m10px cRed p4px')).toBe('m10px cRed p4px')
        const css = built.getCssString()
        expect(css).not.toContain('margin:10px')
        expect(css).toContain('padding:4px')
        built.destroy()
    })

    it('bật hash: runtime trả đúng tên rút gọn của bản build', async () => {
        const result = await extractFromClasses(['m10px', 'cRed'])
        const manifest = createPreloadManifest(result)
        const built = xcss({ preload: manifest }).buildCss(undefined)
        expect(built.clsx('m10px cRed')).toBe(`${manifest.classMap.m10px} ${manifest.classMap.cRed}`)
        expect(built.getCssString()).not.toContain('margin:10px')
        const fresh = built.clsx('p4px')
        expect(Object.values(manifest.classMap)).not.toContain(fresh)
        built.destroy()
    })
})

describe('plugin Vite', () => {
    let dir = ''
    afterAll(async () => {
        if (dir) await rm(dir, { recursive: true, force: true })
    })

    it('sinh CSS ảo, manifest, và cập nhật khi file đổi', async () => {
        dir = await mkdtemp(join(tmpdir(), 'ps-vite-'))
        await mkdir(join(dir, 'src'))
        const file = join(dir, 'src', 'App.jsx')
        await writeFile(file, 'export const App = () => <div className="dF p10px" />')

        const plugin = presenceStyle()
        plugin.configResolved({ root: dir })
        const invalidated: string[] = []
        const graph = new Map([
            ['\0virtual:presence-style.css', { id: '\0virtual:presence-style.css' }],
            ['\0virtual:presence-style-manifest', { id: '\0virtual:presence-style-manifest' }],
        ])
        plugin.configureServer({
            moduleGraph: {
                getModuleById: (id: string) => graph.get(id),
                invalidateModule: (mod: { id: string | null }) => invalidated.push(String(mod.id)),
            },
        })

        const cssId = plugin.resolveId('virtual:presence-style.css')!
        const css = (await plugin.load(cssId)) as string
        expect(css).toContain('display:flex')
        expect(css).not.toContain('color:Red')
        const manifestCode = (await plugin.load(plugin.resolveId('virtual:presence-style-manifest')!)) as string
        expect(manifestCode).toContain('"p10px"')

        await writeFile(file, 'export const App = () => <div className="dF p10px cRed" />')
        const mods = await plugin.handleHotUpdate({ file, modules: [] })
        expect(mods?.length).toBe(2)
        expect(invalidated).toHaveLength(2)
        expect((await plugin.load(cssId)) as string).toContain('color:Red')

        // File ngoài phạm vi hoặc không đổi class: không làm mới.
        expect(await plugin.handleHotUpdate({ file: join(dir, 'README.md'), modules: [] })).toBeUndefined()
        expect(await plugin.handleHotUpdate({ file, modules: [] })).toBeUndefined()
    })
})
