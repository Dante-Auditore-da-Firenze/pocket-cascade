import { COMMISSIONS, PARTS, PART_KINDS, POWER_VALUES, powerPrice, type Commission } from './content';
import { SLOT_MAP, random, type Board, type DropConfig, type DropResult, type Peg, type PegKind } from './model';

export type Phase = 'ready' | 'dropping' | 'review' | 'shop' | 'lost' | 'won';
export type RunMode = 'workshop' | 'daily' | 'endless';
export const MAX_OWNED_PARTS = 80;

export interface Offer {
  id: string;
  kind: PegKind;
  price: number;
  sold: boolean;
}

export interface RunState {
  seed: number;
  mode: RunMode;
  date: string;
  stage: number;
  phase: Phase;
  board: Board;
  bench: Peg[];
  lane: number;
  score: number;
  dropsLeft: number;
  brass: number;
  power: number;
  retries: number;
  totalDrops: number;
  totalScore: number;
  bestDrop: number;
  nextId: number;
  assisted: boolean;
  rewardChoices: PegKind[];
  rewardClaimed: boolean;
  offers: Offer[];
  rerolls: number;
  lastDrop: DropResult | null;
  activeDrop: DropConfig | null;
  lastReward: number;
  discovered: PegKind[];
}

export function dailySeed(date = new Date().toISOString().slice(0, 10)): number {
  let seed = 2166136261;
  for (const character of `pocket-cascade:${date}`) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return seed >>> 0;
}

export function parseMachineSeed(value: string, fallback = Date.now() >>> 0): number {
  const input = value.trim();
  if (!input) return fallback;
  if (/^\d+$/.test(input) && Number(input) <= 0xffffffff) return Number(input);
  return dailySeed(input);
}

export function newRun(seed = Date.now() >>> 0, mode: RunMode = 'workshop', assisted = false): RunState {
  return {
    seed: seed >>> 0, mode, date: new Date().toISOString().slice(0, 10), stage: 0, phase: 'ready',
    board: {
      '0-3': { id: 'part-1', kind: 'mint', direction: 1 },
      '1-2': { id: 'part-2', kind: 'mint', direction: 1 },
      '1-3': { id: 'part-3', kind: 'mint', direction: 1 },
      '2-3': { id: 'part-4', kind: 'doubler', direction: 1 },
    },
    bench: [{ id: 'part-5', kind: 'splitter', direction: 1 }],
    lane: 4, score: 0, dropsLeft: 5, brass: 0, power: 0, retries: 0,
    totalDrops: 0, totalScore: 0, bestDrop: 0, nextId: 6, assisted: mode === 'daily' ? false : assisted,
    rewardChoices: [], rewardClaimed: false, offers: [], rerolls: 0,
    lastDrop: null, activeDrop: null, lastReward: 0, discovered: ['mint', 'doubler', 'splitter'],
  };
}

export function commission(run: Pick<RunState, 'stage' | 'assisted'>): Commission {
  const definition = COMMISSIONS[run.stage] ?? {
    title: `After Hours ${run.stage - 11}`,
    subtitle: 'The machine still has something to give.',
    target: Math.min(1_000_000_000, Math.round(20000 * 1.38 ** (run.stage - 11))),
    drops: 5, reward: 15, capacity: 20,
  };
  return { ...definition, target: Math.round(definition.target * (run.assisted ? 0.65 : 1)) };
}

export function baseValue(run: Pick<RunState, 'power' | 'retries'>): number {
  return Math.round(POWER_VALUES[run.power] * (1 + Math.min(run.retries, 3) * 0.1));
}

export function dropConfig(run: RunState): DropConfig {
  return { board: structuredClone(run.board), lane: run.lane, baseValue: baseValue(run), seed: run.seed };
}

function editable(run: RunState): boolean {
  return run.phase === 'ready' || run.phase === 'shop' || run.phase === 'lost';
}

export function setLane(run: RunState, lane: number): RunState {
  return editable(run) ? { ...run, lane: Math.max(0, Math.min(8, Math.round(lane))) } : run;
}

export function placePeg(run: RunState, pegId: string, slotId: string): RunState {
  if (!editable(run) || !SLOT_MAP[slotId]) return run;
  const source = Object.entries(run.board).find(([, peg]) => peg.id === pegId);
  const peg = source?.[1] ?? run.bench.find((item) => item.id === pegId);
  if (!peg || source?.[0] === slotId) return run;
  const displaced = run.board[slotId];
  if (!source && !displaced && Object.keys(run.board).length >= commission(run).capacity) return run;
  const board = { ...run.board, [slotId]: peg };
  let bench = run.bench.filter((item) => item.id !== pegId);
  if (source) {
    if (displaced) board[source[0]] = displaced;
    else delete board[source[0]];
  } else if (displaced) bench = [...bench, displaced];
  return { ...run, board, bench };
}

export function removePeg(run: RunState, slotId: string): RunState {
  if (!editable(run) || !run.board[slotId]) return run;
  const board = { ...run.board };
  const peg = board[slotId];
  delete board[slotId];
  return { ...run, board, bench: [...run.bench, peg] };
}

export function rotatePeg(run: RunState, pegId: string): RunState {
  if (!editable(run)) return run;
  const board = Object.fromEntries(Object.entries(run.board).map(([slotId, peg]) => [
    slotId, peg.id === pegId ? { ...peg, direction: peg.direction === 1 ? -1 as const : 1 as const } : peg,
  ]));
  const bench = run.bench.map((peg) => peg.id === pegId ? { ...peg, direction: peg.direction === 1 ? -1 as const : 1 as const } : peg);
  return { ...run, board, bench };
}

export function launchDrop(run: RunState): RunState {
  if (run.phase !== 'ready' || run.dropsLeft <= 0) return run;
  return { ...run, phase: 'dropping', dropsLeft: run.dropsLeft - 1, activeDrop: dropConfig(run) };
}

export function settleDrop(run: RunState, result: DropResult): RunState {
  if (run.phase !== 'dropping' || !run.activeDrop) return run;
  if (!Number.isSafeInteger(result.total) || result.total < 0
    || result.total !== result.banked + result.trayTotals.reduce((total, amount) => total + amount, 0)) return run;
  const score = run.score + result.total;
  const phase: Phase = score >= commission(run).target ? 'review' : run.dropsLeft === 0 ? 'lost' : 'ready';
  return {
    ...run, score, phase, activeDrop: null, lastDrop: result,
    totalDrops: run.totalDrops + 1, totalScore: run.totalScore + result.total,
    bestDrop: Math.max(run.bestDrop, result.total),
  };
}

export function retryCommission(run: RunState): RunState {
  if (run.phase !== 'lost') return run;
  return {
    ...run, phase: 'ready', score: 0, dropsLeft: commission(run).drops,
    retries: run.retries + 1, lastDrop: null, activeDrop: null,
  };
}

export function canRestartCommission(run: RunState): boolean {
  return run.phase === 'ready' || run.phase === 'dropping' || run.phase === 'lost';
}

export function restartCommission(run: RunState): RunState {
  if (!canRestartCommission(run)) return run;
  return { ...run, phase: 'ready', score: 0, dropsLeft: commission(run).drops, lastDrop: null, activeDrop: null };
}

export function salvagePeg(run: RunState, pegId: string): RunState {
  if (!editable(run)) return run;
  const peg = run.bench.find((item) => item.id === pegId);
  if (!peg) return run;
  return { ...run, bench: run.bench.filter((item) => item.id !== pegId), brass: run.brass + 1 };
}

function chooseParts(run: RunState, offset: number): PegKind[] {
  const available = PART_KINDS.filter((kind) => PARTS[kind].unlock <= run.stage + 1);
  const seeded = random(run.seed + run.stage * 661 + offset);
  const shuffled = [...available];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(seeded() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  const newlyUnlocked = available.find((kind) => PARTS[kind].unlock === run.stage + 1);
  return newlyUnlocked ? [newlyUnlocked, ...shuffled.filter((kind) => kind !== newlyUnlocked)].slice(0, 3) : shuffled.slice(0, 3);
}

function makeOffers(run: RunState, reroll: number): Offer[] {
  const choices = chooseParts(run, 137 + reroll * 139);
  return choices.map((kind, index) => ({ id: `${run.stage}-${reroll}-${index}`, kind, price: PARTS[kind].price, sold: false }));
}

export function commissionReward(run: RunState): { base: number; spare: number; overdrive: number; total: number } {
  const definition = commission(run);
  const spare = Math.min(3, run.dropsLeft);
  const overdrive = Math.min(3, Math.floor(Math.max(0, run.score / definition.target - 1) * 2));
  return { base: definition.reward, spare, overdrive, total: definition.reward + spare + overdrive };
}

export function collectCommission(run: RunState): RunState {
  if (run.phase !== 'review') return run;
  const reward = commissionReward(run).total;
  const won = run.stage === 11 && run.mode !== 'endless';
  return {
    ...run, phase: won ? 'won' : 'shop', brass: run.brass + reward,
    lastReward: reward, rewardClaimed: false, rewardChoices: chooseParts(run, 41),
    offers: makeOffers(run, 0), rerolls: 0,
  };
}

function grantPart(run: RunState, kind: PegKind): RunState {
  return {
    ...run, nextId: run.nextId + 1,
    bench: [...run.bench, { id: `part-${run.nextId}`, kind, direction: 1 }],
    discovered: [...new Set([...run.discovered, kind])],
  };
}

export function claimPart(run: RunState, kind: PegKind): RunState {
  if (run.phase !== 'shop' || run.rewardClaimed || !run.rewardChoices.includes(kind)) return run;
  if (run.bench.length + Object.keys(run.board).length >= MAX_OWNED_PARTS) {
    return { ...run, rewardClaimed: true, brass: run.brass + 2 };
  }
  return { ...grantPart(run, kind), rewardClaimed: true };
}

export function buyPart(run: RunState, offerId: string): RunState {
  if (run.phase !== 'shop' || run.bench.length + Object.keys(run.board).length >= MAX_OWNED_PARTS) return run;
  const offer = run.offers.find((item) => item.id === offerId);
  if (!offer || offer.sold || run.brass < offer.price) return run;
  return {
    ...grantPart(run, offer.kind), brass: run.brass - offer.price,
    offers: run.offers.map((item) => item.id === offerId ? { ...item, sold: true } : item),
  };
}

export function upgradePower(run: RunState): RunState {
  if (run.phase !== 'shop' || run.power >= POWER_VALUES.length - 1 || run.brass < powerPrice(run.power)) return run;
  return { ...run, brass: run.brass - powerPrice(run.power), power: run.power + 1 };
}

export function rerollShop(run: RunState): RunState {
  if (run.phase !== 'shop' || run.rerolls >= 2 || run.brass < 2) return run;
  return { ...run, brass: run.brass - 2, rerolls: run.rerolls + 1, offers: makeOffers(run, run.rerolls + 1) };
}

export function nextCommission(run: RunState): RunState {
  if (run.phase !== 'shop' || !run.rewardClaimed) return run;
  const next = { ...run, stage: run.stage + 1 };
  return {
    ...next, phase: 'ready', score: 0, dropsLeft: commission(next).drops,
    retries: 0, lastDrop: null, offers: [], rewardChoices: [], rewardClaimed: false,
  };
}

export function enterEndless(run: RunState): RunState {
  return run.phase === 'won' ? { ...run, mode: 'endless', phase: 'shop' } : run;
}

export function recoverInterruptedDrop(run: RunState): RunState {
  return run.phase === 'dropping' ? { ...run, phase: 'ready', dropsLeft: run.dropsLeft + 1, activeDrop: null } : run;
}