/** Liệt kê file nguồn cho CLI và MCP server. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

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
