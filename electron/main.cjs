'use strict';

const filesystem = require('node:fs/promises');
const path = require('node:path');
const { createSaveStore } = require('./native-save.cjs');
const { createSaveExporter } = require('./export-save.cjs');
const { createSteamAdapter, loadSteamConfiguration } = require('./steam.cjs');
const {
  parseDevURL, createTrustPolicy, isTrustedSender, createFileHandler, hardenWebContents, hardenSession,
} = require('./security.cjs');

const APPLICATION_ID = 'com.pocketcascade.game';

async function configureDataDirectory(app, environment) {
  const override = app.isPackaged ? undefined : environment.POCKET_CASCADE_DATA_DIR;
  const directory = override === undefined ? path.join(app.getPath('appData'), 'Pocket Cascade') : override;
  if (typeof directory !== 'string' || !directory || !path.isAbsolute(directory)) {
    throw new Error('POCKET_CASCADE_DATA_DIR must be an absolute integration-test directory.');
  }
  await filesystem.mkdir(directory, { recursive: true, mode: 0o700 });
  app.setPath('userData', directory);
  app.setPath('sessionData', directory);
  return directory;
}

function setFullscreen(window, value) {
  if (typeof value !== 'boolean') return Promise.reject(new TypeError('Fullscreen must be a boolean.'));
  if (window.isDestroyed()) return Promise.resolve(false);
  if (window.isFullScreen() === value) return Promise.resolve(value);

  return new Promise((resolve) => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      window.removeListener('enter-full-screen', finish);
      window.removeListener('leave-full-screen', finish);
      window.removeListener('closed', finish);
      setImmediate(() => resolve(!window.isDestroyed() && window.isFullScreen()));
    };
    const timeout = setTimeout(finish, 3000);
    timeout.unref?.();
    window.on('enter-full-screen', finish);
    window.on('leave-full-screen', finish);
    window.once('closed', finish);
    try {
      window.setFullScreen(value);
    } catch {
      finish();
    }
  });
}

function registerIPC({
  ipcMain, app, window, policy, saves, steam, lifecycle, onSaveResult,
  exportSave = async () => ({ ok: false, error: 'Native save export is unavailable.' }),
}) {
  const channels = [];
  let fullscreenQueue = Promise.resolve();

  function handle(channel, arity, action) {
    channels.push(channel);
    ipcMain.handle(channel, (event, ...args) => {
      if (!isTrustedSender(event, window, policy)) throw new Error('Untrusted desktop IPC sender.');
      if (args.length !== arity) throw new Error('Invalid desktop IPC arguments.');
      return action(...args);
    });
  }

  handle('pocket:read-save', 0, () => saves.readSave());
  handle('pocket:write-save', 1, async (json) => {
    const result = await saves.writeSave(json);
    onSaveResult(result);
    return result;
  });
  handle('pocket:export-save', 1, (json) => lifecycle.isClosing()
    ? { ok: false, error: 'The application is closing; save was not exported.' }
    : exportSave(json));
  handle('pocket:set-fullscreen', 1, (value) => {
    if (typeof value !== 'boolean') throw new TypeError('Fullscreen must be a boolean.');
    const result = fullscreenQueue.then(() => lifecycle.isClosing() ? false : setFullscreen(window, value));
    fullscreenQueue = result.then(() => undefined, () => undefined);
    return result;
  });
  handle('pocket:get-status', 0, () => ({ platform: process.platform, version: app.getVersion(), ...steam.getStatus() }));
  handle('pocket:unlock-achievement', 1, (id) => lifecycle.isClosing() ? false : steam.unlockAchievement(id));

  const quit = (event, ...args) => {
    if (args.length === 0 && isTrustedSender(event, window, policy)) void lifecycle.requestQuit();
  };
  ipcMain.on('pocket:quit', quit);

  return () => {
    for (const channel of channels) ipcMain.removeHandler(channel);
    ipcMain.removeListener('pocket:quit', quit);
  };
}

function installLifecycle({ app, window, saves, reportSaveFailure }) {
  let readyToQuit = false;
  let quitting;

  function requestQuit() {
    if (!quitting) {
      quitting = Promise.resolve().then(async () => {
        try {
          await saves.close();
          reportSaveFailure();
        } finally {
          readyToQuit = true;
          if (!window.isDestroyed()) window.destroy();
          app.quit();
        }
      });
    }
    return quitting;
  }

  function waitForSaves(event) {
    if (readyToQuit) return;
    event.preventDefault();
    void requestQuit();
  }

  window.on('close', waitForSaves);
  window.on('query-session-end', waitForSaves);
  app.on('before-quit', waitForSaves);
  app.on('window-all-closed', () => { void requestQuit(); });
  return Object.freeze({ requestQuit, isClosing: () => Boolean(quitting) });
}

async function start(electron, environment = process.env) {
  const { app, BrowserWindow, Menu, dialog, ipcMain, session, net } = electron;
  let lifecycle;

  try {
    app.setName('Pocket Cascade');
    app.setAppUserModelId(APPLICATION_ID);
    app.enableSandbox();

    const devURL = parseDevURL(environment.POCKET_CASCADE_DEV_URL, app.isPackaged);
    await configureDataDirectory(app, environment);

    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return null;
    }

    app.on('web-contents-created', (_event, contents) => hardenWebContents(contents));
    await app.whenReady();

    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, 'dist', 'index.html');
    const policy = createTrustPolicy({ indexPath, devURL });
    hardenSession(session.defaultSession, policy, devURL);
    if (!devURL) {
      session.defaultSession.protocol.handle('file', await createFileHandler({
        distDirectory: path.dirname(indexPath),
        fetchFile: (url, options) => net.fetch(url, options),
      }));
    }

    const saves = createSaveStore({ directory: app.getPath('userData') });
    const initialSave = await saves.readSave();
    if (initialSave.error) console.warn('Pocket Cascade save load warning:', initialSave.error);
    const savedSettings = initialSave.data === null ? undefined : JSON.parse(initialSave.data).settings;
    const savedFullscreen = savedSettings?.fullscreenPreferenceVersion === 1 ? savedSettings.fullscreen : undefined;
    const steam = createSteamAdapter({ configuration: await loadSteamConfiguration({ environment }) });
    let lastSaveError;
    Menu.setApplicationMenu(null);

    const window = new BrowserWindow({
      title: 'Pocket Cascade',
      width: 1280,
      height: 840,
      minWidth: 760,
      minHeight: 540,
      fullscreen: typeof savedFullscreen === 'boolean' ? savedFullscreen : true,
      frame: true,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#141414',
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        webviewTag: false,
        navigateOnDragDrop: false,
        safeDialogs: true,
        spellcheck: false,
        devTools: !app.isPackaged,
      },
    });

    lifecycle = installLifecycle({
      app, window, saves,
      reportSaveFailure: () => {
        if (lastSaveError) dialog.showErrorBox('Pocket Cascade save failed', lastSaveError);
      },
    });
    const unregisterIPC = registerIPC({
      ipcMain, app, window, policy, saves, steam, lifecycle,
      exportSave: createSaveExporter({ window, dialog, documentsDirectory: app.getPath('documents') }),
      onSaveResult: (result) => { lastSaveError = result.ok ? undefined : result.error; },
    });
    app.once('will-quit', unregisterIPC);

    const focusWindow = () => {
      if (lifecycle.isClosing() || window.isDestroyed()) return;
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    };
    app.on('second-instance', focusWindow);
    app.on('activate', focusWindow);
    window.webContents.on('render-process-gone', (_event, details) => {
      if (lifecycle.isClosing()) return;
      dialog.showErrorBox('Pocket Cascade stopped', `The game renderer stopped (${details.reason}). Your last completed save is retained.`);
      void lifecycle.requestQuit();
    });

    if (devURL) await window.loadURL(devURL);
    else await window.loadFile(indexPath);
    if (!lifecycle.isClosing() && !window.isDestroyed()) window.show();
    return window;
  } catch (error) {
    console.error('Pocket Cascade desktop startup failed:', error);
    dialog.showErrorBox(
      'Pocket Cascade could not start',
      `The game could not be loaded. Build the renderer before launching Electron and check the desktop configuration.\n\n${error instanceof Error ? error.message : 'Unknown startup error.'}`,
    );
    if (lifecycle) await lifecycle.requestQuit();
    else app.quit();
    return null;
  }
}

module.exports = { start, configureDataDirectory, setFullscreen, registerIPC, installLifecycle, APPLICATION_ID };

if (process.versions.electron && process.type === 'browser') void start(require('electron'));