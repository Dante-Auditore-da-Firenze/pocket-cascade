import { describe, expect, it, vi } from 'vitest';
import { collectCommission, commission, commissionReward, dropConfig, launchDrop, newRun, settleDrop } from '../src/game/engine';
import { PART_KINDS } from '../src/game/content';
import { MAX_VALUE, SLOTS, type DropConfig } from '../src/game/model';
import { DropSimulation, simulateDrop } from '../src/game/simulation';
import { freshSave, updateProgress } from '../src/game/save';
import { planBuild } from '../scripts/strategies';
import { BALANCE_TRIALS, trialCapacity, trialCommission, trialSimulationOptions } from '../src/game/balance-trial';
import { createTrialEvaluator, fillObservedTrail, fitTrialCapacity, playStructural } from '../scripts/structural-study';

describe('isolated structural balance tooling', () => {
  it('preserves the ordinary builder when no constraints are supplied', () => {
    const run = newRun(42);
    expect(planBuild(run, 'conservative')).toEqual(planBuild(run, 'conservative', undefined, {}));
  });

  it('respects a smaller installation limit without changing ownership or currency', () => {
    const run = newRun(42);
    const result = planBuild(run, 'optimized', 4, { maxInstalled: 4 });
    expect(Object.keys(result.run.board)).toHaveLength(4);
    expect([...Object.values(result.run.board), ...result.run.bench].map((part) => part.id).sort())
      .toEqual([...Object.values(run.board), ...run.bench].map((part) => part.id).sort());
    expect(result.run.brass).toBe(run.brass);
    expect(result.run.power).toBe(run.power);
    expect(run).toEqual(newRun(42));
    expect(() => planBuild(run, 'optimized', 4, { maxInstalled: 3 })).toThrow('installation limit');
  });

  it('uses the same supplied evaluator for placement and both lane searches', () => {
    const run = newRun(42);
    const evaluate = vi.fn((candidate: typeof run) => Object.keys(candidate.board).length * 100 + candidate.lane);
    const result = planBuild(run, 'conservative', undefined, { maxInstalled: 5, evaluate });
    expect(result.run.lane).toBe(8);
    expect(Object.keys(result.run.board)).toHaveLength(5);
    expect(evaluate).toHaveBeenCalled();
    expect(evaluate.mock.calls.every(([candidate]) => Object.keys(candidate.board).length <= 5)).toBe(true);
  });

  it('leaves ordinary simulation unchanged unless bonus sockets are supplied', () => {
    const config = dropConfig(newRun(42));
    expect(simulateDrop(config, { boostedSockets: [] })).toEqual(simulateDrop(config));
    expect(() => simulateDrop(config, { boostedSockets: ['not-a-socket'] })).toThrow('Unknown boosted socket');
  });

  it('applies a socket bonus once before its equipped effect without changing the physical route', () => {
    const config: DropConfig = { seed: 42, lane: 4, baseValue: 10, board: { '0-3': { id: 'part-1', kind: 'vault', direction: 1 } } };
    const ordinary = simulateDrop(config);
    const boosted = simulateDrop(config, { boostedSockets: ['0-3', '0-3'] });
    expect(ordinary.total).toBe(15);
    expect(boosted.total).toBe(30);
    expect(boosted.banked).toBe(10);
    expect(boosted.hits).toBe(ordinary.hits);
    expect(boosted.ticks).toBe(ordinary.ticks);
    expect(boosted.events.map(({ type, tick, x, y, tokenId, slotId, tray }) => ({ type, tick, x, y, tokenId, slotId, tray })))
      .toEqual(ordinary.events.map(({ type, tick, x, y, tokenId, slotId, tray }) => ({ type, tick, x, y, tokenId, slotId, tray })));
    const mutableSockets = ['0-3'];
    const simulation = new DropSimulation(config, { boostedSockets: mutableSockets });
    mutableSockets.length = 0;
    expect(simulation.finish()).toEqual(boosted);
    simulation.dispose();
    expect(simulateDrop({ ...config, board: {} }, { boostedSockets: ['0-3'] })).toEqual(simulateDrop({ ...config, board: {} }));
  });

  it.each(PART_KINDS)('keeps boosted %s accounting and token limits at extreme values', (kind) => {
    const config: DropConfig = {
      seed: 42, lane: 4, baseValue: MAX_VALUE,
      board: Object.fromEntries(SLOTS.map((slot, index) => [slot.id, { id: `part-${index + 1}`, kind, direction: 1 }])),
    };
    const result = simulateDrop(config, { boostedSockets: SLOTS.map((slot) => slot.id) });
    expect(result.total).toBe(result.banked + result.trayTotals.reduce((sum, value) => sum + value, 0));
    expect(Number.isSafeInteger(result.total)).toBe(true);
    expect(result.maxValue).toBeLessThanOrEqual(MAX_VALUE);
    expect(result.splits).toBeLessThanOrEqual(3);
    expect(result.ticks).toBeLessThanOrEqual(1440);
    const hits = result.events.filter((event) => event.type === 'hit').map((event) => `${event.tokenId}:${event.slotId}`);
    expect(new Set(hits).size).toBe(hits.length);
  });

  it('keeps capacity schedules within the normal board and bonus locations fixed', () => {
    for (const trial of BALANCE_TRIALS) {
      const run = newRun(42);
      for (let stage = 0; stage < 15; stage += 1) {
        expect(trialCapacity({ ...run, stage }, trial)).toBeGreaterThanOrEqual(7);
        expect(trialCapacity({ ...run, stage }, trial)).toBeLessThanOrEqual(trialCapacity({ ...run, stage }, 'baseline'));
      }
      expect(trialSimulationOptions(trial)).toEqual(trialSimulationOptions(trial));
    }
    expect(trialCapacity({ ...newRun(42), stage: 11 }, 'space')).toBe(11);
    expect(trialCapacity({ ...newRun(42), stage: 5 }, 'checkpoints')).toBe(7);
  });

  it('limits trail filling to observed empty sockets and caches exact scoring', () => {
    const run = newRun(42);
    const evaluator = createTrialEvaluator('sockets');
    const expected = simulateDrop(dropConfig(run), trialSimulationOptions('sockets')).total;
    expect(evaluator.evaluate(run)).toBe(expected);
    expect(evaluator.evaluate(structuredClone(run))).toBe(expected);
    expect(evaluator.statistics()).toEqual({ simulations: 1, cacheHits: 1 });
    const built = fillObservedTrail(run, 'sockets', ['6-0', '6-1'], evaluator.evaluate);
    expect(built.actions.every((action) => action.type === 'place' && ['6-0', '6-1'].includes(action.to!))).toBe(true);
    for (const [slotId, part] of Object.entries(run.board)) expect(built.run.board[slotId]).toEqual(part);
  });

  it('counts compulsory capacity fitting separately and retains every part', () => {
    const run = newRun(42);
    run.stage = 5;
    run.board = Object.fromEntries(SLOTS.slice(0, 10).map((slot, index) => [slot.id, { id: `fixture-${index}`, kind: 'mint', direction: 1 }]));
    const fitted = fitTrialCapacity(run, 'checkpoints', createTrialEvaluator('checkpoints').evaluate);
    expect(fitted.actions).toHaveLength(3);
    expect(Object.keys(fitted.run.board)).toHaveLength(7);
    expect(fitted.run.bench).toHaveLength(run.bench.length + 3);
    expect(fitted.run.brass).toBe(run.brass);
  });

  it('reproduces the protected capacity-only opening with actual earned progression', () => {
    const original = playStructural(42, 'baseline', 'trail', 3, 0);
    const candidate = playStructural(42, 'space', 'trail', 3, 0);
    expect(candidate.stages).toEqual(original.stages);
    expect(candidate.shops).toEqual(original.shops);
    expect(candidate.campaignCleared).toBe(3);
    expect(candidate.timeouts).toBe(0);
    expect(candidate.maxTokens).toBeLessThanOrEqual(4);
  });

  it('uses the trial target consistently for settlement and earned overdrive credits', () => {
    let run = newRun(42);
    run.stage = 3;
    run.power = 3;
    const definition = { ...commission(run), target: commission(run).target + 100 };
    const result = simulateDrop(dropConfig(run));
    run.score = commission(run).target - result.total;
    const active = launchDrop(run);
    expect(settleDrop(active, result).phase).toBe('review');
    const settled = settleDrop(active, result, definition);
    expect(settled.phase).toBe('ready');
    const complete = { ...settled, phase: 'review' as const, score: definition.target * 1.5, dropsLeft: 2 };
    expect(commissionReward(complete, definition).overdrive).toBe(1);
    expect(collectCommission(complete, definition).brass).toBe(complete.brass + definition.reward + 2 + 1);
    expect(collectCommission(collectCommission(complete, definition), definition).brass).toBe(complete.brass + definition.reward + 3);
    for (let stage = 0; stage < 3; stage += 1) {
      const opening = { ...newRun(42), stage };
      expect(trialCommission(opening, 'space-pressure')).toEqual(commission(opening));
    }
    expect(trialCommission({ ...newRun(42), stage: 12 }, 'pressure').target).toBeGreaterThan(109100);
  });

  it('keeps recovery-only play on the same opening trail until improvement is needed', () => {
    const trail = playStructural(42, 'space-pressure', 'trail', 3, 0);
    const recovery = playStructural(42, 'space-pressure', 'recovery', 3, 0);
    expect(recovery.stages).toEqual(trail.stages);
    expect(recovery.shops).toEqual(trail.shops);
  });

  it('uses the trial target for overdrive achievements without modifying the normal profile', () => {
    const save = freshSave(42);
    const run = { ...save.run, stage: 3, score: commission({ ...save.run, stage: 3 }).target * 2 };
    expect(updateProgress(save, run).profile.achievements).toContain('OVERDRIVE');
    expect(updateProgress(save, run, { ...commission(run), target: run.score }).profile.achievements).not.toContain('OVERDRIVE');
    expect(save.profile.achievements).not.toContain('OVERDRIVE');
  });

  it('can test alternate earned shopping preferences without changing the default policy', () => {
    const ordinary = playStructural(42, 'space-pressure', 'recovery', 3, 0);
    const alternate = playStructural(42, 'space-pressure', 'recovery', 3, 0, undefined, 'conservative');
    expect(ordinary.shopping).toBe('optimized');
    expect(alternate.shopping).toBe('conservative');
    expect(alternate.campaignCleared).toBe(3);
    expect(alternate.stages.every((stage) => stage.credits >= 0)).toBe(true);
  });
});