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

      const painter = { coin(centerX: number, centerY: number, radius: number, variant: number, noText: boolean) {
        context.save();
        context.translate(centerX, centerY);
        context.shadowColor = color('surface');
        context.shadowBlur = radius * 0.3;
        context.shadowOffsetY = radius * 0.13;
        context.fillStyle = color('surface');
        context.strokeStyle = color(variant % 3 === 0 ? 'warning' : variant % 3 === 1 ? 'success' : 'accent');
        context.lineWidth = radius * 0.075;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.shadowBlur = 0;
        context.shadowOffsetY = 0;
        context.lineWidth = radius * 0.025;
        context.beginPath();
        context.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
        context.stroke();
        if (noText) {
          context.beginPath();
          context.moveTo(-radius * 0.3, radius * 0.2);
          context.lineTo(0, -radius * 0.25);
          context.lineTo(radius * 0.3, radius * 0.2);
          context.stroke();
        } else {
          context.fillStyle = context.strokeStyle;
          context.font = `600 ${Math.round(radius * 1.04)}px "Barlow Condensed"`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(['x2', '+', 'Y'][variant % 3], 0, -radius * 0.03);
        }
        context.restore();
      } };

      if (layout !== 'logo') {
        context.fillStyle = color('surface');
        context.fillRect(0, 0, width, height);
        context.globalAlpha = 0.11;
        context.fillStyle = color('success');
        context.fillRect(0, 0, width, height);
        context.globalAlpha = 0.18;
        context.strokeStyle = color('border-strong');
        context.lineWidth = 1;
        for (let index = -height; index < width + height; index += unit * 0.1) {
          context.beginPath(); context.moveTo(index, 0); context.lineTo(index + height, height); context.stroke();
        }
        context.globalAlpha = 1;
        context.strokeStyle = color('warning');
        context.lineWidth = Math.max(2, unit * 0.007);
        context.strokeRect(unit * 0.035, unit * 0.035, width - unit * 0.07, height - unit * 0.07);

        if (!small) {
          const points = tall
            ? [{ x: 0.5, y: 0.50 }, { x: 0.24, y: 0.7 }, { x: 0.76, y: 0.7 }, { x: 0.40, y: 0.91 }, { x: 0.82, y: 0.93 }]
            : layout === 'hero'
              ? [{ x: 0.26, y: 0.2 }, { x: 0.41, y: 0.48 }, { x: 0.61, y: 0.25 }, { x: 0.54, y: 0.77 }, { x: 0.75, y: 0.74 }]
              : [{ x: 0.08, y: 0.12 }, { x: 0.9, y: 0.18 }, { x: 0.11, y: 0.82 }, { x: 0.82, y: 0.86 }, { x: 0.97, y: 0.76 }];
          context.strokeStyle = color('warning');
          context.globalAlpha = 0.36;
          context.lineWidth = unit * 0.008;
          context.setLineDash([unit * 0.012, unit * 0.016]);
          context.beginPath();
          points.forEach((point, index) => {
            if (index === 0) context.moveTo(point.x * width, point.y * height);
            else context.lineTo(point.x * width, point.y * height);
          });
          context.stroke();
          context.setLineDash([]);
          context.globalAlpha = 1;
          points.forEach((point, index) => painter.coin(point.x * width, point.y * height, unit * (tall ? 0.12 : layout === 'hero' ? 0.125 : 0.105), index, layout === 'hero'));
        }
      }

      if (layout !== 'hero') {
        context.save();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = color('surface');
        context.shadowBlur = unit * 0.045;
        context.shadowOffsetY = unit * 0.008;
        const centerY = tall ? height * 0.225 : height * 0.5;
        const size = small ? 67 : tall ? width * 0.16 : layout === 'logo' ? 168 : width * 0.11;
        context.font = `500 ${Math.round(size * 0.66)}px "Barlow Condensed"`;
        context.fillStyle = color('text');
        context.fillText('POCKET', width / 2, centerY - size * 0.47);
        context.font = `700 ${Math.round(size)}px "Barlow Condensed"`;
        context.fillStyle = color('warning');
        context.fillText('CASCADE', width / 2, centerY + size * 0.4);
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