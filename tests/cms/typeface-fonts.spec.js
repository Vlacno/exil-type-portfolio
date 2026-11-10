import { test, expect } from '../fixtures'

const unbounded = { _id: 'unbounded', slug: 'unbounded', fontKey: 'unbounded', name: 'Unbounded' }

async function mockCatalogue(page) {
  // Reproduce Safari's missing loadingdone notifications in every browser.
  await page.addInitScript(() => {
    const subscribe = document.fonts.addEventListener.bind(document.fonts)
    document.fonts.addEventListener = (type, ...args) => {
      if (type !== 'loadingdone') subscribe(type, ...args)
    }
  })
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350))
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    return route.fulfill({ json: { result: query.includes('_type == "typeface"') ? [unbounded] : null } })
  })
}

async function expectFitted(page, grid = '.typefaces-page__grid') {
  await expect(page.locator(grid)).toBeVisible()
  await expect(page.locator(grid)).toHaveAttribute('style', /--typeface-sample-size/)
  await expect.poll(() => page.locator(`${grid} [data-typeface-sample]`).evaluateAll((rows) => rows.every((row) => {
    const range = document.createRange()
    range.selectNodeContents(row)
    return range.getBoundingClientRect().width <= row.parentElement.getBoundingClientRect().width + 1
  }))).toBe(true)
}

test('cold mobile CMS cards wait for all faces, fit after load and stay fitted after reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockCatalogue(page)
  let release
  const gate = new Promise((resolve) => { release = resolve })
  await page.route('**/*Unbounded*.woff2', async (route) => {
    await gate
    const response = await route.fetch()
    await route.fulfill({ response, headers: { ...response.headers(), 'cache-control': 'no-store' } })
  })
  try {
    await page.goto('/#/typefaces', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.typefaces-page-card')).toHaveCount(1)
    await expect(page.locator('.content-skeleton')).toBeVisible()
    await expect(page.locator('.typefaces-page__grid')).toBeHidden()
    await expect(page.locator('.typefaces-page__grid')).toHaveAttribute('inert', '')
    release()
    await expectFitted(page)
    await expect(page.locator('.content-skeleton')).toHaveCount(0)
    expect(await page.evaluate(() => [300, 400, 700].every((weight) => document.fonts.check(`${weight} 20px Unbounded`)))).toBe(true)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expectFitted(page)
    await expect(page.locator('.content-skeleton')).toHaveCount(0)
    await page.setViewportSize({ width: 320, height: 844 })
    await expectFitted(page)
  } finally { release() }
})

test('failed fonts reveal fitted fallback cards rather than leaving a permanent skeleton', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockCatalogue(page)
  await page.route('**/*Unbounded*.woff2', (route) => route.abort())
  await page.goto('/#/typefaces', { waitUntil: 'domcontentloaded' })
  await expectFitted(page)
  await expect(page.locator('.content-skeleton')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Typeface name Unbounded/ })).toBeVisible()
})

test('font timeout reveals fallback, then late faces refit even without loadingdone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockCatalogue(page)
  let release
  const gate = new Promise((resolve) => { release = resolve })
  await page.route('**/*Unbounded*.woff2', async (route) => { await gate; await route.continue() })
  try {
    await page.goto('/#/typefaces', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.content-skeleton')).toBeVisible()
    await expect(page.locator('.typefaces-page__grid')).toBeVisible({ timeout: 7000 })
    await expectFitted(page)
    const fallbackSize = await page.locator('.typefaces-page__grid').evaluate((grid) => grid.style.getPropertyValue('--typeface-sample-size'))
    release()
    await expect.poll(() => page.evaluate(() => [300, 400, 700].every((weight) => document.fonts.check(`${weight} 20px Unbounded`)))).toBe(true)
    await expect.poll(() => page.locator('.typefaces-page__grid').evaluate((grid) => grid.style.getPropertyValue('--typeface-sample-size'))).not.toBe(fallbackSize)
    await expectFitted(page)
  } finally { release() }
})

test('homepage typeface preview uses the same font preparation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockCatalogue(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expectFitted(page, '.typefaces__grid')
  await expect(page.locator('.typefaces .content-skeleton')).toHaveCount(0)
})
