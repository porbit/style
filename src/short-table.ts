/**
 * Bảng rút gọn tên class dùng chung giữa plugin bundler (webpack/Rspack), loader và plugin PostCSS: đọc/ghi file JSON,
 * cache theo mtime, kiểm tra trùng tên ngắn. Chỉ chạy trên Node.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { collectCssClasses, shortClassNamesFromMap, type ShortClassRewriter, type ShortClassSkipReason } from './shorten'

/** Nội dung file bảng ánh xạ dùng chung. */
export interface ShortClassTable {
    version: 1
    root: string
    functions: string[]
    /** File được loader đổi tên (đường dẫn tương đối với `root`, dấu `/`). */
    files: string[]
    /** Tên gốc -> tên ngắn. */
    map: Record<string, string>
    /** Class giữ nguyên tên -> lý do. */
    skipped: Record<string, ShortClassSkipReason>
}

/** Biến môi trường trỏ tới file bảng của lần build hiện tại (plugin PostCSS `shortClassNames: true` đọc). */
export const SHORT_CLASS_MAP_ENV = 'PRESENCE_STYLE_SHORT_CLASS_MAP'

export interface Shared {
    tables: Map<string, { fingerprint: string; done: boolean; promise: Promise<ShortClassTable> }>
    loaded: Map<string, { mtime: number; size: number; table: ShortClassTable; rewriter: ShortClassRewriter; files: Set<string> }>
    /** Plugin PostCSS đã đổi tên CSS trong tiến trình này (kiểm tra trùng tên đã làm ở đó). */
    postcss: boolean
}
export const shared = (): Shared => {
    const key = Symbol.for('@porbit/style/short-class-names')
    const g = globalThis as unknown as Record<symbol, Shared | undefined>
    return (g[key] ??= { tables: new Map(), loaded: new Map(), postcss: false })
}

/** Ghi bảng (chỉ khi nội dung đổi: giữ nguyên mtime để cache bền của webpack không bị vô hiệu vô ích). */
export const writeShortClassTable = (mapFile: string, table: ShortClassTable): void => {
    const json = JSON.stringify(table, null, 1) + '\n'
    let previous = ''
    try {
        previous = readFileSync(mapFile, 'utf8')
    } catch (_error) {
        previous = ''
    }
    if (previous === json) return
    mkdirSync(dirname(mapFile), { recursive: true })
    writeFileSync(mapFile, json)
}

/** Đọc bảng (có cache theo mtime) và bộ đổi tên tương ứng. `null` khi chưa có file. */
export const loadShortClassTable = (mapFile: string) => {
    let stat
    try {
        stat = statSync(mapFile)
    } catch (_error) {
        return null
    }
    const cache = shared().loaded
    const hit = cache.get(mapFile)
    if (hit && hit.mtime === stat.mtimeMs && hit.size === stat.size) return hit
    const table = JSON.parse(readFileSync(mapFile, 'utf8')) as ShortClassTable
    const entry = {
        mtime: stat.mtimeMs,
        size: stat.size,
        table,
        rewriter: shortClassNamesFromMap(table.map, { functions: table.functions }),
        files: new Set(table.files.map((file) => resolve(table.root, file))),
    }
    cache.set(mapFile, entry)
    return entry
}

/** Class trong `css` trùng tên ngắn đã cấp (CSS ngoài bảng, ví dụ thư viện có `.a`): đổi tên sẽ gắn nhầm style. */
export const findShortNameCollisions = (css: string, table: Pick<ShortClassTable, 'map'>): string[] => {
    const values = new Set(Object.values(table.map))
    if (!values.size) return []
    return [...collectCssClasses(css).classes.keys()].filter((name) => values.has(name) && !Object.hasOwn(table.map, name))
}

/** Đánh dấu plugin PostCSS đã đổi tên CSS trong tiến trình này (dùng nội bộ). */
export const markPostcssShortened = (): void => {
    shared().postcss = true
}

