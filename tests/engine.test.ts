import { describe, expect, it } from 'vitest';
import {
  baseValue, buyPart, claimPart, collectCommission, commission, commissionReward,
  dropConfig, launchDrop, newRun, nextCommission, placePeg, recoverInterruptedDrop,
  removePeg, retryCommission, settleDrop, upgradePower, claimPart as claimReward,
  MAX_OWNED_PARTS, salvagePeg, parseMachineSeed, dailySeed,
} from '../src/game/engine';
import { simulateDrop } from '../src/game/simulation';

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
});