import type { PocketDesktop } from '../electron/desktop-api';

declare global {
  interface Window {
    pocketDesktop?: PocketDesktop;
  }
}

export {};