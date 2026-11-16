/**
 * Thu gọn CSS tĩnh do engine sinh (dùng cho extract/CLI/plugin Vite khi bật `minify`):
 *   - bỏ `@property --x` và `@keyframes` không được tham chiếu (kèm khai báo dự phòng của biến đó),
 *   - gộp các khối `@layer lN{...}` liên tiếp cùng layer (ở mọi cấp, kể cả trong `@media`),
 *   - bỏ khoảng trắng thừa giữa các khối.
 * Không đổi thứ tự rule nên không đổi kết quả cascade.
 */

type Block = { head: string; body: string } | { text: string }

/** Tách CSS thành các khối cấp cao nhất (`head{body}` hoặc câu lệnh `...;`). */
const splitBlocks = (css: string): Block[] => {
    const blocks: Block[] = []
    let i = 0
    while (i < css.length) {
        while (i < css.length && /\s/.test(css[i])) i++
        if (i >= css.length) break
        let j = i
        let quote = ''
        let parens = 0
        // Đọc phần đầu tới `{` hoặc `;` ở cấp ngoài cùng.
        while (j < css.length) {
            const ch = css[j]
            if (quote) {
                if (ch === '\\') j++
                else if (ch === quote) quote = ''
            } else if (ch === '"' || ch === "'") quote = ch
            else if (ch === '(') parens++
            else if (ch === ')') parens--
            else if (parens === 0 && (ch === '{' || ch === ';')) break
            j++
        }
        if (j >= css.length || css[j] === ';') {
            blocks.push({ text: css.slice(i, j + 1).trim() })
            i = j + 1
            continue
        }
        const head = css.slice(i, j).trim()
        let depth = 1
        let k = j + 1
        quote = ''
        while (k < css.length && depth > 0) {
            const ch = css[k]
            if (quote) {
                if (ch === '\\') k++
                else if (ch === quote) quote = ''
            } else if (ch === '"' || ch === "'") quote = ch
            else if (ch === '{') depth++
            else if (ch === '}') depth--
            k++
        }
        blocks.push({ head, body: css.slice(j + 1, k - 1) })
        i = k
    }
    return blocks
}

const LAYER_HEAD = /^@layer\s+(l\d+)$/
const NESTING_HEAD = /^@(media|supports|layer|container|scope)\b/

const serialize = (blocks: Block[], prune: (head: string) => boolean): string => {
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
        const body = NESTING_HEAD.test(block.head) ? serialize(splitBlocks(block.body), prune) : block.body.trim()
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
    const usedVar = (name: string) => new RegExp(name.replace(/[-]/g, '\\-') + '(?![\\w-])').test(usageWithoutFallback)

    const prunedVars = new Set<string>()
    const prune = (head: string): boolean => {
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
    serialize(blocks, prune)
    const cleaned = css.replace(/(\*,\s*::before,\s*::after,\s*::backdrop\{)([^}]*)\}/g, (_m, open: string, decls: string) => {
        const kept = decls.split(';').filter((d) => d.trim() && (!isFallbackDecl(d) || !prunedVars.has(d.trim().split(':')[0])))
        return `${open}${kept.join(';')}}`
    })
    return serialize(splitBlocks(cleaned), prune)
}
