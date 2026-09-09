import { describe, expect, it } from 'vitest';
import {
  createGamepadState, DIRECTION_REPEAT_DELAY, DIRECTION_REPEAT_INTERVAL, GAMEPAD_BUTTONS,
  pollGamepad, STICK_DEADZONE, STICK_RELEASE_DEADZONE,
  type GamepadSnapshot,
} from '../src/input/gamepad';

function controller(pressed: number[] = [], axes: number[] = [0, 0]): GamepadSnapshot {
  return {
    id: 'Test standard controller', index: 0, connected: true, mapping: 'standard', axes,
    buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: pressed.includes(index), value: pressed.includes(index) ? 1 : 0 })),
  };
}

describe('gamepad input', () => {
  it('ignores stick drift and uses a release deadzone to debounce threshold jitter', () => {
    const neutral = pollGamepad(createGamepadState(), controller([], [STICK_DEADZONE, 0]), 0);
    expect(neutral.intents).toEqual([]);
    const pressed = pollGamepad(neutral.state, controller([], [0.7, 0.1]), 10);
    expect(pressed.intents).toEqual([{ type: 'direction', direction: 'right' }]);
    const jitter = pollGamepad(pressed.state, controller([], [STICK_DEADZONE - 0.02, 0]), 20);
    expect(jitter.state.direction).toBe('right');
    expect(jitter.intents).toEqual([]);
    const released = pollGamepad(jitter.state, controller([], [STICK_RELEASE_DEADZONE, 0]), 30);
    expect(released.state.direction).toBeNull();
    expect(pollGamepad(released.state, controller([], [0.7, 0]), 40).intents).toEqual([{ type: 'direction', direction: 'right' }]);
  });

  it.each([
    { axes: [-0.9, 0.2], direction: 'left' },
    { axes: [0.2, -0.9], direction: 'up' },
    { axes: [0.1, 0.9], direction: 'down' },
  ])('uses the dominant left-stick axis for $direction', ({ axes, direction }) => {
    expect(pollGamepad(createGamepadState(), controller([], axes), 0).intents).toEqual([{ type: 'direction', direction }]);
  });

  it.each(['activate', 'back', 'rotate', 'launch', 'previous', 'next', 'menu'] as const)('emits %s only on a press edge', (action) => {
    const held = controller([GAMEPAD_BUTTONS[action]]);
    const first = pollGamepad(createGamepadState(), held, 0);
    expect(first.intents).toEqual([{ type: 'action', action }]);
    const repeated = pollGamepad(first.state, held, 5000);
    expect(repeated.intents).toEqual([]);
    const released = pollGamepad(repeated.state, controller(), 5040);
    expect(pollGamepad(released.state, held, 5080).intents).toEqual([{ type: 'action', action }]);
  });

  it.each(['dpad', 'stick'])('repeats held %s directions after 350 ms, then every 140 ms without catch-up bursts', (source) => {
    const held = source === 'dpad' ? controller([GAMEPAD_BUTTONS.down]) : controller([], [0, 0.8]);
    const initial = pollGamepad(createGamepadState(), held, 0);
    expect(initial.intents).toEqual([{ type: 'direction', direction: 'down' }]);
    const early = pollGamepad(initial.state, held, DIRECTION_REPEAT_DELAY - 1);
    expect(early.intents).toEqual([]);
    const repeat = pollGamepad(early.state, held, DIRECTION_REPEAT_DELAY);
    expect(repeat.intents).toEqual(initial.intents);
    const between = pollGamepad(repeat.state, held, DIRECTION_REPEAT_DELAY + DIRECTION_REPEAT_INTERVAL - 1);
    expect(between.intents).toEqual([]);
    const second = pollGamepad(between.state, held, DIRECTION_REPEAT_DELAY + DIRECTION_REPEAT_INTERVAL);
    expect(second.intents).toEqual(initial.intents);
    const delayed = pollGamepad(second.state, held, 10_000);
    expect(delayed.intents).toEqual(initial.intents);
    expect(pollGamepad(delayed.state, held, 10_001).intents).toEqual([]);
  });

  it('restarts the delay on direction changes and prefers the dpad over the stick', () => {
    const left = pollGamepad(createGamepadState(), controller([GAMEPAD_BUTTONS.left]), 0);
    const right = pollGamepad(left.state, controller([GAMEPAD_BUTTONS.right], [-0.8, 0]), 100);
    expect(right.intents).toEqual([{ type: 'direction', direction: 'right' }]);
    expect(right.state.repeatAt).toBe(100 + DIRECTION_REPEAT_DELAY);
    const canceled = pollGamepad(createGamepadState(), controller([GAMEPAD_BUTTONS.left, GAMEPAD_BUTTONS.right]), 0);
    expect(canceled.intents).toEqual([]);
  });

  it('resets held buttons and timers on disconnect or a replacement controller', () => {
    const held = controller([GAMEPAD_BUTTONS.launch, GAMEPAD_BUTTONS.right]);
    const before = pollGamepad(createGamepadState(), held, 0);
    const disconnected = pollGamepad(before.state, { ...held, connected: false }, 100);
    expect(disconnected).toEqual({ state: createGamepadState(), intents: [] });
    expect(pollGamepad(before.state, null, 100)).toEqual(disconnected);
    expect(pollGamepad(disconnected.state, held, 150).intents).toEqual(before.intents);
    expect(pollGamepad(before.state, { ...held, id: 'Replacement controller' }, 150).intents).toEqual(before.intents);
  });

  it('does not replay background button presses or accumulated navigation when resumed', () => {
    const held = controller([GAMEPAD_BUTTONS.activate, GAMEPAD_BUTTONS.down]);
    const background = pollGamepad(createGamepadState(), held, 0, false);
    expect(background.intents).toEqual([]);
    const resumed = pollGamepad(background.state, held, 5000);
    expect(resumed.intents).toEqual([]);
    expect(pollGamepad(resumed.state, held, 5001).intents).toEqual([]);
    expect(pollGamepad(resumed.state, held, 5350).intents).toEqual([{ type: 'direction', direction: 'down' }]);
    const released = pollGamepad(resumed.state, controller(), 5040);
    expect(pollGamepad(released.state, held, 5080).intents).toEqual([
      { type: 'action', action: 'activate' }, { type: 'direction', direction: 'down' },
    ]);
  });

  it('keeps background suspension when the API returns no controller or a replacement connects', () => {
    const held = controller([GAMEPAD_BUTTONS.launch, GAMEPAD_BUTTONS.right]);
    const hidden = pollGamepad(createGamepadState(), null, 0, false);
    expect(hidden.state.suspended).toBe(true);
    const unavailable = pollGamepad(hidden.state, null, 1000);
    expect(unavailable.intents).toEqual([]);
    const resumed = pollGamepad(unavailable.state, held, 2000);
    expect(resumed.intents).toEqual([]);
    expect(pollGamepad(resumed.state, held, 2001).intents).toEqual([]);
    expect(pollGamepad(resumed.state, held, 2350).intents).toEqual([{ type: 'direction', direction: 'right' }]);
    const released = pollGamepad(resumed.state, controller(), 2040);
    expect(pollGamepad(released.state, held, 2080).intents).toEqual([
      { type: 'action', action: 'launch' }, { type: 'direction', direction: 'right' },
    ]);
    const beforeReplacement = pollGamepad(createGamepadState(), held, 0, false);
    expect(pollGamepad(beforeReplacement.state, { ...held, index: 1 }, 5000).intents).toEqual([]);
  });

  it('ignores nonstandard mappings and safely handles incomplete samples without mutating input state', () => {
    const original = createGamepadState();
    const sample = controller([GAMEPAD_BUTTONS.activate]);
    expect(pollGamepad(original, { ...sample, mapping: '' }, 0)).toEqual({ state: original, intents: [] });
    const incomplete = { ...sample, axes: [NaN, Infinity], buttons: [] };
    expect(pollGamepad(original, incomplete, 0).intents).toEqual([]);
    pollGamepad(original, sample, 0);
    expect(original).toEqual(createGamepadState());
    expect(sample.buttons[0].pressed).toBe(true);
  });
});