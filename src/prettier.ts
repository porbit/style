/**
 * Plugin Prettier sắp class như prettier-plugin-tailwindcss, không cần cài `tailwindcss`:
 *
 *   // .prettierrc
 *   { "plugins": ["@porbit/style/prettier"], "tailwindFunctions": ["cn", "cva"], "tailwindStylesheet": "./src/app.css" }
 *
 * Tuỳ chọn trùng tên với prettier-plugin-tailwindcss để đổi plugin không cần sửa cấu hình:
 *   - `tailwindStylesheet`: CSS của dự án (`@theme`, `@utility`, `@custom-variant`, plugin) — thứ tự class tự định nghĩa,
 *   - `tailwindFunctions`: hàm có đối số là chuỗi class (`cn`, `clsx`, `cva`, `tw`),
 *   - `tailwindPreserveDuplicates`, `tailwindPreserveWhitespace`.
 * Dự án x-css (có presence-style.config.json không bật phương ngữ Tailwind) được sắp theo thứ tự x-css.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { sortClassesInSource, sortTailwindClassString, findClassStrings } from './analyze'
import { resolveConfigFile } from './config-file'
import { createConfigLoader, createStylesheetReader } from './files'
import { resolveTailwindPlugin } from './tailwind-plugins'
import { parseTailwindStylesheet, tailwindV4Dialect } from './tailwind-v4'
import * as acornPlugin from 'prettier/plugins/acorn'
import * as babelPlugin from 'prettier/plugins/babel'
import * as flowPlugin from 'prettier/plugins/flow'
import * as htmlPlugin from 'prettier/plugins/html'
import * as meriyahPlugin from 'prettier/plugins/meriyah'
import * as typescriptPlugin from 'prettier/plugins/typescript'

type PrettierOptions = Record<string, any>
type Parser = { parse: (text: string, options: PrettierOptions) => unknown; preprocess?: (text: string, options: PrettierOptions) => string; [key: string]: unknown }

const compareCache = new Map<string, ((a: string, b: string) => number) | null>()

/** Hàm so sánh cho file: theo `tailwindStylesheet`, hoặc presence-style.config.json, hoặc Tailwind mặc định. */
const compareFor = (options: PrettierOptions): ((a: string, b: string) => number) | null => {
    const base = options.filepath ? dirname(options.filepath) : process.cwd()
    let stylesheet: string | null = options.tailwindStylesheet ?? options.tailwindEntryPoint ?? null
    if (stylesheet && !isAbsolute(stylesheet)) stylesheet = resolve(process.cwd(), stylesheet)
    // presence-style.config.json gần nhất (đi ngược lên thư mục cha).
    let configFile: string | null = null
    for (let dir = base; ; dir = dirname(dir)) {
        if (existsSync(join(dir, 'presence-style.config.json'))) {
            configFile = join(dir, 'presence-style.config.json')
            break
        }
        if (dirname(dir) === dir) break
    }
    const key = `${stylesheet}|${configFile}`
    if (compareCache.has(key)) return compareCache.get(key)!
    let compare: ((a: string, b: string) => number) | null = null
    try {
        if (stylesheet) {
            const read = createStylesheetReader(dirname(stylesheet))
            const sheet = parseTailwindStylesheet(readFileSync(stylesheet, 'utf8'), { resolve: (id) => read(id) ?? resolveTailwindPlugin(id), loadConfig: createConfigLoader(dirname(stylesheet)) })
            compare = tailwindV4Dialect({ theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, prefix: sheet.prefix }).compare ?? null
        } else if (configFile) {
            const config = resolveConfigFile(JSON.parse(readFileSync(configFile, 'utf8')), { readStylesheet: createStylesheetReader(dirname(configFile)), loadConfig: createConfigLoader(dirname(configFile)) })
            compare = config.dialects?.find((d: { compare?: unknown }) => typeof d.compare === 'function')?.compare ?? null
        } else {
            compare = tailwindV4Dialect().compare ?? null
        }
    } catch (_error) {
        compare = tailwindV4Dialect().compare ?? null
    }
    compareCache.set(key, compare)
    return compare
}

const sortText = (text: string, options: PrettierOptions): string => {
    const compare = compareFor(options)
    const functions: string[] = options.tailwindFunctions ?? []
    if (!compare) return sortClassesInSource(text, { functions })
    if (!options.tailwindPreserveDuplicates && !options.tailwindPreserveWhitespace) return sortClassesInSource(text, { compare, functions })
    let output = ''
    let cursor = 0
    for (const range of findClassStrings(text, { functions })) {
        if (range.start < cursor) continue
        output += text.slice(cursor, range.start) + sortTailwindClassString(range.value, compare, {
            removeDuplicates: !options.tailwindPreserveDuplicates,
            collapseWhitespace: !options.tailwindPreserveWhitespace,
        })
        cursor = range.end
    }
    return output + text.slice(cursor)
}

const wrap = (parser: Parser): Parser => ({
    ...parser,
    preprocess: (text: string, options: PrettierOptions) => {
        const before = parser.preprocess ? parser.preprocess(text, options) : text
        return sortText(before, options)
    },
})

const builtin: Record<string, Parser> = {
    ...(flowPlugin.parsers as unknown as Record<string, Parser>),
    ...(acornPlugin.parsers as unknown as Record<string, Parser>),
    ...(meriyahPlugin.parsers as unknown as Record<string, Parser>),
    ...(babelPlugin.parsers as unknown as Record<string, Parser>),
    ...(typescriptPlugin.parsers as unknown as Record<string, Parser>),
    ...(htmlPlugin.parsers as unknown as Record<string, Parser>),
}
const NAMES = ['babel', 'babel-flow', 'babel-ts', 'flow', 'typescript', 'acorn', 'meriyah', 'html', 'vue', 'angular', 'lwc']

export const parsers: Record<string, Parser> = Object.fromEntries(NAMES.filter((name) => builtin[name]).map((name) => [name, wrap(builtin[name])]))

export const options = {
    tailwindStylesheet: { type: 'string', category: 'Tailwind CSS', description: 'CSS của dự án (@theme, @utility, @custom-variant, plugin)' },
    tailwindEntryPoint: { type: 'string', category: 'Tailwind CSS', description: 'Tên cũ của tailwindStylesheet' },
    tailwindFunctions: { type: 'string', array: true, default: [{ value: [] }], category: 'Tailwind CSS', description: 'Hàm có đối số là chuỗi class (cn, clsx, cva, tw)' },
    tailwindPreserveDuplicates: { type: 'boolean', default: false, category: 'Tailwind CSS', description: 'Giữ class trùng lặp' },
    tailwindPreserveWhitespace: { type: 'boolean', default: false, category: 'Tailwind CSS', description: 'Giữ khoảng trắng trong chuỗi class' },
}


