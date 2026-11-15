import { expect, test } from '@playwright/test'

// Trước 0.7.2, thẻ khai báo thứ tự layer bị removeBootloaderStyle() xoá sau hai khung hình,
// làm layer thấp thắng layer cao. Kiểm tra cả sau khi nhiều khung hình đã trôi qua.
test('layer cao luôn thắng, kể cả sau vài khung hình', async ({ page }) => {
    await page.goto('/e2e/fixture.html')
    await page.evaluate(async () => {
        const xcss = (await import('/dist/index.mjs' as string)).default
        const a = document.createElement('div')
        a.id = 'a'
        a.className = '2cRed cBlue'
        document.body.appendChild(a)
        xcss.cssObserve(document, { hashClassName: false })
        await new Promise((r) => setTimeout(r, 200))
        const b = document.createElement('div')
        b.id = 'b'
        b.className = '7cGreen 3cOrange'
        document.body.appendChild(b)
        await new Promise((r) => setTimeout(r, 100))
    })
    await expect(page.locator('#a')).toHaveCSS('color', 'rgb(255, 0, 0)')
    await expect(page.locator('#b')).toHaveCSS('color', 'rgb(0, 128, 0)')
})
