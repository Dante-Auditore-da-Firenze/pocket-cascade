import assert from 'node:assert/strict';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  buyPart, claimPart, claimTuning, collectCommission, commission, enterEndless,
  fusePeg, launchDrop, newRun, nextCommission, retryCommission, settleDrop, tunePeg, tuningTargets, upgradePower,
  type RunState,
} from '../src/game/engine';
import { SLOTS, type PegKind } from '../src/game/model';
import { planBuild } from './strategies';
import { createTrialEvaluator, fillObservedTrail, improveLocally, observeDrop, type Edit } from './structural-study';

export const ROLE_POLICIES = ['stack', 'recovery', 'charge', 'bank', 'branch', 'frozen'] as const;
export type RolePolicy = typeof ROLE_POLICIES[number];
export type ShopAction = { type: 'gift'; kind: PegKind } | { type: 'gift-tune' | 'tune'; partId: string }
  | { type: 'fuse'; partId: string; donorId: string } | { type: 'buy'; offerId: string } | { type: 'power' };

const preferences: Record<'stack' | 'charge' | 'bank' | 'branch', PegKind[]> = {
  stack: ['crown', 'doubler', 'echo', 'splitter', 'mint', 'relay', 'vault', 'dividend', 'junction', 'kicker'],
  charge: ['mint', 'doubler', 'relay', 'echo', 'kicker', 'crown', 'splitter', 'vault', 'dividend', 'junction'],
  bank: ['vault', 'dividend', 'mint', 'relay', 'kicker', 'splitter', 'junction', 'doubler', 'echo', 'crown'],
  branch: ['splitter', 'junction', 'kicker', 'mint', 'relay', 'dividend', 'vault', 'doubler', 'echo', 'crown'],
};

export function planRoleShop(input: RunState, policy: RolePolicy, evaluate = createTrialEvaluator('baseline').evaluate) {
  let run = input;
  const actions: ShopAction[] = [];
  const family = policy === 'recovery' || policy === 'frozen' ? 'charge' : policy;
  const preference = preferences[family];
  const priority = (kind: PegKind) => preference.indexOf(kind) + (family === 'stack' ? 0
    : Math.max(0, [...Object.values(run.board), ...run.bench].filter((part) => part.kind === kind).length - 1) * 3);
  if (!run.rewardClaimed) {
    const kind = [...run.rewardChoices].sort((first, second) => priority(first) - priority(second))[0];
    const targets = family === 'stack' ? [] : tuningTargets(run, kind).filter((part) => Object.values(run.board).some((installed) => installed.id === part.id));
    const owned = [...Object.values(run.board), ...run.bench].filter((part) => part.kind === kind).length;
    if (targets.length && (owned >= 2 || Object.keys(run.board).length >= commission(run).capacity)) {
      const target = targets.reduce((best, part) => evaluate(claimTuning(run, part.id)) > evaluate(claimTuning(run, best.id)) ? part : best);
      run = claimTuning(run, target.id);
      actions.push({ type: 'gift-tune', partId: target.id });
    } else { run = claimPart(run, kind); actions.push({ type: 'gift', kind }); }
  }
  const upgraded = upgradePower(run);
  if (upgraded !== run) { run = upgraded; actions.push({ type: 'power' }); }
  if (family !== 'stack') {
    let best = run;
    let partId: string | null = null;
    for (const part of tuningTargets(run)) {
      const candidate = tunePeg(run, part.id);
      if (candidate !== run && evaluate(candidate) > evaluate(best)) { best = candidate; partId = part.id; }
    }
    if (partId) { run = best; actions.push({ type: 'tune', partId }); }
  }
  for (const offer of [...run.offers].sort((first, second) => priority(first.kind) - priority(second.kind))) {
    const purchased = buyPart(run, offer.id);
    if (purchased !== run) { run = purchased; actions.push({ type: 'buy', offerId: offer.id }); }
  }
  if (family !== 'stack') {
    for (const part of tuningTargets(run).filter((part) => Object.values(run.board).some((installed) => installed.id === part.id))) {
      const donor = run.bench.find((spare) => spare.kind === part.kind && !spare.tuned && spare.id !== part.id);
      if (!donor) continue;
      run = fusePeg(run, part.id, donor.id);
      actions.push({ type: 'fuse', partId: part.id, donorId: donor.id });
    }
  }
  assert.ok(run.brass >= 0 && run.brass <= input.brass);
  assert.equal(new Set([...Object.values(run.board), ...run.bench].map((part) => part.id)).size, Object.keys(run.board).length + run.bench.length);
  return { run, actions };
}

export function planRoleBuild(input: RunState, policy: RolePolicy, contacts: string[], evaluate = createTrialEvaluator('baseline').evaluate) {
  if (policy === 'frozen' && input.stage >= 6) return { run: input, actions: [] as Edit[] };
  let run = input;
  const actions: Edit[] = [];
  if (policy === 'stack' || policy === 'recovery') {
    const filled = fillObservedTrail(run, 'baseline', contacts, evaluate);
    run = filled.run;
    actions.push(...filled.actions);
  } else {
    const built = planBuild(run, policy === 'branch' ? 'splitter' : 'optimized', undefined, { evaluate });
    run = built.run;
    actions.push(...built.actions.map((action): Edit => action.type === 'lane' ? action : action.type === 'remove'
      ? { type: 'remove', partId: input.board[action.slotId]?.id, from: action.slotId }
      : { type: 'place', partId: action.pegId, to: action.slotId }));
  }
  if (policy !== 'stack' && (policy !== 'recovery' || run.score + run.dropsLeft * evaluate(run) < commission(run).target)) {
    const improved = improveLocally(run, 'baseline', contacts, evaluate, 3);
    run = improved.run;
    actions.push(...improved.actions);
  }
  return { run, actions };
}

export function playRoleCampaign(seed: number, policy: RolePolicy, stages = 12, afterHours = 6) {
  let run = newRun(seed);
  let contacts: string[] = [];
  const evaluator = createTrialEvaluator('baseline');
  const records: { stage: number; target: number; capacity: number; won: boolean; drops: number; retries: number; power: number; credits: number; best: number; board: RunState['board']; bench: RunState['bench']; banked: number; joins: number; starved: number }[] = [];
  const builds: { stage: number; before: number; after: number; actions: Edit[]; needed: boolean; changedInstalled: boolean }[] = [];
  const shops: { stage: number; earned: number; spent: number; actions: ShopAction[] }[] = [];
  let timeouts = 0;
  const build = () => {
    const before = run;
    const beforeValue = evaluator.evaluate(run);
    const built = planRoleBuild(run, policy, contacts, evaluator.evaluate);
    run = built.run;
    const afterValue = evaluator.evaluate(run);
    const target = commission(run).target;
    assert.equal(run.brass, before.brass);
    assert.equal(run.power, before.power);
    assert.deepEqual([...Object.values(run.board), ...run.bench].map((part) => part.id).sort(), [...Object.values(before.board), ...before.bench].map((part) => part.id).sort());
    assert.ok(Object.keys(run.board).length <= commission(run).capacity);
    builds.push({ stage: run.stage + 1, before: beforeValue, after: afterValue, actions: built.actions,
      needed: run.score + run.dropsLeft * beforeValue < target && run.score + run.dropsLeft * afterValue >= target,
      changedInstalled: Object.entries(before.board).some(([slot, part]) => run.board[slot]?.id !== part.id || run.board[slot]?.direction !== part.direction),
    });
  };
  for (let stage = 0; stage < stages + (stages === 12 ? afterHours : 0); stage += 1) {
    const startingDrops = run.totalDrops;
    let best = 0;
    let banked = 0;
    let joins = 0;
    let starved = 0;
    build();
    while (run.phase === 'ready' || run.phase === 'lost') {
      if (run.phase === 'lost') {
        if (run.retries >= 3) break;
        run = retryCommission(run);
        build();
      }
      const observation = observeDrop(run, 'baseline');
      const result = observation.result;
      assert.ok(result.splits <= 3 && Number.isSafeInteger(result.total));
      assert.equal(result.total, result.banked + result.trayTotals.reduce((sum, value) => sum + value, 0));
      contacts = observation.contacts;
      best = Math.max(best, result.total);
      banked += result.banked;
      joins += result.events.filter((event) => event.type === 'bank' && event.kind === 'junction').length;
      starved += result.events.filter((event) => event.type === 'hit' && /NEEDS|NO EFFECT|NO RESERVE/.test(event.label)).length;
      timeouts += Number(result.timedOut);
      run = settleDrop(launchDrop(run), result);
      if (run.phase === 'ready') build();
    }
    records.push({ stage: run.stage + 1, target: commission(run).target, capacity: commission(run).capacity, won: run.phase === 'review', drops: run.totalDrops - startingDrops, retries: run.retries, power: run.power, credits: run.brass, best, board: structuredClone(run.board), bench: structuredClone(run.bench), banked, joins, starved });
    if (run.phase !== 'review') break;
    run = collectCommission(run);
    if (stage + 1 >= stages + (stages === 12 ? afterHours : 0)) break;
    if (run.phase === 'won') run = enterEndless(run);
    const beforeShop = run;
    const shopped = policy === 'frozen' && run.stage >= 5 ? { run: claimPart(run, run.rewardChoices[0]), actions: [] } : planRoleShop(run, policy, evaluator.evaluate);
    run = shopped.run;
    shops.push({ stage: run.stage + 1, earned: run.lastReward, spent: beforeShop.brass - run.brass, actions: shopped.actions });
    run = nextCommission(run);
  }
  const recoveryAudit = run.phase === 'lost' ? auditRoleRecovery(run, evaluator.evaluate) : null;
  return { seed, policy, won: records.filter((stage) => stage.stage <= 12 && stage.won).length === 12,
    cleared: records.filter((stage) => stage.stage <= 12 && stage.won).length,
    afterHours: records.filter((stage) => stage.stage > 12 && stage.won).length,
    timeouts, totalDrops: run.totalDrops, bestDrop: run.bestDrop, records, builds, shops, recoveryAudit, finalRun: run, statistics: evaluator.statistics() };
}

export function auditRoleRecovery(lost: RunState, evaluate = createTrialEvaluator('baseline').evaluate) {
  const attempt = retryCommission(lost);
  if (attempt === lost) return null;
  const before = evaluate(attempt);
  const contacts = observeDrop(attempt, 'baseline').contacts;
  const rebuilt = improveLocally(attempt, 'baseline', contacts, evaluate, 3, SLOTS.length);
  const after = evaluate(rebuilt.run);
  assert.equal(rebuilt.run.brass, lost.brass);
  assert.equal(rebuilt.run.power, lost.power);
  assert.deepEqual([...Object.values(rebuilt.run.board), ...rebuilt.run.bench].map((part) => part.id).sort(), [...Object.values(lost.board), ...lost.bench].map((part) => part.id).sort());
  const target = commission(attempt).target;
  return {
    stage: attempt.stage + 1, target, before, after, possible: after * 5 >= target,
    actions: rebuilt.actions, candidates: rebuilt.candidates,
    limitation: 'Detached whole-board search using owned parts and the normal capped retry bonus, not automatic player assistance.',
    run: rebuilt.run,
  };
}

async function main() {
  const { values } = parseArgs({ options: {
    seeds: { type: 'string', default: '1,42,2026,65537,7,13,99,2027' },
    policies: { type: 'string', default: ROLE_POLICIES.join(',') },
    continuation: { type: 'string', default: '6' },
  } });
  const seeds = values.seeds.split(',').map(Number);
  const policies = values.policies.split(',') as RolePolicy[];
  const continuation = Number(values.continuation);
  assert.ok(seeds.every((seed) => Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff));
  assert.ok(policies.every((policy) => ROLE_POLICIES.includes(policy)));
  assert.ok(Number.isInteger(continuation) && continuation >= 0 && continuation <= 12);
  await mkdir('artifacts/balance/experiments', { recursive: true });
  const stem = `artifacts/balance/experiments/roles-${Date.now()}`;
  const runs: ReturnType<typeof playRoleCampaign>[] = [];
  await writeFile(`${stem}.jsonl`, '', { flag: 'wx' });
  for (const policy of policies) {
    for (const seed of seeds) {
      const result = playRoleCampaign(seed, policy, 12, continuation);
      runs.push(result);
      await appendFile(`${stem}.jsonl`, `${JSON.stringify(result)}\n`);
      console.log(`${policy.padEnd(8)} seed=${String(seed).padEnd(6)} campaign=${result.cleared}/12 AH=${result.afterHours}/${continuation} drops=${result.totalDrops} earlyChanges=${result.builds.filter((build) => build.stage >= 4 && build.stage <= 9 && build.needed && build.changedInstalled).length} best=${result.bestDrop}`);
    }
  }
  await writeFile(`${stem}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), seeds, policies, continuation, rules: 'charge-tuning-ten-parts', runs }, null, 2), { flag: 'wx' });
  console.log(`Saved ${runs.length} legal campaigns to ${stem}.json`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();