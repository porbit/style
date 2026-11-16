import { afterEach, describe, expect, it } from 'vitest'
import { xcss } from '../src/core'
import { selectorClassNames, staticLayerBlock } from '../src/hybrid'
import { tailwindV4Dialect } from '../src/tailwind-v4'

/**
 * Chế độ lai (CSS tĩnh + runtime): rule sinh lúc chạy phải nằm trong khối `@layer` của CSS tĩnh, đúng vị trí theo
 * thứ tự Tailwind. Không có jsdom/happy-dom: dựng CSSOM giả tối thiểu (sheet, khối @layer, nhóm @media, style rule
 * với insertRule/deleteRule/cssText) đủ cho đường chèn của engine. Kiểm trên trình duyệt thật: eval/hybrid-order.mjs.
 */
type AnyObj = Record<string, any>

class FakeLayerBlockRule {}

// Tách chuỗi CSS thành các rule cấp cao nhất (`a{...}`, `@layer x;`).
const splitRules = (text: string): string[] => {
    const out: string[] = []
    let depth = 0
    let start = 0
    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (ch === '{') depth++
        else if (ch === '}' && --depth === 0) {
            out.push(text.slice(start, i + 1).trim())
            start = i + 1
        } else if (ch === ';' && depth === 0) {
            out.push(text.slice(start, i + 1).trim())
            start = i + 1
        }
    }
    return out.filter(Boolean)
}

const makeList = (owner: AnyObj, text = '') => {
    owner.cssRules = splitRules(text).map(parseRule)
    owner.insertRule = (rule: string, index = 0) => {
        owner.cssRules.splice(index, 0, parseRule(rule))
        return index
    }
    owner.deleteRule = (index: number) => owner.cssRules.splice(index, 1)
}

const parseRule = (text: string): AnyObj => {
    const open = text.indexOf('{')
    if (open < 0) return { cssText: text }
    const head = text.slice(0, open).trim()
    const body = text.slice(open + 1, text.lastIndexOf('}'))
    if (!head.startsWith('@')) return { selectorText: head, cssText: `${head} { ${body} }` }
    const rule: AnyObj = head.startsWith('@layer ') ? Object.assign(new FakeLayerBlockRule(), { name: head.slice(7).trim() }) : {}
    // @property, @keyframes...: thân không phải danh sách rule, giữ nguyên.
    if (/^@(property|keyframes|font-face)/.test(head)) return { cssText: text }
    makeList(rule, body)
    Object.defineProperty(rule, 'cssText', { get: () => `${head} { ${rule.cssRules.map((r: AnyObj) => r.cssText).join(' ')} }` })
    return rule
}

const makeSheet = (text = ''): AnyObj => {
    const sheet: AnyObj = { media: { length: 0, mediaText: '' } }
    makeList(sheet, text)
    sheet.replaceSync = (next: string) => makeList(sheet, next)
    return sheet
}

const createEnv = (staticCss: string) => {
    const g = globalThis as AnyObj
    const keys = ['window', 'document', 'CSSStyleSheet', 'ShadowRoot', 'CSSLayerBlockRule']
    const prev = Object.fromEntries(keys.map((k) => [k, g[k]]))
    const staticSheet = makeSheet(staticCss)
    const fakeDocument: AnyObj = {
        adoptedStyleSheets: [],
        styleSheets: [staticSheet],
        head: { append() {}, appendChild() {} },
        createElement: () => ({ setAttribute() {}, remove() {} }),
        querySelector: () => null,
        getRootNode: () => fakeDocument,
    }
    g.window = { addEventListener() {}, removeEventListener() {} }
    g.document = fakeDocument
    g.CSSStyleSheet = function (this: AnyObj) {
        return makeSheet()
    }
    g.ShadowRoot = class {}
    g.CSSLayerBlockRule = FakeLayerBlockRule
    return {
        document: fakeDocument,
        staticSheet,
        restore() {
            for (const k of keys) {
                if (prev[k] === undefined) delete g[k]
                else g[k] = prev[k]
            }
        },
    }
}

let env: ReturnType<typeof createEnv> | null = null
afterEach(() => {
    env?.restore()
    env = null
})

// Tên class của từng style rule trong khối (kể cả trong nhóm @media), theo thứ tự cascade.
const blockClasses = (block: AnyObj): string[] =>
    block.cssRules.flatMap((rule: AnyObj) => (rule.selectorText != null ? [rule] : rule.cssRules || []).map((r: AnyObj) => selectorClassNames(r.selectorText || '')[0] || ''))

const STATIC = [
    '@layer l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19, l20, l21, l22, l23;',
    '@layer l0{',
    '*,::before{box-sizing:border-box}',
    'body{margin:0}',
    '.inset-0{inset:0px}',
    '.mt-6{margin-top:1.5rem}',
    '.rounded-t-none{border-top-left-radius:0;border-top-right-radius:0}',
    '.p-2{padding:.5rem}',
    '.py-5{padding-block:1.25rem}',
    '@media (hover: hover){.hover\\:bg-teal-300:hover{background-color:teal}}',
    '@media (width >= 48rem){.md\\:p-8{padding:2rem}}',
    '@media (width >= 96rem){.\\32 xl\\:p-10{padding:2.5rem}}',
    '}',
].join('')

describe('chế độ lai: chèn rule vào khối @layer của CSS tĩnh', () => {
    it('selectorClassNames bỏ escape của CSSOM', () => {
        expect(selectorClassNames('.md\\:p-4')).toEqual(['md:p-4'])
        expect(selectorClassNames('.\\32 xl\\:p-10')).toEqual(['2xl:p-10'])
        expect(selectorClassNames('.w-\\[10px\\]:hover')).toEqual(['w-[10px]'])
        expect(selectorClassNames(':where(.space-x-2 > :not(:last-child))')).toEqual(['space-x-2'])
        expect(selectorClassNames('.group-hover\\:p-3:is(:where(.group):hover *)')).toEqual(['group-hover:p-3', 'group'])
        expect(selectorClassNames('*, ::before')).toEqual([])
    })

    it('staticLayerBlock dựng khoá cho từng rule (nhóm @media: từng rule con) và ghi wrap của nhóm', () => {
        env = createEnv(STATIC)
        const compare = (a: string, b: string) => a.localeCompare(b)
        const block = staticLayerBlock(compare)(0)!
        expect(block.b).toBe(env.staticSheet.cssRules[1])
        expect(block.k.map((key) => key?.name)).toEqual([undefined, undefined, 'inset-0', 'mt-6', 'rounded-t-none', 'p-2', 'py-5', 'hover:bg-teal-300', 'md:p-8', '2xl:p-10'])
        expect(block.g.slice(0, 7)).toEqual([null, null, null, null, null, null, null])
        expect(block.g[7].w).toBe('@media (hover: hover)')
        expect(staticLayerBlock(compare)(3)).toBeUndefined()
    })

    it('rule động nằm đúng thứ tự Tailwind giữa các rule tĩnh', async () => {
        env = createEnv(STATIC)
        const dialect = tailwindV4Dialect({ preflight: false })
        const instance = xcss({
            hashClassName: false,
            dictionaryImport: false,
            dialects: [dialect],
            preload: { classes: ['inset-0', 'mt-6', 'rounded-t-none', 'p-2', 'py-5', 'hover:bg-teal-300', 'md:p-8', '2xl:p-10'], staticBlock: staticLayerBlock(dialect.compare!) },
        })
        const { clsx } = instance.buildCss(env.document as any)
        const dynamic = ['px-4', 'top-2', 'm-2', 'rounded-lg', 'p-6', 'hover:bg-lime-300', 'hover:p-1', 'md:p-9', 'xl:p-3', 'flex']
        for (const name of dynamic) clsx(name)
        await instance.ready
        const block = env.staticSheet.cssRules[1]
        const names = blockClasses(block)
        // Mọi class động nằm trong khối tĩnh (không vào sheet riêng), class tĩnh giữ nguyên.
        for (const name of [...dynamic, 'p-2', 'md:p-8']) expect(names).toContain(name)
        const utilities = names.filter(Boolean)
        expect(utilities).toEqual([...utilities].sort(dialect.compare!))
        // Ví dụ của Tailwind: `px-4` sau `p-2`, `top-2` sau `inset-0`, `p-6` (động) trước `py-5` (tĩnh).
        expect(utilities.indexOf('px-4')).toBeGreaterThan(utilities.indexOf('p-2'))
        expect(utilities.indexOf('top-2')).toBeGreaterThan(utilities.indexOf('inset-0'))
        expect(utilities.indexOf('p-6')).toBeLessThan(utilities.indexOf('py-5'))
        // `hover:` động gộp vào nhóm `@media (hover: hover)` có sẵn thay vì tạo at-rule mới.
        const hoverGroups = block.cssRules.filter((rule: AnyObj) => /^@media \(hover: hover\)/.test(rule.cssText))
        expect(hoverGroups.length).toBe(1)
        expect(hoverGroups[0].cssRules.length).toBe(3)
    })

    it('CSS tĩnh bị thay sau khi tải (HMR): preload.reinsert chèn lại rule runtime vào sheet mới, đúng thứ tự', async () => {
        env = createEnv(STATIC)
        const dialect = tailwindV4Dialect({ preflight: false })
        const preload: AnyObj = { classes: ['inset-0', 'mt-6', 'rounded-t-none', 'p-2', 'py-5', 'hover:bg-teal-300', 'md:p-8', '2xl:p-10'], staticBlock: staticLayerBlock(dialect.compare!) }
        const instance = xcss({ hashClassName: false, dictionaryImport: false, dialects: [dialect], preload })
        const { clsx } = instance.buildCss(env.document as any)
        const dynamic = ['px-4', 'top-2', 'p-6', 'hover:bg-lime-300', 'md:p-9']
        for (const name of dynamic) clsx(name)
        await instance.ready
        expect(typeof preload.reinsert).toBe('function')
        // HMR: sheet tĩnh mới (cùng nội dung) thay sheet cũ; rule runtime chỉ còn ở sheet cũ.
        const fresh = makeSheet(STATIC)
        env.document.styleSheets = [fresh]
        expect(blockClasses(fresh.cssRules[1])).not.toContain('px-4')
        preload.reinsert()
        const utilities = blockClasses(fresh.cssRules[1]).filter(Boolean)
        for (const name of dynamic) expect(utilities).toContain(name)
        expect(utilities).toEqual([...utilities].sort(dialect.compare!))
        // Class mới sau HMR cũng vào sheet mới; gọi lại khi sheet không đổi không chèn trùng.
        clsx('m-2')
        await instance.ready
        expect(blockClasses(fresh.cssRules[1])).toContain('m-2')
        const count = blockClasses(fresh.cssRules[1]).length
        const again = makeSheet(STATIC)
        env.document.styleSheets = [again]
        preload.reinsert()
        expect(blockClasses(again.cssRules[1]).length).toBe(count)
    })

    it('không có khối @layer phù hợp: rule vào sheet riêng như thường', async () => {
        env = createEnv('.p-2{padding:.5rem}')
        const dialect = tailwindV4Dialect({ preflight: false })
        const instance = xcss({ hashClassName: false, dictionaryImport: false, dialects: [dialect], preload: { classes: ['p-2'], staticBlock: staticLayerBlock(dialect.compare!) } })
        const { clsx, getCssString } = instance.buildCss(env.document as any)
        clsx('px-4')
        await instance.ready
        expect(env.staticSheet.cssRules.length).toBe(1)
        expect(getCssString()).toContain('.px-4{')
        const own = env.document.adoptedStyleSheets.flatMap((sheet: AnyObj) => sheet.cssRules.filter((r: AnyObj) => r instanceof FakeLayerBlockRule))
        expect(own.flatMap(blockClasses)).toContain('px-4')
    })
})
