'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pocketDesktop', Object.freeze({
  readSave: () => ipcRenderer.invoke('pocket:read-save'),
  writeSave: (json) => ipcRenderer.invoke('pocket:write-save', json),
  exportSave: (json) => ipcRenderer.invoke('pocket:export-save', json),
  setFullscreen: (value) => ipcRenderer.invoke('pocket:set-fullscreen', value),
  getStatus: () => ipcRenderer.invoke('pocket:get-status'),
  unlockAchievement: (id) => ipcRenderer.invoke('pocket:unlock-achievement', id),
  quit: () => { ipcRenderer.send('pocket:quit'); },
}));