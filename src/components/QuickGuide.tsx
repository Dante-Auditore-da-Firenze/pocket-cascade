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
}

export function QuickGuide({ step, run, selected, onSkip, onLocate }: QuickGuideProps) {
  if (step === 'done') return null;
  const target = commission(run).target;
  const completed = run.phase === 'review';
  const lost = run.phase === 'lost';
  const dropping = run.phase === 'dropping';
  const steps = [
    { id: 'place', title: selected ? 'Choose a socket. Make it yours.' : 'Start with one spare part.', detail: selected ? 'Place the selected part anywhere on the machine.' : 'Choose a spare part, then a socket. You decide where it belongs.', icon: MousePointer2, action: selected ? 'Find the machine' : 'Choose a part' },
    { id: 'launch', title: `Make ${formatNumber(target)} points.`, detail: `You have ${run.dropsLeft} launches to fill the target. Drop a token to see your machine work.`, icon: ArrowDown, action: 'Find the launch button' },
    { id: 'collect', title: completed ? 'Your points earned an upgrade.' : lost ? 'Keep the machine. Try another arrangement.' : dropping ? 'Every payout fills the target.' : `${formatNumber(run.score)} of ${formatNumber(target)} points.`, detail: completed ? `Collect ${commissionReward(run).total} Workshop credits. Credits buy upgrades; points complete commissions.` : lost ? 'Your parts and credits stay yours. Rewire freely, then retry.' : 'Points fill this target. They are not the credits you spend in the shop.', icon: completed ? Ticket : Target, action: completed ? 'Find your reward' : lost ? 'Find retry' : 'Find the target' },
    { id: 'gift', title: 'Choose one free part.', detail: 'Your commission includes one gift. It costs no credits, and the other two choices go away.', icon: Gift, action: 'Find the free choices' },
    { id: 'spend', title: 'Spend credits, or keep them.', detail: `Your ${run.brass} Workshop credits buy parts or token-value upgrades. Unspent credits carry forward.`, icon: Ticket, action: 'Find paid upgrades' },
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