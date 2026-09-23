import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowLeft, ArrowRight, Check, Cog, Gift, Pause, Play, RotateCcw, Ticket, X } from 'lucide-react';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import { PARTS, partName } from '../../src/game/content';
import { newRun } from '../../src/game/engine';
import { FIXED_STEP, type Board, type DropResult, type Peg, type PegKind, type CascadeEvent } from '../../src/game/model';
import { DropSimulation } from '../../src/game/simulation';
import { paintBoard, paintPart, themes, type Direction } from './visuals';
import './preview.css';

const directions = [
  { id: 'toy', number: '01', title: 'Tin Toy', character: 'Enamel / tactile / playful' },
  { id: 'arcade', number: '02', title: 'Signal Arcade', character: 'Graphic / electric / emphatic' },
  { id: 'paper', number: '03', title: 'Field Notes', character: 'Printed / inventive / handmade' },
  { id: 'instrument', number: '04', title: 'Precision Instrument', character: 'Machined / composed / exact' },
] as const;

const sample = {
  ...newRun(42), stage: 5, power: 3, brass: 14, score: 2480, dropsLeft: 3, lane: 4,
  board: {
    '0-3': { id: 'part-1', kind: 'mint', direction: 1, tuned: true },
    '1-2': { id: 'part-2', kind: 'relay', direction: 1 },
    '1-3': { id: 'part-3', kind: 'mint', direction: 1 },
    '2-2': { id: 'part-4', kind: 'doubler', direction: 1 },
    '2-4': { id: 'part-5', kind: 'splitter', direction: -1 },
    '3-2': { id: 'part-6', kind: 'vault', direction: 1 },
    '4-3': { id: 'part-7', kind: 'dividend', direction: 1 },
    '5-2': { id: 'part-8', kind: 'doubler', direction: 1 },
    '6-3': { id: 'part-9', kind: 'mint', direction: 1 },
  } as Board,
};
const spares: Peg[] = [
  { id: 'part-10', kind: 'mint', direction: 1 },
  { id: 'part-11', kind: 'doubler', direction: 1 },
  { id: 'part-12', kind: 'splitter', direction: -1 },
  { id: 'part-13', kind: 'vault', direction: 1 },
];

function PartArt({ part, direction, size = 96 }: { part: Peg; direction: Direction; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let mounted = true;
    const draw = () => {
      const context = ref.current?.getContext('2d');
      if (!context || !mounted) return;
      context.clearRect(0, 0, size * 2, size * 2);
      context.save();
      context.translate(size, size);
      context.scale(size / 35, size / 35);
      paintPart(context, part, direction);
      context.restore();
    };
    draw();
    void document.fonts.ready.then(draw);
    return () => { mounted = false; };
  }, [part.kind, part.direction, part.tuned, direction, size]);
  return <canvas ref={ref} width={size * 2} height={size * 2} className="part-art" role="img" aria-label={partName(part)} />;
}

function ConceptBoard({ direction, lane, setLane, selected, place, board, playing, speed, motion, finish }: {
  direction: Direction; lane: number; setLane: (lane: number) => void; selected: Peg | null;
  place: (slot: string) => void; board: Board; playing: boolean; speed: number; motion: boolean; finish: (result: DropResult) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ direction, lane, board, speed, motion, finish });
  latest.current = { direction, lane, board, speed, motion, finish };
  useEffect(() => {
    let mounted = true;
    const draw = () => { const context = ref.current?.getContext('2d'); if (context && mounted && !playing) paintBoard(context, direction, board, lane); };
    draw();
    void document.fonts.ready.then(draw);
    return () => { mounted = false; };
  }, [direction, board, lane, playing]);
  useEffect(() => {
    if (!playing || !ref.current) return;
    const context = ref.current.getContext('2d')!;
    const simulation = new DropSimulation({ board: latest.current.board, lane: latest.current.lane, seed: 42, baseValue: 25 });
    const paths = new Map<number, { x: number; y: number }[]>();
    let frame = 0;
    let previous: number | null = null;
    let accumulated = 0;
    let flashes: { event: CascadeEvent; age: number }[] = [];
    const animate = (now: number) => {
      const elapsed = previous === null ? 0 : Math.min(100, now - previous);
      previous = now;
      const current = latest.current;
      accumulated += elapsed * current.speed;
      while (accumulated >= FIXED_STEP && !simulation.done) {
        const events = simulation.step();
        simulation.drainImpacts();
        for (const event of events) if (event.type !== 'hit' || !event.blocked) flashes.push({ event, age: 0 });
        for (const token of simulation.tokenViews) {
          const points = paths.get(token.id) ?? [];
          points.push({ x: token.x, y: token.y });
          if (points.length > 35) points.shift();
          paths.set(token.id, points);
        }
        accumulated -= FIXED_STEP;
      }
      const theme = themes[current.direction];
      paintBoard(context, current.direction, current.board, current.lane);
      context.lineCap = 'round';
      if (current.motion) for (const points of paths.values()) {
        context.beginPath();
        points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
        context.lineWidth = 3;
        context.strokeStyle = theme.accent;
        context.globalAlpha = .35;
        context.stroke();
        context.globalAlpha = 1;
      }
      flashes = flashes.filter(flash => flash.age < 450).slice(-12);
      for (const flash of flashes) {
        flash.age += elapsed;
        context.beginPath();
        context.arc(flash.event.x, flash.event.y, current.motion ? 19 + flash.age / 25 : 22, 0, Math.PI * 2);
        context.strokeStyle = theme.accent;
        context.lineWidth = 2;
        context.globalAlpha = 1 - flash.age / 450;
        context.stroke();
        context.globalAlpha = 1;
      }
      for (const token of simulation.tokenViews) {
        context.beginPath(); context.arc(token.x, token.y, 9, 0, Math.PI * 2);
        context.fillStyle = theme.highlight; context.fill(); context.strokeStyle = theme.ink; context.lineWidth = 2; context.stroke();
        context.font = '700 12px "DM Sans"'; context.textAlign = 'center';
        context.fillStyle = theme.ink; context.fillText(String(token.value), token.x, token.y - 16);
      }
      if (simulation.done) current.finish(simulation.finish());
      else frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); simulation.dispose(); };
  }, [playing]);
  return <div className="board-surface">
    <canvas ref={ref} width="1000" height="1300" role="img" aria-label={`${directions.find(item => item.id === direction)?.title} sample machine`} />
    <div className="aim-row" role="group" aria-label="Aim lane">{Array.from({ length: 9 }, (_, index) => <button key={index} disabled={playing} aria-label={`Aim lane ${index + 1}`} aria-pressed={lane === index} onClick={() => setLane(index)}>{index + 1}</button>)}</div>
    {selected && <div className="placement-targets">{Array.from({ length: 7 }, (_, row) => Array.from({ length: row % 2 ? 6 : 7 }, (_, column) => {
      const slot = `${row}-${column}`;
      return <button key={slot} disabled={playing || (!board[slot] && Object.keys(board).length >= 10)} aria-label={`Place at ${slot}`} onClick={() => place(slot)} style={{ left: `${(52 + column * 66 + (row % 2 ? 33 : 0)) / 5}%`, top: `${(122 + row * 62) / 6.5}%` }} />;
    }))}</div>}
  </div>;
}

function App() {
  const query = new URLSearchParams(location.search);
  const initial = directions.find(item => item.id === query.get('concept'))?.id ?? 'toy';
  const [direction, setDirection] = useState<Direction>(initial);
  const [view, setView] = useState<'machine' | 'reward'>(query.get('view') === 'reward' ? 'reward' : 'machine');
  const [lane, setLane] = useState(sample.lane);
  const [selected, setSelected] = useState<Peg | null>(null);
  const [board, setBoard] = useState<Board>(sample.board);
  const [stock, setStock] = useState(spares);
  const [playing, setPlaying] = useState(false);
  const [earned, setEarned] = useState(0);
  const [lastResult, setLastResult] = useState<DropResult | null>(null);
  const [launches, setLaunches] = useState(3);
  const [speed, setSpeed] = useState(1);
  const [motion, setMotion] = useState(true);
  const chosen = directions.find(item => item.id === direction)!;
  const theme = themes[direction];

  function changeDirection(id: Direction) {
    setDirection(id);
    const url = new URL(location.href);
    url.searchParams.set('concept', id);
    history.replaceState(null, '', url);
  }
  function reset() { setBoard(sample.board); setStock(spares); setSelected(null); setLane(sample.lane); setEarned(0); setPlaying(false); setLastResult(null); setLaunches(3); }
  function previewCascade() {
    if (playing || launches === 0) return;
    setSelected(null);
    setLaunches(launches - 1);
    setPlaying(true);
  }
  function finishCascade(result: DropResult) { setEarned(value => value + result.total); setLastResult(result); setPlaying(false); }
  function place(slot: string) {
    if (!selected) return;
    const displaced = board[slot];
    if (!displaced && Object.keys(board).length >= 10) return;
    setBoard({ ...board, [slot]: selected });
    setStock([...stock.filter(part => part.id !== selected.id), ...(displaced ? [displaced] : [])]);
    setSelected(null);
  }
  const style = Object.fromEntries(Object.entries(theme).map(([key, value]) => [`--${key}`, value])) as CSSProperties;

  return <div className={`concept-app ${direction}`} style={style} data-concept={direction} data-view={view} data-motion={motion} data-playing={playing}>
    <header className="study-toolbar">
      <span className="study-label">POCKET CASCADE <span>DESIGN STUDY</span></span>
      <nav className="concept-tabs" aria-label="Visual concept">{directions.map(item => <button key={item.id} onClick={() => changeDirection(item.id)} aria-pressed={direction === item.id}><span>{item.number}</span>{item.title}</button>)}</nav>
      <div className="study-tools"><button title="Reset sample" aria-label="Reset sample" onClick={reset}><RotateCcw size={16} /></button><button title={motion ? 'Pause preview motion' : 'Enable preview motion'} aria-label="Preview motion" aria-pressed={motion} onClick={() => setMotion(!motion)}>{motion ? <Pause size={16} /> : <Play size={16} />}</button></div>
    </header>
    <main className="concept-stage">
      <div className="page-brand"><span className="brand-seal"><Cog /></span><span>POCKET<br /><strong>CASCADE</strong></span><span className="edition">No. 042<br />WORKSHOP EDITION</span></div>
      <section className="console" aria-label={`${chosen.title} concept`}>
        <header className="console-heading"><div className="commission-name"><span className="tiny-label">COMMISSION 06 / 12</span><h1>Cash Flow</h1></div><div className="mode-tabs" role="group" aria-label="Preview scene"><button aria-pressed={view === 'machine'} onClick={() => setView('machine')}>Machine</button><button disabled={playing} aria-pressed={view === 'reward'} onClick={() => setView('reward')}><Gift size={14} />Reward</button></div><span className="cabinet-serial">PC-0042</span></header>
        <section className="score-assembly" aria-label="Commission score"><span className="tiny-label">COMMISSION POINTS</span><div className="score-digits">{(2480 + earned).toLocaleString('en-US')}</div><div className="target-readout"><span>TO REACH</span><strong>6,000</strong></div><div className="score-progress"><span style={{ width: `${Math.min(100, (2480 + earned) / 60)}%` }} /></div><div className="score-caption"><span>{lastResult ? `+${lastResult.total.toLocaleString('en-US')} LAST CASCADE` : '3,520 TO GO'}</span><span>06 <ArrowRight size={13} /> 12</span></div></section>
        <section className="board-assembly" aria-label="Machine"><div className="board-topline"><span><span className="status-pin" />{playing ? 'CASCADE IN MOTION' : 'READY'}</span><span>{Object.keys(board).length}/10 INSTALLED</span></div><ConceptBoard direction={direction} lane={lane} setLane={setLane} selected={selected} place={place} board={board} playing={playing} speed={speed} motion={motion} finish={finishCascade} /><div className="board-engraving"><span>MECHANICAL WORKS / SERIES 06</span><Cog size={14} /><span>WORKSHOP No. 042</span></div></section>
        <section className="parts-assembly" aria-label="Parts tray"><div className="parts-heading"><span className="tiny-label">YOUR PARTS</span><span className="part-count">{stock.length.toString().padStart(2,'0')}</span></div><div className="parts-tray">{stock.map((part, index) => <button key={part.id} disabled={playing} className="part-cell" aria-pressed={selected?.id === part.id} onClick={() => setSelected(selected?.id === part.id ? null : part)}><span className="part-index">{String(index+1).padStart(2,'0')}</span><PartArt part={part} direction={direction} /><strong>{PARTS[part.kind].name}</strong><span>{part.kind === 'mint' ? '+1 CHARGE' : part.kind === 'doubler' ? 'VALUE x2' : part.kind === 'splitter' ? '+1 TOKEN' : 'BANK VALUE'}</span></button>)}</div><div className="part-inspection"><div><span className="tiny-label">{selected ? 'SELECTED PART' : 'LAST CASCADE'}</span><strong>{selected ? PARTS[selected.kind].name : `${(lastResult?.total ?? 1320).toLocaleString('en-US')} points`}</strong></div><p>{selected ? PARTS[selected.kind].description : `${lastResult?.hits ?? 8} part activations / ${(lastResult?.splits ?? 1) + 1} tokens collected`}</p>{selected && <button className="small-tool" onClick={() => setSelected(null)} title="Deselect part" aria-label="Deselect part"><X size={17} /></button>}</div><div className="workshop-wallet"><Ticket size={20} /><span>WORKSHOP<br /><strong>CREDITS</strong></span><b>14</b></div></section>
        <footer className="launch-assembly"><div className="token-count"><span className="tiny-label">LAUNCHES LEFT</span><span className="token-coins">{[0,1,2,3,4].map(index => <i key={index} className={index < launches ? 'filled' : ''} />)}</span></div><button className="launch-control" disabled={playing || launches === 0} onClick={previewCascade}><span className="launch-icon"><ArrowDown size={28} /></span><span>{playing ? 'CASCADING' : 'DROP TOKEN'}<small>25 BASE VALUE</small></span><span className="launch-mark">{direction === 'paper' ? 'GO!' : '01'}</span></button><div className="machine-switches"><span className="tiny-label">MACHINE SPEED</span><div className="speed-options">{[1,2,4].map(value => <button key={value} aria-pressed={speed === value} onClick={() => setSpeed(value)}>{value}x</button>)}</div></div></footer>
        {view === 'reward' && <section className="reward-scene" aria-label="Reward scene"><div className="reward-banner"><span className="tiny-label">COMMISSION COMPLETE</span><h2>Well made.</h2><span className="reward-stamp"><Check size={19} />PAID</span></div><div className="reward-total"><Ticket size={22} /><strong>+12</strong><span>WORKSHOP CREDITS</span></div><div className="reward-choice-title"><span>ONE FOR THE MACHINE</span><span>ON THE HOUSE</span></div><div className="reward-parts">{(['mint','dividend','splitter'] as PegKind[]).map(kind => <button key={kind} onClick={() => { setStock([...stock, {id:`preview-${Date.now()}`, kind, direction:1}]); setView('machine'); }}><PartArt part={{ id:kind, kind, direction:1 }} direction={direction} size={140} /><strong>{PARTS[kind].name}</strong><span>{PARTS[kind].description}</span><b>TAKE PART <ArrowRight size={15} /></b></button>)}</div><button className="reward-return" onClick={() => setView('machine')}><ArrowLeft size={16} />Back to machine</button></section>}
      </section>
      <footer className="concept-caption"><span><strong>{chosen.number} / {chosen.title}</strong>{chosen.character}</span><span>VISUAL CONCEPT / SAMPLE STATE / NO SAVES</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);