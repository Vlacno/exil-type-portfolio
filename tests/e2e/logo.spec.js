import { test, expect } from '../fixtures'

for (const width of [1280, 390]) {
  test(`compact EXIL Type logo and menu retain the original corners at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/#/about')
    const logo = page.getByRole('img', { name: 'EXIL Type', exact: true })
    await expect(logo).toBeVisible()
    // Vite may inline small SVGs as data URLs, so verify the asset dimensions.
    await expect.poll(() => logo.evaluate((image) => [image.naturalWidth, image.naturalHeight])).toEqual([92, 23])
    const image = await logo.boundingBox()
    const frame = await page.locator('.header__logo').boundingBox()
    expect(frame.width / frame.height).toBeCloseTo(114 / 37, 2)
    expect(frame.height).toBe(width > 1000 ? 50 : 48)
    expect(image.x).toBeGreaterThan(frame.x + 10)
    expect(image.y).toBeGreaterThan(frame.y + 5)
    expect(image.x + image.width).toBeLessThan(frame.x + frame.width - 10)
    expect(image.y + image.height).toBeLessThan(frame.y + frame.height - 5)
    await expect(page.locator('.header__logo')).toHaveCSS('border-top-width', '1px')
    await expect(page.locator('.header__logo')).toHaveCSS('border-top-left-radius', '10px')
    const expectedRadius = 10
    for (const radius of await page.locator('.header__nav-item').evaluateAll((links) => links.map((link) => parseFloat(getComputedStyle(link).borderTopLeftRadius)))) {
      expect(radius).toBeCloseTo(expectedRadius, 2)
    }
    if (width <= 1000) {
      const radius = await page.locator('.header__menu-toggle').evaluate((button) => parseFloat(getComputedStyle(button).borderTopLeftRadius))
      expect(radius).toBeCloseTo(expectedRadius, 2)
    }
    await page.getByRole('link', { name: 'EXIL Type', exact: true }).click()
    await expect(page).toHaveURL(/#\/$/)
  })
}
