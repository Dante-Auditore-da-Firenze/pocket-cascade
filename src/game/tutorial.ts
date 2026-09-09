import type { RunState } from './engine';

export const TUTORIAL_STEPS = ['place', 'launch', 'collect', 'gift', 'spend', 'done'] as const;
export type TutorialStep = typeof TUTORIAL_STEPS[number];
export type TutorialAction = 'place' | 'launch' | 'collect' | 'claim' | 'purchase' | 'continue' | 'skip';

export function advanceTutorial(step: TutorialStep, action: TutorialAction): TutorialStep {
  const outcomes: Record<TutorialAction, TutorialStep> = {
    place: 'launch', launch: 'collect', collect: 'gift', claim: 'spend',
    purchase: 'done', continue: 'done', skip: 'done',
  };
  return TUTORIAL_STEPS[Math.max(TUTORIAL_STEPS.indexOf(step), TUTORIAL_STEPS.indexOf(outcomes[action]))];
}

export function startingTutorialStep(run: RunState): TutorialStep {
  if (run.phase === 'won') return 'done';
  if (run.phase === 'shop') return run.rewardClaimed ? 'spend' : 'gift';
  if (run.phase === 'review' || run.phase === 'lost' || run.phase === 'dropping' || run.totalDrops > 0) return 'collect';
  return run.bench.length > 0 ? 'place' : 'launch';
}

export function currentTutorialStep(profile: { seenTutorial: boolean; tutorialStep?: TutorialStep }, run: RunState): TutorialStep {
  if (profile.seenTutorial) return 'done';
  const step = profile.tutorialStep ?? startingTutorialStep(run);
  return TUTORIAL_STEPS[Math.max(TUTORIAL_STEPS.indexOf(step), TUTORIAL_STEPS.indexOf(startingTutorialStep(run)))];
}