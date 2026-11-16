import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { defineConfig, type Options } from 'tsup'
import { version } from './package.json'

// Ba nhóm build để dữ liệu Tailwind và lõi không bị chép vào từng entry (gói từng 6,8 MB giải nén):
//   1. CDN (ESM, mỗi entry một file tự chứa): tải thẳng bằng <script type="module">.
//   2. Thư viện ESM cho bundler/trình duyệt: dùng chung chunk, không có shim Node.
//   3. CJS cho mọi entry: dùng chung chunk (dữ liệu chỉ một bản), kèm .d.ts.
// Entry chỉ chạy trên Node chỉ có bản ESM là file bọc mỏng quanh bản CJS (sinh trong onSuccess).
// Lần trước bật splitting cho tất cả: bản CDN tăng 21,4 -> 24,9 KB gzip và shim Node (path/url của
// mcp/vite) bị gom vào chunk chung với entry trình duyệt làm Vite build lỗi. Tách nhóm tránh cả hai.

const CDN = {
    'index-auto': 'src/index-auto.ts',
    'tailwind-auto': 'src/tailwind-auto.ts',
    // tailwind-auto tự import động `./tailwind-plugins.mjs`: phải là một file tự chứa.
    'tailwind-plugins': 'src/tailwind-plugins.ts',
    // Chế độ lai (`data-hybrid`) cũng nạp động `./tailwind-hybrid.mjs`: trang thường không tải phần này.
    'tailwind-hybrid': 'src/hybrid.ts',
}
// Bản CDN Tailwind chỉ cần class Tailwind: tắt cache localStorage và từ điển x-css trong lõi (cờ build ở
// đầu src/core.ts) để bundler loại bỏ chúng (52,1 -> 40,9 KB gzip). Chỉ áp cho bản ESM tự chứa; bản CJS
// `dist/tailwind-auto.js` dùng chung chunk với entry khác nên chunk vẫn đủ (entry tự truyền `dictionaryImport: false`).
const { 'tailwind-auto': TAILWIND_AUTO, ...CDN_FULL } = CDN
const CDN_LITE_DEFINE = { __XCSS_CACHE__: 'false', __XCSS_DICTIONARY__: 'false', __XCSS_EDITOR__: 'false' }

// index.mjs import thẳng từ CDN vẫn chạy (chunk là đường dẫn tương đối); tách riêng thì gói thêm ~100 KB.
const LIBRARY = {
    index: 'src/index.ts',
    components: 'src/components.ts',
    tailwind: 'src/tailwind-entry.ts',
    'tailwind-v4': 'src/tailwind-v4-entry.ts',
    merge: 'src/merge-entry.ts',
    'merge-lite': 'src/merge.ts',
    analyze: 'src/analyze.ts',
}

// Chỉ chạy trên Node: bản ESM bọc bản CJS (cli-bin chỉ cần CJS cho `bin`).
const NODE = {
    'cli-bin': 'src/cli-bin.ts',
    mcp: 'src/mcp.ts',
    lsp: 'src/lsp-entry.ts',
    postcss: 'src/postcss.ts',
    prettier: 'src/prettier.ts',
    vite: 'src/vite.ts',
}
const ESM_WRAPPED = ['mcp', 'lsp', 'postcss', 'prettier', 'vite']

const common: Options = {
    sourcemap: true,
    minify: true,
    // Engine chạy được cả trên trình duyệt và Node (SSR/CLI).
    target: 'es2022',
    // Không có side effect ở tầng module ngoại trừ entry auto-observe.
    treeshake: true,
    define: {
        __PRESENCE_STYLE_VERSION__: JSON.stringify(version),
        // Cờ build của lõi (đầu src/core.ts): mặc định bật đủ; bản CDN Tailwind ghi đè bằng CDN_LITE_DEFINE.
        __XCSS_CACHE__: 'true',
        __XCSS_DICTIONARY__: 'true',
        __XCSS_EDITOR__: 'true',
    },
}

// File bọc ESM: liệt kê tên export lấy từ bản CJS vừa build (cjs-module-lexer không đọc được output rollup).
const writeEsmWrappers = () => {
    const require = createRequire(resolve('package.json'))
    for (const name of ESM_WRAPPED) {
        const file = resolve('dist', `${name}.js`)
        delete require.cache[file]
        const mod = require(file)
        const keys = Object.keys(mod).filter((key) => key !== 'default' && key !== '__esModule')
        const lines = [`import m from './${name}.js'`]
        if (keys.length) lines.push(`export const { ${keys.join(', ')} } = m`)
        if ('default' in mod) lines.push('export default m.default')
        lines.push('')
        writeFileSync(`dist/${name}.mjs`, lines.join('\n'))
    }
}

// Thư mục dist/ được xoá trong script `build` (các nhóm chạy song song nên không dùng `clean`).
export default defineConfig([
    {
        ...common,
        entry: CDN_FULL,
        format: ['esm'],
        splitting: false,
    },
    {
        ...common,
        entry: { 'tailwind-auto': TAILWIND_AUTO },
        format: ['esm'],
        splitting: false,
        define: { ...common.define, ...CDN_LITE_DEFINE },
    },
    {
        ...common,
        entry: LIBRARY,
        format: ['esm'],
        splitting: true,
    },
    {
        ...common,
        entry: { ...CDN, ...LIBRARY, ...NODE },
        format: ['cjs'],
        splitting: true,
        dts: true,
        // `__dirname`/`import.meta.url` dùng được trong bản CJS (MCP đọc tài liệu trong package).
        shims: true,
        onSuccess: async () => {
            // Next.js và nhiều trình chạy PostCSS gọi `require('@porbit/style/postcss')(options)`: bản CJS phải là hàm.
            writeFileSync('dist/postcss.cjs', "'use strict'\nconst mod = require('./postcss.js')\nmodule.exports = Object.assign(mod.default, mod, { default: mod.default })\n")
            writeEsmWrappers()
        },
    },
])
