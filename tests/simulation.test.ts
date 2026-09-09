import { describe, expect, it } from 'vitest';
import { MAX_TICKS, SLOTS, type Board } from '../src/game/model';
import { DropSimulation, simulateDrop } from '../src/game/simulation';

const starter: Board = {
  '0-3': { id: 'mint-1', kind: 'mint', direction: 1 },
  '1-2': { id: 'mint-2', kind: 'mint', direction: 1 },
  '1-3': { id: 'double-1', kind: 'doubler', direction: 1 },
};

describe('fixed-step cascade', () => {
  it('replays identical launches exactly, including after unrelated simulations', () => {
    const config = { board: starter, lane: 4, baseValue: 10, seed: 42 };
    const first = simulateDrop(config);
    simulateDrop({ ...config, seed: 939, lane: 2 });
    expect(simulateDrop(config)).toEqual(first);
  });

  it('an early mint strictly improves payout without changing the physical route', () => {
    const blank = simulateDrop({ board: {}, lane: 4, baseValue: 10, seed: 42 });
    const upgraded = simulateDrop({ board: { '0-3': starter['0-3'] }, lane: 4, baseValue: 10, seed: 42 });
    expect(upgraded.hits).toBeGreaterThan(0);
    expect(upgraded.total).toBeGreaterThan(blank.total);
    expect(upgraded.ticks).toBe(blank.ticks);
    expect(upgraded.events.at(-1)?.tray).toBe(blank.events.at(-1)?.tray);
  });

  it('bank plus tray totals reconcile exactly', () => {
    const board: Board = Object.fromEntries(SLOTS.map((slot, index) => [slot.id, {
      id: `part-${index}`, kind: index % 3 === 0 ? 'vault' : index % 3 === 1 ? 'splitter' : 'doubler', direction: 1,
    }]));
    const result = simulateDrop({ board, lane: 4, baseValue: 10, seed: 7 });
    expect(result.total).toBe(result.banked + result.trayTotals.reduce((sum, value) => sum + value, 0));
    expect(result.splits).toBeLessThanOrEqual(3);
    expect(result.ticks).toBeLessThanOrEqual(MAX_TICKS);
    expect(Number.isSafeInteger(result.total)).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });

  it('animation frame batching does not change the outcome', () => {
    const config = { board: starter, lane: 4, baseValue: 10, seed: 18 };
    const simulation = new DropSimulation(config);
    while (!simulation.done) simulation.step(7);
    expect(simulation.finish()).toEqual(simulateDrop(config));
    simulation.dispose();
  });

  it('never mutates the installed board', () => {
    const before = structuredClone(starter);
    simulateDrop({ board: starter, lane: 4, baseValue: 10, seed: 2 });
    expect(starter).toEqual(before);
  });
});