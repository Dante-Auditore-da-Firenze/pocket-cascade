import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const WIDTH = 2400;
const HEIGHT = 1600;

function cog(centerX, centerY, radius, teeth, fill, stroke) {
  const points = Array.from({ length: teeth * 4 }, (_, index) => {
    const angle = index / (teeth * 4) * Math.PI * 2;
    const distance = radius * (index % 4 < 2 ? 1 : 0.86);
    return `${(centerX + Math.cos(angle) * distance).toFixed(2)},${(centerY + Math.sin(angle) * distance).toFixed(2)}`;
  }).join(' ');
  const spokes = Array.from({ length: 6 }, (_, index) => {
    const angle = index * Math.PI / 3;
    return `<path d="M${centerX + Math.cos(angle) * radius * 0.22} ${centerY + Math.sin(angle) * radius * 0.22}L${centerX + Math.cos(angle) * radius * 0.69} ${centerY + Math.sin(angle) * radius * 0.69}"/>`;
  }).join('');
  return `<g><polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="${centerX}" cy="${centerY}" r="${radius * 0.7}" fill="url(#steel)" stroke="${stroke}" stroke-width="3"/><g stroke="${fill}" stroke-width="${radius * 0.17}">${spokes}</g><circle cx="${centerX}" cy="${centerY}" r="${radius * 0.2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="${centerX}" cy="${centerY}" r="${radius * 0.07}" fill="#182d2e"/></g>`;
}

function dial(centerX, centerY, radius, angle = -0.8) {
  const ticks = Array.from({ length: 36 }, (_, index) => {
    const theta = index * Math.PI / 18;
    const inside = radius * (index % 3 ? 0.84 : 0.75);
    return `<path d="M${centerX + Math.sin(theta) * inside} ${centerY - Math.cos(theta) * inside}L${centerX + Math.sin(theta) * radius * 0.91} ${centerY - Math.cos(theta) * radius * 0.91}"/>`;
  }).join('');
  return `<g><circle cx="${centerX}" cy="${centerY + 6}" r="${radius + 9}" fill="#132625" opacity=".6"/><circle cx="${centerX}" cy="${centerY}" r="${radius + 6}" fill="url(#brass)" stroke="#655939" stroke-width="3"/><circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="#ececd9" stroke="#244643" stroke-width="4"/><g stroke="#375350" stroke-width="2">${ticks}</g><path d="M${centerX - 8} ${centerY + 14}L${centerX + Math.sin(angle) * radius * 0.68} ${centerY - Math.cos(angle) * radius * 0.68}" stroke="#bf4d42" stroke-width="5" stroke-linecap="round"/><circle cx="${centerX}" cy="${centerY}" r="7" fill="#244643"/><circle cx="${centerX}" cy="${centerY}" r="3" fill="#ddc38a"/></g>`;
}

function screw(centerX, centerY) {
  return `<g><circle cx="${centerX}" cy="${centerY}" r="5" fill="#a3b3a8" stroke="#203c3b" stroke-width="2"/><path d="M${centerX - 2} ${centerY + 2}L${centerX + 2} ${centerY - 2}" stroke="#203c3b" stroke-width="1.5"/></g>`;
}

function room(dark) {
  const wall = dark ? '#273a3a' : '#d8e0d8';
  const panel = dark ? '#203433' : '#b8cdc4';
  const desk = dark ? '#233f3e' : '#93b0a1';
  const seam = dark ? '#142c2c' : '#98b3a6';
  const sky = dark ? '#4f7b87' : '#b9dce0';
  const windowSlats = Array.from({ length: 7 }, (_, index) => `<path d="M-40 ${325 + index * 29}H276" stroke="#6d9693" stroke-width="2" opacity=".4"/>`).join('');
  const panels = Array.from({ length: 15 }, (_, index) => `<path d="M${index * 180 - 50} 0V970" stroke="${seam}" stroke-width="2" opacity=".42"/>`).join('');
  const pegboard = Array.from({ length: 8 }, (_, row) => Array.from({ length: 6 }, (_, column) => `<circle cx="${2170 + column * 39}" cy="${493 + row * 44}" r="3.5" fill="${seam}"/>`).join('')).join('');
  const drawers = Array.from({ length: 4 }, (_, index) => `<g transform="translate(0 ${index * 57})"><rect x="2117" y="1024" width="270" height="50" rx="3" fill="${index % 2 ? '#a94940' : '#b75747'}" stroke="#713a34" stroke-width="3"/><path d="M2130 1030H2371" stroke="#d88862" opacity=".65"/><rect x="2206" y="1039" width="87" height="18" rx="3" fill="#213d3a" stroke="#dcbd7d" stroke-width="3"/><path d="M2224 1048H2275" stroke="#8f9e8e" stroke-width="4"/></g>`).join('');
  const measurement = Array.from({ length: 57 }, (_, index) => `<path d="M${index * 21 + 29} 1355v${index % 5 ? 7 : 15}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="wall" x2="0" y2="1"><stop stop-color="${wall}"/><stop offset="1" stop-color="${panel}"/></linearGradient>
    <linearGradient id="steel" x2="1" y2="1"><stop stop-color="#5d7d78"/><stop offset=".48" stop-color="#345551"/><stop offset="1" stop-color="#1c3433"/></linearGradient>
    <linearGradient id="brass" x2=".3" y2="1"><stop stop-color="#efdaa3"/><stop offset=".48" stop-color="#bd9756"/><stop offset="1" stop-color="#806c43"/></linearGradient>
    <linearGradient id="glass" x2="1" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="${dark ? '#294c5b' : '#d1e6de'}"/></linearGradient>
    <linearGradient id="desk" x2="0" y2="1"><stop stop-color="${desk}"/><stop offset="1" stop-color="${dark ? '#192d2e' : '#6d9382'}"/></linearGradient>
    <linearGradient id="shade" x2="0" y2="1"><stop stop-color="#669186"/><stop offset=".6" stop-color="#335d55"/><stop offset="1" stop-color="#183c39"/></linearGradient>
    <pattern id="grain" width="17" height="19" patternUnits="userSpaceOnUse"><path d="M1 2h2m8 9h1m-6 5h2" stroke="${dark ? '#a5bbb0' : '#3e6356'}" stroke-width=".7" opacity=".14"/></pattern>
    <pattern id="blueprint" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#97c4bd" stroke-width=".7" opacity=".35"/></pattern>
  </defs>
  <rect width="2400" height="1600" fill="url(#wall)"/>${panels}
  <path d="M0 89H2400M0 99H2400" stroke="${seam}" stroke-width="4"/>
  <rect x="-44" y="196" width="354" height="523" rx="178" fill="#182f30" opacity=".22"/>
  <path d="M-53 660V366A155 155 0 0 1 257 366V660Z" fill="url(#glass)" stroke="#748f83" stroke-width="20"/>
  <path d="M-47 620L25 544L75 574L132 511L208 583L263 542V658H-47Z" fill="${dark ? '#294d52' : '#799f97'}"/>
  ${windowSlats}<path d="M102 212V669M-53 418H260M-53 533H260" stroke="#536f65" stroke-width="12"/>
  <path d="M-66 679H285V707H-66Z" fill="#2b4942"/><path d="M-66 677H285" stroke="#a1b6a0" stroke-width="5"/>
  <g transform="translate(86 873) rotate(-7)"><rect x="-35" y="-77" width="215" height="198" rx="4" fill="#173a48" stroke="#c0c3a7" stroke-width="8"/><rect x="-31" y="-72" width="207" height="187" fill="url(#blueprint)"/>
    <g fill="none" stroke="#b7d1ba" stroke-width="1.8"><circle cx="52" cy="4" r="41"/><circle cx="52" cy="4" r="30"/><circle cx="52" cy="4" r="8"/><path d="M11 4H93M52-37V45M93 4L129 75M-15 81H161M-15 91H92"/><circle cx="129" cy="75" r="22"/><path d="M-11-49H115M-11-45v-9m126 9v-9M143-42V40"/></g>${screw(-18, -56)}${screw(161, 98)}</g>
  <g transform="translate(2255 250)">${cog(0, 0, 121, 30, '#ba955d', '#756344')}${dial(0, 0, 83, 0.9)}<path d="M0-11L-27 30" stroke="#35514c" stroke-width="5" stroke-linecap="round"/></g>
  <path d="M2090 458H2400V886H2090Z" fill="${panel}" stroke="${seam}" stroke-width="6"/>${pegboard}
  <g transform="translate(2188 542) rotate(8)"><path d="M0 10V153" stroke="#192e2c" stroke-width="15"/><path d="M0 0V125" stroke="#aab6a0" stroke-width="12"/><path d="M0 38V-3M0-3L-16-19M0-3L16-19" fill="none" stroke="#b8c5ae" stroke-width="9"/><rect x="-11" y="92" width="22" height="85" rx="5" fill="#b95044" stroke="#632e2b" stroke-width="3"/></g>
  <g transform="translate(2285 547) rotate(-9)"><path d="M0 8V177" stroke="#aab6a0" stroke-width="8"/><rect x="-14" y="53" width="28" height="111" rx="7" fill="#325b50" stroke="#203e38" stroke-width="4"/><path d="M-5 70V145M5 70V145" stroke="#6d9380" stroke-width="2"/></g>
  <g transform="translate(2370 549)"><path d="M-25 8Q-40 50 0 59Q40 50 25 8M-17 51L-28 152M17 51L28 152" fill="none" stroke="#aab6a0" stroke-width="11"/><path d="M-20 91L-28 152M20 91L28 152" stroke="#be5848" stroke-width="17"/></g>
  <path d="M0 964H2400V1600H0Z" fill="url(#desk)"/><path d="M0 965H2400M0 982H2400" stroke="${seam}" stroke-width="5"/>
  <path d="M0 1346H2400V1396H0Z" fill="#203934"/><path d="M0 1346H2400" stroke="#a9b79a" stroke-width="6"/>
  <g stroke="#b7b795" stroke-width="2" opacity=".65">${measurement}</g>
  <path d="M0 1404H2400" stroke="#102c28" stroke-width="14"/>
  <path d="M30 1425H280V1585H30ZM2120 1425H2370V1585H2120Z" fill="#29483f" stroke="#172e29" stroke-width="5"/>
  <g transform="translate(36 1076) rotate(13)">${cog(0, 0, 50, 16, '#baa072', '#5f604b')}${cog(91, 51, 35, 12, '#c1b084', '#5f604b')}<path d="M-45 116L98 88L107 128L-36 156Z" fill="#bd5645" stroke="#733931" stroke-width="3"/><path d="M-12 134L197 87" stroke="#bcc5b1" stroke-width="8"/><path d="M160 96L191 86" stroke="#eee2b8" stroke-width="3"/></g>
  <g>${drawers}<path d="M2093 1008H2410V1026H2093Z" fill="#d07558" stroke="#6e3831" stroke-width="3"/><path d="M2132 989V966Q2245 938 2364 966V989" fill="none" stroke="#223c37" stroke-width="13"/>${screw(2130, 1016)}${screw(2370, 1016)}</g>
  <g transform="translate(2100 900)"><ellipse cx="0" cy="0" rx="88" ry="14" fill="#102c2a" opacity=".35"/><path d="M-63-7Q-50-37 33-36L58-7Z" fill="url(#shade)" stroke="#1e3631" stroke-width="3"/><path d="M0-35L-77-193L15-335" fill="none" stroke="#142f2e" stroke-width="22"/><path d="M0-35L-77-193L15-335" fill="none" stroke="#799885" stroke-width="10"/><path d="M18-44L-55-193L32-325" fill="none" stroke="#a5b29a" stroke-width="5"/>${dial(-76, -193, 15)}<path d="M-56-321Q-44-403 43-370L104-307Z" fill="url(#shade)" stroke="#1e3c35" stroke-width="4"/><ellipse cx="24" cy="-312" rx="79" ry="13" fill="#e1d8a2" stroke="#3c5d47" stroke-width="5"/></g>
  <rect width="2400" height="1600" fill="url(#grain)"/>
  </svg>`;
}

await mkdir('public/workshop', { recursive: true });
await mkdir('assets/workshop', { recursive: true });
const generated = [];
for (const lighting of ['light', 'dark']) {
  const svg = room(lighting === 'dark');
  const source = `assets/workshop/${lighting}-source.svg`;
  const output = `public/workshop/${lighting}.webp`;
  await writeFile(source, svg);
  await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(output);
  const metadata = await sharp(output).metadata();
  const statistics = await sharp(output).stats();
  assert.equal(metadata.width, WIDTH);
  assert.equal(metadata.height, HEIGHT);
  assert.ok(statistics.channels.slice(0, 3).every((channel) => channel.stdev > 12));
  generated.push({ source, output, width: WIDTH, height: HEIGHT });
}
await writeFile('assets/workshop/manifest.json', JSON.stringify({
  title: 'Pocket Cascade clockwork workshop',
  origin: 'Original project artwork authored in scripts/generate-workshop.mjs',
  externalImages: [],
  generation: 'Procedural SVG source rasterized by Sharp; no text-to-image service or third-party illustration.',
  rightsNote: 'Project-original source and exports; no third-party artwork license or attribution dependency added. Not a legal clearance opinion.',
  files: generated,
}, null, 2));
console.log(`Generated and pixel-checked ${generated.length} original ${WIDTH}x${HEIGHT} workshop backgrounds.`);