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
 *
 * `shortClassNames: true` (chỉ khi `vite build`): đổi tên class thành tên ngắn trong CSS và trong mã nguồn được quét
 * (xem `src/shorten.ts` và docs/guides/tailwind.md, mục "Rút gọn tên class").
 */
import { readFile } from 'node:fs/promises'
import { extname, isAbsolute, relative, resolve } from 'node:path'
import { collectFiles, DEFAULT_EXTENSIONS } from './files'
import { createShortClassNames, type ShortClassNames, type ShortClassNamesOptions } from './shorten'
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
    /**
     * Rút gọn tên class lúc `vite build` (opt-in): `true` hoặc `{ exclude, prefix, functions }`. Chỉ class mà mọi lần
     * xuất hiện trong file được quét (`include`) đều nằm trong chuỗi class nhận diện chắc chắn mới được đổi tên, đồng
     * thời trong CSS ảo, file CSS dưới `include` và mọi file CSS của bundle.
     */
    shortClassNames?: boolean | ShortClassNamesOptions
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
    const { include = ['src', 'index.html'], extensions = DEFAULT_EXTENSIONS, components = false, shortClassNames, ...extractOptions } = options
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
    let isBuild = false
    let shortener: Promise<ShortClassNames> | null = null
    const warned = new Set<string>()

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

    const cleanId = (id: string) => id.split('?')[0]

    // Bảng rút gọn: CSS ảo + file CSS dưới `include` (file Tailwind `@import "tailwindcss"` được biên dịch như plugin
    // PostCSS để biết class nào có CSS) + toàn bộ file được quét. Tạo một lần cho mỗi lần build.
    const getShortener = () => {
        if (shortener) return shortener
        shortener = (async () => {
            const { css } = await generate()
            const sheets = [css]
            const { compileTailwindCss } = await import('./postcss')
            for (const entry of include) {
                for (const file of await collectFiles(resolve(root, entry), ['css'])) {
                    const text = await readFile(file, 'utf8').catch(() => '')
                    if (/@import\s+["']tailwindcss|@tailwind\s+(?:base|components|utilities)\b|@config\s+["']/.test(text)) {
                        sheets.push((await compileTailwindCss(text, { base: root, from: file })).css)
                    } else sheets.push(text)
                }
            }
            const sources: string[] = []
            for (const file of fileCandidates.keys()) sources.push(await readFile(file, 'utf8').catch(() => ''))
            return createShortClassNames({ css: sheets, sources, ...(typeof shortClassNames === 'object' ? shortClassNames : {}) })
        })()
        return shortener
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
        configResolved(config: { root: string; command?: string }) {
            root = config.root
            isBuild = config.command === 'build'
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
            if (id === RESOLVED_CSS_ID) {
                const { css } = await generate()
                return shortClassNames && isBuild ? (await getShortener()).rewriteCss(css) : css
            }
            if (id === RESOLVED_MANIFEST_ID) return `export default ${JSON.stringify((await generate()).manifest)}`
            if (id === RESOLVED_MERGE_ID) {
                return `import { clsx, createMerge } from '@porbit/style/merge/lite'\nexport const table = ${JSON.stringify((await generate()).table)}\nexport const twMerge = createMerge({ table })\nexport const cn = (...inputs) => twMerge(clsx(...inputs))\nexport default cn\n`
            }
            return null
        },
        // Rút gọn tên class trong mã: chỉ file được quét (đã phân tích); file khác chỉ được kiểm tra để cảnh báo.
        async transform(code: string, id: string) {
            if (!shortClassNames || !isBuild || id.startsWith('\0')) return null
            const file = cleanId(id)
            if (file !== id) return null
            const short = await getShortener()
            if (isTracked(file)) {
                const next = short.rewriteSourceWithMap(code, file)
                return next.map ? next : null
            }
            if (/\.(?:[cm]?[jt]sx?|vue|svelte|astro|html?)$/.test(file) && !warned.has(file)) {
                // Thư viện/file ngoài `include` dùng class đã đổi tên trong chuỗi nhiều class: gần như chắc chắn là class.
                const used = new Set<string>()
                for (const m of code.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.){3,})\1/g)) {
                    const hits = m[2].split(/\s+/).filter((token) => short.map.has(token))
                    if (hits.length >= 2) hits.forEach((token) => used.add(token))
                    if (used.size >= 5) break
                }
                if (used.size) {
                    warned.add(file)
                    const where = relative(root, file) || file
                    ;(this as { warn?: (message: string) => void } | undefined)?.warn?.(
                        `[presence-style] shortClassNames: ${where} (ngoài include) có vẻ dùng class đã đổi tên: ${[...used].slice(0, 5).join(', ')}. Thêm file vào include hoặc vào shortClassNames.exclude.`,
                    )
                }
            }
            return null
        },
        transformIndexHtml: {
            order: 'pre' as const,
            async handler(html: string, ctx: { filename: string }) {
                if (!shortClassNames || !isBuild) return html
                return isTracked(ctx.filename) ? (await getShortener()).rewriteSource(html) : html
            },
        },
        // CSS khác trong bundle (file CSS của dự án, CSS do PostCSS/Tailwind sinh, `<style>` của SFC): đổi cùng bảng.
        async generateBundle(_options: unknown, bundle: Record<string, { type: string; fileName: string; source?: string | Uint8Array }>) {
            if (!shortClassNames || !isBuild || !shortener) return
            const short = await shortener
            for (const asset of Object.values(bundle)) {
                if (asset.type !== 'asset' || !asset.fileName.endsWith('.css')) continue
                const text = typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source)
                asset.source = short.rewriteCss(text)
            }
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
