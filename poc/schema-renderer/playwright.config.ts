import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4300',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    { name: 'android', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4300',
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
