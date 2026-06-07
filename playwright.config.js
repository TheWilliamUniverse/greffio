import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    { name: 'iphone-se', use: { ...devices['iPhone SE'] } },
    { name: 'ipad-tablet', use: { ...devices['iPad Pro 11'] } },
    { name: 'galaxy-fold', use: { viewport: { width: 344, height: 882 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
