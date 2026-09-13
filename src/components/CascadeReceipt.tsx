import type { DropResult } from '../game/model';
import { formatNumber } from './UI';
import './cascadeReceipt.css';

export function CascadeReceipt({ result }: { result: DropResult }) {
  const arrivals = [0, 1, 2].map((tray) => result.events.filter((event) => event.type === 'payout' && event.tray === tray).length);
  return <details className="cascade-receipt" data-testid="cascade-receipt">
    <summary><span>Last cascade</span><strong>{formatNumber(result.total)}</strong></summary>
    <dl className="collector-receipt">
      {['Left x1', 'Center x2', 'Right x1'].map((label, index) => <div key={label} data-collector={index} className={arrivals[index] ? 'received' : ''}>
        <dt>{label}</dt><dd>{formatNumber(result.trayTotals[index])}</dd>
        <span>{arrivals[index]} {arrivals[index] === 1 ? 'token' : 'tokens'}</span>
      </div>)}
    </dl>
    <div className="cascade-facts"><span>Vault deposits <strong data-testid="banked-payout">{formatNumber(result.banked)}</strong></span><span>Longest chain <strong>{result.maxChain}</strong></span></div>
  </details>;
}