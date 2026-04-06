export function createDiscordAccessPolicy({
  allowedChannelIds = null,
  allowedGuildIds = null,
  allowedUserIds = null,
} = {}) {
  function isAllowedUser(userId) {
    if (!allowedUserIds) return true;
    return allowedUserIds.has(userId);
  }

  function getGuildId(channel) {
    const guildId = channel?.guild?.id || channel?.parent?.guild?.id || '';
    const normalized = String(guildId || '').trim();
    return normalized || null;
  }

  function isAllowedChannel(channel) {
    if (!allowedChannelIds && !allowedGuildIds) return true;
    const guildId = getGuildId(channel);
    if (guildId && allowedGuildIds?.has(guildId)) return true;
    if (!allowedChannelIds) return false;
    if (allowedChannelIds.has(channel.id)) return true;

    const parentId = channel.isThread?.() ? channel.parentId : null;
    return Boolean(parentId && allowedChannelIds.has(parentId));
  }

  async function isAllowedInteractionChannel(interaction) {
    if (!allowedChannelIds && !allowedGuildIds) return true;

    const channelId = interaction.channelId;
    if (channelId && allowedChannelIds?.has(channelId)) return true;

    let channel = interaction.channel || null;
    if (!channel && channelId) {
      try {
        channel = await interaction.client.channels.fetch(channelId);
      } catch {
        channel = null;
      }
    }
    if (!channel) return false;
    const guildId = getGuildId(channel);
    if (guildId && allowedGuildIds?.has(guildId)) return true;
    if (!allowedChannelIds) return false;

    const parentId = channel.isThread?.() ? channel.parentId : null;
    return Boolean(parentId && allowedChannelIds.has(parentId));
  }

  return {
    isAllowedUser,
    isAllowedChannel,
    isAllowedInteractionChannel,
  };
}
