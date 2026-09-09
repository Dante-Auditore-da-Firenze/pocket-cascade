const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const FORMAT = 'pocket-cascade-text-handoff-v1';
const MAX_BYTES = 128 * 1024 * 1024;
const ROOT_FILES = [
  'package.json', 'package-lock.json', 'index.html', 'tsconfig.json',
  'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts',
  'playwright.electron.config.ts', 'electron-builder.yml', 'README.md',
  'LICENSE.txt', 'THIRD_PARTY_NOTICES.txt', '.github/copilot-instructions.md',
  '.vscode/tasks.json', 'artifacts/balance/report.json', 'artifacts/balance/report.md',
  'artifacts/release/verification.json', 'artifacts/release/portable.png',
  'artifacts/release/unpacked.png',
];
const SOURCE_DIRECTORIES = ['src', 'electron', 'scripts', 'tests', 'public', 'assets', 'docs'];

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function safeRelativePath(filename) {
  assert.equal(typeof filename, 'string', 'A file path must be a string.');
  const segments = filename.split('/');
  assert.ok(segments.every((segment) => segment.length > 0
    && segment !== '.' && segment !== '..'
    && !/[<>:"\\|?*\x00-\x1f]/.test(segment)
    && !/[. ]$/.test(segment)
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)),
  `Unsafe file path: ${filename}`);
  return filename;
}

function encodeFile(filename, bytes) {
  return { path: safeRelativePath(filename), bytes: bytes.length, sha256: sha256(bytes), base64: bytes.toString('base64') };
}

function collectFiles(root) {
  const filenames = [...ROOT_FILES];
  function visit(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
      if (entry.name === '.results' || entry.name === '.DS_Store' || entry.name === 'Thumbs.db') continue;
      assert.ok(!entry.isSymbolicLink(), `Refusing symbolic link: ${directory}/${entry.name}`);
      assert.ok(!/^\.env(?:\.|$)/i.test(entry.name), `Refusing environment file: ${directory}/${entry.name}`);
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) visit(relative);
      else {
        assert.ok(entry.isFile(), `Not a regular file: ${relative}`);
        filenames.push(relative);
      }
    }
  }
  for (const directory of SOURCE_DIRECTORIES) visit(directory);
  return filenames.sort().map((filename) => {
    const absolute = path.join(root, filename);
    assert.ok(fs.lstatSync(absolute).isFile(), `Missing regular file: ${filename}`);
    return encodeFile(filename, fs.readFileSync(absolute));
  });
}

function createBundle(files) {
  const payload = zlib.gzipSync(Buffer.from(JSON.stringify(files)), { level: 9 });
  return {
    format: FORMAT,
    createdAt: new Date().toISOString(),
    fileCount: files.length,
    payloadSha256: sha256(payload),
    payloadBase64: payload.toString('base64'),
  };
}

function inspectBundle(bundle) {
  assert.equal(bundle.format, FORMAT, 'Unsupported handoff format.');
  assert.ok(Number.isInteger(bundle.fileCount) && bundle.fileCount > 0 && bundle.fileCount <= 10000,
    'Invalid file count.');
  assert.equal(typeof bundle.payloadBase64, 'string', 'Missing payload.');
  const compressed = Buffer.from(bundle.payloadBase64, 'base64');
  assert.equal(sha256(compressed), bundle.payloadSha256, 'The bundle checksum does not match.');
  const files = JSON.parse(zlib.gunzipSync(compressed, { maxOutputLength: MAX_BYTES }).toString('utf8'));
  assert.ok(Array.isArray(files), 'Invalid file manifest.');
  assert.equal(files.length, bundle.fileCount, 'The file count does not match.');
  const names = new Set();
  let totalBytes = 0;
  const decoded = files.map((file) => {
    const filename = safeRelativePath(file.path);
    const normalized = filename.toLowerCase();
    assert.ok(!names.has(normalized), `Duplicate file path: ${filename}`);
    names.add(normalized);
    assert.ok(Number.isSafeInteger(file.bytes) && file.bytes >= 0, `Invalid file size: ${filename}`);
    assert.equal(typeof file.base64, 'string', `Missing file content: ${filename}`);
    const bytes = Buffer.from(file.base64, 'base64');
    assert.equal(bytes.length, file.bytes, `File size mismatch: ${filename}`);
    assert.equal(sha256(bytes), file.sha256, `File checksum mismatch: ${filename}`);
    totalBytes += bytes.length;
    assert.ok(totalBytes <= MAX_BYTES, 'The restored project exceeds the size limit.');
    return { path: filename, bytes, sha256: file.sha256 };
  });
  for (const filename of names) {
    const segments = filename.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      assert.ok(!names.has(segments.slice(0, index).join('/')), `File/directory collision: ${filename}`);
    }
  }
  return decoded;
}

function readBundle(filename) {
  assert.ok(fs.statSync(filename).size <= MAX_BYTES, 'The bundle exceeds the size limit.');
  return JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
}

function verifyFiles(files, destination) {
  for (const file of files) {
    const actual = fs.readFileSync(path.join(destination, file.path));
    assert.equal(sha256(actual), file.sha256, `Restored file differs: ${file.path}`);
  }
  return files.length;
}

function restoreBundle(bundleFile, destination) {
  const files = inspectBundle(readBundle(bundleFile));
  const target = path.resolve(destination);
  assert.ok(!fs.existsSync(target), 'Destination already exists; choose a new folder. Nothing was overwritten.');
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) {
    const filename = path.join(target, file.path);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, file.bytes, { flag: 'wx' });
  }
  return verifyFiles(files, target);
}

function exportHandoff(root) {
  const files = collectFiles(root);
  const bundle = createBundle(files);
  inspectBundle(bundle);
  const destination = path.join(root, 'handoff');
  fs.mkdirSync(destination, { recursive: true });
  const output = path.join(destination, 'PROJECT-SOURCE.txt');
  fs.writeFileSync(output, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  fs.copyFileSync(path.join(root, 'scripts/text-handoff.cjs'), path.join(destination, 'RESTORE.txt'));
  fs.copyFileSync(path.join(root, 'docs/REBUILD-HANDOFF.txt'), path.join(destination, 'START-HERE.txt'));
  return { fileCount: files.length, transferBytes: fs.statSync(output).size, payloadSha256: bundle.payloadSha256 };
}

function main(args) {
  const [command, first, second] = args;
  if (command === 'export' && !first) {
    const result = exportHandoff(path.resolve(__dirname, '..'));
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'restore' && first && second) {
    console.log(`Restored and hash-verified ${restoreBundle(first, second)} files to ${path.resolve(second)}.`);
  } else if (command === 'verify' && first && second) {
    console.log(`Hash-verified ${verifyFiles(inspectBundle(readBundle(first)), path.resolve(second))} files.`);
  } else {
    throw new Error('Usage: node text-handoff.cjs export | restore <PROJECT-SOURCE.txt> <new-folder> | verify <PROJECT-SOURCE.txt> <folder>');
  }
}

module.exports = { collectFiles, createBundle, encodeFile, exportHandoff, inspectBundle, restoreBundle, verifyFiles };
if (require.main === module) main(process.argv.slice(2));