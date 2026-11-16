/**
 * Thu gọn CSS tĩnh do engine sinh (dùng cho extract/CLI/plugin Vite khi bật `minify`):
 *   - bỏ `@property --x` và `@keyframes` không được tham chiếu (kèm khai báo dự phòng của biến đó),
 *   - gộp các khối `@layer lN{...}` liên tiếp cùng layer (ở mọi cấp, kể cả trong `@media`),
 *   - bỏ khoảng trắng thừa giữa các khối.
 * Không đổi thứ tự rule nên không đổi kết quả cascade.
 */

type Block = { head: string; body: string } | { text: string }

// Nhảy tới ký tự đáng chú ý kế tiếp bằng regex (tìm kiếm gốc) thay cho duyệt từng ký tự trong JS: nhanh hơn hẳn
// khi chưa được JIT (build tĩnh chỉ chạy một lần).
const NON_SPACE = /\S/g
const HEAD_STOP = /["'(){;]/g
const BODY_STOP = /["'{}]/g
const DOUBLE_STOP = /[\\"]/g
const SINGLE_STOP = /[\\']/g
const find = (re: RegExp, css: string, from: number): number => {
    re.lastIndex = from
    return re.exec(css) ? re.lastIndex - 1 : css.length
}
/**
 * Vị trí ngay sau chuỗi trích dẫn mở tại `i` (`\` bỏ qua ký tự kế tiếp). Chuỗi không đóng: vị trí cuối như vòng
 * lặp từng ký tự trước đây (vượt độ dài 1 khi `\` là ký tự cuối).
 */
const skipQuote = (css: string, i: number): number => {
    const re = css[i] === '"' ? DOUBLE_STOP : SINGLE_STOP
    let j = i + 1
    for (;;) {
        if (j >= css.length) return j
        j = find(re, css, j)
        if (j >= css.length) return j
        if (css[j] !== '\\') return j + 1
        j += 2
    }
}

/** Tách CSS thành các khối cấp cao nhất (`head{body}` hoặc câu lệnh `...;`). */
const splitBlocks = (css: string): Block[] => {
    const blocks: Block[] = []
    const length = css.length
    let i = 0
    while ((i = find(NON_SPACE, css, i)) < length) {
        let j = i
        let parens = 0
        // Đọc phần đầu tới `{` hoặc `;` ở cấp ngoài cùng.
        while (j < length) {
            if ((j = find(HEAD_STOP, css, j)) >= length) break
            const ch = css[j]
            if (ch === '"' || ch === "'") {
                j = skipQuote(css, j)
                continue
            }
            if (ch === '(') parens++
            else if (ch === ')') parens--
            else if (parens === 0) break
            j++
        }
        if (j >= length || css[j] === ';') {
            blocks.push({ text: css.slice(i, j + 1).trim() })
            i = j + 1
            continue
        }
        const head = css.slice(i, j).trim()
        let depth = 1
        let k = j + 1
        while (depth > 0 && k < length) {
            if ((k = find(BODY_STOP, css, k)) >= length) break
            const ch = css[k]
            if (ch === '"' || ch === "'") k = skipQuote(css, k)
            else {
                depth += ch === '{' ? 1 : -1
                k++
            }
        }
        blocks.push({ head, body: css.slice(j + 1, k - 1) })
        i = k
    }
    return blocks
}

const LAYER_HEAD = /^@layer\s+(l\d+)$/
const NESTING_HEAD = /^@(media|supports|layer|container|scope)\b/

// `nested`: kết quả serialize của thân khối lồng nhau theo nội dung — hai lượt của minifyCss gặp lại gần như mọi thân
// khối (chỉ khối chứa preflight đổi), và `prune` cho cùng kết quả ở cả hai lượt.
const serialize = (blocks: Block[], prune: (head: string) => boolean, nested: Map<string, string>): string => {
    let out = ''
    let openLayer = ''
    let layerBody = ''
    const flushLayer = () => {
        if (openLayer) out += `@layer ${openLayer}{${layerBody}}`
        openLayer = ''
        layerBody = ''
    }
    for (const block of blocks) {
        if ('text' in block) {
            flushLayer()
            out += block.text
            continue
        }
        if (prune(block.head)) continue
        const layer = block.head.match(LAYER_HEAD)
        let body: string
        if (NESTING_HEAD.test(block.head)) {
            const cached = nested.get(block.body)
            body = cached ?? serialize(splitBlocks(block.body), prune, nested)
            if (cached === undefined) nested.set(block.body, body)
        } else body = block.body.trim()
        if (layer) {
            if (openLayer !== layer[1]) {
                flushLayer()
                openLayer = layer[1]
            }
            layerBody += body
            continue
        }
        flushLayer()
        if (NESTING_HEAD.test(block.head) && !body) continue
        out += `${block.head}{${body}}`
    }
    flushLayer()
    return out
}

export const minifyCss = (css: string): string => {
    const blocks = splitBlocks(css)
    // Nội dung không tính các khối @property/@keyframes: dùng để biết biến/animation nào còn được dùng.
    const baseUsage = blocks
        .filter((b) => !('head' in b) || !/^@(property|keyframes)\b/.test(b.head))
        .map((b) => ('head' in b ? b.head + '{' + b.body + '}' : b.text))
        .join('')
    const usedKeyframes = (name: string) => new RegExp(`(animation(-name)?\\s*:[^;}]*\\b${name}\\b)|var\\(--animate-${name}\\b`).test(baseUsage)
    // Biến đọc trong @keyframes còn dùng (`--tw-enter-opacity` của `@keyframes enter`) cũng là đang dùng.
    const usage = baseUsage + blocks
        .filter((b): b is { head: string; body: string } => 'head' in b && /^@keyframes\s+[\w-]+$/.test(b.head) && usedKeyframes(b.head.split(/\s+/)[1]))
        .map((b) => b.body)
        .join('')
    const isFallbackDecl = (decl: string) => /^--[\w-]+:/.test(decl.trim())
    // Biến được dùng nếu xuất hiện ngoài khai báo dự phòng của chính nó.
    const usageWithoutFallback = usage.replace(/\*,\s*::before,\s*::after,\s*::backdrop\{[^}]*\}/g, '')
    // Biến `--x` được dùng nếu là đuôi của một dãy ký tự [\w-] liền nhau (như regex `--x(?![\w-])`): gom mọi đuôi
    // bắt đầu bằng `--` của các dãy đó một lần, thay cho dựng và chạy một regex trên toàn bộ CSS cho từng @property.
    const varSuffixes = new Set<string>()
    for (const run of usageWithoutFallback.match(/[\w-]+/g) || []) {
        for (let i = run.indexOf('--'); i !== -1; i = run.indexOf('--', i + 1)) varSuffixes.add(run.slice(i))
    }
    const usedVar = (name: string) => varSuffixes.has(name)

    const prunedVars = new Set<string>()
    const pruneCache = new Map<string, boolean>()
    const prune = (head: string): boolean => {
        let result = pruneCache.get(head)
        if (result === undefined) pruneCache.set(head, (result = pruneHead(head)))
        return result
    }
    const pruneHead = (head: string): boolean => {
        const property = head.match(/^@property\s+(--[\w-]+)$/)
        if (property && !usedVar(property[1])) {
            prunedVars.add(property[1])
            return true
        }
        const keyframes = head.match(/^@keyframes\s+([\w-]+)$/)
        if (keyframes && !usedKeyframes(keyframes[1])) return true
        return false
    }
    // Lượt 1 để biết biến nào bị bỏ; lượt 2 bỏ luôn khai báo dự phòng tương ứng.
    const nested = new Map<string, string>()
    serialize(blocks, prune, nested)
    const cleaned = css.replace(/(\*,\s*::before,\s*::after,\s*::backdrop\{)([^}]*)\}/g, (_m, open: string, decls: string) => {
        const kept = decls.split(';').filter((d) => d.trim() && (!isFallbackDecl(d) || !prunedVars.has(d.trim().split(':')[0])))
        return `${open}${kept.join(';')}}`
    })
    return serialize(splitBlocks(cleaned), prune, nested)
}
