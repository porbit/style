#!/usr/bin/env node
/**
 * Thời gian build tĩnh (CSS kiểu Tailwind v4) trên dự án nhiều nghìn file: @porbit/style vs Tailwind CLI v4.
 *
 *   npm run build && node eval/build-bench.mjs [--sets=mixed,html] [--files=6000] [--html-copies=17] [--rounds=9]
 *                                               [--warm=5] [--tw=<thư mục node_modules>] [--ours=dist,<dist khác>...]
 *                                               [--no-write] [--regen]
 *
 * - Hai bộ bench (thư mục tạm, giữ lại cho lần sau; `--regen` để sinh lại, `--dir=` để đặt thư mục gốc khác):
 *     mixed: nhân bản file nguồn của eval/fixtures/{hyperui,coss-ui,magicui,shadcn-v4} (html, tsx, ts, js) cho đủ
 *            `--files` file;
 *     html:  nhân bản `--html-copies` lần các trang HTML của eval/fixtures/hyperui (369 trang → ~6.300 trang, nhiều
 *            SVG nội tuyến).
 *   CSS vào là `@import "tailwindcss";` (quét cả thư mục, như mặc định của Tailwind).
 * - Tailwind: làm đúng như `@tailwindcss/cli -i input.css -o out.css --minify`: `compile()` của `@tailwindcss/node`,
 *   `new Scanner({ sources })` của `@tailwindcss/oxide` (Rust, đa luồng), `scan()`, `build()`, `optimize()`
 *   (Lightning CSS). Tìm các gói này trong node_modules của repo, hoặc ở `--tw=<thư mục node_modules>` /
 *   biến môi trường `TAILWIND_NODE_MODULES`. Không có thì chỉ đo phía ta. Tailwind không có bộ nhớ đệm trên đĩa.
 * - Ta: `compileTailwindCss()` của dist/postcss (đúng đường của plugin PostCSS), tối ưu bật (mặc định).
 * - Các chế độ (mỗi lượt một tiến trình Node mới, gồm nạp module; in thời gian tường của cả tiến trình và từng pha):
 *     cold:        ta với bộ nhớ đệm quét trên đĩa rỗng (build đầu tiên; file đệm ghi lúc tiến trình thoát, tính
 *                  trong thời gian tường);
 *     cold+cache:  ta với bộ nhớ đệm trên đĩa từ lần trước, không file nào đổi (build lại trong tiến trình mới: CI có
 *                  giữ node_modules/.cache, khởi động lại dev server);
 *     warm:        cùng một tiến trình, module và JIT đã nóng, mỗi lượt build lại toàn bộ (mtime của mọi file được đổi
 *                  trước mỗi lượt nên bộ nhớ đệm của ta không được dùng — so sánh công bằng với `Scanner` mới của
 *                  Tailwind).
 * - Các phía chạy xen kẽ trong cùng lượt (máy bận thì cùng chịu); báo trung vị và [min–max].
 * - `--ours=dist,trước=/đường/dẫn/dist-cũ`: so nhiều bản build của ta (nhãn `nhãn=` tuỳ chọn), kèm kiểm CSS đầu ra
 *   trùng byte giữa các bản.
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
            const nodeModules = path.dirname(path.dirname(req.resolve('tailwindcss/package.json')))
            return { node, oxide, version, nodeModules }
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

// Phía ta: compileTailwindCss của dist/postcss. `cacheDir`: thư mục bộ nhớ đệm quét (ngoài vùng quét).
const loadOurs = (dist) => createRequire(path.join(dist, 'noop.js'))(path.join(dist, 'postcss.cjs'))
const runOurs = async (mod, dir, css, cacheDir) => {
    const t1 = now()
    const result = await mod.compileTailwindCss(css, { base: dir, from: path.join(dir, 'input.css'), scanCache: cacheDir || false })
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
        result = { load: t1 - t0, ...(await runOurs(mod, dir, css, arg('cache'))) }
    }
    process.stdout.write(JSON.stringify(result))
    // Thoát như CLI: bộ nhớ đệm trên đĩa của ta được ghi ở sự kiện `exit` (tính trong thời gian tường).
    process.exit(0)
}

if (arg('warm-child')) {
    // Một tiến trình nạp cả hai phía rồi build xen kẽ.
    const dir = arg('dir')
    const tw = arg('tw-json') ? JSON.parse(arg('tw-json')) : null
    const dists = JSON.parse(arg('dists'))
    const cacheDir = arg('cache')
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
                    const r = await runOurs(mods[k], dir, css, cacheDir && path.join(cacheDir, String(k)))
                    if (i >= 2) out.ours[k].push(r)
                }
            }
        }
    }
    process.stdout.write(JSON.stringify(out))
    process.exit(0)
}

// ---------- Sinh bộ bench ----------
const SOURCE_EXT = /\.(html|tsx|ts|jsx|js)$/
const listFixtureFiles = (fixtures, pattern) => {
    const out = []
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) walk(full)
            else if (pattern.test(entry.name)) out.push(full)
        }
    }
    for (const name of fixtures) walk(path.join(root, 'eval/fixtures', name))
    return out.sort()
}

const SETS = {
    mixed: { sources: () => listFixtureFiles(['hyperui', 'coss-ui', 'magicui', 'shadcn-v4'], SOURCE_EXT), count: () => Number(arg('files', 6000)) },
    html: {
        sources: () => listFixtureFiles(['hyperui/examples'], /\.html$/),
        count: () => listFixtureFiles(['hyperui/examples'], /\.html$/).length * Number(arg('html-copies', 17)),
    },
}

const generate = (dir, sources, count) => {
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
const rounds = Number(arg('rounds', 9))
const warmIterations = Number(arg('warm', 5))
const setNames = arg('sets', 'mixed,html').split(',').filter((name) => SETS[name])
const benchRoot = path.resolve(arg('dir', os.tmpdir()))
const tw = findTailwind()
// `--ours=dist,trước=/đường/dẫn/dist-cũ`: mỗi mục là đường dẫn dist, có thể kèm nhãn `nhãn=`.
const oursSpecs = arg('ours', 'dist').split(',').map((spec) => {
    const eq = spec.indexOf('=')
    return eq > 0 ? { name: spec.slice(0, eq), dist: path.resolve(root, spec.slice(eq + 1)) } : { name: null, dist: path.resolve(root, spec) }
})
const dists = oursSpecs.map((s) => s.dist)
const names = new Map(oursSpecs.map((s) => [s.dist, s.name]))
for (const dist of dists) if (!fs.existsSync(path.join(dist, 'postcss.cjs'))) throw new Error(`Thiếu ${dist}/postcss.cjs — chạy npm run build trước.`)
if (!tw) console.log('Không tìm thấy @tailwindcss/node + @tailwindcss/oxide (dùng --tw=<node_modules>): chỉ đo phía ta.')

const self = new URL(import.meta.url).pathname
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
const label = (dist) => (names.get(dist) ? `ta (${names.get(dist)})` : dists.length > 1 ? `ta (${path.relative(root, dist) || dist})` : 'ta')
const fmt = (s) => (s ? `${s.median} [${s.min}–${s.max}]` : '—')

const result = {
    date: new Date().toISOString().slice(0, 10),
    node: process.version,
    cpus: os.cpus().length,
    loadavgStart: os.loadavg().map((x) => +x.toFixed(2)),
    rounds,
    tailwind: tw ? tw.version : null,
    sets: {},
}

for (const setName of setNames) {
    const set = SETS[setName]
    const count = set.count()
    const benchDir = path.join(benchRoot, `ps-build-bench-${setName}-${count}`, 'project')
    const listFile = path.join(path.dirname(benchDir), 'files.json')
    let files = fs.existsSync(listFile) && fs.existsSync(path.join(benchDir, 'input.css')) ? JSON.parse(fs.readFileSync(listFile, 'utf8')) : null
    if (!files || files.length !== count || flag('regen')) files = generate(benchDir, set.sources(), count)
    // Bộ nhớ đệm quét của ta: ngoài thư mục được quét, mỗi bản build một thư mục.
    const cacheRoot = path.join(path.dirname(benchDir), 'cache')
    fs.rmSync(cacheRoot, { recursive: true, force: true })
    // compile() của Tailwind tìm `tailwindcss` từ thư mục dự án: đặt node_modules ở thư mục cha (ngoài vùng quét).
    if (tw) {
        const link = path.join(path.dirname(benchDir), 'node_modules')
        fs.rmSync(link, { force: true, recursive: false })
        fs.symlinkSync(tw.nodeModules, link, 'dir')
    }
    const runChild = (childArgs) => {
        const t0 = now()
        const res = spawnSync(process.execPath, [self, ...childArgs, `--dir=${benchDir}`], { encoding: 'utf8', maxBuffer: 1 << 26, cwd: benchDir, env: { ...process.env } })
        const wall = now() - t0
        if (res.status !== 0) throw new Error(res.stderr || `tiến trình con lỗi (${res.status})`)
        return { wall, ...JSON.parse(res.stdout) }
    }

    const sides = [
        ...(tw ? [{ name: `Tailwind ${tw.version} (oxide)`, mode: 'cold', args: ['--child=tw', `--target=${JSON.stringify(tw)}`] }] : []),
        ...dists.flatMap((dist, k) => {
            const coldDir = path.join(cacheRoot, `cold-${k}`)
            const warmDir = path.join(cacheRoot, `cache-${k}`)
            return [
                { name: label(dist), mode: 'cold', args: ['--child=ours', `--target=${dist}`, `--cache=${coldDir}`], before: () => fs.rmSync(coldDir, { recursive: true, force: true }) },
                { name: label(dist), mode: 'cold+cache', args: ['--child=ours', `--target=${dist}`, `--cache=${warmDir}`] },
            ]
        }),
    ]
    console.log(`\n[${setName}] ${files.length} file trong ${benchDir}`)
    // Bộ nhớ đệm cho chế độ cold+cache: một lượt chuẩn bị (không tính).
    for (const side of sides) if (side.mode === 'cold+cache') runChild(side.args)
    const cold = sides.map(() => [])
    for (let r = 0; r < rounds; r++) {
        const order = r % 2 ? [...sides.keys()].reverse() : [...sides.keys()]
        for (const i of order) {
            sides[i].before?.()
            cold[i].push(runChild(sides[i].args))
        }
        process.stdout.write(`\rcold ${r + 1}/${rounds}`)
    }
    process.stdout.write('\n')

    const warm = { tw: [], ours: dists.map(() => []) }
    const warmProcesses = Math.max(1, Math.round(rounds / 3))
    for (let p = 0; p < warmProcesses; p++) {
        const warmCache = path.join(cacheRoot, `warm-${p}`)
        const res = spawnSync(process.execPath, [self, '--warm-child=1', `--dir=${benchDir}`, ...(tw ? [`--tw-json=${JSON.stringify(tw)}`] : []), `--dists=${JSON.stringify(dists)}`, `--cache=${warmCache}`, `--iterations=${warmIterations}`], { encoding: 'utf8', maxBuffer: 1 << 26, cwd: benchDir, env: { ...process.env } })
        if (res.status !== 0) throw new Error(res.stderr)
        const out = JSON.parse(res.stdout)
        warm.tw.push(...out.tw)
        dists.forEach((_dist, k) => warm.ours[k].push(...out.ours[k]))
        process.stdout.write(`\rwarm ${p + 1}/${warmProcesses}`)
    }
    process.stdout.write('\n')

    const out = { files: files.length, warmIterations: warmProcesses * warmIterations, loadavgEnd: os.loadavg().map((x) => +x.toFixed(2)), sides: {} }
    sides.forEach((side, i) => {
        const entry = (out.sides[side.name] ??= { cssBytes: cold[i][0].bytes, cssHash: cold[i][0].hash, candidates: cold[i][0].candidates })
        entry[side.mode] = summarize(cold[i])
        if (side.mode === 'cold') entry.warm = summarize(side.args[0] === '--child=tw' ? warm.tw : warm.ours[dists.indexOf(side.args[1].slice('--target='.length))])
        // CSS đầu ra phải ổn định giữa các lượt và các chế độ.
        const hashes = new Set(cold[i].map((r) => r.hash))
        if (hashes.size !== 1 || hashes.values().next().value !== entry.cssHash) console.log(`CẢNH BÁO: ${side.name} (${side.mode}) cho CSS khác nhau giữa các lượt`)
    })
    for (const [k, runs] of [...warm.ours.entries()]) if (new Set(runs.map((r) => r.hash)).size > 1) console.log(`CẢNH BÁO: ${label(dists[k])} (warm) cho CSS khác nhau giữa các lượt`)
    if (dists.length > 1) {
        out.oursIdentical = new Set(dists.map((d) => out.sides[label(d)].cssHash)).size === 1
        console.log(out.oursIdentical ? 'CSS của các bản build ta: trùng byte.' : 'CSS của các bản build ta: KHÁC NHAU.')
    }
    result.sets[setName] = out

    console.log(`\n[${setName}] ${files.length} file, ${rounds} lượt cold, ${out.warmIterations} lượt warm (ms, trung vị [min–max])`)
    for (const [name, s] of Object.entries(out.sides)) {
        console.log(`\n${name}: CSS ${(s.cssBytes / 1024).toFixed(1)} KB, ${s.candidates} ứng viên`)
        for (const mode of ['cold', 'cold+cache']) {
            const m = s[mode]
            if (!m) continue
            console.log(`  ${mode.padEnd(10)}: tiến trình ${fmt(m.wall)} · nạp module ${fmt(m.load)} · build ${fmt(m.total)} (chuẩn bị ${fmt(m.setup)}, quét ${fmt(m.scan)}, trích ${fmt(m.extract)}, sinh CSS ${fmt(m.generate)})`)
        }
        console.log(`  ${'warm'.padEnd(10)}: build ${fmt(s.warm.total)} (chuẩn bị ${fmt(s.warm.setup)}, quét ${fmt(s.warm.scan)}, trích ${fmt(s.warm.extract)}, sinh CSS ${fmt(s.warm.generate)})`)
    }
}
console.log('\nTailwind: "quét" = Scanner.scan() (tìm file + đọc + trích ứng viên, đa luồng); "sinh CSS" = build() + optimize().')
console.log('Ta: "quét" = liệt kê file + .gitignore; "trích" = đọc + trích ứng viên (gồm bộ nhớ đệm trên đĩa); "sinh CSS" = dựng dialect + giải class + thu gọn.')
if (!flag('no-write')) fs.writeFileSync(path.join(root, 'eval/build-bench.json'), JSON.stringify(result, null, 2) + '\n')
