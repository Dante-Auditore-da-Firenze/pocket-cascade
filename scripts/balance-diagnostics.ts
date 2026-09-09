import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buyPart, claimPart, dropConfig, placePeg, setLane, upgradePower, type RunState } from '../src/game/engine';
import { SLOTS } from '../src/game/model';
import { simulateDrop } from '../src/game/simulation';
import { collectWithGiftVariety } from './experiments/gift-variety';
import {
  chooseReward, evaluateMachine, planBuild, playCampaign, shopLegally,
  type BuildAction, type CampaignPolicy, type Strategy,
} from './strategies';

export const DIAGNOSTIC_SEEDS = [1, 42, 2026, 65537, 7, 13, 99, 2027] as const;

export function planLocalBuild(input: RunState): ReturnType<typeof planBuild> {
  let run = input;
  const actions: BuildAction[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const observed = simulateDrop(dropConfig(run));
    const contacts = observed.events.filter((event) => event.slotId);
    const hitSlots = new Set(contacts.map((event) => event.slotId));
    const distance = (slot: typeof SLOTS[number]) => Math.min(...contacts.map((event) => Math.hypot(slot.x - event.x, slot.y - event.y)));
    const nearby = SLOTS.filter((slot) => !hitSlots.has(slot.id)).sort((first, second) => distance(first) - distance(second)).slice(0, 5);
    const parts = [...run.bench, ...Object.entries(run.board).filter(([slot]) => !hitSlots.has(slot)).map(([, peg]) => peg)].slice(0, 2);
    const candidates: { run: RunState; action: BuildAction }[] = [];
    for (const lane of [run.lane - 1, run.lane + 1]) {
      if (lane >= 0 && lane <= 8) candidates.push({ run: setLane(run, lane), action: { type: 'lane', lane } });
    }
    for (const peg of parts) {
      for (const slot of nearby) candidates.push({ run: placePeg(run, peg.id, slot.id), action: { type: 'place', pegId: peg.id, slotId: slot.id } });
    }
    let bestScore = observed.total;
    let best: typeof candidates[number] | undefined;
    for (const candidate of candidates) {
      if (candidate.run === run) continue;
      const score = evaluateMachine(candidate.run);
      if (score > bestScore) { best = candidate; bestScore = score; }
    }
    if (!best) break;
    run = best.run;
    actions.push(best.action);
  }
  return { run, actions };
}

function claimOnly(run: RunState, strategy: Strategy): RunState {
  return claimPart(run, chooseReward(run, strategy));
}

function powerOnly(run: RunState, strategy: Strategy): RunState {
  let next = claimOnly(run, strategy);
  while (true) {
    const upgraded = upgradePower(next);
    if (upgraded === next) return next;
    next = upgraded;
  }
}

function partsFirst(run: RunState, strategy: Strategy): RunState {
  let next = claimOnly(run, strategy);
  for (const offer of run.offers) next = buyPart(next, offer.id);
  return upgradePower(next);
}

const frozen: CampaignPolicy['build'] = (run) => ({ run, actions: [] });
const policies: Record<string, { strategy: Strategy; policy: CampaignPolicy }> = {
  beginner: { strategy: 'beginner', policy: {} },
  conservative: { strategy: 'conservative', policy: {} },
  optimized: { strategy: 'optimized', policy: {} },
  splitter: { strategy: 'splitter', policy: {} },
  frozen: { strategy: 'conservative', policy: { build: frozen, shop: claimOnly } },
  'power-only': { strategy: 'conservative', policy: { build: frozen, shop: powerOnly } },
  'local-power': { strategy: 'conservative', policy: { build: planLocalBuild } },
  'local-parts': { strategy: 'conservative', policy: { build: planLocalBuild, shop: partsFirst } },
  'beginner-recovery': { strategy: 'beginner', policy: { build: (run, strategy) => run.retries ? planLocalBuild(run) : planBuild(run, strategy) } },
  'frozen-after-six': {
    strategy: 'optimized',
    policy: { build: (run, strategy) => run.stage < 6 ? planBuild(run, strategy) : frozen(run, strategy), shop: (run, strategy) => run.stage < 5 ? shopLegally(run, strategy) : claimOnly(run, strategy) },
  },
  'power-after-six': {
    strategy: 'optimized',
    policy: { build: (run, strategy) => run.stage < 6 ? planBuild(run, strategy) : frozen(run, strategy), shop: (run, strategy) => run.stage < 5 ? shopLegally(run, strategy) : powerOnly(run, strategy) },
  },
};

function owned(run: RunState) {
  return [...Object.values(run.board), ...run.bench];
}

function layout(run: RunState) {
  return { lane: run.lane, board: Object.fromEntries(Object.entries(run.board).sort(([first], [second]) => first.localeCompare(second))) };
}

export function diagnoseCampaign(seed: number, name: string, stageLimit = 12, collect?: CampaignPolicy['collect']) {
  const chosen = policies[name];
  assert.ok(chosen, `Unknown diagnostic policy: ${name}`);
  const builds: { stage: number; retry: number; before: number; after: number; changed: boolean; actions: BuildAction[]; board: RunState['board']; lane: number; power: number; hitKinds: string[] }[] = [];
  const shops: { stage: number; choices: RunState['rewardChoices']; ownedCounts: Record<string, number>; gift: string; purchases: string[]; powerUpgrades: number; spent: number }[] = [];
  const report = playCampaign(seed, chosen.strategy, stageLimit, {
    ...chosen.policy,
    collect,
    observeBuild(before, after, actions) {
      assert.equal(after.brass, before.brass);
      assert.equal(after.power, before.power);
      assert.deepEqual(owned(after).map((peg) => peg.id).sort(), owned(before).map((peg) => peg.id).sort());
      const result = simulateDrop(dropConfig(after));
      builds.push({ stage: before.stage + 1, retry: before.retries, before: evaluateMachine(before), after: result.total, changed: JSON.stringify(layout(before)) !== JSON.stringify(layout(after)), actions, ...layout(after), power: after.power, hitKinds: [...new Set(result.events.flatMap((event) => event.kind ? [event.kind] : []))] });
    },
    observeShop(before, after) {
      assert.ok(after.brass >= 0 && after.brass <= before.brass);
      const claimed = claimOnly(before, chosen.strategy);
      const ownedCounts: Record<string, number> = {};
      for (const peg of owned(before)) ownedCounts[peg.kind] = (ownedCounts[peg.kind] ?? 0) + 1;
      const gift = claimed.bench.find((peg) => !owned(before).some((existing) => existing.id === peg.id));
      shops.push({ stage: before.stage + 1, choices: before.rewardChoices, ownedCounts, gift: gift?.kind ?? 'credits', purchases: after.offers.filter((offer) => offer.sold && !before.offers.find((previous) => previous.id === offer.id)?.sold).map((offer) => offer.kind), powerUpgrades: after.power - before.power, spent: before.brass - after.brass });
    },
  });
  assert.ok(report.maxTokens <= 4 && report.timeouts === 0 && Number.isSafeInteger(report.totalScore));
  return { name, seed, report, builds, shops };
}

async function main() {
  const { values, positionals } = parseArgs({ options: { 'gift-variety': { type: 'boolean', default: false } }, allowPositionals: true });
  assert.ok(positionals.length <= 1, 'Supply at most one report filename.');
  const candidate = values['gift-variety'];
  const filename = positionals[0] ?? `${candidate ? 'gift-variety' : 'baseline'}-${Date.now()}.json`;
  assert.ok(filename && /^[a-z0-9-]+\.json$/.test(filename), 'Supply a new report filename, e.g. baseline.json.');
  const directory = path.resolve('artifacts/balance/experiments');
  const output = path.join(directory, filename);
  await mkdir(directory, { recursive: true });
  const { open } = await import('node:fs/promises');
  const reservation = await open(output, 'wx');
  await reservation.close();
  const runs: ReturnType<typeof diagnoseCampaign>[] = [];
  for (const name of Object.keys(policies)) {
    for (const seed of DIAGNOSTIC_SEEDS) {
      const result = diagnoseCampaign(seed, name, 12, candidate ? collectWithGiftVariety : undefined);
      runs.push(result);
      console.log(`${name.padEnd(18)} seed=${String(seed).padEnd(6)} cleared=${result.report.stagesCleared}/12 drops=${result.report.totalDrops} edits=${result.builds.filter((build) => build.changed).length} best=${result.report.bestDrop}`);
    }
  }
  await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), candidate: candidate ? 'third-gift-variety-25-percent-after-six-shops' : 'unchanged', seeds: DIAGNOSTIC_SEEDS, limits: { localEditsPerBuild: 2, localCandidatesPerEdit: 12, retriesPerCommission: 3 }, runs }, null, 2));
  console.log(`Saved ${runs.length} legal campaign diagnostics to ${output}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();