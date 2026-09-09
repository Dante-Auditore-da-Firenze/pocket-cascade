import { describe, expect, it } from 'vitest';
import { PARTS } from '../src/game/content';
import { collectCommission, commission, dropConfig, newRun, rerollShop, type RunState } from '../src/game/engine';
import { freshSave, parseSave } from '../src/game/save';
import { collectWithGiftVariety } from '../scripts/experiments/gift-variety';

function completed(seed: number, stage = 6): RunState {
  const run = newRun(seed);
  return {
    ...run, stage, phase: 'review', score: commission({ ...run, stage }).target,
    bench: [...run.bench, ...Array.from({ length: 3 }, (_, index) => ({ id: `part-${index + 6}`, kind: 'doubler' as const, direction: 1 as const }))],
    nextId: 9,
  };
}

describe('isolated later-gift variety experiment', () => {
  it('leaves the first six shops exactly unchanged, including unlocks and paid stock', () => {
    for (const seed of [1, 42, 2026, 65537, 7, 13, 99, 2027]) {
      for (let stage = 0; stage < 6; stage += 1) {
        const run = completed(seed, stage);
        expect(collectWithGiftVariety(run)).toEqual(collectCommission(run));
      }
    }
  });

  it('changes at most one later choice toward lower total ownership while preserving all other state', () => {
    let changes = 0;
    for (let seed = 0; seed < 512; seed += 1) {
      const run = completed(seed);
      const original = structuredClone(run);
      const baseline = collectCommission(run);
      const candidate = collectWithGiftVariety(run);
      expect(candidate.rewardChoices).toHaveLength(3);
      expect(new Set(candidate.rewardChoices).size).toBe(3);
      expect(candidate.rewardChoices.slice(0, 2)).toEqual(baseline.rewardChoices.slice(0, 2));
      expect({ ...candidate, rewardChoices: baseline.rewardChoices }).toEqual(baseline);
      expect(candidate.rewardChoices.every((kind) => PARTS[kind].unlock <= run.stage + 1)).toBe(true);
      if (candidate.rewardChoices[2] !== baseline.rewardChoices[2]) {
        changes += 1;
        const owned = [...Object.values(run.board), ...run.bench];
        expect(owned.filter((peg) => peg.kind === candidate.rewardChoices[2]).length).toBeLessThan(owned.filter((peg) => peg.kind === baseline.rewardChoices[2]).length);
      }
      expect(run).toEqual(original);
      expect(collectWithGiftVariety(run)).toEqual(candidate);
      expect(dropConfig(candidate)).toEqual(dropConfig(run));
      expect(rerollShop(candidate).offers).toEqual(rerollShop(baseline).offers);
    }
    expect(changes).toBeGreaterThan(0);
    expect(changes).toBeLessThan(128);
  });

  it('counts installed and spare copies equally and never removes duplicate choices altogether', () => {
    let duplicateOffers = 0;
    for (let seed = 0; seed < 128; seed += 1) {
      const run = completed(seed);
      const installed = run.board['2-3'];
      const moved: RunState = { ...run, board: { ...run.board }, bench: [...run.bench, installed] };
      delete moved.board['2-3'];
      expect(collectWithGiftVariety(moved).rewardChoices).toEqual(collectWithGiftVariety(run).rewardChoices);
      duplicateOffers += Number(collectWithGiftVariety(run).rewardChoices.includes('doubler'));
    }
    expect(duplicateOffers).toBeGreaterThan(20);
  });

  it('does not change already saved shops, claimed rewards, final rewards, or After Hours', () => {
    for (let seed = 0; seed < 32; seed += 1) {
      const shop = collectWithGiftVariety(completed(seed));
      const saved = parseSave(JSON.stringify({ ...freshSave(seed), run: shop }));
      expect(saved?.run).toEqual(shop);
      expect(collectWithGiftVariety(saved!.run)).toBe(saved!.run);
      const claimed = { ...shop, rewardClaimed: true };
      expect(collectWithGiftVariety(claimed)).toBe(claimed);
      const final = completed(seed, 11);
      expect(collectWithGiftVariety(final)).toEqual(collectCommission(final));
      const endless = { ...completed(seed, 14), mode: 'endless' as const };
      expect(collectWithGiftVariety(endless)).toEqual(collectCommission(endless));
    }
  });
});