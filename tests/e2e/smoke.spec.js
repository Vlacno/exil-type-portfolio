import { test, expect } from '../fixtures'

test('home displays the project and main sections', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ÉMIGRÉ', exact: true })).toBeVisible()
  for (const name of ['Research', 'Publications', 'Typefaces']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
})

test('research lists articles', async ({ page }) => {
  await page.goto('/#/research')
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Typography in Emigrant publications', exact: true })).toBeVisible()
  await expect(page.getByRole('main').getByRole('link').first()).toHaveAttribute('href', /#\/research\/.+/)
})

test('publications displays covers and filters', async ({ page }) => {
  await page.goto('/#/publications')
  await expect(page.getByRole('button', { name: 'Place', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Year', exact: true })).toBeVisible()
  await expect(page.getByRole('main').getByRole('img', { name: 'Satirikon', exact: true })).toBeVisible()
})

test('typefaces lists available fonts', async ({ page }) => {
  await page.goto('/#/typefaces')
  await expect(page.getByRole('main').getByRole('link', { name: /Unbounded Light/ })).toBeVisible()
  await expect(page.getByRole('main').getByRole('link', { name: /Inter Regular/ })).toBeVisible()
})

test('about displays the project introduction and expandable contact information', async ({ page }) => {
  await page.goto('/#/about')
  await expect(page.getByRole('region', { name: 'About', exact: true })).toContainText('This project is a PhD research project')
  await page.getByRole('main').getByRole('button', { name: 'Contact', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Contact', exact: true }).getByRole('link', { name: 'exil-type@mail.com', exact: true })).toHaveAttribute('href', 'mailto:exil-type@mail.com')
})

test('research cards open an article', async ({ page }) => {
  await page.goto('/#/research')
  await page.getByRole('main').getByRole('link', { name: /Typography in Emigrant publications/ }).click()
  await expect(page).toHaveURL(/#\/research\/typography-in-emigrant-publications$/)
  await expect(page.getByRole('heading', { name: 'Typography in Emigrant publications', exact: true })).toBeVisible()
  await expect(page.getByRole('article')).toBeVisible()
})

test('publication cards open a detail page', async ({ page }) => {
  await page.goto('/#/publications')
  await page.getByRole('main').getByRole('link', { name: 'Satirikon', exact: true }).click()
  await expect(page).toHaveURL(/#\/publications\/satirikon$/)
  await expect(page.getByRole('heading', { name: 'Satirikon', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open Satirikon full screen', exact: true })).toBeVisible()
})

test('typeface cards open a detail page', async ({ page }) => {
  await page.goto('/#/typefaces')
  await page.getByRole('main').getByRole('link', { name: /Unbounded Light/ }).click()
  await expect(page).toHaveURL(/#\/typefaces\/unbounded$/)
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open historic Cyrillic newspaper detail full screen', exact: true })).toBeVisible()
})

test('header navigation works on desktop and mobile', async ({ page, isMobile }) => {
  // Start on About because the mobile home header is hidden at the top.
  await page.goto('/#/about')
  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  }
  await page.getByRole('navigation').getByRole('link', { name: 'Research', exact: true }).click()
  await expect(page).toHaveURL(/#\/research$/)
  await expect(page.getByRole('heading', { name: 'Typography in Emigrant publications', exact: true })).toBeVisible()
  if (isMobile) {
    await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toHaveAttribute('aria-expanded', 'false')
  }
})
