import { useEffect, useRef, useState } from 'react';
import { createGamepadState, pollGamepad, type GamepadSnapshot } from './gamepad';
import { handleControlInput } from './navigation';

export interface GamepadNavigationActions {
  onMenu: () => void;
  onBack: () => void;
  onLaunch: () => void;
  onRotate: () => void;
  onActivity?: () => void;
}

export interface GamepadStatus {
  supported: boolean;
  connected: boolean;
  name: string | null;
  label: string;
}

function detectionStatus(gamepad: GamepadSnapshot | null, supported: boolean): GamepadStatus {
  return {
    supported,
    connected: gamepad !== null,
    name: gamepad?.id ?? null,
    label: gamepad ? 'Controller detected' : supported ? 'No standard controller detected' : 'Controller input unavailable',
  };
}

export function useGamepadNavigation(actions: GamepadNavigationActions): GamepadStatus {
  const callbacks = useRef(actions);
  callbacks.current = actions;
  const [status, setStatus] = useState(() => detectionStatus(null, typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'));

  useEffect(() => {
    if (typeof navigator.getGamepads !== 'function') return;
    let mounted = true;
    let animationFrame = 0;
    let inputState = createGamepadState();
    let detected = detectionStatus(null, true);
    const previousInput = document.documentElement.dataset.input;

    const publish = (gamepad: GamepadSnapshot | null, supported: boolean) => {
      const next = detectionStatus(gamepad, supported);
      if (next.supported !== detected.supported || next.connected !== detected.connected || next.name !== detected.name) {
        detected = next;
        setStatus(next);
      }
    };

    const suspend = () => {
      inputState = { ...inputState, suspended: true, direction: null, stick: null, repeatAt: 0 };
    };

    const disconnect = (event: GamepadEvent) => {
      if (`${event.gamepad?.index}:${event.gamepad?.id}` !== inputState.device) return;
      inputState = { ...createGamepadState(), suspended: inputState.suspended || document.hidden || !document.hasFocus() };
      publish(null, true);
    };

    const tick = (timestamp: number) => {
      if (!mounted) return;
      let gamepad: Gamepad | null = null;
      let supported = true;
      try {
        const available = Array.from(navigator.getGamepads()).filter((candidate): candidate is Gamepad => Boolean(candidate?.connected && candidate.mapping === 'standard'));
        gamepad = available.find((candidate) => `${candidate.index}:${candidate.id}` === inputState.device) ?? available[0] ?? null;
      } catch {
        supported = false;
      }
      const frame = pollGamepad(inputState, gamepad, timestamp, !document.hidden && document.hasFocus());
      inputState = frame.state;
      publish(gamepad, supported);
      if (frame.intents.length > 0) {
        document.documentElement.dataset.input = 'gamepad';
        callbacks.current.onActivity?.();
        for (const intent of frame.intents) {
          if (intent.type === 'direction') handleControlInput(document, intent.direction);
          else if (intent.action === 'menu') { callbacks.current.onMenu(); break; }
          else if (intent.action === 'back') { callbacks.current.onBack(); break; }
          else if (intent.action === 'launch') { callbacks.current.onLaunch(); break; }
          else if (intent.action === 'rotate') { callbacks.current.onRotate(); break; }
          else handleControlInput(document, intent.action);
        }
      }
      if (mounted) animationFrame = requestAnimationFrame(tick);
    };

    window.addEventListener('blur', suspend);
    window.addEventListener('pagehide', suspend);
    document.addEventListener('visibilitychange', suspend);
    window.addEventListener('gamepaddisconnected', disconnect);
    animationFrame = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('blur', suspend);
      window.removeEventListener('pagehide', suspend);
      document.removeEventListener('visibilitychange', suspend);
      window.removeEventListener('gamepaddisconnected', disconnect);
      inputState = createGamepadState();
      if (document.documentElement.dataset.input === 'gamepad') {
        if (previousInput === undefined) delete document.documentElement.dataset.input;
        else document.documentElement.dataset.input = previousInput;
      }
    };
  }, []);

  return status;
}