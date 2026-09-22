import { describe, expect, it } from 'vitest';
import { PART_KINDS } from '../src/game/content';
import { MAX_CHARGE, MAX_VALUE, SLOTS, type Board, type PegKind } from '../src/game/model';
import { DropSimulation, simulateDrop } from '../src/game/simulation';

function filledBoard(kind: PegKind): Board {
  return Object.fromEntries(SLOTS.map((slot, index) => [slot.id, { id: `part-${index + 1}`, kind, direction: 1 }]));
}

function single(kind: PegKind) {
  return simulateDrop({ board: { '0-3': { id: 'part-1', kind, direction: 1 } }, lane: 4, seed: 42, baseValue: 10 });
}

function sequence(kinds: PegKind[], tunedIndex = -1): Board {
  const route = simulateDrop({ board: filledBoard('mint'), lane: 4, seed: 42, baseValue: 10 })
    .events.filter((event) => event.type === 'hit').map((event) => event.slotId!);
  return Object.fromEntries(kinds.map((kind, index) => [route[index], { id: `part-${index + 1}`, kind, direction: 1, ...(index === tunedIndex ? { tuned: true } : {}) }]));
}

describe('interdependent part rules', () => {
  it('reports actual missing inputs separately from successful triggers without changing points', () => {
    for (const [kind, reason] of [['doubler', 'charge'], ['crown', 'charge'], ['echo', 'memory'], ['dividend', 'reserve']] as const) {
      const result = single(kind);
      expect(result.events.find((event) => event.type === 'hit')?.blocked).toBe(reason);
      expect(result.events.find((event) => event.type === 'hit')?.amount).toBe(0);
    }
    expect(single('mint').events.every((event) => !event.blocked)).toBe(true);
    expect(single('junction').events.find((event) => event.type === 'hit')?.arrivals).toBe(1);
    const insured = simulateDrop({ board: { '0-3': { id: 'part-1', kind: 'crown', direction: 1, tuned: true } }, seed: 42, lane: 4, baseValue: 10 });
    expect(insured.events.every((event) => !event.blocked)).toBe(true);
  });

  it('Mint adds 140% of base before collection', () => {
    expect(single('mint').events.find((event) => event.type === 'hit')?.amount).toBe(14);
  });

  it('Doubler needs a generator and cannot chain without charge', () => {
    expect(single('doubler').events.find((event) => event.type === 'hit')?.label).toBe('NEEDS CHARGE');
    const board = filledBoard('doubler');
    board['0-3'].kind = 'mint';
    const result = simulateDrop({ board, lane: 4, seed: 42, baseValue: 10 });
    expect(result.events.filter((event) => event.kind === 'doubler' && event.amount > 0)).toHaveLength(1);
    expect(result.events.find((event) => event.kind === 'doubler')?.amount).toBe(24);
  });

  it('Fork adds a 75% token and remains limited to two generations', () => {
    const result = single('splitter');
    expect(result.events.find((event) => event.type === 'split')?.amount).toBe(8);
    expect(result.splits).toBe(1);
    const extreme = simulateDrop({ board: filledBoard('splitter'), lane: 4, seed: 42, baseValue: 10 });
    expect(extreme.splits).toBe(3);
    expect(extreme.events.some((event) => event.label === '+1 CHARGE')).toBe(true);
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

  it('Echo consumes its memory rather than feeding another Echo', () => {
    expect(single('echo').events.find((event) => event.type === 'hit')?.label).toBe('NO EFFECT');
    const board = filledBoard('echo');
    board['0-3'].kind = 'mint';
    const result = simulateDrop({ board, lane: 4, seed: 42, baseValue: 10 });
    const echoes = result.events.filter((event) => event.kind === 'echo');
    expect(echoes.length).toBeGreaterThan(0);
    expect(echoes.filter((event) => event.amount > 0)).toHaveLength(1);
    expect(echoes[0].label).toBe('ECHO +14');
  });

  it('Crown cannot multiply without two charges', () => {
    expect(single('crown').events.find((event) => event.type === 'hit')?.label).toBe('NEEDS 2 CHARGE');
  });

  it('Dividend cashes each bank reserve once without removing banked points', () => {
    const board = filledBoard('dividend');
    board['0-3'].kind = 'vault';
    const result = simulateDrop({ board, lane: 4, seed: 42, baseValue: 10 });
    expect(result.banked).toBe(5);
    expect(result.events.filter((event) => event.kind === 'dividend' && event.amount > 0)).toHaveLength(1);
    expect(result.events.find((event) => event.kind === 'dividend')?.amount).toBe(10);
    expect(single('dividend').events.find((event) => event.type === 'hit')?.label).toBe('NO RESERVE');
  });

  it('Junction requires two real branches at the same part before paying a join bonus', () => {
    expect(single('junction').banked).toBe(0);
    const board = filledBoard('junction');
    board['0-3'].kind = 'splitter';
    board['1-3'].kind = 'splitter';
    const result = simulateDrop({ board, lane: 4, seed: 42, baseValue: 10 });
    const bonuses = result.events.filter((event) => event.type === 'bank' && event.kind === 'junction');
    expect(bonuses.length).toBeGreaterThan(0);
    expect(new Set(bonuses.map((event) => event.slotId)).size).toBe(bonuses.length);
    for (const bonus of bonuses) {
      expect(new Set(result.events.filter((event) => event.type === 'hit' && event.slotId === bonus.slotId && event.tick <= bonus.tick).map((event) => event.tokenId)).size).toBeGreaterThanOrEqual(2);
    }
    expect(simulateDrop({ board, lane: 4, seed: 42, baseValue: 10 })).toEqual(result);
  });

  it('tuning changes the generator role without changing its added value', () => {
    const ordinary = single('mint');
    const tuned = simulateDrop({ board: { '0-3': { id: 'part-1', kind: 'mint', direction: 1, tuned: true } }, lane: 4, seed: 42, baseValue: 10 });
    expect(tuned.total).toBe(ordinary.total);
    expect(tuned.events.find((event) => event.type === 'hit')?.charge).toBe(2);
    expect(ordinary.events.find((event) => event.type === 'hit')?.charge).toBe(1);
  });

  it('orders generators and amplifiers, caps charge, and spends Echo memory exactly once', () => {
    const result = simulateDrop({ board: sequence(['mint', 'mint', 'mint', 'mint', 'doubler', 'echo', 'echo', 'crown']), seed: 42, lane: 4, baseValue: 10 });
    const hits = result.events.filter((event) => event.type === 'hit');
    expect(hits.slice(0, 4).map((event) => event.charge)).toEqual([1, 2, 3, 3]);
    expect(hits[4].label).toBe('x2 / -1 CHARGE');
    expect(hits[5].label).toBe('ECHO x2');
    expect(hits[6].label).toBe('NO EFFECT');
    expect(hits[7].label).toBe('NEEDS 2 CHARGE');
  });

  it('Vault uses charge for deposits and tuned Dividend restores charge after a single cash-out', () => {
    const result = simulateDrop({ board: sequence(['mint', 'mint', 'vault', 'dividend', 'dividend', 'doubler'], 3), seed: 42, lane: 4, baseValue: 10 });
    expect(result.banked).toBe(38);
    const dividends = result.events.filter((event) => event.type === 'hit' && event.kind === 'dividend');
    expect(dividends.map((event) => event.amount)).toEqual([76, 0]);
    expect(dividends[0].charge).toBe(2);
    expect(result.events.find((event) => event.kind === 'doubler')?.amount).toBe(114);
  });

  it('tuned Vault retains one charge and tuned Echo restores a spent charge', () => {
    const vault = simulateDrop({ board: sequence(['mint', 'vault', 'doubler'], 1), seed: 42, lane: 4, baseValue: 10 });
    expect(vault.events.find((event) => event.type === 'hit' && event.kind === 'vault')?.charge).toBe(1);
    expect(vault.events.find((event) => event.kind === 'doubler')?.amount).toBe(24);
    const echo = simulateDrop({ board: sequence(['mint', 'mint', 'doubler', 'echo', 'doubler'], 3), seed: 42, lane: 4, baseValue: 10 });
    expect(echo.events.find((event) => event.kind === 'echo')?.charge).toBe(1);
    expect(echo.events.filter((event) => event.kind === 'doubler').at(-1)?.amount).toBe(152);
  });

  it('tuned routing and insurance bank extra value without losing tokens', () => {
    for (const [kind, deposit] of [['kicker', 10], ['crown', 10]] as const) {
      const result = simulateDrop({ board: { '0-3': { id: 'part-1', kind, direction: 1, tuned: true } }, seed: 42, lane: 4, baseValue: 10 });
      expect(result.banked).toBe(deposit);
      expect(result.events.filter((event) => event.type === 'payout')).toHaveLength(1);
    }
  });

  it('Fork divides existing charge while Starter supplies only the new branch', () => {
    for (const tuned of [false, true]) {
      const simulation = new DropSimulation({ board: sequence(['mint', 'splitter'], tuned ? 1 : -1), seed: 42, lane: 4, baseValue: 10 });
      let split = false;
      try {
        while (!simulation.done && !split) split = simulation.step().some((event) => event.type === 'split');
        expect(split).toBe(true);
        expect(simulation.tokenViews.reduce((sum, token) => sum + (token.charge ?? 0), 0)).toBe(tuned ? 2 : 1);
      } finally { simulation.dispose(); }
    }
  });

  it('tuned crossfeed transfers charge to another live branch deterministically', () => {
    const board = Object.fromEntries(Object.entries(filledBoard('doubler')).map(([slot, part]) => [slot, { ...part, tuned: true }]));
    board['0-3'].kind = 'splitter';
    const config = { board, seed: 42, lane: 4, baseValue: 10 };
    const result = simulateDrop(config);
    expect(result.events.filter((event) => event.kind === 'doubler' && event.amount > 0).length).toBeGreaterThan(1);
    expect(result.events.filter((event) => event.type === 'hit').every((event) => (event.charge ?? 0) <= MAX_CHARGE)).toBe(true);
    expect(simulateDrop(config)).toEqual(result);
  });

  it.each(PART_KINDS)('keeps tuned %s effects bounded and repeatable', (kind) => {
    const board = Object.fromEntries(Object.entries(filledBoard(kind)).map(([slot, part]) => [slot, { ...part, tuned: true }]));
    const config = { board, seed: 99, lane: 4, baseValue: MAX_VALUE };
    const result = simulateDrop(config);
    expect(result.total).toBe(result.banked + result.trayTotals.reduce((sum, value) => sum + value, 0));
    expect(result.maxValue).toBeLessThanOrEqual(MAX_VALUE);
    expect(result.splits).toBeLessThanOrEqual(3);
    expect(result.ticks).toBeLessThanOrEqual(1440);
    expect(result.events.every((event) => event.charge === undefined || event.charge >= 0 && event.charge <= MAX_CHARGE)).toBe(true);
    expect(simulateDrop(config)).toEqual(result);
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