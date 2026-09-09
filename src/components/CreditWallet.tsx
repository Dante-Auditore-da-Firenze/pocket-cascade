import { useEffect, useRef, useState } from 'react';
import { Ticket } from 'lucide-react';
import { Counter } from './UI';

export function CreditWallet({ credits, reducedMotion }: { credits: number; reducedMotion: boolean }) {
  const previous = useRef(credits);
  const [change, setChange] = useState({ amount: 0, revision: 0 });
  useEffect(() => {
    const difference = credits - previous.current;
    previous.current = credits;
    if (difference) setChange((current) => ({ amount: difference, revision: current.revision + 1 }));
  }, [credits]);
  return <div className="credits-wallet" data-testid="credits-wallet" aria-label={`${credits} Workshop credits`}>
    <span className="wallet-title"><Ticket size={15} />WORKSHOP CREDITS</span>
    <div className="wallet-amount"><Counter value={credits} reduced={reducedMotion} /><span key={change.revision} className={`wallet-change ${change.amount > 0 ? 'earned' : change.amount < 0 ? 'spent' : ''}`} data-testid="wallet-change" aria-live="polite">{change.amount === 0 ? 'Earned from commissions' : change.amount > 0 ? `+${change.amount} earned` : `${Math.abs(change.amount)} spent`}</span></div>
  </div>;
}