import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeClasses, findClassAttributes, findClassTokens, fixClasses, isXcssLike, sortClasses, sortClassesInSource } from '../src/analyze'
import { runCli } from '../src/cli'
import { setTailwindFallback, suggestClassFix } from '../src/analyze'
import { tailwindFixFallback } from '../src/tailwind'

describe('analyze', () => {
    it('tìm thuộc tính class tĩnh, bỏ qua biểu thức động', () => {
        const src = `<div class="dF aiC"><b className='p4px'/><i className={"m0"}/><p className={a ? 'x' : 'y'}/></div>`
        expect(findClassAttributes(src).map((r) => r.value)).toEqual(['dF aiC', 'p4px', 'm0'])
        const tokens = findClassTokens(src)
        expect(tokens.map((t) => src.slice(t.start, t.end))).toEqual(['dF', 'aiC', 'p4px', 'm0'])
    })

    it('isXcssLike phân biệt class x-css với class thư viện khác', () => {
        expect(isXcssLike('dF')).toBe(true)
        expect(isXcssLike('view-transition-name[hero]')).toBe(true)
        expect(isXcssLike('--brand[#fff]')).toBe(true)
        expect(isXcssLike('btn')).toBe(false)
        expect(isXcssLike('card-title')).toBe(false)
    })

    it('sortClasses: class lạ trước, rồi media, layer, nhóm property, selector', () => {
        expect(sortClasses('md:p20px cRed@:hover btn bgc#fff dF 2m0 p10px posR')).toBe('btn posR dF p10px bgc#fff cRed@:hover 2m0 md:p20px')
        expect(sortClassesInSource('<a class="p1px dF">')).toBe('<a class="dF p1px">')
        const untouched = '<a class="dF p1px">'
        expect(sortClassesInSource(untouched)).toBe(untouched)
    })

    it('analyzeClasses và fixClasses', () => {
        const a = analyzeClasses('dF fz14px p1px p2px')
        expect(a.items.find((i) => i.class === 'fz14px')?.suggestion).toBe('fns14px')
        expect(a.conflicts).toHaveLength(1)
        expect(fixClasses('df ai[center]').output).toBe('dF aiC')
        expect(fixClasses('ai[center]', { compact: false }).output).toBe('ai[center]')
    })
})

describe('suggestClassFix: các dạng lỗi khái quát', () => {
    it('tên CSS viết liền, alias tự đoán, từ khoá có dấu gạch', () => {
        expect(suggestClassFix('fontsize14px')).toBe('fns14px')
        expect(suggestClassFix('boxshadow[0_1px_2px_#000]')).toBe('bxsh[0_1px_2px_#000]')
        expect(suggestClassFix('bdf[blur(4px)]')).toBe('bkdf[blur(4px)]')
        expect(suggestClassFix('dinlineblock')).toBe('dIb')
        expect(suggestClassFix('cur-pointer')).toBe('crP')
        expect(suggestClassFix('ttu')).toBe('ttrU')
        // Không đoán bừa.
        expect(suggestClassFix('xyz123')).toBeNull()
        expect(suggestClassFix('vah')).toBeNull()
        // Hợp lệ sẵn thì không sửa.
        expect(suggestClassFix('colorRed')).toBeNull()
    })

    it('thói quen Tailwind khi bật fallback; số thiếu đơn vị không được coi là hợp lệ', () => {
        setTailwindFallback(tailwindFixFallback)
        try {
            expect(suggestClassFix('w-full')).toBe('w100%')
            expect(suggestClassFix('mt-4')).toBe('mt16px')
            expect(suggestClassFix('text-center')).toBe('taC')
        } finally {
            setTailwindFallback(null)
        }
        expect(suggestClassFix('w-full')).toBeNull()
    })
})

describe('CLI check / sort', () => {
    let dir = ''
    afterEach(async () => {
        vi.restoreAllMocks()
        if (dir) await rm(dir, { recursive: true, force: true })
    })

    it('check báo lỗi kèm vị trí và trả mã 1; sort --write sắp xếp file', async () => {
        dir = await mkdtemp(join(tmpdir(), 'ps-cli-'))
        const file = join(dir, 'App.jsx')
        await writeFile(file, `<div className="btn p10px dF fz14px">\n  <i className="p1px p2px" />\n</div>`)
        const out: string[] = []
        vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => (out.push(String(chunk)), true))
        vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

        expect(await runCli(['check', dir])).toBe(1)
        const text = out.join('')
        expect(text).toContain('App.jsx:1:')
        expect(text).toContain('`fz14px` không sinh CSS → `fns14px`')
        expect(text).toContain('xung đột padding: p1px p2px')
        expect(text).not.toContain('`btn`')

        expect(await runCli(['sort', dir, '--check'])).toBe(1)
        expect(await runCli(['sort', dir, '--write'])).toBe(0)
        expect(await readFile(file, 'utf8')).toContain('className="btn fz14px dF p10px"')
        expect(await runCli(['sort', dir, '--check'])).toBe(0)
    })
})
