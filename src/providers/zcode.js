import { getProviderCapabilities, getProviderDisplayName } from '../provider-metadata.js';

export function createZCodeProviderAdapter({
  buildArgs = () => [],
  parseEvent = () => {},
} = {}) {
  return {
    id: 'zcode',
    displayName: getProviderDisplayName('zcode'),
    capabilities: getProviderCapabilities('zcode'),
    runtime: {
      buildArgs,
      parseEvent,
    },
  };
}
