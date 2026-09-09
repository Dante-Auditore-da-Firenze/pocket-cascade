'use strict';

const filesystem = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { TextDecoder } = require('node:util');

const MAX_SAVE_BYTES = 2 * 1024 * 1024;
const SAVE_FILENAME = 'pocket-cascade-save.json';
const BACKUP_FILENAME = `${SAVE_FILENAME}.bak`;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateSave(json) {
  if (typeof json !== 'string') return { ok: false, error: 'Save must be a JSON string.' };
  if (json.length > MAX_SAVE_BYTES || Buffer.byteLength(json, 'utf8') > MAX_SAVE_BYTES) {
    return { ok: false, error: 'Save exceeds the 2 MiB limit.' };
  }

  let value;
  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Save is not valid JSON.' };
  }

  if (!isRecord(value) || value.version !== 1
    || !isRecord(value.run) || !isRecord(value.profile) || !isRecord(value.settings)) {
    return { ok: false, error: 'Save requires version 1 and run, profile, and settings objects.' };
  }

  return { ok: true };
}

function failureMessage(action, error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)
    ? ` (${error.code})` : '';
  return `${action}${code}.`;
}

function createSaveStore({ directory, io = filesystem }) {
  if (typeof directory !== 'string' || !path.isAbsolute(directory)) {
    throw new TypeError('The save directory must be an absolute path.');
  }

  const primaryPath = path.join(directory, SAVE_FILENAME);
  const backupPath = path.join(directory, BACKUP_FILENAME);
  let pending = Promise.resolve();
  let acceptingWrites = true;

  function enqueue(operation) {
    const result = pending.then(operation);
    pending = result.then(() => undefined, () => undefined);
    return result;
  }

  async function readCandidate(filename) {
    try {
      const handle = await io.open(filename, 'r');
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.size > MAX_SAVE_BYTES) {
          return { kind: 'invalid', reason: 'Not a regular save file within the 2 MiB limit.' };
        }

        const buffer = Buffer.alloc(MAX_SAVE_BYTES + 1);
        let length = 0;
        while (length < buffer.length) {
          const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
          if (bytesRead === 0) break;
          length += bytesRead;
        }
        if (length > MAX_SAVE_BYTES) {
          return { kind: 'invalid', reason: 'Save exceeds the 2 MiB limit.' };
        }

        let data;
        try {
          data = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length));
        } catch {
          return { kind: 'invalid', reason: 'Save is not valid UTF-8.' };
        }
        const validation = validateSave(data);
        return validation.ok
          ? { kind: 'valid', data }
          : { kind: 'invalid', reason: validation.error };
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (error?.code === 'ENOENT') return { kind: 'missing', reason: 'File is missing.' };
      return { kind: 'failed', reason: failureMessage('Could not read save', error) };
    }
  }

  async function syncDirectory() {
    if (process.platform === 'win32') return;
    const handle = await io.open(directory, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }

  async function atomicReplace(filename, data) {
    const temporaryPath = `${filename}.${randomUUID()}.tmp`;
    try {
      const handle = await io.open(temporaryPath, 'wx', 0o600);
      try {
        await handle.writeFile(data, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await io.rename(temporaryPath, filename);
      await syncDirectory();
    } finally {
      await io.rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  }

  function readSave() {
    return enqueue(async () => {
      const primary = await readCandidate(primaryPath);
      if (primary.kind === 'valid') return { data: primary.data, recovered: false };

      const backup = await readCandidate(backupPath);
      if (backup.kind === 'valid') {
        return {
          data: backup.data,
          recovered: true,
          error: `Primary save: ${primary.reason} Loaded the previous valid backup.`,
        };
      }
      if (primary.kind === 'missing' && backup.kind === 'missing') {
        return { data: null, recovered: false };
      }
      return {
        data: null,
        recovered: false,
        error: `Primary save: ${primary.reason} Backup: ${backup.reason}`,
      };
    });
  }

  function writeSave(json) {
    if (!acceptingWrites) {
      return Promise.resolve({ ok: false, error: 'The application is closing; save was not written.' });
    }
    const validation = validateSave(json);
    if (!validation.ok) return Promise.resolve(validation);

    return enqueue(async () => {
      try {
        await io.mkdir(directory, { recursive: true, mode: 0o700 });
        const previous = await readCandidate(primaryPath);
        if (previous.kind === 'failed') return { ok: false, error: previous.reason };
        if (previous.kind === 'valid') await atomicReplace(backupPath, previous.data);
        await atomicReplace(primaryPath, json);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: failureMessage('Could not write save', error) };
      }
    });
  }

  function close() {
    acceptingWrites = false;
    return pending;
  }

  return Object.freeze({ readSave, writeSave, flush: () => pending, close });
}

module.exports = { createSaveStore, validateSave, MAX_SAVE_BYTES, SAVE_FILENAME, BACKUP_FILENAME };