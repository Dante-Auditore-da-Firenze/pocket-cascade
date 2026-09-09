import type { PegKind } from './model';

export interface PartDefinition {
  kind: PegKind;
  name: string;
  symbol: string;
  family: string;
  description: string;
  detail: string;
  price: number;
  unlock: number;
  color: 'success' | 'warning' | 'accent' | 'link' | 'text';
}

export const PARTS: Record<PegKind, PartDefinition> = {
  mint: { kind: 'mint', name: 'Mint', symbol: '+', family: 'GROWTH', description: 'Adds 140% of the token base value.', detail: 'A reliable beginning. Add value before multiplying it.', price: 3, unlock: 0, color: 'success' },
  doubler: { kind: 'doubler', name: 'Doubler', symbol: 'x2', family: 'MULTIPLY', description: 'Doubles this token\'s current value.', detail: 'Every point already on the token gets doubled, including other parts\' bonuses.', price: 5, unlock: 0, color: 'warning' },
  splitter: { kind: 'splitter', name: 'Fork', symbol: 'Y', family: 'CASCADE', description: 'Creates another token worth 75% of this one.', detail: 'Two generations, up to four tokens per launch. Further Fork hits multiply value by 1.25 instead. Tokens do not collide with each other.', price: 6, unlock: 0, color: 'accent' },
  kicker: { kind: 'kicker', name: 'Kicker', symbol: '>', family: 'ROUTE', description: 'Kicks left or right and adds one base value.', detail: 'Revisit a useful section of the machine. Each part can trigger only once for each token. Rotate to change direction.', price: 4, unlock: 2, color: 'link' },
  relay: { kind: 'relay', name: 'Relay', symbol: '*', family: 'NEIGHBORS', description: 'Adds one base value, plus one per adjacent part.', detail: 'The six nearest sockets count as neighbors. Build a cluster around a Relay to make it sing.', price: 5, unlock: 3, color: 'success' },
  vault: { kind: 'vault', name: 'Vault', symbol: '=', family: 'BANK', description: 'Banks 50% of this token without consuming it.', detail: 'Banked points immediately count toward the commission. The token keeps all of its value.', price: 5, unlock: 4, color: 'warning' },
  echo: { kind: 'echo', name: 'Echo', symbol: '~', family: 'REPEAT', description: 'Repeats the last addition or multiplier.', detail: 'Remembers Mint, Doubler, Relay, or Crown. Without a previous effect, adds one base value. Does not repeat splitting or routing.', price: 6, unlock: 5, color: 'link' },
  crown: { kind: 'crown', name: 'Crown', symbol: 'W', family: 'FINISHER', description: 'Multiplies by 1 + 0.4 per different part hit.', detail: 'Includes the Crown itself. A diverse route can reach x4.2. Best at the end of a long cascade.', price: 8, unlock: 6, color: 'accent' },
};

export const PART_KINDS = Object.keys(PARTS) as PegKind[];

export interface Commission {
  title: string;
  subtitle: string;
  target: number;
  drops: number;
  reward: number;
  capacity: number;
}

export const COMMISSIONS: Commission[] = [
  { title: 'Loose Change', subtitle: 'Every great machine starts somewhere.', target: 100, drops: 5, reward: 6, capacity: 7 },
  { title: 'Double Take', subtitle: 'A small improvement. A very different result.', target: 300, drops: 5, reward: 7, capacity: 8 },
  { title: 'Branching Out', subtitle: 'One good idea becomes two.', target: 550, drops: 5, reward: 7, capacity: 9 },
  { title: 'Good Company', subtitle: 'The right neighbors make all the difference.', target: 850, drops: 5, reward: 8, capacity: 10 },
  { title: 'A Little Reserve', subtitle: 'Something for now. Something for later.', target: 1300, drops: 5, reward: 8, capacity: 11 },
  { title: 'Once More', subtitle: 'Some things deserve an encore.', target: 1950, drops: 5, reward: 9, capacity: 12 },
  { title: 'Crown Jewel', subtitle: 'Give the whole machine a reason to shine.', target: 2850, drops: 5, reward: 9, capacity: 13 },
  { title: 'Compound Interest', subtitle: 'The little things are adding up.', target: 4200, drops: 5, reward: 10, capacity: 14 },
  { title: 'Pocket Reactor', subtitle: 'There is a lot happening in a little space.', target: 6200, drops: 5, reward: 10, capacity: 15 },
  { title: 'Golden Hour', subtitle: 'Everything is in its right place.', target: 9000, drops: 5, reward: 11, capacity: 16 },
  { title: 'Grand Design', subtitle: 'Not luck. A lovely little system.', target: 13500, drops: 5, reward: 11, capacity: 17 },
  { title: 'One Last Cascade', subtitle: 'Look what you made.', target: 20000, drops: 5, reward: 15, capacity: 18 },
];

export const POWER_VALUES = [10, 15, 23, 35, 52, 78, 117, 175, 260] as const;

export function powerPrice(level: number): number {
  return 6 + level * 3;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'FIRST_CASCADE', name: 'Small Beginnings', description: 'Complete your first commission.' },
  { id: 'FOUR_TOKENS', name: 'Family Tree', description: 'Create four tokens in one launch.' },
  { id: 'CHAIN_EIGHT', name: 'Well Connected', description: 'Trigger eight parts with one token.' },
  { id: 'THOUSAND_DROP', name: 'Pocket Money', description: 'Earn 1,000 points in one launch.' },
  { id: 'TEN_THOUSAND_DROP', name: 'Extraordinary Interest', description: 'Earn 10,000 points in one launch.' },
  { id: 'OVERDRIVE', name: 'And Then Some', description: 'Finish a commission at twice its target.' },
  { id: 'ALL_PARTS', name: 'The Whole Collection', description: 'Discover all eight parts.' },
  { id: 'WORKSHOP_COMPLETE', name: 'Look What You Made', description: 'Finish all twelve commissions.' },
  { id: 'DAILY_COMPLETE', name: 'A Good Day\'s Work', description: 'Complete a daily machine.' },
  { id: 'ENDLESS_FIVE', name: 'Just One More', description: 'Complete five endless commissions.' },
];