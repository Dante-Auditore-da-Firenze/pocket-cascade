import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { PARTS } from '../game/content';
import { placePeg, type RunState } from '../game/engine';
import {
  BOARD_HEIGHT, BOARD_WIDTH, FIXED_STEP, SLOTS, lanePosition,
  type CascadeEvent, type DropResult, type PhysicalImpact,
} from '../game/model';
import { DropSimulation } from '../game/simulation';
import { CabinetRenderer, type CabinetView } from '../render/cabinet';
import { PlaybackClock } from '../render/clock';
import { readCabinetPalette } from '../render/palette';
import '../render/board.css';

export interface BoardProps {
  run: RunState;
  selectedPegId: string | null;
  onSlot: (slotId: string) => void;
  onLane: (lane: number) => void;
  onDropComplete: (result: DropResult) => void;
  onEvent: (event: CascadeEvent) => void;
  onImpact?: (impact: PhysicalImpact) => void;
  paused: boolean;
  speed: 1 | 2 | 4;
  reducedMotion: boolean;
  trails: boolean;
}

interface Playback {
  simulation: DropSimulation;
  completed: boolean;
  disposed: boolean;
}

interface Runtime {
  renderer: CabinetRenderer;
  clock: PlaybackClock;
  playback: Playback | null;
  frameId: number;
  interpolation: number;
  pixelRatio: number;
  paletteDirty: boolean;
  disposed: boolean;
}

function disposePlayback(playback: Playback | null): void {
  if (!playback || playback.disposed) return;
  playback.disposed = true;
  playback.simulation.dispose();
}

function atPosition(centerX: number, centerY: number): CSSProperties {
  return { left: `${centerX / BOARD_WIDTH * 100}%`, top: `${centerY / BOARD_HEIGHT * 100}%` };
}

export function Board(props: BoardProps) {
  const { run, selectedPegId, paused, reducedMotion, trails } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const editable = !run.activeDrop && (run.phase === 'ready' || run.phase === 'shop' || run.phase === 'lost');
  const destinations = new Set<string>();
  if (editable && selectedPegId) {
    for (const slot of SLOTS) {
      if (placePeg(run, selectedPegId, slot.id) !== run) destinations.add(slot.id);
    }
  }
  const view: CabinetView = {
    board: run.activeDrop?.board ?? run.board,
    lane: run.activeDrop?.lane ?? run.lane,
    selectedPegId,
    destinations,
    editable,
    dropping: Boolean(run.activeDrop),
    paused,
    reducedMotion,
    trails,
  };
  const latest = useRef({ props, view });

  useLayoutEffect(() => {
    latest.current = { props, view };
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.clock.setMode(performance.now(), props.speed, props.paused || document.hidden);
    runtime.renderer.setReducedMotion(props.reducedMotion);
    if (!props.run.activeDrop) runtime.renderer.showResult(props.run.lastDrop);
  });

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ownerDocument = canvas.ownerDocument;
    const ownerWindow = ownerDocument.defaultView;
    if (!ownerWindow) return;
    const renderer = new CabinetRenderer(canvas, readCabinetPalette(container));
    const clock = new PlaybackClock();
    const runtime: Runtime = {
      renderer,
      clock,
      playback: null,
      frameId: 0,
      interpolation: 1,
      pixelRatio: 0,
      paletteDirty: false,
      disposed: false,
    };
    runtimeRef.current = runtime;
    const synchronizeMode = (): void => {
      const current = latest.current.props;
      clock.setMode(ownerWindow.performance.now(), current.speed, current.paused || ownerDocument.hidden);
    };
    const resize = (): void => {
      if (runtime.disposed) return;
      const bounds = container.getBoundingClientRect();
      runtime.pixelRatio = Math.min(2, ownerWindow.devicePixelRatio || 1);
      renderer.resize(bounds.width, bounds.height, runtime.pixelRatio);
    };
    const refreshPalette = (): void => {
      if (!runtime.disposed) runtime.paletteDirty = true;
    };

    const animate = (timestamp: number): void => {
      if (runtime.disposed) return;
      try {
        if (runtime.paletteDirty) {
          renderer.setPalette(readCabinetPalette(container));
          runtime.paletteDirty = false;
        }
        if (runtime.pixelRatio !== Math.min(2, ownerWindow.devicePixelRatio || 1)) resize();
        const current = latest.current.props;
        renderer.setReducedMotion(current.reducedMotion);
        clock.setMode(timestamp, current.speed, current.paused || ownerDocument.hidden);
        const frame = clock.advance(timestamp);
        for (let step = 0; step < frame.steps; step += 1) {
          renderer.advance(FIXED_STEP / current.speed);
          const playback = runtime.playback;
          if (!playback || playback.completed || playback.disposed) continue;
          const events = playback.simulation.step();
          const impacts = playback.simulation.drainImpacts();
          renderer.sample(playback.simulation.tokenViews);
          for (const event of events) renderer.event(event);
          const result = playback.simulation.done ? playback.simulation.finish() : null;
          if (result) {
            playback.completed = true;
            renderer.finishDrop(result);
            disposePlayback(playback);
          }
          for (const event of events) {
            if (runtime.disposed || runtime.playback !== playback) break;
            latest.current.props.onEvent(event);
          }
          for (const impact of impacts) {
            if (runtime.disposed || runtime.playback !== playback) break;
            latest.current.props.onImpact?.(impact);
          }
          if (result && !runtime.disposed && runtime.playback === playback) {
            latest.current.props.onDropComplete(result);
          }
          if (runtime.disposed) return;
          if (runtime.playback !== playback) break;
          if (latest.current.props.paused || ownerDocument.hidden) {
            clock.retainSteps(frame.steps - step - 1);
            break;
          }
        }
        if (!latest.current.props.paused && !ownerDocument.hidden) runtime.interpolation = frame.interpolation;
        renderer.draw(latest.current.view, runtime.interpolation);
      } finally {
        if (!runtime.disposed) runtime.frameId = ownerWindow.requestAnimationFrame(animate);
      }
    };

    synchronizeMode();
    renderer.setReducedMotion(latest.current.props.reducedMotion);
    if (!latest.current.props.run.activeDrop) renderer.showResult(latest.current.props.run.lastDrop);
    resize();
    renderer.draw(latest.current.view, 1);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(container);
    const themeObserver = typeof MutationObserver === 'undefined' ? null : new MutationObserver(refreshPalette);
    for (let ancestor: HTMLElement | null = container; ancestor; ancestor = ancestor.parentElement) {
      themeObserver?.observe(ancestor, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    }
    if (ownerDocument.head) {
      themeObserver?.observe(ownerDocument.head, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['href', 'media', 'disabled'],
      });
    }
    const scheme = ownerWindow.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', refreshPalette);
    ownerWindow.addEventListener('resize', resize);
    ownerDocument.addEventListener('visibilitychange', synchronizeMode);
    ownerDocument.fonts?.addEventListener('loadingdone', refreshPalette);
    void ownerDocument.fonts?.ready.then(refreshPalette);
    runtime.frameId = ownerWindow.requestAnimationFrame(animate);

    return () => {
      runtime.disposed = true;
      ownerWindow.cancelAnimationFrame(runtime.frameId);
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      scheme.removeEventListener('change', refreshPalette);
      ownerWindow.removeEventListener('resize', resize);
      ownerDocument.removeEventListener('visibilitychange', synchronizeMode);
      ownerDocument.fonts?.removeEventListener('loadingdone', refreshPalette);
      disposePlayback(runtime.playback);
      renderer.dispose();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, []);

  const activeDrop = run.activeDrop;
  useLayoutEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    if (!activeDrop) {
      runtime.renderer.showResult(latest.current.props.run.lastDrop);
      return;
    }
    const playback: Playback = {
      simulation: new DropSimulation(activeDrop),
      completed: false,
      disposed: false,
    };
    runtime.playback = playback;
    runtime.interpolation = 1;
    runtime.clock.reset(performance.now());
    runtime.renderer.beginDrop(playback.simulation.tokenViews);
    return () => {
      disposePlayback(playback);
      if (runtime.playback === playback) runtime.playback = null;
    };
  }, [activeDrop]);

  return (
    <div
      ref={containerRef}
      className="cabinet-board"
      data-phase={run.phase}
      data-reduced-motion={reducedMotion}
      data-paused={paused}
    >
      <canvas
        ref={canvasRef}
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        role="img"
        aria-label="Cascade machine"
        data-testid="machine-canvas"
      >
        Cascade machine
      </canvas>
      <div className="lane-grid" role="group" aria-label="Aim lanes">
        {Array.from({ length: 9 }, (_, lane) => (
          <button
            key={lane}
            type="button"
            className="lane-button"
            style={atPosition(lanePosition(lane), 36)}
            data-lane={lane}
            aria-label={`Aim lane ${lane + 1}`}
            aria-pressed={view.lane === lane}
            title={`Aim lane ${lane + 1}`}
            disabled={!editable}
            onClick={() => props.onLane(lane)}
          />
        ))}
      </div>
      <div className="socket-grid" role="group" aria-label="Machine sockets">
        {SLOTS.map((slot) => {
          const peg = view.board[slot.id];
          const name = `${peg ? PARTS[peg.kind].name : 'Empty'} socket ${slot.id}`;
          return (
            <button
              key={slot.id}
              type="button"
              className="socket"
              style={atPosition(slot.x, slot.y)}
              data-slot={slot.id}
              data-destination={destinations.has(slot.id)}
              aria-label={name}
              aria-pressed={Boolean(peg && peg.id === selectedPegId)}
              title={name}
              disabled={!editable}
              onClick={() => props.onSlot(slot.id)}
            />
          );
        })}
      </div>
    </div>
  );
}