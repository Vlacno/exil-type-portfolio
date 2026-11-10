import { test, expect } from '../fixtures'

const paragraph = (text) => ({ _type: 'block', _key: text, style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 'text', text, marks: [] }] })
const article = { _id: 'article', id: 'article', font: 'unbounded', title: 'Font-aware research', summary: 'Research summary', body: [paragraph('Research body')] }
const publication = { _id: 'pub', id: 'pub', title: 'Font-aware publication', description: [paragraph('Publication body')] }
const typeface = { _id: 'font', slug: 'font', fontKey: 'unbounded', name: 'Unbounded', body: [paragraph('Typeface body')], testerMode: 'custom', testerBlocks: [{ _key: 'one', text: 'Tester specimen', desktop: { style: 'Bold', autoFit: true } }] }
const about = { sections: [{ _key: 'one', title: 'Introduction', body: [paragraph('About body')] }, { _key: 'two', title: 'Contact', body: [paragraph('Contact body')] }] }

async function mock(page) {
  // A cold CMS response can arrive after the initial font-ready promise.
  await page.addInitScript(() => {
    const subscribe = document.fonts.addEventListener.bind(document.fonts)
    document.fonts.addEventListener = (type, ...args) => { if (type !== 'loadingdone') subscribe(type, ...args) }
  })
  await page.route('**/__cms_mock__/data/query/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    const query = new URL(route.request().url()).searchParams.get('query') || ''
    const detail = query.includes('$slug')
    const result = query.includes('_type == "researchArticle"') ? detail ? article : { articles: [article] }
      : query.includes('_type == "publication"') ? detail ? publication : [publication]
        : query.includes('_type == "typeface"') ? detail ? typeface : [typeface] : about
    await route.fulfill({ json: { result } })
  })
}

const cases = [
  { path: '/research', font: '*Unbounded-Variable*', blocks: ['.research-page-card'], ready: [] },
  { path: '/research/article', font: '*Unbounded-Variable*', blocks: ['.research-article__title'], ready: ['.research-article__body'] },
  { path: '/publications/pub', font: '*SourceSerif4-Variable*', blocks: ['.publication-detail__title', '.publication-detail__description'], ready: [] },
  { path: '/about', font: '*SourceSerif4-Variable*', blocks: ['.about-page__content:first-of-type'], ready: [] },
  { path: '/typefaces/font', font: '*Unbounded-Variable*', blocks: ['.typeface-detail__hero', '.type-tester'], ready: ['.typeface-detail__article'] },
  { path: '/', font: '*Unbounded-Variable*', blocks: ['.hero__title', '.hero__description', '.research-card'], ready: [] },
]

for (const { path, font, blocks, ready } of cases) {
  test(`blocks wait for actual faces without hiding the shell: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mock(page)
    let release
    let requested = false
    const gate = new Promise((resolve) => { release = resolve })
    await page.route(`**/${font}.woff2`, async (route) => { requested = true; await gate; await route.continue() })
    try {
      await page.goto(`/#${path}`, { waitUntil: 'domcontentloaded' })
      // The home header is intentionally hidden over the mobile hero by design.
      if (path !== '/') await expect(page.locator('.header')).toBeVisible()
      await expect(page.locator('#root')).toBeVisible()
      await expect.poll(() => requested).toBe(true)
      for (const selector of blocks) {
        const block = page.locator(selector).first()
        await expect(block).toHaveAttribute('data-font-state', 'pending')
        await expect(block).toBeHidden()
        await expect(block).toHaveAttribute('inert', '')
        expect((await block.boundingBox()).height).toBeGreaterThan(0)
      }
      for (const selector of ready) await expect(page.locator(selector)).toHaveAttribute('data-font-state', 'ready')
      for (const selector of blocks) await expect(page.locator(selector).first()).toHaveAttribute('data-font-state', 'pending')
      release()
      for (const selector of blocks) {
        const block = page.locator(selector).first()
        await expect(block).toHaveAttribute('data-font-state', 'ready')
        await expect(block).toBeVisible()
        await expect(block).not.toHaveAttribute('inert')
      }
      if (path === '/typefaces/font') {
        const sample = page.locator('.type-tester [contenteditable]')
        expect(await sample.evaluate((element) => {
          const range = document.createRange()
          range.selectNodeContents(element)
          return range.getBoundingClientRect().width <= element.clientWidth + 1
        })).toBe(true)
        await page.getByRole('button', { name: 'Reset', exact: true }).click()
      }
      if (path === '/about') {
        await page.getByRole('button', { name: 'Contact', exact: true }).click()
        await expect(page.getByText('Contact body')).toBeVisible()
      }
    } finally { release() }
  })
}

for (const fails of [false, true]) {
  test(`unavailable fonts do not leave Research permanently hidden (failure=${fails})`, async ({ page }) => {
    await mock(page)
    let release
    const gate = new Promise((resolve) => { release = resolve })
    await page.route('**/*Unbounded-Variable*.woff2', async (route) => {
      if (fails) return route.abort()
      await gate
      await route.continue()
    })
    try {
      await page.goto('/#/research', { waitUntil: 'domcontentloaded' })
      const card = page.locator('.research-page-card')
      await expect(card).toHaveAttribute('data-font-state', 'ready', { timeout: 6500 })
      await expect(card).not.toHaveAttribute('inert')
      await expect(card).toBeVisible()
      await page.getByRole('link', { name: /Font-aware research/ }).click()
      await expect(page.locator('.research-article__body')).toBeVisible()
    } finally { release() }
  })
}
