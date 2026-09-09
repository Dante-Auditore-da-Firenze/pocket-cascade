import { describe, expect, it } from 'vitest';
import { newRun } from '../src/game/engine';
import { freshSave, parseSave } from '../src/game/save';
import { advanceTutorial, currentTutorialStep, startingTutorialStep, type TutorialStep } from '../src/game/tutorial';

describe('contextual first-run guide', () => {
  it('teaches actual actions without prescribing a board or mutating the run', () => {
    const run = newRun(42);
    const original = structuredClone(run);
    let step: TutorialStep = startingTutorialStep(run);
    expect(step).toBe('place');
    step = advanceTutorial(step, 'place');
    expect(step).toBe('launch');
    step = advanceTutorial(step, 'launch');
    expect(step).toBe('collect');
    step = advanceTutorial(step, 'collect');
    expect(step).toBe('gift');
    step = advanceTutorial(step, 'claim');
    expect(step).toBe('spend');
    expect(advanceTutorial(step, 'purchase')).toBe('done');
    expect(run).toEqual(original);
  });

  it('does not gate out-of-order actions, skipping, or keeping credits', () => {
    expect(advanceTutorial('place', 'launch')).toBe('collect');
    expect(advanceTutorial('collect', 'place')).toBe('collect');
    expect(advanceTutorial('gift', 'skip')).toBe('done');
    expect(advanceTutorial('spend', 'continue')).toBe('done');
    expect(advanceTutorial('done', 'place')).toBe('done');
  });

  it('resumes from the current workflow and allows an explicit replay', () => {
    const run = newRun(42);
    expect(currentTutorialStep({ seenTutorial: true }, run)).toBe('done');
    expect(currentTutorialStep({ seenTutorial: false, tutorialStep: 'launch' }, run)).toBe('launch');
    expect(startingTutorialStep({ ...run, phase: 'shop', rewardClaimed: false })).toBe('gift');
    expect(startingTutorialStep({ ...run, phase: 'shop', rewardClaimed: true })).toBe('spend');
    expect(startingTutorialStep({ ...run, phase: 'lost' })).toBe('collect');
  });

  it('loads older version-one profiles without resetting their machine or settings', () => {
    const legacy = freshSave(42);
    delete legacy.profile.tutorialStep;
    legacy.profile.seenTutorial = true;
    legacy.settings.fullscreen = false;
    legacy.settings.reducedMotion = true;
    const restored = parseSave(JSON.stringify(legacy))!;
    expect(restored).toEqual(legacy);
    expect(currentTutorialStep(restored.profile, restored.run)).toBe('done');
  });

  it('defaults to full motion and fullscreen and persists tutorial progress', () => {
    const save = freshSave(42);
    expect(save.settings.reducedMotion).toBe(false);
    expect(save.settings.fullscreen).toBe(true);
    save.profile.tutorialStep = 'spend';
    expect(parseSave(JSON.stringify(save))?.profile.tutorialStep).toBe('spend');
  });
});