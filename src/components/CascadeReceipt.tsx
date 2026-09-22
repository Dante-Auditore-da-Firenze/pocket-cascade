import type { DropResult } from '../game/model';
import { PARTS } from '../game/content';
import { formatNumber } from './UI';
import './cascadeReceipt.css';

export function CascadeReceipt({ result }: { result: DropResult }) {
  const arrivals = [0, 1, 2].map((tray) => result.events.filter((event) => event.type === 'payout' && event.tray === tray).length);
  const missed = new Map<string, { part: string; reason: string; count: number }>();
  const reasons = { charge: 'Needed charge', memory: 'No effect to repeat', reserve: 'No deposit reserve' };
  for (const event of result.events) {
    if (!event.blocked || !event.kind) continue;
    const key = `${event.kind}:${event.blocked}`;
    const previous = missed.get(key);
    missed.set(key, { part: PARTS[event.kind].name, reason: reasons[event.blocked], count: (previous?.count ?? 0) + 1 });
  }
  return <details className="cascade-receipt" data-testid="cascade-receipt">
    <summary><span>Last cascade</span><strong>{formatNumber(result.total)}</strong></summary>
    <dl className="collector-receipt">
      {['Left x1', 'Center x2', 'Right x1'].map((label, index) => <div key={label} data-collector={index} className={arrivals[index] ? 'received' : ''}>
        <dt>{label}</dt><dd>{formatNumber(result.trayTotals[index])}</dd>
        <span>{arrivals[index]} {arrivals[index] === 1 ? 'token' : 'tokens'}</span>
      </div>)}
    </dl>
    <div className="cascade-facts"><span>Banked points <strong data-testid="banked-payout">{formatNumber(result.banked)}</strong></span><span>Longest chain <strong>{result.maxChain}</strong></span></div>
    {missed.size > 0 && <ul className="missed-triggers" aria-label="Untriggered effects">{[...missed].map(([key, item]) => <li key={key}><span>{item.part}<small>{item.reason}</small></span><strong>{item.count}</strong></li>)}</ul>}
  </details>;
}