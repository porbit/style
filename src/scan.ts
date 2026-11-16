/**
 * Quét class ứng viên cho build trên Node (plugin PostCSS, CLI, Vite, MCP).
 *
 * `scanCandidates` cho cùng kết quả — cùng tập, cùng thứ tự — với `extractCandidates` của `./extract` nhưng quét tay
 * theo mã ký tự thay cho regex. Bản regex trong `./extract` vẫn là định nghĩa chuẩn (gọn, đi theo bản trình
 * duyệt/CDN); `tests/scan.test.ts` so hai bản trên fixture và chuỗi ngẫu nhiên. Nhanh hơn nhờ:
 *   - không cấp phát mảng match/chuỗi con cho từng chuỗi trích dẫn, quét thẳng trên chuỗi nguồn theo chỉ số;
 *   - chuỗi `class="..."` đã quét ở lượt thuộc tính không quét lại ở lượt "mọi chuỗi trích dẫn" (cùng nội dung,
 *     mọi token đã có trong tập);
 *   - tìm dấu nháy/xuống dòng bằng `indexOf` (tìm kiếm gốc) thay vì thử regex ở từng vị trí;
 *   - bảng intern token dùng chung giữa các file (không cắt chuỗi cho token đã gặp, không giữ file nguồn qua chuỗi
 *     cắt) và ghi nhớ theo nội dung chuỗi (HTML/JSX lặp lại cùng bộ class, cùng `d="..."` của icon);
 *   - `scanFiles` chỉ thêm vào tập hợp các token mới gặp trong lượt.
 *
 * `scanFiles` đọc + quét nhiều file; mặc định tuần tự bằng bộ quét theo byte (WASM, `./scan-wasm`: đọc file thẳng vào
 * bộ nhớ WASM, không giải mã UTF-8, cùng kết quả với bản JS ở đây), bản JS khi không nạp được WASM. Khi ép bằng
 * `PRESENCE_STYLE_WORKERS` thì dùng thêm luồng phụ (worker_threads, bản JS) cho file chưa có trong bộ nhớ đệm: mỗi luồng
 * nhận dần từng lô file liên tiếp, kết quả gộp lại đúng thứ tự file (xem dưới).
 */
import { closeSync, fstatSync, openSync, readFileSync, statSync } from 'node:fs'
import { Worker } from 'node:worker_threads'
import { createByteScanner, type ByteScanner } from './scan-wasm'
import { SCAN_WASM } from './scan-wasm-generated'

/**
 * Dựng hàm quét. Tự chứa (không dùng gì ngoài thân hàm): luồng phụ dựng lại hàm này từ chính mã nguồn của nó.
 */
/**
 * Hàm quét: `scan(source)` trả ứng viên của chuỗi nguồn. Truyền thêm `fresh`: token chưa gặp trong lượt hiện tại
 * (từ lần gọi `scan.begin()` gần nhất) được thêm vào `fresh` theo thứ tự — hợp các file khỏi phải thêm lại từng token.
 */
export type Scanner = ((source: string, fresh?: string[]) => string[]) & {
    begin(): void
    /**
     * Như gọi `scan` nhưng ghi số hiệu token (xem `token`) vào vùng nhớ chung `idArena()` từ vị trí `idStart()`, trả
     * số token: không cấp phát gì cho từng file. Vùng nhớ chỉ ghi thêm; hết chỗ thì cấp vùng mới (vùng cũ còn đúng).
     */
    ids(source: string, fresh?: string[]): number
    idArena(): Int32Array
    idStart(): number
    /** Chuỗi của token số hiệu `id` (số hiệu chỉ có nghĩa trong cùng `generation`). */
    token(id: number): string
    /** Tăng mỗi lần bảng intern làm lại từ đầu (số hiệu cũ hết nghĩa). */
    generation(): number
}

export const createScanner = (): Scanner => {
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

    // Bảng intern (băm địa chỉ mở) dùng chung cho mọi lần gọi: token đã gặp không cắt chuỗi lại (một dự án chỉ có vài
    // nghìn token khác nhau, lặp lại ở mọi file). Chuỗi lưu là bản sao phẳng nên không giữ cả file nguồn trong bộ nhớ
    // (chuỗi cắt từ nguồn trỏ về nguồn: bộ nhớ đệm theo file giữ lại mọi file đã đọc, GC phải chép đi chép lại).
    // Mỗi token có số hiệu cố định (`byId`); `marks[id] === call`: token đã có trong kết quả của lần gọi hiện tại
    // (thay cho Set khử trùng).
    let mask = 0
    let keys: Array<string | undefined> = []
    let hashes = new Int32Array(0)
    let slotIds = new Int32Array(0)
    let byId: string[] = []
    let marks = new Int32Array(0)
    let call = 0
    // `seenInRound[id] === round`: token đã thêm vào `fresh` trong lượt hiện tại.
    let seenInRound = new Int32Array(0)
    let round = 1
    let fresh: string[] | undefined
    let out: string[] = []
    // Chế độ `ids`: kết quả ghi thẳng vào vùng nhớ chung `arena` (chỉ ghi thêm, từ `arenaUsed`) thay cho `out`.
    let wantIds = false
    let idCount = 0
    let arena = new Int32Array(0)
    let arenaUsed = 0
    let gen = 0
    // Ghi nhớ theo nội dung chuỗi (giá trị class, chuỗi trích dẫn): HTML/JSX lặp lại rất nhiều chuỗi giống hệt nhau
    // (cùng bộ class, cùng `d="..."` của icon) — gặp lại thì lấy luôn danh sách token, không quét từng ký tự.
    let memo = new Map<string, number[]>()
    let memoChars = 0
    let recording: number[] | null = null

    const reset = (): void => {
        mask = 4095
        keys = new Array(mask + 1)
        hashes = new Int32Array(mask + 1)
        slotIds = new Int32Array(mask + 1)
        byId = []
        marks = new Int32Array(4096)
        seenInRound = new Int32Array(4096)
        call = 0
        memo = new Map()
        memoChars = 0
    }
    reset()

    const grow = (): void => {
        const oldKeys = keys
        const oldHashes = hashes
        const oldIds = slotIds
        mask = mask * 2 + 1
        keys = new Array(mask + 1)
        hashes = new Int32Array(mask + 1)
        slotIds = new Int32Array(mask + 1)
        for (let i = 0; i < oldKeys.length; i++) {
            const key = oldKeys[i]
            if (key === undefined) continue
            let slot = oldHashes[i] & mask
            while (keys[slot] !== undefined) slot = (slot + 1) & mask
            keys[slot] = key
            hashes[slot] = oldHashes[i]
            slotIds[slot] = oldIds[i]
        }
    }

    /** Thêm token `id` vào kết quả của lần gọi hiện tại (một lần) và vào `fresh` (một lần mỗi lượt). */
    const take = (id: number): void => {
        if (marks[id] !== call) {
            marks[id] = call
            if (wantIds) {
                if (arenaUsed + idCount === arena.length) {
                    // Hết chỗ: vùng mới, chép phần đã ghi của lần gọi này sang.
                    const next = new Int32Array(Math.max(1 << 16, idCount * 2))
                    next.set(arena.subarray(arenaUsed, arenaUsed + idCount))
                    arena = next
                    arenaUsed = 0
                }
                arena[arenaUsed + idCount++] = id
            } else out.push(byId[id])
            if (fresh !== undefined && seenInRound[id] !== round) {
                seenInRound[id] = round
                fresh.push(byId[id])
            }
        }
    }
    const emit = (id: number): void => {
        if (recording !== null) recording.push(id)
        take(id)
    }

    /** Thêm token `source[start, end)` vào kết quả (bỏ đuôi cú pháp như `trimSourceSyntaxTail` của ./extract). */
    const add = (source: string, start: number, end: number): void => {
        // Bỏ `'` cuối và `)`/`]` đóng thừa (thuộc mã nguồn).
        while (end > start) {
            const ch = source.charCodeAt(end - 1)
            if (ch === 39) {
                end--
                continue
            }
            if (ch === 41 || ch === 93) {
                const open = ch === 41 ? 40 : 91
                let depth = 0
                for (let i = start; i < end; i++) {
                    const c = source.charCodeAt(i)
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
        const length = end - start
        if (length < 2) return
        let hash = 0
        for (let i = start; i < end; i++) hash = (Math.imul(hash, 31) + source.charCodeAt(i)) | 0
        let slot = hash & mask
        for (;;) {
            const key = keys[slot]
            if (key === undefined) break
            if (hashes[slot] === hash && key.length === length) {
                let k = 0
                while (k < length && key.charCodeAt(k) === source.charCodeAt(start + k)) k++
                if (k === length) {
                    emit(slotIds[slot])
                    return
                }
            }
            slot = (slot + 1) & mask
        }
        // Nối rồi cắt: chuỗi phẳng mới, không trỏ về nguồn.
        const id = byId.length
        byId.push((' ' + source.slice(start, end)).slice(1))
        if (id >= marks.length) {
            const bigger = new Int32Array(marks.length * 2)
            bigger.set(marks)
            marks = bigger
            const biggerRound = new Int32Array(bigger.length)
            biggerRound.set(seenInRound)
            seenInRound = biggerRound
        }
        keys[slot] = byId[id]
        hashes[slot] = hash
        slotIds[slot] = id
        emit(id)
        if (byId.length * 2 > mask) grow()
    }

    /** Tách token trong `source[from, to)` như `text.match(CLASS_TOKEN_REGEX)` trên chuỗi con đó. */
    const collect = (source: string, from: number, to: number): void => {
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
            add(source, start, i)
        }
    }

    /** Như `collect`, qua bộ ghi nhớ theo nội dung cho chuỗi đủ dài. */
    const collectMemo = (source: string, from: number, to: number): void => {
        const length = to - from
        if (length < 16) {
            collect(source, from, to)
            return
        }
        const key = source.slice(from, to)
        const hit = memo.get(key)
        if (hit !== undefined) {
            for (let k = 0; k < hit.length; k++) take(hit[k])
            return
        }
        const ids: number[] = (recording = [])
        collect(source, from, to)
        recording = null
        // Giới hạn bộ nhớ (tiến trình watch chạy lâu): quá ~8 MB chuỗi thì bắt đầu lại.
        if (memoChars + length > 1 << 22) {
            memo = new Map()
            memoChars = 0
        }
        memo.set((' ' + key).slice(1), ids)
        memoChars += length
    }

    // Vị trí dấu nháy mở của giá trị class/className không xuống dòng (tăng dần): lượt 2 gặp lại đúng chuỗi đó thì bỏ
    // qua. Dùng lại giữa các lần gọi.
    const seen: number[] = []

    const run = (source: string, freshList?: string[]): void => {
        // Bảng quá lớn (tiến trình watch chạy lâu, mã sinh token ngẫu nhiên) hoặc bộ đếm sắp tràn: làm lại từ đầu.
        if (byId.length > 1 << 19 || call > 1 << 30 || round > 1 << 30) {
            reset()
            round = 1
            gen++
        }
        call++
        fresh = freshList
        const n = source.length
        seen.length = 0

        // 1) Vùng class/className: như /(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}|`([^`]*)`)/g
        // (thử `class` trước rồi mới `className` ở cùng vị trí), quét tay để khỏi cấp phát mảng match.
        let newline = -1
        for (let pos = 0; ; ) {
            const at = source.indexOf('class', pos)
            if (at < 0) break
            pos = at + 1
            for (let alt = 0; alt < 2; alt++) {
                let j = at + 5
                if (alt === 1) {
                    if (!source.startsWith('Name', j)) break
                    j += 4
                }
                while (j < n && isSpace(source.charCodeAt(j))) j++
                if (source.charCodeAt(j) !== 61) continue
                j++
                while (j < n && isSpace(source.charCodeAt(j))) j++
                const open = source.charCodeAt(j)
                const close = open === 34 ? source.indexOf('"', j + 1) : open === 39 ? source.indexOf("'", j + 1) : open === 123 ? source.indexOf('}', j + 1) : open === 96 ? source.indexOf('`', j + 1) : -1
                if (close < 0) continue
                collectMemo(source, j + 1, close)
                if (open !== 123) {
                    if (newline < j) {
                        newline = source.indexOf('\n', j)
                        if (newline < 0) newline = n
                    }
                    if (newline > close) seen.push(j)
                }
                pos = close + 1
                break
            }
        }

        // 2) Mọi chuỗi trích dẫn trên một dòng: "…", '…', `…` (như /"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g).
        let seenAt = 0
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
                while (seenAt < seen.length && seen[seenAt] < q) seenAt++
                if (seenAt >= seen.length || seen[seenAt] !== q) collectMemo(source, q + 1, close)
                pos = close + 1
            }
            // Dấu nháy kế tiếp của từng loại tính từ pos; khi không khớp, dấu đóng vừa tìm chính là dấu kế tiếp cùng loại.
            if (dq < pos) dq = quote === 34 && close >= pos ? close : next('"', pos)
            if (sq < pos) sq = quote === 39 && close >= pos ? close : next("'", pos)
            if (bt < pos) bt = quote === 96 && close >= pos ? close : next('`', pos)
        }
        fresh = undefined
    }
    const scan = (source: string, freshList?: string[]): string[] => {
        wantIds = false
        out = []
        if (typeof source === 'string' && source) run(source, freshList)
        return out
    }
    return Object.assign(scan, {
        begin: () => {
            round++
        },
        ids: (source: string, freshList?: string[]): number => {
            idCount = 0
            wantIds = true
            if (typeof source === 'string' && source) run(source, freshList)
            wantIds = false
            arenaUsed += idCount
            return idCount
        },
        idArena: () => arena,
        idStart: () => arenaUsed,
        token: (id: number): string => byId[id],
        generation: () => gen,
    })
}

/** Class ứng viên trong một chuỗi nguồn: như `extractCandidates` của ./extract. */
export const scanCandidates = createScanner()
const mainScanner = scanCandidates

/** Mã định nghĩa cách trích (bản JS + bản WASM): đổi là bỏ bộ nhớ đệm trên đĩa (xem ./scan-cache). */
export const scannerSource = (): string => createScanner.toString() + SCAN_WASM

// Bộ quét theo byte (WASM) cho `scanFiles`: nạp lười ở lần quét đầu; null: không dùng được, quét bằng bản JS.
let byteScanner: ByteScanner | null | undefined

const loadByteScanner = (): ByteScanner | null => {
    if (byteScanner === undefined) byteScanner = createByteScanner()
    return byteScanner
}

type Scan = (source: string) => string[]
type ReadText = (file: string, encoding: 'utf8') => string
type Stat = (file: string) => { mtimeMs: number; size: number }

/**
 * Đọc + quét `files[start, end)`. mtime null: không stat được (như trước: không có ứng viên, không lưu bộ nhớ
 * đệm); đọc lỗi: không có ứng viên. Tự chứa (chạy cả trong luồng phụ, nhận hàm đọc/stat qua tham số).
 */
const scanRange = (files: string[], start: number, end: number, scan: Scan, read: ReadText, stat: Stat) => {
    const mtimes: Array<number | null> = []
    const sizes: number[] = []
    const lists: string[][] = []
    for (let i = start; i < end; i++) {
        let mtime: number | null = null
        let size = 0
        let list: string[] = []
        try {
            const info = stat(files[i])
            mtime = info.mtimeMs
            size = info.size
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
        sizes.push(size)
        lists.push(list)
    }
    return { mtimes, sizes, lists }
}

interface WorkerData {
    files: string[]
    batchSize: number
    counter: SharedArrayBuffer
}
interface WorkerBatch {
    b: number
    mtimes: Array<number | null>
    sizes: number[]
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
        const { mtimes, sizes, lists } = range(data.files, start, Math.min(start + data.batchSize, data.files.length), scan, read, stat)
        const union = new Set<string>()
        for (const list of lists) for (const candidate of list) union.add(candidate)
        port.postMessage({ b, mtimes, sizes, lists: lists.map((list) => list.join(' ')).join('\n'), union: [...union].join(' ') })
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
    /** Kích thước file (byte): cùng mtime mà khác kích thước vẫn đọc lại. */
    size: number
    /**
     * Mảng ứng viên, hoặc chuỗi nối bằng ' ' (kết quả từ luồng phụ, tách khi cần), hoặc khi có `table`: số hiệu
     * token trong `table` nối bằng ',' (nạp từ bộ nhớ đệm trên đĩa, giải khi cần), hoặc vùng nhớ số hiệu token của bộ
     * quét chính (`scanCandidates.ids`: `count` số từ `at`, đời bảng intern `gen`): quét tuần tự không dựng mảng chuỗi
     * cho từng file (ít rác cho GC), ghi bộ nhớ đệm trên đĩa đánh số lại bằng mảng số thay cho Map theo chuỗi.
     */
    candidates: string[] | string | Int32Array
    table?: string[]
    /** Số hiệu token: vị trí đầu và số phần tử trong vùng nhớ `candidates`. */
    at?: number
    count?: number
    gen?: number
    /** Bộ quét đã cấp số hiệu (bộ quét theo byte hoặc bản JS chính). */
    scanner?: TokenSource
}

/** Nguồn số hiệu token của mục bộ nhớ đệm dạng vùng nhớ số hiệu. */
export type TokenSource = Pick<Scanner, 'token' | 'generation'>

/** Ứng viên của một mục bộ nhớ đệm; null nếu mục hỏng (số hiệu không có trong bảng): coi như chưa có, quét lại. */
export const candidatesOfEntry = (entry: CandidateCacheEntry): string[] | null => {
    const ids = entry.candidates
    if (ids instanceof Int32Array) {
        // Bảng intern đã làm lại: số hiệu hết nghĩa, coi như chưa có.
        const scanner = entry.scanner ?? mainScanner
        if (entry.gen !== scanner.generation()) return null
        const at = entry.at ?? 0
        const list: string[] = new Array(entry.count ?? 0)
        for (let k = 0; k < list.length; k++) list[k] = scanner.token(ids[at + k])
        entry.candidates = list
        entry.gen = entry.at = entry.count = entry.scanner = undefined
    } else if (typeof entry.candidates === 'string') {
        const text = entry.candidates
        const table = entry.table
        if (!table) entry.candidates = text ? text.split(' ') : []
        else {
            const ids = text ? text.split(',') : []
            const list: string[] = new Array(ids.length)
            for (let k = 0; k < ids.length; k++) {
                const token = table[+ids[k]]
                if (token === undefined) return null
                list[k] = token
            }
            entry.candidates = list
            entry.table = undefined
        }
    }
    return entry.candidates as string[]
}

// Luồng phụ (worker_threads) chỉ khi ép bằng `PRESENCE_STYLE_WORKERS=<số>`. Mặc định tắt: mỗi luồng mất ~40–70 ms
// khởi động, JIT nguội và không dùng chung bảng intern/ghi nhớ với luồng chính; đo trên máy 4 lõi (6.000 file, cả lúc
// tải thấp) 1–2 luồng phụ đều chậm hơn quét tuần tự (luồng chính quét ~6.000 trang HTML trong ~130 ms).
const PARALLEL_MIN_FILES = 1500

/** Số luồng phụ: `PRESENCE_STYLE_WORKERS` (mặc định 0). */
const workerCount = (): number => {
    const env = Number(process.env.PRESENCE_STYLE_WORKERS)
    if (process.env.PRESENCE_STYLE_WORKERS !== undefined && Number.isFinite(env)) return Math.max(0, Math.floor(env))
    return 0
}

/**
 * Mở `file`, fstat + đọc nội dung qua fd. Null khi không mở được hoặc fstat lỗi (người gọi stat theo đường dẫn như
 * cũ). Đọc lỗi (thư mục...): `text` là chuỗi rỗng — như quét tuần tự cũ: không ứng viên, vẫn ghi bộ nhớ đệm.
 */
const openOrNull = (file: string): { info: { mtimeMs: number; size: number }; text: string } | null => {
    let fd: number
    try {
        fd = openSync(file, 'r')
    } catch (_error) {
        return null
    }
    try {
        const info = fstatSync(fd)
        let text = ''
        try {
            text = readFileSync(fd, 'utf8')
        } catch (_error) {
            text = ''
        }
        return { info, text }
    } catch (_error) {
        return null
    } finally {
        closeSync(fd)
    }
}

const statOrNull = (file: string): { mtimeMs: number; size: number } | null => {
    try {
        return statSync(file)
    } catch (_error) {
        return null
    }
}

/** Mở `file` và quét bằng bộ quét theo byte; lỗi (không mở/đọc được): không ứng viên. */
const scanPathBytes = (file: string, scanner: ByteScanner, fresh: string[]): number => {
    try {
        const fd = openSync(file, 'r')
        try {
            return scanner.scanFd(fd, fstatSync(fd).size, fresh)
        } finally {
            closeSync(fd)
        }
    } catch (_error) {
        return 0
    }
}

/** `scanFiles` tuần tự bằng bộ quét theo byte (WASM): như nhánh tuần tự bản JS, đọc file thẳng vào bộ nhớ WASM. */
const scanFilesBytes = (
    files: string[],
    cache: Map<string, CandidateCacheEntry>,
    into: Set<string>,
    stats: Array<{ mtimeMs: number; size: number } | null> | null,
    scanner: ByteScanner,
): ScanFilesResult => {
    let scanned = 0
    const fresh: string[] = []
    scanner.begin()
    for (let index = 0; index < files.length; index++) {
        const file = files[index]
        const cached = cache.get(file)
        let info: { mtimeMs: number; size: number } | null = null
        // Số token của file đã quét ở bước mở; -1: chưa quét.
        let count = -1
        fresh.length = 0
        if (!stats && cached === undefined) {
            // Chưa có trong bộ nhớ đệm (build đầu): mở file một lần, fstat + đọc qua fd. Mở/fstat lỗi thì stat theo
            // đường dẫn (file không còn: bỏ qua) rồi đọc theo đường dẫn; đọc lỗi (thư mục...): không ứng viên.
            let fd = -1
            try {
                fd = openSync(file, 'r')
            } catch (_error) {
                fd = -1
            }
            if (fd >= 0) {
                try {
                    info = fstatSync(fd)
                    try {
                        count = scanner.scanFd(fd, info.size, fresh)
                    } catch (_error) {
                        count = 0
                    }
                } catch (_error) {
                    info = null
                } finally {
                    closeSync(fd)
                }
            }
            if (info === null) info = statOrNull(file)
        } else info = stats ? stats[index] : statOrNull(file)
        if (info === null) continue
        if (count < 0) {
            const list = cached && cached.mtime === info.mtimeMs && cached.size === info.size ? candidatesOfEntry(cached) : null
            if (list !== null) {
                for (let k = 0; k < list.length; k++) into.add(list[k])
                continue
            }
            count = scanPathBytes(file, scanner, fresh)
        }
        scanned++
        // Số hiệu của file nằm ở [idStart() - count, idStart()) trong idArena() (ghi xong mới đọc vị trí).
        cache.set(file, { mtime: info.mtimeMs, size: info.size, candidates: scanner.idArena(), at: scanner.idStart() - count, count, gen: scanner.generation(), scanner })
        // Token đã gặp ở file quét trước trong lượt này đã có trong `into`: chỉ thêm token mới.
        for (let k = 0; k < fresh.length; k++) into.add(fresh[k])
    }
    return { workers: 0, workerBatches: 0, scanned }
}

export interface ScanFilesResult {
    workers: number
    workerBatches: number
    /** Số file phải đọc + quét (không có hoặc đã cũ trong bộ nhớ đệm). */
    scanned: number
}

/**
 * Đọc + quét `files`, thêm ứng viên vào `into` theo đúng thứ tự như quét tuần tự từng file (file theo thứ tự,
 * trong file theo `scanCandidates`). `cache` (theo mtime + kích thước) giữ kết quả từng file cho lần build sau
 * (chế độ watch, bộ nhớ đệm trên đĩa).
 */
export const scanFiles = async (
    files: string[],
    cache: Map<string, CandidateCacheEntry>,
    into: Set<string>,
    /**
     * Cho test: `mainThread: false` — luồng chính không tự quét lô nào khi có luồng phụ; `minFiles` thay ngưỡng song
     * song; `bytes: false` — quét tuần tự bằng bản JS thay cho bộ quét theo byte.
     */
    options: { mainThread?: boolean; minFiles?: number; bytes?: boolean } = {},
): Promise<ScanFilesResult> => {
    // Song song khi có ít nhất PARALLEL_MIN_FILES file phải đọc lại: chưa có trong bộ nhớ đệm (build đầu), hoặc đã đổi
    // (đổi nhánh git, công cụ sinh mã ghi lại cả thư mục) — trường hợp sau phải stat trước để biết.
    const minFiles = options.minFiles ?? PARALLEL_MIN_FILES
    let workers = files.length >= minFiles ? workerCount() : 0
    let stats: Array<{ mtimeMs: number; size: number } | null> | null = null
    if (workers > 0) {
        let missing = 0
        for (const file of files) if (!cache.has(file)) missing++
        if (missing < minFiles) {
            stats = files.map(statOrNull)
            let stale = 0
            stats.forEach((info, index) => {
                const cached = info && cache.get(files[index])
                if (info && !(cached && cached.mtime === info.mtimeMs && cached.size === info.size)) stale++
            })
            if (stale < minFiles) workers = 0
        }
    }
    if (workers === 0 && options.bytes !== false) {
        const bytes = loadByteScanner()
        if (bytes) return scanFilesBytes(files, cache, into, stats, bytes)
    }
    if (workers === 0) {
        let scanned = 0
        const fresh: string[] = []
        mainScanner.begin()
        for (let index = 0; index < files.length; index++) {
            const file = files[index]
            const cached = cache.get(file)
            let info: { mtimeMs: number; size: number } | null
            let text: string | null = null
            if (!stats && cached === undefined) {
                // Chưa có trong bộ nhớ đệm (build đầu): mở file một lần, stat + đọc qua fd (một lần tra đường dẫn thay
                // cho hai). Mở lỗi thì stat theo đường dẫn như cũ (file không còn: bỏ qua; không đọc được: không ứng viên).
                const opened = openOrNull(file)
                info = opened ? opened.info : statOrNull(file)
                text = opened ? opened.text : null
            } else info = stats ? stats[index] : statOrNull(file)
            if (info === null) continue
            const list = cached && cached.mtime === info.mtimeMs && cached.size === info.size ? candidatesOfEntry(cached) : null
            if (list === null) {
                scanned++
                let count = 0
                fresh.length = 0
                try {
                    count = mainScanner.ids(text ?? readFileSync(file, 'utf8'), fresh)
                } catch (_error) {
                    count = 0
                }
                // Số hiệu của file nằm ở [idStart() - count, idStart()) trong idArena() (ghi xong mới đọc vị trí).
                const at = mainScanner.idStart() - count
                cache.set(file, { mtime: info.mtimeMs, size: info.size, candidates: mainScanner.idArena(), at, count, gen: mainScanner.generation(), scanner: mainScanner })
                // Token đã gặp ở file quét trước trong lượt này đã có trong `into`: chỉ thêm token mới.
                for (let k = 0; k < fresh.length; k++) into.add(fresh[k])
                continue
            }
            for (let k = 0; k < list.length; k++) into.add(list[k])
        }
        return { workers: 0, workerBatches: 0, scanned }
    }

    // Song song: luồng chính và các luồng phụ cùng lấy lô qua một bộ đếm dùng chung (lô nhỏ để chia đều khi máy bận).
    const batchSize = Math.max(32, Math.ceil(files.length / ((workers + 1) * 8)))
    const batchCount = Math.ceil(files.length / batchSize)
    const counter = new Int32Array(new SharedArrayBuffer(4))
    const local: Array<ReturnType<typeof scanRange> | undefined> = new Array(batchCount)
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
    for (let b = options.mainThread === false && done.length ? batchCount : Atomics.add(counter, 0, 1); b < batchCount; b = Atomics.add(counter, 0, 1)) {
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
                if (mtime !== null) cache.set(files[start + k], { mtime, size: batch.sizes[k], candidates: lists[k] })
            })
            if (batch.union) for (const candidate of batch.union.split(' ')) into.add(candidate)
            continue
        }
        const result = local[b] ?? scanRange(files, start, Math.min(start + batchSize, files.length), scanCandidates, readFileSync, statSync)
        result.mtimes.forEach((mtime, k) => {
            if (mtime === null) return
            cache.set(files[start + k], { mtime, size: result.sizes[k], candidates: result.lists[k] })
            for (const candidate of result.lists[k]) into.add(candidate)
        })
    }
    return { workers: done.length, workerBatches, scanned: files.length }
}
