import { defineConfig } from 'tsup'
import { version } from './package.json'

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'index-auto': 'src/index-auto.ts',
        'cli-bin': 'src/cli-bin.ts',
        components: 'src/components.ts',
        mcp: 'src/mcp.ts',
        tailwind: 'src/tailwind-entry.ts',
    },
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
