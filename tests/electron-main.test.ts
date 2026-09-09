import { afterEach, describe, expect, it, vi } from 'vitest';
import * as filesystem from 'node:fs/promises';
import type { PathLike } from 'node:fs';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { ACHIEVEMENTS } from '../src/game/content';
import packageMetadata from '../package.json';
import type { PocketDesktop } from '../electron/desktop-api';

type SaveRead = { data: string | null; recovered: boolean; error?: string };
type SaveWrite = { ok: boolean; error?: string };
type SaveExport = Awaited<ReturnType<PocketDesktop['exportSave']>>;
type SaveStore = {
  readSave(): Promise<SaveRead>;
  writeSave(json: unknown): Promise<SaveWrite>;
  flush(): Promise<void>;
  close(): Promise<void>;
};

const require = createRequire(import.meta.url);
const { createSaveStore, validateSave, MAX_SAVE_BYTES, SAVE_FILENAME, BACKUP_FILENAME } = require('../electron/native-save.cjs') as {
  createSaveStore(options: { directory: string; io?: typeof filesystem }): SaveStore;
  validateSave(json: unknown): SaveWrite;
  MAX_SAVE_BYTES: number;
  SAVE_FILENAME: string;
  BACKUP_FILENAME: string;
};

const directories: string[] = [];

async function temporaryDirectory() {
  const directory = await filesystem.mkdtemp(path.join(tmpdir(), 'pocket-cascade-save-test-'));
  directories.push(directory);
  return directory;
}

function envelope(sequence = 0) {
  return JSON.stringify({ version: 1, run: { sequence }, profile: {}, settings: {} });
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => { resolve = complete; });
  return { promise, resolve };
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await Promise.all(directories.splice(0).map((directory) => filesystem.rm(directory, { recursive: true, force: true })));
});

describe('native save boundary', () => {
  it.each([
    undefined, null, {}, 1, '', '{broken', 'null', '[]',
    JSON.stringify({ version: 2, run: {}, profile: {}, settings: {} }),
    JSON.stringify({ version: '1', run: {}, profile: {}, settings: {} }),
    JSON.stringify({ version: 1, run: null, profile: {}, settings: {} }),
    JSON.stringify({ version: 1, run: {}, profile: [], settings: {} }),
    JSON.stringify({ version: 1, run: {}, profile: {}, settings: false }),
    JSON.stringify({ version: 1, run: {}, profile: {} }),
  ])('rejects an invalid envelope without file access: %s', async (value) => {
    const directory = await temporaryDirectory();
    const mkdir = vi.fn(filesystem.mkdir);
    const store = createSaveStore({ directory, io: { ...filesystem, mkdir: mkdir as typeof filesystem.mkdir } });
    expect(await store.writeSave(value)).toEqual({ ok: false, error: expect.any(String) });
    expect(mkdir).not.toHaveBeenCalled();
    expect(await filesystem.readdir(directory)).toEqual([]);
  });

  it('counts UTF-8 bytes and accepts the exact 2 MiB boundary', () => {
    const base = JSON.stringify({ version: 1, run: {}, profile: {}, settings: {}, padding: '' });
    const exact = base.replace('"padding":""', `"padding":"${'a'.repeat(MAX_SAVE_BYTES - Buffer.byteLength(base))}"`);
    expect(Buffer.byteLength(exact)).toBe(MAX_SAVE_BYTES);
    expect(validateSave(exact)).toEqual({ ok: true });
    expect(validateSave(`${exact} `)).toMatchObject({ ok: false });
    const multibyte = JSON.stringify({ version: 1, run: {}, profile: {}, settings: { text: '\u00e9'.repeat(MAX_SAVE_BYTES / 2) } });
    expect(multibyte.length).toBeLessThan(MAX_SAVE_BYTES);
    expect(validateSave(multibyte)).toMatchObject({ ok: false });
  });

  it('distinguishes a first launch from a corrupt save', async () => {
    const directory = await temporaryDirectory();
    const store = createSaveStore({ directory });
    expect(await store.readSave()).toEqual({ data: null, recovered: false });
    await filesystem.writeFile(path.join(directory, SAVE_FILENAME), '{broken');
    expect(await store.readSave()).toEqual({ data: null, recovered: false, error: expect.any(String) });
  });

  it('persists exact JSON and backs up only the previous valid save', async () => {
    const directory = await temporaryDirectory();
    const store = createSaveStore({ directory });
    expect(await store.writeSave(envelope(1))).toEqual({ ok: true });
    expect(await store.writeSave(envelope(2))).toEqual({ ok: true });
    expect(await store.readSave()).toEqual({ data: envelope(2), recovered: false });
    expect(await filesystem.readFile(path.join(directory, BACKUP_FILENAME), 'utf8')).toBe(envelope(1));
    expect((await filesystem.readdir(directory)).sort()).toEqual([SAVE_FILENAME, BACKUP_FILENAME].sort());
  });

  it('recovers a corrupt primary without replacing the valid backup with corruption', async () => {
    const directory = await temporaryDirectory();
    const store = createSaveStore({ directory });
    await store.writeSave(envelope(1));
    await store.writeSave(envelope(2));
    await filesystem.writeFile(path.join(directory, SAVE_FILENAME), '{broken');
    expect(await store.readSave()).toEqual({ data: envelope(1), recovered: true, error: expect.any(String) });
    expect(await store.writeSave(envelope(3))).toEqual({ ok: true });
    expect(await filesystem.readFile(path.join(directory, BACKUP_FILENAME), 'utf8')).toBe(envelope(1));
    expect(await store.readSave()).toEqual({ data: envelope(3), recovered: false });
  });

  it('recovers a missing primary and reports two unusable files', async () => {
    const directory = await temporaryDirectory();
    const store = createSaveStore({ directory });
    await filesystem.writeFile(path.join(directory, BACKUP_FILENAME), envelope(7));
    expect(await store.readSave()).toMatchObject({ data: envelope(7), recovered: true });
    await filesystem.writeFile(path.join(directory, BACKUP_FILENAME), '[]');
    expect(await store.readSave()).toEqual({ data: null, recovered: false, error: expect.any(String) });
  });

  it('rejects oversized and malformed UTF-8 disk contents', async () => {
    const directory = await temporaryDirectory();
    const store = createSaveStore({ directory });
    await filesystem.writeFile(path.join(directory, SAVE_FILENAME), ' '.repeat(MAX_SAVE_BYTES + 1));
    expect(await store.readSave()).toMatchObject({ data: null, error: expect.stringContaining('2 MiB') });
    await filesystem.writeFile(path.join(directory, SAVE_FILENAME), Buffer.from([0xff, 0xfe]));
    expect(await store.readSave()).toMatchObject({ data: null, error: expect.stringContaining('UTF-8') });
  });

  it('serializes concurrent writes and reads in invocation order', async () => {
    const directory = await temporaryDirectory();
    const store = createSaveStore({ directory });
    const first = store.writeSave(envelope(1));
    const second = store.writeSave(envelope(2));
    const read = store.readSave();
    const third = store.writeSave(envelope(3));
    expect(await Promise.all([first, second, third])).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(await read).toEqual({ data: envelope(2), recovered: false });
    expect(await filesystem.readFile(path.join(directory, SAVE_FILENAME), 'utf8')).toBe(envelope(3));
    expect(await filesystem.readFile(path.join(directory, BACKUP_FILENAME), 'utf8')).toBe(envelope(2));
  });

  it('leaves the primary intact on rename failure and permits a later retry', async () => {
    const directory = await temporaryDirectory();
    await filesystem.writeFile(path.join(directory, SAVE_FILENAME), envelope(1));
    let failPrimary = true;
    const rename = vi.fn(async (source: PathLike, destination: PathLike) => {
      if (String(destination) === path.join(directory, SAVE_FILENAME) && failPrimary) {
        throw Object.assign(new Error('locked'), { code: 'EACCES' });
      }
      await filesystem.rename(source, destination);
    });
    const store = createSaveStore({ directory, io: { ...filesystem, rename } });
    expect(await store.writeSave(envelope(2))).toEqual({ ok: false, error: expect.stringContaining('EACCES') });
    expect(await store.readSave()).toEqual({ data: envelope(1), recovered: false });
    expect((await filesystem.readdir(directory)).some((filename) => filename.endsWith('.tmp'))).toBe(false);
    failPrimary = false;
    expect(await store.writeSave(envelope(3))).toEqual({ ok: true });
  });

  it('does not replace a primary that could not be read', async () => {
    const directory = await temporaryDirectory();
    const open = vi.fn(filesystem.open).mockRejectedValue(Object.assign(new Error('denied'), { code: 'EACCES' }));
    const rename = vi.fn(filesystem.rename);
    const store = createSaveStore({ directory, io: { ...filesystem, open, rename } });
    expect(await store.writeSave(envelope())).toMatchObject({ ok: false, error: expect.stringContaining('EACCES') });
    expect(rename).not.toHaveBeenCalled();
    expect(await store.readSave()).toMatchObject({ data: null, error: expect.stringContaining('EACCES') });
  });

  it('waits for pending writes on close and rejects new writes', async () => {
    const directory = await temporaryDirectory();
    const entered = deferred();
    const release = deferred();
    const rename = vi.fn(async (source: PathLike, destination: PathLike) => {
      entered.resolve();
      await release.promise;
      await filesystem.rename(source, destination);
    });
    const store = createSaveStore({ directory, io: { ...filesystem, rename } });
    const writing = store.writeSave(envelope(1));
    await entered.promise;
    let closed = false;
    const closing = store.close().then(() => { closed = true; });
    try {
      await Promise.resolve();
      expect(closed).toBe(false);
      expect(await store.writeSave(envelope(2))).toMatchObject({ ok: false, error: expect.stringContaining('closing') });
    } finally {
      release.resolve();
      await closing;
    }
    expect(await writing).toEqual({ ok: true });
    expect(await filesystem.readFile(path.join(directory, SAVE_FILENAME), 'utf8')).toBe(envelope(1));
  });
});

const {
  PRODUCTION_CSP, parseDevURL, createTrustPolicy, isTrustedSender, injectProductionCSP,
  createFileHandler, hardenWebContents, hardenSession,
} = require('../electron/security.cjs');
const { createSaveExporter } = require('../electron/export-save.cjs');
const { setFullscreen, registerIPC, installLifecycle, configureDataDirectory, start } = require('../electron/main.cjs');
const { ACHIEVEMENT_IDS, loadSteamConfiguration, createSteamAdapter } = require('../electron/steam.cjs');
const afterPack = require('../electron/after-pack.cjs');

describe('native save export boundary', () => {
  function exportFixture() {
    const window = { isDestroyed: vi.fn(() => false) };
    const documentsDirectory = path.join(tmpdir(), 'pocket-cascade-export-documents');
    const selectedPath = path.join(tmpdir(), 'pocket-cascade-selected-export.json');
    const showSaveDialog = vi.fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ canceled: false, filePath: selectedPath });
    const writeFile = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
    const exportSave = createSaveExporter({
      window, dialog: { showSaveDialog }, documentsDirectory, io: { writeFile },
      now: () => new Date('2026-09-07T12:34:56.000Z'),
    });
    return { window, documentsDirectory, selectedPath, showSaveDialog, writeFile, exportSave };
  }

  it.each([
    undefined, null, {}, 1, '', '{broken', 'null', '[]',
    JSON.stringify({ version: 2, run: {}, profile: {}, settings: {} }),
    JSON.stringify({ version: 1, run: null, profile: {}, settings: {} }),
    JSON.stringify({ version: 1, run: {}, profile: [], settings: {} }),
    JSON.stringify({ version: 1, run: {}, profile: {}, settings: false }),
    JSON.stringify({ version: 1, run: {}, profile: {} }),
  ])('reuses save validation before any dialog or write: %s', async (json) => {
    const { exportSave, showSaveDialog, writeFile } = exportFixture();
    expect(await exportSave(json)).toEqual(validateSave(json));
    expect(showSaveDialog).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('checks UTF-8 bytes and permits an envelope of exactly 2 MiB', async () => {
    const { exportSave, showSaveDialog, writeFile } = exportFixture();
    const paddedEnvelope = (padding: string) => JSON.stringify({ version: 1, run: {}, profile: {}, settings: { padding } });
    const exact = paddedEnvelope('a'.repeat(MAX_SAVE_BYTES - Buffer.byteLength(paddedEnvelope(''))));
    const multibyte = paddedEnvelope('\u00e9'.repeat(MAX_SAVE_BYTES / 2));
    expect(Buffer.byteLength(exact)).toBe(MAX_SAVE_BYTES);
    expect(multibyte.length).toBeLessThan(MAX_SAVE_BYTES);
    expect(await exportSave(`${exact} `)).toEqual({ ok: false, error: expect.stringContaining('2 MiB') });
    expect(await exportSave(multibyte)).toEqual({ ok: false, error: expect.stringContaining('2 MiB') });
    expect(showSaveDialog).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(await exportSave(exact)).toEqual({ ok: true });
    expect(writeFile).toHaveBeenCalledOnce();
  });

  it('attaches a dated JSON dialog to the main window and writes only its selected path', async () => {
    const { exportSave, window, documentsDirectory, selectedPath, showSaveDialog, writeFile } = exportFixture();
    const json = JSON.stringify({ ...JSON.parse(envelope(7)), filePath: path.join(tmpdir(), 'renderer-selected.json') });
    expect(await exportSave(json)).toEqual({ ok: true });
    expect(showSaveDialog).toHaveBeenCalledExactlyOnceWith(window, {
      title: 'Export save',
      defaultPath: path.join(documentsDirectory, 'Pocket-Cascade-2026-09-07.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['showOverwriteConfirmation'],
    });
    expect(writeFile).toHaveBeenCalledExactlyOnceWith(selectedPath, json, {
      encoding: 'utf8', flag: 'w', mode: 0o600, flush: true,
    });
  });

  it('does not write before confirmation and waits for the flushed write to finish', async () => {
    const { exportSave, selectedPath, showSaveDialog, writeFile } = exportFixture();
    const confirmation = deferred();
    const writeStarted = deferred();
    const flushed = deferred();
    showSaveDialog.mockImplementationOnce(async () => {
      await confirmation.promise;
      return { canceled: false, filePath: selectedPath };
    });
    writeFile.mockImplementationOnce(async () => {
      writeStarted.resolve();
      await flushed.promise;
    });
    let completed = false;
    const exporting = exportSave(envelope()).then((result: SaveExport) => { completed = true; return result; });
    try {
      expect(showSaveDialog).toHaveBeenCalledOnce();
      expect(writeFile).not.toHaveBeenCalled();
      expect(completed).toBe(false);
      confirmation.resolve();
      await writeStarted.promise;
      expect(completed).toBe(false);
    } finally {
      confirmation.resolve();
      flushed.resolve();
      await exporting;
    }
    expect(await exporting).toEqual({ ok: true });
  });

  it('returns cancellation without writing even if the dialog also supplies a path', async () => {
    const { exportSave, selectedPath, showSaveDialog, writeFile } = exportFixture();
    showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: selectedPath });
    expect(await exportSave(envelope())).toEqual({ ok: false, canceled: true });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it.each([
    undefined, null, {}, { filePath: path.join(tmpdir(), 'unconfirmed.json') },
    { canceled: false }, { canceled: false, filePath: '' }, { canceled: false, filePath: 1 },
    { canceled: false, filePath: '../renderer-selected.json' },
    { canceled: false, filePath: `${path.join(tmpdir(), 'invalid.json')}\0` },
  ])('rejects a missing confirmation or invalid dialog path: %s', async (selection) => {
    const { exportSave, showSaveDialog, writeFile } = exportFixture();
    showSaveDialog.mockResolvedValueOnce(selection);
    expect(await exportSave(envelope())).toEqual({ ok: false, error: expect.stringContaining('valid file path') });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('reports dialog failures without writing or exposing native error details', async () => {
    const { exportSave, showSaveDialog, writeFile } = exportFixture();
    showSaveDialog.mockRejectedValueOnce(Object.assign(new Error('private native details'), { code: 'EACCES' }));
    expect(await exportSave(envelope())).toEqual({ ok: false, error: 'Could not open the save export dialog (EACCES).' });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it.each(['EACCES', 'ENOSPC', 'EIO'])('reports write or flush failure %s and allows a retry', async (code) => {
    const { exportSave, writeFile } = exportFixture();
    writeFile.mockRejectedValueOnce(Object.assign(new Error('private native path'), { code }));
    expect(await exportSave(envelope())).toEqual({ ok: false, error: `Could not export save (${code}).` });
    expect(await exportSave(envelope(1))).toEqual({ ok: true });
  });

  it('does not include an untrusted error code in a failure result', async () => {
    const { exportSave, writeFile } = exportFixture();
    writeFile.mockRejectedValueOnce({ code: 'C:\\private\\save.json' });
    expect(await exportSave(envelope())).toEqual({ ok: false, error: 'Could not export save.' });
  });

  it('does not open a dialog for a destroyed window or write if the window closes during confirmation', async () => {
    const { exportSave, window, selectedPath, showSaveDialog, writeFile } = exportFixture();
    window.isDestroyed.mockReturnValueOnce(true);
    expect(await exportSave(envelope())).toEqual({ ok: false, error: expect.stringContaining('window is closed') });
    expect(showSaveDialog).not.toHaveBeenCalled();
    showSaveDialog.mockImplementationOnce(async () => {
      window.isDestroyed.mockReturnValue(true);
      return { canceled: false, filePath: selectedPath };
    });
    expect(await exportSave(envelope())).toEqual({ ok: false, error: expect.stringContaining('window is closed') });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('overwrites an explicitly confirmed existing file with the exact JSON', async () => {
    const directory = await temporaryDirectory();
    const selectedPath = path.join(directory, 'chosen.json');
    await filesystem.writeFile(selectedPath, 'previous export with longer trailing content'.repeat(10));
    const exportSave = createSaveExporter({
      window: { isDestroyed: () => false }, documentsDirectory: directory,
      dialog: { showSaveDialog: async () => ({ canceled: false, filePath: selectedPath }) },
    });
    const json = `${JSON.stringify(JSON.parse(envelope(8)), null, 2)}\n`;
    expect(await exportSave(json)).toEqual({ ok: true });
    expect(await filesystem.readFile(selectedPath, 'utf8')).toBe(json);
    expect(await filesystem.readdir(directory)).toEqual(['chosen.json']);
  });
});

const policyIndex = path.join(tmpdir(), 'pocket-cascade-policy', 'dist', 'index.html');
const policyEntry = pathToFileURL(policyIndex).href;
const builtHTML = '<!doctype html><html lang="en"><head><script src="./theme.js"></script></head><body><div id="root"></div></body></html>';

class TestWindow extends EventEmitter {
  destroyed = false;
  fullscreen = false;
  webContents: {
    mainFrame: { url: string; parent: object | null; detached: boolean };
    isDestroyed(): boolean;
    getURL(): string;
  };

  constructor(entryURL = policyEntry) {
    super();
    this.webContents = {
      mainFrame: { url: entryURL, parent: null, detached: false },
      isDestroyed: () => this.destroyed,
      getURL: () => entryURL,
    };
  }

  isDestroyed() { return this.destroyed; }
  isFullScreen() { return this.fullscreen; }
  setFullScreen = vi.fn((value: boolean) => {
    this.fullscreen = value;
    this.emit(value ? 'enter-full-screen' : 'leave-full-screen');
  });
  destroy = vi.fn(() => {
    this.destroyed = true;
    this.emit('closed');
  });
}

function sender(window: TestWindow) {
  return { sender: window.webContents, senderFrame: window.webContents.mainFrame };
}

describe('desktop trust boundary', () => {
  it('only accepts a canonical explicit loopback development origin', () => {
    expect(parseDevURL('http://127.0.0.1:5173', false)).toBe('http://127.0.0.1:5173/');
    expect(parseDevURL('http://127.0.0.1:5173/', false)).toBe('http://127.0.0.1:5173/');
    expect(parseDevURL(undefined, false)).toBeNull();
    expect(parseDevURL('https://untrusted.invalid', true)).toBeNull();
  });

  it.each([
    'http://localhost:5173', 'http://127.1:5173', 'http://2130706433:5173',
    'http://127.0.0.1', 'https://127.0.0.1:5173', 'http://127.0.0.1:0',
    'http://127.0.0.1:65536', 'http://127.0.0.1:5173/other',
    'http://127.0.0.1:5173/?query=1', 'http://127.0.0.1:5173/#hash',
    'http://user@127.0.0.1:5173', 'http://127.0.0.1.evil.invalid:5173',
    ' http://127.0.0.1:5173', 'file:///index.html',
  ])('rejects a widened development URL: %s', (url) => {
    expect(() => parseDevURL(url, false)).toThrow();
  });

  it('checks the window, current top-frame identity, and exact file URL together', () => {
    const policy = createTrustPolicy({ indexPath: policyIndex });
    const window = new TestWindow();
    const event = sender(window);
    expect(isTrustedSender(event, window, policy)).toBe(true);
    expect(policy.isTrustedURL(`${policyEntry}#settings`)).toBe(true);
    expect(policy.isTrustedURL(`${policyEntry}?different=1`)).toBe(false);
    expect(policy.isTrustedURL(pathToFileURL(path.join(path.dirname(policyIndex), 'other.html')).href)).toBe(false);
    expect(isTrustedSender({ ...event, sender: new TestWindow().webContents }, window, policy)).toBe(false);
    expect(isTrustedSender({ ...event, senderFrame: { ...event.senderFrame } }, window, policy)).toBe(false);
    expect(isTrustedSender({ ...event, senderFrame: null }, window, policy)).toBe(false);
    window.webContents.mainFrame.parent = {};
    expect(isTrustedSender(event, window, policy)).toBe(false);
    window.webContents.mainFrame.parent = null;
    window.webContents.mainFrame.detached = true;
    expect(isTrustedSender(event, window, policy)).toBe(false);
    window.webContents.mainFrame.detached = false;
    window.webContents.mainFrame.url = 'https://untrusted.invalid/';
    expect(isTrustedSender(event, window, policy)).toBe(false);
    window.webContents.mainFrame.url = policyEntry;
    window.destroy();
    expect(isTrustedSender(event, window, policy)).toBe(false);
  });

  it('does not trust a current frame with a stale or navigated webContents URL', () => {
    const policy = createTrustPolicy({ indexPath: policyIndex });
    const window = new TestWindow();
    vi.spyOn(window.webContents, 'getURL').mockReturnValue('about:blank');
    expect(isTrustedSender(sender(window), window, policy)).toBe(false);
    const disappeared = Object.defineProperty({ sender: window.webContents }, 'senderFrame', {
      get: () => { throw new Error('frame disposed'); },
    });
    expect(isTrustedSender(disappeared, window, policy)).toBe(false);
  });

  it('limits production resource requests to dist and refuses all subframes', () => {
    const policy = createTrustPolicy({ indexPath: policyIndex });
    expect(policy.isAllowedRequest({ url: policyEntry, resourceType: 'mainFrame' })).toBe(true);
    expect(policy.isAllowedRequest({ url: policyEntry, resourceType: 'subFrame' })).toBe(false);
    expect(policy.isAllowedRequest({ url: pathToFileURL(path.join(path.dirname(policyIndex), 'assets', 'game.js')).href, resourceType: 'script' })).toBe(true);
    expect(policy.isAllowedRequest({ url: pathToFileURL(path.join(tmpdir(), SAVE_FILENAME)).href, resourceType: 'xhr' })).toBe(false);
    expect(policy.isAllowedRequest({ url: 'https://untrusted.invalid/game.js', resourceType: 'script' })).toBe(false);
    expect(policy.isAllowedRequest({ url: 'file://server/share/secret.json', resourceType: 'xhr' })).toBe(false);
  });

  it('allows only the exact development page and its own HTTP/WebSocket resources', () => {
    const devURL = parseDevURL('http://127.0.0.1:5173', false);
    const policy = createTrustPolicy({ indexPath: policyIndex, devURL });
    const window = new TestWindow(devURL);
    expect(isTrustedSender(sender(window), window, policy)).toBe(true);
    expect(policy.isTrustedURL('http://127.0.0.1:5174/')).toBe(false);
    expect(policy.isTrustedURL('http://127.0.0.1:5173/other')).toBe(false);
    expect(policy.isAllowedRequest({ url: 'http://127.0.0.1:5173/src/main.tsx', resourceType: 'script' })).toBe(true);
    expect(policy.isAllowedRequest({ url: 'ws://127.0.0.1:5173/?token=development', resourceType: 'webSocket' })).toBe(true);
    expect(policy.isAllowedRequest({ url: 'ws://127.0.0.1:5174/', resourceType: 'webSocket' })).toBe(false);
    expect(policy.isAllowedRequest({ url: policyEntry, resourceType: 'xhr' })).toBe(false);
  });

  it('denies popup, navigation, redirect, and webview creation', () => {
    const contents = Object.assign(new EventEmitter(), { setWindowOpenHandler: vi.fn() });
    hardenWebContents(contents);
    expect(contents.setWindowOpenHandler.mock.calls[0][0]({ url: 'https://untrusted.invalid/' })).toEqual({ action: 'deny' });
    for (const eventName of ['will-navigate', 'will-frame-navigate', 'will-redirect', 'will-attach-webview']) {
      const event = { preventDefault: vi.fn() };
      contents.emit(eventName, event);
      expect(event.preventDefault).toHaveBeenCalledOnce();
    }
  });

  it('denies permissions, device access, display capture, and downloads', () => {
    const session = Object.assign(new EventEmitter(), {
      setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn(),
      setDevicePermissionHandler: vi.fn(), setDisplayMediaRequestHandler: vi.fn(),
      webRequest: { onBeforeRequest: vi.fn(), onHeadersReceived: vi.fn() },
    });
    hardenSession(session, createTrustPolicy({ indexPath: policyIndex }), null);
    const permission = vi.fn();
    session.setPermissionRequestHandler.mock.calls[0][0](null, 'camera', permission);
    expect(permission).toHaveBeenCalledWith(false);
    expect(session.setPermissionCheckHandler.mock.calls[0][0]()).toBe(false);
    expect(session.setDevicePermissionHandler.mock.calls[0][0]()).toBe(false);
    const displayCapture = vi.fn();
    session.setDisplayMediaRequestHandler.mock.calls[0][0]({}, displayCapture);
    expect(displayCapture).toHaveBeenCalledWith({});
    const download = { preventDefault: vi.fn() };
    session.emit('will-download', download);
    expect(download.preventDefault).toHaveBeenCalledOnce();
    const request = vi.fn();
    session.webRequest.onBeforeRequest.mock.calls[0][0]({ url: 'https://untrusted.invalid/', resourceType: 'xhr' }, request);
    expect(request).toHaveBeenCalledWith({ cancel: true });
    expect(session.webRequest.onHeadersReceived).not.toHaveBeenCalled();
  });
});

describe('production document and file serving', () => {
  it('inserts the restrictive meta policy before the first external theme script', () => {
    const secured = injectProductionCSP(builtHTML) as string;
    expect(secured.indexOf('Content-Security-Policy')).toBeLessThan(secured.indexOf('<script'));
    expect(secured).toContain('<script src="./theme.js"></script>');
    expect(PRODUCTION_CSP).toContain("script-src 'self';");
    expect(PRODUCTION_CSP).toContain("style-src 'self' 'unsafe-inline'");
    expect(PRODUCTION_CSP).toContain("img-src 'self' data: blob:");
    expect(PRODUCTION_CSP).toContain("media-src 'self' blob:");
    expect(PRODUCTION_CSP).toContain("connect-src 'self'");
    expect(PRODUCTION_CSP).toContain("object-src 'none'");
    expect(PRODUCTION_CSP).not.toContain('unsafe-eval');
    expect(PRODUCTION_CSP).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it.each([
    '<script>run()</script><head></head>',
    '<!doctype html><html><!-- <head> --><head></head></html>',
    '<!doctype html><html><head data-invalid=">">',
    '<!doctype html><html title="><head>">',
    '<!doctype html><html><body>No head</body></html>',
  ])('fails closed when the built document prefix is unexpected', (html) => {
    expect(() => injectProductionCSP(html)).toThrow(/head element/);
  });

  it('serves only real files inside dist, preserving the guarded file URL', async () => {
    const directory = await temporaryDirectory();
    await filesystem.writeFile(path.join(directory, 'index.html'), builtHTML);
    await filesystem.writeFile(path.join(directory, 'theme.js'), 'void 0;');
    const fetchFile = vi.fn(async () => new Response('void 0;'));
    const handler = await createFileHandler({ distDirectory: directory, fetchFile });
    const index = await handler(new Request(pathToFileURL(path.join(directory, 'index.html'))));
    expect(index.status).toBe(200);
    expect(await index.text()).toContain(`content="${PRODUCTION_CSP}"`);
    const assetURL = pathToFileURL(path.join(directory, 'theme.js')).href;
    expect((await handler(new Request(assetURL))).status).toBe(200);
    expect(fetchFile).toHaveBeenCalledWith(assetURL, expect.objectContaining({ bypassCustomProtocolHandlers: true }));
    expect((await handler(new Request(pathToFileURL(path.join(directory, '..', 'secret.json'))))).status).toBe(403);
    expect((await handler(new Request(pathToFileURL(path.join(directory, 'missing.js'))))).status).toBe(404);
    expect((await handler(new Request(assetURL, { method: 'POST', body: '{}' }))).status).toBe(403);
  });

  it('refuses a resource whose resolved path escapes dist', async () => {
    const directory = await temporaryDirectory();
    const outside = await temporaryDirectory();
    await filesystem.writeFile(path.join(directory, 'index.html'), builtHTML);
    const linkedPath = path.join(directory, 'linked.js');
    const fetchFile = vi.fn();
    const realpath = vi.fn(async (filename: PathLike) => String(filename) === linkedPath
      ? path.join(outside, 'outside.js') : filesystem.realpath(filename));
    const handler = await createFileHandler({ distDirectory: directory, fetchFile, io: { ...filesystem, realpath } });
    expect((await handler(new Request(pathToFileURL(linkedPath)))).status).toBe(403);
    expect(fetchFile).not.toHaveBeenCalled();
  });
});

type Invocation = (event: unknown, ...args: unknown[]) => unknown;

function ipcHarness(exportSave?: (json: unknown) => Promise<SaveExport>) {
  const handlers = new Map<string, Invocation>();
  const ipcMain = Object.assign(new EventEmitter(), {
    handle: vi.fn((channel: string, handler: Invocation) => { handlers.set(channel, handler); }),
    removeHandler: vi.fn((channel: string) => { handlers.delete(channel); }),
  });
  const window = new TestWindow();
  const saves = {
    readSave: vi.fn(async () => ({ data: envelope(), recovered: false })),
    writeSave: vi.fn(async (_json: unknown) => ({ ok: true })),
  };
  const steam = { getStatus: vi.fn(() => ({ steam: false, steamError: 'Unconfigured.' })), unlockAchievement: vi.fn(() => false) };
  const lifecycle = { isClosing: vi.fn(() => false), requestQuit: vi.fn(async () => undefined) };
  const onSaveResult = vi.fn();
  const dispose = registerIPC({
    ipcMain, window, policy: createTrustPolicy({ indexPath: policyIndex }), saves, steam, lifecycle, onSaveResult, exportSave,
    app: { getVersion: () => packageMetadata.version },
  });
  return { handlers, ipcMain, window, saves, steam, lifecycle, onSaveResult, dispose };
}

describe('desktop API and lifecycle', () => {
  it('isolates both native and Chromium data in an unpackaged integration directory', async () => {
    const directory = await temporaryDirectory();
    const app = { isPackaged: false, getPath: vi.fn(), setPath: vi.fn() };
    expect(await configureDataDirectory(app, { POCKET_CASCADE_DATA_DIR: directory })).toBe(directory);
    expect(app.setPath.mock.calls).toEqual([['userData', directory], ['sessionData', directory]]);
    expect(app.getPath).not.toHaveBeenCalled();
    await expect(configureDataDirectory(app, { POCKET_CASCADE_DATA_DIR: '../relative' })).rejects.toThrow(/absolute/);
  });

  it('ignores the data override in packaged builds and uses the stable Cloud directory', async () => {
    const appData = await temporaryDirectory();
    const app = { isPackaged: true, getPath: vi.fn(() => appData), setPath: vi.fn() };
    const expectedDirectory = path.join(appData, 'Pocket Cascade');
    expect(await configureDataDirectory(app, { POCKET_CASCADE_DATA_DIR: '../must-not-be-used' })).toBe(expectedDirectory);
    expect(app.getPath).toHaveBeenCalledWith('appData');
    expect(app.setPath.mock.calls).toEqual([['userData', expectedDirectory], ['sessionData', expectedDirectory]]);
  });

  it('exposes exactly seven frozen methods with no raw IPC or Node capabilities', async () => {
    const exposeInMainWorld = vi.fn();
    const invoke = vi.fn(async () => true);
    const send = vi.fn();
    const source = await filesystem.readFile(new URL('../electron/preload.cjs', import.meta.url), 'utf8');
    runInNewContext(source, {
      require: (name: string) => {
        expect(name).toBe('electron');
        return { contextBridge: { exposeInMainWorld }, ipcRenderer: { invoke, send } };
      },
    });
    expect(exposeInMainWorld).toHaveBeenCalledOnce();
    expect(exposeInMainWorld.mock.calls[0][0]).toBe('pocketDesktop');
    const api = exposeInMainWorld.mock.calls[0][1] as PocketDesktop;
    expect(Object.keys(api).sort()).toEqual(['exportSave', 'getStatus', 'quit', 'readSave', 'setFullscreen', 'unlockAchievement', 'writeSave']);
    expect(Object.isFrozen(api)).toBe(true);
    await api.readSave();
    await api.writeSave(envelope());
    await api.exportSave(envelope());
    await api.setFullscreen(true);
    await api.getStatus();
    await api.unlockAchievement('FIRST_CASCADE');
    expect(api.quit()).toBeUndefined();
    expect(invoke.mock.calls).toEqual([
      ['pocket:read-save'], ['pocket:write-save', envelope()], ['pocket:export-save', envelope()], ['pocket:set-fullscreen', true],
      ['pocket:get-status'], ['pocket:unlock-achievement', 'FIRST_CASCADE'],
    ]);
    expect(send).toHaveBeenCalledWith('pocket:quit');
  });

  it('guards every IPC method, including one-way quit', () => {
    const exportSave = vi.fn(async (_json: unknown) => ({ ok: true }));
    const harness = ipcHarness(exportSave);
    const invalid = { ...sender(harness.window), senderFrame: { ...harness.window.webContents.mainFrame } };
    const argumentsByChannel: Record<string, unknown[]> = {
      'pocket:read-save': [], 'pocket:write-save': [envelope()], 'pocket:export-save': [envelope()], 'pocket:set-fullscreen': [true],
      'pocket:get-status': [], 'pocket:unlock-achievement': ['FIRST_CASCADE'],
    };
    expect(harness.handlers.size).toBe(6);
    for (const [channel, args] of Object.entries(argumentsByChannel)) {
      expect(() => harness.handlers.get(channel)!(invalid, ...args)).toThrow(/Untrusted/);
    }
    harness.ipcMain.emit('pocket:quit', invalid);
    expect(harness.saves.readSave).not.toHaveBeenCalled();
    expect(harness.saves.writeSave).not.toHaveBeenCalled();
    expect(exportSave).not.toHaveBeenCalled();
    expect(harness.window.setFullScreen).not.toHaveBeenCalled();
    expect(harness.steam.getStatus).not.toHaveBeenCalled();
    expect(harness.steam.unlockAchievement).not.toHaveBeenCalled();
    expect(harness.lifecycle.requestQuit).not.toHaveBeenCalled();
    harness.dispose();
    expect(harness.handlers.size).toBe(0);
    expect(harness.ipcMain.listenerCount('pocket:quit')).toBe(0);
  });

  it('fails closed when an export action is unavailable', async () => {
    const harness = ipcHarness();
    expect(await harness.handlers.get('pocket:export-save')!(sender(harness.window), envelope()))
      .toEqual({ ok: false, error: 'Native save export is unavailable.' });
    expect(harness.saves.writeSave).not.toHaveBeenCalled();
    expect(harness.onSaveResult).not.toHaveBeenCalled();
    harness.dispose();
  });

  it.each<SaveExport>([
    { ok: true }, { ok: false, canceled: true }, { ok: false, error: 'Could not export save (EACCES).' },
  ])('returns the export result without changing autosave status: %s', async (result) => {
    const exportSave = vi.fn(async (_json: unknown) => result);
    const harness = ipcHarness(exportSave);
    expect(await harness.handlers.get('pocket:export-save')!(sender(harness.window), envelope())).toEqual(result);
    expect(exportSave).toHaveBeenCalledExactlyOnceWith(envelope());
    expect(harness.saves.writeSave).not.toHaveBeenCalled();
    expect(harness.onSaveResult).not.toHaveBeenCalled();
    harness.dispose();
  });

  it('rejects export paths or missing arguments and refuses export while closing', async () => {
    const exportSave = vi.fn(async (_json: unknown) => ({ ok: true }));
    const harness = ipcHarness(exportSave);
    const event = sender(harness.window);
    const invokeExport = harness.handlers.get('pocket:export-save')!;
    expect(() => invokeExport(event)).toThrow(/arguments/);
    expect(() => invokeExport(event, envelope(), '../renderer-selected.json')).toThrow(/arguments/);
    harness.lifecycle.isClosing.mockReturnValue(true);
    expect(await invokeExport(event, envelope())).toEqual({ ok: false, error: expect.stringContaining('closing') });
    expect(exportSave).not.toHaveBeenCalled();
    harness.dispose();
  });

  it('returns the declared results and rejects extra arguments or non-boolean fullscreen values', async () => {
    const harness = ipcHarness();
    const event = sender(harness.window);
    expect(await harness.handlers.get('pocket:read-save')!(event)).toEqual({ data: envelope(), recovered: false });
    expect(await harness.handlers.get('pocket:write-save')!(event, envelope())).toEqual({ ok: true });
    expect(harness.onSaveResult).toHaveBeenCalledWith({ ok: true });
    expect(await harness.handlers.get('pocket:get-status')!(event)).toEqual({
      platform: process.platform, version: packageMetadata.version, steam: false, steamError: 'Unconfigured.',
    });
    expect(await harness.handlers.get('pocket:set-fullscreen')!(event, true)).toBe(true);
    expect(await harness.handlers.get('pocket:set-fullscreen')!(event, false)).toBe(false);
    expect(await harness.handlers.get('pocket:unlock-achievement')!(event, 'FIRST_CASCADE')).toBe(false);
    expect(() => harness.handlers.get('pocket:set-fullscreen')!(event, 'true')).toThrow(/boolean/);
    expect(() => harness.handlers.get('pocket:write-save')!(event, envelope(), '../outside.json')).toThrow(/arguments/);
    harness.ipcMain.emit('pocket:quit', event, 'extra');
    expect(harness.lifecycle.requestQuit).not.toHaveBeenCalled();
    harness.ipcMain.emit('pocket:quit', event);
    expect(harness.lifecycle.requestQuit).toHaveBeenCalledOnce();
    harness.dispose();
  });

  it('waits for fullscreen transitions and cleans up its listeners', async () => {
    const window = new TestWindow();
    expect(await setFullscreen(window, true)).toBe(true);
    expect(await setFullscreen(window, false)).toBe(false);
    expect(window.listenerCount('enter-full-screen')).toBe(0);
    expect(window.listenerCount('leave-full-screen')).toBe(0);
    expect(window.listenerCount('closed')).toBe(0);
    await expect(setFullscreen(window, 'true')).rejects.toThrow(/boolean/);
    window.destroy();
    expect(await setFullscreen(window, true)).toBe(false);
  });

  it.each([true, false])('waits for the native event and reads the updated fullscreen state for %s', async (fullscreen) => {
    const window = new TestWindow();
    window.fullscreen = !fullscreen;
    window.setFullScreen.mockImplementation(() => undefined);
    let completed = false;
    const transition = setFullscreen(window, fullscreen).then((actual: boolean) => {
      completed = true;
      return actual;
    });
    await Promise.resolve();
    expect(completed).toBe(false);
    expect(window.setFullScreen).toHaveBeenCalledExactlyOnceWith(fullscreen);
    window.emit(fullscreen ? 'enter-full-screen' : 'leave-full-screen');
    window.fullscreen = fullscreen;
    expect(await transition).toBe(fullscreen);
    expect(window.listenerCount('enter-full-screen')).toBe(0);
    expect(window.listenerCount('leave-full-screen')).toBe(0);
    expect(window.listenerCount('closed')).toBe(0);
  });

  it.each(['close', 'before-quit', 'query-session-end'])('holds %s until the save queue is drained', async (eventName) => {
    const release = deferred();
    const window = new TestWindow();
    const app = Object.assign(new EventEmitter(), { quit: vi.fn() });
    const saves = { close: vi.fn(() => release.promise) };
    const reportSaveFailure = vi.fn();
    const lifecycle = installLifecycle({ app, window, saves, reportSaveFailure });
    const event = { preventDefault: vi.fn() };
    (eventName === 'before-quit' ? app : window).emit(eventName, event);
    const closing = lifecycle.requestQuit();
    try {
      await Promise.resolve();
      expect(lifecycle.isClosing()).toBe(true);
      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(saves.close).toHaveBeenCalledOnce();
      expect(window.destroy).not.toHaveBeenCalled();
      expect(app.quit).not.toHaveBeenCalled();
      expect(lifecycle.requestQuit()).toBe(closing);
    } finally {
      release.resolve();
      await closing;
    }
    expect(reportSaveFailure).toHaveBeenCalledOnce();
    expect(window.destroy).toHaveBeenCalledOnce();
    expect(app.quit).toHaveBeenCalledOnce();
    const finalQuit = { preventDefault: vi.fn() };
    app.emit('before-quit', finalQuit);
    expect(finalQuit.preventDefault).not.toHaveBeenCalled();
  });

  it('reports a startup configuration failure without opening a window', async () => {
    const app = {
      isPackaged: false, setName: vi.fn(), setAppUserModelId: vi.fn(), enableSandbox: vi.fn(), quit: vi.fn(),
    };
    const dialog = { showErrorBox: vi.fn() };
    const BrowserWindow = vi.fn();
    expect(await start({ app, dialog, BrowserWindow }, { POCKET_CASCADE_DEV_URL: 'https://untrusted.invalid' })).toBeNull();
    expect(dialog.showErrorBox).toHaveBeenCalledWith('Pocket Cascade could not start', expect.stringContaining('127.0.0.1'));
    expect(app.quit).toHaveBeenCalledOnce();
    expect(BrowserWindow).not.toHaveBeenCalled();
  });

  it('shows a startup error when the built renderer cannot be loaded', async () => {
    const directory = await temporaryDirectory();
    const app = Object.assign(new EventEmitter(), {
      isPackaged: false, setName: vi.fn(), setAppUserModelId: vi.fn(), enableSandbox: vi.fn(), quit: vi.fn(),
      getAppPath: () => directory, getPath: () => directory, setPath: vi.fn(),
      requestSingleInstanceLock: () => true, whenReady: async () => undefined,
    });
    const defaultSession = Object.assign(new EventEmitter(), {
      setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn(),
      setDevicePermissionHandler: vi.fn(), setDisplayMediaRequestHandler: vi.fn(),
      webRequest: { onBeforeRequest: vi.fn(), onHeadersReceived: vi.fn() },
      protocol: { handle: vi.fn() },
    });
    const dialog = { showErrorBox: vi.fn() };
    const BrowserWindow = vi.fn();
    expect(await start({ app, dialog, BrowserWindow, session: { defaultSession } }, { POCKET_CASCADE_DATA_DIR: directory })).toBeNull();
    expect(dialog.showErrorBox).toHaveBeenCalledWith('Pocket Cascade could not start', expect.stringContaining('could not be loaded'));
    expect(BrowserWindow).not.toHaveBeenCalled();
    expect(app.quit).toHaveBeenCalledOnce();
  });
});

describe('desktop fullscreen startup', () => {
  async function fullscreenFixture() {
    const directory = await temporaryDirectory();
    const indexPath = path.join(directory, 'dist', 'index.html');
    await filesystem.mkdir(path.dirname(indexPath));
    await filesystem.writeFile(indexPath, builtHTML);
    const shownModes: boolean[] = [];
    const window = Object.assign(new TestWindow(pathToFileURL(indexPath).href), {
      show: vi.fn(() => { shownModes.push(window.isFullScreen()); }),
      loadFile: vi.fn(async (_filename: string): Promise<void> => undefined),
    });
    window.webContents = Object.assign(new EventEmitter(), window.webContents);
    const BrowserWindow = vi.fn(function (options: import('electron').BrowserWindowConstructorOptions) {
      window.fullscreen = options.fullscreen === true;
      return window;
    });
    const app = Object.assign(new EventEmitter(), {
      isPackaged: false, setName: vi.fn(), setAppUserModelId: vi.fn(), enableSandbox: vi.fn(), quit: vi.fn(),
      getAppPath: () => directory, getPath: () => directory, setPath: vi.fn(),
      getVersion: () => packageMetadata.version,
      requestSingleInstanceLock: () => true, whenReady: async () => undefined,
    });
    const defaultSession = Object.assign(new EventEmitter(), {
      setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn(),
      setDevicePermissionHandler: vi.fn(), setDisplayMediaRequestHandler: vi.fn(),
      webRequest: { onBeforeRequest: vi.fn(), onHeadersReceived: vi.fn() },
      protocol: { handle: vi.fn() },
    });
    const handlers = new Map<string, Invocation>();
    const ipcMain = Object.assign(new EventEmitter(), {
      handle: vi.fn((channel: string, handler: Invocation) => { handlers.set(channel, handler); }),
      removeHandler: vi.fn((channel: string) => { handlers.delete(channel); }),
    });
    const dialog = { showErrorBox: vi.fn() };
    const launch = () => start({
      app, BrowserWindow, dialog, ipcMain, Menu: { setApplicationMenu: vi.fn() },
      session: { defaultSession }, net: { fetch: vi.fn() },
    }, { POCKET_CASCADE_DATA_DIR: directory, POCKET_CASCADE_STEAM_APP_ID: '0' });
    return { directory, indexPath, window, BrowserWindow, dialog, handlers, shownModes, launch };
  }

  it('constructs a fresh hidden window in fullscreen and preserves normal windowed chrome', async () => {
    const fixture = await fullscreenFixture();
    fixture.window.loadFile.mockImplementationOnce(async (filename) => {
      expect(filename).toBe(fixture.indexPath);
      expect(fixture.window.isFullScreen()).toBe(true);
      expect(fixture.window.show).not.toHaveBeenCalled();
    });
    expect(await fixture.launch()).toBe(fixture.window);
    expect(fixture.BrowserWindow).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      fullscreen: true, frame: true, show: false, width: 1280, height: 840, minWidth: 760, minHeight: 540,
    }));
    expect(fixture.shownModes).toEqual([true]);
    expect(fixture.window.setFullScreen).not.toHaveBeenCalled();
    expect(fixture.dialog.showErrorBox).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'marked windowed preference', settings: { fullscreen: false, fullscreenPreferenceVersion: 1 }, fullscreen: false },
    { name: 'marked fullscreen preference', settings: { fullscreen: true, fullscreenPreferenceVersion: 1 }, fullscreen: true },
    { name: 'unmarked false migrates to fullscreen', settings: { fullscreen: false }, fullscreen: true },
    { name: 'unmarked true preference', settings: { fullscreen: true }, fullscreen: true },
    { name: 'missing preference', settings: {}, fullscreen: true },
    { name: 'marked missing boolean', settings: { fullscreenPreferenceVersion: 1 }, fullscreen: true },
    { name: 'marked string value', settings: { fullscreen: 'false', fullscreenPreferenceVersion: 1 }, fullscreen: true },
    { name: 'marked numeric value', settings: { fullscreen: 0, fullscreenPreferenceVersion: 1 }, fullscreen: true },
    { name: 'marked null value', settings: { fullscreen: null, fullscreenPreferenceVersion: 1 }, fullscreen: true },
    { name: 'unsupported marker', settings: { fullscreen: false, fullscreenPreferenceVersion: 2 }, fullscreen: true },
    { name: 'non-numeric marker', settings: { fullscreen: false, fullscreenPreferenceVersion: '1' }, fullscreen: true },
  ])('constructs fullscreen=$fullscreen before showing: $name', async ({ settings, fullscreen }) => {
    const fixture = await fullscreenFixture();
    const json = JSON.stringify({ ...JSON.parse(envelope()), settings });
    await filesystem.writeFile(path.join(fixture.directory, SAVE_FILENAME), json);
    fixture.window.loadFile.mockImplementationOnce(async () => {
      expect(fixture.window.isFullScreen()).toBe(fullscreen);
      expect(fixture.window.show).not.toHaveBeenCalled();
    });
    expect(await fixture.launch()).toBe(fixture.window);
    expect(fixture.BrowserWindow).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ fullscreen, frame: true, show: false }));
    expect(fixture.shownModes).toEqual([fullscreen]);
    expect(fixture.window.setFullScreen).not.toHaveBeenCalled();
    expect(await filesystem.readFile(path.join(fixture.directory, SAVE_FILENAME), 'utf8')).toBe(json);
  });

  it('restores windowed mode from a valid backup and retains the recovery warning for the renderer', async () => {
    const fixture = await fullscreenFixture();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const json = JSON.stringify({ ...JSON.parse(envelope()), settings: { fullscreen: false, fullscreenPreferenceVersion: 1 } });
    await filesystem.writeFile(path.join(fixture.directory, BACKUP_FILENAME), json);
    await filesystem.writeFile(path.join(fixture.directory, SAVE_FILENAME), '{broken');
    expect(await fixture.launch()).toBe(fixture.window);
    expect(fixture.BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({ fullscreen: false, show: false }));
    expect(fixture.shownModes).toEqual([false]);
    const result = await fixture.handlers.get('pocket:read-save')!(sender(fixture.window)) as SaveRead;
    expect(result).toEqual({ data: json, recovered: true, error: expect.any(String) });
    expect(warning).toHaveBeenCalledExactlyOnceWith('Pocket Cascade save load warning:', result.error);
  });

  it('does not trust fullscreen in an invalid save envelope or suppress its read error', async () => {
    const fixture = await fullscreenFixture();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const json = JSON.stringify({ version: 2, run: {}, profile: {}, settings: { fullscreen: false, fullscreenPreferenceVersion: 1 } });
    await filesystem.writeFile(path.join(fixture.directory, SAVE_FILENAME), json);
    expect(await fixture.launch()).toBe(fixture.window);
    expect(fixture.BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({ fullscreen: true, show: false }));
    expect(fixture.shownModes).toEqual([true]);
    const result = await fixture.handlers.get('pocket:read-save')!(sender(fixture.window)) as SaveRead;
    expect(result).toEqual({ data: null, recovered: false, error: expect.any(String) });
    expect(warning).toHaveBeenCalledExactlyOnceWith('Pocket Cascade save load warning:', result.error);
    expect(await filesystem.readFile(path.join(fixture.directory, SAVE_FILENAME), 'utf8')).toBe(json);
  });
});

function steamFixture() {
  const client = {
    localplayer: { getSteamId: vi.fn(() => ({ steamId64: 123456789n })) },
    utils: { getAppId: vi.fn(() => 1234567) },
    achievement: {
      isActivated: vi.fn((_id: string) => false),
      activate: vi.fn<(_id: string) => unknown>().mockReturnValue(true),
    },
  };
  const init = vi.fn(() => client);
  const adapter = createSteamAdapter({ configuration: { appId: 1234567 }, loadLibrary: () => ({ init }) });
  return { client, init, adapter };
}

describe('optional Steam adapter', () => {
  it('uses exactly the ten achievement IDs in game content', () => {
    expect(ACHIEVEMENT_IDS).toEqual(ACHIEVEMENTS.map((achievement) => achievement.id));
    expect(ACHIEVEMENT_IDS).toHaveLength(10);
  });

  it('keeps AppID 0 explicitly unconfigured without loading native code', () => {
    const loadLibrary = vi.fn();
    const adapter = createSteamAdapter({ configuration: { appId: 0 }, loadLibrary });
    expect(adapter.getStatus()).toEqual({ steam: false, steamError: expect.stringContaining('unconfigured') });
    expect(adapter.unlockAchievement('FIRST_CASCADE')).toBe(false);
    expect(loadLibrary).not.toHaveBeenCalled();
  });

  it('reads numeric config and gives the explicit environment value precedence', async () => {
    const directory = await temporaryDirectory();
    const configPath = path.join(directory, 'steam-config.json');
    await filesystem.writeFile(configPath, JSON.stringify({ appId: 1234567 }));
    expect(await loadSteamConfiguration({ configPath, environment: {} })).toEqual({ appId: 1234567 });
    expect(await loadSteamConfiguration({ configPath, environment: { POCKET_CASCADE_STEAM_APP_ID: '0' } })).toEqual({ appId: 0 });
    expect(await loadSteamConfiguration({ configPath, environment: { POCKET_CASCADE_STEAM_APP_ID: '2345678' } })).toEqual({ appId: 2345678 });
    await filesystem.writeFile(configPath, JSON.stringify({ appId: '1234567' }));
    expect(await loadSteamConfiguration({ configPath, environment: {} })).toMatchObject({ appId: 0, error: expect.any(String) });
    await filesystem.writeFile(configPath, '{broken');
    expect(await loadSteamConfiguration({ configPath, environment: {} })).toMatchObject({ appId: 0, error: expect.any(String) });
  });

  it.each(['', '-1', '1.2', '+12', '12trailing', '4294967296'])('rejects an invalid environment AppID: %s', async (appId) => {
    const readFile = vi.fn();
    expect(await loadSteamConfiguration({ environment: { POCKET_CASCADE_STEAM_APP_ID: appId }, io: { readFile } }))
      .toMatchObject({ appId: 0, error: expect.any(String) });
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each(['MODULE_NOT_FOUND', 'ERR_DLOPEN_FAILED', 'STEAM_NOT_RUNNING'])('reports %s without breaking the game', (code) => {
    const adapter = createSteamAdapter({
      configuration: { appId: 1234567 },
      loadLibrary: () => { throw Object.assign(new Error('native failure'), { code }); },
    });
    expect(adapter.getStatus()).toEqual({ steam: false, steamError: expect.any(String) });
    expect(adapter.unlockAchievement('FIRST_CASCADE')).toBe(false);
  });

  it('uses the real localplayer/achievement API without exposing player identity', () => {
    const { adapter, client, init } = steamFixture();
    expect(init).toHaveBeenCalledWith(1234567);
    expect(adapter.getStatus()).toEqual({ steam: true });
    expect(client.localplayer.getSteamId).toHaveBeenCalled();
    expect(adapter.unlockAchievement('FIRST_CASCADE')).toBe(true);
    expect(client.achievement.activate).toHaveBeenCalledWith('FIRST_CASCADE');
    expect(adapter.unlockAchievement('NOT_A_GAME_ACHIEVEMENT')).toBe(false);
    expect(adapter.unlockAchievement({ id: 'FIRST_CASCADE' })).toBe(false);
    expect(client.achievement.activate).toHaveBeenCalledOnce();
  });

  it('accepts already activated achievements only when the native API confirms them', () => {
    const { adapter, client } = steamFixture();
    client.achievement.isActivated.mockReturnValue(true);
    expect(adapter.unlockAchievement('FIRST_CASCADE')).toBe(true);
    expect(client.achievement.activate).not.toHaveBeenCalled();
  });

  it.each([false, undefined, 1, 'true'])('does not turn a native non-success result into success: %s', (result) => {
    const { adapter, client } = steamFixture();
    client.achievement.activate.mockReturnValue(result);
    expect(adapter.unlockAchievement('FIRST_CASCADE')).toBe(false);
    expect(adapter.getStatus()).toMatchObject({ steam: true, steamError: expect.any(String) });
    client.achievement.activate.mockReturnValue(true);
    expect(adapter.unlockAchievement('FIRST_CASCADE')).toBe(true);
    expect(adapter.getStatus()).toEqual({ steam: true });
  });

  it('rejects wrong-AppID and missing-player sessions and handles native exceptions', () => {
    const { adapter, client } = steamFixture();
    client.utils.getAppId.mockReturnValue(2345678);
    expect(adapter.getStatus().steam).toBe(false);
    expect(adapter.unlockAchievement('FIRST_CASCADE')).toBe(false);
    client.utils.getAppId.mockReturnValue(1234567);
    client.localplayer.getSteamId.mockReturnValue({ steamId64: 0n });
    expect(adapter.getStatus().steam).toBe(false);
    client.localplayer.getSteamId.mockReturnValue({ steamId64: 123456789n });
    client.achievement.activate.mockImplementation(() => { throw new Error('Steam disconnected'); });
    expect(adapter.unlockAchievement('FIRST_CASCADE')).toBe(false);
    expect(adapter.getStatus()).toMatchObject({ steamError: expect.any(String) });
    client.localplayer.getSteamId.mockImplementation(() => { throw new Error('Steam disconnected'); });
    expect(adapter.getStatus().steam).toBe(false);
  });
});

describe('Windows Steam packaging hook', () => {
  async function packagingFixture(appId: number) {
    vi.stubEnv('POCKET_CASCADE_STEAM_APP_ID', undefined);
    const projectDirectory = await temporaryDirectory();
    const appOutDir = await temporaryDirectory();
    await filesystem.mkdir(path.join(projectDirectory, 'electron'));
    await filesystem.writeFile(path.join(projectDirectory, 'electron', 'steam-config.json'), JSON.stringify({ appId }));
    return { electronPlatformName: 'win32', packager: { projectDir: projectDirectory }, appOutDir };
  }

  it('permits an unconfigured standalone build with no optional dependency', async () => {
    const context = await packagingFixture(0);
    await expect(afterPack(context)).resolves.toBeUndefined();
    expect(await filesystem.readdir(context.appOutDir)).toEqual([]);
  });

  it('refuses a configured Steam build when the optional dependency is absent', async () => {
    const context = await packagingFixture(1234567);
    await expect(afterPack(context)).rejects.toThrow(/optional steamworks.js is absent/);
  });

  it('copies the real package-layout DLL beside the executable without loading native code', async () => {
    const context = await packagingFixture(1234567);
    const moduleDirectory = path.join(context.packager.projectDir, 'node_modules', 'steamworks.js');
    const nativeDirectory = path.join(moduleDirectory, 'dist', 'win64');
    const unpackedDirectory = path.join(context.appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'steamworks.js', 'dist', 'win64');
    const addonFilename = 'steamworksjs.win32-x64-msvc.node';
    await filesystem.mkdir(nativeDirectory, { recursive: true });
    await filesystem.mkdir(unpackedDirectory, { recursive: true });
    await filesystem.writeFile(path.join(moduleDirectory, 'index.js'), 'throw new Error("The pack hook must not initialize native Steam.");');
    await filesystem.writeFile(path.join(nativeDirectory, addonFilename), 'unit-test-addon');
    await filesystem.writeFile(path.join(unpackedDirectory, addonFilename), 'unit-test-addon');
    await filesystem.writeFile(path.join(nativeDirectory, 'steam_api64.dll'), 'unit-test-runtime');
    await expect(afterPack(context)).resolves.toBeUndefined();
    expect(await filesystem.readFile(path.join(context.appOutDir, 'steam_api64.dll'), 'utf8')).toBe('unit-test-runtime');
    await filesystem.rm(path.join(unpackedDirectory, addonFilename));
    await expect(afterPack(context)).rejects.toThrow(/incomplete or not unpacked/);
  });
});