import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCodexForkThread,
  createProviderForkThread,
  formatCodexForkResult,
  parseForkTextInput,
} from '../src/codex-fork-flow.js';

function createForkSource() {
  return {
    id: 'source-1',
    user: { id: 'user-1' },
    channel: {
      id: 'parent-channel',
      threads: {
        async create() {
          throw new Error('default create should not run in this test');
        },
      },
    },
  };
}

test('createCodexForkThread creates Discord thread before native fork and deletes it on native failure', async () => {
  const events = [];
  const childThread = {
    id: 'child-channel',
    async delete(reason) {
      events.push(`delete:${reason}`);
    },
  };

  await assert.rejects(
    () => createCodexForkThread({
      key: 'parent-channel',
      source: createForkSource(),
      parentSessionId: 'parent-session',
      getSession: () => ({}),
      commandActions: {
        bindForkedSession() {},
      },
      createThread: async () => {
        events.push('createThread');
        return childThread;
      },
      async forkCodexThread() {
        events.push('forkCodexThread');
        throw new Error('native fork failed');
      },
    }),
    /native fork failed/,
  );

  assert.deepEqual(events, [
    'createThread',
    'forkCodexThread',
    'delete:Codex fork failed before session binding',
  ]);
});

test('createCodexForkThread uses an optional requested Discord thread name', async () => {
  const childSession = {};
  const threadCreates = [];
  const setNameCalls = [];
  const result = await createCodexForkThread({
    key: 'parent-channel',
    source: {
      ...createForkSource(),
      channel: {
        id: 'parent-channel',
        threads: {
          async create(options) {
            threadCreates.push(options);
            return {
              id: 'child-channel',
              async join() {},
              async setName(name, reason) {
                setNameCalls.push({ name, reason });
              },
              async send() {},
            };
          },
        },
      },
    },
    parentSessionId: 'parent-session',
    threadName: '  Custom   Fork   ',
    getSession: () => childSession,
    commandActions: {
      bindForkedSession(currentSession, binding) {
        currentSession.runnerSessionId = binding.sessionId;
        return binding;
      },
    },
    async forkCodexThread() {
      return { threadId: 'fork-session' };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(threadCreates[0].name, 'Custom Fork');
  assert.deepEqual(setNameCalls, []);
});

test('createCodexForkThread replays the latest parent agent message into the fork thread', async () => {
  const childSession = {};
  const threadMessages = [];
  const parentMessages = new Map([
    ['agent-old', {
      id: 'agent-old',
      createdTimestamp: 1000,
      author: { id: 'bot-1', bot: true },
      content: 'older answer',
    }],
    ['user-later', {
      id: 'user-later',
      createdTimestamp: 2000,
      author: { id: 'user-1', bot: false },
      content: 'thanks',
    }],
    ['agent-latest', {
      id: 'agent-latest',
      createdTimestamp: 3000,
      author: { id: 'bot-1', bot: true },
      content: 'latest agent answer',
    }],
  ]);

  const result = await createCodexForkThread({
    key: 'parent-channel',
    source: {
      ...createForkSource(),
      id: 'source-2',
      client: { user: { id: 'bot-1' } },
      channel: {
        id: 'parent-channel',
        messages: {
          async fetch() {
            return parentMessages;
          },
        },
        threads: {
          async create() {
            return {
              id: 'child-channel',
              async join() {},
              async setName() {},
              async send(payload) {
                threadMessages.push(payload);
              },
            };
          },
        },
      },
    },
    parentSessionId: 'parent-session',
    getSession: () => childSession,
    commandActions: {
      bindForkedSession(currentSession, binding) {
        currentSession.runnerSessionId = binding.sessionId;
        return binding;
      },
    },
    async forkCodexThread() {
      return { threadId: 'fork-session' };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(threadMessages.length, 2);
  assert.match(threadMessages[0].content, /这是从 Codex session `parent-session` fork 过来的/);
  assert.match(threadMessages[1].content, /最近一次 agent 输出/);
  assert.match(threadMessages[1].content, /latest agent answer/);
  assert.doesNotMatch(threadMessages[1].content, /older answer/);
});

test('parseForkTextInput treats its only argument as the requested thread name', () => {
  assert.deepEqual(parseForkTextInput('  Demo   fork  '), { threadName: 'Demo fork' });
  assert.deepEqual(parseForkTextInput(''), { threadName: '' });
});

test('createProviderForkThread prepares Claude fork without mutating the parent session', async () => {
  const parentSession = { provider: 'claude', runnerSessionId: 'parent-session' };
  const childSession = { provider: 'claude', runnerSessionId: null };
  const threadCreates = [];
  const setNameCalls = [];
  const threadMessages = [];
  let observedBinding = null;
  const result = await createProviderForkThread({
    key: 'parent-channel',
    session: parentSession,
    source: {
      ...createForkSource(),
      channel: {
        id: 'parent-channel',
        threads: {
          async create(options) {
            threadCreates.push(options);
            return {
              id: 'child-channel',
              async join() {},
              async setName(name, reason) {
                setNameCalls.push({ name, reason });
              },
              async send(payload) {
                threadMessages.push(payload);
              },
            };
          },
        },
      },
    },
    provider: 'claude',
    parentSessionId: 'parent-session',
    generateSessionId: () => 'child-session',
    resolveForkWorkspace: () => '/repo/parent-workspace',
    getSession: () => childSession,
    commandActions: {
      bindForkedSession(currentSession, binding) {
        observedBinding = binding;
        currentSession.runnerSessionId = binding.sessionId;
        currentSession.forkedFromProvider = binding.provider;
        currentSession.forkedFromSessionId = binding.parentSessionId;
        currentSession.pendingForkFromSessionId = binding.pendingForkFromSessionId;
        return binding;
      },
    },
    async forkCodexThread() {
      throw new Error('Codex fork should not run for Claude');
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'claude');
  assert.equal(result.forkedSessionId, 'child-session');
  assert.equal(threadCreates[0].name, 'claude fork child-se from parent-s');
  assert.equal(setNameCalls[0].name, 'claude fork child-se from parent-s');
  assert.equal(parentSession.runnerSessionId, 'parent-session');
  assert.equal(childSession.runnerSessionId, 'child-session');
  assert.equal(childSession.workspaceDir, '/repo/parent-workspace');
  assert.equal(observedBinding.workspaceDir, '/repo/parent-workspace');
  assert.equal(childSession.forkedFromProvider, 'claude');
  assert.equal(childSession.forkedFromSessionId, 'parent-session');
  assert.equal(childSession.pendingForkFromSessionId, 'parent-session');
  assert.equal(threadMessages.length, 1);
  assert.match(threadMessages[0].content, /^<@user-1> 这是从 Claude session `parent-session` fork 过来的。/);
  assert.deepEqual(threadMessages[0].allowedMentions, { users: ['user-1'] });
});

test('createProviderForkThread refuses Claude fork when parent workspace cannot be resolved', async () => {
  let createdThread = false;
  const result = await createProviderForkThread({
    key: 'parent-channel',
    session: { provider: 'claude', runnerSessionId: 'parent-session' },
    source: {
      ...createForkSource(),
      channel: {
        id: 'parent-channel',
        threads: {
          async create() {
            createdThread = true;
            return { id: 'child-channel' };
          },
        },
      },
    },
    provider: 'claude',
    parentSessionId: 'parent-session',
    generateSessionId: () => 'child-session',
    getSession: () => ({ provider: 'claude' }),
    commandActions: {
      bindForkedSession() {
        throw new Error('should not bind without a workspace');
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'fork_workspace_unavailable');
  assert.equal(createdThread, false);
});

test('formatCodexForkResult makes prompt enqueue failure explicit', async () => {
  const childSession = {};
  const result = await createCodexForkThread({
    key: 'parent-channel',
    source: createForkSource(),
    parentSessionId: 'parent-session',
    getSession: () => childSession,
    commandActions: {
      bindForkedSession(currentSession, binding) {
        currentSession.runnerSessionId = binding.sessionId;
        return binding;
      },
    },
    createThread: async () => ({
      id: 'child-channel',
      async setName() {},
      async send() {},
    }),
    async forkCodexThread() {
      return { threadId: 'fork-session' };
    },
    async enqueuePrompt() {
      throw new Error('queue unavailable');
    },
    prompt: 'continue',
  });

  assert.equal(result.ok, true);
  assert.equal(result.promptQueue.enqueued, false);
  assert.equal(result.promptQueue.error, 'queue unavailable');
  const report = formatCodexForkResult(result, 'zh');
  assert.match(report, /^⚠️ 已创建 Codex fork/);
  assert.match(report, /prompt 没有入队/);
  assert.doesNotMatch(report, /^✅/);
});
