import { persistEnvUpdates } from './env-file-updater.js';
import { normalizeReplyDeliveryMode } from './session-settings.js';

export function createReplyDeliveryModeStore({
  env = process.env,
  envFilePath = '',
  defaultMode = 'card_mention',
} = {}) {
  let currentMode = normalizeReplyDeliveryMode(defaultMode, 'card_mention');

  function resolve() {
    return {
      mode: currentMode,
      source: 'env default',
      envKey: 'DEFAULT_REPLY_DELIVERY_MODE',
    };
  }

  function set(mode) {
    currentMode = normalizeReplyDeliveryMode(mode, 'card_mention');
    env.DEFAULT_REPLY_DELIVERY_MODE = currentMode;
    persistEnvUpdates(envFilePath, {
      DEFAULT_REPLY_DELIVERY_MODE: currentMode,
    });
    return resolve();
  }

  return {
    resolve,
    set,
  };
}
