import { test, expect } from '@playwright/test';
import { PARTS, PART_KINDS, TUNINGS, tuningPrice } from '../../src/game/content';
import { SLOTS } from '../../src/game/model';
import { collectCommission, commission, MAX_OWNED_PARTS } from '../../src/game/engine';
import { freshSave, SAVE_KEY } from '../../src/game/save';
import { drop, openGame, readRun, selectSpareStack } from './helpers';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 700 }]) {
  test(`earned free reward opens, can be inspected, and claims exactly once at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGame(page);
    await page.getByRole('button', { name: '4x speed', exact: true }).click();
    let run = await readRun(page);
    while (run.phase === 'ready') run = await drop(page);
    expect(run.phase).toBe('review');
    await page.getByRole('button', { name: 'Visit the workshop', exact: true }).click();
    const shop = await readRun(page);
    const dialog = page.getByRole('dialog', { name: 'Choose a reward', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.free-offer')).toHaveCount(3);
    for (const kind of shop.rewardChoices) {
      const owned = [...Object.values(shop.board), ...shop.bench].filter((part) => part.kind === kind).length;
      await expect(dialog.getByRole('button', { name: `Choose ${PARTS[kind].name}`, exact: true })).toHaveAccessibleDescription(`${PARTS[kind].description} ${owned} owned`);
    }
    await expect(dialog.getByRole('button', { name: /^Buy / })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next commission', exact: true })).toBeDisabled();
    for (const symbol of await dialog.locator('.part-symbol').all()) {
      await expect(symbol).toHaveCSS('width', viewport.width > 580 ? '64px' : '48px');
      await expect(symbol.locator('img')).toHaveJSProperty('complete', true);
    }
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: testInfo.outputPath('reward-choices.png') });
    await dialog.getByRole('button', { name: 'Inspect machine', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Choose free part', exact: true })).toBeFocused();
    expect(await readRun(page)).toEqual(shop);
    await page.getByRole('button', { name: 'Choose free part', exact: true }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Choose free part', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await page.reload();
    await expect(dialog).toBeVisible();
    expect((await readRun(page)).rewardChoices).toEqual(shop.rewardChoices);
    await page.getByRole('button', { name: `Choose ${PARTS[shop.rewardChoices[0]].name}`, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const claimed = await readRun(page);
    expect(claimed.brass).toBe(shop.brass);
    expect(claimed.bench).toHaveLength(shop.bench.length + 1);
    expect(claimed.offers).toEqual(shop.offers);
    expect(claimed.rewardClaimed).toBe(true);
    await expect(page.getByRole('button', { name: 'Next commission', exact: true })).toBeEnabled();
    await page.reload();
    await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
    await expect(dialog).toHaveCount(0);
    expect((await readRun(page)).bench).toEqual(claimed.bench);
  });
}

test('full storage converts a pending reward once without adding a part', async ({ page }) => {
  const save = freshSave(42);
  save.run = collectCommission({ ...save.run, phase: 'review', score: 100 });
  save.run.bench = Array.from({ length: MAX_OWNED_PARTS - 4 }, (_, index) => ({ id: `part-${index + 5}`, kind: 'mint', direction: 1 }));
  save.run.nextId = MAX_OWNED_PARTS + 1;
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, data);
  }, { key: SAVE_KEY, data: JSON.stringify(save) });
  await openGame(page);
  const dialog = page.getByRole('dialog', { name: 'Parts storage full', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.free-offer')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Collect credits', exact: true }).click();
  const claimed = await readRun(page);
  expect(claimed.brass).toBe(save.run.brass + 2);
  expect(claimed.bench).toEqual(save.run.bench);
  expect(claimed.rewardClaimed).toBe(true);
  await page.reload();
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  await expect(dialog).toHaveCount(0);
  expect((await readRun(page)).brass).toBe(claimed.brass);
});

test('After Hours opens the final earned gift using the same choice workflow', async ({ page }) => {
  const save = freshSave(42);
  const final = { ...save.run, stage: 11 };
  save.run = collectCommission({ ...final, phase: 'review', score: commission(final).target });
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, data);
  }, { key: SAVE_KEY, data: JSON.stringify(save) });
  await openGame(page);
  await page.getByRole('button', { name: 'Stay after hours', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Choose a reward', exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Choose ${PARTS[save.run.rewardChoices[0]].name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Next commission', exact: true }).click();
  const run = await readRun(page);
  expect(run.mode).toBe('endless');
  expect(run.stage).toBe(12);
  expect(run.brass).toBe(save.run.brass);
});

test('importing a pending reward opens its existing choices without rerolling or charging', async ({ page }) => {
  await openGame(page);
  const imported = freshSave(99);
  imported.run = collectCommission({ ...imported.run, phase: 'review', score: 100 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Import save file', { exact: true }).setInputFiles({
    name: 'pending-reward.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)),
  });
  const dialog = page.getByRole('dialog', { name: 'Choose a reward', exact: true });
  await expect(dialog).toBeVisible();
  expect(await readRun(page)).toEqual(imported.run);
  await dialog.getByRole('button', { name: `Choose ${PARTS[imported.run.rewardChoices[0]].name}`, exact: true }).click();
  const claimed = await readRun(page);
  expect(claimed.brass).toBe(imported.run.brass);
  expect(claimed.offers).toEqual(imported.run.offers);
  expect(claimed.nextId).toBe(imported.run.nextId + 1);
  expect(claimed.rewardClaimed).toBe(true);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`earned tuning selects a specific copy, keeps credits, and saves at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGame(page);
    await page.getByRole('button', { name: '4x speed', exact: true }).click();
    let run = await readRun(page);
    while (run.phase === 'ready') run = await drop(page);
    await page.getByRole('button', { name: 'Visit the workshop', exact: true }).click();
    const shop = await readRun(page);
    await page.getByRole('button', { name: 'Tune owned part', exact: true }).click();
    await page.getByLabel('Mint tuning target', { exact: true }).selectOption('part-2');
    await expect(page.getByRole('button', { name: 'Tune Mint', exact: true })).toHaveAccessibleDescription(TUNINGS.mint.description);
    await page.screenshot({ path: testInfo.outputPath('tuning-reward.png') });
    await page.getByRole('button', { name: 'Tune Mint', exact: true }).click();
    const tuned = await readRun(page);
    expect(tuned.board['1-2']).toEqual({ ...shop.board['1-2'], tuned: true });
    expect(tuned.brass).toBe(shop.brass);
    expect(tuned.bench).toEqual(shop.bench);
    expect(tuned.nextId).toBe(shop.nextId);
    expect(tuned.rewardClaimed).toBe(true);
    await page.getByRole('button', { name: 'Deselect part', exact: true }).click();
    await page.locator('[data-slot="0-3"]').click();
    await page.getByRole('button', { name: `Tune Mint for ${tuningPrice('mint')} credits`, exact: true }).click();
    const paid = await readRun(page);
    expect(paid.brass).toBe(tuned.brass - tuningPrice('mint'));
    expect(paid.board['0-3'].tuned).toBe(true);
    await expect(page.getByRole('button', { name: 'Undo placement', exact: true })).toBeDisabled();
    await page.reload();
    await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
    expect(await readRun(page)).toEqual(paid);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('fusion consumes one spare and placement undo cannot restore the sacrificed copy', async ({ page }) => {
  await openGame(page);
  await page.locator('[data-slot="1-2"]').click();
  await page.getByRole('button', { name: 'To worktable', exact: true }).click();
  await page.locator('[data-slot="0-3"]').click();
  await page.getByRole('button', { name: 'Fuse spare Mint', exact: true }).click();
  const fused = await readRun(page);
  expect(fused.board['0-3'].tuned).toBe(true);
  expect(fused.bench.some((part) => part.id === 'part-2')).toBe(false);
  expect(fused.brass).toBe(0);
  await expect(page.getByRole('button', { name: 'Undo placement', exact: true })).toBeDisabled();
  await page.locator('[data-slot="6-0"]').click();
  await page.getByRole('button', { name: 'Undo placement', exact: true }).click();
  expect(await readRun(page)).toEqual(fused);
  await page.reload();
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  expect(await readRun(page)).toEqual(fused);
});

test('After Hours grants its next earned slot and keeps a new reward placeable at capacity', async ({ page }, testInfo) => {
  const save = freshSave(42);
  save.run.mode = 'endless';
  save.run.stage = 14;
  save.run.phase = 'review';
  save.run.score = commission(save.run).target;
  save.run.board = Object.fromEntries(SLOTS.slice(0, 14).map((slot, index) => [slot.id, { id: `part-${index + 1}`, kind: PART_KINDS[index % PART_KINDS.length], direction: 1 as const }]));
  save.run.bench = [];
  save.run.nextId = 15;
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), { key: SAVE_KEY, data: JSON.stringify(save) });
  await openGame(page);
  await page.getByRole('button', { name: 'Visit the workshop', exact: true }).click();
  const shop = await readRun(page);
  await page.getByRole('button', { name: `Choose ${PARTS[shop.rewardChoices[0]].name}`, exact: true }).click();
  await expect(page.getByTestId('next-capacity')).toContainText('Next level: 15 installed parts');
  await page.getByRole('button', { name: 'Next commission', exact: true }).click();
  const ready = await readRun(page);
  await expect(page.getByTestId('installation-capacity')).toContainText('14/15');
  await selectSpareStack(page, ready.bench[0]);
  await page.locator(`[data-slot="${SLOTS.find((slot) => !ready.board[slot.id])!.id}"]`).click();
  await expect(page.getByTestId('installation-capacity')).toContainText('15/15');
  await expect(page.getByTestId('capacity-milestone')).toContainText('After Hours 7: 16 installed parts');
  await page.screenshot({ path: testInfo.outputPath('after-hours-expansion.png'), fullPage: true });
});