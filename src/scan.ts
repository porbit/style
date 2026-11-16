/**
 * Quét class ứng viên cho build trên Node (plugin PostCSS, CLI, Vite, MCP).
 *
 * `scanCandidates` cho cùng kết quả — cùng tập, cùng thứ tự — với `extractCandidates` của `./extract` nhưng quét tay
 * theo mã ký tự thay cho regex. Bản regex trong `./extract` vẫn là định nghĩa chuẩn (gọn, đi theo bản trình
 * duyệt/CDN); `tests/scan.test.ts` so hai bản trên fixture và chuỗi ngẫu nhiên. Nhanh hơn nhờ:
 *   - không cấp phát mảng match/chuỗi con cho từng chuỗi trích dẫn, quét thẳng trên chuỗi nguồn theo chỉ số;
 *   - chuỗi `class="..."` đã quét ở lượt thuộc tính không quét lại ở lượt "mọi chuỗi trích dẫn" (cùng nội dung,
 *     mọi token đã có trong tập);
 *   - tìm dấu nháy/xuống dòng bằng `indexOf` (tìm kiếm gốc) thay vì thử regex ở từng vị trí.
 *
 * `scanFiles` đọc + quét nhiều file, dùng thêm luồng phụ (worker_threads) khi có nhiều file chưa có trong bộ nhớ đệm
 * (build lần đầu): mỗi luồng nhận dần từng lô file liên tiếp, kết quả gộp lại đúng thứ tự file.
 */
import { readFileSync, statSync } from 'node:fs'
import { availableParallelism, loadavg } from 'node:os'
import { Worker } from 'node:worker_threads'

/**
 * Dựng hàm quét. Tự chứa (không dùng gì ngoài thân hàm): luồng phụ dựng lại hàm này từ chính mã nguồn của nó.
 */
export const createScanner = (): ((source: string) => string[]) => {
    // Bảng ký tự ASCII của token (xem CLASS_TOKEN_REGEX trong ./extract):
    //   1 = ký tự đầu token ([A-Za-z0-9_]), 2 = ký tự thân token ([A-Za-z0-9_@:%#.;!()[\]/*+~<>=$&|^?'-]).
    const CHAR = new Uint8Array(128)
    for (let c = 0; c < 128; c++) {
        const ch = String.fromCharCode(c)
        if (/[A-Za-z0-9_]/.test(ch)) CHAR[c] = 3
        else if (/[@:%#.;!()[\]/*+~<>=$&|^?'-]/.test(ch)) CHAR[c] = 2
    }

    // `\s` của regex JS.
    const isSpace = (c: number): boolean =>
        c === 32 || (c >= 9 && c <= 13) || c === 0xa0 || c === 0x1680 || (c >= 0x2000 && c <= 0x200a) || c === 0x2028 || c === 0x2029 || c === 0x202f || c === 0x205f || c === 0x3000 || c === 0xfeff

    /** Như `trimSourceSyntaxTail` của ./extract: bỏ `'` cuối và `)`/`]` đóng thừa (thuộc mã nguồn). */
    const trimTail = (token: string): string => {
        let end = token.length
        while (end > 0) {
            const ch = token.charCodeAt(end - 1)
            if (ch === 39) {
                end--
                continue
            }
            if (ch === 41 || ch === 93) {
                const open = ch === 41 ? 40 : 91
                let depth = 0
                for (let i = 0; i < end; i++) {
                    const c = token.charCodeAt(i)
                    if (c === open) depth++
                    else if (c === ch) depth--
                }
                if (depth < 0) {
                    end--
                    continue
                }
            }
            break
        }
        return end === token.length ? token : token.slice(0, end)
    }

    /** Tách token trong `source[from, to)` như `text.match(CLASS_TOKEN_REGEX)` trên chuỗi con đó, thêm vào `found`. */
    const collect = (source: string, from: number, to: number, found: Set<string>): void => {
        let i = from
        while (i < to) {
            const c = source.charCodeAt(i)
            if (c >= 128 || !(CHAR[c] & 1)) {
                i++
                continue
            }
            const start = i++
            while (i < to) {
                const d = source.charCodeAt(i)
                if (d === 91) {
                    // `\[[^\[\]\s"'`]*\]` trước; không đóng được thì `[` là một ký tự thân thường.
                    let k = i + 1
                    while (k < to) {
                        const e = source.charCodeAt(k)
                        if (e === 91 || e === 93 || e === 34 || e === 39 || e === 96 || isSpace(e)) break
                        k++
                    }
                    i = k < to && source.charCodeAt(k) === 93 ? k + 1 : i + 1
                    continue
                }
                if (d < 128 && CHAR[d] & 2) {
                    i++
                    continue
                }
                break
            }
            // Token không chứa khoảng trắng (`trim()` của bản regex không đổi gì).
            const value = trimTail(source.slice(start, i))
            if (value.length >= 2) found.add(value)
        }
    }

    const ATTR_REGEX = /(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}|`([^`]*)`)/g

    return (source: string): string[] => {
        if (typeof source !== 'string' || !source) return []
        const found = new Set<string>()
        // Vị trí dấu nháy mở của các giá trị thuộc tính không xuống dòng: lượt 2 gặp lại đúng chuỗi đó thì bỏ qua.
        const seen = new Set<number>()

        // 1) Vùng class/className.
        ATTR_REGEX.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = ATTR_REGEX.exec(source)) !== null) {
            const value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? ''
            // Giá trị luôn nằm ngay trước ký tự đóng cuối cùng của match.
            const end = m.index + m[0].length - 1
            const start = end - value.length
            collect(source, start, end, found)
            if (m[3] === undefined && value.indexOf('\n') === -1) seen.add(start - 1)
        }

        // 2) Mọi chuỗi trích dẫn trên một dòng: "…", '…', `…` (như /"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g).
        const n = source.length
        const next = (ch: string, from: number): number => {
            const index = source.indexOf(ch, from)
            return index < 0 ? n : index
        }
        let dq = next('"', 0)
        let sq = next("'", 0)
        let bt = next('`', 0)
        let nl = next('\n', 0)
        for (;;) {
            const q = dq < sq ? (dq < bt ? dq : bt) : sq < bt ? sq : bt
            if (q >= n) break
            const quote = source.charCodeAt(q)
            if (nl < q) nl = next('\n', q + 1)
            const close = q === dq ? next('"', q + 1) : q === sq ? next("'", q + 1) : next('`', q + 1)
            let pos = q + 1
            if (close < nl) {
                if (!seen.has(q)) collect(source, q + 1, close, found)
                pos = close + 1
            }
            // Dấu nháy kế tiếp của từng loại tính từ pos; khi không khớp, dấu đóng vừa tìm chính là dấu kế tiếp cùng loại.
            if (dq < pos) dq = quote === 34 && close >= pos ? close : next('"', pos)
            if (sq < pos) sq = quote === 39 && close >= pos ? close : next("'", pos)
            if (bt < pos) bt = quote === 96 && close >= pos ? close : next('`', pos)
        }
        return [...found]
    }
}

/** Class ứng viên trong một chuỗi nguồn: như `extractCandidates` của ./extract. */
export const scanCandidates = createScanner()

type Scan = (source: string) => string[]
type ReadText = (file: string, encoding: 'utf8') => string
type Stat = (file: string) => { mtimeMs: number }

/**
 * Đọc + quét `files[start, end)`. mtime null: không stat được (như trước: không có ứng viên, không lưu bộ nhớ
 * đệm); đọc lỗi: không có ứng viên. Tự chứa (chạy cả trong luồng phụ, nhận hàm đọc/stat qua tham số).
 */
const scanRange = (files: string[], start: number, end: number, scan: Scan, read: ReadText, stat: Stat) => {
    const mtimes: Array<number | null> = []
    const lists: string[][] = []
    for (let i = start; i < end; i++) {
        let mtime: number | null = null
        let list: string[] = []
        try {
            mtime = stat(files[i]).mtimeMs
        } catch (_error) {
            mtime = null
        }
        if (mtime !== null) {
            try {
                list = scan(read(files[i], 'utf8'))
            } catch (_error) {
                list = []
            }
        }
        mtimes.push(mtime)
        lists.push(list)
    }
    return { mtimes, lists }
}

interface WorkerData {
    files: string[]
    batchSize: number
    counter: SharedArrayBuffer
}
interface WorkerBatch {
    b: number
    mtimes: Array<number | null>
    /** Ứng viên từng file nối bằng ' ', các file nối bằng '\n' (token không chứa khoảng trắng). */
    lists: string
    /** Hợp các ứng viên của lô theo thứ tự xuất hiện đầu tiên, nối bằng ' '. */
    union: string
}

/** Vòng lặp của luồng phụ: nhận lô kế tiếp qua bộ đếm dùng chung cho tới khi hết. Tự chứa. */
const workerMain = (scan: Scan, range: typeof scanRange, port: { postMessage(value: unknown): void }, data: WorkerData, read: ReadText, stat: Stat) => {
    const counter = new Int32Array(data.counter)
    for (;;) {
        const b = Atomics.add(counter, 0, 1)
        const start = b * data.batchSize
        if (start >= data.files.length) break
        const { mtimes, lists } = range(data.files, start, Math.min(start + data.batchSize, data.files.length), scan, read, stat)
        const union = new Set<string>()
        for (const list of lists) for (const candidate of list) union.add(candidate)
        port.postMessage({ b, mtimes, lists: lists.map((list) => list.join(' ')).join('\n'), union: [...union].join(' ') })
    }
    // Báo xong qua cùng cổng: mọi lô đã gửi tới trước thông báo này.
    port.postMessage(null)
}

const WORKER_SOURCE = [
    "const { parentPort, workerData } = require('node:worker_threads');",
    "const { readFileSync, statSync } = require('node:fs');",
    `(${workerMain.toString()})((${createScanner.toString()})(), ${scanRange.toString()}, parentPort, workerData, readFileSync, statSync);`,
].join('\n')

export interface CandidateCacheEntry {
    mtime: number
    /** Mảng ứng viên, hoặc chuỗi nối bằng ' ' (kết quả từ luồng phụ, tách khi cần). */
    candidates: string[] | string
}

const candidatesOfEntry = (entry: CandidateCacheEntry): string[] => {
    if (typeof entry.candidates === 'string') entry.candidates = entry.candidates ? entry.candidates.split(' ') : []
    return entry.candidates
}

// Dưới ngưỡng này, chi phí dựng luồng phụ (~20–40 ms) lớn hơn phần tiết kiệm.
const PARALLEL_MIN_FILES = 1500
const MAX_WORKERS = 3

/**
 * Số luồng phụ: `PRESENCE_STYLE_WORKERS` (0 để tắt), mặc định theo số lõi còn rảnh (số lõi trừ tải 1 phút), tối đa 3.
 * Máy đã bận hết lõi (CI chạy nhiều build song song) thì quét tuần tự: luồng phụ khi đó chỉ tranh CPU, đo được
 * còn chậm hơn một luồng.
 */
const workerCount = (): number => {
    const env = Number(process.env.PRESENCE_STYLE_WORKERS)
    if (process.env.PRESENCE_STYLE_WORKERS !== undefined && Number.isFinite(env)) return Math.max(0, Math.floor(env))
    try {
        const cores = availableParallelism()
        return Math.max(0, Math.min(cores - 1, Math.floor(cores - loadavg()[0]), MAX_WORKERS))
    } catch (_error) {
        return 0
    }
}

/**
 * Đọc + quét `files`, thêm ứng viên vào `into` theo đúng thứ tự như quét tuần tự từng file (file theo thứ tự,
 * trong file theo `scanCandidates`). `cache` (theo mtime) giữ kết quả từng file cho lần build sau (chế độ watch).
 */
export const scanFiles = async (files: string[], cache: Map<string, CandidateCacheEntry>, into: Set<string>): Promise<{ workers: number; workerBatches: number }> => {
    let missing = 0
    for (const file of files) if (!cache.has(file)) missing++
    const workers = missing >= PARALLEL_MIN_FILES ? workerCount() : 0
    if (workers === 0) {
        for (const file of files) {
            let mtime: number
            try {
                mtime = statSync(file).mtimeMs
            } catch (_error) {
                continue
            }
            const cached = cache.get(file)
            let list: string[]
            if (cached && cached.mtime === mtime) list = candidatesOfEntry(cached)
            else {
                try {
                    list = scanCandidates(readFileSync(file, 'utf8'))
                } catch (_error) {
                    list = []
                }
                cache.set(file, { mtime, candidates: list })
            }
            for (const candidate of list) into.add(candidate)
        }
        return { workers: 0, workerBatches: 0 }
    }

    // Song song: luồng chính và các luồng phụ cùng lấy lô qua một bộ đếm dùng chung (lô nhỏ để chia đều khi máy bận).
    const batchSize = Math.max(32, Math.ceil(files.length / ((workers + 1) * 8)))
    const batchCount = Math.ceil(files.length / batchSize)
    const counter = new Int32Array(new SharedArrayBuffer(4))
    const local: Array<{ mtimes: Array<number | null>; lists: string[][] } | undefined> = new Array(batchCount)
    const remote: Array<WorkerBatch | undefined> = new Array(batchCount)
    const done: Array<Promise<void>> = []
    for (let w = 0; w < workers; w++) {
        try {
            const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { files, batchSize, counter: counter.buffer } satisfies WorkerData })
            done.push(
                new Promise((resolve) => {
                    worker.on('message', (batch: WorkerBatch | null) => {
                        if (batch) remote[batch.b] = batch
                        else resolve()
                    })
                    // Luồng phụ lỗi: lô nó đã nhận mà chưa gửi kết quả được luồng chính làm lại bên dưới.
                    worker.on('error', () => {})
                    worker.once('exit', () => resolve())
                }),
            )
        } catch (_error) {
            break
        }
    }
    for (let b = Atomics.add(counter, 0, 1); b < batchCount; b = Atomics.add(counter, 0, 1)) {
        local[b] = scanRange(files, b * batchSize, Math.min((b + 1) * batchSize, files.length), scanCandidates, readFileSync, statSync)
    }
    await Promise.all(done)

    let workerBatches = 0
    for (let b = 0; b < batchCount; b++) {
        const start = b * batchSize
        const batch = remote[b]
        if (batch) {
            workerBatches++
            const lists = batch.lists.split('\n')
            batch.mtimes.forEach((mtime, k) => {
                if (mtime !== null) cache.set(files[start + k], { mtime, candidates: lists[k] })
            })
            if (batch.union) for (const candidate of batch.union.split(' ')) into.add(candidate)
            continue
        }
        const result = local[b] ?? scanRange(files, start, Math.min(start + batchSize, files.length), scanCandidates, readFileSync, statSync)
        result.mtimes.forEach((mtime, k) => {
            if (mtime === null) return
            cache.set(files[start + k], { mtime, candidates: result.lists[k] })
            for (const candidate of result.lists[k]) into.add(candidate)
        })
    }
    return { workers: done.length, workerBatches }
}
