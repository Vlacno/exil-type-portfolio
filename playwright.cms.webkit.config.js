import { defineConfig, devices } from '@playwright/test'
import cmsConfig from './playwright.cms.config'

// Optional local Safari regression run; CI still only needs Chromium installed.
export default defineConfig({
  ...cmsConfig,
  testMatch: ['typeface-fonts.spec.js', 'independent-loading.spec.js', 'block-fonts.spec.js'],
  projects: [{ name: 'mobile-safari', use: { ...devices['iPhone 13'] } }],
})
