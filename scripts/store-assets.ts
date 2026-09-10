import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { PARTS, ACHIEVEMENTS } from '../src/game/content';
import { planBuild, shopLegally, chooseReward } from './strategies';
import { applyBuild, drop, openGame, readRun } from '../tests/browser/helpers';

await mkdir('assets/steam/screenshots', { recursive: true });
await mkdir('assets/steam/achievements', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
const manifest: { file: string; width: number; height: number; purpose: string }[] = [];

try {
  await openGame(page);
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  const captureStages = [0, 2, 4, 7, 11];
  for (let stage = 0; stage < 12; stage += 1) {
    let run = await readRun(page);
    await applyBuild(page, planBuild(run, 'conservative').actions);
    if (captureStages.includes(stage)) {
      const filename = `screenshots/commission-${String(stage + 1).padStart(2, '0')}.png`;
      await page.getByRole('button', { name: '1x speed', exact: true }).click();
      await page.getByRole('button', { name: 'Launch token', exact: true }).click();
      await expect(page.locator('.event-feed .feed-item').first()).toBeVisible();
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.screenshot({ path: `assets/steam/${filename}`, fullPage: false });
      manifest.push({ file: filename, width: 1920, height: 1080, purpose: 'Unmodified gameplay screenshot from legal campaign actions' });
      await page.getByRole('button', { name: '4x speed', exact: true }).click();
      await expect.poll(async () => (await readRun(page)).phase, { timeout: 20_000 }).not.toBe('dropping');
    }
    run = await readRun(page);
    while (run.phase === 'ready') run = await drop(page);
    if (run.phase !== 'review') throw new Error(`Showcase campaign failed at commission ${stage + 1}`);
    await page.getByRole('button', { name: stage === 11 ? 'Complete the machine' : 'Visit the workshop', exact: true }).click();
    if (stage === 11) break;
    run = await readRun(page);
    const desired = shopLegally(run, 'conservative');
    await page.getByRole('button', { name: `Choose ${PARTS[chooseReward(run, 'conservative')].name}`, exact: true }).click();
    if (desired.power > run.power) await page.getByRole('button', { name: 'Upgrade token value', exact: true }).click();
    for (const offer of desired.offers.filter((item) => item.sold)) {
      await page.getByRole('button', { name: `Buy ${PARTS[offer.kind].name} for ${offer.price} credits`, exact: true }).click();
    }
    await page.getByRole('button', { name: 'Next commission', exact: true }).click();
  }
  await page.getByTestId('machine-canvas').screenshot({ path: 'assets/steam/completed-cabinet.png' });

  const assets = [
    { file: 'header-capsule.png', width: 920, height: 430, layout: 'wide' },
    { file: 'small-capsule.png', width: 462, height: 174, layout: 'small' },
    { file: 'main-capsule.png', width: 1232, height: 706, layout: 'wide' },
    { file: 'vertical-capsule.png', width: 748, height: 896, layout: 'tall' },
    { file: 'library-capsule.png', width: 600, height: 900, layout: 'tall' },
    { file: 'library-header.png', width: 920, height: 430, layout: 'wide' },
    { file: 'library-hero.png', width: 3840, height: 1240, layout: 'hero' },
    { file: 'library-logo.png', width: 1280, height: 500, layout: 'logo' },
  ];

  for (const asset of assets) {
    const data = await page.evaluate(async ({ width, height, layout }) => {
      await document.fonts.load('700 120px "Barlow Condensed"');
      const colors = getComputedStyle(document.documentElement);
      const palette = { color(name: string) { return colors.getPropertyValue(`--cp-${name}`).trim(); } };
      const color = palette.color.bind(palette);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d')!;
      const small = layout === 'small';
      const tall = layout === 'tall';
      const unit = Math.min(width, height);

      if (layout !== 'logo') {
        const environment = document.querySelector<HTMLImageElement>('.workshop-scene img')!;
        await environment.decode();
        const scale = Math.max(width / environment.naturalWidth, height / environment.naturalHeight);
        context.drawImage(environment, (width - environment.naturalWidth * scale) / 2, 0, environment.naturalWidth * scale, environment.naturalHeight * scale);
        if (layout !== 'hero') {
          context.fillStyle = color('surface');
          context.globalAlpha = 0.28;
          context.fillRect(0, 0, width, height);
          context.globalAlpha = 1;
          const cabinet = document.querySelector<HTMLCanvasElement>('[data-testid="machine-canvas"]')!;
          const cabinetHeight = height * (tall ? 0.54 : 0.8);
          const cabinetWidth = cabinetHeight * 500 / 650;
          context.save();
          context.translate(width * (tall ? 0.5 : 0.76), height * (tall ? 0.71 : 0.51));
          context.rotate(tall ? -0.04 : 0.06);
          context.shadowColor = color('bg');
          context.shadowBlur = unit * 0.055;
          context.shadowOffsetY = unit * 0.016;
          context.drawImage(cabinet, -cabinetWidth / 2, -cabinetHeight / 2, cabinetWidth, cabinetHeight);
          context.restore();
        }
      }

      if (layout !== 'hero') {
        context.save();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = color('surface');
        context.shadowBlur = unit * 0.045;
        context.shadowOffsetY = unit * 0.008;
        const centerX = tall || layout === 'logo' ? width / 2 : width * 0.3;
        const centerY = tall ? height * 0.20 : height * 0.5;
        const size = small ? 67 : tall ? width * 0.16 : layout === 'logo' ? 168 : width * 0.10;
        context.font = `500 ${Math.round(size * 0.66)}px "Barlow Condensed"`;
        context.fillStyle = color('text');
        context.fillText('POCKET', centerX, centerY - size * 0.47);
        context.font = `700 ${Math.round(size)}px "Barlow Condensed"`;
        context.fillStyle = color('warning');
        context.fillText('CASCADE', centerX, centerY + size * 0.4);
        context.restore();
      }
      return canvas.toDataURL('image/png').split(',')[1];
    }, asset);
    await writeFile(`assets/steam/${asset.file}`, Buffer.from(data, 'base64'));
    const dimensions = await sharp(`assets/steam/${asset.file}`).metadata();
    if (dimensions.width !== asset.width || dimensions.height !== asset.height) throw new Error(`Wrong dimensions: ${asset.file}`);
    manifest.push({ file: asset.file, width: asset.width, height: asset.height, purpose: asset.layout === 'hero' ? 'Original text-free library artwork' : 'Original title-only capsule/logo artwork' });
  }

  const icon = await sharp('assets/icon.png').resize(256, 256).png().toBuffer();
  const locked = await sharp(icon).grayscale().modulate({ brightness: 0.6 }).png().toBuffer();
  for (const achievement of ACHIEVEMENTS) {
    await writeFile(`assets/steam/achievements/${achievement.id}.png`, icon);
    await writeFile(`assets/steam/achievements/${achievement.id}-locked.png`, locked);
  }
  await writeFile('assets/steam/manifest.json', JSON.stringify({ generatedAt: new Date().toISOString(), source: 'scripts/store-assets.ts', gameplaySeed: 42, assets: manifest }, null, 2));
  console.log(`Generated ${manifest.length} validated Steam images and ${ACHIEVEMENTS.length * 2} achievement icons from original assets and real gameplay.`);
} finally {
  await browser.close();
}