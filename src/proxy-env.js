import path from 'node:path';

import { persistEnvUpdates } from './env-file-updater.js';

export function autoRepairProxyEnv(envFilePath, { env = process.env } = {}) {
  const logs = [];
  const updates = {};

  const http = firstNonEmptyEnv(['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy'], env);
  const https = firstNonEmptyEnv(['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy'], env);
  let socks = firstNonEmptyEnv(['SOCKS_PROXY', 'ALL_PROXY', 'all_proxy'], env);

  if (!socks) {
    const inferred = inferLocalSocksProxy(http || https);
    if (inferred) {
      socks = inferred;
      logs.push(`🛠️ Proxy auto-repair: inferred SOCKS proxy from local HTTP proxy -> ${inferred}`);
    }
  }

  fillMissingEnvKeys(['HTTP_PROXY', 'http_proxy'], http, updates, env);
  fillMissingEnvKeys(['HTTPS_PROXY', 'https_proxy'], https || http, updates, env);
  fillMissingEnvKeys(['SOCKS_PROXY', 'ALL_PROXY', 'all_proxy'], socks, updates, env);

  const repairedKeys = Object.keys(updates);
  if (repairedKeys.length) {
    logs.push(`🛠️ Proxy auto-repair: filled ${repairedKeys.join(', ')}`);
    persistEnvUpdates(envFilePath, updates);
    if (envFilePath) {
      logs.push(`🛠️ Proxy auto-repair: persisted updates into ${path.basename(envFilePath)}`);
    }
  }

  return { updates, logs };
}

function firstNonEmptyEnv(keys, env) {
  for (const key of keys) {
    const value = String(env[key] || '').trim();
    if (value) return value;
  }
  return '';
}

function fillMissingEnvKeys(keys, value, updates, env) {
  const normalized = String(value || '').trim();
  if (!normalized) return;

  for (const key of keys) {
    const current = String(env[key] || '').trim();
    if (current) continue;
    env[key] = normalized;
    updates[key] = normalized;
  }
}

function inferLocalSocksProxy(proxyValue) {
  const parsed = parseProxyUrl(proxyValue);
  if (!parsed) return '';
  if (!isLocalProxyHost(parsed.hostname)) return '';
  if (!parsed.port) return '';
  return `socks5h://${parsed.hostname}:${parsed.port}`;
}

function parseProxyUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const withScheme = value.includes('://') ? value : `http://${value}`;

  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function isLocalProxyHost(host) {
  const value = String(host || '').trim().toLowerCase();
  if (!value) return false;
  return value === '127.0.0.1' || value === 'localhost' || value === '::1';
}
