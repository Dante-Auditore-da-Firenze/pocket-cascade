import type { Peg, PegKind } from './model';

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
  mint: { kind: 'mint', name: 'Mint', symbol: '+', family: 'GENERATOR', description: '+140% base value and 1 charge.', detail: 'Charge powers amplifiers; each token holds up to 3. Place generators between amplifiers to recharge.', price: 3, unlock: 0, color: 'success' },
  doubler: { kind: 'doubler', name: 'Doubler', symbol: 'x2', family: 'AMPLIFIER', description: 'Spends 1 charge to double token value.', detail: 'No charge means no multiplication. Generated value and part order matter.', price: 5, unlock: 0, color: 'warning' },
  splitter: { kind: 'splitter', name: 'Fork', symbol: 'Y', family: 'CASCADE', description: 'Creates a token worth 75% of this one.', detail: 'Four tokens maximum. Splits remaining charge and reserves between branches. Further Fork hits grant 1 charge; visited parts are inherited.', price: 6, unlock: 0, color: 'accent' },
  kicker: { kind: 'kicker', name: 'Kicker', symbol: '>', family: 'ROUTE', description: 'Redirects; adds one base value and 1 charge.', detail: 'Rotate left or right. Each token can trigger a part only once, including after a return trip.', price: 4, unlock: 2, color: 'link' },
  relay: { kind: 'relay', name: 'Relay', symbol: '*', family: 'SUPPORT', description: '+1 charge; adds base value per neighbor, plus one.', detail: 'Counts up to six occupied neighboring sockets. Supports a route even when neighboring parts are not hit.', price: 5, unlock: 3, color: 'success' },
  vault: { kind: 'vault', name: 'Vault', symbol: '=', family: 'BANK', description: 'Banks 50% of value, plus 25% per stored charge.', detail: 'Spends all charge. Banked points are extra; the token keeps its value and a deposit reserve for Dividend.', price: 5, unlock: 4, color: 'warning' },
  echo: { kind: 'echo', name: 'Echo', symbol: '~', family: 'REPEAT', description: 'Repeats the last addition or multiplier once.', detail: 'Multiplication costs 1 charge. Clears the remembered effect, so Echo cannot feed another Echo. Adds no charge by itself.', price: 6, unlock: 6, color: 'link' },
  crown: { kind: 'crown', name: 'Crown', symbol: 'W', family: 'FINISHER', description: 'Spends 2 charge for x(1 + 0.4 per kind hit).', detail: 'Counts itself. Needs both a diverse route and charge remaining when it arrives.', price: 8, unlock: 8, color: 'accent' },
  dividend: { kind: 'dividend', name: 'Dividend', symbol: '$', family: 'CASH-OUT', description: 'Adds twice this token\'s unused banked reserve.', detail: 'Uses up the reserve, not the earned points. Place after Vault or Junction. Without deposits it adds nothing.', price: 6, unlock: 5, color: 'warning' },
  junction: { kind: 'junction', name: 'Junction', symbol: '><', family: 'CONVERGENCE', description: '+1 charge. Banks both entry values when a second token arrives.', detail: 'Two distinct tokens must reach this same part in one launch. One combined bonus per Junction; it never stalls a token.', price: 6, unlock: 7, color: 'link' },
};

export const PART_KINDS = Object.keys(PARTS) as PegKind[];

export const TUNINGS: Record<PegKind, { name: string; description: string }> = {
  mint: { name: 'Dynamo', description: 'Produces 2 charge instead of 1.' },
  doubler: { name: 'Crossfeed', description: 'After doubling, gives 1 charge to another live token.' },
  splitter: { name: 'Starter', description: 'Each new branch starts with 1 extra charge.' },
  kicker: { name: 'Tollgate', description: 'Also banks one base value on contact.' },
  relay: { name: 'Network', description: 'Produces 1 extra charge per two occupied neighbors.' },
  vault: { name: 'Capacitor', description: 'Keeps 1 charge after making its deposit.' },
  echo: { name: 'Recovery', description: 'Restores 1 charge after a successful repeat.' },
  crown: { name: 'Insurance', description: 'When charge is insufficient, banks one base value per kind hit.' },
  dividend: { name: 'Reinvest', description: 'Cash-out also grants 2 charge for the next amplifier.' },
  junction: { name: 'Exchange', description: 'Third and fourth arrivals also bank their entry value.' },
};

export function partName(part: Pick<Peg, 'kind' | 'tuned'>): string {
  return `${part.tuned ? 'Tuned ' : ''}${PARTS[part.kind].name}`;
}

export function tuningPrice(kind: PegKind): number {
  return PARTS[kind].price + 3;
}

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
  { title: 'Good Company', subtitle: 'The right neighbors make all the difference.', target: 1500, drops: 5, reward: 8, capacity: 9 },
  { title: 'A Little Reserve', subtitle: 'Something for now. Something for later.', target: 3000, drops: 5, reward: 8, capacity: 9 },
  { title: 'Cash Flow', subtitle: 'Deposits power the next step.', target: 6000, drops: 5, reward: 9, capacity: 10 },
  { title: 'Once More', subtitle: 'Some things deserve an encore.', target: 10000, drops: 5, reward: 9, capacity: 10 },
  { title: 'Meeting Point', subtitle: 'Bring the branches together.', target: 16000, drops: 5, reward: 10, capacity: 11 },
  { title: 'Crown Jewel', subtitle: 'Charge for the finish.', target: 24000, drops: 5, reward: 10, capacity: 11 },
  { title: 'Golden Hour', subtitle: 'Everything is in its right place.', target: 36000, drops: 5, reward: 11, capacity: 12 },
  { title: 'Grand Design', subtitle: 'Not luck. A lovely little system.', target: 52000, drops: 5, reward: 11, capacity: 12 },
  { title: 'One Last Cascade', subtitle: 'Look what you made.', target: 75000, drops: 5, reward: 15, capacity: 13 },
];

export const POWER_VALUES = [10, 14, 19, 25, 32, 40, 49, 59, 70] as const;

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
  { id: 'ALL_PARTS', name: 'The Whole Collection', description: 'Discover all ten parts.' },
  { id: 'WORKSHOP_COMPLETE', name: 'Look What You Made', description: 'Finish all twelve commissions.' },
  { id: 'DAILY_COMPLETE', name: 'A Good Day\'s Work', description: 'Complete a daily machine.' },
  { id: 'ENDLESS_FIVE', name: 'Just One More', description: 'Complete five endless commissions.' },
];