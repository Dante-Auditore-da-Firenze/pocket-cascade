const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createBundle, encodeFile, inspectBundle, restoreBundle, verifyFiles } = require('./text-handoff.cjs');

function fixture(context, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pocket-text-handoff-test-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filename = path.join(root, 'PROJECT-SOURCE.txt');
  fs.writeFileSync(filename, JSON.stringify(createBundle(files)));
  return { filename, destination: path.join(root, 'restored') };
}

test('restores text, binary assets, hidden instructions, and original line endings byte for byte', (context) => {
  const originals = [
    encodeFile('src/game/example.ts', Buffer.from('const value = 42;\r\n')),
    encodeFile('assets/example.png', Buffer.from([0, 255, 128, 13, 10, 1])),
    encodeFile('.github/copilot-instructions.md', Buffer.from('# Instructions\n')),
  ];
  const { filename, destination } = fixture(context, originals);
  assert.equal(restoreBundle(filename, destination), originals.length);
  for (const original of originals) {
    assert.deepEqual(fs.readFileSync(path.join(destination, original.path)), Buffer.from(original.base64, 'base64'));
  }
});

test('refuses to overwrite an existing folder or its files', (context) => {
  const { filename, destination } = fixture(context, [encodeFile('keep.txt', Buffer.from('incoming'))]);
  fs.mkdirSync(destination);
  fs.writeFileSync(path.join(destination, 'keep.txt'), 'original');
  assert.throws(() => restoreBundle(filename, destination), /Destination already exists/);
  assert.equal(fs.readFileSync(path.join(destination, 'keep.txt'), 'utf8'), 'original');
});

test('rejects a corrupted payload before creating a destination', (context) => {
  const { filename, destination } = fixture(context, [encodeFile('source.txt', Buffer.from('source'))]);
  const bundle = JSON.parse(fs.readFileSync(filename, 'utf8'));
  bundle.payloadSha256 = '0'.repeat(64);
  fs.writeFileSync(filename, JSON.stringify(bundle));
  assert.throws(() => restoreBundle(filename, destination), /bundle checksum/);
  assert.equal(fs.existsSync(destination), false);
});

test('rejects a changed file even with a valid outer payload checksum', (context) => {
  const file = encodeFile('source.txt', Buffer.from('source'));
  const { filename, destination } = fixture(context, [{ ...file, base64: Buffer.from('change').toString('base64') }]);
  assert.throws(() => restoreBundle(filename, destination), /File checksum mismatch/);
  assert.equal(fs.existsSync(destination), false);
});

test('rejects traversal, absolute paths, Windows device names, and alternate streams', () => {
  const file = encodeFile('valid.txt', Buffer.from('safe'));
  for (const invalid of ['../outside.txt', '/outside.txt', 'C:/outside.txt', 'src/../outside.txt',
    'src\\outside.txt', 'CON.txt', 'source.txt:stream', 'src/trailing.', 'src/trailing ']) {
    assert.throws(() => inspectBundle(createBundle([{ ...file, path: invalid }])), /Unsafe file path/);
  }
});

test('rejects duplicate names and file/directory collisions before writing', () => {
  const file = encodeFile('source.txt', Buffer.from('safe'));
  assert.throws(() => inspectBundle(createBundle([file, { ...file, path: 'SOURCE.txt' }])), /Duplicate file path/);
  assert.throws(() => inspectBundle(createBundle([file, { ...file, path: 'source.txt/child.txt' }])), /File\/directory collision/);
});

test('detects post-restore changes during a separate verification', (context) => {
  const files = [encodeFile('src/example.ts', Buffer.from('original'))];
  const { filename, destination } = fixture(context, files);
  restoreBundle(filename, destination);
  fs.writeFileSync(path.join(destination, files[0].path), 'modified');
  assert.throws(() => verifyFiles(inspectBundle(createBundle(files)), destination), /Restored file differs/);
});