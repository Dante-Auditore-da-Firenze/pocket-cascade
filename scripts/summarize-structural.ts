import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dropConfig } from '../src/game/engine';
import { trialCommission, trialSimulationOptions } from '../src/game/balance-trial';
import { simulateDrop } from '../src/game/simulation';
import { playStructural } from './structural-study';

type StudyRun = ReturnType<typeof playStructural>;
const sources = process.argv.slice(2);
assert.ok(sources.length, 'Supply the completed structural report JSON paths.');
const runs: StudyRun[] = [];
for (const source of sources) {
  const report = JSON.parse(await readFile(source, 'utf8')) as { runs: StudyRun[] };
  assert.ok(Array.isArray(report.runs));
  runs.push(...report.runs);
}
const identity = (run: StudyRun) => `${run.trial}:${run.policy}:${run.seed}`;
assert.equal(new Set(runs.map(identity)).size, runs.length, 'Do not count duplicate campaigns twice.');
const replayedControls: StudyRun[] = [];
for (const seed of [...new Set(runs.map((run) => run.seed))]) {
  if (runs.some((run) => run.trial === 'baseline' && run.policy === 'recovery' && run.seed === seed)) continue;
  const control = playStructural(seed, 'baseline', 'recovery');
  replayedControls.push(control);
  runs.push(control);
}

let protectedOpenings = 0;
let verifiedRecoveries = 0;
for (const run of runs) {
  assert.equal(run.timeouts, 0);
  assert.ok(run.maxTokens <= 4 && Number.isSafeInteger(run.bestDrop));
  const baseline = runs.find((record) => record.trial === 'baseline' && record.policy === run.policy && record.seed === run.seed);
  if (run.trial !== 'baseline' && !trialSimulationOptions(run.trial).boostedSockets && baseline) {
    assert.deepEqual(run.stages.slice(0, 3), baseline.stages.slice(0, 3));
    protectedOpenings += 1;
  }
  for (const recovery of run.recoveries) {
    const ids = (state: typeof recovery.before) => [...Object.values(state.board), ...state.bench].map((part) => part.id).sort();
    assert.deepEqual(ids(recovery.before), ids(recovery.after));
    assert.equal(recovery.after.brass, recovery.before.brass);
    assert.equal(recovery.after.power, recovery.before.power);
    assert.equal(simulateDrop(dropConfig(recovery.before), trialSimulationOptions(run.trial)).total, recovery.beforeDrop);
    assert.equal(simulateDrop(dropConfig(recovery.after), trialSimulationOptions(run.trial)).total, recovery.afterDrop);
    const target = trialCommission(recovery.before, run.trial).target;
    assert.ok(recovery.before.score + recovery.before.dropsLeft * recovery.beforeDrop < target);
    assert.ok(recovery.after.score + recovery.after.dropsLeft * recovery.afterDrop >= target);
    verifiedRecoveries += 1;
  }
}

const summaries = [...new Set(runs.map((run) => `${run.trial}:${run.policy}`))].map((group) => {
  const records = runs.filter((run) => `${run.trial}:${run.policy}` === group);
  const builds = records.flatMap((run) => run.builds);
  const campaign = records.flatMap((run) => run.stages.filter((stage) => stage.stage <= 12));
  const late = builds.filter((build) => build.stage >= 7 && build.stage <= 12);
  return {
    trial: records[0].trial, policy: records[0].policy, samples: records.length,
    campaignWins: records.filter((run) => run.campaignWon).length,
    clearedBySeed: records.map((run) => ({ seed: run.seed, cleared: run.campaignCleared })),
    campaignLaunches: campaign.reduce((sum, stage) => sum + stage.launches, 0),
    campaignRetries: campaign.reduce((sum, stage) => sum + stage.retries, 0),
    laterEnablingBuilds: late.filter((build) => build.enablesClear).length,
    laterRepositioningRescues: late.filter((build) => build.enablesClear && build.repositioned > 0).length,
    afterHoursCleared: records.reduce((sum, run) => sum + run.afterHoursCleared, 0),
    afterHoursRepositioningRescues: builds.filter((build) => build.stage > 12 && build.enablesClear && build.repositioned > 0).length,
    mandatoryRemovals: builds.reduce((sum, build) => sum + build.requiredToFit, 0),
    peakIncludingAfterHours: Math.max(...records.map((run) => run.bestDrop)),
  };
});
const recoveryExamples = runs.filter((run) => run.trial === 'space-pressure' && run.policy === 'recovery').flatMap((run) => run.recoveries
  .filter((recovery) => recovery.actions.some((action) => action.type !== 'place'))
  .map((recovery) => ({
    seed: run.seed, stage: recovery.before.stage + 1, target: trialCommission(recovery.before, run.trial).target,
    score: recovery.before.score, launchesLeft: recovery.before.dropsLeft, beforeDrop: recovery.beforeDrop, afterDrop: recovery.afterDrop,
    credits: recovery.before.brass, power: recovery.before.power,
    actions: recovery.actions.map((action) => ({ ...action, kind: [...Object.values(recovery.before.board), ...recovery.before.bench].find((part) => part.id === action.partId)?.kind })),
  })));

const output = `artifacts/balance/experiments/structural-summary-${Date.now()}.json`;
await writeFile(output, JSON.stringify({
  generatedAt: new Date().toISOString(), sources, totalCampaigns: runs.length, protectedOpenings, verifiedRecoveries,
  limitations: [
    'Outcome-aware diagnostic planners, not measured human skill levels.',
    'Local search permits up to three improving decisions per build; a placement plus rotation is two atomic edits.',
    'Late campaign counts cover commissions 7-12 only; After Hours is reported separately and limited to three commissions.',
    'Forced capacity removals are not counted as useful scoring improvements.',
    'A strong frozen machine may still finish; the candidate does not guarantee required late edits for every build.',
  ],
  summaries, recoveryExamples, replayedControls,
}, null, 2), { flag: 'wx' });
console.table(summaries.map(({ trial, policy, samples, campaignWins, campaignLaunches, laterRepositioningRescues, afterHoursCleared, mandatoryRemovals }) =>
  ({ trial, policy, samples, wins: campaignWins, launches: campaignLaunches, lateRescues: laterRepositioningRescues, afterHours: afterHoursCleared, forced: mandatoryRemovals })));
console.log(JSON.stringify({ output, totalCampaigns: runs.length, protectedOpenings, verifiedRecoveries, recoveryExamples }, null, 2));