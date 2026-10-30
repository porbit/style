/*
 * Sinh "ground truth" cho chuẩn hóa đa engine (Node <-> Rust).
 *
 * KHÔNG chép tay bất cứ thứ gì: dictionary và CSS sinh ra đều lấy TRỰC TIẾP từ
 * engine Node thật (src/*.ts qua sucrase). Output:
 *   - spec/dictionary.json          : 3 bảng dictionary canonical (từ src/dictionary.ts)
 *   - spec/conformance.core.json    : [{input, accepted, media, layer, selector, declarations}]
 *                                     (chỉ tính năng cross-engine: parser + dictionary)
 *
 * Tuple ngữ nghĩa (KHÔNG gồm tên class) để 2 engine có hash/escape khác nhau vẫn so được:
 *   - declarations: lấy từ getCssString() của engine Node (nguồn chân lý value-resolution)
 *   - media (query) / layer / selector: từ parseClassName() đã export + bảng breakpoint tĩnh
 */
require('sucrase/register')
const fs = require('fs')
const path = require('path')

const dict = require('../src/dictionary.ts')
const core = require('../src/core.ts')
const { parseClassName } = require('../src/parser.ts')

const xcss = core.xcss
const SPEC_DIR = path.join(__dirname, '..', 'spec')
fs.mkdirSync(SPEC_DIR, { recursive: true })

// ---- 1) dictionary.json (canonical, từ chính src/dictionary.ts) ----
const dictionaryJson = {
    SHORT_PROPERTIES: dict.SHORT_PROPERTIES,
    COMMON_VALUES: dict.COMMON_VALUES,
    SPECIFIC_VALUES: dict.SPECIFIC_VALUES,
}
fs.writeFileSync(
    path.join(SPEC_DIR, 'dictionary.json'),
    JSON.stringify(dictionaryJson, null, 2) + '\n',
)

// ---- Bảng breakpoint mặc định (khớp mqDfAll trong core.ts) ----
const MEDIA_TABLE = {
    default: '',
    xs: 'screen and (max-width: 575px)',
    sm: 'screen and (min-width: 576px)',
    md: 'screen and (min-width: 768px)',
    lg: 'screen and (min-width: 992px)',
    xl: 'screen and (min-width: 1200px)',
    '2xl': 'screen and (min-width: 1400px)',
    sma: 'screen and (max-width: 768px)',
    mda: 'screen and (max-width: 992px)',
    lga: 'screen and (max-width: 1200px)',
    xla: 'screen and (max-width: 1400px)',
}

// Thay ';'/"';" trong selector y hệt core.ts
const replaceSemicolons = (s) =>
    (s || '').replace(/(';|;)/g, (v) => (v === "';" ? ';' : ' '))

// Trích declarations = nhóm {..} trong cùng của một rule đơn.
const extractDeclarations = (cssText) => {
    const open = cssText.lastIndexOf('{')
    if (open === -1) return null
    const close = cssText.indexOf('}', open)
    if (close === -1) return null
    return cssText.slice(open + 1, close)
}

// Chạy engine Node (SSR, hashClassName:false) cho đúng 1 class.
const runNode = (input) => {
    const instance = xcss({ hashClassName: false })
    const { clsx, getCssString } = instance.buildCss()
    clsx(input)
    const css = getCssString().trim()
    if (!css) return { input, accepted: false }

    // media/layer/selector từ parser (nguồn chân lý token), declarations từ engine.
    const parsed = parseClassName(input) || { mq: '', layer: '', selector: '' }
    const mediaKey = parsed.mq || 'default'
    const media = MEDIA_TABLE[mediaKey] !== undefined ? MEDIA_TABLE[mediaKey] : ''
    return {
        input,
        accepted: true,
        media,
        layer: Number(parsed.layer || '0') || 0,
        selector: replaceSemicolons(parsed.selector),
        declarations: extractDeclarations(css),
    }
}

// ---- 2) Sinh corpus cross-engine (parser + dictionary, KHÔNG aliases/theme/excludes) ----
const corpus = new Set()
const add = (c) => corpus.add(c)

// 2a. Mỗi property: vài dạng value tiêu biểu
for (const prop of Object.keys(dict.SHORT_PROPERTIES)) {
    add(`${prop}10px`)
    add(`${prop}#0a64e8`)
    add(`${prop}[1px;solid;red]`)
    add(`${prop}!10px`)
    add(`${prop}--brand`)
}
// 2b. Mỗi specific value (cả dạng viết hoa ký tự đầu để test lowercaseFirst, và nguyên gốc)
for (const prop of Object.keys(dict.SPECIFIC_VALUES)) {
    const table = dict.SPECIFIC_VALUES[prop]
    if (!table || typeof table !== 'object') continue
    for (const valKey of Object.keys(table)) {
        const cap = valKey.charAt(0).toUpperCase() + valKey.slice(1)
        add(`${prop}${cap}`)
        add(`${prop}${valKey}`)
    }
}
// 2c. Common values trên vài property generic
for (const valKey of Object.keys(dict.COMMON_VALUES)) {
    const cap = valKey.charAt(0).toUpperCase() + valKey.slice(1)
    add(`c${cap}`)
    add(`d${cap}`)
    add(`pos${cap}`)
}
// 2d. Full property name (không viết tắt)
add('colorRed')
add('margin-top-10px')
add('background-color#fff')
// 2e. Media + layer
for (const mq of ['sm', 'md', 'lg', 'xl', '2xl', 'xs', 'sma', 'mda', 'lga', 'xla']) {
    add(`${mq}:m10px`)
    add(`${mq}:dF`)
}
add('2m10px')
add('sm:3p8px')
add('9bgc#000')
// 2f. Selector
add('dF@:hover')
add('cRed@::before')
add('bgc#fff@:focus')
add('opc0.5@:hover')
// 2g. Composite
for (const p of ['mx', 'my', 'px', 'py', 'bdx', 'bdy']) {
    add(`${p}10px`)
    add(`${p}[1px;solid]`)
}
add('p10px;16px')
add('m10px;16px;20px;24px')
// 2h. Important / var / arbitrary
add('c!#0a64e8')
add('bgc--brand')
add('w[calc(100%;-;10px)]')
add('w--x')
// 2i. Malformed / edge (kỳ vọng accepted=false hoặc giữ nguyên)
add('&span')
add('w[calc(100%;-;10px)')
add('w]10')
add('mdx:w10px')
add('unknownprop10')
add('x')

const cases = [...corpus].sort().map(runNode)

const conformanceJson = JSON.stringify(cases, null, 2) + '\n'
fs.writeFileSync(path.join(SPEC_DIR, 'conformance.core.json'), conformanceJson)

// Bản copy cho Rust integration test: chỉ chạy khi chỉ định thư mục đích qua biến môi trường.
const rustTestsDir = process.env.PRESENCE_STYLE_RUST_TESTS_DIR
if (rustTestsDir) {
    try {
        fs.mkdirSync(rustTestsDir, { recursive: true })
        fs.writeFileSync(path.join(rustTestsDir, 'conformance.core.json'), conformanceJson)
        console.log(`[gen-spec] copied conformance -> ${rustTestsDir}`)
    } catch (e) {
        console.warn('[gen-spec] skip Rust copy:', e.message)
    }
}

const accepted = cases.filter((c) => c.accepted).length
console.log(
    `[gen-spec] dictionary: ${Object.keys(dict.SHORT_PROPERTIES).length} props; ` +
    `conformance: ${cases.length} cases (${accepted} accepted, ${cases.length - accepted} rejected)`,
)
