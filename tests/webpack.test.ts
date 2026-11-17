import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { buildSync } from 'esbuild'
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
import { isNextProductionBuild, isTurbopack, nextInternals, rewriteBuiltCss, withPresenceStyle } from '../src/next'
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
    root = realpathSync(mkdtempSync(join(tmpdir(), 'ps-webpack-')))
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
        // File đánh dấu cho bước hậu kỳ của Turbopack (PostCSS chạy ở tiến trình khác).
        expect(existsSync(mapFile + '.postcss')).toBe(true)
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

describe('loader dưới Turbopack (`turbopack.rules`)', () => {
    it('chỉ dùng API con: resourcePath, getOptions, async, addDependency (không emitWarning, không query)', async () => {
        const table = await buildShortClassTable({ root })
        const mapFile = join(root, 'cache/map.json')
        writeShortClassTable(mapFile, table)
        const run = (file: string, code: string) =>
            new Promise<{ code?: string; deps: string[] }>((resolveRun, reject) => {
                const deps: string[] = []
                shortClassNamesLoader.call(
                    { resourcePath: file, getOptions: () => ({ mapFile }), addDependency: (dep: string) => deps.push(dep), async: () => (error: Error | null, out?: string) => (error ? reject(error) : resolveRun({ code: out, deps })) },
                    code,
                )
            })
        const page = join(root, 'app/page.tsx')
        const out = await run(page, readFileSync(page, 'utf8'))
        expect(out.code).toContain(`className="${table.map.btn} underline"`)
        expect(out.deps).toEqual([mapFile])
        // File ngoài bảng dùng class đã đổi tên: không có emitWarning thì bỏ qua cảnh báo, không lỗi.
        const libCode = 'export const x = "flex items-center gap-4"'
        expect((await run(join(root, 'lib.js'), libCode)).code).toBe(libCode)
        // Không có cả addDependency.
        const bare = await new Promise<string | undefined>((resolveRun) => shortClassNamesLoader.call({ resourcePath: page, getOptions: () => ({ mapFile }), async: () => (_e: Error | null, code?: string) => resolveRun(code) }, '<p className="text-sm"/>'))
        expect(bare).toBe(`<p className="${table.map['text-sm']}"/>`)
    })
})

describe('withPresenceStyle với Turbopack', () => {
    it('phát hiện phase build production: tham số phase, NEXT_PHASE, dòng lệnh `next build`', () => {
        expect(isNextProductionBuild('phase-production-build', [], {})).toBe(true)
        expect(isNextProductionBuild('phase-development-server', ['node', '/x/node_modules/.bin/next', 'build'], {})).toBe(false)
        expect(isNextProductionBuild(undefined, ['node', 'worker.js'], { NEXT_PHASE: 'phase-production-build' })).toBe(true)
        expect(isNextProductionBuild(undefined, ['node', 'worker.js'], { NEXT_PHASE: 'phase-production-server' })).toBe(false)
        expect(isNextProductionBuild(undefined, ['node', '/x/node_modules/.bin/next', 'build'], {})).toBe(true)
        expect(isNextProductionBuild(undefined, ['node', '/x/node_modules/next/dist/bin/next', '--debug', 'build', 'app'], {})).toBe(true)
        expect(isNextProductionBuild(undefined, ['node', '/x/node_modules/.bin/next', 'dev'], {})).toBe(false)
        expect(isNextProductionBuild(undefined, ['node', '/x/node_modules/.bin/next', 'start'], {})).toBe(false)
        expect(isNextProductionBuild(undefined, ['node', 'vitest', 'build'], {})).toBe(false)
        expect(isTurbopack({ TURBOPACK: 'auto' })).toBe(true)
        expect(isTurbopack({ TURBOPACK: '1' })).toBe(true)
        expect(isTurbopack({})).toBe(false)
        expect(isTurbopack({ TURBOPACK: '1', NEXT_RSPACK: 'true' })).toBe(false)
    })

    it('luôn có khoá turbopack (Next 16 dừng build khi chỉ có webpack); dev/webpack không dựng bảng lúc nạp cấu hình', async () => {
        const config = withPresenceStyle({ reactStrictMode: true }, { shortClassNames: true })
        expect(config.turbopack).toEqual({})
        const own = withPresenceStyle({ turbopack: { resolveAlias: { a: 'b' } } }, { shortClassNames: true })
        expect(own.turbopack).toEqual({ resolveAlias: { a: 'b' } })
        const previous = process.env.TURBOPACK
        process.env.TURBOPACK = 'auto'
        try {
            const dev = await (withPresenceStyle(() => ({}), { shortClassNames: true }) as unknown as (phase: string) => Promise<Record<string, unknown>>)('phase-development-server')
            expect(dev.turbopack).toEqual({})
            expect(dev.compiler).toBeUndefined()
        } finally {
            if (previous === undefined) delete process.env.TURBOPACK
            else process.env.TURBOPACK = previous
        }
    })

    it('build Turbopack: dựng bảng đồng bộ lúc nạp cấu hình, thêm loader vào turbopack.rules, hậu kỳ đổi CSS đã xuất', async () => {
        // Tiến trình con dựng bảng nạp bản CJS của src/webpack.ts (gói chưa build trong test).
        const bundle = join(root, '.builder/webpack.js')
        buildSync({ entryPoints: [join(__dirname, '../src/webpack.ts')], bundle: true, platform: 'node', format: 'cjs', target: 'node18', outfile: bundle, logLevel: 'error', define: { __PRESENCE_STYLE_VERSION__: '"test"', __XCSS_CACHE__: 'true', __XCSS_DICTIONARY__: 'true', __XCSS_EDITOR__: 'true' } })
        const original = nextInternals.tableBuilderModule
        nextInternals.tableBuilderModule = () => bundle
        const cwd = process.cwd()
        const previous = process.env.TURBOPACK
        process.env.TURBOPACK = 'auto'
        process.chdir(root)
        try {
            const userAfter: string[] = []
            const fn = withPresenceStyle(
                () => ({
                    distDir: 'out',
                    turbopack: { rules: { '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' }, '*.tsx': { loaders: ['user-loader'], as: '*.tsx' } } },
                    compiler: { runAfterProductionCompile: async () => void userAfter.push('user') },
                }),
                { shortClassNames: { exclude: [/^items-/] } },
            ) as unknown as (phase: string) => Promise<Record<string, any>>
            const config = await fn('phase-production-build')
            const mapFile = join(root, 'out/cache/presence-style/short-class-names.json')
            expect(process.env[SHORT_CLASS_MAP_ENV]).toBe(mapFile)
            const table = JSON.parse(readFileSync(mapFile, 'utf8'))
            expect(table.map.flex).toBeTruthy()
            // RegExp trong exclude đi qua tiến trình con.
            expect(table.map['items-center']).toBeUndefined()
            const rules = config.turbopack.rules
            expect(rules['*.svg']).toEqual({ loaders: ['@svgr/webpack'], as: '*.js' })
            // Luật của người dùng: loader của ta ở cuối (chạy đầu tiên, trên mã gốc).
            expect(rules['*.tsx'].loaders).toHaveLength(2)
            expect(rules['*.tsx'].loaders[0]).toBe('user-loader')
            expect(rules['*.tsx'].loaders[1]).toMatchObject({ loader: expect.stringMatching(/webpack-loader\.cjs$/), options: { mapFile } })
            // Phần mở rộng khác: luật mới, bỏ file của thư viện (Next 16+: condition; không có next cài thì coi như bản mới nhất).
            expect(rules['*.ts']).toEqual({ loaders: [expect.objectContaining({ options: { mapFile } })], condition: { not: 'foreign' } })
            expect(Object.keys(rules)).toEqual(expect.arrayContaining(['*.js', '*.jsx', '*.mjs', '*.cjs', '*.mts', '*.cts']))
            expect(rules['*.mdx']).toBeUndefined()

            // Nạp lại cấu hình trong cùng tiến trình (Next.js làm vậy) hoặc ở tiến trình con: không dựng lại.
            nextInternals.tableBuilderModule = () => join(root, 'khong-co.js')
            await fn('phase-production-build')
            // Tiến trình con biên dịch của Next 15.5 (dòng lệnh không có `build`), cấu hình dạng object: dùng bảng thừa hưởng.
            const worker = withPresenceStyle({ distDir: 'out' }, { shortClassNames: true }) as Record<string, any>
            expect(worker.turbopack.rules['*.tsx'].loaders[0].options).toEqual({ mapFile })
            // Dựng trang tĩnh (NEXT_PHASE khác build, ví dụ `next start`): không bật.
            process.env.NEXT_PHASE = 'phase-production-server'
            expect((withPresenceStyle({}, { shortClassNames: true }) as Record<string, any>).turbopack).toEqual({})
            delete process.env.NEXT_PHASE

            // Hậu kỳ: CSS đã xuất (chưa qua PostCSS rút gọn) được đổi tên; gọi hàm của người dùng trước.
            mkdirSync(join(root, 'out/static/chunks'), { recursive: true })
            writeFileSync(join(root, 'out/static/chunks/a.css'), '.flex{display:flex}.btn:hover{opacity:.5}')
            // Lưới an toàn: loader chưa chạy trên file nào của dự án (CSS sẽ lệch tên với mã) thì dừng build.
            await expect(config.compiler.runAfterProductionCompile({ projectDir: root, distDir: join(root, 'out') })).rejects.toThrow(/loader của turbopack.rules không chạy/)
            // Loader (đúng tuỳ chọn khai báo trong luật) chạy trên file của dự án thì ghi file đánh dấu.
            const page = join(root, 'app/page.tsx')
            const ruleOptions = rules['*.ts'].loaders[0].options
            await new Promise((resolveRun) => shortClassNamesLoader.call({ resourcePath: page, getOptions: () => ruleOptions, async: () => resolveRun }, readFileSync(page, 'utf8')))
            expect(existsSync(mapFile + '.loader')).toBe(true)
            userAfter.length = 0
            await config.compiler.runAfterProductionCompile({ projectDir: root, distDir: join(root, 'out') })
            expect(userAfter).toEqual(['user'])
            expect(readFileSync(join(root, 'out/static/chunks/a.css'), 'utf8')).toBe(`.${table.map.flex}{display:flex}.${table.map.btn}:hover{opacity:.5}`)
            // PostCSS đã đổi tên (có file đánh dấu, kiểm tra trùng đã làm ở đó): chạy lại không đổi gì (idempotent).
            writeFileSync(mapFile + '.postcss', '')
            expect(rewriteBuiltCss(join(root, 'out'), mapFile)).toBe(0)
            // Không có file đánh dấu (CSS chưa qua PostCSS rút gọn): CSS ngoài bảng trùng tên ngắn thì dừng build.
            rmSync(mapFile + '.postcss')
            mkdirSync(join(root, 'out2/static'), { recursive: true })
            writeFileSync(join(root, 'out2/static/b.css'), `.${table.map.flex}{color:red}`)
            expect(() => rewriteBuiltCss(join(root, 'out2'), mapFile)).toThrow(/trùng tên ngắn/)
        } finally {
            nextInternals.tableBuilderModule = original
            process.chdir(cwd)
            if (previous === undefined) delete process.env.TURBOPACK
            else process.env.TURBOPACK = previous
        }
    })

    it('Next 15.5: luật dạng điều kiện lồng (`foreign: false`); dưới 15.5: cảnh báo, giữ nguyên tên', async () => {
        const bundle = join(root, '.builder/webpack.js')
        buildSync({ entryPoints: [join(__dirname, '../src/webpack.ts')], bundle: true, platform: 'node', format: 'cjs', target: 'node18', outfile: bundle, logLevel: 'error', define: { __PRESENCE_STYLE_VERSION__: '"test"', __XCSS_CACHE__: 'true', __XCSS_DICTIONARY__: 'true', __XCSS_EDITOR__: 'true' } })
        const original = nextInternals.tableBuilderModule
        nextInternals.tableBuilderModule = () => bundle
        const cwd = process.cwd()
        const previous = process.env.TURBOPACK
        const warn = console.warn
        const warnings: string[] = []
        console.warn = (message: string) => void warnings.push(message)
        process.env.TURBOPACK = '1'
        process.chdir(root)
        try {
            const load = (version: string) => {
                write(root, { 'node_modules/next/package.json': JSON.stringify({ name: 'next', version }) })
                return (withPresenceStyle(() => ({}), { shortClassNames: true }) as unknown as (phase: string) => Promise<Record<string, any>>)('phase-production-build')
            }
            const old = await load('15.3.2')
            expect(warnings[0]).toMatch(/cần Next.js 15.5\+/)
            expect(old.turbopack).toEqual({})
            expect(old.compiler).toBeUndefined()
            expect(existsSync(join(root, '.next/cache/presence-style/short-class-names.json'))).toBe(false)

            const config = await load('15.5.4')
            const mapFile = join(root, '.next/cache/presence-style/short-class-names.json')
            expect(config.turbopack.rules['*.tsx']).toEqual({ foreign: false, default: { loaders: [{ loader: expect.stringMatching(/webpack-loader\.cjs$/), options: { mapFile } }] } })
            expect(typeof config.compiler.runAfterProductionCompile).toBe('function')
        } finally {
            nextInternals.tableBuilderModule = original
            console.warn = warn
            process.chdir(cwd)
            if (previous === undefined) delete process.env.TURBOPACK
            else process.env.TURBOPACK = previous
        }
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
