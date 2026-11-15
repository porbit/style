/**
 * `presence-style init`: tạo file cấu hình, quy tắc cho agent AI và cấu hình MCP trong dự án.
 * Chạy lại an toàn: khối quy tắc được thay trong cặp đánh dấu, JSON được gộp chứ không ghi đè.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { AGENT_RULES } from './agent-rules'

const START = '<!-- presence-style:start -->'
const END = '<!-- presence-style:end -->'

export interface InitOptions {
    cwd: string
    agents?: boolean
    mcp?: boolean
}

export interface InitResult {
    created: string[]
    updated: string[]
    skipped: string[]
}

const readText = (file: string) => readFile(file, 'utf8').catch(() => null)

const writeText = async (file: string, text: string) => {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, text, 'utf8')
}

const SAMPLE_CONFIG = {
    hashClassName: false,
    breakpoints: [{ dark: '(prefers-color-scheme: dark)' }],
    theme: { brand: '#2563eb', ink: '#0f172a' },
    safelist: [],
}

const MCP_SERVER = { command: 'npx', args: ['-y', '@porbit/style', 'mcp'] }

/** Gộp server `presence-style` vào file JSON cấu hình MCP (giữ nguyên server khác). */
const mergeMcpJson = async (file: string, key: 'mcpServers' | 'servers', server: Record<string, unknown>, result: InitResult) => {
    const raw = await readText(file)
    let json: Record<string, any> = {}
    if (raw) {
        try {
            json = JSON.parse(raw)
        } catch (_error) {
            result.skipped.push(`${file} (JSON không hợp lệ, không sửa)`)
            return
        }
    }
    json[key] = { ...(json[key] || {}), 'presence-style': server }
    await writeText(file, JSON.stringify(json, null, 2) + '\n')
    ;(raw ? result.updated : result.created).push(file)
}

export const runInit = async (options: InitOptions): Promise<InitResult> => {
    const result: InitResult = { created: [], updated: [], skipped: [] }
    const { cwd } = options

    const configFile = join(cwd, 'presence-style.config.json')
    if (await readText(configFile)) {
        result.skipped.push(configFile)
    } else {
        await writeText(configFile, JSON.stringify(SAMPLE_CONFIG, null, 2) + '\n')
        result.created.push(configFile)
    }

    if (options.agents) {
        // AGENTS.md: Codex, Cursor, Gemini CLI, Copilot, opencode... đọc file này.
        const agentsFile = join(cwd, 'AGENTS.md')
        const block = `${START}\n${AGENT_RULES.trim()}\n${END}`
        const current = await readText(agentsFile)
        if (current === null) {
            await writeText(agentsFile, `# AGENTS.md\n\n${block}\n`)
            result.created.push(agentsFile)
        } else {
            const start = current.indexOf(START)
            const end = current.indexOf(END)
            const next = start !== -1 && end > start
                ? current.slice(0, start) + block + current.slice(end + END.length)
                : current.replace(/\s*$/, '\n\n') + block + '\n'
            if (next !== current) {
                await writeText(agentsFile, next)
                result.updated.push(agentsFile)
            } else {
                result.skipped.push(agentsFile)
            }
        }
        // Claude Code đọc CLAUDE.md và hỗ trợ import `@AGENTS.md`.
        const claudeFile = join(cwd, 'CLAUDE.md')
        const claude = await readText(claudeFile)
        if (claude === null) {
            await writeText(claudeFile, '@AGENTS.md\n')
            result.created.push(claudeFile)
        } else if (!/@AGENTS\.md/.test(claude) && !claude.includes(START)) {
            await writeText(claudeFile, claude.replace(/\s*$/, '\n\n') + '@AGENTS.md\n')
            result.updated.push(claudeFile)
        } else {
            result.skipped.push(claudeFile)
        }
    }

    if (options.mcp) {
        await mergeMcpJson(join(cwd, '.mcp.json'), 'mcpServers', MCP_SERVER, result)
        await mergeMcpJson(join(cwd, '.cursor', 'mcp.json'), 'mcpServers', MCP_SERVER, result)
        await mergeMcpJson(join(cwd, '.vscode', 'mcp.json'), 'servers', { type: 'stdio', ...MCP_SERVER }, result)
    }

    return result
}
