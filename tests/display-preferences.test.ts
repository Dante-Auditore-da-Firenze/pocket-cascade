import { describe, expect, it } from 'vitest';
import { freshSave, migrateDesktopSave, parseSave } from '../src/game/save';

describe('one-time native fullscreen migration', () => {
  it('migrates an old windowed default without modifying the machine or other preferences', () => {
    const legacy = freshSave(42);
    delete legacy.settings.fullscreenPreferenceVersion;
    legacy.settings.fullscreen = false;
    legacy.settings.reducedMotion = true;
    legacy.settings.volume = 0.35;
    legacy.run.brass = 12;
    const original = structuredClone(legacy);
    const restored = parseSave(JSON.stringify(legacy))!;
    const migrated = migrateDesktopSave(restored);
    expect(migrated.run).toEqual(original.run);
    expect(migrated.profile).toEqual(original.profile);
    expect(migrated.savedAt).toBe(original.savedAt);
    expect(migrated.settings).toEqual({ ...original.settings, fullscreen: true, fullscreenPreferenceVersion: 1 });
    expect(legacy).toEqual(original);
    expect(migrateDesktopSave(migrated)).toBe(migrated);
  });

  it('remembers a windowed choice made after migration through save and reload', () => {
    const save = freshSave(42);
    save.settings.fullscreen = false;
    const restored = parseSave(JSON.stringify(save))!;
    expect(migrateDesktopSave(restored)).toBe(restored);
    expect(restored.settings.fullscreen).toBe(false);
  });

  it('does not migrate browser-only reads or require the new marker in older saves', () => {
    const legacy = freshSave(7);
    delete legacy.settings.fullscreenPreferenceVersion;
    legacy.settings.fullscreen = false;
    expect(parseSave(JSON.stringify(legacy))).toEqual(legacy);
  });

  it('marks fresh preferences so an intentional future windowed choice is preserved', () => {
    const save = freshSave(7);
    expect(save.settings.fullscreen).toBe(true);
    expect(save.settings.fullscreenPreferenceVersion).toBe(1);
    expect(migrateDesktopSave(save)).toBe(save);
  });
});