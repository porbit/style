import { expect, test } from '@playwright/test'

// Mọi class của bộ component phải được trình duyệt chấp nhận (CSS.supports) trên từng engine.
test('bộ component: không class nào bị trình duyệt từ chối', async ({ page }) => {
    await page.goto('/e2e/fixture.html')
    const rejected = await page.evaluate(async () => {
        const core = (await import('/dist/index.mjs' as string)).default
        const c = await import('/dist/components.mjs' as string)
        const tokens = new Set<string>()
        for (const fn of Object.values<any>(c.ui)) {
            const combos: Record<string, string>[] = [{}]
            for (const [key, values] of Object.entries<string[]>(fn.variantKeys)) values.forEach((v) => combos.push({ [key]: v }))
            combos.forEach((props) => fn(props).split(/\s+/).forEach((t: string) => t && tokens.add(t)))
        }
        for (const s of c.COMPONENT_SNIPPETS) {
            for (const m of (s.html as string).matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach((t) => t && tokens.add(t))
        }
        const bad: string[] = []
        for (const token of tokens) {
            const engine = core.css({ silent: true }).buildCss(undefined)
            if (engine.clsx(token) === token) bad.push(token)
            engine.destroy()
        }
        return bad
    })
    expect(rejected).toEqual([])
})

test('demo component: nút chính có màu theme', async ({ page }) => {
    await page.goto('/demo/components.html')
    const primary = page.locator('#button button').first()
    await expect(primary).toHaveCSS('background-color', 'rgb(37, 99, 235)')
    await expect(primary).toHaveCSS('color', 'rgb(255, 255, 255)')
})
