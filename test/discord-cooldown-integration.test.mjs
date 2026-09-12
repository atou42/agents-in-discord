import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createGatewayBudget, createGatewayStrategy } from '../src/discord-gateway-safety.js';
import { createDiscordLifecycle } from '../src/discord-lifecycle.js';

const require = createRequire(import.meta.url);
const { WebSocketServer } = require('ws');
const { WebSocketManager } = require('@discordjs/ws');
const quiet = { log() {}, warn() {}, error() {} };

test('startup cooldown reconnects through the real gateway strategy without bypassing the budget', { timeout: 10000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-cooldown-integration-'));
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  const url = `ws://127.0.0.1:${server.address().port}`;
  let now = 1_800_000_000_000;
  const started = now;
  const budget = createGatewayBudget({ dataDir: directory, token: 'OFFLINE_TEST_ONLY', now: () => now });
  for (let i = 0; i < 10; i++) budget.reserve('identify');
  const auth = [];
  const waits = [];
  const managers = [];
  let cancellations = 0;
  server.on('connection', socket => {
    socket.send(JSON.stringify({ op: 10, d: { heartbeat_interval: 45000 } }));
    socket.on('message', bytes => {
      const payload = JSON.parse(String(bytes));
      if (payload.op === 2) {
        auth.push(now);
        socket.send(JSON.stringify({ op: 0, t: 'READY', s: 1,
          d: { session_id: 'offline-session', resume_gateway_url: url } }));
      }
      if (payload.op === 1) socket.send(JSON.stringify({ op: 11, d: null }));
    });
  });
  t.after(async () => {
    for (const manager of managers) await manager.destroy();
    for (const socket of server.clients) socket.terminate();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  function advance(ms) {
    assert.deepEqual(auth, [], 'no credentials may be sent during cooldown');
    waits.push(ms);
    now += ms;
  }
  const lifecycle = createDiscordLifecycle({
    discordToken: 'OFFLINE_TEST_ONLY', logger: quiet, nowFn: () => now,
    sleep: async ms => advance(ms),
    setTimeoutFn: (fn, ms) => setTimeout(() => { advance(ms); fn(); }, 1),
    cancelAllChannelWork: () => { cancellations++; },
    createClient() {
      const manager = new WebSocketManager({
        token: 'OFFLINE_TEST_ONLY', intents: 0, shardCount: 1, shardIds: [0],
        buildStrategy: createGatewayStrategy(budget, quiet),
        retrieveSessionInfo: () => null, updateSessionInfo() {},
        rest: { get: async () => ({ url, shards: 1,
          session_start_limit: { total: 1000, remaining: 1000, reset_after: 86400000, max_concurrency: 1 } }) },
      });
      managers.push(manager);
      return {
        manager,
        login: () => manager.connect(),
        destroy: () => manager.destroy(),
        removeAllListeners: () => manager.removeAllListeners(),
      };
    },
    bindClientHandlers(bot, api) {
      bot.manager.on('error', ({ error }) => api.scheduleSelfHeal('shard_error', error));
    },
  });
  await lifecycle.bootClient('startup');
  assert.equal(managers.length, 2);
  assert.equal(managers[0].strategy.shards.size, 0);
  assert.equal(managers[1].strategy.shards.size, 1);
  assert.equal(auth.length, 1);
  assert.ok(auth[0] >= started + 900000);
  assert.ok(waits.length >= 1);
  assert.equal(cancellations, 0);
  assert.equal(lifecycle.getTerminalError(), null);
  const state = JSON.parse(fs.readFileSync(budget.file, 'utf8'));
  assert.equal(state.records.filter(record => record.kind === 'identify').length, 11);
});
