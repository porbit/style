/**
 * Plugin Vite cho @porbit/style: sinh CSS tĩnh từ mã nguồn ở cả dev server lẫn build.
 *
 *   // vite.config.js
 *   import presenceStyle from '@porbit/style/vite'
 *   export default { plugins: [presenceStyle()] }
 *
 *   // main.js
 *   import 'virtual:presence-style.css'
 *   import manifest from 'virtual:presence-style-manifest'
 *   xcss.cssObserve(document, { hashClassName: false, preload: manifest })
 *   import { cn } from 'virtual:presence-style-merge'   // gộp class xung đột, bảng theo class của dự án
 *
 * Không phụ thuộc gói `vite` lúc chạy; kiểu được khai báo tối giản để không bắt buộc cài.
 */
import { readFile } from 'node:fs/promises'
import { extname, isAbsolute, relative, resolve } from 'node:path'
import { collectFiles, DEFAULT_EXTENSIONS } from './files'
import { getComponentClasses } from './components'
import { createPreloadManifest, extractCandidates, extractFromClasses, type ExtractOptions, type PreloadManifest } from './extract'
import { buildMergeTable, type MergeTable } from './merge'

export interface PresenceStyleViteOptions extends ExtractOptions {
    /** Thư mục/file cần quét, tương đối với root của Vite. Mặc định `['src', 'index.html']`. */
    include?: string[]
    /** Phần mở rộng cần quét. */
    extensions?: string[]
    /**
     * Đưa mọi class của `@porbit/style/components` vào CSS tĩnh (class do recipe sinh trong
     * JS không quét được từ mã nguồn). Bật khi dùng bộ component mẫu.
     */
    components?: boolean
}

export const VIRTUAL_CSS_ID = 'virtual:presence-style.css'
export const VIRTUAL_MANIFEST_ID = 'virtual:presence-style-manifest'
/** `cn()`/`twMerge()` với bảng gộp sinh từ class của dự án (cần một phương ngữ, ví dụ `tailwindV4Dialect()`). */
export const VIRTUAL_MERGE_ID = 'virtual:presence-style-merge'
const RESOLVED_CSS_ID = '\0' + VIRTUAL_CSS_ID
const RESOLVED_MANIFEST_ID = '\0' + VIRTUAL_MANIFEST_ID
const RESOLVED_MERGE_ID = '\0' + VIRTUAL_MERGE_ID

interface MinimalModule {
    id: string | null
}
interface MinimalServer {
    moduleGraph: {
        getModuleById(id: string): MinimalModule | undefined
        invalidateModule(mod: MinimalModule): void
    }
}

export default function presenceStyle(options: PresenceStyleViteOptions = {}) {
    const { include = ['src', 'index.html'], extensions = DEFAULT_EXTENSIONS, components = false, ...extractOptions } = options
    if (components) {
        extractOptions.safelist = [...(extractOptions.safelist || []), ...getComponentClasses()]
    }
    // CSS tĩnh dùng tên class nguồn để khớp với HTML/JSX; người dùng có thể bật lại hash.
    // minify mặc định bật: bỏ @property/@keyframes không dùng, gộp @layer.
    const engineOptions: ExtractOptions = { silent: true, hashClassName: false, minify: true, ...extractOptions }
    let root = process.cwd()
    let server: MinimalServer | null = null
    const fileCandidates = new Map<string, string[]>()
    let scanned = false
    let output: Promise<{ css: string; manifest: PreloadManifest; table: MergeTable }> | null = null

    const isTracked = (file: string): boolean => {
        const ext = extname(file).slice(1).toLowerCase()
        if (!extensions.includes(ext)) return false
        return include.some((entry) => {
            const rel = relative(resolve(root, entry), file)
            return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
        })
    }

    const scanFile = async (file: string) => {
        const source = await readFile(file, 'utf8').catch(() => null)
        if (source === null) fileCandidates.delete(file)
        else fileCandidates.set(file, extractCandidates(source))
    }

    const generate = () => {
        if (output) return output
        output = (async () => {
            if (!scanned) {
                for (const entry of include) {
                    for (const file of await collectFiles(resolve(root, entry), extensions)) await scanFile(file)
                }
                scanned = true
            }
            const all = new Set<string>()
            fileCandidates.forEach((list) => list.forEach((c) => all.add(c)))
            const result = await extractFromClasses([...all], engineOptions)
            return {
                css: result.css,
                manifest: createPreloadManifest(result, { hashClassName: engineOptions.hashClassName }),
                table: buildMergeTable(result.matchedClasses, engineOptions.dialects?.[0]),
            }
        })()
        return output
    }

    return {
        name: 'presence-style',
        enforce: 'pre' as const,
        configResolved(config: { root: string }) {
            root = config.root
        },
        configureServer(devServer: MinimalServer) {
            server = devServer
        },
        resolveId(id: string) {
            if (id === VIRTUAL_CSS_ID) return RESOLVED_CSS_ID
            if (id === VIRTUAL_MANIFEST_ID) return RESOLVED_MANIFEST_ID
            if (id === VIRTUAL_MERGE_ID) return RESOLVED_MERGE_ID
            return null
        },
        async load(id: string) {
            if (id === RESOLVED_CSS_ID) return (await generate()).css
            if (id === RESOLVED_MANIFEST_ID) return `export default ${JSON.stringify((await generate()).manifest)}`
            if (id === RESOLVED_MERGE_ID) {
                return `import { clsx, createMerge } from '@porbit/style/merge/lite'\nexport const table = ${JSON.stringify((await generate()).table)}\nexport const twMerge = createMerge({ table })\nexport const cn = (...inputs) => twMerge(clsx(...inputs))\nexport default cn\n`
            }
            return null
        },
        async handleHotUpdate(ctx: { file: string; modules: MinimalModule[] }) {
            if (!isTracked(ctx.file)) return
            const before = (fileCandidates.get(ctx.file) || []).join(' ')
            await scanFile(ctx.file)
            if ((fileCandidates.get(ctx.file) || []).join(' ') === before) return
            output = null
            const mods = [RESOLVED_CSS_ID, RESOLVED_MANIFEST_ID, RESOLVED_MERGE_ID]
                .map((id) => server?.moduleGraph.getModuleById(id))
                .filter((mod): mod is MinimalModule => !!mod)
            mods.forEach((mod) => server?.moduleGraph.invalidateModule(mod))
            return [...ctx.modules, ...mods]
        },
    }
}

export { presenceStyle }
