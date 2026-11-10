import { test, expect } from '../fixtures'
import { glyphFontData } from '../../src/data/glyphCoverageData'

const specimen = 'Typography ÉMIGRÉ АБВГД абвгд Ґґ Єє Іі Її Ўў'
const faces = [
  ['Source Serif 4', 400, 'normal'], ['Source Serif 4', 500, 'italic'],
  ['Source Serif 4', 700, 'italic'], ['Source Serif 4', 900, 'normal'],
  ['Inter', 400, 'normal'], ['Inter', 700, 'italic'],
  ['Unbounded', 300, 'normal'], ['Unbounded', 400, 'normal'], ['Unbounded', 700, 'normal'],
  ['Roboto Condensed', 600, 'normal'], ['Russo One', 400, 'normal'], ['Ruslan Display', 400, 'normal'],
]

test('all six local fonts render Latin and Cyrillic without external font requests', async ({ page }) => {
  const requests = []
  page.on('request', (request) => {
    if (request.resourceType() === 'font') requests.push(request.url())
  })
  await page.goto('/')
  const loaded = await page.evaluate(async ({ faces, specimen }) => {
    return Promise.all(faces.map(async ([family, weight, style]) => {
      const matches = await document.fonts.load(`${style} ${weight} 32px "${family}"`, specimen)
      return matches.length > 0 && matches.every((face) => face.status === 'loaded')
    }))
  }, { faces, specimen })
  expect(loaded.every(Boolean)).toBe(true)
  expect(requests.length).toBeGreaterThanOrEqual(8)
  expect(requests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true)
  for (const styles of Object.values(glyphFontData)) {
    for (const { codePoints } of Object.values(styles)) {
      for (const character of specimen.replace(/\s/g, '')) {
        expect(codePoints).toContain(character.codePointAt(0))
      }
    }
  }
})

test('font licenses are included in the locally served site', async ({ page }) => {
  for (const family of ['source-serif-4', 'inter', 'unbounded', 'roboto-condensed', 'russo-one', 'ruslan-display']) {
    const response = await page.request.get(`/licenses/fonts/${family}/OFL.txt`)
    expect(response.ok()).toBe(true)
    expect(await response.text()).toContain('SIL OPEN FONT LICENSE Version 1.1')
  }
})

test('catalogue and all font specimens fit desktop and narrow mobile screens', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The viewport matrix is checked once; font rendering is checked in every browser.')
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['typefaces', ...['unbounded', 'source-serif-4', 'roboto-condensed-russo-one', 'ruslan-display', 'inter'].map((id) => `typefaces/${id}`)]) {
      await page.goto(`/#/${route}`)
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('.site__content')).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1)
      if (route === 'typefaces') {
        await expect(page.locator('.typeface-preparation')).toHaveAttribute('aria-busy', 'false')
        const fits = await page.locator('[data-typeface-sample]').evaluateAll((rows) => rows.every((row) => {
          const range = document.createRange()
          range.selectNodeContents(row)
          return range.getBoundingClientRect().width <= row.parentElement.clientWidth + 2
        }))
        expect(fits).toBe(true)
      }
    }
  }
})
