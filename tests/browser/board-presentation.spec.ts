import { test, expect } from '@playwright/test';
import { PART_KINDS } from '../../src/game/content';
import { commission, dropConfig } from '../../src/game/engine';
import { SLOTS } from '../../src/game/model';
import { freshSave, parseSave, SAVE_KEY } from '../../src/game/save';
import { simulateDrop } from '../../src/game/simulation';
import { canvasPixels, drop, openGame, readRun } from './helpers';

test('recessed collectors react locally to payouts and return to a quiet intake', async ({ page }) => {
  await openGame(page);
  const results = await page.evaluate(async () => {
    const { CabinetRenderer } = await import('../../src/render/cabinet');
    const { COLLECTORS } = await import('../../src/render/art');
    const { readCabinetPalette } = await import('../../src/render/palette');
    const palette = readCabinetPalette(document.querySelector<HTMLElement>('.cabinet-board')!);
    return COLLECTORS.flatMap((target, targetIndex) => [false, true].map((reducedMotion) => {
      const canvas = document.createElement('canvas');
      const renderer = new CabinetRenderer(canvas, palette);
      renderer.resize(500, 650, 1);
      const context = canvas.getContext('2d')!;
      const view = { board: {}, lane: 4, selectedPegId: null, inspectedSlotId: null, destinations: new Set<string>(), editable: false, ready: false, dropping: false, paused: false, reducedMotion, trails: false };
      const region = (left: number, top: number, width: number, height: number) => [...context.getImageData(Math.ceil(left), top, Math.floor(width), height).data].join(',');
      renderer.draw(view, 1);
      const original = COLLECTORS.map((tray) => region(tray.left + 2, 562, tray.right - tray.left - 4, 72));
      const intake = region(target.left + 6, 566, target.right - target.left - 12, 29);
      renderer.event({ tick: 1, type: 'payout', x: target.center, y: 596, tokenId: 1, amount: 321, label: '+321', tray: targetIndex });
      renderer.advance(100);
      renderer.draw(view, 1);
      const active = COLLECTORS.map((tray) => region(tray.left + 2, 562, tray.right - tray.left - 4, 72));
      const intakeMoves = region(target.left + 6, 566, target.right - target.left - 12, 29) !== intake;
      renderer.advance(1400);
      renderer.draw(view, 1);
      const settledIntake = region(target.left + 6, 566, target.right - target.left - 12, 29);
      const settled = canvas.toDataURL();
      renderer.advance(500);
      renderer.draw(view, 1);
      const quiet = canvas.toDataURL() === settled;
      renderer.dispose();
      return {
        target: targetIndex,
        reducedMotion,
        onlyTargetChanged: active.every((pixels, index) => index === targetIndex ? pixels !== original[index] : pixels === original[index]),
        intakeMoves,
        intakeReturns: settledIntake === intake,
        quiet,
      };
    }));
  });
  for (const result of results) {
    expect(result.onlyTargetChanged, `Collector ${result.target}`).toBe(true);
    expect(result.intakeMoves).toBe(!result.reducedMotion);
    expect(result.intakeReturns).toBe(true);
    expect(result.quiet).toBe(true);
  }
});

test('idle mechanisms stay quiet and Relay adjacency appears only during inspection', async ({ page }, testInfo) => {
  const save = freshSave(42);
  save.run.board['1-2'].kind = 'relay';
  expect(parseSave(JSON.stringify(save))).not.toBeNull();
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: SAVE_KEY, data: JSON.stringify(save) });
  await openGame(page);
  const canvas = page.getByTestId('machine-canvas');
  await page.mouse.move(0, 0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  const quiet = await canvas.screenshot();
  const connectionPixels = () => canvas.evaluate((element) => {
    const image = element as HTMLCanvasElement;
    return [...image.getContext('2d')!.getImageData(Math.floor(241 / 500 * image.width), Math.floor(170 / 650 * image.height), Math.ceil(18 / 500 * image.width), Math.ceil(10 / 650 * image.height)).data];
  });
  const quietConnection = await connectionPixels();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect((await canvas.screenshot()).equals(quiet)).toBe(true);
  await page.locator('[data-slot="1-2"]').focus();
  await expect.poll(async () => (await canvas.screenshot()).equals(quiet)).toBe(false);
  await expect.poll(connectionPixels).not.toEqual(quietConnection);
  await page.screenshot({ path: testInfo.outputPath('relay-inspection.png'), fullPage: true });
  expect(await readRun(page)).toEqual(save.run);
  await page.locator('[data-slot="0-3"]').focus();
  await expect.poll(connectionPixels).toEqual(quietConnection);
  await page.getByRole('button', { name: 'Launch token', exact: true }).focus();
  await expect.poll(async () => (await canvas.screenshot()).equals(quiet)).toBe(true);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`full-capacity board keeps distinct parts and exact payout at ${viewport.width}px`, async ({ page }, testInfo) => {
    const save = freshSave(42);
    save.run.stage = 11;
    save.profile.seenTutorial = true;
    save.profile.tutorialStep = 'done';
    const capacity = commission(save.run).capacity;
    save.run.board = Object.fromEntries(SLOTS.slice(0, capacity).map((slot, index) => [slot.id, { id: `part-${index + 1}`, kind: PART_KINDS[index % PART_KINDS.length], direction: index % 2 ? -1 as const : 1 as const }]));
    save.run.bench = [];
    save.run.nextId = capacity + 1;
    expect(parseSave(JSON.stringify(save))).not.toBeNull();
    await page.setViewportSize(viewport);
    await page.addInitScript(({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    }, { key: SAVE_KEY, data: JSON.stringify(save) });
    await openGame(page);
    await expect(page.locator('[data-slot]')).toHaveCount(46);
    const shapes = await page.evaluate(async () => {
      const { paintMechanism, cabinetMaterials } = await import('../../src/render/art');
      const { readCabinetPalette } = await import('../../src/render/palette');
      const palette = readCabinetPalette(document.querySelector<HTMLElement>('.cabinet-board')!);
      const kinds = ['mint', 'doubler', 'splitter', 'kicker', 'relay', 'vault', 'echo', 'crown'] as const;
      return kinds.map((kind) => {
        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 96;
        const context = canvas.getContext('2d')!;
        context.setTransform(2, 0, 0, 2, 48, 48);
        paintMechanism(context, { kind, direction: 1, id: 'preview' }, palette, cabinetMaterials(palette));
        return canvas.toDataURL();
      });
    });
    expect(new Set(shapes).size).toBe(8);
    expect((await canvasPixels(page)).colors).toBeGreaterThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('full-board.png'), fullPage: true });
    const before = await readRun(page);
    const expected = simulateDrop(dropConfig(before));
    await page.getByRole('button', { name: '4x speed', exact: true }).click();
    const after = await drop(page);
    expect(after.lastDrop).toEqual(expected);
    await page.screenshot({ path: testInfo.outputPath('full-board-payout.png'), fullPage: true });
  });
}