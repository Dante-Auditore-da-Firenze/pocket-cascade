import { expect, test, type Page, type TestInfo } from '@playwright/test';
import sharp from 'sharp';
import { canvasPixels, openGame } from './helpers';

interface LayoutViewport {
  width: number;
  height: number;
  minimumCabinetWidth?: number;
}

const viewports: LayoutViewport[] = [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 760, height: 540 },
  { width: 768, height: 1024 },
  { width: 980, height: 720, minimumCabinetWidth: 380 },
  { width: 1100, height: 800, minimumCabinetWidth: 440 },
  { width: 1280, height: 720, minimumCabinetWidth: 380 },
  { width: 1440, height: 900, minimumCabinetWidth: 500 },
  { width: 1920, height: 1080, minimumCabinetWidth: 581 },
  { width: 2560, height: 1440, minimumCabinetWidth: 751 },
  { width: 3440, height: 1440, minimumCabinetWidth: 751 },
];

async function skipGuide(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'Skip guide', exact: true });
  if (await skip.isVisible()) await skip.click();
  await expect(page.locator('.onboarding-bar')).not.toBeVisible();
}

async function checkLayout(page: Page, viewport: LayoutViewport) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  const layout = await page.evaluate(() => {
    function bounds(element: Element) {
      const rectangle = element.getBoundingClientRect();
      return {
        left: rectangle.left, top: rectangle.top, right: rectangle.right, bottom: rectangle.bottom,
        width: rectangle.width, height: rectangle.height,
      };
    }
    function measure(selector: string) {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing layout element: ${selector}`);
      return bounds(element);
    }
    const workspace = document.querySelector('.workspace');
    if (!workspace) throw new Error('Missing workspace');
    const style = getComputedStyle(workspace);
    const controls = Array.from(document.querySelectorAll('.topbar button, .machine-actions button, .launch-console button, .onboarding-bar button'))
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
      .map((element) => ({ ...bounds(element), label: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? 'Control' }));
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      tracks: style.display === 'grid' ? style.gridTemplateColumns.split(/\s+/).map(Number.parseFloat) : [],
      gap: Number.parseFloat(style.columnGap),
      header: measure('.topbar'),
      workspace: measure('.workspace'),
      commission: measure('.commission-panel'),
      machine: measure('.machine-column'),
      canvas: measure('[data-testid="machine-canvas"]'),
      worktable: measure('.worktable-panel'),
      launch: measure('.launch-button'),
      controls,
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(viewport.width);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.canvas.width).toBeGreaterThan(280);
  expect(layout.canvas.height / layout.canvas.width).toBeCloseTo(650 / 500, 2);
  expect(Math.abs(layout.canvas.width - layout.machine.width)).toBeLessThan(1);
  expect(Math.abs(layout.canvas.left - layout.machine.left)).toBeLessThan(1);
  if (viewport.minimumCabinetWidth !== undefined) expect(layout.canvas.width).toBeGreaterThanOrEqual(viewport.minimumCabinetWidth);

  if (viewport.width > 930) {
    expect(layout.tracks).toHaveLength(3);
    expect(layout.commission.width).toBeGreaterThanOrEqual(200);
    expect(layout.commission.width).toBeLessThanOrEqual(280);
    expect(layout.worktable.width).toBeGreaterThanOrEqual(260);
    expect(layout.worktable.width).toBeLessThanOrEqual(330);
    expect(layout.workspace.width).toBeLessThanOrEqual(1640);
    expect(layout.canvas.width).toBeLessThanOrEqual(850);
    expect(layout.gap).toBeGreaterThanOrEqual(22);
    expect(layout.gap).toBeLessThanOrEqual(32);
    expect(Math.abs(layout.tracks[1] - layout.machine.width)).toBeLessThan(1);
    expect(Math.abs(layout.machine.left - layout.commission.right - layout.gap)).toBeLessThan(1);
    expect(Math.abs(layout.worktable.left - layout.machine.right - layout.gap)).toBeLessThan(1);
    expect(Math.abs((layout.commission.left + layout.worktable.right) / 2 - viewport.width / 2)).toBeLessThanOrEqual(9);
    expect(layout.header.height).toBeLessThanOrEqual(72);
    expect(layout.launch.bottom).toBeLessThanOrEqual(viewport.height - 15);
  } else if (viewport.width > 650) {
    expect(layout.tracks).toHaveLength(2);
    expect(layout.machine.top).toBeGreaterThanOrEqual(layout.commission.bottom);
    expect(layout.worktable.top).toBeGreaterThanOrEqual(layout.commission.bottom);
    expect(Math.abs(layout.machine.top - layout.worktable.top)).toBeLessThan(1);
    expect(Math.abs(layout.worktable.left - layout.machine.right - layout.gap)).toBeLessThan(1);
  } else {
    expect(layout.tracks).toHaveLength(0);
    expect(layout.machine.top).toBeGreaterThanOrEqual(layout.commission.bottom);
    expect(layout.worktable.top).toBeGreaterThanOrEqual(layout.machine.bottom);
  }

  for (const control of layout.controls) {
    expect(control.left, control.label).toBeGreaterThanOrEqual(0);
    expect(control.right, control.label).toBeLessThanOrEqual(viewport.width);
    expect(control.width, control.label).toBeGreaterThanOrEqual(20);
    expect(control.height, control.label).toBeGreaterThanOrEqual(20);
  }
  for (let firstIndex = 0; firstIndex < layout.controls.length; firstIndex += 1) {
    for (const second of layout.controls.slice(firstIndex + 1)) {
      const first = layout.controls[firstIndex];
      const overlapWidth = Math.min(first.right, second.right) - Math.max(first.left, second.left);
      const overlapHeight = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
      expect(overlapWidth > 1 && overlapHeight > 1, `${first.label} overlaps ${second.label}`).toBe(false);
    }
  }
  return layout;
}

async function captureLayout(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath(`${name}-viewport.png`) });
  const canvas = page.getByTestId('machine-canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const screenshot = await canvas.screenshot({ path: testInfo.outputPath(`${name}-cabinet.png`) });
    const statistics = await sharp(screenshot).stats();
    return statistics.channels.slice(0, 3).reduce((total, channel) => total + channel.stdev, 0);
  }, { message: 'The resized cabinet must be visibly painted, not just have a populated canvas buffer' }).toBeGreaterThan(25);
  expect((await canvasPixels(page)).colors).toBeGreaterThan(100);
  await page.screenshot({ path: testInfo.outputPath(`${name}-page.png`), fullPage: true });
}

for (const viewport of viewports) {
  test(`regular cabinet fills its track at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGame(page);
    await skipGuide(page);
    await checkLayout(page, viewport);
    const lane = page.getByRole('button', { name: 'Aim lane 9', exact: true });
    await lane.click();
    await expect(lane).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Launch token', exact: true }).click({ trial: true });
    if (viewport.width <= 930) {
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    }
    await captureLayout(page, testInfo, 'regular');
  });
}

for (const viewport of viewports.filter(({ width }) => [320, 390, 768, 1280, 1440, 1920].includes(width))) {
  test(`first-run guide keeps controls separated at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGame(page);
    const guide = page.locator('.onboarding-bar');
    await expect(guide).toBeVisible();
    const withGuide = await checkLayout(page, { width: viewport.width, height: viewport.height });
    const guideBounds = await guide.boundingBox();
    expect(guideBounds).not.toBeNull();
    expect(guideBounds!.height).toBeLessThanOrEqual(viewport.width > 650 ? 96 : 140);
    expect(guideBounds!.y).toBeGreaterThanOrEqual(withGuide.header.bottom);
    expect(guideBounds!.y + guideBounds!.height).toBeLessThanOrEqual(withGuide.workspace.top);
    await captureLayout(page, testInfo, 'guide');
    await page.getByRole('button', { name: 'Skip guide', exact: true }).click();
    await expect(guide).not.toBeVisible();
    const withoutGuide = await checkLayout(page, viewport);
    if (viewport.width > 930) expect(withoutGuide.canvas.width).toBeGreaterThan(withGuide.canvas.width + 5);
  });
}

test('cabinet repaints through desktop, ultrawide, and mobile resizes', async ({ page }, testInfo) => {
  await openGame(page);
  await skipGuide(page);
  for (const viewport of viewports.filter(({ width }) => [2560, 3440, 390, 1440].includes(width)).reverse()) {
    await page.setViewportSize(viewport);
    await checkLayout(page, viewport);
    await expect(page.locator('[data-slot]')).toHaveCount(46);
    await captureLayout(page, testInfo, `resize-${viewport.width}`);
  }
});