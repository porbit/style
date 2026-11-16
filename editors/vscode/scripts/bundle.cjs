#!/usr/bin/env node
/**
 * Đóng gói extension trước `vsce package` (chạy tự động qua `vscode:prepublish`):
 *   - dist/extension.js: extension.js + lib.js + vscode-languageclient trong một file (không cần node_modules trong .vsix),
 *   - server/presence-style-lsp.js: language server dự phòng (khi dự án chưa cài @porbit/style), gói từ
 *     dist/lsp.js của repo (`npm run build` ở gốc) hoặc từ @porbit/style cài trong thư mục này,
 *   - LICENSE: chép từ gốc repo.
 *
 *   node scripts/bundle.cjs [--production]
 */
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')

const here = path.resolve(__dirname, '..')
const repo = path.resolve(here, '../..')
const production = process.argv.includes('--production')

/** dist/lsp.js của repo nếu đã build, không thì gói @porbit/style cài trong editors/vscode/node_modules. */
const lspModule = () => {
    const local = path.join(repo, 'dist/lsp.js')
    if (fs.existsSync(local)) return local
    try {
        return require.resolve('@porbit/style/lsp', { paths: [here] })
    } catch (_error) {
        throw new Error('Không tìm thấy language server: chạy `npm run build` ở gốc repo hoặc `npm install @porbit/style` trong editors/vscode.')
    }
}

const main = async () => {
    const common = { bundle: true, platform: 'node', format: 'cjs', target: 'node18', minify: production, legalComments: 'none', logLevel: 'warning' }
    await esbuild.build({ ...common, entryPoints: [path.join(here, 'extension.js')], outfile: path.join(here, 'dist/extension.js'), external: ['vscode'] })
    const server = lspModule()
    await esbuild.build({
        ...common,
        // Bản đóng gói chỉ chạy `presence-style lsp`: không kéo CLI/MCP vào.
        stdin: {
            contents: `const { startLanguageServer } = require(${JSON.stringify(server)})\nstartLanguageServer()\nprocess.stdin.on('end', () => process.exit(0))\n`,
            resolveDir: here,
            sourcefile: 'presence-style-lsp.js',
        },
        outfile: path.join(here, 'server/presence-style-lsp.js'),
        banner: { js: `/* @porbit/style language server (đóng gói từ ${path.relative(repo, server).replace(/\\/g, '/')}) */` },
    })
    const license = path.join(repo, 'LICENSE')
    if (fs.existsSync(license)) fs.copyFileSync(license, path.join(here, 'LICENSE'))
    for (const file of ['dist/extension.js', 'server/presence-style-lsp.js']) {
        console.log(`${file} ${(fs.statSync(path.join(here, file)).size / 1024).toFixed(0)} KB`)
    }
}

main().catch((error) => {
    console.error(error.message)
    process.exit(1)
})
