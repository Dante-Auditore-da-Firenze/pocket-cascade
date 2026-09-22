import { describe, expect, it } from 'vitest';
import {
  baseValue, canRestartCommission, collectCommission, commission, dropConfig,
  launchDrop, newRun, placePeg, restartCommission, retryCommission, settleDrop, type Phase,
} from '../src/game/engine';
import { freshSave, parseSave, updateProgress } from '../src/game/save';
import { simulateDrop } from '../src/game/simulation';

describe('same-difficulty level restart', () => {
  it('counts retries without silently adding help and caps explicitly accepted help', () => {
    const initial = { ...newRun(42), phase: 'lost' as const, dropsLeft: 0 };
    let run = initial;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const retried = retryCommission(run);
      expect(baseValue(retried)).toBe(10);
      run = { ...retried, phase: 'lost', dropsLeft: 0 };
    }
    expect(run.retries).toBe(5);
    for (let accepted = 0; accepted < 5; accepted += 1) {
      const retried = retryCommission(run, true);
      expect(baseValue(retried)).toBe(10 + Math.min(accepted + 1, 3));
      run = { ...retried, phase: 'lost', dropsLeft: 0 };
    }
    expect(run.retryHelp).toBe(3);
    expect(run.brass).toBe(initial.brass);
    expect(run.board).toEqual(initial.board);
    expect(baseValue(retryCommission(run))).toBe(13);
  });

  it('preserves legacy saved help without increasing it on ordinary Retry', () => {
    const save = freshSave(42);
    delete save.run.retryHelp;
    save.run = { ...save.run, retries: 2, phase: 'lost', dropsLeft: 0 };
    const loaded = parseSave(JSON.stringify(save))!;
    expect(baseValue(loaded.run)).toBe(12);
    const retried = retryCommission(loaded.run);
    expect(retried.retries).toBe(3);
    expect(retried.retryHelp).toBe(2);
    expect(baseValue(retried)).toBe(12);
    expect(parseSave(JSON.stringify({ ...loaded, run: retried }))?.run).toEqual(retried);
  });

  it('only accepts extra help after a loss', () => {
    const initial = newRun(42);
    expect(retryCommission(initial, true)).toBe(initial);
    const save = freshSave(42);
    expect(parseSave(JSON.stringify({ ...save, run: { ...save.run, retryHelp: 4 } }))).toBeNull();
  });

  it('resets only the attempt after real play and preserves earned possessions and totals', () => {
    const initial = placePeg(newRun(42), 'part-5', '6-0');
    const result = simulateDrop(dropConfig(initial));
    const played = settleDrop(launchDrop(initial), result);
    const restarted = restartCommission(played);
    expect(restarted).toEqual({ ...played, phase: 'ready', score: 0, dropsLeft: 5, lastDrop: null, activeDrop: null });
    expect(baseValue(restarted)).toBe(baseValue(played));
    expect(commission(restarted)).toEqual(commission(played));
    expect(restarted.totalScore).toBe(result.total);
    expect(restarted.totalDrops).toBe(1);
    expect(restarted.retries).toBe(0);
  });

  it('cancels an active drop without accepting its later result or granting points', () => {
    const initial = newRun(42);
    const dropping = launchDrop(initial);
    const restarted = restartCommission(dropping);
    expect(restarted).toEqual(initial);
    expect(settleDrop(restarted, simulateDrop(dropConfig(initial)))).toBe(restarted);
  });

  it('cannot award money, parts, launches beyond five, or extra tune-up power on repeated restarts', () => {
    const lost = { ...newRun(42), phase: 'lost' as const, dropsLeft: 0, score: 50, brass: 12, power: 2, retries: 1 };
    let run = restartCommission(lost);
    for (let attempt = 0; attempt < 8; attempt += 1) run = restartCommission(run);
    expect(run.brass).toBe(12);
    expect(run.power).toBe(2);
    expect(run.retries).toBe(1);
    expect(run.dropsLeft).toBe(5);
    expect(run.board).toEqual(lost.board);
    expect(run.bench).toEqual(lost.bench);
    expect(baseValue(run)).toBe(baseValue(lost));
    expect(run.assisted).toBe(false);
  });

  it.each<Phase>(['review', 'shop', 'won'])('rejects restart after success in phase %s', (phase) => {
    const run = { ...newRun(42), phase, score: 200, brass: 10 };
    expect(canRestartCommission(run)).toBe(false);
    expect(restartCommission(run)).toBe(run);
  });

  it('cannot reopen a paid commission or duplicate its gift', () => {
    let run = newRun(42);
    while (run.phase === 'ready') run = settleDrop(launchDrop(run), simulateDrop(dropConfig(run)));
    const shop = collectCommission(run);
    expect(restartCommission(shop)).toBe(shop);
    expect(collectCommission(restartCommission(shop))).toBe(shop);
  });

  it('preserves profile totals and round-trips a restarted version-one save', () => {
    let save = freshSave(42);
    const initial = save.run;
    const result = simulateDrop(dropConfig(initial));
    save = updateProgress(save, settleDrop(launchDrop(initial), result));
    const before = structuredClone(save.profile);
    save = updateProgress(save, restartCommission(save.run));
    expect(save.profile).toEqual(before);
    expect(parseSave(JSON.stringify(save))).toEqual(save);
  });
});