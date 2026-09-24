import { getProviderCapabilities, getProviderDisplayName } from '../provider-metadata.js';

export function createMirasimProviderAdapter() {
  return {
    id: 'mirasim', displayName: getProviderDisplayName('mirasim'),
    capabilities: getProviderCapabilities('mirasim'),
    runtime: { buildArgs() { throw new Error('Mirasim uses the desktop WebSocket runner, not a CLI'); } },
  };
}
