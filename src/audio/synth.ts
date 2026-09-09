import type { CascadeEvent, PegKind, PhysicalImpact } from '../game/model';
import type { Settings } from '../game/save';

export const PENTATONIC = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];

export const AUDIO_DEFAULTS = Object.freeze({
  volume: 0.65,
  musicVolume: 0.28,
  eventGain: 0.56,
  impactGain: 0.3,
  minimumImpactStrength: 0.18,
  maximumFrequency: 3200,
  maximumFeedbackVoices: 32,
  maximumFeedbackStartsPerSecond: 48,
  feedbackIntervalMs: 12,
  maximumLookAhead: 0.048,
});

function bounded(value: number, minimum: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
}

export function frequency(semitones: number, root = 220): number {
  return root * 2 ** (semitones / 12);
}

export function limiterCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(4097);
  for (let index = 0; index < curve.length; index += 1) {
    const input = index / (curve.length - 1) * 2 - 1;
    curve[index] = Math.tanh(input * 1.3) * 0.86;
  }
  return curve;
}

export function createOutputStage(context: BaseAudioContext, volume: number) {
  const input = context.createGain();
  const limiter = context.createWaveShaper();
  const output = context.createGain();
  input.gain.value = 1;
  limiter.curve = limiterCurve();
  limiter.oversample = '2x';
  output.gain.value = bounded(volume, 0, 1, AUDIO_DEFAULTS.volume);
  input.connect(limiter);
  limiter.connect(output);
  output.connect(context.destination);
  return { input, output, limiter };
}

interface ToneOptions {
  attack?: number;
  endPitch?: number;
  onEnded?: () => void;
}

export function scheduleTone(context: BaseAudioContext, output: AudioNode, pitch: number, start: number, duration = 0.24, amplitude = 0.25, waveform: OscillatorType = 'sine', options: ToneOptions = {}): void {
  pitch = bounded(pitch, 40, AUDIO_DEFAULTS.maximumFrequency, 220);
  start = Math.max(context.currentTime, Number.isFinite(start) ? start : context.currentTime);
  duration = bounded(duration, 0.012, 2, 0.24);
  amplitude = bounded(amplitude, 0, 0.9, 0.25);
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(pitch, start);
  if (options.endPitch !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(bounded(options.endPitch, 40, AUDIO_DEFAULTS.maximumFrequency, pitch), start + duration);
  }
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(amplitude, start + bounded(options.attack ?? 0.006, 0.001, duration / 2, 0.006));
  if (amplitude === 0) envelope.gain.setValueAtTime(0, start + duration);
  else envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
  envelope.gain.linearRampToValueAtTime(0, start + duration + 0.02);
  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); options.onEnded?.(); };
}

type Resonance = readonly [ratio: number, duration: number, level: number, waveform: 'sine' | 'triangle', delay?: number, endRatio?: number];

interface Timbre {
  root: number;
  cutoff: number;
  click: number;
  tones: readonly Resonance[];
}

const TIMBRES: Record<PegKind | 'collector', Timbre> = {
  mint: { root: 330, cutoff: 2900, click: 0.32, tones: [[1, 0.24, 0.95, 'sine'], [2.73, 0.085, 0.28, 'sine']] },
  doubler: { root: 220, cutoff: 2600, click: 0.4, tones: [[1, 0.26, 0.95, 'triangle'], [2, 0.19, 0.5, 'sine', 0.014]] },
  splitter: { root: 220, cutoff: 2800, click: 0.38, tones: [[1, 0.2, 0.9, 'triangle'], [1.5, 0.24, 0.72, 'sine', 0.034]] },
  kicker: { root: 165, cutoff: 1800, click: 0.58, tones: [[1.8, 0.16, 1.15, 'triangle', 0, 0.6]] },
  relay: { root: 330, cutoff: 2600, click: 0.34, tones: [[1, 0.15, 0.95, 'triangle'], [1.5, 0.13, 0.64, 'sine', 0.026], [2, 0.11, 0.4, 'sine', 0.052]] },
  vault: { root: 110, cutoff: 1600, click: 0.6, tones: [[1, 0.27, 1.05, 'sine'], [2.4, 0.13, 0.45, 'triangle', 0.01]] },
  echo: { root: 220, cutoff: 2200, click: 0.24, tones: [[1, 0.22, 1, 'sine'], [1.5, 0.2, 0.6, 'sine', 0.075]] },
  crown: { root: 220, cutoff: 3000, click: 0.42, tones: [[1, 0.36, 0.92, 'triangle'], [2, 0.3, 0.48, 'sine', 0.015], [3, 0.24, 0.3, 'sine', 0.028]] },
  collector: { root: 330, cutoff: 2800, click: 0.55, tones: [[1, 0.36, 0.95, 'triangle'], [1.5, 0.32, 0.58, 'sine', 0.03], [2, 0.3, 0.4, 'sine', 0.06]] },
};

const IMPACT_TIMBRES: Record<PhysicalImpact['surface'], Timbre> = {
  peg: { root: 740, cutoff: 2700, click: 0.65, tones: [[1, 0.105, 1, 'sine', 0, 0.88]] },
  wall: { root: 155, cutoff: 1250, click: 1, tones: [[1, 0.095, 1.25, 'triangle', 0, 0.7]] },
};

export interface FeedbackOptions {
  start?: number;
  note?: number;
  count?: number;
}

export interface ScheduledFeedback {
  start: number;
  endsAt: number;
  voices: number;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(context: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(context);
  if (cached) return cached;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.03), context.sampleRate);
  const samples = buffer.getChannelData(0);
  let state = 0x51f15e;
  for (let index = 0; index < samples.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    samples[index] = (state >>> 0) / 0x100000000 * 2 - 1;
  }
  noiseBuffers.set(context, buffer);
  return buffer;
}

function eventTimbre(event: CascadeEvent): keyof typeof TIMBRES {
  return event.type === 'payout' ? 'collector' : event.kind ?? (event.type === 'split' ? 'splitter' : event.type === 'bank' ? 'vault' : 'mint');
}

function scheduleFeedback(context: BaseAudioContext, output: AudioNode, timbre: Timbre, pitch: number, amplitude: number, options: FeedbackOptions): ScheduledFeedback {
  const start = Math.max(context.currentTime, Number.isFinite(options.start) ? options.start! : context.currentTime);
  const count = bounded(options.count ?? 1, 1, 256, 1);
  const gain = amplitude * (1 + Math.min(0.45, Math.log2(count) * 0.1));
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(timbre.cutoff, context.sampleRate * 0.4), start);
  filter.Q.setValueAtTime(0.65, start);
  filter.connect(output);
  const voices = timbre.tones.length + 1;
  let remaining = voices;
  const ended = (): void => { remaining -= 1; if (remaining === 0) filter.disconnect(); };
  let endsAt = start + 0.03;
  for (const [ratio, duration, level, waveform, delay = 0, endRatio] of timbre.tones) {
    scheduleTone(context, filter, pitch * ratio, start + delay, duration, gain * level, waveform, {
      attack: 0.003,
      ...(endRatio === undefined ? {} : { endPitch: pitch * endRatio }),
      onEnded: ended,
    });
    endsAt = Math.max(endsAt, start + delay + duration + 0.03);
  }
  const source = context.createBufferSource();
  const envelope = context.createGain();
  source.buffer = noiseBuffer(context);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(gain * timbre.click, start + 0.001);
  envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.021);
  envelope.gain.linearRampToValueAtTime(0, start + 0.028);
  source.connect(envelope);
  envelope.connect(filter);
  source.start(start);
  source.stop(start + 0.03);
  source.onended = () => { source.disconnect(); envelope.disconnect(); ended(); };
  return { start, endsAt, voices };
}

export function scheduleEventSound(context: BaseAudioContext, output: AudioNode, event: CascadeEvent, options: FeedbackOptions = {}): ScheduledFeedback {
  const timbre = TIMBRES[eventTimbre(event)];
  const note = PENTATONIC[Math.floor(bounded(options.note ?? 0, 0, PENTATONIC.length - 1, 0))];
  return scheduleFeedback(context, output, timbre, frequency(note, timbre.root), AUDIO_DEFAULTS.eventGain, options);
}

export function scheduleImpactSound(context: BaseAudioContext, output: AudioNode, impact: PhysicalImpact, options: FeedbackOptions = {}): ScheduledFeedback | null {
  if (impact.scored) return null;
  const timbre = IMPACT_TIMBRES[impact.surface];
  const strength = bounded(impact.strength, AUDIO_DEFAULTS.minimumImpactStrength, 1, AUDIO_DEFAULTS.minimumImpactStrength);
  return scheduleFeedback(context, output, timbre, timbre.root, AUDIO_DEFAULTS.impactGain * (0.45 + strength * 0.55), options);
}

export function scheduleMusicBeat(context: BaseAudioContext, output: AudioNode, beat: number, start = context.currentTime + 0.01): void {
  const sequence = [0, 7, 12, 15, 10, 7, 5, 3, 0, 7, 17, 15, 12, 10, 7, 5];
  const note = sequence[beat % sequence.length];
  scheduleTone(context, output, frequency(note, 165), start, 0.65, 0.13, 'sine');
  if (beat % 4 === 0) scheduleTone(context, output, frequency(beat % 16 >= 8 ? -5 : 0, 82.5), start, 1.3, 0.16, 'sine');
}

type PendingFeedback =
  | { type: 'event'; event: CascadeEvent; note: number; count: number }
  | { type: 'impact'; impact: PhysicalImpact; count: number };

export class GameAudio {
  private context: AudioContext | null = null;
  private stage: ReturnType<typeof createOutputStage> | null = null;
  private effects: GainNode | null = null;
  private music: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingFeedback = new Map<string, PendingFeedback>();
  private activeFeedback: ScheduledFeedback[] = [];
  private feedbackStarts: number[] = [];
  private lastFeedbackStart = -Infinity;
  private settings: Settings | null = null;
  private beat = 0;
  private note = 0;
  private paused = false;

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.stage = createOutputStage(this.context, this.settings?.muted ? 0 : this.settings?.volume ?? AUDIO_DEFAULTS.volume);
      this.effects = this.context.createGain();
      this.music = this.context.createGain();
      this.effects.gain.value = 1;
      this.music.gain.value = bounded(this.settings?.musicVolume ?? AUDIO_DEFAULTS.musicVolume, 0, 1, AUDIO_DEFAULTS.musicVolume) * (this.paused ? 0.8 : 1);
      this.effects.connect(this.stage.input);
      this.music.connect(this.stage.input);
      this.timer = setInterval(() => this.musicTick(), 480);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  configure(settings: Settings): void {
    this.settings = settings;
    if (settings.muted) this.clearPendingFeedback();
    if (this.context && this.stage && this.music) {
      this.stage.output.gain.setTargetAtTime(settings.muted ? 0 : bounded(settings.volume, 0, 1, AUDIO_DEFAULTS.volume), this.context.currentTime, 0.03);
      this.music.gain.setTargetAtTime(bounded(settings.musicVolume, 0, 1, AUDIO_DEFAULTS.musicVolume) * (this.paused ? 0.8 : 1), this.context.currentTime, 0.1);
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (this.context && this.music) this.music.gain.setTargetAtTime(bounded(this.settings?.musicVolume ?? AUDIO_DEFAULTS.musicVolume, 0, 1, AUDIO_DEFAULTS.musicVolume) * (paused ? 0.8 : 1), this.context.currentTime, 0.15);
  }

  private musicTick(): void {
    if (!this.context || !this.music || this.settings?.muted || document.hidden) return;
    const start = this.context.currentTime + 0.01;
    scheduleMusicBeat(this.context, this.music, this.beat, start);
    this.beat += 1;
  }

  launch(): void {
    this.note = 0;
    if (!this.context || !this.effects || this.settings?.muted || this.context.state !== 'running') return;
    const start = this.context.currentTime;
    if (!this.canScheduleFeedback(2, start)) return;
    scheduleTone(this.context, this.effects, 110, start, 0.12, 0.4, 'triangle');
    scheduleTone(this.context, this.effects, 660, start + 0.04, 0.2, 0.2, 'sine');
    this.trackFeedback({ start, endsAt: start + 0.27, voices: 2 });
  }

  event(event: CascadeEvent): void {
    if (!this.context || !this.effects || this.settings?.muted || this.context.state !== 'running') return;
    const key = eventTimbre(event);
    const pending = this.pendingFeedback.get(key);
    if (pending?.type === 'event') pending.count = Math.min(256, pending.count + 1);
    else this.pendingFeedback.set(key, { type: 'event', event, note: this.note, count: 1 });
    this.note = Math.min(this.note + 1, PENTATONIC.length - 1);
    this.requestFeedback();
  }

  impact(impact: PhysicalImpact): void {
    if (impact.scored || !this.context || !this.effects || this.settings?.muted || this.context.state !== 'running') return;
    const key = `impact:${impact.surface}`;
    const pending = this.pendingFeedback.get(key);
    const strength = bounded(impact.strength, AUDIO_DEFAULTS.minimumImpactStrength, 1, AUDIO_DEFAULTS.minimumImpactStrength);
    if (pending?.type === 'impact') {
      pending.count = Math.min(256, pending.count + 1);
      pending.impact = { ...pending.impact, strength: Math.max(pending.impact.strength, strength) };
    } else this.pendingFeedback.set(key, { type: 'impact', impact: { ...impact, strength }, count: 1 });
    this.requestFeedback();
  }

  private requestFeedback(): void {
    if (this.feedbackTimer !== null) return;
    this.feedbackTimer = setTimeout(() => {
      this.feedbackTimer = null;
      this.flushFeedback();
    }, AUDIO_DEFAULTS.feedbackIntervalMs);
  }

  private clearPendingFeedback(): void {
    if (this.feedbackTimer !== null) clearTimeout(this.feedbackTimer);
    this.feedbackTimer = null;
    this.pendingFeedback.clear();
  }

  private canScheduleFeedback(voices: number, now: number): boolean {
    this.activeFeedback = this.activeFeedback.filter((sound) => sound.endsAt > now);
    this.feedbackStarts = this.feedbackStarts.filter((start) => start > now - 1);
    return this.activeFeedback.reduce((total, sound) => total + sound.voices, 0) + voices <= AUDIO_DEFAULTS.maximumFeedbackVoices
      && this.feedbackStarts.length < AUDIO_DEFAULTS.maximumFeedbackStartsPerSecond;
  }

  private trackFeedback(sound: ScheduledFeedback): void {
    this.activeFeedback.push(sound);
    this.feedbackStarts.push(sound.start);
    this.lastFeedbackStart = sound.start;
  }

  private flushFeedback(): void {
    if (!this.context || !this.effects || this.settings?.muted || this.context.state !== 'running') {
      this.clearPendingFeedback();
      return;
    }
    const now = this.context.currentTime;
    const pending = [...this.pendingFeedback.entries()].sort((first, second) => Number(first[1].type === 'impact') - Number(second[1].type === 'impact'));
    for (const [key, feedback] of pending) {
      const voices = feedback.type === 'event' ? TIMBRES[eventTimbre(feedback.event)].tones.length + 1 : 2;
      if (!this.canScheduleFeedback(voices, now)) continue;
      const start = Math.max(now + 0.004, this.lastFeedbackStart + 0.008);
      if (start > now + AUDIO_DEFAULTS.maximumLookAhead) break;
      const sound = feedback.type === 'event'
        ? scheduleEventSound(this.context, this.effects, feedback.event, { start, note: feedback.note, count: feedback.count })
        : scheduleImpactSound(this.context, this.effects, feedback.impact, { start, count: feedback.count });
      if (sound) this.trackFeedback(sound);
      this.pendingFeedback.delete(key);
    }
    if (this.pendingFeedback.size > 0) this.requestFeedback();
  }

  click(): void {
    if (!this.context || !this.effects || this.settings?.muted || this.context.state !== 'running') return;
    const start = this.context.currentTime;
    if (!this.canScheduleFeedback(1, start)) return;
    scheduleTone(this.context, this.effects, 440, start, 0.065, 0.15, 'triangle');
    this.trackFeedback({ start, endsAt: start + 0.095, voices: 1 });
  }

  success(): void {
    if (!this.context || !this.effects || this.settings?.muted || this.context.state !== 'running') return;
    const start = this.context.currentTime;
    if (!this.canScheduleFeedback(5, start)) return;
    [0, 7, 12, 15, 19].forEach((note, index) => {
      scheduleTone(this.context!, this.effects!, frequency(note, 330), start + index * 0.085, 0.65, 0.26, 'triangle');
    });
    this.trackFeedback({ start, endsAt: start + 1.02, voices: 5 });
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.clearPendingFeedback();
    this.activeFeedback = [];
    this.feedbackStarts = [];
    this.lastFeedbackStart = -Infinity;
    void this.context?.close();
    this.context = null;
    this.stage = null;
    this.effects = null;
    this.music = null;
  }
}