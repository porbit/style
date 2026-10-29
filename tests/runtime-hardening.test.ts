import { describe, expect, it, vi } from 'vitest'
import { xcss } from '../src/core'
import { createSharedInstance } from '../src/index'

describe('gia cố runtime', () => {
    it('destroy() nên dọn tài nguyên và gọi lại được nhiều lần', async () => {
        const instance = xcss()
        const built = instance.buildCss()
        built.clsx('m10px')
        await instance.ready

        expect(() => built.destroy()).not.toThrow()
        expect(() => built.destroy()).not.toThrow()
    })

    it('shared instance nên expose destroy() an toàn khi không có DOM', () => {
        const shared = createSharedInstance()
        shared.clsx('m10px')
        expect(() => shared.destroy()).not.toThrow()
    })

    it('silent nên chặn cảnh báo khi dictionary URL lỗi', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const noisy = xcss({ dictionaryImport: 'https://invalid.invalid/không-tồn-tại.js' })
        await noisy.ready
        const noisyCalls = warnSpy.mock.calls.length
        expect(noisyCalls).toBeGreaterThan(0)

        warnSpy.mockClear()
        const silent = xcss({ dictionaryImport: 'https://invalid.invalid/không-tồn-tại.js', silent: true })
        await silent.ready
        expect(warnSpy.mock.calls.length).toBe(0)

        warnSpy.mockRestore()
    })

    it('maxCacheEntries nên chặn memo cache phình vô hạn mà vẫn đúng kết quả', async () => {
        const instance = xcss({ maxCacheEntries: 8 })
        const built = instance.buildCss()
        await instance.ready

        for (let i = 0; i < 100; i++) {
            built.clsx(`m${i}px`)
        }
        await Promise.resolve()

        const css = built.getCssString()
        expect(css).toContain('margin:0px')
        expect(css).toContain('margin:99px')
        built.destroy()
    })

    it('cùng một class nên cho cùng kết quả dù cache bị xoá giữa chừng', async () => {
        const instance = xcss({ maxCacheEntries: 2 })
        const built = instance.buildCss()
        await instance.ready

        const first = built.clsx('p10px')
        built.clsx('m1px')
        built.clsx('m2px')
        built.clsx('m3px')
        const second = built.clsx('p10px')

        expect(second).toBe(first)
        built.destroy()
    })

    it('hoverMedia và autoprefix phải đổi configHash để không hydrate nhầm cache', async () => {
        const plain = xcss()
        const hover = xcss({ hoverMedia: true })
        const prefixed = xcss({ autoprefix: true })

        const a = plain.buildCss()
        const b = hover.buildCss()
        const c = prefixed.buildCss()

        a.clsx('dF@:hover')
        b.clsx('dF@:hover')
        c.clsx('dF@:hover')

        await Promise.all([plain.ready, hover.ready, prefixed.ready])
        await Promise.resolve()

        // hoverMedia bọc thêm @media (hover: hover) -> CSS khác hẳn bản mặc định.
        expect(a.getCssString()).not.toContain('hover: hover')
        expect(b.getCssString()).toContain('hover: hover')
        expect(c.getCssString()).toContain('display:flex')

        a.destroy()
        b.destroy()
        c.destroy()
    })
})
