import { describe, expect, it } from 'vitest';
import { launchDrop, newRun } from '../src/game/engine';
import { BACKUP_KEY, SAVE_KEY, freshSave, loadBrowserSave, parseSave, updateProgress, writeBrowserSave } from '../src/game/save';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('versioned save boundary', () => {
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