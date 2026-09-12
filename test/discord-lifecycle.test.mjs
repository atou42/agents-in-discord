import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import {
  createDiscordLifecycle,
  isIgnorableDiscordRuntimeError,
  isInvalidTokenError,
  isRecoverableGatewayCloseCode,
  isTransientDiscordNetworkError,
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
  assert.equal(isInvalidTokenError(new Error('Authentication failed')), true);
  assert.equal(isInvalidTokenError({ code: 'TokenInvalid' }), true);
  assert.equal(isInvalidTokenError(new Error('network error')), false);

  assert.equal(isIgnorableDiscordRuntimeError({ code: 10062 }), true);
  assert.equal(isIgnorableDiscordRuntimeError(new Error('Unknown interaction')), true);
  assert.equal(isIgnorableDiscordRuntimeError(new Error('fatal gateway error')), false);

  assert.equal(isTransientDiscordNetworkError(new Error('Connect Timeout Error (attempted address: discord.com:443, timeout: 10000ms)')), true);
  assert.equal(isTransientDiscordNetworkError(new Error('Client network socket disconnected before secure TLS connection was established')), true);
  assert.equal(isTransientDiscordNetworkError(new Error('Opening handshake has timed out')), true);
  assert.equal(isTransientDiscordNetworkError(new Error('WebSocket is not open: readyState 0 (CONNECTING)')), true);
  assert.equal(isTransientDiscordNetworkError(new Error('WebSocket was closed before the connection was established')), true);
  assert.equal(isTransientDiscordNetworkError(new Error('Proxy connection timed out')), true);
  assert.equal(isTransientDiscordNetworkError(Object.assign(new Error('proxy refused'), { code: 'ECONNREFUSED' })), true);
  assert.equal(isTransientDiscordNetworkError(new Error('Invalid token provided')), false);
});

test('self-heal waits for asynchronous destruction before creating a replacement', async () => {
  let finishDestroy;
  let creates = 0;
  const lifecycle = createDiscordLifecycle({
    createClient: () => {
      creates++;
      return { login: async () => {}, removeAllListeners() {},
        destroy: () => new Promise(resolve => { finishDestroy = resolve; }) };
    },
    bindClientHandlers() {}, logger: createLogger(),
  });
  await lifecycle.bootClient('test');
  const restarting = lifecycle.restartClient('test');
  await Promise.resolve();
  const createsBeforeDestroyFinished = creates;
  finishDestroy();
  await restarting;
  assert.equal(createsBeforeDestroyFinished, 1);
  assert.equal(creates, 2);
});

test('self-heal does not replace a client whose destruction failed', async () => {
  let creates = 0;
  const lifecycle = createDiscordLifecycle({
    createClient: () => {
      creates++;
      return { login: async () => {}, removeAllListeners() {},
        destroy: async () => { throw new Error('destroy failed'); } };
    },
    bindClientHandlers() {}, logger: createLogger(),
  });
  await lifecycle.bootClient('test');
  await assert.rejects(lifecycle.restartClient('test'), /destroy failed/);
  assert.equal(creates, 1);
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

test('exhausted transient startup login failures remain restartable by the supervisor', async () => {
  const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:7890'), { code: 'ECONNREFUSED' });
  let attempts = 0;
  const lifecycle = createDiscordLifecycle({
    maxLoginAttempts: 2,
    createClient: () => ({ async login() { attempts++; throw error; } }),
    bindClientHandlers() {},
    sleep: async () => {},
    logger: createLogger(),
  });

  await assert.rejects(lifecycle.bootClient('startup'), err => err === error);
  assert.equal(attempts, 2);
  assert.equal(lifecycle.getTerminalError(), null);
});

test('terminal startup failures stay paused without retrying or bypassing gateway safety', async () => {
  for (const code of ['TokenInvalid', 'DISCORD_GATEWAY_BLOCKED', 'ENOSPC', 'EDQUOT', 'EROFS', 4014]) {
    const error = Object.assign(new Error(`terminal failure: ${code}`), { code });
    let attempts = 0;
    const lifecycle = createDiscordLifecycle({
      createClient: () => ({ async login() { attempts++; throw error; } }),
      bindClientHandlers() {},
      sleep: async () => { assert.fail('terminal failures must not retry'); },
      logger: createLogger(),
    });

    await assert.rejects(lifecycle.bootClient('startup'), err => err === error);
    assert.equal(lifecycle.getTerminalError(), error);
    await assert.rejects(lifecycle.bootClient('startup'), err => err === error);
    assert.equal(attempts, 1);
  }
});

test('unclassified login failures still pause after the retry limit', async () => {
  const lifecycle = createDiscordLifecycle({
    maxLoginAttempts: 2,
    createClient: () => ({ async login() { throw new Error('unexpected failure'); } }),
    bindClientHandlers() {},
    sleep: async () => {},
    logger: createLogger(),
  });

  await assert.rejects(lifecycle.bootClient('startup'), { code: 'DISCORD_GATEWAY_BLOCKED' });
  assert.equal(lifecycle.getTerminalError().code, 'DISCORD_GATEWAY_BLOCKED');
});

test('createDiscordLifecycle process self-heal ignores transient network errors', () => {
  const processRef = new EventEmitter();
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
    processRef,
    setTimeoutFn: () => {
      timerCount += 1;
      return { unref() {} };
    },
    logger: createLogger(),
  });

  lifecycle.setupProcessSelfHeal();
  processRef.emit('unhandledRejection', new Error('Client network socket disconnected before secure TLS connection was established'));
  processRef.emit('uncaughtException', Object.assign(new Error('proxy refused'), { code: 'ECONNREFUSED' }));

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

test('createDiscordLifecycle wakes when the self-heal restart window expires', async () => {
  const clients = [];
  let scheduled = null;
  let now = 0;

  const lifecycle = createDiscordLifecycle({
    selfHealEnabled: true,
    restartDelayMs: 1000,
    maxLoginBackoffMs: 5000,
    maxSelfHealRestartsPerWindow: 2,
    selfHealWindowMs: 60_000,
    nowFn: () => now,
    discordToken: 'token',
    createClient: () => {
      const client = {
        async login() {},
        removeAllListeners() {},
        destroy() {},
      };
      clients.push(client);
      return client;
    },
    bindClientHandlers: () => {},
    setTimeoutFn: (fn, ms) => {
      scheduled = { fn, ms };
      return { unref() {} };
    },
    logger: createLogger(),
  });

  await lifecycle.bootClient('startup');

  lifecycle.scheduleSelfHeal('first');
  assert.equal(scheduled.ms, 1000);
  scheduled.fn();
  await new Promise((resolve) => setTimeout(resolve, 0));

  now = 10_000;
  lifecycle.scheduleSelfHeal('second');
  scheduled.fn();
  await new Promise((resolve) => setTimeout(resolve, 0));

  now = 20_000;
  scheduled = null;
  lifecycle.scheduleSelfHeal('third');

  await new Promise(resolve => setImmediate(resolve));
  assert.equal(scheduled.ms, 40000);
  assert.equal(clients.length, 3);
  now = 60000;
  scheduled.fn();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(clients.length, 4);
});

for (const startup of [false, true]) {
  test(`cooldown retires client and resumes once at expiry (startup=${startup})`, async () => {
    let now = 1000;
    let scheduled;
    let timers = 0;
    const clients = [];
    const error = Object.assign(new Error('budget exhausted'), { code: 'DISCORD_GATEWAY_COOLDOWN', retryAt: 86401000 });
    const lifecycle = createDiscordLifecycle({
      logger: createLogger(), bindClientHandlers() {}, nowFn: () => now,
      cancelAllChannelWork: () => assert.fail('must preserve channel work'),
      setTimeoutFn: (fn, ms) => { timers++; scheduled = { fn, ms }; return timers; },
      clearTimeoutFn() {},
      createClient: () => {
        const bot = { destroys: 0, logins: 0, removeAllListeners() {},
          async destroy() { this.destroys++; },
          async login() { this.logins++; if (startup && clients.length === 1) throw error; } };
        clients.push(bot);
        return bot;
      },
    });
    const boot = lifecycle.bootClient('test');
    if (!startup) await boot;
    if (!startup) {
      lifecycle.scheduleSelfHeal('budget', error);
      lifecycle.scheduleSelfHeal('budget_duplicate', error);
    }
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(clients[0].destroys, 1);
    assert.equal(clients.length, 1);
    assert.equal(timers, 1);
    assert.equal(scheduled.ms, 86400000);
    now = error.retryAt - 1;
    scheduled.fn();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(clients.length, 1);
    assert.equal(scheduled.ms, 1);
    now++;
    scheduled.fn();
    await new Promise(resolve => setImmediate(resolve));
    await boot;
    assert.equal(clients.length, 2);
    assert.equal(clients[1].logins, 1);
    assert.equal(lifecycle.getTerminalError(), null);
  });
}

for (const selfHealEnabled of [true, false]) {
  test(`disk-full runtime failure stops the gateway without replacement (selfHeal=${selfHealEnabled})`, async () => {
    const processRef = new EventEmitter();
    let creates = 0;
    let destroys = 0;
    const lifecycle = createDiscordLifecycle({
      selfHealEnabled, processRef, logger: createLogger(), bindClientHandlers() {},
      createClient: () => {
        creates++;
        return { login: async () => {}, destroy: async () => { destroys++; } };
      },
    });
    await lifecycle.bootClient('test');
    lifecycle.setupProcessSelfHeal();
    const error = Object.assign(new Error('disk full'), { code: 'ENOSPC' });
    processRef.emit('uncaughtException', error);
    await Promise.resolve();
    assert.equal(destroys, 1);
    assert.equal(creates, 1);
    assert.equal(lifecycle.getTerminalError(), error);
    await assert.rejects(lifecycle.restartClient('test'), { code: 'ENOSPC' });
  });
}

test('a terminal failure during login backoff prevents another login attempt', async () => {
  let attempts = 0;
  let lifecycle;
  lifecycle = createDiscordLifecycle({
    logger: createLogger(), bindClientHandlers() {},
    createClient: () => ({ login: async () => { attempts++; throw new Error('temporary failure'); }, destroy: async () => {} }),
    sleep: async () => lifecycle.scheduleSelfHeal('disk_error', Object.assign(new Error('disk full'), { code: 'ENOSPC' })),
  });
  await assert.rejects(lifecycle.bootClient('test'), { code: 'ENOSPC' });
  assert.equal(attempts, 1);
});

test('a terminal error cancels an already scheduled self-heal', async () => {
  let scheduled;
  let cleared;
  let creates = 0;
  const timer = { unref() {} };
  const lifecycle = createDiscordLifecycle({
    logger: createLogger(), bindClientHandlers() {},
    createClient: () => { creates++; return { login: async () => {}, destroy: async () => {} }; },
    setTimeoutFn: fn => { scheduled = fn; return timer; },
    clearTimeoutFn: handle => { cleared = handle; scheduled = null; },
  });
  await lifecycle.bootClient('test');
  lifecycle.scheduleSelfHeal('nonterminal');
  assert.equal(typeof scheduled, 'function');
  lifecycle.scheduleSelfHeal('authentication', new Error('Authentication failed'));
  assert.equal(cleared, timer);
  assert.equal(scheduled, null);
  await assert.rejects(lifecycle.restartClient('test'), /Authentication failed/);
  assert.equal(creates, 1);
});

test('cooldown destruction failure blocks replacement and rejects startup', async () => {
  let creates = 0;
  let timers = 0;
  const lifecycle = createDiscordLifecycle({
    logger: createLogger(), bindClientHandlers() {},
    setTimeoutFn() { timers++; },
    createClient: () => {
      creates++;
      return {
        async login() { throw Object.assign(new Error('budget'), { code: 'DISCORD_GATEWAY_COOLDOWN', retryAt: Date.now() + 1000 }); },
        async destroy() { throw new Error('cannot stop'); },
      };
    },
  });
  await assert.rejects(lifecycle.bootClient('test'), /cannot stop/);
  assert.equal(creates, 1);
  assert.equal(timers, 0);
  assert.equal(lifecycle.getTerminalError().code, 'DISCORD_GATEWAY_BLOCKED');
});

test('terminal failure interrupts startup cooldown without another connection', async () => {
  let creates = 0;
  let cleared = 0;
  const lifecycle = createDiscordLifecycle({
    logger: createLogger(), bindClientHandlers() {}, nowFn: () => 1000,
    setTimeoutFn: () => 1, clearTimeoutFn: () => { cleared++; },
    createClient: () => {
      creates++;
      return {
        async login() { throw Object.assign(new Error('budget'), { code: 'DISCORD_GATEWAY_COOLDOWN', retryAt: 2000 }); },
        async destroy() {},
      };
    },
  });
  const boot = lifecycle.bootClient('test');
  await new Promise(resolve => setImmediate(resolve));
  lifecycle.scheduleSelfHeal('token', Object.assign(new Error('bad token'), { code: 'TokenInvalid' }));
  await assert.rejects(boot, { code: 'TokenInvalid' });
  assert.equal(cleared, 1);
  assert.equal(creates, 1);
});

test('malformed cooldown deadlines fail closed', async () => {
  for (const retryAt of [undefined, NaN, -1, '1000']) {
    let attempts = 0;
    const lifecycle = createDiscordLifecycle({
      logger: createLogger(), bindClientHandlers() {},
      createClient: () => ({ async login() { attempts++; throw Object.assign(new Error('bad deadline'), { code: 'DISCORD_GATEWAY_COOLDOWN', retryAt }); } }),
      sleep: async () => assert.fail('must not retry malformed deadline'),
    });
    await assert.rejects(lifecycle.bootClient('test'), /bad deadline/);
    assert.equal(attempts, 1);
    assert.equal(lifecycle.getTerminalError().message, 'bad deadline');
  }
});

test('network outage after a restart schedules a bounded retry instead of remaining offline', async () => {
  let now = 0;
  let scheduled;
  let creates = 0;
  const lifecycle = createDiscordLifecycle({
    logger: createLogger(), bindClientHandlers() {}, nowFn: () => now, restartDelayMs: 1000, maxLoginAttempts: 1,
    setTimeoutFn: (fn, ms) => { scheduled = { fn, ms }; return 1; }, clearTimeoutFn() {},
    createClient: () => {
      const id = ++creates;
      return { async destroy() {}, async login() {
        if (id === 2) throw Object.assign(new Error('proxy refused'), { code: 'ECONNREFUSED' });
      } };
    },
  });
  await lifecycle.bootClient('test');
  const restarting = lifecycle.restartClient('test');
  // Observe the returned failure before asserting scheduling in the broken implementation.
  restarting.catch(() => {});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(scheduled?.ms, 1000);
  assert.equal(creates, 2);
  now = 1000;
  scheduled.fn();
  await restarting;
  assert.equal(creates, 3);
});

test('cooldown emitted while disposing a restart does not create a client before expiry', async () => {
  let lifecycle;
  let now = 0;
  let timer;
  let creates = 0;
  lifecycle = createDiscordLifecycle({
    logger: createLogger(), bindClientHandlers() {}, nowFn: () => now,
    setTimeoutFn: (fn, ms) => { timer = { fn, ms }; return 1; }, clearTimeoutFn() {},
    createClient: () => {
      creates++;
      return { async login() {}, async destroy() {
        lifecycle.scheduleSelfHeal('disposing', Object.assign(new Error('budget'), { code: 'DISCORD_GATEWAY_COOLDOWN', retryAt: 1000 }));
      } };
    },
  });
  await lifecycle.bootClient('test');
  const restarting = lifecycle.restartClient('test');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(creates, 1);
  now = 1000;
  timer.fn();
  await restarting;
  assert.equal(creates, 2);
});

for (const destroyFails of [false, true]) {
  test(`permanent failure after cooldown destroys the replacement (destroyFails=${destroyFails})`, async () => {
    const destroys = [0, 0];
    let creates = 0;
    let now = 0;
    let timer;
    const lifecycle = createDiscordLifecycle({
      logger: createLogger(), bindClientHandlers() {}, nowFn: () => now,
      setTimeoutFn: fn => { timer = fn; return 1; }, clearTimeoutFn() {},
      createClient: () => {
        const id = creates++;
        return {
          async login() {
            if (!id) throw Object.assign(new Error('budget'), { code: 'DISCORD_GATEWAY_COOLDOWN', retryAt: 1000 });
            throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
          },
          async destroy() {
            destroys[id]++;
            if (id && destroyFails) throw new Error('replacement destroy failed');
          },
        };
      },
    });
    const boot = lifecycle.bootClient('test');
    const rejected = assert.rejects(boot, destroyFails ? /replacement destroy failed/ : { code: 'ENOSPC' });
    await new Promise(resolve => setImmediate(resolve));
    now = 1000;
    timer();
    await rejected;
    assert.deepEqual(destroys, [1, 1]);
    assert.equal(creates, 2);
    await assert.rejects(lifecycle.restartClient('test'));
    assert.equal(creates, 2);
  });
}
