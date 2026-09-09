import { mkdir, writeFile } from 'node:fs/promises';
import { playCampaign, type RunReport, type Strategy } from './strategies';

const quick = process.argv.includes('--quick');
const seeds = quick ? [42] : [1, 42, 2026, 65537];
const strategies: Strategy[] = quick ? ['conservative', 'optimized'] : ['beginner', 'conservative', 'optimized', 'splitter'];
const reports: RunReport[] = [];
for (const strategy of strategies) {
  for (const seed of seeds) {
    const started = performance.now();
    const report = playCampaign(seed, strategy);
    reports.push(report);
    console.log(`${strategy.padEnd(13)} seed=${String(seed).padEnd(6)} stages=${report.stagesCleared}/12 drops=${report.totalDrops} retries=${report.totalRetries} best=${report.bestDrop} physics=${report.simulatedSeconds}s timeouts=${report.timeouts} tested=${((performance.now() - started) / 1000).toFixed(1)}s`);
    if (quick) console.table(report.stages);
  }
}
await mkdir('artifacts/balance', { recursive: true });
await writeFile('artifacts/balance/report.json', JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));
const lines = [
  '# Balance Report', '',
  'Generated from untouched initial runs using the production physics and legal game actions. Simulation time excludes planning and menus. This is not a human enjoyment or session-length study.', '',
  '| Strategy | Seed | Cleared | Launches | Retries | Best Drop | Physics Seconds | Timeouts |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...reports.map((report) => `| ${report.strategy} | ${report.seed} | ${report.stagesCleared}/12 | ${report.totalDrops} | ${report.totalRetries} | ${report.bestDrop} | ${report.simulatedSeconds} | ${report.timeouts} |`), '',
];
await writeFile('artifacts/balance/report.md', lines.join('\n'));
if (reports.some((report) => report.maxTokens > 4 || report.timeouts > 0 || !Number.isSafeInteger(report.totalScore))) process.exitCode = 1;