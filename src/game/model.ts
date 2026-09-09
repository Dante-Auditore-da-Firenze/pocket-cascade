export const BOARD_WIDTH = 500;
export const BOARD_HEIGHT = 650;
export const FIXED_STEP = 1000 / 120;
export const MAX_TICKS = 1440;
export const MAX_SPLIT_DEPTH = 2;
export const MAX_VALUE = 1_000_000_000_000;
export const TRAY_MULTIPLIERS = [1, 2, 1] as const;

export type PegKind = 'mint' | 'doubler' | 'splitter' | 'kicker' | 'relay' | 'vault' | 'echo' | 'crown';

export interface Peg {
  id: string;
  kind: PegKind;
  direction: -1 | 1;
}

export type Board = Record<string, Peg>;

export interface Slot {
  id: string;
  row: number;
  column: number;
  x: number;
  y: number;
}

export const SLOTS: Slot[] = Array.from({ length: 7 }, (_, row) =>
  Array.from({ length: row % 2 === 0 ? 7 : 6 }, (_, column) => ({
    id: `${row}-${column}`,
    row,
    column,
    x: 52 + column * 66 + (row % 2 === 1 ? 33 : 0),
    y: 122 + row * 62,
  })),
).flat();

export const SLOT_MAP = Object.fromEntries(SLOTS.map((slot) => [slot.id, slot]));

export function lanePosition(lane: number): number {
  return 58 + Math.max(0, Math.min(8, lane)) * 48;
}

export function money(value: number): number {
  return Math.min(MAX_VALUE, Math.max(0, Math.round(value)));
}

export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DropConfig {
  board: Board;
  lane: number;
  baseValue: number;
  seed: number;
}

export interface CascadeEvent {
  tick: number;
  type: 'hit' | 'split' | 'bank' | 'payout';
  x: number;
  y: number;
  label: string;
  amount: number;
  tokenId: number;
  slotId?: string;
  kind?: PegKind;
  tray?: number;
}

export interface TokenView {
  id: number;
  x: number;
  y: number;
  value: number;
  chain: number;
  depth: number;
}

export interface PhysicalImpact {
  tick: number;
  tokenId: number;
  x: number;
  y: number;
  surface: 'peg' | 'wall';
  strength: number;
  scored: boolean;
  kind?: PegKind;
  slotId?: string;
}

export interface DropResult {
  total: number;
  banked: number;
  trayTotals: [number, number, number];
  hits: number;
  splits: number;
  maxValue: number;
  maxChain: number;
  ticks: number;
  timedOut: boolean;
  events: CascadeEvent[];
}