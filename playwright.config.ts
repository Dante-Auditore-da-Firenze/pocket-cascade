import { defineConfig } from '@playwright/test';

const port = Number(process.env.POCKET_TEST_PORT ?? 5174);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid test port.');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  outputDir: './artifacts/playwright',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list'], ['html', { outputFolder: 'artifacts/playwright-report', open: 'never' }]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: { command: `npm run dev -- --port ${port} --strictPort`, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 30_000 },
});