import { describe, expect, it } from 'vitest';
import { collectCommission, commission, dropConfig, newRun } from '../src/game/engine';
import { simulateDrop } from '../src/game/simulation';
import { inspectAimLanes } from '../scripts/aiming-analysis';
import { collectWithRepeatPrices } from '../scripts/experiments/repeat-prices';
import { studyProgression } from '../scripts/progression-study';
import { playCampaign } from '../scripts/strategies';

describe('aiming balance diagnostics', () => {
  it('measures actual collector arrivals for all nine lanes without mutating the run', () => {
    const run = newRun(42);
    const original = structuredClone(run);
    const inspected = inspectAimLanes(run);
    expect(run).toEqual(original);
    expect(inspected.lanes.map((lane) => lane.lane)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    for (const lane of inspected.lanes) {
      const actual = simulateDrop({ ...dropConfig(run), lane: lane.lane });
      expect(lane.payout).toBe(actual.total);
      expect(lane.centerArrivals).toBe(actual.events.filter((event) => event.type === 'payout' && event.tray === 1).length);
      expect(lane.arrivals.reduce((total, count) => total + count, 0)).toBe(lane.maxTokens);
      expect(lane.payout).toBe(lane.banked + lane.collectors.reduce((total, value) => total + value, 0));
    }
    expect(inspected.best.payout).toBe(Math.max(...inspected.lanes.map((lane) => lane.payout)));
    expect(inspected.centerReachable).toBe(inspected.lanes.some((lane) => lane.centerArrivals > 0));
    expect(inspected.aimGainOverCenter).toBeGreaterThanOrEqual(0);
  });

  it('keeps the learned lane measurements stable when only the commission changes', () => {
    const run = newRun(2026);
    expect(inspectAimLanes({ ...run, stage: 9 }).lanes).toEqual(inspectAimLanes(run).lanes);
  });

  it('replays the default early campaign and constrains fixed-center builds without changing game rules', () => {
    const measured = studyProgression(42, 'conservative', false, 3, 0);
    expect(measured.report).toEqual(playCampaign(42, 'conservative', 3));
    const fixed = studyProgression(42, 'fixed-center', false, 2, 0);
    expect(fixed.builds.every((build) => build.lane === 4)).toBe(true);
    expect(fixed.report.stages.every((stage) => stage.brass >= 0)).toBe(true);
  }, 30_000);
});

describe('isolated repeat-price experiment', () => {
  it('preserves the opening and changes only capped paid duplicate prices', () => {
    let affected = 0;
    for (let seed = 0; seed < 32; seed += 1) {
      for (let stage = 0; stage < 11; stage += 1) {
        const initial = newRun(seed);
        const run = { ...initial, stage, phase: 'review' as const, score: commission({ ...initial, stage }).target, nextId: 16,
          bench: [...initial.bench, ...Array.from({ length: 10 }, (_, index) => ({ id: `part-${index + 6}`, kind: 'doubler' as const, direction: 1 as const }))] };
        const baseline = collectCommission(run);
        const candidate = collectWithRepeatPrices(run);
        expect({ ...candidate, offers: baseline.offers }).toEqual(baseline);
        if (stage < 3) expect(candidate).toEqual(baseline);
        for (const [index, offer] of candidate.offers.entries()) {
          expect(offer.price - baseline.offers[index].price).toBe(stage >= 3 && offer.kind === 'doubler' ? 4 : 0);
          affected += Number(offer.price !== baseline.offers[index].price);
        }
        expect(collectWithRepeatPrices(candidate)).toBe(candidate);
      }
    }
    expect(affected).toBeGreaterThan(0);
  });
});