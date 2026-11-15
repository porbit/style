import { PassThrough } from 'node:stream'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { handleRequest, startMcpServer, TOOLS } from '../src/mcp'
import { MCP_CLIENTS, renderMcpConfig } from '../src/mcp-config'

const ctx = { root: resolve(__dirname, '..') }
const call = (name: string, args: Record<string, unknown>) =>
    handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, ctx) as Promise<any>

describe('MCP server', () => {
    it('initialize trả phiên bản giao thức được hỗ trợ', async () => {
        const res: any = await handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, ctx)
        expect(res.protocolVersion).toBe('2025-03-26')
        const fallback: any = await handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, ctx)
        expect(fallback.protocolVersion).toBe('2025-06-18')
        expect(fallback.capabilities.tools).toBeDefined()
    })

    it('tools/list có đủ tool với inputSchema', async () => {
        const res: any = await handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, ctx)
        expect(res.tools.map((t: any) => t.name)).toEqual(TOOLS.map((t) => t.name))
        res.tools.forEach((t: any) => expect(t.inputSchema.type).toBe('object'))
    })

    it('explain_class nhận diện lỗi hay gặp', async () => {
        const res = await call('explain_class', { classes: 'dF df fz14px hover:cRed' })
        const items = res.structuredContent.items
        expect(items[0].valid).toBe(true)
        expect(items[1].hints.join(' ')).toContain('`dF`')
        expect(items[2].hints.join(' ')).toContain('fns')
        expect(items[3].hints.join(' ')).toContain('cRed@:hover')
    })

    it('fix_classes tự sửa lỗi hay gặp và báo xung đột', async () => {
        const res = await call('fix_classes', { classes: 'df posa fz14px hover:bgc#fff focus:cred op0.5 ai[center] p10px p20px xyz123 mah10px' })
        const out = res.structuredContent
        expect(out.output).toBe('dF posA fns14px bgc#fff@:hover cRed@:focus opc0.5 aiC p10px p20px xyz123 mh10px')
        expect(out.unresolved).toEqual(['xyz123'])
        expect(out.conflicts[0].tokens).toEqual(['p10px', 'p20px'])
        const explain = await call('explain_class', { classes: 'cred' })
        expect(explain.structuredContent.items[0].suggestion).toBe('cRed')
    })

    it('convert_tailwind mặc định rút gọn output', async () => {
        const res = await call('convert_tailwind', { classes: 'flex items-center h-10' })
        expect(res.structuredContent.output).toBe('dF aiC h40px')
        const raw = await call('convert_tailwind', { classes: 'items-center', compact: false })
        expect(raw.structuredContent.output).toBe('ai[center]')
    })

    it('generate_css và get_component', async () => {
        const css = await call('generate_css', { classes: 'm10px bogus', includeTheme: true })
        expect(css.structuredContent.css).toContain('margin:10px')
        expect(css.structuredContent.css).toContain('--ps-primary')
        expect(css.structuredContent.unmatched).toEqual(['bogus'])
        const recipe = await call('get_component', { recipe: 'badge', props: { tone: 'success' } })
        expect(recipe.content[0].text).toContain('c--ps-success')
        const missing = await call('get_component', { name: 'khong-co' })
        expect(missing.isError).toBe(true)
    })

    it('extract_css chặn đường dẫn ngoài workspace', async () => {
        const res = await call('extract_css', { paths: ['/etc'] })
        expect(res.isError).toBe(true)
        const ok = await call('extract_css', { source: '<div class="dF p10px"></div>' })
        expect(ok.structuredContent.matched).toBe(2)
    })

    it('lookup_dictionary và convert_tailwind', async () => {
        const dict = await call('lookup_dictionary', { query: 'font-size' })
        expect(dict.structuredContent.results[0].alias).toBe('fns')
        const tw = await call('convert_tailwind', { classes: 'flex p-4' })
        expect(tw.structuredContent.output).toBe('dF p16px')
    })

    it('stdio: trả lời theo dòng, bỏ qua notification, báo lỗi method lạ', async () => {
        const input = new PassThrough()
        const output = new PassThrough()
        const chunks: string[] = []
        output.on('data', (c) => chunks.push(c.toString()))
        const done = startMcpServer({ input, output, root: ctx.root })
        input.write('{"jsonrpc":"2.0","id":1,"method":"ping"}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
        input.end('{"jsonrpc":"2.0","id":2,"method":"khong/co"}\nnot-json\n')
        await done
        const lines = chunks.join('').trim().split('\n').map((l) => JSON.parse(l))
        expect(lines.find((l) => l.id === 1).result).toEqual({})
        expect(lines.find((l) => l.id === 2).error.code).toBe(-32601)
        expect(lines.some((l) => l.error?.code === -32700)).toBe(true)
        expect(lines).toHaveLength(3)
    })

    it('mcp-config in được cho mọi client', () => {
        for (const client of MCP_CLIENTS) expect(renderMcpConfig(client)).toContain('@porbit/style')
        expect(renderMcpConfig('codex')).toContain('[mcp_servers.presence-style]')
    })
})
