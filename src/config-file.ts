/**
 * Chuẩn hoá cấu hình đọc từ JSON (presence-style.config.json, tham số MCP): JSON không chứa
 * được hàm nên phương ngữ được khai báo bằng tên, ví dụ `"dialects": ["tailwind"]`.
 */
import type { XCSSConfig, XCSSDialect } from './core'
import { tailwindDialect } from './tailwind'
import { parseTailwindStylesheet, tailwindV4Dialect } from './tailwind-v4'
import { resolveTailwindPlugin } from './tailwind-plugins'

export type JsonDialectName = 'tailwind' | 'tailwind-legacy'

export interface ResolveConfigOptions {
    /**
     * Đọc stylesheet theo đường dẫn/tên gói (`src/app.css`, `./theme.css`, `tw-animate-css`); null nếu không có.
     * Có hàm này thì `"tailwindCss": "src/app.css"` được đọc: `@theme`, `@utility`, `@custom-variant`,
     * `@apply`, `@import`/`@plugin` (plugin đóng gói sẵn dùng khi không có trên đĩa).
     */
    readStylesheet?: (id: string) => string | null
    /** Nạp `@config` trong stylesheet (Node: `createConfigLoader`). */
    loadConfig?: (id: string) => string | null
}

export const resolveConfigFile = <T extends Record<string, any>>(input: T, options: ResolveConfigOptions = {}): T & XCSSConfig => {
    if (!input || typeof input !== 'object') return {} as T & XCSSConfig
    const config: Record<string, any> = { ...input }
    const read = options.readStylesheet
    const source = typeof config.tailwindCss === 'string' && read ? read(config.tailwindCss) : null
    // `@import "./x.css"` trong stylesheet: tương đối với thư mục của stylesheet đó.
    const sheetDir = source ? String(config.tailwindCss).replace(/[^/\\]*$/, '') : ''
    const resolveImport = (id: string) => read?.(/^\.\.?\//.test(id) ? sheetDir + id : id) ?? resolveTailwindPlugin(id)
    const sheet = source ? parseTailwindStylesheet(source, { resolve: resolveImport, loadConfig: options.loadConfig ? (id) => options.loadConfig!(/^\.\.?\//.test(id) ? sheetDir + id : id) : undefined }) : null
    if (Array.isArray(config.dialects)) {
        config.dialects = config.dialects
            .map((entry: unknown): XCSSDialect | null => {
                if (typeof entry === 'function') return entry as XCSSDialect
                const darkMode = config.darkMode === 'class' ? 'class' : 'media'
                // `tailwind`: phương ngữ v4 sinh từ chính Tailwind (khớp 99,99%); `tailwind-legacy`: bộ chuyển cũ.
                if (entry === 'tailwind') {
                    return tailwindV4Dialect({
                        darkMode,
                        preflight: config.preflight === true,
                        ...(sheet ? { theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, css: sheet.css } : {}),
                    })
                }
                if (entry === 'tailwind-legacy') return tailwindDialect({ darkMode })
                return null
            })
            .filter(Boolean)
    }
    return config as T & XCSSConfig
}
