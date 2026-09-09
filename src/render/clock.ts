import { FIXED_STEP } from '../game/model';

export const MAX_STEPS_PER_FRAME = 48;

export interface ClockFrame {
  steps: number;
  elapsed: number;
  interpolation: number;
}

export class PlaybackClock {
  private previousTime: number | null = null;
  private accumulator = 0;
  private speed: 1 | 2 | 4 = 1;
  private suspended = true;

  private accumulate(timestamp: number): void {
    const currentTime = Math.max(this.previousTime ?? timestamp, timestamp);
    if (this.previousTime !== null && !this.suspended) {
      this.accumulator += (currentTime - this.previousTime) * this.speed;
    }
    this.previousTime = currentTime;
  }

  setMode(timestamp: number, speed: 1 | 2 | 4, suspended: boolean): void {
    this.accumulate(timestamp);
    this.speed = speed;
    this.suspended = suspended;
  }

  reset(timestamp: number): void {
    this.accumulator = 0;
    this.previousTime = timestamp;
  }

  retainSteps(steps: number): void {
    this.accumulator += Math.max(0, Math.floor(steps)) * FIXED_STEP;
  }

  advance(timestamp: number): ClockFrame {
    this.accumulate(timestamp);
    const steps = this.suspended ? 0 : Math.min(
      MAX_STEPS_PER_FRAME,
      Math.floor((this.accumulator + 1e-7) / FIXED_STEP),
    );
    const elapsed = steps * FIXED_STEP;
    this.accumulator = Math.max(0, this.accumulator - elapsed);
    return {
      steps,
      elapsed,
      interpolation: Math.min(1, this.accumulator / FIXED_STEP),
    };
  }

  get pendingMilliseconds(): number {
    return this.accumulator;
  }
}