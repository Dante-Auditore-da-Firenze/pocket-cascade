import { useState } from 'react';
import { ArrowLeft, Gift, Hammer, Ticket } from 'lucide-react';
import { PARTS, TUNINGS } from '../game/content';
import { MAX_OWNED_PARTS, tuningTargets, type RunState } from '../game/engine';
import type { PegKind } from '../game/model';
import { Dialog, PartSymbol } from './UI';
import './rewards.css';

export function RewardDialog({ run, onChoose, onTune, onCredits, onClose }: { run: RunState; onChoose: (kind: PegKind) => void; onTune: (partId: string) => void; onCredits: () => void; onClose: () => void }) {
  const owned = [...Object.values(run.board), ...run.bench];
  const full = owned.length >= MAX_OWNED_PARTS;
  const eligible = tuningTargets(run).filter((part) => run.rewardChoices.includes(part.kind));
  const [mode, setMode] = useState<'part' | 'tune'>(full && eligible.length ? 'tune' : 'part');
  const [targets, setTargets] = useState<Partial<Record<PegKind, string>>>({});
  return <Dialog title={full ? 'Parts storage full' : 'Choose a reward'} wide onClose={onClose}>
    <div className="reward-modes" role="group" aria-label="Reward type">
      <button aria-pressed={mode === 'part'} disabled={full} onClick={() => setMode('part')}><Gift size={16} />New part</button>
      <button aria-pressed={mode === 'tune'} disabled={!eligible.length} onClick={() => setMode('tune')}><Hammer size={16} />Tune owned part</button>
    </div>
    {mode === 'part' && !full ? <div className="reward-choices" data-testid="reward-choices">
      {run.rewardChoices.map((kind) => {
        const part = PARTS[kind];
        return <button className="reward-choice free-offer" key={kind} aria-label={`Choose ${part.name}`} aria-describedby={`reward-effect-${kind} reward-owned-${kind}`} title={part.detail} onClick={() => onChoose(kind)}>
          <span className="reward-choice-top"><span>{part.family}</span><span><Gift size={13} />FREE</span></span>
          <PartSymbol kind={kind} />
          <strong>{part.name}</strong>
          <span className="reward-effect" id={`reward-effect-${kind}`}>{part.description}</span>
          <span className="reward-owned" id={`reward-owned-${kind}`}>{owned.filter((peg) => peg.kind === kind).length} owned</span>
        </button>;
      })}
    </div> : mode === 'tune' && <div className="reward-choices" data-testid="tuning-choices">{run.rewardChoices.map((kind) => {
      const choices = eligible.filter((part) => part.kind === kind);
      if (!choices.length) return null;
      const target = choices.find((part) => part.id === targets[kind]) ?? choices[0];
      return <article className="reward-choice reward-tuning-card" key={kind}>
        <span className="reward-choice-top"><span>{TUNINGS[kind].name}</span><span>FREE TUNING</span></span>
        <PartSymbol kind={kind} tuned />
        <strong>{PARTS[kind].name}</strong>
        <span className="reward-effect" id={`tuning-effect-${kind}`}>{TUNINGS[kind].description}</span>
        <label className="tuning-target">Copy to tune<select aria-label={`${PARTS[kind].name} tuning target`} value={target.id} onChange={(event) => setTargets((current) => ({ ...current, [kind]: event.target.value }))}>
          {choices.map((part) => {
            const slot = Object.keys(run.board).find((slotId) => run.board[slotId].id === part.id);
            return <option key={part.id} value={part.id}>{slot ? `Socket ${slot}` : `Spare ${part.id.slice(5)}`}</option>;
          })}
        </select></label>
        <button className="button primary full" aria-label={`Tune ${PARTS[kind].name}`} aria-describedby={`tuning-effect-${kind}`} onClick={() => onTune(target.id)}><Hammer size={15} />Tune</button>
      </article>;
    })}</div>}
    <div className="reward-dialog-actions"><button className="text-button" onClick={onClose}><ArrowLeft size={16} />Inspect machine</button><button className="text-button" aria-label="Collect credits" title="Take 2 credits instead of a part or tuning" onClick={onCredits}><Ticket size={16} />2 credits instead</button></div>
  </Dialog>;
}