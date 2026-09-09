import type { Peg, PegKind } from '../game/model';

export interface PartStack {
  key: string;
  kind: PegKind;
  direction: Peg['direction'] | null;
  parts: Peg[];
}

export function partStackKey(peg: Pick<Peg, 'kind' | 'direction'>): string {
  return peg.kind === 'splitter' || peg.kind === 'kicker'
    ? `${peg.kind}:${peg.direction === 1 ? 'right' : 'left'}`
    : peg.kind;
}

export function groupSpareParts(parts: readonly Peg[]): PartStack[] {
  const stacks = new Map<string, PartStack>();
  for (const part of parts) {
    const key = partStackKey(part);
    const existing = stacks.get(key);
    if (existing) existing.parts.push(part);
    else stacks.set(key, {
      key,
      kind: part.kind,
      direction: part.kind === 'splitter' || part.kind === 'kicker' ? part.direction : null,
      parts: [part],
    });
  }
  return [...stacks.values()];
}