import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2, ChevronRight,
  CircleHelp, Cog, Coins, Combine, Crown, Download, Expand, Hammer, Menu,
  Minimize, Pause, Play, Plus, Redo2, RotateCcw, RotateCw, Settings2, Recycle, Gamepad2,
  ShieldCheck, Shuffle, Sparkles, Trophy, Undo2, Upload, Volume2, VolumeX, X, Ticket, Gift, Accessibility,
} from 'lucide-react';
import { Board } from './components/Board';
import { WorkshopScene } from './components/WorkshopScene';
import { QuickGuide } from './components/QuickGuide';
import { CreditWallet } from './components/CreditWallet';
import { PartInventory } from './components/PartInventory';
import { RewardDialog } from './components/RewardDialog';
import { CascadeReceipt } from './components/CascadeReceipt';
import { Counter, Dialog, formatNumber, IconButton, PartSymbol, Toggle } from './components/UI';
import { ACHIEVEMENTS, COMMISSIONS, PARTS, PART_KINDS, POWER_VALUES, TUNINGS, partName, powerPrice, tuningPrice } from './game/content';
import {
  baseValue, buyPart, claimPart, collectCommission, commission, commissionReward,
  dailySeed, enterEndless, launchDrop, newRun, nextCommission, placePeg, removePeg,
  rerollShop, retryCommission, rotatePeg, setLane, settleDrop, upgradePower,
  MAX_OWNED_PARTS, salvagePeg, parseMachineSeed, canRestartCommission, restartCommission,
  claimTuning, claimCredits, tuningTargets, tunePeg, fusePeg, canSalvagePeg, retryHelpLevel,
  type RunMode, type RunState,
} from './game/engine';
import type { CascadeEvent, DropResult, PegKind } from './game/model';
import {
  freshSave, loadBrowserSave, migrateDesktopSave, parseSave, updateProgress, writeBrowserSave, canRestoreShop, restoreShop, createPractice,
  type SaveData, type Settings,
} from './game/save';
import { GameAudio } from './audio/synth';
import { useGamepadNavigation } from './input/useGamepadNavigation';
import { advanceTutorial, currentTutorialStep, startingTutorialStep, type TutorialAction, type TutorialStep } from './game/tutorial';
import './polish.css';
import './render/workshop.css';

type Modal = 'menu' | 'settings' | 'accessibility' | 'collection' | 'achievements' | 'new' | 'credits' | 'rules' | 'reward' | 'recovery' | 'practice' | null;

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
  const commissionFor = commission;
  const [save, setSave] = useState(initial);
  const [practice, setPractice] = useState<RunState | null>(null);
  const [modal, setModal] = useState<Modal>(initial.run.phase === 'shop' && !initial.run.rewardClaimed ? 'reward' : null);
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
  const run = practice ?? save.run;
  const settings = save.settings;
  const definition = commissionFor(run);
  const selectedSlot = Object.entries(run.board).find(([, peg]) => peg.id === selectedId)?.[0];
  const selectedPeg = Object.values(run.board).find((peg) => peg.id === selectedId) ?? run.bench.find((peg) => peg.id === selectedId);
  const latest = useRef({ save, run, modal, paused, selectedId });
  latest.current = { save, run, modal, paused, selectedId };
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
    if (latest.current.run.practice) {
      setPractice((current) => current ? action(current) : null);
      return;
    }
    setSave((current) => {
      const next = action(current.run);
      return next === current.run ? current : updateProgress(current, next, commissionFor(next));
    });
  }

  function editBoard(action: (current: RunState) => RunState): void {
    const current = latest.current.run;
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
    if (latest.current.run.practice) return;
    setSave((current) => {
      if (current.profile.seenTutorial) return current;
      const tutorialStep = advanceTutorial(current.profile.tutorialStep ?? startingTutorialStep(current.run), action);
      return { ...current, profile: { ...current.profile, tutorialStep, seenTutorial: tutorialStep === 'done' } };
    });
  }

  function replayGuide(): void {
    if (practice) return;
    const tutorialStep = startingTutorialStep(run);
    if (tutorialStep === 'done') { setToast('Start a new machine to replay the quick guide.'); return; }
    setSave((current) => ({ ...current, profile: { ...current.profile, seenTutorial: false, tutorialStep } }));
    setModal(null);
  }

  function locateGuide(step: TutorialStep): void {
    if (step === 'gift' && run.phase === 'shop' && !run.rewardClaimed) { setTab('shop'); setModal('reward'); return; }
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
    if (current.run.phase !== 'ready' || current.paused || current.modal) return;
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
    const current = latest.current.run;
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

  function resetControls(): void {
    setPaused(false);
    setSelectedId(null);
    setHistory([]);
    setFuture([]);
    setLivePayout(0);
    setFeed([]);
  }

  function retry(addHelp = false): void {
    changeRun((current) => retryCommission(current, addHelp));
    resetControls();
    setTab('bench');
    audio.click();
  }

  function recoverShop(): void {
    const restored = restoreShop(latest.current.save);
    if (restored === latest.current.save || practice) return;
    setSave(restored);
    resetControls();
    setTab('shop');
    setModal(restored.run.rewardClaimed ? null : 'reward');
    audio.click();
  }

  function startPractice(stage: number): void {
    const entry = createPractice(latest.current.save, stage);
    if (!entry) return;
    setPractice(entry);
    resetControls();
    setTab('bench');
    setModal(null);
    audio.click();
  }

  function leavePractice(): void {
    setPractice(null);
    resetControls();
    const campaign = latest.current.save.run;
    setTab(campaign.phase === 'shop' ? 'shop' : 'bench');
    setModal(campaign.phase === 'shop' && !campaign.rewardClaimed ? 'reward' : null);
    audio.click();
  }

  function handleSlot(slotId: string): void {
    if (selectedPeg && run.board[slotId]?.id !== selectedPeg.id) {
      const full = !selectedSlot && !run.board[slotId] && Object.keys(run.board).length >= definition.capacity;
      const changed = full ? run : placePeg(run, selectedPeg.id, slotId);
      if (changed !== run) {
        editBoard(() => changed);
        setSelectedId(null);
        learn('place');
      } else setToast(`Machine full (${Object.keys(run.board).length}/${definition.capacity}). Swap an installed part or return one to the workbench.${run.phase === 'shop' ? ` Next level allows ${commissionFor({ ...run, stage: run.stage + 1 }).capacity}.` : ''}`);
    } else setSelectedId(run.board[slotId]?.id === selectedId ? null : run.board[slotId]?.id ?? null);
  }

  function handleEvent(event: CascadeEvent): void {
    audio.event(event);
    if (event.type === 'payout' || event.type === 'bank') setLivePayout((amount) => amount + event.amount);
    if (event.type !== 'bank') setFeed((events) => [...events.slice(-5), event]);
  }

  function finishDrop(result: DropResult): void {
    const current = latest.current.run;
    const next = settleDrop(current, result, commissionFor(current));
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
    const current = latest.current.run;
    const collected = collectCommission(current, commissionFor(current));
    if (collected === current) return;
    changeRun(() => collected);
    learn('collect');
    setTab('shop');
    setHistory([]);
    setFuture([]);
    setModal(collected.phase === 'shop' && !collected.rewardClaimed ? 'reward' : null);
    audio.success();
  }

  function chooseGift(kind: PegKind): void {
    const current = latest.current.run;
    const claimed = claimPart(current, kind);
    if (claimed === current) return;
    const converted = current.bench.length + Object.keys(current.board).length >= MAX_OWNED_PARTS;
    trade(() => claimed);
    learn('claim');
    setSelectedId(converted ? null : `part-${current.nextId}`);
    setModal(null);
    if (converted) setToast('Storage full: received 2 credits.');
    audio.click();
    requestAnimationFrame(() => document.querySelector<HTMLElement>(converted ? '.next-commission .button' : '.bench-part[aria-pressed="true"]')?.focus());
  }

  function closeReward(): void {
    setTab('shop');
    setModal(null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.reward-reopen')?.focus());
  }

  function chooseTuning(partId: string): void {
    const current = latest.current.run;
    const tuned = claimTuning(current, partId);
    if (tuned === current) return;
    trade(() => tuned);
    learn('claim');
    setSelectedId(partId);
    setTab('bench');
    setModal(null);
    audio.success();
    const slot = Object.keys(tuned.board).find((slotId) => tuned.board[slotId].id === partId);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(slot ? `[data-slot="${slot}"]` : '.bench-part[aria-pressed="true"]')?.focus());
  }

  function chooseCredits(): void {
    trade(claimCredits);
    learn('claim');
    setSelectedId(null);
    setModal(null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.next-commission .button')?.focus());
  }

  function advance(): void {
    if (!run.rewardClaimed) { setModal('reward'); return; }
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
    setPractice(null);
    setSave((current) => updateProgress({ ...current, checkpoints: undefined }, newRun(seed, newMode, assisted)));
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
    setPractice(null);
    setHistory([]);
    setFuture([]);
    setSelectedId(null);
    setLivePayout(0);
    setTab(restored.run.phase === 'shop' ? 'shop' : 'bench');
    setModal(restored.run.phase === 'shop' && !restored.run.rewardClaimed ? 'reward' : null);
    setToast('Machine restored.');
  }

  const canEdit = ['ready', 'shop', 'lost'].includes(run.phase);
  const score = run.score + livePayout;
  const progress = Math.min(100, score / definition.target * 100);
  const overshoot = score >= definition.target;
  const reward = commissionReward(run, definition);
  const inventoryFull = run.bench.length + Object.keys(run.board).length >= MAX_OWNED_PARTS;
  const installedParts = Object.keys(run.board).length;
  const fusionDonor = selectedPeg && !selectedPeg.tuned ? run.bench.find((part) => part.id !== selectedPeg.id && part.kind === selectedPeg.kind && !part.tuned) : undefined;
  const nextExpansion = run.mode === 'endless' && definition.capacity < 18 ? 12 + (definition.capacity - 13) * 3 : null;
  const canRestart = canRestartCommission(run);
  const tutorialStep = practice ? 'done' : currentTutorialStep(save.profile, run);
  const displayFullscreen = window.pocketDesktop ? settings.fullscreen : browserFullscreen;
  const gamepad = useGamepadNavigation({
    onMenu: () => setModal('menu'),
    onBack: () => {
      if (modal === 'reward') closeReward();
      else if (modal) setModal(null);
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

  return <div className="game-app" data-testid="game-ready" data-save-ready={saved} data-practice={Boolean(practice)} data-phase={run.phase} data-visible-drops={run.totalDrops} data-tutorial-active={tutorialStep !== 'done'} data-tutorial-step={tutorialStep}>
    <WorkshopScene theme={settings.theme} stopped={settings.reducedMotion || settings.highContrast || paused || Boolean(modal)} />
    <header className="topbar">
      <button className="wordmark" onClick={() => setModal('menu')} aria-label="Pocket Cascade menu">
        <span className="brand-symbol"><Cog size={30} strokeWidth={1.5} /></span>
        <span>POCKET <strong>CASCADE</strong></span>
      </button>
      <div className="run-label"><span className="status-light" />{run.mode === 'daily' ? 'DAILY MACHINE' : run.mode === 'endless' ? 'AFTER HOURS' : 'CLOCKWORK WORKSHOP'}<span className="run-number">NO. {String(run.seed % 1000).padStart(3, '0')}</span></div>
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

    <QuickGuide step={tutorialStep} run={run} definition={definition} selected={Boolean(selectedPeg)} onSkip={() => learn('skip')} onLocate={locateGuide} />
    {practice && <section className="practice-strip" aria-label="Practice session"><span><BookOpen size={16} /><strong>PRACTICE</strong><span>No rewards</span></span><div><button className="text-button" onClick={() => setModal('practice')}><Shuffle size={15} />Change commission</button><button className="button subtle" onClick={leavePractice}><ArrowLeft size={16} />Back to campaign</button></div></section>}

    <main className="workspace">
      <aside className="commission-panel" aria-label="Commission">
        <div className="eyebrow"><span>COMMISSION</span><span>{String(run.stage + 1).padStart(2, '0')} <span className="muted">/ {run.stage > 11 ? '--' : '12'}</span></span></div>
        <h1>{definition.title}</h1>
        <div className={`score-panel ${overshoot ? 'cleared' : ''}`} tabIndex={-1}>
          <div className="label">{run.phase === 'dropping' ? 'POINTS THIS COMMISSION' : overshoot ? 'TARGET CLEARED' : 'COMMISSION POINTS'}{overshoot && <Check size={15} />}</div>
          <Counter value={score} reduced={settings.reducedMotion} className="score-value" />
          <div className="target-line"><span>of <strong>{formatNumber(definition.target)}</strong></span><span>POINTS</span></div>
          <div className="progress-track" role="progressbar" aria-label="Commission progress" aria-valuemin={0} aria-valuemax={definition.target} aria-valuenow={Math.min(score, definition.target)}><span style={{ width: `${progress}%` }} /></div>
          {overshoot && <div className="overdrive-label"><Sparkles size={13} />{(score / definition.target).toFixed(2)}x TARGET</div>}
        </div>
        {!practice && <div className="commission-facts">
          <div><span><Ticket size={14} />Completion reward</span><strong>{definition.reward} credits</strong></div>
          <div><span><Plus size={14} />Excess bonus</span><strong>up to 3 credits</strong></div>
        </div>}
        {run.assisted && <div className="quiet-badge"><ShieldCheck size={13} />RELAXED WORKSHOP</div>}
        {retryHelpLevel(run) > 0 && <div className="quiet-badge"><Hammer size={13} />CHOSEN HELP +{retryHelpLevel(run) * 10}%</div>}
        {nextExpansion !== null && <p className="capacity-milestone" data-testid="capacity-milestone">After Hours {nextExpansion - 11}: {definition.capacity + 1} installed parts</p>}
        {(run.lastDrop || run.phase === 'dropping') && <section className="last-cascade" aria-label="Last cascade">
          {run.phase === 'dropping' ? <div className="event-feed" aria-live="off">{feed.slice(-4).map((event) => <div key={`${event.tick}-${event.tokenId}-${event.type}-${event.slotId ?? event.tray}`} className={`feed-item event-${event.type}`}>{event.kind ? <PartSymbol kind={event.kind} small /> : <Coins size={15} />}<span>{event.kind ? PARTS[event.kind].name : 'Collector'}</span><strong>{event.label}</strong></div>)}</div> : run.lastDrop && <CascadeReceipt result={run.lastDrop} />}
        </section>}
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
          <Board key={practice ? 'practice' : 'campaign'} run={run} maxInstalled={definition.capacity} selectedPegId={selectedId} onSlot={handleSlot} onLane={(lane) => changeRun((current) => setLane(current, lane))}
            onDropComplete={finishDrop} onEvent={handleEvent} onImpact={(impact) => audio.impact(impact)} paused={paused || Boolean(modal)} speed={settings.speed} reducedMotion={settings.reducedMotion} trails={settings.trails} />
          {paused && !modal && <div className="pause-overlay"><Pause size={30} /><strong>Paused</strong><button className="button primary" onClick={() => setPaused(false)}><Play size={17} />Resume</button></div>}
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
        <div className="worktable-header"><h2>{practice ? 'Practice' : run.phase === 'review' ? 'Commission reward' : run.phase === 'won' ? 'Run complete' : 'Worktable'}</h2></div>
        {!practice && <CreditWallet credits={run.brass} reducedMotion={settings.reducedMotion} />}
        {(canEdit || run.phase === 'dropping') && <PartInventory run={run} capacity={definition.capacity} nextCapacity={commissionFor({ ...run, stage: run.stage + 1 }).capacity} selectedId={selectedId} editable={canEdit} onSelect={(id) => { setSelectedId(selectedId === id ? null : id); audio.click(); }} />}
        {practice && run.phase === 'review' ? <div className="result-panel"><h3>Practice complete</h3><p>{formatNumber(run.score)} points from {5 - run.dropsLeft} launches.</p><button className="button primary full" onClick={() => startPractice(run.stage)}><RotateCcw size={16} />Restart practice</button><button className="button subtle full" onClick={leavePractice}><ArrowLeft size={16} />Return to campaign</button></div> : run.phase === 'review' ? <div className="result-panel">
          <h3>Target reached</h3>
          <p>{formatNumber(run.score)} points from {5 - run.dropsLeft} {5 - run.dropsLeft === 1 ? 'launch' : 'launches'}.</p>
          <dl className="reward-ledger"><div><dt>Completion reward</dt><dd>+{reward.base}</dd></div><div><dt>Spare launches</dt><dd>+{reward.spare}</dd></div><div><dt>Excess payout</dt><dd>+{reward.overdrive}</dd></div><div className="ledger-total"><dt>Workshop credits earned</dt><dd>+{reward.total}</dd></div></dl>
          <button className="button primary full" aria-label={run.stage === 11 && run.mode !== 'endless' ? 'Complete the machine' : 'Visit the workshop'} onClick={collect}><Ticket size={17} />{run.stage === 11 && run.mode !== 'endless' ? 'Complete the machine' : `Collect ${reward.total} credits`}<ArrowRight size={18} /></button>
          {run.stage < 11 && <span className="result-note">Includes one part or tuning</span>}
        </div> : run.phase === 'won' ? <div className="result-panel victory">
          <div className="victory-art" aria-hidden="true"><Crown size={48} strokeWidth={1.4} /></div><h3>Workshop complete</h3><p>12 commissions completed</p>
          <dl className="reward-ledger"><div><dt>Total payout</dt><dd>{formatNumber(run.totalScore)}</dd></div><div><dt>Best cascade</dt><dd>{formatNumber(run.bestDrop)}</dd></div><div><dt>Launches</dt><dd>{run.totalDrops}</dd></div></dl>
          <button className="button primary full" onClick={() => { changeRun(enterEndless); setTab('shop'); setModal('reward'); }}>Stay after hours<ArrowRight size={17} /></button>
          <button className="button subtle full" onClick={() => openNew('workshop')}><RotateCcw size={16} />A new machine</button>
        </div> : <>
          {run.phase === 'lost' && <div className="retry-panel"><h3>{formatNumber(Math.max(0, definition.target - run.score))} points short</h3><p>Attempt {run.retries + 1}</p><button className="button primary full" onClick={() => retry()}><RotateCcw size={16} />Retry commission</button>{retryHelpLevel(run) < 3 && <button className={`button subtle full ${run.retries >= 2 ? 'help-suggested' : ''}`} title="Add 10% base value for this commission only, up to 30%." onClick={() => retry(true)}><Hammer size={16} />Retry with +10% help</button>}{!practice && (canRestoreShop(save) ? <button className="button subtle full" onClick={() => setModal('recovery')}><Undo2 size={16} />Restore last shop</button> : <><small>No saved shop available.</small><button className="text-button" onClick={() => openNew('workshop')}><Plus size={15} />New workshop</button></>)}</div>}
          {run.phase === 'shop' && <div className="worktable-tabs" role="tablist" aria-label="Workshop views"><button role="tab" aria-selected={tab === 'shop'} onClick={() => setTab('shop')}><Hammer size={14} />Parts counter</button><button role="tab" aria-selected={tab === 'bench'} onClick={() => setTab('bench')}><Cog size={14} />Workbench{run.bench.length > 0 && <span>{run.bench.length}</span>}</button></div>}
          {run.phase === 'shop' && tab === 'shop' ? <div className="shop-panel">
            <div className="free-reward-section" aria-label="Free commission reward">
              {run.rewardClaimed ? <div className="gift-claimed"><CheckCircle2 size={17} /><span>Gift collected</span></div> : <button className="button subtle full reward-reopen" onClick={() => setModal('reward')}><Gift size={17} />Choose free part</button>}
            </div>
            <div className="paid-offers" aria-label="Paid upgrades">
              <div className="section-heading shop-heading"><span>SPEND WORKSHOP CREDITS</span><button className="text-button" disabled={run.brass < 2 || run.rerolls >= 2} onClick={() => trade(rerollShop)} aria-label="Refresh shop for 2 credits" title="Refresh offers for 2 credits, at most twice"><Shuffle size={14} /><Ticket size={12} />2</button></div>
              <div className="offer-list">{run.offers.map((offer) => <button className="part-offer" key={offer.id} disabled={offer.sold || run.brass < offer.price || inventoryFull} aria-label={`Buy ${PARTS[offer.kind].name} for ${offer.price} credits`} onClick={() => { const id = `part-${run.nextId}`; trade((current) => buyPart(current, offer.id)); learn('purchase'); setSelectedId(id); audio.click(); }}><PartSymbol kind={offer.kind} small /><span><strong>{PARTS[offer.kind].name}</strong><small>{PARTS[offer.kind].family}</small></span><span className="offer-price">{offer.sold ? 'SOLD' : <><Ticket size={12} />{offer.price}<small>credits</small></>}</span></button>)}</div>
              <button className="power-upgrade" disabled={run.power >= POWER_VALUES.length - 1 || run.brass < powerPrice(run.power)} onClick={() => { trade(upgradePower); learn('purchase'); audio.success(); }} aria-label="Upgrade token value"><span className="power-icon"><Coins size={24} /></span><span><strong>Token value</strong><small>{POWER_VALUES[run.power]} <ArrowRight size={12} /> {POWER_VALUES[Math.min(run.power + 1, 8)]} base value</small><small>All tokens. No part to place.</small></span><span>{run.power >= 8 ? 'MAX' : <><Ticket size={12} />{powerPrice(run.power)}<small>credits</small></>}</span></button>
              <button className="button subtle full" disabled={!tuningTargets(run).length} onClick={() => { setTab('bench'); setSelectedId(tuningTargets(run)[0]?.id ?? null); }}><Hammer size={16} />Tune a part</button>
            </div>
            {selectedPeg && <div className="selected-inline"><PartSymbol kind={selectedPeg.kind} tuned={selectedPeg.tuned} small /><span>{partName(selectedPeg)} ready to place</span><IconButton icon={X} label="Deselect part" onClick={() => setSelectedId(null)} /></div>}
          </div> : <div className="bench-panel">
            {selectedPeg ? <div className="part-inspector"><div className="inspector-heading"><PartSymbol kind={selectedPeg.kind} direction={selectedPeg.direction} tuned={selectedPeg.tuned} /><div><span className="eyebrow">{PARTS[selectedPeg.kind].family}</span><h3>{partName(selectedPeg)}</h3></div><IconButton icon={X} label="Deselect part" onClick={() => setSelectedId(null)} /></div><p>{PARTS[selectedPeg.kind].description}</p><small>{PARTS[selectedPeg.kind].detail}</small><div className="inspector-actions">{(selectedPeg.kind === 'kicker' || selectedPeg.kind === 'splitter') && <button className="button subtle" onClick={() => editBoard((current) => rotatePeg(current, selectedPeg.id))}><RotateCw size={15} />{selectedPeg.direction === 1 ? 'Right' : 'Left'}</button>}{selectedSlot ? <button className="button subtle" onClick={() => { editBoard((current) => removePeg(current, selectedSlot)); setSelectedId(null); }}><ArrowLeft size={15} />To worktable</button> : <button className="button subtle" aria-label="Salvage part for 1 credit" disabled={!canSalvagePeg(run, selectedPeg.id)} title={run.phase !== 'shop' ? 'Salvage is available at the shop.' : 'Recycle this spare for 1 credit. Keep at least one charge generator.'} onClick={() => { trade((current) => salvagePeg(current, selectedPeg.id)); setSelectedId(null); audio.click(); }}><Recycle size={15} />1 credit</button>}</div>
              <div className="part-tuning"><strong><Hammer size={14} />{selectedPeg.tuned ? 'Tuned: ' : ''}{TUNINGS[selectedPeg.kind].name}</strong><small>{TUNINGS[selectedPeg.kind].description}</small>{!selectedPeg.tuned && <div className="tuning-actions">
                {run.phase === 'shop' && <button className="button subtle" disabled={run.brass < tuningPrice(selectedPeg.kind)} aria-label={`Tune ${PARTS[selectedPeg.kind].name} for ${tuningPrice(selectedPeg.kind)} credits`} onClick={() => { trade((current) => tunePeg(current, selectedPeg.id)); learn('purchase'); audio.success(); }}><Hammer size={14} />Tune<Ticket size={12} />{tuningPrice(selectedPeg.kind)}</button>}
                <button className="button subtle" disabled={!canEdit || !fusionDonor} aria-label={`Fuse spare ${PARTS[selectedPeg.kind].name}`} title={`Consume one untuned spare ${PARTS[selectedPeg.kind].name} to tune this copy`} onClick={() => { if (fusionDonor) { trade((current) => fusePeg(current, selectedPeg.id, fusionDonor.id)); audio.success(); } }}><Combine size={15} />Fuse 1 spare {PARTS[selectedPeg.kind].name}</button>
              </div>}</div>
            </div> : run.bestDrop > 0 && <div className="machine-record"><span>Best cascade</span><strong>{formatNumber(run.bestDrop)}</strong></div>}
            <div className="edit-toolbar"><span className="muted">{selectedPeg ? 'Choose a socket' : 'WORKBENCH'}</span><IconButton icon={Undo2} label="Undo placement" disabled={!canEdit || history.length === 0} onClick={undo} /><IconButton icon={Redo2} label="Redo placement" disabled={!canEdit || future.length === 0} onClick={redo} /></div>
          </div>}
          {run.phase === 'shop' && <div className="next-commission"><button className="button primary full" disabled={!run.rewardClaimed} onClick={advance}>Next commission<ArrowRight size={17} /></button><span>{run.rewardClaimed ? `${COMMISSION_LABEL(run.stage + 1)} / ${formatNumber(commissionFor({ ...run, stage: run.stage + 1 }).target)} points` : 'A complimentary part is still waiting.'}</span></div>}
        </>}
      </aside>
    </main>

    <footer className="game-footer"><span><ShieldCheck size={13} />{saveError ? 'SAVE NEEDS ATTENTION' : saved ? 'MACHINE SAVED' : 'SAVING'}{steam && ' / STEAM CONNECTED'}</span><span className="seed-label">SEED {run.seed}{run.mode === 'daily' ? ` / ${run.date} UTC` : ''}</span><span><strong data-testid="total-drops">{run.totalDrops}</strong> LAUNCHES</span><span aria-label="Controller status" title={gamepad.name ?? gamepad.label}><Gamepad2 size={13} />{gamepad.label}</span><button className="text-button" onClick={() => setModal('credits')}>About <span>v1.0</span></button></footer>
    {saveError && <div className="save-warning" role="alert">{saveError}<button className="text-button" onClick={exportSave}><Download size={15} />Export backup</button></div>}
    {toast && <div className="toast" role="status"><Sparkles size={17} /><span>{toast}</span><IconButton icon={X} label="Dismiss notification" onClick={() => setToast(null)} /></div>}

    {modal === 'reward' && run.phase === 'shop' && !run.rewardClaimed && <RewardDialog run={run} onChoose={chooseGift} onTune={chooseTuning} onCredits={chooseCredits} onClose={closeReward} />}

    {modal === 'menu' && <Dialog title="Workshop menu" onClose={() => setModal(null)}><div className="menu-brand"><Cog size={32} strokeWidth={1.5} /><h3>POCKET CASCADE</h3></div><button className="button primary full" onClick={() => { setModal(null); setPaused(false); }}><Play size={17} />Back to the machine</button><div className="menu-actions"><button disabled={!canRestart} onClick={restartLevel}><RotateCcw size={18} />Restart level<ChevronRight size={16} /></button>{!practice && <button disabled={!canRestoreShop(save)} onClick={() => setModal('recovery')}><Undo2 size={18} />Restore last shop<ChevronRight size={16} /></button>}<button disabled={!save.checkpoints?.entries.length || (!practice && run.phase === 'dropping')} onClick={() => setModal('practice')}><BookOpen size={18} />Practice commissions<ChevronRight size={16} /></button>{practice && <button onClick={leavePractice}><ArrowLeft size={18} />Back to campaign</button>}<button onClick={() => openNew('workshop')}><Plus size={18} />New workshop<ChevronRight size={16} /></button><button onClick={() => openNew('daily')}><Award size={18} />Daily machine<span>{new Date().toISOString().slice(5, 10)}</span></button><button onClick={() => setModal('settings')}><Settings2 size={18} />Settings<ChevronRight size={16} /></button><button onClick={() => setModal('rules')}><BookOpen size={18} />Machine manual<ChevronRight size={16} /></button>{window.pocketDesktop && <button onClick={() => { void persistGame(save).then((error) => { if (error) setToast(error); else window.pocketDesktop?.quit(); }); }}><X size={18} />Save and quit</button>}</div><div className="menu-record"><span>Best cascade</span><strong>{formatNumber(save.profile.bestDrop)}</strong></div></Dialog>}

    {modal === 'recovery' && <Dialog title="Restore last shop?" onClose={() => setModal(null)}><p className="dialog-intro">Return to the saved shop after {COMMISSION_LABEL(save.checkpoints?.shop?.stage ?? 0)}? Later purchases, tuning, fusion, salvage, and launches will be discarded. Credits, parts, stock, and reward choices return to that checkpoint.</p><div className="button-row confirmation-actions"><button className="button subtle" onClick={() => setModal(null)}>Keep current machine</button><button className="button primary" disabled={!canRestoreShop(save)} onClick={recoverShop}><Undo2 size={16} />Restore shop</button></div></Dialog>}

    {modal === 'practice' && <Dialog title="Practice commissions" onClose={() => setModal(null)}><div className="practice-list">{save.checkpoints?.entries.map((entry) => <button key={entry.stage} aria-label={`Practice commission ${entry.stage + 1}`} onClick={() => startPractice(entry.stage)}><span className="practice-number">{String(entry.stage + 1).padStart(2, '0')}</span><span><strong>{COMMISSION_LABEL(entry.stage)}</strong><small>{formatNumber(commission(entry).target)} points / {Object.keys(entry.board).length + entry.bench.length} owned parts</small></span><Play size={18} /></button>)}</div></Dialog>}

    {modal === 'settings' && <Dialog title="Settings" onClose={() => setModal(null)}>
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
        <button className="button subtle full" disabled={Boolean(practice)} onClick={replayGuide}><CircleHelp size={16} />Replay quick guide</button>
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

    {modal === 'collection' && <Dialog title="The parts catalogue" wide onClose={() => setModal(null)}><p className="dialog-intro">{save.profile.discovered.length} of {PART_KINDS.length} parts discovered</p><div className="catalogue-grid">{PART_KINDS.map((kind) => { const part = PARTS[kind]; const unlocked = save.profile.discovered.includes(kind); return <article className={`catalogue-part ${unlocked ? '' : 'undiscovered'}`} key={kind}><div><PartSymbol kind={kind} /><span className="eyebrow">{part.family}</span>{unlocked && <Check size={15} />}</div><h3>{part.name}</h3><p>{part.description}</p><small>{part.detail}</small><small><strong>{TUNINGS[kind].name}:</strong> {TUNINGS[kind].description}</small><span className="catalogue-unlock">{unlocked ? 'DISCOVERED' : `COMMISSION ${part.unlock + 1}`}</span></article>; })}</div></Dialog>}

    {modal === 'achievements' && <Dialog title="Achievements" wide onClose={() => setModal(null)}><div className="achievement-overview"><Trophy size={32} /><div><strong>{save.profile.achievements.length} / {ACHIEVEMENTS.length}</strong><span>unlocked</span></div><div><strong>{formatNumber(save.profile.lifetimeScore)}</strong><span>lifetime points</span></div></div><div className="achievement-list">{ACHIEVEMENTS.map((achievement) => { const unlocked = save.profile.achievements.includes(achievement.id); return <div key={achievement.id} className={`achievement ${unlocked ? 'unlocked' : ''}`}><span className="achievement-icon">{unlocked ? <Award size={22} /> : <Trophy size={20} />}</span><div><strong>{achievement.name}</strong><span>{achievement.description}</span></div>{unlocked && <Check size={16} />}</div>; })}</div></Dialog>}

    {modal === 'new' && <Dialog title={newMode === 'daily' ? 'Daily machine' : 'New workshop'} onClose={() => setModal('menu')}><p className="dialog-intro">Replace this machine? Your collection and achievements stay.</p>{newMode === 'daily' ? <div className="daily-card"><Award size={34} /><strong>{new Date().toISOString().slice(0, 10)}</strong><span>Shared daily seed. No leaderboard.</span>{save.profile.dailyCompleted.includes(new Date().toISOString().slice(0, 10)) && <span className="success-text"><Check size={15} />Already completed today</span>}</div> : <><label className="text-field">Machine seed <span className="muted">optional</span><input value={newSeed} onChange={(event) => setNewSeed(event.target.value)} maxLength={64} placeholder="Word or number" /></label><Toggle label="Relaxed targets (-35%)" value={assisted} onChange={setAssisted} /></>}<div className="button-row confirmation-actions"><button className="button subtle" onClick={() => setModal('menu')}>Keep this machine</button><button className="button primary" onClick={startNew}>Start fresh<ArrowRight size={16} /></button></div></Dialog>}

    {modal === 'rules' && <Dialog title="The machine manual" wide onClose={() => setModal(null)}><div className="manual-layout"><section><span className="manual-number">01</span><h3>Generate, then amplify</h3><p>Mint, Relay, and Kicker generate charge. The three marks beside each token show its charge. Doubler spends one; Crown spends two. Place generators between amplifiers. Echo repeats an effect once, not another Echo.</p><p>Move, swap, rotate, and return parts for free between launches. Each token hits each installed part once. Fork shares charge and reserves across up to four tokens.</p></section><section><span className="manual-number">02</span><h3>Bank and reconnect</h3><p>Vault turns spare charge into extra banked points. Dividend turns a token's unused deposit reserve into value; earned banked points remain. Junction rewards two branches reaching the same socket.</p><p>Five launches per commission. Collectors pay x1, x2, x1. All deposits and collector points count; excess is success. Identical launch conditions repeat throughout the run.</p></section><section><span className="manual-number">03</span><h3>Parts and tuning</h3><p>Each commission offers one new part, a tuning for an owned offered kind, or two credits. A tuning changes a part's behavior once. Fuse a matching untuned spare in the inspector, or pay credits at the shop. Fusion consumes the spare; the target keeps its socket and direction.</p><p>Credits also buy stock and token power. Salvage is shop-only and retains your last charge generator. After Hours adds installation space on entry and every three commissions, up to 18.</p></section><section><span className="manual-number">04</span><h3>Retry, recover, practice</h3><p>Retry keeps the current difficulty. Extra help is your choice: +10% base value, up to +30% for this commission. Help resets on advance; permanent token power stays. Restart resets an attempt without adding help.</p><p>Restore last shop returns its saved parts, credits, stock, and reward choices, discarding later decisions. It does not guarantee a winning build. Practice uses recorded entry builds without campaign rewards or progress. Older saves only gain entries as you continue. Interrupted launches are refunded; playback speed never changes scoring.</p></section></div></Dialog>}

    {modal === 'credits' && <Dialog title="Pocket Cascade" onClose={() => setModal(null)}><div className="credits-list"><div><span>Game, artwork & sound</span><strong>Pocket Cascade</strong></div><div><span>Physics</span><strong>Matter.js</strong></div><div><span>Interface icons</span><strong>Lucide</strong></div><div><span>Type</span><strong>Barlow Condensed / DM Sans</strong></div><div><span>Version</span><strong>1.0.0</strong></div></div><p className="fine-print">Original procedural artwork and synthesized music. Offline play; no analytics or accounts.</p></Dialog>}
  </div>;
}

function COMMISSION_LABEL(stage: number): string {
  return COMMISSIONS[stage]?.title ?? `After Hours ${stage - 11}`;
}