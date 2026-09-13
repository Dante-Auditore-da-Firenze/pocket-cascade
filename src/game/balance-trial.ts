import { commission, type RunState } from './engine';
import type { Commission } from './content';
import type { SimulationOptions } from './simulation';

const SLOW_CAPACITIES = [7, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 11] as const;
const BONUS_SOCKETS = ['3-0', '3-5', '5-2'] as const;
const PRESSURE_TARGETS = [100, 300, 550, 1000, 1800, 3200, 5800, 10400, 18700, 33700, 60600, 109100] as const;

export const BALANCE_TRIALS = ['baseline', 'space', 'sockets', 'space-sockets', 'checkpoints', 'pressure', 'space-pressure', 'space-sockets-pressure', 'checkpoints-pressure'] as const;
export type BalanceTrial = typeof BALANCE_TRIALS[number];

export function trialCapacity(run: Pick<RunState, 'stage' | 'assisted'>, trial: BalanceTrial): number {
  const capacity = commission(run).capacity;
  if (trial === 'space' || trial === 'space-sockets' || trial === 'space-pressure' || trial === 'space-sockets-pressure') return Math.min(capacity, SLOW_CAPACITIES[run.stage] ?? 11);
  if (trial === 'checkpoints' || trial === 'checkpoints-pressure') return ({ 5: 7, 8: 8, 11: 9 } as Record<number, number>)[run.stage] ?? capacity;
  return capacity;
}

export function trialSimulationOptions(trial: BalanceTrial): SimulationOptions {
  return trial === 'sockets' || trial === 'space-sockets' || trial === 'space-sockets-pressure' ? { boostedSockets: BONUS_SOCKETS } : {};
}

export function trialCommission(run: Pick<RunState, 'stage' | 'assisted'>, trial: BalanceTrial): Commission {
  const definition = { ...commission(run), capacity: trialCapacity(run, trial) };
  if (trial === 'pressure' || trial === 'space-pressure' || trial === 'space-sockets-pressure' || trial === 'checkpoints-pressure') {
    const target = PRESSURE_TARGETS[run.stage] ?? Math.min(1_000_000_000, Math.round(109100 * 1.38 ** (run.stage - 11)));
    return { ...definition, target: Math.round(target * (run.assisted ? 0.65 : 1)) };
  }
  return definition;
}