import { test, expect } from '../fixtures'

const span = (text) => ({ _key: 'span', _type: 'span', text, marks: [] })
const typeface = {
  _id: 'cms-typeface', slug: 'my-source-serif-4', name: 'CMS Source Serif 4', fontKey: 'source-serif-4',
  body: [
    { _key: 'text', _type: 'block', style: 'normal', children: [span('A typeface story from CMS')], markDefs: [] },
    { _key: 'image', _type: 'typefaceImage', alt: 'CMS type specimen', caption: 'CMS image caption', image: { asset: { _id: 'image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-800x600-jpg' } } },
  ],
  samples: { displayPrimary: 'Sample', reading: 'CMS reading sample', twoColumn: 'CMS two column sample', displaySecondary: 'Another sample', threeColumn: 'CMS three column sample', cyrillic: 'Тест шрифта' },
  designer: 'CMS designer', releaseDate: '2026', version: '2.0', formats: 'WOFF2',
  openTypeFeatures: 'liga\nfrac', supportedLanguages: 'Ukrainian, English', trialInfo: 'Ask for a trial',
}

async function mockTypefaces(page, catalogue = [typeface], detail = typeface, delay = 0) {
  await page.route('**/__cms_mock__/images/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>' }))
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    const result = query.includes('_type == "typeface"') ? (query.includes('$slug') ? detail : catalogue) : { articles: [] }
    await route.fulfill({ json: { result } })
  })
}

test('async CMS cards keep technical fonts, custom slugs, and shared sizing', async ({ page }) => {
  await mockTypefaces(page, [typeface, { ...typeface, _id: 'second', slug: 'custom-unbounded', name: 'CMS Unbounded', fontKey: 'unbounded' }], typeface, 200)
  await page.goto('/#/typefaces')
  await expect(page.locator('.typefaces-page-card')).toHaveCount(2)
  await expect(page.locator('.typefaces-page__grid')).toHaveAttribute('style', /--typeface-sample-size/)
  await expect(page.getByText('CMS Source Serif 4 Regular', { exact: false })).toBeVisible()
  await page.locator('a[href="#/typefaces/my-source-serif-4"]').click()
  await expect(page.getByRole('heading', { name: 'CMS Source Serif 4', exact: true })).toBeVisible()
  await expect(page.getByText('A typeface story from CMS')).toBeVisible()
  await expect(page.getByText('Design: CMS designer')).toBeVisible()
  await expect(page.getByText('Number of fonts in a family: 8')).toBeVisible()
  const firstFactColumn = page.locator('.typeface-detail__facts > div').first()
  await expect(firstFactColumn.locator('p')).toHaveCount(2)
  await expect(firstFactColumn.locator('.typeface-detail__fact-row')).toHaveCount(4)
  await expect(firstFactColumn.locator('.typeface-detail__fact-row').first()).toHaveCSS('margin-bottom', '0px')
  await expect(page.getByText('CMS image caption')).toBeVisible()
  await page.getByRole('button', { name: 'Open CMS type specimen full screen' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const reading = page.locator('.type-tester--reading')
  await expect(reading.locator('[contenteditable]')).toHaveText('CMS reading sample')
  await reading.locator('[contenteditable]').fill('Visitor text')
  await reading.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(reading.locator('[contenteditable]')).toHaveText('CMS reading sample')
})

for (const [fontKey, count] of [['unbounded', 3], ['roboto-condensed-russo-one', 2], ['source-serif-4', 8], ['inter', 4], ['ruslan-display', 1]]) {
  test(`${fontKey} keeps all ${count} real styles in the CMS tester and overview`, async ({ page }) => {
    const record = { ...typeface, fontKey }
    await mockTypefaces(page, [record], record)
    await page.goto('/#/typefaces/my-source-serif-4')
    const tester = page.locator('.type-tester').first()
    await expect(tester.locator('select option')).toHaveCount(count)
    await expect(page.getByText(`Number of fonts in a family: ${count}`)).toBeVisible()
    if (count > 1) {
      await page.getByRole('button', { name: /^Character style:/ }).click()
      await expect(page.getByRole('listbox', { name: 'Character style' }).getByRole('option')).toHaveCount(count)
      await page.getByRole('listbox', { name: 'Character style' }).getByRole('option').last().click()
    }
    await expect(page.getByRole('img', { name: 'Selected character A', exact: true })).toBeVisible()
  })
}

test('paired CMS hero uses technical fontKey for both faces with a custom slug on desktop and mobile', async ({ page }) => {
  const record = { ...typeface, slug: 'custom-paired-font', name: 'Roboto Condensed / Russo One', fontKey: 'roboto-condensed-russo-one' }
  await mockTypefaces(page, [record], record)
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/typefaces/custom-paired-font')
    const hero = page.locator('.typeface-detail__hero')
    const heading = hero.getByRole('heading', { name: 'Roboto Condensed Russo One', exact: true })
    await expect(hero).toHaveAttribute('data-font-state', 'ready')
    await expect(heading).toBeVisible()
    await expect(heading).toHaveCSS('font-family', /Roboto Condensed/)
    await expect(heading).toHaveCSS('font-weight', '600')
    const secondFace = heading.getByText('Russo One', { exact: true })
    await expect(secondFace).toHaveCSS('font-family', /Russo One/)
    await expect(secondFace).toHaveCSS('font-weight', '400')
    await expect.poll(() => heading.locator(':scope > span').evaluate((element) => element.getBoundingClientRect().width <= element.closest('section').clientWidth + 2)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
})

test('homepage reuses published Unbounded and Source Serif 4 without CMS homepage settings', async ({ page }) => {
  await mockTypefaces(page, [typeface, { ...typeface, slug: 'other', name: 'CMS Inter', fontKey: 'inter' }])
  await page.goto('/')
  await expect(page.locator('.typeface-card')).toHaveCount(1)
  await expect(page.locator('.typeface-card')).toHaveAttribute('href', '#/typefaces/my-source-serif-4')
  await expect(page.locator('.typefaces__grid')).toHaveAttribute('style', /--typeface-sample-size/)
})

test('empty or invalid CMS data never exposes local typefaces or local article text', async ({ page }) => {
  await mockTypefaces(page, [{ ...typeface, fontKey: 'unknown-font' }], null)
  await page.goto('/#/typefaces')
  await expect(page.getByText('No typefaces have been published yet.')).toBeVisible()
  await expect(page.locator('.typefaces-page-card')).toHaveCount(0)
  await page.goto('/#/typefaces/source-serif-4')
  await expect(page.getByRole('heading', { name: 'Typeface not found' })).toBeVisible()
  await mockTypefaces(page, [typeface], { ...typeface, body: [], samples: null })
  await page.goto('/#/typefaces/my-source-serif-4')
  await expect(page.getByRole('heading', { name: 'CMS Source Serif 4', exact: true })).toBeVisible()
  await expect(page.locator('.typeface-detail__article')).toHaveCount(0)
  await expect(page.locator('.type-tester--reading [contenteditable]')).toHaveText('Type your text here')
})

test('CMS errors show a retry instead of local typefaces', async ({ page }) => {
  let fail = true
  await page.route('**/__cms_mock__/data/query/**', (route) => route.fulfill(fail ? { status: 403, json: { error: 'Forbidden' } } : { json: { result: [typeface] } }))
  await page.goto('/#/typefaces')
  await expect(page.getByRole('alert')).toContainText('Typefaces could not be loaded')
  await expect(page.locator('.typefaces-page-card')).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.typefaces-page-card')).toHaveCount(1)
})

test('CMS typeface content and specimens remain usable on mobile, with unsafe links inert', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const record = { ...typeface, body: [
    ...typeface.body,
    { _key: 'link', _type: 'block', style: 'normal', children: [{ ...span('Unsafe CMS link'), marks: ['unsafe'] }], markDefs: [{ _key: 'unsafe', _type: 'link', href: 'javascript:alert(1)' }] },
  ] }
  await mockTypefaces(page, [record], record)
  await page.goto('/#/typefaces/my-source-serif-4')
  await expect(page.getByRole('heading', { name: 'CMS Source Serif 4', exact: true })).toBeVisible()
  await expect(page.locator('.type-tester--reading [contenteditable]')).toHaveText('CMS reading sample')
  await expect(page.getByText('Unsafe CMS link')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Unsafe CMS link' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: /^Character style:/ }).click()
  await page.getByRole('option', { name: 'Black Italic', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Character style: Black Italic', exact: true })).toBeVisible()
})
