import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { WebSocketServer } from 'ws';
import { createMirasimRunner, applyMirasimPatch } from '../src/mirasim-runner.js';
import { mirasimConnectionOptions, readMirasimCatalog, MIRASIM_DEFAULT_MODEL, createMirasimCatalogReader } from '../src/mirasim-client.js';
import { normalizeProvider, getSupportedReasoningEffortLevels } from '../src/provider-metadata.js';
import { createSessionSettings } from '../src/session-settings.js';
import { createSessionCommandActions } from '../src/session-command-actions.js';
import { commitSessionProviderState, switchSessionProviderState } from '../src/session-provider-state.js';

const model = MIRASIM_DEFAULT_MODEL;
const catalog = { type: 'catalog', agent: 'claude', models: [{ id: model, label: 'opus 5.5' }], effort: [{ id: 'high' }, { id: 'ultra' }] };
const sessionKey = 'claude:test-session';

async function fixture(t, handle) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aid-mirasim-'));
  const tokenFile = path.join(dir, 'token');
  fs.writeFileSync(tokenFile, 'local-secret');
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  const env = { MIRASIM_URL: `ws://127.0.0.1:${server.address().port}/ws`, MIRASIM_TOKEN_FILE: tokenFile };
  const frames = [];
  server.on('connection', (ws, request) => {
    assert.equal(new URL(request.url, 'http://localhost').searchParams.get('token'), 'local-secret');
    const send = (message) => ws.send(JSON.stringify(message));
    ws.on('message', (raw) => {
      const m = JSON.parse(raw); frames.push(m);
      if (m.type === 'ready') send({ type: 'init', agents: [{ id: 'claude', label: 'Claude Code', installed: true, capabilities: { resume: true } }, { id: 'codex', label: 'Codex', installed: true, capabilities: { resume: true } }, { id: 'kimi', installed: false }] });
      else if (m.type === 'getCatalog') send(m.agent === 'claude' ? catalog : { type: 'catalog', agent: m.agent, models: [{ id: 'native-model' }], effort: [{ id: 'medium' }], defaultModel: 'native-model', defaultEffort: 'medium' });
      else if (m.type === 'listSessions') send({ type: 'sessions', reqId: m.reqId,
        sessions: [{ sessionKey, agent: 'claude', workdir: dir, runState: 'completed' }] });
      else handle?.(m, send, ws);
    });
  });
  t.after(async () => { for (const ws of server.clients) ws.terminate(); await new Promise((r) => server.close(r)); fs.rmSync(dir, { recursive: true }); });
  const options = { spawnEnv: env, startupTimeoutMs: 500, stopTimeoutMs: 200 };
  const task = { session: { provider: 'mirasim' }, sessionKey: 'discord-thread', workspaceDir: dir, prompt: 'hello' };
  return { env, frames, dir, options, task };
}

function accepted(m, send, id = 'task') {
  send({ type: 'accepted', clientRef: m.clientRef, sessionKey, taskId: id });
}
function patch(send, seq, p) { send({ type: 'session', sessionKey, seq, patch: p }); }

test('registers provider and default settings without inheriting a shared Codex model', () => {
  assert.equal(normalizeProvider('Mirasim'), 'mirasim');
  assert.ok(getSupportedReasoningEffortLevels('mirasim').includes('ultra'));
  const settings = createSessionSettings({ defaultModel: 'gpt-shared', normalizeProvider });
  assert.equal(settings.resolveModelSetting({ provider: 'mirasim' }).value, model);
  assert.equal(settings.resolveReasoningEffortSetting({ provider: 'mirasim' }).value, 'high');
  assert.equal(settings.resolveModelSetting({ provider: 'mirasim', model: 'override' }).value, 'override');
});

test('harness settings inherit only matching-harness models, and provider switching preserves overrides', () => {
  const parent = { provider: 'mirasim', mirasimHarness: 'claude', model: 'parent-model', effort: 'ultra' };
  const settings = createSessionSettings({ normalizeProvider, getParentSession: (s) => s?.parentChannelId ? parent : null,
    readMirasimModelCatalog: (h) => h === 'codex' ? { defaultModel: 'native-model', defaultEffort: 'medium' } : {} });
  const thread = { provider: 'mirasim', parentChannelId: 'parent' };
  assert.equal(settings.resolveMirasimHarnessSetting(thread).value, 'claude');
  assert.equal(settings.resolveModelSetting(thread).value, 'parent-model');
  thread.mirasimHarness = 'codex';
  assert.equal(settings.resolveModelSetting(thread).value, 'native-model');
  assert.equal(settings.resolveReasoningEffortSetting(thread).value, 'medium');
  assert.equal(settings.getProviderDefaults('mirasim', thread).model, 'native-model');
  switchSessionProviderState(thread, 'claude');
  assert.equal(thread.mirasimHarness, null);
  switchSessionProviderState(thread, 'mirasim');
  assert.equal(thread.mirasimHarness, 'codex');
  switchSessionProviderState(parent, 'codex');
  thread.mirasimHarness = null;
  assert.equal(settings.resolveMirasimHarnessSetting(thread).value, 'claude');
  assert.equal(settings.resolveModelSetting(thread).value, 'parent-model');
});

test('harness switching resets inheriting active and inactive states, refuses busy threads, and rolls back failed saves', () => {
  const parent = { provider: 'mirasim', mirasimHarness: 'claude', runnerSessionId: 'claude:parent', model };
  const child = { provider: 'mirasim', parentChannelId: 'parent', runnerSessionId: 'claude:child', effort: 'ultra' };
  const pinned = { provider: 'mirasim', parentChannelId: 'parent', mirasimHarness: 'claude', runnerSessionId: 'claude:pinned' };
  const inactive = { provider: 'codex', parentChannelId: 'parent', runnerSessionId: 'unrelated', providers: { mirasim: { runnerSessionId: 'claude:inactive' } } };
  const rows = Object.entries({ parent, child, pinned, inactive }).map(([key, session]) => ({ key, session }));
  const settings = createSessionSettings({ getParentSession: (s) => s?.parentChannelId ? parent : null });
  let failSave = false, saves = 0;
  const actions = createSessionCommandActions({ getSessionProvider: (s) => s.provider, listStoredSessions: () => rows,
    resolveMirasimHarnessSetting: settings.resolveMirasimHarnessSetting,
    saveDb: () => { for (const row of rows) commitSessionProviderState(row.session); if (failSave) throw new Error('disk failure'); saves++; } });
  assert.throws(() => actions.setMirasimHarness(parent, 'codex', { key: 'parent', isBusy: (key) => key === 'child' }), /busy/);
  assert.equal(parent.mirasimHarness, 'claude');
  assert.equal(child.runnerSessionId, 'claude:child');
  assert.equal(saves, 0);
  const result = actions.setMirasimHarness(parent, 'codex', { key: 'parent' });
  assert.deepEqual(result.resetKeys, ['parent', 'child', 'inactive']);
  assert.equal(parent.model, null);
  assert.equal(child.effort, null);
  assert.equal(inactive.runnerSessionId, 'unrelated');
  assert.equal(inactive.providers.mirasim.runnerSessionId, null);
  assert.equal(pinned.runnerSessionId, 'claude:pinned');
  parent.runnerSessionId = 'codex:keep';
  commitSessionProviderState(parent);
  failSave = true;
  assert.throws(() => actions.setMirasimHarness(parent, 'claude', { key: 'parent' }), /disk failure/);
  assert.equal(parent.mirasimHarness, 'codex');
  assert.equal(parent.runnerSessionId, 'codex:keep');
  assert.equal(parent.providers.mirasim.runnerSessionId, 'codex:keep');
  assert.throws(() => actions.setMirasimHarness(parent, 'default', { key: 'parent', availableHarnesses: ['codex'] }), /unavailable/);
});

test('native inventory and catalog cache are per harness; runner dispatches native Codex defaults', async (t) => {
  const f = await fixture(t, (m, send) => {
    if (m.type !== 'prompt') return;
    send({ type: 'accepted', clientRef: m.clientRef, sessionKey: 'codex:test', taskId: 'task' });
    send({ type: 'session', sessionKey: 'codex:test', seq: 1, patch: { set: { taskId: 'task', phase: 'done', text: 'CODEX_OK' } } });
  });
  const reader = createMirasimCatalogReader({ env: f.env });
  assert.deepEqual((await reader.refreshHarnesses()).agents.map((a) => a.id), ['claude', 'codex', 'kimi']);
  await reader.refresh('claude');
  await reader.refresh('codex');
  assert.equal(reader.read('claude').models[0].slug, model);
  assert.equal(reader.read('codex').models[0].slug, 'native-model');
  const result = await createMirasimRunner(f.options).runTask({ ...f.task, session: { provider: 'mirasim', mirasimHarness: 'codex' } });
  assert.equal(result.ok, true, result.error);
  const prompt = f.frames.find((m) => m.type === 'prompt');
  assert.equal(prompt.agent, 'codex');
  assert.equal(prompt.model, 'native-model');
  assert.equal(prompt.effort, 'medium');
  assert.equal(result.threadId, 'codex:test');
});

test('uninstalled or unknown harness and cross-harness resume fail before submitting', async (t) => {
  const f = await fixture(t);
  const runner = createMirasimRunner(f.options);
  for (const harness of ['kimi', 'missing', '../claude']) {
    const result = await runner.runTask({ ...f.task, session: { mirasimHarness: harness } });
    assert.match(result.error, /harness is unavailable/);
  }
  const mismatch = await runner.runTask({ ...f.task, session: { mirasimHarness: 'codex', runnerSessionId: sessionKey } });
  assert.match(mismatch.error, /expected codex/);
  assert.equal(f.frames.some((m) => m.type === 'prompt'), false);
});

test('a harness with no model or effort catalog sends no invented overrides', async (t) => {
  const f = await fixture(t, (m, send) => {
    if (m.type !== 'prompt') return;
    assert.equal(m.model, undefined);
    assert.equal(m.effort, undefined);
    send({ type: 'accepted', clientRef: m.clientRef, sessionKey: 'codex:empty', taskId: 'task' });
    send({ type: 'session', sessionKey: 'codex:empty', seq: 1, patch: { set: { taskId: 'task', phase: 'done', text: 'OK' } } });
  });
  const result = await createMirasimRunner({ ...f.options, readCatalog: async () => ({ models: [], effort: [] }) })
    .runTask({ ...f.task, session: { mirasimHarness: 'codex' } });
  assert.equal(result.ok, true, result.error);
});

test('models without effort omit provider defaults but reject explicit effort overrides', async (t) => {
  const f = await fixture(t, (m, send) => {
    if (m.type !== 'prompt') return;
    assert.equal(m.effort, undefined);
    accepted(m, send);
    patch(send, 1, { set: { taskId: 'task', phase: 'done', text: 'OK' } });
  });
  const options = { ...f.options, readCatalog: async () => ({ models: [{ slug: model, supportedReasoningLevels: [] }] }) };
  const result = await createMirasimRunner({ ...options, resolveReasoningEffortSetting: () => ({ value: 'high', source: 'provider' }) }).runTask(f.task);
  assert.equal(result.ok, true, result.error);
  const rejected = await createMirasimRunner({ ...options, resolveReasoningEffortSetting: () => ({ value: 'high', source: 'session override' }) }).runTask(f.task);
  assert.match(rejected.error, /effort high is unavailable/);
  assert.equal(f.frames.filter((m) => m.type === 'prompt').length, 1);
});

test('rejects non-loopback URLs before reading or exposing credentials', () => {
  for (const url of ['ws://evil.example/ws', 'ws://localhost.evil/ws', 'wss://127.0.0.1/ws', 'ws://127.0.0.1/ws?token=secret']) {
    assert.throws(() => mirasimConnectionOptions({ MIRASIM_URL: url }), /loopback/);
  }
  assert.throws(() => mirasimConnectionOptions({ MIRASIM_TOKEN_FILE: '/nonexistent/token' }), /Cannot read/);
});

test('live socket catalog request maps model and effort options; cached health refreshes', async (t) => {
  const f = await fixture(t);
  const result = await readMirasimCatalog({ env: f.env });
  assert.equal(result.models[0].slug, model);
  assert.deepEqual(result.models[0].supportedReasoningLevels, ['high', 'ultra']);
  const reader = createMirasimCatalogReader({ env: f.env });
  await reader.refresh();
  await reader.refreshHarnesses();
  assert.equal(reader.health().ok, true);
});

test('runner streams a complete turn, persists key, sends overrides and resumes same workspace', async (t) => {
  const f = await fixture(t, (m, send) => {
    if (m.type !== 'prompt') return;
    accepted(m, send);
    patch(send, 1, { set: { taskId: 'task', phase: 'streaming' } });
    patch(send, 2, { appendText: 'OK', set: { usage: { inputTokens: 12 } } });
    patch(send, 3, { set: { phase: 'done', incomplete: false } });
  });
  const runner = createMirasimRunner({ ...f.options, resolveReasoningEffortSetting: () => ({ value: 'ultra' }) });
  const keys = [], events = [];
  const result = await runner.runTask({ ...f.task, onThreadReady: (id) => keys.push(id), onEvent: (e) => events.push(e) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.finalAnswerMessages, ['OK']);
  assert.deepEqual(keys, [sessionKey]);
  assert.equal(result.usage.inputTokens, 12);
  assert.ok(events.length);
  assert.equal(f.frames.find((m) => m.type === 'prompt').effort, 'ultra');
  const resumed = await runner.runTask({ ...f.task, session: { runnerSessionId: sessionKey } });
  assert.equal(resumed.ok, true);
  assert.equal(f.frames.filter((m) => m.type === 'prompt').at(-1).sessionKey, sessionKey);
});

test('missing workspace binding and unknown model fail before submission', async (t) => {
  const f = await fixture(t);
  const runner = createMirasimRunner(f.options);
  const wrong = await runner.runTask({ ...f.task, session: { runnerSessionId: 'claude:other' } });
  assert.match(wrong.error, /missing|another workspace/);
  const unavailable = createMirasimRunner({ ...f.options, resolveModelSetting: () => ({ value: 'not-a-model' }) });
  assert.match((await unavailable.runTask(f.task)).error, /unavailable/);
  assert.equal(f.frames.some((m) => m.type === 'prompt'), false);
});

test('sequence gaps resubscribe and terminal snapshots cannot duplicate text', async (t) => {
  const f = await fixture(t, (m, send) => {
    if (m.type === 'prompt') {
      accepted(m, send);
      patch(send, 1, { set: { taskId: 'task', phase: 'streaming' } });
      patch(send, 3, { appendText: 'missing chunk' });
    } else if (m.type === 'subscribe') send({ type: 'snapshot', sessionKey, seq: 3,
      snapshot: { taskId: 'task', phase: 'done', text: 'complete' } });
  });
  const result = await createMirasimRunner(f.options).runTask(f.task);
  assert.equal(result.ok, true);
  assert.deepEqual(result.finalAnswerMessages, ['complete']);
});

test('disconnect after acceptance is not successful or automatically retryable', async (t) => {
  const f = await fixture(t, (m, send, ws) => { if (m.type === 'prompt') { accepted(m, send); ws.close(); } });
  const result = await createMirasimRunner(f.options).runTask(f.task);
  assert.equal(result.ok, false);
  assert.equal(result.retryable, false);
  assert.match(result.error, /outcome unknown/);
  assert.equal(result.threadId, sessionKey);
});

test('cancel sends stop only to accepted session and waits for terminal acknowledgement', async (t) => {
  let control;
  const f = await fixture(t, (m, send) => {
    if (m.type === 'prompt') { accepted(m, send); patch(send, 1, { set: { taskId: 'task', phase: 'streaming' } }); control.kill(); }
    if (m.type === 'stop') { assert.equal(m.sessionKey, sessionKey); patch(send, 2, { set: { phase: 'done', text: 'partial' } }); }
  });
  const result = await createMirasimRunner(f.options).runTask({ ...f.task, onSpawn: (c) => { control = c; } });
  assert.equal(result.cancelled, true);
  assert.equal(result.ok, false);
  assert.equal(f.frames.filter((m) => m.type === 'stop').length, 1);
});

test('timeouts stop the host; native busy queues are recalled without stopping other work', async (t) => {
  const f = await fixture(t, (m, send) => {
    if (m.type === 'prompt') { accepted(m, send); patch(send, 1, { set: { taskId: 'task', phase: 'streaming' } }); }
    if (m.type === 'stop') patch(send, 2, { set: { phase: 'done' } });
  });
  const result = await createMirasimRunner({ ...f.options, resolveTimeoutSetting: () => ({ timeoutMs: 30 }) }).runTask(f.task);
  assert.equal(result.timedOut, true);
  const queued = await fixture(t, (m, send) => { if (m.type === 'prompt') accepted(m, send, ''); });
  assert.match((await createMirasimRunner(queued.options).runTask(queued.task)).error, /recall sent/);
  // Allow the server to receive the recall queued before the WebSocket close.
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(queued.frames.some((m) => m.type === 'recall'));
  assert.equal(queued.frames.some((m) => m.type === 'stop'), false);
});

test('empty or incomplete terminal output is a failure; full patches replace old text', async (t) => {
  assert.equal(applyMirasimPatch({ text: 'old' }, { full: { text: 'new' }, appendText: '!' }).text, 'new!');
  const f = await fixture(t, (m, send) => {
    if (m.type === 'prompt') { accepted(m, send); patch(send, 1, { set: { taskId: 'task', phase: 'done', text: 'partial', incomplete: true } }); }
  });
  assert.equal((await createMirasimRunner(f.options).runTask(f.task)).ok, false);
});
