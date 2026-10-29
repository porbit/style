import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runCli } from '../src/cli'

// Gom stdout/stderr để kiểm chứng CLI mà không làm nhiễu log của test runner.
let stdout = ''
let stderr = ''

beforeEach(() => {
    stdout = ''
    stderr = ''
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
        stdout += String(chunk)
        return true
    })
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: any) => {
        stderr += String(chunk)
        return true
    })
})

afterEach(() => {
    vi.restoreAllMocks()
})

const createFixture = async () => {
    const dir = await mkdtemp(join(tmpdir(), 'presence-style-cli-'))
    await mkdir(join(dir, 'src'), { recursive: true })
    await writeFile(join(dir, 'index.html'), '<div class="m10px bs-a"></div>', 'utf8')
    await writeFile(
        join(dir, 'src', 'App.tsx'),
        `export const App = () => <div className="dF md:dN" />`,
        'utf8',
    )
    return dir
}

describe('CLI presence-style', () => {
    it('nên in trợ giúp và trả mã 0 với --help', async () => {
        const code = await runCli(['extract', '--help'])
        expect(code).toBe(0)
        expect(stdout).toContain('presence-style')
        expect(stdout).toContain('--out')
    })

    it('nên in trợ giúp với --help ở cấp cao nhất', async () => {
        expect(await runCli(['--help'])).toBe(0)
        expect(stdout).toContain('presence-style')
        stdout = ''
        expect(await runCli(['-h'])).toBe(0)
        expect(stdout).toContain('presence-style')
        stdout = ''
        expect(await runCli(['help'])).toBe(0)
        expect(stdout).toContain('presence-style')
    })

    it('nên in trợ giúp và trả mã 1 khi không có lệnh', async () => {
        const code = await runCli([])
        expect(code).toBe(1)
        expect(stdout).toContain('presence-style')
    })

    it('nên báo lỗi khi thiếu đường dẫn nguồn', async () => {
        const code = await runCli(['extract'])
        expect(code).toBe(1)
        expect(stderr).toContain('Thiếu đường dẫn nguồn')
    })

    it('nên báo lỗi với lệnh không hỗ trợ', async () => {
        const code = await runCli(['build'])
        expect(code).toBe(1)
        expect(stderr).toContain('Lệnh không hỗ trợ')
    })

    it('nên trích xuất CSS từ thư mục và ghi ra file', async () => {
        const dir = await createFixture()
        const out = join(dir, 'out.css')
        const map = join(dir, 'map.json')

        const code = await runCli(['extract', dir, '--out', out, '--map', map, '--silent'])
        expect(code).toBe(0)

        const css = await readFile(out, 'utf8')
        expect(css).toContain('margin:10px')
        expect(css).toContain('display:flex')
        expect(css).toContain('screen and (min-width: 768px)')
        expect(css).not.toContain('bs-a')

        const classMap = JSON.parse(await readFile(map, 'utf8'))
        expect(classMap['m10px']).toBeTruthy()
        expect(classMap['bs-a']).toBeUndefined()
    })

    it('nên áp dụng file cấu hình JSON', async () => {
        const dir = await createFixture()
        const config = join(dir, 'presence-style.config.json')
        const out = join(dir, 'out.css')
        await writeFile(
            config,
            JSON.stringify({ breakpoints: [{ md: 'screen and (min-width: 1000px)' }], safelist: ['p4px'] }),
            'utf8',
        )

        const code = await runCli(['extract', dir, '--out', out, '--config', config, '--silent'])
        expect(code).toBe(0)

        const css = await readFile(out, 'utf8')
        expect(css).toContain('screen and (min-width: 1000px)')
        expect(css).toContain('padding:4px')
    })
})
