import Module, { createRequire } from 'node:module'
import { afterAll, describe, expect, it } from 'vitest'
import * as analyze from '../src/analyze'

const require = createRequire(import.meta.url)
const { createLanguageService } = require('../editors/vscode/lib.js')

describe('extension VS Code: logic thuần', () => {
    const service = createLanguageService(analyze)
    const text = '<div className="dF fz14px btn p1px p2px">x</div>'

    it('diagnose báo class lỗi kèm bản sửa và xung đột, bỏ qua class lạ', () => {
        const items = service.diagnose(text, {})
        const invalid = items.filter((i: any) => i.code === 'invalid-class')
        expect(invalid).toHaveLength(1)
        expect(text.slice(invalid[0].start, invalid[0].end)).toBe('fz14px')
        expect(invalid[0].suggestion).toBe('fns14px')
        const conflict = items.find((i: any) => i.code === 'conflict')
        expect(text.slice(conflict.start, conflict.end)).toBe('p1px')
    })

    it('hover hiện CSS và tuple', () => {
        const info = service.hover(text, text.indexOf('dF') + 1, {})
        expect(info.markdown).toContain('display:flex')
        expect(info.markdown).toContain('property `display`')
        expect(service.hover(text, 2, {})).toBeNull()
    })

    it('chỉ gợi ý trong thuộc tính class', () => {
        expect(service.inClassAttribute(text, text.indexOf('btn'))).toBe(true)
        expect(service.inClassAttribute(text, 1)).toBe(false)
        expect(service.completions().some((c: any) => c.label === 'fns' && c.detail === 'font-size')).toBe(true)
    })
})

describe('extension VS Code: kích hoạt với API giả lập', () => {
    const originalLoad = (Module as any)._load
    afterAll(() => {
        ;(Module as any)._load = originalLoad
    })

    it('đăng ký provider, đặt diagnostic và quick fix', () => {
        const registered: Record<string, any> = {}
        const sets: Array<[any, any[]]> = []
        class Range { constructor(public start: number, public end: number) {} }
        class Diagnostic { source = ''; code: any; constructor(public range: any, public message: string, public severity: number) {} }
        class WorkspaceEdit { edits: any[] = []; replace(uri: any, range: any, text: string) { this.edits.push({ uri, range, text }) } }
        class CodeAction { edit: any; diagnostics: any; isPreferred = false; constructor(public title: string, public kind: string) {} }
        const doc = {
            uri: { toString: () => 'file:///a.jsx', fsPath: '/a.jsx' },
            languageId: 'javascriptreact',
            getText: () => '<i className="df p1px" />',
            positionAt: (offset: number) => offset,
            offsetAt: (pos: number) => pos,
        }
        const fake = {
            Range, Diagnostic, WorkspaceEdit, CodeAction,
            DiagnosticSeverity: { Warning: 1, Information: 2 },
            CodeActionKind: { QuickFix: 'quickfix' },
            CompletionItemKind: { Property: 9, Value: 11 },
            CompletionItem: class { detail = ''; constructor(public label: string, public kind: number) {} },
            Hover: class { constructor(public contents: any, public range: any) {} },
            MarkdownString: class { constructor(public value: string) {} },
            languages: {
                createDiagnosticCollection: () => ({ set: (uri: any, d: any[]) => sets.push([uri, d]), delete: () => {}, dispose: () => {} }),
                registerCodeActionsProvider: (_l: any, p: any) => (registered.codeActions = p),
                registerHoverProvider: (_l: any, p: any) => (registered.hover = p),
                registerCompletionItemProvider: (_l: any, p: any) => (registered.completion = p),
            },
            workspace: {
                getConfiguration: () => ({ get: (_k: string, d?: any) => d }),
                getWorkspaceFolder: () => undefined,
                onDidOpenTextDocument: () => ({}),
                onDidChangeTextDocument: () => ({}),
                onDidCloseTextDocument: () => ({}),
                textDocuments: [doc],
            },
            window: { activeTextEditor: undefined },
            commands: { registerCommand: (name: string, fn: any) => (registered[name] = fn) },
        }
        ;(Module as any)._load = function (request: string, ...rest: any[]) {
            if (request === 'vscode') return fake
            if (request === '@porbit/style/analyze') return analyze
            return originalLoad.call(this, request, ...rest)
        }
        const ext = require('../editors/vscode/extension.js')
        const context = { subscriptions: [] as any[] }
        ext.activate(context)

        expect(sets).toHaveLength(1)
        const diags = sets[0][1]
        const invalid = diags.find((d: any) => String(d.code).startsWith('invalid-class'))
        expect(invalid.code).toBe('invalid-class:dF')
        expect(diags.some((d: any) => d.code === 'conflict')).toBe(false)

        const actions = registered.codeActions.provideCodeActions(doc, null, { diagnostics: diags })
        expect(actions[0].title).toBe('Sửa thành dF')
        expect(actions[0].edit.edits[0].text).toBe('dF')

        const hover = registered.hover.provideHover(doc, doc.getText().indexOf('p1px') + 1)
        expect(hover.contents.value).toContain('padding:1px')
        expect(typeof registered['presenceStyle.sortClasses']).toBe('function')
    })
})
