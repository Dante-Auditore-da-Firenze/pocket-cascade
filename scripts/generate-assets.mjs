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
const teeth = Array.from({ length: 80 }, (_, index) => {
  const angle = index * Math.PI / 40;
  const radius = index % 4 < 2 ? 244 : 225;
  return `${256 + Math.cos(angle) * radius},${256 + Math.sin(angle) * radius}`;
}).join(' ');
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="enamel" x2="1" y2="1"><stop stop-color="#375c55"/><stop offset="1" stop-color="${surface}"/></linearGradient><linearGradient id="metal" x2=".3" y2="1"><stop stop-color="#f0deae"/><stop offset="1" stop-color="#98754c"/></linearGradient></defs><polygon points="${teeth}" fill="url(#metal)" stroke="#263d35" stroke-width="4"/><circle cx="256" cy="256" r="215" fill="url(#enamel)" stroke="${text}" stroke-width="3"/><circle cx="256" cy="256" r="201" fill="none" stroke="${green}" stroke-width="2" opacity=".6"/><path d="M256 114V196L170 277M256 196L342 277M170 277L224 363M342 277L286 363" stroke="${gold}" stroke-width="7" stroke-linecap="round" fill="none"/>${coin(256, 131, 43, '+', green)}${coin(170, 268, 50, '2x')}${coin(342, 268, 50, 'Y', rose)}<rect x="183" y="355" width="146" height="40" rx="5" fill="${rose}" stroke="${gold}" stroke-width="3"/><path d="M206 375H305" stroke="${surface}" stroke-width="8" stroke-linecap="round"/><circle cx="85" cy="252" r="5" fill="${text}"/><circle cx="427" cy="252" r="5" fill="${text}"/></svg>`;

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
await import('./generate-workshop.mjs');