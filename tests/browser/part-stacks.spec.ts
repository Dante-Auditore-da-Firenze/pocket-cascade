import { test, expect, type Page } from '@playwright/test';
import type { Peg } from '../../src/game/model';
import { freshSave, SAVE_KEY } from '../../src/game/save';
import { openGame, readRun } from './helpers';

const duplicateSpares: Peg[] = [
  { id: 'part-6', kind: 'mint', direction: 1 },
  { id: 'part-7', kind: 'echo', direction: 1 },
  { id: 'part-8', kind: 'mint', direction: 1 },
  { id: 'part-9', kind: 'echo', direction: 1 },
  { id: 'part-10', kind: 'mint', direction: 1 },
  { id: 'part-11', kind: 'splitter', direction: 1 },
  { id: 'part-12', kind: 'echo', direction: 1 },
  { id: 'part-13', kind: 'splitter', direction: 1 },
  { id: 'part-14', kind: 'relay', direction: 1 },
];

async function openInventory(page: Page, spares = duplicateSpares): Promise<void> {
  const save = freshSave(42);
  save.run.bench = structuredClone(spares);
  save.run.nextId = Math.max(6, ...spares.map((part) => Number(part.id.slice(5)) + 1));
  save.profile.seenTutorial = true;
  save.profile.tutorialStep = 'done';
  await page.addInitScript(({ key, json }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, json);
  }, { key: SAVE_KEY, json: JSON.stringify(save) });
  await openGame(page);
}

test('nine saved spares render as four counted icons without merging or changing the save', async ({ page }, testInfo) => {
  await openInventory(page);
  const inventory = page.getByTestId('part-inventory');
  await expect(inventory.locator('.bench-part')).toHaveCount(4);
  await expect(inventory.getByRole('button', { name: 'Select Mint, 3 available', exact: true })).toBeVisible();
  await expect(inventory.getByRole('button', { name: 'Select Echo, 3 available', exact: true })).toBeVisible();
  await expect(inventory.getByRole('button', { name: 'Select Fork facing right, 2 available', exact: true })).toBeVisible();
  await expect(inventory.getByRole('button', { name: 'Select Relay, 1 available', exact: true })).toBeVisible();
  await expect(inventory.locator('[data-stack="mint"] [data-testid="stack-count"]')).toHaveText('x3');
  await expect(inventory.locator('.section-heading')).toContainText('9');
  expect((await readRun(page)).bench).toEqual(duplicateSpares);
  expect((await readRun(page)).brass).toBe(0);
  await inventory.screenshot({ path: testInfo.outputPath('spare-stacks.png') });
});

test('placing, returning, undoing, and reloading move one real copy at a time', async ({ page }) => {
  await openInventory(page);
  const mint = page.getByTestId('part-inventory').locator('[data-stack="mint"]');
  await mint.click();
  await expect(mint).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-slot="6-0"]').click();
  await expect(mint).toHaveAttribute('data-count', '2');
  expect((await readRun(page)).board['6-0'].id).toBe('part-6');
  await expect(mint).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Undo placement', exact: true }).click();
  await expect(mint).toHaveAttribute('data-count', '3');
  await page.getByRole('button', { name: 'Redo placement', exact: true }).click();
  await expect(mint).toHaveAttribute('data-count', '2');
  await page.locator('[data-slot="6-0"]').click();
  await page.getByRole('button', { name: 'To worktable', exact: true }).click();
  await expect(mint).toHaveAttribute('data-count', '3');
  const before = await readRun(page);
  await page.reload();
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  expect(await readRun(page)).toEqual(before);
  await expect(mint).toHaveAttribute('data-count', '3');
});

test('rotating one copy changes its directional stack, not every Fork', async ({ page }) => {
  await openInventory(page);
  const right = page.getByTestId('part-inventory').locator('[data-stack="splitter:right"]');
  const left = page.getByTestId('part-inventory').locator('[data-stack="splitter:left"]');
  await right.click();
  await page.locator('.part-inspector').getByRole('button', { name: 'Right', exact: true }).click();
  await expect(right).toHaveAttribute('data-count', '1');
  await expect(left).toHaveAttribute('data-count', '1');
  await expect(left).toHaveAttribute('aria-pressed', 'true');
  const rotated = await readRun(page);
  expect(rotated.bench.find((part) => part.id === 'part-11')?.direction).toBe(-1);
  expect(rotated.bench.find((part) => part.id === 'part-13')?.direction).toBe(1);
  await page.getByRole('button', { name: 'Undo placement', exact: true }).click();
  await expect(left).toHaveCount(0);
  await expect(right).toHaveAttribute('data-count', '2');
  await right.click();
  await page.locator('.part-inspector').getByRole('button', { name: 'Right', exact: true }).click();
  await page.locator('.part-inspector').getByRole('button', { name: 'Left', exact: true }).click();
  await expect(left).toHaveCount(0);
  await expect(right).toHaveAttribute('data-count', '2');
  await expect(right).toHaveAttribute('aria-pressed', 'true');
});

test('salvage decrements only one copy and the last copy removes the stack', async ({ page }) => {
  await openInventory(page, [
    { id: 'part-6', kind: 'mint', direction: 1 },
    { id: 'part-7', kind: 'mint', direction: 1 },
  ]);
  const mint = page.getByTestId('part-inventory').locator('[data-stack="mint"]');
  await mint.click();
  await page.getByRole('button', { name: 'Salvage part for 1 credit', exact: true }).click();
  await expect(mint).toHaveAttribute('data-count', '1');
  expect((await readRun(page)).brass).toBe(1);
  expect((await readRun(page)).bench.map((part) => part.id)).toEqual(['part-7']);
  await expect(page.getByRole('button', { name: 'Undo placement', exact: true })).toBeDisabled();
  await mint.click();
  await page.getByRole('button', { name: 'Salvage part for 1 credit', exact: true }).click();
  await expect(mint).toHaveCount(0);
  await expect(page.getByTestId('part-inventory')).toContainText('No spare parts.');
  expect((await readRun(page)).brass).toBe(2);
  expect((await readRun(page)).bench).toHaveLength(0);
});

test('grouped spares remain disabled during a drop and a stack can be deselected normally', async ({ page }) => {
  await openInventory(page);
  const mint = page.getByTestId('part-inventory').locator('[data-stack="mint"]');
  await mint.click();
  await expect(mint).toHaveAttribute('aria-pressed', 'true');
  await mint.click();
  await expect(mint).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.part-inspector')).toHaveCount(0);
  const before = (await readRun(page)).bench;
  await page.getByRole('button', { name: 'Launch token', exact: true }).click();
  await page.getByRole('button', { name: 'Pause cascade', exact: true }).click();
  await expect(mint).toBeDisabled();
  expect((await readRun(page)).bench).toEqual(before);
  await page.getByRole('button', { name: 'Restart level', exact: true }).click();
  await expect(mint).toBeEnabled();
  await expect(mint).toHaveAttribute('data-count', '3');
});

for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`quantity badges stay distinct from scoring symbols at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openInventory(page, [
      ...Array.from({ length: 73 }, (_, index) => ({ id: `part-${index + 6}`, kind: 'mint' as const, direction: 1 as const })),
      ...Array.from({ length: 3 }, (_, index) => ({ id: `part-${index + 79}`, kind: 'doubler' as const, direction: 1 as const })),
    ]);
    const inventory = page.getByTestId('part-inventory');
    await expect(inventory.locator('.bench-part')).toHaveCount(2);
    const doubler = inventory.locator('[data-stack="doubler"]');
    await expect(doubler.locator('.part-symbol')).toHaveText('x2');
    await expect(doubler.getByTestId('stack-count')).toHaveText('x3');
    await expect(inventory.locator('[data-stack="mint"] [data-testid="stack-count"]')).toHaveText('x73');
    await inventory.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    const buttonBounds = (await doubler.boundingBox())!;
    const badgeBounds = (await doubler.getByTestId('stack-count').boundingBox())!;
    const symbolBounds = (await doubler.locator('.part-symbol').boundingBox())!;
    expect(badgeBounds.y + badgeBounds.height).toBeLessThanOrEqual(symbolBounds.y);
    expect(badgeBounds.x).toBeGreaterThanOrEqual(buttonBounds.x);
    expect(badgeBounds.x + badgeBounds.width).toBeLessThanOrEqual(buttonBounds.x + buttonBounds.width);
    await inventory.screenshot({ path: testInfo.outputPath('quantity-and-multiplier.png') });
    await doubler.focus();
    await doubler.press('Enter');
    await expect(doubler).toHaveAttribute('aria-pressed', 'true');
  });
}