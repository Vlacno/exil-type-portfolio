import { test, expect } from '../fixtures'

test('the shell stays visible while Research cards wait for their fonts', async ({ page }) => {
  let release
  const pending = new Promise((resolve) => { release = resolve })
  await page.route('**/*Inter-Variable*.woff2', async (route) => {
    await pending
    await route.continue()
  })
  await page.goto('/#/research', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.research-page-card')).toHaveCount(5)
  await expect(page.locator('#root')).toBeVisible()
  await expect(page.locator('.header')).toBeVisible()
  await expect(page.locator('.footer')).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-fonts-loading')
  release()
  await expect(page.locator('.research-page-card').first()).toHaveAttribute('data-font-state', 'ready')
  await expect(page.locator('#root')).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-fonts-loading')
  await expect.poll(() => page.evaluate(() => document.fonts.check('16px Inter'))).toBe(true)
})

test('a stalled font does not hide the shell or ordinary content', async ({ page }) => {
  await page.route('**/*Inter-Variable*.woff2', () => {})
  await page.goto('/#/research', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.research-page-card')).toHaveCount(5)
  await expect(page.locator('#root')).toBeVisible()
  await expect(page.locator('.header')).toBeVisible()
  await expect(page.locator('.research-page-card').first()).toBeVisible()
})
