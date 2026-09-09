import { expect, test, type Page } from '@playwright/test';
import type { CascadeEvent, PegKind, PhysicalImpact } from '../../src/game/model';
import { drop, openGame } from './helpers';

type SynthModule = typeof import('../../src/audio/synth');
type SimulationModule = typeof import('../../src/game/simulation');

async function loadedModule(page: Page, pathname: string): Promise<string> {
  const url = await page.evaluate((path) => performance.getEntriesByType('resource')
    .map((entry) => entry.name).filter((name) => new URL(name).pathname === path).at(-1), pathname);
  expect(url, `The initialized game must load ${pathname}`).toBeDefined();
  return url!;
}

for (const sampleRate of [44100, 48000]) {
  test(`production feedback has physical presence and limiter headroom at ${sampleRate} Hz`, async ({ page }) => {
    await openGame(page);
    const moduleUrl = await loadedModule(page, '/src/audio/synth.ts');
    const recordings = await page.evaluate(async ({ url, rate }) => {
      const synth = await import(url) as SynthModule;
      const start = 0.067;
      const render = async (schedule: (context: OfflineAudioContext, output: AudioNode) => void, volume: number = synth.AUDIO_DEFAULTS.volume) => {
        const context = new OfflineAudioContext(1, Math.ceil(rate * 1.7), rate);
        const stage = synth.createOutputStage(context, volume);
        schedule(context, stage.input);
        const buffer = await context.startRendering();
        const samples = buffer.getChannelData(0);
        const first = Math.ceil(start * rate);
        const last = Math.floor((start + 0.2) * rate);
        let peak = 0;
        let squares = 0;
        let sum = 0;
        let lead = 0;
        let tail = 0;
        let finite = true;
        for (let index = 0; index < samples.length; index += 1) {
          const sample = samples[index];
          finite = finite && Number.isFinite(sample);
          peak = Math.max(peak, Math.abs(sample));
          if (index < first - 128) lead = Math.max(lead, Math.abs(sample));
          if (index >= first && index < last) { squares += sample * sample; sum += sample; }
          if (index > rate * 1.6) tail = Math.max(tail, Math.abs(sample));
        }
        const length = last - first;
        return { peak, rms: Math.sqrt(Math.max(0, squares / length - (sum / length) ** 2)), lead, tail, finite };
      };
      const event: CascadeEvent = { tick: 1, tokenId: 1, type: 'hit', kind: 'mint', x: 250, y: 122, slotId: '0-3', amount: 14, label: '+14' };
      const impact: PhysicalImpact = { tick: 1, tokenId: 1, surface: 'peg', strength: 0, scored: false, x: 250, y: 122 };
      const kinds: PegKind[] = ['mint', 'doubler', 'splitter', 'kicker', 'relay', 'vault', 'echo', 'crown'];
      const legacy = await render((context, output) => synth.scheduleTone(context, output, 330, start, 0.22, 0.25, 'triangle'));
      const music = await render((context, output) => {
        const bus = context.createGain();
        bus.gain.value = synth.AUDIO_DEFAULTS.musicVolume;
        bus.connect(output);
        synth.scheduleMusicBeat(context, bus, 0, start);
      });
      const events = [];
      for (const kind of kinds) {
        events.push({ kind, ...await render((context, output) => synth.scheduleEventSound(context, output, { ...event, kind }, { start })) });
      }
      events.push({ kind: 'collector', ...await render((context, output) => synth.scheduleEventSound(context, output, { ...event, type: 'payout', kind: undefined }, { start })) });
      const impacts = [];
      for (const surface of ['peg', 'wall'] as const) {
        const quiet = await render((context, output) => synth.scheduleImpactSound(context, output, { ...impact, surface }, { start }));
        const strong = await render((context, output) => synth.scheduleImpactSound(context, output, { ...impact, surface, strength: 1 }, { start }));
        impacts.push({ surface, quiet, strong });
      }
      const scored = await render((context, output) => synth.scheduleImpactSound(context, output, { ...impact, scored: true }, { start }));
      const muted = await render((context, output) => synth.scheduleEventSound(context, output, event, { start }), 0);
      const burst = await render((context, output) => {
        for (const kind of kinds) synth.scheduleEventSound(context, output, { ...event, kind, amount: 1e12 }, { start, note: 1e9, count: 256 });
        synth.scheduleEventSound(context, output, { ...event, type: 'payout', kind: undefined }, { start, count: 256 });
        synth.scheduleImpactSound(context, output, { ...impact, strength: 1 }, { start, count: 256 });
        synth.scheduleImpactSound(context, output, { ...impact, surface: 'wall', strength: 1 }, { start, count: 256 });
      }, 1);
      return { legacy, music, events, impacts, scored, muted, burst };
    }, { url: moduleUrl, rate: sampleRate });

    expect(recordings.legacy.peak).toBeGreaterThan(0.13);
    expect(recordings.legacy.peak).toBeLessThan(0.21);
    expect(recordings.music.rms).toBeGreaterThan(0.005);
    for (const event of recordings.events) {
      expect(event.peak, event.kind).toBeGreaterThan(recordings.legacy.peak * 1.6);
      expect(event.rms, event.kind).toBeGreaterThan(recordings.legacy.rms * 1.6);
      expect(event.rms, event.kind).toBeGreaterThan(recordings.music.rms * 2);
      expect(event.peak, event.kind).toBeLessThan(0.56);
    }
    for (const impact of recordings.impacts) {
      expect(impact.quiet.peak, impact.surface).toBeGreaterThan(0.07);
      expect(impact.quiet.rms, impact.surface).toBeGreaterThan(0.012);
      expect(impact.strong.rms, impact.surface).toBeGreaterThan(impact.quiet.rms * 1.3);
    }
    expect(recordings.scored.peak).toBe(0);
    expect(recordings.muted.peak).toBe(0);
    expect(recordings.burst.peak).toBeGreaterThan(0.5);
    expect(recordings.burst.peak).toBeLessThan(0.87);
    const measurements = [recordings.legacy, recordings.music, ...recordings.events, ...recordings.impacts.flatMap((impact) => [impact.quiet, impact.strong]), recordings.scored, recordings.muted, recordings.burst];
    for (const measurement of measurements) {
      expect(measurement.finite).toBe(true);
      expect(measurement.lead).toBeLessThan(0.000001);
      expect(measurement.tail).toBeLessThan(0.00001);
    }
  });
}

interface FeedbackProbe {
  events: CascadeEvent[];
  impacts: PhysicalImpact[];
  drained: PhysicalImpact[];
  ticks: number;
  states: string[];
  restore: () => void;
}

type ProbeWindow = Window & { __pocketAudioFeedback?: FeedbackProbe };

test('a real launch forwards every contact once without changing the score trace or stepping extra ticks', async ({ page }) => {
  await openGame(page);
  const audioUrl = await loadedModule(page, '/src/audio/synth.ts');
  const simulationUrl = await loadedModule(page, '/src/game/simulation.ts');
  await page.evaluate(async ({ audioModuleUrl, simulationModuleUrl }) => {
    const { GameAudio } = await import(audioModuleUrl) as SynthModule;
    const { DropSimulation } = await import(simulationModuleUrl) as SimulationModule;
    const originalImpact = GameAudio.prototype.impact;
    const originalEvent = GameAudio.prototype.event;
    const originalDrain = DropSimulation.prototype.drainImpacts;
    const originalStep = DropSimulation.prototype.step;
    const probe: FeedbackProbe = {
      events: [], impacts: [], drained: [], ticks: 0, states: [],
      restore: () => {
        GameAudio.prototype.impact = originalImpact;
        GameAudio.prototype.event = originalEvent;
        DropSimulation.prototype.drainImpacts = originalDrain;
        DropSimulation.prototype.step = originalStep;
        delete (window as ProbeWindow).__pocketAudioFeedback;
      },
    };
    (window as ProbeWindow).__pocketAudioFeedback = probe;
    GameAudio.prototype.impact = function (impact) {
      probe.impacts.push(structuredClone(impact));
      const context = (this as unknown as { context: AudioContext | null }).context;
      probe.states.push(context?.state ?? 'locked');
      originalImpact.call(this, impact);
    };
    GameAudio.prototype.event = function (event) {
      probe.events.push(structuredClone(event));
      originalEvent.call(this, event);
    };
    DropSimulation.prototype.drainImpacts = function () {
      const impacts = originalDrain.call(this);
      probe.drained.push(...structuredClone(impacts));
      return impacts;
    };
    DropSimulation.prototype.step = function (steps = 1) {
      const before = this.elapsedTicks;
      const events = originalStep.call(this, steps);
      probe.ticks += this.elapsedTicks - before;
      return events;
    };
  }, { audioModuleUrl: audioUrl, simulationModuleUrl: simulationUrl });
  try {
    const run = await drop(page);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const feedback = await page.evaluate(() => {
      const probe = (window as ProbeWindow).__pocketAudioFeedback!;
      return { events: probe.events, impacts: probe.impacts, drained: probe.drained, ticks: probe.ticks, states: probe.states };
    });
    expect(feedback.events).toEqual(run.lastDrop?.events);
    expect(feedback.impacts).toEqual(feedback.drained);
    expect(feedback.impacts.some((impact) => impact.surface === 'peg' && !impact.scored)).toBe(true);
    expect(feedback.impacts.some((impact) => impact.scored)).toBe(true);
    expect(feedback.ticks).toBe(run.lastDrop?.ticks);
    expect(feedback.states.every((state) => state === 'running')).toBe(true);
    const key = (event: CascadeEvent | PhysicalImpact) => `${event.tick}:${event.tokenId}:${event.slotId}`;
    expect(feedback.impacts.filter((impact) => impact.scored).map(key).sort())
      .toEqual(feedback.events.filter((event) => event.type === 'hit').map(key).sort());
  } finally {
    await page.evaluate(() => (window as ProbeWindow).__pocketAudioFeedback?.restore());
  }
});

test('opening and closing a menu keeps the same music clock playing softly', async ({ page }) => {
  await openGame(page);
  const moduleUrl = await loadedModule(page, '/src/audio/synth.ts');
  await page.evaluate(async (url) => {
    const { GameAudio } = await import(url) as SynthModule;
    const original = GameAudio.prototype.unlock;
    const probe = { instance: null as InstanceType<SynthModule['GameAudio']> | null, original };
    Reflect.set(window, '__menuMusicProbe', probe);
    GameAudio.prototype.unlock = function () {
      probe.instance = this;
      return original.call(this);
    };
  }, moduleUrl);
  const snapshot = () => page.evaluate(() => {
    const instance = Reflect.get(window, '__menuMusicProbe').instance as {
      beat: number;
      context: AudioContext;
      music: GainNode;
      settings: { musicVolume: number };
    };
    return { beat: instance.beat, state: instance.context.state, gain: instance.music.gain.value, requestedGain: instance.settings.musicVolume };
  });
  try {
    await page.getByRole('button', { name: 'Pause menu', exact: true }).click();
    const opened = await snapshot();
    expect(opened.state).toBe('running');
    await expect.poll(async () => (await snapshot()).beat).toBeGreaterThanOrEqual(opened.beat + 2);
    await expect.poll(async () => (await snapshot()).gain).toBeGreaterThan(opened.requestedGain * 0.7);
    await expect.poll(async () => (await snapshot()).gain).toBeLessThan(opened.requestedGain * 0.9);
    await page.getByRole('button', { name: 'Back to the machine', exact: true }).click();
    const resumed = await snapshot();
    expect(resumed.beat).toBeGreaterThanOrEqual(opened.beat + 2);
    await expect.poll(async () => (await snapshot()).gain).toBeGreaterThan(opened.requestedGain * 0.95);
    await expect.poll(async () => (await snapshot()).beat).toBeGreaterThan(resumed.beat);
  } finally {
    await page.evaluate(async (url) => {
      const { GameAudio } = await import(url) as SynthModule;
      GameAudio.prototype.unlock = Reflect.get(window, '__menuMusicProbe').original;
      Reflect.deleteProperty(window, '__menuMusicProbe');
    }, moduleUrl);
  }
});