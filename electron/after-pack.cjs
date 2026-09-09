'use strict';

const filesystem = require('node:fs/promises');
const path = require('node:path');
const { loadSteamConfiguration } = require('./steam.cjs');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const projectDirectory = context.packager.projectDir;
  const configuration = await loadSteamConfiguration({ configPath: path.join(projectDirectory, 'electron', 'steam-config.json') });
  if (configuration.error) throw new Error(configuration.error);

  let entry;
  try {
    entry = require.resolve('steamworks.js', { paths: [projectDirectory] });
  } catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND') throw error;
    if (configuration.appId !== 0) {
      throw new Error('Steam is configured, but optional steamworks.js is absent. Install the reviewed optional dependency before packaging a Steam build.');
    }
    return;
  }

  const nativeDirectory = path.join(path.dirname(entry), 'dist', 'win64');
  const addonFilename = 'steamworksjs.win32-x64-msvc.node';
  const packedAddon = path.join(
    context.appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'steamworks.js', 'dist', 'win64', addonFilename,
  );
  try {
    await filesystem.access(path.join(nativeDirectory, addonFilename));
    await filesystem.access(path.join(nativeDirectory, 'steam_api64.dll'));
    await filesystem.access(packedAddon);
    await filesystem.copyFile(path.join(nativeDirectory, 'steam_api64.dll'), path.join(context.appOutDir, 'steam_api64.dll'));
  } catch (error) {
    throw new Error('The Windows x64 Steam runtime is incomplete or not unpacked. Check steamworks.js dist/win64 and electron-builder asarUnpack before distributing this build.', { cause: error });
  }
};