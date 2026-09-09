import { describe, expect, it } from 'vitest';
import { groupSpareParts, partStackKey } from '../src/components/partStacks';
import { placePeg, removePeg, rotatePeg, salvagePeg, newRun } from '../src/game/engine';
import { freshSave, parseSave } from '../src/game/save';
import type { Peg } from '../src/game/model';

const spares: Peg[] = [
  { id: 'part-6', kind: 'mint', direction: 1 },
  { id: 'part-7', kind: 'echo', direction: 1 },
  { id: 'part-8', kind: 'mint', direction: 1 },
  { id: 'part-9', kind: 'echo', direction: 1 },
  { id: 'part-10', kind: 'mint', direction: 1 },
  { id: 'part-11', kind: 'splitter', direction: 1 },
  { id: 'part-12', kind: 'echo', direction: 1 },
  { id: 'part-13', kind: 'splitter', direction: 1 },
  { id: 'part-14', kind: 'relay', direction: 1 },
];

describe('spare-part display stacks', () => {
  it('shows nine equivalent spares as four stable stacks while preserving all original IDs', () => {
    const original = structuredClone(spares);
    const stacks = groupSpareParts(spares);
    expect(stacks.map((stack) => [stack.key, stack.parts.length])).toEqual([
      ['mint', 3], ['echo', 3], ['splitter:right', 2], ['relay', 1],
    ]);
    expect(stacks.flatMap((stack) => stack.parts.map((part) => part.id)).sort()).toEqual(spares.map((part) => part.id).sort());
    expect(stacks[0].parts[0]).toBe(spares[0]);
    expect(spares).toEqual(original);
  });

  it.each(['splitter', 'kicker'] as const)('keeps opposite %s directions separate', (kind) => {
    const stacks = groupSpareParts([
      { id: 'part-6', kind, direction: 1 },
      { id: 'part-7', kind, direction: -1 },
      { id: 'part-8', kind, direction: 1 },
    ]);
    expect(stacks.map((stack) => [stack.direction, stack.parts.length])).toEqual([[1, 2], [-1, 1]]);
    expect(stacks[0].key).not.toBe(stacks[1].key);
  });

  it('groups irrelevant direction metadata on nondirectional parts without editing it', () => {
    const parts: Peg[] = [
      { id: 'part-6', kind: 'doubler', direction: 1 },
      { id: 'part-7', kind: 'doubler', direction: -1 },
    ];
    expect(groupSpareParts(parts)).toEqual([{ key: 'doubler', kind: 'doubler', direction: null, parts }]);
    expect(parts[1].direction).toBe(-1);
    expect(partStackKey(parts[0])).toBe(partStackKey(parts[1]));
  });

  it('placing one copy decrements a stack and returning it restores the count', () => {
    const run = { ...newRun(42), bench: structuredClone(spares), nextId: 15 };
    const placed = placePeg(run, 'part-8', '6-0');
    expect(placed.board['6-0'].id).toBe('part-8');
    expect(groupSpareParts(placed.bench).find((stack) => stack.key === 'mint')?.parts.map((part) => part.id)).toEqual(['part-6', 'part-10']);
    const returned = removePeg(placed, '6-0');
    expect(groupSpareParts(returned.bench).find((stack) => stack.key === 'mint')?.parts).toHaveLength(3);
    expect(returned.brass).toBe(run.brass);
    expect(returned.bench.map((part) => part.id).sort()).toEqual(run.bench.map((part) => part.id).sort());
  });

  it('rotating one directional spare moves only that instance to the matching stack', () => {
    const run = { ...newRun(42), bench: structuredClone(spares), nextId: 15 };
    const rotated = rotatePeg(run, 'part-13');
    const stacks = groupSpareParts(rotated.bench);
    expect(stacks.find((stack) => stack.key === 'splitter:right')?.parts.map((part) => part.id)).toEqual(['part-11']);
    expect(stacks.find((stack) => stack.key === 'splitter:left')?.parts.map((part) => part.id)).toEqual(['part-13']);
    expect(rotated.bench.find((part) => part.id === 'part-11')?.direction).toBe(1);
  });

  it('salvaging the last copy removes its stack and awards only the existing single-part credit', () => {
    const run = { ...newRun(42), bench: structuredClone(spares), nextId: 15 };
    const salvaged = salvagePeg(run, 'part-14');
    expect(groupSpareParts(salvaged.bench).some((stack) => stack.key === 'relay')).toBe(false);
    expect(salvaged.brass).toBe(run.brass + 1);
    expect(salvagePeg(salvaged, 'part-14')).toBe(salvaged);
  });

  it('handles empty inventory and does not merge the stored save instances', () => {
    expect(groupSpareParts([])).toEqual([]);
    const save = freshSave(42);
    save.run.bench = structuredClone(spares);
    save.run.nextId = 15;
    groupSpareParts(save.run.bench);
    const restored = parseSave(JSON.stringify(save))!;
    expect(restored).toEqual(save);
    expect(restored.run.bench).toHaveLength(9);
    expect(groupSpareParts(restored.run.bench)).toHaveLength(4);
  });
});