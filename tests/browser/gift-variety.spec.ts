import { test, expect } from '@playwright/test';
import { PARTS } from '../../src/game/content';
import { claimPart, dropConfig, nextCommission, placePeg, removePeg } from '../../src/game/engine';
import { freshSave, parseSave, SAVE_KEY, updateProgress, type SaveData } from '../../src/game/save';
import { simulateDrop } from '../../src/game/simulation';
import { evaluateMachine, type BuildAction } from '../../scripts/strategies';
import { playRoleCampaign } from '../../scripts/roles-balance';
import { observeDrop } from '../../scripts/structural-study';
import { applyBuild, canvasPixels, readRun } from './helpers';

let fixture: SaveData;

test.beforeAll(() => {
  test.setTimeout(120_000);
  const report = playRoleCampaign(1, 'bank', 5, 0);
  expect(report.cleared).toBe(5);
  expect(report.timeouts).toBe(0);
  expect(report.finalRun.rewardChoices).toContain('dividend');
  fixture = updateProgress(freshSave(1), report.finalRun);
  fixture.profile.seenTutorial = true;
  expect(parseSave(JSON.stringify(fixture))).not.toBeNull();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`earned Dividend reward cashes a bank reserve in real play at ${viewport.width}px`, async ({ page }, testInfo) => {
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

    await page.getByRole('button', { name: 'Choose Dividend', exact: true }).click();
    const claimed = await readRun(page);
    expect(claimed.brass).toBe(before.brass);
    expect(claimed.offers).toEqual(before.offers);
    expect(claimed.bench).toHaveLength(before.bench.length + 1);
    await expect(page.locator('.free-offer')).toHaveCount(0);
    let arranged = nextCommission(claimPart(before, 'dividend'));
    const gift = claimed.bench.find((peg) => peg.id === `part-${before.nextId}`)!;
    const actions: BuildAction[] = [];
    for (const slotId of Object.keys(arranged.board)) {
      actions.push({ type: 'remove', slotId });
      arranged = removePeg(arranged, slotId);
    }
    const route = observeDrop(arranged, 'baseline').contacts;
    const generator = arranged.bench.find((part) => part.kind === 'mint')!;
    const bank = arranged.bench.find((part) => part.kind === 'vault')!;
    expect(generator).toBeDefined();
    expect(bank).toBeDefined();
    for (const [index, part] of [generator, bank].entries()) {
      actions.push({ type: 'place', pegId: part.id, slotId: route[index] });
      arranged = placePeg(arranged, part.id, route[index]);
    }
    const bankOnly = evaluateMachine(arranged);
    arranged = placePeg(arranged, gift.id, route[2]);
    actions.push({ type: 'place', pegId: gift.id, slotId: route[2] });
    expect(evaluateMachine(arranged)).toBeGreaterThan(bankOnly);
    await page.getByRole('button', { name: 'Next commission', exact: true }).click();
    await applyBuild(page, actions);
    const installed = await readRun(page);
    expect(installed).toEqual(arranged);
    expect(installed.board[route[2]].id).toBe(gift.id);
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
    expect(settled.lastDrop?.events.some((event) => event.kind === 'dividend' && event.amount > 0)).toBe(true);
    expect(settled.lastDrop?.banked).toBeGreaterThan(0);
    expect((await canvasPixels(page)).colors).toBeGreaterThan(100);
    await page.reload();
    await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
    expect(await readRun(page)).toEqual(settled);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('candidate-payout.png'), fullPage: true });
  });
}