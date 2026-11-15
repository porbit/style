/**
 * CLI `presence-style`: trích xuất CSS tĩnh từ file nguồn ở build-time.
 *
 * Ví dụ:
 *   npx presence-style extract "src/**\/*.tsx" --out dist/presence.css
 *   npx presence-style extract index.html --out out.css --config presence-style.config.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { collectFiles, DEFAULT_EXTENSIONS } from './files'
import { extractFromClasses, extractCandidates, type ExtractOptions } from './extract'
import { startMcpServer } from './mcp'
import { MCP_CLIENTS, renderMcpConfig } from './mcp-config'

const HELP = `presence-style — trích xuất CSS tĩnh cho @porbit/style

Cách dùng:
  presence-style extract <đường-dẫn...> [tuỳ chọn]
  presence-style mcp [--root <thư-mục>]     Chạy MCP server qua stdio cho agent AI
  presence-style mcp-config [client]        In lệnh/cấu hình cài MCP cho từng agent
                                            (claude, claude-desktop, codex, cursor, vscode,
                                             windsurf, gemini, cline, zed, opencode, json)

Tuỳ chọn:
  --out <file>       Ghi CSS ra file. Không có thì in ra stdout.
  --config <file>    File JSON cấu hình XCSSConfig (kèm khoá "safelist").
  --map <file>       Ghi map class nguồn -> class rút gọn ra file JSON.
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
        if (arg === '--out' || arg === '--config' || arg === '--map' || arg === '--ext') {
            const value = argv[++i]
            if (!value) throw new Error(`Thiếu giá trị cho tham số ${arg}`)
            if (arg === '--out') options.out = value
            else if (arg === '--config') options.config = value
            else if (arg === '--map') options.map = value
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

    if (!options.silent) {
        process.stderr.write(
            `presence-style: ${files.length} file, ${result.candidates.length} class ứng viên, ${result.matched} class sinh CSS.\n`,
        )
    }

    return 0
}
