import { test, expect } from '../fixtures'
import { imageDimensions } from '../../src/data/imageDimensions.js'

const paragraph = (text) => ({ _type: 'block', _key: text, style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 'text', text, marks: [] }] })
const asset = { _id: 'image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-800x600-jpg' }
const photo = { _type: 'researchImage', _key: 'photo', alt: 'Archive photo', image: { asset, crop: { left: .25, right: 0, top: 0, bottom: 0 } } }
const about = { sections: [{ _key: 'intro', title: 'Project introduction', body: [paragraph('Before the photo'), photo, paragraph('After the photo')] }] }

test('image dimensions respect crop, metadata and asset references', () => {
  expect(imageDimensions(photo.image)).toEqual({ width: 600, height: 600 })
  expect(imageDimensions({ asset: { _ref: asset._id } })).toEqual({ width: 800, height: 600 })
  expect(imageDimensions({ asset: { metadata: { dimensions: { width: 1000, height: 500 } } } })).toEqual({ width: 1000, height: 500 })
  expect(imageDimensions({ asset: {} })).toBeUndefined()
})

test('returning home shows the local hero and ready sections without waiting for publications', async ({ page }) => {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    if (query.includes('_type == "publication"')) {
      await gate
      return route.fulfill({ json: { result: [] } })
    }
    if (query.includes('_type == "researchArticle"')) return route.fulfill({ json: { result: { articles: [] } } })
    if (query.includes('_type == "typeface"')) return route.fulfill({ json: { result: [{ _id: 'font', slug: 'unbounded', fontKey: 'unbounded', name: 'Unbounded' }] } })
    return route.fulfill({ json: { result: { sections: [{ ...about.sections[0], body: [paragraph('Before the photo')] }] } } })
  })
  try {
    await page.goto('/#/about')
    await expect(page.getByText('Before the photo')).toBeVisible()
    await page.locator('.header__logo').click()
    await expect(page.locator('.hero')).toBeVisible()
    await expect(page.locator('.publications .content-skeleton')).toBeAttached()
    await expect(page.locator('.typefaces .typefaces__grid')).toBeVisible()
    await expect(page.locator('.site__content')).toHaveAttribute('aria-busy', 'false')
    release()
    await expect(page.locator('.publications .content-skeleton')).toHaveCount(0)
  } finally { release() }
})

for (const fails of [false, true]) {
  test(`an article image reserves its cropped space without blocking text (failure=${fails})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    let release
    const gate = new Promise((resolve) => { release = resolve })
    await page.route('**/__cms_mock__/data/query/**', (route) => route.fulfill({ json: { result: about } }))
    await page.route('**/__cms_mock__/images/**', async (route) => {
      await gate
      if (fails) return route.abort()
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"/>' })
    })
    try {
      await page.goto('/#/about', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('After the photo')).toBeVisible()
      const slot = page.locator('.content-image')
      await expect(slot).toHaveAttribute('data-image-status', 'loading')
      const before = await slot.boundingBox()
      expect(before.height).toBeGreaterThan(200)
      expect(Math.abs(before.width - before.height)).toBeLessThan(1)
      release()
      await expect(slot).toHaveAttribute('data-image-status', fails ? 'error' : 'ready')
      const after = await slot.boundingBox()
      expect(Math.abs(before.height - after.height)).toBeLessThan(1)
      await expect(page.locator('.header')).toBeVisible()
      await expect(page.getByText('After the photo')).toBeVisible()
    } finally { release() }
  })
}
