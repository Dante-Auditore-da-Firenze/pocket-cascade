import { test, expect } from '@playwright/test';
import { drop, openGame, readRun } from './helpers';
import { formatNumber } from '../../src/components/UI';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`last cascade reports observed chute arrivals and payout at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGame(page);
    await expect(page.locator('.commission-subtitle, .blueprint-mark, .idle-diagram')).toHaveCount(0);
    await expect(page.getByTestId('cascade-receipt')).toHaveCount(0);
    await page.getByRole('button', { name: '4x speed', exact: true }).click();
    const run = await drop(page);
    const receipt = page.getByTestId('cascade-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).not.toHaveAttribute('open');
    await receipt.locator('summary').click();
    for (const [index, payout] of run.lastDrop!.trayTotals.entries()) {
      const collector = receipt.locator(`[data-collector="${index}"]`);
      const count = run.lastDrop!.events.filter((event) => event.type === 'payout' && event.tray === index).length;
      await expect(collector.locator('dd')).toHaveText(formatNumber(payout));
      await expect(collector.locator('span')).toHaveText(`${count} ${count === 1 ? 'token' : 'tokens'}`);
    }
    await expect(receipt.getByTestId('banked-payout')).toHaveText(formatNumber(run.lastDrop!.banked));
    expect(await readRun(page)).toEqual(run);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('observed-collector-receipt.png'), fullPage: true });
  });
}