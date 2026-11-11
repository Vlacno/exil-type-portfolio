import { test, expect } from '../fixtures'

const sections = [
  ['research', { articles: [] }, 'No research articles have been published yet.'],
  ['publications', [], 'No publications have been published yet.'],
  ['typefaces', [], 'No typefaces have been published yet.'],
  ['about', { sections: [] }, 'No About content has been published yet.'],
]

for (const [section, result, emptyState] of sections) {
  test(`production build uses the independent CMS for ${section}`, async ({ page }) => {
    const requests = []
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.route('https://*.sanity.io/**/data/query/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      expect(['e1din49w.api.sanity.io', 'e1din49w.apicdn.sanity.io']).toContain(url.hostname)
      expect(url.pathname).toBe('/v2025-02-19/data/query/production')
      expect(url.searchParams.get('perspective')).toBe('published')
      expect(request.method()).toBe('GET')
      expect((await request.allHeaders()).authorization).toBeUndefined()
      requests.push(url.pathname)
      return route.fulfill({ json: { result } })
    })
    await page.goto(`/#/${section}`)
    await expect(page.getByText(emptyState, { exact: true })).toBeVisible()
    expect(requests.length).toBeGreaterThan(0)
    expect(errors).toEqual([])
  })
}
