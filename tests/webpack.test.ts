import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import postcss from 'postcss'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createShortClassNames, findConflictingClasses, shortClassNamesFromMap } from '../src/shorten'
import {
    buildShortClassTable,
    findShortNameCollisions,
    PresenceStyleWebpackPlugin,
    SHORT_CLASS_MAP_ENV,
    shortClassNamesLoader,
    writeShortClassTable,
    type MinimalCompiler,
} from '../src/webpack'
import { withPresenceStyle } from '../src/next'
import presenceStylePostcss from '../src/postcss'

const write = (root: string, files: Record<string, string>) => {
    for (const [file, content] of Object.entries(files)) {
        mkdirSync(dirname(join(root, file)), { recursive: true })
        writeFileSync(join(root, file), content)
    }
}

const APP = {
    'app/globals.css': '@import "tailwindcss";\n.btn { @apply px-4 py-2; }\n',
    'app/page.tsx': 'export default function Page() {\n  return <main className="flex items-center gap-4 p-8"><button className="btn underline">x</button><p className="text-sm">y</p></main>\n}\n',
    'app/layout.tsx': 'import "./globals.css"\nexport default function L({ children }) { return <html><body className="antialiased">{children}</body></html> }\n',
    // File tĩnh không đi qua bundler: class dùng ở đây phải giữ tên.
    'public/static.html': '<div class="underline"></div>',
}

let root = ''
beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'ps-webpack-'))
    write(root, APP)
    delete process.env[SHORT_CLASS_MAP_ENV]
})
afterEach(() => {
    rmSync(root, { recursive: true, force: true })
    delete process.env[SHORT_CLASS_MAP_ENV]
})

/** Compiler webpack giả lập: đủ hook mà plugin dùng. */
const fakeCompiler = (mode: string) => {
    const taps: Record<string, Array<(...args: never[]) => unknown>> = { beforeRun: [], watchRun: [], thisCompilation: [] }
    const hook = (name: string) => ({ tapPromise: (_: string, fn: never) => taps[name].push(fn), tap: (_: string, fn: never) => taps[name].push(fn) })
    class RawSource {
        constructor(readonly text: string) {}
        source() {
            return this.text
        }
    }
    const compiler = {
        context: root,
        options: { mode, module: { rules: [] as unknown[] } },
        hooks: { beforeRun: hook('beforeRun'), watchRun: hook('watchRun'), thisCompilation: hook('thisCompilation') },
        webpack: { Compilation: { PROCESS_ASSETS_STAGE_OPTIMIZE: 100 }, sources: { RawSource } },
    }
    return { compiler: compiler as unknown as MinimalCompiler, taps, RawSource }
}

/** Chạy loader như webpack (bất đồng bộ). */
const runLoader = (file: string, code: string, mapFile: string) =>
    new Promise<{ code: string; map: unknown; warnings: string[]; deps: string[] }>((resolveRun, reject) => {
        const warnings: string[] = []
        const deps: string[] = []
        shortClassNamesLoader.call(
            {
                resourcePath: file,
                getOptions: () => ({ mapFile }),
                addDependency: (dep: string) => deps.push(dep),
                emitWarning: (error: Error) => warnings.push(error.message),
                async: () => (error: Error | null, out?: string, map?: unknown) => (error ? reject(error) : resolveRun({ code: out!, map, warnings, deps })),
            },
            code,
        )
    })

describe('bảng dùng chung (buildShortClassTable)', () => {
    it('quét mã + biên dịch CSS Tailwind; class trong file tĩnh giữ tên; chỉ file JS/TS được biến đổi', async () => {
        const table = await buildShortClassTable({ root })
        expect(table.files.sort()).toEqual(['app/layout.tsx', 'app/page.tsx'])
        expect(table.map.flex).toMatch(/^[a-z][a-z0-9]*$/)
        expect(table.map.btn).toBeDefined()
        expect(table.map.underline).toBeUndefined()
        expect(table.skipped.underline).toBe('unrecognized')
    })

    it('ghi file chỉ khi nội dung đổi (giữ mtime cho cache bền)', async () => {
        const table = await buildShortClassTable({ root })
        const file = join(root, 'cache/map.json')
        writeShortClassTable(file, table)
        const before = readFileSync(file, 'utf8')
        const { mtimeMs } = await import('node:fs').then((fs) => fs.statSync(file))
        writeShortClassTable(file, table)
        expect((await import('node:fs')).statSync(file).mtimeMs).toBe(mtimeMs)
        expect(JSON.parse(before).map).toEqual(table.map)
    })
})

describe('loader', () => {
    it('đổi tên trong file đã phân tích (kèm sourcemap), file khác chỉ cảnh báo; bảng là dependency', async () => {
        const table = await buildShortClassTable({ root })
        const mapFile = join(root, 'cache/map.json')
        writeShortClassTable(mapFile, table)
        const page = join(root, 'app/page.tsx')
        const out = await runLoader(page, readFileSync(page, 'utf8'), mapFile)
        expect(out.code).toContain(`className="${['flex', 'items-center', 'gap-4', 'p-8'].map((c) => table.map[c]).join(' ')}"`)
        expect(out.code).toContain(`className="${table.map.btn} underline"`)
        expect(out.map).toMatchObject({ version: 3 })
        expect(out.deps).toEqual([mapFile])

        const lib = join(root, 'node_modules/lib/index.js')
        const libCode = 'export const x = "flex items-center gap-4"'
        const outside = await runLoader(lib, libCode, mapFile)
        expect(outside.code).toBe(libCode)
        expect(outside.warnings[0]).toMatch(/ngoài include.*flex/)
    })

    it('không có bảng (dev, chưa build) thì giữ nguyên mã', async () => {
        const out = await runLoader(join(root, 'app/page.tsx'), 'const a = <div className="flex"/>', join(root, 'khong-co.json'))
        expect(out.code).toBe('const a = <div className="flex"/>')
    })
})

describe('plugin webpack/Rspack', () => {
    it('không làm gì khi không phải production', () => {
        const { compiler, taps } = fakeCompiler('development')
        new PresenceStyleWebpackPlugin({ shortClassNames: true }).apply(compiler)
        expect(compiler.options.module.rules).toEqual([])
        expect(taps.beforeRun).toHaveLength(0)
    })

    it('production: thêm loader pre, dựng bảng trước khi biên dịch, đổi tên file CSS của bundle', async () => {
        const { compiler, taps, RawSource } = fakeCompiler('production')
        const mapFile = join(root, '.next/cache/presence-style/short-class-names.json')
        new PresenceStyleWebpackPlugin({ shortClassNames: true, mapFile }).apply(compiler)
        expect(compiler.options.module.rules[0]).toMatchObject({ enforce: 'pre', options: { mapFile } })
        await (taps.beforeRun[0] as () => Promise<void>)()
        expect(existsSync(mapFile)).toBe(true)
        expect(process.env[SHORT_CLASS_MAP_ENV]).toBe(mapFile)
        const table = JSON.parse(readFileSync(mapFile, 'utf8'))

        const updated: Record<string, string> = {}
        const errors: unknown[] = []
        let processAssets: (assets: Record<string, { source(): string }>) => Promise<void> = async () => {}
        ;(taps.thisCompilation[0] as (c: unknown) => void)({
            hooks: { processAssets: { tapPromise: (_: unknown, fn: typeof processAssets) => (processAssets = fn) } },
            updateAsset: (name: string, source: InstanceType<typeof RawSource>) => (updated[name] = source.text),
            errors,
            warnings: [],
        })
        await processAssets({ 'static/css/app.css': new RawSource('.flex{display:flex}.underline{text-decoration-line:underline}'), 'app.js': new RawSource('x') })
        expect(updated['static/css/app.css']).toBe(`.${table.map.flex}{display:flex}.underline{text-decoration-line:underline}`)
        expect(updated['app.js']).toBeUndefined()

        // CSS ngoài bảng có class trùng tên ngắn: lỗi build thay vì gắn nhầm style.
        await processAssets({ 'vendor.css': new RawSource(`.${table.map.flex}{color:red}`) })
        expect(String(errors[0])).toMatch(/trùng tên ngắn/)
    })

    it('dựng lại bảng khi mã nguồn đổi, dùng lại khi không đổi', async () => {
        const plugin = new PresenceStyleWebpackPlugin({ shortClassNames: true })
        const first = plugin.prepare(root)
        expect(plugin.prepare(root)).toBe(first)
        await first
        write(root, { 'app/extra.tsx': 'export const E = () => <i className="italic flex" />\n' })
        const second = await plugin.prepare(root)
        expect(second.files).toContain('app/extra.tsx')
    })
})

describe('plugin PostCSS: shortClassNames', () => {
    it('đọc cùng bảng qua biến môi trường; không có bảng thì không đổi gì', async () => {
        const css = readFileSync(join(root, 'app/globals.css'), 'utf8')
        const from = join(root, 'app/globals.css')
        const plain = await postcss([presenceStylePostcss({ base: root, shortClassNames: true })]).process(css, { from })
        expect(plain.css).toContain('.flex{')

        const table = await buildShortClassTable({ root })
        const mapFile = join(root, 'cache/map.json')
        writeShortClassTable(mapFile, table)
        process.env[SHORT_CLASS_MAP_ENV] = mapFile
        const short = await postcss([presenceStylePostcss({ base: root, shortClassNames: true })]).process(css, { from })
        expect(short.css).toContain(`.${table.map.flex}{`)
        expect(short.css).not.toContain('.flex{')
        expect(short.messages.some((m) => m.type === 'dependency' && m.file === mapFile)).toBe(true)
        // Không bật tuỳ chọn thì vẫn tên gốc dù có bảng.
        const off = await postcss([presenceStylePostcss({ base: root })]).process(css, { from })
        expect(off.css).toContain('.flex{')
        // File CSS thường (không phải Tailwind) cũng được đổi; class trùng tên ngắn thì dừng build.
        const other = await postcss([presenceStylePostcss({ base: root, shortClassNames: true })]).process('.btn:hover{opacity:.5}', { from: join(root, 'x.css') })
        expect(other.css).toBe(`.${table.map.btn}:hover{opacity:.5}`)
        await expect(postcss([presenceStylePostcss({ base: root, shortClassNames: true })]).process(`.${table.map.flex}{color:red}`, { from: join(root, 'y.css') })).rejects.toThrow(/trùng tên ngắn/)
    })
})

describe('withPresenceStyle (Next.js)', () => {
    it('chỉ thêm plugin khi build production, giữ hàm webpack của người dùng', () => {
        const calls: boolean[] = []
        const config = withPresenceStyle({ reactStrictMode: true, webpack: (c: { plugins?: unknown[] }, ctx: { dev: boolean }) => (calls.push(ctx.dev), c) }, { shortClassNames: true })
        expect(config.reactStrictMode).toBe(true)
        const dev = config.webpack!({ plugins: [] }, { dev: true, dir: root })
        expect(dev.plugins).toHaveLength(0)
        const prod = config.webpack!({ plugins: [] }, { dev: false, dir: root, config: { distDir: 'out-next' } })
        expect(prod.plugins).toHaveLength(1)
        const plugin = prod.plugins![0] as PresenceStyleWebpackPlugin
        expect(plugin.mapFileFor(root)).toBe(join(root, 'out-next/cache/presence-style/short-class-names.json'))
        expect(calls).toEqual([true, false])
    })

    it('không bật tuỳ chọn thì trả nguyên cấu hình; cấu hình dạng hàm được bọc', async () => {
        const base = { a: 1 }
        expect(withPresenceStyle(base)).toBe(base)
        const fn = withPresenceStyle(async () => ({ b: 2 }), { shortClassNames: true })
        const resolved = await (fn as unknown as (phase: string, ctx: unknown) => Promise<{ b: number; webpack: unknown }>)('phase-production-build', {})
        expect(resolved.b).toBe(2)
        expect(typeof resolved.webpack).toBe('function')
    })
})

describe('bảo vệ hàm gộp class (merge)', () => {
    const css = '.px-2{padding-inline:.5rem}.px-4{padding-inline:1rem}.p-4{padding:1rem}.flex{display:flex}.hover\\:px-2:hover{padding-inline:.5rem}.from-a{--tw-gradient-from:red}.from-b{--tw-gradient-from:blue}'
    it('tìm class có đối thủ: cùng thuộc tính (longhand, kể cả biến), cùng dạng selector', () => {
        expect([...findConflictingClasses(css)].sort()).toEqual(['from-a', 'from-b', 'p-4', 'px-2', 'px-4'])
    })

    it("'auto': bật khi mã dùng tailwind-merge; class có đối thủ và tên giữ chuỗi con giữ nguyên", () => {
        const sources = ['<div className="px-2 px-4 p-4 flex hover:px-2 from-a from-b" />']
        expect(createShortClassNames({ css, sources }).map.has('px-2')).toBe(true)
        const guarded = createShortClassNames({ css, sources: [...sources, 'import { twMerge } from "tailwind-merge"'] })
        expect(guarded.skipped.get('px-2')).toBe('merge')
        expect(guarded.skipped.get('from-b')).toBe('merge')
        expect([...guarded.map.keys()].sort()).toEqual(['flex', 'hover:px-2'])
        expect(createShortClassNames({ css, sources, merge: true }).skipped.get('px-4')).toBe('merge')

        const attr = '.size-4{width:1rem}[class*="size-"]{flex-shrink:0}'
        const src = ['<i className="size-4" />']
        expect(createShortClassNames({ css: attr, sources: src }).map.get('size-4')).toMatch(/^size-/)
        expect(createShortClassNames({ css: attr, sources: src, merge: true }).skipped.get('size-4')).toBe('merge')
    })
})

describe('bộ đổi tên dựng từ bảng có sẵn', () => {
    it('cho cùng kết quả với bảng gốc', () => {
        const css = '.flex{display:flex}.p-4{padding:1rem}.hidden{display:none}'
        const sources = ['<div className="flex p-4" />', 'const x = "hidden"']
        const full = createShortClassNames({ css, sources, merge: false })
        const fromMap = shortClassNamesFromMap(Object.fromEntries(full.map))
        expect(fromMap.rewriteCss(css)).toBe(full.rewriteCss(css))
        expect(fromMap.rewriteSource(sources[0])).toBe(full.rewriteSource(sources[0]))
        expect(fromMap.findUnrecognized('const y = "flex"')).toEqual(['flex'])
        expect(findShortNameCollisions(`.${full.map.get('flex')}{color:red}.flex{}`, { map: Object.fromEntries(full.map) })).toEqual([full.map.get('flex')])
    })

    it('opaqueSources: class xuất hiện ở đó giữ tên', () => {
        const short = createShortClassNames({ css: '.flex{display:flex}.grid{display:grid}', sources: ['<div className="flex grid" />'], opaqueSources: ['<div class="grid"></div>'] })
        expect(short.map.has('flex')).toBe(true)
        expect(short.skipped.get('grid')).toBe('unrecognized')
    })
})
