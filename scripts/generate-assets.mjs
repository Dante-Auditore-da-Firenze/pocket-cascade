import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import postcss from 'postcss';

const style = postcss.parse(await readFile(new URL('../src/styles.css', import.meta.url), 'utf8'));
const colors = {};
style.walkRules((rule) => {
  if (rule.selector === 'html[data-theme="dark"]') rule.walkDecls((declaration) => { colors[declaration.prop] = declaration.value; });
});
const surface = colors['--cp-surface'];
const gold = colors['--cp-warning'];
const green = colors['--cp-success'];
const rose = colors['--cp-accent'];
const text = colors['--cp-text'];
const coin = (x, y, radius, symbol, color = gold) => `<g transform="translate(${x} ${y})"><circle r="${radius}" fill="${surface}" stroke="${color}" stroke-width="6"/><circle r="${radius - 9}" fill="none" stroke="${color}" stroke-width="1.5"/><text y="${radius * 0.32}" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="${radius * 0.9}" fill="${color}">${symbol}</text></g>`;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect x="8" y="8" width="496" height="496" rx="96" fill="${surface}"/><rect x="28" y="28" width="456" height="456" rx="79" fill="none" stroke="${green}" stroke-width="3" opacity=".6"/><path d="M256 76 L256 168 L157 276 M256 168 L355 276 M157 276 L211 410 M355 276 L302 410" stroke="${gold}" stroke-width="7" stroke-linecap="round" fill="none"/>${coin(256, 119, 48, '+', green)}${coin(159, 277, 58, '2x')}${coin(355, 277, 58, 'Y', rose)}${coin(213, 403, 33, '1')}${coin(303, 403, 33, '1')}<circle cx="87" cy="93" r="6" fill="${text}" opacity=".6"/><circle cx="425" cy="93" r="6" fill="${text}" opacity=".6"/></svg>`;

await mkdir('assets', { recursive: true });
await mkdir('public', { recursive: true });
await writeFile('assets/icon-source.svg', icon);
const png = await sharp(Buffer.from(icon)).resize(512, 512).png().toBuffer();
await writeFile('assets/icon.png', png);
await writeFile('public/icon.png', await sharp(png).resize(64, 64).png().toBuffer());
await writeFile('assets/icon.ico', await pngToIco(await sharp(png).resize(256, 256).png().toBuffer()));
const info = await sharp('assets/icon.png').metadata();
if (info.width !== 512 || info.height !== 512) throw new Error('Invalid generated icon size');
console.log('Generated original 512px game icon, 64px browser icon, and Windows ICO.');