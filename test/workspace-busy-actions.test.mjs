import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWorkspaceBusyComponentId,
  createWorkspaceBusyActions,
  parseWorkspaceBusyComponentId,
} from '../src/workspace-busy-actions.js';

class FakeButtonBuilder {
  constructor() {
    this.data = {};
  }

  setCustomId(value) {
    this.data.customId = value;
    return this;
  }

  setLabel(value) {
    this.data.label = value;
    return this;
  }

  setStyle(value) {
    this.data.style = value;
    return this;
  }
}

class FakeActionRowBuilder {
  constructor() {
    this.components = [];
  }

  addComponents(...components) {
    this.components.push(...components);
    return this;
  }
}

const ButtonStyle = {
  Secondary: 'secondary',
  Success: 'success',
};

test('parseWorkspaceBusyComponentId decodes busy action buttons', () => {
  assert.deepEqual(parseWorkspaceBusyComponentId('wbusy:isolate:12345'), { action: 'isolate', userId: '12345' });
  assert.deepEqual(parseWorkspaceBusyComponentId('wbusy:auto:12345'), { action: 'auto', userId: '12345' });
  assert.deepEqual(parseWorkspaceBusyComponentId('wbusy:default:12345'), { action: 'default', userId: '12345' });
  assert.equal(parseWorkspaceBusyComponentId('wbusy:unknown:12345'), null);
});

test('createWorkspaceBusyActions builds action buttons for lock guidance', () => {
  const actions = createWorkspaceBusyActions({
    ActionRowBuilder: FakeActionRowBuilder,
    ButtonBuilder: FakeButtonBuilder,
    ButtonStyle,
    commandActions: {},
    workspaceRoot: '/tmp/workspaces',
    getSession: () => ({ provider: 'codex', language: 'zh' }),
    getSessionLanguage: (session) => session.language,
    formatWorkspaceBusyReport: () => 'busy report',
    formatWorkspaceUpdateReport: () => 'updated',
  });

  const payload = actions.buildWorkspaceBusyPayload({
    key: 'thread-1',
    session: { provider: 'codex', language: 'zh' },
    userId: '12345',
    workspaceDir: '/repo/shared',
    owner: { key: 'thread-2' },
  });

  assert.equal(payload.content, 'busy report');
  assert.equal(payload.components.length, 2);
  assert.deepEqual(
    payload.components[0].components.map((item) => item.data.customId),
    [
      buildWorkspaceBusyComponentId('isolate', '12345'),
      buildWorkspaceBusyComponentId('auto', '12345'),
    ],
  );
  assert.deepEqual(
    payload.components[1].components.map((item) => item.data.customId),
    [
      buildWorkspaceBusyComponentId('default', '12345'),
    ],
  );
});

test('createWorkspaceBusyActions isolates the current channel workspace in one click', async () => {
  const session = { provider: 'codex', language: 'zh', workspaceDir: '/repo/shared' };
  const ensured = [];
  const updates = [];
  const actions = createWorkspaceBusyActions({
    ActionRowBuilder: FakeActionRowBuilder,
    ButtonBuilder: FakeButtonBuilder,
    ButtonStyle,
    commandActions: {
      setWorkspaceDir(currentSession, key, nextDir) {
        currentSession.workspaceDir = nextDir;
        return { sessionReset: true, clearedOverride: false, workspaceDir: nextDir, source: 'thread override' };
      },
    },
    workspaceRoot: '/tmp/workspaces',
    ensureDir: (dir) => ensured.push(dir),
    getSession: () => session,
    getSessionLanguage: (currentSession) => currentSession.language,
    getSessionProvider: (currentSession) => currentSession.provider,
    getWorkspaceBinding: (currentSession) => ({ workspaceDir: currentSession.workspaceDir, source: 'thread override' }),
    formatWorkspaceBusyReport: () => 'busy report',
    formatWorkspaceUpdateReport: (_key, currentSession) => `updated:${currentSession.workspaceDir}`,
  });

  const interaction = {
    customId: buildWorkspaceBusyComponentId('isolate', '12345'),
    channelId: 'thread-1',
    channel: { id: 'thread-1' },
    user: { id: '12345' },
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('unexpected reply');
    },
  };

  const handled = await actions.handleWorkspaceBusyInteraction(interaction);

  assert.equal(handled, true);
  assert.deepEqual(ensured, ['/tmp/workspaces/thread-1']);
  assert.equal(session.workspaceDir, '/tmp/workspaces/thread-1');
  assert.deepEqual(updates, [{ content: 'updated:/tmp/workspaces/thread-1', components: [] }]);
});

test('createWorkspaceBusyActions can enable automatic separate workspaces and isolate current channel', async () => {
  const session = { provider: 'codex', language: 'zh', workspaceDir: '/repo/shared' };
  const ensured = [];
  const updates = [];
  const modeCalls = [];
  const actions = createWorkspaceBusyActions({
    ActionRowBuilder: FakeActionRowBuilder,
    ButtonBuilder: FakeButtonBuilder,
    ButtonStyle,
    commandActions: {
      setWorkspaceDir(currentSession, key, nextDir) {
        currentSession.workspaceDir = nextDir;
        return { sessionReset: true, clearedOverride: false, workspaceDir: nextDir, source: 'thread override' };
      },
    },
    workspaceRoot: '/tmp/workspaces',
    ensureDir: (dir) => ensured.push(dir),
    getSession: () => session,
    getSessionLanguage: (currentSession) => currentSession.language,
    getSessionProvider: (currentSession) => currentSession.provider,
    getWorkspaceBinding: (currentSession) => ({ workspaceDir: currentSession.workspaceDir, source: 'thread override' }),
    resolveChildThreadWorkspaceMode: () => ({ mode: 'inherit', source: 'default' }),
    setChildThreadWorkspaceMode: (provider, mode) => {
      modeCalls.push({ provider, mode });
      return { provider, mode, source: 'provider-scoped env' };
    },
    formatWorkspaceBusyReport: () => 'busy report',
    formatWorkspaceUpdateReport: (_key, currentSession) => `updated:${currentSession.workspaceDir}`,
  });

  const handled = await actions.handleWorkspaceBusyInteraction({
    customId: buildWorkspaceBusyComponentId('auto', '12345'),
    channelId: 'thread-1',
    channel: { id: 'thread-1' },
    user: { id: '12345' },
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('unexpected reply');
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(modeCalls, [{ provider: 'codex', mode: 'separate' }]);
  assert.deepEqual(ensured, ['/tmp/workspaces/thread-1']);
  assert.equal(session.workspaceDir, '/tmp/workspaces/thread-1');
  assert.match(updates[0].content, /已开启自动避锁/);
  assert.match(updates[0].content, /updated:\/tmp\/workspaces\/thread-1/);
});

test('createWorkspaceBusyActions opens default workspace browser from busy prompt', async () => {
  const replies = [];
  const actions = createWorkspaceBusyActions({
    ActionRowBuilder: FakeActionRowBuilder,
    ButtonBuilder: FakeButtonBuilder,
    ButtonStyle,
    commandActions: {},
    workspaceRoot: '/tmp/workspaces',
    getSession: () => ({ provider: 'codex', language: 'zh', workspaceDir: '/repo/shared' }),
    getSessionLanguage: (session) => session.language,
    getSessionProvider: (session) => session.provider,
    formatWorkspaceBusyReport: () => 'busy report',
    formatWorkspaceUpdateReport: () => 'updated',
    openWorkspaceBrowser: ({ mode, flags }) => ({ content: `browser:${mode}`, flags }),
  });

  const handled = await actions.handleWorkspaceBusyInteraction({
    customId: buildWorkspaceBusyComponentId('default', '12345'),
    channelId: 'thread-1',
    channel: { id: 'thread-1' },
    user: { id: '12345' },
    async reply(payload) {
      replies.push(payload);
    },
    async update() {
      throw new Error('unexpected update');
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(replies, [{ content: 'browser:default', flags: 64 }]);
});
