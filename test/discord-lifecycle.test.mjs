import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDiscordLifecycle,
  isIgnorableDiscordRuntimeError,
  isInvalidTokenError,
  isRecoverableGatewayCloseCode,
} from '../src/discord-lifecycle.js';

function createLogger() {
  return {
    log() {},
    warn() {},
    error() {},
  };
}

test('discord lifecycle helpers classify gateway and interaction errors', () => {
  assert.equal(isRecoverableGatewayCloseCode(4004), false);
  assert.equal(isRecoverableGatewayCloseCode(1006), true);
  assert.equal(isRecoverableGatewayCloseCode('unknown'), true);

  assert.equal(isInvalidTokenError(new Error('Invalid token provided')), true);
  assert.equal(isInvalidTokenError(new Error('network error')), false);

  assert.equal(isIgnorableDiscordRuntimeError({ code: 10062 }), true);
  assert.equal(isIgnorableDiscordRuntimeError(new Error('Unknown interaction')), true);
  assert.equal(isIgnorableDiscordRuntimeError(new Error('fatal gateway error')), false);
});

test('createDiscordLifecycle bootClient retries transient login failures', async () => {
  const delays = [];
  const binds = [];
  let attempts = 0;
  const client = {
    async login() {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('temporary gateway failure');
      }
    },
    removeAllListeners() {},
    destroy() {},
  };

  const lifecycle = createDiscordLifecycle({
    selfHealEnabled: true,
    restartDelayMs: 1000,
    maxLoginBackoffMs: 5000,
    discordToken: 'token',
    createClient: () => client,
    bindClientHandlers: (bot) => {
      binds.push(bot);
    },
    sleep: async (ms) => {
      delays.push(ms);
    },
    logger: createLogger(),
  });

  await lifecycle.bootClient('startup');

  assert.equal(attempts, 2);
  assert.deepEqual(delays, [1000]);
  assert.equal(binds.length, 1);
  assert.equal(lifecycle.getClient(), client);
});

test('createDiscordLifecycle scheduleSelfHeal ignores invalid token errors', () => {
  let timerCount = 0;
  const lifecycle = createDiscordLifecycle({
    selfHealEnabled: true,
    restartDelayMs: 1500,
    maxLoginBackoffMs: 5000,
    discordToken: 'token',
    createClient: () => ({
      async login() {},
      removeAllListeners() {},
      destroy() {},
    }),
    bindClientHandlers: () => {},
    setTimeoutFn: () => {
      timerCount += 1;
      return { unref() {} };
    },
    logger: createLogger(),
  });

  lifecycle.scheduleSelfHeal('client_error', new Error('Invalid token'));

  assert.equal(timerCount, 0);
});

test('createDiscordLifecycle scheduleSelfHeal restarts the client without cancelling channel work', async () => {
  const clients = [];
  const binds = [];
  const cancellations = [];
  let scheduled = null;

  function makeClient(id) {
    return {
      id,
      async login() {},
      removeAllListenersCalled: 0,
      destroyCalled: 0,
      removeAllListeners() {
        this.removeAllListenersCalled += 1;
      },
      destroy() {
        this.destroyCalled += 1;
      },
    };
  }

  const lifecycle = createDiscordLifecycle({
    selfHealEnabled: true,
    restartDelayMs: 1500,
    maxLoginBackoffMs: 5000,
    discordToken: 'token',
    createClient: () => {
      const client = makeClient(clients.length + 1);
      clients.push(client);
      return client;
    },
    bindClientHandlers: (bot) => {
      binds.push(bot.id);
    },
    cancelAllChannelWork: (reason) => {
      cancellations.push(reason);
    },
    setTimeoutFn: (fn, ms) => {
      scheduled = { fn, ms };
      return { unref() {} };
    },
    logger: createLogger(),
  });

  await lifecycle.bootClient('startup');
  lifecycle.scheduleSelfHeal('disconnect');

  assert.equal(scheduled.ms, 1500);
  scheduled.fn();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(cancellations, []);
  assert.equal(clients.length, 2);
  assert.equal(clients[0].removeAllListenersCalled, 1);
  assert.equal(clients[0].destroyCalled, 1);
  assert.deepEqual(binds, [1, 2]);
  assert.equal(lifecycle.getClient(), clients[1]);
});
