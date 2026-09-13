import { describe, expect, it } from 'vitest';
import {
  baseValue, buyPart, claimPart, collectCommission, commission, commissionReward,
  dropConfig, launchDrop, newRun, nextCommission, placePeg, recoverInterruptedDrop,
  removePeg, retryCommission, settleDrop, upgradePower, claimPart as claimReward,
  MAX_OWNED_PARTS, salvagePeg, parseMachineSeed, dailySeed, claimTuning, claimCredits, tunePeg, fusePeg,
} from '../src/game/engine';
import { tuningPrice } from '../src/game/content';
import { freshSave, parseSave } from '../src/game/save';
import { simulateDrop } from '../src/game/simulation';
import { auditRoleRecovery, planRoleShop, playRoleCampaign } from '../scripts/roles-balance';

describe('commission economy', () => {
  it('replays displayed numeric seeds exactly and hashes text seeds consistently', () => {
    expect(parseMachineSeed('42')).toBe(42);
    expect(parseMachineSeed(' 0 ')).toBe(0);
    expect(parseMachineSeed('4294967295')).toBe(0xffffffff);
    expect(parseMachineSeed('', 77)).toBe(77);
    expect(parseMachineSeed('pocket')).toBe(dailySeed('pocket'));
  });

  it('keeps learned physical routes stable across commissions', () => {
    const run = newRun(42);
    expect(dropConfig({ ...run, stage: 8 })).toEqual(dropConfig(run));
  });

  it('can finish the first commission from a real untouched initial state', () => {
    let run = newRun(42);
    while (run.phase === 'ready') {
      const config = dropConfig(run);
      run = settleDrop(launchDrop(run), simulateDrop(config));
    }
    expect(run.phase).toBe('review');
    expect(run.totalDrops).toBeLessThanOrEqual(5);
    expect(run.score).toBeGreaterThanOrEqual(commission(run).target);
  });

  it('allows free placement and swapping without duplicating parts', () => {
    const original = newRun(42);
    const installed = placePeg(original, 'part-5', '3-2');
    const swapped = placePeg(installed, 'part-5', '0-3');
    const removed = removePeg(swapped, '0-3');
    const ids = [...Object.values(removed.board), ...removed.bench].map((peg) => peg.id);
    expect(new Set(ids).size).toBe(5);
    expect(ids.length).toBe(5);
    expect(original.bench.length).toBe(1);
  });

  it('rejects board edits and duplicate launches during a drop', () => {
    const run = launchDrop(newRun(42));
    expect(placePeg(run, 'part-5', '3-2')).toBe(run);
    expect(launchDrop(run)).toBe(run);
  });

  it('rewards overshooting without allowing runaway shop currency', () => {
    const run = { ...newRun(42), phase: 'review' as const, score: 1_000_000, dropsLeft: 4 };
    expect(commissionReward(run).total).toBeLessThanOrEqual(commission(run).reward + 6);
    const shop = collectCommission(run);
    expect(shop.brass).toBeGreaterThan(0);
    expect(collectCommission(shop)).toBe(shop);
    expect(shop.phase).toBe('shop');
  });

  it('enforces reward, prices, stock, and power-up affordability', () => {
    const shop = collectCommission({ ...newRun(42), phase: 'review', score: 160 });
    expect(nextCommission(shop)).toBe(shop);
    const claimed = claimPart(shop, shop.rewardChoices[0]);
    expect(claimPart(claimed, claimed.rewardChoices[0])).toBe(claimed);
    const bought = buyPart(claimed, claimed.offers[0].id);
    expect(bought.brass).toBe(claimed.brass - claimed.offers[0].price);
    expect(buyPart(bought, bought.offers[0].id)).toBe(bought);
    expect(buyPart({ ...claimed, brass: 0 }, claimed.offers[0].id).brass).toBe(0);
    const upgraded = upgradePower(shop);
    expect(baseValue(upgraded)).toBeGreaterThan(baseValue(shop));
    expect(nextCommission(claimed).stage).toBe(1);
  });

  it('recovers an interrupted drop without consuming a token or granting points', () => {
    const initial = newRun(84);
    const restored = recoverInterruptedDrop(launchDrop(initial));
    expect(restored.dropsLeft).toBe(initial.dropsLeft);
    expect(restored.score).toBe(0);
    expect(restored.phase).toBe('ready');
    expect(dropConfig(restored)).toEqual(dropConfig(initial));
  });

  it('retry retains the build but cannot farm brass', () => {
    const lost = { ...newRun(42), phase: 'lost' as const, dropsLeft: 0, score: 10, brass: 2 };
    const retried = retryCommission(lost);
    expect(retried.board).toEqual(lost.board);
    expect(retried.brass).toBe(2);
    expect(retried.score).toBe(0);
    expect(baseValue(retried)).toBe(11);
  });

  it('keeps relaxed targets as an initial workshop choice, not a daily setting', () => {
    const relaxed = newRun(42, 'workshop', true);
    expect(relaxed.assisted).toBe(true);
    expect(relaxed.phase).toBe('ready');
    expect(commission(relaxed).target).toBe(65);
    const daily = newRun(42, 'daily', true);
    expect(daily.assisted).toBe(false);
    expect(commission(daily).target).toBe(100);
  });

  it('salvages only spare parts and cannot duplicate brass', () => {
    const initial = newRun(42);
    const salvaged = salvagePeg(initial, 'part-5');
    expect(salvaged.brass).toBe(1);
    expect(salvaged.bench).toHaveLength(0);
    expect(salvagePeg(salvaged, 'part-5')).toBe(salvaged);
    expect(salvagePeg(initial, 'part-1')).toBe(initial);
    const dropping = launchDrop(initial);
    expect(salvagePeg(dropping, 'part-5')).toBe(dropping);
  });

  it('converts a full-inventory complimentary part to brass without blocking progression', () => {
    const initial = collectCommission({ ...newRun(42), phase: 'review', score: 200 });
    const full = { ...initial, nextId: 100, bench: Array.from({ length: MAX_OWNED_PARTS - 4 }, (_, index) => ({ id: `part-${index + 5}`, kind: 'mint' as const, direction: 1 as const })) };
    const claimed = claimReward(full, full.rewardChoices[0]);
    expect(claimed.rewardClaimed).toBe(true);
    expect(claimed.bench.length + Object.keys(claimed.board).length).toBe(MAX_OWNED_PARTS);
    expect(claimed.brass).toBe(full.brass + 2);
    expect(buyPart(full, full.offers[0].id)).toBe(full);
    expect(nextCommission(claimed).phase).toBe('ready');
  });

  it('uses one offered reward to tune an owned part without changing its identity or charging credits', () => {
    const shop = collectCommission({ ...newRun(42), phase: 'review', score: 200 });
    shop.rewardChoices = ['mint', 'doubler', 'splitter'];
    const tuned = claimTuning(shop, 'part-1');
    expect(tuned.board['0-3']).toEqual({ ...shop.board['0-3'], tuned: true });
    expect(tuned.brass).toBe(shop.brass);
    expect(tuned.bench).toEqual(shop.bench);
    expect(tuned.nextId).toBe(shop.nextId);
    expect(tuned.rewardClaimed).toBe(true);
    expect(claimTuning(tuned, 'part-2')).toBe(tuned);
    expect(claimPart(tuned, 'mint')).toBe(tuned);
    expect(claimCredits(tuned)).toBe(tuned);
    expect(claimTuning({ ...shop, rewardChoices: ['splitter'] }, 'part-1').rewardClaimed).toBe(false);
    const parsed = parseSave(JSON.stringify({ ...freshSave(42), run: tuned }));
    expect(parsed?.run.board['0-3'].tuned).toBe(true);
  });

  it('fuses only a matching spare and never duplicates its credit or ownership', () => {
    const ready = removePeg(newRun(42), '1-2');
    const fused = fusePeg(ready, 'part-1', 'part-2');
    expect(fused.board['0-3'].tuned).toBe(true);
    expect(fused.bench.some((part) => part.id === 'part-2')).toBe(false);
    expect(fused.brass).toBe(ready.brass);
    expect(fusePeg(fused, 'part-1', 'part-3')).toBe(fused);
    expect(fusePeg(ready, 'part-1', 'part-1')).toBe(ready);
    expect(fusePeg(ready, 'part-1', 'part-5')).toBe(ready);
    expect(fusePeg(launchDrop(ready), 'part-1', 'part-2').board['0-3'].tuned).toBeUndefined();
    expect(ready.board['0-3'].tuned).toBeUndefined();
  });

  it('charges the exact tuning price once and keeps the free reward independent', () => {
    const shop = collectCommission({ ...newRun(42), phase: 'review', score: 200 });
    const tuned = tunePeg(shop, 'part-1');
    expect(tuned.brass).toBe(shop.brass - tuningPrice('mint'));
    expect(tuned.rewardClaimed).toBe(false);
    expect(tunePeg(tuned, 'part-1')).toBe(tuned);
    expect(tunePeg({ ...shop, brass: 0 }, 'part-1').brass).toBe(0);
    expect(tunePeg(newRun(42), 'part-1').board['0-3'].tuned).toBeUndefined();
    const credits = claimCredits(tuned);
    expect(credits.brass).toBe(tuned.brass + 2);
    expect(claimCredits(credits)).toBe(credits);
  });

  it('opens bounded After Hours capacity milestones without removing the existing build', () => {
    const run = newRun(42);
    expect(commission({ ...run, stage: 11 }).capacity).toBe(13);
    expect([12, 14, 15, 18, 21, 24, 99].map((stage) => commission({ ...run, stage }).capacity))
      .toEqual([14, 14, 15, 16, 17, 18, 18]);
    expect(commission({ ...run, stage: 12 }).target).toBe(97500);
  });

  it('keeps the role-study shop legal and accounts for fused ownership', () => {
    const shop = collectCommission({ ...newRun(42), phase: 'review', score: 200 });
    const result = planRoleShop(shop, 'charge');
    expect(result.run.brass).toBeGreaterThanOrEqual(0);
    expect(result.run.brass).toBeLessThanOrEqual(shop.brass);
    expect(result.run.rewardClaimed).toBe(true);
    expect(result.run.nextId).toBeGreaterThanOrEqual(shop.nextId);
    expect(result.actions.filter((action) => action.type === 'gift' || action.type === 'gift-tune')).toHaveLength(1);
    const copies = Object.keys(result.run.board).length + result.run.bench.length;
    expect(copies).toBe(Object.keys(shop.board).length + shop.bench.length
      + result.actions.filter((action) => action.type === 'gift' || action.type === 'buy').length
      - result.actions.filter((action) => action.type === 'fuse').length);
  });

  it('can progress through the opening with actual role-aware actions', () => {
    const report = playRoleCampaign(42, 'recovery', 3, 0);
    expect(report.cleared).toBe(3);
    expect(report.timeouts).toBe(0);
    expect(report.records.every((stage) => stage.credits >= 0)).toBe(true);
  });

  it('audits a missed target without creating money or changing already capped retry assistance', () => {
    const lost = { ...newRun(42), phase: 'lost' as const, dropsLeft: 0, retries: 3 };
    const audit = auditRoleRecovery(lost)!;
    expect(audit.run.brass).toBe(lost.brass);
    expect(audit.run.power).toBe(lost.power);
    expect(baseValue(audit.run)).toBe(baseValue(lost));
    expect(audit.run.retries).toBe(4);
    expect(lost.dropsLeft).toBe(0);
    expect(audit.after).toBeGreaterThanOrEqual(audit.before);
  });
});