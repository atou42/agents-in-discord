import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createLocalTaskSubmission, normalizeTaskInput } from '../src/local-task-submission.js';
import { startLocalTaskSocket } from '../src/local-task-socket.js';
import { createSessionStore } from '../src/session-store.js';
import { createChannelQueue } from '../src/channel-queue.js';
import { createChannelRuntimeStore, stopChildProcess } from '../src/channel-runtime.js';
import { createPromptOrchestrator } from '../src/prompt-orchestrator.js';
import { createWorkspaceRuntime } from '../src/workspace-runtime.js';
import { createDiscordEntryHandlers } from '../src/discord-entry-handlers.js';
import { createDiscordAccessPolicy } from '../src/discord-access-policy.js';
import { createLocalTaskDiscordWriter } from '../src/local-task-discord.js';
import { createSlashCommandRouter } from '../src/slash-command-router.js';
import { createLocalTaskSourceAccess } from '../src/local-task-source-access.js';

const PARENT = '111111111111111111';
const SOURCE = '222222222222222222';
const AUTH = '333333333333333333';
const USER = '444444444444444444';
const BOT = '555555555555555555';
const THREAD = '666666666666666666';
const input = (extra = {}) => ({ requestId: 'task-1', parentId: PARENT, sourceThreadId: SOURCE,
  authorizationMessageId: AUTH, title: '独立测试任务', prompt: 'Return only OK.', workspaceMode: 'isolated', ...extra });
const safeError = (err) => err?.message || String(err);
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function until(predicate) {
  for (let i = 0; i < 200; i++) { if (predicate()) return; await new Promise((resolve) => setTimeout(resolve, 5)); }
  assert.fail('condition not reached');
}

function fixture(t, options = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'task-submit-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const workspaceRoot = path.join(root, 'workspaces');
  fs.mkdirSync(workspaceRoot);
  const identity = {
    getSessionId: (s) => s.runnerSessionId || null,
    getSessionProvider: (s) => s.provider,
    setSessionId: (s, id) => { s.runnerSessionId = id; s.codexThreadId = id; },
    clearSessionId: (s) => { s.runnerSessionId = null; s.codexThreadId = null; },
  };
  const storeOptions = { dataFile: path.join(root, 'sessions.json'), workspaceRoot,
    defaults: { provider: options.provider || 'codex', mode: 'safe', language: 'zh' }, getSessionId: identity.getSessionId,
    normalizeProvider: (s) => s || 'codex', normalizeUiLanguage: (s) => s || 'zh',
    normalizeSessionSecurityProfile: (s) => s || null, normalizeSessionTimeoutMs: (s) => s || null,
    normalizeSessionCompactStrategy: (s) => s || null, normalizeSessionCompactEnabled: (s) => s ?? null,
    normalizeSessionCompactTokenLimit: (s) => s || null,
    resolveDefaultWorkspace: () => ({ workspaceDir: root }),
  };
  const store = createSessionStore(storeOptions);
  const sourceSession = store.getSession(SOURCE);
  identity.setSessionId(sourceSession, 'source-codex-session');
  sourceSession.workspaceDir = root;
  sourceSession.model = 'source-model-must-not-copy';
  store.saveDb();
  const runtime = createChannelRuntimeStore({ cloneProgressPlan: (p) => p || null, truncate: (s) => s });
  const lockRuntime = createWorkspaceRuntime({ lockRoot: path.join(root, 'locks'), ensureDir: (p) => fs.mkdirSync(p, { recursive: true }), pollIntervalMs: 5 });
  const sent = [];
  const messages = new Map();
  const user = { id: USER, bot: false };
  const guild = { id: '777777777777777777', members: { fetch: async () => user } };
  let createCount = 0;
  const permission = () => ({ has: (p) => p !== options.deniedPermission });
  const makeMessage = (channel, payload, author = { id: BOT, bot: true }) => {
    const m = { id: String(888888888888888880n + BigInt(messages.size)), author, channel, client,
      content: typeof payload === 'string' ? payload : payload.content, attachments: new Map(),
      reactions: { cache: new Map() }, react: async () => {}, reply: async (p) => channel.send(p) };
    messages.set(m.id, m); return m;
  };
  const thread = { id: THREAD, parentId: PARENT, type: 11, guild, permissionsFor: permission,
    isThread: () => true, sendTyping: async () => {},
    send: async (p) => { if (options.sendError) throw new Error('Discord send failed'); sent.push(p); return makeMessage(thread, p); },
    messages: { fetch: async (id) => messages.get(typeof id === 'string' ? id : id.message) },
    fetchStarterMessage: async () => messages.values().next().value,
  };
  const parent = { id: PARENT, type: options.forum ? 15 : 0, guild, permissionsFor: permission, isThread: () => false,
    threads: { create: async (p) => { createCount++; if (options.createTimeout) await new Promise(() => {});
      if (options.createError) throw new Error('Discord create failed');
      if (p.message) await thread.send(p.message); return thread; } } };
  const authorization = { id: AUTH, author: options.botAuthorization ? { id: BOT, bot: true } : user,
    content: options.grant || `!task-authorize task-1 ${PARENT}`, webhookId: null };
  const source = { id: SOURCE, parentId: PARENT, guild, type: 11, permissionsFor: permission, isThread: () => true,
    send: async p => { sent.push(p); return makeMessage(source, p); },
    messages: { fetch: async () => authorization } };
  const client = { user: { id: BOT }, isReady: () => true, channels: { fetch: async (id) => ({ [SOURCE]: source, [PARENT]: parent, [THREAD]: thread })[id] } };
  const accessPolicy = createDiscordAccessPolicy({ allowedChannelIds: new Set(options.forbidden ? [SOURCE] : [PARENT]), allowedUserIds: new Set(options.forbiddenUser ? [] : [USER]) });
  const securityPolicy = { resolveSecurityContext: () => ({ maxQueuePerChannel: 2, mentionOnly: false }) };
  const runs = [];
  let steers = 0;
  let releaseRun;
  const orchestrator = createPromptOrchestrator({
    ...identity, getSession: store.getSession, ensureWorkspace: store.ensureWorkspace, saveDb: store.saveDb,
    getSessionLanguage: () => 'zh', normalizeUiLanguage: (s) => s,
    getProviderDisplayName: (s) => s, getProviderShortName: (s) => s,
    getProviderDefaultBin: () => 'codex', getProviderBinEnvName: () => 'CODEX_BIN',
    safeReply: (m, p) => m.reply(p), safeError, truncate: (s) => s,
    withDiscordNetworkRetry: (f) => f(), splitForDiscord: (s) => [s],
    resolveTimeoutSetting: () => ({ timeoutMs: 0 }), resolveTaskRetrySetting: () => ({ maxAttempts: 1 }),
    resolveCompactStrategySetting: () => ({ strategy: 'native' }), resolveCompactEnabledSetting: () => ({ enabled: false }),
    resolveCompactThresholdSetting: () => ({ tokens: null }), resolveReplyDeliverySetting: () => ({ mode: 'card_mention' }),
    formatWorkspaceBusyReport: () => 'busy', formatTimeoutLabel: String, slashRef: (s) => `/${s}`,
    setActiveRun: runtime.setActiveRun, acquireWorkspace: lockRuntime.acquireWorkspace, stopChildProcess,
    isCliNotFound: () => false, toOptionalInt: (s) => s, extractInputTokensFromUsage: () => null,
    composeFinalAnswerText: ({ finalAnswerMessages }) => finalAnswerMessages.join('\n'),
    runTask: async (args) => {
      runs.push({ sessionId: identity.getSessionId(args.session), workspaceDir: args.workspaceDir, prompt: args.prompt, model: args.session.model });
      assert.ok(lockRuntime.readLock(args.workspaceDir).owner, 'runner is called under the existing workspace lock');
      args.onSpawn({ pid: 42, kill() { releaseRun?.(); } });
      const nextId = options.preserveSession ? identity.getSessionId(args.session) : 'new-codex-session';
      if (!options.startFailure) {
        args.onThreadReady(nextId);
        args.onEvent(options.provider === 'grok' ? { type: 'text', data: 'OK' } : { type: 'thread.started', thread_id: nextId });
      }
      if (options.holdRun) await new Promise((resolve) => { releaseRun = resolve; });
      return { ok: !options.startFailure && !args.wasCancelled(), cancelled: args.wasCancelled(),
        timedOut: Boolean(options.timedOut), error: options.startFailure ? 'spawn ENOENT' : '',
        logs: options.startFailure ? ['runner failure evidence'] : [], notes: [], messages: ['OK'], finalAnswerMessages: ['OK'],
        threadId: options.startFailure ? null : nextId };
    },
  });
  const queue = createChannelQueue({ ...runtime, getSession: store.getSession,
    resolveBusyPromptModeSetting: () => ({ mode: options.steer ? 'steer_if_possible' : 'queue', canSteer: true }),
    steerPrompt: async () => { steers++; return { steered: true }; },
    resolveSecurityContext: securityPolicy.resolveSecurityContext, handlePrompt: orchestrator.handlePrompt,
    safeReply: (m, p) => m.reply(p), safeError });
  const serviceOptions = { getClient: () => client, sessionStore: store, identity, accessPolicy, securityPolicy,
    canManage: (id) => id === USER,
    provider: options.provider || 'codex',
    discordWriter: {
      createThread: (parent, { title, payload }) => parent.threads.create({ name: title, ...(parent.type === 15 ? { message: payload } : {}) }),
      sendStarter: (thread, payload) => thread.send(payload),
    },
    enqueuePrompt: options.rejectQueue ? async () => ({ enqueued: false, reason: 'queue_full' }) : queue.enqueuePrompt,
    workspaceRoot, logger: { error() {} }, discordTimeoutMs: options.createTimeout ? 20 : 30000 };
  const service = createLocalTaskSubmission(serviceOptions);
  const entry = createDiscordEntryHandlers({ accessPolicy, getSession: store.getSession,
    resolveSecurityContext: securityPolicy.resolveSecurityContext, enqueuePrompt: queue.enqueuePrompt,
    handleTaskAuthorization: service.acknowledgeAuthorization,
    safeReply: (m, p) => m.reply(p), logger: { log() {}, error() {} },
    messageInput: { buildPromptFromMessage: (s) => s } });
  return { root, store, storeOptions, service, serviceOptions, runtime, queue, runs, sent, thread, source, authorization, sourceSession,
    entry, client, makeMessage, lockRuntime, release: () => releaseRun?.(), createCount: () => createCount, steerCount: () => steers };
}

function existingFixture(t, options = {}) {
  const f = fixture(t, { grant: `!task-authorize task-1 thread ${THREAD}`, preserveSession: true, ...options });
  const target = f.store.getSession(THREAD, { channel: f.thread });
  target.runnerSessionId = 'existing-target-session';
  target.codexThreadId = 'existing-target-session';
  target.model = 'target-model';
  target.workspaceDir = path.join(f.root, 'target-workspace');
  fs.mkdirSync(target.workspaceDir);
  f.store.saveDb();
  return { ...f, target };
}
const existingInput = (extra = {}) => ({ requestId: 'task-1', targetThreadId: THREAD,
  sourceThreadId: SOURCE, authorizationMessageId: AUTH, prompt: 'Reply CROSS_THREAD_OK without tools.', workspaceMode: 'target', ...extra });

async function manage(f, action, extra = {}, userId = USER) {
  let reply;
  await f.service.manage({ guildId: f.source.guild.id, channel: f.source, user: { id: userId, bot: false },
    options: { getString: key => ({ action, ...extra })[key] ?? null } }, async value => { reply = value; });
  return reply;
}

test('receiver allow policy delegates without per-thread grant through real queue and preserves follow-up session', async t => {
  const f = existingFixture(t);
  await manage(f, 'policy', { mode: 'allow' });
  f.authorization.content = 'not an authorization';
  f.service.submit(existingInput({ authorizationMessageId: undefined }));
  await f.service.drain();
  await until(() => f.service.get('task-1').status === 'succeeded');
  assert.equal(f.runs.length, 1);
  assert.equal(f.runs[0].sessionId, 'existing-target-session');
  assert.equal(f.service.get('task-1').ownerUserId, USER);
  assert.ok(f.service.get('task-1').history.some(h => h.status === 'queued'));
  await f.entry.handleMessageCreate(f.makeMessage(f.thread, 'continue', { id: USER, bot: false }), f.client);
  await until(() => f.runs.length === 2);
  await until(() => !f.runtime.getChannelState(THREAD).running);
  assert.equal(f.runs[1].sessionId, 'existing-target-session');
});

test('approval persists full request without creating thread; legacy grant cannot bypass; approve once', async t => {
  const f = fixture(t);
  await manage(f, 'policy', { mode: 'approval' });
  const request = input({ prompt: '完整内容'.repeat(1500) });
  f.service.submit(request);
  await f.service.drain();
  assert.equal(f.service.get('task-1').status, 'pending_approval');
  assert.equal(f.createCount(), 0);
  assert.equal(f.runs.length, 0);
  assert.equal(f.service.submit(request).status, 'pending_approval');
  assert.throws(() => f.service.submit({ ...request, prompt: 'different' }), /conflict/);
  const view = await manage(f, 'show', { 'request-id': 'task-1' });
  assert.equal(view.files[0].attachment.toString(), request.prompt);
  const outcomes = await Promise.allSettled([manage(f, 'approve', { 'request-id': 'task-1' }), manage(f, 'approve', { 'request-id': 'task-1' })]);
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  await f.service.drain();
  await until(() => f.service.get('task-1').status === 'succeeded');
  assert.equal(f.createCount(), 1);
  assert.equal(f.runs.length, 1);
});

test('policy and pending approval survive restart; changing to allow does not release pending requests', async t => {
  const f = fixture(t);
  await manage(f, 'policy', { mode: 'approval' });
  f.service.submit(input({ authorizationMessageId: undefined }));
  await f.service.drain();
  const store = createSessionStore(f.storeOptions);
  assert.equal(store.getAgentMessagePolicy(f.source.guild.id).mode, 'approval');
  const service = createLocalTaskSubmission({ ...f.serviceOptions, sessionStore: store });
  const restarted = { ...f, store, service };
  await manage(restarted, 'policy', { mode: 'allow' });
  service.recover();
  await service.drain();
  assert.equal(service.get('task-1').status, 'pending_approval');
  assert.equal(f.runs.length, 0);
  await manage(restarted, 'reject', { 'request-id': 'task-1' });
  assert.equal(service.get('task-1').status, 'rejected');
  await assert.rejects(manage(restarted, 'approve', { 'request-id': 'task-1' }), /not pending/);
});

test('notification delivers full content but cannot trigger queue or bot-message entry', async t => {
  const f = existingFixture(t);
  await manage(f, 'policy', { mode: 'allow' });
  f.service.submit(existingInput({ authorizationMessageId: undefined, kind: 'notify' }));
  await f.service.drain();
  assert.equal(f.service.get('task-1').status, 'notified');
  assert.equal(f.runs.length, 0);
  assert.equal(f.sent.length, 1);
  const message = await f.thread.messages.fetch(f.store.getTaskRequest('task-1').messageId);
  assert.equal(message.author.bot, true);
  await f.entry.handleMessageCreate(message);
  assert.equal(f.runs.length, 0);
});

test('management denies untrusted user and cross-guild request access', async t => {
  const f = fixture(t);
  const interaction = { guildId: f.source.guild.id, channel: f.source, user: { id: USER } };
  f.service.setPolicy(interaction, 'allow');
  assert.equal(f.store.getAgentMessagePolicy(f.source.guild.id).mode, 'allow');
  assert.throws(() => f.service.setPolicy({ ...interaction, user: { id: BOT } }, 'approval'), /authorized managers/);
  assert.throws(() => f.service.setPolicy(interaction, 'invalid'), /choose/);
  assert.equal(f.store.getAgentMessagePolicy(f.source.guild.id).mode, 'allow');
  await assert.rejects(manage(f, 'policy', { mode: 'allow' }, BOT), /authorized managers/);
  assert.equal(f.store.getAgentMessagePolicy(f.source.guild.id).mode, 'allow');
  await manage(f, 'policy', { mode: 'approval' });
  f.service.submit(input()); await f.service.drain();
  await assert.rejects(f.service.manage({ guildId: '999999999999999999', channel: f.source,
    user: { id: USER }, options: { getString: k => ({ action: 'show', 'request-id': 'task-1' })[k] } }, () => {}), /not found/);
  assert.throws(() => normalizeTaskInput({ ...input(), ownerUserId: USER }), /fields/);
});

for (const options of [{ forbidden: true }, { deniedPermission: 'ViewChannel' }, { forbiddenUser: true }]) {
  test(`allow policy cannot bypass restrictions ${JSON.stringify(options)}`, async t => {
    const f = fixture(t, options);
    f.store.setAgentMessagePolicy(f.source.guild.id, { mode: 'allow', ownerUserId: USER, updatedAt: new Date().toISOString() });
    f.service.submit(input({ authorizationMessageId: undefined })); await f.service.drain();
    assert.equal(f.service.get('task-1').status, 'failed');
    assert.equal(f.runs.length, 0);
  });
}

test('unconfigured and revoked delegation fail closed', async t => {
  const f = fixture(t);
  f.service.submit(input({ authorizationMessageId: undefined })); await f.service.drain();
  assert.match(f.service.get('task-1').error, /configure receiver/);
  await manage(f, 'policy', { mode: 'allow' });
  const revoked = createLocalTaskSubmission({ ...f.serviceOptions, canManage: () => false });
  revoked.submit(input({ requestId: 'revoked', authorizationMessageId: undefined })); await revoked.drain();
  assert.match(revoked.get('revoked').error, /no longer/);
});

test('cross-provider source need not exist in receiver session store', async t => {
  const f = existingFixture(t);
  await manage(f, 'policy', { mode: 'allow' });
  const service = createLocalTaskSubmission({ ...f.serviceOptions, sessionStore: { ...f.store,
    peekSession: id => id === SOURCE ? null : f.store.peekSession(id) } });
  service.submit(existingInput({ authorizationMessageId: undefined })); await service.drain();
  await until(() => service.get('task-1').status === 'succeeded');
  assert.equal(f.runs.length, 1);
});

test('foreign Agent source uses peer whitelist but cannot expand receiver target permissions', async t => {
  const f = existingFixture(t);
  f.source.parentId = '999999999999999999';
  await assert.rejects(manage(f, 'policy', { mode: 'allow' }), /authorized managers/);
  // The source is not a management channel of the receiver; use its target channel.
  f.service.setPolicy({ guildId: f.thread.guild.id, channel: f.thread, user: { id: USER } }, 'allow');
  f.service.submit(existingInput({ authorizationMessageId: undefined })); await f.service.drain();
  assert.match(f.service.get('task-1').error, /source channel not allowed/);
  const allowed = createLocalTaskSourceAccess({ accessPolicy: f.serviceOptions.accessPolicy,
    env: { CLAUDE__LOCAL_TASK_SOCKET_DIR: '/private/claude', CLAUDE__ALLOWED_CHANNEL_IDS: f.source.parentId,
      CLAUDE__ALLOWED_USER_IDS: USER } });
  const service = createLocalTaskSubmission({ ...f.serviceOptions, isAllowedSourceChannel: allowed });
  service.submit(existingInput({ requestId: 'cross-peer', authorizationMessageId: undefined }));
  await service.drain(); await until(() => service.get('cross-peer').status === 'succeeded');
  assert.equal(f.runs.length, 1);
  f.thread.parentId = f.source.parentId;
  service.submit(existingInput({ requestId: 'wrong-target', authorizationMessageId: undefined }));
  await service.drain();
  assert.equal(service.get('wrong-target').status, 'failed');
  assert.equal(f.runs.length, 1);
});

test('receiver Grok instance uses existing generic runner, queue and actual start event', async t => {
  const f = existingFixture(t, { provider: 'grok' });
  await manage(f, 'policy', { mode: 'allow' });
  f.service.submit(existingInput({ authorizationMessageId: undefined })); await f.service.drain();
  await until(() => f.service.get('task-1').status === 'succeeded');
  const record = f.store.getTaskRequest('task-1');
  assert.ok(record.history.some(h => h.status === 'started' && h.startedEvent === 'text'));
  assert.equal(f.store.peekSession(THREAD).provider, 'grok');
  assert.equal(f.runs.length, 1);
  assert.equal(f.service.get('task-1').observedModel, null);
});

test('slash router invokes receiver policy handler without enqueueing an agent prompt', async t => {
  const f = fixture(t);
  const router = createSlashCommandRouter({ getSession: f.store.getSession,
    manageAgentMessages: f.service.manage });
  let reply;
  assert.equal(await router({ commandName: 'agent-messages', interaction: {
    guildId: f.source.guild.id, channelId: SOURCE, channel: f.source, user: { id: USER },
    options: { getString: key => ({ action: 'policy', mode: 'allow' })[key] ?? null },
  }, respond: async value => { reply = value; } }), true);
  assert.match(reply.content, /完全放行/);
  assert.equal(f.runs.length, 0);
  assert.equal(f.store.getAgentMessagePolicy(f.source.guild.id).ownerUserId, USER);
});

test('corrupt persisted policy fails closed without erasing the original DB', t => {
  const f = fixture(t);
  const db = JSON.parse(fs.readFileSync(f.storeOptions.dataFile, 'utf8'));
  db.agentMessagePolicies = { [f.source.guild.id]: { mode: 'anything', ownerUserId: USER } };
  const bytes = JSON.stringify(db);
  fs.writeFileSync(f.storeOptions.dataFile, bytes);
  assert.throws(() => createSessionStore(f.storeOptions), /Invalid Agent message policy/);
  assert.equal(fs.readFileSync(f.storeOptions.dataFile, 'utf8'), bytes);
});

test('existing thread uses target session/model/workspace, no creation, duplicate or source context', async (t) => {
  const f = existingFixture(t);
  f.service.submit(existingInput()); f.service.submit(existingInput());
  await f.service.drain(); await until(() => f.service.get('task-1').status === 'succeeded');
  assert.equal(f.createCount(), 0); assert.equal(f.runs.length, 1);
  assert.equal(f.runs[0].sessionId, 'existing-target-session');
  assert.equal(f.runs[0].model, 'target-model');
  assert.equal(f.runs[0].workspaceDir, f.target.workspaceDir);
  assert.equal(f.service.get('task-1').sessionId, 'existing-target-session');
  assert.match(f.sent[0].content, /由来源会话经用户授权发起/);
  assert.ok(f.sent[0].content.endsWith(existingInput().prompt));
  assert.throws(() => f.service.submit(existingInput({ targetThreadId: SOURCE })), /conflict/);
  assert.equal(f.service.submit(existingInput()).status, 'succeeded');
  await f.entry.handleMessageCreate(f.makeMessage(f.thread, 'Follow up.', { id: USER, bot: false }), f.client);
  await until(() => f.runs.length === 2 && !f.runtime.getChannelState(THREAD).running);
  assert.equal(f.runs[1].sessionId, 'existing-target-session');
  assert.equal(createSessionStore(f.storeOptions).getTaskRequest('task-1').status, 'succeeded');
});

test('existing busy thread queues instead of steering; verified owner can dequeue', async (t) => {
  const f = existingFixture(t, { steer: true });
  f.runtime.getChannelState(THREAD).running = true;
  f.service.submit(existingInput()); await f.service.drain();
  assert.equal(f.service.get('task-1').status, 'queued');
  assert.equal(f.steerCount(), 0); assert.equal(f.runs.length, 0);
  assert.equal(f.queue.dequeuePrompt(THREAD, { requesterUserId: USER }).ok, true);
  assert.equal(f.service.get('task-1').status, 'cancelled');
});

test('existing requests reject wrong grant, absent session, side session, archived and inaccessible target', async (t) => {
  for (const kind of ['new-grant', 'missing-session', 'side', 'archived', 'locked', 'permissions', 'private-membership', 'workspace']) {
    const f = existingFixture(t);
    if (kind === 'new-grant') f.authorization.content = `!task-authorize task-1 ${PARENT}`;
    if (kind === 'missing-session') { f.target.runnerSessionId = null; f.target.codexThreadId = null; }
    if (kind === 'side') f.target.sideConversation = { status: 'open' };
    if (kind === 'archived') f.thread.archived = true;
    if (kind === 'locked') f.thread.locked = true;
    if (kind === 'permissions') f.thread.permissionsFor = () => ({ has: () => false });
    if (kind === 'private-membership') { f.thread.type = 12; f.thread.members = { fetch: async () => { throw new Error('not a member'); } }; }
    if (kind === 'workspace') f.target.workspaceDir = path.join(f.root, 'absent');
    f.store.saveDb();
    f.service.submit(existingInput()); await f.service.drain();
    assert.equal(f.service.get('task-1').status, 'failed', kind);
    assert.equal(f.runs.length, 0); assert.equal(f.sent.length, 0); assert.equal(f.createCount(), 0);
  }
});

test('existing thread refuses ambiguous CLI/schema combinations', () => {
  for (const extra of [{ parentId: PARENT }, { title: 'rename' }, { workspaceMode: 'isolated' }, { workspaceMode: 'share-source' }]) {
    assert.throws(() => normalizeTaskInput(existingInput(extra)));
  }
});

test('existing startup failure preserves binding and never claims started', async (t) => {
  const f = existingFixture(t, { startFailure: true });
  f.service.submit(existingInput()); await f.service.drain();
  await until(() => f.service.get('task-1').status === 'failed');
  assert.equal(f.target.runnerSessionId, 'existing-target-session');
  assert.equal(f.service.get('task-1').sessionId, 'existing-target-session');
  assert.ok(!f.service.get('task-1').history.some((item) => item.status === 'started'));
  assert.equal(f.createCount(), 0);
});

test('recovery rejects changed target binding and keeps original session evidence', async (t) => {
  const f = existingFixture(t);
  f.runtime.getChannelState(THREAD).running = true;
  f.service.submit(existingInput()); await f.service.drain();
  f.runtime.getChannelState(THREAD).queue.length = 0;
  f.runtime.getChannelState(THREAD).running = false;
  f.target.runnerSessionId = 'changed-after-restart'; f.target.codexThreadId = 'changed-after-restart';
  f.store.saveDb();
  const recovered = createLocalTaskSubmission({ ...f.serviceOptions, sessionStore: createSessionStore(f.storeOptions) });
  recovered.recover(); await recovered.drain();
  assert.equal(recovered.get('task-1').status, 'failed');
  assert.equal(recovered.get('task-1').sessionId, 'existing-target-session');
  assert.equal(f.runs.length, 0); assert.equal(f.createCount(), 0);
});

test('target changes while waiting for lock fail before runner, without rebinding', async (t) => {
  for (const kind of ['session', 'workspace', 'provider']) {
    const f = existingFixture(t);
    const lock = await f.lockRuntime.acquireWorkspace(f.target.workspaceDir, { key: 'other' });
    f.service.submit(existingInput()); await f.service.drain();
    await until(() => f.runtime.getChannelState(THREAD).activeRun?.phase === 'workspace');
    if (kind === 'session') { f.target.runnerSessionId = 'changed-session'; f.target.codexThreadId = 'changed-session'; }
    if (kind === 'workspace') f.target.workspaceDir = f.root;
    if (kind === 'provider') f.target.provider = 'claude';
    f.store.saveDb(); lock.release();
    await until(() => f.service.get('task-1').status === 'failed');
    assert.equal(f.runs.length, 0, kind);
  }
});

test('existing queued request recovers without a new thread or new prompt notice', async (t) => {
  const f = existingFixture(t);
  f.runtime.getChannelState(THREAD).running = true;
  f.service.submit(existingInput()); await f.service.drain();
  const noticeCount = f.sent.filter((m) => m.content?.includes('由来源会话经用户授权发起')).length;
  f.runtime.getChannelState(THREAD).running = false;
  f.runtime.getChannelState(THREAD).queue.length = 0;
  const recovered = createLocalTaskSubmission({ ...f.serviceOptions, sessionStore: createSessionStore(f.storeOptions) });
  recovered.recover(); await recovered.drain();
  await until(() => recovered.get('task-1').status === 'succeeded');
  assert.equal(f.runs[0].sessionId, 'existing-target-session');
  assert.equal(f.createCount(), 0);
  assert.equal(f.sent.filter((m) => m.content?.includes('由来源会话经用户授权发起')).length, noticeCount);
});

test('existing CLI goes through actual socket and retains the bound session', async (t) => {
  const f = existingFixture(t);
  const endpoint = await startLocalTaskSocket({ directory: path.join(f.root, 'ipc'), service: f.service });
  t.after(() => endpoint.close());
  const promptFile = path.join(f.root, 'existing.txt'); fs.writeFileSync(promptFile, existingInput().prompt);
  const args = ['--socket', endpoint.socketPath, '--request-id', 'task-1', '--target-thread', THREAD,
    '--source-thread', SOURCE, '--authorization-message', AUTH, '--prompt-file', promptFile];
  const first = await cli(args); assert.equal(first.code, 0, first.stderr);
  await until(() => f.service.get('task-1').status === 'succeeded');
  assert.equal(f.runs[0].sessionId, 'existing-target-session');
  const duplicate = await cli(args); assert.equal(JSON.parse(duplicate.stdout).status, 'succeeded');
  const bad = await cli([...args, '--share-source']); assert.equal(bad.code, 1); assert.match(bad.stderr, /cannot be combined/);
  assert.equal(f.createCount(), 0); assert.equal(f.runs.length, 1);
});

test('new CLI policy contract uses actual socket, no authorization ID, and separates notify/task', async t => {
  const f = existingFixture(t);
  await manage(f, 'policy', { mode: 'approval' });
  const endpoint = await startLocalTaskSocket({ directory: path.join(f.root, 'ipc'), service: f.service });
  t.after(() => endpoint.close());
  const file = path.join(f.root, 'prompt.txt'); fs.writeFileSync(file, '完整任务内容');
  const args = ['--socket', endpoint.socketPath, '--request-id', 'policy-cli', '--target-thread', THREAD,
    '--source-thread', SOURCE, '--prompt-file', file, '--kind', 'notify'];
  const first = await cli(args); assert.equal(first.code, 0, first.stderr);
  await f.service.drain();
  assert.equal(f.service.get('policy-cli').status, 'pending_approval');
  assert.equal(f.runs.length, 0);
  await manage(f, 'approve', { 'request-id': 'policy-cli' }); await f.service.drain();
  const duplicate = await cli(args);
  assert.equal(JSON.parse(duplicate.stdout).status, 'notified');
  assert.equal(f.runs.length, 0);
  const conflict = await cli([...args.slice(0, -1), 'task']);
  assert.equal(conflict.code, 1);
  assert.match(conflict.stdout, /conflict/);
});

test('approval notice uncertainty is preserved and never republished after restart', async t => {
  const f = fixture(t);
  await manage(f, 'policy', { mode: 'approval' });
  let sends = 0;
  const service = createLocalTaskSubmission({ ...f.serviceOptions, discordWriter: { ...f.serviceOptions.discordWriter,
    sendStarter: async () => { sends++; throw new Error('uncertain notice delivery'); } } });
  service.submit(input({ authorizationMessageId: undefined })); await service.drain();
  assert.equal(service.get('task-1').status, 'interrupted');
  assert.match(service.get('task-1').error, /uncertain notice/);
  service.recover(); await service.drain();
  assert.equal(sends, 1);
  assert.equal(f.runs.length, 0);
});

test('approved request recovers into existing queue exactly once', async t => {
  const f = existingFixture(t);
  await manage(f, 'policy', { mode: 'approval' });
  f.service.submit(existingInput({ authorizationMessageId: undefined })); await f.service.drain();
  const old = f.store.getTaskRequest('task-1');
  f.store.putTaskRequest({ ...old, status: 'approved', approvedBy: USER });
  const service = createLocalTaskSubmission(f.serviceOptions);
  service.recover(); service.recover(); await service.drain();
  await until(() => service.get('task-1').status === 'succeeded');
  assert.equal(f.runs.length, 1);
  assert.equal(f.createCount(), 0);
});

test('real queue + orchestrator + store: submit once, retain bot identity, isolated workspace, normal follow-up', async (t) => {
  const f = fixture(t);
  assert.equal(f.service.submit(input()).status, 'accepted');
  assert.equal(f.service.submit(input()).status, 'accepted');
  assert.throws(() => f.service.submit(input({ prompt: 'changed' })), /conflict/);
  await f.service.drain();
  await until(() => f.service.get('task-1').status === 'succeeded');
  assert.equal(f.createCount(), 1);
  assert.equal(f.runs.length, 1);
  assert.equal(f.runs[0].sessionId, null);
  assert.equal(f.runs[0].model, null);
  assert.equal(f.runs[0].workspaceDir, path.join(f.root, 'workspaces', 'agent-tasks', THREAD));
  const state = f.service.get('task-1');
  assert.equal(state.sessionId, 'new-codex-session');
  assert.equal(state.observedModel, null);
  assert.deepEqual(state.history.map((s) => s.status).filter((s, i, a) => s !== a[i - 1]),
    ['accepted', 'creating', 'thread_created', 'publishing', 'thread_created', 'queued', 'starting', 'started', 'succeeded']);
  assert.match(f.sent[0].content, /由来源会话经用户授权发起/);
  assert.ok(f.sent[0].content.endsWith(input().prompt));
  assert.ok(f.sent.some((p) => typeof p === 'string' && p.includes(`<@${USER}> OK`)));
  const persisted = createSessionStore(f.storeOptions);
  assert.equal(persisted.getTaskRequest('task-1').status, 'succeeded');
  assert.equal(persisted.getSession(THREAD).runnerSessionId, 'new-codex-session');
  const botMessage = f.makeMessage(f.thread, 'must not run');
  await f.entry.handleMessageCreate(botMessage, f.client);
  assert.equal(f.runs.length, 1, 'bot protection is still active');
  await f.entry.handleMessageCreate(f.makeMessage(f.thread, 'Continue.', { id: USER, bot: false }), f.client);
  await until(() => f.runs.length === 2 && !f.runtime.getChannelState(THREAD).running);
  assert.equal(f.runs[1].sessionId, 'new-codex-session');
  assert.equal(f.service.submit(input()).status, 'succeeded');
  assert.equal(f.runs.length, 2);
  f.store.getSession(THREAD).lastObservedModel = 'model-from-runtime';
  assert.equal(f.service.get('task-1').observedModel, 'model-from-runtime');
  f.store.getSession(THREAD).runnerSessionId = 'another-session';
  assert.equal(f.service.get('task-1').observedModel, null, 'do not misattribute a later session model');
});

test('real Discord entry acknowledges a user authorization without enqueuing a prompt', async (t) => {
  const f = fixture(t);
  const replies = [];
  const message = { ...f.authorization, channel: f.source, reply: async (payload) => replies.push(payload) };
  await f.entry.handleMessageCreate(message, f.client);
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /已授权/);
  assert.match(replies[0].content, new RegExp(AUTH));
  assert.equal(f.runs.length, 0); assert.equal(f.createCount(), 0);
});

test('persistence failure at queue/start checkpoint prevents execution and retains an error', async (t) => {
  for (const status of ['queued', 'starting']) {
    const f = fixture(t);
    const put = f.store.putTaskRequest;
    let failed = false;
    f.store.putTaskRequest = (record) => {
      if (record.status === status && !failed) { failed = true; throw new Error('disk write failure'); }
      return put(record);
    };
    f.service.submit(input()); await f.service.drain();
    await until(() => f.service.get('task-1').status === 'failed');
    assert.match(f.service.get('task-1').error, /disk write failure/);
    assert.equal(f.runs.length, 0);
    assert.equal(f.runtime.getChannelState(THREAD).queue.length, 0);
  }
});

test('long UTF-8 prompt is retained intact as first-message attachment; forum works', async (t) => {
  const f = fixture(t, { forum: true });
  const prompt = '中文任务\n'.repeat(2000);
  f.service.submit(input({ prompt })); await f.service.drain();
  await until(() => f.service.get('task-1').status === 'succeeded');
  assert.equal(f.sent[0].files[0].attachment.toString('utf8'), prompt);
  assert.ok(f.runs[0].prompt.startsWith(prompt));
  assert.deepEqual(f.sent[0].allowedMentions, { parse: [] });
});

for (const [name, options, expected] of [
  ['forbidden target', { forbidden: true }, /channel not allowed/],
  ['forbidden user', { forbiddenUser: true }, /user not allowed/],
  ['bot authorization', { botAuthorization: true }, /real user/],
  ['natural language is not machine authorization', { grant: 'please start a task' }, /real user/],
  ['missing Discord permissions', { deniedPermission: 'CreatePublicThreads' }, /access denied/],
  ['queue failure', { rejectQueue: true }, /queue rejected/],
  ['runner startup failure', { startFailure: true }, /spawn ENOENT/],
  ['runner timeout', { startFailure: true, timedOut: true }, /spawn ENOENT/],
]) {
  test(name, async (t) => {
    const f = fixture(t, options); f.service.submit(input()); await f.service.drain();
    await until(() => f.service.get('task-1').status === 'failed');
    assert.match(f.service.get('task-1').error, expected);
    if (options.startFailure) {
      assert.ok(!f.service.get('task-1').history.some((s) => s.status === 'started'));
      assert.deepEqual(f.store.getTaskRequest('task-1').logs, ['runner failure evidence']);
      assert.equal(f.service.get('task-1').timedOut, Boolean(options.timedOut));
    }
    f.service.submit(input()); await tick();
    assert.ok(f.createCount() <= 1);
  });
}

test('uncertain Discord side effects are not retried, including after restart', async (t) => {
  for (const options of [{ createError: true }, { sendError: true }, { createTimeout: true }]) {
    const f = fixture(t, options); f.service.submit(input()); await f.service.drain();
    assert.equal(f.service.get('task-1').status, 'interrupted');
    const recovered = createLocalTaskSubmission({ ...f.serviceOptions, sessionStore: createSessionStore(f.storeOptions) });
    recovered.recover(); await recovered.drain(); recovered.submit(input());
    assert.equal(f.createCount(), 1); assert.equal(f.runs.length, 0);
  }
});

test('reject arbitrary workspace paths and invalid inputs before acceptance', () => {
  for (const extra of [{ workspace: '/etc' }, { workspaceMode: '../../etc' }, { requestId: '__proto__' },
    { prompt: '' }, { prompt: 'x'.repeat(131073) }, { title: 'x'.repeat(101) }, { ownerUserId: USER }]) {
    assert.throws(() => normalizeTaskInput(input(extra)));
  }
});

test('invalid shared workspace and isolation symlink are rejected, no runner', async (t) => {
  const noGrant = fixture(t); noGrant.service.submit(input({ workspaceMode: 'share-source' })); await noGrant.service.drain();
  assert.equal(noGrant.service.get('task-1').status, 'failed'); assert.equal(noGrant.createCount(), 0);
  const shared = fixture(t, { grant: `!task-authorize task-1 ${PARENT} share-source` });
  shared.sourceSession.workspaceDir = path.join(shared.root, 'missing'); shared.store.saveDb();
  shared.service.submit(input({ workspaceMode: 'share-source' })); await shared.service.drain();
  assert.equal(shared.service.get('task-1').status, 'failed'); assert.equal(shared.createCount(), 0);
  const f = fixture(t);
  fs.symlinkSync(f.root, path.join(f.root, 'workspaces', 'agent-tasks'));
  f.service.submit(input()); await f.service.drain();
  assert.match(f.service.get('task-1').error, /invalid isolated/); assert.equal(f.runs.length, 0);
});

test('shared workspace waits on existing lock and normal cancellation stops it before runner', async (t) => {
  const f = fixture(t, { grant: `!task-authorize task-1 ${PARENT} share-source` });
  const lock = await f.lockRuntime.acquireWorkspace(f.root, { key: SOURCE });
  f.service.submit(input({ workspaceMode: 'share-source' })); await f.service.drain();
  await until(() => f.runtime.getChannelState(THREAD).activeRun?.phase === 'workspace');
  assert.equal(f.service.get('task-1').status, 'queued'); assert.equal(f.runs.length, 0);
  f.runtime.cancelChannelWork(THREAD);
  await until(() => f.service.get('task-1').status === 'cancelled');
  lock.release(); assert.equal(f.runs.length, 0);
});

test('normal active cancellation and queue dequeue use verified ownership, not bot author', async (t) => {
  const f = fixture(t, { holdRun: true });
  f.service.submit(input()); await f.service.drain();
  await until(() => f.service.get('task-1').status === 'started');
  const cancelled = f.runtime.cancelChannelWork(THREAD);
  assert.equal(cancelled.cancelledRunning, true);
  await until(() => f.service.get('task-1').status === 'cancelled');
  const queued = fixture(t);
  queued.runtime.getChannelState(THREAD).running = true;
  queued.service.submit(input()); await queued.service.drain();
  assert.equal(queued.service.get('task-1').status, 'queued');
  assert.equal(queued.runtime.getChannelState(THREAD).queue[0].message.author.bot, true);
  assert.equal(queued.queue.dequeuePrompt(THREAD, { requesterUserId: BOT }).ok, false);
  assert.equal(queued.queue.dequeuePrompt(THREAD, { requesterUserId: USER }).ok, true);
  assert.equal(queued.service.get('task-1').status, 'cancelled');
});

test('restart recovers durable queued work through same queue without creating another thread', async (t) => {
  const f = fixture(t); f.runtime.getChannelState(THREAD).running = true;
  f.service.submit(input()); await f.service.drain();
  assert.equal(f.service.get('task-1').status, 'queued');
  f.runtime.getChannelState(THREAD).queue.length = 0;
  f.runtime.getChannelState(THREAD).running = false;
  const reloaded = createSessionStore(f.storeOptions);
  const recovered = createLocalTaskSubmission({ ...f.serviceOptions, sessionStore: reloaded });
  recovered.recover(); await recovered.drain();
  await until(() => recovered.get('task-1').status === 'succeeded');
  assert.equal(f.createCount(), 1); assert.equal(f.runs.length, 1);
});

test('restart during creating/publishing/starting/started preserves evidence and never replays', async (t) => {
  for (const status of ['creating', 'publishing', 'starting', 'started']) {
    const f = fixture(t); f.runtime.getChannelState(THREAD).running = true;
    f.service.submit(input()); await f.service.drain();
    const old = f.store.getTaskRequest('task-1');
    f.store.putTaskRequest({ ...old, status, ...(status === 'started' ? { sessionId: 'new-codex-session' } : {}) });
    const recovered = createLocalTaskSubmission({ ...f.serviceOptions, sessionStore: createSessionStore(f.storeOptions) });
    recovered.recover(); await recovered.drain();
    assert.equal(recovered.get('task-1').status, 'interrupted');
    assert.match(recovered.get('task-1').error, new RegExp(status));
    assert.equal(f.runs.length, 0); assert.equal(f.createCount(), 1);
  }
});

function cli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/submit-task.mjs', ...args], { cwd: path.resolve(import.meta.dirname, '..') });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (b) => { stdout += b; }); child.stderr.on('data', (b) => { stderr += b; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('actual Unix socket and CLI: submit/query/conflict/offline/invalid UTF-8; no Discord network', async (t) => {
  const f = fixture(t);
  const endpoint = await startLocalTaskSocket({ directory: path.join(f.root, 'ipc'), service: f.service, logger: { error() {} } });
  t.after(() => endpoint.close());
  assert.equal(fs.statSync(path.dirname(endpoint.socketPath)).mode & 0o777, 0o700);
  assert.equal(fs.statSync(endpoint.socketPath).mode & 0o777, 0o600);
  await assert.rejects(startLocalTaskSocket({ directory: path.join(f.root, 'ipc'), service: f.service }), /already active/);
  const promptFile = path.join(f.root, 'prompt.txt'); fs.writeFileSync(promptFile, input().prompt);
  const args = ['--socket', endpoint.socketPath, '--request-id', 'task-1', '--parent', PARENT, '--source-thread', SOURCE,
    '--authorization-message', AUTH, '--title', input().title, '--prompt-file', promptFile];
  const first = await cli(args); assert.equal(first.code, 0, first.stderr);
  assert.equal(JSON.parse(first.stdout).status, 'accepted');
  await until(() => f.service.get('task-1').status === 'succeeded');
  const query = await cli(['--socket', endpoint.socketPath, '--request-id', 'task-1', '--status']);
  assert.equal(JSON.parse(query.stdout).sessionId, 'new-codex-session');
  const duplicate = await cli(args); assert.equal(JSON.parse(duplicate.stdout).status, 'succeeded');
  fs.writeFileSync(promptFile, 'different');
  const conflict = await cli(args); assert.equal(conflict.code, 1); assert.match(conflict.stdout, /conflict/);
  fs.writeFileSync(promptFile, Buffer.from([0xff]));
  const bad = await cli(args); assert.equal(bad.code, 1); assert.match(bad.stderr, /encoded data/);
  const offline = await cli(['--socket', path.join(f.root, 'absent.sock'), '--request-id', 'task-1', '--status']);
  assert.equal(offline.code, 1); assert.equal(JSON.parse(offline.stderr).status, 'unknown');
  assert.equal(f.createCount(), 1);
});

test('CLI timeout is unknown, not a successful submission', async (t) => {
  const f = fixture(t); const socket = path.join(f.root, 'slow.sock');
  const server = http.createServer(() => {});
  await new Promise((resolve) => server.listen(socket, resolve));
  const result = await cli(['--socket', socket, '--request-id', 'task-1', '--status', '--timeout-ms', '20']);
  assert.equal(result.code, 1); assert.match(result.stderr, /acceptance unknown/);
  await new Promise((resolve) => server.close(resolve));
});

test('unsafe IPC directory and corrupt request DB fail closed without erasing evidence', async (t) => {
  const f = fixture(t); const directory = path.join(f.root, 'unsafe'); fs.mkdirSync(directory, { mode: 0o755 });
  await assert.rejects(startLocalTaskSocket({ directory, service: f.service }), /0700/);
  const bad = JSON.stringify({ threads: {}, localTaskRequests: { bad: {} } });
  fs.writeFileSync(f.storeOptions.dataFile, bad);
  assert.throws(() => createSessionStore(f.storeOptions), /Invalid session DB/);
  assert.equal(fs.readFileSync(f.storeOptions.dataFile, 'utf8'), bad);
});

test('production Discord writer disables hidden POST retries and preserves actual message payload', async () => {
  const { REST, Routes, MessagePayload } = await import('discord.js');
  let calls = 0;
  const client = { token: 'test-token-not-real', options: {}, rest: { options: {
    retries: 3, version: '10', makeRequest: async () => { calls++; return new Response('server failure', { status: 502 }); },
  } } };
  const parent = { id: PARENT, type: 0, client };
  const writer = createLocalTaskDiscordWriter({ REST, Routes, MessagePayload });
  await assert.rejects(writer.createThread(parent, { title: 'test', requestId: 'task-1', payload: {} }), (err) => err.status === 502);
  assert.equal(calls, 1, 'an uncertain POST must never be retried by discord.js');
  assert.equal(client.rest.options.retries, 3, 'normal bot REST policy is unchanged');
  const writes = [];
  client.rest.options.makeRequest = async (url, options) => {
    writes.push({ url, options });
    return new Response(JSON.stringify({ id: THREAD }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const working = createLocalTaskDiscordWriter({ REST, Routes, MessagePayload });
  const payload = { content: 'first prompt', allowedMentions: { parse: [] }, files: [{ attachment: Buffer.from('entire prompt'), name: 'task-prompt.txt' }] };
  const forum = { ...parent, type: 15 };
  const created = await working.createThread(forum, { title: 'test', requestId: 'task-1', payload });
  assert.equal(created.id, THREAD);
  assert.ok(writes[0].options.body instanceof FormData);
  const data = JSON.parse(writes[0].options.body.get('payload_json'));
  assert.equal(data.message.content, 'first prompt');
  assert.deepEqual(data.message.allowed_mentions, { parse: [] });
  assert.equal(await writes[0].options.body.get('files[0]').text(), 'entire prompt');
});
