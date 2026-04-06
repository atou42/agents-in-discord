import { normalizeProvider } from './provider-metadata.js';
import { persistEnvUpdates } from './env-file-updater.js';
import { normalizeChildThreadWorkspaceMode } from './session-store.js';

export function createChildThreadWorkspaceModeStore({
  env = process.env,
  envFilePath = '',
  sharedMode = 'inherit',
  providerModeOverrides = {},
} = {}) {
  const normalizedSharedMode = normalizeChildThreadWorkspaceMode(sharedMode);
  const overrides = {};
  for (const [provider, value] of Object.entries(providerModeOverrides || {})) {
    const raw = String(value ?? '').trim();
    if (!raw) continue;
    overrides[normalizeProvider(provider)] = normalizeChildThreadWorkspaceMode(raw);
  }

  function getEnvKey(provider) {
    return `${normalizeProvider(provider).toUpperCase()}__CHILD_THREAD_WORKSPACE_MODE`;
  }

  function resolve(provider) {
    const normalizedProvider = normalizeProvider(provider);
    if (Object.prototype.hasOwnProperty.call(overrides, normalizedProvider)) {
      const scopedMode = overrides[normalizedProvider];
      return {
        provider: normalizedProvider,
        mode: scopedMode,
        source: 'provider-scoped env',
        envKey: getEnvKey(normalizedProvider),
      };
    }
    if (normalizedSharedMode !== 'inherit') {
      return {
        provider: normalizedProvider,
        mode: normalizedSharedMode,
        source: 'shared env',
        envKey: 'CHILD_THREAD_WORKSPACE_MODE',
      };
    }
    return {
      provider: normalizedProvider,
      mode: 'inherit',
      source: 'default',
      envKey: getEnvKey(normalizedProvider),
    };
  }

  function set(provider, mode) {
    const normalizedProvider = normalizeProvider(provider);
    const normalizedMode = normalizeChildThreadWorkspaceMode(mode);
    const envKey = getEnvKey(normalizedProvider);
    overrides[normalizedProvider] = normalizedMode;
    env[envKey] = normalizedMode;
    persistEnvUpdates(envFilePath, { [envKey]: normalizedMode });
    return resolve(normalizedProvider);
  }

  return {
    getEnvKey,
    resolve,
    set,
  };
}
