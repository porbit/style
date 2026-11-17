import Module, { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const lib = require('../editors/vscode/lib.js')

/** Thư mục dự án giả có `node_modules/@porbit/style` (exports "./lsp" + bin). */
const fakeProject = (pkg: Record<string, unknown>) => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'ps-vscode-')))
    const pkgDir = join(dir, 'node_modules', '@porbit', 'style')
    mkdirSync(join(pkgDir, 'dist'), { recursive: true })
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: '@porbit/style', ...pkg }))
    writeFileSync(join(pkgDir, 'dist', 'cli-bin.js'), '')
    return { dir, pkgDir }
}
const withLsp = { version: '1.0.0', exports: { './lsp': './dist/lsp.js', './package.json': './package.json' }, bin: { 'presence-style': './dist/cli-bin.js' } }

describe('extension VS Code: logic thuần (lib.js)', () => {
    const settings = (over: Record<string, unknown> = {}) => lib.readSettings((key: string, fallback: unknown) => (key in over ? over[key] : fallback))

    it('readSettings chuẩn hoá giá trị sai kiểu', () => {
        expect(settings()).toMatchObject({ enable: true, languages: lib.DEFAULT_LANGUAGES, tailwindFunctions: [], configFile: 'presence-style.config.json', server: 'auto' })
        expect(settings({ languages: [], tailwindFunctions: ['tv', 3, ' '], server: 'x', tailwindStylesheet: ' src/app.css ' })).toMatchObject({
            languages: lib.DEFAULT_LANGUAGES,
            tailwindFunctions: ['tv'],
            server: 'auto',
            tailwindStylesheet: 'src/app.css',
        })
        expect(lib.serverSettings(settings({ tailwindFunctions: ['tv'], tailwindStylesheet: 'src/app.css' }))).toEqual({
            presenceStyle: { configFile: 'presence-style.config.json', tailwindFunctions: ['tv'], tailwindStylesheet: 'src/app.css' },
        })
    })

    it('resolveServer: dự án có @porbit/style -> server của dự án; không có -> bản kèm extension', () => {
        const { dir, pkgDir } = fakeProject(withLsp)
        const bundled = __filename
        expect(lib.resolveServer({ folder: dir, settings: settings(), bundled })).toEqual({ module: join(pkgDir, 'dist', 'cli-bin.js'), args: ['lsp'], source: 'workspace', version: '1.0.0' })
        expect(lib.resolveServer({ folder: dir, settings: settings({ server: 'bundled' }), bundled })).toEqual({ module: bundled, args: [], source: 'bundled' })
        // Gói cũ chưa có language server.
        const old = fakeProject({ version: '0.5.0', bin: { 'presence-style': './dist/cli-bin.js' } })
        expect(lib.resolveServer({ folder: old.dir, settings: settings(), bundled }).source).toBe('bundled')
        expect(lib.resolveServer({ folder: old.dir, settings: settings({ server: 'workspace' }), bundled }).error).toContain('Không tìm thấy @porbit/style')
        expect(lib.resolveServer({ folder: null, settings: settings(), bundled }).source).toBe('bundled')
        expect(lib.resolveServer({ folder: dir, settings: settings({ serverPath: 'node_modules/@porbit/style/dist/cli-bin.js' }), bundled })).toMatchObject({ source: 'custom', args: ['lsp'] })
        expect(lib.resolveServer({ folder: dir, settings: settings({ serverPath: 'khong-co.js' }), bundled }).error).toContain('serverPath')
        expect(lib.resolveServer({ folder: null, settings: settings(), bundled: '/khong/co.js' }).error).toContain('Thiếu server')
    })

    it('documentSelector và needsRestart', () => {
        expect(lib.documentSelector(['html'], 'P')).toEqual([{ scheme: 'file', language: 'html', pattern: 'P' }])
        expect(lib.documentSelector(['html'])).toEqual([{ scheme: 'untitled', language: 'html' }])
        expect(lib.documentSelector(['html'], undefined, { files: true })).toEqual([{ scheme: 'file', language: 'html' }, { scheme: 'untitled', language: 'html' }])
        expect(lib.needsRestart((key: string) => key === 'presenceStyle.languages')).toBe(true)
        expect(lib.needsRestart((key: string) => key === 'presenceStyle.tailwindFunctions')).toBe(false)
    })
})

describe('extension VS Code: kích hoạt với API giả lập', () => {
    const originalLoad = (Module as any)._load
    afterAll(() => {
        ;(Module as any)._load = originalLoad
    })

    it('khởi chạy client LSP với server của dự án, lệnh sắp xếp áp dụng code action `source`', async () => {
        const { dir, pkgDir } = fakeProject(withLsp)
        const commands: Record<string, (...args: any[]) => any> = {}
        const created: any[] = []
        const applied: any[] = []
        let onConfig: (event: any) => void = () => {}
        const folder = { uri: { fsPath: dir, toString: () => 'file://' + dir }, name: 'app', index: 0 }
        const doc = {
            uri: { scheme: 'file', fsPath: join(dir, 'a.tsx'), toString: () => 'file://' + join(dir, 'a.tsx') },
            languageId: 'typescriptreact',
            lineCount: 1,
            lineAt: () => ({ range: { end: { line: 0, character: 10 } } }),
        }
        const other = { ...doc, languageId: 'python', uri: { ...doc.uri, fsPath: join(dir, 'a.py') } }
        class RelativePattern { constructor(public base: any, public pattern: string) {} }
        const fake = {
            RelativePattern,
            window: {
                createOutputChannel: () => ({ appendLine: () => {}, show: () => {}, dispose: () => {} }),
                activeTextEditor: { document: doc },
                showWarningMessage: () => {},
                showInformationMessage: () => {},
                setStatusBarMessage: () => {},
            },
            workspace: {
                workspaceFolders: [folder],
                textDocuments: [doc, other],
                getWorkspaceFolder: () => folder,
                getConfiguration: () => ({ get: (key: string, fallback: unknown) => (key === 'tailwindFunctions' ? ['tv'] : fallback) }),
                createFileSystemWatcher: (pattern: any) => ({ pattern, dispose: () => {} }),
                onDidOpenTextDocument: () => ({ dispose: () => {} }),
                onDidChangeWorkspaceFolders: () => ({ dispose: () => {} }),
                onDidChangeConfiguration: (fn: any) => ((onConfig = fn), { dispose: () => {} }),
                applyEdit: async (edit: any) => applied.push(edit),
            },
            commands: { registerCommand: (name: string, fn: any) => ((commands[name] = fn), { dispose: () => {} }) },
        }
        class LanguageClient {
            started = false
            requests: any[] = []
            code2ProtocolConverter = { asUri: (uri: any) => uri.toString() }
            protocol2CodeConverter = { asWorkspaceEdit: async (edit: any) => ({ converted: edit }) }
            constructor(public id: string, public name: string, public serverOptions: any, public clientOptions: any) {
                created.push(this)
            }
            async start() {
                this.started = true
            }
            async stop() {
                this.started = false
            }
            notifications: any[] = []
            sendNotification(method: string, params: any) {
                this.notifications.push([method, params])
            }
            async sendRequest(method: string, params: any) {
                this.requests.push([method, params])
                return [{ kind: 'quickfix', title: 'x' }, { kind: 'source', title: 'sắp xếp', edit: { changes: {} } }]
            }
        }
        ;(Module as any)._load = function (request: string, ...rest: any[]) {
            if (request === 'vscode') return fake
            if (request === 'vscode-languageclient/node') return { LanguageClient, TransportKind: { stdio: 0, ipc: 1 } }
            return originalLoad.call(this, request, ...rest)
        }
        const ext = require('../editors/vscode/extension.js')
        const context = { subscriptions: [] as any[], extensionPath: '/ext' }
        await ext.activate(context)

        // Một client cho thư mục workspace (file .py không thuộc ngôn ngữ đã chọn).
        expect(created).toHaveLength(1)
        const client = created[0]
        expect(client.started).toBe(true)
        expect(client.serverOptions.run).toMatchObject({ module: join(pkgDir, 'dist', 'cli-bin.js'), args: ['lsp'], transport: 0, options: { cwd: dir } })
        expect(client.clientOptions.initializationOptions).toEqual({ presenceStyle: { configFile: 'presence-style.config.json', tailwindFunctions: ['tv'] } })
        expect(client.clientOptions.synchronize.fileEvents.pattern).toMatchObject({ base: folder })
        expect(client.clientOptions.documentSelector).toContainEqual({ scheme: 'file', language: 'typescriptreact', pattern: expect.any(RelativePattern) })
        expect(Object.keys(commands).sort()).toEqual(['presenceStyle.restartServer', 'presenceStyle.showOutput', 'presenceStyle.sortClasses'])

        await commands['presenceStyle.sortClasses']()
        expect(client.requests[0][0]).toBe('textDocument/codeAction')
        expect(client.requests[0][1].context.only).toEqual(['source'])
        expect(applied).toEqual([{ converted: { changes: {} } }])

        // Đổi tailwindFunctions: gửi didChangeConfiguration, không khởi động lại.
        onConfig({ affectsConfiguration: (key: string) => key === 'presenceStyle' || key === 'presenceStyle.tailwindFunctions' })
        expect(client.notifications).toEqual([['workspace/didChangeConfiguration', { settings: { presenceStyle: { configFile: 'presence-style.config.json', tailwindFunctions: ['tv'] } } }]])
        expect(created).toHaveLength(1)

        await ext.deactivate()
        expect(client.started).toBe(false)
    })
})
