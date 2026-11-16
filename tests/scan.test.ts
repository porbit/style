import { mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { extractCandidates } from '../src/extract'
import { candidatesOfEntry, createScanner, scanCandidates, scanFiles, type CandidateCacheEntry } from '../src/scan'
import { createByteScanner, type ByteScanner } from '../src/scan-wasm'

const FIXTURES = join(__dirname, '..', 'eval', 'fixtures')
const SOURCE = /\.(html|tsx?|jsx?|mjs|md|mdx|vue|svelte)$/

const listSources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) return listSources(full)
        return SOURCE.test(entry.name) ? [full] : []
    })

// PRNG cố định để lỗi (nếu có) tái hiện được.
const random = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
}

describe('scanCandidates (bộ quét nhanh cho build Node)', () => {
    it('cho đúng kết quả và thứ tự của extractCandidates trên mọi file fixture', () => {
        const files = listSources(FIXTURES)
        expect(files.length).toBeGreaterThan(300)
        for (const file of files) {
            const source = readFileSync(file, 'utf8')
            expect(scanCandidates(source), file).toEqual(extractCandidates(source))
        }
    })

    it('trùng extractCandidates trên chuỗi ngẫu nhiên (nháy, ngoặc, class=, xuống dòng, khoảng trắng unicode)', () => {
        const pieces = ['"', "'", '`', '\n', ' ', '\t', ' ', '　', '[', ']', '(', ')', '{', '}', ',', ';', ':', '@', '!', '-', '_', '/', '#', '.', 'é', '😀', 'class=', 'className=', 'class = ', 'p-4', 'md:flex', 'w-[10px]', 'bg-[url(a.png)]', "cRed')", 'x', 'A1', '[a,b]', '[a b]', "[a'b]", '$', '&', '|', '=', '\\']
        const next = random(42)
        for (let iteration = 0; iteration < 5000; iteration++) {
            let source = ''
            const length = 1 + Math.floor(next() * 40)
            for (let i = 0; i < length; i++) source += pieces[Math.floor(next() * pieces.length)]
            expect(scanCandidates(source), JSON.stringify(source)).toEqual(extractCandidates(source))
        }
    })

    it('bộ ghi nhớ theo chuỗi và bảng token dùng chung giữa các lần gọi không đổi kết quả; `fresh` cho đúng hợp các file', () => {
        const scan = createScanner()
        const files = listSources(join(FIXTURES, 'hyperui')).slice(0, 80).concat(listSources(join(FIXTURES, 'coss-ui')))
        const union = new Set<string>()
        const fresh: string[] = []
        scan.begin()
        for (let pass = 0; pass < 2; pass++) {
            for (const file of files) {
                const source = readFileSync(file, 'utf8')
                // Lặp lại cùng chuỗi dài (gặp lại trong bộ ghi nhớ) ở thuộc tính class, chuỗi thường và sau dấu nháy lẻ.
                const repeated = `${source}\n<a class="flex items-center gap-2 px-[calc(1rem+2px)]" title="flex items-center gap-2 px-[calc(1rem+2px)]">'flex items-center gap-2 px-[calc(1rem+2px)]'</a>`
                for (const text of [source, repeated]) {
                    const expected = extractCandidates(text)
                    fresh.length = 0
                    expect(scan(text, pass ? undefined : fresh), file).toEqual(expected)
                    if (!pass) {
                        const before = new Set(union)
                        for (const token of expected) union.add(token)
                        expect(fresh).toEqual([...union].filter((token) => !before.has(token)))
                    }
                }
            }
        }
    })

    it('bỏ qua đầu vào rỗng/không phải chuỗi như extractCandidates', () => {
        expect(scanCandidates('')).toEqual([])
        expect(scanCandidates(undefined as unknown as string)).toEqual([])
    })
})

/** Ứng viên (theo thứ tự) của byte `content` qua bộ quét theo byte; `fresh` nhận token mới trong lượt. */
const scanBytes = (scanner: ByteScanner, content: Uint8Array, fresh: string[] = []): string[] => {
    const count = scanner.scanBuffer(content, fresh)
    const arena = scanner.idArena()
    const end = scanner.idStart()
    return Array.from(arena.subarray(end - count, end), (id) => scanner.token(id))
}

describe('bộ quét theo byte (WASM) cho scanFiles', () => {
    const scanner = createByteScanner()!

    it('nạp được (WebAssembly + SIMD có trên Node >= 20)', () => {
        expect(scanner).not.toBeNull()
    })

    it('cho đúng kết quả và thứ tự của extractCandidates trên mọi file fixture (đọc byte, không giải mã)', () => {
        const files = listSources(FIXTURES)
        for (const file of files) {
            const content = readFileSync(file)
            expect(scanBytes(scanner, content), file).toEqual(extractCandidates(content.toString('utf8')))
        }
    })

    it('trùng extractCandidates trên chuỗi ngẫu nhiên, gồm khoảng trắng unicode, ký tự nhiều byte và UTF-8 hỏng', () => {
        // Mảnh dạng byte: UTF-8 hợp lệ của mọi khoảng trắng `\s`, ký tự nhiều byte gần giống (U+2010, U+3001...), và
        // dãy hỏng (byte nối tiếp lẻ, byte đầu thiếu đuôi, dạng dài quá mức, BOM).
        const text = ['"', "'", '`', '\n', ' ', '\t', '\r', '\v', '\f', '\u00a0', '\u1680', '\u2000', '\u2005', '\u200a', '\u200b', '\u2010', '\u2028', '\u2029', '\u202f', '\u205f', '\u3000', '\u3001', '\ufeff', '\ufeef', '\u00a1', '[', ']', '(', ')', '{', '}', ',', ';', ':', '@', '!', '-', '_', '/', '#', '.', 'é', 'ữ', '😀', 'class', 'Name', '=', 'class=', 'className=', 'class = ', 'class\u00a0=\u3000', 'p-4', 'md:flex', 'w-[10px]', 'bg-[url(a.png)]', "cRed')", 'x', 'A1', '[a,b]', '[a b]', "[a'b]", '[a\u2028b]', '[a→b]', '$', '&', '|', '\\', 'flex items-center gap-2 px-[calc(1rem+2px)]']
        const raw = [[0x80], [0xbf], [0xc2], [0xe2, 0x80], [0xe2], [0xe1, 0x9a], [0xf0, 0x9f], [0xc0, 0xa0], [0xe0, 0x80, 0x80], [0xed, 0xa0, 0x80], [0xff], [0xc2, 0xc2, 0xa0], [0xe2, 0xe2, 0x80, 0xa8], [0xef, 0xbb]]
        const pieces: Buffer[] = [...text.map((t) => Buffer.from(t, 'utf8')), ...raw.map((b) => Buffer.from(b))]
        const next = random(7)
        for (let iteration = 0; iteration < 20000; iteration++) {
            const parts: Buffer[] = []
            const length = 1 + Math.floor(next() * 48)
            for (let i = 0; i < length; i++) parts.push(pieces[Math.floor(next() * pieces.length)])
            const content = Buffer.concat(parts)
            const source = content.toString('utf8')
            expect(scanBytes(scanner, content), JSON.stringify([...content])).toEqual(extractCandidates(source))
        }
    })

    it('chuỗi dài (qua bộ ghi nhớ và đường SIMD) lặp lại giữa các file; `fresh` cho đúng hợp các file', () => {
        const scan = createByteScanner()!
        const files = listSources(join(FIXTURES, 'hyperui')).slice(0, 80).concat(listSources(join(FIXTURES, 'coss-ui')))
        const union = new Set<string>()
        const fresh: string[] = []
        scan.begin()
        for (let pass = 0; pass < 2; pass++) {
            for (const file of files) {
                const source = readFileSync(file, 'utf8')
                const repeated = `${source}\n<a class="flex items-center gap-2 px-[calc(1rem+2px)]" title="flex items-center gap-2 px-[calc(1rem+2px)]">'flex items-center gap-2 px-[calc(1rem+2px)]'</a>`
                for (const text of [source, repeated]) {
                    const expected = extractCandidates(text)
                    fresh.length = 0
                    expect(scanBytes(scan, Buffer.from(text, 'utf8'), fresh), file).toEqual(expected)
                    if (!pass) {
                        const before = new Set(union)
                        for (const token of expected) union.add(token)
                        expect(fresh).toEqual([...union].filter((token) => !before.has(token)))
                    } else expect(fresh).toEqual([])
                }
            }
        }
        // Rỗng và rất dài (vùng nhận lớn lên, bộ nhớ WASM lớn lên giữa chừng).
        expect(scanBytes(scan, new Uint8Array(0))).toEqual([])
        const big = Buffer.from(Array.from({ length: 30000 }, (_, i) => `<div class="p-${i} m-[${i}px] flex">x</div>`).join('\n'), 'utf8')
        expect(scanBytes(scan, big)).toEqual(extractCandidates(big.toString('utf8')))
    })
})

describe('scanFiles', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-scan-'))
    afterAll(() => rmSync(dir, { recursive: true, force: true }))
    const sources = listSources(join(FIXTURES, 'hyperui')).concat(listSources(join(FIXTURES, 'shadcn-v4')))
    // Đủ nhiều file để dùng luồng phụ (ngưỡng hạ xuống 1500 file chưa có trong bộ nhớ đệm cho test).
    const files: string[] = []
    for (let copy = 0; files.length < 1700; copy++) {
        mkdirSync(join(dir, String(copy)))
        sources.forEach((source, index) => {
            const file = join(dir, String(copy), `${index}-${source.split(/[\\/]/).pop()}`)
            // Mỗi bản sao thêm một class riêng để thứ tự gộp giữa các lô có ý nghĩa.
            writeFileSync(file, readFileSync(source, 'utf8') + `\n<i class="copy-${copy}-${index % 7}"></i>`)
            files.push(file)
        })
    }
    files.splice(5, 0, join(dir, 'không-tồn-tại.html'))
    const expected = new Set<string>()
    for (const file of files) {
        let source: string
        try {
            source = readFileSync(file, 'utf8')
        } catch (_error) {
            continue
        }
        for (const candidate of extractCandidates(source)) expected.add(candidate)
    }

    const run = async (workers: string, cache = new Map<string, CandidateCacheEntry>()) => {
        const previous = process.env.PRESENCE_STYLE_WORKERS
        process.env.PRESENCE_STYLE_WORKERS = workers
        try {
            const into = new Set<string>(['inline-first'])
            // Luồng chính không tự quét lô: luồng phụ chắc chắn làm việc (luồng chính đã nóng thì xong trước khi chúng khởi động).
            const info = await scanFiles(files, cache, into, { minFiles: 1500, mainThread: false })
            return { info, list: [...into], cache }
        } finally {
            if (previous === undefined) delete process.env.PRESENCE_STYLE_WORKERS
            else process.env.PRESENCE_STYLE_WORKERS = previous
        }
    }

    it('song song và tuần tự cho cùng tập ứng viên, cùng thứ tự như quét từng file', async () => {
        const sequential = await run('0')
        expect(sequential.info.workers).toBe(0)
        expect(sequential.list).toEqual(['inline-first', ...expected])
        const parallel = await run('2')
        expect(parallel.info.workers).toBe(2)
        expect(parallel.info.workerBatches).toBeGreaterThan(0)
        expect(parallel.list).toEqual(sequential.list)
        // Bộ nhớ đệm từ luồng phụ dùng lại được (lần sau đọc theo mtime, tuần tự).
        expect(parallel.cache.has(files[5])).toBe(false)
        const again = await run('2', parallel.cache)
        expect(again.info.workers).toBe(0)
        expect(again.list).toEqual(sequential.list)
        for (const file of files.slice(0, 50)) {
            if (file === files[5]) continue
            expect(candidatesOfEntry(parallel.cache.get(file)!)).toEqual(candidatesOfEntry(sequential.cache.get(file)!))
        }
        // Mọi file đổi mtime (đổi nhánh git): đọc lại song song dù đã có bộ nhớ đệm.
        const later = new Date(Date.now() + 60_000)
        for (const file of files) if (file !== files[5]) utimesSync(file, later, later)
        const touched = await run('2', parallel.cache)
        expect(touched.info.workers).toBe(2)
        expect(touched.list).toEqual(sequential.list)
        // Một file đổi nội dung: đọc lại riêng file đó (tuần tự), class mới nằm đúng vị trí của file.
        writeFileSync(files[0], '<b class="moi-them"></b>')
        const edited = await run('2', touched.cache)
        expect(edited.info.workers).toBe(0)
        const reference = new Set<string>(['inline-first'])
        for (const file of files) {
            if (file === files[5]) continue
            for (const candidate of extractCandidates(readFileSync(file, 'utf8'))) reference.add(candidate)
        }
        expect(edited.list).toEqual([...reference])
    }, 60_000)

    it('bộ quét theo byte và bản JS cho cùng tập ứng viên, cùng thứ tự, cùng bộ nhớ đệm; dùng lại mục của nhau', async () => {
        const viaBytes = { cache: new Map<string, CandidateCacheEntry>(), into: new Set<string>(['inline-first']) }
        const viaJs = { cache: new Map<string, CandidateCacheEntry>(), into: new Set<string>(['inline-first']) }
        const a = await scanFiles(files, viaBytes.cache, viaBytes.into)
        const b = await scanFiles(files, viaJs.cache, viaJs.into, { bytes: false })
        expect(a.scanned).toBe(b.scanned)
        expect([...viaBytes.into]).toEqual([...viaJs.into])
        // (Test trước đã sửa files[0]: tính lại kết quả mong đợi từ nội dung hiện tại.)
        const reference = new Set<string>(['inline-first'])
        for (const file of files) {
            if (file === files[5]) continue
            for (const candidate of extractCandidates(readFileSync(file, 'utf8'))) reference.add(candidate)
        }
        expect([...viaBytes.into]).toEqual([...reference])
        for (const file of files.slice(0, 200)) {
            if (file === files[5]) continue
            expect(candidatesOfEntry(viaBytes.cache.get(file)!), file).toEqual(candidatesOfEntry(viaJs.cache.get(file)!))
        }
        // Thư mục và file không đọc được: như readFileSync lỗi (không ứng viên, vẫn có mục bộ nhớ đệm).
        const odd = [join(dir, '0'), files[0], join(dir, 'không-tồn-tại.html')]
        const oddBytes = new Map<string, CandidateCacheEntry>()
        const oddJs = new Map<string, CandidateCacheEntry>()
        const intoBytes = new Set<string>()
        const intoJs = new Set<string>()
        await scanFiles(odd, oddBytes, intoBytes)
        await scanFiles(odd, oddJs, intoJs, { bytes: false })
        expect([...intoBytes]).toEqual([...intoJs])
        expect([...oddBytes.keys()]).toEqual([...oddJs.keys()])
        expect(candidatesOfEntry(oddBytes.get(odd[0])!)).toEqual([])
    }, 60_000)
})
