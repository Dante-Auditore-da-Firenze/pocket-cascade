import {
  buyPart, claimPart, collectCommission, commission, dropConfig, launchDrop,
  newRun, nextCommission, placePeg, removePeg, retryCommission, setLane,
  settleDrop, upgradePower, type RunState,
} from '../src/game/engine';
import { SLOTS, type PegKind } from '../src/game/model';
import { simulateDrop } from '../src/game/simulation';

export type Strategy = 'beginner' | 'conservative' | 'optimized' | 'splitter';
export type BuildAction = { type: 'lane'; lane: number } | { type: 'place'; pegId: string; slotId: string } | { type: 'remove'; slotId: string };

const preferences: Record<Strategy, PegKind[]> = {
  beginner: ['mint', 'doubler', 'splitter', 'vault', 'relay', 'crown', 'echo', 'kicker'],
  conservative: ['doubler', 'mint', 'vault', 'relay', 'splitter', 'echo', 'crown', 'kicker'],
  optimized: ['crown', 'doubler', 'echo', 'splitter', 'relay', 'mint', 'vault', 'kicker'],
  splitter: ['splitter', 'crown', 'echo', 'doubler', 'mint', 'relay', 'vault', 'kicker'],
};

const buildOrder: PegKind[] = ['mint', 'relay', 'splitter', 'doubler', 'echo', 'vault', 'crown', 'kicker'];

export function evaluateMachine(run: RunState): number {
  return simulateDrop(dropConfig(run)).total;
}

export function bestLane(run: RunState): RunState {
  let best = run;
  let value = evaluateMachine(run);
  for (let lane = 0; lane < 9; lane += 1) {
    const candidate = setLane(run, lane);
    const score = evaluateMachine(candidate);
    if (score > value) { value = score; best = candidate; }
  }
  return best;
}

export function bestPlacement(run: RunState, pegId: string): { run: RunState; slotId: string | null } {
  let best = run;
  let bestSlot: string | null = null;
  let score = evaluateMachine(run);
  for (const slot of SLOTS) {
    if (run.board[slot.id]) continue;
    const candidate = placePeg(run, pegId, slot.id);
    if (candidate === run) continue;
    const value = evaluateMachine(candidate);
    if (value > score) { score = value; best = candidate; bestSlot = slot.id; }
  }
  return { run: best, slotId: bestSlot };
}

export function planBuild(input: RunState, strategy: Strategy): { run: RunState; actions: BuildAction[] } {
  let run = structuredClone(input);
  const actions: BuildAction[] = [];
  const lane = bestLane(run).lane;
  if (lane !== run.lane) { run = setLane(run, lane); actions.push({ type: 'lane', lane }); }

  if (strategy === 'optimized' || strategy === 'splitter') {
    const existing = run;
    const rebuildActions: BuildAction[] = [];
    let rebuilt = structuredClone(run);
    for (const slotId of Object.keys(rebuilt.board)) {
      rebuilt = removePeg(rebuilt, slotId);
      rebuildActions.push({ type: 'remove', slotId });
    }
    const pegs = [...rebuilt.bench].sort((first, second) => buildOrder.indexOf(first.kind) - buildOrder.indexOf(second.kind));
    for (const peg of pegs) {
      if (Object.keys(rebuilt.board).length >= commission(rebuilt).capacity) break;
      const placed = bestPlacement(rebuilt, peg.id);
      rebuilt = placed.run;
      if (placed.slotId) rebuildActions.push({ type: 'place', pegId: peg.id, slotId: placed.slotId });
    }
    if (evaluateMachine(rebuilt) > evaluateMachine(existing)) {
      run = rebuilt;
      actions.push(...rebuildActions);
    }
  }

  for (const peg of [...run.bench]) {
    if (Object.keys(run.board).length >= commission(run).capacity) break;
    if (strategy === 'beginner') {
      const candidates = ['3-2', '3-3', '4-3', '2-2', '2-4', '4-2', '4-4', '5-2', '5-3', '6-3', '0-2', '0-4', '5-1', '5-4'];
      const slotId = candidates.find((candidate) => !run.board[candidate]);
      if (slotId) { run = placePeg(run, peg.id, slotId); actions.push({ type: 'place', pegId: peg.id, slotId }); }
    } else {
      const placed = bestPlacement(run, peg.id);
      run = placed.run;
      if (placed.slotId) actions.push({ type: 'place', pegId: peg.id, slotId: placed.slotId });
    }
  }

  const finalLane = bestLane(run).lane;
  if (finalLane !== run.lane) { run = setLane(run, finalLane); actions.push({ type: 'lane', lane: finalLane }); }
  return { run, actions };
}

export function chooseReward(run: RunState, strategy: Strategy): PegKind {
  const owned = [...Object.values(run.board), ...run.bench];
  const desired = owned.filter((peg) => peg.kind === 'splitter').length < 1 && run.rewardChoices.includes('splitter')
    ? 'splitter' : [...run.rewardChoices].sort((first, second) => preferences[strategy].indexOf(first) - preferences[strategy].indexOf(second))[0];
  return desired;
}

export function shopLegally(input: RunState, strategy: Strategy): RunState {
  let run = input;
  if (!run.rewardClaimed) run = claimPart(run, chooseReward(run, strategy));
  run = upgradePower(run);
  const offers = [...run.offers].sort((first, second) => preferences[strategy].indexOf(first.kind) - preferences[strategy].indexOf(second.kind));
  for (const offer of offers) {
    if (strategy === 'conservative' && run.brass - offer.price < 3) continue;
    run = buyPart(run, offer.id);
  }
  return run;
}

export interface StageRecord {
  stage: number;
  target: number;
  drops: number;
  retries: number;
  payout: number;
  bestDrop: number;
  brass: number;
  power: number;
  parts: number;
  simulationSeconds: number;
}

export interface RunReport {
  seed: number;
  strategy: Strategy;
  won: boolean;
  stagesCleared: number;
  totalDrops: number;
  totalRetries: number;
  bestDrop: number;
  totalScore: number;
  simulatedSeconds: number;
  timeouts: number;
  maxTokens: number;
  stages: StageRecord[];
}

export interface CampaignPolicy {
  build?: typeof planBuild;
  shop?: typeof shopLegally;
  collect?: typeof collectCommission;
  observeBuild?: (before: RunState, after: RunState, actions: BuildAction[]) => void;
  observeShop?: (before: RunState, after: RunState) => void;
}

export function playCampaign(seed: number, strategy: Strategy, stageLimit = 12, policy: CampaignPolicy = {}): RunReport {
  let run = newRun(seed);
  const report: RunReport = { seed, strategy, won: false, stagesCleared: 0, totalDrops: 0, totalRetries: 0, bestDrop: 0, totalScore: 0, simulatedSeconds: 0, timeouts: 0, maxTokens: 1, stages: [] };
  const build = (input: RunState) => {
    const result = (policy.build ?? planBuild)(input, strategy);
    policy.observeBuild?.(structuredClone(input), structuredClone(result.run), structuredClone(result.actions));
    return result.run;
  };
  for (let stage = 0; stage < stageLimit; stage += 1) {
    const startingDrops = run.totalDrops;
    let stageSeconds = 0;
    run = build(run);
    while (run.phase === 'ready' || run.phase === 'lost') {
      if (run.phase === 'lost') {
        if (run.retries >= 3) break;
        report.totalRetries += 1;
        run = build(retryCommission(run));
      }
      const result = simulateDrop(dropConfig(run));
      run = settleDrop(launchDrop(run), result);
      report.timeouts += Number(result.timedOut);
      report.maxTokens = Math.max(report.maxTokens, result.splits + 1);
      stageSeconds += result.ticks / 120;
    }
    report.simulatedSeconds += stageSeconds;
    report.stages.push({ stage: stage + 1, target: commission(run).target, drops: run.totalDrops - startingDrops, retries: run.retries, payout: run.score, bestDrop: run.bestDrop, brass: run.brass, power: run.power, parts: Object.keys(run.board).length, simulationSeconds: Math.round(stageSeconds * 100) / 100 });
    if (run.phase !== 'review') break;
    report.stagesCleared += 1;
    run = (policy.collect ?? collectCommission)(run);
    if (run.phase === 'won') { report.won = true; break; }
    const shopped = (policy.shop ?? shopLegally)(run, strategy);
    policy.observeShop?.(structuredClone(run), structuredClone(shopped));
    run = nextCommission(shopped);
  }
  report.totalDrops = run.totalDrops;
  report.bestDrop = run.bestDrop;
  report.totalScore = run.totalScore;
  report.simulatedSeconds = Math.round(report.simulatedSeconds * 100) / 100;
  return report;
}