import { createRequire } from 'node:module';
import { access } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const executable = require('electron');
await access(executable);
console.log('The locked Electron runtime is available for packaging.');