import { expect, test } from '@playwright/test'

// skipInitialScan: paint đầu không chờ quét DOM, nhưng class không có trong manifest
// (ví dụ do JS sinh trước khi observe) vẫn được bù ở lượt quét khi trình duyệt rảnh.
test('static-first: class ngoài manifest vẫn có CSS sau lượt quét dời', async ({ page }) => {
    await page.goto('/e2e/fixture.html')
    await page.evaluate(async () => {
        const xcss = (await import('/dist/index.mjs' as string)).default
        const el = document.createElement('div')
        el.id = 'late'
        el.className = 'p13px bgc#123456'
        document.body.appendChild(el)
        xcss.cssObserve(document, { hashClassName: false, preload: { classes: ['p13px'], skipInitialScan: true } })
    })
    // p13px nằm trong manifest (giả định có CSS tĩnh) nên không được sinh ở runtime.
    await expect(page.locator('#late')).toHaveCSS('background-color', 'rgb(18, 52, 86)')
    await expect(page.locator('#late')).not.toHaveCSS('padding', '13px')
})
