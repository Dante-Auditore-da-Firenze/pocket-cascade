import { test, expect, type Page } from '@playwright/test';
import { PARTS } from '../../src/game/content';
import { drop, openGame, readRun, readSave } from './helpers';

async function reachFirstShop(page: Page) {
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  let run = await readRun(page);
  while (run.phase === 'ready') run = await drop(page);
  expect(run.phase).toBe('review');
  expect(run.brass).toBe(0);
  await page.getByRole('button', { name: 'Visit the workshop', exact: true }).click();
  return readRun(page);
}

test('first-run guide teaches placement, points, one free reward, and actual paid upgrades', async ({ page }, testInfo) => {
  await openGame(page);
  const guide = page.getByTestId('quick-guide');
  await expect(guide).toHaveAttribute('data-step', 'place');
  await expect(page.getByTestId('credits-wallet')).toHaveAttribute('aria-label', '0 Workshop credits');
  await page.getByRole('button', { name: 'Select Fork facing right, 1 available', exact: true }).click();
  await page.locator('[data-slot="6-0"]').click();
  await expect(guide).toHaveAttribute('data-step', 'launch');
  expect((await readSave(page)).profile.seenTutorial).toBe(false);
  const shop = await reachFirstShop(page);
  await expect(guide).toHaveAttribute('data-step', 'gift');
  await expect(page.getByTestId('wallet-change')).toContainText(`+${shop.brass} earned`);
  await expect(page.getByRole('button', { name: 'Next commission', exact: true })).toBeDisabled();
  await expect(page.locator('.free-offer')).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath('first-credit-reward.png'), fullPage: true });
  const gift = shop.rewardChoices[0];
  await page.getByRole('button', { name: `Choose ${PARTS[gift].name}`, exact: true }).click();
  await expect(guide).toHaveAttribute('data-step', 'spend');
  await expect(page.locator('.free-offer')).toHaveCount(0);
  await expect(page.locator('.gift-claimed')).toContainText('Gift collected');
  expect((await readRun(page)).brass).toBe(shop.brass);
  await page.getByRole('button', { name: 'Upgrade token value', exact: true }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.getByTestId('wallet-change')).toContainText('6 spent');
  expect((await readRun(page)).brass).toBe(shop.brass - 6);
  expect((await readRun(page)).power).toBe(1);
  expect((await readSave(page)).profile.seenTutorial).toBe(true);
  await page.reload();
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  await expect(guide).toHaveCount(0);
});

test('guide can be skipped, replayed, and resumed without replacing the machine', async ({ page }) => {
  await openGame(page);
  const original = await readRun(page);
  await page.getByRole('button', { name: 'Skip guide', exact: true }).click();
  await expect(page.getByTestId('quick-guide')).toHaveCount(0);
  expect((await readSave(page)).profile.seenTutorial).toBe(true);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Replay quick guide', exact: true }).click();
  await expect(page.getByTestId('quick-guide')).toHaveAttribute('data-step', 'place');
  expect(await readRun(page)).toEqual(original);
  await page.getByRole('button', { name: 'Select Fork facing right, 1 available', exact: true }).click();
  await page.locator('[data-slot="6-0"]').click();
  await page.reload();
  await expect(page.getByTestId('quick-guide')).toHaveAttribute('data-step', 'launch');
  expect((await readRun(page)).board['6-0'].id).toBe('part-5');
});

test('the guide never requires spending credits or following a prescribed layout', async ({ page }) => {
  await openGame(page);
  const original = await readRun(page);
  const shop = await reachFirstShop(page);
  expect(shop.board).toEqual(original.board);
  await page.getByRole('button', { name: `Choose ${PARTS[shop.rewardChoices[0]].name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Next commission', exact: true }).click();
  await expect(page.getByTestId('quick-guide')).toHaveCount(0);
  expect((await readRun(page)).brass).toBe(shop.brass);
  expect((await readRun(page)).power).toBe(0);
  expect((await readRun(page)).stage).toBe(1);
});

test('reduced motion stays opt-in even when the OS requests it and remains available in Accessibility', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGame(page);
  expect((await readSave(page)).settings.reducedMotion).toBe(false);
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Reduced motion', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Accessibility options', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduced motion', exact: true }).check();
  await page.reload();
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  expect((await readSave(page)).settings.reducedMotion).toBe(true);
});