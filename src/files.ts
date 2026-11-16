/** Liệt kê file nguồn cho CLI và MCP server. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname as dirnamePath, join, join as joinPath, resolve, resolve as resolvePath } from 'node:path'
import { tailwindConfigToCss } from './tailwind-config'

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
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.name.startsWith('.')) continue
            const full = join(dir, entry.name)
            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name)) walk(full)
                continue
            }
            const dot = entry.name.lastIndexOf('.')
            if (dot !== -1 && extensions.includes(entry.name.slice(dot + 1).toLowerCase())) files.push(full)
        }
    }
    walk(absolute)
    return files
}

export const collectFiles = async (target: string, extensions: string[]): Promise<string[]> => collectFilesSync(target, extensions)

/** Đọc file UTF-8, trả chuỗi rỗng nếu lỗi. */
export const readTextSync = (file: string): string => {
    try {
        return readFileSync(file, 'utf8')
    } catch (_error) {
        return ''
    }
}

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

// Plugin v3 hay gặp: gói có bản đóng gói sẵn, hoặc đã có sẵn trong Tailwind v4 (không cần dòng @plugin).
const KNOWN_PLUGINS = ['@tailwindcss/forms', '@tailwindcss/typography', 'tailwindcss-animate', '@tailwindcss/aspect-ratio', '@tailwindcss/container-queries']
const BUILTIN_IN_V4 = new Set(['@tailwindcss/aspect-ratio', '@tailwindcss/container-queries'])

/**
 * Nạp `@config "./tailwind.config.js"` (Node): `require` file cấu hình (CJS hoặc ESM) rồi đổi sang CSS v4.
 * Plugin được nhận ra bằng cách so trùng với chính các gói đó cài trong dự án.
 */
export const createConfigLoader = (baseDir: string) => (id: string): string | null => {
    const file = resolvePath(baseDir, id)
    try {
        const req = createRequire(joinPath(baseDir, 'noop.js'))
        delete req.cache[file]
        const config = req(file)
        const knownPlugins: Record<string, unknown> = {}
        for (const name of KNOWN_PLUGINS) {
            try {
                knownPlugins[name] = req(name)
            } catch (_error) {
                // gói không cài: bỏ qua
            }
        }
        const { css } = tailwindConfigToCss(config, { knownPlugins })
        return css.split('\n').filter((line) => !BUILTIN_IN_V4.has(line.match(/^@plugin "([^"]+)";$/)?.[1] || '')).join('\n')
    } catch (_error) {
        return null
    }
}
