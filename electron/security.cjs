'use strict';

const filesystem = require('node:fs/promises');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "worker-src 'self'",
].join('; ');

function parseDevURL(value, isPackaged) {
  if (isPackaged || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('Invalid development URL.');
  const match = /^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})\/?$/.exec(value);
  if (!match || Number(match[1]) > 65535) {
    throw new Error('POCKET_CASCADE_DEV_URL must be exactly http://127.0.0.1:PORT with an optional trailing slash.');
  }
  return new URL(value).href;
}

function isPathInside(directory, filename) {
  const relative = path.relative(directory, filename);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function createTrustPolicy({ indexPath, devURL = null }) {
  const entryURL = devURL || pathToFileURL(indexPath).href;
  const distDirectory = path.dirname(indexPath);
  const devOrigin = devURL ? new URL(devURL) : null;

  function isTrustedURL(value) {
    try {
      const candidate = new URL(value);
      if (candidate.username || candidate.password) return false;
      candidate.hash = '';
      return candidate.href === entryURL;
    } catch {
      return false;
    }
  }

  function isAllowedRequest({ url, resourceType }) {
    if (resourceType === 'subFrame') return false;
    if (resourceType === 'mainFrame') return isTrustedURL(url);
    try {
      const candidate = new URL(url);
      if (candidate.username || candidate.password) return false;
      if (candidate.protocol === 'data:' || candidate.protocol === 'blob:') return true;
      if (devOrigin) {
        return (candidate.protocol === 'http:' && candidate.origin === devOrigin.origin)
          || (candidate.protocol === 'ws:' && candidate.host === devOrigin.host);
      }
      return candidate.protocol === 'file:' && candidate.hostname === ''
        && isPathInside(distDirectory, fileURLToPath(candidate));
    } catch {
      return false;
    }
  }

  return Object.freeze({ entryURL, isTrustedURL, isAllowedRequest });
}

function isTrustedSender(event, window, policy) {
  try {
    if (!window || window.isDestroyed()) return false;
    const contents = window.webContents;
    const frame = event.senderFrame;
    return !contents.isDestroyed() && event.sender === contents && frame !== null && frame !== undefined
      && frame === contents.mainFrame && frame.parent === null && !frame.detached
      && policy.isTrustedURL(frame.url) && policy.isTrustedURL(contents.getURL());
  } catch {
    return false;
  }
}

function injectProductionCSP(html) {
  const documentStart = /^(?:\uFEFF)?\s*<!doctype\s+html\s*>\s*<html(?:\s+[a-z][a-z0-9:_-]*(?:\s*=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s"'=<>`]+))?)*\s*>\s*<head\s*>/i.exec(html);
  if (!documentStart) {
    throw new Error('Built index.html must start with a standard HTML doctype, html element, and head element before any active content.');
  }
  const insertion = documentStart[0].length;
  return `${html.slice(0, insertion)}\n<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}">\n${html.slice(insertion)}`;
}

async function createFileHandler({ distDirectory, fetchFile, io = filesystem }) {
  const root = await io.realpath(distDirectory);
  const indexPath = await io.realpath(path.join(root, 'index.html'));
  if (!isPathInside(root, indexPath)) throw new Error('The built index must remain inside dist.');
  const html = injectProductionCSP(await io.readFile(indexPath, 'utf8'));

  return async (request) => {
    try {
      const url = new URL(request.url);
      if (url.protocol !== 'file:' || url.hostname !== '' || url.username || url.password
        || !['GET', 'HEAD'].includes(request.method)) {
        return new Response('Blocked', { status: 403 });
      }
      const requestedPath = fileURLToPath(url);
      if (!isPathInside(root, requestedPath)) return new Response('Blocked', { status: 403 });
      const resolvedPath = await io.realpath(requestedPath);
      if (!isPathInside(root, resolvedPath)) return new Response('Blocked', { status: 403 });
      if (!(await io.stat(resolvedPath)).isFile()) return new Response('Not found', { status: 404 });

      if (resolvedPath === indexPath) {
        return new Response(request.method === 'HEAD' ? null : html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Security-Policy': PRODUCTION_CSP,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
          },
        });
      }
      return await fetchFile(pathToFileURL(resolvedPath).href, {
        method: request.method,
        headers: request.headers,
        bypassCustomProtocolHandlers: true,
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  };
}

function hardenWebContents(contents) {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  for (const eventName of ['will-navigate', 'will-frame-navigate', 'will-redirect', 'will-attach-webview']) {
    contents.on(eventName, (event) => event.preventDefault());
  }
}

function hardenSession(session, policy, devURL) {
  session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.setPermissionCheckHandler(() => false);
  session.setDevicePermissionHandler(() => false);
  session.setDisplayMediaRequestHandler((_request, callback) => callback({}));
  session.on('will-download', (event) => event.preventDefault());
  session.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !policy.isAllowedRequest(details) }));

  if (devURL) {
    const websocketOrigin = new URL(devURL).origin.replace(/^http:/, 'ws:');
    const developmentCSP = PRODUCTION_CSP
      .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
      .replace("connect-src 'self'", `connect-src 'self' ${websocketOrigin}`);
    session.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders };
      for (const name of Object.keys(headers)) {
        if (name.toLowerCase() === 'content-security-policy') delete headers[name];
      }
      headers['Content-Security-Policy'] = [developmentCSP];
      callback({ responseHeaders: headers });
    });
  }
}

module.exports = {
  PRODUCTION_CSP, parseDevURL, createTrustPolicy, isTrustedSender,
  injectProductionCSP, createFileHandler, hardenWebContents, hardenSession,
};