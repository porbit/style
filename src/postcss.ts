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
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { extractCandidates, extractFromClasses, type ExtractOptions } from './extract'
import { collectFilesSync, createConfigLoader, createStylesheetReader } from './files'
import { resolveTailwindPlugin } from './tailwind-plugins'
import { TAILWIND_PLUGIN_CSS } from './tailwind-plugins-generated'
import { createTailwindPluginLoader, parsePluginOptions } from './tailwind-plugin-api'
import { expandBraces, parseTailwindStylesheet, tailwindV4Dialect } from './tailwind-v4'
import { buildMergeTable } from './merge'
import { writeFileSync } from 'node:fs'

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
}

export const POSTCSS_EXTENSIONS = ['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'mts', 'cts', 'vue', 'svelte', 'astro', 'mdx', 'md', 'php', 'erb', 'hbs', 'liquid', 'twig', 'njk']
const PLUGIN_NAME = '@porbit/style/postcss'
const TAILWIND_ENTRY = /@import\s+["']tailwindcss(?:\/[\w./-]+)?["']|@tailwind\s+(?:base|components|utilities)\b|@config\s+["']/

/** Mở rộng `{a,b}` và `{100..900..100}` như `@source inline()` của Tailwind (dùng chung với `@source not inline()`). */
export { expandBraces }

/** Đọc .gitignore gốc: tên thư mục/file và mẫu `*` đơn giản. */
const gitignoreMatcher = (baseDir: string): ((rel: string) => boolean) => {
    const file = join(baseDir, '.gitignore')
    if (!existsSync(file)) return () => false
    const patterns = readFileSync(file, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && !line.startsWith('!'))
    const regexes = patterns.map((p) => {
        const anchored = p.startsWith('/')
        const body = p.replace(/^\//, '').replace(/\/$/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*')
        return new RegExp(anchored ? `^${body}(/|$)` : `(^|/)${body}(/|$)`)
    })
    return (rel) => regexes.some((re) => re.test(rel))
}

// Bộ nhớ đệm theo mtime: chế độ watch chỉ đọc lại file đã đổi.
const candidateCache = new Map<string, { mtime: number; candidates: string[] }>()
const candidatesOf = (file: string): string[] => {
    let mtime = 0
    try {
        mtime = statSync(file).mtimeMs
    } catch (_error) {
        return []
    }
    const cached = candidateCache.get(file)
    if (cached && cached.mtime === mtime) return cached.candidates
    let candidates: string[] = []
    try {
        candidates = extractCandidates(readFileSync(file, 'utf8'))
    } catch (_error) {
        candidates = []
    }
    candidateCache.set(file, { mtime, candidates })
    return candidates
}

export interface CompiledTailwindCss {
    css: string
    /** Thư mục đã quét (cho chế độ watch). */
    directories: string[]
    /** File CSS đã đọc qua `@import`. */
    imports: string[]
    candidates: number
}

/** Biên dịch một file CSS kiểu Tailwind v4 (dùng chung cho plugin PostCSS và công cụ khác). */
export const compileTailwindCss = async (css: string, options: PresenceStylePostcssOptions & { from?: string } = {}): Promise<CompiledTailwindCss> => {
    const { base = process.cwd(), extensions = POSTCSS_EXTENSIONS, optimize = true, from, safelist = [], mergeTable, ...rest } = options
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
            const css = read(id) ?? (Object.hasOwn(TAILWIND_PLUGIN_CSS, id) ? TAILWIND_PLUGIN_CSS[id] : null)
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
    const files = new Set<string>()
    for (const dir of roots) {
        const ignored = gitignoreMatcher(dir)
        for (const file of collectFilesSync(dir, extensions)) {
            const rel = relative(dir, file).split(sep).join('/')
            if (ignored(rel) || excluded.some((ex) => file === ex || file.startsWith(ex + sep))) continue
            files.add(file)
        }
    }
    const candidates = new Set<string>(inline)
    for (const file of files) for (const candidate of candidatesOf(file)) candidates.add(candidate)

    const preflight = /@import\s+["']tailwindcss(?:\/preflight(?:\.css)?)?["']|@tailwind\s+base\b/.test(css)
    const dialect = tailwindV4Dialect({ preflight, theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, css: sheet.css, prefix: sheet.prefix, important: sheet.important, blocklist: sheet.blocklist })
    const result = await extractFromClasses([...candidates], { ...rest, safelist, hashClassName: false, silent: true, minify: optimize, dialects: [dialect] })
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
    return { css: result.css, directories: roots, imports, candidates: candidates.size }
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

const presenceStylePostcss = (options: PresenceStylePostcssOptions = {}) => ({
    postcssPlugin: PLUGIN_NAME,
    async Once(root: MinimalRoot, { result, postcss }: MinimalHelpers) {
        const css = root.toString()
        if (!TAILWIND_ENTRY.test(css)) return
        const from = result.opts.from
        const compiled = await compileTailwindCss(css, { ...options, from })
        root.removeAll()
        root.append(postcss.parse(compiled.css, { from }))
        const extensions = options.extensions ?? POSTCSS_EXTENSIONS
        for (const dir of compiled.directories) {
            result.messages.push({ type: 'dir-dependency', plugin: PLUGIN_NAME, dir, glob: `**/*.{${extensions.join(',')}}`, parent: from })
        }
        for (const file of compiled.imports) result.messages.push({ type: 'dependency', plugin: PLUGIN_NAME, file, parent: from })
    },
})
presenceStylePostcss.postcss = true

export default presenceStylePostcss

export { createConfigLoader, createStylesheetReader } from './files'
export { tailwindConfigToCss } from './tailwind-config'
export { applyTailwindPluginOutput, createTailwindPluginLoader, parsePluginOptions, requireWithTailwindShims, runTailwindPlugin } from './tailwind-plugin-api'
