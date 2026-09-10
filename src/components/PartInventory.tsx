import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PARTS } from '../game/content';
import { commission, type RunState } from '../game/engine';
import { PartSymbol } from './UI';
import { groupSpareParts } from './partStacks';
import './partStacks.css';

interface PartInventoryProps {
  run: RunState;
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string) => void;
}

export function PartInventory({ run, selectedId, editable, onSelect }: PartInventoryProps) {
  const capacity = commission(run).capacity;
  const installed = Object.keys(run.board).length;
  const nextCapacity = commission({ ...run, stage: run.stage + 1 }).capacity;
  const stacks = groupSpareParts(run.bench);
  return <section className="part-inventory" aria-label="Spare parts" data-testid="part-inventory">
    <div className="section-heading"><span>SPARE PARTS</span><span>{run.bench.length}</span></div>
    <div className="bench-grid">{stacks.map((stack) => {
      const selected = stack.parts.find((part) => part.id === selectedId);
      const part = selected ?? stack.parts[0];
      const definition = PARTS[stack.kind];
      const direction = stack.direction === null ? '' : stack.direction === 1 ? 'right' : 'left';
      const name = `${definition.name}${direction ? ` facing ${direction}` : ''}`;
      return <button
        key={stack.key}
        className={`bench-part ${selected ? 'selected' : ''}`}
        data-stack={stack.key}
        data-count={stack.parts.length}
        aria-label={`Select ${name}, ${stack.parts.length} available`}
        title={`${name}: ${stack.parts.length} available. ${definition.description}`}
        aria-pressed={Boolean(selected)}
        disabled={!editable}
        onClick={() => onSelect(part.id)}
      >
        <span className="stack-metadata" aria-hidden="true">
          <span className="stack-direction">{stack.direction === 1 ? <ArrowRight size={13} /> : stack.direction === -1 ? <ArrowLeft size={13} /> : null}</span>
          <span className="stack-count" data-testid="stack-count">{stack.parts.length > 1 ? `x${stack.parts.length}` : ''}</span>
        </span>
        <PartSymbol kind={stack.kind} direction={part.direction} /><span>{definition.name}</span>
      </button>;
    })}
      {run.bench.length === 0 && <div className="empty-bench"><CheckCircle2 size={18} /><span>No spare parts.</span></div>}
    </div>
    {installed >= capacity && <p className="capacity-notice" data-testid="capacity-notice">Machine full: {installed}/{capacity} installed. Swap a part or return one to the workbench.</p>}
    {run.phase === 'shop' && <p className="capacity-next" data-testid="next-capacity">{nextCapacity > capacity ? `Next level: ${nextCapacity} installed parts. ${nextCapacity - capacity} extra ${nextCapacity - capacity === 1 ? 'space opens' : 'spaces open'} when you advance.` : `Next level: ${nextCapacity} installed parts. Spare parts stay in your inventory.`}</p>}
  </section>;
}