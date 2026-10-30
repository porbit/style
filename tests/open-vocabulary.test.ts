import { describe, expect, it } from 'vitest'
import { xcss } from '../src/core'

// Sinh CSS ở chế độ không DOM và trả về phần khai báo của từng class.
const declarationOf = (className: string, config = {}): string | null => {
    const instance = xcss({ hashClassName: false, ...config })
    const built = instance.buildCss(undefined)
    built.clsx(className)
    const css = built.getCssString()
    built.destroy()
    const match = css.match(/\{([^{}]*)\}\}?\s*$/m)
    return match ? match[1] : null
}

describe('từ vựng mở: không bị giới hạn ở bộ alias viết tắt', () => {
    it('nhận mọi property CSS chuẩn viết đủ tên', () => {
        expect(declarationOf('view-transition-nameHero')).toBe('view-transition-name:Hero')
        expect(declarationOf('content-visibility[auto]')).toBe('content-visibility:auto')
        expect(declarationOf('field-sizing[content]')).toBe('field-sizing:content')
        expect(declarationOf('text-wrap[balance]')).toBe('text-wrap:balance')
    })

    it('nhận custom property dạng --ten[gia-tri]', () => {
        expect(declarationOf('--brand[#0a64e8]')).toBe('--brand:#0a64e8')
        expect(declarationOf('--gap[8px]')).toBe('--gap:8px')
    })

    it('từ chối custom property mơ hồ không có ngoặc vuông', () => {
        expect(declarationOf('--cRed')).toBeNull()
        expect(declarationOf('--brandX')).toBeNull()
    })

    it('nhận property có tiền tố nhà cung cấp', () => {
        expect(declarationOf('-webkit-line-clamp[3]')).toBe('-webkit-line-clamp:3')
    })

    it('vẫn từ chối tên property không tồn tại', () => {
        expect(declarationOf('khongTonTai10px')).toBeNull()
        expect(declarationOf('unknownprop10')).toBeNull()
    })

    it('mọi property chuẩn của trình duyệt đều có đường vào bằng tên đầy đủ', () => {
        // Mẫu property chuẩn không nằm trong bảng alias viết tắt.
        for (const name of ['anchor-name', 'position-area', 'scroll-timeline', 'view-timeline', 'interpolate-size', 'margin-trim']) {
            expect(declarationOf(`${name}[x]`)).toBe(`${name}:x`)
        }
    })
})

describe('giá trị tuỳ ý có khoảng trắng', () => {
    it('`_` trong ngoặc vuông là khoảng trắng', () => {
        expect(declarationOf('w[calc(100%_-_2rem)]')).toBe('width:calc(100% - 2rem)')
        expect(declarationOf('ff[Segoe_UI,sans-serif]')).toBe('font-family:Segoe UI,sans-serif')
        expect(declarationOf('mx[1px_2px]')).toBe('margin-left:1px 2px;margin-right:1px 2px')
    })

    it('`\\_` giữ dấu gạch dưới nguyên văn và url(...) không bị đổi', () => {
        expect(declarationOf('content[a\\_b]')).toBe('content:a_b')
        expect(declarationOf('bgi[url(/a_b.png)]')).toBe('background-image:url(/a_b.png)')
    })

    it('cách viết `;` cũ vẫn dùng được', () => {
        expect(declarationOf('w[calc(100%;-;2rem)]')).toBe('width:calc(100% - 2rem)')
    })
})

describe('số âm bắt đầu bằng dấu chấm', () => {
    it('`m-.5rem` là margin: -.5rem', () => {
        expect(declarationOf('m-.5rem')).toBe('margin:-.5rem')
        expect(declarationOf('mt-.5rem')).toBe('margin-top:-.5rem')
    })

    it('không làm đổi các dạng đang chạy', () => {
        expect(declarationOf('m.5rem')).toBe('margin:.5rem')
        expect(declarationOf('m-0.5rem')).toBe('margin:-0.5rem')
        expect(declarationOf('m-10px')).toBe('margin:-10px')
    })
})
