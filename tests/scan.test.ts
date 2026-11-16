import { mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { extractCandidates } from '../src/extract'
import { scanCandidates, scanFiles, type CandidateCacheEntry } from '../src/scan'

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

    it('bỏ qua đầu vào rỗng/không phải chuỗi như extractCandidates', () => {
        expect(scanCandidates('')).toEqual([])
        expect(scanCandidates(undefined as unknown as string)).toEqual([])
    })
})

describe('scanFiles', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ps-scan-'))
    afterAll(() => rmSync(dir, { recursive: true, force: true }))
    const sources = listSources(join(FIXTURES, 'hyperui')).concat(listSources(join(FIXTURES, 'shadcn-v4')))
    // Đủ nhiều file để dùng luồng phụ (ngưỡng 1500 file chưa có trong bộ nhớ đệm).
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
            const info = await scanFiles(files, cache, into)
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
            expect(parallel.cache.get(file)?.candidates).toEqual(sequential.cache.get(file)?.candidates)
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
})
