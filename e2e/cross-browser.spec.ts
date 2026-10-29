import { expect, test } from '@playwright/test'

// Mỗi project (chromium/firefox/webkit/mobile-*) chạy lại toàn bộ assertion dưới đây.
test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/fixture.html')
    await page.waitForFunction(() => (window as any).__xcssReady === true)
})

test('utility cơ bản apply đúng trên mọi engine', async ({ page }) => {
    const box = page.locator('#box')
    await expect(box).toHaveCSS('display', 'flex')
    await expect(box).toHaveCSS('align-items', 'center')
    await expect(box).toHaveCSS('padding', '10px')
    // color trắng
    await expect(box).toHaveCSS('color', 'rgb(255, 255, 255)')
    // background xanh #0a64e8
    await expect(box).toHaveCSS('background-color', 'rgb(10, 100, 232)')
})

test('CB5: position:sticky hoạt động (kể cả Safari qua -webkit-sticky)', async ({ page }) => {
    const pos = await page.locator('#box').evaluate((el) => getComputedStyle(el).position)
    expect(pos).toBe('sticky')
})

test('CB4: :hover chỉ áp trên thiết bị có hover; bản render đúng', async ({ page, isMobile }) => {
    const hover = page.locator('#hoverbox')
    if (!isMobile) {
        await hover.hover()
        await expect(hover).toHaveCSS('background-color', 'rgb(255, 0, 0)')
    } else {
        // Trên mobile (hover:none), rule bị @media (hover:hover) loại -> không đổi nền.
        await expect(hover).not.toHaveCSS('background-color', 'rgb(255, 0, 0)')
    }
})

test('responsive breakpoint md theo viewport', async ({ page, viewport }) => {
    const resp = page.locator('#resp')
    const display = await resp.evaluate((el) => getComputedStyle(el).display)
    if ((viewport?.width ?? 0) >= 768) {
        expect(display).toBe('flex')
    } else {
        expect(display).toBe('none')
    }
})
