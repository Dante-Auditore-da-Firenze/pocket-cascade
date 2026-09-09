import { PART_KINDS, PARTS } from '../../src/game/content';
import { collectCommission, type RunState } from '../../src/game/engine';
import { random, type PegKind } from '../../src/game/model';

export function collectWithGiftVariety(run: RunState): RunState {
  const shop = collectCommission(run);
  if (shop === run || shop.phase !== 'shop' || run.mode === 'endless' || run.stage < 6 || run.stage >= 11) return shop;
  const seeded = random(run.seed + run.stage * 661 + 461);
  if (seeded() >= 0.25) return shop;
  const owned = [...Object.values(run.board), ...run.bench];
  const count = (kind: PegKind) => owned.filter((peg) => peg.kind === kind).length;
  const replaced = shop.rewardChoices[2];
  const alternatives = PART_KINDS.filter((kind) => PARTS[kind].unlock <= run.stage + 1
    && !shop.rewardChoices.includes(kind) && count(kind) < count(replaced));
  if (!alternatives.length) return shop;
  const alternative = alternatives[Math.floor(seeded() * alternatives.length)];
  return { ...shop, rewardChoices: [shop.rewardChoices[0], shop.rewardChoices[1], alternative] };
}