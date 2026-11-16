/**
 * Tích hợp Next.js: rút gọn tên class lúc `next build`, cả webpack lẫn Turbopack. CSS vẫn do plugin PostCSS sinh như thường.
 *
 *   // next.config.mjs
 *   import { withPresenceStyle } from '@porbit/style/next'
 *   export default withPresenceStyle({ reactStrictMode: true }, { shortClassNames: true })
 *
 *   // postcss.config.mjs (nên bật: đổi tên ngay lúc sinh CSS, kể cả CSS của thư viện, và kiểm tra trùng tên ngắn)
 *   export default { plugins: { '@porbit/style/postcss': { shortClassNames: true } } }
 *
 * Chỉ chạy khi build production; dev server giữ nguyên tên class. Bảng ánh xạ ghi ở
 * `<distDir>/cache/presence-style/short-class-names.json`.
 *   - webpack (`next build` của Next 15, `next build --webpack` của Next 16+), Rspack: plugin `@porbit/style/webpack`
 *     dựng bảng trước khi biên dịch, loader đổi mã, `processAssets` đổi file `.css`.
 *   - Turbopack (`next build` của Next 16+, `next build --turbopack` của Next 15.5): Turbopack không chạy plugin
 *     webpack nên bảng được dựng NGAY KHI Next.js nạp cấu hình (phase build production; tiến trình con chạy đồng bộ),
 *     loader khai báo qua `turbopack.rules` (mã của dự án, không đụng `node_modules`), plugin PostCSS đổi CSS (Turbopack
 *     chạy PostCSS của dự án cho mọi file CSS, kể cả thư viện) và `compiler.runAfterProductionCompile` đổi lại mọi
 *     file `.css` đã xuất (idempotent; cần khi PostCSS không bật `shortClassNames`).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { findShortNameCollisions, loadShortClassTable, loaderMarkerFile, postcssMarkerFile, SHORT_CLASS_MAP_ENV } from './short-table'
import { PresenceStyleWebpackPlugin, type MinimalCompiler, type PresenceStyleWebpackOptions } from './webpack'

export type WithPresenceStyleOptions = Omit<PresenceStyleWebpackOptions, 'root' | 'mapFile' | 'force'>

/** Phần của tham số thứ hai mà Next.js truyền cho hàm `webpack(config, context)`. */
interface NextWebpackContext {
    dev: boolean
    isServer?: boolean
    dir: string
    config?: { distDir?: string }
}
interface NextWebpackConfig {
    plugins?: unknown[]
}
type AfterCompile = (metadata: { projectDir: string; distDir: string }) => Promise<void>
type NextConfigObject = Record<string, unknown> & {
    webpack?: ((config: NextWebpackConfig, context: NextWebpackContext) => NextWebpackConfig) | null
    turbopack?: Record<string, unknown> & { rules?: Record<string, unknown> }
    compiler?: Record<string, unknown> & { runAfterProductionCompile?: AfterCompile }
    distDir?: string
}
type NextConfigInput = NextConfigObject | ((phase: string, context: unknown) => NextConfigObject | Promise<NextConfigObject>)

export const PHASE_PRODUCTION_BUILD = 'phase-production-build'

/**
 * Next.js đang build production không: `phase` (cấu hình dạng hàm) nếu có, rồi `NEXT_PHASE` (Next.js đặt cho tiến
 * trình con dựng trang tĩnh), rồi dòng lệnh `next build [thư-mục]`.
 */
export const isNextProductionBuild = (phase?: string, argv: readonly string[] = process.argv, env: NodeJS.ProcessEnv = process.env): boolean => {
    if (phase) return phase === PHASE_PRODUCTION_BUILD
    if (env.NEXT_PHASE) return env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
    return nextCliCommand(argv)?.command === 'build'
}

/** `next <lệnh> [thư-mục]` từ `process.argv` (bin `.bin/next` hoặc `next/dist/bin/next`). */
const nextCliCommand = (argv: readonly string[]) => {
    const bin = argv.findIndex((arg, index) => index > 0 && /(?:^|[\\/])next(?:\.[cm]?js)?$/.test(arg))
    if (bin < 0) return null
    const positional = argv.slice(bin + 1).filter((arg) => !arg.startsWith('-'))
    return { command: positional[0], dir: positional[1] }
}

/** Bundler của lần build này là Turbopack (Next 16 đặt `TURBOPACK=auto` khi mặc định, `1` khi có `--turbopack`). */
export const isTurbopack = (env: NodeJS.ProcessEnv = process.env): boolean => !!env.TURBOPACK && env.TURBOPACK !== '0' && !env.NEXT_RSPACK

/** Phiên bản Next.js cài trong dự án (`[major, minor]`), null khi không đọc được. */
const nextVersion = (dir: string): [number, number] | null => {
    try {
        // Từ thư mục dự án, rồi từ script đang chạy (tiến trình con của Next.js nằm trong gói `next`, thư mục làm việc có
        // thể khác thư mục dự án). Đọc file thay cho `require`: không dính bộ nhớ đệm module.
        const paths = [dir, ...(process.argv[1] ? [dirname(process.argv[1])] : [])]
        const file = createRequire(join(dir, 'package.json')).resolve('next/package.json', { paths })
        const version = String(JSON.parse(readFileSync(file, 'utf8')).version)
        const [major, minor] = version.split('.').map(Number)
        return Number.isFinite(major) && Number.isFinite(minor) ? [major, minor] : null
    } catch (_error) {
        return null
    }
}

/** Phần mở rộng mã nguồn loader đổi tên dưới Turbopack (như `LOADER_TEST` của plugin webpack, trừ `.mdx`). */
const TURBOPACK_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'mts', 'cts']

/** Mô-đun có `PresenceStyleWebpackPlugin` (bản CJS đã build) mà tiến trình con dựng bảng nạp; test ghi đè. */
export const nextInternals = { tableBuilderModule: () => join(__dirname, 'webpack.js') }

const REGEXP_KEY = '\u0000re'
const BUILDER = `
const chunks = []
process.stdin.on('data', (c) => chunks.push(c)).on('end', () => {
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'), (k, v) => (v && typeof v === 'object' && Array.isArray(v[${JSON.stringify(REGEXP_KEY)}]) ? new RegExp(v[${JSON.stringify(REGEXP_KEY)}][0], v[${JSON.stringify(REGEXP_KEY)}][1]) : v))
  const { PresenceStyleWebpackPlugin } = require(input.module)
  new PresenceStyleWebpackPlugin(input.options).prepare(input.root).then(
    (table) => process.stdout.write(JSON.stringify({ classes: Object.keys(table.map).length })),
    (error) => { console.error((error && error.stack) || error); process.exitCode = 1 },
  )
})`

/**
 * Dựng bảng ánh xạ ĐỒNG BỘ (tiến trình con Node chạy `PresenceStyleWebpackPlugin.prepare`): Next.js nạp cấu hình đối
 * tượng đồng bộ, còn biên dịch CSS Tailwind là bất đồng bộ. Ghi `mapFile` (chỉ khi nội dung đổi).
 */
export const buildShortClassTableSync = (root: string, mapFile: string, options: WithPresenceStyleOptions): { classes: number } => {
    const input = { module: nextInternals.tableBuilderModule(), root, options: { ...options, root, mapFile, force: true } }
    const json = JSON.stringify(input, (_key, value) => (value instanceof RegExp ? { [REGEXP_KEY]: [value.source, value.flags] } : value))
    const out = execFileSync(process.execPath, ['-e', BUILDER], { input: json, cwd: root, stdio: ['pipe', 'pipe', 'inherit'], maxBuffer: 1 << 20 })
    return JSON.parse(String(out)) as { classes: number }
}

/** Mọi file `.css` dưới `dir` (bỏ thư mục `cache`). */
const cssFilesUnder = (dir: string): string[] => {
    const out: string[] = []
    const walk = (current: string) => {
        let entries
        try {
            entries = readdirSync(current, { withFileTypes: true })
        } catch (_error) {
            return
        }
        for (const entry of entries) {
            const path = join(current, entry.name)
            if (entry.isDirectory()) {
                if (entry.name !== 'cache' && entry.name !== 'node_modules') walk(path)
            } else if (entry.name.endsWith('.css')) out.push(path)
        }
    }
    walk(dir)
    return out.sort()
}

/**
 * Bước hậu kỳ (Turbopack): đổi tên mọi file `.css` đã xuất trong `distDir` theo bảng (idempotent: CSS PostCSS đã đổi
 * thì không đổi gì). Khi PostCSS không đổi tên (không có file đánh dấu), kiểm tra trùng tên ngắn như plugin webpack.
 * Trả về số file đã ghi lại.
 */
export const rewriteBuiltCss = (distDir: string, mapFile: string): number => {
    const loaded = loadShortClassTable(mapFile)
    if (!loaded || !Object.keys(loaded.table.map).length) return 0
    // Lưới an toàn: CSS đổi tên mà mã không (loader của `turbopack.rules` không chạy) thì trang hỏng hết — dừng build.
    if (!existsSync(loaderMarkerFile(mapFile))) {
        throw new Error('[presence-style] shortClassNames: loader của turbopack.rules không chạy trên file nào của dự án (cấu hình `turbopack.rules` bị ghi đè hoặc Next.js không hỗ trợ), CSS sẽ lệch tên với mã. Bỏ shortClassNames hoặc dùng `next build --webpack`.')
    }
    const checkCollisions = !existsSync(postcssMarkerFile(mapFile))
    let changed = 0
    for (const file of cssFilesUnder(distDir)) {
        const text = readFileSync(file, 'utf8')
        if (checkCollisions) {
            const collisions = findShortNameCollisions(text, loaded.table)
            if (collisions.length) throw new Error(`[presence-style] shortClassNames: ${file} có class trùng tên ngắn (${collisions.slice(0, 5).join(', ')}), CSS này không có trong bảng. Đặt shortClassNames.prefix (ví dụ 'x').`)
        }
        const next = loaded.rewriter.rewriteCss(text)
        if (next !== text) {
            writeFileSync(file, next)
            changed++
        }
    }
    return changed
}

/**
 * Luật `turbopack.rules` cho một phần mở rộng: loader chạy TRƯỚC loader của người dùng (cuối mảng), bỏ `node_modules`.
 * Không đặt `as`: kết quả vẫn là mã cùng loại; `as: '*.tsx'` đổi định danh module thành `page.tsx.tsx`, làm hỏng
 * import do Next.js sinh cho file `"use client"` (`Can't resolve './page.tsx.tsx'`, Next 16.4).
 */
const turbopackRule = (loader: { loader: string; options: { mapFile: string } }, existing: unknown, major: number): unknown => {
    if (existing === undefined) {
        // Next 16+: `condition`; Next 15: điều kiện lồng (`foreign: false` bỏ file của thư viện).
        return major >= 16 ? { loaders: [loader], condition: { not: 'foreign' } } : { foreign: false, default: { loaders: [loader] } }
    }
    // Đã có luật cho phần mở rộng này: thêm loader vào cuối (loader cuối mảng chạy đầu tiên, trên mã gốc).
    if (Array.isArray(existing)) {
        return existing.every((item) => typeof item === 'string' || (item && typeof item === 'object' && 'loader' in item))
            ? [...existing, loader]
            : existing.map((item) => (item && typeof item === 'object' && Array.isArray((item as { loaders?: unknown }).loaders) ? { ...item, loaders: [...(item as { loaders: unknown[] }).loaders, loader] } : item))
    }
    if (existing && typeof existing === 'object' && Array.isArray((existing as { loaders?: unknown }).loaders)) {
        return { ...existing, loaders: [...(existing as { loaders: unknown[] }).loaders, loader] }
    }
    return existing
}

/** Phần cấu hình Turbopack khi build production: dựng bảng, khai báo loader, bước hậu kỳ cho CSS. */
const turbopackBuild = (nextConfig: NextConfigObject, options: WithPresenceStyleOptions): NextConfigObject => {
    const turbopack = { ...(nextConfig.turbopack ?? {}) }
    const dir = resolve(nextCliCommand(process.argv)?.dir ?? process.cwd())
    const version = nextVersion(dir)
    if (version && (version[0] < 15 || (version[0] === 15 && version[1] < 5))) {
        console.warn(`[presence-style] shortClassNames với Turbopack cần Next.js 15.5+ (đang dùng ${version.join('.')}): bản build giữ nguyên tên class. Dùng webpack (\`next build\` không có --turbopack) hoặc nâng Next.js.`)
        return { ...nextConfig, turbopack }
    }
    const distDir = resolve(dir, nextConfig.distDir ?? '.next')
    // Next.js nạp cấu hình nhiều lần (cùng tiến trình, và ở tiến trình con biên dịch/dựng trang tĩnh — thư mục làm việc
    // có thể khác thư mục dự án): biến môi trường đã trỏ tới bảng có sẵn thì dùng lại, không dựng lại.
    const inherited = process.env[SHORT_CLASS_MAP_ENV]
    let mapFile = join(distDir, 'cache', 'presence-style', 'short-class-names.json')
    if (inherited && existsSync(inherited)) mapFile = inherited
    else {
        const before = existsSync(mapFile) ? readFileSync(mapFile, 'utf8') : ''
        buildShortClassTableSync(dir, mapFile, options)
        // Bảng đổi thì PostCSS và loader sẽ chạy lại và ghi lại file đánh dấu; bảng không đổi thì giữ (cache của Turbopack).
        if (readFileSync(mapFile, 'utf8') !== before) {
            rmSync(postcssMarkerFile(mapFile), { force: true })
            rmSync(loaderMarkerFile(mapFile), { force: true })
        }
    }
    // Plugin PostCSS và loader (tiến trình Node do Turbopack tạo) tìm bảng qua biến này.
    process.env[SHORT_CLASS_MAP_ENV] = mapFile
    const loader = { loader: join(__dirname, 'webpack-loader.cjs'), options: { mapFile } }
    const rules = { ...(turbopack.rules ?? {}) }
    const major = version?.[0] ?? 16
    for (const ext of TURBOPACK_EXTENSIONS) rules[`*.${ext}`] = turbopackRule(loader, rules[`*.${ext}`], major)
    if (rules['*.mdx'] !== undefined) rules['*.mdx'] = turbopackRule(loader, rules['*.mdx'], major)
    turbopack.rules = rules
    const userAfter = nextConfig.compiler?.runAfterProductionCompile
    const runAfterProductionCompile: AfterCompile = async (metadata) => {
        if (typeof userAfter === 'function') await userAfter(metadata)
        rewriteBuiltCss(metadata.distDir, mapFile)
    }
    return { ...nextConfig, turbopack, compiler: { ...(nextConfig.compiler ?? {}), runAfterProductionCompile } }
}

/**
 * Tiến trình con của `next build` (Next 15.5 biên dịch Turbopack trong worker: dòng lệnh không còn `build`, cấu hình
 * dạng object không nhận `phase`): tiến trình cha đã dựng bảng và đặt biến môi trường.
 */
const inheritedBuild = (phase?: string): boolean => {
    const mapFile = process.env[SHORT_CLASS_MAP_ENV]
    return phase === undefined && !process.env.NEXT_PHASE && !!mapFile && existsSync(mapFile)
}

const wrap = (nextConfig: NextConfigObject, options: WithPresenceStyleOptions, phase?: string): NextConfigObject => {
    if (!options.shortClassNames) return nextConfig
    const userWebpack = nextConfig.webpack
    const withWebpack: NextConfigObject = {
        ...nextConfig,
        webpack(config: NextWebpackConfig, context: NextWebpackContext) {
            const result = typeof userWebpack === 'function' ? userWebpack(config, context) : config
            if (!context.dev) {
                const mapFile = join(context.dir, context.config?.distDir ?? '.next', 'cache', 'presence-style', 'short-class-names.json')
                const plugin = new PresenceStyleWebpackPlugin({ ...options, root: context.dir, mapFile })
                ;(result.plugins ??= []).push(plugin as { apply(compiler: MinimalCompiler): void })
            }
            return result
        },
        // Luôn có khoá `turbopack`: Next 16 dừng build Turbopack mặc định khi chỉ thấy `webpack` mà không có `turbopack`.
        turbopack: nextConfig.turbopack ?? {},
    }
    return isTurbopack() && (isNextProductionBuild(phase) || inheritedBuild(phase)) ? turbopackBuild(withWebpack, options) : withWebpack
}

/**
 * Bọc cấu hình Next.js: rút gọn tên class khi build production (webpack: thêm plugin; Turbopack: dựng bảng lúc nạp
 * cấu hình, thêm `turbopack.rules` và bước hậu kỳ CSS). `nextConfig` có thể là object hoặc hàm `(phase, ctx) => config`.
 */
export function withPresenceStyle<T extends NextConfigInput>(nextConfig: T = {} as T, options: WithPresenceStyleOptions = {}): T {
    if (typeof nextConfig === 'function') {
        return (async (phase: string, context: unknown) => wrap(await nextConfig(phase, context), options, phase)) as unknown as T
    }
    return wrap(nextConfig as NextConfigObject, options) as T
}

export default withPresenceStyle
