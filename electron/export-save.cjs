'use strict';

const filesystem = require('node:fs/promises');
const path = require('node:path');
const { validateSave } = require('./native-save.cjs');

function exportFailure(action, error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)
    ? ` (${error.code})` : '';
  return { ok: false, error: `${action}${code}.` };
}

function createSaveExporter({ window, dialog, documentsDirectory, io = filesystem, now = () => new Date() }) {
  if (typeof documentsDirectory !== 'string' || !path.isAbsolute(documentsDirectory)) {
    throw new TypeError('The export documents directory must be an absolute path.');
  }

  return async function exportSave(json) {
    const validation = validateSave(json);
    if (!validation.ok) return validation;
    if (window.isDestroyed()) return { ok: false, error: 'The game window is closed; save was not exported.' };

    let selection;
    try {
      selection = await dialog.showSaveDialog(window, {
        title: 'Export save',
        defaultPath: path.join(documentsDirectory, `Pocket-Cascade-${now().toISOString().slice(0, 10)}.json`),
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['showOverwriteConfirmation'],
      });
    } catch (error) {
      return exportFailure('Could not open the save export dialog', error);
    }

    if (selection?.canceled === true) return { ok: false, canceled: true };
    if (selection?.canceled !== false || typeof selection.filePath !== 'string'
      || !path.isAbsolute(selection.filePath) || selection.filePath.includes('\0')) {
      return { ok: false, error: 'The export dialog did not confirm a valid file path.' };
    }
    if (window.isDestroyed()) return { ok: false, error: 'The game window is closed; save was not exported.' };

    try {
      await io.writeFile(selection.filePath, json, { encoding: 'utf8', flag: 'w', mode: 0o600, flush: true });
      return { ok: true };
    } catch (error) {
      return exportFailure('Could not export save', error);
    }
  };
}

module.exports = { createSaveExporter };