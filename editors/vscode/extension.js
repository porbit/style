'use strict'
/**
 * Extension VS Code cho @porbit/style: client LSP của `presence-style lsp`.
 * Mỗi thư mục workspace một server, ưu tiên gói `@porbit/style` cài trong dự án (đúng phiên bản dự án),
 * không có thì dùng bản đóng gói kèm extension. Mọi tính năng (chẩn đoán, quick fix, hover, gợi ý class
 * Tailwind/x-css, ô màu, sắp xếp class) do server cung cấp.
 */
const path = require('path')
const vscode = require('vscode')
const { LanguageClient, TransportKind } = require('vscode-languageclient/node')
const lib = require('./lib')

/** @type {Map<string, LanguageClient>} khoá: URI thư mục workspace ('' = file ngoài workspace). */
const clients = new Map()
/** @type {Map<string, Promise<void>>} */
const starting = new Map()
let output
let extensionContext

const settingsFor = (scope) => {
    const config = vscode.workspace.getConfiguration(lib.SECTION, scope)
    return lib.readSettings((key, fallback) => config.get(key, fallback))
}

const keyOf = (folder) => (folder ? folder.uri.toString() : '')

/** Khởi chạy server cho một thư mục workspace (hoặc cho file ngoài workspace khi `folder` rỗng). */
const startClient = async (folder) => {
    const key = keyOf(folder)
    if (clients.has(key)) return
    if (starting.has(key)) return starting.get(key)
    const task = (async () => {
        const settings = settingsFor(folder ? folder.uri : undefined)
        if (!settings.enable) return
        const server = lib.resolveServer({
            folder: folder ? folder.uri.fsPath : null,
            settings,
            bundled: path.join(extensionContext.extensionPath, 'server', 'presence-style-lsp.js'),
        })
        const label = folder ? folder.name : '(ngoài workspace)'
        if (server.error) {
            output.appendLine(`[${label}] ${server.error}`)
            vscode.window.showWarningMessage(`PresenceStyle: ${server.error}`)
            return
        }
        output.appendLine(`[${label}] server ${server.source}${server.version ? ` ${server.version}` : ''}: ${server.module}`)
        const node = { module: server.module, args: server.args, transport: TransportKind.stdio, options: { cwd: folder ? folder.uri.fsPath : undefined } }
        if (settings.nodePath) node.runtime = settings.nodePath
        const watched = `**/{${[settings.configFile, '*.css', ...['js', 'cjs', 'mjs', 'ts'].map((ext) => `tailwind.config.${ext}`)].join(',')}}`
        const watcher = vscode.workspace.createFileSystemWatcher(folder ? new vscode.RelativePattern(folder, watched) : watched)
        const client = new LanguageClient(
            'presenceStyle',
            'PresenceStyle',
            { run: node, debug: node },
            {
                documentSelector: folder
                    ? lib.documentSelector(settings.languages, new vscode.RelativePattern(folder, '**/*'))
                    : lib.documentSelector(settings.languages, undefined, { files: !(vscode.workspace.workspaceFolders || []).length }),
                workspaceFolder: folder,
                outputChannel: output,
                initializationOptions: lib.serverSettings(settings),
                // Thiết lập gửi thủ công theo thư mục (xem pushSettings), không dùng configurationSection (chỉ đọc cấp cửa sổ).
                synchronize: { fileEvents: watcher },
            },
        )
        clients.set(key, client)
        try {
            await client.start()
        } catch (error) {
            clients.delete(key)
            watcher.dispose()
            output.appendLine(`[${label}] không khởi động được server: ${error && error.message}`)
            return
        }
        client.presenceWatcher = watcher
        client.presenceFolder = folder
    })()
    starting.set(key, task)
    try {
        await task
    } finally {
        starting.delete(key)
    }
}

const stopClient = async (key) => {
    const client = clients.get(key)
    if (!client) return
    clients.delete(key)
    if (client.presenceWatcher) client.presenceWatcher.dispose()
    try {
        await client.stop()
    } catch (_error) {
        // server đã thoát
    }
}

/** Mở tài liệu thuộc ngôn ngữ đã chọn -> bảo đảm server của thư mục đó đang chạy. */
const ensureClientFor = (document) => {
    if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') return
    const folder = vscode.workspace.getWorkspaceFolder(document.uri)
    // Có thư mục workspace: file trên đĩa nằm ngoài mọi thư mục không được phục vụ (server '' chỉ nhận file chưa lưu).
    if (!folder && document.uri.scheme === 'file' && (vscode.workspace.workspaceFolders || []).length) return
    const settings = settingsFor(folder ? folder.uri : undefined)
    if (!settings.enable || !settings.languages.includes(document.languageId)) return
    return startClient(folder)
}

/** Đổi thiết lập không cần khởi động lại (tailwindFunctions, tailwindStylesheet, configFile): gửi cho từng server. */
const pushSettings = () => {
    for (const client of clients.values()) {
        const folder = client.presenceFolder
        client.sendNotification('workspace/didChangeConfiguration', { settings: lib.serverSettings(settingsFor(folder ? folder.uri : undefined)) })
    }
}

const restartAll = async () => {
    await Promise.all([...clients.keys()].map(stopClient))
    await Promise.all(vscode.workspace.textDocuments.map(ensureClientFor))
}

/** Lệnh "Sắp xếp class trong file": lấy code action `source` của server rồi áp dụng. */
const sortClasses = async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) return
    const document = editor.document
    await ensureClientFor(document)
    const client = clients.get(keyOf(vscode.workspace.getWorkspaceFolder(document.uri)))
    if (!client) {
        vscode.window.showInformationMessage('PresenceStyle: language server không chạy cho file này (kiểm tra presenceStyle.enable / presenceStyle.languages).')
        return
    }
    const end = document.lineAt(document.lineCount - 1).range.end
    const actions = await client.sendRequest('textDocument/codeAction', {
        textDocument: { uri: client.code2ProtocolConverter.asUri(document.uri) },
        range: { start: { line: 0, character: 0 }, end: { line: end.line, character: end.character } },
        context: { diagnostics: [], only: ['source'] },
    })
    const sort = (actions || []).find((action) => action.kind === 'source' && action.edit)
    if (!sort) {
        vscode.window.setStatusBarMessage('PresenceStyle: class đã đúng thứ tự', 3000)
        return
    }
    await vscode.workspace.applyEdit(await client.protocol2CodeConverter.asWorkspaceEdit(sort.edit))
}

function activate(context) {
    extensionContext = context
    output = vscode.window.createOutputChannel('PresenceStyle')
    context.subscriptions.push(
        output,
        vscode.commands.registerCommand('presenceStyle.sortClasses', sortClasses),
        vscode.commands.registerCommand('presenceStyle.restartServer', restartAll),
        vscode.commands.registerCommand('presenceStyle.showOutput', () => output.show(true)),
        vscode.workspace.onDidOpenTextDocument(ensureClientFor),
        vscode.workspace.onDidChangeWorkspaceFolders((event) => Promise.all(event.removed.map((folder) => stopClient(keyOf(folder))))),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (lib.needsRestart((key) => event.affectsConfiguration(key))) restartAll()
            else if (event.affectsConfiguration(lib.SECTION)) pushSettings()
        }),
        { dispose: () => void Promise.all([...clients.keys()].map(stopClient)) },
    )
    return Promise.all(vscode.workspace.textDocuments.map(ensureClientFor))
}

function deactivate() {
    return Promise.all([...clients.keys()].map(stopClient))
}

module.exports = { activate, deactivate }
