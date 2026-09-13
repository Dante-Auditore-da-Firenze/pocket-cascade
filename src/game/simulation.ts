import Matter from 'matter-js';
import {
  BOARD_HEIGHT, BOARD_WIDTH, FIXED_STEP, MAX_CHARGE, MAX_SPLIT_DEPTH, MAX_TICKS,
  SLOT_MAP, SLOTS, TRAY_MULTIPLIERS, lanePosition, money, random,
  type CascadeEvent, type DropConfig, type DropResult, type PegKind, type PhysicalImpact, type TokenView,
} from './model';

export interface SimulationOptions {
  boostedSockets?: readonly string[];
}

interface Token {
  id: number;
  body: Matter.Body;
  value: number;
  depth: number;
  visited: Set<string>;
  kinds: Set<PegKind>;
  lastEffect: { operation: 'add' | 'multiply'; value: number } | null;
  charge: number;
  reserve: number;
  stalled: number;
}

export class DropSimulation {
  private engine = Matter.Engine.create({ enableSleeping: false });
  private tokens = new Map<number, Token>();
  private bodies = new Map<number, string>();
  private walls = new Set<number>();
  private tokenCounter = 0;
  private tick = 0;
  private complete = false;
  private pendingEvents: CascadeEvent[] = [];
  private pendingImpacts: PhysicalImpact[] = [];
  private boostedSockets: ReadonlySet<string>;
  private junctions = new Map<string, { arrivals: Set<number>; firstValue: number }>();
  private result: DropResult = {
    total: 0, banked: 0, trayTotals: [0, 0, 0], hits: 0, splits: 0,
    maxValue: 0, maxChain: 0, ticks: 0, timedOut: false, events: [],
  };

  constructor(private config: DropConfig, options: SimulationOptions = {}) {
    this.boostedSockets = new Set(options.boostedSockets);
    if ([...this.boostedSockets].some((slotId) => !Object.hasOwn(SLOT_MAP, slotId))) throw new Error('Unknown boosted socket.');
    this.engine.gravity.y = 1.15;
    this.engine.positionIterations = 8;
    this.engine.velocityIterations = 8;
    const staticOptions = { isStatic: true, friction: 0, restitution: 0.65, collisionFilter: { category: 1 } };
    const walls = [
      Matter.Bodies.rectangle(5, BOARD_HEIGHT / 2, 18, BOARD_HEIGHT * 2, staticOptions),
      Matter.Bodies.rectangle(BOARD_WIDTH - 5, BOARD_HEIGHT / 2, 18, BOARD_HEIGHT * 2, staticOptions),
      Matter.Bodies.rectangle(BOARD_WIDTH / 2, -24, BOARD_WIDTH, 20, staticOptions),
    ];
    this.walls = new Set(walls.map((wall) => wall.id));
    Matter.Composite.add(this.engine.world, walls);
    for (const slot of SLOTS) {
      const peg = Matter.Bodies.circle(slot.x, slot.y, 9, staticOptions);
      this.bodies.set(peg.id, slot.id);
      Matter.Composite.add(this.engine.world, peg);
    }
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      const hits: { token: Token; slotId: string; impact: PhysicalImpact }[] = [];
      const impacts: PhysicalImpact[] = [];
      for (const pair of event.pairs) {
        const token = this.tokens.get(pair.bodyA.id) ?? this.tokens.get(pair.bodyB.id);
        if (!token) continue;
        const obstacle = pair.bodyA.id === token.body.id ? pair.bodyB : pair.bodyA;
        const slotId = this.bodies.get(obstacle.id);
        if (!slotId && !this.walls.has(obstacle.id)) continue;
        const contact = pair.collision.supports[0] ?? token.body.position;
        const impact: PhysicalImpact = {
          tick: this.tick,
          tokenId: token.id,
          x: Math.max(0, Math.min(BOARD_WIDTH, contact.x)),
          y: Math.max(0, Math.min(BOARD_HEIGHT, contact.y)),
          surface: slotId ? 'peg' : 'wall',
          strength: Math.min(1, Math.hypot(token.body.velocity.x, token.body.velocity.y) / 8),
          scored: false,
          ...(slotId ? { slotId, kind: this.config.board[slotId]?.kind } : {}),
        };
        impacts.push(impact);
        if (slotId) hits.push({ token, slotId, impact });
      }
      hits.sort((first, second) => first.token.id - second.token.id || first.slotId.localeCompare(second.slotId));
      for (const hit of hits) {
        const previousHits = this.result.hits;
        this.trigger(hit.token, hit.slotId);
        hit.impact.scored = this.result.hits > previousHits;
      }
      impacts.sort((first, second) => first.tokenId - second.tokenId
        || (first.slotId ?? 'wall').localeCompare(second.slotId ?? 'wall') || first.x - second.x || first.y - second.y);
      this.pendingImpacts.push(...impacts);
    });
    const seeded = random(config.seed);
    const token = this.createToken(lanePosition(config.lane) + (seeded() - 0.5) * 3, 38, money(config.baseValue));
    Matter.Body.setVelocity(token.body, { x: (seeded() - 0.5) * 0.3, y: 1 });
  }

  private createToken(x: number, y: number, value: number, parent?: Token): Token {
    const body = Matter.Bodies.circle(x, y, 7, {
      restitution: 0.67, friction: 0, frictionAir: 0.0008,
      inertia: Infinity, collisionFilter: { category: 2, mask: 1 },
    });
    const token: Token = {
      id: ++this.tokenCounter, body, value, depth: parent?.depth ?? 0,
      visited: new Set(parent?.visited), kinds: new Set(parent?.kinds),
      lastEffect: parent?.lastEffect ? { ...parent.lastEffect } : null,
      charge: 0, reserve: 0, stalled: 0,
    };
    this.tokens.set(body.id, token);
    Matter.Composite.add(this.engine.world, body);
    return token;
  }

  private emit(event: Omit<CascadeEvent, 'tick'>): void {
    const completeEvent = { ...event, tick: this.tick };
    this.pendingEvents.push(completeEvent);
    this.result.events.push(completeEvent);
  }

  private bank(token: Token, slotId: string, value: number, prefix = 'BANK'): void {
    const amount = money(value);
    const slot = SLOT_MAP[slotId];
    token.reserve = money(token.reserve + amount);
    this.result.banked += amount;
    this.result.total += amount;
    this.emit({ type: 'bank', x: slot.x, y: slot.y, label: `${prefix} +${amount}`, amount, tokenId: token.id, slotId, kind: this.config.board[slotId].kind });
  }

  private trigger(token: Token, slotId: string): void {
    const peg = this.config.board[slotId];
    if (!peg || token.visited.has(slotId)) return;
    token.visited.add(slotId);
    token.kinds.add(peg.kind);
    this.result.hits += 1;
    this.result.maxChain = Math.max(this.result.maxChain, token.visited.size);
    const slot = SLOT_MAP[slotId];
    const previous = token.value;
    const boosted = this.boostedSockets.has(slotId);
    if (boosted) token.value = money(token.value * 2);
    let label = '';
    if (peg.kind === 'mint') {
      const added = Math.round(this.config.baseValue * 1.4);
      token.value = money(token.value + added);
      const generated = peg.tuned ? 2 : 1;
      token.charge = Math.min(MAX_CHARGE, token.charge + generated);
      token.lastEffect = { operation: 'add', value: added };
      label = `+${added} / +${generated} CHARGE`;
    } else if (peg.kind === 'doubler') {
      if (token.charge > 0) {
        token.charge -= 1;
        token.value = money(token.value * 2);
        token.lastEffect = { operation: 'multiply', value: 2 };
        label = 'x2 / -1 CHARGE';
        if (peg.tuned) {
          const recipient = [...this.tokens.values()].find((other) => other.id !== token.id && other.charge < MAX_CHARGE);
          if (recipient) recipient.charge += 1;
        }
      } else { token.lastEffect = null; label = 'NEEDS CHARGE'; }
    } else if (peg.kind === 'splitter') {
      if (token.depth < MAX_SPLIT_DEPTH) {
        token.depth += 1;
        const clone = this.createToken(slot.x + peg.direction * 20, slot.y + 19, money(token.value * 0.75), token);
        clone.charge = Math.floor(token.charge / 2);
        token.charge -= clone.charge;
        if (peg.tuned) clone.charge = Math.min(MAX_CHARGE, clone.charge + 1);
        clone.reserve = Math.floor(token.reserve / 2);
        token.reserve -= clone.reserve;
        Matter.Body.setVelocity(clone.body, { x: peg.direction * 2.2, y: 1.8 });
        Matter.Body.setVelocity(token.body, { x: -peg.direction * 2.2, y: 1.4 });
        this.result.splits += 1;
        this.emit({ type: 'split', x: slot.x, y: slot.y, label: '+ TOKEN', amount: clone.value, tokenId: clone.id, slotId, kind: peg.kind });
        label = 'FORK';
      } else {
        token.charge = Math.min(MAX_CHARGE, token.charge + 1);
        label = '+1 CHARGE';
      }
    } else if (peg.kind === 'kicker') {
      Matter.Body.setVelocity(token.body, { x: peg.direction * 3.7, y: -3.2 });
      token.value = money(token.value + this.config.baseValue);
      token.charge = Math.min(MAX_CHARGE, token.charge + 1);
      label = peg.direction === 1 ? 'RIGHT / +1 CHARGE' : 'LEFT / +1 CHARGE';
      if (peg.tuned) this.bank(token, slotId, this.config.baseValue, 'TOLL');
    } else if (peg.kind === 'relay') {
      const neighbors = SLOTS.filter((neighbor) => neighbor.id !== slotId && this.config.board[neighbor.id]
        && Math.hypot(neighbor.x - slot.x, neighbor.y - slot.y) < 78).length;
      const added = money(this.config.baseValue * (1 + neighbors));
      token.value = money(token.value + added);
      const generated = 1 + (peg.tuned ? Math.floor(neighbors / 2) : 0);
      token.charge = Math.min(MAX_CHARGE, token.charge + generated);
      token.lastEffect = { operation: 'add', value: added };
      label = `+${added} / +${Math.min(MAX_CHARGE, generated)} CHARGE`;
    } else if (peg.kind === 'vault') {
      const deposit = money(token.value * (0.5 + token.charge * 0.25));
      token.charge = peg.tuned ? 1 : 0;
      this.bank(token, slotId, deposit);
      label = 'BANK';
    } else if (peg.kind === 'echo') {
      const effect = token.lastEffect;
      token.lastEffect = null;
      if (!effect) label = 'NO EFFECT';
      else if (effect.operation === 'multiply' && token.charge === 0) label = 'NEEDS CHARGE';
      else {
        if (effect.operation === 'multiply') token.charge -= 1;
        token.value = money(effect.operation === 'add' ? token.value + effect.value : token.value * effect.value);
        label = effect.operation === 'add' ? `ECHO +${effect.value}` : `ECHO x${effect.value}`;
        if (peg.tuned) token.charge = Math.min(MAX_CHARGE, token.charge + 1);
      }
    } else if (peg.kind === 'crown') {
      if (token.charge >= 2) {
        token.charge -= 2;
        const multiplier = 1 + token.kinds.size * 0.4;
        token.value = money(token.value * multiplier);
        label = `x${multiplier.toFixed(1)} / -2 CHARGE`;
        token.lastEffect = { operation: 'multiply', value: multiplier };
      } else {
        token.lastEffect = null;
        label = 'NEEDS 2 CHARGE';
        if (peg.tuned) { this.bank(token, slotId, this.config.baseValue * token.kinds.size, 'INSURE'); label = 'INSURED'; }
      }
    } else if (peg.kind === 'dividend') {
      const reserve = token.reserve;
      token.reserve = 0;
      token.value = money(token.value + reserve * 2);
      if (peg.tuned && reserve > 0) token.charge = Math.min(MAX_CHARGE, token.charge + 2);
      label = reserve > 0 ? `CASH +${money(reserve * 2)}` : 'NO RESERVE';
    } else if (peg.kind === 'junction') {
      let junction = this.junctions.get(slotId);
      if (!junction) {
        junction = { arrivals: new Set(), firstValue: token.value };
        this.junctions.set(slotId, junction);
      }
      junction.arrivals.add(token.id);
      token.charge = Math.min(MAX_CHARGE, token.charge + 1);
      if (junction.arrivals.size === 2) this.bank(token, slotId, junction.firstValue + token.value, 'JOIN');
      else if (peg.tuned && junction.arrivals.size > 2) this.bank(token, slotId, token.value, 'EXCHANGE');
      label = `${junction.arrivals.size} ARRIVAL${junction.arrivals.size === 1 ? '' : 'S'} / +1 CHARGE`;
    }
    if (boosted) label = `SOCKET x2 / ${label}`;
    this.result.maxValue = Math.max(this.result.maxValue, token.value);
    this.emit({ type: 'hit', x: slot.x, y: slot.y, label, amount: token.value - previous, tokenId: token.id, slotId, kind: peg.kind, charge: token.charge });
  }

  private collect(token: Token): void {
    const tray = token.body.position.x < 185 ? 0 : token.body.position.x > 315 ? 2 : 1;
    const payout = money(token.value * TRAY_MULTIPLIERS[tray]);
    this.result.trayTotals[tray] += payout;
    this.result.total += payout;
    this.result.maxValue = Math.max(this.result.maxValue, token.value);
    this.emit({ type: 'payout', x: token.body.position.x, y: 596, label: `+${payout}`, amount: payout, tokenId: token.id, tray });
    Matter.Composite.remove(this.engine.world, token.body);
    this.tokens.delete(token.body.id);
  }

  step(steps = 1): CascadeEvent[] {
    this.pendingEvents = [];
    this.pendingImpacts = [];
    for (let iteration = 0; iteration < steps && !this.complete; iteration += 1) {
      this.tick += 1;
      Matter.Engine.update(this.engine, FIXED_STEP);
      for (const token of [...this.tokens.values()]) {
        const speed = Math.hypot(token.body.velocity.x, token.body.velocity.y);
        token.stalled = speed < 0.22 ? token.stalled + 1 : 0;
        if (token.stalled > 25) {
          Matter.Body.setVelocity(token.body, { x: token.id % 2 ? 0.6 : -0.6, y: 0.2 });
          token.stalled = 0;
        }
        if (token.body.position.y > 590 || this.tick >= MAX_TICKS) this.collect(token);
      }
      if (this.tokens.size === 0) {
        this.complete = true;
        this.result.ticks = this.tick;
        this.result.timedOut = this.tick >= MAX_TICKS;
      }
    }
    return this.pendingEvents;
  }

  drainImpacts(): PhysicalImpact[] {
    const impacts = this.pendingImpacts;
    this.pendingImpacts = [];
    return impacts;
  }

  get done(): boolean { return this.complete; }
  get elapsedTicks(): number { return this.tick; }
  get payout(): number { return this.result.total; }
  get tokenViews(): TokenView[] {
    return [...this.tokens.values()].map((token) => ({
      id: token.id, x: token.body.position.x, y: token.body.position.y,
      value: token.value, chain: token.visited.size, depth: token.depth, charge: token.charge,
    }));
  }

  finish(): DropResult {
    while (!this.complete) this.step(120);
    return structuredClone(this.result);
  }

  dispose(): void {
    Matter.Events.off(this.engine, 'collisionStart');
    Matter.Composite.clear(this.engine.world, false);
    Matter.Engine.clear(this.engine);
    this.tokens.clear();
    this.junctions.clear();
    this.pendingImpacts = [];
  }
}

export function simulateDrop(config: DropConfig, options: SimulationOptions = {}): DropResult {
  const simulation = new DropSimulation(config, options);
  const result = simulation.finish();
  simulation.dispose();
  return result;
}