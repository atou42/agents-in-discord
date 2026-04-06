import test from 'node:test';
import assert from 'node:assert/strict';

import { createDiscordAccessPolicy } from '../src/discord-access-policy.js';

test('createDiscordAccessPolicy validates allowed users and channels', () => {
  const policy = createDiscordAccessPolicy({
    allowedChannelIds: new Set(['channel-1', 'parent-1']),
    allowedGuildIds: new Set(['guild-1']),
    allowedUserIds: new Set(['user-1']),
  });

  assert.equal(policy.isAllowedUser('user-1'), true);
  assert.equal(policy.isAllowedUser('user-2'), false);
  assert.equal(policy.isAllowedChannel({ id: 'channel-1', guild: { id: 'guild-x' }, isThread: () => false }), true);
  assert.equal(policy.isAllowedChannel({ id: 'child-1', guild: { id: 'guild-x' }, isThread: () => true, parentId: 'parent-1' }), true);
  assert.equal(policy.isAllowedChannel({ id: 'channel-2', guild: { id: 'guild-1' }, isThread: () => false }), true);
  assert.equal(policy.isAllowedChannel({ id: 'child-2', guild: { id: 'guild-x' }, isThread: () => true, parentId: 'parent-2' }), false);
});

test('createDiscordAccessPolicy checks interaction channel via fetched parent thread', async () => {
  const policy = createDiscordAccessPolicy({
    allowedChannelIds: new Set(['parent-1']),
  });

  const interaction = {
    channelId: 'thread-1',
    channel: null,
    client: {
      channels: {
        async fetch(id) {
          assert.equal(id, 'thread-1');
          return {
            id: 'thread-1',
            isThread: () => true,
            parentId: 'parent-1',
          };
        },
      },
    },
  };

  assert.equal(await policy.isAllowedInteractionChannel(interaction), true);
});

test('createDiscordAccessPolicy allows interactions by guild id', async () => {
  const policy = createDiscordAccessPolicy({
    allowedGuildIds: new Set(['guild-1']),
  });

  const interaction = {
    channelId: 'channel-1',
    channel: {
      id: 'channel-1',
      guild: { id: 'guild-1' },
      isThread: () => false,
    },
    client: {
      channels: {
        async fetch() {
          throw new Error('should not fetch');
        },
      },
    },
  };

  assert.equal(await policy.isAllowedInteractionChannel(interaction), true);
});
