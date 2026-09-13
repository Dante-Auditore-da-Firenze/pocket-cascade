import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { commission, newRun } from '../src/game/engine';
import { inspectAimLanes } from './aiming-analysis';
import type { diagnoseCampaign } from './balance-diagnostics';

async function main() {
  const baseline = JSON.parse(await readFile('artifacts/balance/experiments/baseline-2026-09-09.json', 'utf8')) as { runs: ReturnType<typeof diagnoseCampaign>[] };
  const policies = ['beginner', 'conservative', 'optimized', 'splitter'];
  const samples = baseline.runs.filter((run) => policies.includes(run.name)).flatMap((run) => run.builds.filter((build) => build.retry === 0).map((build) => {
    const state = { ...newRun(run.seed), stage: build.stage - 1, board: build.board, power: build.power, lane: build.lane };
    const aiming = inspectAimLanes(state);
    assert.equal(aiming.current.payout, build.after, 'The recorded board must reproduce its exact payout.');
    assert.ok(aiming.lanes.every((lane) => !lane.timedOut && lane.maxTokens <= 4));
    const target = commission(state).target;
    return {
      policy: run.name, ...aiming, target,
      centerPayoutRequired: aiming.current.payout * 5 >= target && (aiming.current.payout - aiming.current.centerPayout) * 5 < target,
      centeredCompletable: aiming.centered.payout * 5 >= target,
      anyLaneCompletable: aiming.best.payout * 5 >= target,
      highestPayingLaneHitsCenter: aiming.best.centerArrivals > 0,
    };
  }));
  const summary = policies.map((policy) => {
    const records = samples.filter((sample) => sample.policy === policy);
    return {
      policy, sampledBoards: records.length,
      noCenterRoute: records.filter((sample) => !sample.centerReachable).length,
      centeredCompletable: records.filter((sample) => sample.centeredCompletable).length,
      anyLaneCompletable: records.filter((sample) => sample.anyLaneCompletable).length,
      aimingRescues: records.filter((sample) => !sample.centeredCompletable && sample.anyLaneCompletable).length,
      bestRouteSkipsCenter: records.filter((sample) => !sample.highestPayingLaneHitsCenter).length,
      currentHitsCenter: records.filter((sample) => sample.current.centerArrivals > 0).length,
      lateCenterInaccessible: records.filter((sample) => sample.stage >= 7 && !sample.centerReachable).length,
    };
  });
  await mkdir('artifacts/balance/experiments', { recursive: true });
  const output = `artifacts/balance/experiments/aiming-${Date.now()}.json`;
  await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), source: 'baseline-2026-09-09.json', limitation: 'Matched earned-board counterfactuals, not full fixed-lane campaigns. No center requirement or payout rule was changed.', summary, samples }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, summary }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();