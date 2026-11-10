import { test, expect } from '../fixtures'

const card = { _id: 'cms-article', id: 'cms-article', title: 'A title from Sanity', summary: 'A summary from Sanity', font: 'source-serif-4' }
const article = {
  ...card,
  credits: 'CMS author', copyright: 'CMS copyright',
  sources: [{ _key: 'source', citation: 'CMS source', url: 'https://example.com/source' }],
  body: [
    { _key: 'heading', _type: 'block', style: 'h2', children: [{ _key: 'h', _type: 'span', text: 'CMS subheading', marks: [] }], markDefs: [] },
    { _key: 'paragraph', _type: 'block', style: 'normal', children: [{ _key: 'p', _type: 'span', text: 'Real CMS article body', marks: [] }], markDefs: [] },
    { _key: 'unsafe', _type: 'block', style: 'normal', children: [{ _key: 's', _type: 'span', text: 'Unsafe link text', marks: ['link'] }], markDefs: [{ _key: 'link', _type: 'link', href: 'javascript:alert(1)' }] },
    { _key: 'image', _type: 'researchImage', alt: 'Archive from CMS', caption: 'CMS caption', image: { asset: { _id: 'image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-800x600-jpg' } } },
  ],
}

async function mockSanity(page, result) {
  await page.route('**/__cms_mock__/data/query/**', (route) => route.fulfill({ json: { result } }))
}

test('home reuses the first two catalogue articles without homepage CMS settings', async ({ page }) => {
  const second = { ...card, _id: 'second', id: 'second', title: 'Second catalogue article' }
  const third = { ...card, _id: 'third', id: 'third', title: 'Third catalogue article' }
  await page.route('**/__cms_mock__/data/query/**', (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    expect(query).not.toContain('homePage')
    return route.fulfill({ json: { result: { articles: [card, second, third], featured: [third] } } })
  })
  await page.goto('/#/research')
  await expect(page.getByRole('heading', { name: card.title })).toBeVisible()
  await expect(page.locator('.research-page-card').first().getByText(card.summary)).toBeVisible()
  await page.goto('/')
  await expect(page.locator('.research-card')).toHaveCount(2)
  await expect(page.getByRole('heading', { name: card.title })).toBeVisible()
  await expect(page.getByRole('heading', { name: second.title })).toBeVisible()
  await expect(page.getByRole('heading', { name: third.title })).toHaveCount(0)
})

test('article renders Portable Text, credits, image, and safe links', async ({ page }) => {
  await page.route('**/__cms_mock__/images/**', (route) => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>',
  }))
  await mockSanity(page, article)
  await page.goto('/#/research/cms-article')
  await expect(page.getByRole('heading', { name: card.title })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CMS subheading' })).toBeVisible()
  await expect(page.getByText('Real CMS article body')).toBeVisible()
  await expect(page.getByText('CMS author')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Archive from CMS' })).toHaveAttribute('src', /\/__cms_mock__\/images\//)
  await expect(page.getByRole('link', { name: 'Unsafe link text' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Source', exact: true })).toHaveAttribute('href', 'https://example.com/source')
})

test('unknown CMS slug does not show a fallback article', async ({ page }) => {
  await mockSanity(page, null)
  await page.goto('/#/research/missing')
  await expect(page.getByRole('heading', { name: 'Article not found' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Typography in Emigrant publications' })).toHaveCount(0)
})

for (const width of [1280, 360]) {
  test(`trailing empty paragraphs do not add space before sources at ${width}px`, async ({ page }) => {
    const empty = (key, text = '') => ({ _key: key, _type: 'block', style: 'normal', children: [{ _key: `${key}-span`, _type: 'span', text, marks: [] }], markDefs: [] })
    await page.setViewportSize({ width, height: 900 })
    await page.route('**/__cms_mock__/images/**', (route) => route.fulfill({
      contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>',
    }))
    await mockSanity(page, {
      ...article,
      body: [...article.body.slice(0, 2), empty('middle'), ...article.body.slice(2), empty('tail'), empty('whitespace-tail', ' \n\u00a0')],
    })
    await page.goto('/#/research/cms-article')
    const richText = page.locator('.research-article__rich-text')
    await expect(richText.locator(':scope > :last-child')).toHaveJSProperty('tagName', 'FIGURE')
    // The empty paragraph inside the article is deliberately preserved.
    await expect(richText.locator(':scope > .research-article__paragraph')).toHaveCount(3)
    const gap = await page.locator('.research-article__sources').evaluate((sources) => {
      const figure = sources.previousElementSibling.lastElementChild
      return sources.getBoundingClientRect().top - figure.getBoundingClientRect().bottom
    })
    expect(gap).toBeCloseTo(65, 0)
    await expect(page.getByText('CMS caption', { exact: true })).toBeVisible()
  })
}

test('empty CMS catalogue has an empty state', async ({ page }) => {
  await mockSanity(page, { articles: [], featured: [] })
  await page.goto('/#/research')
  await expect(page.getByText('No research articles have been published yet.')).toBeVisible()
})

test('loading and errors are visible and can be retried', async ({ page }) => {
  let fail = true
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    await route.fulfill(fail ? { status: 403, json: { error: 'Forbidden' } } : { json: { result: { articles: [card], featured: [] } } })
  })
  await page.goto('/#/research')
  await expect(page.getByRole('status')).toContainText('Loading research')
  await expect(page.getByRole('alert')).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: card.title })).toBeVisible()
})

test('back restores catalogue scroll immediately from cache', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 650 })
  let releaseCatalogue
  let delayCatalogue = false
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    if (query.includes('"articles"')) {
      if (delayCatalogue) await new Promise((resolve) => { releaseCatalogue = resolve })
      return route.fulfill({ json: { result: { articles: Array.from({ length: 12 }, (_, index) => ({ ...card, _id: `record-${index}`, id: `article-${index}` })), featured: [] } } })
    }
    return route.fulfill({ json: { result: article } })
  })
  await page.goto('/#/research')
  await expect(page.locator('.research-page-card')).toHaveCount(12)
  await page.evaluate(() => window.scrollTo(0, 700))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(700)
  await page.locator('.research-page-card').first().evaluate((link) => link.click())
  await expect(page.getByText('Real CMS article body')).toBeVisible()
  delayCatalogue = true
  await page.goBack()
  await expect(page.getByRole('status')).toHaveCount(0)
  expect(releaseCatalogue).toBeUndefined()
  await expect(page.locator('.research-page-card')).toHaveCount(12)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(700, 0)
})

test('background refresh preserves cached content and does not undo manual scroll', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 650 })
  let releaseCatalogue
  let delayCatalogue = false
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    if (query.includes('"articles"')) {
      if (delayCatalogue) await new Promise((resolve) => { releaseCatalogue = resolve })
      return route.fulfill({ json: { result: { articles: Array.from({ length: 12 }, (_, index) => ({ ...card, _id: `record-${index}`, id: `article-${index}` })), featured: [] } } })
    }
    return route.fulfill({ json: { result: article } })
  })
  await page.goto('/#/research')
  await expect(page.locator('.research-page-card')).toHaveCount(12)
  await page.evaluate(() => window.scrollTo(0, 700))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(700)
  await page.locator('.research-page-card').first().evaluate((link) => link.click())
  await expect(page.getByText('Real CMS article body')).toBeVisible()
  delayCatalogue = true
  await page.evaluate(() => { const now = Date.now(); Date.now = () => now + 31_000 })
  await page.goBack()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(700, 0)
  await page.mouse.wheel(0, -200)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(650)
  const scroll = await page.evaluate(() => window.scrollY)
  await expect.poll(() => Boolean(releaseCatalogue)).toBe(true)
  releaseCatalogue()
  await expect(page.locator('.research-page-card')).toHaveCount(12)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, 0)
})
