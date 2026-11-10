import { test, expect } from '../fixtures'

test('all portfolio sections and detail pages work without CMS requests', async ({ page }) => {
  const cmsRequests = []
  const errors = []
  page.on('request', (request) => {
    if (/sanity\.io|\/__cms_mock__\//.test(request.url())) cmsRequests.push(request.url())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  for (const path of [
    '/', '/research', '/research/typography-in-emigrant-publications',
    '/publications', '/publications/satirikon', '/typefaces',
    '/typefaces/unbounded', '/about',
  ]) {
    await page.goto(`/#${path}`)
    await expect(path === '/' ? page.getByRole('heading', { level: 1 }) : page.getByRole('main')).toBeVisible()
    await expect(page.locator('.content-status--error')).toHaveCount(0)
  }
  expect(cmsRequests).toEqual([])
  expect(errors).toEqual([])
})
