import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'previews');
const origin = process.env.CONCEPT_ORIGIN ?? 'http://127.0.0.1:5173';
const concepts = ['toy', 'arcade', 'paper', 'instrument'];
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const results = [];
const errors = [];
try {
  for (const viewport of [{ width: 1440, height: 1040 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
      const denyStorage = () => { throw new Error('Concept tried to access persistent storage'); };
      Storage.prototype.getItem = denyStorage;
      Storage.prototype.setItem = denyStorage;
      Storage.prototype.removeItem = denyStorage;
      Storage.prototype.clear = denyStorage;
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.url().startsWith('http') && new URL(request.url()).origin !== origin) errors.push(`External request: ${request.url()}`);
    });
    for (const [index, concept] of concepts.entries()) {
      await page.goto(`${origin}/tools/concepts/?concept=${concept}`);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const geometry = await page.evaluate(() => {
        const board = document.querySelector('.board-surface');
        const bounds = board.getBoundingClientRect();
        const canvas = board.querySelector('canvas');
        const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        const colors = new Set();
        for (let offset = 0; offset < pixels.length; offset += 128) colors.add(`${pixels[offset]}:${pixels[offset+1]}:${pixels[offset+2]}`);
        const consoleBounds = document.querySelector('.console').getBoundingClientRect();
        const textBounds = selector => {
          const range = document.createRange();
          range.selectNodeContents(document.querySelector(selector));
          const rect = range.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        };
        const scoreText = textBounds('.score-digits');
        const targetText = textBounds('.target-readout strong');
        const scoreTargetOverlap = Math.min(scoreText.right, targetText.right) > Math.max(scoreText.left, targetText.left)
          && Math.min(scoreText.bottom, targetText.bottom) > Math.max(scoreText.top, targetText.top);
        const controls = [...document.querySelectorAll('button')].filter(button => button.getClientRects().length).map(button => {
          const rect = button.getBoundingClientRect();
          return { name: button.getAttribute('aria-label') ?? button.textContent.trim(), left: rect.left, right: rect.right, width: rect.width, height: rect.height, scroll: button.scrollWidth, client: button.clientWidth };
        });
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, boardWidth: bounds.width, ratio: bounds.width/bounds.height, colors: colors.size, height: document.documentElement.scrollHeight, consoleWidth: consoleBounds.width, scoreTargetOverlap, controls };
      });
      assert.ok(geometry.scrollWidth <= viewport.width, `${concept} overflow at ${viewport.width}: ${geometry.scrollWidth}`);
      assert.ok(geometry.boardWidth >= (viewport.width < 400 ? 245 : 300), `${concept} board too small: ${geometry.boardWidth}`);
      assert.ok(Math.abs(geometry.ratio - 500/650) < .001, 'Board proportions changed');
      assert.ok(geometry.colors > 40, `${concept} board is blank`);
      assert.equal(geometry.scoreTargetOverlap, false, `${concept}: score and target overlap at ${viewport.width}`);
      for (const control of geometry.controls) {
        assert.ok(control.width > 0 && control.height > 0, `${concept}: zero-size ${control.name}`);
        assert.ok(control.left >= -1 && control.right <= viewport.width+1, `${concept}: offscreen ${control.name}`);
        assert.ok(control.scroll <= control.client + 2, `${concept}: text overflow ${control.name}`);
      }
      const suffix = viewport.width === 1440 ? 'desktop' : `mobile-${viewport.width}`;
      await page.screenshot({ path: path.join(directory, `${index+1}-${concept}-${suffix}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Reward', exact: true }).click();
      await page.locator('.reward-scene').waitFor({state:'visible'});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${concept}: reward overflow`);
      if (viewport.width !== 320) await page.screenshot({ path: path.join(directory, `${index+1}-${concept}-reward-${suffix}.png`), fullPage: true });
      results.push({ concept, viewport, ...geometry, controls: geometry.controls.length });
      if (viewport.width === 1440) {
        await page.getByRole('button', { name: 'Back to machine', exact: true }).click();
        await page.getByRole('button', { name: 'Aim lane 2', exact: true }).click();
        assert.equal(await page.getByRole('button', {name:'Aim lane 2',exact:true}).getAttribute('aria-pressed'), 'true');
        await page.getByRole('button', {name:'4x',exact:true}).click();
        await page.locator('.launch-control').click();
        await page.locator('.concept-app[data-playing="true"]').waitFor();
        await page.locator('.concept-app[data-playing="false"]').waitFor({timeout:15000});
        assert.notEqual(await page.locator('.score-digits').textContent(), '2,480');
        await page.getByRole('button', { name:'Reset sample',exact:true }).click();
        assert.equal(await page.locator('.score-digits').textContent(), '2,480');
        await page.locator('.part-cell').first().click();
        await page.getByRole('button',{name:'Place at 6-0',exact:true}).click();
        assert.equal(await page.locator('.part-count').textContent(),'03');
        await page.getByRole('button',{name:'Reset sample',exact:true}).click();
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  const tileWidth = 720;
  const tileHeight = 550;
  for (const scene of ['machine','reward']) {
    const tiles = [];
    for (const [index, concept] of concepts.entries()) {
      const source = path.join(directory, `${index+1}-${concept}-${scene === 'reward' ? 'reward-' : ''}desktop.png`);
      const image = await sharp(source).resize(tileWidth,tileHeight,{fit:'contain',background:'#f0f2ee'}).png().toBuffer();
      tiles.push({input:image,left:(index%2)*tileWidth,top:Math.floor(index/2)*tileHeight});
    }
    await sharp({create:{width:tileWidth*2,height:tileHeight*2,channels:3,background:'#f0f2ee'}}).composite(tiles).png().toFile(path.join(directory,`${scene}-comparison.png`));
  }
  await writeFile(path.join(directory,'validation.json'),JSON.stringify({generatedAt:new Date().toISOString(),results,errors,storageAccess:'blocked during validation',gameChanges:false},null,2));
  console.log(`Validated ${results.length} concept/viewports, local fonts/art, real preview cascades, placement, reset, and no storage access. Comparison PNGs saved.`);
} finally {
  await browser.close();
}