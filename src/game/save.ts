import { z } from 'zod';
import { ACHIEVEMENTS, PART_KINDS } from './content';
import { commission, newRun, recoverInterruptedDrop, type RunState } from './engine';
import { MAX_VALUE, SLOT_MAP, type PegKind } from './model';
import { TUTORIAL_STEPS } from './tutorial';

export const SAVE_KEY = 'pocket-cascade.save.v1';
export const BACKUP_KEY = `${SAVE_KEY}.backup`;
export const MAX_SAVE_LENGTH = 2 * 1024 * 1024;

const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const kindSchema = z.enum(PART_KINDS as [PegKind, ...PegKind[]]);
const pegSchema = z.object({ id: z.string().regex(/^part-\d+$/).max(30), kind: kindSchema, direction: z.union([z.literal(-1), z.literal(1)]) });
const boardSchema = z.record(z.string(), pegSchema).refine((board) => Object.keys(board).every((slotId) => Boolean(SLOT_MAP[slotId])), 'Invalid socket');
const configSchema = z.object({ board: boardSchema, lane: integer.max(8), baseValue: integer.min(1).max(MAX_VALUE), seed: integer.max(0xffffffff) });
const eventSchema = z.object({
  tick: integer.max(1440), type: z.enum(['hit', 'split', 'bank', 'payout']),
  x: z.number().finite(), y: z.number().finite(), label: z.string().max(80),
  amount: z.number().finite().max(Number.MAX_SAFE_INTEGER), tokenId: integer,
  slotId: z.string().optional(), kind: kindSchema.optional(), tray: integer.max(2).optional(),
});
const resultSchema = z.object({
  total: integer, banked: integer, trayTotals: z.tuple([integer, integer, integer]),
  hits: integer.max(184), splits: integer.max(3), maxValue: integer.max(MAX_VALUE),
  maxChain: integer.max(46), ticks: integer.max(1440), timedOut: z.boolean(), events: z.array(eventSchema).max(500),
});

const runSchema = z.object({
  seed: integer.max(0xffffffff), mode: z.enum(['workshop', 'daily', 'endless']), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stage: integer.max(10000), phase: z.enum(['ready', 'dropping', 'review', 'shop', 'lost', 'won']),
  board: boardSchema, bench: z.array(pegSchema).max(100), lane: integer.max(8),
  score: integer, dropsLeft: integer.max(5), brass: integer.max(1_000_000),
  power: integer.max(8), retries: integer, totalDrops: integer, totalScore: integer,
  bestDrop: integer, nextId: integer.min(6).max(1_000_000), assisted: z.boolean(),
  rewardChoices: z.array(kindSchema).max(3), rewardClaimed: z.boolean(),
  offers: z.array(z.object({ id: z.string().max(40), kind: kindSchema, price: integer.max(100), sold: z.boolean() })).max(3),
  rerolls: integer.max(2), lastDrop: resultSchema.nullable(), activeDrop: configSchema.nullable(),
  lastReward: integer.max(100), discovered: z.array(kindSchema).max(8),
}).superRefine((run, context) => {
  const pegs = [...Object.values(run.board), ...run.bench];
  if (new Set(pegs.map((peg) => peg.id)).size !== pegs.length) context.addIssue({ code: 'custom', message: 'Duplicate part ownership' });
  if (pegs.some((peg) => Number(peg.id.slice(5)) >= run.nextId)) context.addIssue({ code: 'custom', message: 'Invalid next part identifier' });
  if (Object.keys(run.board).length > commission(run).capacity) context.addIssue({ code: 'custom', message: 'Machine exceeds socket capacity' });
  if ((run.phase === 'dropping') !== Boolean(run.activeDrop)) context.addIssue({ code: 'custom', message: 'Invalid active drop' });
  if (run.phase === 'ready' && run.dropsLeft === 0) context.addIssue({ code: 'custom', message: 'No launches available' });
  if (['review', 'shop', 'won'].includes(run.phase) && run.score < commission(run).target) context.addIssue({ code: 'custom', message: 'Unfinished commission' });
  if (run.lastDrop && run.lastDrop.total !== run.lastDrop.banked + run.lastDrop.trayTotals.reduce((total, amount) => total + amount, 0)) {
    context.addIssue({ code: 'custom', message: 'Unbalanced payout' });
  }
});

export const settingsSchema = z.object({
  volume: z.number().min(0).max(1), musicVolume: z.number().min(0).max(1), muted: z.boolean(),
  reducedMotion: z.boolean(), trails: z.boolean(), highContrast: z.boolean(),
  speed: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  theme: z.enum(['light', 'dark']), fullscreen: z.boolean(),
  fullscreenPreferenceVersion: z.literal(1).optional(),
});

export type Settings = z.infer<typeof settingsSchema>;

const profileSchema = z.object({
  seenTutorial: z.boolean(), completedRuns: integer, lifetimeScore: integer, bestDrop: integer,
  tutorialStep: z.enum(TUTORIAL_STEPS).optional(),
  achievements: z.array(z.string().max(40)).max(50), discovered: z.array(kindSchema).max(8),
  dailyCompleted: z.array(z.string().max(10)).max(400),
  history: z.array(z.object({ seed: integer, score: integer, bestDrop: integer, date: z.string().max(30), mode: z.enum(['workshop', 'daily', 'endless']), stage: integer, won: z.boolean() })).max(24),
});

export type Profile = z.infer<typeof profileSchema>;

export const saveSchema = z.object({
  version: z.literal(1), savedAt: z.string().max(40), run: runSchema,
  settings: settingsSchema, profile: profileSchema,
});

export interface SaveData {
  version: 1;
  savedAt: string;
  run: RunState;
  settings: Settings;
  profile: Profile;
}

export function freshSave(seed?: number): SaveData {
  return {
    version: 1, savedAt: new Date().toISOString(), run: newRun(seed),
    settings: { volume: 0.65, musicVolume: 0.28, muted: false, reducedMotion: false, trails: true, highContrast: false, speed: 1, theme: 'dark', fullscreen: true, fullscreenPreferenceVersion: 1 },
    profile: { seenTutorial: false, tutorialStep: 'place', completedRuns: 0, lifetimeScore: 0, bestDrop: 0, achievements: [], discovered: ['mint', 'doubler', 'splitter'], dailyCompleted: [], history: [] },
  };
}

export function migrateDesktopSave(save: SaveData): SaveData {
  if (save.settings.fullscreenPreferenceVersion === 1) return save;
  return { ...save, settings: { ...save.settings, fullscreen: true, fullscreenPreferenceVersion: 1 } };
}

export function parseSave(json: string): SaveData | null {
  if (json.length > MAX_SAVE_LENGTH) return null;
  try {
    const parsed = saveSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    return { ...parsed.data, run: recoverInterruptedDrop(parsed.data.run) };
  } catch {
    return null;
  }
}

export function updateProgress(save: SaveData, run: RunState): SaveData {
  const previous = save.run;
  const profile = { ...save.profile };
  const achievements = new Set(profile.achievements);
  profile.discovered = [...new Set([...profile.discovered, ...run.discovered])];
  if (run.seed === previous.seed) profile.lifetimeScore += Math.max(0, run.totalScore - previous.totalScore);
  profile.bestDrop = Math.max(profile.bestDrop, run.bestDrop);
  if (run.phase === 'review' || run.stage > 0) achievements.add('FIRST_CASCADE');
  if (run.lastDrop?.splits === 3) achievements.add('FOUR_TOKENS');
  if ((run.lastDrop?.maxChain ?? 0) >= 8) achievements.add('CHAIN_EIGHT');
  if (run.bestDrop >= 1000) achievements.add('THOUSAND_DROP');
  if (run.bestDrop >= 10000) achievements.add('TEN_THOUSAND_DROP');
  if (run.score >= commission(run).target * 2) achievements.add('OVERDRIVE');
  if (profile.discovered.length === PART_KINDS.length) achievements.add('ALL_PARTS');
  if (run.phase === 'won' && previous.phase !== 'won') {
    achievements.add('WORKSHOP_COMPLETE');
    profile.completedRuns += 1;
    if (run.mode === 'daily') {
      achievements.add('DAILY_COMPLETE');
      profile.dailyCompleted = [...new Set([...profile.dailyCompleted, run.date])].slice(-400);
    }
    profile.history = [{ seed: run.seed, score: run.totalScore, bestDrop: run.bestDrop, date: new Date().toISOString(), mode: run.mode, stage: run.stage, won: true }, ...profile.history].slice(0, 24);
  }
  if (run.stage >= 16 && run.phase === 'review') achievements.add('ENDLESS_FIVE');
  profile.achievements = [...achievements].filter((id) => ACHIEVEMENTS.some((achievement) => achievement.id === id));
  return { ...save, run, profile, savedAt: new Date().toISOString() };
}

export interface LoadResult {
  save: SaveData;
  message: string | null;
}

export function loadBrowserSave(storage: Pick<Storage, 'getItem'>): LoadResult {
  try {
    const primary = storage.getItem(SAVE_KEY);
    const parsed = primary ? parseSave(primary) : null;
    if (parsed) return { save: parsed, message: null };
    const backup = storage.getItem(BACKUP_KEY);
    const recovered = backup ? parseSave(backup) : null;
    if (recovered) return { save: recovered, message: 'Recovered your machine from its backup.' };
    return { save: freshSave(), message: primary || backup ? 'The saved machine could not be read. A fresh workshop is ready.' : null };
  } catch {
    return { save: freshSave(), message: 'Storage is unavailable. Progress will last for this session only.' };
  }
}

export function writeBrowserSave(storage: Pick<Storage, 'getItem' | 'setItem'>, save: SaveData): void {
  const previous = storage.getItem(SAVE_KEY);
  if (previous && parseSave(previous)) storage.setItem(BACKUP_KEY, previous);
  storage.setItem(SAVE_KEY, JSON.stringify(save));
}