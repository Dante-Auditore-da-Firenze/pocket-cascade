import { PARTS, type PartDefinition } from '../game/content';
import {
  BOARD_HEIGHT, BOARD_WIDTH, SLOT_MAP, SLOTS, lanePosition,
  type Board, type CascadeEvent, type DropResult, type TokenView,
} from '../game/model';
import {
  CIRCUITS, COLLECTORS, cabinetMaterials, circle, circuitPath, paintCabinet, roundRect,
  type Materials,
} from './art';
import { ink, mix, type CabinetPalette, type Tone } from './palette';

export const MAX_PARTICLES = 160;
export const MAX_FLOAT_LABELS = 10;
export const MAX_TRAIL_POINTS = 32;
export const MAX_PATH_POINTS = 240;
const MAX_TRACKS = 8;

export interface CabinetView {
  board: Board;
  lane: number;
  selectedPegId: string | null;
  destinations: ReadonlySet<string>;
  editable: boolean;
  dropping: boolean;
  paused: boolean;
  reducedMotion: boolean;
  trails: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Trace {
  recent: Point[];
  path: Point[];
}

type EffectColor = PartDefinition['color'];

interface Particle extends Point {
  velocityX: number;
  velocityY: number;
  age: number;
  lifetime: number;
  size: number;
  angle: number;
  color: EffectColor;
}

interface FloatingLabel extends Point {
  text: string;
  age: number;
  lifetime: number;
  color: EffectColor;
  priority: number;
}

interface Flash {
  age: number;
  color: EffectColor;
}

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

const integerFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function displayValue(value: number): string {
  return value < 10_000 ? integerFormat.format(value) : compactFormat.format(value);
}

function overlap(first: Bounds, second: Bounds): boolean {
  return first.left < second.left + second.width + 4
    && first.left + first.width + 4 > second.left
    && first.top < second.top + second.height + 4
    && first.top + first.height + 4 > second.top;
}

function fitLabel(width: number, height: number, candidates: Point[], occupied: Bounds[], minimumTop = 12): Bounds | null {
  for (const candidate of candidates) {
    const bounds = {
      left: Math.max(22, Math.min(478 - width, candidate.x)),
      top: Math.max(minimumTop, Math.min(563 - height, candidate.y)),
      width,
      height,
    };
    if (!occupied.some((other) => overlap(bounds, other))) {
      occupied.push(bounds);
      return bounds;
    }
  }
  return null;
}

export class CabinetRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly layer: HTMLCanvasElement;
  private readonly layerContext: CanvasRenderingContext2D;
  private material: Materials;
  private cachedBoard: Board | null = null;
  private dirty = true;
  private tokens: TokenView[] = [];
  private previousTokens = new Map<number, TokenView>();
  private tracks = new Map<number, Trace>();
  private lastPaths: Point[][] = [];
  private particles: Particle[] = [];
  private labels: FloatingLabel[] = [];
  private flashes = new Map<string, Flash>();
  private collectorFlashes = new Map<number, Flash>();
  private trayTotals: [number, number, number] = [0, 0, 0];
  private shownResult: DropResult | null = null;
  private playing = false;
  private reducedMotion = false;
  private visualTime = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private palette: CabinetPalette) {
    const context = canvas.getContext('2d', { alpha: false });
    const layer = canvas.ownerDocument.createElement('canvas');
    const layerContext = layer.getContext('2d', { alpha: false });
    if (!context || !layerContext) throw new Error('The cabinet requires Canvas 2D support.');
    this.context = context;
    this.layer = layer;
    this.layerContext = layerContext;
    this.material = cabinetMaterials(palette);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    const ratio = Math.max(0.5, Math.min(2, pixelRatio || 1));
    const bufferWidth = Math.max(1, Math.round(width * ratio));
    const bufferHeight = Math.max(1, Math.round(height * ratio));
    if (this.canvas.width === bufferWidth && this.canvas.height === bufferHeight
      && this.layer.width === bufferWidth && this.layer.height === bufferHeight) return;
    this.canvas.width = bufferWidth;
    this.canvas.height = bufferHeight;
    this.layer.width = bufferWidth;
    this.layer.height = bufferHeight;
    this.dirty = true;
  }

  setPalette(palette: CabinetPalette): void {
    this.palette = palette;
    this.material = cabinetMaterials(palette);
    this.dirty = true;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (reduced) this.particles = [];
  }

  beginDrop(tokens: TokenView[]): void {
    this.playing = true;
    this.tokens = [];
    this.previousTokens.clear();
    this.tracks.clear();
    this.lastPaths = [];
    this.trayTotals = [0, 0, 0];
    this.clearEffects();
    this.sample(tokens);
  }

  sample(tokens: TokenView[]): void {
    this.previousTokens = new Map(this.tokens.map((token) => [token.id, token]));
    this.tokens = tokens;
    for (const token of tokens) {
      let trace = this.tracks.get(token.id);
      if (!trace) {
        if (this.tracks.size >= MAX_TRACKS) continue;
        trace = { recent: [], path: [] };
        this.tracks.set(token.id, trace);
      }
      const last = trace.recent[trace.recent.length - 1];
      if (last && Math.hypot(token.x - last.x, token.y - last.y) < 1.4) continue;
      trace.recent.push({ x: token.x, y: token.y });
      if (trace.recent.length > MAX_TRAIL_POINTS) trace.recent.shift();
      this.appendPath(trace, token);
    }
  }

  private appendPath(trace: Trace, point: Point): void {
    if (trace.path.length >= MAX_PATH_POINTS) {
      trace.path = trace.path.filter((_, index) => index % 2 === 0);
    }
    trace.path.push({ x: point.x, y: point.y });
  }

  event(event: CascadeEvent): void {
    const color: EffectColor = event.type === 'payout' || event.type === 'bank'
      ? 'warning' : event.kind ? PARTS[event.kind].color : 'accent';
    if (event.slotId) this.flashes.set(event.slotId, { age: 0, color });
    if (event.type === 'payout' && event.tray !== undefined && event.tray >= 0 && event.tray < 3) {
      const tray = event.tray as 0 | 1 | 2;
      this.trayTotals[tray] += event.amount;
      this.collectorFlashes.set(tray, { age: 0, color });
      const trace = this.tracks.get(event.tokenId);
      if (trace) this.appendPath(trace, event);
    }

    const duplicate = event.type === 'hit'
      && (event.kind === 'vault' || (event.kind === 'splitter' && event.label === 'FORK'));
    if (!duplicate) this.addLabel(event, color);
    if (this.reducedMotion || duplicate) return;
    const count = event.type === 'payout' ? 44 : event.type === 'split' ? 24 : event.type === 'bank' ? 18 : 6;
    for (let index = 0; index < count; index += 1) {
      const angle = index * 2.399963 + event.tokenId * 0.7 + event.tick * 0.11;
      const velocity = 24 + (index % 7) * (event.type === 'payout' ? 15 : 7);
      this.particles.push({
        x: event.x,
        y: event.y,
        velocityX: Math.cos(angle) * velocity,
        velocityY: event.type === 'payout' ? -35 - Math.abs(Math.sin(angle)) * velocity : Math.sin(angle) * velocity - 18,
        age: 0,
        lifetime: (event.type === 'payout' ? 720 : 350) + (index % 4) * 90,
        size: 1.2 + (index % 3) * 0.7,
        angle,
        color,
      });
    }
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  private addLabel(event: CascadeEvent, color: EffectColor): void {
    const priority = event.type === 'payout' ? 3 : event.type === 'bank' ? 2 : event.type === 'split' ? 1 : 0;
    const nearby = this.labels.filter((label) => label.age < 220
      && Math.abs(label.x - event.x) < 110 && Math.abs(label.y - event.y) < 80).length;
    const label: FloatingLabel = {
      x: event.x,
      y: event.type === 'payout' ? 550 : event.y - 29,
      text: event.type === 'payout' ? `+${displayValue(event.amount)}`
        : event.type === 'bank' ? `BANK +${displayValue(event.amount)}` : event.label,
      age: -Math.min(420, nearby * 85),
      lifetime: priority > 1 ? 1300 : 1000,
      priority,
      color,
    };
    if (this.labels.length >= MAX_FLOAT_LABELS) {
      const expendable = this.labels.findIndex((existing) => existing.priority <= priority);
      if (expendable < 0) return;
      this.labels.splice(expendable, 1);
    }
    this.labels.push(label);
  }

  advance(milliseconds: number): void {
    this.visualTime += milliseconds;
    for (const particle of this.particles) particle.age += milliseconds;
    this.particles = this.particles.filter((particle) => particle.age < particle.lifetime);
    for (const label of this.labels) label.age += milliseconds;
    this.labels = this.labels.filter((label) => label.age < label.lifetime);
    for (const [slotId, flash] of this.flashes) {
      flash.age += milliseconds;
      if (flash.age > 650) this.flashes.delete(slotId);
    }
    for (const [tray, flash] of this.collectorFlashes) {
      flash.age += milliseconds;
      if (flash.age > 1100) this.collectorFlashes.delete(tray);
    }
  }

  finishDrop(result: DropResult): void {
    this.lastPaths = [...this.tracks.values()].map((trace) => [...trace.path]);
    this.tracks.clear();
    this.tokens = [];
    this.previousTokens.clear();
    this.trayTotals = [...result.trayTotals];
    this.shownResult = result;
    this.playing = false;
  }

  showResult(result: DropResult | null): void {
    if (this.playing) {
      this.clearEffects();
      this.lastPaths = [];
    }
    this.playing = false;
    this.tokens = [];
    this.previousTokens.clear();
    this.tracks.clear();
    this.trayTotals = result ? [...result.trayTotals] : [0, 0, 0];
    if (!result && this.shownResult !== result) {
      this.lastPaths = [];
      this.clearEffects();
    }
    this.shownResult = result;
  }

  private clearEffects(): void {
    this.particles = [];
    this.labels = [];
    this.flashes.clear();
    this.collectorFlashes.clear();
  }

  draw(view: CabinetView, interpolation: number): void {
    this.setReducedMotion(view.reducedMotion);
    if (this.dirty || this.cachedBoard !== view.board) {
      this.layerContext.setTransform(this.layer.width / BOARD_WIDTH, 0, 0, this.layer.height / BOARD_HEIGHT, 0, 0);
      paintCabinet(this.layerContext, this.palette, view.board);
      this.cachedBoard = view.board;
      this.dirty = false;
    }
    const context = this.context;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.drawImage(this.layer, 0, 0);
    context.save();
    context.setTransform(this.canvas.width / BOARD_WIDTH, 0, 0, this.canvas.height / BOARD_HEIGHT, 0, 0);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    this.drawAim(view);
    this.drawCircuits(view);
    this.drawSelections(view);
    if (view.trails) this.drawTrails(view.dropping);
    this.drawCollectors();
    this.drawParticles();
    const tokens = this.tokens.map((token) => {
      const previous = this.previousTokens.get(token.id) ?? token;
      const fraction = Math.max(0, Math.min(1, interpolation));
      return { ...token, x: previous.x + (token.x - previous.x) * fraction, y: previous.y + (token.y - previous.y) * fraction };
    });
    for (const token of tokens) this.drawToken(token);
    const occupied = tokens.map((token) => ({ left: token.x - 9, top: token.y - 9, width: 18, height: 18 }));
    this.drawTokenValues(tokens, occupied);
    this.drawLabels(occupied);
    context.restore();
  }

  private drawAim(view: CabinetView): void {
    const context = this.context;
    const laneX = lanePosition(view.lane);
    const tint = view.paused ? this.palette.warning : this.palette.success;
    roundRect(context, laneX - 17, 20, 34, 32, 4, ink(tint, 0.18), ink(mix(tint, this.material.light, 0.35), 0.85), 1.2);
    context.font = `750 11px ${this.palette.font}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = ink(this.material.light);
    context.fillText(String(view.lane + 1), laneX, 36.5);
    context.beginPath();
    context.moveTo(laneX - 3.5, 57);
    context.lineTo(laneX, 61);
    context.lineTo(laneX + 3.5, 57);
    context.strokeStyle = ink(this.material.brass, 0.9);
    context.lineWidth = 1.5;
    context.stroke();
    circle(context, 112, 76, 2.5);
    context.fillStyle = ink(tint, view.paused || !view.dropping || this.reducedMotion ? 0.9 : 0.6 + Math.sin(this.visualTime / 110) * 0.3);
    context.fill();
    if (view.paused) {
      context.fillStyle = ink(this.material.brass);
      context.fillRect(382, 72, 2, 8);
      context.fillRect(387, 72, 2, 8);
    }
  }

  private drawCircuits(view: CabinetView): void {
    const context = this.context;
    for (const { source, destination } of CIRCUITS) {
      if (!view.board[source.id] || !view.board[destination.id]) continue;
      const flash = this.flashes.get(source.id) ?? this.flashes.get(destination.id);
      if (!flash && this.reducedMotion) continue;
      const strength = flash ? Math.max(0, 1 - flash.age / 650) : 0.12;
      circuitPath(context, source, destination);
      context.strokeStyle = ink(flash ? this.palette[flash.color] : this.palette.success, strength * 0.5);
      context.lineWidth = flash ? 1.8 : 1;
      if (!this.reducedMotion) {
        context.setLineDash([3, 13]);
        context.lineDashOffset = -this.visualTime / 65;
      }
      context.stroke();
      context.setLineDash([]);
    }
    for (const [slotId, flash] of this.flashes) {
      const slot = SLOT_MAP[slotId];
      if (!slot) continue;
      const progress = flash.age / 650;
      circle(context, slot.x, slot.y, this.reducedMotion ? 20 : 17 + progress * 15);
      context.strokeStyle = ink(this.palette[flash.color], (1 - progress) * 0.75);
      context.lineWidth = 2 * (1 - progress) + 0.5;
      context.stroke();
    }
  }

  private drawSelections(view: CabinetView): void {
    if (!view.editable) return;
    const context = this.context;
    for (const slot of SLOTS) {
      const selected = view.board[slot.id]?.id === view.selectedPegId;
      if (!selected && !view.destinations.has(slot.id)) continue;
      const tint = selected ? this.material.brass : view.board[slot.id] ? this.palette.link : this.palette.success;
      const intensity = selected && !this.reducedMotion ? 0.76 + Math.sin(this.visualTime / 260) * 0.16 : 0.8;
      context.strokeStyle = ink(tint, intensity);
      context.lineWidth = selected ? 1.8 : 1.1;
      circle(context, slot.x, slot.y, selected ? 21 : 19);
      if (!selected) context.setLineDash([2, 4]);
      context.stroke();
      context.setLineDash([]);
      if (selected) {
        for (let corner = 0; corner < 4; corner += 1) {
          const angle = corner * Math.PI / 2;
          circle(context, slot.x + Math.cos(angle) * 21, slot.y + Math.sin(angle) * 21, 1.8);
          context.fillStyle = ink(this.material.light);
          context.fill();
        }
      }
    }
  }

  private drawTrails(dropping: boolean): void {
    const context = this.context;
    context.save();
    context.beginPath();
    context.rect(15, 15, 470, 585);
    context.clip();
    if (!dropping) {
      context.strokeStyle = ink(mix(this.palette.link, this.material.brass, 0.5), 0.22);
      context.lineWidth = 1.15;
      context.setLineDash([2, 4]);
      for (const path of this.lastPaths) {
        context.beginPath();
        path.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.stroke();
      }
      context.setLineDash([]);
    }
    for (const token of this.tokens) {
      const trace = this.tracks.get(token.id);
      if (!trace) continue;
      const tint = token.depth > 0 ? this.material.rose : this.material.brass;
      for (let index = 1; index < trace.recent.length; index += 1) {
        const fraction = index / trace.recent.length;
        const previous = trace.recent[index - 1];
        const point = trace.recent[index];
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(point.x, point.y);
        context.strokeStyle = ink(tint, fraction * fraction * 0.6);
        context.lineWidth = 0.6 + fraction * 2.6;
        context.stroke();
      }
    }
    context.restore();
  }

  private drawCollectors(): void {
    const context = this.context;
    for (const [index, flash] of this.collectorFlashes) {
      const tray = COLLECTORS[index];
      const progress = flash.age / 1100;
      const opacity = (1 - progress) ** 2;
      const tint = index === 1 ? this.material.rose : this.material.brass;
      context.save();
      context.beginPath();
      context.rect(tray.left + 2, 512, tray.right - tray.left - 4, 117);
      context.clip();
      if (!this.reducedMotion) {
        const radius = 48 + progress * 75;
        const bloom = context.createRadialGradient(tray.center, 597, 2, tray.center, 597, radius);
        bloom.addColorStop(0, ink(this.material.light, opacity * 0.68));
        bloom.addColorStop(0.3, ink(tint, opacity * 0.44));
        bloom.addColorStop(1, ink(tint, 0));
        context.fillStyle = bloom;
        context.fillRect(tray.left, 512, tray.right - tray.left, 117);
        context.strokeStyle = ink(tint, opacity * 0.8);
        context.lineWidth = 1.3;
        context.beginPath();
        context.ellipse(tray.center, 598, 23 + progress * 80, 13 + progress * 40, 0, Math.PI, Math.PI * 2);
        context.stroke();
      } else {
        context.fillStyle = ink(tint, opacity * 0.18);
        context.fillRect(tray.left + 4, 570, tray.right - tray.left - 8, 58);
      }
      context.restore();
    }
    COLLECTORS.forEach((tray, index) => {
      context.font = '700 15px Consolas, "Courier New", monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = ink(this.collectorFlashes.has(index) ? this.material.brass : this.material.light, 0.95);
      context.fillText(displayValue(this.trayTotals[index]), tray.center, 616, tray.right - tray.left - 30);
    });
  }

  private drawParticles(): void {
    if (this.reducedMotion) return;
    const context = this.context;
    context.save();
    context.beginPath();
    context.rect(17, 95, 466, 535);
    context.clip();
    for (const particle of this.particles) {
      const seconds = particle.age / 1000;
      context.save();
      context.translate(particle.x + particle.velocityX * seconds, particle.y + particle.velocityY * seconds + 65 * seconds * seconds);
      context.rotate(particle.angle + seconds * 2);
      context.fillStyle = ink(mix(this.palette[particle.color], this.material.light, 0.3), (1 - particle.age / particle.lifetime) ** 1.5);
      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size * 1.8, particle.size);
      context.restore();
    }
    context.restore();
  }

  private drawToken(token: TokenView): void {
    const context = this.context;
    const tint = token.depth > 0 ? this.material.rose : this.material.brass;
    circle(context, token.x + 1.1, token.y + 2.1, 7.6);
    context.fillStyle = ink(this.material.dark, 0.68);
    context.fill();
    const metal = context.createLinearGradient(token.x - 5, token.y - 6, token.x + 5, token.y + 7);
    metal.addColorStop(0, ink(this.material.light));
    metal.addColorStop(0.27, ink(mix(tint, this.material.light, 0.5)));
    metal.addColorStop(0.53, ink(tint));
    metal.addColorStop(0.7, ink(mix(tint, this.material.dark, 0.5)));
    metal.addColorStop(1, ink(tint));
    circle(context, token.x, token.y, 7);
    context.fillStyle = metal;
    context.fill();
    context.strokeStyle = ink(this.material.light, 0.8);
    context.lineWidth = 0.7;
    context.stroke();
    circle(context, token.x, token.y, 4.8);
    context.strokeStyle = ink(this.material.dark, 0.5);
    context.lineWidth = 0.8;
    context.stroke();
    context.beginPath();
    context.arc(token.x, token.y, 4.1, Math.PI * 1.05, Math.PI * 1.7);
    context.strokeStyle = ink(this.material.light, 0.95);
    context.lineWidth = 1.25;
    context.stroke();
    circle(context, token.x - 2.2, token.y - 2.2, 1.3);
    context.fillStyle = ink(this.material.light, 0.9);
    context.fill();
  }

  private drawTokenValues(tokens: TokenView[], occupied: Bounds[]): void {
    const context = this.context;
    context.font = '700 12px Consolas, "Courier New", monospace';
    for (const token of [...tokens].sort((first, second) => first.y - second.y || first.id - second.id)) {
      const text = displayValue(token.value);
      const width = Math.ceil(context.measureText(text).width) + 12;
      const candidates = [0, -21, 21, -42, 42, -63, 63].flatMap((offset) => [
        { x: token.x + 13, y: token.y - 18 + offset },
        { x: token.x - width - 13, y: token.y - 18 + offset },
      ]);
      const bounds = fitLabel(width, 19, candidates, occupied);
      if (!bounds) continue;
      const tint = token.depth > 0 ? this.material.rose : this.material.brass;
      context.beginPath();
      context.moveTo(token.x, token.y);
      context.lineTo(Math.max(bounds.left, Math.min(bounds.left + bounds.width, token.x)), bounds.top + bounds.height / 2);
      context.strokeStyle = ink(tint, 0.6);
      context.lineWidth = 0.8;
      context.stroke();
      this.labelPlate(text, bounds, tint, 1, false);
    }
  }

  private drawLabels(occupied: Bounds[]): void {
    const context = this.context;
    const activeLabels = this.labels.filter((label) => label.age >= 0)
      .sort((first, second) => second.priority - first.priority || second.age - first.age);
    for (const label of activeLabels) {
      const large = label.priority === 3;
      context.font = `700 ${large ? 18 : 12}px ${this.palette.font}`;
      const width = Math.min(174, Math.ceil(context.measureText(label.text).width) + 14);
      const height = large ? 27 : 21;
      const rise = this.reducedMotion ? 0 : Math.min(25, label.age * 0.026);
      const candidates = Array.from({ length: 8 }, (_, row) => [
        { x: label.x - width / 2, y: label.y - rise - row * (height + 5) },
        { x: label.x - width / 2 + (row % 2 ? 54 : -54), y: label.y - rise - row * (height + 5) },
      ]).flat();
      const bounds = fitLabel(width, height, candidates, occupied, 98);
      if (!bounds) continue;
      const opacity = Math.min(1, label.age / 80) * Math.min(1, (label.lifetime - label.age) / 330);
      this.labelPlate(label.text, bounds, mix(this.palette[label.color], this.material.light, 0.4), opacity, large);
    }
  }

  private labelPlate(text: string, bounds: Bounds, tint: Tone, opacity: number, large: boolean): void {
    const context = this.context;
    context.save();
    context.globalAlpha = opacity;
    roundRect(context, bounds.left, bounds.top, bounds.width, bounds.height, 3,
      ink(mix(this.material.dark, this.palette.surface, 0.06), 0.96), ink(tint, large ? 0.9 : 0.6), large ? 1.3 : 0.7);
    if (large) {
      context.fillStyle = ink(tint, 0.75);
      context.fillRect(bounds.left + 6, bounds.top + bounds.height - 2, bounds.width - 12, 1);
    }
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = ink(mix(tint, this.material.light, 0.45));
    context.fillText(text, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2 + 0.4, bounds.width - 12);
    context.restore();
  }

  dispose(): void {
    this.clearEffects();
    this.tracks.clear();
    this.previousTokens.clear();
    this.tokens = [];
    this.lastPaths = [];
    this.cachedBoard = null;
    this.layer.width = 0;
    this.layer.height = 0;
  }
}