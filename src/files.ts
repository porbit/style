/** Liệt kê file nguồn cho CLI và MCP server. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname as dirnamePath, join, join as joinPath, resolve, resolve as resolvePath, sep } from 'node:path'
import { loadTailwindConfigFile, mergeTailwindConfigs, tailwindConfigToCss } from './tailwind-config'
import { createTailwindPluginLoader, requireWithTailwindShims, type TailwindPluginLoader } from './tailwind-plugin-api'

export const DEFAULT_EXTENSIONS = ['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte', 'astro', 'mdx']
// Thư mục không bao giờ cần quét: artifact build và phụ thuộc.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.output', 'target'])

/**
 * Liệt kê file cần quét từ một đường dẫn (file hoặc thư mục, đệ quy).
 * Dùng I/O đồng bộ: với hàng nghìn file, `await` tuần tự từng readdir/stat chậm hơn ~4 lần.
 */
export const collectFilesSync = (target: string, extensions: string[]): string[] => {
    const absolute = resolve(target)
    let info
    try {
        info = statSync(absolute)
    } catch (_error) {
        return []
    }
    if (info.isFile()) return [absolute]
    if (!info.isDirectory()) return []

    const files: string[] = []
    const wanted = new Set(extensions)
    const walk = (dir: string) => {
        // Nối chuỗi thay cho path.join (join chuẩn hoá lại cả đường dẫn ở mỗi file; tên từ readdir không có dấu phân cách).
        const prefix = dir.endsWith(sep) ? dir : dir + sep
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const name = entry.name
            if (name.startsWith('.')) continue
            const full = prefix + name
            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(name)) walk(full)
                continue
            }
            const dot = name.lastIndexOf('.')
            if (dot !== -1 && wanted.has(name.slice(dot + 1).toLowerCase())) files.push(full)
        }
    }
    walk(absolute)
    return files
}

export const collectFiles = async (target: string, extensions: string[]): Promise<string[]> => collectFilesSync(target, extensions)

/**
 * Đọc stylesheet cho `resolveConfigFile({ tailwindCss })`: đường dẫn tương đối với `baseDir`,
 * hoặc gói trong node_modules (trường `style`/`main` là .css, hoặc `gói/đường/dẫn.css`).
 */
export const createStylesheetReader = (baseDir: string) => (id: string): string | null => {
    const tryRead = (file: string) => {
        try {
            return readFileSync(file, 'utf8')
        } catch (_error) {
            return null
        }
    }
    if (id.startsWith('.') || id.startsWith('/') || /^[A-Za-z]:[\\/]/.test(id)) return tryRead(resolvePath(baseDir, id))
    // `src/app.css`: thử đường dẫn tương đối trước, sau đó mới coi là gói.
    if (id.endsWith('.css')) {
        const local = tryRead(resolvePath(baseDir, id))
        if (local !== null) return local
    }
    for (let dir = resolvePath(baseDir); ; dir = dirnamePath(dir)) {
        const pkgDir = joinPath(dir, 'node_modules', ...id.split('/').slice(0, id.startsWith('@') ? 2 : 1))
        const rest = id.split('/').slice(id.startsWith('@') ? 2 : 1).join('/')
        if (rest) {
            const direct = tryRead(joinPath(pkgDir, rest))
            if (direct !== null) return direct
        } else {
            const pkg = tryRead(joinPath(pkgDir, 'package.json'))
            if (pkg !== null) {
                try {
                    const json = JSON.parse(pkg)
                    const entry = [json.style, json.exports?.['.']?.style, json.main].find((f) => typeof f === 'string' && f.endsWith('.css'))
                    if (entry) return tryRead(joinPath(pkgDir, entry))
                } catch (_error) {
                    // package.json hỏng: bỏ qua
                }
                return null
            }
        }
        if (dirnamePath(dir) === dir) return null
    }
}

// Plugin v3 hay gặp: gói có bản đóng gói sẵn, hoặc đã có sẵn trong Tailwind v4 (không cần dòng @plugin: biến thể
// `@md`, `@[300px]`, `@sm/main` và utility `@container/main` của Tailwind v4 cho cùng kết quả với plugin v3).
// `@tailwindcss/aspect-ratio` KHÔNG thuộc nhóm này: Tailwind v4 vẫn chạy plugin (sinh `aspect-w-*`/`aspect-h-*` và thay
// `theme.aspectRatio` nên `aspect-video` mất), nên chạy qua API giả lập như plugin khác.
const KNOWN_PLUGINS = ['@tailwindcss/forms', '@tailwindcss/typography', 'tailwindcss-animate', '@tailwindcss/container-queries']
const BUILTIN_IN_V4 = new Set(['@tailwindcss/container-queries'])

/**
 * Nạp `@config "./tailwind.config.js"` (Node): `require` file cấu hình (CJS hoặc ESM) rồi đổi sang CSS v4.
 * Plugin quen thuộc được nhận ra bằng cách so trùng với chính các gói đó cài trong dự án (dùng bản đóng gói sẵn);
 * plugin khác chạy qua API giả lập (`tailwind-plugin-api`). Truyền `plugins` (bộ nạp dùng chung với `@plugin`)
 * rồi gọi `plugins.apply(sheet)` để giữ cả utility có tên không viết được bằng CSS (`x-0.5`, `x-1/2`).
 */
export const createConfigLoader = (baseDir: string, plugins: TailwindPluginLoader = createTailwindPluginLoader(baseDir)) => (id: string): string | null => {
    const file = resolvePath(baseDir, id)
    try {
        const req = createRequire(joinPath(baseDir, 'noop.js'))
        delete req.cache[file]
        // `tailwindcss/plugin`, `tailwindcss/colors`... trong cấu hình/plugin: dùng bản thay nếu dự án không cài tailwindcss.
        // Cấu hình `.ts`/`.mts` nạp được cả trên Node chưa chạy thẳng TypeScript (bỏ kiểu rồi chạy).
        const config = loadTailwindConfigFile(file, (id: string) => requireWithTailwindShims(baseDir, id)) as Record<string, any>
        const knownPlugins: Record<string, unknown> = {}
        for (const name of KNOWN_PLUGINS) {
            try {
                knownPlugins[name] = requireWithTailwindShims(baseDir, name)
            } catch (_error) {
                // gói không cài: bỏ qua
            }
        }
        const { css } = tailwindConfigToCss(config, { knownPlugins })
        const lines = css.split('\n').filter((line) => !BUILTIN_IN_V4.has(line.match(/^@plugin "([^"]+)";$/)?.[1] || ''))
        // Plugin không có bản đóng gói: chạy hàm plugin với theme/cấu hình của dự án.
        const known = Object.values(knownPlugins)
        // `presets`: plugin của preset chạy trước, theme/darkMode... gộp như Tailwind.
        const cfg = mergeTailwindConfigs(config)
        for (const plugin of cfg.plugins || []) {
            if (known.some((value) => value === plugin || (value as { default?: unknown })?.default === plugin)) continue
            lines.push(plugins.run(plugin, cfg, id))
        }
        return lines.join('\n')
    } catch (_error) {
        return null
    }
}
