import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'game-flow.spec.ts',
  fullyParallel: false,
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3101',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'PORT=3101 HOST=127.0.0.1 WEB_ORIGIN=http://127.0.0.1:3101 WEB_ROOT=apps/web/dist node apps/server/dist/index.js',
    url: 'http://127.0.0.1:3101/api/health',
    timeout: 120_000,
    reuseExistingServer: false,
  },
})
