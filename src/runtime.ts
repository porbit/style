import $$ from './core'
import { XCSSConfig } from './core'
import { getBootloaderScript } from './bootloader'
import type { BootloaderScriptOptions } from './bootloader'

const GLOBAL_KEY = '__PRESENCE_STYLE_SHARED__'
const EMPTY_SHARED_CONFIG: XCSSConfig = {}

type CssRoot = Document | ShadowRoot

interface CssInit {
    clsx: (...args: any[]) => string
    observe: () => void
    getCssString: () => string
    destroy: () => void
    ready: Promise<void>
}

export interface SharedXCSSInstance {
    clsx: (...args: any[]) => string
    observe: (root?: CssRoot) => void
    setClsxRoot: (root: CssRoot) => void
    getCss: (root?: CssRoot | null) => string
    ready: (root?: CssRoot | null) => Promise<void>
    /**
     * Giải phóng engine của một root (hoặc root hiện tại): ngắt MutationObserver,
     * đóng BroadcastChannel, huỷ timer cache. Gọi khi unmount ứng dụng hoặc teardown test.
     */
    destroy: (root?: CssRoot | null) => void
}

const isCssRoot = (value: any): value is CssRoot => {
    if (!value) return false
    const hasDocument = typeof Document !== 'undefined'
    const hasShadowRoot = typeof ShadowRoot !== 'undefined'
    const isDoc = hasDocument && value instanceof Document
    const isShadow = hasShadowRoot && value instanceof ShadowRoot
    return isDoc || isShadow
}

const flattenClassArgs = (args: any[]): string[] => {
    const classes: string[] = []

    const push = (value: any) => {
        if (!value) return
        if (typeof value === 'string' || typeof value === 'number') {
            classes.push(String(value))
            return
        }
        if (Array.isArray(value)) {
            value.forEach(push)
            return
        }
        if (typeof value === 'object') {
            Object.keys(value).forEach((key) => {
                if (value[key]) classes.push(key)
            })
        }
    }

    args.forEach(push)
    return classes
}

const makeSharedInstance = (config?: XCSSConfig): SharedXCSSInstance => {
    const cssInitMap = new WeakMap<CssRoot, CssInit>()
    let globalInstance: CssInit | null = null
    const sharedConfig = config ?? EMPTY_SHARED_CONFIG

    let currentCssRoot: CssRoot | null = typeof document !== 'undefined' ? document : null

    const createCssInit = (root?: CssRoot | null): CssInit => {
        const engine = $$.css(sharedConfig)
        const built = engine.buildCss(root ?? undefined)
        return {
            ...built,
            ready: engine.ready,
        }
    }

    const getFallbackInit = (): CssInit => {
        if (!globalInstance) {
            globalInstance = createCssInit(null)
        }
        return globalInstance
    }

    const getCssInit = (root: CssRoot | undefined | null): CssInit => {
        if (!root) return getFallbackInit()
        let cssInit = cssInitMap.get(root)
        if (!cssInit) {
            cssInit = createCssInit(root)
            cssInitMap.set(root, cssInit)
        }
        return cssInit
    }

    const setClsxRoot = (root: CssRoot) => {
        currentCssRoot = root || (typeof document !== 'undefined' ? document : null)
    }

    const clsx = (...args: any[]): string => {
        let root: CssRoot | undefined | null = undefined
        const last = args[args.length - 1]
        if (isCssRoot(last)) {
            root = last
            args = args.slice(0, -1)
        }

        const classes = flattenClassArgs(args)
        const resolvedRoot = root || currentCssRoot

        return getCssInit(resolvedRoot).clsx(classes.join(' '))
    }

    const observe = (root?: CssRoot) => {
        const resolvedRoot = root || currentCssRoot
        getCssInit(resolvedRoot).observe()
    }

    const getCss = (root?: CssRoot | null) => {
        if (root) return getCssInit(root).getCssString()
        if (currentCssRoot) return getCssInit(currentCssRoot).getCssString()
        return getFallbackInit().getCssString()
    }

    const ready = (root?: CssRoot | null) => {
        if (root) return getCssInit(root).ready
        if (currentCssRoot) return getCssInit(currentCssRoot).ready
        return getFallbackInit().ready
    }

    const destroy = (root?: CssRoot | null) => {
        const resolvedRoot = root || currentCssRoot
        if (resolvedRoot) {
            const cssInit = cssInitMap.get(resolvedRoot)
            if (cssInit) {
                cssInit.destroy()
                cssInitMap.delete(resolvedRoot)
            }
            if (!root) {
                globalInstance?.destroy()
                globalInstance = null
            }
            return
        }
        globalInstance?.destroy()
        globalInstance = null
    }

    return { clsx, observe, setClsxRoot, getCss, ready, destroy }
}

export const createSharedInstance = (config?: XCSSConfig): SharedXCSSInstance => {
    return makeSharedInstance(config)
}

export const createSharedClsx = (config?: XCSSConfig): SharedXCSSInstance => {
    return makeSharedInstance(config)
}

const globalScope = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global) as any
const shared: SharedXCSSInstance = globalScope[GLOBAL_KEY] || makeSharedInstance()

if (!globalScope[GLOBAL_KEY]) {
    globalScope[GLOBAL_KEY] = shared
}

export const clsx = shared.clsx
export const observe = shared.observe
export const setClsxRoot = shared.setClsxRoot
export const getCss = shared.getCss
export const ready = shared.ready
export const destroy = shared.destroy
export { getBootloaderScript }
export * from './extract'
export * from './tailwind'
export * from './tailwind-readiness'
export default $$
export type { XCSSConfig, BootloaderScriptOptions }
