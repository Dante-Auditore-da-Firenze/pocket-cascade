import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { SAVE_KEY } from '../../src/game/save';
import { canvasPixels, drop, openGame, readRun, readSave } from './helpers';

test('first screen is a painted, playable machine with no external runtime requests', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.url().startsWith('http') && !request.url().startsWith('http://127.0.0.1:5173')) external.push(request.url()); });
  await openGame(page);
  await expect(page.getByRole('heading', { name: 'Loose Change', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Launch token', exact: true })).toBeEnabled();
  await expect(page.locator('[data-slot]')).toHaveCount(46);
  const pixels = await canvasPixels(page);
  expect(pixels.colors).toBeGreaterThan(100);
  expect(pixels.opaque).toBeGreaterThan(500);
  await page.screenshot({ path: testInfo.outputPath('first-machine.png'), fullPage: true });
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('moves, undoes, redoes, and persists actual owned parts', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Select Fork facing right, 1 available', exact: true }).click();
  await page.locator('[data-slot="3-2"]').click();
  await expect(page.getByRole('button', { name: 'Fork socket 3-2', exact: true })).toBeVisible();
  expect((await readRun(page)).bench).toHaveLength(0);
  await page.getByRole('button', { name: 'Undo placement', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select Fork facing right, 1 available', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Redo placement', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Fork socket 3-2', exact: true })).toBeVisible();
  const run = await readRun(page);
  expect([...Object.values(run.board), ...run.bench]).toHaveLength(5);
  expect(run.brass).toBe(0);
});

test('pauses the actual simulation and refunds an interrupted launch on reload', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Launch token', exact: true }).click();
  await page.getByRole('button', { name: 'Pause cascade', exact: true }).click();
  await expect(page.locator('.cabinet-board')).toHaveAttribute('data-paused', 'true');
  const before = await page.getByTestId('machine-canvas').evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(300);
  const after = await page.getByTestId('machine-canvas').evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  expect(after).toBe(before);
  expect((await readRun(page)).phase).toBe('dropping');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Launch token', exact: true })).toBeEnabled();
  const recovered = await readRun(page);
  expect(recovered.phase).toBe('ready');
  expect(recovered.dropsLeft).toBe(5);
  expect(recovered.score).toBe(0);
});

test('settings and backup recovery survive reload', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Accessibility options', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduced motion', exact: true }).check();
  await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Mute all audio', exact: true }).check();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Aim lane 3', exact: true }).click();
  await page.getByRole('button', { name: 'Aim lane 4', exact: true }).click();
  await page.evaluate((key) => localStorage.setItem(key, '{corrupt'), SAVE_KEY);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Recovered your machine');
  const save = await readSave(page);
  expect(save.settings.reducedMotion).toBe(true);
  expect(save.settings.muted).toBe(true);
  expect(save.run.lane).toBe(2);
});

test('salvage commits ownership and clears placement undo history', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Mint socket 0-3', exact: true }).click();
  await page.getByRole('button', { name: 'To worktable', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo placement', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Select Mint, 1 available', exact: true }).click();
  await page.getByRole('button', { name: 'Salvage part for 1 credit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo placement', exact: true })).toBeDisabled();
  expect((await readRun(page)).brass).toBe(1);
  expect((await readRun(page)).bench.some((peg) => peg.id === 'part-1')).toBe(false);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 700 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
  test(`visible painted cabinet and usable controls at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGame(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    const canvas = page.getByTestId('machine-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const screenshot = await canvas.screenshot({ path: testInfo.outputPath('cabinet.png') });
    const statistics = await sharp(screenshot).stats();
    expect(statistics.channels.slice(0, 3).reduce((sum, channel) => sum + channel.stdev, 0)).toBeGreaterThan(25);
    expect((await canvasPixels(page)).colors).toBeGreaterThan(100);
    await page.getByRole('button', { name: '4x speed', exact: true }).click();
    await drop(page);
    const run = await readRun(page);
    expect(run.score).toBeGreaterThan(0);
    expect(run.totalDrops).toBe(1);
    await page.screenshot({ path: testInfo.outputPath('responsive.png'), fullPage: true });
  });
}

test('production audio stage is audible digitally, muted at zero, and bounded under a burst', async ({ page }) => {
  await openGame(page);
  const measurements = await page.evaluate(async () => {
    const moduleURL = performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('/src/audio/synth.ts')).at(-1)!;
    const { createOutputStage, scheduleTone } = await import(moduleURL);
    async function render(volume: number, voices: number) {
      const context = new OfflineAudioContext(1, 44100, 44100);
      const stage = createOutputStage(context, volume);
      for (let index = 0; index < voices; index += 1) scheduleTone(context, stage.input, 440 + index * 23, index * 0.008, 0.3, 0.3, 'triangle');
      const buffer = await context.startRendering();
      const samples = buffer.getChannelData(0);
      let peak = 0;
      let squares = 0;
      for (const sample of samples) { peak = Math.max(peak, Math.abs(sample)); squares += sample * sample; }
      return { peak, rms: Math.sqrt(squares / samples.length) };
    }
    return { normal: await render(0.65, 1), burst: await render(0.65, 24), muted: await render(0, 6) };
  });
  expect(measurements.normal.peak).toBeGreaterThan(0.08);
  expect(measurements.normal.rms).toBeGreaterThan(0.01);
  expect(measurements.burst.peak).toBeLessThan(0.7);
  expect(measurements.muted.peak).toBe(0);
});