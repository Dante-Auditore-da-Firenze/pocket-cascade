import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH, MAX_TICKS, SLOTS, type Board, type CascadeEvent, type DropConfig, type PegKind, type PhysicalImpact } from '../src/game/model';
import { DropSimulation, simulateDrop } from '../src/game/simulation';

const kinds: PegKind[] = ['mint', 'doubler', 'splitter', 'kicker', 'relay', 'vault', 'echo', 'crown'];
const mixed: Board = Object.fromEntries(SLOTS.map((slot, index) => [slot.id, {
  id: `part-${index}`, kind: kinds[index % kinds.length], direction: index % 2 ? -1 : 1,
}]));
const empty: DropConfig = { board: {}, lane: 4, baseValue: 10, seed: 42 };

function trace(config: DropConfig, batch = 1) {
  const simulation = new DropSimulation(config);
  const impacts: PhysicalImpact[] = [];
  const events: CascadeEvent[] = [];
  let maximumTokens = simulation.tokenViews.length;
  try {
    while (!simulation.done) {
      events.push(...simulation.step(batch));
      impacts.push(...simulation.drainImpacts());
      maximumTokens = Math.max(maximumTokens, simulation.tokenViews.length);
    }
    return { impacts, events, maximumTokens, result: simulation.finish() };
  } finally {
    simulation.dispose();
  }
}

describe('physical contact feedback', () => {
  it('emits passive pegs and real wall contacts on an empty board without scoring them', () => {
    const { impacts, events, result } = trace(empty);
    expect(impacts.filter((impact) => impact.surface === 'peg')).toHaveLength(11);
    expect(impacts.filter((impact) => impact.surface === 'wall')).toHaveLength(2);
    expect(impacts.every((impact) => !impact.scored && impact.kind === undefined)).toBe(true);
    expect(events).toEqual(result.events);
    expect(events.map((event) => event.type)).toEqual(['payout']);
    expect(result).toMatchObject({ total: 10, banked: 0, hits: 0, splits: 0, ticks: 455 });
    expect(result).not.toHaveProperty('impacts');
  });

  it.each([
    { name: 'empty', config: empty, hash: '55499e3fc8d6361a56fdfd1d171f5845ab0b27ba01d930f750d620036347807f' },
    { name: 'mixed center', config: { ...empty, board: mixed, seed: 7 }, hash: '9e1e67c531e9f1bf1edb6934e06d8c1bbf3426a3dca4fecd003964f746397b23' },
    { name: 'mixed edge', config: { ...empty, board: mixed, lane: 0 }, hash: '3d04e3a1a4b02f53a79cfaceb6f0c148fd8c2de8d7d60417bbb679c37467421f' },
  ])('preserves the pre-impact scoring trace and payout for $name', ({ config, hash }) => {
    const before = structuredClone(config);
    const { result, events } = trace(config);
    expect(createHash('sha256').update(JSON.stringify(result)).digest('hex')).toBe(hash);
    expect(result).toEqual(simulateDrop(config));
    expect(events).toEqual(result.events);
    expect(result.total).toBe(result.banked + result.trayTotals.reduce((sum, value) => sum + value, 0));
    expect(config).toEqual(before);
  });

  it('marks exactly the triggering contacts as scored and retains later nontriggering contacts', () => {
    const { impacts, events } = trace({ ...empty, board: mixed, seed: 7 });
    const key = (event: CascadeEvent | PhysicalImpact) => `${event.tick}:${event.tokenId}:${event.slotId}`;
    expect(impacts.filter((impact) => impact.scored).map(key).sort())
      .toEqual(events.filter((event) => event.type === 'hit').map(key).sort());
    const repeats = impacts.filter((impact) => impact.kind && !impact.scored);
    expect(repeats.length).toBeGreaterThan(0);
    for (const impact of repeats) {
      expect(events.some((event) => event.type === 'hit' && event.slotId === impact.slotId && event.tick < impact.tick)).toBe(true);
    }
    const contacts = impacts.map((impact) => `${key(impact)}:${impact.surface}:${impact.x}:${impact.y}`);
    expect(new Set(contacts).size).toBe(contacts.length);
  });

  it('repeats exactly after unrelated simulations and with different step batching', () => {
    const config = { ...empty, board: mixed, seed: 7 };
    const first = trace(config);
    simulateDrop({ ...empty, lane: 8, seed: 99 });
    expect(trace(config)).toEqual(first);
    const batched = trace(config, 7);
    expect(batched.result).toEqual(first.result);
    expect(batched.events).toEqual(first.events);
    expect(batched.impacts).toEqual(first.impacts);
  });

  it('drains once without advancing and replaces undrained feedback at the next step', () => {
    const simulation = new DropSimulation(empty);
    try {
      simulation.step(200);
      const tick = simulation.elapsedTicks;
      expect(simulation.drainImpacts().length).toBeGreaterThan(0);
      expect(simulation.drainImpacts()).toEqual([]);
      expect(simulation.elapsedTicks).toBe(tick);
      simulation.step(100);
      simulation.step();
      expect(simulation.drainImpacts().every((impact) => impact.tick === 301)).toBe(true);
      simulation.step(100);
      simulation.dispose();
      expect(simulation.drainImpacts()).toEqual([]);
    } finally {
      simulation.dispose();
    }
  });

  it('bounds contacts and split populations and never emits contacts for collected tokens', () => {
    const board: Board = Object.fromEntries(SLOTS.map((slot, index) => [slot.id, {
      id: `split-${index}`, kind: 'splitter', direction: 1,
    }]));
    const simulation = new DropSimulation({ ...empty, board, seed: 7 });
    const collected = new Set<number>();
    let maximumTokens = 1;
    let contactCount = 0;
    try {
      while (!simulation.done) {
        const live = new Set(simulation.tokenViews.map((token) => token.id));
        const events = simulation.step();
        const impacts = simulation.drainImpacts();
        maximumTokens = Math.max(maximumTokens, simulation.tokenViews.length);
        for (const impact of impacts) {
          contactCount += 1;
          expect(live.has(impact.tokenId)).toBe(true);
          expect(collected.has(impact.tokenId)).toBe(false);
          expect(impact.tick).toBe(simulation.elapsedTicks);
          expect(impact.strength).toBeGreaterThanOrEqual(0);
          expect(impact.strength).toBeLessThanOrEqual(1);
          expect(impact.x).toBeGreaterThanOrEqual(0);
          expect(impact.x).toBeLessThanOrEqual(BOARD_WIDTH);
          expect(impact.y).toBeGreaterThanOrEqual(0);
          expect(impact.y).toBeLessThanOrEqual(BOARD_HEIGHT);
          if (impact.surface === 'wall') {
            expect(impact.slotId).toBeUndefined();
            expect(impact.scored).toBe(false);
          }
        }
        for (const event of events) if (event.type === 'payout') collected.add(event.tokenId);
        expect(simulation.elapsedTicks).toBeLessThanOrEqual(MAX_TICKS);
      }
      expect(maximumTokens).toBe(4);
      expect(collected.size).toBeLessThanOrEqual(4);
      expect(contactCount).toBeGreaterThan(4);
      const tick = simulation.elapsedTicks;
      const result = simulation.finish();
      expect(simulation.step(120)).toEqual([]);
      expect(simulation.drainImpacts()).toEqual([]);
      expect(simulation.elapsedTicks).toBe(tick);
      expect(simulation.finish()).toEqual(result);
    } finally {
      simulation.dispose();
    }
  });
});