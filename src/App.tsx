import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2, ChevronRight,
  CircleHelp, Coins, Crown, Download, Expand, FlaskConical, Hammer, Menu,
  Minimize, Pause, Play, Plus, Redo2, RotateCcw, RotateCw, Settings2, Recycle, Gamepad2,
  ShieldCheck, Shuffle, Sparkles, Trophy, Undo2, Upload, Volume2, VolumeX, X, Ticket, Gift, Accessibility,
} from 'lucide-react';
import { Board } from './components/Board';
import { QuickGuide } from './components/QuickGuide';
import { CreditWallet } from './components/CreditWallet';
import { PartInventory } from './components/PartInventory';
import { Counter, Dialog, formatNumber, IconButton, PartSymbol, Toggle } from './components/UI';
import { ACHIEVEMENTS, COMMISSIONS, PARTS, PART_KINDS, POWER_VALUES, powerPrice } from './game/content';
import {
  baseValue, buyPart, claimPart, collectCommission, commission, commissionReward,
  dailySeed, enterEndless, launchDrop, newRun, nextCommission, placePeg, removePeg,
  rerollShop, retryCommission, rotatePeg, setLane, settleDrop, upgradePower,
  MAX_OWNED_PARTS, salvagePeg, parseMachineSeed, canRestartCommission, restartCommission,
  type RunMode, type RunState,
} from './game/engine';
import type { CascadeEvent, DropResult } from './game/model';
import {
  freshSave, loadBrowserSave, migrateDesktopSave, parseSave, updateProgress, writeBrowserSave,
  type SaveData, type Settings,
} from './game/save';
import { GameAudio } from './audio/synth';
import { useGamepadNavigation } from './input/useGamepadNavigation';
import { advanceTutorial, currentTutorialStep, startingTutorialStep, type TutorialAction, type TutorialStep } from './game/tutorial';
import './polish.css';

type Modal = 'menu' | 'settings' | 'accessibility' | 'collection' | 'achievements' | 'new' | 'credits' | 'rules' | null;

async function loadGame(): Promise<{ save: SaveData; message: string | null }> {
  if (window.pocketDesktop) {
    try {
      const native = await window.pocketDesktop.readSave();
      if (native.data) {
        const parsed = parseSave(native.data);
        if (parsed) return { save: migrateDesktopSave(parsed), message: native.recovered ? 'Recovered your machine from its backup.' : null };
      }
      if (native.error || native.data) {
        const browser = loadBrowserSave(localStorage);
        return { save: migrateDesktopSave(browser.save), message: native.error ?? 'The native save was invalid. Restored the local recovery copy.' };
      }
    } catch {
      return { save: freshSave(), message: 'Native storage is unavailable. Export your machine before closing.' };
    }
  }
  const loaded = loadBrowserSave(localStorage);
  return window.pocketDesktop ? { ...loaded, save: migrateDesktopSave(loaded.save) } : loaded;
}

async function persistGame(save: SaveData): Promise<string | null> {
  let browserError = false;
  try { writeBrowserSave(localStorage, save); } catch { browserError = true; }
  if (window.pocketDesktop) {
    try {
      const result = await window.pocketDesktop.writeSave(JSON.stringify(save));
      return result.ok ? null : result.error ?? 'Your machine could not be saved.';
    } catch { return 'Your machine could not be saved. Export a backup in Settings.'; }
  }
  return browserError ? 'Storage is full or unavailable. Export a backup in Settings.' : null;
}

export default function App() {
  const [initial, setInitial] = useState<SaveData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void loadGame().then((loaded) => {
      if (mounted) { setInitial(loaded.save); setMessage(loaded.message); }
    });
    return () => { mounted = false; };
  }, []);
  if (!initial) return <main className="loading-screen"><span className="loading-token" /><h1>Pocket Cascade</h1><p>Opening the workshop</p></main>;
  return <Game initial={initial} initialMessage={message} />;
}

function Game({ initial, initialMessage }: { initial: SaveData; initialMessage: string | null }) {
  const [save, setSave] = useState(initial);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState<'bench' | 'shop'>(initial.run.phase === 'shop' ? 'shop' : 'bench');
  const [livePayout, setLivePayout] = useState(0);
  const [feed, setFeed] = useState<CascadeEvent[]>([]);
  const [toast, setToast] = useState<string | null>(initialMessage);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [steam, setSteam] = useState(false);
  const [browserFullscreen, setBrowserFullscreen] = useState(Boolean(document.fullscreenElement));
  const [newMode, setNewMode] = useState<RunMode>('workshop');
  const [newSeed, setNewSeed] = useState('');
  const [assisted, setAssisted] = useState(false);
  const [history, setHistory] = useState<RunState[]>([]);
  const [future, setFuture] = useState<RunState[]>([]);
  const [audio] = useState(() => new GameAudio());
  const fileInput = useRef<HTMLInputElement>(null);
  const run = save.run;
  const settings = save.settings;
  const definition = commission(run);
  const selectedSlot = Object.entries(run.board).find(([, peg]) => peg.id === selectedId)?.[0];
  const selectedPeg = Object.values(run.board).find((peg) => peg.id === selectedId) ?? run.bench.find((peg) => peg.id === selectedId);
  const latest = useRef({ save, modal, paused, selectedId });
  latest.current = { save, modal, paused, selectedId };
  const achieved = useRef(new Set(initial.profile.achievements));

  useEffect(() => {
    let current = true;
    setSaved(false);
    void persistGame(save).then((error) => {
      if (current) { setSaveError(error); setSaved(!error); }
    });
    return () => { current = false; };
  }, [save]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.reducedMotion = String(settings.reducedMotion);
    document.documentElement.dataset.highContrast = String(settings.highContrast);
    audio.configure(settings);
  }, [settings, audio]);

  useEffect(() => { audio.setPaused(paused || Boolean(modal)); }, [paused, modal, audio]);

  useEffect(() => {
    const unlock = () => { void audio.unlock().catch(() => undefined); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      audio.dispose();
    };
  }, [audio]);

  useEffect(() => {
    void window.pocketDesktop?.getStatus().then((status) => setSteam(status.steam))
      .catch(() => setToast('Desktop settings are temporarily unavailable.'));
    const changed = () => setBrowserFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);

  useEffect(() => {
    const names: string[] = [];
    for (const id of save.profile.achievements) {
      if (!achieved.current.has(id)) {
        achieved.current.add(id);
        const achievement = ACHIEVEMENTS.find((item) => item.id === id);
        names.push(achievement?.name ?? id);
      }
      if (steam) void window.pocketDesktop?.unlockAchievement(id);
    }
    if (names.length > 0) setToast(`${names.length > 1 ? 'Achievements' : 'Achievement'}: ${names.join(' / ')}`);
  }, [save.profile.achievements, steam]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.code === 'F11') { event.preventDefault(); void fullscreen(); return; }
      const element = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return;
      if (event.key === 'Escape' && !latest.current.modal) {
        if (latest.current.selectedId) setSelectedId(null);
        else setModal('menu');
      }
      if (latest.current.modal) return;
      if (event.code === 'Space' && element.tagName !== 'BUTTON') { event.preventDefault(); launch(); }
      if (event.key.toLowerCase() === 'p') setPaused((value) => !value);
      if (event.key.toLowerCase() === 'm') changeSettings({ muted: !latest.current.save.settings.muted });
      if (event.key === 'ArrowLeft' && element.tagName !== 'BUTTON') changeRun((current) => setLane(current, current.lane - 1));
      if (event.key === 'ArrowRight' && element.tagName !== 'BUTTON') changeRun((current) => setLane(current, current.lane + 1));
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });

  function changeRun(action: (current: RunState) => RunState): void {
    setSave((current) => {
      const next = action(current.run);
      return next === current.run ? current : updateProgress(current, next);
    });
  }

  function editBoard(action: (current: RunState) => RunState): void {
    const current = latest.current.save.run;
    const changed = action(current);
    if (changed === current) return;
    setHistory((items) => [...items, current].slice(-30));
    setFuture([]);
    changeRun(() => changed);
    audio.click();
  }

  function changeSettings(changes: Partial<Settings>): void {
    setSave((current) => ({ ...current, settings: { ...current.settings, ...changes } }));
  }

  function learn(action: TutorialAction): void {
    setSave((current) => {
      if (current.profile.seenTutorial) return current;
      const tutorialStep = advanceTutorial(current.profile.tutorialStep ?? startingTutorialStep(current.run), action);
      return { ...current, profile: { ...current.profile, tutorialStep, seenTutorial: tutorialStep === 'done' } };
    });
  }

  function replayGuide(): void {
    const tutorialStep = startingTutorialStep(run);
    if (tutorialStep === 'done') { setToast('Start a new machine to replay the quick guide.'); return; }
    setSave((current) => ({ ...current, profile: { ...current.profile, seenTutorial: false, tutorialStep } }));
    setModal(null);
  }

  function locateGuide(step: TutorialStep): void {
    if (step === 'gift' || step === 'spend') setTab('shop');
    let selector = '';
    if (step === 'place') {
      if (selectedId) selector = '.socket:enabled';
      else { setTab('bench'); selector = '.bench-part:enabled'; }
    } else if (step === 'launch') selector = '.launch-button';
    else if (step === 'collect') selector = run.phase === 'review' ? '.result-panel .button.primary' : run.phase === 'lost' ? '.retry-panel .button.primary' : '.score-panel';
    else selector = step === 'gift' ? '.free-offer:enabled' : '.paid-offers .part-offer:enabled, .power-upgrade:enabled, .next-commission .button';
    requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(selector);
      element?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      element?.focus({ preventScroll: true });
    });
  }

  function trade(action: (current: RunState) => RunState): void {
    setHistory([]);
    setFuture([]);
    changeRun(action);
  }

  function launch(): void {
    const current = latest.current;
    if (current.save.run.phase !== 'ready' || current.paused || current.modal) return;
    setSelectedId(null);
    setHistory([]);
    setFuture([]);
    setLivePayout(0);
    setFeed([]);
    audio.launch();
    changeRun(launchDrop);
    learn('launch');
  }

  function restartLevel(): void {
    const current = latest.current.save.run;
    const restarted = restartCommission(current);
    if (restarted === current) return;
    changeRun(() => restarted);
    setModal(null);
    setPaused(false);
    setSelectedId(null);
    setHistory([]);
    setFuture([]);
    setLivePayout(0);
    setFeed([]);
    setTab('bench');
    audio.click();
  }

  function handleSlot(slotId: string): void {
    if (selectedPeg && run.board[slotId]?.id !== selectedPeg.id) {
      const changed = placePeg(run, selectedPeg.id, slotId);
      if (changed !== run) {
        editBoard(() => changed);
        setSelectedId(null);
        learn('place');
      } else setToast(`Machine full (${Object.keys(run.board).length}/${definition.capacity}). Swap an installed part or return one to the workbench.${run.phase === 'shop' ? ` Next level allows ${commission({ ...run, stage: run.stage + 1 }).capacity}.` : ''}`);
    } else setSelectedId(run.board[slotId]?.id === selectedId ? null : run.board[slotId]?.id ?? null);
  }

  function handleEvent(event: CascadeEvent): void {
    audio.event(event);
    if (event.type === 'payout' || event.type === 'bank') setLivePayout((amount) => amount + event.amount);
    if (event.type !== 'bank') setFeed((events) => [...events.slice(-5), event]);
  }

  function finishDrop(result: DropResult): void {
    const current = latest.current.save.run;
    const next = settleDrop(current, result);
    if (next.phase === 'review') audio.success();
    setLivePayout(0);
    changeRun(() => next);
  }

  function undo(): void {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [...items, run]);
    setHistory((items) => items.slice(0, -1));
    changeRun(() => previous);
    setSelectedId(null);
  }

  function redo(): void {
    const next = future.at(-1);
    if (!next) return;
    setHistory((items) => [...items, run]);
    setFuture((items) => items.slice(0, -1));
    changeRun(() => next);
    setSelectedId(null);
  }

  function collect(): void {
    changeRun(collectCommission);
    learn('collect');
    setTab('shop');
    setHistory([]);
    setFuture([]);
    audio.success();
  }

  function advance(): void {
    if (!run.rewardClaimed) { setToast('Choose your complimentary part first.'); return; }
    changeRun(nextCommission);
    learn('continue');
    setTab('bench');
    setHistory([]);
    setFuture([]);
    setFeed([]);
    setSelectedId(null);
  }

  function openNew(mode: RunMode): void {
    setNewMode(mode);
    setNewSeed('');
    setModal('new');
  }

  function startNew(): void {
    const seed = newMode === 'daily' ? dailySeed() : parseMachineSeed(newSeed);
    changeRun(() => newRun(seed, newMode, assisted));
    setModal(null);
    setPaused(false);
    setSelectedId(null);
    setHistory([]);
    setFuture([]);
    setFeed([]);
    setLivePayout(0);
    setTab('bench');
    audio.click();
  }

  async function fullscreen(): Promise<void> {
    if (window.pocketDesktop) {
      try {
        const value = await window.pocketDesktop.setFullscreen(!settings.fullscreen);
        changeSettings({ fullscreen: value, fullscreenPreferenceVersion: 1 });
      } catch { setToast('Display mode could not be changed.'); }
    } else {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch { setToast('Fullscreen is unavailable in this browser.'); }
    }
  }

  async function exportSave(): Promise<void> {
    if (window.pocketDesktop) {
      try {
        const result = await window.pocketDesktop.exportSave(JSON.stringify(save, null, 2));
        if (result.ok) setToast('Backup exported.');
        else if (!result.canceled) setToast(result.error ?? 'The backup could not be exported.');
      } catch { setToast('The backup could not be exported.'); }
      return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pocket-cascade-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importSave(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setToast('That save is too large.'); return; }
    const parsed = parseSave(await file.text());
    event.target.value = '';
    if (!parsed) { setToast('That file is not a valid Pocket Cascade save.'); return; }
    const restored = window.pocketDesktop ? migrateDesktopSave(parsed) : parsed;
    if (window.pocketDesktop) {
      try { await window.pocketDesktop.setFullscreen(restored.settings.fullscreen); }
      catch { setToast('The imported display preference could not be applied.'); return; }
    }
    setSave(restored);
    setHistory([]);
    setFuture([]);
    setSelectedId(null);
    setLivePayout(0);
    setModal(null);
    setToast('Machine restored.');
  }

  const canEdit = ['ready', 'shop', 'lost'].includes(run.phase);
  const score = run.score + livePayout;
  const progress = Math.min(100, score / definition.target * 100);
  const overshoot = score >= definition.target;
  const reward = commissionReward(run);
  const inventoryFull = run.bench.length + Object.keys(run.board).length >= MAX_OWNED_PARTS;
  const installedParts = Object.keys(run.board).length;
  const canRestart = canRestartCommission(run);
  const tutorialStep = currentTutorialStep(save.profile, run);
  const displayFullscreen = window.pocketDesktop ? settings.fullscreen : browserFullscreen;
  const gamepad = useGamepadNavigation({
    onMenu: () => setModal('menu'),
    onBack: () => {
      if (modal) setModal(null);
      else if (selectedId) setSelectedId(null);
      else setModal('menu');
    },
    onLaunch: launch,
    onRotate: () => {
      if (!modal && !paused && canEdit && selectedPeg && (selectedPeg.kind === 'kicker' || selectedPeg.kind === 'splitter')) {
        editBoard((current) => rotatePeg(current, selectedPeg.id));
      }
    },
    onActivity: () => { void audio.unlock().catch(() => undefined); },
  });

  return <div className="game-app" data-testid="game-ready" data-save-ready={saved} data-tutorial-active={tutorialStep !== 'done'} data-tutorial-step={tutorialStep}>
    <header className="topbar">
      <button className="wordmark" onClick={() => setModal('menu')} aria-label="Pocket Cascade menu">
        <span className="brand-symbol"><Coins size={30} strokeWidth={1.5} /></span>
        <span>POCKET <strong>CASCADE</strong></span>
      </button>
      <div className="run-label"><span className="status-light" />{run.mode === 'daily' ? 'DAILY MACHINE' : run.mode === 'endless' ? 'AFTER HOURS' : 'THE WORKSHOP'}<span className="run-number">NO. {String(run.seed % 1000).padStart(3, '0')}</span></div>
      <nav className="top-actions" aria-label="Game menu">
        <IconButton icon={BookOpen} label="Part collection" onClick={() => setModal('collection')} />
        <IconButton icon={Trophy} label="Achievements" onClick={() => setModal('achievements')} />
        <span className="nav-divider" />
        <IconButton icon={settings.muted ? VolumeX : Volume2} label={settings.muted ? 'Unmute audio' : 'Mute audio'} onClick={() => changeSettings({ muted: !settings.muted })} />
        <IconButton icon={displayFullscreen ? Minimize : Expand} label={displayFullscreen ? 'Use windowed mode' : 'Enter fullscreen'} onClick={() => { void fullscreen(); }} />
        <IconButton icon={Settings2} label="Settings" onClick={() => setModal('settings')} />
        <IconButton icon={Menu} label="Pause menu" onClick={() => setModal('menu')} />
      </nav>
    </header>

    <QuickGuide step={tutorialStep} run={run} selected={Boolean(selectedPeg)} onSkip={() => learn('skip')} onLocate={locateGuide} />

    <main className="workspace">
      <aside className="commission-panel" aria-label="Commission">
        <div className="eyebrow"><span>COMMISSION</span><span>{String(run.stage + 1).padStart(2, '0')} <span className="muted">/ {run.stage > 11 ? '--' : '12'}</span></span></div>
        <h1>{definition.title}</h1>
        <p className="commission-subtitle">{definition.subtitle}</p>
        <div className={`score-panel ${overshoot ? 'cleared' : ''}`} tabIndex={-1}>
          <div className="label">{run.phase === 'dropping' ? 'POINTS THIS COMMISSION' : overshoot ? 'TARGET CLEARED' : 'COMMISSION POINTS'}{overshoot && <Check size={15} />}</div>
          <Counter value={score} reduced={settings.reducedMotion} className="score-value" />
          <div className="target-line"><span>of <strong>{formatNumber(definition.target)}</strong></span><span>POINTS</span></div>
          <div className="progress-track" role="progressbar" aria-label="Commission progress" aria-valuemin={0} aria-valuemax={definition.target} aria-valuenow={Math.min(score, definition.target)}><span style={{ width: `${progress}%` }} /></div>
          {overshoot && <div className="overdrive-label"><Sparkles size={13} />{(score / definition.target).toFixed(2)}x TARGET</div>}
        </div>
        <div className="commission-facts">
          <div><span><Ticket size={14} />Completion reward</span><strong>{definition.reward} credits</strong></div>
          <div><span><Plus size={14} />Excess bonus</span><strong>up to 3 credits</strong></div>
          <div><span><FlaskConical size={14} />Installed parts</span><strong>{Object.keys(run.board).length} / {definition.capacity}</strong></div>
        </div>
        {run.assisted && <div className="quiet-badge"><ShieldCheck size={13} />RELAXED WORKSHOP</div>}
        {run.retries > 0 && <div className="quiet-badge"><Hammer size={13} />TUNE-UP +{Math.min(run.retries, 3) * 10}%</div>}
        <section className="last-cascade" aria-label="Last cascade">
          <div className="section-heading"><span>LAST CASCADE</span><span className="muted">{run.lastDrop ? `${run.lastDrop.maxChain} IN CHAIN` : 'READY'}</span></div>
          <div className="last-value"><ArrowDown size={21} /><Counter value={run.lastDrop?.total ?? livePayout} reduced={settings.reducedMotion} /></div>
          {run.lastDrop ? <div className="payout-breakdown">
            <div><span>Collectors</span><strong>{formatNumber(run.lastDrop.total - run.lastDrop.banked)}</strong></div>
            <div><span>Vault deposits</span><strong>{formatNumber(run.lastDrop.banked)}</strong></div>
            <div><span>Tokens made</span><strong>{run.lastDrop.splits + 1}</strong></div>
          </div> : <div className="idle-diagram" aria-hidden="true"><PartSymbol kind="mint" small /><ChevronRight size={13} /><PartSymbol kind="doubler" small /><ChevronRight size={13} /><PartSymbol kind="splitter" small /></div>}
          <div className="event-feed" aria-live="off">{feed.slice(-4).map((event, index) => <div key={`${event.tick}-${event.tokenId}-${index}`} className={`feed-item event-${event.type}`}>{event.kind ? <PartSymbol kind={event.kind} small /> : <Coins size={15} />}<span>{event.kind ? PARTS[event.kind].name : 'Collector'}</span><strong>{event.label}</strong></div>)}</div>
        </section>
        <button className="text-button rules-button" onClick={() => setModal('rules')}><CircleHelp size={15} />The machine manual<ArrowRight size={14} /></button>
      </aside>

      <section className="machine-column" aria-label="Pocket machine">
        <div className="machine-caption machine-toolbar">
          <div className="machine-status"><span><span className={`status-light ${run.phase === 'dropping' ? 'active' : ''}`} />{paused || modal ? 'ON HOLD' : run.phase === 'dropping' ? 'CHAIN REACTION' : run.phase === 'shop' ? 'WORKSHOP OPEN' : 'POCKET CASCADE'}</span>
            <span className={`installation-capacity ${installedParts >= definition.capacity ? 'full' : ''}`} data-testid="installation-capacity"><strong>{installedParts}/{definition.capacity}</strong> installed <span>{installedParts >= definition.capacity ? 'FULL' : `${definition.capacity - installedParts} ${definition.capacity - installedParts === 1 ? 'space' : 'spaces'} free`}</span></span>
          </div>
          <div className="machine-actions" role="group" aria-label="Machine controls">
            <IconButton icon={RotateCcw} label="Restart level" title={canRestart ? 'Reset this attempt to five launches. Keep the machine, upgrades, and credits.' : 'This level is already complete. Advance or start a new workshop.'} disabled={!canRestart} onClick={restartLevel} />
            <IconButton icon={Plus} label="New workshop" title="Start again from level 1. Opens confirmation and seed choices." onClick={() => openNew('workshop')} />
          </div>
        </div>
        <div className="machine-frame">
          <Board run={run} selectedPegId={selectedId} onSlot={handleSlot} onLane={(lane) => changeRun((current) => setLane(current, lane))}
            onDropComplete={finishDrop} onEvent={handleEvent} onImpact={(impact) => audio.impact(impact)} paused={paused || Boolean(modal)} speed={settings.speed} reducedMotion={settings.reducedMotion} trails={settings.trails} />
          {paused && !modal && <div className="pause-overlay"><Pause size={30} /><strong>Taking a breath</strong><button className="button primary" onClick={() => setPaused(false)}><Play size={17} />Resume</button></div>}
        </div>
        <div className="launch-console">
          <div className="token-reserve" aria-label={`${run.dropsLeft} launches remaining`}><span className="label">LAUNCHES</span><div>{Array.from({ length: 5 }, (_, index) => <span key={index} className={`reserve-token ${index < run.dropsLeft ? 'available' : ''}`} />)}</div></div>
          <button className={`launch-button ${run.phase === 'dropping' ? 'launching' : ''}`} aria-label="Launch token" disabled={run.phase !== 'ready' || paused || Boolean(modal)} onClick={launch}>
            {run.phase === 'dropping' ? <><span className="launch-spinner" />CASCADING</> : <><ArrowDown size={22} /><span>DROP TOKEN<small>{baseValue(run)} BASE VALUE</small></span></>}
          </button>
          <div className="playback-controls"><IconButton icon={paused ? Play : Pause} label={paused ? 'Resume cascade' : 'Pause cascade'} onClick={() => setPaused(!paused)} /><div className="speed-control" role="group" aria-label="Playback speed">{([1, 2, 4] as const).map((speed) => <button key={speed} onClick={() => changeSettings({ speed })} aria-label={`${speed}x speed`} aria-pressed={settings.speed === speed}>{speed}x</button>)}</div></div>
        </div>
      </section>

      <aside className="worktable-panel" aria-label="Worktable">
        <div className="worktable-header"><h2>{run.phase === 'review' ? 'A job well done' : run.phase === 'won' ? 'Made of little things' : run.phase === 'lost' ? 'Back to the worktable' : 'The worktable'}</h2></div>
        <CreditWallet credits={run.brass} reducedMotion={settings.reducedMotion} />
        {(canEdit || run.phase === 'dropping') && <PartInventory run={run} selectedId={selectedId} editable={canEdit} onSelect={(id) => { setSelectedId(selectedId === id ? null : id); audio.click(); }} />}
        {run.phase === 'review' ? <div className="result-panel">
          <div className="result-stamp"><CheckCircle2 size={42} strokeWidth={1.2} /></div><div className="eyebrow">COMMISSION COMPLETE</div><h3>Beautifully<br />overachieved.</h3>
          <p>{formatNumber(run.score)} points from {5 - run.dropsLeft} {5 - run.dropsLeft === 1 ? 'launch' : 'launches'}.</p>
          <dl className="reward-ledger"><div><dt>Completion reward</dt><dd>+{reward.base}</dd></div><div><dt>Spare launches</dt><dd>+{reward.spare}</dd></div><div><dt>Excess payout</dt><dd>+{reward.overdrive}</dd></div><div className="ledger-total"><dt>Workshop credits earned</dt><dd>+{reward.total}</dd></div></dl>
          <button className="button primary full" aria-label={run.stage === 11 && run.mode !== 'endless' ? 'Complete the machine' : 'Visit the workshop'} onClick={collect}><Ticket size={17} />{run.stage === 11 && run.mode !== 'endless' ? 'Complete the machine' : `Collect ${reward.total} credits`}<ArrowRight size={18} /></button>
          <span className="result-note">{run.stage === 11 ? 'This one is yours.' : 'A new part is waiting for you.'}</span>
        </div> : run.phase === 'won' ? <div className="result-panel victory">
          <div className="victory-art" aria-hidden="true"><Crown size={58} strokeWidth={1.1} /><span /><span /><span /></div><div className="eyebrow">ALL TWELVE COMMISSIONS</div><h3>Look what<br />you made.</h3><p>A handful of parts. An extraordinary little machine.</p>
          <dl className="reward-ledger"><div><dt>Total payout</dt><dd>{formatNumber(run.totalScore)}</dd></div><div><dt>Best cascade</dt><dd>{formatNumber(run.bestDrop)}</dd></div><div><dt>Launches</dt><dd>{run.totalDrops}</dd></div></dl>
          <button className="button primary full" onClick={() => { changeRun(enterEndless); setTab('shop'); }}>Stay after hours<ArrowRight size={17} /></button>
          <button className="button subtle full" onClick={() => openNew('workshop')}><RotateCcw size={16} />A new machine</button>
        </div> : <>
          {run.phase === 'lost' && <div className="retry-panel"><span className="eyebrow">A LITTLE MORE TINKERING</span><h3>Almost a good thing.</h3><p>{formatNumber(Math.max(0, definition.target - run.score))} points short. Your parts and credits stay yours.</p><button className="button primary full" onClick={() => { changeRun(retryCommission); setFeed([]); setHistory([]); setFuture([]); }}><RotateCcw size={16} />Retry commission</button><small>Complimentary tune-up: +10% base value, up to +30%.</small></div>}
          {run.phase === 'shop' && <div className="worktable-tabs" role="tablist" aria-label="Workshop views"><button role="tab" aria-selected={tab === 'shop'} onClick={() => setTab('shop')}><Hammer size={14} />Parts counter</button><button role="tab" aria-selected={tab === 'bench'} onClick={() => setTab('bench')}><FlaskConical size={14} />Workbench{run.bench.length > 0 && <span>{run.bench.length}</span>}</button></div>}
          {run.phase === 'shop' && tab === 'shop' ? <div className="shop-panel">
            <div className="free-reward-section" aria-label="Free commission reward">
              <div className="section-heading"><span><Gift size={14} />{run.rewardClaimed ? 'FREE PART CLAIMED' : 'CHOOSE ONE FREE PART'}</span><span>{run.rewardClaimed ? <Check size={14} /> : '0 CREDITS'}</span></div>
              {run.rewardClaimed ? <div className="gift-claimed"><CheckCircle2 size={22} /><span>Gift collected<small>No credits spent.</small></span></div> : <div className="offer-list">{run.rewardChoices.map((kind) => <button className="part-offer free-offer" key={kind} aria-label={`Choose ${PARTS[kind].name}`} onClick={() => { const id = `part-${run.nextId}`; trade((current) => claimPart(current, kind)); learn('claim'); setSelectedId(inventoryFull ? null : id); if (inventoryFull) setToast('Parts storage is full. Your complimentary part became 2 credits.'); audio.click(); }}><PartSymbol kind={kind} /><span><strong>{PARTS[kind].name}</strong><small>{inventoryFull ? 'Storage full: receive 2 credits instead.' : PARTS[kind].description}</small></span><span className="offer-price">FREE</span></button>)}</div>}
            </div>
            <div className="paid-offers" aria-label="Paid upgrades">
              <div className="section-heading shop-heading"><span>SPEND WORKSHOP CREDITS</span><button className="text-button" disabled={run.brass < 2 || run.rerolls >= 2} onClick={() => trade(rerollShop)} aria-label="Refresh shop for 2 credits" title="Refresh offers for 2 credits, at most twice"><Shuffle size={14} /><Ticket size={12} />2</button></div>
              <div className="offer-list">{run.offers.map((offer) => <button className="part-offer" key={offer.id} disabled={offer.sold || run.brass < offer.price || inventoryFull} aria-label={`Buy ${PARTS[offer.kind].name} for ${offer.price} credits`} onClick={() => { const id = `part-${run.nextId}`; trade((current) => buyPart(current, offer.id)); learn('purchase'); setSelectedId(id); audio.click(); }}><PartSymbol kind={offer.kind} small /><span><strong>{PARTS[offer.kind].name}</strong><small>{PARTS[offer.kind].family}</small></span><span className="offer-price">{offer.sold ? 'SOLD' : <><Ticket size={12} />{offer.price}<small>credits</small></>}</span></button>)}</div>
              <button className="power-upgrade" disabled={run.power >= POWER_VALUES.length - 1 || run.brass < powerPrice(run.power)} onClick={() => { trade(upgradePower); learn('purchase'); audio.success(); }} aria-label="Upgrade token value"><span className="power-icon"><Coins size={24} /></span><span><strong>Heavier pockets</strong><small>{POWER_VALUES[run.power]} <ArrowRight size={12} /> {POWER_VALUES[Math.min(run.power + 1, 8)]} base value</small><small>All tokens. No part to place.</small></span><span>{run.power >= 8 ? 'MAX' : <><Ticket size={12} />{powerPrice(run.power)}<small>credits</small></>}</span></button>
              <p className="shop-optional">Purchases are optional. Unspent credits carry forward.</p>
            </div>
            {selectedPeg && <div className="selected-inline"><PartSymbol kind={selectedPeg.kind} small /><span>{PARTS[selectedPeg.kind].name} ready to place</span><IconButton icon={X} label="Deselect part" onClick={() => setSelectedId(null)} /></div>}
          </div> : <div className="bench-panel">
            {selectedPeg ? <div className="part-inspector"><div className="inspector-heading"><PartSymbol kind={selectedPeg.kind} /><div><span className="eyebrow">{PARTS[selectedPeg.kind].family}</span><h3>{PARTS[selectedPeg.kind].name}</h3></div><IconButton icon={X} label="Deselect part" onClick={() => setSelectedId(null)} /></div><p>{PARTS[selectedPeg.kind].description}</p><small>{PARTS[selectedPeg.kind].detail}</small><div className="inspector-actions">{(selectedPeg.kind === 'kicker' || selectedPeg.kind === 'splitter') && <button className="button subtle" onClick={() => editBoard((current) => rotatePeg(current, selectedPeg.id))}><RotateCw size={15} />{selectedPeg.direction === 1 ? 'Right' : 'Left'}</button>}{selectedSlot ? <button className="button subtle" onClick={() => { editBoard((current) => removePeg(current, selectedSlot)); setSelectedId(null); }}><ArrowLeft size={15} />To worktable</button> : <button className="button subtle" aria-label="Salvage part for 1 credit" title="Permanently recycle this spare part for 1 Workshop credit" onClick={() => { trade((current) => salvagePeg(current, selectedPeg.id)); setSelectedId(null); audio.click(); }}><Recycle size={15} />1 credit</button>}</div></div> : <div className="machine-summary"><div className="blueprint-mark" aria-hidden="true"><FlaskConical size={52} strokeWidth={0.9} /></div><span className="eyebrow">YOUR LITTLE MACHINE</span><div><strong>{Object.keys(run.board).length}</strong><span>parts working together</span></div><div><strong>{baseValue(run)}</strong><span>starting token value</span></div><div><strong>{formatNumber(run.bestDrop)}</strong><span>personal best cascade</span></div></div>}
            <div className="edit-toolbar"><span className="muted">{selectedPeg ? 'Choose a socket' : 'WORKBENCH'}</span><IconButton icon={Undo2} label="Undo placement" disabled={!canEdit || history.length === 0} onClick={undo} /><IconButton icon={Redo2} label="Redo placement" disabled={!canEdit || future.length === 0} onClick={redo} /></div>
          </div>}
          {run.phase === 'shop' && <div className="next-commission"><button className="button primary full" disabled={!run.rewardClaimed} onClick={advance}>Next commission<ArrowRight size={17} /></button><span>{run.rewardClaimed ? `${COMMISSION_LABEL(run.stage + 1)} / ${formatNumber(commission({ ...run, stage: run.stage + 1 }).target)} points` : 'A complimentary part is still waiting.'}</span></div>}
        </>}
      </aside>
    </main>

    <footer className="game-footer"><span><ShieldCheck size={13} />{saveError ? 'SAVE NEEDS ATTENTION' : saved ? 'MACHINE SAVED' : 'SAVING'}{steam && ' / STEAM CONNECTED'}</span><span className="seed-label">SEED {run.seed}{run.mode === 'daily' ? ` / ${run.date} UTC` : ''}</span><span><strong data-testid="total-drops">{run.totalDrops}</strong> LAUNCHES</span><span aria-label="Controller status" title={gamepad.name ?? gamepad.label}><Gamepad2 size={13} />{gamepad.label}</span><button className="text-button" onClick={() => setModal('credits')}>MADE FOR THE LITTLE MOMENTS <span>v1.0</span></button></footer>
    {saveError && <div className="save-warning" role="alert">{saveError}<button className="text-button" onClick={exportSave}><Download size={15} />Export backup</button></div>}
    {toast && <div className="toast" role="status"><Sparkles size={17} /><span>{toast}</span><IconButton icon={X} label="Dismiss notification" onClick={() => setToast(null)} /></div>}

    {modal === 'menu' && <Dialog title="A moment in the workshop" onClose={() => setModal(null)}><div className="menu-brand"><Coins size={38} strokeWidth={1.2} /><h3>POCKET CASCADE</h3></div><button className="button primary full" onClick={() => { setModal(null); setPaused(false); }}><Play size={17} />Back to the machine</button><div className="menu-actions"><button disabled={!canRestart} onClick={restartLevel}><RotateCcw size={18} />Restart level<ChevronRight size={16} /></button><button onClick={() => openNew('workshop')}><Plus size={18} />New workshop<ChevronRight size={16} /></button><button onClick={() => openNew('daily')}><Award size={18} />Daily machine<span>{new Date().toISOString().slice(5, 10)}</span></button><button onClick={() => setModal('settings')}><Settings2 size={18} />Settings<ChevronRight size={16} /></button><button onClick={() => setModal('rules')}><BookOpen size={18} />Machine manual<ChevronRight size={16} /></button>{window.pocketDesktop && <button onClick={() => { void persistGame(save).then((error) => { if (error) setToast(error); else window.pocketDesktop?.quit(); }); }}><X size={18} />Save and quit</button>}</div><div className="menu-record"><span>Best cascade</span><strong>{formatNumber(save.profile.bestDrop)}</strong></div></Dialog>}

    {modal === 'settings' && <Dialog title="Make yourself comfortable" onClose={() => setModal(null)}>
      <div className="settings-group"><h3>Sound</h3>
        <label className="slider-row"><span>Master volume<strong>{Math.round(settings.volume * 100)}%</strong></span><input aria-label="Master volume" type="range" min="0" max="1" step="0.01" value={settings.volume} onChange={(event) => changeSettings({ volume: Number(event.target.value) })} /></label>
        <label className="slider-row"><span>Workshop music<strong>{Math.round(settings.musicVolume * 100)}%</strong></span><input aria-label="Workshop music" type="range" min="0" max="1" step="0.01" value={settings.musicVolume} onChange={(event) => changeSettings({ musicVolume: Number(event.target.value) })} /></label>
        <Toggle label="Mute all audio" value={settings.muted} onChange={(muted) => changeSettings({ muted })} />
      </div>
      <div className="settings-group"><h3>Display</h3>
        <div className="display-mode" role="group" aria-label="Display mode">
          <button aria-pressed={displayFullscreen} onClick={() => { if (!displayFullscreen) void fullscreen(); }}><Expand size={16} />Borderless fullscreen</button>
          <button aria-pressed={!displayFullscreen} onClick={() => { if (displayFullscreen) void fullscreen(); }}><Minimize size={16} />Windowed</button>
        </div>
        <Toggle label="Token trails" value={settings.trails} onChange={(trails) => changeSettings({ trails })} />
        <Toggle label="Evening lighting" value={settings.theme === 'dark'} onChange={(dark) => changeSettings({ theme: dark ? 'dark' : 'light' })} />
        <button className="button subtle full accessibility-link" onClick={() => setModal('accessibility')}><Accessibility size={16} />Accessibility options<ChevronRight size={15} /></button>
      </div>
      <div className="settings-group"><h3>Your machine</h3>
        <button className="button subtle full" onClick={replayGuide}><CircleHelp size={16} />Replay quick guide</button>
        <div className="button-row save-actions"><button className="button subtle" onClick={exportSave}><Download size={15} />Export save</button><button className="button subtle" onClick={() => fileInput.current?.click()}><Upload size={15} />Import save</button></div>
        <p className="fine-print">Import replaces this machine. Export a backup first to keep both.</p>
        <input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Import save file" onChange={(event) => { void importSave(event); }} />
      </div>
    </Dialog>}

    {modal === 'accessibility' && <Dialog title="Accessibility" onClose={() => setModal('settings')}>
      <Toggle label="Reduced motion" value={settings.reducedMotion} onChange={(reducedMotion) => changeSettings({ reducedMotion })} />
      <Toggle label="High contrast" value={settings.highContrast} onChange={(highContrast) => changeSettings({ highContrast })} />
      <button className="button subtle full accessibility-link" onClick={() => setModal('settings')}><ArrowLeft size={16} />Back to settings</button>
    </Dialog>}

    {modal === 'collection' && <Dialog title="The parts catalogue" wide onClose={() => setModal(null)}><p className="dialog-intro">{save.profile.discovered.length} of 8 parts discovered</p><div className="catalogue-grid">{PART_KINDS.map((kind) => { const part = PARTS[kind]; const unlocked = save.profile.discovered.includes(kind); return <article className={`catalogue-part ${unlocked ? '' : 'undiscovered'}`} key={kind}><div><PartSymbol kind={kind} /><span className="eyebrow">{part.family}</span>{unlocked && <Check size={15} />}</div><h3>{part.name}</h3><p>{part.description}</p><small>{part.detail}</small><span className="catalogue-unlock">{unlocked ? 'DISCOVERED' : `COMMISSION ${part.unlock + 1}`}</span></article>; })}</div></Dialog>}

    {modal === 'achievements' && <Dialog title="Little accomplishments" wide onClose={() => setModal(null)}><div className="achievement-overview"><Trophy size={32} /><div><strong>{save.profile.achievements.length} / {ACHIEVEMENTS.length}</strong><span>collected along the way</span></div><div><strong>{formatNumber(save.profile.lifetimeScore)}</strong><span>lifetime points</span></div></div><div className="achievement-list">{ACHIEVEMENTS.map((achievement) => { const unlocked = save.profile.achievements.includes(achievement.id); return <div key={achievement.id} className={`achievement ${unlocked ? 'unlocked' : ''}`}><span className="achievement-icon">{unlocked ? <Award size={22} /> : <Trophy size={20} />}</span><div><strong>{achievement.name}</strong><span>{achievement.description}</span></div>{unlocked && <Check size={16} />}</div>; })}</div></Dialog>}

    {modal === 'new' && <Dialog title={newMode === 'daily' ? 'Today\'s little machine' : 'A fresh worktable'} onClose={() => setModal('menu')}><p className="dialog-intro">Your collection and achievements stay. This replaces the current machine.</p>{newMode === 'daily' ? <div className="daily-card"><Award size={34} /><strong>{new Date().toISOString().slice(0, 10)}</strong><span>Same starting conditions and parts counter for everyone. No online leaderboard or account required.</span>{save.profile.dailyCompleted.includes(new Date().toISOString().slice(0, 10)) && <span className="success-text"><Check size={15} />Already completed today</span>}</div> : <><label className="text-field">Machine seed <span className="muted">optional</span><input value={newSeed} onChange={(event) => setNewSeed(event.target.value)} maxLength={64} placeholder="A word, a number, a little idea" /></label><Toggle label="Relaxed targets (-35%)" value={assisted} onChange={setAssisted} /></>}<div className="button-row confirmation-actions"><button className="button subtle" onClick={() => setModal('menu')}>Keep this machine</button><button className="button primary" onClick={startNew}>Start fresh<ArrowRight size={16} /></button></div></Dialog>}

    {modal === 'rules' && <Dialog title="The machine manual" wide onClose={() => setModal(null)}><div className="manual-layout"><section><span className="manual-number">01</span><h3>Build a chain reaction</h3><p>Choose a spare part, then a socket on the machine. Installed parts can be moved, swapped, or returned to the worktable for free between launches.</p><p>Mint adds value. Doubler multiplies what is already there. Fork makes a second token. Order matters.</p></section><section><span className="manual-number">02</span><h3>Make the target. Then some.</h3><p>Five launches per commission. Every tray and Vault deposit earns points toward the target. The middle collector pays double. Points complete commissions; they are not spendable currency.</p><p>Each lane repeats its route throughout the run. A token can trigger each part once. Forks inherit the route history and split up to two generations.</p></section><section><span className="manual-number">03</span><h3>Earn Workshop credits</h3><p>Collect a completed commission to earn credits and choose one free part. Excess points and unused launches earn bonus credits. Paid stock and token-value upgrades spend credits; unspent credits carry forward. Surplus spares can be salvaged for one credit.</p><p>Miss the target? Keep your build and credits, rewire, and retry with a small base-value tune-up. Relaxed targets are available outside daily machines. Complete all twelve commissions to unlock After Hours.</p></section><section><span className="manual-number">04</span><h3>At your own pace</h3><p>Pause whenever you like. Playback speed changes animation time, never the result. The dotted trail is the last token route. The quick guide is available from Settings.</p><p>Progress saves automatically. Interrupted launches are refunded. All currency stays inside the game. There are no purchases, bets, or payouts involving real money.</p></section></div></Dialog>}

    {modal === 'credits' && <Dialog title="Pocket Cascade" onClose={() => setModal(null)}><div className="credits-art"><Coins size={56} strokeWidth={1.1} /></div><p className="credits-line">A little machine.<br /><strong>An extraordinary chain reaction.</strong></p><div className="credits-list"><div><span>Game, artwork & sound</span><strong>Pocket Cascade</strong></div><div><span>Physics</span><strong>Matter.js</strong></div><div><span>Interface icons</span><strong>Lucide</strong></div><div><span>Type</span><strong>Barlow Condensed / DM Sans</strong></div><div><span>Edition</span><strong>1.0.0 / Offline workshop</strong></div></div><p className="fine-print">Original procedural artwork and synthesized music. No analytics, accounts, or network connection required. Made for the little moments between bigger things.</p></Dialog>}
  </div>;
}

function COMMISSION_LABEL(stage: number): string {
  return COMMISSIONS[stage]?.title ?? `After Hours ${stage - 11}`;
}