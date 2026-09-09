import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/native',
  testMatch: '**/*.native.ts',
  outputDir: './tests/native/.results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
});