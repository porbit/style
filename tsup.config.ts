import { defineConfig } from 'tsup'
import { version } from './package.json'

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/index-auto.ts',
        'src/cli-bin.ts',
        'src/components.ts',
        'src/mcp.ts',
    ],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    // Engine chạy được cả trên trình duyệt và Node (SSR/CLI).
    target: 'es2022',
    // Không có side effect ở tầng module ngoại trừ entry auto-observe.
    treeshake: true,
    // `__dirname`/`import.meta.url` dùng được ở cả bản CJS lẫn ESM (MCP đọc tài liệu trong package).
    shims: true,
    define: {
        __PRESENCE_STYLE_VERSION__: JSON.stringify(version),
    },
})
