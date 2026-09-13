import assert from 'node:assert/strict';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  claimPart, collectCommission, dropConfig, enterEndless, launchDrop, newRun,
  nextCommission, placePeg, removePeg, retryCommission, rotatePeg, setLane, settleDrop, type RunState,
} from '../src/game/engine';
import { BALANCE_TRIALS, trialCapacity, trialCommission, trialSimulationOptions, type BalanceTrial } from '../src/game/balance-trial';
import { SLOT_MAP, SLOTS, type Peg } from '../src/game/model';
import { DropSimulation, simulateDrop } from '../src/game/simulation';
import { chooseReward, planBuild, shopLegally, type Strategy } from './strategies';

export const STRUCTURAL_POLICIES = ['trail', 'recovery', 'local', 'rebuild', 'frozen'] as const;
export type StructuralPolicy = typeof STRUCTURAL_POLICIES[number];
export type Edit = { type: 'place' | 'move' | 'swap' | 'rotate' | 'lane' | 'remove'; partId?: string; from?: string; to?: string; lane?: number };
type Evaluation = (run: RunState) => number;

export function createTrialEvaluator(trial: BalanceTrial) {
  const scores = new Map<string, number>();
  const options = trialSimulationOptions(trial);
  let simulations = 0;
  let hits = 0;
  const evaluate: Evaluation = (run) => {
    const config = dropConfig(run);
    const key = JSON.stringify([config.seed, config.lane, config.baseValue,
      Object.entries(config.board).sort(([first], [second]) => first.localeCompare(second)).map(([slotId, part]) =>
        [slotId, part.kind, part.direction, Boolean(part.tuned), Boolean(options.boostedSockets?.includes(slotId))])]);
    const known = scores.get(key);
    if (known !== undefined) { hits += 1; return known; }
    const value = simulateDrop(config, options).total;
    simulations += 1;
    if (scores.size >= 25_000) scores.clear();
    scores.set(key, value);
    return value;
  };
  return { evaluate, statistics: () => ({ simulations, cacheHits: hits }) };
}

export function observeDrop(run: RunState, trial: BalanceTrial) {
  const simulation = new DropSimulation(dropConfig(run), trialSimulationOptions(trial));
  const contacts: string[] = [];
  while (!simulation.done) {
    simulation.step(120);
    for (const impact of simulation.drainImpacts()) {
      if (impact.slotId && !contacts.includes(impact.slotId)) contacts.push(impact.slotId);
    }
  }
  const result = simulation.finish();
  simulation.dispose();
  assert.equal(result.total, result.banked + result.trayTotals.reduce((sum, value) => sum + value, 0));
  assert.ok(Number.isSafeInteger(result.total) && result.splits <= 3);
  return { result, contacts };
}

function distinctSpares(parts: Peg[]): Peg[] {
  const seen = new Set<string>();
  return parts.filter((part) => {
    const key = `${part.kind}:${part.direction}:${Boolean(part.tuned)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function placementEdit(run: RunState, partId: string, to: string): Edit {
  const from = Object.keys(run.board).find((slotId) => run.board[slotId].id === partId);
  return { type: run.board[to] ? 'swap' : from ? 'move' : 'place', partId, from, to };
}

export function fitTrialCapacity(input: RunState, trial: BalanceTrial, evaluate: Evaluation) {
  let run = input;
  const actions: Edit[] = [];
  while (Object.keys(run.board).length > trialCapacity(run, trial)) {
    let best: RunState | null = null;
    let removed = '';
    let value = -1;
    for (const slotId of Object.keys(run.board)) {
      const candidate = removePeg(run, slotId);
      const payout = evaluate(candidate);
      if (payout > value) { best = candidate; value = payout; removed = slotId; }
    }
    assert.ok(best);
    actions.push({ type: 'remove', partId: run.board[removed].id, from: removed });
    run = best;
  }
  return { run, actions };
}

export function fillObservedTrail(input: RunState, trial: BalanceTrial, contacts: string[], evaluate: Evaluation) {
  let run = input;
  const actions: Edit[] = [];
  while (Object.keys(run.board).length < trialCapacity(run, trial)) {
    let best = run;
    let action: Edit | null = null;
    let value = evaluate(run);
    for (const part of distinctSpares(run.bench)) {
      for (const slotId of contacts) {
        if (run.board[slotId]) continue;
        const candidate = placePeg(run, part.id, slotId);
        const payout = evaluate(candidate);
        if (payout > value) { best = candidate; value = payout; action = placementEdit(run, part.id, slotId); }
      }
    }
    if (!action) break;
    actions.push(action);
    run = best;
  }
  return { run, actions };
}

export function improveLocally(input: RunState, trial: BalanceTrial, contacts: string[], evaluate: Evaluation, maximumEdits = 3, maximumTargets = 12) {
  let run = input;
  const actions: Edit[] = [];
  let candidates = 0;
  for (let edit = 0; edit < maximumEdits; edit += 1) {
    let best = run;
    let bestActions: Edit[] = [];
    let value = evaluate(run);
    const consider = (candidate: RunState, edits: Edit[]) => {
      if (candidate === run || Object.keys(candidate.board).length > trialCapacity(candidate, trial)) return;
      candidates += 1;
      const payout = evaluate(candidate);
      if (payout > value) { best = candidate; value = payout; bestActions = edits; }
    };
    for (let lane = 0; lane < 9; lane += 1) {
      if (lane !== run.lane) consider(setLane(run, lane), [{ type: 'lane', lane }]);
    }
    const neighbors = contacts.flatMap((slotId) => SLOTS.filter((slot) =>
      Math.hypot(slot.x - SLOT_MAP[slotId].x, slot.y - SLOT_MAP[slotId].y) < 78).map((slot) => slot.id));
    const targets = [...new Set([...(trialSimulationOptions(trial).boostedSockets ?? []), ...contacts, ...neighbors,
      ...(maximumTargets > 12 ? SLOTS.map((slot) => slot.id) : [])])].slice(0, maximumTargets);
    const spares = distinctSpares(run.bench);
    for (const part of spares) {
      for (const slotId of targets) {
        const placed = placePeg(run, part.id, slotId);
        const placement = placementEdit(run, part.id, slotId);
        consider(placed, [placement]);
        if (part.kind === 'kicker' || part.kind === 'splitter') {
          consider(rotatePeg(placed, part.id), [placement, { type: 'rotate', partId: part.id }]);
        }
      }
    }
    const installed = Object.entries(run.board);
    const movable = installed.filter(([slotId]) => !contacts.includes(slotId)).slice(0, 2)
      .concat(installed.filter(([, part]) => part.kind === 'kicker' || part.kind === 'splitter').slice(0, 2))
      .concat(installed.filter(([slotId]) => contacts.includes(slotId)).slice(-2));
    for (const [from, part] of movable) {
      if (part.kind === 'kicker' || part.kind === 'splitter') consider(rotatePeg(run, part.id), [{ type: 'rotate', partId: part.id }]);
      for (const slotId of targets) {
        if (slotId !== from) consider(placePeg(run, part.id, slotId), [placementEdit(run, part.id, slotId)]);
      }
    }
    if (!bestActions.length) break;
    run = best;
    actions.push(...bestActions);
  }
  return { run, actions, candidates };
}

export function playStructural(seed: number, trial: BalanceTrial, policy: StructuralPolicy, campaignStages = 12, continuationStages = 3, evaluator = createTrialEvaluator(trial), shopping: Strategy = 'optimized') {
  let run = newRun(seed);
  let contacts: string[] = [];
  let campaignWon = false;
  let timeouts = 0;
  let maxTokens = 1;
  let bestDrop = 0;
  const stages: { stage: number; target: number; capacity: number; passed: boolean; reason: string; launches: number; retries: number; score: number; power: number; credits: number; board: RunState['board']; centerArrivals: number; bonusHits: number }[] = [];
  const builds: { stage: number; retry: number; before: number; after: number; requiredToFit: number; repositioned: number; actions: Edit[]; enablesClear: boolean; candidates: number }[] = [];
  const shops: { stage: number; earned: number; spent: number; powerUpgrades: number; purchases: string[] }[] = [];
  const recoveries: { before: RunState; after: RunState; actions: Edit[]; beforeDrop: number; afterDrop: number }[] = [];
  const evaluate = evaluator.evaluate;
  const frozen = () => policy === 'frozen' && run.stage >= 6;
  const build = () => {
    if (frozen()) return;
    const before = run;
    const fitted = fitTrialCapacity(run, trial, evaluate);
    run = fitted.run;
    const fitPayout = evaluate(run);
    let actions: Edit[] = [];
    let candidates = 0;
    if (policy === 'trail' || policy === 'recovery' || policy === 'local') {
      const filled = fillObservedTrail(run, trial, contacts, evaluate);
      run = filled.run;
      actions.push(...filled.actions);
    } else {
      const planned = planBuild(run, 'optimized', undefined, { maxInstalled: trialCapacity(run, trial), evaluate });
      run = planned.run;
      actions = planned.actions.map((action): Edit => action.type === 'lane' ? action : action.type === 'remove'
        ? { type: 'remove', from: action.slotId } : { type: 'place', partId: action.pegId, to: action.slotId });
    }
    if (policy !== 'trail' && (policy !== 'recovery' || run.score + run.dropsLeft * evaluate(run) < trialCommission(run, trial).target)) {
      const improved = improveLocally(run, trial, contacts, evaluate, policy === 'local' || policy === 'recovery' ? 3 : 1);
      run = improved.run;
      actions.push(...improved.actions);
      candidates = improved.candidates;
    }
    const after = evaluate(run);
    const target = trialCommission(run, trial).target;
    const enablesClear = before.score + before.dropsLeft * fitPayout < target && run.score + run.dropsLeft * after >= target;
    const ids = (state: RunState) => [...Object.values(state.board), ...state.bench].map((part) => part.id).sort();
    assert.deepEqual(ids(run), ids(before));
    assert.equal(run.brass, before.brass);
    assert.equal(run.power, before.power);
    assert.ok(Object.keys(run.board).length <= trialCapacity(run, trial));
    const repositioned = Object.entries(fitted.run.board).filter(([slotId, part]) =>
      run.board[slotId]?.id !== part.id || run.board[slotId]?.direction !== part.direction).length;
    builds.push({ stage: run.stage + 1, retry: run.retries, before: fitPayout, after, requiredToFit: fitted.actions.length, repositioned, actions, enablesClear, candidates });
    if (enablesClear && run.stage >= 3 && recoveries.length < 4) {
      recoveries.push({ before: structuredClone(fitted.run), after: structuredClone(run), actions, beforeDrop: fitPayout, afterDrop: after });
    }
  };
  const stageLimit = campaignStages + (campaignStages === 12 ? continuationStages : 0);
  for (let index = 0; index < stageLimit; index += 1) {
    const startingDrops = run.totalDrops;
    let centerArrivals = 0;
    let bonusHits = 0;
    build();
    let reason = 'launch budget';
    if (Object.keys(run.board).length > trialCapacity(run, trial)) reason = 'frozen layout exceeds checkpoint capacity';
    else while (run.phase === 'ready' || run.phase === 'lost') {
      if (run.phase === 'lost') {
        if (run.retries >= 3) break;
        run = retryCommission(run);
        build();
      }
      const observation = observeDrop(run, trial);
      contacts = observation.contacts;
      timeouts += Number(observation.result.timedOut);
      maxTokens = Math.max(maxTokens, observation.result.splits + 1);
      bestDrop = Math.max(bestDrop, observation.result.total);
      centerArrivals += observation.result.events.filter((event) => event.type === 'payout' && event.tray === 1).length;
      bonusHits += observation.result.events.filter((event) => event.type === 'hit' && event.label.startsWith('SOCKET x2')).length;
      run = settleDrop(launchDrop(run), observation.result, trialCommission(run, trial));
      if (run.phase === 'ready') build();
    }
    const passed = run.phase === 'review';
    stages.push({ stage: run.stage + 1, target: trialCommission(run, trial).target, capacity: trialCapacity(run, trial), passed, reason: passed ? 'target reached' : reason, launches: run.totalDrops - startingDrops, retries: run.retries, score: run.score, power: run.power, credits: run.brass, board: structuredClone(run.board), centerArrivals, bonusHits });
    if (!passed) break;
    run = collectCommission(run, trialCommission(run, trial));
    if (run.phase === 'won') { campaignWon = true; if (continuationStages === 0) break; run = enterEndless(run); }
    if (index + 1 >= stageLimit) break;
    const beforeShop = run;
    run = policy === 'frozen' && run.stage >= 5 ? claimPart(run, chooseReward(run, shopping)) : shopLegally(run, shopping);
    assert.ok(run.brass >= 0 && run.brass <= beforeShop.brass);
    shops.push({ stage: run.stage + 1, earned: run.lastReward, spent: beforeShop.brass - run.brass, powerUpgrades: run.power - beforeShop.power, purchases: run.offers.filter((offer) => offer.sold).map((offer) => offer.kind) });
    run = nextCommission(run);
  }
  assert.ok(Number.isSafeInteger(run.totalScore));
  return {
    seed, trial, policy, shopping, campaignWon, campaignCleared: stages.filter((stage) => stage.stage <= 12 && stage.passed).length,
    afterHoursCleared: stages.filter((stage) => stage.stage > 12 && stage.passed).length,
    totalDrops: run.totalDrops, bestDrop, timeouts, maxTokens, stages, builds, shops, recoveries,
  };
}

async function main() {
  const { values } = parseArgs({ options: {
    seeds: { type: 'string', default: '1,42,2026,65537' },
    variants: { type: 'string', default: BALANCE_TRIALS.join(',') },
    policies: { type: 'string', default: STRUCTURAL_POLICIES.join(',') },
    continuation: { type: 'string', default: '3' },
  } });
  const seeds = values.seeds.split(',').map(Number);
  const variants = values.variants.split(',') as BalanceTrial[];
  const policies = values.policies.split(',') as StructuralPolicy[];
  const continuation = Number(values.continuation);
  assert.ok(seeds.every((seed) => Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff));
  assert.ok(variants.every((trial) => BALANCE_TRIALS.includes(trial)));
  assert.ok(policies.every((policy) => STRUCTURAL_POLICIES.includes(policy)));
  assert.ok(Number.isInteger(continuation) && continuation >= 0 && continuation <= 5);
  await mkdir('artifacts/balance/experiments', { recursive: true });
  const stem = `artifacts/balance/experiments/structural-${Date.now()}`;
  await writeFile(`${stem}.jsonl`, '', { flag: 'wx' });
  const runs: ReturnType<typeof playStructural>[] = [];
  for (const trial of variants) {
    const evaluator = createTrialEvaluator(trial);
    for (const policy of policies) {
      for (const seed of seeds) {
        const started = performance.now();
        const run = playStructural(seed, trial, policy, 12, continuation, evaluator);
        runs.push(run);
        await appendFile(`${stem}.jsonl`, `${JSON.stringify(run)}\n`);
        console.log(`${trial.padEnd(14)} ${policy.padEnd(8)} seed=${String(seed).padEnd(6)} campaign=${run.campaignCleared}/12 AH=${run.afterHoursCleared}/${continuation} drops=${run.totalDrops} necessary=${run.builds.filter((build) => build.stage >= 7 && build.enablesClear).length} forced=${run.builds.reduce((sum, build) => sum + build.requiredToFit, 0)} ${((performance.now() - started) / 1000).toFixed(1)}s`);
      }
    }
    console.log(`${trial}: ${JSON.stringify(evaluator.statistics())}`);
  }
  await writeFile(`${stem}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), seeds, variants, policies, continuation, runs }, null, 2), { flag: 'wx' });
  console.log(`Saved ${runs.length} complete structural comparisons to ${stem}.json`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();