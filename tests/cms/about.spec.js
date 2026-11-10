import { test, expect } from '../fixtures'

const paragraph = (text) => ({ _type: 'block', _key: 'paragraph', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 'text', text, marks: [] }] })
const about = { _id: 'aboutPage', sections: [
  { _key: 'intro', title: 'CMS intro', body: [paragraph('Introduction from Sanity')] },
  { _key: 'contact', title: 'CMS contact', body: [paragraph('Write to us')], email: 'editor@example.com' },
] }

async function mockAbout(page, result = about) {
  await page.route('**/__cms_mock__/data/query/**', (route) => route.fulfill({ json: { result } }))
}

test('CMS sections keep order, open only the first and toggle independently', async ({ page }) => {
  await mockAbout(page, { ...about, sections: [...about.sections].reverse() })
  await page.goto('/#/about')
  const main = page.getByRole('main')
  await expect(main.locator('.about-page__trigger').first()).toHaveText('CMS contact')
  await expect(main.getByRole('button', { name: 'CMS contact', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await expect(main.getByRole('button', { name: 'CMS intro', exact: true })).toHaveAttribute('aria-expanded', 'false')
  await expect(main.getByRole('link', { name: 'editor@example.com' })).toHaveAttribute('href', 'mailto:editor@example.com')
  await main.getByRole('button', { name: 'CMS intro', exact: true }).press('Enter')
  await expect(main.locator('button[aria-expanded="true"]')).toHaveCount(2)
  await expect(main.getByText('Introduction from Sanity')).toBeVisible()
  await main.getByRole('button', { name: 'CMS contact', exact: true }).click()
  await expect(main.locator('button[aria-expanded="true"]')).toHaveCount(1)
  await page.reload()
  await expect(main.locator('button[aria-expanded="true"]')).toHaveCount(1)
  await expect(main.locator('.about-page__trigger').first()).toHaveAttribute('aria-expanded', 'true')
})

test('rich text, images, captions, safe links and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const text = paragraph('Unsafe link')
  text.children[0].marks = ['unsafe']
  text.markDefs = [{ _key: 'unsafe', _type: 'link', href: 'javascript:alert(1)' }]
  const safe = paragraph('Website')
  safe._key = 'safe'
  safe.children[0].marks = ['safe']
  safe.markDefs = [{ _key: 'safe', _type: 'link', href: 'https://example.com' }]
  await mockAbout(page, { sections: [{ _key: 'only', title: 'Gallery', body: [text, safe, {
    _type: 'researchImage', _key: 'photo', alt: 'Archive photo', caption: 'Photo caption',
    image: { asset: { _id: 'image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-800x600-jpg', metadata: { dimensions: { width: 800, height: 600 } } } },
  }, paragraph('   ')] }] })
  await page.route('**/__cms_mock__/images/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>' }))
  await page.goto('/#/about')
  await expect(page.getByText('Unsafe link')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Unsafe link' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Website' })).toHaveAttribute('href', 'https://example.com')
  await expect(page.locator('.about-page__content > p')).toHaveCount(2)
  await expect(page.getByText('Photo caption')).toBeVisible()
  await page.getByRole('button', { name: 'Open Archive photo full screen' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

for (const result of [null, { sections: [] }]) {
  test(`unpublished or empty About never reveals local content (${JSON.stringify(result)})`, async ({ page }) => {
    await mockAbout(page, result)
    await page.goto('/#/about')
    await expect(page.getByText('No About content has been published yet.')).toBeVisible()
    await expect(page.locator('.about-page__trigger')).toHaveCount(0)
    await expect(page.getByText('This project is a PhD research project', { exact: false })).toHaveCount(0)
  })
}

test('loading and request failure support retry without local fallback', async ({ page }) => {
  let fail = true
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    await route.fulfill(fail ? { status: 403, json: { error: 'Forbidden' } } : { json: { result: about } })
  })
  await page.goto('/#/about')
  await expect(page.getByRole('status')).toHaveAttribute('data-scroll-pending', 'true')
  await expect(page.getByRole('alert')).toContainText('About could not be loaded')
  await expect(page.locator('.about-page__trigger')).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Introduction from Sanity')).toBeVisible()
})
