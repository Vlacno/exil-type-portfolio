import { test, expect } from '../fixtures'

const publication = {
  _id: 'one', id: 'one', title: 'Cached publication', place: 'Prague', year: '1931',
  cover: { alt: 'Cover', asset: { _id: 'image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-800x1200-jpg', metadata: { dimensions: { width: 800, height: 1200 } } } },
  description: [{ _key: 'body', _type: 'block', style: 'normal', markDefs: [], children: [{ _key: 'text', _type: 'span', text: 'Publication body', marks: [] }] }],
}
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"/>'

test('hover prefetch shares an in-flight request with navigation and back uses cache', async ({ page }) => {
  let catalogueRequests = 0
  let detailRequests = 0
  await page.route('**/__cms_mock__/images/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: svg }))
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    if (!query.includes('_type == "publication"')) return route.fulfill({ json: { result: null } })
    const detail = query.includes('$slug')
    if (detail) detailRequests += 1
    else catalogueRequests += 1
    await new Promise((resolve) => setTimeout(resolve, 350))
    await route.fulfill({ json: { result: detail ? publication : [publication] } })
  })
  await page.goto('/#/about')
  const nav = page.getByRole('navigation').getByRole('link', { name: 'Publications', exact: true })
  await nav.hover()
  await expect.poll(() => catalogueRequests).toBe(1)
  await nav.click()
  const card = page.getByRole('main').getByRole('link', { name: publication.title, exact: true })
  await expect(card).toBeVisible()
  expect(catalogueRequests).toBe(1)
  await card.focus()
  await expect.poll(() => detailRequests).toBe(1)
  await card.click()
  await expect(page.getByText('Publication body')).toBeVisible()
  expect(detailRequests).toBe(1)
  await page.goBack()
  await expect(card).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
  expect(catalogueRequests).toBe(1)
  await page.reload()
  await expect(card).toBeVisible()
  expect(catalogueRequests).toBe(2)
})

test('stale data refreshes without flashing a loading state and survives background failure', async ({ page }) => {
  let fail = false
  let release
  let requests = 0
  let title = 'Initial title'
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    requests += 1
    if (requests > 1) await new Promise((resolve) => { release = resolve })
    await route.fulfill(fail ? { status: 403, json: { error: 'Forbidden' } }
      : { json: { result: { sections: [{ _key: 'intro', title, body: [] }] } } })
  })
  await page.goto('/#/about')
  await expect(page.getByRole('main').getByRole('button', { name: title })).toBeVisible()
  await page.evaluate(() => { const now = Date.now(); Date.now = () => now + 31_000; window.dispatchEvent(new Event('focus')) })
  await expect.poll(() => Boolean(release)).toBe(true)
  await expect(page.getByRole('status')).toHaveCount(0)
  title = 'Updated title'
  release()
  await expect(page.getByRole('main').getByRole('button', { name: title })).toBeVisible()
  release = null
  fail = true
  await page.evaluate(() => { const now = Date.now(); Date.now = () => now + 31_000; window.dispatchEvent(new Event('focus')) })
  await expect.poll(() => Boolean(release)).toBe(true)
  const response = page.waitForResponse((response) => response.status() === 403)
  release()
  await response
  await expect(page.getByRole('main').getByRole('button', { name: title })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('covers wait for decode, use responsive sizes, lazy loading and a broken-image fallback', async ({ page }) => {
  let releaseImage
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/__cms_mock__/data/query/**', (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    return route.fulfill({ json: { result: query.includes('$slug') ? publication
      : Array.from({ length: 20 }, (_, index) => ({ ...publication, _id: `pub-${index}`, id: `pub-${index}`, title: `Publication ${index}` })) } })
  })
  await page.route('**/__cms_mock__/images/**', async (route) => {
    await new Promise((resolve) => { releaseImage = resolve })
    await route.fulfill({ contentType: 'image/svg+xml', body: svg })
  })
  await page.goto('/#/publications')
  const image = page.locator('.publication-card img').first()
  await expect(image).toHaveAttribute('data-image-status', 'loading')
  await expect(image).toHaveAttribute('srcset', /400w/)
  await expect(image).toHaveAttribute('loading', 'eager')
  await expect(page.locator('.publication-card img').last()).toHaveAttribute('loading', 'lazy')
  await expect.poll(() => Boolean(releaseImage)).toBe(true)
  releaseImage()
  await expect(image).toHaveAttribute('data-image-status', 'ready')
  await expect(image).toHaveCSS('opacity', '1')
  await page.unroute('**/__cms_mock__/images/**')
  await page.route('**/__cms_mock__/images/**', (route) => route.fulfill({ status: 404, body: '' }))
  await page.goto('/#/publications/one')
  await expect(page.getByText('Cover unavailable')).toBeVisible()
})
