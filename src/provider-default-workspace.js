import path from 'node:path';

import { normalizeProvider } from './provider-metadata.js';
import { persistEnvUpdates } from './env-file-updater.js';

export function resolvePath(input, { cwd = process.cwd(), home = process.env.HOME || process.env.USERPROFILE || '' } = {}) {
  const raw = String(input || '').trim();
  if (!raw) return path.resolve(cwd);
  if (raw === '~' && home) return home;
  if (home && (raw.startsWith('~/') || raw.startsWith('~\\'))) {
    return path.join(home, raw.slice(2));
  }
  if (path.isAbsolute(raw)) return path.normalize(raw);
  return path.resolve(cwd, raw);
}

export function resolveConfiguredWorkspaceDir(value, options = {}) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return resolvePath(raw, options);
}

export function createProviderDefaultWorkspaceStore({
  env = process.env,
  envFilePath = '',
  sharedDefaultWorkspaceDir = null,
  providerDefaultWorkspaceOverrides = {},
} = {}) {
  const overrides = providerDefaultWorkspaceOverrides;

  function getEnvKey(provider) {
    return `${normalizeProvider(provider).toUpperCase()}__DEFAULT_WORKSPACE_DIR`;
  }

  function resolve(provider) {
    const normalizedProvider = normalizeProvider(provider);
    const scopedWorkspaceDir = overrides[normalizedProvider] || null;
    if (scopedWorkspaceDir) {
      return {
        provider: normalizedProvider,
        workspaceDir: scopedWorkspaceDir,
        source: 'provider-scoped env',
        envKey: getEnvKey(normalizedProvider),
      };
    }
    if (sharedDefaultWorkspaceDir) {
      return {
        provider: normalizedProvider,
        workspaceDir: sharedDefaultWorkspaceDir,
        source: 'shared env',
        envKey: 'DEFAULT_WORKSPACE_DIR',
      };
    }
    return {
      provider: normalizedProvider,
      workspaceDir: null,
      source: 'unset',
      envKey: getEnvKey(normalizedProvider),
    };
  }

  function set(provider, workspaceDir) {
    const normalizedProvider = normalizeProvider(provider);
    const envKey = getEnvKey(normalizedProvider);
    const normalizedWorkspaceDir = resolveConfiguredWorkspaceDir(workspaceDir);
    overrides[normalizedProvider] = normalizedWorkspaceDir;
    env[envKey] = normalizedWorkspaceDir || '';
    persistEnvUpdates(envFilePath, { [envKey]: normalizedWorkspaceDir || '' });
    return resolve(normalizedProvider);
  }

  return {
    getEnvKey,
    resolve,
    set,
  };
}
