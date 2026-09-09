import Matter from 'matter-js';
import {
  BOARD_HEIGHT, BOARD_WIDTH, FIXED_STEP, MAX_SPLIT_DEPTH, MAX_TICKS,
  SLOT_MAP, SLOTS, TRAY_MULTIPLIERS, lanePosition, money, random,
  type CascadeEvent, type DropConfig, type DropResult, type PegKind, type PhysicalImpact, type TokenView,
} from './model';

interface Token {
  id: number;
  body: Matter.Body;
  value: number;
  depth: number;
  visited: Set<string>;
  kinds: Set<PegKind>;
  lastEffect: { operation: 'add' | 'multiply'; value: number } | null;
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
  private result: DropResult = {
    total: 0, banked: 0, trayTotals: [0, 0, 0], hits: 0, splits: 0,
    maxValue: 0, maxChain: 0, ticks: 0, timedOut: false, events: [],
  };

  constructor(private config: DropConfig) {
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
      lastEffect: parent?.lastEffect ? { ...parent.lastEffect } : null, stalled: 0,
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

  private trigger(token: Token, slotId: string): void {
    const peg = this.config.board[slotId];
    if (!peg || token.visited.has(slotId)) return;
    token.visited.add(slotId);
    token.kinds.add(peg.kind);
    this.result.hits += 1;
    this.result.maxChain = Math.max(this.result.maxChain, token.visited.size);
    const slot = SLOT_MAP[slotId];
    const previous = token.value;
    let label = '';
    if (peg.kind === 'mint') {
      const added = Math.round(this.config.baseValue * 1.4);
      token.value = money(token.value + added);
      token.lastEffect = { operation: 'add', value: added };
      label = `+${added}`;
    } else if (peg.kind === 'doubler') {
      token.value = money(token.value * 2);
      token.lastEffect = { operation: 'multiply', value: 2 };
      label = 'x2';
    } else if (peg.kind === 'splitter') {
      if (token.depth < MAX_SPLIT_DEPTH) {
        token.depth += 1;
        const clone = this.createToken(slot.x + peg.direction * 20, slot.y + 19, money(token.value * 0.75), token);
        Matter.Body.setVelocity(clone.body, { x: peg.direction * 2.2, y: 1.8 });
        Matter.Body.setVelocity(token.body, { x: -peg.direction * 2.2, y: 1.4 });
        this.result.splits += 1;
        this.emit({ type: 'split', x: slot.x, y: slot.y, label: '+ TOKEN', amount: clone.value, tokenId: clone.id, slotId, kind: peg.kind });
        label = 'FORK';
      } else {
        token.value = money(token.value * 1.25);
        label = 'x1.25';
      }
    } else if (peg.kind === 'kicker') {
      Matter.Body.setVelocity(token.body, { x: peg.direction * 3.7, y: -3.2 });
      token.value = money(token.value + this.config.baseValue);
      label = peg.direction === 1 ? 'RIGHT +' : 'LEFT +';
    } else if (peg.kind === 'relay') {
      const neighbors = SLOTS.filter((neighbor) => neighbor.id !== slotId && this.config.board[neighbor.id]
        && Math.hypot(neighbor.x - slot.x, neighbor.y - slot.y) < 78).length;
      const added = money(this.config.baseValue * (1 + neighbors));
      token.value = money(token.value + added);
      token.lastEffect = { operation: 'add', value: added };
      label = `+${added}`;
    } else if (peg.kind === 'vault') {
      const deposit = money(token.value * 0.5);
      this.result.banked += deposit;
      this.result.total += deposit;
      this.emit({ type: 'bank', x: slot.x, y: slot.y, label: `BANK +${deposit}`, amount: deposit, tokenId: token.id, slotId, kind: peg.kind });
      label = 'BANK';
    } else if (peg.kind === 'echo') {
      const effect = token.lastEffect ?? { operation: 'add' as const, value: this.config.baseValue };
      token.value = money(effect.operation === 'add' ? token.value + effect.value : token.value * effect.value);
      label = effect.operation === 'add' ? `ECHO +${effect.value}` : `ECHO x${effect.value}`;
    } else if (peg.kind === 'crown') {
      const multiplier = 1 + token.kinds.size * 0.4;
      token.value = money(token.value * multiplier);
      label = `x${multiplier.toFixed(1)}`;
      token.lastEffect = { operation: 'multiply', value: multiplier };
    }
    this.result.maxValue = Math.max(this.result.maxValue, token.value);
    this.emit({ type: 'hit', x: slot.x, y: slot.y, label, amount: token.value - previous, tokenId: token.id, slotId, kind: peg.kind });
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
      value: token.value, chain: token.visited.size, depth: token.depth,
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
    this.pendingImpacts = [];
  }
}

export function simulateDrop(config: DropConfig): DropResult {
  const simulation = new DropSimulation(config);
  const result = simulation.finish();
  simulation.dispose();
  return result;
}