import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/release',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3003', serviceWorkers: 'block' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run preview -- --host localhost --port 3003 --strictPort',
    url: 'http://localhost:3003',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
