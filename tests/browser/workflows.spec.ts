import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { dailySeed } from '../../src/game/engine';
import { openGame, readRun, readSave, drop } from './helpers';

test('a missed commission can restart at the same difficulty without a relaxed-target prompt', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  await page.getByRole('button', { name: 'Aim lane 2', exact: true }).click();
  for (let launch = 0; launch < 5; launch += 1) await drop(page);
  const lost = await readRun(page);
  expect(lost.phase).toBe('lost');
  expect(lost.score).toBe(50);
  await expect(page.getByRole('button', { name: 'Retry commission', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inspect my machine', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try this adjustment', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with relaxed targets (-35%)', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Restart level', exact: true }).click();
  const recovered = await readRun(page);
  expect(recovered.assisted).toBe(false);
  expect(recovered.retries).toBe(0);
  expect(recovered.board).toEqual(lost.board);
  expect(recovered.brass).toBe(lost.brass);
  expect(recovered.dropsLeft).toBe(5);
  await page.getByRole('button', { name: 'Aim lane 5', exact: true }).click();
  let run = await readRun(page);
  while (run.phase === 'ready') run = await drop(page);
  expect(run.phase).toBe('review');
});

test('daily machines use the UTC seed and restarting preserves the collection', async ({ page }) => {
  await openGame(page);
  const discovered = (await readSave(page)).profile.discovered;
  await page.getByRole('button', { name: 'Pause menu', exact: true }).click();
  await page.getByRole('button', { name: /Daily machine/ }).click();
  await expect(page.getByRole('switch', { name: 'Relaxed targets (-35%)', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start fresh', exact: true }).click();
  const run = await readRun(page);
  expect(run.mode).toBe('daily');
  expect(run.seed).toBe(dailySeed());
  expect(run.assisted).toBe(false);
  expect((await readSave(page)).profile.discovered).toEqual(discovered);
  await page.reload();
  expect((await readRunAfterReady(page)).mode).toBe('daily');
});

async function readRunAfterReady(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  return readRun(page);
}

test('browser export and validated import restore the chosen machine', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Aim lane 7', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export save', exact: true }).click();
  const download = await downloadPromise;
  const contents = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(contents).run.lane).toBe(6);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Aim lane 1', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const upload = page.getByLabel('Import save file', { exact: true });
  await upload.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('status')).toContainText('not a valid');
  expect((await readRun(page)).lane).toBe(0);
  await upload.setInputFiles({ name: 'machine.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
  await expect(page.getByRole('status')).toContainText('Machine restored');
  expect((await readRun(page)).lane).toBe(6);
  await page.reload();
  expect((await readRunAfterReady(page)).lane).toBe(6);
});

test('light lighting and high contrast paint a complete resized cabinet', async ({ page }, testInfo) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Evening lighting', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Accessibility options', exact: true }).click();
  await page.getByRole('switch', { name: 'High contrast', exact: true }).check();
  await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true');
  await page.setViewportSize({ width: 760, height: 540 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(760);
  const canvas = page.getByTestId('machine-canvas');
  const image = await canvas.screenshot({ path: testInfo.outputPath('light-cabinet.png') });
  const statistics = await sharp(image).stats();
  expect(statistics.channels.slice(0, 3).reduce((sum, channel) => sum + channel.stdev, 0)).toBeGreaterThan(25);
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  expect((await drop(page)).totalDrops).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('light-responsive.png'), fullPage: true });
});