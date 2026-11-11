import { test, expect } from '../fixtures'

const paired = { _id: 'paired-hero', slug: 'custom-paired-font', name: 'Roboto Condensed / Russo One', fontKey: 'roboto-condensed-russo-one', body: [], testerMode: 'custom', testerBlocks: [] }

async function mockPaired(page) {
  await page.route('**/__cms_mock__/data/query/**', (route) => route.fulfill({ json: { result: paired } }))
}

async function expectHeroFits(page) {
  const hero = page.locator('.typeface-detail__hero')
  await expect(hero).toHaveAttribute('data-font-state', 'ready')
  await expect.poll(() => hero.locator('h1 > span').evaluate((element) => element.getBoundingClientRect().width - element.closest('section').clientWidth)).toBeLessThanOrEqual(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

test('paired hero verifies the rendered fit when font sizes are quantized', async ({ page }) => {
  await mockPaired(page)
  expect(await page.evaluate(() => CSS.supports('font-size', 'round(up, 1em, 1px)'))).toBe(true)
  for (const width of [1440, 390, 320, 768]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/typefaces/custom-paired-font')
    await expect(page.locator('.typeface-detail__hero')).toHaveAttribute('data-font-state', 'ready')
    await page.evaluate(() => Promise.all([
      document.fonts.load('600 20px "Roboto Condensed"'),
      document.fonts.load('400 20px "Russo One"'),
    ]))
    // Model non-linear rendered metrics deterministically on every platform.
    // A one-pass width ratio cannot account for whole-pixel size quantization.
    await page.addStyleTag({ content: '.typeface-detail__hero-line { font-size: round(up, var(--hero-fitted-size, 1em), 1px); }' })
    await page.evaluate(() => window.dispatchEvent(new Event('resize')))
    await expectHeroFits(page)
  }
})

for (const [file, face] of [['RobotoCondensed-Variable', '600 20px "Roboto Condensed"'], ['RussoOne-Regular', '400 20px "Russo One"']]) {
  test(`paired hero refits after a late ${file} font and responsive resizes`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await mockPaired(page)
    await page.addInitScript(() => {
      const subscribe = document.fonts.addEventListener.bind(document.fonts)
      document.fonts.addEventListener = (type, ...args) => { if (type !== 'loadingdone') subscribe(type, ...args) }
    })
    let release
    const gate = new Promise((resolve) => { release = resolve })
    await page.route(`**/*${file}*.woff2`, async (route) => { await gate; await route.continue() })
    try {
      await page.goto('/#/typefaces/custom-paired-font', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('.typeface-detail__hero')).toHaveAttribute('data-font-state', 'pending')
      // Retain usable fallback text after the existing four-second timeout.
      await expect(page.locator('.typeface-detail__hero')).toHaveAttribute('data-font-state', 'ready', { timeout: 7000 })
      await expectHeroFits(page)
      release()
      await expect.poll(() => page.evaluate((font) => document.fonts.check(font), face)).toBe(true)
      await expectHeroFits(page)
      for (const width of [1440, 390, 320, 768]) {
        await page.setViewportSize({ width, height: 900 })
        await expectHeroFits(page)
      }
    } finally { release() }
  })
}
