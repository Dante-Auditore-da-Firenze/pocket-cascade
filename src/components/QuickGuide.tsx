import { ArrowDown, ArrowRight, Check, Gift, MousePointer2, Target, Ticket, X } from 'lucide-react';
import { commission, commissionReward, type RunState } from '../game/engine';
import type { TutorialStep } from '../game/tutorial';
import { formatNumber, IconButton } from './UI';

interface QuickGuideProps {
  step: TutorialStep;
  run: RunState;
  selected: boolean;
  onSkip: () => void;
  onLocate: (step: TutorialStep) => void;
  definition?: ReturnType<typeof commission>;
}

export function QuickGuide({ step, run, selected, onSkip, onLocate, definition = commission(run) }: QuickGuideProps) {
  if (step === 'done') return null;
  const target = definition.target;
  const completed = run.phase === 'review';
  const lost = run.phase === 'lost';
  const dropping = run.phase === 'dropping';
  const steps = [
    { id: 'place', title: selected ? 'Choose a socket.' : 'Place a spare part.', detail: selected ? 'Select any available socket.' : 'Select a spare, then a socket. Moving parts is free.', icon: MousePointer2, action: selected ? 'Find sockets' : 'Choose a part' },
    { id: 'launch', title: `Reach ${formatNumber(target)} points.`, detail: `Generators supply charge; amplifiers spend it. ${run.dropsLeft} launches available.`, icon: ArrowDown, action: 'Find launch' },
    { id: 'collect', title: completed ? 'Collect your reward.' : lost ? 'Adjust and retry.' : dropping ? 'Cascade in progress' : `${formatNumber(run.score)} / ${formatNumber(target)} points`, detail: completed ? `${commissionReward(run, definition).total} Workshop credits, used to buy upgrades.` : lost ? 'Keep your parts and credits. Rewire, then retry.' : 'Points complete commissions; credits buy upgrades.', icon: completed ? Ticket : Target, action: completed ? 'Find reward' : lost ? 'Find retry' : 'Find target' },
    { id: 'gift', title: 'Choose a reward.', detail: 'New part, tuning, or credits.', icon: Gift, action: 'View rewards' },
    { id: 'spend', title: 'Buy upgrades or continue.', detail: `${run.brass} credits available. Unspent credits carry forward.`, icon: Ticket, action: 'View upgrades' },
  ];
  const current = steps.find((item) => item.id === step)!;
  const Icon = current.icon;
  const position = steps.indexOf(current);
  return <section className="onboarding-bar" aria-label="Quick guide" data-testid="quick-guide" data-step={step}>
    <div className="onboarding-inner">
      <span className="guide-symbol"><Icon size={23} strokeWidth={1.6} /></span>
      <div className="guide-copy" aria-live="polite"><span className="eyebrow">QUICK GUIDE {position + 1} / 5</span><strong>{current.title}</strong><p>{current.detail}</p></div>
      <div className="guide-actions"><button className="text-button" onClick={() => onLocate(step)}>{current.action}<ArrowRight size={15} /></button><div className="guide-progress" aria-hidden="true">{steps.map((item, index) => <span key={item.id} className={index < position ? 'complete' : index === position ? 'current' : ''}>{index < position ? <Check size={10} /> : index + 1}</span>)}</div></div>
      <IconButton icon={X} label="Skip guide" onClick={onSkip} />
    </div>
  </section>;
}