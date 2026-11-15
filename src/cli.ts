/**
 * CLI `presence-style`: trích xuất CSS tĩnh từ file nguồn ở build-time.
 *
 * Ví dụ:
 *   npx presence-style extract "src/**\/*.tsx" --out dist/presence.css
 *   npx presence-style extract index.html --out out.css --config presence-style.config.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { collectFiles, DEFAULT_EXTENSIONS } from './files'
import { createPreloadManifest, extractFromClasses, extractCandidates, type ExtractOptions } from './extract'
import { startMcpServer } from './mcp'
import { runInit } from './init'
import { explainClass, findClassAttributes, findClassTokens, isXcssLike, sortClassesInSource } from './analyze'
import { findClassConflicts } from './class-tools'
import { MCP_CLIENTS, renderMcpConfig } from './mcp-config'

const HELP = `presence-style — trích xuất CSS tĩnh cho @porbit/style

Cách dùng:
  presence-style extract <đường-dẫn...> [tuỳ chọn]
  presence-style check <đường-dẫn...> [--config <file>]
                                            Báo class không sinh CSS và class xung đột
  presence-style sort <đường-dẫn...> [--write | --check]
                                            Sắp xếp class trong thuộc tính class tĩnh
  presence-style init [--agents] [--mcp]   Tạo presence-style.config.json; --agents thêm quy tắc
                                            vào AGENTS.md/CLAUDE.md; --mcp ghi .mcp.json,
                                            .cursor/mcp.json, .vscode/mcp.json
  presence-style mcp [--root <thư-mục>]     Chạy MCP server qua stdio cho agent AI
  presence-style mcp-config [client]        In lệnh/cấu hình cài MCP cho từng agent
                                            (claude, claude-desktop, codex, cursor, vscode,
                                             windsurf, gemini, cline, zed, opencode, json)

Tuỳ chọn:
  --out <file>       Ghi CSS ra file. Không có thì in ra stdout.
  --config <file>    File JSON cấu hình XCSSConfig (kèm khoá "safelist").
  --map <file>       Ghi map class nguồn -> class rút gọn ra file JSON.
  --manifest <file>  Ghi manifest static-first (truyền vào tuỳ chọn \`preload\` ở runtime).
  --ext <danh-sách>  Phần mở rộng cần quét khi đường dẫn là thư mục.
                     Mặc định: html,htm,js,jsx,ts,tsx,vue,svelte,astro,mdx
  --silent           Không in thống kê ra stderr.
  -h, --help         Hiển thị trợ giúp.

Ví dụ:
  presence-style extract src --out dist/presence.css
  presence-style extract index.html --config presence-style.config.json
  presence-style mcp-config claude
`


interface CliOptions {
    inputs: string[]
    out?: string
    config?: string
    map?: string
    manifest?: string
    extensions: string[]
    silent: boolean
    help: boolean
}

const parseArgs = (argv: string[]): CliOptions => {
    const options: CliOptions = {
        inputs: [],
        extensions: DEFAULT_EXTENSIONS,
        silent: false,
        help: false,
    }

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]
        if (arg === '-h' || arg === '--help') {
            options.help = true
            continue
        }
        if (arg === '--silent') {
            options.silent = true
            continue
        }
        if (arg === '--out' || arg === '--config' || arg === '--map' || arg === '--manifest' || arg === '--ext') {
            const value = argv[++i]
            if (!value) throw new Error(`Thiếu giá trị cho tham số ${arg}`)
            if (arg === '--out') options.out = value
            else if (arg === '--config') options.config = value
            else if (arg === '--map') options.map = value
            else if (arg === '--manifest') options.manifest = value
            else options.extensions = value.split(',').map((x) => x.trim().replace(/^\./, '')).filter(Boolean)
            continue
        }
        if (arg.startsWith('-')) {
            throw new Error(`Tham số không hợp lệ: ${arg}`)
        }
        options.inputs.push(arg)
    }

    return options
}

const lineColumn = (source: string, offset: number): string => {
    const before = source.slice(0, offset)
    const line = before.split('\n').length
    return `${line}:${offset - before.lastIndexOf('\n')}`
}

/** `check`: báo lỗi class; `sort`: sắp xếp class (in danh sách file cần sắp, hoặc ghi với --write). */
const runSourceCommand = async (command: 'sort' | 'check', argv: string[]): Promise<number> => {
    const write = argv.includes('--write')
    const checkOnly = argv.includes('--check')
    const rest = argv.filter((arg) => arg !== '--write' && arg !== '--check')
    let options: CliOptions
    try {
        options = parseArgs(rest)
    } catch (error) {
        process.stderr.write(`${(error as Error).message}\n\n${HELP}`)
        return 1
    }
    if (options.inputs.length === 0) {
        process.stderr.write(`Thiếu đường dẫn nguồn.\n\n${HELP}`)
        return 1
    }
    let config: ExtractOptions = {}
    if (options.config) {
        try {
            config = JSON.parse(await readFile(resolve(options.config), 'utf8')) as ExtractOptions
        } catch (error) {
            process.stderr.write(`Không đọc được file cấu hình ${options.config}: ${(error as Error).message}\n`)
            return 1
        }
    }
    const files: string[] = []
    for (const input of options.inputs) files.push(...(await collectFiles(input, options.extensions)))

    let problems = 0
    for (const file of files) {
        const source = await readFile(file, 'utf8').catch(() => null)
        if (source === null) continue
        const shown = relative(process.cwd(), file) || file

        if (command === 'sort') {
            const sorted = sortClassesInSource(source)
            if (sorted === source) continue
            problems++
            if (write) await writeFile(file, sorted, 'utf8')
            process.stdout.write(`${write ? 'đã sắp xếp' : 'cần sắp xếp'}: ${shown}\n`)
            continue
        }

        const tokens = findClassTokens(source)
        const cache = new Map<string, ReturnType<typeof explainClass>>()
        for (const { start, token } of tokens) {
            if (/[{}$`]/.test(token)) continue
            let info = cache.get(token)
            if (!info) {
                info = explainClass(token, config)
                cache.set(token, info)
            }
            // Class không có dạng x-css (ví dụ `btn` của thư viện khác) chỉ bị báo khi có bản sửa.
            if (info.valid || !info.parsed) continue
            if (!info.suggestion && !isXcssLike(token)) continue
            problems++
            const fix = info.suggestion ? ` → \`${info.suggestion}\`` : ''
            process.stdout.write(`${shown}:${lineColumn(source, start)}  \`${token}\` không sinh CSS${fix}\n`)
        }
        for (const range of findClassAttributes(source)) {
            for (const conflict of findClassConflicts(range.value)) {
                problems++
                process.stdout.write(
                    `${shown}:${lineColumn(source, range.start)}  xung đột ${conflict.property}: ${conflict.tokens.join(' ')}\n`,
                )
            }
        }
    }

    if (!options.silent) {
        const label = command === 'sort' ? 'file cần sắp xếp' : 'vấn đề'
        process.stderr.write(`presence-style ${command}: ${files.length} file, ${problems} ${label}.\n`)
    }
    if (command === 'sort' && write) return 0
    if (command === 'sort' && !checkOnly) return 0
    return problems > 0 ? 1 : 0
}

export const runCli = async (argv: string[]): Promise<number> => {
    const command = argv[0]

    // `presence-style`, `presence-style help`, `presence-style --help` đều phải in trợ giúp.
    const isHelpCommand = command === 'help' || command === '-h' || command === '--help'

    if (isHelpCommand) {
        process.stdout.write(HELP)
        return 0
    }

    if (!command) {
        process.stdout.write(HELP)
        return 1
    }

    if (command === 'mcp') {
        const rest = argv.slice(1)
        const rootIndex = rest.indexOf('--root')
        const root = rootIndex !== -1 ? rest[rootIndex + 1] : undefined
        if (rootIndex !== -1 && !root) {
            process.stderr.write('Thiếu giá trị cho tham số --root\n')
            return 1
        }
        await startMcpServer({ root })
        return 0
    }

    if (command === 'mcp-config') {
        const client = argv[1]
        if (client && !MCP_CLIENTS.includes(client as any)) {
            process.stderr.write(`Client không hỗ trợ: ${client}. Có: ${MCP_CLIENTS.join(', ')}\n`)
            return 1
        }
        process.stdout.write(renderMcpConfig(client as any))
        return 0
    }

    if (command === 'init') {
        const rest = argv.slice(1)
        const unknown = rest.filter((arg) => arg !== '--agents' && arg !== '--mcp')
        if (unknown.length) {
            process.stderr.write(`Tham số không hợp lệ: ${unknown.join(' ')}\n`)
            return 1
        }
        const result = await runInit({ cwd: process.cwd(), agents: rest.includes('--agents'), mcp: rest.includes('--mcp') })
        const show = (label: string, files: string[]) =>
            files.forEach((file) => process.stdout.write(`${label} ${relative(process.cwd(), file) || file}\n`))
        show('tạo   ', result.created)
        show('cập nhật', result.updated)
        show('giữ nguyên', result.skipped)
        return 0
    }

    if (command === 'sort' || command === 'check') {
        return runSourceCommand(command, argv.slice(1))
    }

    let options: CliOptions
    try {
        options = parseArgs(argv.slice(1))
    } catch (error) {
        process.stderr.write(`${(error as Error).message}\n\n${HELP}`)
        return 1
    }

    if (options.help) {
        process.stdout.write(HELP)
        return 0
    }

    if (command !== 'extract') {
        process.stderr.write(`Lệnh không hỗ trợ: ${command}\n\n${HELP}`)
        return 1
    }

    if (options.inputs.length === 0) {
        process.stderr.write(`Thiếu đường dẫn nguồn.\n\n${HELP}`)
        return 1
    }

    let config: ExtractOptions = {}
    if (options.config) {
        try {
            config = JSON.parse(await readFile(resolve(options.config), 'utf8')) as ExtractOptions
        } catch (error) {
            process.stderr.write(`Không đọc được file cấu hình ${options.config}: ${(error as Error).message}\n`)
            return 1
        }
    }

    const files: string[] = []
    for (const input of options.inputs) {
        files.push(...(await collectFiles(input, options.extensions)))
    }

    if (files.length === 0) {
        process.stderr.write('Không tìm thấy file nguồn nào khớp.\n')
        return 1
    }

    const candidates = new Set<string>()
    for (const file of files) {
        const source = await readFile(file, 'utf8').catch(() => '')
        extractCandidates(source).forEach((candidate) => candidates.add(candidate))
    }

    const result = await extractFromClasses([...candidates], { ...config, silent: true })

    if (options.out) {
        const outPath = resolve(options.out)
        await mkdir(dirname(outPath), { recursive: true })
        await writeFile(outPath, result.css, 'utf8')
    } else {
        process.stdout.write(result.css)
    }

    if (options.map) {
        const mapPath = resolve(options.map)
        await mkdir(dirname(mapPath), { recursive: true })
        await writeFile(mapPath, JSON.stringify(result.classMap, null, 2), 'utf8')
    }

    if (options.manifest) {
        const manifestPath = resolve(options.manifest)
        await mkdir(dirname(manifestPath), { recursive: true })
        const manifest = createPreloadManifest(result, { hashClassName: config.hashClassName })
        await writeFile(manifestPath, JSON.stringify(manifest), 'utf8')
    }

    if (!options.silent) {
        process.stderr.write(
            `presence-style: ${files.length} file, ${result.candidates.length} class ứng viên, ${result.matched} class sinh CSS.\n`,
        )
    }

    return 0
}
