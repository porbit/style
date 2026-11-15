/**
 * Entry đầy đủ `@porbit/style`: lõi runtime + Tailwind migration helper.
 * Bundler tree-shake được phần không dùng; trình duyệt nạp trực tiếp qua CDN nên dùng
 * `index-auto` (chỉ lõi) hoặc import helper từ `@porbit/style/tailwind`.
 */
import presenceStyle from './runtime'

export * from './runtime'
export * from './tailwind'
export * from './tailwind-readiness'
export default presenceStyle
