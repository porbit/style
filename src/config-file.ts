/**
 * Chuẩn hoá cấu hình đọc từ JSON (presence-style.config.json, tham số MCP): JSON không chứa
 * được hàm nên phương ngữ được khai báo bằng tên, ví dụ `"dialects": ["tailwind"]`.
 */
import type { XCSSConfig, XCSSDialect } from './core'
import { tailwindDialect } from './tailwind'

export type JsonDialectName = 'tailwind'

export const resolveConfigFile = <T extends Record<string, any>>(input: T): T & XCSSConfig => {
    if (!input || typeof input !== 'object') return {} as T & XCSSConfig
    const config: Record<string, any> = { ...input }
    if (Array.isArray(config.dialects)) {
        config.dialects = config.dialects
            .map((entry: unknown): XCSSDialect | null => {
                if (typeof entry === 'function') return entry as XCSSDialect
                if (entry === 'tailwind') return tailwindDialect({ darkMode: config.darkMode === 'class' ? 'class' : 'media' })
                return null
            })
            .filter(Boolean)
    }
    return config as T & XCSSConfig
}
