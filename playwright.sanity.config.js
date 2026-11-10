import { defineConfig, devices } from '@playwright/test'

// Exercise the real SDK with requests intercepted in Playwright. Never contacts
// the cloud: the shared fixture aborts every unmatched external browser request.
export default defineConfig({
  testDir: './tests/sanity',
  fullyParallel: true,
  reporter: 'list',
  workers: 2,
  use: { baseURL: 'http://localhost:3002', serviceWorkers: 'block' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --host localhost --port 3002 --strictPort',
    url: 'http://localhost:3002',
    reuseExistingServer: false,
    env: {
      VITE_CONTENT_SOURCE: 'sanity',
      VITE_RESEARCH_SOURCE: 'sanity', VITE_PUBLICATIONS_SOURCE: 'sanity',
      VITE_TYPEFACES_SOURCE: 'sanity', VITE_ABOUT_SOURCE: 'sanity',
      VITE_SANITY_USE_CDN: 'false', VITE_CMS_MOCK_TESTS: 'false',
    },
    timeout: 60_000,
  },
})
