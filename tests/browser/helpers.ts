import { expect, type Page } from '@playwright/test';
import { freshSave, SAVE_KEY, type SaveData } from '../../src/game/save';
import type { RunState } from '../../src/game/engine';
import type { Peg } from '../../src/game/model';
import { partStackKey } from '../../src/components/partStacks';
import type { BuildAction } from '../../scripts/strategies';

export async function openGame(page: Page, seed = 42): Promise<void> {
  const initial = freshSave(seed);
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, data);
  }, { key: SAVE_KEY, data: JSON.stringify(initial) });
  await page.goto('/');
  await expect(page.getByTestId('game-ready')).toHaveAttribute('data-save-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

export async function readSave(page: Page): Promise<SaveData> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
}

export async function readRun(page: Page): Promise<RunState> {
  return (await readSave(page)).run;
}

export async function drop(page: Page): Promise<RunState> {
  const previous = (await readRun(page)).totalDrops;
  await page.getByRole('button', { name: 'Launch token', exact: true }).click();
  await expect.poll(async () => (await readRun(page)).totalDrops, { timeout: 20_000 }).toBe(previous + 1);
  return readRun(page);
}

export function spareStack(page: Page, part: Pick<Peg, 'kind' | 'direction'>) {
  return page.getByTestId('part-inventory').locator(`[data-stack="${partStackKey(part)}"]`);
}

export async function selectSpareStack(page: Page, part: Pick<Peg, 'kind' | 'direction'>): Promise<void> {
  const stack = spareStack(page, part);
  if (await stack.getAttribute('aria-pressed') !== 'true') await stack.click();
}

export async function applyBuild(page: Page, actions: BuildAction[]): Promise<void> {
  const initial = await readRun(page);
  const plannedParts = new Map([...Object.values(initial.board), ...initial.bench].map((part) => [part.id, part]));
  for (const action of actions) {
    if (action.type === 'lane') {
      await page.getByRole('button', { name: `Aim lane ${action.lane + 1}`, exact: true }).click();
    } else if (action.type === 'remove') {
      await page.locator(`[data-slot="${action.slotId}"]`).click();
      await page.getByRole('button', { name: 'To worktable', exact: true }).click();
    } else {
      const run = await readRun(page);
      const planned = plannedParts.get(action.pegId);
      if (!planned) throw new Error(`Planned part ${action.pegId} is not owned`);
      const peg = run.bench.find((item) => partStackKey(item) === partStackKey(planned));
      if (!peg) throw new Error(`No spare ${partStackKey(planned)} remains on the workbench`);
      await selectSpareStack(page, peg);
      await page.locator(`[data-slot="${action.slotId}"]`).click();
    }
  }
}

export async function canvasPixels(page: Page): Promise<{ colors: number; opaque: number; width: number; height: number }> {
  return page.getByTestId('machine-canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<number>();
    let opaque = 0;
    for (let index = 0; index < pixels.length; index += 64) {
      colors.add(pixels[index] << 16 | pixels[index + 1] << 8 | pixels[index + 2]);
      if (pixels[index + 3] > 240) opaque += 1;
    }
    return { colors: colors.size, opaque, width: canvas.width, height: canvas.height };
  });
}