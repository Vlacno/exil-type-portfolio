import { test, expect } from '../fixtures'

async function scrollTo(page, y) {
  await page.evaluate((top) => window.scrollTo(0, top), y)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(y, 0)
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

test('back and forward restore scroll; a new visit starts at the top', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 650 })
  await page.goto('/#/research')
  await expect(page.locator('.research-page-card')).toHaveCount(5)
  await page.evaluate(() => document.fonts.ready)
  await scrollTo(page, 250)
  await page.locator('.research-page-card').first().evaluate((link) => link.click())
  await expect(page).toHaveURL(/research\/typography-in-emigrant-publications$/)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await scrollTo(page, 600)
  await page.goBack()
  await expect(page).toHaveURL(/#\/research$/)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(250, 0)
  await page.goForward()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(600, 0)

  // A second catalogue entry must not overwrite the first entry's position.
  await page.locator('.header__nav a[href="#/research"]').evaluate((link) => link.click())
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await scrollTo(page, 400)
  await page.locator('.research-page-card').first().evaluate((link) => link.click())
  await page.goBack()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(400, 0)
  await page.goBack()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(600, 0)
  await page.goBack()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(250, 0)
})
