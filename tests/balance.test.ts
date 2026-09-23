import { describe, expect, it } from 'vitest';
import { claimPart, commission, newRun, upgradePower } from '../src/game/engine';
import { chooseReward, evaluateMachine, planBuild, playCampaign, shopLegally } from '../scripts/strategies';
import { diagnoseCampaign, planLocalBuild } from '../scripts/balance-diagnostics';
import { playRoleCampaign } from '../scripts/roles-balance';

describe('legal-play balance checks', () => {
  it('places the first free part without making the initial machine worse', () => {
    const run = newRun(42);
    const improved = planBuild(run, 'conservative').run;
    expect(evaluateMachine(improved)).toBeGreaterThanOrEqual(evaluateMachine(run));
    expect([...Object.values(improved.board), ...improved.bench]).toHaveLength(5);
    expect(run.bench).toHaveLength(1);
    expect(improved.brass).toBe(0);
  });

  it('the early upgrade loop remains attainable with actual purchases', () => {
    const report = playCampaign(42, 'conservative', 3);
    expect(report.stagesCleared).toBe(3);
    expect(report.maxTokens).toBeLessThanOrEqual(4);
    expect(report.timeouts).toBe(0);
    expect(report.stages.every((stage) => stage.brass >= 0)).toBe(true);
    expect(report.bestDrop).toBeGreaterThan(100);
  }, 30_000);

  it('replays the centered-opening recovery campaign with earned tuning and needed middle-campaign edits', () => {
    const result = playRoleCampaign(42, 'recovery', 12, 0, false, 4);
    expect(result.openingLane).toBe(4);
    expect(result.won).toBe(true);
    expect(result.cleared).toBe(12);
    expect(result.records.map((stage) => stage.stage)).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    expect(result.timeouts).toBe(0);
    expect(Number.isSafeInteger(result.finalRun.totalScore)).toBe(true);
    for (const stage of result.records) {
      expect(stage.won, `Commission ${stage.stage}`).toBe(true);
      expect(stage.credits).toBeGreaterThanOrEqual(0);
      expect(Object.keys(stage.board).length).toBeLessThanOrEqual(commission({ stage: stage.stage - 1, assisted: false }).capacity);
    }
    expect(result.shops).toHaveLength(11);
    for (const shop of result.shops) {
      expect(shop.spent).toBeGreaterThanOrEqual(0);
      expect(shop.actions.filter((action) => action.type === 'gift' || action.type === 'gift-tune')).toHaveLength(1);
    }
    expect(result.builds.some((build) => build.stage >= 4 && build.stage <= 9 && build.needed && build.changedInstalled)).toBe(true);
    expect(result.builds.every((build) => build.after >= build.before)).toBe(true);
    expect(result.shops.some((shop) => shop.actions.some((action) => action.type === 'fuse' || action.type === 'gift-tune'))).toBe(true);
  }, 90_000);

  it('uses the real new-run lane unless a diagnostic explicitly chooses another opening', () => {
    const result = playRoleCampaign(42, 'recovery', 1, 0);
    expect(result.openingLane).toBe(0);
    expect(result.cleared).toBe(1);
    expect(() => playRoleCampaign(42, 'recovery', 1, 0, false, 9)).toThrow();
  });

  it('diagnostic hooks preserve the default campaign and cannot mutate observations into currency', () => {
    const baseline = playCampaign(42, 'conservative', 3);
    const stages: number[] = [];
    const observed = playCampaign(42, 'conservative', 3, {
      build: planBuild,
      shop: shopLegally,
      observeBuild(before, after, actions) {
        stages.push(before.stage);
        before.brass = 1_000_000;
        after.board = {};
        actions.length = 0;
      },
      observeShop(before, after) {
        expect(after.brass).toBeLessThanOrEqual(before.brass);
        before.brass = 1_000_000;
        after.brass = 1_000_000;
      },
    });
    expect(observed).toEqual(baseline);
    expect(stages).toEqual([0, 1, 2]);
  }, 30_000);

  it('can isolate a frozen starting layout and affordable power without injecting parts or money', () => {
    const starting = newRun(42);
    const report = playCampaign(42, 'conservative', 3, {
      build: (run) => ({ run, actions: [] }),
      shop: (run, strategy) => upgradePower(claimPart(run, chooseReward(run, strategy))),
      observeBuild(_before, after) {
        expect(after.board).toEqual(starting.board);
        expect(after.lane).toBe(starting.lane);
      },
      observeShop(before, after) {
        expect(after.brass).toBeGreaterThanOrEqual(0);
        expect(after.brass).toBeLessThanOrEqual(before.brass);
        expect(after.offers).toEqual(before.offers);
        expect(after.bench).toHaveLength(before.bench.length + 1);
      },
    });
    expect(report.maxTokens).toBeLessThanOrEqual(4);
    expect(report.timeouts).toBe(0);
    expect(report.stages.every((stage) => stage.parts === 4)).toBe(true);
  }, 30_000);

  it('limits local experiments to two improving legal edits and preserves the input', () => {
    const run = newRun(42);
    const original = structuredClone(run);
    const result = planLocalBuild(run);
    expect(result.actions.length).toBeLessThanOrEqual(2);
    expect(evaluateMachine(result.run)).toBeGreaterThanOrEqual(evaluateMachine(run));
    expect(result.run.brass).toBe(0);
    expect([...Object.values(result.run.board), ...result.run.bench].map((peg) => peg.id).sort()).toEqual([...Object.values(run.board), ...run.bench].map((peg) => peg.id).sort());
    expect(run).toEqual(original);
  });

  it('records actual gifts, purchases, placements, and payouts without changing baseline results', () => {
    const result = diagnoseCampaign(42, 'conservative', 3);
    expect(result.report).toEqual(playCampaign(42, 'conservative', 3));
    expect(result.builds).toHaveLength(3);
    expect(result.shops).toHaveLength(3);
    for (const shop of result.shops) {
      expect(shop.choices).toContain(shop.gift);
      expect(shop.spent).toBeGreaterThanOrEqual(0);
    }
  }, 30_000);
});