import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { dropConfig } from '../../src/game/engine';
import { freshSave, SAVE_KEY } from '../../src/game/save';
import { simulateDrop } from '../../src/game/simulation';
import { drop, openGame } from './helpers';

interface FeedbackTiming {
  calls: number;
  milliseconds: number;
  maximum: number;
}

interface FeedbackProfile {
  timings: Record<string, FeedbackTiming>;
  frameIntervals: number[];
  paletteReads: number;
  iconEncodes: number;
  restore: () => void;
}

type ProfileWindow = Window & { __feedbackProfile?: FeedbackProfile };

test('palette reuse follows scoped colors and font changes without repeated pixel reads', async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(async () => {
    const paletteUrl = performance.getEntriesByType('resource').map((entry) => entry.name)
      .find((url) => new URL(url).pathname === '/src/render/palette.ts');
    if (!paletteUrl) throw new Error('Loaded palette module not found.');
    const { readCabinetPalette } = await import(paletteUrl) as typeof import('../../src/render/palette');
    const host = document.createElement('div');
    host.style.setProperty('--cp-accent', '#123456');
    document.body.appendChild(host);
    const readPixels = CanvasRenderingContext2D.prototype.getImageData;
    let reads = 0;
    CanvasRenderingContext2D.prototype.getImageData = function (...args: Parameters<typeof readPixels>) {
      if (this.canvas.width === 1 && this.canvas.height === 1) reads += 1;
      return readPixels.apply(this, args);
    };
    try {
      const first = readCabinetPalette(host);
      const initialReads = reads;
      const repeated = readCabinetPalette(host);
      const repeatedReads = reads - initialReads;
      host.style.setProperty('--cp-accent', '#abcdef');
      const recolored = readCabinetPalette(host);
      host.style.fontFamily = '"Barlow Condensed"';
      const newFont = readCabinetPalette(host);
      host.style.removeProperty('font-family');
      host.style.setProperty('--cp-accent', '#123456');
      const restored = readCabinetPalette(host);
      return {
        initialReads, repeatedReads, reused: first === repeated, restored: first === restored,
        firstAccent: first.accent, nextAccent: recolored.accent,
        fontChanged: newFont.font !== recolored.font, totalReads: reads,
      };
    } finally {
      CanvasRenderingContext2D.prototype.getImageData = readPixels;
      host.remove();
    }
  });
  expect(result).toEqual({
    initialReads: 8, repeatedReads: 0, reused: true, restored: true,
    firstAccent: { red: 18, green: 52, blue: 86, alpha: 1 },
    nextAccent: { red: 171, green: 205, blue: 239, alpha: 1 },
    fontChanged: true, totalReads: 24,
  });
});

test('profiles dense opening feedback on the reported machine without changing its payout', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const save = freshSave(42);
  save.profile.seenTutorial = true;
  save.profile.tutorialStep = 'done';
  save.settings.theme = 'dark';
  save.settings.speed = 1;
  save.run.mode = 'endless';
  save.run.stage = 15;
  save.run.power = 8;
  save.run.nextId = 22;
  save.run.board = {
    '2-3': { id: 'part-4', kind: 'doubler', direction: 1 },
    '0-3': { id: 'part-5', kind: 'splitter', direction: 1 },
    '3-3': { id: 'part-8', kind: 'doubler', direction: 1 },
    '1-2': { id: 'part-11', kind: 'crown', direction: 1 },
    '4-5': { id: 'part-14', kind: 'doubler', direction: 1 },
    '1-3': { id: 'part-6', kind: 'splitter', direction: -1 },
    '2-2': { id: 'part-12', kind: 'crown', direction: 1 },
    '4-4': { id: 'part-15', kind: 'echo', direction: 1 },
    '5-2': { id: 'part-13', kind: 'doubler', direction: 1 },
    '4-2': { id: 'part-16', kind: 'doubler', direction: 1 },
    '3-2': { id: 'part-17', kind: 'echo', direction: 1 },
  };
  save.run.bench = [
    { id: 'part-3', kind: 'mint', direction: 1 },
    { id: 'part-7', kind: 'splitter', direction: 1 },
    { id: 'part-2', kind: 'mint', direction: 1 },
    { id: 'part-1', kind: 'mint', direction: 1 },
    { id: 'part-18', kind: 'echo', direction: 1 },
    { id: 'part-19', kind: 'echo', direction: 1 },
    { id: 'part-20', kind: 'crown', direction: 1 },
    { id: 'part-21', kind: 'echo', direction: 1 },
  ];
  const expected = simulateDrop(dropConfig(save.run));
  expect(expected.total).toBeGreaterThan(0);
  expect(expected.splits).toBe(3);
  expect(expected.events.some((event) => event.label === 'NEEDS CHARGE')).toBe(true);
  await page.setViewportSize({ width: 1301, height: 1006 });
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: SAVE_KEY, data: JSON.stringify(save) });
  for (const mode of ['normal', 'without-canvas-labels'] as const) {
    await openGame(page);
    await page.evaluate(async (mode) => {
      const rendererUrl = performance.getEntriesByType('resource').map((entry) => entry.name)
        .find((url) => new URL(url).pathname === '/src/render/cabinet.ts');
      if (!rendererUrl) throw new Error('Loaded renderer module not found.');
      const { CabinetRenderer } = await import(rendererUrl) as typeof import('../../src/render/cabinet');
      const profile: FeedbackProfile = { timings: {}, frameIntervals: [], paletteReads: 0, iconEncodes: 0, restore: () => undefined };
      const undo: (() => void)[] = [];
      let previousFrame = 0;
      const prototype = CabinetRenderer.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
      for (const method of ['draw', 'drawLabels', 'drawTokenValues', 'drawMechanisms']) {
        const original = prototype[method];
        prototype[method] = function (...args) {
          const started = performance.now();
          if (method === 'draw') {
            if (previousFrame) profile.frameIntervals.push(started - previousFrame);
            previousFrame = started;
          }
          const disabled = mode === 'without-canvas-labels' && (method === 'drawLabels' || method === 'drawTokenValues');
          const result = disabled ? undefined : original.apply(this, args);
          const duration = performance.now() - started;
          const timing = profile.timings[method] ??= { calls: 0, milliseconds: 0, maximum: 0 };
          timing.calls += 1;
          timing.milliseconds += duration;
          timing.maximum = Math.max(timing.maximum, duration);
          return result;
        };
        undo.push(() => { prototype[method] = original; });
      }
      const readPixels = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (...args: Parameters<typeof readPixels>) {
        const started = performance.now();
        const result = readPixels.apply(this, args);
        if (this.canvas.width === 1 && this.canvas.height === 1) {
          profile.paletteReads += 1;
          const timing = profile.timings.paletteRead ??= { calls: 0, milliseconds: 0, maximum: 0 };
          const duration = performance.now() - started;
          timing.calls += 1;
          timing.milliseconds += duration;
          timing.maximum = Math.max(timing.maximum, duration);
        }
        return result;
      };
      undo.push(() => { CanvasRenderingContext2D.prototype.getImageData = readPixels; });
      const encode = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (...args: Parameters<typeof encode>) {
        if (this.width === 96 && this.height === 96) profile.iconEncodes += 1;
        return encode.apply(this, args);
      };
      undo.push(() => { HTMLCanvasElement.prototype.toDataURL = encode; });
      profile.restore = () => { for (const restore of undo) restore(); delete (window as ProfileWindow).__feedbackProfile; };
      (window as ProfileWindow).__feedbackProfile = profile;
    }, mode);
    try {
      const run = await drop(page);
      expect(run.lastDrop).toEqual(expected);
      const profile = await page.evaluate(() => {
        const { restore, ...measurements } = (window as ProfileWindow).__feedbackProfile!;
        return measurements;
      });
      const intervals = [...profile.frameIntervals].sort((first, second) => first - second);
      const reportPath = testInfo.outputPath(`feedback-${mode}.json`);
      await writeFile(reportPath, JSON.stringify({
        mode, payout: run.lastDrop!.total, ...profile,
        frameSummary: { median: intervals[Math.floor(intervals.length / 2)], p95: intervals[Math.floor(intervals.length * 0.95)], over25ms: intervals.filter((interval) => interval > 25).length },
      }, null, 2));
      await testInfo.attach(`feedback-${mode}.json`, { path: reportPath, contentType: 'application/json' });
      expect(profile.timings.draw.calls).toBeGreaterThan(30);
      expect(profile.paletteReads).toBeLessThanOrEqual(32);
      expect(profile.iconEncodes).toBeLessThanOrEqual(8);
    } finally {
      await page.evaluate(() => (window as ProfileWindow).__feedbackProfile?.restore());
    }
  }
});