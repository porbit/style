/**
 * Plugin webpack/Rspack cho @porbit/style: rút gọn tên class lúc build production (Next.js `webpack`, Rspack,
 * webpack thuần). CSS vẫn do plugin PostCSS `@porbit/style/postcss` sinh như thường.
 *
 *   // webpack.config.js / rspack.config.js
 *   const { PresenceStyleWebpackPlugin } = require('@porbit/style/webpack')
 *   module.exports = { mode: 'production', plugins: [new PresenceStyleWebpackPlugin({ shortClassNames: true })] }
 *
 *   // next.config.mjs: xem `@porbit/style/next` (`withPresenceStyle`).
 *
 * Cách giữ CSS và mã nhất quán: trước khi biên dịch (`beforeRun`/`watchRun`), plugin quét TOÀN BỘ mã nguồn dưới
 * `include` và biên dịch các file CSS kiểu Tailwind ở đó (như plugin PostCSS) để dựng bảng ánh xạ MỘT lần, ghi ra
 * file JSON (`mapFile`, mặc định `node_modules/.cache/presence-style/short-class-names.json`; Next.js: trong
 * `.next/cache`). Mọi nơi đổi tên đều đọc đúng file này:
 *   - loader (`enforce: 'pre'`, chạy trên mã gốc trước SWC/Babel) đổi token trong chuỗi class nhận diện chắc chắn;
 *   - plugin PostCSS với `shortClassNames: true` (tìm file qua biến môi trường do plugin này đặt) đổi CSS ngay lúc
 *     sinh, cần khi CSS đi vào JS (`style-loader`) thay vì thành file `.css`;
 *   - mọi file `.css` của bundle được đổi lại ở `processAssets` (idempotent: tên mới không trùng tên class nào).
 * Bảng xác định (cùng mã -> cùng bảng) nên nhiều compiler (server/client/edge của Next.js) hay worker cho cùng kết quả.
 * File JSON là dependency của từng module: cache bền của webpack tự vô hiệu khi bảng đổi.
 *
 * Chỉ bật khi `mode === 'production'` (hoặc `force: true`). Không phụ thuộc gói `webpack` lúc chạy.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { collectFilesSync } from './files'
import { compileTailwindCss, POSTCSS_EXTENSIONS, type PresenceStylePostcssOptions } from './postcss'
import { createShortClassNames, DEFAULT_CLASS_FUNCTIONS, type ShortClassNamesOptions } from './shorten'
import { findShortNameCollisions, loadShortClassTable, markLoaderRan, shared, SHORT_CLASS_MAP_ENV, writeShortClassTable, type ShortClassTable } from './short-table'

export { findShortNameCollisions, loadShortClassTable, SHORT_CLASS_MAP_ENV, writeShortClassTable, type ShortClassTable } from './short-table'

export interface PresenceStyleWebpackOptions {
    /** Rút gọn tên class (opt-in): `true` hoặc `{ exclude, prefix, functions }` như plugin Vite. */
    shortClassNames?: boolean | ShortClassNamesOptions
    /** Thư mục gốc dự án. Mặc định `compiler.context`. */
    root?: string
    /** Thư mục/file cần quét, tương đối với `root`. Mặc định `['.']` (bỏ node_modules, thư mục ẩn, dist/build/.next...). */
    include?: string[]
    /** Phần mở rộng cần quét. Mặc định như plugin PostCSS. */
    extensions?: string[]
    /**
     * Thư mục (tương đối với `root`) chứa file KHÔNG đi qua bundler nhưng có thể dùng class (file tĩnh). Class xuất
     * hiện ở đây giữ nguyên tên. Mặc định `['public']`.
     */
    opaque?: string[]
    /** Tuỳ chọn plugin PostCSS dùng để biên dịch file CSS kiểu Tailwind (nên giống `postcss.config`). */
    postcss?: PresenceStylePostcssOptions
    /** File JSON chứa bảng ánh xạ. Mặc định `<root>/node_modules/.cache/presence-style/short-class-names.json`. */
    mapFile?: string
    /** Bật cả khi `mode` không phải `production`. */
    force?: boolean
}

const PLUGIN_NAME = 'PresenceStyleWebpackPlugin'
/** Mã do loader biến đổi: chạy trên mã gốc trước SWC/Babel/esbuild. */
const LOADER_TEST = /\.(?:[cm]?[jt]sx?|mdx)$/
const DEFAULT_OPAQUE = ['public']

const toPosix = (path: string) => (sep === '/' ? path : path.split(sep).join('/'))
const isInside = (dir: string, file: string) => {
    const rel = relative(dir, file)
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

const TAILWIND_ENTRY = /@import\s+["']tailwindcss|@tailwind\s+(?:base|components|utilities)\b|@config\s+["']/

interface TableInput {
    root: string
    include: string[]
    extensions: string[]
    opaque: string[]
    postcss: PresenceStylePostcssOptions
    options: ShortClassNamesOptions
}

const listInputs = (input: TableInput) => {
    const sourceFiles = new Set<string>()
    const cssFiles = new Set<string>()
    const extensions = input.extensions.filter((ext) => ext !== 'css')
    for (const entry of input.include) {
        const target = resolve(input.root, entry)
        for (const file of collectFilesSync(target, extensions)) sourceFiles.add(file)
        for (const file of collectFilesSync(target, ['css'])) cssFiles.add(file)
    }
    // Thư mục tĩnh (`public/`) có thể bị bỏ qua khi liệt kê (thư mục ẩn...): luôn quét thêm để giữ tên class.
    for (const entry of input.opaque) {
        const target = resolve(input.root, entry)
        if (existsSync(target)) for (const file of collectFilesSync(target, extensions)) sourceFiles.add(file)
    }
    return { sourceFiles: [...sourceFiles].sort(), cssFiles: [...cssFiles].sort() }
}

/** Dấu vân tay rẻ (đường dẫn + mtime + kích thước) để biết có cần dựng lại bảng không. */
const fingerprintOf = (files: string[]): string => {
    let out = ''
    for (const file of files) {
        try {
            const s = statSync(file)
            out += `${file}\u0000${s.mtimeMs}\u0000${s.size}\n`
        } catch (_error) {
            out += `${file}\u0000-\n`
        }
    }
    return out
}

/**
 * Dựng bảng ánh xạ từ toàn bộ mã nguồn và CSS dưới `include` (dùng cho bundler không phải Vite). File có phần mở rộng
 * loader không biến đổi (`.html`, `.md`, `.vue`...) và file trong `opaque` chỉ được đọc để giữ tên class.
 */
export const buildShortClassTable = async (input: Partial<TableInput> & { root: string }): Promise<ShortClassTable> => {
    const full: TableInput = {
        include: ['.'],
        extensions: POSTCSS_EXTENSIONS,
        opaque: DEFAULT_OPAQUE,
        postcss: {},
        options: {},
        ...input,
        root: resolve(input.root),
    }
    return buildTable(full, listInputs(full))
}

const buildTable = async (input: TableInput, { sourceFiles, cssFiles }: ReturnType<typeof listInputs>): Promise<ShortClassTable> => {
    const { root } = input
    const opaqueDirs = input.opaque.map((dir) => resolve(root, dir))
    const sheets: string[] = []
    for (const file of cssFiles) {
        const text = readFileSync(file, 'utf8')
        if (TAILWIND_ENTRY.test(text)) sheets.push((await compileTailwindCss(text, { ...input.postcss, base: input.postcss.base ?? root, from: file })).css)
        else sheets.push(text)
    }
    const sources: Record<string, string> = {}
    const opaqueSources: string[] = []
    for (const file of sourceFiles) {
        let code: string
        try {
            code = readFileSync(file, 'utf8')
        } catch (_error) {
            continue
        }
        if (LOADER_TEST.test(file) && !opaqueDirs.some((dir) => isInside(dir, file))) sources[toPosix(relative(root, file))] = code
        else opaqueSources.push(code)
    }
    const short = createShortClassNames({ ...input.options, css: sheets, sources, opaqueSources })
    return {
        version: 1,
        root,
        functions: [...(input.options.functions ?? DEFAULT_CLASS_FUNCTIONS)],
        files: Object.keys(sources),
        map: Object.fromEntries(short.map),
        skipped: Object.fromEntries(short.skipped),
    }
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Phần API loader mà loader dùng: có ở webpack, Rspack và Turbopack (`turbopack.rules`, API con của webpack).
 * `addDependency`/`emitWarning` không bắt buộc (bộ chạy loader tối giản).
 */
export interface MinimalLoaderContext {
    resourcePath: string
    getOptions?(): { mapFile?: string } | undefined
    query?: unknown
    addDependency?(file: string): void
    emitWarning?(error: Error): void
    async(): (error: Error | null, code?: string, map?: unknown) => void
}

/**
 * Loader webpack/Rspack/Turbopack (`@porbit/style/webpack-loader`, do plugin hoặc `withPresenceStyle` tự thêm): đổi
 * tên token trong chuỗi class của file đã phân tích; file khác (ngoài `include`, thư viện) chỉ được kiểm tra để cảnh báo.
 */
export function shortClassNamesLoader(this: MinimalLoaderContext, code: string, inputMap?: unknown): void {
    const callback = this.async()
    const options = (this.getOptions ? this.getOptions() : (this.query as { mapFile?: string } | undefined)) ?? {}
    const mapFile = options.mapFile
    if (!mapFile) return callback(null, code, inputMap)
    this.addDependency?.(mapFile)
    let loaded
    try {
        loaded = loadShortClassTable(mapFile)
    } catch (error) {
        return callback(error as Error)
    }
    if (!loaded || !Object.keys(loaded.table.map).length) return callback(null, code, inputMap)
    const file = this.resourcePath
    if (loaded.files.has(file)) {
        markLoaderRan(mapFile)
        const next = loaded.rewriter.rewriteSourceWithMap(code, file)
        return next.map ? callback(null, next.code, next.map) : callback(null, code, inputMap)
    }
    // Thư viện/file ngoài `include` dùng class đã đổi tên trong chuỗi nhiều class: gần như chắc chắn là class.
    const used = new Set<string>()
    const map = loaded.rewriter.map
    for (const m of code.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.){3,})\1/g)) {
        const hits = m[2].split(/\s+/).filter((token) => map.has(token))
        if (hits.length >= 2) hits.forEach((token) => used.add(token))
        if (used.size >= 5) break
    }
    if (used.size && this.emitWarning) {
        const where = toPosix(relative(loaded.table.root, file)) || file
        this.emitWarning(new Error(`[presence-style] shortClassNames: ${where} (ngoài include) có vẻ dùng class đã đổi tên: ${[...used].slice(0, 5).join(', ')}. Thêm file vào include hoặc vào shortClassNames.exclude.`))
    }
    callback(null, code, inputMap)
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

interface MinimalSource {
    source(): string | Buffer
}
interface MinimalCompilation {
    hooks: { processAssets: { tapPromise(options: { name: string; stage: number }, fn: (assets: Record<string, MinimalSource>) => Promise<void>): void } }
    updateAsset(name: string, source: unknown): void
    errors: unknown[]
    warnings: unknown[]
}
export interface MinimalCompiler {
    context: string
    options: { mode?: string; module: { rules: unknown[] } }
    hooks: {
        beforeRun: { tapPromise(name: string, fn: (compiler: unknown) => Promise<void>): void }
        watchRun: { tapPromise(name: string, fn: (compiler: unknown) => Promise<void>): void }
        thisCompilation: { tap(name: string, fn: (compilation: MinimalCompilation) => void): void }
    }
    webpack?: {
        Compilation?: { PROCESS_ASSETS_STAGE_OPTIMIZE?: number }
        sources?: { RawSource: new (source: string) => unknown }
        WebpackError?: new (message: string) => Error
    }
}

/** Đường dẫn loader trong gói đã build (`dist/webpack-loader.cjs`). */
const loaderPath = () => join(__dirname, 'webpack-loader.cjs')

export class PresenceStyleWebpackPlugin {
    readonly options: PresenceStyleWebpackOptions
    constructor(options: PresenceStyleWebpackOptions = {}) {
        this.options = options
    }

    /** Bảng của lần build này (dựng lại khi file nguồn đổi; dùng chung giữa các compiler cùng `mapFile`). */
    prepare(root: string): Promise<ShortClassTable> {
        const { shortClassNames, include = ['.'], extensions = POSTCSS_EXTENSIONS, opaque = DEFAULT_OPAQUE, postcss = {} } = this.options
        const mapFile = this.mapFileFor(root)
        const input: TableInput = { root, include, extensions, opaque, postcss, options: typeof shortClassNames === 'object' ? shortClassNames : {} }
        const files = listInputs(input)
        const fingerprint = JSON.stringify([include, extensions, opaque, postcss, input.options, String(input.options.exclude ?? '')]) + fingerprintOf([...files.sourceFiles, ...files.cssFiles])
        const tables = shared().tables
        const hit = tables.get(mapFile)
        // Đang dựng (compiler khác chạy song song) hoặc đã dựng mà file còn đó: dùng lại.
        if (hit && hit.fingerprint === fingerprint && (!hit.done || existsSync(mapFile))) return hit.promise
        const entry = { fingerprint, done: false, promise: Promise.resolve(null as unknown as ShortClassTable) }
        entry.promise = buildTable(input, files).then((table) => {
            writeShortClassTable(mapFile, table)
            entry.done = true
            return table
        })
        const promise = entry.promise
        tables.set(mapFile, entry)
        promise.catch(() => tables.delete(mapFile))
        return promise
    }

    mapFileFor(root: string): string {
        return resolve(root, this.options.mapFile ?? join('node_modules', '.cache', 'presence-style', 'short-class-names.json'))
    }

    apply(compiler: MinimalCompiler): void {
        const { shortClassNames, force } = this.options
        if (!shortClassNames || (!force && compiler.options.mode !== 'production')) return
        const root = resolve(this.options.root ?? compiler.context)
        const mapFile = this.mapFileFor(root)
        compiler.options.module.rules.unshift({ test: LOADER_TEST, enforce: 'pre', loader: loaderPath(), options: { mapFile } })
        const prepare = async () => {
            await this.prepare(root)
            process.env[SHORT_CLASS_MAP_ENV] = mapFile
        }
        compiler.hooks.beforeRun.tapPromise(PLUGIN_NAME, prepare)
        compiler.hooks.watchRun.tapPromise(PLUGIN_NAME, prepare)
        const stage = compiler.webpack?.Compilation?.PROCESS_ASSETS_STAGE_OPTIMIZE ?? 100
        const RawSource = compiler.webpack?.sources?.RawSource
        const ErrorType = compiler.webpack?.WebpackError ?? Error
        compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
            compilation.hooks.processAssets.tapPromise({ name: PLUGIN_NAME, stage }, async (assets) => {
                const loaded = loadShortClassTable(mapFile)
                if (!loaded || !RawSource) return
                for (const [name, asset] of Object.entries(assets)) {
                    if (!/\.css(?:$|\?)/.test(name)) continue
                    const text = String(asset.source())
                    // Plugin PostCSS đã đổi tên (và kiểm tra trùng) thì tên ngắn trong file là của ta, không phải trùng.
                    if (!shared().postcss) {
                        const collisions = findShortNameCollisions(text, loaded.table)
                        if (collisions.length) {
                            compilation.errors.push(new ErrorType(`[presence-style] shortClassNames: ${name} có class trùng tên ngắn (${collisions.slice(0, 5).join(', ')}), CSS này không có trong bảng. Đặt shortClassNames.prefix (ví dụ 'x').`))
                            continue
                        }
                    }
                    const next = loaded.rewriter.rewriteCss(text)
                    if (next !== text) compilation.updateAsset(name, new RawSource(next))
                }
            })
        })
    }
}

export default PresenceStyleWebpackPlugin
