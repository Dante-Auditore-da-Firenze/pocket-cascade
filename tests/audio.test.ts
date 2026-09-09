import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_DEFAULTS, createOutputStage, frequency, GameAudio, limiterCurve, PENTATONIC, scheduleEventSound, scheduleImpactSound, scheduleTone } from '../src/audio/synth';
import type { CascadeEvent, PegKind, PhysicalImpact } from '../src/game/model';
import { freshSave } from '../src/game/save';

const managedAudio: GameAudio[] = [];

afterEach(() => {
  for (const audio of managedAudio.splice(0)) audio.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('synthesis safety', () => {
  it('keeps the output curve finite, bounded, monotonic, and silent at zero', () => {
    const curve = limiterCurve();
    expect(curve[2048]).toBe(0);
    expect(Math.max(...curve)).toBeLessThan(0.86);
    expect(Math.min(...curve)).toBeGreaterThan(-0.86);
    expect([...curve].every(Number.isFinite)).toBe(true);
    expect([...curve].every((value, index) => index === 0 || value >= curve[index - 1])).toBe(true);
  });

  it('keeps cascade pitches in a useful musical range', () => {
    expect(frequency(12)).toBe(440);
    expect(PENTATONIC.map((note) => frequency(note)).every((pitch) => pitch >= 220 && pitch <= 880)).toBe(true);
  });

  it('keeps scheduling music while a menu is open and honors mute', async () => {
    vi.useFakeTimers();
    const gains: { gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn> }[] = [];
    const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() });
    const createOscillator = vi.fn(() => ({ frequency: param(), connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), type: 'sine', onended: null }));
    class TestAudioContext {
      currentTime = 1;
      state = 'running';
      destination = {};
      createGain() { const node = { gain: param(), connect: vi.fn(), disconnect: vi.fn() }; gains.push(node); return node; }
      createWaveShaper() { return { connect: vi.fn(), curve: null, oversample: 'none' }; }
      createOscillator = createOscillator;
      close = vi.fn(async () => undefined);
    }
    vi.stubGlobal('AudioContext', TestAudioContext);
    vi.stubGlobal('document', { hidden: false });
    const audio = new GameAudio();
    const settings = freshSave(42).settings;
    audio.configure(settings);
    await audio.unlock();
    audio.setPaused(true);
    expect(gains[3].gain.setTargetAtTime).toHaveBeenLastCalledWith(settings.musicVolume * 0.8, 1, 0.15);
    vi.advanceTimersByTime(960);
    expect(createOscillator).toHaveBeenCalledTimes(3);
    audio.configure({ ...settings, muted: true });
    vi.advanceTimersByTime(960);
    expect(createOscillator).toHaveBeenCalledTimes(3);
    audio.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});

function recordingContext() {
  const epoch = Date.now();
  const parameter = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() });
  const source = (noise: boolean) => ({ noise, type: 'sine', frequency: parameter(), buffer: null as AudioBuffer | null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null });
  const gain = () => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() });
  const filter = () => ({ type: 'lowpass', frequency: parameter(), Q: parameter(), connect: vi.fn(), disconnect: vi.fn() });
  const sources: ReturnType<typeof source>[] = [];
  const gains: ReturnType<typeof gain>[] = [];
  const filters: ReturnType<typeof filter>[] = [];
  const buffers: Float32Array[][] = [];
  const context = {
    get currentTime() { return (Date.now() - epoch) / 1000; },
    sampleRate: 48000,
    state: 'running',
    destination: {},
    createOscillator() { const node = source(false); sources.push(node); return node; },
    createBufferSource() { const node = source(true); sources.push(node); return node; },
    createGain() { const node = gain(); gains.push(node); return node; },
    createBiquadFilter() { const node = filter(); filters.push(node); return node; },
    createWaveShaper() { return { connect: vi.fn(), disconnect: vi.fn(), curve: null, oversample: 'none' }; },
    createBuffer(channels: number, length: number, sampleRate: number) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      buffers.push(data);
      return { sampleRate, getChannelData: (channel: number) => data[channel] };
    },
    close: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
  };
  return { context: context as unknown as AudioContext, sources, gains, filters, buffers };
}

async function unlockedAudio() {
  vi.useFakeTimers();
  const recorder = recordingContext();
  vi.stubGlobal('AudioContext', function TestFeedbackContext() { return recorder.context; });
  vi.stubGlobal('document', { hidden: true });
  const audio = new GameAudio();
  managedAudio.push(audio);
  audio.configure(freshSave(42).settings);
  await audio.unlock();
  return { audio, ...recorder };
}

const hit: CascadeEvent = { tick: 1, tokenId: 1, type: 'hit', kind: 'mint', slotId: '0-3', x: 250, y: 122, amount: 14, label: '+14' };
const contact: PhysicalImpact = { tick: 1, tokenId: 1, surface: 'peg', x: 250, y: 122, strength: 0.5, scored: false };
const feedbackKinds: PegKind[] = ['mint', 'doubler', 'splitter', 'kicker', 'relay', 'vault', 'echo', 'crown'];

describe('production feedback scheduling', () => {
  it('uses the saved default mix and safely bounds the master stage', () => {
    const recorder = recordingContext();
    const settings = freshSave(42).settings;
    expect(AUDIO_DEFAULTS.volume).toBe(settings.volume);
    expect(AUDIO_DEFAULTS.musicVolume).toBe(settings.musicVolume);
    expect(createOutputStage(recorder.context, -2).output.gain.value).toBe(0);
    expect(createOutputStage(recorder.context, 5).output.gain.value).toBe(1);
    expect(createOutputStage(recorder.context, NaN).output.gain.value).toBe(settings.volume);
  });

  it('gives every part and the collector a distinct resonant and mechanical signature', () => {
    const events: CascadeEvent[] = [...feedbackKinds.map((kind) => ({ ...hit, kind })), { ...hit, type: 'payout', kind: undefined }];
    const signatures = events.map((event) => {
      const recorder = recordingContext();
      const scheduled = scheduleEventSound(recorder.context, recorder.context.destination, event, { start: 1 });
      expect(recorder.sources).toHaveLength(scheduled.voices);
      expect(recorder.sources.filter((source) => source.noise)).toHaveLength(1);
      expect(recorder.buffers[0][0].every((sample) => Number.isFinite(sample) && Math.abs(sample) <= 1)).toBe(true);
      expect(recorder.filters[0].frequency.setValueAtTime.mock.calls[0][0]).toBeLessThanOrEqual(AUDIO_DEFAULTS.maximumFrequency);
      const signature = JSON.stringify(recorder.sources.map((source) => ({
        waveform: source.type,
        noise: source.noise,
        frequency: source.frequency.setValueAtTime.mock.calls,
        sweep: source.frequency.exponentialRampToValueAtTime.mock.calls,
        start: source.start.mock.calls,
        stop: source.stop.mock.calls,
      })));
      for (const source of recorder.sources) {
        expect(source.stop.mock.calls[0][0]).toBeLessThanOrEqual(scheduled.endsAt);
        source.onended?.();
        expect(source.disconnect).toHaveBeenCalledOnce();
      }
      expect(recorder.filters[0].disconnect).toHaveBeenCalledOnce();
      expect(recorder.gains.every((gain) => gain.disconnect.mock.calls.length === 1)).toBe(true);
      return signature;
    });
    expect(new Set(signatures).size).toBe(9);
  });

  it('clamps nonfinite inputs, extreme note climbs, gains, and source lifetimes', () => {
    const recorder = recordingContext();
    const scheduled = scheduleEventSound(recorder.context, recorder.context.destination, { ...hit, kind: 'crown', amount: 1e12 }, { start: NaN, note: 1e9, count: 1e9 });
    expect(Number.isFinite(scheduled.start)).toBe(true);
    expect(scheduled.endsAt - scheduled.start).toBeLessThan(0.5);
    for (const source of recorder.sources.filter((source) => !source.noise)) {
      const pitch = source.frequency.setValueAtTime.mock.calls[0][0];
      expect(pitch).toBeGreaterThanOrEqual(40);
      expect(pitch).toBeLessThanOrEqual(AUDIO_DEFAULTS.maximumFrequency);
      expect(['sine', 'triangle']).toContain(source.type);
    }
    for (const gain of recorder.gains) {
      for (const [value, time] of gain.gain.linearRampToValueAtTime.mock.calls) {
        expect(Number.isFinite(value)).toBe(true);
        expect(Number.isFinite(time)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0.9);
      }
    }
  });

  it('keeps low-speed impacts audible, reuses bounded noise buffers, and skips scored impacts', () => {
    const recorder = recordingContext();
    expect(scheduleImpactSound(recorder.context, recorder.context.destination, { ...contact, scored: true })).toBeNull();
    expect(recorder.sources).toHaveLength(0);
    const amplitudes = [0, -10, NaN, AUDIO_DEFAULTS.minimumImpactStrength].map((strength) => {
      const firstGain = recorder.gains.length;
      expect(scheduleImpactSound(recorder.context, recorder.context.destination, { ...contact, strength }, { start: 1 })?.voices).toBe(2);
      return recorder.gains[firstGain].gain.linearRampToValueAtTime.mock.calls[0][0];
    });
    expect(new Set(amplitudes).size).toBe(1);
    expect(amplitudes[0]).toBeGreaterThan(0.15);
    expect(recorder.buffers).toHaveLength(1);
    expect(recorder.buffers[0][0].length).toBeLessThanOrEqual(recorder.context.sampleRate * 0.03);
  });

  it('keeps an explicitly zero-amplitude tone silent throughout its envelope', () => {
    const recorder = recordingContext();
    scheduleTone(recorder.context, recorder.context.destination, 220, 1, 0.2, 0);
    expect(recorder.gains[0].gain.exponentialRampToValueAtTime).not.toHaveBeenCalled();
    expect(recorder.gains[0].gain.linearRampToValueAtTime.mock.calls.every(([value]) => value === 0)).toBe(true);
  });
});

describe('live feedback budget', () => {
  it('sounds rapid hits from different tokens and does not add a second note for their physical contact', async () => {
    const { audio, sources } = await unlockedAudio();
    audio.event(hit);
    audio.impact({ ...contact, scored: true });
    vi.advanceTimersByTime(AUDIO_DEFAULTS.feedbackIntervalMs);
    expect(sources).toHaveLength(3);
    audio.event({ ...hit, tokenId: 2 });
    vi.advanceTimersByTime(AUDIO_DEFAULTS.feedbackIntervalMs);
    expect(sources).toHaveLength(6);
    audio.impact({ ...contact, slotId: hit.slotId, kind: 'mint', tick: 3 });
    vi.advanceTimersByTime(AUDIO_DEFAULTS.feedbackIntervalMs);
    expect(sources).toHaveLength(8);
  });

  it('coalesces paired split and bank score events without duplicating their main note', async () => {
    const { audio, sources, filters } = await unlockedAudio();
    audio.event({ ...hit, type: 'split', kind: 'splitter', tokenId: 2 });
    audio.event({ ...hit, kind: 'splitter' });
    audio.impact({ ...contact, kind: 'splitter', scored: true });
    audio.event({ ...hit, type: 'bank', kind: 'vault' });
    audio.event({ ...hit, kind: 'vault' });
    audio.impact({ ...contact, kind: 'vault', scored: true });
    vi.advanceTimersByTime(AUDIO_DEFAULTS.feedbackIntervalMs);
    expect(filters).toHaveLength(2);
    expect(sources).toHaveLength(6);
    expect(sources.filter((source) => source.noise)).toHaveLength(2);
  });

  it('aggregates a burst into stronger bounded voices without mutating earned values', async () => {
    const { audio, gains, sources, filters } = await unlockedAudio();
    const earned = Object.freeze({ ...hit, amount: 1e12 });
    const physical = Object.freeze({ ...contact });
    const normal = recordingContext();
    scheduleEventSound(normal.context, normal.context.destination, earned);
    const normalGain = normal.gains[0].gain.linearRampToValueAtTime.mock.calls[0][0];
    for (let index = 0; index < 512; index += 1) {
      audio.event(earned);
      audio.impact(physical);
    }
    vi.advanceTimersByTime(AUDIO_DEFAULTS.feedbackIntervalMs);
    expect(filters).toHaveLength(2);
    expect(sources).toHaveLength(5);
    expect(gains[4].gain.linearRampToValueAtTime.mock.calls[0][0]).toBeGreaterThan(normalGain * 1.2);
    expect(earned).toEqual({ ...hit, amount: 1e12 });
    expect(physical).toEqual(contact);
  });

  it('caps active sources and starts per second, drains deferred sounds, and does not repeat idle contacts', async () => {
    const { audio, sources, filters } = await unlockedAudio();
    for (let frame = 0; frame < 144; frame += 1) {
      for (let tokenId = 1; tokenId <= 4; tokenId += 1) {
        for (const kind of feedbackKinds) audio.event({ ...hit, tokenId, kind, tick: frame });
        audio.event({ ...hit, tokenId, type: 'payout', kind: undefined, tick: frame });
        audio.impact({ ...contact, tokenId, tick: frame });
        audio.impact({ ...contact, tokenId, surface: 'wall', tick: frame });
      }
      vi.advanceTimersByTime(AUDIO_DEFAULTS.feedbackIntervalMs);
    }
    vi.advanceTimersByTime(2200);
    const changes = sources.flatMap((source) => [
      { time: Number(source.start.mock.calls[0][0]), count: 1 },
      { time: Number(source.stop.mock.calls[0][0]), count: -1 },
    ]).sort((first, second) => first.time - second.time || first.count - second.count);
    let active = 0;
    let maximum = 0;
    for (const change of changes) { active += change.count; maximum = Math.max(maximum, active); }
    expect(maximum).toBeLessThanOrEqual(AUDIO_DEFAULTS.maximumFeedbackVoices);
    expect(sources.length).toBeGreaterThan(AUDIO_DEFAULTS.maximumFeedbackVoices);
    const starts = filters.map((filter) => Number(filter.frequency.setValueAtTime.mock.calls[0][1]));
    for (const start of starts) {
      expect(starts.filter((other) => other >= start && other < start + 1).length).toBeLessThanOrEqual(AUDIO_DEFAULTS.maximumFeedbackStartsPerSecond);
    }
    expect(vi.getTimerCount()).toBe(1);
    const settled = sources.length;
    vi.advanceTimersByTime(1000);
    expect(sources).toHaveLength(settled);
    audio.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels pending feedback on mute and disposal and never releases a stale unmute burst', async () => {
    const { audio, sources } = await unlockedAudio();
    const settings = freshSave(42).settings;
    audio.event(hit);
    audio.impact(contact);
    audio.configure({ ...settings, muted: true });
    audio.event(hit);
    audio.impact(contact);
    audio.launch();
    audio.click();
    audio.success();
    vi.advanceTimersByTime(100);
    expect(sources).toHaveLength(0);
    audio.configure(settings);
    vi.advanceTimersByTime(100);
    expect(sources).toHaveLength(0);
    audio.event(hit);
    audio.dispose();
    vi.advanceTimersByTime(100);
    expect(sources).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('applies the menu music level before unlock and preserves it across settings changes', async () => {
    vi.useFakeTimers();
    const recorder = recordingContext();
    vi.stubGlobal('AudioContext', function TestPausedContext() { return recorder.context; });
    vi.stubGlobal('document', { hidden: false });
    const audio = new GameAudio();
    managedAudio.push(audio);
    const settings = freshSave(42).settings;
    audio.configure(settings);
    audio.setPaused(true);
    await audio.unlock();
    expect(recorder.gains[3].gain.value).toBe(settings.musicVolume * 0.8);
    audio.configure({ ...settings, musicVolume: 0.5 });
    expect(recorder.gains[3].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.4, 0, 0.1);
    vi.advanceTimersByTime(960);
    expect(recorder.sources).toHaveLength(3);
    audio.setPaused(false);
    expect(recorder.gains[3].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.5, 0.96, 0.15);
  });
});