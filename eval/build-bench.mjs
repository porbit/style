#!/usr/bin/env node
/**
 * Thời gian build tĩnh (CSS kiểu Tailwind v4) trên một dự án nhiều nghìn file: @porbit/style vs Tailwind CLI v4.
 *
 *   npm run build && node eval/build-bench.mjs [--files=6000] [--rounds=9] [--warm=5] [--tw=<thư mục node_modules>]
 *                                               [--ours=dist,<dist khác>...] [--no-write] [--regen]
 *
 * - Bộ bench: nhân bản file nguồn của eval/fixtures/{hyperui,coss-ui,magicui,shadcn-v4} (html, tsx, ts, js) vào thư
 *   mục tạm cho đủ `--files` file; CSS vào là `@import "tailwindcss";` (quét cả thư mục, như mặc định của Tailwind).
 * - Tailwind: làm đúng như `@tailwindcss/cli -i input.css -o out.css --minify`: `compile()` của `@tailwindcss/node`,
 *   `new Scanner({ sources })` của `@tailwindcss/oxide` (Rust, đa luồng), `scan()`, `build()`, `optimize()`
 *   (Lightning CSS). Tìm các gói này trong node_modules của repo, hoặc ở `--tw=<thư mục node_modules>` /
 *   biến môi trường `TAILWIND_NODE_MODULES`. Không có thì chỉ đo phía ta.
 * - Ta: `compileTailwindCss()` của dist/postcss (đúng đường của plugin PostCSS), tối ưu bật (mặc định).
 * - cold: mỗi lượt một tiến trình Node mới (gồm nạp module); in thời gian tường của cả tiến trình và thời gian
 *   từng pha đo bên trong. warm: cùng một tiến trình, module và JIT đã nóng, mỗi lượt build lại toàn bộ (mtime
 *   của mọi file được đổi trước mỗi lượt để bộ nhớ đệm theo mtime của ta không được dùng — so sánh công bằng với
 *   `Scanner` mới của Tailwind).
 * - Hai phía chạy xen kẽ trong cùng lượt (máy bận thì cả hai cùng chịu); báo trung vị và [min–max].
 * - `--ours=dist,/đường/dẫn/dist-cũ`: so nhiều bản build của ta (trước/sau tối ưu), kèm kiểm CSS đầu ra trùng byte.
 * - `--single-thread`: thêm lượt cold của bản đầu tiên với `PRESENCE_STYLE_WORKERS=0` (không luồng phụ khi trích).
 * Bộ bench được giữ trong thư mục tạm để lần sau dùng lại (`--regen` để sinh lại, `--dir=` để đặt chỗ khác).
 * Ghi eval/build-bench.json.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const args = process.argv.slice(2)
const arg = (name, fallback) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`))
    return hit ? hit.slice(name.length + 3) : fallback
}
const flag = (name) => args.includes(`--${name}`)
const now = () => performance.now()
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)

// ---------- Tìm Tailwind ----------
const findTailwind = () => {
    const candidates = [arg('tw'), process.env.TAILWIND_NODE_MODULES, path.join(root, 'node_modules')].filter(Boolean)
    for (const dir of candidates) {
        try {
            const req = createRequire(path.join(path.resolve(dir), 'noop.js'))
            const node = req.resolve('@tailwindcss/node')
            const oxide = req.resolve('@tailwindcss/oxide')
            const version = JSON.parse(fs.readFileSync(path.join(path.dirname(req.resolve('tailwindcss/package.json')), 'package.json'), 'utf8')).version
            let cli = null
            try {
                cli = path.join(path.dirname(req.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs')
            } catch (_error) {
                cli = null
            }
            const nodeModules = path.dirname(path.dirname(req.resolve('tailwindcss/package.json')))
            return { node, oxide, version, cli, nodeModules }
        } catch (_error) {
            // thử thư mục kế tiếp
        }
    }
    return null
}

// ---------- Các tiến trình con ----------
// Phía Tailwind: như @tailwindcss/cli (xem chú thích đầu file).
const runTailwind = async (tw, dir, css) => {
    const t0 = now()
    const { compile, optimize } = await import(tw.node)
    const { Scanner } = await import(tw.oxide)
    const t1 = now()
    const compiler = await compile(css, { base: dir, from: path.join(dir, 'input.css'), onDependency() {} })
    const sources = (compiler.root === 'none' ? [] : compiler.root === null ? [{ base: dir, pattern: '**/*', negated: false }] : [{ ...compiler.root, negated: false }]).concat(compiler.sources)
    const scanner = new Scanner({ sources })
    const t2 = now()
    const candidates = scanner.scan()
    const t3 = now()
    const raw = compiler.build(candidates)
    const t4 = now()
    const out = optimize(raw, { file: 'input.css', minify: true }).code
    const t5 = now()
    return { load: t1 - t0, setup: t2 - t1, scan: t3 - t2, generate: t5 - t3, build: t4 - t3, optimize: t5 - t4, total: t5 - t1, bytes: out.length, hash: hash(out), candidates: candidates.length }
}

// Phía ta: compileTailwindCss của dist/postcss.
const loadOurs = (dist) => createRequire(path.join(dist, 'noop.js'))(path.join(dist, 'postcss.cjs'))
const runOurs = async (mod, dir, css) => {
    const t1 = now()
    const result = await mod.compileTailwindCss(css, { base: dir, from: path.join(dir, 'input.css') })
    const t2 = now()
    return { total: t2 - t1, ...(result.timings || {}), bytes: result.css.length, hash: hash(result.css), candidates: result.candidates }
}

const touchAll = (files) => {
    const stamp = new Date(Date.now() - Math.floor(Math.random() * 1e6))
    for (const file of files) fs.utimesSync(file, stamp, stamp)
}

if (arg('child')) {
    const [kind, dir, extra] = [arg('child'), arg('dir'), arg('target')]
    const css = fs.readFileSync(path.join(dir, 'input.css'), 'utf8')
    const t0 = now()
    let result
    if (kind === 'tw') result = await runTailwind(JSON.parse(extra), dir, css)
    else {
        const mod = loadOurs(extra)
        const t1 = now()
        result = { load: t1 - t0, ...(await runOurs(mod, dir, css)) }
    }
    process.stdout.write(JSON.stringify(result))
    process.exit(0)
}

if (arg('warm-child')) {
    // Một tiến trình nạp cả hai phía rồi build xen kẽ.
    const dir = arg('dir')
    const tw = arg('tw-json') ? JSON.parse(arg('tw-json')) : null
    const dists = JSON.parse(arg('dists'))
    const iterations = Number(arg('iterations'))
    const css = fs.readFileSync(path.join(dir, 'input.css'), 'utf8')
    const files = JSON.parse(fs.readFileSync(path.join(dir, '..', 'files.json'), 'utf8')).map((f) => path.join(dir, f))
    const mods = dists.map(loadOurs)
    const out = { tw: [], ours: dists.map(() => []) }
    for (let i = 0; i < iterations + 2; i++) {
        const order = i % 2 ? ['ours', 'tw'] : ['tw', 'ours']
        for (const side of order) {
            if (side === 'tw' && tw) {
                const r = await runTailwind(tw, dir, css)
                if (i >= 2) out.tw.push(r)
            }
            if (side === 'ours') {
                for (let k = 0; k < mods.length; k++) {
                    touchAll(files)
                    const r = await runOurs(mods[k], dir, css)
                    if (i >= 2) out.ours[k].push(r)
                }
            }
        }
    }
    process.stdout.write(JSON.stringify(out))
    process.exit(0)
}

// ---------- Sinh bộ bench ----------
const FIXTURES = ['hyperui', 'coss-ui', 'magicui', 'shadcn-v4']
const SOURCE_EXT = /\.(html|tsx|ts|jsx|js)$/
const listFixtureFiles = () => {
    const out = []
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) walk(full)
            else if (SOURCE_EXT.test(entry.name)) out.push(full)
        }
    }
    for (const name of FIXTURES) walk(path.join(root, 'eval/fixtures', name))
    return out.sort()
}

const generate = (dir, count) => {
    const sources = listFixtureFiles()
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
    const files = []
    for (let copy = 0; files.length < count; copy++) {
        for (const file of sources) {
            if (files.length >= count) break
            const rel = path.join('src', `copy${copy}`, path.relative(path.join(root, 'eval/fixtures'), file))
            fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true })
            fs.copyFileSync(file, path.join(dir, rel))
            files.push(rel)
        }
    }
    fs.writeFileSync(path.join(dir, 'input.css'), '@import "tailwindcss";\n')
    // Danh sách file đặt ngoài thư mục được quét (oxide quét mọi file văn bản, kể cả .json).
    fs.writeFileSync(path.join(dir, '..', 'files.json'), JSON.stringify(files))
    return files
}

// ---------- Main ----------
const count = Number(arg('files', 6000))
const rounds = Number(arg('rounds', 9))
const warmIterations = Number(arg('warm', 5))
const benchDir = path.resolve(arg('dir', path.join(os.tmpdir(), `ps-build-bench-${count}`, 'project')))
const tw = findTailwind()
const dists = arg('ours', 'dist').split(',').map((d) => path.resolve(root, d))
for (const dist of dists) if (!fs.existsSync(path.join(dist, 'postcss.cjs'))) throw new Error(`Thiếu ${dist}/postcss.cjs — chạy npm run build trước.`)

const listFile = path.join(path.dirname(benchDir), 'files.json')
let files = fs.existsSync(listFile) && fs.existsSync(path.join(benchDir, 'input.css')) ? JSON.parse(fs.readFileSync(listFile, 'utf8')) : null
if (!files || files.length !== count || flag('regen')) files = generate(benchDir, count)

// compile() của Tailwind tìm `tailwindcss` từ thư mục dự án: đặt node_modules ở thư mục cha (ngoài vùng quét).
if (tw) {
    const link = path.join(path.dirname(benchDir), 'node_modules')
    fs.rmSync(link, { force: true, recursive: false })
    fs.symlinkSync(tw.nodeModules, link, 'dir')
}

const self = new URL(import.meta.url).pathname
const runChild = (childArgs, env = {}) => {
    const t0 = now()
    const res = spawnSync(process.execPath, [self, ...childArgs], { encoding: 'utf8', maxBuffer: 1 << 26, cwd: benchDir, env: { ...process.env, ...env } })
    const wall = now() - t0
    if (res.status !== 0) throw new Error(res.stderr || `tiến trình con lỗi (${res.status})`)
    return { wall, ...JSON.parse(res.stdout) }
}

const label = (dist) => (dists.length > 1 ? `ta (${path.relative(root, dist) || dist})` : 'ta')
const sides = [
    ...(tw ? [{ name: `Tailwind ${tw.version} (oxide)`, args: ['--child=tw', `--target=${JSON.stringify(tw)}`] }] : []),
    ...dists.map((dist) => ({ name: label(dist), args: ['--child=ours', `--target=${dist}`] })),
    // --single-thread: thêm lượt cold của bản đầu tiên không dùng luồng phụ (so phần lợi của worker_threads).
    ...(flag('single-thread') ? [{ name: `${label(dists[0])} 1 luồng`, args: ['--child=ours', `--target=${dists[0]}`], env: { PRESENCE_STYLE_WORKERS: '0' }, coldOnly: true }] : []),
]

console.log(`Bộ bench: ${files.length} file trong ${benchDir}`)
if (!tw) console.log('Không tìm thấy @tailwindcss/node + @tailwindcss/oxide (dùng --tw=<node_modules>): chỉ đo phía ta.')

const cold = Object.fromEntries(sides.map((s) => [s.name, []]))
for (let r = 0; r < rounds; r++) {
    const order = r % 2 ? [...sides].reverse() : sides
    for (const side of order) cold[side.name].push(runChild([...side.args, `--dir=${benchDir}`], side.env))
    process.stdout.write(`\rcold ${r + 1}/${rounds}`)
}
process.stdout.write('\n')

const warm = Object.fromEntries(sides.map((s) => [s.name, []]))
const warmProcesses = Math.max(1, Math.round(rounds / 3))
for (let p = 0; p < warmProcesses; p++) {
    const res = spawnSync(process.execPath, [self, '--warm-child=1', `--dir=${benchDir}`, ...(tw ? [`--tw-json=${JSON.stringify(tw)}`] : []), `--dists=${JSON.stringify(dists)}`, `--iterations=${warmIterations}`], { encoding: 'utf8', maxBuffer: 1 << 26, cwd: benchDir, env: { ...process.env } })
    if (res.status !== 0) throw new Error(res.stderr)
    const out = JSON.parse(res.stdout)
    if (tw) warm[sides[0].name].push(...out.tw)
    dists.forEach((dist, k) => warm[label(dist)].push(...out.ours[k]))
    process.stdout.write(`\rwarm ${p + 1}/${warmProcesses}`)
}
process.stdout.write('\n')

const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b)
    return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : undefined
}
const stat = (runs, key) => {
    const xs = runs.map((r) => r[key]).filter((x) => typeof x === 'number')
    if (!xs.length) return undefined
    return { median: +median(xs).toFixed(1), min: +Math.min(...xs).toFixed(1), max: +Math.max(...xs).toFixed(1) }
}
const KEYS = ['wall', 'load', 'total', 'setup', 'scan', 'extract', 'generate']
const summarize = (runs) => Object.fromEntries(KEYS.map((k) => [k, stat(runs, k)]).filter(([, v]) => v))
const result = {
    date: new Date().toISOString().slice(0, 10),
    node: process.version,
    cpus: os.cpus().length,
    files: files.length,
    rounds,
    warmIterations: warmProcesses * warmIterations,
    tailwind: tw ? tw.version : null,
    sides: Object.fromEntries(sides.map((s) => {
        const first = cold[s.name][0]
        return [s.name, { cssBytes: first.bytes, cssHash: first.hash, candidates: first.candidates, cold: summarize(cold[s.name]), warm: summarize(warm[s.name]) }]
    })),
}
// CSS đầu ra phải ổn định giữa các lượt (và trùng byte giữa các bản build của ta).
for (const s of sides) {
    const hashes = new Set([...cold[s.name], ...warm[s.name]].map((r) => r.hash))
    if (hashes.size !== 1) console.log(`CẢNH BÁO: ${s.name} cho ${hashes.size} CSS khác nhau giữa các lượt`)
}
if (dists.length > 1) {
    const hashes = new Set(dists.map((d) => result.sides[label(d)].cssHash))
    result.oursIdentical = hashes.size === 1
    console.log(result.oursIdentical ? 'CSS của các bản build ta: trùng byte.' : 'CSS của các bản build ta: KHÁC NHAU.')
}

const fmt = (s) => (s ? `${s.median} [${s.min}–${s.max}]` : '—')
console.log(`\n${files.length} file, ${rounds} lượt cold, ${result.warmIterations} lượt warm (ms, trung vị [min–max])`)
for (const [name, s] of Object.entries(result.sides)) {
    console.log(`\n${name}: CSS ${(s.cssBytes / 1024).toFixed(1)} KB, ${s.candidates} ứng viên`)
    console.log(`  cold: tiến trình ${fmt(s.cold.wall)} · nạp module ${fmt(s.cold.load)} · build ${fmt(s.cold.total)} (chuẩn bị ${fmt(s.cold.setup)}, quét ${fmt(s.cold.scan)}, trích ${fmt(s.cold.extract)}, sinh CSS ${fmt(s.cold.generate)})`)
    console.log(`  warm: build ${fmt(s.warm.total)} (chuẩn bị ${fmt(s.warm.setup)}, quét ${fmt(s.warm.scan)}, trích ${fmt(s.warm.extract)}, sinh CSS ${fmt(s.warm.generate)})`)
}
console.log('\nTailwind: "quét" = Scanner.scan() (tìm file + đọc + trích ứng viên, đa luồng); "sinh CSS" = build() + optimize().')
console.log('Ta: "quét" = liệt kê file + .gitignore; "trích" = đọc + trích ứng viên; "sinh CSS" = dựng dialect + giải class + thu gọn.')
if (!flag('no-write')) fs.writeFileSync(path.join(root, 'eval/build-bench.json'), JSON.stringify(result, null, 2) + '\n')
