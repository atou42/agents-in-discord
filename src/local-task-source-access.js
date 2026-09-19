import { createDiscordAccessPolicy } from './discord-access-policy.js';
import { parseCsvSet } from './security-policy.js';

// Only explicitly configured local receivers contribute source-channel rules.
// Target rules are never merged, and actual Discord member access is checked later.
export function createLocalTaskSourceAccess({ accessPolicy, env }) {
  const peers = Object.keys(env).filter(key => /^[A-Z]+__LOCAL_TASK_SOCKET_DIR$/.test(key) && env[key]?.trim())
    .map(key => {
      const prefix = key.split('__')[0];
      return createDiscordAccessPolicy({
        allowedChannelIds: parseCsvSet(env[`${prefix}__ALLOWED_CHANNEL_IDS`]) || new Set(),
        allowedGuildIds: parseCsvSet(env[`${prefix}__ALLOWED_GUILD_IDS`]) || new Set(),
        allowedUserIds: parseCsvSet(env[`${prefix}__ALLOWED_USER_IDS`]),
      });
    });
  return (channel, userId) => accessPolicy.isAllowedChannel(channel)
    || peers.some(peer => peer.isAllowedChannel(channel) && peer.isAllowedUser(userId));
}
