import { chromium, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const environment = { ...process.env, POCKET_CASCADE_STEAM_APP_ID: '0' };
for (const name of ['ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS', 'POCKET_CASCADE_DEV_URL', 'POCKET_CASCADE_DATA_DIR']) delete environment[name];
await mkdir('artifacts/release', { recursive: true });
const results = [];
const targets = [
  { name: 'unpacked', executable: path.join(root, 'release', 'win-unpacked', 'Pocket Cascade.exe') },
  { name: 'portable', executable: path.join(root, 'release', `Pocket-Cascade-${metadata.version}-win-x64-portable.exe`) },
];

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

for (const target of targets) {
  const info = await stat(target.executable);
  const hash = createHash('sha256').update(await readFile(target.executable)).digest('hex');
  const port = await availablePort();
  const processHandle = spawn(target.executable, [`--remote-debugging-port=${port}`], { cwd: root, env: environment, stdio: 'ignore' });
  let browser;
  let page;
  try {
    console.log(`Verifying ${target.name} executable...`);
    await expect.poll(async () => {
      try { return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch { return false; }
    }, { timeout: 60_000, intervals: [100, 250, 500, 1000] }).toBe(true);
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const context = browser.contexts()[0];
    page = context.pages()[0] ?? await context.waitForEvent('page');
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.getByTestId('game-ready').waitFor({ state: 'visible', timeout: 30_000 });
    await page.locator('[data-save-ready="true"]').waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.querySelectorAll('.workshop-scene img, .part-symbol img')].map((image) => image.decode())));
    const state = await page.evaluate(async () => {
      const status = await window.pocketDesktop.getStatus();
      const saved = await window.pocketDesktop.readSave();
      const canvas = document.querySelector('canvas');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set();
      for (let index = 0; index < pixels.length; index += 64) colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`);
      const environment = document.querySelector('.workshop-scene img');
      const mechanisms = [...document.querySelectorAll('.part-symbol img')];
      return {
        status, saveVersion: JSON.parse(saved.data).version, colors: colors.size,
        hasCsp: Boolean(document.querySelector('meta[http-equiv="Content-Security-Policy"]')), rendererNode: typeof window.require,
        workshop: { source: environment?.getAttribute('src'), loaded: Boolean(environment?.complete && environment.naturalWidth === 2400), mechanismImages: mechanisms.length, mechanismImagesLoaded: mechanisms.every((image) => image.complete && image.naturalWidth === 96) },
      };
    });
    assert.equal(state.status.version, metadata.version);
    assert.equal(state.status.steam, false);
    assert.equal(state.saveVersion, 1);
    assert.ok(state.colors > 100);
    assert.equal(state.hasCsp, true);
    assert.equal(state.rendererNode, 'undefined');
    assert.equal(state.workshop.loaded, true);
    assert.equal(state.workshop.mechanismImagesLoaded, true);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `artifacts/release/${target.name}.png`, fullPage: true });
    results.push({ name: target.name, filename: path.relative(root, target.executable), bytes: info.size, sha256: hash, ...state, passed: true });
    console.log(`${target.name}: actual executable launched, painted cabinet, persisted native save, sandbox/CSP intact (${(info.size / 1024 / 1024).toFixed(1)} MiB)`);
  } finally {
    if (page && !page.isClosed()) {
      await page.evaluate(() => window.pocketDesktop.quit()).catch((error) => {
        if (!/closed|destroyed/i.test(String(error))) throw error;
      });
      await expect.poll(() => processHandle.exitCode !== null, { timeout: 15_000 }).toBe(true);
    } else if (processHandle.exitCode === null) processHandle.kill();
    await browser?.close();
  }
}
await writeFile('artifacts/release/verification.json', JSON.stringify({ generatedAt: new Date().toISOString(), version: metadata.version, results }, null, 2));