import { afterEach, describe, expect, it } from 'vitest'
import { xcss } from '../src/core'

// ----- SSR-based tests (không cần DOM) -----
describe('cross-browser: SSR output', () => {
    it('CB4: hoverMedia bọc rule :hover trong @media (hover: hover)', async () => {
        const instance = xcss({ hoverMedia: true, hashClassName: false })
        const { clsx, getCssString } = instance.buildCss()
        clsx('bgc#ff0000@:hover')
        await instance.ready
        const css = getCssString()
        expect(css).toContain('@media (hover: hover)')
        expect(css).toContain(':hover{background-color:#ff0000}')
    })

    it('CB4: không bọc khi hoverMedia tắt (mặc định)', async () => {
        const instance = xcss({ hashClassName: false })
        const { clsx, getCssString } = instance.buildCss()
        clsx('bgc#ff0000@:hover')
        await instance.ready
        expect(getCssString()).not.toContain('@media (hover: hover)')
    })

    it('CB5: autoprefix thêm -webkit- cho user-select và backdrop-filter', async () => {
        const instance = xcss({ autoprefix: true, hashClassName: false })
        const { clsx, getCssString } = instance.buildCss()
        clsx('us[none]')
        clsx('bkdf[blur(4px)]')
        await instance.ready
        const css = getCssString()
        expect(css).toContain('-webkit-user-select:none;user-select:none')
        expect(css).toContain('-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)')
    })

    it('CB5: position:sticky nhận -webkit-sticky đứng trước', async () => {
        const instance = xcss({ autoprefix: true, hashClassName: false })
        const { clsx, getCssString } = instance.buildCss()
        clsx('posSt')
        await instance.ready
        expect(getCssString()).toContain('position:-webkit-sticky;position:sticky')
    })

    it('CB5: không thêm prefix khi autoprefix tắt', async () => {
        const instance = xcss({ hashClassName: false })
        const { clsx, getCssString } = instance.buildCss()
        clsx('us[none]')
        await instance.ready
        expect(getCssString()).not.toContain('-webkit-user-select')
    })

    it('CB3: escapeCssIdentifier escape chữ số ở đầu theo spec (\\32 )', async () => {
        const instance = xcss({ hashClassName: false })
        const { clsx, getCssString } = instance.buildCss()
        clsx('2m10px') // layer 2 -> class bắt đầu bằng số
        await instance.ready
        // CSS.escape của trình duyệt sinh "\32 m10px"; SSR phải khớp để cache đồng nhất.
        expect(getCssString()).toContain('\\32 m10px')
    })
})

// ----- Legacy browser (không Constructable Stylesheets, không @layer) -----
type AnyObj = Record<string, any>

function createLegacyEnv() {
    const g = globalThis as AnyObj
    const prev = {
        window: g.window,
        document: g.document,
        CSSStyleSheet: g.CSSStyleSheet,
        ShadowRoot: g.ShadowRoot,
        CSSLayerBlockRule: g.CSSLayerBlockRule,
    }

    const styleEls: AnyObj[] = []
    const makeStyleEl = (): AnyObj => ({
        tagName: 'STYLE',
        media: '',
        textContent: '',
        _attrs: {} as AnyObj,
        setAttribute(name: string, value: string) { this._attrs[name] = value },
        remove() {},
    })

    const fakeDocument: AnyObj = {
        // CHỦ Ý: không có adoptedStyleSheets -> buộc fallback <style>
        head: {
            append(el: AnyObj) { styleEls.push(el) },
            appendChild(el: AnyObj) { styleEls.push(el) },
        },
        createElement(tag: string) {
            if (tag !== 'style') throw new Error('unsupported')
            return makeStyleEl()
        },
        querySelector() { return null },
        getRootNode() { return fakeDocument },
    }

    g.window = { addEventListener() {}, removeEventListener() {} }
    g.document = fakeDocument
    g.CSSStyleSheet = class FakeCSSStyleSheet { constructor(_o?: any) {} }
    g.ShadowRoot = class FakeShadowRoot {}
    delete g.CSSLayerBlockRule // đảm bảo supportsAtLayer = false

    return {
        document: fakeDocument,
        styleEls,
        restore() {
            g.window = prev.window
            g.document = prev.document
            g.CSSStyleSheet = prev.CSSStyleSheet
            g.ShadowRoot = prev.ShadowRoot
            if (prev.CSSLayerBlockRule === undefined) delete g.CSSLayerBlockRule
            else g.CSSLayerBlockRule = prev.CSSLayerBlockRule
        },
    }
}

let env: ReturnType<typeof createLegacyEnv> | null = null
afterEach(() => { env?.restore(); env = null })

describe('cross-browser: legacy fallback (Safari < 16.4 / WebView cũ)', () => {
    it('CB1+CB2: dùng <style> element và bỏ bọc @layer khi thiếu hỗ trợ', async () => {
        env = createLegacyEnv()
        const instance = xcss({ hashClassName: false })
        const { clsx } = instance.buildCss(env.document as any)
        clsx('m10px') // emit đồng bộ (chưa gọi observe -> isFirstRenderBatch=true)
        await instance.ready

        // Phải có ít nhất một <style> element được tạo (fallback path)
        expect(env.styleEls.length).toBeGreaterThan(0)
        const allText = env.styleEls.map((e) => e.textContent).join('\n')
        expect(allText).toContain('.m10px{margin:10px}')
        // Không bọc @layer vì CSSLayerBlockRule không tồn tại
        expect(allText).not.toContain('@layer')
    })
})
