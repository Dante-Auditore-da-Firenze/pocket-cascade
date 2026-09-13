import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import type { studyProgression } from './progression-study';

type StudyRun = ReturnType<typeof studyProgression>;
interface StudyFile {
  candidate: string;
  seeds: number[];
  continuationLimit: number;
  runs: StudyRun[];
}

const [baselinePath, candidatePath] = process.argv.slice(2);
assert.ok(baselinePath && candidatePath, 'Supply baseline and candidate progression report paths.');
const baseline = JSON.parse(await readFile(baselinePath, 'utf8')) as StudyFile;
const candidate = JSON.parse(await readFile(candidatePath, 'utf8')) as StudyFile;
assert.equal(baseline.candidate, 'unchanged');
assert.deepEqual(baseline.seeds, candidate.seeds);
assert.equal(baseline.continuationLimit, candidate.continuationLimit);
assert.equal(baseline.runs.length, candidate.runs.length);
const identity = (run: StudyRun) => `${run.policy}:${run.seed}`;
assert.equal(new Set(baseline.runs.map(identity)).size, baseline.runs.length);
assert.equal(new Set(candidate.runs.map(identity)).size, candidate.runs.length);

const continued = (run: StudyRun) => run.continuation.filter((stage) => stage.passed).length;
const laterBuilds = (run: StudyRun) => run.builds.filter((build) => build.stage >= 7 && build.retry === 0);
const improvingBuilds = (run: StudyRun) => laterBuilds(run).filter((build) => build.after > build.before).length;
const targetEnablingBuilds = (run: StudyRun) => laterBuilds(run).filter((build) => {
  const target = run.report.stages.find((stage) => stage.stage === build.stage)!.target;
  return build.before * 5 < target && build.after * 5 >= target;
}).length;

const pairs = baseline.runs.map((original) => {
  const trial = candidate.runs.find((run) => identity(run) === identity(original));
  assert.ok(trial, `Missing matched run ${identity(original)}`);
  assert.deepEqual(trial.report.stages.slice(0, 4), original.report.stages.slice(0, 4), 'The protected opening must match.');
  assert.deepEqual(trial.shops.slice(0, 3), original.shops.slice(0, 3));
  return {
    seed: original.seed, policy: original.policy,
    identicalCampaign: isDeepStrictEqual(original.report, trial.report),
    stages: [original.report.stagesCleared, trial.report.stagesCleared],
    launches: [original.report.totalDrops, trial.report.totalDrops],
    retries: [original.report.totalRetries, trial.report.totalRetries],
    bestDrop: [original.report.bestDrop, trial.report.bestDrop],
    laterImprovingBuilds: [improvingBuilds(original), improvingBuilds(trial)],
    laterTargetEnablingBuilds: [targetEnablingBuilds(original), targetEnablingBuilds(trial)],
    afterHoursCleared: [continued(original), continued(trial)],
  };
});

function summarize(runs: StudyRun[]) {
  return [...new Set(runs.map((run) => run.policy))].map((policy) => {
    const records = runs.filter((run) => run.policy === policy);
    const total = (measure: (run: StudyRun) => number) => records.reduce((sum, run) => sum + measure(run), 0);
    return {
      policy, wins: total((run) => Number(run.report.won)),
      stagesCleared: records.map((run) => run.report.stagesCleared),
      launches: total((run) => run.report.totalDrops), retries: total((run) => run.report.totalRetries),
      bestDropRange: [Math.min(...records.map((run) => run.report.bestDrop)), Math.max(...records.map((run) => run.report.bestDrop))],
      laterImprovingBuilds: total(improvingBuilds), laterTargetEnablingBuilds: total(targetEnablingBuilds),
      afterHoursCleared: records.map(continued),
      timeouts: total((run) => run.report.timeouts + run.continuationTimeouts),
      maximumCampaignTokens: Math.max(...records.map((run) => run.report.maxTokens)),
    };
  });
}

const regressions = pairs.filter((pair) => pair.stages[1] < pair.stages[0] || pair.afterHoursCleared[1] < pair.afterHoursCleared[0]);
const comparison = {
  generatedAt: new Date().toISOString(), baselinePath, candidatePath,
  decision: regressions.length ? 'Reject: worsened matched progression; no production price change.' : 'Requires decision review; completion alone is not adoption evidence.',
  opening: 'First four commission records and first three shops match for every pair.',
  limitation: 'Later improving builds may include added spares or lane changes, not necessarily required repositioning. After Hours is limited to five stages and three retries per stage.',
  baseline: summarize(baseline.runs), candidate: summarize(candidate.runs), regressions, pairs,
};
const output = `artifacts/balance/experiments/progression-comparison-${Date.now()}.json`;
await writeFile(output, JSON.stringify(comparison, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, ...comparison, pairs: undefined }, null, 2));