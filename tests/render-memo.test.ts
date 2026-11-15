import { afterEach, describe, expect, it, vi } from 'vitest'
import { xcss } from '../src/core'

describe('memo dựng rule và clsx', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('gọi clsx lặp lại cho cùng kết quả và không nhân bản rule', async () => {
        const instance = xcss()
        const built = instance.buildCss()
        await instance.ready

        const first = built.clsx('dF aiC p10px;16px', 'cRed@:hover')
        for (let i = 0; i < 50; i++) {
            expect(built.clsx('dF aiC p10px;16px', 'cRed@:hover')).toBe(first)
            expect(built.clsx('dF aiC p10px;16px cRed@:hover')).toBe(first)
        }
        const css = built.getCssString()
        expect(css.match(/display:flex/g)?.length).toBe(1)
        expect(css.match(/color:Red/g)?.length).toBe(1)
        built.destroy()
    })

    it('đối số falsy và mảng cho cùng kết quả như trước', async () => {
        const instance = xcss()
        const built = instance.buildCss()
        await instance.ready

        const expected = built.clsx('dF cRed')
        expect(built.clsx('dF', false, null, undefined, 'cRed')).toBe(expected)
        expect(built.clsx(['dF', ['cRed']])).toBe(expected)
        built.destroy()
    })

    it('tắt hash: class đã có rule vẫn trả đúng tên', async () => {
        const instance = xcss({ hashClassName: false })
        const built = instance.buildCss()
        await instance.ready

        expect(built.clsx('m10px bs-a')).toBe('m10px bs-a')
        expect(built.clsx('m10px bs-a')).toBe('m10px bs-a')
        expect(built.getCssString()).toContain('.m10px{margin:10px}')
        built.destroy()
    })

    it('destroy xoá memo: engine mới sinh lại CSS đầy đủ', async () => {
        const a = xcss().buildCss()
        a.clsx('m10px')
        a.destroy()
        const b = xcss().buildCss()
        b.clsx('m10px')
        expect(b.getCssString()).toContain('margin:10px')
        b.destroy()
    })

    it('không ném lỗi khi trình duyệt chặn truy cập localStorage', () => {
        const blocked = {}
        Object.defineProperty(blocked, 'localStorage', {
            get() {
                throw new Error('SecurityError: Access is denied for this document.')
            },
        })
        vi.stubGlobal('window', blocked)
        const engine = xcss({ cache: { loadOnInit: true } })
        expect(() => engine.buildCss(undefined)).not.toThrow()
        expect(() => engine.exportCache()).not.toThrow()
    })
})
