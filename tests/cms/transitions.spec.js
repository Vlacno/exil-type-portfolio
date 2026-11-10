import { test, expect } from '../fixtures'

const about = { _id: 'aboutPage', sections: [{ _key: 'intro', title: 'Project introduction', body: [{
  _key: 'body', _type: 'block', style: 'normal', markDefs: [],
  children: [{ _key: 'text', _type: 'span', text: 'Existing page content. '.repeat(500), marks: [] }],
}] }] }
const publications = [{ _id: 'one', id: 'one', title: 'New publication', cover: { asset: null } }]

async function initialAbout(page, publicationHandler) {
  await page.route('**/__cms_mock__/data/query/**', (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    if (query.includes('_type == "publication"')) return publicationHandler(route)
    if (query.includes('_type == "typeface"')) return route.fulfill({ json: { result: [{ _id: 'font', slug: 'cms-font', fontKey: 'unbounded', name: 'New typeface' }] } })
    return route.fulfill({ json: { result: about } })
  })
  await page.goto('/#/about')
  await expect(page.getByRole('button', { name: 'Project introduction' })).toBeVisible()
}

for (const path of ['/research', '/publications', '/typefaces', '/about', '/research/one', '/publications/one', '/typefaces/one']) {
  test(`direct visit shows an accessible responsive skeleton, not an empty page: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    let release
    await page.route('**/__cms_mock__/data/query/**', async (route) => {
      await new Promise((resolve) => { release = resolve })
      await route.fulfill({ json: { result: null } })
    })
    await page.goto(`/#${path}`)
    const skeleton = page.locator('.content-skeleton')
    await expect(skeleton).toBeVisible()
    await expect(skeleton).toHaveAttribute('role', 'status')
    await expect(skeleton).toHaveAttribute('data-scroll-pending', 'true')
    expect(await skeleton.evaluate((element) => element.clientHeight)).toBeGreaterThan(200)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect.poll(() => Boolean(release)).toBe(true)
    release()
    await expect(skeleton).toHaveCount(0)
  })
}

test('navigation keeps the previous page and its scroll until ready; Back restores it', async ({ page }) => {
  let release
  await initialAbout(page, async (route) => {
    await new Promise((resolve) => { release = resolve })
    await route.fulfill({ json: { result: publications } })
  })
  await page.evaluate(() => window.scrollTo(0, 700))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(700)
  await page.locator('.header__nav a[href="#/publications"]').evaluate((link) => link.click())
  await expect(page.getByRole('status', { name: 'Loading page' })).toHaveCount(1)
  await expect(page.locator('.site__content')).toHaveAttribute('aria-busy', 'true')
  await expect(page.locator('.about-page')).toBeVisible()
  await expect(page.locator('.content-skeleton')).toHaveCount(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(700)
  await expect.poll(() => Boolean(release)).toBe(true)
  release()
  await expect(page.getByRole('link', { name: 'New publication', exact: true })).toBeVisible()
  await expect(page.locator('.about-page')).toHaveCount(0)
  await expect(page.locator('.site__content')).toHaveAttribute('aria-busy', 'false')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.goBack()
  await expect(page.locator('.about-page')).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(700)
})

test('rapid navigation ignores a late response for the cancelled destination', async ({ page }) => {
  let release
  await initialAbout(page, async (route) => {
    await new Promise((resolve) => { release = resolve })
    await route.fulfill({ json: { result: publications } })
  })
  await page.locator('.header__nav a[href="#/publications"]').evaluate((link) => link.click())
  await expect.poll(() => Boolean(release)).toBe(true)
  await page.locator('.header__nav a[href="#/typefaces"]').evaluate((link) => link.click())
  await expect(page.locator('.typefaces-page-card')).toHaveCount(1)
  const response = page.waitForResponse((response) => response.url().includes('/__cms_mock__/') && response.url().includes('publication'))
  release()
  await response
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.locator('.typefaces-page-card')).toHaveCount(1)
  await expect(page).toHaveURL(/#\/typefaces$/)
  await expect(page.locator('.publication-card')).toHaveCount(0)
})

test('Back while pending cancels the transition and Forward can use its completed cache', async ({ page }) => {
  let release
  await initialAbout(page, async (route) => {
    await new Promise((resolve) => { release = resolve })
    await route.fulfill({ json: { result: publications } })
  })
  await page.locator('.header__nav a[href="#/publications"]').evaluate((link) => link.click())
  await expect.poll(() => Boolean(release)).toBe(true)
  await page.goBack()
  await expect(page.locator('.site__content')).toHaveAttribute('aria-busy', 'false')
  const response = page.waitForResponse((response) => response.url().includes('/__cms_mock__/') && response.url().includes('publication'))
  release()
  await response
  await expect(page.locator('.about-page')).toBeVisible()
  await expect(page).toHaveURL(/#\/about$/)
  await page.goForward()
  await expect(page.locator('.publication-card')).toHaveCount(1)
  await expect(page.locator('.content-skeleton')).toHaveCount(0)
})

test('a failed transition displays the destination error once and Retry still works', async ({ page }) => {
  let catalogueRequests = 0
  let detailRequests = 0
  let releaseRetry
  await initialAbout(page, async (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    // A card can appear under the cursor after Retry and trigger a legitimate
    // detail prefetch. It is not another attempt to load the catalogue.
    if (query.includes('$slug')) {
      detailRequests += 1
      return route.fulfill({ json: { result: publications[0] } })
    }
    catalogueRequests += 1
    if (catalogueRequests === 1) return route.fulfill({ status: 403, json: { error: 'Forbidden' } })
    await new Promise((resolve) => { releaseRetry = resolve })
    return route.fulfill({ json: { result: publications } })
  })
  await page.locator('.header__nav a[href="#/publications"]').evaluate((link) => link.click())
  await expect(page.getByRole('alert')).toContainText('Publications could not be loaded')
  await expect(page.locator('.about-page')).toHaveCount(0)
  expect(catalogueRequests).toBe(1)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect.poll(() => Boolean(releaseRetry)).toBe(true)
  expect(catalogueRequests).toBe(2)
  // Revalidation while Retry is in flight must share that same request.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  releaseRetry()
  await expect(page.locator('.publication-card')).toHaveCount(1)
  expect(catalogueRequests).toBe(2)

  // Exercise the CI race explicitly, even if the cursor did not land on the
  // new card automatically. Opening it must reuse the prefetched detail.
  const card = page.getByRole('link', { name: 'New publication', exact: true })
  await card.hover()
  await expect.poll(() => detailRequests).toBe(1)
  await card.click()
  await expect(page.getByRole('heading', { name: 'New publication', exact: true })).toBeVisible()
  expect(catalogueRequests).toBe(2)
  expect(detailRequests).toBe(1)
})
