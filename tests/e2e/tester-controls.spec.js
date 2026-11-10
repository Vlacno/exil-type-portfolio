import { test, expect } from '../fixtures'

test('mobile testers hide leading and tracking controls without removing other settings', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 })
  await page.goto('/#/typefaces/source-serif-4')
  const tester = page.locator('.type-tester').first()
  const lineHeight = tester.getByText('Line Height', { exact: true })
  const spacing = tester.getByText('Letter spacing', { exact: true })
  await expect(lineHeight).toBeVisible()
  await expect(spacing).toBeVisible()
  await expect(tester.getByRole('slider')).toHaveCount(3)

  for (const width of [640, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(lineHeight).toBeHidden()
    await expect(spacing).toBeHidden()
    await expect(tester.getByRole('slider')).toHaveCount(1)
    await expect(tester.getByText('Font size', { exact: true })).toBeVisible()
    await expect(tester.getByRole('button', { name: 'Reset', exact: true })).toBeVisible()
    await expect(tester.getByRole('button', { name: 'Align left', exact: true })).toBeVisible()
  }

  await page.setViewportSize({ width: 641, height: 844 })
  await expect(lineHeight).toBeVisible()
  await expect(spacing).toBeVisible()
  await expect(tester.getByRole('slider')).toHaveCount(3)
})
