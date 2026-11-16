#!/usr/bin/env node
/**
 * Cổng kiểm tra cục bộ thay cho CI: chạy mọi bước kiểm chứng trên máy phát triển.
 *
 *   npm run check:all            # đầy đủ (dùng cho pre-push và prepublishOnly)
 *   npm run check:quick          # nhanh: typecheck + unit test (dùng cho pre-commit)
 *   node scripts/check-all.cjs --only=rust,browser
 *
 * Bước không có công cụ (cargo, Chromium) được BỎ QUA kèm cảnh báo, trừ khi đặt --strict.
 * Mã thoát khác 0 khi có bước lỗi.
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const root = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
const quick = args.includes('--quick')
const strict = args.includes('--strict')
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)

// Ngân sách: vượt là lỗi. Cập nhật có chủ đích khi thay đổi được chấp nhận.
// Tính gzip của entry cộng mọi chunk nó import tĩnh (số trình duyệt tải khi import thẳng từ CDN).
const BUDGET = {
    'dist/index-auto.mjs': 24 * 1024, // bản CDN (+chèn rule có thứ tự)
    'dist/index.mjs': 37 * 1024, // 4 file tải song song (chunk dùng chung với tailwind/merge): 34,7 -> 36,6 KB
    'dist/components.mjs': 8 * 1024,
    'dist/tailwind-auto.mjs': 44 * 1024, // thay @tailwindcss/browser (75 KB); dữ liệu nén giải mã lúc nạp; không từ điển x-css/cache: 52,1 -> 40,9 KB; +2,6 KB giá trị trần/gợi ý kiểu/bóng/--spacing()/@apply trong @utility như Tailwind: 43,5 KB
}
// Gói npm (`npm pack`): giải nén 6,8 MB -> 1,47 MB khi tách nhóm build (tsup.config.ts) và bỏ file
// tài liệu không đọc lúc chạy. Mục tiêu ≤ 1,5 MB.
const PACKAGE_BUDGET = 1500 * 1000
const EVAL_MIN = { xcssValidAfterFix: 99, tailwindValid: 98, holdout: 85 }

const hasCommand = (cmd) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0

const run = (cmd, cmdArgs, options = {}) => {
    const result = spawnSync(cmd, cmdArgs, { cwd: options.cwd || root, encoding: 'utf8', env: { ...process.env, ...options.env }, shell: process.platform === 'win32' })
    return { ok: result.status === 0, status: result.status, out: (result.stdout || '') + (result.stderr || '') }
}

const tail = (text, lines = 15) => text.trim().split('\n').slice(-lines).join('\n')

const steps = [
    {
        name: 'typecheck',
        quick: true,
        run: () => run('npx', ['tsc', '--noEmit']),
    },
    {
        name: 'unit',
        quick: true,
        run: () => {
            const r = run('npx', ['vitest', 'run'])
            const summary = (r.out.match(/Tests\s+.*\(\d+\)/) || [''])[0].replace(/\x1b\[[0-9;]*m/g, '')
            return { ...r, detail: summary }
        },
    },
    {
        name: 'build',
        run: () => run('npm', ['run', 'build']),
    },
    {
        name: 'size',
        run: () => {
            const lines = []
            let ok = true
            const withChunks = (file, seen = new Set()) => {
                if (seen.has(file)) return seen
                seen.add(file)
                const code = fs.readFileSync(path.join(root, file), 'utf8')
                for (const m of code.matchAll(/(?:from|import)\s*["'](\.\/[^"']+)["']/g)) withChunks(path.posix.join(path.posix.dirname(file), m[1]), seen)
                return seen
            }
            for (const [file, limit] of Object.entries(BUDGET)) {
                const files = [...withChunks(file)]
                const size = files.reduce((n, f) => n + zlib.gzipSync(fs.readFileSync(path.join(root, f))).length, 0)
                if (size > limit) ok = false
                lines.push(`${file}${files.length > 1 ? ` (+${files.length - 1} chunk)` : ''} ${(size / 1024).toFixed(1)}/${(limit / 1024).toFixed(0)} KB${size > limit ? ' VƯỢT' : ''}`)
            }
            return { ok, detail: lines.join('; ') }
        },
    },
    {
        name: 'package',
        // Gói đã `npm pack` cài vào thư mục tạm: mọi khoá "exports" chạy được bằng cả require lẫn import.
        run: () => {
            const r = run('node', ['scripts/smoke-exports.cjs', '--json'])
            let report
            try {
                report = JSON.parse(r.out.trim().split('\n').pop())
            } catch (_error) {
                return r
            }
            const failed = Object.entries(report.results).filter(([, v]) => !v.ok)
            const sizeOk = report.unpackedSize <= PACKAGE_BUDGET
            return {
                ok: r.ok && failed.length === 0 && sizeOk,
                detail: `${Object.keys(report.results).length - failed.length}/${Object.keys(report.results).length} export (require + import) · ${report.files} file, ` +
                    `${(report.size / 1024).toFixed(0)} KB nén, ${(report.unpackedSize / 1e6).toFixed(2)}/${(PACKAGE_BUDGET / 1e6).toFixed(2)} MB giải nén${sizeOk ? '' : ' VƯỢT'}` +
                    failed.map(([key, v]) => `\n✗ ${key}: ${v.errors.join('; ')}`).join(''),
            }
        },
    },
    {
        name: 'generated',
        // File sinh tự động (dictionary/conformance cho Rust, llms.txt) phải khớp mã nguồn.
        run: () => {
            const r = run('npm', ['run', 'gen'], {
                env: {
                    PRESENCE_STYLE_RUST_TESTS_DIR: 'presence_style/x-core/tests',
                    PRESENCE_STYLE_RUST_DICT_OUT: 'presence_style/x-core/src/dictionary_generated.rs',
                },
            })
            if (!r.ok) return r
            const files = ['spec', 'presence_style/x-core/tests/conformance.core.json', 'presence_style/x-core/src/dictionary_generated.rs', 'src/tailwind-generated.ts', 'src/tailwind-plugins-generated.ts', 'llms.txt', 'llms-full.txt']
            const diff = run('git', ['status', '--porcelain', '--', ...files])
            const changed = diff.out.trim()
            return changed
                ? { ok: false, detail: `file sinh tự động chưa cập nhật (đã sinh lại, hãy commit):\n${changed}` }
                : { ok: true, detail: 'khớp mã nguồn' }
        },
    },
    {
        name: 'rust',
        tool: 'cargo',
        run: () => {
            const cwd = path.join(root, 'presence_style')
            // Build trước: bước browser luôn so với mã Rust hiện tại, kể cả khi test Rust lỗi.
            const build = run('cargo', ['build', '--release', '-q', '-p', 'presence-style-core', '--example', 'css_from_stdin'], { cwd })
            if (!build.ok) return build
            const test = run('cargo', ['test', '--workspace', '-q'], { cwd })
            const passed = (test.out.match(/test result: ok\. (\d+) passed/g) || []).reduce((n, line) => n + Number(line.match(/(\d+) passed/)[1]), 0)
            return test.ok ? { ...test, detail: `${passed} test pass` } : test
        },
    },
    {
        name: 'browser',
        run: () => {
            const r = run('node', ['scripts/browser-checks.cjs'])
            if (r.status === 2) return { ok: true, skipped: true, detail: tail(r.out, 1) }
            let detail = tail(r.out, 3)
            try {
                const json = JSON.parse(r.out.trim().split('\n').pop())
                detail = Object.entries(json).map(([k, v]) => `${v.ok ? '✓' : '✗'} ${k}${v.skipped ? ' (bỏ qua)' : ''}: ${v.detail}`).join('\n')
            } catch (_error) {
                // giữ nguyên output thô
            }
            return { ok: r.ok, detail }
        },
    },
    {
        name: 'tailwind',
        // Khớp Tailwind thật (mẫu 4.000 class + biến thể + runtime + theme), độ phủ biến thể, plugin đóng gói sẵn
        // và dự án thật (shadcn/ui v4: 4 trạng thái).
        run: () => {
            const parity = run('node', ['eval/tailwind-parity.mjs', '--limit=4000'])
            if (!parity.ok) {
                if (/launch|Executable doesn't exist|Cannot find (module|package) 'tailwindcss'/.test(parity.out)) return { ok: true, skipped: true, detail: 'thiếu Chromium hoặc tailwindcss' }
                return parity
            }
            const variants = run('node', ['eval/tailwind-variants.mjs'])
            const plugins = run('node', ['eval/tailwind-plugins.mjs'])
            const real = run('node', ['eval/real-project.mjs'])
            // Dự án nâng cấp từ v3 (`@config "./tailwind.config.js"`): extend và thay hẳn theme.
            const v3 = [
                run('node', ['eval/real-project.mjs', '--css=eval/fixtures/v3-config/app.css', '--src=eval/fixtures/v3-config/src', '--label=v3-extend']),
                run('node', ['eval/real-project.mjs', '--css=eval/fixtures/v3-config/replace/app.css', '--src=eval/fixtures/v3-config/replace', '--label=v3-replace']),
            ]
            const order = run('node', ['eval/tailwind-order.mjs'])
            const prettier = run('node', ['eval/prettier-sort.mjs'])
            const merge = run('node', ['eval/merge-accuracy.mjs'])
            // Plugin JS tuỳ ý chạy qua API giả lập (không cần cài tailwindcss).
            const jsPlugins = run('node', ['eval/tailwind-js-plugins.mjs'])
            const report = JSON.parse(fs.readFileSync(path.join(root, 'eval/tailwind-parity.sample.json'), 'utf8'))
            const coverage = JSON.parse(fs.readFileSync(path.join(root, 'eval/tailwind-variants.json'), 'utf8'))
            const pluginReport = JSON.parse(fs.readFileSync(path.join(root, 'eval/tailwind-plugins.json'), 'utf8'))
            const realReport = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'eval/real-project.json'), 'utf8')).summary)[0]
            const pluginsOk = Object.values(pluginReport).every((p) => p.matched === p.cases)
            const allModes = (file) => Object.values(JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).summary)
            const fullMatch = (mode) => mode.converted === mode.total && Object.values(mode.matched).every((n) => n === mode.total) && (!mode.combos || Object.values(mode.combos.matched).every((n) => n === mode.combos.total))
            const v3Ok = v3.every((r) => r.ok) && ['eval/real-project-v3-extend.json', 'eval/real-project-v3-replace.json'].every((f) => allModes(f).every(fullMatch))
            const realOk = allModes('eval/real-project.json').every(fullMatch)
            const orderReport = JSON.parse(fs.readFileSync(path.join(root, 'eval/tailwind-order.json'), 'utf8'))
            const orderOk = order.ok && Object.values(orderReport).every((r) => r.wrong === 0)
            const prettierReport = JSON.parse(fs.readFileSync(path.join(root, 'eval/prettier-sort.json'), 'utf8'))
            const prettierOk = prettier.ok && prettierReport.identical === prettierReport.files
            const mergeReport = JSON.parse(fs.readFileSync(path.join(root, 'eval/merge-accuracy.json'), 'utf8'))
            const jsReport = JSON.parse(fs.readFileSync(path.join(root, 'eval/tailwind-js-plugins.json'), 'utf8'))
            const jsRows = Object.entries(jsReport.plugins || jsReport).filter(([, r]) => r && typeof r === 'object' && r.classes)
            // Plugin chỉ có biến thể (`tailwindcss-react-aria-components`: 0 class) không làm bước lỗi vì 0/0.
            const jsOk = jsPlugins.ok && jsRows.every(([, r]) => r.classes.cases === 0 || r.classes.matched / r.classes.cases >= 0.99)
            const mergeOk = merge.ok && Object.values(mergeReport).filter((r) => r && r.methods).every((r) => r.methods['@porbit/style/merge'].correct === r.pairs && r.methods['@porbit/style/merge/lite + bảng'].correct === r.pairs)
            const realMin = Math.min(realReport.converted, ...Object.values(realReport.matched))
            const ok = variants.ok && plugins.ok && real.ok && pluginsOk && report.base.percent >= 99.9 && report.variants.percent === 100 &&
                report.runtime.percent === 100 && report.theme.matched === report.theme.checked && coverage.percent >= 95 &&
                realMin / realReport.total >= 0.995 && realOk && v3Ok && orderOk && prettierOk && mergeOk && jsOk
            return {
                ok,
                detail: `class ${report.base.percent}% · biến thể ${report.variants.percent}% · runtime ${report.runtime.percent}% · theme ${report.theme.matched}/${report.theme.checked} · độ phủ biến thể ${coverage.percent}%\n` +
                    `plugin ${Object.entries(pluginReport).map(([id, p]) => `${id} ${p.matched}/${p.cases}`).join(', ')} · shadcn/ui ${realMin}/${realReport.total} (+tổ hợp, PostCSS) ${realOk ? '✓' : '✗'} · cấu hình v3 ${v3Ok ? '✓' : '✗'}\n` +
                    `plugin JS ${jsRows.map(([id, r]) => `${id} ${r.classes.matched}/${r.classes.cases}`).join(', ') || '✗'} ${jsOk ? '✓' : '✗'}\n` +
                    `thứ tự class ${orderOk ? '100%' : '✗'} · Prettier ${prettierReport.identical}/${prettierReport.files} file · gộp class ${mergeOk ? '100%' : '✗'} (tailwind-merge: ${Object.values(mergeReport).filter((r) => r && r.methods).map((r) => r.methods['tailwind-merge 3.7'].percent + '%').join(' / ')})`,
            }
        },
    },
    {
        name: 'eval',
        run: () => {
            const r = run('node', ['eval/score.cjs'])
            if (!r.ok) {
                if (/launch|Executable doesn't exist/.test(r.out)) return { ok: true, skipped: true, detail: 'không có Chromium' }
                return r
            }
            const results = JSON.parse(fs.readFileSync(path.join(root, 'eval/results.json'), 'utf8'))
            const failed = Object.entries(EVAL_MIN).filter(([key, min]) => !(results[key] >= min))
            return {
                ok: failed.length === 0,
                detail: Object.entries(EVAL_MIN).map(([key, min]) => `${key} ${results[key]}% (≥${min}%)`).join('; '),
            }
        },
    },
]

const selected = steps.filter((step) => (only.length ? only.includes(step.name) : !quick || step.quick))
const rows = []
let failed = 0
for (const step of selected) {
    const started = Date.now()
    process.stdout.write(`▶ ${step.name}… `)
    let result
    if (step.tool && !hasCommand(step.tool)) {
        result = { ok: !strict, skipped: true, detail: `không có ${step.tool}` }
    } else {
        try {
            result = step.run()
        } catch (error) {
            result = { ok: false, detail: error.message }
        }
    }
    if (result.skipped && strict) result.ok = false
    const seconds = ((Date.now() - started) / 1000).toFixed(1)
    const status = result.skipped ? (result.ok ? 'BỎ QUA' : 'THIẾU') : result.ok ? 'OK' : 'LỖI'
    console.log(`${status} (${seconds}s)`)
    const detail = result.detail || (result.ok ? '' : tail(result.out || ''))
    if (detail) console.log(detail.split('\n').map((l) => '   ' + l).join('\n'))
    if (!result.ok) failed++
    rows.push({ step: step.name, status, seconds })
}

console.log(`\n${failed ? '✗' : '✓'} ${rows.length - failed}/${rows.length} bước đạt${failed ? '' : ''}.`)
process.exit(failed ? 1 : 0)
