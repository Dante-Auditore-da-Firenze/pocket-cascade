import { test, expect } from '@playwright/test';
import { PARTS } from '../../src/game/content';
import { chooseReward, planBuild, shopLegally } from '../../scripts/strategies';
import { applyBuild, drop, openGame, readRun, readSave } from './helpers';

test('plays all twelve commissions through real controls, then enters After Hours', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openGame(page);
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  for (let stage = 0; stage < 12; stage += 1) {
    let run = await readRun(page);
    expect(run.stage).toBe(stage);
    const plan = planBuild(run, 'conservative');
    await applyBuild(page, plan.actions);
    run = await readRun(page);
    while (run.phase === 'ready') run = await drop(page);
    expect(run.phase, `Commission ${stage + 1} should complete`).toBe('review');
    if (stage === 5) await page.screenshot({ path: testInfo.outputPath('mid-campaign.png'), fullPage: true });
    await page.getByRole('button', { name: stage === 11 ? 'Complete the machine' : 'Visit the workshop', exact: true }).click();
    if (stage === 11) break;
    await expect(page.getByRole('button', { name: 'Next commission', exact: true })).toBeDisabled();
    run = await readRun(page);
    const desired = shopLegally(run, 'conservative');
    const kind = chooseReward(run, 'conservative');
    await page.getByRole('button', { name: `Choose ${PARTS[kind].name}`, exact: true }).click();
    if (desired.power > run.power) await page.getByRole('button', { name: 'Upgrade token value', exact: true }).click();
    for (const offer of desired.offers.filter((item) => item.sold)) {
      await page.getByRole('button', { name: `Buy ${PARTS[offer.kind].name} for ${offer.price} credits`, exact: true }).click();
    }
    expect((await readRun(page)).brass).toBe(desired.brass);
    await page.getByRole('button', { name: 'Next commission', exact: true }).click();
    await expect(page.locator('.cabinet-board')).toHaveAttribute('data-phase', 'ready');
  }
  await expect(page.getByRole('heading', { name: 'Look what you made.', exact: true })).toBeVisible();
  const completed = await readSave(page);
  expect(completed.run.phase).toBe('won');
  expect(completed.profile.achievements).toContain('WORKSHOP_COMPLETE');
  expect(completed.profile.completedRuns).toBe(1);
  expect(completed.run.totalDrops).toBeGreaterThanOrEqual(12);
  await page.screenshot({ path: testInfo.outputPath('completed-machine.png'), fullPage: true });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Stay after hours', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stay after hours', exact: true }).click();
  expect((await readRun(page)).mode).toBe('endless');
  expect((await readRun(page)).phase).toBe('shop');
  expect(errors).toEqual([]);
});