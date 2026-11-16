/**
 * Plugin PostCSS thay `@tailwindcss/postcss`: đổi một dòng trong cấu hình là chạy.
 *
 *   // postcss.config.mjs (Next.js, Remix, Astro, Angular...)
 *   export default { plugins: { '@porbit/style/postcss': {} } }
 *
 * File CSS có `@import "tailwindcss"` (hoặc `@tailwind base/components/utilities`) được thay bằng CSS sinh từ
 * class trong mã nguồn: preflight, theme, `@utility`, `@custom-variant`, `@apply`, plugin đóng gói sẵn.
 * Nguồn quét: thư mục gốc dự án (bỏ node_modules, thư mục trong .gitignore), `@source "../x"`, `@source not`,
 * `@source inline("...")`, `@import "tailwindcss" source("../src")` / `source(none)`.
 * Không phụ thuộc gói `postcss` (dùng `postcss` do trình chạy truyền vào).
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { extractFromClasses, type ExtractOptions } from './extract'
import { scanFiles, type CandidateCacheEntry } from './scan'
import { addFromSnapshot, loadScanCache, type ScanCacheSnapshot, resolveScanCacheDir, scanCacheFile, scanCacheKey, scheduleScanCacheWrite } from './scan-cache'
import { collectFilesSync, createConfigLoader, createStylesheetReader } from './files'
import { resolveTailwindPlugin } from './tailwind-plugins'
import { TAILWIND_PLUGIN_CSS_PACKED } from './tailwind-plugins-generated'
import { createTailwindPluginLoader, parsePluginOptions } from './tailwind-plugin-api'
import { expandBraces, parseTailwindStylesheet, tailwindV4Dialect } from './tailwind-v4'
import { buildMergeTable } from './merge'
import { writeFileSync } from 'node:fs'
import type { XCSSDialect } from './core'
import { findShortNameCollisions, loadShortClassTable, markPostcssShortened, SHORT_CLASS_MAP_ENV } from './short-table'

/** Phương ngữ chặn: nhận mọi class còn lại là "của phương ngữ" nên engine không thử cú pháp x-css. */
const TAILWIND_ONLY: XCSSDialect = Object.assign(() => null, { owns: () => true })

/** `"xcss": true` trong presence-style.config.json ở `base`. */
const xcssFromConfigFile = (base: string): boolean => {
    try {
        return JSON.parse(readFileSync(join(base, 'presence-style.config.json'), 'utf8'))?.xcss === true
    } catch (_error) {
        return false
    }
}

export interface PresenceStylePostcssOptions extends Omit<ExtractOptions, 'dialects'> {
    /** Thư mục gốc để quét mã nguồn. Mặc định thư mục làm việc (`process.cwd()`). */
    base?: string
    /** Phần mở rộng file được quét. */
    extensions?: string[]
    /** Thu gọn CSS (bỏ `@property`/`@keyframes` không dùng). Mặc định true. */
    optimize?: boolean
    /**
     * Ghi bảng gộp class của dự án (JSON) cho `createMerge({ table })` của `@porbit/style/merge/lite`:
     * `cn()` đúng theo theme/@utility của dự án, ~1,5 KB code + bảng nhỏ. Đường dẫn tương đối với `base`.
     */
    mergeTable?: string
    /**
     * Sinh cả CSS cho class viết theo cú pháp x-css (`dF`, `p12`, `md:bgcRed`) bên cạnh class Tailwind. Mặc định
     * false: dự án dùng phương ngữ Tailwind chỉ nhận class Tailwind (và `@utility`/plugin của dự án) — token không
     * phải class (số trong `<path d="...">`, tên biến, chuỗi JSON) không thành rule rác. Không truyền thì đọc
     * `"xcss": true` trong presence-style.config.json ở thư mục gốc (`base`).
     */
    xcss?: boolean
    /**
     * Bộ nhớ đệm quét trên đĩa: ứng viên của từng file theo đường dẫn + mtime + kích thước, để build trong tiến trình
     * mới chỉ đọc lại file đã đổi. Mặc định bật, lưu ở `node_modules/.cache/presence-style/` của thư mục có
     * package.json gần nhất; `false` để tắt, chuỗi để đặt thư mục khác. Biến môi trường `PRESENCE_STYLE_CACHE=0`
     * cũng tắt.
     */
    scanCache?: boolean | string
    /**
     * Đổi tên class theo bảng rút gọn của lần build hiện tại (do plugin bundler `@porbit/style/webpack` hoặc
     * `withPresenceStyle` của `@porbit/style/next` dựng và trỏ tới qua biến môi trường). Không có bảng (dev,
     * Turbopack, bundler không bật rút gọn) thì không làm gì: CSS và mã luôn cùng tên.
     */
    shortClassNames?: boolean
}

export const POSTCSS_EXTENSIONS = ['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'mts', 'cts', 'vue', 'svelte', 'astro', 'mdx', 'md', 'php', 'erb', 'hbs', 'liquid', 'twig', 'njk']
const PLUGIN_NAME = '@porbit/style/postcss'
const TAILWIND_ENTRY = /@import\s+["']tailwindcss(?:\/[\w./-]+)?["']|@tailwind\s+(?:base|components|utilities)\b|@config\s+["']/

/** Mở rộng `{a,b}` và `{100..900..100}` như `@source inline()` của Tailwind (dùng chung với `@source not inline()`). */
export { expandBraces }

/** Đọc .gitignore gốc: tên thư mục/file và mẫu `*` đơn giản. Không có mẫu nào thì trả null (khỏi tính đường dẫn tương đối). */
const gitignoreMatcher = (baseDir: string): ((rel: string) => boolean) | null => {
    const file = join(baseDir, '.gitignore')
    if (!existsSync(file)) return null
    const patterns = readFileSync(file, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && !line.startsWith('!'))
    if (!patterns.length) return null
    const regexes = patterns.map((p) => {
        const anchored = p.startsWith('/')
        const body = p.replace(/^\//, '').replace(/\/$/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*')
        return new RegExp(anchored ? `^${body}(/|$)` : `(^|/)${body}(/|$)`)
    })
    return (rel) => regexes.some((re) => re.test(rel))
}

// Bộ nhớ đệm theo mtime + kích thước: chế độ watch chỉ đọc lại file đã đổi.
const candidateCache = new Map<string, CandidateCacheEntry>()
// File đệm trên đĩa đã nạp trong tiến trình này: file -> khoá, số file đã ghi trong file đệm.
const diskCaches = new Map<string, { key: string; count: number; snapshot: ScanCacheSnapshot | null }>()

export interface CompiledTailwindCss {
    css: string
    /** Thư mục đã quét (cho chế độ watch). */
    directories: string[]
    /** File CSS đã đọc qua `@import`. */
    imports: string[]
    candidates: number
    /**
     * Thời gian từng pha (ms): đọc CSS/plugin, liệt kê file, đọc + trích ứng viên (gồm nạp bộ nhớ đệm trên đĩa), sinh
     * CSS; số luồng phụ đã dùng để trích; số file phải đọc + quét (còn lại lấy từ bộ nhớ đệm).
     */
    timings: { setup: number; scan: number; extract: number; generate: number; workers: number; scanned: number }
}

/** Biên dịch một file CSS kiểu Tailwind v4 (dùng chung cho plugin PostCSS và công cụ khác). */
export const compileTailwindCss = async (css: string, options: PresenceStylePostcssOptions & { from?: string } = {}): Promise<CompiledTailwindCss> => {
    const { base = process.cwd(), extensions = POSTCSS_EXTENSIONS, optimize = true, from, safelist = [], mergeTable, shortClassNames: _short, xcss, scanCache, ...rest } = options
    const t0 = performance.now()
    const cssDir = from ? dirname(from) : base
    const imports: string[] = []
    const reader = createStylesheetReader(cssDir)
    const read = (id: string) => {
        const content = reader(id)
        if (content !== null && (id.startsWith('.') || isAbsolute(id))) imports.push(resolve(cssDir, id))
        return content
    }
    // Plugin JS không có bản đóng gói (`@plugin "tailwind-scrollbar"`, plugin trong tailwind.config.js): chạy qua
    // API giả lập; `theme()` của plugin thấy `@theme` của file CSS (đọc lười, chỉ khi có plugin JS).
    // `@plugin "x" { opt: v; }`: tách tuỳ chọn ra, phần còn lại đọc như `@plugin "x";`.
    const pluginOptions = new Map<string, Record<string, unknown>>()
    const source = css.replace(/@plugin\s+(["'])([^"']+)\1\s*\{([^{}]*)\}/g, (_m, _q, id: string, body: string) => {
        pluginOptions.set(id, parsePluginOptions(body))
        return `@plugin "${id}";`
    })
    const jsPlugins = createTailwindPluginLoader(cssDir, { theme: () => parseTailwindStylesheet(source, { resolve: (id) => (/\.[cm]?[jt]s$/.test(id) ? null : reader(id) ?? resolveTailwindPlugin(id)) }).theme })
    const loadConfig = createConfigLoader(cssDir, jsPlugins)
    const sheet = jsPlugins.apply(parseTailwindStylesheet(source, {
        resolve: (id) => {
            // `@plugin "./plugin.js"` (file JS không đọc như CSS) và plugin có tuỳ chọn: luôn chạy bản JS.
            if (/\.[cm]?[jt]s$/.test(id) || pluginOptions.has(id)) return jsPlugins.resolve(id, pluginOptions.get(id))
            const css = read(id) ?? (Object.hasOwn(TAILWIND_PLUGIN_CSS_PACKED, id) ? resolveTailwindPlugin(id) : null)
            if (css != null || id.endsWith('.css')) return css ?? null
            // Bí danh (`tailwindcss-animate` -> tw-animate-css, khác giá trị): bản JS của dự án nếu có cài, rồi mới bản đóng gói.
            return jsPlugins.resolve(id) ?? resolveTailwindPlugin(id)
        },
        loadConfig: (id) => {
            imports.push(resolve(cssDir, id))
            return loadConfig(id)
        },
    }))
    imports.push(...jsPlugins.files)

    // Nguồn quét.
    const sourceOption = css.match(/@import\s+["']tailwindcss["'][^;]*\bsource\(\s*(none|["']([^"']+)["'])\s*\)/)
    const roots: string[] = sourceOption ? (sourceOption[1] === 'none' ? [] : [resolve(cssDir, sourceOption[2])]) : [resolve(base)]
    const excluded: string[] = []
    const inline: string[] = []
    for (const m of css.matchAll(/@source\s+(not\s+)?(?:inline\(\s*(["'])(.*?)\2\s*\)|(["'])(.*?)\4)\s*;/g)) {
        const negated = !!m[1]
        if (m[3] !== undefined) {
            if (!negated) inline.push(...m[3].split(/\s+/).filter(Boolean).flatMap(expandBraces))
            continue
        }
        const target = resolve(cssDir, m[5].replace(/\/\*\*.*$/, '').replace(/\/\*.*$/, ''))
        ;(negated ? excluded : roots).push(target)
    }
    const t1 = performance.now()
    const files = new Set<string>()
    for (const dir of roots) {
        const ignored = gitignoreMatcher(dir)
        // File liệt kê từ `dir` luôn bắt đầu bằng `dir` + dấu phân cách: cắt chuỗi thay cho path.relative (chậm).
        const prefix = dir.endsWith(sep) ? dir : dir + sep
        for (const file of collectFilesSync(dir, extensions)) {
            if (ignored) {
                const rel = file.startsWith(prefix) ? file.slice(prefix.length) : relative(dir, file)
                if (ignored(sep === '/' ? rel : rel.split(sep).join('/'))) continue
            }
            if (excluded.length && excluded.some((ex) => file === ex || file.startsWith(ex + sep))) continue
            files.add(file)
        }
    }
    const t2 = performance.now()
    const candidates = new Set<string>(inline)
    const fileList = [...files]
    // Bộ nhớ đệm trên đĩa: nạp một lần mỗi tiến trình (sau đó bộ nhớ đệm trong tiến trình mới hơn).
    const cacheDir = resolveScanCacheDir(scanCache, resolve(base))
    const cacheFile = cacheDir ? scanCacheFile(cacheDir, from ? resolve(from) : resolve(base)) : null
    const cacheKey = cacheFile ? scanCacheKey({ css, from: from ? resolve(from) : null, base: resolve(base), extensions }) : ''
    let disk = cacheFile ? diskCaches.get(cacheFile) : undefined
    let workers = 0
    let scanned = 0
    if (cacheFile && disk?.key !== cacheKey) {
        const snapshot = loadScanCache(cacheFile, cacheKey, candidateCache)
        disk = { key: cacheKey, count: snapshot ? snapshot.files.length : -1, snapshot }
        diskCaches.set(cacheFile, disk)
    }
    // Không file nào đổi từ lần ghi: lấy thẳng tập ứng viên đã lưu (mục bộ nhớ đệm vẫn là mục nạp từ đĩa).
    const done = !!disk?.snapshot && addFromSnapshot(disk.snapshot, fileList, candidateCache, candidates)
    if (disk && !done) disk.snapshot = null
    if (!done) ({ workers, scanned } = await scanFiles(fileList, candidateCache, candidates))
    if (cacheFile && disk && (scanned > 0 || disk.count !== fileList.length)) {
        scheduleScanCacheWrite(cacheFile, cacheKey, fileList, candidateCache)
        disk.count = fileList.length
    }
    const t3 = performance.now()

    const preflight = /@import\s+["']tailwindcss(?:\/preflight(?:\.css)?)?["']|@tailwind\s+base\b/.test(css)
    const dialect = tailwindV4Dialect({ preflight, theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, variantOrder: sheet.variantOrder, css: sheet.css, prefix: sheet.prefix, important: sheet.important, blocklist: sheet.blocklist })
    const withXcss = xcss ?? xcssFromConfigFile(resolve(base))
    const result = await extractFromClasses([...candidates], { ...rest, safelist, hashClassName: false, silent: true, minify: optimize, dialects: withXcss ? [dialect] : [dialect, TAILWIND_ONLY] })
    if (mergeTable) {
        const target = resolve(base, mergeTable)
        const json = JSON.stringify(buildMergeTable(result.matchedClasses, dialect)) + '\n'
        let previous = ''
        try {
            previous = readFileSync(target, 'utf8')
        } catch (_error) {
            previous = ''
        }
        // Chỉ ghi khi đổi: tránh vòng lặp watch.
        if (previous !== json) writeFileSync(target, json)
    }
    const t4 = performance.now()
    const timings = { setup: t1 - t0, scan: t2 - t1, extract: t3 - t2, generate: t4 - t3, workers, scanned }
    return { css: result.css, directories: roots, imports, candidates: candidates.size, timings }
}

interface MinimalRoot {
    toString(): string
    removeAll(): void
    append(node: unknown): void
}
interface MinimalHelpers {
    result: { opts: { from?: string }; messages: unknown[] }
    postcss: { parse: (css: string, options?: { from?: string }) => unknown }
}

/** Bảng rút gọn đang dùng (file do plugin bundler ghi, trỏ tới qua biến môi trường); null khi không có. */
const activeShortTable = () => {
    const mapFile = process.env[SHORT_CLASS_MAP_ENV]
    if (!mapFile) return null
    const loaded = loadShortClassTable(mapFile)
    return loaded && Object.keys(loaded.table.map).length ? { mapFile, ...loaded } : null
}

const presenceStylePostcss = (options: PresenceStylePostcssOptions = {}) => ({
    postcssPlugin: PLUGIN_NAME,
    async Once(root: MinimalRoot, { result, postcss }: MinimalHelpers) {
        let css = root.toString()
        const from = result.opts.from
        const short = options.shortClassNames ? activeShortTable() : null
        const entry = TAILWIND_ENTRY.test(css)
        if (!entry) {
            if (!short) return
        } else {
            const compiled = await compileTailwindCss(css, { ...options, from })
            css = compiled.css
            const extensions = options.extensions ?? POSTCSS_EXTENSIONS
            for (const dir of compiled.directories) {
                result.messages.push({ type: 'dir-dependency', plugin: PLUGIN_NAME, dir, glob: `**/*.{${extensions.join(',')}}`, parent: from })
            }
            for (const file of compiled.imports) result.messages.push({ type: 'dependency', plugin: PLUGIN_NAME, file, parent: from })
        }
        if (short) {
            // CSS ngoài bảng (thư viện) có class trùng tên ngắn: đổi tên sẽ gắn nhầm style, dừng build.
            const collisions = findShortNameCollisions(css, short.table)
            if (collisions.length) {
                throw new Error(`[presence-style] shortClassNames: ${from ?? 'CSS'} có class trùng tên ngắn (${collisions.slice(0, 5).join(', ')}). Đặt shortClassNames.prefix (ví dụ 'x').`)
            }
            const next = short.rewriter.rewriteCss(css)
            markPostcssShortened()
            result.messages.push({ type: 'dependency', plugin: PLUGIN_NAME, file: short.mapFile, parent: from })
            if (next === css && !entry) return
            css = next
        }
        root.removeAll()
        root.append(postcss.parse(css, { from }))
    },
})
presenceStylePostcss.postcss = true

export default presenceStylePostcss

export { createConfigLoader, createStylesheetReader } from './files'
export { tailwindConfigToCss } from './tailwind-config'
export { applyTailwindPluginOutput, createTailwindPluginLoader, parsePluginOptions, requireWithTailwindShims, runTailwindPlugin } from './tailwind-plugin-api'
