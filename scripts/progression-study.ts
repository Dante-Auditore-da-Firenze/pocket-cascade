import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import {
  claimPart, collectCommission, commission, dropConfig, enterEndless, launchDrop,
  nextCommission, retryCommission, settleDrop, type RunState,
} from '../src/game/engine';
import { simulateDrop } from '../src/game/simulation';
import { chooseReward, evaluateMachine, planBuild, playCampaign, shopLegally, type RunReport, type Strategy } from './strategies';
import { collectWithRepeatPrices } from './experiments/repeat-prices';

const SEEDS = [1, 42, 2026, 65537, 7, 13, 99, 2027] as const;
const POLICIES = ['beginner', 'conservative', 'optimized', 'splitter', 'frozen-after-six', 'fixed-center'] as const;
type StudyPolicy = typeof POLICIES[number];

export function studyProgression(seed: number, policy: StudyPolicy, candidate = false, campaignStages = 12, continuationStages = 5) {
  const strategy: Strategy = policy === 'frozen-after-six' || policy === 'fixed-center' ? 'optimized' : policy;
  const frozen = policy === 'frozen-after-six';
  const builds: { stage: number; retry: number; before: number; after: number; edits: number; lane: number }[] = [];
  const shops: { stage: number; credits: number; spent: number; bought: string[]; powerUpgrades: number }[] = [];
  const build = (run: RunState) => frozen && run.stage >= 6 ? { run, actions: [] } : planBuild(run, strategy, policy === 'fixed-center' ? 4 : undefined);
  const shop = (run: RunState) => frozen && run.stage >= 5 ? claimPart(run, chooseReward(run, strategy)) : shopLegally(run, strategy);
  let finished: RunState | null = null;
  const collect = (run: RunState) => {
    const result = candidate ? collectWithRepeatPrices(run) : collectCommission(run);
    if (result.phase === 'won') finished = structuredClone(result);
    return result;
  };
  const report = playCampaign(seed, strategy, campaignStages, {
    build, shop, collect,
    observeBuild(before, after, actions) {
      assert.equal(after.brass, before.brass);
      assert.equal(after.power, before.power);
      const ids = (run: RunState) => [...Object.values(run.board), ...run.bench].map((peg) => peg.id).sort();
      assert.deepEqual(ids(after), ids(before));
      builds.push({ stage: before.stage + 1, retry: before.retries, before: evaluateMachine(before), after: evaluateMachine(after), edits: actions.length, lane: after.lane });
    },
    observeShop(before, after) {
      assert.ok(after.brass >= 0 && after.brass <= before.brass);
      shops.push({ stage: before.stage + 1, credits: before.brass, spent: before.brass - after.brass, bought: after.offers.filter((offer) => offer.sold).map((offer) => offer.kind), powerUpgrades: after.power - before.power });
    },
  });
  const continuation: { stage: number; target: number; passed: boolean; drops: number; payout: number; centerArrivals: number; credits: number }[] = [];
  let continuationTimeouts = 0;
  if (finished && continuationStages > 0) {
    let run = enterEndless(finished);
    for (let stage = 0; stage < continuationStages; stage += 1) {
      run = build(nextCommission(shop(run))).run;
      const startingDrops = run.totalDrops;
      let centerArrivals = 0;
      while (run.phase === 'ready' || run.phase === 'lost') {
        if (run.phase === 'lost') {
          if (run.retries >= 3) break;
          run = build(retryCommission(run)).run;
        }
        const result = simulateDrop(dropConfig(run));
        continuationTimeouts += Number(result.timedOut);
        assert.ok(result.splits <= 3 && Number.isSafeInteger(result.total));
        centerArrivals += result.events.filter((event) => event.type === 'payout' && event.tray === 1).length;
        run = settleDrop(launchDrop(run), result);
      }
      continuation.push({ stage: run.stage + 1, target: commission(run).target, passed: run.phase === 'review', drops: run.totalDrops - startingDrops, payout: run.score, centerArrivals, credits: run.brass });
      if (run.phase !== 'review') break;
      run = collect(run);
    }
  }
  assert.ok(report.maxTokens <= 4 && Number.isSafeInteger(report.totalScore));
  return { seed, policy, report, builds, shops, continuation, continuationTimeouts };
}

async function main() {
  const { values } = parseArgs({ options: { candidate: { type: 'boolean', default: false } } });
  const candidate = values.candidate;
  const historical = JSON.parse(await readFile('artifacts/balance/experiments/baseline-2026-09-09.json', 'utf8')) as { runs: { name: string; seed: number; report: RunReport }[] };
  const runs: ReturnType<typeof studyProgression>[] = [];
  for (const policy of POLICIES) {
    for (const seed of SEEDS) {
      const result = studyProgression(seed, policy, candidate);
      if (!candidate && policy !== 'fixed-center') {
        assert.ok(isDeepStrictEqual(result.report, historical.runs.find((run) => run.name === policy && run.seed === seed)?.report), 'Default policy must match the archived baseline.');
      }
      runs.push(result);
      console.log(`${policy.padEnd(18)} seed=${String(seed).padEnd(6)} campaign=${result.report.stagesCleared}/12 drops=${result.report.totalDrops} best=${result.report.bestDrop} afterHours=${result.continuation.filter((stage) => stage.passed).length}/5`);
    }
  }
  await mkdir('artifacts/balance/experiments', { recursive: true });
  const output = `artifacts/balance/experiments/progression-${candidate ? 'repeat-prices' : 'baseline'}-${Date.now()}.json`;
  await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), candidate: candidate ? 'repeat-prices-after-third-shop-capped-plus-four' : 'unchanged', seeds: SEEDS, continuationLimit: 5, runs }, null, 2), { flag: 'wx' });
  console.log(`Saved ${runs.length} campaign comparisons and their earned continuations to ${output}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();