import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/cms',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3001', serviceWorkers: 'block' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --host localhost --port 3001 --strictPort',
    url: 'http://localhost:3001',
    reuseExistingServer: false,
    env: { VITE_CMS_MOCK_TESTS: 'true' },
    timeout: 60_000,
  },
})
