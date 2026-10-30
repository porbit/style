import { describe, expect, it } from 'vitest'
import { extract, extractCandidates, extractFromClasses } from '../src/extract'

describe('static extraction', () => {
    it('nên tách class từ thuộc tính class của HTML', () => {
        const candidates = extractCandidates('<div class="dF aiC p10px"></div>')
        expect(candidates).toContain('dF')
        expect(candidates).toContain('aiC')
        expect(candidates).toContain('p10px')
    })

    it('nên tách class từ className của JSX và clsx', () => {
        const source = `const A = () => <div className={clsx('dF jcC', active && 'cRed')} />`
        const candidates = extractCandidates(source)
        expect(candidates).toContain('dF')
        expect(candidates).toContain('jcC')
        expect(candidates).toContain('cRed')
    })

    it('nên sinh CSS tĩnh cho class hợp lệ và bỏ qua class không hợp lệ', async () => {
        const result = await extract('<div class="m10px bs-a"></div>')
        expect(result.css).toContain('margin:10px')
        expect(result.classMap['m10px']).toBeTruthy()
        expect(result.classMap['bs-a']).toBeUndefined()
        expect(result.matched).toBe(1)
    })

    it('nên tôn trọng safelist và cấu hình media', async () => {
        const result = await extractFromClasses([], {
            safelist: ['md:dF'],
        })
        expect(result.css).toContain('screen and (min-width: 768px)')
        expect(result.css).toContain('display:flex')
    })

    it('nên áp dụng breakpoint custom ghi đè key mặc định', async () => {
        const result = await extractFromClasses(['md:dF'], {
            breakpoints: [{ md: 'screen and (min-width: 1000px)' }],
        })
        expect(result.css).toContain('screen and (min-width: 1000px)')
        expect(result.css).not.toContain('min-width: 768px')
    })

    it('không được nuốt cú pháp mã nguồn vào token class', async () => {
        const source = `clsx('fz14px', active && 'cRed')`
        const candidates = extractCandidates(source)
        expect(candidates).toContain('cRed')
        expect(candidates).not.toContain("cRed')")

        const result = await extract(source)
        expect(result.css).toContain('color:Red')
        expect(result.css).not.toContain("Red')")
    })

    it('nên giữ nguyên giá trị arbitrary có ngoặc cân bằng', () => {
        const candidates = extractCandidates('<div class="w[calc(100%-10px)]"></div>')
        expect(candidates).toContain('w[calc(100%-10px)]')
    })

    it('nên giữ nguyên tên class khi tắt hashClassName', async () => {
        const result = await extractFromClasses(['m10px'], { hashClassName: false })
        expect(result.css).toContain('margin:10px')
    })

    it('nên đếm matched đúng khi tắt hashClassName', async () => {
        const result = await extractFromClasses(['dF', 'cRed', 'khongHopLe'], { hashClassName: false })
        expect(result.matched).toBe(2)
        expect(result.classMap).toEqual({})
        expect(result.css).toContain('.dF{display:flex}')
        expect(result.css).toContain('.cRed{color:Red}')
    })

    it('nên nhận dấu phẩy nằm trong ngoặc vuông của giá trị', async () => {
        const source = `<div class="ff[Inter,system-ui,sans-serif] dF"></div>`
        const candidates = extractCandidates(source)
        expect(candidates).toContain('ff[Inter,system-ui,sans-serif]')
        expect(candidates).toContain('dF')
        const result = await extract(source, { hashClassName: false })
        expect(result.css).toContain('font-family:Inter,system-ui,sans-serif')
    })

    it('không để dấu phẩy ngoài ngoặc làm dính các class của clsx', () => {
        const candidates = extractCandidates(`clsx('dF', active && 'cRed', ['aiC', 'jcC'])`)
        expect(candidates).toEqual(expect.arrayContaining(['dF', 'cRed', 'aiC', 'jcC']))
    })

    it('nên từ chối giá trị có thể thoát khỏi khối rule khi trích xuất tĩnh', async () => {
        const hostile = [
            'c[red}body{display:none]',
            'c[red</style><script>alert(1)</script>]',
            'c[red/*]',
            'cRed@:hover</style>',
        ]
        const result = await extractFromClasses([...hostile, 'dF'], { hashClassName: false })
        expect(result.matched).toBe(1)
        expect(result.css).not.toContain('body{')
        expect(result.css).not.toContain('</style>')
        expect(result.css).toContain('.dF{display:flex}')
    })

    it('tách ứng viên có khoảng trắng thành từng class khi đếm matched', async () => {
        const result = await extractFromClasses(['dF cRed', 'c[red\nbackground:lime]'], { hashClassName: false })
        expect(result.candidates).toEqual(['dF', 'cRed', 'c[red', 'background:lime]'])
        expect(result.matched).toBe(2)
        expect(result.css).not.toContain('lime')
    })
})
