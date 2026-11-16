/**
 * Bộ nhớ đệm quét trên đĩa cho build tĩnh (plugin PostCSS, CLI, Vite): ứng viên của từng file theo đường dẫn + mtime
 * + kích thước. Build trong tiến trình mới (lệnh build của CI, khởi động lại dev server) chỉ đọc + quét file đã đổi.
 *
 * - Chỗ lưu: `node_modules/.cache/presence-style/` của thư mục có package.json gần nhất (đi ngược từ `base`), như
 *   Babel/ESLint/Vite. Tuỳ chọn `scanCache: false` hoặc `PRESENCE_STYLE_CACHE=0` để tắt; `scanCache: "<thư mục>"` hoặc
 *   `PRESENCE_STYLE_CACHE=<thư mục>` để đặt chỗ khác.
 * - Mỗi file CSS vào một file đệm; dòng đầu ghi khoá (phiên bản gói, mã bộ quét, nội dung CSS vào và tuỳ chọn quét).
 *   Khoá khác (nâng cấp gói, đổi cấu hình) thì bỏ cả file đệm. File bị xoá/đổi tên không còn trong danh sách quét
 *   nên không được dùng, và bị bỏ khỏi file đệm ở lần ghi sau.
 * - Ghi ngoài đường build: ~1 giây sau lần build có file đổi, hoặc lúc tiến trình thoát (`process.on('exit')`);
 *   ghi ra file tạm rồi đổi tên nên tiến trình khác không bao giờ đọc phải file ghi dở. File hỏng/cụt: bỏ qua.
 *
 * Định dạng (văn bản, token không chứa khoảng trắng):
 *   presence-style-scan <khoá> <độ dài phần còn lại>
 *   <mọi token, nối bằng ' '>
 *   <mtime>\t<kích thước>\t<số hiệu token, nối bằng ','>\t<đường dẫn>     (mỗi file một dòng)
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { candidatesOfEntry, createScanner, scanCandidates, type CandidateCacheEntry } from './scan'

declare const __PRESENCE_STYLE_VERSION__: string

const MAGIC = 'presence-style-scan'
// Tăng khi đổi định dạng.
const FORMAT = 1

const hash = (text: string): string => createHash('sha1').update(text).digest('hex')

let scannerFingerprint: string | undefined

/** Khoá của bộ nhớ đệm: phiên bản gói + mã nguồn bộ quét (đổi cách trích là bỏ cache) + cấu hình. */
export const scanCacheKey = (config: unknown): string => {
    scannerFingerprint ??= hash(createScanner.toString())
    const version = typeof __PRESENCE_STYLE_VERSION__ === 'string' ? __PRESENCE_STYLE_VERSION__ : 'dev'
    return hash(JSON.stringify([FORMAT, version, scannerFingerprint, config]))
}

/**
 * Thư mục đệm: `option` false/`PRESENCE_STYLE_CACHE=0` tắt (null), chuỗi là thư mục; mặc định
 * `<thư mục có package.json gần nhất>/node_modules/.cache/presence-style` (không có package.json: tắt).
 */
export const resolveScanCacheDir = (option: boolean | string | undefined, base: string): string | null => {
    const env = process.env.PRESENCE_STYLE_CACHE
    if (option === false) return null
    if (typeof option === 'string' && option) return resolve(base, option)
    if (env !== undefined && env !== '') {
        if (/^(0|false|off|no)$/i.test(env)) return null
        if (!/^(1|true|on|yes)$/i.test(env)) return resolve(env)
    }
    for (let dir = resolve(base); ; dir = dirname(dir)) {
        if (existsSync(join(dir, 'package.json'))) return join(dir, 'node_modules', '.cache', 'presence-style')
        if (dirname(dir) === dir) return null
    }
}

/** File đệm cho một file CSS vào (hoặc thư mục gốc khi không có `from`). */
export const scanCacheFile = (dir: string, entry: string): string => join(dir, `scan-${hash(entry).slice(0, 16)}.cache`)

/** File đệm đã nạp: danh sách file theo thứ tự đã ghi, bảng token, và mục bộ nhớ đệm tương ứng. */
export interface ScanCacheSnapshot {
    files: string[]
    entries: CandidateCacheEntry[]
    /** Mọi token theo thứ tự xuất hiện đầu tiên khi duyệt `files` theo thứ tự (cách `serializeScanCache` đánh số). */
    tokens: string[]
}

/**
 * Đọc file đệm; mục của file chưa có trong `cache` (bộ nhớ đệm trong tiến trình) được thêm vào, ứng viên giải
 * lười khi dùng. Null khi không có, khác khoá hoặc hỏng.
 */
export const loadScanCache = (file: string, key: string, cache: Map<string, CandidateCacheEntry>): ScanCacheSnapshot | null => {
    let text: string
    try {
        text = readFileSync(file, 'utf8')
    } catch (_error) {
        return null
    }
    const headerEnd = text.indexOf('\n')
    // Dòng đầu ghi cả độ dài phần còn lại: file cụt (đĩa đầy, bị cắt) thì bỏ.
    if (headerEnd < 0 || text.slice(0, headerEnd) !== `${MAGIC} ${key} ${text.length - headerEnd - 1}`) return null
    const tokensEnd = text.indexOf('\n', headerEnd + 1)
    if (tokensEnd < 0) return null
    const tokens = tokensEnd > headerEnd + 1 ? text.slice(headerEnd + 1, tokensEnd).split(' ') : []
    // Bản sao phẳng: không giữ cả nội dung file đệm trong bộ nhớ qua chuỗi cắt.
    for (let i = 0; i < tokens.length; i++) tokens[i] = (' ' + tokens[i]).slice(1)
    const files: string[] = []
    const entries: CandidateCacheEntry[] = []
    let pos = tokensEnd + 1
    while (pos < text.length) {
        let end = text.indexOf('\n', pos)
        if (end < 0) end = text.length
        const t1 = text.indexOf('\t', pos)
        const t2 = text.indexOf('\t', t1 + 1)
        const t3 = text.indexOf('\t', t2 + 1)
        if (t1 < 0 || t2 < 0 || t3 < 0 || t3 >= end) return null
        const mtime = Number(text.slice(pos, t1))
        const size = Number(text.slice(t1 + 1, t2))
        if (!Number.isFinite(mtime) || !Number.isFinite(size)) return null
        files.push(text.slice(t3 + 1, end))
        entries.push({ mtime, size, candidates: (' ' + text.slice(t2 + 1, t3)).slice(1), table: tokens })
        pos = end + 1
    }
    for (let i = 0; i < files.length; i++) if (!cache.has(files[i])) cache.set(files[i], entries[i])
    return { files, entries, tokens }
}

/**
 * Đường nhanh khi không file nào đổi: `files` trùng danh sách đã ghi (cùng thứ tự), mọi file cùng mtime + kích thước
 * và mục trong `cache` vẫn là mục nạp từ đĩa — thì tập ứng viên (theo thứ tự quét) chính là bảng token, khỏi giải
 * từng file. Trả false (không thêm gì) ngay khi gặp khác biệt: dùng `scanFiles` như thường.
 */
export const addFromSnapshot = (snapshot: ScanCacheSnapshot, files: string[], cache: Map<string, CandidateCacheEntry>, into: Set<string>): boolean => {
    if (files.length !== snapshot.files.length) return false
    for (let i = 0; i < files.length; i++) {
        const entry = snapshot.entries[i]
        if (files[i] !== snapshot.files[i] || cache.get(files[i]) !== entry) return false
        let info
        try {
            info = statSync(files[i])
        } catch (_error) {
            return false
        }
        if (info.mtimeMs !== entry.mtime || info.size !== entry.size) return false
    }
    for (const token of snapshot.tokens) into.add(token)
    return true
}

/** Nội dung file đệm cho `files` (theo thứ tự), lấy từ `cache`. */
export const serializeScanCache = (key: string, files: string[], cache: Map<string, CandidateCacheEntry>): string => {
    const ids = new Map<string, number>()
    const tokens: string[] = []
    // Số hiệu đã viết sẵn thành chuỗi: nối dòng không phải đổi số -> chuỗi cho từng lần xuất hiện.
    const texts: string[] = []
    const number = (token: string): number => {
        let id = ids.get(token)
        if (id === undefined) {
            id = tokens.length
            ids.set(token, id)
            tokens.push(token)
            texts.push(String(id))
        }
        return id
    }
    // Mục quét tuần tự giữ số hiệu của bộ quét chính: đổi sang số hiệu trong file đệm qua mảng (-1: chưa gặp).
    const generation = scanCandidates.generation()
    let remap = new Int32Array(0)
    const row: string[] = []
    const lines: string[] = []
    for (const path of files) {
        const entry = cache.get(path)
        if (!entry || path.includes('\n')) continue
        const raw = entry.candidates
        row.length = 0
        if (raw instanceof Int32Array && entry.gen === generation) {
            for (let k = 0; k < raw.length; k++) {
                const scannerId = raw[k]
                if (scannerId >= remap.length) {
                    const bigger = new Int32Array(Math.max(scannerId + 1, remap.length * 2, 1024)).fill(-1)
                    bigger.set(remap)
                    remap = bigger
                }
                let id = remap[scannerId]
                if (id < 0) id = remap[scannerId] = number(scanCandidates.token(scannerId))
                row.push(texts[id])
            }
        } else {
            const list = candidatesOfEntry(entry)
            if (!list) continue
            for (let k = 0; k < list.length; k++) row.push(texts[number(list[k])])
        }
        lines.push(`${entry.mtime}\t${entry.size}\t${row.join(',')}\t${path}`)
    }
    const body = `${tokens.join(' ')}\n${lines.join('\n')}`
    return `${MAGIC} ${key} ${body.length}\n${body}`
}

/** Ghi file đệm (file tạm rồi đổi tên). Lỗi (thư mục chỉ đọc...) bỏ qua: build không phụ thuộc bộ nhớ đệm. */
export const writeScanCache = (file: string, content: string): boolean => {
    const temp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
    try {
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(temp, content)
        renameSync(temp, file)
        return true
    } catch (_error) {
        try {
            unlinkSync(temp)
        } catch (_ignored) {
            // không có file tạm
        }
        return false
    }
}

// Ghi chờ: theo file đệm, ghi bản mới nhất. Ghi sau ~1 giây (chế độ watch: nhiều lần build liền nhau chỉ ghi một
// lần, ngoài đường build), hoặc lúc tiến trình thoát (lệnh build một lần).
const pending = new Map<string, () => string>()
let exitHook = false
let timer: ReturnType<typeof setTimeout> | null = null
const WRITE_DELAY = 1000

/** Ghi mọi file đệm đang chờ (đồng bộ). */
export const flushScanCache = (): void => {
    if (timer) clearTimeout(timer)
    timer = null
    const jobs = [...pending]
    pending.clear()
    for (const [file, build] of jobs) {
        let content: string
        try {
            content = build()
        } catch (_error) {
            continue
        }
        writeScanCache(file, content)
    }
}

/** Hẹn ghi file đệm cho `files` (danh sách và mục bộ nhớ đệm đọc lúc ghi). */
export const scheduleScanCacheWrite = (file: string, key: string, files: string[], cache: Map<string, CandidateCacheEntry>): void => {
    pending.set(file, () => serializeScanCache(key, files, cache))
    if (!exitHook) {
        exitHook = true
        process.once('exit', flushScanCache)
    }
    if (!timer) {
        timer = setTimeout(flushScanCache, WRITE_DELAY)
        // Không giữ tiến trình sống chỉ vì việc ghi: thoát sớm thì `exit` vẫn ghi.
        timer.unref?.()
    }
}
