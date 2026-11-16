/**
 * Phương ngữ Tailwind v4 đầy đủ: phương ngữ (src/tailwind-v4-core.ts) cộng phần đọc CSS của người dùng
 * (src/tailwind-stylesheet.ts: stylesheet, `@utility`, `@custom-variant`, `@apply`).
 *
 *   import { tailwindV4Dialect } from '@porbit/style/tailwind'
 *   xcss.cssObserve(document, { dialects: [tailwindV4Dialect({ preflight: true })] })
 */
import type { XCSSDialect } from './core'
import { compileCustomVariant, parseTailwindStylesheet as parseStylesheet, projectCss, usedThemeCss, userUtilities, type ParseTailwindOptions, type TailwindStylesheet } from './tailwind-stylesheet'
import { TAILWIND_DEFAULT_THEME, tailwindV4Dialect as coreDialect, useTailwindStylesheet, type TailwindV4DialectOptions } from './tailwind-v4-core'

export * from './tailwind-v4-core'
export { expandBraces, type ParseTailwindOptions, type TailwindStylesheet } from './tailwind-stylesheet'

// Đối tượng tường minh (không `import * as`: namespace làm bundler tách thêm một chunk runtime dùng chung).
const SUPPORT = { compileCustomVariant, userUtilities, projectCss, usedThemeCss }

/** Phương ngữ Tailwind v4 (kể cả `utilities`, `variants`, `css` của dự án). */
export const tailwindV4Dialect = (options: TailwindV4DialectOptions = {}): XCSSDialect => {
    // Gọi trong hàm (không ở tầng module) để bundler có `sideEffects` không bỏ mất.
    useTailwindStylesheet(SUPPORT)
    return coreDialect(options)
}

/**
 * Đọc stylesheet viết theo Tailwind v4 (`<style type="text/tailwindcss">`, `app.css`); xem chi tiết ở
 * src/tailwind-stylesheet.ts. Truyền kết quả cho dialect:
 * `tailwindV4Dialect({ theme, css, utilities, variants, prefix, important, blocklist })`.
 */
export const parseTailwindStylesheet = (source: string, options: ParseTailwindOptions = {}): TailwindStylesheet =>
    parseStylesheet(source, options, TAILWIND_DEFAULT_THEME)
