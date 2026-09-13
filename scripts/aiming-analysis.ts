import { dropConfig, type RunState } from '../src/game/engine';
import { TRAY_MULTIPLIERS } from '../src/game/model';
import { simulateDrop } from '../src/game/simulation';

export function inspectAimLanes(run: RunState) {
  const config = dropConfig(run);
  const lanes = Array.from({ length: 9 }, (_, lane) => {
    const result = simulateDrop({ ...config, lane });
    const arrivals = TRAY_MULTIPLIERS.map((_, tray) => result.events.filter((event) => event.type === 'payout' && event.tray === tray).length);
    return {
      lane, payout: result.total, banked: result.banked, collectors: result.trayTotals,
      arrivals, centerArrivals: arrivals[1], centerPayout: result.trayTotals[1],
      maxTokens: result.splits + 1, timedOut: result.timedOut,
    };
  });
  const current = lanes[run.lane];
  const centered = lanes[4];
  const best = lanes.reduce((chosen, lane) => lane.payout > chosen.payout ? lane : chosen, current);
  const centerRoutes = lanes.filter((lane) => lane.centerArrivals > 0);
  return {
    stage: run.stage + 1, seed: run.seed, current, centered, best, lanes,
    centerReachable: centerRoutes.length > 0,
    centerReachableLanes: centerRoutes.map((lane) => lane.lane),
    aimGainOverCenter: best.payout - centered.payout,
  };
}