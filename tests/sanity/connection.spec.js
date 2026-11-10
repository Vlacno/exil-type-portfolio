import { test, expect } from '../fixtures'

const card = { _id: 'new-project-article', id: 'new-project-article', title: 'Independent CMS article', summary: 'New project content', font: 'inter' }

function interceptQueries(page, result, requests) {
  return page.route('https://*.sanity.io/**/data/query/**', async (route) => {
    const request = route.request()
    requests.push({ url: request.url(), method: request.method(), headers: await request.allHeaders() })
    await route.fulfill({ json: { result } })
  })
}

test('the actual SDK reads only published content from the new project without credentials', async ({ page }) => {
  const requests = []
  await interceptQueries(page, { articles: [card] }, requests)
  await page.goto('/#/research')
  await expect(page.getByRole('heading', { name: card.title })).toBeVisible()
  expect(requests.length).toBeGreaterThan(0)
  for (const request of requests) {
    const url = new URL(request.url)
    expect(url.origin).toBe('https://e1din49w.api.sanity.io')
    expect(url.pathname).toBe('/v2025-02-19/data/query/production')
    expect(url.searchParams.get('perspective')).toBe('published')
    expect(request.method).toBe('GET')
    expect(request.headers.authorization).toBeUndefined()
    expect(request.headers.cookie).toBeUndefined()
  }
})

test('CMS images use the new project and dataset', async ({ page }) => {
  const requests = []
  await interceptQueries(page, { ...card, body: [{
    _key: 'image', _type: 'researchImage', alt: 'Independent image',
    image: { asset: { _id: 'image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-800x600-jpg' } },
  }] }, requests)
  await page.route('https://cdn.sanity.io/images/**', (route) => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>',
  }))
  await page.goto('/#/research/new-project-article')
  await expect(page.getByRole('img', { name: 'Independent image' })).toHaveAttribute('src', /^https:\/\/cdn\.sanity\.io\/images\/e1din49w\/production\//)
})

test('an empty new CMS shows its empty state without silently falling back to local content', async ({ page }) => {
  await interceptQueries(page, { articles: [] }, [])
  await page.goto('/#/research')
  await expect(page.getByText('No research articles have been published yet.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Typography in Emigrant publications', exact: true })).toHaveCount(0)
})
