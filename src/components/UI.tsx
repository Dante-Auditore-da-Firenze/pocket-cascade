import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';
import { PARTS } from '../game/content';
import type { PegKind } from '../game/model';

export function formatNumber(value: number): string {
  if (value < 1_000_000) return Math.round(value).toLocaleString('en-US');
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

export function Counter({ value, reduced = false, className = '' }: { value: number; reduced?: boolean; className?: string }) {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    if (reduced) { current.current = value; setDisplay(value); return; }
    const previous = current.current;
    const started = performance.now();
    let frame = 0;
    const tick = (timestamp: number) => {
      const fraction = Math.min(1, (timestamp - started) / 420);
      current.current = previous + (value - previous) * (1 - (1 - fraction) ** 3);
      setDisplay(current.current);
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <span className={className} aria-label={String(value)}>{formatNumber(display)}</span>;
}

export function IconButton({ icon: Icon, label, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} {...props}><Icon size={18} strokeWidth={1.7} /></button>;
}

export function PartSymbol({ kind, small = false }: { kind: PegKind; small?: boolean }) {
  return <span aria-hidden="true" className={`part-symbol part-${kind} ${small ? 'small' : ''}`}>{PARTS[kind].symbol}</span>;
}

export function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const reference = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = reference.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={reference} className={`dialog ${wide ? 'wide' : ''}`} aria-label={title}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-inner">
      <header className="dialog-header"><h2>{title}</h2><IconButton icon={X} label="Close dialog" onClick={onClose} /></header>
      {children}
    </div>
  </dialog>;
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-row"><span>{label}</span><input type="checkbox" role="switch" checked={value} onChange={(event) => onChange(event.target.checked)} /><span className="toggle-track" aria-hidden="true" /></label>;
}