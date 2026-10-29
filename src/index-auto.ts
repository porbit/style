import presenceStyle from './index'

// Auto-init logic
if (typeof document !== 'undefined') {
    // Wait for DOMContentLoaded to ensure body exists if script is in head?
    // cssObserve handles existing DOM + changes.
    // If script is in head, body might not be parsed yet.
    // But cssObserve observes documentElement (html) or body?
    // core.ts: observeDom takes dom. cssObserve passes document.
    // observeDom checks documentElement. So it's safe to run immediately.
    
    presenceStyle.cssObserve(document)
}

export * from './index'
export default presenceStyle
