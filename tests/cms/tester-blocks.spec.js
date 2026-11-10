import { test, expect } from '../fixtures'

const block = {
  _key: 'first', text: 'Desktop specimen text', mobileText: 'Mobile specimen text',
  desktop: { fontKey: 'inter', style: 'Bold Italic', fontSize: 80, lineHeight: 1.25, letterSpacing: 0.03, align: 'center', columns: 2 },
  mobile: { fontKey: 'unbounded', style: 'Light', fontSize: 32, lineHeight: 1.4, letterSpacing: -0.02, align: 'left', columns: 1 },
}
const record = { _id: 'custom-testers', slug: 'custom', name: 'CMS Source Serif 4', fontKey: 'source-serif-4', testerMode: 'custom', testerBlocks: [block], body: [] }
async function mock(page, getRecord = () => record) {
  await page.route('**/__cms_mock__/data/query/**', (route) => route.fulfill({ json: { result: getRecord() } }))
}
const settings = (locator) => locator.evaluate((element) => ({
  size: element.style.fontSize, line: element.style.lineHeight, spacing: element.style.letterSpacing,
  align: element.style.textAlign, weight: element.style.fontWeight, italic: element.style.fontStyle,
  columns: getComputedStyle(element).columnCount,
}))
const desktopSettings = { size: '80px', line: '1.25', spacing: '0.03em', align: 'center', weight: '700', italic: 'italic', columns: '2' }

test('desktop tester uses exact CMS settings, another family, and Reset', async ({ page }) => {
  await mock(page)
  await page.goto('/#/typefaces/custom')
  const tester = page.locator('.type-tester')
  const text = tester.locator('[contenteditable]')
  await expect(tester).toHaveCount(1)
  await expect(text).toHaveText(block.text)
  expect(await settings(text)).toEqual(desktopSettings)
  await text.fill('Visitor edited this')
  await tester.getByRole('button', { name: 'Align left', exact: true }).click()
  await tester.getByRole('button', { name: 'Inter Bold Italic', exact: true }).click()
  await tester.locator('.type-tester__menu-list').getByRole('button', { name: 'Inter Regular', exact: true }).click()
  await tester.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(text).toHaveText(block.text)
  expect(await settings(text)).toEqual(desktopSettings)
})

test('mobile overrides all parameters; crossing the breakpoint loads matching defaults', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mock(page)
  await page.goto('/#/typefaces/custom')
  const tester = page.locator('.type-tester')
  const text = tester.locator('[contenteditable]')
  await expect(text).toHaveText(block.mobileText)
  expect(await settings(text)).toEqual({ size: '32px', line: '1.4', spacing: '-0.02em', align: 'left', weight: '300', italic: 'normal', columns: '1' })
  await text.fill('Mobile visitor edit')
  await tester.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(text).toHaveText(block.mobileText)
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(text).toHaveText(block.text)
  await expect(text).toHaveCSS('font-size', '80px')
  await page.setViewportSize({ width: 800, height: 800 })
  await expect(text).toHaveText(block.mobileText)
  await expect(text).toHaveCSS('font-size', '32px')
})

test('block count, ordering, deletion and an explicitly empty section work', async ({ page }) => {
  let data = { ...record, testerBlocks: Array.from({ length: 7 }, (_, i) => ({ _key: `block-${i}`, text: `Specimen ${i}`, desktop: { fontSize: 40 } })) }
  await mock(page, () => data)
  await page.goto('/#/typefaces/custom')
  await expect(page.locator('.type-tester')).toHaveCount(7)
  data = { ...data, testerBlocks: [data.testerBlocks[6], data.testerBlocks[1]] }
  await page.reload()
  await expect(page.locator('.type-tester')).toHaveCount(2)
  await expect(page.locator('.type-tester [contenteditable]').first()).toHaveText('Specimen 6')
  for (const empty of [[], undefined]) {
    data = { ...data, testerBlocks: empty }
    await page.reload()
    await expect(page.getByRole('heading', { name: record.name, exact: true })).toBeVisible()
    await expect(page.locator('.type-tester')).toHaveCount(0)
  }
})

test('partial mobile settings inherit desktop; malformed parameters have safe defaults', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mock(page, () => ({ ...record, testerBlocks: [
    { ...block, mobileText: undefined, mobile: { fontSize: 30, letterSpacing: 0, align: 'left' } },
    { _key: 'invalid', text: 'Safe settings', desktop: { fontKey: 'invalid', style: 'No such style', fontSize: -5, lineHeight: 99, letterSpacing: 10, columns: 12, align: 'evil' } },
  ] }))
  await page.goto('/#/typefaces/custom')
  await expect(page.locator('.type-tester')).toHaveCount(2)
  const first = page.locator('.type-tester [contenteditable]').first()
  await expect(first).toHaveText(block.text)
  expect(await settings(first)).toEqual({ ...desktopSettings, size: '30px', spacing: '0em', align: 'left' })
  const last = page.locator('.type-tester [contenteditable]').last()
  expect(await settings(last)).toEqual({ size: '12px', line: '2', spacing: '0.1em', align: 'left', weight: '400', italic: 'normal', columns: '3' })
})

test('auto-fit fills available width, shrinks on resize, preserves mobile text and resets', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await mock(page, () => ({ ...record, testerBlocks: [{ ...block,
    desktop: { ...block.desktop, autoFit: true, fontSize: 900 },
    mobile: { ...block.mobile, autoFit: true },
  }] }))
  await page.goto('/#/typefaces/custom')
  const tester = page.locator('.type-tester')
  const text = tester.locator('[contenteditable]')
  await expect(text).toHaveText(block.text)
  await page.evaluate(() => document.fonts.ready)
  const size = () => text.evaluate((element) => Number.parseFloat(element.style.fontSize))
  const widthRatio = () => text.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    return range.getBoundingClientRect().width / element.clientWidth
  })
  await expect.poll(widthRatio).toBeGreaterThan(0.95)
  expect(await widthRatio()).toBeLessThanOrEqual(1.01)
  const desktopSize = await size()
  expect(desktopSize).toBeLessThan(900)
  await page.setViewportSize({ width: 1000, height: 900 })
  await expect.poll(size).toBeLessThan(desktopSize)
  const fitted = await size()
  await text.fill('Short')
  await expect.poll(size).toBeGreaterThan(fitted)
  await text.fill('A much longer specimen entered by a visitor for testing adaptive sizing')
  await expect.poll(size).toBeLessThan(fitted)
  await tester.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(text).toHaveText(block.text)
  await expect.poll(size).toBe(fitted)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(text).toHaveText(block.mobileText)
  await expect(text).toHaveCSS('white-space', 'pre')
  await expect(text).toHaveCSS('column-count', '1')
  await expect.poll(widthRatio).toBeGreaterThan(0.94)
  expect(await widthRatio()).toBeLessThanOrEqual(1.01)
})

test('mobile can explicitly disable inherited auto-fit and keep a fixed size', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mock(page, () => ({ ...record, testerBlocks: [
    { ...block, _key: 'disabled', desktop: { ...block.desktop, autoFit: true }, mobile: { ...block.mobile, autoFit: false } },
    { ...block, _key: 'inherited', desktop: { ...block.desktop, autoFit: true }, mobile: { ...block.mobile } },
  ] }))
  await page.goto('/#/typefaces/custom')
  await expect(page.locator('.type-tester')).toHaveCount(2)
  await expect(page.locator('.type-tester').first()).not.toHaveClass(/type-tester--auto-fit/)
  await expect(page.locator('.type-tester').first().locator('[contenteditable]')).toHaveCSS('font-size', '32px')
  await expect(page.locator('.type-tester').last()).toHaveClass(/type-tester--auto-fit/)
})
