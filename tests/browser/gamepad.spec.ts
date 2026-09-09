import { test, expect, type Locator, type Page } from '@playwright/test';
import { openGame, readRun, readSave } from './helpers';

const buttons = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, start: 9, up: 12, down: 13, left: 14, right: 15 } as const;
type ButtonName = keyof typeof buttons;

async function installController(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const gamepad = {
      id: 'Pocket Cascade test controller',
      index: 0,
      connected: true,
      mapping: 'standard',
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      vibrationActuator: null,
      hapticActuators: [],
    };
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => {
        gamepad.timestamp = performance.now();
        return [gamepad, null, null, null];
      },
    });
  });
}

async function setButton(page: Page, name: ButtonName, pressed: boolean): Promise<void> {
  await page.evaluate(({ index, pressed }) => {
    const button = navigator.getGamepads()[0]!.buttons[index] as { pressed: boolean; touched: boolean; value: number };
    button.pressed = pressed;
    button.touched = pressed;
    button.value = pressed ? 1 : 0;
  }, { index: buttons[name], pressed });
}

async function pressButton(page: Page, name: ButtonName, duration = 40): Promise<void> {
  await page.bringToFront();
  await setButton(page, name, true);
  try {
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    if (duration > 40) await page.waitForTimeout(duration);
  } finally {
    await setButton(page, name, false);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
}

async function setStick(page: Page, horizontal: number, vertical: number): Promise<void> {
  await page.evaluate(({ horizontal, vertical }) => {
    const axes = navigator.getGamepads()[0]!.axes as number[];
    axes[0] = horizontal;
    axes[1] = vertical;
  }, { horizontal, vertical });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function focus(control: Locator): Promise<void> {
  await control.evaluate((element) => (element as HTMLElement).focus({ preventScroll: true }));
}

test.beforeEach(async ({ page }) => {
  await installController(page);
  await openGame(page);
  await page.bringToFront();
  await page.waitForTimeout(40);
});

test('detects a standard controller, opens the menu with Start, confines focus, and closes with B', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByText('Controller detected', { exact: true })).toBeVisible();
  await pressButton(page, 'start');
  const dialog = page.getByRole('dialog', { name: 'A moment in the workshop', exact: true });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Close dialog', exact: true });
  const last = dialog.getByRole('button', { name: 'Machine manual', exact: true });
  await focus(close);
  await pressButton(page, 'lb');
  await expect(last).toBeFocused();
  await pressButton(page, 'rb');
  await expect(close).toBeFocused();
  await pressButton(page, 'down');
  await expect(close).not.toBeFocused();
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await pressButton(page, 'b');
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('A activates the currently focused part once, X rotates it, and directions and shoulders reach board controls', async ({ page }) => {
  const part = page.getByRole('button', { name: 'Select Fork facing right, 1 available', exact: true });
  await focus(part);
  await pressButton(page, 'a', 400);
  await expect(part).toHaveAttribute('aria-pressed', 'true');
  const rotation = page.locator('.part-inspector').getByRole('button', { name: /^(Left|Right)$/ });
  const previousDirection = await rotation.innerText();
  await pressButton(page, 'x');
  await expect(rotation).toHaveText(previousDirection === 'Right' ? 'Left' : 'Right');

  const sockets = page.locator('button[data-slot]');
  const socket = sockets.nth(10);
  await focus(socket);
  await pressButton(page, 'rb');
  await expect(sockets.nth(11)).toBeFocused();
  await pressButton(page, 'lb');
  await expect(socket).toBeFocused();

  const origin = await socket.boundingBox();
  await pressButton(page, 'right');
  await expect(socket).not.toBeFocused();
  const target = await page.locator(':focus').boundingBox();
  expect(target!.x + target!.width / 2).toBeGreaterThan(origin!.x + origin!.width / 2);
  const beforeStick = await page.locator(':focus').getAttribute('aria-label');
  await setStick(page, -0.8, 0);
  try {
    await page.waitForTimeout(40);
  } finally {
    await setStick(page, 0, 0);
    await page.waitForTimeout(40);
  }
  await expect(page.locator(':focus')).not.toHaveAttribute('aria-label', beforeStick!);
});

test('initial navigation prefers Launch token and paused gameplay does not move focus', async ({ page }) => {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await pressButton(page, 'right');
  await expect(page.getByRole('button', { name: 'Launch token', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Pause cascade', exact: true }).click();
  await expect(page.locator('.cabinet-board')).toHaveAttribute('data-paused', 'true');
  const resume = page.getByRole('button', { name: 'Resume cascade', exact: true });
  await focus(resume);
  await pressButton(page, 'left');
  await expect(resume).toBeFocused();
  await pressButton(page, 'rb');
  await expect(resume).toBeFocused();
  await pressButton(page, 'a');
  await expect(page.locator('.cabinet-board')).toHaveAttribute('data-paused', 'false');
});

test('range steps update React settings, up and down still navigate, and A toggles a switch', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Make yourself comfortable', exact: true });
  const volume = dialog.getByRole('slider', { name: 'Master volume', exact: true });
  const music = dialog.getByRole('slider', { name: 'Workshop music', exact: true });
  const initialVolume = Number(await volume.inputValue());
  const loweredVolume = Math.max(0, Math.round((initialVolume - 0.01) * 100) / 100);
  await focus(volume);
  await pressButton(page, 'left');
  await expect(volume).toHaveValue(String(loweredVolume));
  await expect(volume.locator('..').locator('strong')).toHaveText(`${Math.round(loweredVolume * 100)}%`);
  await expect.poll(async () => (await readSave(page)).settings.volume).toBe(loweredVolume);
  await expect(volume).toBeFocused();
  await pressButton(page, 'right');
  await expect(volume).toHaveValue(String(initialVolume));
  await pressButton(page, 'a');
  await expect(volume).toHaveValue(String(initialVolume));
  await pressButton(page, 'down');
  await expect(music).toBeFocused();
  await pressButton(page, 'up');
  await expect(volume).toBeFocused();

  await volume.press('Home');
  await pressButton(page, 'left');
  await expect(volume).toHaveValue('0');
  await volume.press('End');
  await pressButton(page, 'right');
  await expect(volume).toHaveValue('1');
  const muted = dialog.getByRole('switch', { name: 'Mute all audio', exact: true });
  await focus(muted);
  await pressButton(page, 'a');
  await expect(muted).toBeChecked();
  await expect.poll(async () => (await readSave(page)).settings.muted).toBe(true);
  await pressButton(page, 'rb');
  await expect(dialog.getByRole('button', { name: 'Borderless fullscreen', exact: true })).toBeFocused();
});

test('holding Y launches exactly one real cascade and increments the visible totalDrops counter', async ({ page }) => {
  await page.getByRole('button', { name: '4x speed', exact: true }).click();
  const totalDrops = page.getByTestId('total-drops');
  await expect(totalDrops).toBeVisible();
  await expect(totalDrops).toHaveText('0');
  await focus(page.getByRole('button', { name: 'Select Fork facing right, 1 available', exact: true }));
  await setButton(page, 'y', true);
  try {
    await page.waitForTimeout(40);
    await expect(page.getByRole('button', { name: 'Launch token', exact: true })).toBeDisabled();
    await expect(totalDrops).toHaveText('1', { timeout: 20_000 });
    await page.waitForTimeout(600);
    await expect(totalDrops).toHaveText('1');
    await expect(page.getByLabel('4 launches remaining', { exact: true })).toBeVisible();
    expect((await readRun(page)).totalDrops).toBe(1);
    expect((await readRun(page)).phase).not.toBe('dropping');
  } finally {
    await setButton(page, 'y', false);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(400);
  await expect(page.getByLabel('4 launches remaining', { exact: true })).toBeVisible();
});

test('disconnect clears held state and reconnect updates detection without a fake Gamepad constructor', async ({ page }) => {
  const part = page.getByRole('button', { name: 'Select Fork facing right, 1 available', exact: true });
  await focus(part);
  await setButton(page, 'a', true);
  await page.waitForTimeout(40);
  await expect(part).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { (navigator.getGamepads()[0] as unknown as { connected: boolean }).connected = false; });
  await expect(page.getByText('No standard controller detected', { exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  await expect(part).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { (navigator.getGamepads()[0] as unknown as { connected: boolean }).connected = true; });
  await expect(page.getByText('Controller detected', { exact: true })).toBeVisible();
  await expect(part).toHaveAttribute('aria-pressed', 'false');
  await setButton(page, 'a', false);
  await page.waitForTimeout(40);
  await pressButton(page, 'a');
  await expect(part).toHaveAttribute('aria-pressed', 'true');
});