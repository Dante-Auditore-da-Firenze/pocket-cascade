import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const seen = new Set();
const notices = [];

async function locate(name, from) {
  let directory = from;
  while (true) {
    const candidate = path.join(directory, 'node_modules', name);
    try { await access(path.join(candidate, 'package.json')); return candidate; } catch {}
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

async function collect(name, from, optional = false, transitive = true) {
  const directory = await locate(name, from);
  if (!directory) {
    if (optional) return;
    throw new Error(`Missing production dependency ${name}`);
  }
  if (seen.has(directory)) return;
  seen.add(directory);
  const info = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
  const files = (await readdir(directory)).filter((filename) => /^(licen[sc]e|copying|ofl)([.-].*)?$/i.test(filename));
  const bodies = [];
  for (const filename of files) bodies.push(await readFile(path.join(directory, filename), 'utf8'));
  if (bodies.length === 0) throw new Error(`No license text found for ${info.name}@${info.version}`);
  notices.push({ name: info.name, version: info.version, license: info.license ?? 'See included license', text: bodies.join('\n\n') });
  if (!transitive) return;
  for (const dependency of Object.keys(info.dependencies ?? {})) await collect(dependency, directory);
  for (const dependency of Object.keys(info.optionalDependencies ?? {})) await collect(dependency, directory, true);
}

for (const dependency of Object.keys(metadata.dependencies ?? {})) await collect(dependency, root);
for (const dependency of Object.keys(metadata.optionalDependencies ?? {})) await collect(dependency, root, true);
await collect('electron', root, false, false);
const output = [
  'POCKET CASCADE - THIRD-PARTY NOTICES', '',
  'Generated from the installed, locked production dependency tree and Electron runtime.',
  'Original game code and art are not licensed by this notice.',
  'Electron/Chromium additional notices are distributed in LICENSES.chromium.html beside the executable.',
  'The optional Steam API redistributable is also subject to Valve Steamworks SDK terms; partner review is required before public distribution.', '',
  ...notices.sort((first, second) => first.name.localeCompare(second.name)).flatMap((notice) => [
    '='.repeat(78), `${notice.name} ${notice.version}`, `Declared license: ${notice.license}`, '='.repeat(78), '', notice.text.trim(), '',
  ]),
].join('\n');
await writeFile('THIRD_PARTY_NOTICES.txt', output);
console.log(`Generated full license notices for ${notices.length} installed components.`);