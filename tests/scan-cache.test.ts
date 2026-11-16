import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { loadScanCache, resolveScanCacheDir, scanCacheKey, serializeScanCache } from '../src/scan-cache'
import type { CandidateCacheEntry } from '../src/scan'

const root = mkdtempSync(join(tmpdir(), 'ps-scan-cache-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

let counter = 0
const project = (files: Record<string, string>) => {
    const dir = join(root, `p${counter++}`)
    for (const [name, content] of Object.entries(files)) {
        mkdirSync(join(dir, name, '..'), { recursive: true })
        writeFileSync(join(dir, name), content)
    }
    return dir
}

/** Build trong "tiến trình mới": nạp lại module (bộ nhớ đệm trong tiến trình rỗng), ghi file đệm như lúc thoát. */
const freshBuild = async (dir: string, css = '@import "tailwindcss/utilities";', options: Record<string, unknown> = {}) => {
    vi.resetModules()
    const { compileTailwindCss } = await import('../src/postcss')
    const { flushScanCache } = await import('../src/scan-cache')
    const result = await compileTailwindCss(css, { base: dir, scanCache: join(dir, '.cache'), ...options })
    flushScanCache()
    return result
}

describe('bộ nhớ đệm quét trên đĩa', () => {
    it('build mới chỉ quét file đã đổi; xoá/đổi tên/sửa file cho đúng CSS như không có bộ nhớ đệm', async () => {
        const files: Record<string, string> = {}
        for (let i = 0; i < 30; i++) files[`src/c${i}.tsx`] = `export const C${i} = () => <div className="p-${i % 8} flex" />`
        files['src/only.tsx'] = '<div className="underline" />'
        files['src/rename-me.tsx'] = '<div className="italic" />'
        const dir = project(files)
        const reference = async () => (await freshBuild(dir, undefined, { scanCache: false })).css

        const first = await freshBuild(dir)
        expect(first.timings.scanned).toBe(32)
        expect(readdirSync(join(dir, '.cache')).filter((f) => f.endsWith('.cache'))).toHaveLength(1)

        // Không đổi gì: không đọc file nào, CSS trùng.
        const again = await freshBuild(dir)
        expect(again.timings.scanned).toBe(0)
        expect(again.css).toBe(first.css)
        expect(again.css).toBe(await reference())

        // Sửa một file (mtime mới).
        writeFileSync(join(dir, 'src/c3.tsx'), '<div className="grid" />')
        const later = new Date(Date.now() + 5000)
        utimesSync(join(dir, 'src/c3.tsx'), later, later)
        const edited = await freshBuild(dir)
        expect(edited.timings.scanned).toBe(1)
        expect(edited.css).toContain('.grid{')
        expect(edited.css).toBe(await reference())

        // Xoá một file: class của nó biến mất.
        unlinkSync(join(dir, 'src/only.tsx'))
        const removed = await freshBuild(dir)
        expect(removed.timings.scanned).toBe(0)
        expect(removed.css).not.toContain('.underline{')
        expect(removed.css).toBe(await reference())

        // Đổi tên: đọc file mới, kết quả như không có bộ nhớ đệm.
        renameSync(join(dir, 'src/rename-me.tsx'), join(dir, 'src/renamed.tsx'))
        const renamed = await freshBuild(dir)
        expect(renamed.timings.scanned).toBe(1)
        expect(renamed.css).toContain('.italic{')
        expect(renamed.css).toBe(await reference())

        // Cùng mtime nhưng khác kích thước: vẫn đọc lại.
        const target = join(dir, 'src/c5.tsx')
        const { mtime } = statSync(target)
        writeFileSync(target, '<div className="hidden block" />')
        utimesSync(target, mtime, mtime)
        const resized = await freshBuild(dir)
        expect(resized.timings.scanned).toBe(1)
        expect(resized.css).toContain('.hidden{')
        expect(resized.css).toBe(await reference())
    })

    it('đổi cấu hình (CSS vào) thì bỏ bộ nhớ đệm', async () => {
        const dir = project({ 'src/a.tsx': '<div className="flex" />', 'src/b.tsx': '<div className="grid" />' })
        expect((await freshBuild(dir)).timings.scanned).toBe(2)
        expect((await freshBuild(dir)).timings.scanned).toBe(0)
        const changed = await freshBuild(dir, '@import "tailwindcss/utilities"; @theme { --color-brand: red; }')
        expect(changed.timings.scanned).toBe(2)
        expect((await freshBuild(dir, '@import "tailwindcss/utilities"; @theme { --color-brand: red; }')).timings.scanned).toBe(0)
    })

    it('khoá đổi theo phiên bản/cấu hình; file đệm hỏng, cụt hoặc khác khoá bị bỏ qua', () => {
        expect(scanCacheKey({ css: 'a' })).not.toBe(scanCacheKey({ css: 'b' }))
        expect(scanCacheKey({ css: 'a' })).toBe(scanCacheKey({ css: 'a' }))
        vi.stubGlobal('__PRESENCE_STYLE_VERSION__', '9.9.9')
        const other = scanCacheKey({ css: 'a' })
        vi.unstubAllGlobals()
        expect(other).not.toBe(scanCacheKey({ css: 'a' }))

        const dir = project({ 'a.html': '<div class="flex p-4">' })
        const file = join(dir, 'a.html')
        const info = statSync(file)
        const cache = new Map<string, CandidateCacheEntry>([[file, { mtime: info.mtimeMs, size: info.size, candidates: ['flex', 'p-4'] }]])
        const content = serializeScanCache('k1', [file], cache)
        const cacheFile = join(dir, 'scan.cache')
        writeFileSync(cacheFile, content)
        const loaded = new Map<string, CandidateCacheEntry>()
        const snapshot = loadScanCache(cacheFile, 'k1', loaded)
        expect(snapshot?.files).toEqual([file])
        expect(snapshot?.tokens).toEqual(['flex', 'p-4'])
        expect(loaded.get(file)?.mtime).toBe(info.mtimeMs)
        expect(loadScanCache(cacheFile, 'k2', new Map())).toBeNull()
        writeFileSync(cacheFile, content.slice(0, -3))
        expect(loadScanCache(cacheFile, 'k1', new Map())).toBeNull()
        writeFileSync(cacheFile, 'rác')
        expect(loadScanCache(cacheFile, 'k1', new Map())).toBeNull()
        expect(loadScanCache(join(dir, 'không-có.cache'), 'k1', new Map())).toBeNull()
        expect(readFileSync(join(dir, 'a.html'), 'utf8')).toContain('flex')
    })

    it('thư mục đệm: node_modules/.cache của thư mục có package.json; tắt bằng false hoặc PRESENCE_STYLE_CACHE=0', () => {
        const dir = project({ 'package.json': '{}', 'src/x.tsx': '' })
        expect(resolveScanCacheDir(undefined, join(dir, 'src'))).toBe(join(dir, 'node_modules', '.cache', 'presence-style'))
        expect(resolveScanCacheDir(false, dir)).toBeNull()
        expect(resolveScanCacheDir('.c', dir)).toBe(join(dir, '.c'))
        const previous = process.env.PRESENCE_STYLE_CACHE
        process.env.PRESENCE_STYLE_CACHE = '0'
        try {
            expect(resolveScanCacheDir(undefined, dir)).toBeNull()
        } finally {
            if (previous === undefined) delete process.env.PRESENCE_STYLE_CACHE
            else process.env.PRESENCE_STYLE_CACHE = previous
        }
    })
})
