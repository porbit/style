/** Liệt kê file nguồn cho CLI và MCP server. */
import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export const DEFAULT_EXTENSIONS = ['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte', 'astro', 'mdx']
// Thư mục không bao giờ cần quét: artifact build và phụ thuộc.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.output', 'target'])

/** Liệt kê file cần quét từ một đường dẫn (file hoặc thư mục, đệ quy). */
export const collectFiles = async (target: string, extensions: string[]): Promise<string[]> => {
    const absolute = resolve(target)
    const info = await stat(absolute).catch(() => null)
    if (!info) return []

    if (info.isFile()) return [absolute]
    if (!info.isDirectory()) return []

    const entries = await readdir(absolute, { withFileTypes: true })
    const files: string[] = []

    for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.') continue
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue
            files.push(...(await collectFiles(join(absolute, entry.name), extensions)))
            continue
        }
        const ext = entry.name.split('.').pop()?.toLowerCase() || ''
        if (extensions.includes(ext)) files.push(join(absolute, entry.name))
    }

    return files
}

