/**
 * Chuẩn hoá cấu hình đọc từ JSON (presence-style.config.json, tham số MCP): JSON không chứa
 * được hàm nên phương ngữ được khai báo bằng tên, ví dụ `"dialects": ["tailwind"]`.
 */
import type { XCSSConfig, XCSSDialect } from './core'
import { tailwindDialect } from './tailwind'
import { tailwindV4Dialect } from './tailwind-v4'

export type JsonDialectName = 'tailwind' | 'tailwind-legacy'

export const resolveConfigFile = <T extends Record<string, any>>(input: T): T & XCSSConfig => {
    if (!input || typeof input !== 'object') return {} as T & XCSSConfig
    const config: Record<string, any> = { ...input }
    if (Array.isArray(config.dialects)) {
        config.dialects = config.dialects
            .map((entry: unknown): XCSSDialect | null => {
                if (typeof entry === 'function') return entry as XCSSDialect
                const darkMode = config.darkMode === 'class' ? 'class' : 'media'
                // `tailwind`: phương ngữ v4 sinh từ chính Tailwind (khớp 99,99%); `tailwind-legacy`: bộ chuyển cũ.
                if (entry === 'tailwind') return tailwindV4Dialect({ darkMode, preflight: config.preflight === true })
                if (entry === 'tailwind-legacy') return tailwindDialect({ darkMode })
                return null
            })
            .filter(Boolean)
    }
    return config as T & XCSSConfig
}
