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
const BUDGET = {
    'dist/index-auto.mjs': 23 * 1024, // bản CDN
    'dist/index.mjs': 36 * 1024,
    'dist/components.mjs': 8 * 1024,
    'dist/tailwind-auto.mjs': 57 * 1024, // thay @tailwindcss/browser (75 KB)
}
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
            for (const [file, limit] of Object.entries(BUDGET)) {
                const size = zlib.gzipSync(fs.readFileSync(path.join(root, file))).length
                if (size > limit) ok = false
                lines.push(`${file} ${(size / 1024).toFixed(1)}/${(limit / 1024).toFixed(0)} KB${size > limit ? ' VƯỢT' : ''}`)
            }
            return { ok, detail: lines.join('; ') }
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
            const files = ['spec', 'presence_style/x-core/tests/conformance.core.json', 'presence_style/x-core/src/dictionary_generated.rs', 'src/tailwind-generated.ts', 'llms.txt', 'llms-full.txt']
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
        // Khớp Tailwind thật (mẫu 4.000 class + biến thể + runtime + theme) và độ phủ biến thể.
        run: () => {
            const parity = run('node', ['eval/tailwind-parity.mjs', '--limit=4000'])
            if (!parity.ok) {
                if (/launch|Executable doesn't exist|Cannot find (module|package) 'tailwindcss'/.test(parity.out)) return { ok: true, skipped: true, detail: 'thiếu Chromium hoặc tailwindcss' }
                return parity
            }
            const variants = run('node', ['eval/tailwind-variants.mjs'])
            const report = JSON.parse(fs.readFileSync(path.join(root, 'eval/tailwind-parity.sample.json'), 'utf8'))
            const coverage = JSON.parse(fs.readFileSync(path.join(root, 'eval/tailwind-variants.json'), 'utf8'))
            const ok = variants.ok && report.base.percent >= 99.9 && report.variants.percent === 100 && report.runtime.percent === 100 &&
                report.theme.matched === report.theme.checked && coverage.percent >= 95
            return {
                ok,
                detail: `class ${report.base.percent}% · biến thể ${report.variants.percent}% · runtime ${report.runtime.percent}% · theme ${report.theme.matched}/${report.theme.checked} · độ phủ biến thể ${coverage.percent}%`,
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
