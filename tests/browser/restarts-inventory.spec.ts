import { test, expect, type Page } from '@playwright/test';
import { PARTS } from '../../src/game/content';
import { commission } from '../../src/game/engine';
import { SLOTS } from '../../src/game/model';
import { openGame, drop, readRun, readSave, spareStack, selectSpareStack } from './helpers';

async function firstShop(page: Page) {
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  await page.getByRole('button', { name: 'Aim lane 4', exact: true }).click();
  let run = await readRun(page);
  while (run.phase === 'ready') run = await drop(page);
  expect(run.phase).toBe('review');
  await expect(page.getByRole('button', { name: 'Restart level', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Visit the workshop', exact: true }).click();
  return readRun(page);
}

test('quick restart resets only this attempt and persists unchanged possessions and difficulty', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Select Fork facing right, 1 available', exact: true }).click();
  await page.locator('[data-slot="6-0"]').click();
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  await drop(page);
  const previous = await readSave(page);
  expect(previous.run.score).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Restart level', exact: true }).click();
  const restarted = await readSave(page);
  expect(restarted.run).toEqual({ ...previous.run, phase: 'ready', score: 0, dropsLeft: 5, activeDrop: null, lastDrop: null });
  expect(restarted.profile).toEqual(previous.profile);
  expect(restarted.settings).toEqual(previous.settings);
  await expect(page.getByRole('button', { name: 'Undo placement', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  expect((await readSave(page)).run).toEqual(restarted.run);
});

test('restart cancels a paused live token and subsequent play settles exactly once', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Launch token', exact: true }).click();
  await page.getByRole('button', { name: 'Pause cascade', exact: true }).click();
  expect((await readRun(page)).phase).toBe('dropping');
  await page.getByRole('button', { name: 'Restart level', exact: true }).click();
  await expect(page.locator('.cabinet-board')).toHaveAttribute('data-paused', 'false');
  const restarted = await readRun(page);
  expect(restarted.phase).toBe('ready');
  expect(restarted.totalDrops).toBe(0);
  expect(restarted.totalScore).toBe(0);
  expect(restarted.dropsLeft).toBe(5);
  expect(restarted.retries).toBe(0);
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  const played = await drop(page);
  await page.waitForTimeout(500);
  expect((await readRun(page)).totalDrops).toBe(1);
  expect(played.score).toBe(played.lastDrop!.total);
  expect(played.brass).toBe(0);
});

test('New Workshop uses the existing confirmation and keeps the machine until confirmed', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  await drop(page);
  const previous = await readSave(page);
  await page.getByRole('button', { name: 'New workshop', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'A fresh worktable', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox')).toBeVisible();
  expect((await readRun(page))).toEqual(previous.run);
  await dialog.getByRole('button', { name: 'Keep this machine', exact: true }).click();
  await page.getByRole('button', { name: 'Back to the machine', exact: true }).click();
  expect((await readRun(page))).toEqual(previous.run);
  await page.getByRole('button', { name: 'New workshop', exact: true }).click();
  await dialog.getByRole('textbox').fill('12345');
  await dialog.getByRole('button', { name: 'Start fresh', exact: true }).click();
  const fresh = await readSave(page);
  expect(fresh.run.stage).toBe(0);
  expect(fresh.run.seed).toBe(12345);
  expect(fresh.run.score).toBe(0);
  expect(fresh.run.totalDrops).toBe(0);
  expect(fresh.run.brass).toBe(0);
  expect(fresh.profile).toEqual(previous.profile);
  expect(fresh.settings).toEqual(previous.settings);
});

test('free and purchased copies remain owned and placeable from one stack while the shop stays open', async ({ page }, testInfo) => {
  await openGame(page);
  const shop = await firstShop(page);
  const giftKind = shop.rewardChoices.find((kind) => kind !== 'splitter')!;
  const giftId = `part-${shop.nextId}`;
  await page.getByRole('button', { name: `Choose ${PARTS[giftKind].name}`, exact: true }).click();
  const claimed = await readRun(page);
  const offer = claimed.offers.find((item) => item.kind === giftKind && item.price <= claimed.brass)!;
  const boughtId = `part-${claimed.nextId}`;
  await page.getByRole('button', { name: `Buy ${PARTS[offer.kind].name} for ${offer.price} credits`, exact: true }).click();
  const purchased = await readRun(page);
  const copies = spareStack(page, { kind: giftKind, direction: 1 });
  await expect(page.getByRole('tab', { name: 'Parts counter', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(copies).toHaveCount(1);
  await expect(copies).toHaveAttribute('data-count', '2');
  await expect(copies).toHaveAttribute('aria-pressed', 'true');
  expect(purchased.bench.filter((part) => part.kind === giftKind).map((part) => part.id)).toEqual([giftId, boughtId]);
  await page.locator('[data-slot="6-0"]').click();
  expect((await readRun(page)).board['6-0'].id).toBe(boughtId);
  await expect(copies).toHaveAttribute('data-count', '1');
  await selectSpareStack(page, { kind: giftKind, direction: 1 });
  await page.locator('[data-slot="6-1"]').click();
  const installed = await readRun(page);
  expect(installed.board['6-0'].id).toBe(boughtId);
  expect(installed.board['6-1'].id).toBe(giftId);
  await expect(copies).toHaveCount(0);
  expect(installed.brass).toBe(purchased.brass);
  expect(installed.bench.map((peg) => peg.id)).toEqual(['part-5']);
  await expect(page.getByTestId('installation-capacity')).toContainText('6/7');
  await expect(page.getByTestId('installation-capacity')).toContainText('1 space free');
  await expect(page.getByRole('button', { name: 'Restart level', exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('shop-and-owned-parts.png'), fullPage: true });
});

test('a full machine keeps extra purchases safe and explains when the next installation space opens', async ({ page }, testInfo) => {
  await openGame(page);
  const shop = await firstShop(page);
  await page.getByRole('button', { name: `Choose ${PARTS[shop.rewardChoices[0]].name}`, exact: true }).click();
  for (const offer of [...shop.offers].sort((first, second) => first.price - second.price)) {
    if ((await readRun(page)).brass < offer.price) continue;
    await page.getByRole('button', { name: `Buy ${PARTS[offer.kind].name} for ${offer.price} credits`, exact: true }).click();
  }
  let run = await readRun(page);
  expect(Object.keys(run.board).length + run.bench.length).toBeGreaterThan(commission(run).capacity);
  while (Object.keys(run.board).length < commission(run).capacity) {
    const peg = run.bench[0];
    const slot = SLOTS.find((item) => !run.board[item.id])!;
    await selectSpareStack(page, peg);
    await page.locator(`[data-slot="${slot.id}"]`).click();
    run = await readRun(page);
  }
  const spare = run.bench[0];
  const empty = SLOTS.find((slot) => !run.board[slot.id])!;
  await expect(page.getByTestId('capacity-notice')).toContainText('Machine full: 7/7');
  await expect(page.getByTestId('next-capacity')).toContainText('Next level: 8 installed parts');
  await selectSpareStack(page, spare);
  await page.locator(`[data-slot="${empty.id}"]`).click();
  await expect(page.getByRole('status')).toContainText('Machine full (7/7)');
  expect(await readRun(page)).toEqual(run);
  await page.screenshot({ path: testInfo.outputPath('full-machine-inventory.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next commission', exact: true }).click();
  await expect(page.getByTestId('installation-capacity')).toContainText('7/8');
  await selectSpareStack(page, spare);
  await page.locator(`[data-slot="${empty.id}"]`).click();
  const advanced = await readRun(page);
  expect(advanced.board[empty.id].id).toBe(spare.id);
  expect(advanced.brass).toBe(run.brass);
  await expect(page.getByTestId('installation-capacity')).toContainText('8/8');
});