import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { runInit } from '../src/init'
import { handleRequest } from '../src/mcp'

describe('presence-style init', () => {
    let dir = ''
    afterEach(async () => {
        if (dir) await rm(dir, { recursive: true, force: true })
    })

    it('tạo config, khối quy tắc, CLAUDE.md và cấu hình MCP; chạy lại không nhân bản', async () => {
        dir = await mkdtemp(join(tmpdir(), 'ps-init-'))
        await writeFile(join(dir, 'AGENTS.md'), '# Quy tắc dự án\n\nDùng pnpm.\n')
        await mkdir(join(dir, '.vscode'))
        await writeFile(join(dir, '.vscode', 'mcp.json'), JSON.stringify({ servers: { other: { command: 'x' } } }))

        const first = await runInit({ cwd: dir, agents: true, mcp: true })
        expect(first.created.map((f) => f.slice(dir.length + 1)).sort()).toEqual(['.cursor/mcp.json', '.mcp.json', 'CLAUDE.md', 'presence-style.config.json'])
        expect(first.updated.map((f) => f.slice(dir.length + 1)).sort()).toEqual(['.vscode/mcp.json', 'AGENTS.md'])

        const agents = await readFile(join(dir, 'AGENTS.md'), 'utf8')
        expect(agents).toContain('Dùng pnpm.')
        expect(agents).toContain('<!-- presence-style:start -->')
        expect(agents).toContain('fix_classes')
        expect(await readFile(join(dir, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n')
        const vscode = JSON.parse(await readFile(join(dir, '.vscode', 'mcp.json'), 'utf8'))
        expect(Object.keys(vscode.servers).sort()).toEqual(['other', 'presence-style'])
        expect(vscode.servers['presence-style'].type).toBe('stdio')

        const second = await runInit({ cwd: dir, agents: true, mcp: true })
        expect(second.skipped.map((f) => f.slice(dir.length + 1)).sort()).toEqual(['AGENTS.md', 'CLAUDE.md', 'presence-style.config.json'])
        const again = await readFile(join(dir, 'AGENTS.md'), 'utf8')
        expect(again.split('presence-style:start').length).toBe(2)
    })

    it('không sửa file JSON hỏng', async () => {
        dir = await mkdtemp(join(tmpdir(), 'ps-init-'))
        await writeFile(join(dir, '.mcp.json'), '{ hỏng')
        const result = await runInit({ cwd: dir, mcp: true })
        expect(result.skipped.some((s) => s.includes('.mcp.json'))).toBe(true)
        expect(await readFile(join(dir, '.mcp.json'), 'utf8')).toBe('{ hỏng')
    })

    it('MCP có resource quy tắc agent và prompt dùng chung quy tắc', async () => {
        const ctx = { root: process.cwd() }
        const res: any = await handleRequest({ jsonrpc: '2.0', id: 1, method: 'resources/read', params: { uri: 'presence-style://docs/agent-rules' } }, ctx)
        expect(res.contents[0].text).toContain('Cú pháp')
        const prompt: any = await handleRequest({ jsonrpc: '2.0', id: 2, method: 'prompts/get', params: { name: 'build_ui', arguments: { request: 'trang giá' } } }, ctx)
        expect(prompt.messages[0].content.text).toContain('trang giá')
        expect(prompt.messages[0].content.text).toContain('fix_classes')
    })
})
