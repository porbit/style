import { defineConfig } from 'tsup'

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/index-auto.ts',
        'src/cli-bin.ts',
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
})
