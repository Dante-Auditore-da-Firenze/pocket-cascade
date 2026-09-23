import { test, expect } from '@playwright/test';
import { PARTS } from '../../src/game/content';
import { commission, commissionReward, dropConfig } from '../../src/game/engine';
import { simulateDrop } from '../../src/game/simulation';
import { planRoleBuild, planRoleShop } from '../../scripts/roles-balance';
import { createTrialEvaluator, observeDrop } from '../../scripts/structural-study';
import { applyRoleEdits, applyRoleShop, canvasPixels, drop, openGame, readRun, readSave } from './helpers';

test('plays the reworked campaign with earned tuning, fusion, recovery and After Hours milestones', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openGame(page);
  expect((await readRun(page)).lane).toBe(0);
  await page.getByRole('button', { name: 'Aim lane 5', exact: true }).click();
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  await page.getByRole('button', { name: 'Skip guide', exact: true }).click();
  const evaluator = createTrialEvaluator('baseline');
  let contacts: string[] = [];
  let tuned = 0;
  let fused = 0;
  let middleRecoveries = 0;
  for (let stage = 0; stage < 16; stage += 1) {
    let run = await readRun(page);
    expect(run.stage).toBe(stage);
    await expect(page.getByRole('progressbar', { name: 'Commission progress', exact: true })).toHaveAttribute('aria-valuemax', String(commission(run).target));
    while (run.phase === 'ready' || run.phase === 'lost') {
      if (run.phase === 'lost') {
        expect(run.retries).toBeLessThan(3);
        await page.getByRole('button', { name: 'Retry commission', exact: true }).click();
        run = await readRun(page);
      }
      const plan = planRoleBuild(run, 'recovery', contacts, evaluator.evaluate);
      if (stage >= 3 && stage <= 8 && run.score + run.dropsLeft * evaluator.evaluate(run) < commission(run).target
        && plan.actions.some((action) => action.type === 'swap' || action.type === 'move' || action.type === 'rotate')) middleRecoveries += 1;
      await applyRoleEdits(page, plan.actions);
      run = await readRun(page);
      expect(run).toEqual(plan.run);
      const expected = simulateDrop(dropConfig(run));
      contacts = observeDrop(run, 'baseline').contacts;
      run = await drop(page);
      expect(run.lastDrop).toEqual(expected);
      expect(Object.keys(run.board).length).toBeLessThanOrEqual(commission(run).capacity);
    }
    expect(run.phase, `Commission ${stage + 1} should complete`).toBe('review');
    if (stage === 5) await page.screenshot({ path: testInfo.outputPath('mid-campaign.png'), fullPage: true });
    const earned = commissionReward(run).total;
    const beforeCredits = run.brass;
    await page.getByRole('button', { name: stage === 11 ? 'Complete the machine' : 'Visit the workshop', exact: true }).click();
    expect((await readRun(page)).brass).toBe(beforeCredits + earned);
    if (stage === 11) {
      await expect(page.getByRole('heading', { name: 'Workshop complete', exact: true })).toBeVisible();
      const completed = await readSave(page);
      expect(completed.profile.achievements).toContain('WORKSHOP_COMPLETE');
      expect(completed.profile.completedRuns).toBe(1);
      await page.screenshot({ path: testInfo.outputPath('completed-machine.png'), fullPage: true });
      await page.reload();
      await expect(page.getByRole('button', { name: 'Stay after hours', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Stay after hours', exact: true }).click();
    }
    if (stage === 15) break;
    await expect(page.getByRole('button', { name: 'Next commission', exact: true })).toBeDisabled();
    run = await readRun(page);
    const desired = planRoleShop(run, 'recovery', evaluator.evaluate);
    tuned += desired.actions.filter((action) => action.type === 'tune' || action.type === 'gift-tune').length;
    fused += desired.actions.filter((action) => action.type === 'fuse').length;
    await applyRoleShop(page, desired.actions);
    expect(await readRun(page)).toEqual(desired.run);
    await page.getByRole('button', { name: 'Next commission', exact: true }).click();
    await expect(page.locator('.cabinet-board')).toHaveAttribute('data-phase', 'ready');
  }
  expect(tuned).toBeGreaterThan(0);
  expect(fused).toBeGreaterThan(0);
  expect(middleRecoveries).toBeGreaterThan(0);
  await expect(page.getByTestId('installation-capacity')).toContainText('/15');
  expect((await canvasPixels(page)).colors).toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Collect credits', exact: true }).click();
  const saved = await readSave(page);
  await page.reload();
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  expect((await readRun(page))).toEqual(saved.run);
  await page.screenshot({ path: testInfo.outputPath('after-hours-machine.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('the retired trial URL opens normal saved gameplay without a hidden balance mode', async ({ page }) => {
  await openGame(page, 77);
  const original = await readRun(page);
  await page.goto('/?balanceTrial=space-pressure&seed=42');
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  await expect(page.getByTestId('game-ready')).not.toHaveAttribute('data-balance-trial');
  expect(await readRun(page)).toEqual(original);
  await page.getByRole('button', { name: 'Part collection', exact: true }).click();
  await expect(page.getByRole('heading', { name: PARTS.dividend.name, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: PARTS.junction.name, exact: true })).toBeVisible();
});