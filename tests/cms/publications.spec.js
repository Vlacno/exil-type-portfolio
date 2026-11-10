import { test, expect } from '../fixtures'

const cover = { alt: 'Cover from Sanity', asset: { _id: 'image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-800x1200-jpg' } }
const publication = {
  _id: 'publication-one', id: 'cms-publication', title: 'CMS publication', place: 'Prague',
  year: '1931', language: 'Ukrainian', cover,
  description: [{ _key: 'paragraph', _type: 'block', style: 'normal', children: [
    { _key: 'text', _type: 'span', text: 'Description from CMS', marks: [] },
    { _key: 'link', _type: 'span', text: 'Unsafe link', marks: ['unsafe'] },
  ], markDefs: [{ _key: 'unsafe', _type: 'link', href: 'javascript:alert(1)' }] }],
}

async function mockPublications(page, catalogue = [publication], detail = publication) {
  await page.route('**/__cms_mock__/images/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"/>' }))
  await page.route('**/__cms_mock__/data/query/**', (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    const result = query.includes('_type == "publication"') ? (query.includes('$slug') ? detail : catalogue) : { articles: [] }
    return route.fulfill({ json: { result } })
  })
}

test('CMS catalogue drives covers, place/year filters, and detail navigation', async ({ page }) => {
  const second = { ...publication, _id: 'two', id: 'second', title: 'Second CMS publication', place: 'Paris', year: '1925' }
  await mockPublications(page, [publication, second])
  await page.goto('/#/publications')
  await expect(page.locator('.publication-card')).toHaveCount(2)
  await expect(page.locator('.publication-card img').first()).toHaveAttribute('src', /\/__cms_mock__\/images\//)
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await page.getByRole('option', { name: 'Prague', exact: true }).click()
  await expect(page.locator('.publication-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Year', exact: true }).click()
  await page.getByRole('option', { name: '1925', exact: true }).click()
  await expect(page.getByText('No publications match these filters.')).toBeVisible()
  await page.getByRole('button', { name: '1925', exact: true }).click()
  await page.getByRole('option', { name: 'All', exact: true }).click()
  await page.getByRole('link', { name: publication.title, exact: true }).click()
  await expect(page.getByRole('heading', { name: publication.title })).toBeVisible()
  await expect(page.getByText('Description from CMS', { exact: false })).toBeVisible()
  await expect(page.getByText('Ukrainian', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Unsafe link' })).toHaveCount(0)
  await page.getByRole('button', { name: `Open ${publication.title} full screen` }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('homepage uses the first 12 CMS publications, not local covers', async ({ page }) => {
  await mockPublications(page, Array.from({ length: 14 }, (_, i) => ({ ...publication, _id: `record-${i}`, id: `publication-${i}`, title: `Publication ${i}` })))
  await page.goto('/')
  await expect(page.locator('.pub-thumb')).toHaveCount(12)
  await expect(page.locator('.pub-thumb').first()).toHaveAttribute('href', '#/publications/publication-0')
  await expect(page.locator('.pub-thumb').last()).toHaveAttribute('href', '#/publications/publication-11')
})

test('empty CMS catalogue and unknown slug never show local publications', async ({ page }) => {
  await mockPublications(page, [], null)
  await page.goto('/#/publications')
  await expect(page.getByText('No publications have been published yet.')).toBeVisible()
  await expect(page.locator('.publication-card')).toHaveCount(0)
  await page.goto('/#/publications/satirikon')
  await expect(page.getByRole('heading', { name: 'Publication not found' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Satirikon', exact: true })).toHaveCount(0)
})

test('catalogue errors can be retried without revealing local content', async ({ page }) => {
  await mockPublications(page)
  let fail = true
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    await route.fulfill(fail ? { status: 403, json: { error: 'Forbidden' } } : { json: { result: [publication] } })
  })
  await page.goto('/#/publications')
  await expect(page.getByRole('alert')).toContainText('Publications could not be loaded')
  await expect(page.locator('.publication-card')).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('link', { name: publication.title, exact: true })).toBeVisible()
})

test('detail handles missing optional fields and broken cover references', async ({ page }) => {
  await mockPublications(page, [], { ...publication, cover: { asset: null }, description: null, place: null, year: null, language: null })
  await page.goto('/#/publications/cms-publication')
  await expect(page.getByRole('heading', { name: publication.title })).toBeVisible()
  await expect(page.getByText('Cover unavailable')).toBeVisible()
  await expect(page.getByRole('button', { name: `Open ${publication.title} full screen` })).toBeDisabled()
})

test('long CMS titles and metadata fit a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  const title = 'An exceptionally long publication title '.repeat(5)
  await mockPublications(page, [], { ...publication, title, place: 'A very long place of publication', year: '1931–1933', language: 'Ukrainian and Russian' })
  await page.goto('/#/publications/cms-publication')
  await expect(page.getByRole('heading', { name: title.trim() })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
