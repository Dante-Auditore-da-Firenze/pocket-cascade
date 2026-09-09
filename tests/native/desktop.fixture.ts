import { _electron as electron, expect, test as base, type ElectronApplication, type Page } from '@playwright/test';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PocketDesktop } from '../../electron/desktop-api';

export type DesktopWindow = Window & { pocketDesktop: PocketDesktop };

export const APP_ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const BUILT_INDEX = path.join(APP_ROOT, 'dist', 'index.html');
export const SAVE_FILENAME = 'pocket-cascade-save.json';

export interface RunningGame {
  app: ElectronApplication;
  page: Page;
  isClosed(): boolean;
  close(): Promise<void>;
}

interface NativeDesktop {
  game: RunningGame;
  dataDirectory: string;
  launch(): Promise<RunningGame>;
}

export async function readNativeSave(page: Page) {
  return page.evaluate(() => (window as DesktopWindow).pocketDesktop.readSave());
}

export const test = base.extend<{ desktop: NativeDesktop }>({
  desktop: async ({}, use) => {
    await access(BUILT_INDEX).catch(() => {
      throw new Error('Build the renderer with npm run build before running native Electron tests.');
    });

    const dataDirectory = await mkdtemp(path.join(tmpdir(), 'pocket-cascade-native-'));
    const games: RunningGame[] = [];
    const environment = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
    for (const name of ['POCKET_CASCADE_DEV_URL', 'ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS']) delete environment[name];
    environment.POCKET_CASCADE_DATA_DIR = dataDirectory;
    environment.POCKET_CASCADE_STEAM_APP_ID = '0';

    async function launch(): Promise<RunningGame> {
      const app = await electron.launch({ args: [APP_ROOT], cwd: APP_ROOT, env: environment, timeout: 30_000 });
      let closed = false;
      app.once('close', () => { closed = true; });
      const close = async () => {
        if (!closed) await app.close();
      };

      try {
        const page = await app.firstWindow();
        const game = { app, page, isClosed: () => closed, close };
        games.push(game);
        await page.waitForURL(pathToFileURL(BUILT_INDEX).href, { waitUntil: 'load' });
        await expect(page.getByRole('button', { name: 'Launch token', exact: true })).toBeVisible();
        await expect.poll(async () => {
          const saved = await readNativeSave(page);
          if (saved.error && saved.data === null) throw new Error(saved.error);
          return saved.data !== null;
        }, { message: 'The renderer must finish native save initialization and persist its initial version-1 save.' }).toBe(true);
        return game;
      } catch (error) {
        await close();
        throw error;
      }
    }

    try {
      const game = await launch();
      await expect.poll(() => game.app.evaluate(({ BrowserWindow }) => {
        const window = BrowserWindow.getAllWindows()[0];
        return { fullscreen: window.isFullScreen(), visible: window.isVisible() };
      }), { message: 'A fresh native save must start in visible fullscreen.' }).toEqual({ fullscreen: true, visible: true });
      await use({ game, dataDirectory, launch });
    } finally {
      for (const game of games) await game.close();
      await rm(dataDirectory, { recursive: true, force: true });
    }
  },
});

export { expect };