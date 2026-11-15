'use strict'
/**
 * Extension VS Code cho @porbit/style: gạch lỗi class không sinh CSS, quick fix,
 * hover hiện CSS, gợi ý alias, và lệnh sắp xếp class.
 */
const vscode = require('vscode')
const fs = require('fs')
const path = require('path')
const analyze = require('@porbit/style/analyze')
const { tailwindFixFallback, tailwindDialect } = require('@porbit/style/tailwind')

// Quick fix cho class viết theo thói quen Tailwind (`w-full` -> `w100%`).
analyze.setTailwindFallback(tailwindFixFallback)
const { createLanguageService } = require('./lib')

const LANGUAGES = ['html', 'javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'vue', 'svelte', 'astro', 'mdx', 'php']
const SOURCE = 'presence-style'

const service = createLanguageService(analyze)

/** Đọc presence-style.config.json ở gốc workspace (breakpoints, theme, aliases...). */
const loadConfig = (document) => {
    const settings = vscode.workspace.getConfiguration('presenceStyle', document.uri)
    const folder = vscode.workspace.getWorkspaceFolder(document.uri)
    if (!folder) return {}
    const file = path.join(folder.uri.fsPath, settings.get('configFile') || 'presence-style.config.json')
    try {
        const config = JSON.parse(fs.readFileSync(file, 'utf8'))
        delete config.safelist
        // `"dialects": ["tailwind"]`: class Tailwind hợp lệ, không bị gạch lỗi.
        if (Array.isArray(config.dialects)) {
            config.dialects = config.dialects.includes('tailwind')
                ? [tailwindDialect({ darkMode: config.darkMode === 'class' ? 'class' : 'media' })]
                : []
        }
        return config
    } catch (_error) {
        return {}
    }
}

const toRange = (document, start, end) => new vscode.Range(document.positionAt(start), document.positionAt(end))

function activate(context) {
    const collection = vscode.languages.createDiagnosticCollection(SOURCE)
    context.subscriptions.push(collection)
    const timers = new Map()

    const refresh = (document) => {
        if (!LANGUAGES.includes(document.languageId)) return
        if (!vscode.workspace.getConfiguration('presenceStyle', document.uri).get('enable', true)) {
            collection.delete(document.uri)
            return
        }
        const config = loadConfig(document)
        const diagnostics = service.diagnose(document.getText(), config).map((item) => {
            const diagnostic = new vscode.Diagnostic(
                toRange(document, item.start, item.end),
                item.message,
                item.severity === 'warning' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information,
            )
            diagnostic.source = SOURCE
            diagnostic.code = item.suggestion ? `${item.code}:${item.suggestion}` : item.code
            return diagnostic
        })
        collection.set(document.uri, diagnostics)
    }

    const schedule = (document) => {
        clearTimeout(timers.get(document.uri.toString()))
        timers.set(document.uri.toString(), setTimeout(() => refresh(document), 250))
    }

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(refresh),
        vscode.workspace.onDidChangeTextDocument((event) => schedule(event.document)),
        vscode.workspace.onDidCloseTextDocument((document) => collection.delete(document.uri)),
    )
    vscode.workspace.textDocuments.forEach(refresh)

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(LANGUAGES, {
            provideCodeActions(document, _range, ctx) {
                return ctx.diagnostics
                    .filter((d) => d.source === SOURCE && typeof d.code === 'string' && d.code.startsWith('invalid-class:'))
                    .map((d) => {
                        const fix = d.code.slice('invalid-class:'.length)
                        const action = new vscode.CodeAction(`Sửa thành ${fix}`, vscode.CodeActionKind.QuickFix)
                        action.edit = new vscode.WorkspaceEdit()
                        action.edit.replace(document.uri, d.range, fix)
                        action.diagnostics = [d]
                        action.isPreferred = true
                        return action
                    })
            },
        }, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }),

        vscode.languages.registerHoverProvider(LANGUAGES, {
            provideHover(document, position) {
                const info = service.hover(document.getText(), document.offsetAt(position), loadConfig(document))
                if (!info) return null
                return new vscode.Hover(new vscode.MarkdownString(info.markdown), toRange(document, info.start, info.end))
            },
        }),

        vscode.languages.registerCompletionItemProvider(LANGUAGES, {
            provideCompletionItems(document, position) {
                if (!service.inClassAttribute(document.getText(), document.offsetAt(position))) return []
                return service.completions().map((item) => {
                    const completion = new vscode.CompletionItem(
                        item.label,
                        item.kind === 'property' ? vscode.CompletionItemKind.Property : vscode.CompletionItemKind.Value,
                    )
                    completion.detail = item.detail
                    return completion
                })
            },
        }),

        vscode.commands.registerCommand('presenceStyle.sortClasses', async () => {
            const editor = vscode.window.activeTextEditor
            if (!editor) return
            const document = editor.document
            const text = document.getText()
            const sorted = analyze.sortClassesInSource(text)
            if (sorted === text) return
            await editor.edit((edit) => edit.replace(toRange(document, 0, text.length), sorted))
        }),
    )
}

function deactivate() {}

module.exports = { activate, deactivate }
