import { persistEnvUpdates } from './env-file-updater.js';

function normalizeOptionalCodexProfile(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

export function createCodexProfileStore({
  env = process.env,
  envFilePath = '',
  defaultProfile = null,
  readCodexProfileCatalog = () => ({ profiles: [], configPath: '' }),
} = {}) {
  let currentProfile = normalizeOptionalCodexProfile(defaultProfile);

  function resolve() {
    return {
      profile: currentProfile,
      source: 'env default',
      envKey: 'CODEX__DEFAULT_PROFILE',
    };
  }

  function validate(profile) {
    const normalized = normalizeOptionalCodexProfile(profile);
    if (normalized === null) return null;
    const catalog = readCodexProfileCatalog();
    if (Array.isArray(catalog?.profiles) && catalog.profiles.includes(normalized)) {
      return normalized;
    }
    const configPath = String(catalog?.configPath || '~/.codex/config.toml');
    throw new Error(`unknown Codex profile: ${normalized} (not found in ${configPath})`);
  }

  function set(profile) {
    currentProfile = validate(profile);
    env.CODEX__DEFAULT_PROFILE = currentProfile || '';
    persistEnvUpdates(envFilePath, {
      CODEX__DEFAULT_PROFILE: currentProfile || '',
    });
    return resolve();
  }

  return {
    resolve,
    set,
  };
}
