import { test, expect } from '@playwright/test';
import { dropConfig } from '../../src/game/engine';
import { PART_KINDS } from '../../src/game/content';
import { simulateDrop } from '../../src/game/simulation';
import { canvasPixels, drop, openGame, readRun } from './helpers';

test('every mechanism has a bounded activation pose and returns to its mounted idle pose', async ({ page }) => {
  await openGame(page);
  const poses = await page.evaluate(async () => {
    const artUrl = '/src/render/art.ts';
    const paletteUrl = '/src/render/palette.ts';
    const contentUrl = '/src/game/content.ts';
    const { paintMechanism, cabinetMaterials } = await import(artUrl) as typeof import('../../src/render/art');
    const { readCabinetPalette } = await import(paletteUrl) as typeof import('../../src/render/palette');
    const { PART_KINDS } = await import(contentUrl) as typeof import('../../src/game/content');
    const palette = readCabinetPalette(document.querySelector<HTMLElement>('.cabinet-board')!);
    const material = cabinetMaterials(palette);
    const canvas = document.createElement('canvas');
    canvas.width = 104;
    canvas.height = 104;
    const context = canvas.getContext('2d')!;
    const draw = (kind: typeof PART_KINDS[number], phase: number) => {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, 104, 104);
      context.setTransform(2, 0, 0, 2, 52, 52);
      paintMechanism(context, { id: 'part-1', kind, direction: 1 }, palette, material, phase);
      return canvas.toDataURL();
    };
    return PART_KINDS.map((kind) => ({ kind, moves: draw(kind, 0) !== draw(kind, 0.35), settles: draw(kind, 0) === draw(kind, 1) }));
  });
  expect(poses).toHaveLength(PART_KINDS.length);
  for (const pose of poses) expect(pose, pose.kind).toMatchObject({ moves: true, settles: true });
});

test('the drop head carries one ready token to each selected lane and releases a real cascade', async ({ page }, testInfo) => {
  await openGame(page);
  expect((await readRun(page)).lane).toBe(0);
  await expect(page.getByRole('button', { name: 'Aim lane 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (let lane = 0; lane < 9; lane += 1) {
    await page.getByRole('button', { name: `Aim lane ${lane + 1}`, exact: true }).click();
    expect((await readRun(page)).lane).toBe(lane);
    await expect.poll(() => page.getByTestId('machine-canvas').evaluate((element, selectedLane) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      const tokenPixels = (candidate: number) => {
        let gold = 0;
        for (let offsetX = -4; offsetX <= 4; offsetX += 1) {
          for (let offsetY = -4; offsetY <= 4; offsetY += 1) {
            const pixel = context.getImageData(Math.floor((58 + candidate * 48 + offsetX) / 500 * canvas.width), Math.floor((38 + offsetY) / 650 * canvas.height), 1, 1).data;
            if (pixel[0] > pixel[2] + 25 && pixel[1] > pixel[2] + 15) gold += 1;
          }
        }
        return gold;
      };
      return tokenPixels(selectedLane) > 20 && tokenPixels((selectedLane + 1) % 9) < 5;
    }, lane)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('rail-mounted-drop-head.png'), fullPage: true });
  const run = await readRun(page);
  const settled = await drop(page);
  expect(settled.lastDrop).toEqual(simulateDrop(dropConfig(run)));
  expect(settled.lane).toBe(8);
  await page.screenshot({ path: testInfo.outputPath('collector-payout.png'), fullPage: true });
  await page.reload();
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  expect((await readRun(page)).lane).toBe(8);
  await expect(page.getByRole('button', { name: 'Aim lane 9', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('playfield stays neutral in daylight and evening without hiding physical pegs', async ({ page }) => {
  await openGame(page);
  for (const lighting of ['dark', 'light']) {
    if (lighting === 'light') {
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByRole('switch', { name: 'Evening lighting', exact: true }).uncheck();
      await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    }
    const surface = await page.getByTestId('machine-canvas').evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      return [120, 250, 320].map((position) => [...context.getImageData(Math.floor(position / 500 * canvas.width), Math.floor(547 / 650 * canvas.height), 1, 1).data].slice(0, 3));
    });
    for (const channels of surface) expect(Math.max(...channels) - Math.min(...channels)).toBeLessThan(12);
    await expect(page.locator('[data-slot]')).toHaveCount(46);
    expect((await canvasPixels(page)).colors).toBeGreaterThan(100);
  }
});

test('workshop text and launch labels retain contrast in both lighting modes', async ({ page }) => {
  await openGame(page);
  for (const lighting of ['dark', 'light']) {
    if (lighting === 'light') {
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByRole('switch', { name: 'Evening lighting', exact: true }).uncheck();
      await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    }
    const contrast = await page.evaluate(() => {
      const sampler = document.createElement('canvas');
      sampler.width = 1;
      sampler.height = 1;
      const context = sampler.getContext('2d')!;
      const brightness = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const ratio = (foreground: string, background: string) => {
        const first = brightness(foreground);
        const second = brightness(background);
        return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
      };
      const palette = getComputedStyle(document.documentElement);
      const surface = palette.getPropertyValue('--cp-surface');
      const button = getComputedStyle(document.querySelector('.launch-button')!);
      const small = getComputedStyle(document.querySelector('.launch-button small')!);
      return {
        text: ['text', 'text-muted', 'text-soft', 'warning', 'accent', 'success', 'link'].map((name) => ({ name, ratio: ratio(palette.getPropertyValue(`--cp-${name}`), surface) })),
        launch: ratio(button.color, button.backgroundColor),
        small: ratio(small.color, button.backgroundColor),
        smallOpacity: small.opacity,
      };
    });
    for (const color of contrast.text) expect(color.ratio, `${lighting} ${color.name}`).toBeGreaterThanOrEqual(4.5);
    expect(contrast.launch).toBeGreaterThanOrEqual(4.5);
    expect(contrast.small).toBeGreaterThanOrEqual(4.5);
    expect(contrast.smallOpacity).toBe('1');
  }
});

for (const viewport of [{ width: 1280, height: 360 }, { width: 1100, height: 240 }, { width: 1920, height: 360 }]) {
  test(`short workshop pane keeps a usable cabinet at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGame(page);
    const canvas = await page.getByTestId('machine-canvas').boundingBox();
    expect(canvas!.width).toBeGreaterThanOrEqual(320);
    const controls = await page.locator('.machine-toolbar button, .launch-console button').evaluateAll((elements) => elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
    }));
    for (const [index, first] of controls.entries()) {
      expect(first.left).toBeGreaterThanOrEqual(0);
      expect(first.right).toBeLessThanOrEqual(viewport.width);
      for (const second of controls.slice(index + 1)) {
        expect(Math.min(first.right, second.right) > Math.max(first.left, second.left) + 1 && Math.min(first.bottom, second.bottom) > Math.max(first.top, second.top) + 1).toBe(false);
      }
    }
    await page.getByRole('button', { name: 'Aim lane 9', exact: true }).click();
    expect((await readRun(page)).lane).toBe(8);
    await page.getByRole('button', { name: 'Launch token', exact: true }).click({ trial: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('short-workshop.png'), fullPage: true });
  });
}

test('all ten mechanism illustrations repaint with the cabinet lighting', async ({ page }, testInfo) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Part collection', exact: true }).click();
  const images = page.locator('.catalogue-part .part-symbol img');
  await expect(images).toHaveCount(PART_KINDS.length);
  await expect.poll(() => images.evaluateAll((elements) => elements.every((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth === 96))).toBe(true);
  const darkImages = await images.evaluateAll((elements) => elements.map((element) => (element as HTMLImageElement).src));
  expect(new Set(darkImages).size).toBe(PART_KINDS.length);
  await page.screenshot({ path: testInfo.outputPath('clockwork-parts.png'), fullPage: true });
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Evening lighting', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Part collection', exact: true }).click();
  await expect(images).toHaveCount(PART_KINDS.length);
  const lightImages = await images.evaluateAll((elements) => elements.map((element) => (element as HTMLImageElement).src));
  expect(lightImages.every((source, index) => source !== darkImages[index])).toBe(true);
});

test('clockwork workshop paints local scenery and animates an unchanged real cascade', async ({ page }, testInfo) => {
  await openGame(page);
  const scene = page.locator('.workshop-scene');
  await expect(scene).toHaveAttribute('aria-hidden', 'true');
  expect(await scene.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
  await expect.poll(() => scene.locator('.workshop-backdrop').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 2400)).toBe(true);
  const original = await readRun(page);
  const expected = simulateDrop(dropConfig(original));
  const canvas = page.getByTestId('machine-canvas');
  const before = await canvas.screenshot();
  await page.getByRole('button', { name: 'Launch token', exact: true }).click();
  await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('clockwork-in-motion.png'), fullPage: true });
  await expect.poll(async () => (await readRun(page)).totalDrops, { timeout: 20_000 }).toBe(original.totalDrops + 1);
  const settled = await readRun(page);
  expect(settled.lastDrop).toEqual(expected);
  expect((await canvasPixels(page)).colors).toBeGreaterThan(100);
  await page.reload();
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  expect(await readRun(page)).toEqual(settled);
});

test('workshop lighting and reduced motion preserve play and local assets', async ({ page }, testInfo) => {
  await openGame(page);
  const original = await readRun(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Evening lighting', exact: true }).uncheck();
  await expect(page.locator('.workshop-backdrop')).toHaveAttribute('src', './workshop/light.webp');
  await expect.poll(() => page.locator('.workshop-backdrop').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 2400)).toBe(true);
  await page.getByRole('button', { name: 'Accessibility options', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduced motion', exact: true }).check();
  await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('daylight-workshop.png'), fullPage: true });
  const settled = await drop(page);
  expect(settled.lastDrop).toEqual(simulateDrop(dropConfig(original)));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`original room layers stay registered and respect pause and reduced motion at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGame(page);
    const scene = page.locator('.workshop-scene');
    await expect.poll(() => scene.locator('img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const gear = page.locator('.workshop-gear-large');
    const before = await gear.evaluate((element) => getComputedStyle(element).transform);
    await expect.poll(() => gear.evaluate((element) => getComputedStyle(element).transform)).not.toBe(before);
    const registration = await page.evaluate(() => {
      const room = document.querySelector('.workshop-room')!.getBoundingClientRect();
      const gear = document.querySelector('.workshop-gear-large')!.getBoundingClientRect();
      return { horizontal: ((gear.left + gear.right) / 2 - room.left) / room.width, vertical: ((gear.top + gear.bottom) / 2 - room.top) / room.height };
    });
    expect(registration.horizontal).toBeCloseTo(74 / 2400, 4);
    expect(registration.vertical).toBeCloseTo(1068 / 1600, 4);
    await page.getByRole('button', { name: 'Pause cascade', exact: true }).click();
    await expect(scene).toHaveAttribute('data-still', 'true');
    expect(await gear.evaluate((element) => element.getAnimations().every((animation) => animation.playState === 'paused'))).toBe(true);
    await page.getByRole('button', { name: 'Resume cascade', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Accessibility options', exact: true }).click();
    await page.getByRole('switch', { name: 'Reduced motion', exact: true }).check();
    await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await expect(scene).toHaveAttribute('data-still', 'true');
    expect(await gear.evaluate((element) => element.getAnimations().every((animation) => animation.playState === 'paused' || animation.playState === 'finished'))).toBe(true);
    const original = await readRun(page);
    const settled = await drop(page);
    expect(settled.lastDrop).toEqual(simulateDrop(dropConfig(original)));
    expect((await canvasPixels(page)).colors).toBeGreaterThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`living-workshop-${viewport.width}.png`), fullPage: true });
  });
}