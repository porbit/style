import { describe, expect, it } from 'vitest'
import { PassThrough } from 'node:stream'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { startLanguageServer } from '../src/lsp'
import { createLanguageService } from '../src/language-service'
import { resolveConfigFile } from '../src/config-file'
import { createStylesheetReader } from '../src/files'

/** Client LSP tối giản: gửi tin nhắn có khung Content-Length, gom phản hồi theo id/method. */
const createClient = () => {
    const input = new PassThrough()
    const output = new PassThrough()
    const server = startLanguageServer({ input, output, debounce: 0 })
    const messages: any[] = []
    const waiters: Array<{ match: (m: any) => boolean; resolve: (m: any) => void }> = []
    let buffer = ''
    output.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8')
        for (;;) {
            const headerEnd = buffer.indexOf('\r\n\r\n')
            if (headerEnd === -1) return
            const length = Number(/Content-Length: (\d+)/.exec(buffer.slice(0, headerEnd))![1])
            const body = Buffer.from(buffer.slice(headerEnd + 4), 'utf8')
            if (body.length < length) return
            const message = JSON.parse(body.subarray(0, length).toString('utf8'))
            buffer = body.subarray(length).toString('utf8')
            messages.push(message)
            const index = waiters.findIndex((w) => w.match(message))
            if (index !== -1) waiters.splice(index, 1)[0].resolve(message)
        }
    })
    let nextId = 1
    const write = (message: any) => {
        const body = JSON.stringify({ jsonrpc: '2.0', ...message })
        input.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`)
    }
    const wait = (match: (m: any) => boolean) => {
        const found = messages.find(match)
        if (found) {
            messages.splice(messages.indexOf(found), 1)
            return Promise.resolve(found)
        }
        return new Promise<any>((resolve) => waiters.push({ match, resolve }))
    }
    const request = (method: string, params: any) => {
        const id = nextId++
        write({ id, method, params })
        return wait((m) => m.id === id)
    }
    const notify = (method: string, params: any) => write({ method, params })
    const diagnostics = (uri: string, version?: number) =>
        wait((m) => m.method === 'textDocument/publishDiagnostics' && m.params.uri === uri && (version === undefined || m.params.version === version))
    return { request, notify, diagnostics, stop: server.stop }
}

describe('dịch vụ ngôn ngữ', () => {
    it('chẩn đoán, hover, gợi ý, quick fix, sắp xếp', () => {
        const service = createLanguageService()
        const text = '<div class="dF c-red p16 btn">x</div>'
        const diagnostics = service.diagnose(text)
        // Class của thư viện khác (`btn`) không bị gạch.
        expect(diagnostics.map((d) => [d.code, text.slice(d.start, d.end), d.suggestion])).toEqual([['invalid-class', 'c-red', 'c[red]'], ['invalid-class', 'p16', null]])
        const hover = service.hover(text, text.indexOf('dF') + 1)
        expect(hover!.markdown).toContain('display:flex')
        expect(service.completions(text, text.indexOf('dF')).some((c) => c.label === 'd')).toBe(true)
        expect(service.completions(text, 1)).toEqual([])
        const fix = service.codeActions(text, diagnostics[0].start, diagnostics[0].end).find((a) => a.kind === 'quickfix')!
        expect(fix.edits[0]).toEqual({ start: diagnostics[0].start, end: diagnostics[0].end, newText: diagnostics[0].suggestion })
    })

    it('dự án Tailwind: class Tailwind và class tự định nghĩa trong app.css không bị gạch, hover ra CSS', () => {
        const dir = mkdtempSync(join(tmpdir(), 'ps-lsp-'))
        writeFileSync(join(dir, 'app.css'), '@import "tailwindcss";\n@import "tw-animate-css";\n@custom-variant data-open (&:where([data-state="open"]));\n@utility tab-* { tab-size: --value(integer); }\n@theme { --color-brand: #0a64e8; }')
        const config = resolveConfigFile({ dialects: ['tailwind'], tailwindCss: 'app.css' }, { readStylesheet: createStylesheetReader(dir) })
        const service = createLanguageService(config)
        const text = '<div class="flex bg-brand tab-4 data-open:fade-in-50 md:hover:underline btn-primary">x</div>'
        expect(service.diagnose(text)).toEqual([])
        expect(service.hover(text, text.indexOf('tab-4') + 1)!.markdown).toContain('tab-size:4')
        expect(service.hover(text, text.indexOf('bg-brand') + 1)!.markdown).toContain('#0a64e8')
        expect(service.hover(text, text.indexOf('data-open') + 1)!.markdown).toContain('[data-state="open"]')
    })
})

describe('gợi ý class Tailwind', () => {
    it('gợi ý class sau tiền tố biến thể, mục màu có mã hex, class theme của dự án', () => {
        const service = createLanguageService(resolveConfigFile({ dialects: ['tailwind'] }))
        const text = '<div className="flex md:hover:bg-re"></div>'
        const offset = text.indexOf('bg-re') + 5
        const items = service.completions(text, offset)
        const red = items.find((i) => i.label === 'bg-red-500')!
        expect(red).toMatchObject({ kind: 'color', color: '#fb2c36', replaceStart: text.indexOf('bg-re') })
        expect(items.find((i) => i.label === 'hover:')?.kind).toBe('variant')
        expect(items.some((i) => i.label === 'p-4' && i.kind === 'class')).toBe(true)
        expect(service.completions('<div className="x"></div>', 2)).toEqual([])
    })

    it('oklch -> hex', async () => {
        const { cssColorToHex } = await import('../src/language-service')
        expect(cssColorToHex('oklch(63.7% 0.237 25.331)')).toBe('#fb2c36')
        expect(cssColorToHex('oklch(100% 0 0)')).toBe('#ffffff')
        expect(cssColorToHex('#0af')).toBe('#00aaff')
    })
})

describe('language server (stdio)', () => {
    it('initialize -> didOpen -> diagnostics -> hover -> completion -> codeAction -> didChange', async () => {
        const client = createClient()
        const init = await client.request('initialize', { rootUri: null, capabilities: {} })
        expect(init.result.capabilities).toMatchObject({ hoverProvider: true, codeActionProvider: { codeActionKinds: ['quickfix', 'source'] } })
        client.notify('initialized', {})

        const uri = pathToFileURL(join(tmpdir(), 'a.html')).href
        const text = '<main>\n  <div class="dF c-red">x</div>\n</main>'
        client.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'html', version: 1, text } })
        const published = await client.diagnostics(uri)
        const bad = published.params.diagnostics.find((d: any) => d.code === 'invalid-class')
        expect(bad).toMatchObject({ source: 'presence-style', severity: 2, range: { start: { line: 1, character: 17 }, end: { line: 1, character: 22 } } })

        const hover = await client.request('textDocument/hover', { textDocument: { uri }, position: { line: 1, character: 15 } })
        expect(hover.result.contents.value).toContain('display:flex')
        expect(hover.result.range).toEqual({ start: { line: 1, character: 14 }, end: { line: 1, character: 16 } })

        const completion = await client.request('textDocument/completion', { textDocument: { uri }, position: { line: 1, character: 16 } })
        expect(completion.result.items.length).toBeGreaterThan(100)

        const actions = await client.request('textDocument/codeAction', { textDocument: { uri }, range: bad.range, context: { diagnostics: [bad] } })
        const quickfix = actions.result.find((a: any) => a.kind === 'quickfix')
        expect(quickfix.edit.changes[uri][0]).toEqual({ range: bad.range, newText: bad.data.suggestion })

        client.notify('textDocument/didChange', { textDocument: { uri, version: 2 }, contentChanges: [{ text: '<div class="dF">x</div>' }] })
        const after = await client.diagnostics(uri, 2)
        expect(after.params).toMatchObject({ version: 2, diagnostics: [] })

        const unknown = await client.request('textDocument/definition', { textDocument: { uri }, position: { line: 0, character: 0 } })
        expect(unknown.error.code).toBe(-32601)
        const shutdown = await client.request('shutdown', null)
        expect(shutdown.result).toBeNull()
        client.stop()
    })

    it('đọc presence-style.config.json của workspace', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'ps-lsp-ws-'))
        writeFileSync(join(dir, 'presence-style.config.json'), JSON.stringify({ dialects: ['tailwind'] }))
        const client = createClient()
        await client.request('initialize', { rootUri: pathToFileURL(dir).href, capabilities: {} })
        const uri = pathToFileURL(join(dir, 'b.tsx')).href
        client.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'typescriptreact', version: 1, text: 'export const A = () => <div className="flex p-4 hover:bg-red-500" />' } })
        const found = (await client.diagnostics(uri)).params.diagnostics
        expect(found).toEqual([])
        const hover = await client.request('textDocument/hover', { textDocument: { uri }, position: { line: 0, character: 47 } })
        expect(hover.result.contents.value).toContain('padding:calc(var(--spacing')
        client.stop()
    })

    it('ô màu (documentColor), thiết lập từ editor: tailwindStylesheet + tailwindFunctions, didChangeConfiguration', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'ps-lsp-settings-'))
        writeFileSync(join(dir, 'app.css'), '@import "tailwindcss";\n@theme { --color-brand: #0a64e8; }')
        const client = createClient()
        const init = await client.request('initialize', {
            rootUri: pathToFileURL(dir).href,
            capabilities: {},
            initializationOptions: { presenceStyle: { tailwindStylesheet: 'app.css', tailwindFunctions: ['tv'] } },
        })
        expect(init.result.capabilities.colorProvider).toBe(true)
        const uri = pathToFileURL(join(dir, 'c.tsx')).href
        const text = 'const b = tv("bg-brand p-2")\nexport const C = () => <div className="text-red-500 flex" />'
        client.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'typescriptreact', version: 1, text } })
        expect((await client.diagnostics(uri)).params.diagnostics).toEqual([])

        const colors = await client.request('textDocument/documentColor', { textDocument: { uri } })
        expect(colors.result).toEqual([
            { range: { start: { line: 0, character: 14 }, end: { line: 0, character: 22 } }, color: { red: 10 / 255, green: 100 / 255, blue: 232 / 255, alpha: 1 } },
            { range: { start: { line: 1, character: 39 }, end: { line: 1, character: 51 } }, color: expect.objectContaining({ alpha: 1 }) },
        ])
        const presentation = await client.request('textDocument/colorPresentation', { textDocument: { uri }, color: colors.result[0].color, range: colors.result[0].range })
        expect(presentation.result).toEqual([])

        // Hover trong đối số của hàm khai báo ở `tailwindFunctions`.
        const hover = await client.request('textDocument/hover', { textDocument: { uri }, position: { line: 0, character: 24 } })
        expect(hover.result.contents.value).toContain('padding')

        // `settings` rỗng (Neovim/Zed khi người dùng không đặt gì): giữ thiết lập từ initializationOptions.
        client.notify('workspace/didChangeConfiguration', { settings: {} })
        await client.diagnostics(uri)
        const kept = await client.request('textDocument/hover', { textDocument: { uri }, position: { line: 0, character: 24 } })
        expect(kept.result.contents.value).toContain('padding')

        // Bỏ `tv` khỏi thiết lập: chuỗi trong `tv()` không còn là class.
        client.notify('workspace/didChangeConfiguration', { settings: { presenceStyle: { tailwindStylesheet: 'app.css', tailwindFunctions: [] } } })
        await client.diagnostics(uri)
        const after = await client.request('textDocument/hover', { textDocument: { uri }, position: { line: 0, character: 24 } })
        expect(after.result).toBeNull()
        client.stop()
    })
})

describe('thiết lập server', () => {
    it('readServerSettings: phẳng hoặc lồng, bỏ giá trị sai kiểu', async () => {
        const { readServerSettings } = await import('../src/lsp')
        expect(readServerSettings({ tailwindFunctions: ['tv', 1, ''], tailwindStylesheet: ' src/app.css ' })).toEqual({ tailwindFunctions: ['tv'], tailwindStylesheet: 'src/app.css' })
        expect(readServerSettings({ 'presence-style': { configFile: 'x.json', tailwindStylesheet: '' } })).toEqual({ configFile: 'x.json' })
        expect(readServerSettings(null)).toEqual({})
        const { hasServerSettings } = await import('../src/lsp')
        expect([hasServerSettings({}), hasServerSettings(null), hasServerSettings({ presenceStyle: {} }), hasServerSettings({ tailwindFunctions: [] })]).toEqual([false, false, true, true])
    })

    it('x-css: ô màu từ CSS sinh ra', () => {
        const service = createLanguageService()
        const text = '<div class="bg#0af dF c[#ff0000]">'
        expect(service.colors(text).map((c) => [text.slice(c.start, c.end), c.color])).toEqual([['bg#0af', '#00aaff'], ['c[#ff0000]', '#ff0000']])
    })
})
