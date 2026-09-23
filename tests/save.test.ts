import { describe, expect, it } from 'vitest';
import { buyPart, claimCredits, collectCommission, commission, dropConfig, launchDrop, newRun, nextCommission, rerollShop, retryCommission, settleDrop } from '../src/game/engine';
import { BACKUP_KEY, SAVE_KEY, canRestoreShop, createPractice, freshSave, loadBrowserSave, parseSave, restoreShop, updateProgress, writeBrowserSave } from '../src/game/save';
import { simulateDrop } from '../src/game/simulation';

function earnedShop() {
  let save = freshSave(42);
  while (save.run.phase === 'ready') save = updateProgress(save, settleDrop(launchDrop(save.run), simulateDrop(dropConfig(save.run))));
  return updateProgress(save, collectCommission(save.run));
}

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('versioned save boundary', () => {
  it('restores the exact earned shop before choices without duplicating money, stock, IDs, or rewards', () => {
    const shop = earnedShop();
    let save = updateProgress(shop, claimCredits(shop.run));
    save = updateProgress(save, buyPart(save.run, save.run.offers[0].id));
    save = updateProgress(save, rerollShop(save.run));
    save = updateProgress(save, nextCommission(save.run));
    const profile = structuredClone(save.profile);
    expect(save.checkpoints?.entries.map((entry) => entry.stage)).toEqual([0, 1]);
    const restored = restoreShop(parseSave(JSON.stringify(save))!);
    expect(restored.run).toEqual(shop.run);
    expect(restored.profile).toEqual(profile);
    expect(collectCommission(restored.run)).toBe(restored.run);
    expect(restoreShop(restored).run).toEqual(shop.run);
    restored.run.bench.length = 0;
    expect(restored.checkpoints?.shop?.bench.length).toBe(shop.run.bench.length);
    expect(save.run.stage).toBe(1);
  });

  it('keeps practice detached from the campaign, profile, rewards, and save boundary', () => {
    const save = earnedShop();
    const before = JSON.stringify(save);
    let practice = createPractice(save, 0)!;
    expect(practice.practice).toBe(true);
    expect(createPractice(save, 11)).toBeNull();
    while (practice.phase === 'ready') practice = settleDrop(launchDrop(practice), simulateDrop(dropConfig(practice)));
    expect(practice.score).toBeGreaterThanOrEqual(commission(practice).target);
    expect(collectCommission(practice)).toBe(practice);
    expect(updateProgress(save, practice)).toBe(save);
    expect(parseSave(JSON.stringify({ ...save, run: practice }))).toBeNull();
    practice.board['0-3'].tuned = true;
    expect(JSON.stringify(save)).toBe(before);
  });

  it('does not invent a missing shop and rejects cross-run, malformed, or oversized checkpoints', () => {
    const save = earnedShop();
    const legacy = { ...save, checkpoints: undefined };
    expect(parseSave(JSON.stringify(legacy))?.checkpoints).toBeUndefined();
    expect(canRestoreShop(legacy)).toBe(false);
    expect(restoreShop(legacy)).toBe(legacy);
    expect(canRestoreShop({ ...save, run: launchDrop(newRun(42)) })).toBe(false);
    const differentSeed = structuredClone(save);
    differentSeed.checkpoints!.shop!.seed = 99;
    expect(parseSave(JSON.stringify(differentSeed))).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, checkpoints: { ...save.checkpoints, entries: Array(25).fill(newRun(42)) } }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, checkpoints: { ...save.checkpoints, entries: [{ ...newRun(42), score: 1 }] } }))).toBeNull();
    const fresh = updateProgress(save, newRun(99));
    expect(fresh.checkpoints?.shop).toBeNull();
    expect(fresh.checkpoints?.entries.map((entry) => entry.seed)).toEqual([99]);
  });

  it('bounds practice history to campaign entries and the latest twelve After Hours entries', () => {
    let save = freshSave(42);
    save.run.mode = 'endless';
    for (let stage = 0; stage < 30; stage += 1) {
      const completed = { ...save.run, phase: 'review' as const, score: commission(save.run).target };
      save = updateProgress(save, collectCommission(completed));
      save = updateProgress(save, claimCredits(save.run));
      save = updateProgress(save, nextCommission(save.run));
    }
    expect(save.checkpoints?.entries.map((entry) => entry.stage)).toEqual([
      ...Array.from({ length: 12 }, (_, stage) => stage),
      ...Array.from({ length: 12 }, (_, stage) => stage + 19),
    ]);
    expect(save.checkpoints?.entries.every((entry) => entry.lastDrop === null && entry.activeDrop === null)).toBe(true);
    expect(JSON.stringify(save).length).toBeLessThan(2 * 1024 * 1024);
    expect(parseSave(JSON.stringify(save))).toEqual(save);
    const restored = restoreShop(save);
    const advanced = updateProgress(restored, nextCommission(claimCredits(restored.run)));
    expect(advanced.checkpoints?.entries.map((entry) => entry.stage)).toEqual(save.checkpoints?.entries.map((entry) => entry.stage));
  });

  it('records an entry before edits and never replaces it with a retry layout', () => {
    const shop = earnedShop();
    const save = updateProgress(shop, nextCommission(claimCredits(shop.run)));
    const entry = createPractice(save, 1)!;
    const edited = structuredClone(save.run);
    edited.board['6-0'] = edited.board['0-3'];
    delete edited.board['0-3'];
    const changed = updateProgress(save, edited);
    const lost = updateProgress(changed, { ...changed.run, phase: 'lost', dropsLeft: 0, score: 10 });
    const retried = updateProgress(lost, retryCommission(lost.run, true));
    expect(retried.run.retryHelp).toBe(1);
    expect(retried.run.board['6-0'].id).toBe('part-1');
    expect(createPractice(retried, 1)).toEqual(entry);
    expect(changed.checkpoints?.shop).toEqual(save.checkpoints?.shop);
    expect(parseSave(JSON.stringify(retried))).toEqual(retried);
  });

  it('round-trips a real initial game', () => {
    const save = freshSave(42);
    expect(parseSave(JSON.stringify(save))).toEqual(save);
  });

  it('refunds an interrupted launch on loading', () => {
    const save = freshSave(42);
    save.run = launchDrop(save.run);
    const recovered = parseSave(JSON.stringify(save));
    expect(recovered?.run.phase).toBe('ready');
    expect(recovered?.run.dropsLeft).toBe(5);
  });

  it('rejects corrupted structure, unsafe numbers, duplicate ownership and unknown versions', () => {
    const save = freshSave(42);
    expect(parseSave('{broken')).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, version: 2 }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, run: { ...save.run, brass: -1 } }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, run: { ...save.run, board: { invalid: save.run.board['0-3'] } } }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, run: { ...save.run, bench: [save.run.board['0-3']] } }))).toBeNull();
  });

  it('retains a valid backup and recovers it after corruption', () => {
    const store = storage();
    const save = freshSave(42);
    save.run.lane = 4;
    writeBrowserSave(store, save);
    writeBrowserSave(store, { ...save, run: { ...save.run, lane: 2 } });
    expect(parseSave(store.getItem(BACKUP_KEY)!)?.run.lane).toBe(4);
    store.setItem(SAVE_KEY, '{corrupt');
    expect(loadBrowserSave(store).save.run.lane).toBe(4);
    expect(loadBrowserSave(store).message).toContain('Recovered');
  });

  it('handles unavailable storage explicitly', () => {
    const loaded = loadBrowserSave({ getItem: () => { throw new Error('denied'); } });
    expect(loaded.message).toContain('Storage is unavailable');
  });

  it('awards achievements and lifetime score only once for a state transition', () => {
    const save = freshSave(42);
    const changed = updateProgress(save, { ...save.run, totalScore: 1200, bestDrop: 1200 });
    const repeated = updateProgress(changed, changed.run);
    expect(repeated.profile.lifetimeScore).toBe(1200);
    expect(repeated.profile.achievements).toContain('THOUSAND_DROP');
    expect(updateProgress(repeated, newRun(99)).profile.lifetimeScore).toBe(1200);
  });
});