import { test, expect } from '@playwright/test';
import { PARTS } from '../../src/game/content';
import { claimPart, dropConfig, nextCommission, type RunState } from '../../src/game/engine';
import { freshSave, parseSave, SAVE_KEY, updateProgress, type SaveData } from '../../src/game/save';
import { simulateDrop } from '../../src/game/simulation';
import { collectWithGiftVariety } from '../../scripts/experiments/gift-variety';
import { bestPlacement, evaluateMachine, playCampaign } from '../../scripts/strategies';
import { canvasPixels, readRun, selectSpareStack } from './helpers';

let fixture: SaveData;

test.beforeAll(() => {
  test.setTimeout(120_000);
  let earnedShop: RunState | undefined;
  const report = playCampaign(42, 'conservative', 7, {
    collect(run) {
      const shop = collectWithGiftVariety(run);
      if (run.stage === 6) earnedShop = shop;
      return shop;
    },
  });
  expect(report.stagesCleared).toBe(7);
  expect(report.timeouts).toBe(0);
  expect(earnedShop?.rewardChoices).toEqual(['crown', 'kicker', 'echo']);
  fixture = updateProgress(freshSave(42), earnedShop!);
  fixture.profile.seenTutorial = true;
  expect(parseSave(JSON.stringify(fixture))).not.toBeNull();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`earned candidate gift stays free, placeable, and plays a real cascade at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.addInitScript(({ key, save }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, save);
    }, { key: SAVE_KEY, save: JSON.stringify(fixture) });
    await page.goto('/');
    await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
    await page.evaluate(() => document.fonts.ready);
    const before = await readRun(page);
    expect(before).toEqual(fixture.run);
    await expect(page.locator('.free-offer')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Next commission', exact: true })).toBeDisabled();
    for (const kind of before.rewardChoices) {
      await expect(page.getByRole('button', { name: `Choose ${PARTS[kind].name}`, exact: true })).toBeVisible();
    }
    expect((await canvasPixels(page)).colors).toBeGreaterThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('earned-candidate-gifts.png'), fullPage: true });
    await page.reload();
    await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
    expect((await readRun(page)).rewardChoices).toEqual(before.rewardChoices);

    await page.getByRole('button', { name: 'Choose Echo', exact: true }).click();
    const claimed = await readRun(page);
    expect(claimed.brass).toBe(before.brass);
    expect(claimed.offers).toEqual(before.offers);
    expect(claimed.bench).toHaveLength(before.bench.length + 1);
    await expect(page.locator('.free-offer')).toHaveCount(0);
    const expectedReady = nextCommission(claimPart(before, 'echo'));
    const gift = claimed.bench.find((peg) => peg.id === `part-${before.nextId}`)!;
    const placement = bestPlacement(expectedReady, gift.id);
    expect(placement.slotId).not.toBeNull();
    expect(evaluateMachine(placement.run)).toBeGreaterThan(evaluateMachine(expectedReady));
    await page.getByRole('button', { name: 'Next commission', exact: true }).click();
    await selectSpareStack(page, gift);
    await page.locator(`[data-slot="${placement.slotId}"]`).click();
    const installed = await readRun(page);
    expect(installed.board[placement.slotId!].id).toBe(gift.id);
    expect(installed.brass).toBe(before.brass);

    const expectedPayout = simulateDrop(dropConfig(installed)).total;
    const canvas = page.getByTestId('machine-canvas');
    const still = await canvas.screenshot();
    await page.getByRole('button', { name: 'Launch token', exact: true }).click();
    await expect.poll(async () => (await canvas.screenshot()).equals(still)).toBe(false);
    await page.screenshot({ path: testInfo.outputPath('candidate-cascade.png'), fullPage: true });
    await expect.poll(async () => (await readRun(page)).totalDrops, { timeout: 20_000 }).toBe(installed.totalDrops + 1);
    const settled = await readRun(page);
    expect(settled.lastDrop?.total).toBe(expectedPayout);
    expect(settled.score).toBe(expectedPayout);
    expect(settled.lastDrop?.events.some((event) => event.kind === 'echo')).toBe(true);
    expect((await canvasPixels(page)).colors).toBeGreaterThan(100);
    await page.reload();
    await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
    expect(await readRun(page)).toEqual(settled);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('candidate-payout.png'), fullPage: true });
  });
}