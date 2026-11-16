#!/usr/bin/env node
/**
 * Kiểm tra gói xuất bản như người dùng cài: `npm pack` -> giải nén vào node_modules/@porbit/style của
 * thư mục tạm -> với mỗi khoá trong "exports" thử `require()` và `import()` qua tên gói (mỗi khoá một
 * tiến trình riêng), so tên export hai bản, kèm vài kiểm tra chức năng (PostCSS kiểu Next.js, plugin webpack, tài liệu
 * MCP đọc từ gói, CLI trong "bin": `extract` và language server `lsp` qua scripts/lsp-smoke.cjs).
 *
 *   npm run build && node scripts/smoke-exports.cjs [--json]
 *
 * Cần dist/ đã build. Mã thoát khác 0 khi có export lỗi.
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const root = path.resolve(__dirname, '..')
const pkg = require(path.join(root, 'package.json'))
const json = process.argv.includes('--json')

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'porbit-smoke-'))
const fail = (message) => {
    console.error(message)
    process.exit(1)
}

// npm pack đúng danh sách "files" mà npm publish dùng.
const pack = spawnSync('npm', ['pack', '--json', '--pack-destination', work], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' })
if (pack.status !== 0) fail(pack.stderr || pack.stdout)
const info = JSON.parse(pack.stdout)[0]
const target = path.join(work, 'node_modules', '@porbit')
fs.mkdirSync(target, { recursive: true })
const untar = spawnSync('tar', ['-xzf', path.join(work, info.filename), '-C', target])
if (untar.status !== 0) fail(String(untar.stderr))
fs.renameSync(path.join(target, 'package'), path.join(target, 'style'))
fs.writeFileSync(path.join(work, 'package.json'), '{"private":true}\n')
// Peer dependency (plugin Prettier dùng parser của prettier).
for (const dep of Object.keys(pkg.peerDependencies || {})) {
    const from = path.join(root, 'node_modules', dep)
    if (fs.existsSync(from)) fs.symlinkSync(from, path.join(work, 'node_modules', dep), 'dir')
}

// Chạy trong tiến trình con: entry auto có side effect, không để ảnh hưởng lẫn nhau.
const probe = (specifier) => `
// \`postcss: true\` là dấu hiệu plugin PostCSS gắn lên hàm của bản CJS, không phải export.
const names = (m) => Object.keys(m).filter((k) => k !== 'default' && k !== '__esModule' && k !== 'module.exports' && !(typeof m === 'function' && k === 'postcss')).sort()
const out = {}
try {
    const m = require(${JSON.stringify(specifier)})
    out.require = { type: typeof m, names: names(m), hasDefault: m != null && 'default' in m }
} catch (error) { out.require = { error: error.message.split('\\n')[0] } }
import(${JSON.stringify(specifier)}, ${specifier.endsWith('.json') ? "{ with: { type: 'json' } }" : 'undefined'}).then((m) => {
    out.import = { type: typeof m.default, names: names(m), hasDefault: 'default' in m }
}, (error) => { out.import = { error: error.message.split('\\n')[0] } }).then(async () => {
    ${specifier === '@porbit/style/postcss' ? `
    // Next.js: require('@porbit/style/postcss')(options) phải trả plugin PostCSS.
    const fn = require(${JSON.stringify(specifier)})
    const plugin = fn({ content: [] })
    out.check = typeof fn === 'function' && fn.postcss === true && plugin && plugin.postcssPlugin ? 'plugin PostCSS' : 'require(...) không phải plugin PostCSS'
    out.checkOk = out.check === 'plugin PostCSS'` : ''}
    ${specifier === '@porbit/style/webpack' ? `
    // Plugin webpack/Rspack: production thêm loader trỏ tới file có trong gói, file đó export hàm loader.
    const { PresenceStyleWebpackPlugin } = require(${JSON.stringify(specifier)})
    const rules = []
    const hook = { tapPromise() {}, tap() {} }
    new PresenceStyleWebpackPlugin({ shortClassNames: true }).apply({ context: process.cwd(), options: { mode: 'production', module: { rules } }, hooks: { beforeRun: hook, watchRun: hook, thisCompilation: hook } })
    const loader = rules[0] && require(rules[0].loader)
    out.check = typeof loader === 'function' && loader === require('@porbit/style/webpack-loader') ? 'loader ' + require('path').basename(rules[0].loader) : 'loader không chạy được'
    out.checkOk = typeof loader === 'function'` : ''}
    ${specifier === '@porbit/style/next' ? `
    // withPresenceStyle: build production thêm plugin, dev thì không.
    const { withPresenceStyle } = require(${JSON.stringify(specifier)})
    const config = withPresenceStyle({}, { shortClassNames: true })
    const prod = config.webpack({ plugins: [] }, { dev: false, dir: process.cwd() }).plugins.length
    const dev = config.webpack({ plugins: [] }, { dev: true, dir: process.cwd() }).plugins.length
    out.check = prod === 1 && dev === 0 ? 'withPresenceStyle thêm plugin khi build' : 'withPresenceStyle sai'
    out.checkOk = prod === 1 && dev === 0` : ''}
    ${specifier === '@porbit/style/mcp' ? `
    // MCP server đọc tài liệu nằm trong gói: mọi resource phải đọc được.
    const mcp = await import(${JSON.stringify(specifier)})
    const list = await mcp.handleRequest({ jsonrpc: '2.0', id: 1, method: 'resources/list' }, { root: process.cwd() })
    const missing = []
    for (const r of list.resources) {
        const res = await mcp.handleRequest({ jsonrpc: '2.0', id: 2, method: 'resources/read', params: { uri: r.uri } }, { root: process.cwd() })
        if (/^Không tìm thấy/.test(res.contents[0].text)) missing.push(r.uri)
    }
    out.check = missing.length ? 'thiếu tài liệu: ' + missing.join(', ') : list.resources.length + ' resource đọc được'
    out.checkOk = missing.length === 0` : ''}
    console.log(JSON.stringify(out))
})
`

const results = {}
for (const key of Object.keys(pkg.exports)) {
    const specifier = key === '.' ? pkg.name : `${pkg.name}/${key.slice(2)}`
    const r = spawnSync(process.execPath, ['-e', probe(specifier)], { cwd: work, encoding: 'utf8', timeout: 60000 })
    let out
    try {
        out = JSON.parse(r.stdout.trim().split('\n').pop())
    } catch (_error) {
        out = { error: (r.stderr || r.stdout || 'không có output').trim().split('\n')[0] }
    }
    const errors = [out.error, out.require?.error && `require: ${out.require.error}`, out.import?.error && `import: ${out.import.error}`].filter(Boolean)
    // Hai bản phải cùng tên export (bản JSON thì so kiểu).
    if (!errors.length && !key.endsWith('.json') && out.require.names.join() !== out.import.names.join()) errors.push(`tên export khác nhau: require [${out.require.names}] / import [${out.import.names}]`)
    if (out.checkOk === false) errors.push(out.check)
    results[key] = { ok: errors.length === 0, exports: out.import?.names?.length ?? 0, default: out.import?.hasDefault ?? false, check: out.check, errors }
}

// CLI trong "bin" chạy được từ gói đã cài: trích xuất CSS từ một file HTML.
{
    const bin = path.join(work, 'node_modules', pkg.name, typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin)[0])
    fs.writeFileSync(path.join(work, 'smoke.html'), '<div class="p[4] c[red]"></div>')
    const r = spawnSync(process.execPath, [bin, 'extract', 'smoke.html', '--silent'], { cwd: work, encoding: 'utf8' })
    const ok = r.status === 0 && /padding/.test(r.stdout) && fs.readFileSync(bin, 'utf8').startsWith('#!')
    results.bin = { ok, check: ok ? 'extract sinh CSS' : (r.stderr || r.stdout).trim().split('\n')[0], errors: ok ? [] : ['CLI lỗi'] }

    // `presence-style lsp` của gói đã cài, như extension VS Code/Zed khởi chạy: initialize, completion, hover, màu...
    const lsp = spawnSync(process.execPath, [path.join(__dirname, 'lsp-smoke.cjs'), '--server', bin, '--json'], { encoding: 'utf8', timeout: 60000 })
    let report
    try {
        report = JSON.parse(lsp.stdout.trim().split('\n').pop())
    } catch (_error) {
        report = { ok: false, checks: [{ name: 'lsp', ok: false, detail: (lsp.stderr || lsp.stdout || 'không có output').trim().split('\n')[0] }] }
    }
    const failedChecks = report.checks.filter((c) => !c.ok)
    results['bin lsp'] = {
        ok: report.ok,
        check: `${report.checks.length - failedChecks.length}/${report.checks.length} kiểm tra LSP`,
        errors: failedChecks.map((c) => `${c.name}: ${c.detail}`),
    }
}

fs.rmSync(work, { recursive: true, force: true })
const failed = Object.entries(results).filter(([, r]) => !r.ok)
const summary = { files: info.entryCount, size: info.size, unpackedSize: info.unpackedSize, results }
if (json) console.log(JSON.stringify(summary))
else {
    for (const [key, r] of Object.entries(results)) console.log(`${r.ok ? '✓' : '✗'} ${key}${r.check ? ` (${r.check})` : ''}${r.errors.length ? ': ' + r.errors.join('; ') : ''}`)
    console.log(`gói: ${info.entryCount} file, ${(info.size / 1024).toFixed(0)} KB nén, ${(info.unpackedSize / 1024).toFixed(0)} KB giải nén`)
}
process.exit(failed.length ? 1 : 0)
