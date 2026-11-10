import { test, expect } from '../fixtures'

test('About opens only the first section; rows toggle independently by mouse and keyboard', async ({ page }) => {
  await page.goto('/#/about')
  const main = page.getByRole('main')
  const first = main.getByRole('button', { name: 'About', exact: true })
  const research = main.getByRole('button', { name: 'Research', exact: true })
  await expect(main.locator('button[aria-expanded="true"]')).toHaveCount(1)
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('region', { name: 'Research', exact: true })).toHaveCount(0)
  const bounds = await research.boundingBox()
  await research.click({ position: { x: bounds.width - 12, y: bounds.height / 2 } })
  await expect(research).toHaveAttribute('aria-expanded', 'true')
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('region', { name: 'Research', exact: true })).toContainText('Alongside its historical investigation')
  await research.press('Enter')
  await expect(research).toHaveAttribute('aria-expanded', 'false')
  await first.focus()
  await first.press('Space')
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await expect(main.locator('button[aria-expanded="true"]')).toHaveCount(0)
  await page.reload()
  await expect(first).toHaveAttribute('aria-expanded', 'true')
})

test('About keeps a readable column on mobile with every section expanded', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/about')
  const main = page.getByRole('main')
  for (const title of ['Research', 'Copyright & Authorship', 'Support', 'Contact']) {
    await main.getByRole('button', { name: title, exact: true }).click()
    await expect(page.getByRole('region', { name: title, exact: true })).toBeVisible()
  }
  await expect(main.locator('button[aria-expanded="true"]')).toHaveCount(5)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const content = page.locator('.about-page__content').first()
  await expect(content).toHaveCSS('font-size', '18px')
  expect(await content.evaluate((element) => element.clientWidth)).toBeLessThan(390)
})
