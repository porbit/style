#!/usr/bin/env node
/**
 * Smoke test language server qua stdio, như editor thật khởi chạy: tạo workspace tạm (dự án Tailwind v4 có
 * `@theme`), mở file TSX rồi kiểm tra initialize, chẩn đoán, completion (+ textEdit, ô màu, resolve), hover
 * (cả trong `cn()`/hàm khai báo ở `tailwindFunctions`), documentColor, code action sắp xếp, shutdown/exit.
 *
 *   node scripts/lsp-smoke.cjs                                   # server của repo: dist/cli-bin.js lsp
 *   node scripts/lsp-smoke.cjs --server path/to/cli-bin.js       # bin của gói đã cài (thêm đối số `lsp`)
 *   node scripts/lsp-smoke.cjs --server editors/vscode/server/presence-style-lsp.js
 *   node scripts/lsp-smoke.cjs --json                            # một dòng JSON cuối: { ok, checks }
 *
 * Mã thoát khác 0 khi có kiểm tra lỗi.
 */
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { pathToFileURL } = require('url')

const root = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
const json = args.includes('--json')
const serverIndex = args.indexOf('--server')
const server = path.resolve(serverIndex !== -1 ? args[serverIndex + 1] : path.join(root, 'dist/cli-bin.js'))
const TIMEOUT = 30000

const SOURCE = [
    "import { cn } from './cn'",
    "const button = tv('rounded-md px-3')",
    'export const App = () => (',
    '  <div className="flex items-center bg-brand p-4 hover:text-red-500 md:hover:bg-re">',
    "    <span className={cn('text-sm', 'font-bold')}>x</span>",
    '  </div>',
    ')',
    '',
].join('\n')

/** Offset -> vị trí LSP (dòng, cột UTF-16). */
const positionOf = (text, needle, delta = 0) => {
    const offset = text.indexOf(needle) + delta
    if (offset < delta) throw new Error(`không thấy "${needle}" trong file mẫu`)
    const before = text.slice(0, offset).split('\n')
    return { line: before.length - 1, character: before[before.length - 1].length }
}

const run = async () => {
    if (!fs.existsSync(server)) throw new Error(`không có server: ${server} (chạy npm run build trước)`)
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-lsp-smoke-'))
    fs.mkdirSync(path.join(work, 'src'))
    fs.writeFileSync(path.join(work, 'presence-style.config.json'), JSON.stringify({ hashClassName: false, dialects: ['tailwind'] }))
    fs.writeFileSync(path.join(work, 'src/app.css'), '@import "tailwindcss";\n@theme { --color-brand: #0a64e8; }\n')
    const file = path.join(work, 'src/App.tsx')
    fs.writeFileSync(file, SOURCE)
    const uri = pathToFileURL(file).href

    // Bin của gói (`cli-bin.js`) cần lệnh con `lsp`; script server đóng gói sẵn bỏ qua đối số.
    const child = spawn(process.execPath, [server, 'lsp', '--stdio'], { cwd: work, stdio: ['pipe', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => (stderr += chunk))
    const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)))

    const pending = new Map()
    const notifications = []
    const listeners = []
    let buffer = Buffer.alloc(0)
    child.stdout.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk])
        for (;;) {
            const headerEnd = buffer.indexOf('\r\n\r\n')
            if (headerEnd === -1) return
            const length = Number(/content-length:\s*(\d+)/i.exec(buffer.subarray(0, headerEnd).toString('ascii'))[1])
            if (buffer.length < headerEnd + 4 + length) return
            const message = JSON.parse(buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString('utf8'))
            buffer = buffer.subarray(headerEnd + 4 + length)
            if (message.id !== undefined && pending.has(message.id)) {
                pending.get(message.id)(message)
                pending.delete(message.id)
            } else if (message.method) {
                notifications.push(message)
                listeners.splice(0).forEach((fn) => fn())
            }
        }
    })
    const write = (message) => {
        const body = JSON.stringify({ jsonrpc: '2.0', ...message })
        child.stdin.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`)
    }
    let nextId = 1
    const request = (method, params) =>
        new Promise((resolve, reject) => {
            const id = nextId++
            pending.set(id, (message) => (message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result)))
            write({ id, method, params })
        })
    const notify = (method, params) => write({ method, params })
    const waitNotification = (match) =>
        new Promise((resolve) => {
            const check = () => {
                const found = notifications.find(match)
                if (found) resolve(found)
                else listeners.push(check)
            }
            check()
        })

    const checks = []
    const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail })
    const timer = setTimeout(() => {
        check('timeout', false, `quá ${TIMEOUT / 1000}s; stderr: ${stderr.trim().split('\n')[0] || '-'}`)
        child.kill()
    }, TIMEOUT)

    try {
        const init = await request('initialize', {
            processId: process.pid,
            rootUri: pathToFileURL(work).href,
            capabilities: { textDocument: { completion: { completionItem: { snippetSupport: true } } } },
            initializationOptions: { presenceStyle: { tailwindStylesheet: 'src/app.css', tailwindFunctions: ['tv'] } },
            workspaceFolders: [{ uri: pathToFileURL(work).href, name: 'smoke' }],
        })
        const caps = init.capabilities
        check('initialize', caps.hoverProvider && caps.completionProvider?.resolveProvider && caps.colorProvider && caps.codeActionProvider, `${init.serverInfo?.name} ${init.serverInfo?.version}`)
        notify('initialized', {})
        notify('textDocument/didOpen', { textDocument: { uri, languageId: 'typescriptreact', version: 1, text: SOURCE } })

        const published = await waitNotification((m) => m.method === 'textDocument/publishDiagnostics' && m.params.uri === uri)
        check('diagnostics', Array.isArray(published.params.diagnostics) && published.params.diagnostics.length === 0, `${published.params.diagnostics.length} chẩn đoán (class Tailwind hợp lệ không bị gạch)`)

        const typed = positionOf(SOURCE, 'md:hover:bg-re', 'md:hover:bg-re'.length)
        const completion = await request('textDocument/completion', { textDocument: { uri }, position: typed, context: { triggerKind: 1 } })
        const items = completion?.items ?? []
        const red = items.find((item) => item.label === 'bg-red-500')
        const start = positionOf(SOURCE, 'bg-re')
        check(
            'completion',
            red && red.kind === 16 && /^#[0-9a-f]{6}$/.test(red.documentation) && red.textEdit && red.textEdit.range.start.character === start.character && red.textEdit.range.end.character === typed.character,
            `${items.length} mục; bg-red-500 ${red ? `${red.documentation}, thay từ cột ${red.textEdit?.range.start.character}` : 'không có'}`,
        )
        const brand = items.find((item) => item.label === 'bg-brand')
        check('completion theme', brand && brand.documentation === '#0a64e8', brand ? `bg-brand ${brand.documentation}` : 'không gợi ý bg-brand (@theme của dự án)')

        const plain = items.find((item) => item.label === 'p-4')
        const resolved = plain ? await request('completionItem/resolve', plain) : null
        check('completionItem/resolve', resolved && /padding/.test(resolved.documentation?.value || ''), resolved ? 'p-4 có CSS' : 'không có mục p-4')

        const hover = await request('textDocument/hover', { textDocument: { uri }, position: positionOf(SOURCE, 'p-4', 1) })
        check('hover', /padding/.test(hover?.contents?.value || ''), (hover?.contents?.value || 'null').split('\n')[1])
        const hoverCn = await request('textDocument/hover', { textDocument: { uri }, position: positionOf(SOURCE, 'text-sm', 2) })
        check('hover cn()', /font-size/.test(hoverCn?.contents?.value || ''), (hoverCn?.contents?.value || 'null').split('\n')[1])
        const hoverTv = await request('textDocument/hover', { textDocument: { uri }, position: positionOf(SOURCE, 'px-3', 1) })
        check('hover tailwindFunctions', /padding-inline/.test(hoverTv?.contents?.value || ''), (hoverTv?.contents?.value || 'null').split('\n')[1])

        const colors = await request('textDocument/documentColor', { textDocument: { uri } })
        const hex = (c) => '#' + [c.red, c.green, c.blue].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
        const found = (colors || []).map((c) => `${SOURCE.split('\n')[c.range.start.line].slice(c.range.start.character, c.range.end.character)} ${hex(c.color)}`)
        check('documentColor', found.includes('bg-brand #0a64e8') && found.some((f) => f.startsWith('hover:text-red-500 #')), found.join(', '))

        const actions = await request('textDocument/codeAction', {
            textDocument: { uri },
            range: { start: { line: 0, character: 0 }, end: positionOf(SOURCE, ')\n', 1) },
            context: { diagnostics: [], only: ['source'] },
        })
        const sort = (actions || []).find((a) => a.kind === 'source')
        const sortedText = sort?.edit?.changes?.[uri]?.[0]?.newText || ''
        check('codeAction sắp xếp', sort && /className="md:hover:bg-re flex items-center bg-brand p-4 hover:text-red-500"/.test(sortedText), sort ? sort.title : 'không có hành động sắp xếp')

        const shutdown = await request('shutdown', null)
        notify('exit', null)
        const code = await Promise.race([exited, new Promise((resolve) => setTimeout(() => resolve('treo'), 5000))])
        check('shutdown/exit', shutdown === null && code === 0, `mã thoát ${code}`)
    } catch (error) {
        check('lỗi', false, `${error.message}${stderr ? `; stderr: ${stderr.trim().split('\n')[0]}` : ''}`)
        child.kill()
    } finally {
        clearTimeout(timer)
        fs.rmSync(work, { recursive: true, force: true })
    }
    return checks
}

run().then(
    (checks) => {
        const ok = checks.length > 0 && checks.every((c) => c.ok)
        if (json) console.log(JSON.stringify({ ok, server: path.relative(root, server) || server, checks }))
        else {
            for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
            console.log(ok ? `LSP smoke: ${checks.length}/${checks.length} đạt` : 'LSP smoke: LỖI')
        }
        process.exit(ok ? 0 : 1)
    },
    (error) => {
        if (json) console.log(JSON.stringify({ ok: false, checks: [{ name: 'lỗi', ok: false, detail: error.message }] }))
        else console.error(error.message)
        process.exit(1)
    },
)
