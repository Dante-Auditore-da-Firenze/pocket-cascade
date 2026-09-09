'use strict';

const filesystem = require('node:fs/promises');
const path = require('node:path');

const ACHIEVEMENT_IDS = Object.freeze([
  'FIRST_CASCADE',
  'FOUR_TOKENS',
  'CHAIN_EIGHT',
  'THOUSAND_DROP',
  'TEN_THOUSAND_DROP',
  'OVERDRIVE',
  'ALL_PARTS',
  'WORKSHOP_COMPLETE',
  'DAILY_COMPLETE',
  'ENDLESS_FIVE',
]);
const allowedAchievements = new Set(ACHIEVEMENT_IDS);

function validAppId(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff;
}

async function loadSteamConfiguration({
  environment = process.env,
  configPath = path.join(__dirname, 'steam-config.json'),
  io = filesystem,
} = {}) {
  const override = environment.POCKET_CASCADE_STEAM_APP_ID;
  if (override !== undefined) {
    if (typeof override !== 'string' || !/^(0|[1-9][0-9]*)$/.test(override) || !validAppId(Number(override))) {
      return { appId: 0, error: 'POCKET_CASCADE_STEAM_APP_ID must be a decimal unsigned 32-bit AppID, or 0 to disable Steam.' };
    }
    return { appId: Number(override) };
  }

  try {
    const config = JSON.parse(await io.readFile(configPath, 'utf8'));
    if (!config || Array.isArray(config) || !validAppId(config.appId)) {
      return { appId: 0, error: 'electron/steam-config.json requires a numeric unsigned 32-bit appId, or 0 for unconfigured.' };
    }
    return { appId: config.appId };
  } catch {
    return { appId: 0, error: 'Steam configuration is missing, unreadable, or invalid. The game can still run without Steam.' };
  }
}

function createSteamAdapter({ configuration = { appId: 0 }, loadLibrary = () => require('steamworks.js') } = {}) {
  const appId = configuration.appId;
  let client;
  let initializationError = configuration.error;
  let achievementError;

  if (!initializationError && !validAppId(appId)) initializationError = 'Steam AppID is invalid.';
  if (!initializationError && appId === 0) {
    initializationError = 'Steam is unconfigured (AppID 0). A real Steamworks AppID is required to enable it.';
  }
  if (!initializationError) {
    try {
      const library = loadLibrary();
      if (typeof library?.init !== 'function') {
        initializationError = 'The optional steamworks.js module has an incompatible init API.';
      } else {
        client = library.init(appId);
        if (!client) initializationError = 'Steam initialization returned no native client.';
      }
    } catch (error) {
      initializationError = ['MODULE_NOT_FOUND', 'ERR_DLOPEN_FAILED'].includes(error?.code)
        ? 'Steam is unavailable: optional steamworks.js or its native runtime could not be loaded.'
        : 'Steam initialization failed. Steam may not be running, installed, or licensed for this AppID.';
    }
  }

  function getStatus() {
    if (initializationError) return { steam: false, steamError: initializationError };
    if (typeof client?.localplayer?.getSteamId !== 'function'
      || typeof client?.utils?.getAppId !== 'function'
      || typeof client?.achievement?.isActivated !== 'function'
      || typeof client?.achievement?.activate !== 'function') {
      return { steam: false, steamError: 'Steam is unavailable: the native client API is incompatible.' };
    }
    try {
      const identity = client.localplayer.getSteamId();
      if (typeof identity?.steamId64 !== 'bigint' || identity.steamId64 <= 0n || client.utils.getAppId() !== appId) {
        return { steam: false, steamError: 'Steam has no usable local player for the configured AppID.' };
      }
    } catch {
      return { steam: false, steamError: 'The native Steam session is unavailable. Restart the game after starting Steam.' };
    }
    return achievementError ? { steam: true, steamError: achievementError } : { steam: true };
  }

  function unlockAchievement(id) {
    if (typeof id !== 'string' || !allowedAchievements.has(id) || !getStatus().steam) return false;
    try {
      if (client.achievement.isActivated(id) === true || client.achievement.activate(id) === true) {
        achievementError = undefined;
        return true;
      }
      achievementError = `Steam did not accept achievement ${id}. Check the published achievement schema and retry later.`;
    } catch {
      achievementError = `The native Steam API failed to unlock ${id}. No success has been recorded by the desktop shell.`;
    }
    return false;
  }

  return Object.freeze({ getStatus, unlockAchievement });
}

module.exports = { ACHIEVEMENT_IDS, loadSteamConfiguration, createSteamAdapter };