import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createTrialEvaluator, playStructural } from './structural-study';

const seeds = [1, 42, 2026, 65537, 7, 13, 99, 2027];
const trial = 'space-pressure';
const runs: ReturnType<typeof playStructural>[] = [];
const evaluator = createTrialEvaluator(trial);
for (const shopping of ['conservative', 'splitter'] as const) {
  for (const policy of ['recovery', 'local'] as const) {
    for (const seed of seeds) {
      const run = playStructural(seed, trial, policy, 12, 3, evaluator, shopping);
      assert.equal(run.timeouts, 0);
      assert.ok(run.maxTokens <= 4);
      runs.push(run);
      console.log(`${shopping.padEnd(12)} ${policy.padEnd(8)} seed=${String(seed).padEnd(6)} campaign=${run.campaignCleared}/12 AH=${run.afterHoursCleared}/3`);
    }
  }
}
const summary = [...new Set(runs.map((run) => `${run.shopping}:${run.policy}`))].map((group) => {
  const records = runs.filter((run) => `${run.shopping}:${run.policy}` === group);
  return {
    shopping: records[0].shopping, policy: records[0].policy,
    wins: records.filter((run) => run.campaignWon).length,
    cleared: records.map((run) => ({ seed: run.seed, campaign: run.campaignCleared, afterHours: run.afterHoursCleared })),
    lateRepositioningRescues: records.flatMap((run) => run.builds).filter((build) => build.stage >= 7 && build.stage <= 12 && build.enablesClear && build.repositioned > 0).length,
  };
});
await mkdir('artifacts/balance/experiments', { recursive: true });
const output = `artifacts/balance/experiments/structural-variety-${Date.now()}.json`;
await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), trial, seeds, summary, runs }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, summary }, null, 2));