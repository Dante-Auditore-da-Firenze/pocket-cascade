import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import packageMetadata from '../../package.json' with { type: 'json' };
import { dropConfig, type RunState } from '../../src/game/engine';
import { PARTS } from '../../src/game/content';
import { simulateDrop } from '../../src/game/simulation';
import {
  BUILT_INDEX, SAVE_FILENAME, expect, readNativeSave, test, type DesktopWindow,
} from './desktop.fixture';

test('loads the built game with only the seven sandboxed desktop API methods', async ({ desktop }) => {
  const { app, page } = desktop.game;
  expect(page.url()).toBe(pathToFileURL(BUILT_INDEX).href);
  expect(await app.evaluate(({ app }) => app.getPath('userData'))).toBe(desktop.dataDirectory);
  const capabilities = await page.evaluate(() => ({
    names: Object.keys((window as DesktopWindow).pocketDesktop).sort(),
    frozen: Object.isFrozen((window as DesktopWindow).pocketDesktop),
    require: typeof Reflect.get(window, 'require'),
    process: typeof Reflect.get(window, 'process'),
    ipcRenderer: typeof Reflect.get(window, 'ipcRenderer'),
  }));
  expect(capabilities).toEqual({
    names: ['exportSave', 'getStatus', 'quit', 'readSave', 'setFullscreen', 'unlockAchievement', 'writeSave'],
    frozen: true,
    require: 'undefined',
    process: 'undefined',
    ipcRenderer: 'undefined',
  });
  expect(await page.evaluate(() => (window as DesktopWindow).pocketDesktop.getStatus())).toEqual({
    platform: process.platform,
    version: packageMetadata.version,
    steam: false,
    steamError: expect.stringContaining('unconfigured'),
  });
  expect(await page.evaluate(() => (window as DesktopWindow).pocketDesktop.unlockAchievement('FIRST_CASCADE'))).toBe(false);
  expect(await page.evaluate(() => (window as DesktopWindow).pocketDesktop.unlockAchievement('NOT_A_GAME_ACHIEVEMENT'))).toBe(false);

  expect(await app.evaluate(({ BrowserWindow }) => {
    const contents = BrowserWindow.getAllWindows()[0].webContents;
    const preferences = Reflect.get(contents, 'getLastWebPreferences').call(contents) as import('electron').WebPreferences;
    return {
      sandbox: preferences.sandbox,
      contextIsolation: preferences.contextIsolation,
      nodeIntegration: preferences.nodeIntegration,
      nodeIntegrationInSubFrames: preferences.nodeIntegrationInSubFrames,
      webSecurity: preferences.webSecurity,
      webviewTag: preferences.webviewTag,
    };
  })).toEqual({
    sandbox: true, contextIsolation: true, nodeIntegration: false,
    nodeIntegrationInSubFrames: false, webSecurity: true, webviewTag: false,
  });
});

test('enforces production CSP and blocks navigation, popups, and files outside dist', async ({ desktop }) => {
  const { app, page } = desktop.game;
  await expect(page.locator('head > meta[http-equiv="Content-Security-Policy"]').first())
    .toHaveAttribute('content', /script-src 'self';/);
  await expect(page.locator('script').first()).toHaveAttribute('src', /(?:^|\/)theme\.js$/);
  expect(await page.evaluate(() => {
    Reflect.set(window, '__pocketCspProbe', false);
    const script = document.createElement('script');
    script.textContent = 'window.__pocketCspProbe = true;';
    document.head.append(script);
    script.remove();
    return Reflect.get(window, '__pocketCspProbe');
  })).toBe(false);

  expect(await page.evaluate(() => {
    const popup = window.open('https://example.invalid/');
    const link = document.createElement('a');
    link.href = 'https://example.invalid/';
    document.body.append(link);
    link.click();
    link.remove();
    return popup === null;
  })).toBe(true);
  expect(page.url()).toBe(pathToFileURL(BUILT_INDEX).href);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);

  const outsideURL = pathToFileURL(path.join(desktop.dataDirectory, SAVE_FILENAME)).href;
  expect(await page.evaluate(async (url) => {
    try {
      return (await fetch(url)).ok;
    } catch {
      return false;
    }
  }, outsideURL)).toBe(false);
});

test('starts borderless fullscreen and restores a usable native window through preload', async ({ desktop }) => {
  const { app, page } = desktop.game;
  const readWindow = () => app.evaluate(({ BrowserWindow, screen }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const bounds = window.getBounds();
    const display = screen.getDisplayMatching(bounds);
    return {
      fullscreen: window.isFullScreen(), bounds, contentBounds: window.getContentBounds(),
      resizable: window.isResizable(),
      display: { id: display.id, bounds: display.bounds, scaleFactor: display.scaleFactor },
    };
  });
  try {
    const initial = await readWindow();
    await expect.poll(readWindow).toMatchObject({
      fullscreen: true, bounds: initial.display.bounds, contentBounds: initial.display.bounds,
    });
    for (const fullscreen of [false, true, false]) {
      expect(await page.evaluate((value) => (window as DesktopWindow).pocketDesktop.setFullscreen(value), fullscreen)).toBe(fullscreen);
      await expect.poll(readWindow).toMatchObject({
        fullscreen, display: initial.display,
        ...(fullscreen ? { bounds: initial.display.bounds, contentBounds: initial.display.bounds } : { resizable: true }),
      });
      if (!fullscreen && process.platform === 'win32') {
        await expect.poll(async () => {
          const window = await readWindow();
          return window.bounds.height - window.contentBounds.height;
        }, { message: 'Windowed mode must restore the native title bar and window frame.' }).toBeGreaterThan(0);
      }
    }
  } finally {
    if (!desktop.game.isClosed()) await page.evaluate(() => (window as DesktopWindow).pocketDesktop.setFullscreen(false));
  }
});

test('restores saved windowed mode across a real Electron relaunch', async ({ desktop }) => {
  const initial = await readNativeSave(desktop.game.page);
  expect(initial.data).not.toBeNull();
  expect(initial.error).toBeUndefined();
  const checkpoint = JSON.parse(initial.data!);
  expect(checkpoint.settings.fullscreen).toBe(true);
  expect(checkpoint.settings.fullscreenPreferenceVersion).toBe(1);
  const windowed = { ...checkpoint, settings: { ...checkpoint.settings, fullscreen: false } };
  expect(await desktop.game.page.evaluate(() => (window as DesktopWindow).pocketDesktop.setFullscreen(false))).toBe(false);
  expect(await desktop.game.page.evaluate((json) => (window as DesktopWindow).pocketDesktop.writeSave(json), JSON.stringify(windowed)))
    .toEqual({ ok: true });
  await desktop.game.close();
  expect(JSON.parse(await readFile(path.join(desktop.dataDirectory, SAVE_FILENAME), 'utf8'))).toEqual(windowed);

  const relaunched = await desktop.launch();
  await expect.poll(() => relaunched.app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    return { fullscreen: window.isFullScreen(), visible: window.isVisible(), resizable: window.isResizable() };
  })).toEqual({ fullscreen: false, visible: true, resizable: true });
  const restored = await readNativeSave(relaunched.page);
  expect(restored.recovered).toBe(false);
  expect(restored.error).toBeUndefined();
  expect(restored.data).not.toBeNull();
  expect(JSON.parse(restored.data!)).toEqual(windowed);
});

test('migrates an unmarked false preference once and preserves a later windowed choice across relaunch', async ({ desktop }) => {
  const initial = await readNativeSave(desktop.game.page);
  expect(initial.data).not.toBeNull();
  expect(initial.recovered).toBe(false);
  expect(initial.error).toBeUndefined();
  const legacy = JSON.parse(initial.data!);
  expect(legacy.settings.fullscreenPreferenceVersion).toBe(1);
  delete legacy.settings.fullscreenPreferenceVersion;
  legacy.settings.fullscreen = false;
  const legacyJSON = JSON.stringify(legacy);
  expect(await desktop.game.page.evaluate((json) => (window as DesktopWindow).pocketDesktop.writeSave(json), legacyJSON))
    .toEqual({ ok: true });
  await desktop.game.close();
  expect(await readFile(path.join(desktop.dataDirectory, SAVE_FILENAME), 'utf8')).toBe(legacyJSON);

  const migratedGame = await desktop.launch();
  const migrated = { ...legacy, settings: { ...legacy.settings, fullscreen: true, fullscreenPreferenceVersion: 1 } };
  await expect.poll(async () => JSON.parse((await readNativeSave(migratedGame.page)).data!), {
    message: 'The renderer must persist the migration marker while preserving the entire run, credits, profile, and other settings.',
  }).toEqual(migrated);
  await expect.poll(() => migratedGame.app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    return { fullscreen: window.isFullScreen(), visible: window.isVisible() };
  })).toEqual({ fullscreen: true, visible: true });
  expect(JSON.parse(await readFile(path.join(desktop.dataDirectory, SAVE_FILENAME), 'utf8'))).toEqual(migrated);

  await migratedGame.page.getByRole('button', { name: 'Use windowed mode', exact: true }).click();
  await expect.poll(() => migratedGame.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen()))
    .toBe(false);
  const windowed = { ...migrated, settings: { ...migrated.settings, fullscreen: false } };
  await expect.poll(async () => JSON.parse((await readNativeSave(migratedGame.page)).data!)).toEqual(windowed);
  await migratedGame.close();
  expect(JSON.parse(await readFile(path.join(desktop.dataDirectory, SAVE_FILENAME), 'utf8'))).toEqual(windowed);

  const relaunched = await desktop.launch();
  await expect.poll(() => relaunched.app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    return { fullscreen: window.isFullScreen(), visible: window.isVisible(), resizable: window.isResizable() };
  })).toEqual({ fullscreen: false, visible: true, resizable: true });
  const restored = await readNativeSave(relaunched.page);
  expect(restored.recovered).toBe(false);
  expect(restored.error).toBeUndefined();
  expect(restored.data).not.toBeNull();
  expect(JSON.parse(restored.data!)).toEqual(windowed);
});

test('visible display controls and F11 persist the player choice without changing the run', async ({ desktop }) => {
  const { app, page } = desktop.game;
  const initial = JSON.parse((await readNativeSave(page)).data!);
  await page.getByRole('button', { name: 'Use windowed mode', exact: true }).click();
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(false);
  await expect.poll(async () => JSON.parse((await readNativeSave(page)).data!).settings.fullscreen).toBe(false);
  await page.keyboard.press('F11');
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(true);
  await expect.poll(async () => JSON.parse((await readNativeSave(page)).data!).settings.fullscreen).toBe(true);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Windowed', exact: true }).click();
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(false);
  await expect.poll(async () => JSON.parse((await readNativeSave(page)).data!).settings.fullscreen).toBe(false);
  expect(JSON.parse((await readNativeSave(page)).data!).run).toEqual(initial.run);
});

test('persists a renderer-produced save through close and a real Electron relaunch', async ({ desktop }) => {
  const initial = await readNativeSave(desktop.game.page);
  expect(initial.recovered).toBe(false);
  expect(initial.error).toBeUndefined();
  expect(initial.data).not.toBeNull();
  const checkpoint = JSON.parse(initial.data!);
  const formatted = `${JSON.stringify(checkpoint, null, 2)}\n`;
  expect(await desktop.game.page.evaluate((json) => (window as DesktopWindow).pocketDesktop.writeSave(json), formatted)).toEqual({ ok: true });
  await desktop.game.close();
  expect(await readFile(path.join(desktop.dataDirectory, SAVE_FILENAME), 'utf8')).toBe(formatted);

  const relaunched = await desktop.launch();
  const restored = await readNativeSave(relaunched.page);
  expect(restored.recovered).toBe(false);
  expect(restored.error).toBeUndefined();
  const restoredState = JSON.parse(restored.data!);
  expect(restoredState.version).toBe(1);
  expect(restoredState.run).toEqual(checkpoint.run);
  expect(restoredState.profile).toEqual(checkpoint.profile);
  expect(restoredState.settings).toEqual(checkpoint.settings);
});

test('exports the current save through Settings and the native dialog-backed API', async ({ desktop }) => {
  const { app, page } = desktop.game;
  const exportPath = path.join(desktop.dataDirectory, 'settings-export.json');
  type ExportDialogCall = { parented: boolean; options: import('electron').SaveDialogOptions | undefined };
  const documentsDirectory = await app.evaluate(({ app, BrowserWindow, dialog }, filePath) => {
    const probe = { original: dialog.showSaveDialog, calls: [] as ExportDialogCall[] };
    Reflect.set(dialog, '__pocketSaveExportProbe', probe);
    dialog.showSaveDialog = async (...args: unknown[]) => {
      probe.calls.push({
        parented: args[0] === BrowserWindow.getAllWindows()[0],
        options: args[1] as import('electron').SaveDialogOptions | undefined,
      });
      return { canceled: false, filePath };
    };
    return app.getPath('documents');
  }, exportPath);

  try {
    const settings = page.getByRole('button', { name: 'Settings', exact: true });
    await expect(settings).toBeVisible();
    await settings.click();
    const exportButton = page.getByRole('button', { name: 'Export save', exact: true });
    await expect(exportButton).toBeVisible();
    const current = await readNativeSave(page);
    expect(current.data).not.toBeNull();
    expect(current.error).toBeUndefined();
    const checkpoint = JSON.parse(current.data!);
    expect(checkpoint.version).toBe(1);
    await exportButton.click();

    await expect.poll(async () => {
      try {
        return JSON.parse(await readFile(exportPath, 'utf8')) as unknown;
      } catch (error) {
        if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    }, { message: 'The visible export action must write the complete current envelope to the confirmed native path.' })
      .toEqual(checkpoint);
    await expect(access(exportPath)).resolves.toBeUndefined();

    const calls = await app.evaluate(({ dialog }) => Reflect.get(dialog, '__pocketSaveExportProbe').calls as ExportDialogCall[]);
    expect(calls).toHaveLength(1);
    expect(calls[0].parented).toBe(true);
    expect(calls[0].options).toEqual({
      title: 'Export save',
      defaultPath: expect.any(String),
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['showOverwriteConfirmation'],
    });
    expect(path.dirname(calls[0].options!.defaultPath!)).toBe(documentsDirectory);
    expect(path.basename(calls[0].options!.defaultPath!)).toMatch(/^Pocket-Cascade-\d{4}-\d{2}-\d{2}\.json$/);
  } finally {
    if (!desktop.game.isClosed()) {
      await app.evaluate(({ dialog }) => {
        const probe = Reflect.get(dialog, '__pocketSaveExportProbe') as { original: typeof dialog.showSaveDialog };
        dialog.showSaveDialog = probe.original;
        Reflect.deleteProperty(dialog, '__pocketSaveExportProbe');
      });
    }
  }
});

test('quit drains outstanding preload writes and keeps the preceding valid backup', async ({ desktop }) => {
  const { app, page } = desktop.game;
  const current = await readNativeSave(page);
  expect(current.data).not.toBeNull();
  const source = current.data!;
  const closed = app.waitForEvent('close');
  const quit = page.evaluate((json) => {
    const api = (window as DesktopWindow).pocketDesktop;
    void api.writeSave(`${json}\n`);
    void api.writeSave(`${json}\n\n`);
    api.quit();
  }, source).catch((error: unknown) => {
    if (!/closed|context was destroyed/i.test(String(error))) throw error;
  });
  await Promise.all([closed, quit]);
  expect(await readFile(path.join(desktop.dataDirectory, SAVE_FILENAME), 'utf8')).toBe(`${source}\n\n`);
  expect(await readFile(path.join(desktop.dataDirectory, `${SAVE_FILENAME}.bak`), 'utf8')).toBe(`${source}\n`);
});

test('launches one token using the real UI and persists the resulting game progress', async ({ desktop }) => {
  const before = await readNativeSave(desktop.game.page);
  const beforeDrops = JSON.parse(before.data!).run.totalDrops as number;
  expect(Number.isInteger(beforeDrops)).toBe(true);
  const launch = desktop.game.page.getByRole('button', { name: 'Launch token', exact: true });
  await expect(launch).toBeEnabled();
  await launch.click();
  await expect.poll(async () => {
    const saved = await readNativeSave(desktop.game.page);
    return JSON.parse(saved.data!).run.totalDrops as number;
  }, { message: 'A real launch should reach the persisted run without constructing or replacing engine state.' }).toBe(beforeDrops + 1);
});

test('native loss keeps manual editing available without machine suggestions', async ({ desktop }) => {
  const { page } = desktop.game;
  const initial = JSON.parse((await readNativeSave(page)).data!).run as RunState;
  const lanes = Array.from({ length: 9 }, (_, lane) => ({ lane, payout: simulateDrop({ ...dropConfig(initial), lane }).total }));
  const weakest = lanes.sort((first, second) => first.payout - second.payout)[0];
  await page.getByRole('button', { name: `Aim lane ${weakest.lane + 1}`, exact: true }).click();
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  for (let launch = 0; launch < 5; launch += 1) {
    await page.getByRole('button', { name: 'Launch token', exact: true }).click();
    await expect.poll(async () => JSON.parse((await readNativeSave(page)).data!).run.totalDrops).toBe(launch + 1);
  }
  const lost = JSON.parse((await readNativeSave(page)).data!).run as RunState;
  expect(lost.phase).toBe('lost');
  await expect(page.getByRole('button', { name: 'Inspect my machine', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try this adjustment', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Select Fork facing right, 1 available', exact: true }).click();
  await page.locator('[data-slot="6-0"]').click();
  const edited = JSON.parse((await readNativeSave(page)).data!).run as RunState;
  expect(edited.brass).toBe(lost.brass);
  expect(edited.score).toBe(lost.score);
  expect([...Object.values(edited.board), ...edited.bench].map((peg) => peg.id).sort()).toEqual([...Object.values(lost.board), ...lost.bench].map((peg) => peg.id).sort());
  expect(edited.board['6-0'].id).toBe('part-5');
  expect(edited.dropsLeft).toBe(0);
});

test('earned duplicate parts share one icon and retain their identities after native relaunch', async ({ desktop }) => {
  const { page } = desktop.game;
  const initial = JSON.parse((await readNativeSave(page)).data!).run as RunState;
  const lanes = Array.from({ length: 9 }, (_, lane) => ({ lane, payout: simulateDrop({ ...dropConfig(initial), lane }).total }));
  const strongest = lanes.sort((first, second) => second.payout - first.payout)[0];
  await page.getByRole('button', { name: `Aim lane ${strongest.lane + 1}`, exact: true }).click();
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  let run = JSON.parse((await readNativeSave(page)).data!).run as RunState;
  while (run.phase === 'ready') {
    const nextDrop = run.totalDrops + 1;
    await page.getByRole('button', { name: 'Launch token', exact: true }).click();
    await expect.poll(async () => JSON.parse((await readNativeSave(page)).data!).run.totalDrops).toBe(nextDrop);
    run = JSON.parse((await readNativeSave(page)).data!).run as RunState;
  }
  expect(run.phase).toBe('review');
  await page.getByRole('button', { name: 'Visit the workshop', exact: true }).click();
  const shop = JSON.parse((await readNativeSave(page)).data!).run as RunState;
  const kind = shop.rewardChoices.find((choice) => choice !== 'splitter')!;
  const offer = shop.offers.find((item) => item.kind === kind)!;
  const giftId = `part-${shop.nextId}`;
  const boughtId = `part-${shop.nextId + 1}`;
  await page.getByRole('button', { name: `Choose ${PARTS[kind].name}`, exact: true }).click();
  await page.getByRole('button', { name: `Buy ${PARTS[kind].name} for ${offer.price} credits`, exact: true }).click();
  const stackName = `Select ${PARTS[kind].name}, 2 available`;
  await expect(page.getByRole('button', { name: stackName, exact: true })).toHaveCount(1);
  const acquired = JSON.parse((await readNativeSave(page)).data!).run as RunState;
  expect(acquired.bench.filter((part) => part.kind === kind).map((part) => part.id)).toEqual([giftId, boughtId]);
  expect(acquired.brass).toBe(shop.brass - offer.price);
  await desktop.game.close();

  const relaunched = await desktop.launch();
  expect(JSON.parse((await readNativeSave(relaunched.page)).data!).run).toEqual(acquired);
  await expect(relaunched.page.getByRole('button', { name: stackName, exact: true })).toHaveCount(1);
  await relaunched.page.getByRole('button', { name: stackName, exact: true }).click();
  await relaunched.page.locator('[data-slot="6-0"]').click();
  const placed = JSON.parse((await readNativeSave(relaunched.page)).data!).run as RunState;
  expect(placed.board['6-0'].id).toBe(giftId);
  expect(placed.bench.filter((part) => part.kind === kind).map((part) => part.id)).toEqual([boughtId]);
  expect(placed.brass).toBe(acquired.brass);
  expect(placed.totalScore).toBe(acquired.totalScore);
  await expect(relaunched.page.getByRole('button', { name: `Select ${PARTS[kind].name}, 1 available`, exact: true })).toBeVisible();
});