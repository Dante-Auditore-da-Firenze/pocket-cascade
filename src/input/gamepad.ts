export const GAMEPAD_BUTTONS = {
  activate: 0,
  back: 1,
  rotate: 2,
  launch: 3,
  previous: 4,
  next: 5,
  menu: 9,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
} as const;

export const STICK_DEADZONE = 0.35;
export const STICK_RELEASE_DEADZONE = 0.25;
export const DIRECTION_REPEAT_DELAY = 350;
export const DIRECTION_REPEAT_INTERVAL = 140;

export type Direction = 'up' | 'down' | 'left' | 'right';
export type GamepadAction = 'activate' | 'back' | 'rotate' | 'launch' | 'previous' | 'next' | 'menu';
export type GamepadIntent = { type: 'action'; action: GamepadAction } | { type: 'direction'; direction: Direction };

export interface GamepadSnapshot {
  readonly id: string;
  readonly index: number;
  readonly connected: boolean;
  readonly mapping: string;
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
  readonly axes: readonly number[];
}

export interface GamepadInputState {
  readonly device: string | null;
  readonly buttons: readonly boolean[];
  readonly stick: Direction | null;
  readonly direction: Direction | null;
  readonly repeatAt: number;
  readonly suspended: boolean;
}

export interface GamepadFrame {
  state: GamepadInputState;
  intents: GamepadIntent[];
}

const actionNames: readonly GamepadAction[] = ['menu', 'back', 'rotate', 'launch', 'activate', 'previous', 'next'];

export function createGamepadState(): GamepadInputState {
  return { device: null, buttons: [], stick: null, direction: null, repeatAt: 0, suspended: false };
}

function stickDirection(axes: readonly number[], previous: Direction | null): Direction | null {
  const horizontal = Number.isFinite(axes[0]) ? axes[0] : 0;
  const vertical = Number.isFinite(axes[1]) ? axes[1] : 0;
  const magnitude = Math.max(Math.abs(horizontal), Math.abs(vertical));
  const direction = Math.abs(horizontal) > Math.abs(vertical)
    ? horizontal < 0 ? 'left' : 'right'
    : vertical < 0 ? 'up' : 'down';
  const threshold = direction === previous ? STICK_RELEASE_DEADZONE : STICK_DEADZONE;
  return magnitude > threshold ? direction : null;
}

function padDirection(buttons: readonly boolean[]): Direction | null {
  const horizontal = Number(buttons[GAMEPAD_BUTTONS.right]) - Number(buttons[GAMEPAD_BUTTONS.left]);
  const vertical = Number(buttons[GAMEPAD_BUTTONS.down]) - Number(buttons[GAMEPAD_BUTTONS.up]);
  if (vertical !== 0) return vertical < 0 ? 'up' : 'down';
  if (horizontal !== 0) return horizontal < 0 ? 'left' : 'right';
  return null;
}

export function pollGamepad(
  previous: GamepadInputState,
  gamepad: GamepadSnapshot | null | undefined,
  timestamp: number,
  active = true,
): GamepadFrame {
  if (!gamepad?.connected || gamepad.mapping !== 'standard') {
    return { state: { ...createGamepadState(), suspended: !active || previous.suspended }, intents: [] };
  }

  const device = `${gamepad.index}:${gamepad.id}`;
  const baseline = previous.device === device ? previous : { ...createGamepadState(), suspended: previous.suspended };
  const buttons = Array.from({ length: 17 }, (_, index) => {
    const button = gamepad.buttons[index];
    return Boolean(button?.pressed || button?.value > 0.5);
  });
  const stick = stickDirection(gamepad.axes, baseline.stick);
  const direction = padDirection(buttons) ?? stick;
  const intents: GamepadIntent[] = [];
  let repeatAt = baseline.repeatAt;

  if (!active || baseline.suspended) {
    return {
      state: { device, buttons, stick, direction, repeatAt: timestamp + DIRECTION_REPEAT_DELAY, suspended: !active },
      intents,
    };
  }

  for (const action of actionNames) {
    const index = GAMEPAD_BUTTONS[action];
    if (buttons[index] && !baseline.buttons[index]) intents.push({ type: 'action', action });
  }

  if (!direction) repeatAt = 0;
  else if (direction !== baseline.direction) {
    intents.push({ type: 'direction', direction });
    repeatAt = timestamp + DIRECTION_REPEAT_DELAY;
  } else if (timestamp >= repeatAt) {
    intents.push({ type: 'direction', direction });
    repeatAt = timestamp + DIRECTION_REPEAT_INTERVAL;
  }

  return { state: { device, buttons, stick, direction, repeatAt, suspended: false }, intents };
}