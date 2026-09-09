import { describe, expect, it } from 'vitest';
import { PART_KINDS } from '../src/game/content';
import { MAX_VALUE, SLOTS, type Board, type PegKind } from '../src/game/model';
import { simulateDrop } from '../src/game/simulation';

function filledBoard(kind: PegKind): Board {
  return Object.fromEntries(SLOTS.map((slot, index) => [slot.id, { id: `part-${index + 1}`, kind, direction: 1 }]));
}

function single(kind: PegKind) {
  return simulateDrop({ board: { '0-3': { id: 'part-1', kind, direction: 1 } }, lane: 4, seed: 42, baseValue: 10 });
}

describe('all eight readable part rules', () => {
  it('Mint adds 140% of base before collection', () => {
    expect(single('mint').events.find((event) => event.type === 'hit')?.amount).toBe(14);
  });

  it('Doubler doubles current value', () => {
    expect(single('doubler').events.find((event) => event.type === 'hit')?.amount).toBe(10);
  });

  it('Fork adds a 75% token and remains limited to two generations', () => {
    const result = single('splitter');
    expect(result.events.find((event) => event.type === 'split')?.amount).toBe(8);
    expect(result.splits).toBe(1);
    const extreme = simulateDrop({ board: filledBoard('splitter'), lane: 4, seed: 42, baseValue: 10 });
    expect(extreme.splits).toBe(3);
    expect(extreme.events.some((event) => event.label === 'x1.25')).toBe(true);
  });

  it('Kicker adds one base value and changes the physical route', () => {
    const result = single('kicker');
    expect(result.events.find((event) => event.type === 'hit')?.amount).toBe(10);
    expect(result.ticks).not.toBe(single('mint').ticks);
  });

  it('Relay counts adjacent installed parts', () => {
    const board: Board = {
      '0-3': { id: 'part-1', kind: 'relay', direction: 1 },
      '0-2': { id: 'part-2', kind: 'mint', direction: 1 },
      '0-4': { id: 'part-3', kind: 'mint', direction: 1 },
      '1-2': { id: 'part-4', kind: 'mint', direction: 1 },
      '1-3': { id: 'part-5', kind: 'mint', direction: 1 },
    };
    const result = simulateDrop({ board, lane: 4, seed: 42, baseValue: 10 });
    expect(result.events.find((event) => event.kind === 'relay' && event.type === 'hit')?.amount).toBe(50);
    expect(single('relay').events.find((event) => event.type === 'hit')?.amount).toBe(10);
  });

  it('Vault banks 50% without reducing the token', () => {
    const result = single('vault');
    expect(result.banked).toBe(5);
    expect(result.events.find((event) => event.type === 'payout')?.amount).toBe(10);
    expect(result.total).toBe(15);
  });

  it('Echo has an additive fallback and repeats the last multiplier', () => {
    expect(single('echo').events.find((event) => event.type === 'hit')?.amount).toBe(10);
    const board = filledBoard('echo');
    board['0-3'].kind = 'doubler';
    const result = simulateDrop({ board, lane: 4, seed: 42, baseValue: 10 });
    const echoes = result.events.filter((event) => event.kind === 'echo');
    expect(echoes.length).toBeGreaterThan(0);
    expect(echoes.every((event) => event.label === 'ECHO x2')).toBe(true);
  });

  it('Crown includes itself in unique part types', () => {
    expect(single('crown').events.find((event) => event.type === 'hit')?.amount).toBe(4);
  });

  it.each(PART_KINDS)('%s extreme boards terminate and reconcile every point', (kind) => {
    for (const seed of [1, 42, 2026]) {
      const result = simulateDrop({ board: filledBoard(kind), lane: 4, seed, baseValue: 260 });
      expect(result.total).toBe(result.banked + result.trayTotals.reduce((sum, amount) => sum + amount, 0));
      expect(result.maxValue).toBeLessThanOrEqual(MAX_VALUE);
      expect(result.splits).toBeLessThanOrEqual(3);
      expect(result.ticks).toBeLessThanOrEqual(1440);
      expect(Number.isSafeInteger(result.total)).toBe(true);
      const hits = result.events.filter((event) => event.type === 'hit').map((event) => `${event.tokenId}:${event.slotId}`);
      expect(new Set(hits).size).toBe(hits.length);
    }
  });
});