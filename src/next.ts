/**
 * Tích hợp Next.js: rút gọn tên class lúc `next build` (webpack). CSS vẫn do plugin PostCSS sinh như thường.
 *
 *   // next.config.mjs
 *   import { withPresenceStyle } from '@porbit/style/next'
 *   export default withPresenceStyle({ reactStrictMode: true }, { shortClassNames: true })
 *
 *   // postcss.config.mjs (tuỳ chọn: đổi tên ngay lúc sinh CSS; không có thì plugin webpack đổi file .css của bundle)
 *   export default { plugins: { '@porbit/style/postcss': { shortClassNames: true } } }
 *
 * Chỉ chạy khi build production bằng webpack (`next build` của Next 15, `next build --webpack` của Next 16+): dev
 * server và Turbopack giữ nguyên tên class (Turbopack không chạy plugin webpack; plugin PostCSS không thấy bảng
 * nên cũng không đổi gì). Bảng ánh xạ ghi ở `<distDir>/cache/presence-style/short-class-names.json`.
 */
import { join } from 'node:path'
import { PresenceStyleWebpackPlugin, type MinimalCompiler, type PresenceStyleWebpackOptions } from './webpack'

export type WithPresenceStyleOptions = Omit<PresenceStyleWebpackOptions, 'root' | 'mapFile' | 'force'>

/** Phần của tham số thứ hai mà Next.js truyền cho hàm `webpack(config, context)`. */
interface NextWebpackContext {
    dev: boolean
    isServer?: boolean
    dir: string
    config?: { distDir?: string }
}
interface NextWebpackConfig {
    plugins?: unknown[]
}
type NextConfigObject = Record<string, unknown> & {
    webpack?: ((config: NextWebpackConfig, context: NextWebpackContext) => NextWebpackConfig) | null
}
type NextConfigInput = NextConfigObject | ((phase: string, context: unknown) => NextConfigObject | Promise<NextConfigObject>)

const wrap = (nextConfig: NextConfigObject, options: WithPresenceStyleOptions): NextConfigObject => {
    if (!options.shortClassNames) return nextConfig
    if (process.env.TURBOPACK) {
        console.warn('[presence-style] shortClassNames không hỗ trợ Turbopack (không có loader tương đương): bản build giữ nguyên tên class. Dùng `next build --webpack`.')
    }
    const userWebpack = nextConfig.webpack
    return {
        ...nextConfig,
        webpack(config: NextWebpackConfig, context: NextWebpackContext) {
            const result = typeof userWebpack === 'function' ? userWebpack(config, context) : config
            if (!context.dev) {
                const mapFile = join(context.dir, context.config?.distDir ?? '.next', 'cache', 'presence-style', 'short-class-names.json')
                const plugin = new PresenceStyleWebpackPlugin({ ...options, root: context.dir, mapFile })
                ;(result.plugins ??= []).push(plugin as { apply(compiler: MinimalCompiler): void })
            }
            return result
        },
    }
}

/**
 * Bọc cấu hình Next.js: thêm plugin webpack rút gọn tên class khi build production. `nextConfig` có thể là object
 * hoặc hàm `(phase, ctx) => config` như Next.js cho phép.
 */
export function withPresenceStyle<T extends NextConfigInput>(nextConfig: T = {} as T, options: WithPresenceStyleOptions = {}): T {
    if (typeof nextConfig === 'function') {
        return (async (phase: string, context: unknown) => wrap(await nextConfig(phase, context), options)) as unknown as T
    }
    return wrap(nextConfig as NextConfigObject, options) as T
}

export default withPresenceStyle
