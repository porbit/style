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
        vite: 'src/vite.ts',
        analyze: 'src/analyze.ts',
        lsp: 'src/lsp-entry.ts',
        'tailwind-v4': 'src/tailwind-v4-entry.ts',
        'tailwind-auto': 'src/tailwind-auto.ts',
        'tailwind-plugins': 'src/tailwind-plugins.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    // Một file cho mỗi entry. Đã thử splitting: bản CDN tăng 21,4 -> 24,9 KB gzip và phải tải
    // 7 file nối tiếp, còn shim Node (path/url của mcp/vite) bị gom vào chunk dùng chung với
    // entry trình duyệt làm Vite build lỗi. Vì vậy giữ splitting: false.
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
