import { afterEach, describe, expect, it } from 'vitest'
import { xcss } from '../src/core'

type GlobalSnapshot = Record<string, unknown>

type FakeMutation = {
    type: 'attributes' | 'childList'
    attributeName?: string
    oldValue?: string | null
    target?: FakeElement
    addedNodes?: FakeElement[]
}

class FakeElement {
    nodeType = 1
    tagName = 'DIV'
    className: string | { baseVal: string }
    classList: string[]
    private readonly descendants: FakeElement[]

    constructor(className = '', descendants: FakeElement[] = []) {
        this.className = className
        this.classList = className.split(/\s+/).filter(Boolean)
        this.descendants = descendants
    }

    querySelectorAll(selector: string): FakeElement[] {
        return selector === '[class]' ? this.descendants : []
    }
}

const installBrowserEnvironment = () => {
    const globalObject = globalThis as Record<string, unknown>
    const names = [
        'window',
        'document',
        'Element',
        'ShadowRoot',
        'MutationObserver',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'CSSStyleSheet',
        'CSSLayerBlockRule',
    ]
    const previous: GlobalSnapshot = Object.fromEntries(names.map((name) => [name, globalObject[name]]))
    const rafCallbacks = new Map<number, FrameRequestCallback>()
    const observers: FakeMutationObserver[] = []
    let nextFrameId = 1

    class FakeMutationObserver {
        disconnected = false
        observedTarget: unknown = null
        private readonly callback: (mutations: FakeMutation[]) => void

        constructor(callback: (mutations: FakeMutation[]) => void) {
            this.callback = callback
            observers.push(this)
        }

        observe(target: unknown) {
            this.observedTarget = target
        }

        disconnect() {
            this.disconnected = true
        }

        dispatch(mutations: FakeMutation[]) {
            this.callback(mutations)
        }
    }

    const styles: Array<{ id: string; textContent: string; media: string; setAttribute: (name: string, value: string) => void }> = []
    const style = () => ({
        id: '',
        textContent: '',
        media: '',
        setAttribute() {},
    })
    const documentElement = new FakeElement()
    const documentRoot = {
        documentElement,
        head: {
            append(item: any) { styles.push(item) },
            appendChild(item: any) { styles.push(item) },
        },
        createElement(tag: string) {
            if (tag !== 'style') throw new Error(`Unsupported tag: ${tag}`)
            return style()
        },
        querySelector() { return null },
        getRootNode() { return documentRoot },
    }

    class FakeShadowRoot {
        host = {}
        ownerDocument = documentRoot
        readonly children: FakeElement[]

        constructor(children: FakeElement[]) {
            this.children = children
        }

        getRootNode() { return this }
        querySelector() { return null }
        querySelectorAll(selector: string) { return selector === '[class]' ? this.children : [] }
        prepend(item: any) { styles.push(item) }
        appendChild(item: any) { styles.push(item) }
    }

    globalObject.window = { addEventListener() {}, removeEventListener() {} }
    globalObject.document = documentRoot
    globalObject.Element = FakeElement
    globalObject.ShadowRoot = FakeShadowRoot
    globalObject.MutationObserver = FakeMutationObserver
    globalObject.requestAnimationFrame = (callback: FrameRequestCallback) => {
        const id = nextFrameId++
        rafCallbacks.set(id, callback)
        return id
    }
    globalObject.cancelAnimationFrame = (id: number) => {
        rafCallbacks.delete(id)
    }
    delete globalObject.CSSStyleSheet
    delete globalObject.CSSLayerBlockRule

    return {
        documentRoot,
        FakeShadowRoot,
        observers,
        flushAnimationFrames() {
            const callbacks = [...rafCallbacks.values()]
            rafCallbacks.clear()
            callbacks.forEach((callback) => callback(0))
        },
        restore() {
            for (const name of names) {
                if (previous[name] === undefined) delete globalObject[name]
                else globalObject[name] = previous[name]
            }
        },
    }
}

let environment: ReturnType<typeof installBrowserEnvironment> | null = null

afterEach(() => {
    environment?.restore()
    environment = null
})

describe('runtime observer lifecycle', () => {
    it('quét class hiện có trong ShadowRoot trước paint đầu tiên', () => {
        environment = installBrowserEnvironment()
        const shadowRoot = new environment.FakeShadowRoot([new FakeElement('m10px')])
        const built = xcss({ hashClassName: false }).buildCss(shadowRoot as any)

        built.observe()

        expect(built.getCssString()).toContain('.m10px{margin:10px}')
        built.destroy()
    })

    it('observe() lặp lại không tạo MutationObserver không thể cleanup', () => {
        environment = installBrowserEnvironment()
        const built = xcss({ hashClassName: false }).buildCss(environment.documentRoot as any)

        built.observe()
        built.observe()

        expect(environment.observers).toHaveLength(1)
        built.destroy()
        expect(environment.observers[0].disconnected).toBe(true)
    })

    it('giới hạn observer vào Element được truyền vào buildCss()', () => {
        environment = installBrowserEnvironment()
        const rootElement = new FakeElement()
        ;(rootElement as FakeElement & { getRootNode: () => unknown }).getRootNode = () => environment!.documentRoot
        const built = xcss({ hashClassName: false }).buildCss(rootElement as any)

        built.observe()

        expect(environment.observers[0].observedTarget).toBe(rootElement)
        built.destroy()
    })

    it('destroy() hủy batch mutation đã xếp hàng trước khi callback chạy', () => {
        environment = installBrowserEnvironment()
        const built = xcss({ hashClassName: false }).buildCss(environment.documentRoot as any)
        const target = new FakeElement('m10px')

        built.observe()
        environment.observers[0].dispatch([
            { type: 'attributes', attributeName: 'class', oldValue: '', target },
        ])
        built.destroy()
        environment.flushAnimationFrames()

        expect(built.getCssString()).not.toContain('margin:10px')
    })

    it('đọc SVGAnimatedString khi class SVG thay đổi', () => {
        environment = installBrowserEnvironment()
        const built = xcss({ hashClassName: false }).buildCss(environment.documentRoot as any)
        const target = new FakeElement()
        target.className = { baseVal: 'm10px' }
        target.classList = ['m10px']

        built.observe()
        environment.observers[0].dispatch([
            { type: 'attributes', attributeName: 'class', oldValue: '', target },
        ])
        environment.flushAnimationFrames()

        expect(built.getCssString()).toContain('.m10px{margin:10px}')
        built.destroy()
    })

    it('tách class mutation bằng mọi HTML whitespace, không chỉ dấu cách', () => {
        environment = installBrowserEnvironment()
        const built = xcss({ hashClassName: false }).buildCss(environment.documentRoot as any)
        const target = new FakeElement()
        target.className = 'm10px\tp20px\n'
        target.classList = ['m10px', 'p20px']

        built.observe()
        environment.observers[0].dispatch([
            { type: 'attributes', attributeName: 'class', oldValue: '', target },
        ])
        environment.flushAnimationFrames()

        const css = built.getCssString()
        expect(css).toContain('.m10px{margin:10px}')
        expect(css).toContain('.p20px{padding:20px}')
        built.destroy()
    })
})
