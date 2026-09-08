import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createSettingsPanel } from '../src/settings-panel.js';
import { readCodexDefaults, readCodexModelCatalog, writeCodexDefaults } from '../src/runtime-bootstrap.js';
import { createSessionSettings, normalizeSessionFastMode } from '../src/session-settings.js';
import { createSessionCommandActions } from '../src/session-command-actions.js';
import { createSessionStore } from '../src/session-store.js';
import { createRunnerArgsBuilder } from '../src/runner-args.js';
import { buildCodexLongConfig } from '../src/codex-app-server-runner.js';
import { getSupportedReasoningEffortLevels } from '../src/provider-metadata.js';

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

  setDisabled(value) {
    this.data.disabled = value;
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

class FakeStringSelectMenuBuilder {
  constructor() {
    this.data = { options: [] };
  }

  setCustomId(value) {
    this.data.customId = value;
    return this;
  }

  setPlaceholder(value) {
    this.data.placeholder = value;
    return this;
  }

  addOptions(...options) {
    this.data.options.push(...options.flat());
    return this;
  }
}

class FakeModalBuilder {
  constructor() {
    this.data = { components: [] };
  }

  setCustomId(value) {
    this.data.customId = value;
    return this;
  }

  setTitle(value) {
    this.data.title = value;
    return this;
  }

  addComponents(...components) {
    this.data.components.push(...components);
    return this;
  }
}

class FakeTextInputBuilder {
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

  setPlaceholder(value) {
    this.data.placeholder = value;
    return this;
  }

  setRequired(value) {
    this.data.required = value;
    return this;
  }

  setMaxLength(value) {
    this.data.maxLength = value;
    return this;
  }

  setValue(value) {
    this.data.value = value;
    return this;
  }
}

const ButtonStyle = {
  Primary: 'primary',
  Secondary: 'secondary',
  Success: 'success',
  Danger: 'danger',
};

const TextInputStyle = {
  Short: 'short',
};

function createPanel({
  session,
  botProvider = null,
  openWorkspaceBrowser,
  commandActions = {},
  modelCatalog,
  getChannelState,
  safeChannelSend,
  panelOptions = {},
} = {}) {
  return createSettingsPanel({
    botProvider,
    defaultUiLanguage: 'zh',
    ActionRowBuilder: FakeActionRowBuilder,
    ButtonBuilder: FakeButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder: FakeStringSelectMenuBuilder,
    ModalBuilder: FakeModalBuilder,
    TextInputBuilder: FakeTextInputBuilder,
    TextInputStyle,
    getSession: () => session,
    getSessionLanguage: (currentSession) => currentSession?.language || 'zh',
    getSessionProvider: (currentSession) => currentSession?.provider || 'codex',
    getWorkspaceBinding: (currentSession) => ({
      workspaceDir: currentSession?.workspaceDir || '/repo/demo',
      source: currentSession?.workspaceDir ? 'thread override' : 'provider default',
    }),
    getProviderDefaults: (provider) => ({
      model: provider === 'codex'
        ? (session?.globalDefaultModel ?? 'gpt-5.4')
        : (session?.providerDefaultModel ?? '(provider default)'),
      profile: provider === 'codex' ? (session?.globalDefaultCodexProfile ?? null) : null,
      profileConfigured: provider === 'codex' ? Boolean(session?.globalDefaultCodexProfile) : false,
      modelConfigured: provider === 'codex' ? (session?.globalDefaultModelConfigured ?? true) : false,
      effort: provider === 'codex' ? (session?.globalDefaultEffort ?? 'high') : '(provider default)',
      effortConfigured: provider === 'codex' ? (session?.globalDefaultEffortConfigured ?? true) : false,
      fastMode: provider === 'codex' ? (session?.globalDefaultFastMode ?? true) : false,
      fastModeConfigured: provider === 'codex' ? (session?.globalDefaultFastModeConfigured ?? true) : false,
      source: provider === 'codex' ? 'config.toml' : 'provider',
    }),
    getProviderDisplayName: (provider) => ({
      codex: 'Codex CLI',
      claude: 'Claude Code',
      antigravity: 'Antigravity CLI',
    }[provider] || provider),
    getSupportedReasoningEffortLevels: (provider) => {
      if (provider === 'antigravity') return [];
      if (provider === 'claude') return ['high', 'medium', 'low'];
      if (provider === 'omp') return ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'auto'];
      return ['xhigh', 'high', 'medium', 'low'];
    },
    getModelCatalog: () => modelCatalog || {
      models: [
        {
          slug: 'gpt-5.4',
          displayName: 'gpt-5.4',
          defaultReasoningLevel: 'medium',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh'],
        },
        {
          slug: 'o3',
          displayName: 'o3',
          defaultReasoningLevel: 'high',
          supportedReasoningLevels: ['low', 'medium', 'high'],
        },
      ],
      error: null,
    },
    getProviderCompactCapabilities: (provider) => ({
      strategies: provider === 'cursor' ? [] : ['hard', 'native', 'off'],
      supportsNativeStrategy: provider !== 'cursor',
      supportsNativeLimit: provider === 'codex' || provider === 'claude',
    }),
    normalizeUiLanguage: (value) => String(value || '').trim().toLowerCase() === 'en' ? 'en' : 'zh',
    resolveModelSetting: (currentSession) => ({
      value: currentSession?.model || currentSession?.inheritedModel || currentSession?.globalDefaultModel || 'gpt-5.4',
      source: currentSession?.modelSource || (currentSession?.model ? 'session override' : 'config.toml'),
    }),
    resolveCodexProfileSetting: (currentSession) => ({
      value: currentSession?.codexProfile || currentSession?.inheritedCodexProfile || null,
      source: currentSession?.codexProfileSource
        || (currentSession?.codexProfile ? 'session override' : (currentSession?.inheritedCodexProfile ? 'parent channel' : 'provider default')),
      supported: currentSession?.provider !== 'claude' && currentSession?.provider !== 'antigravity',
      valid: currentSession?.codexProfileValid !== false,
      isExplicit: Boolean(currentSession?.codexProfile || currentSession?.inheritedCodexProfile),
      error: currentSession?.codexProfileError || null,
      availableProfiles: ['work', 'review'],
      configPath: '/tmp/codex-config.toml',
    }),
    getDefaultCodexProfile: () => ({
      profile: session?.globalDefaultCodexProfile || null,
      source: session?.globalDefaultCodexProfile ? 'env default' : 'provider default',
    }),
    resolveReasoningEffortSetting: (currentSession) => ({
      value: currentSession?.effort || currentSession?.inheritedEffort || 'high',
      source: currentSession?.effortSource || (currentSession?.effort ? 'session override' : 'config.toml'),
    }),
    resolveFastModeSetting: (currentSession) => currentSession?.provider === 'codex' || currentSession?.provider === 'omp'
      ? {
        enabled: currentSession?.fastMode ?? currentSession?.inheritedFastMode ?? currentSession?.provider === 'codex',
        supported: true,
        source: currentSession?.fastModeSource
          || (currentSession?.fastMode === null || currentSession?.fastMode === undefined
            ? (currentSession?.provider === 'codex' ? 'config.toml' : 'provider default')
            : 'session override'),
      }
      : { enabled: false, supported: false, source: 'provider unsupported' },
    resolveRuntimeModeSetting: (currentSession) => currentSession?.provider === 'claude' || currentSession?.provider === 'codex'
      ? {
        mode: currentSession?.runtimeMode || currentSession?.inheritedRuntimeMode || 'normal',
        supported: true,
        source: currentSession?.runtimeModeSource
          || (currentSession?.runtimeMode ? 'session override' : 'env default'),
      }
      : { mode: 'normal', supported: false, source: 'provider unsupported' },
    resolveBusyPromptModeSetting: (currentSession) => {
      const requestedMode = currentSession?.busyPromptMode || 'queue';
      const canSteer = currentSession?.provider === 'codex' && currentSession?.runtimeMode === 'long';
      return {
        mode: requestedMode === 'steer_if_possible' && !canSteer ? 'queue' : requestedMode,
        requestedMode,
        canSteer,
        supported: true,
        source: currentSession?.busyPromptMode ? 'session override' : 'built-in default',
        reason: requestedMode === 'steer_if_possible' && !canSteer ? 'steer unavailable' : null,
      };
    },
    resolveCompactStrategySetting: (currentSession) => ({
      strategy: currentSession?.compactStrategy || 'native',
      source: currentSession?.compactStrategy ? 'session override' : 'env default',
    }),
    resolveCompactThresholdSetting: (currentSession) => ({
      tokens: currentSession?.compactThresholdTokens
        ?? currentSession?.inheritedCompactThresholdTokens
        ?? (currentSession?.provider === 'codex' ? 272000 : null),
      source: currentSession?.compactThresholdSource
        || ((currentSession?.compactThresholdTokens ?? currentSession?.inheritedCompactThresholdTokens) !== undefined
          ? (currentSession?.compactThresholdTokens !== null && currentSession?.compactThresholdTokens !== undefined ? 'session override' : 'parent channel')
          : (currentSession?.provider === 'codex'
            ? 'env default'
            : currentSession?.provider === 'cursor'
              ? 'provider unsupported'
              : 'provider default')),
    }),
    resolveNativeCompactTokenLimitSetting: (currentSession) => ({
      tokens: currentSession?.nativeCompactTokenLimit ?? (currentSession?.provider === 'codex' ? 320000 : null),
      source: currentSession?.nativeCompactTokenLimit === null || currentSession?.nativeCompactTokenLimit === undefined
        ? (currentSession?.provider === 'codex' ? 'env default' : 'provider default')
        : 'session override',
    }),
    resolveReplyDeliverySetting: (currentSession) => ({
      mode: currentSession?.replyDeliveryMode || currentSession?.inheritedReplyDeliveryMode || 'card_only',
      source: currentSession?.replyDeliverySource
        || (currentSession?.replyDeliveryMode ? 'session override' : 'env default'),
    }),
    getReplyDeliveryDefault: () => ({
      mode: session?.globalReplyDeliveryMode || 'card_mention',
      source: session?.globalReplyDeliverySource || 'env default',
    }),
    getChannelState,
    safeChannelSend,
    commandActions,
    openWorkspaceBrowser,
    slashRef: (base) => `/cx_${base}`,
    ...panelOptions,
  });
}

test('createSettingsPanel opens an overview payload with key channel settings', () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    codexProfile: 'work',
    codexProfileSource: 'session override',
    fastMode: null,
    model: null,
  };
  const panel = createPanel({ session });

  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'overview',
    flags: 64,
  });

  assert.equal(payload.flags, 64);
  assert.match(payload.content, /频道设置/);
  assert.match(payload.content, /provider：`codex`/);
  assert.match(payload.content, /Codex profile：`work`（当前频道）/);
  assert.match(payload.content, /model：`gpt-5.4`/);
  assert.equal(payload.components.length, 5);
  assert.equal(payload.components[0].components[0].data.customId, 'stg:nav:section:picker:12345');
  assert.equal(payload.components[0].components[0].data.placeholder, '选择设置分区');
  assert.equal(payload.components.at(-1).components[0].data.label, '关闭');
});

test('settings overview edits the channel and stays aligned with model effort and fast sections', async () => {
  const session = { provider: 'codex', language: 'en', model: 'gpt-5.4', effort: 'high', fastMode: true };
  const writes = [];
  const panel = createPanel({
    session,
    commandActions: {
      setModel(current, value) { current.model = value === 'default' ? null : value; writes.push('model'); },
      setReasoningEffort(current, value) { current.effort = value === 'default' ? null : value; writes.push('effort'); },
      setFastMode(current, value) { current.fastMode = value; writes.push('fast'); },
      setGlobalModelDefault() { assert.fail('overview must not write global defaults'); },
      setGlobalReasoningEffortDefault() { assert.fail('overview must not write global defaults'); },
      setGlobalFastModeDefault() { assert.fail('overview must not write global defaults'); },
    },
  });
  const open = (activeSection = '') => panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection });
  let payload = open();
  assert.match(payload.content, /Active: Overview/);
  const interact = async (control, values) => {
    await panel.handleSettingsPanelInteraction({
      customId: control.data.customId, channelId: 'thread-1', user: { id: '12345' }, values,
      async update(updated) { payload = updated; },
      async reply(result) { assert.fail(result.content); },
    });
  };
  await interact(payload.components[1].components[0], ['o3']);
  assert.match(payload.content, /Active: Overview/);
  assert.equal(session.model, 'o3');
  assert.deepEqual(payload.components[2].components[0].data.options.map(o => o.value), ['low', 'medium', 'high', 'default']);
  await interact(payload.components[2].components[0], ['medium']);
  const off = payload.components.flatMap(row => row.components).find(c => c.data.customId.includes(':overview_fast:off:'));
  await interact(off);
  assert.deepEqual(writes, ['model', 'effort', 'fast']);
  assert.match(payload.content, /Active: Overview/);
  const overviewOptions = payload.components[1].components[0].data.options;
  const modelPage = open('model');
  assert.deepEqual(modelPage.components[1].components[0].data.options, overviewOptions);
  const effortButtons = open('effort').components.flatMap(row => row.components).filter(c => c.data.customId.includes(':set:effort:'));
  assert.deepEqual(effortButtons.map(c => c.data.label), ['low', 'medium', 'high', 'default']);
  assert.equal(effortButtons.find(c => c.data.label === 'medium').data.style, ButtonStyle.Primary);
  const fastPage = open('fast');
  assert.equal(fastPage.components[1].components.find(c => c.data.customId.includes(':off:')).data.style, ButtonStyle.Primary);
  await interact(fastPage.components[1].components.find(c => c.data.customId.includes(':on:')));
  payload = open();
  assert.equal(payload.components[3].components.find(c => c.data.customId.includes(':on:')).data.style, ButtonStyle.Primary);
});

test('settings overview and sections persist the same settings and forward them to both Codex runtimes', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-settings-roundtrip-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const env = { HOME: root };
  writeCodexDefaults({ env, model: 'gpt-5.4', effort: 'high', fastMode: true });
  const configPath = path.join(root, '.codex', 'config.toml');
  const originalConfig = fs.readFileSync(configPath, 'utf8');
  const storeOptions = {
    dataFile: path.join(root, 'sessions.json'), workspaceRoot: root, botProvider: 'codex',
    defaults: { provider: 'codex', mode: 'safe', language: 'en' },
    normalizeProvider: value => value || 'codex', normalizeUiLanguage: value => value || 'en',
    normalizeSessionSecurityProfile: value => value || null, normalizeSessionFastMode,
    normalizeSessionTimeoutMs: value => value || null, normalizeSessionCompactStrategy: value => value || null,
    normalizeSessionCompactEnabled: value => value ?? null, normalizeSessionCompactTokenLimit: value => value || null,
    getSessionId: current => current.runnerSessionId || null,
  };
  const store = createSessionStore(storeOptions);
  const session = store.getSession('thread-1', { parentChannelId: 'parent' });
  const parent = store.getSession('parent');
  const settings = createSessionSettings({
    readCodexDefaults: () => readCodexDefaults({ env }),
    getParentSession: current => current.parentChannelId ? store.getSession(current.parentChannelId) : null,
  });
  const actions = createSessionCommandActions({
    saveDb: store.saveDb, resolveFastModeSetting: settings.resolveFastModeSetting,
    writeCodexDefaults: options => writeCodexDefaults({ env, ...options }),
  });
  actions.setModel(parent, 'o3');
  actions.setReasoningEffort(parent, 'medium');
  actions.setFastMode(parent, false);
  const panel = createPanel({ session, commandActions: actions, panelOptions: { ...settings, getSession: store.getSession } });
  const open = (activeSection = '') => panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection });
  const controls = payload => payload.components.flatMap(row => row.components);
  let payload = open();
  assert.match(payload.content, /model: `o3` \(parent channel\)/);
  assert.match(payload.content, /effort: `medium` \(parent channel\)/);
  assert.match(payload.content, /fast mode: off \(parent channel\)/);
  const interact = async (idPart, values) => {
    const control = controls(payload).find(c => c.data.customId.includes(idPart));
    assert.ok(control, idPart);
    await panel.handleSettingsPanelInteraction({
      customId: control.data.customId, channelId: 'thread-1', user: { id: '12345' }, values,
      async update(updated) { payload = updated; }, async reply(result) { assert.fail(result.content); },
    });
  };
  const assertEffective = (model, effort, tier) => {
    const reopened = createSessionStore(storeOptions).getSession('thread-1');
    assert.equal(settings.resolveModelSetting(reopened).value, model);
    assert.equal(settings.resolveReasoningEffortSetting(reopened).value, effort);
    for (const sessionId of [null, 'saved-native-thread']) {
      const builder = createRunnerArgsBuilder({ ...settings, getSessionId: () => sessionId });
      const args = builder.buildCodexArgs({ session: reopened, workspaceDir: root, prompt: 'test' });
      assert.equal(args[args.indexOf('-m') + 1], model);
      assert.ok(args.includes(`model_reasoning_effort="${effort}"`));
      assert.ok(args.includes(`service_tier="${tier}"`));
    }
    const config = buildCodexLongConfig({ session: reopened, ...settings });
    assert.equal(config.service_tier, tier);
    assert.equal(fs.readFileSync(configPath, 'utf8'), originalConfig, 'channel settings must not change global defaults');
    assert.equal(parent.model, 'o3');
    assert.equal(parent.effort, 'medium');
    assert.equal(parent.fastMode, false);
  };
  await interact(':overview_model:preset:', ['gpt-5.4']);
  await interact(':overview_effort:preset:', ['high']);
  await interact(':overview_fast:on:');
  assertEffective('gpt-5.4', 'high', 'fast');
  payload = open('model');
  await interact(':set:model:preset:', ['o3']);
  payload = open('effort');
  await interact(':set:effort:low:');
  payload = open('fast');
  await interact(':set:fast:off:');
  assertEffective('o3', 'low', 'default');
  payload = open();
  assert.equal(payload.components[1].components[0].data.options.find(o => o.default).value, 'o3');
  assert.equal(payload.components[2].components[0].data.options.find(o => o.default).value, 'low');
  await interact(':overview_model:preset:', ['default']);
  await interact(':overview_effort:preset:', ['default']);
  await interact(':overview_fast:follow:');
  assertEffective('o3', 'medium', 'default');
  assert.equal(session.model, null);
  assert.equal(session.effort, null);
  assert.equal(session.fastMode, null);
});

test('settings overview rejects stale owner mismatched empty and incompatible choices without saving', async () => {
  const session = { provider: 'codex', language: 'en', model: 'o3', effort: 'high', fastMode: false };
  let saves = 0;
  const panel = createPanel({ session, commandActions: {
    setModel() { saves++; }, setReasoningEffort() { saves++; }, setFastMode() { saves++; },
  } });
  const open = () => panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345' });
  const old = open();
  const current = open();
  for (const [control, values, userId, expected] of [
    [old.components[1].components[0], ['gpt-5.4'], '12345', /expired/],
    [old.components[3].components[1], undefined, '12345', /expired/],
    [current.components[1].components[0], ['gpt-5.4'], '54321', /another user/],
    [current.components[1].components[0], [], '12345', /No model selected/],
    [current.components[2].components[0], [], '12345', /No effort selected/],
    [current.components[2].components[0], ['xhigh'], '12345', /does not support/],
  ]) {
    let reply;
    await panel.handleSettingsPanelInteraction({
      customId: control.data.customId, channelId: 'thread-1', user: { id: userId }, values,
      async update() { assert.fail('invalid action must not update'); }, async reply(value) { reply = value; },
    });
    assert.match(reply.content, expected);
  }
  assert.equal(saves, 0);
});

test('other provider panels persist aligned model effort and fast settings through runner arguments', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-settings-roundtrip-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const provider of ['claude', 'cursor', 'grok', 'antigravity', 'pi', 'omp']) {
    const storeOptions = {
      dataFile: path.join(root, `${provider}.json`), workspaceRoot: root, botProvider: provider,
      defaults: { provider, mode: 'safe', language: 'en' },
      normalizeProvider: value => value || provider, normalizeUiLanguage: value => value || 'en',
      normalizeSessionSecurityProfile: value => value || null, normalizeSessionFastMode,
      normalizeSessionTimeoutMs: value => value || null, normalizeSessionCompactStrategy: value => value || null,
      normalizeSessionCompactEnabled: value => value ?? null, normalizeSessionCompactTokenLimit: value => value || null,
      getSessionId: current => current.runnerSessionId || null,
    };
    const store = createSessionStore(storeOptions);
    const session = store.getSession('thread-1', { parentChannelId: 'parent' });
    const parent = store.getSession('parent');
    const settings = createSessionSettings({
      getParentSession: current => current.parentChannelId ? store.getSession(current.parentChannelId) : null,
      readOmpDefaults: () => ({ serviceTier: 'flex' }),
    });
    const actions = createSessionCommandActions({ saveDb: store.saveDb, resolveFastModeSetting: settings.resolveFastModeSetting });
    const supportsEffort = getSupportedReasoningEffortLevels(provider).length > 0;
    actions.setModel(parent, 'parent-model');
    if (supportsEffort) actions.setReasoningEffort(parent, 'medium');
    if (provider === 'omp') actions.setFastMode(parent, true);
    const panel = createPanel({
      session, botProvider: provider, commandActions: actions,
      modelCatalog: { models: [{ slug: 'parent-model' }, { slug: 'selected-model' }] },
      panelOptions: { ...settings, getSession: store.getSession, getSupportedReasoningEffortLevels },
    });
    const open = activeSection => panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection });
    let payload = open('model');
    const interact = async (idPart, values) => {
      const control = payload.components.flatMap(row => row.components).find(c => c.data.customId.includes(idPart));
      assert.ok(control, `${provider} ${idPart}`);
      await panel.handleSettingsPanelInteraction({
        customId: control.data.customId, channelId: 'thread-1', user: { id: '12345' }, values,
        async update(next) { payload = next; }, async reply(result) { assert.fail(`${provider}: ${result.content}`); },
      });
    };
    const assertEffective = (model, effort, tier) => {
      const restored = createSessionStore(storeOptions).getSession('thread-1');
      assert.equal(settings.resolveModelSetting(restored).value, model, provider);
      if (supportsEffort) assert.equal(settings.resolveReasoningEffortSetting(restored).value, effort, provider);
      const overview = open('overview');
      assert.match(overview.content, new RegExp(`model: \x60${model}\x60`));
      if (supportsEffort) assert.match(overview.content, new RegExp(`effort: \x60${effort}\x60`));
      for (const sessionId of [null, 'saved-native-session']) {
        const builder = createRunnerArgsBuilder({ ...settings, getSessionId: () => sessionId });
        const args = builder.buildSessionRunnerArgs({ provider, session: restored, workspaceDir: root, prompt: 'test', promptFile: '/tmp/fixture-prompt.txt' });
        assert.equal(args[args.indexOf('--model') + 1], model, provider);
        if (supportsEffort) assert.equal(args[args.indexOf(['pi', 'omp'].includes(provider) ? '--thinking' : '--effort') + 1], effort, provider);
        else assert.ok(!args.includes('--effort') && !args.includes('--thinking'));
        if (provider === 'omp') assert.equal(args[args.indexOf('--service-tier') + 1], tier);
      }
      assert.equal(parent.model, 'parent-model');
      if (supportsEffort) assert.equal(parent.effort, 'medium');
    };
    await interact(':model:preset:', ['selected-model']);
    if (supportsEffort) {
      await interact(':model_effort:high:');
      payload = open('effort');
      assert.ok(payload.components.flatMap(row => row.components).some(c => c.data.label === 'high' && c.data.style === 'primary'));
      await interact(':effort:low:');
    }
    if (provider === 'omp') {
      payload = open('fast');
      await interact(':fast:off:');
    }
    assertEffective('selected-model', 'low', 'none');
    payload = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });
    assert.equal(payload.components[0].components[0].data.options.find(option => option.default).value, 'selected-model');
    await interact(':quick_model:preset:', ['default']);
    if (supportsEffort) await interact(':quick_model_effort:default:');
    if (provider === 'omp') {
      payload = open('fast');
      await interact(':fast:follow:');
    }
    assertEffective('parent-model', 'medium', 'priority');
    assert.equal(session.model, null);
    assert.equal(session.effort, null);
  }
});

test('createSettingsPanel shows provider default instead of the Codex compact threshold for Grok', () => {
  const session = { provider: 'grok', language: 'zh', mode: 'safe' };
  const panel = createPanel({ session });
  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'overview',
  });

  assert.match(payload.content, /compact 阈值：未设置（provider 默认）/);
  assert.doesNotMatch(payload.content, /272000/);
});

test('createSettingsPanel shows unsupported compact threshold explicitly for Cursor', () => {
  const session = { provider: 'cursor', language: 'zh', mode: 'safe' };
  const panel = createPanel({ session });
  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'overview',
  });

  assert.match(payload.content, /compact 阈值：不适用（当前 provider 不支持）/);
  assert.doesNotMatch(payload.content, /272000/);
});

test('createSettingsPanel keeps provider button rows within Discord limits', () => {
  const session = { provider: 'codex', language: 'zh', mode: 'safe' };
  const panel = createPanel({ session });

  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'provider',
  });

  const labels = payload.components
    .flatMap((row) => row.components.map((component) => component.data.label))
    .filter((label) => ['codex', 'claude', 'cursor', 'grok', 'antigravity', 'zcode', 'pi', 'omp'].includes(label));
  assert.deepEqual(labels, ['codex', 'claude', 'cursor', 'grok', 'antigravity', 'zcode', 'pi', 'omp']);
  assert.ok(payload.components.every((row) => row.components.length <= 5));
});

test('createSettingsPanel keeps global codex defaults in an explicit separate section', () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
  };
  const panel = createPanel({ session });

  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'defaults',
  });

  assert.match(payload.content, /Codex 全局默认设置/);
  assert.match(payload.content, /作用域：`~\/.codex\/config\.toml`/);
  assert.match(payload.content, /当前项：Codex 全局默认/);
  assert.match(payload.content, /model、effort 和 fast 直接在这里改/);
  assert.match(payload.content, /compact context 长度：272000（环境默认）/);
  assert.equal(payload.components.length, 5);
  assert.match(payload.components[1].components[0].data.customId, /^stg:set:default_model:preset:12345:[a-z0-9_-]+$/);
  assert.match(payload.components[2].components[0].data.customId, /^stg:set:default_effort:preset:12345:[a-z0-9_-]+$/);
  assert.equal(payload.components[3].components[0].data.customId, 'stg:act:default_profile:custom:12345');
  assert.match(payload.components[3].components[1].data.customId, /^stg:act:default_model:custom:12345:[a-z0-9_-]+$/);
  assert.equal(payload.components[3].components[2].data.customId, 'stg:set:default_fast:default:12345');
  assert.equal(payload.components[3].components[3].data.customId, 'stg:set:default_fast:on:12345');
  assert.equal(payload.components[3].components[4].data.customId, 'stg:set:default_fast:off:12345');
});

test('createSettingsPanel uses the Codex catalog for global model and effort defaults', () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    globalDefaultModel: 'gpt-5.6-sol',
    globalDefaultModelConfigured: true,
    globalDefaultEffort: 'ultra',
    globalDefaultEffortConfigured: true,
  };
  const panel = createPanel({
    session,
    modelCatalog: {
      models: [
        {
          slug: 'gpt-5.6-sol',
          displayName: 'GPT-5.6 Sol',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
          visibility: 'list',
        },
        {
          slug: 'gpt-5.6-terra',
          displayName: 'GPT-5.6 Terra',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
          visibility: 'list',
        },
        {
          slug: 'gpt-5.6-luna',
          displayName: 'GPT-5.6 Luna',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
          visibility: 'list',
        },
        {
          slug: 'codex-auto-review',
          displayName: 'Codex Auto Review',
          supportedReasoningLevels: ['low', 'medium', 'high'],
          visibility: 'hide',
        },
        {
          slug: 'codex-internal-review',
          displayName: 'Codex Internal Review',
          supportedReasoningLevels: ['low', 'medium', 'high'],
          visibility: 'hidden',
        },
      ],
      error: null,
    },
  });

  const payload = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });

  assert.equal(payload.components.length, 5);
  const modelSelect = payload.components[1].components[0];
  assert.deepEqual(modelSelect.data.options.map((option) => option.value), [
    'default',
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
  ]);
  assert.equal(modelSelect.data.options.find((option) => option.value === 'gpt-5.6-sol').default, true);
  const effortSelect = payload.components[2].components[0];
  assert.deepEqual(effortSelect.data.options.map((option) => option.value), [
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
    'ultra',
    'default',
  ]);
  assert.equal(effortSelect.data.options.find((option) => option.value === 'ultra').default, true);
});

test('createSettingsPanel switches active section through the section picker', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
  };
  const updates = [];
  const panel = createPanel({ session });

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:nav:section:picker:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['compact'],
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
  });

  assert.equal(updates.length, 1);
  assert.match(updates[0].content, /当前项：上下文压缩/);
});

test('createSettingsPanel shows inherited mode and restores inheritance through its button', async () => {
  const session = {
    provider: 'cursor', language: 'zh', parentChannelId: 'parent',
    mode: 'dangerous', modeOverride: null, modeSource: 'parent channel',
  };
  const selected = [];
  const panel = createPanel({
    session,
    commandActions: {
      setMode(currentSession, value) {
        selected.push(value);
        currentSession.modeOverride = value === 'default' ? null : value;
        currentSession.mode = value === 'default' ? 'dangerous' : value;
        currentSession.modeSource = value === 'default' ? 'parent channel' : 'session override';
      },
    },
  });
  const open = () => panel.openSettingsPanel({
    key: 'thread-1', session, userId: '12345', activeSection: 'mode',
  });
  const modeButtons = (payload) => payload.components.flatMap((row) => row.components)
    .filter((button) => button.data.customId?.startsWith('stg:set:mode:'));
  const inherited = open();
  assert.match(inherited.content, /mode：`dangerous`（父频道默认）/);
  assert.equal(modeButtons(inherited).length, 3);
  assert.deepEqual(modeButtons(inherited).filter((button) => button.data.style === 'primary').map((button) => button.data.label), ['跟随父频道/默认']);

  let updated;
  for (const value of ['safe', 'default']) {
    await panel.handleSettingsPanelInteraction({
      customId: `stg:set:mode:${value}:12345`,
      channelId: 'thread-1', user: { id: '12345' },
      async update(payload) { updated = payload; },
      async reply() { assert.fail('unexpected reply'); },
    });
    const expected = value === 'safe' ? 'safe' : '跟随父频道/默认';
    assert.deepEqual(modeButtons(updated).filter((button) => button.data.style === 'primary').map((button) => button.data.label), [expected]);
  }
  assert.deepEqual(selected, ['safe', 'default']);
  assert.match(updated.content, /mode：`dangerous`（父频道默认）/);
});

test('createSettingsPanel updates fast mode through button interaction', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    fastMode: null,
  };
  const updates = [];
  const panel = createPanel({
    session,
    commandActions: {
      setFastMode(currentSession, enabled) {
        currentSession.fastMode = enabled;
        return { fastModeSetting: { enabled, supported: true, source: 'session override' } };
      },
    },
  });

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:set:fast:on:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.equal(session.fastMode, true);
  assert.equal(updates.length, 1);
  assert.match(updates[0].content, /当前项：Fast Mode/);
  assert.match(updates[0].content, /fast mode：开启（当前频道）/);
});

test('createSettingsPanel exposes OMP fast mode as the priority service tier', async () => {
  const session = {
    provider: 'omp',
    language: 'zh',
    mode: 'dangerous',
    fastMode: null,
  };
  const updates = [];
  const panel = createPanel({
    session,
    botProvider: 'omp',
    commandActions: {
      setFastMode(currentSession, enabled) {
        currentSession.fastMode = enabled;
        return { fastModeSetting: { enabled, supported: true, source: 'session override' } };
      },
    },
  });

  const opened = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'fast',
  });
  assert.match(opened.content, /当前项：Fast Mode/);
  assert.match(opened.content, /priority/);
  assert.ok(opened.components.length <= 5);

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:set:fast:on:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
  });

  assert.equal(session.fastMode, true);
  assert.equal(updates.length, 1);
  assert.match(updates[0].content, /fast mode：开启（当前频道）/);
});

test('createSettingsPanel shows Antigravity models from local catalog', () => {
  const session = {
    provider: 'antigravity',
    language: 'zh',
    mode: 'safe',
    inheritedModel: 'Claude Opus 4.6 (Thinking)',
    modelSource: 'settings.json',
  };
  const panel = createPanel({
    session,
    modelCatalog: {
      models: [
        {
          slug: 'Claude Opus 4.6 (Thinking)',
          displayName: 'Claude Opus 4.6 (Thinking)',
          description: 'Antigravity configured model from settings.json',
        },
        {
          slug: 'Gemini 3.5 Flash (High)',
          displayName: 'Gemini 3.5 Flash (High)',
          description: 'Antigravity model observed in local CLI logs',
        },
      ],
      error: null,
    },
  });

  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'model',
  });

  assert.match(payload.content, /settings\.json/);
  const select = payload.components[1].components[0];
  assert.equal(select.data.placeholder, '当前模型：Claude Opus 4.6 (Thinking)');
  assert.deepEqual(select.data.options.map((option) => option.value), [
    'default',
    'Claude Opus 4.6 (Thinking)',
    'Gemini 3.5 Flash (High)',
  ]);
});

test('createSettingsPanel updates reply delivery and shows effective source', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    replyDeliveryMode: null,
    globalReplyDeliveryMode: 'card_mention',
  };
  const updates = [];
  const panel = createPanel({
    session,
    commandActions: {
      setReplyDeliveryMode(currentSession, mode) {
        currentSession.replyDeliveryMode = mode;
        return { replyDeliveryMode: currentSession.replyDeliveryMode };
      },
      setGlobalReplyDeliveryModeDefault(_currentSession, mode) {
        session.globalReplyDeliveryMode = mode;
        return { mode };
      },
    },
  });

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:set:reply:stream_mention:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.equal(session.replyDeliveryMode, 'stream_mention');
  assert.match(updates[0].content, /当前项：回复方式/);
  assert.match(updates[0].content, /回复方式：发送过程消息，完成时触发 @（当前频道）/);
  assert.match(updates[0].content, /默认回复方式：只更新进度卡，完成时触发 @（环境默认）/);
});

test('createSettingsPanel flushes current process messages when stream delivery is enabled mid-run', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    replyDeliveryMode: null,
  };
  const streamed = [];
  const state = {
    activeRun: {
      recentActivities: ['先检查移动端 pointer 事件。', '确认按钮是否被覆盖。'],
      streamedProcessActivityKeys: ['先检查移动端 pointer 事件。'],
    },
  };
  const updates = [];
  const panel = createPanel({
    session,
    getChannelState: () => state,
    safeChannelSend: async (_interaction, payload) => {
      streamed.push(payload);
    },
    commandActions: {
      setReplyDeliveryMode(currentSession, mode) {
        currentSession.replyDeliveryMode = mode;
        return { replyDeliveryMode: currentSession.replyDeliveryMode };
      },
    },
  });

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:set:reply:stream_mention:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.deepEqual(streamed, ['确认按钮是否被覆盖。']);
  assert.deepEqual(state.activeRun.streamedProcessActivityKeys, [
    '先检查移动端 pointer 事件。',
    '确认按钮是否被覆盖。',
  ]);
  assert.match(updates[0].content, /回复方式：发送过程消息，完成时触发 @（当前频道）/);
});

test('createSettingsPanel updates Claude runtime mode and closes the hot process without clearing session id', async () => {
  const session = {
    provider: 'claude',
    language: 'zh',
    mode: 'safe',
    runnerSessionId: 'sess-claude',
    runtimeMode: null,
  };
  const updates = [];
  const closed = [];

  const actualPanel = createSettingsPanel({
    botProvider: null,
    defaultUiLanguage: 'zh',
    ActionRowBuilder: FakeActionRowBuilder,
    ButtonBuilder: FakeButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder: FakeStringSelectMenuBuilder,
    ModalBuilder: FakeModalBuilder,
    TextInputBuilder: FakeTextInputBuilder,
    TextInputStyle,
    getSession: () => session,
    getSessionLanguage: () => 'zh',
    getSessionProvider: () => 'claude',
    getWorkspaceBinding: () => ({ workspaceDir: '/repo/demo', source: 'provider default' }),
    getProviderDefaults: () => ({ model: '(provider default)', effort: '(provider default)', source: 'provider' }),
    getProviderDisplayName: () => 'Claude Code',
    getSupportedReasoningEffortLevels: () => ['high', 'medium', 'low'],
    getProviderCompactCapabilities: () => ({ strategies: ['hard', 'native', 'off'] }),
    normalizeUiLanguage: () => 'zh',
    resolveModelSetting: () => ({ value: null, source: 'provider' }),
    resolveReasoningEffortSetting: () => ({ value: null, source: 'provider' }),
    resolveFastModeSetting: () => ({ enabled: false, supported: false, source: 'provider unsupported' }),
    resolveRuntimeModeSetting: (currentSession) => ({
      mode: currentSession.runtimeMode || 'normal',
      supported: true,
      source: currentSession.runtimeMode ? 'session override' : 'env default',
    }),
    resolveBusyPromptModeSetting: (currentSession) => ({
      mode: currentSession.busyPromptMode === 'steer_if_possible' ? 'queue' : (currentSession.busyPromptMode || 'queue'),
      requestedMode: currentSession.busyPromptMode || 'queue',
      canSteer: false,
      supported: true,
      source: currentSession.busyPromptMode ? 'session override' : 'built-in default',
      reason: currentSession.busyPromptMode === 'steer_if_possible' ? 'steer unavailable' : null,
    }),
    resolveCompactStrategySetting: () => ({ strategy: 'native', source: 'env default' }),
    commandActions: {
      setRuntimeMode(currentSession, mode) {
        currentSession.runtimeMode = mode;
        return { runtimeMode: mode };
      },
      setBusyPromptMode(currentSession, mode) {
        currentSession.busyPromptMode = mode === 'steer' ? 'steer_if_possible' : mode;
        return { busyPromptMode: currentSession.busyPromptMode };
      },
    },
    closeRuntimeSession: (key, reason) => {
      closed.push({ key, reason });
    },
    slashRef: (base) => `/cx_${base}`,
  });

  await actualPanel.handleSettingsPanelInteraction({
    customId: 'stg:set:runtime:long:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.equal(session.runtimeMode, 'long');
  assert.equal(session.runnerSessionId, 'sess-claude');
  assert.deepEqual(closed, [{ key: 'thread-1', reason: 'runtime config changed' }]);
  assert.match(updates[0].content, /当前项：运行时/);
  assert.match(updates[0].content, /运行时：long/);
  assert.match(updates[0].content, /运行中消息：排队/);
});

test('createSettingsPanel keeps steer disabled when runtime cannot actually steer', async () => {
  const session = {
    provider: 'claude',
    language: 'zh',
    mode: 'safe',
    runtimeMode: 'long',
    busyPromptMode: null,
  };
  const actualPanel = createPanel({
    session,
    commandActions: {
      setBusyPromptMode(currentSession, mode) {
        currentSession.busyPromptMode = mode === 'steer' ? 'steer_if_possible' : mode;
        return { busyPromptMode: currentSession.busyPromptMode };
      },
    },
  });
  const payload = actualPanel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'runtime',
  });
  const busyRow = payload.components[2];
  const steerButton = busyRow.components.find((component) => component.data.customId === 'stg:set:busy_prompt:steer:12345');
  assert.equal(steerButton.data.disabled, true);

  const updates = [];
  await actualPanel.handleSettingsPanelInteraction({
    customId: 'stg:set:busy_prompt:queue:12345',
    channelId: 'thread-1',
    channel: { id: 'thread-1' },
    user: { id: '12345' },
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.equal(session.busyPromptMode, 'queue');
  assert.match(updates[0].content, /运行中消息：排队/);
});

test('createSettingsPanel enables steer for Codex long runtime', () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    runtimeMode: 'long',
    busyPromptMode: 'steer_if_possible',
  };
  const actualPanel = createPanel({ session });
  const payload = actualPanel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'runtime',
  });
  const busyRow = payload.components[2];
  const steerButton = busyRow.components.find((component) => component.data.customId === 'stg:set:busy_prompt:steer:12345');
  assert.equal(steerButton.data.disabled, false);
  assert.equal(steerButton.data.style, ButtonStyle.Primary);
});

test('createSettingsPanel shows parent channel as the inherited fast mode source for threads', () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    fastMode: null,
    fastModeSource: 'parent channel',
    inheritedFastMode: true,
    parentChannelId: 'channel-1',
  };
  const panel = createPanel({ session });

  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'fast',
  });

  assert.match(payload.content, /fast mode：开启（父频道默认）/);
  const labels = payload.components.flatMap((row) => row.components.map((button) => button.data.label));
  assert.ok(labels.includes('跟随父频道/全局'));
});

test('createSettingsPanel shows parent channel as the inherited model source for threads', () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    model: null,
    modelSource: 'parent channel',
    inheritedModel: 'gpt-5.4',
    parentChannelId: 'channel-1',
  };
  const panel = createPanel({ session });

  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'overview',
  });

  assert.match(payload.content, /model：`gpt-5.4`（父频道默认）/);
});

test('createSettingsPanel model section offers CLI catalog choices and effort controls', () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    model: 'o3',
    effort: 'high',
  };
  const panel = createPanel({ session });

  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'model',
  });

  assert.match(payload.content, /当前项：模型/);
  assert.match(payload.content, /推理力度也放在这里一起调/);
  const modelSelect = payload.components[1].components[0];
  assert.match(modelSelect.data.customId, /^stg:set:model:preset:12345:[a-z0-9_-]+$/);
  assert.deepEqual(modelSelect.data.options.map((option) => option.value), ['default', 'gpt-5.4', 'o3']);
  assert.equal(modelSelect.data.options.find((option) => option.value === 'o3').default, true);
  const labels = payload.components.flatMap((row) => row.components.map((component) => component.data.label));
  assert.ok(labels.includes('手写模型名'));
  assert.ok(!labels.includes('xhigh'));
  assert.ok(labels.includes('default'));
});

test('createSettingsPanel exposes a compact model-only panel', () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    model: 'o3',
    effort: 'high',
  };
  const panel = createPanel({ session });

  const payload = panel.openModelSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    flags: 64,
  });

  assert.equal(payload.flags, 64);
  assert.match(payload.content, /^\*\*模型\*\*/);
  assert.doesNotMatch(payload.content, /provider：/);
  assert.doesNotMatch(payload.content, /当前项：/);
  assert.match(payload.components[0].components[0].data.customId, /^stg:set:quick_model:preset:12345:[a-z0-9_-]+$/);
  const labels = payload.components.flatMap((row) => row.components.map((component) => component.data.label));
  assert.ok(labels.includes('手写模型名'));
  assert.ok(!labels.includes('xhigh'));
  assert.ok(labels.includes('关闭'));
});

test('createSettingsPanel keeps the OMP model section within Discord row limits', () => {
  const session = {
    provider: 'omp',
    language: 'zh',
    mode: 'dangerous',
    model: 'openai-codex/gpt-5.6-sol',
    effort: null,
  };
  const panel = createPanel({
    session,
    modelCatalog: {
      models: [
        {
          slug: 'ccswitch-newapi/gpt-5.6-sol',
          displayName: 'GPT-5.6 Sol (CCSwitch NewAPI)',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
          visibility: 'catalog',
        },
      ],
      error: null,
    },
  });

  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'model',
  });

  assert.ok(payload.components.length <= 5);
  const labels = payload.components.flatMap((row) => row.components.map((component) => component.data.label));
  assert.deepEqual(labels.filter((label) => ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'auto', 'default'].includes(label)), [
    'off',
    'minimal',
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
    'auto',
    'default',
  ]);
  assert.ok(labels.includes('手写模型名'));
  assert.ok(labels.includes('关闭'));
});

test('createSettingsPanel keeps the effective OMP default visible beyond the Discord option limit', () => {
  const targetModel = 'openrouter-ox/stealth/ox-alpha';
  const session = {
    provider: 'omp',
    language: 'zh',
    mode: 'dangerous',
    model: null,
    globalDefaultModel: targetModel,
  };
  const modelCatalog = {
    models: [
      ...Array.from({ length: 30 }, (_, index) => ({
        slug: `openrouter/example/model-${index + 1}`,
        displayName: `Example ${index + 1}`,
        supportedReasoningLevels: [],
        visibility: 'catalog',
      })),
      {
        slug: targetModel,
        displayName: 'Ox Alpha (OpenRouter)',
        supportedReasoningLevels: ['low', 'medium', 'high'],
        visibility: 'catalog',
      },
    ],
    error: null,
  };
  const panel = createPanel({ session, modelCatalog });

  const payload = panel.openModelSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    flags: 64,
  });

  const modelOptions = payload.components[0].components[0].data.options;
  assert.equal(modelOptions.length, 25);
  assert.equal(modelOptions[1].value, targetModel);
  assert.equal(modelOptions[1].description, '当前生效模型');
});

test('createSettingsPanel keeps the OMP provider default visible beside a channel override', () => {
  const targetModel = 'openrouter-ox/stealth/ox-alpha';
  const channelModel = 'ccswitch-newapi/gpt-5.6-sol';
  const session = {
    provider: 'omp',
    language: 'zh',
    mode: 'dangerous',
    model: channelModel,
    providerDefaultModel: targetModel,
  };
  const modelCatalog = {
    models: [
      {
        slug: channelModel,
        displayName: 'GPT-5.6 Sol (CCSwitch NewAPI)',
        supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        visibility: 'catalog',
      },
      ...Array.from({ length: 30 }, (_, index) => ({
        slug: `openrouter/example/model-${index + 1}`,
        displayName: `Example ${index + 1}`,
        supportedReasoningLevels: [],
        visibility: 'catalog',
      })),
      {
        slug: targetModel,
        displayName: 'Ox Alpha (OpenRouter)',
        supportedReasoningLevels: ['low', 'medium', 'high'],
        visibility: 'catalog',
      },
    ],
    error: null,
  };
  const panel = createPanel({ session, modelCatalog });

  const payload = panel.openModelSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    flags: 64,
  });

  const modelOptions = payload.components[0].components[0].data.options;
  assert.equal(modelOptions.find((option) => option.value === channelModel).default, true);
  assert.equal(modelOptions.find((option) => option.value === targetModel).description, 'provider 默认模型');
});

test('createSettingsPanel searches the full OMP catalog from the model panel', async () => {
  const targetModel = 'openrouter-ox/stealth/ox-alpha';
  const session = {
    provider: 'omp',
    language: 'zh',
    mode: 'dangerous',
    model: null,
  };
  const modelCatalog = {
    models: [
      ...Array.from({ length: 30 }, (_, index) => ({
        slug: `openrouter/example/model-${index + 1}`,
        displayName: `Example ${index + 1}`,
        supportedReasoningLevels: [],
        visibility: 'catalog',
      })),
      {
        slug: targetModel,
        displayName: 'Ox Alpha (OpenRouter)',
        description: 'Pi-family model from openrouter-ox',
        supportedReasoningLevels: ['low', 'medium', 'high'],
        visibility: 'catalog',
      },
    ],
    error: null,
  };
  const panel = createPanel({
    session,
    modelCatalog,
    commandActions: {
      setModel(currentSession, value) {
        currentSession.model = value === 'default' ? null : value;
      },
    },
  });
  const opened = panel.openModelSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    flags: 64,
  });
  const searchButton = opened.components
    .flatMap((row) => row.components)
    .find((component) => component.data.label === '搜索模型');
  assert.ok(searchButton);

  const modals = [];
  await panel.handleSettingsPanelInteraction({
    customId: searchButton.data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    async showModal(modal) {
      modals.push(modal);
    },
  });
  assert.equal(modals.length, 1);
  assert.match(modals[0].data.customId, /^stgm:quick_model_search:12345:/);

  const replies = [];
  await panel.handleSettingsPanelModalSubmit({
    customId: modals[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    fields: {
      getTextInputValue() {
        return 'ox alpha';
      },
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /ox alpha/);
  const searchOptions = replies[0].components[0].components[0].data.options;
  assert.deepEqual(searchOptions.map((option) => option.value), ['default', targetModel]);

  const updates = [];
  await panel.handleSettingsPanelInteraction({
    customId: replies[0].components[0].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: [targetModel],
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
  });

  assert.equal(session.model, targetModel);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].components[0].components[0].data.options
    .find((option) => option.value === targetModel).default, true);
});

test('createSettingsPanel uses the selected catalog model effort levels and hides hidden models', () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    model: 'gpt-5.6-sol',
    effort: 'ultra',
  };
  const panel = createPanel({
    session,
    modelCatalog: {
      models: [
        {
          slug: 'gpt-5.6-sol',
          displayName: 'GPT-5.6 Sol',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
          visibility: 'list',
        },
        {
          slug: 'codex-auto-review',
          displayName: 'Codex Auto Review',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh'],
          visibility: 'hide',
        },
        {
          slug: 'codex-internal-review',
          displayName: 'Codex Internal Review',
          supportedReasoningLevels: ['low', 'medium', 'high'],
          visibility: 'hidden',
        },
      ],
      error: null,
    },
  });

  const payload = panel.openModelSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
  });

  const modelSelect = payload.components[0].components[0];
  assert.deepEqual(modelSelect.data.options.map((option) => option.value), ['default', 'gpt-5.6-sol']);
  const effortButtons = payload.components
    .flatMap((row) => row.components)
    .filter((component) => component.data.customId?.includes('quick_model_effort'));
  assert.deepEqual(effortButtons.map((button) => button.data.label), [
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
    'ultra',
    'default',
  ]);
  assert.equal(effortButtons.find((button) => button.data.label === 'ultra').data.style, 'primary');
  assert.ok(payload.components.length <= 5);
});

test('createSettingsPanel refreshes effort choices after selecting another model', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: 'gpt-5.4',
    effort: 'high',
  };
  const updates = [];
  const panel = createPanel({
    session,
    modelCatalog: {
      models: [
        {
          slug: 'gpt-5.4',
          displayName: 'GPT-5.4',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh'],
          visibility: 'list',
        },
        {
          slug: 'gpt-5.6-sol',
          displayName: 'GPT-5.6 Sol',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
          visibility: 'list',
        },
      ],
      error: null,
    },
    commandActions: {
      setModel(currentSession, value) {
        currentSession.model = value;
        return { model: value };
      },
    },
  });

  const opened = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });
  await panel.handleSettingsPanelInteraction({
    customId: opened.components[0].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['gpt-5.6-sol'],
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
  });

  assert.equal(session.model, 'gpt-5.6-sol');
  assert.equal(updates.length, 1);
  const modelSelect = updates[0].components[0].components[0];
  assert.equal(modelSelect.data.options.find((option) => option.value === 'gpt-5.6-sol').default, true);
  const effortLabels = updates[0].components
    .flatMap((row) => row.components)
    .filter((component) => component.data.customId?.includes('quick_model_effort'))
    .map((component) => component.data.label);
  assert.deepEqual(effortLabels, ['low', 'medium', 'high', 'xhigh', 'max', 'ultra', 'default']);
  assert.ok(updates[0].components.length <= 5);
});

test('createSettingsPanel rejects a stale unsupported effort selection', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: 'o3',
    effort: 'high',
  };
  const replies = [];
  const panel = createPanel({
    session,
    commandActions: {
      setReasoningEffort(currentSession, value) {
        currentSession.effort = value;
        return { effort: value };
      },
    },
  });
  const opened = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });
  const generation = opened.components[0].components[0].data.customId.split(':').at(-1);

  await panel.handleSettingsPanelInteraction({
    customId: `stg:set:quick_model_effort:xhigh:12345:${generation}`,
    channelId: 'thread-1',
    user: { id: '12345' },
    async update() {
      throw new Error('should not update');
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(session.effort, 'high');
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /does not support `xhigh`/);
  assert.equal(replies[0].flags, 64);
});

test('createSettingsPanel rejects default effort when the inherited effort is unsupported', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: 'o3',
    effort: 'high',
    inheritedEffort: 'xhigh',
  };
  const replies = [];
  const panel = createPanel({
    session,
    commandActions: {
      setReasoningEffort(currentSession, value) {
        currentSession.effort = value === 'default' ? null : value;
        return { effort: currentSession.effort };
      },
    },
  });
  const opened = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });
  const defaultEffort = opened.components
    .flatMap((row) => row.components)
    .find((component) => component.data.customId?.includes('quick_model_effort') && component.data.label === 'default');

  await panel.handleSettingsPanelInteraction({
    customId: defaultEffort.data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    async update() {
      throw new Error('should not update');
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(session.effort, 'high');
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /does not support `xhigh`/);
});

test('createSettingsPanel rejects switching to a model incompatible with the current effort', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: 'gpt-5.4',
    effort: 'xhigh',
  };
  const replies = [];
  const panel = createPanel({ session });
  const opened = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });

  await panel.handleSettingsPanelInteraction({
    customId: opened.components[0].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['o3'],
    async update() {
      throw new Error('should not update');
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(session.model, 'gpt-5.4');
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /does not support the current effort `xhigh`/);
  assert.equal(replies[0].flags, 64);
});

test('createSettingsPanel validates model switches against inherited effective effort', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: 'gpt-5.4',
    inheritedEffort: 'xhigh',
  };
  const replies = [];
  const panel = createPanel({ session });
  const payload = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });

  await panel.handleSettingsPanelInteraction({
    customId: payload.components[0].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['o3'],
    async update() {
      throw new Error('should not update');
    },
    async reply(reply) {
      replies.push(reply);
    },
  });

  assert.equal(session.model, 'gpt-5.4');
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /current effort `xhigh`/);
});

test('createSettingsPanel expires an older model panel opened by the same user in the same channel', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: 'gpt-5.4',
    effort: 'high',
  };
  const replies = [];
  const panel = createPanel({ session });
  const older = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });
  panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });

  await panel.handleSettingsPanelInteraction({
    customId: older.components[0].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['o3'],
    async update() {
      throw new Error('should not update');
    },
    async reply(reply) {
      replies.push(reply);
    },
  });

  assert.equal(session.model, 'gpt-5.4');
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /expired/);
  assert.equal(replies[0].flags, 64);
});

test('createSettingsPanel expires model controls after a successful update', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: 'gpt-5.4',
    effort: 'high',
  };
  const updates = [];
  const replies = [];
  const panel = createPanel({
    session,
    commandActions: {
      setModel(currentSession, value) {
        currentSession.model = value;
        return { model: value };
      },
    },
  });
  const payload = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });
  const customId = payload.components[0].components[0].data.customId;
  const interaction = {
    customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['o3'],
    async update(next) {
      updates.push(next);
    },
    async reply(reply) {
      replies.push(reply);
    },
  };

  await panel.handleSettingsPanelInteraction(interaction);
  interaction.values = ['gpt-5.4'];
  await panel.handleSettingsPanelInteraction(interaction);

  assert.equal(session.model, 'o3');
  assert.equal(updates.length, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /expired/);
});

test('createSettingsPanel keeps model panel generations scoped by channel and owner', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: 'gpt-5.4',
    effort: 'high',
  };
  const updates = [];
  const replies = [];
  const panel = createPanel({
    session,
    commandActions: {
      setModel(currentSession, value) {
        currentSession.model = value;
        return { model: value };
      },
    },
  });
  const channelOne = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });
  panel.openModelSettingsPanel({ key: 'thread-2', session, userId: '12345' });

  await panel.handleSettingsPanelInteraction({
    customId: channelOne.components[0].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['o3'],
    async update(payload) {
      updates.push(payload);
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(session.model, 'o3');
  assert.equal(updates.length, 1);
  assert.equal(replies.length, 0);
  assert.ok(channelOne.components.flatMap((row) => row.components)
    .every((component) => !component.data.customId || component.data.customId.length <= 100));
});

test('createSettingsPanel rejects selecting provider default when its model conflicts with effective effort', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: 'gpt-5.4',
    effort: 'xhigh',
    globalDefaultModel: 'o3',
  };
  const replies = [];
  const panel = createPanel({ session });
  const payload = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });

  await panel.handleSettingsPanelInteraction({
    customId: payload.components[0].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['default'],
    async update() {
      throw new Error('should not update');
    },
    async reply(reply) {
      replies.push(reply);
    },
  });

  assert.equal(session.model, 'gpt-5.4');
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /Model `o3` does not support the current effort `xhigh`/);
});

test('createSettingsPanel rejects a custom catalog model that conflicts with effective effort', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: 'gpt-5.4',
    inheritedEffort: 'xhigh',
  };
  const replies = [];
  const panel = createPanel({ session });
  const payload = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });
  const generation = payload.components[0].components[0].data.customId.split(':').at(-1);

  await panel.handleSettingsPanelModalSubmit({
    customId: `stgm:quick_model:12345:${generation}`,
    channelId: 'thread-1',
    user: { id: '12345' },
    fields: {
      getTextInputValue() {
        return 'o3';
      },
    },
    async reply(reply) {
      replies.push(reply);
    },
  });

  assert.equal(session.model, 'gpt-5.4');
  assert.equal(replies.length, 1);
  assert.match(replies[0].content, /Model `o3` does not support the current effort `xhigh`/);
});

test('settings use provider effort levels when the catalog does not specify them', async () => {
  for (const provider of ['claude', 'grok', 'pi', 'omp']) {
    const session = { provider, language: 'en', model: 'model-a', effort: 'high' };
    const actions = createSessionCommandActions({ saveDb() {} });
    const panel = createPanel({
      session, commandActions: actions,
      modelCatalog: { models: [{ slug: 'model-a' }, { slug: 'model-b', supportedReasoningLevels: [] }] },
      panelOptions: { getSupportedReasoningEffortLevels },
    });
    let payload = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });
    const interact = async (idPart, values) => {
      const control = payload.components.flatMap(row => row.components).find(c => c.data.customId.includes(idPart));
      assert.ok(control, `${provider} ${idPart}`);
      await panel.handleSettingsPanelInteraction({
        customId: control.data.customId, channelId: 'thread-1', user: { id: '12345' }, values,
        async update(next) { payload = next; }, async reply(result) { assert.fail(`${provider}: ${result.content}`); },
      });
    };
    await interact(':quick_model:preset:', ['model-b']);
    await interact(':quick_model_effort:low:');
    assert.equal(session.model, 'model-b');
    assert.equal(session.effort, 'low');
    const effortPanel = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'effort' });
    assert.ok(effortPanel.components.flatMap(row => row.components).some(c => c.data.label === 'low' && c.data.style === 'primary'));
  }
});

test('Cursor does not expose ineffective effort controls from model catalog metadata', async () => {
  const session = { provider: 'cursor', language: 'en', model: 'claude-fable-5-1[context=300k,effort=high]' };
  const panel = createPanel({
    session,
    modelCatalog: { models: [{ slug: session.model, supportedReasoningLevels: ['high'] }] },
    panelOptions: { getSupportedReasoningEffortLevels },
    commandActions: { setReasoningEffort() { assert.fail('unsupported effort must not be saved'); } },
  });
  for (const payload of [
    panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' }),
    panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'model' }),
  ]) {
    assert.ok(!payload.components.flatMap(row => row.components).some(c => c.data.customId?.includes('model_effort')));
    assert.match(payload.content, /effort: .*not exposed/);
  }
  let response;
  await panel.handleSettingsPanelInteraction({
    customId: 'stg:set:effort:high:12345', channelId: 'thread-1', user: { id: '12345' },
    async reply(result) { response = result; }, async update() { assert.fail('unsupported effort must not succeed'); },
  });
  assert.match(response.content, /not .*support|not .*expose/i);
});

test('unknown catalog effort metadata still rejects invalid explicit effort values', async () => {
  const session = { provider: 'claude', language: 'en', model: 'custom-model', effort: 'high' };
  const replies = [];
  const panel = createPanel({
    session, modelCatalog: { models: [{ slug: session.model, supportedReasoningLevels: [] }] },
    panelOptions: { getSupportedReasoningEffortLevels },
    commandActions: { setReasoningEffort() { assert.fail('invalid effort must not be saved'); } },
  });
  await panel.handleSettingsPanelInteraction({
    customId: 'stg:set:effort:invalid:12345', channelId: 'thread-1', user: { id: '12345' },
    async reply(payload) { replies.push(payload); }, async update() { assert.fail('invalid effort must not succeed'); },
  });
  assert.match(replies[0].content, /does not support.*invalid/);
  assert.equal(session.effort, 'high');
});

test('ZCode model panels do not offer unsupported channel overrides or display them as effective', () => {
  const session = { provider: 'zcode', language: 'en', model: 'ignored-old-model' };
  const settings = createSessionSettings();
  const panel = createPanel({ session, panelOptions: { ...settings, getSupportedReasoningEffortLevels } });
  for (const payload of [
    panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345' }),
    panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'model' }),
    panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' }),
  ]) {
    assert.doesNotMatch(payload.content, /ignored-old-model/);
    assert.match(payload.content, /native session/i);
    assert.ok(!payload.components.flatMap(row => row.components).some(c => /:(preset|custom|search|default):/.test(c.data.customId)));
  }
  assert.equal(session.model, 'ignored-old-model', 'rendering must not rewrite stored data');
});

test('createSettingsPanel reads Claude model catalog and keeps custom model control', () => {
  const session = {
    provider: 'claude',
    language: 'zh',
    mode: 'safe',
    model: 'sonnet',
    effort: 'high',
  };
  const panel = createPanel({
    session,
    modelCatalog: {
      models: [
        { slug: 'sonnet', displayName: 'sonnet' },
        { slug: 'opus', displayName: 'opus' },
        { slug: 'claude-sonnet-4-6', displayName: 'claude-sonnet-4-6' },
      ],
      error: null,
    },
  });

  const payload = panel.openModelSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
  });

  const modelSelect = payload.components[0].components[0];
  assert.deepEqual(modelSelect.data.options.map((option) => option.value), [
    'default',
    'sonnet',
    'opus',
    'claude-sonnet-4-6',
  ]);
  assert.equal(modelSelect.data.options.find((option) => option.value === 'sonnet').default, true);
  const labels = payload.components.flatMap((row) => row.components.map((component) => component.data.label));
  assert.ok(labels.includes('手写模型名'));
  assert.ok(labels.includes('high'));
  assert.ok(labels.includes('medium'));
  assert.ok(labels.includes('low'));
  assert.ok(!labels.includes('xhigh'));
});

test('createSettingsPanel applies model catalog selection and stays in model section', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: null,
  };
  const updates = [];
  const panel = createPanel({
    session,
    commandActions: {
      setModel(currentSession, value) {
        currentSession.model = String(value || '').trim().toLowerCase() === 'default' ? null : value;
        return { model: currentSession.model };
      },
    },
  });
  const opened = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'model' });

  await panel.handleSettingsPanelInteraction({
    customId: opened.components[1].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['gpt-5.4'],
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.equal(session.model, 'gpt-5.4');
  assert.equal(updates.length, 1);
  assert.match(updates[0].content, /Active: Model/);
  assert.match(updates[0].content, /model: `gpt-5.4` \(this channel\)/);
});

test('createSettingsPanel applies compact model panel selection without expanding settings', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: null,
  };
  const updates = [];
  const panel = createPanel({
    session,
    commandActions: {
      setModel(currentSession, value) {
        currentSession.model = String(value || '').trim().toLowerCase() === 'default' ? null : value;
        return { model: currentSession.model };
      },
    },
  });
  const opened = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });

  await panel.handleSettingsPanelInteraction({
    customId: opened.components[0].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['gpt-5.4'],
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.equal(session.model, 'gpt-5.4');
  assert.equal(updates.length, 1);
  assert.match(updates[0].content, /^\*\*Model\*\*/);
  assert.doesNotMatch(updates[0].content, /Active:/);
  assert.match(updates[0].content, /model: `gpt-5.4` \(this channel\)/);
});

test('createSettingsPanel applies effort from the model section without leaving it', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    effort: null,
  };
  const updates = [];
  const panel = createPanel({
    session,
    commandActions: {
      setReasoningEffort(currentSession, value) {
        currentSession.effort = value === 'default' ? null : value;
        return { effort: currentSession.effort };
      },
    },
  });
  const opened = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'model' });
  const effortButton = opened.components
    .flatMap((row) => row.components)
    .find((component) => component.data.customId?.includes(':model_effort:xhigh:'));

  await panel.handleSettingsPanelInteraction({
    customId: effortButton.data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.equal(session.effort, 'xhigh');
  assert.equal(updates.length, 1);
  assert.match(updates[0].content, /当前项：模型/);
  assert.match(updates[0].content, /effort：`xhigh`（当前频道）/);
});

test('createSettingsPanel opens a model modal from the model section', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    model: 'gpt-5.4',
  };
  const modals = [];
  const panel = createPanel({ session });
  const opened = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'model' });
  const customButton = opened.components
    .flatMap((row) => row.components)
    .find((component) => component.data.customId?.includes(':act:model:custom:'));

  await panel.handleSettingsPanelInteraction({
    customId: customButton.data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    async update() {
      throw new Error('should not update');
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal(modal) {
      modals.push(modal);
    },
  });

  assert.equal(modals.length, 1);
  assert.match(modals[0].data.customId, /^stgm:model:12345:[a-z0-9_-]+$/);
  assert.equal(modals[0].data.components[0].components[0].data.customId, 'model_name');
  assert.equal(modals[0].data.components[0].components[0].data.value, 'gpt-5.4');
});

test('createSettingsPanel uses Claude examples in Claude model modal', async () => {
  const session = {
    provider: 'claude',
    language: 'zh',
    mode: 'safe',
  };
  const modals = [];
  const panel = createPanel({ session });
  const opened = panel.openModelSettingsPanel({ key: 'thread-1', session, userId: '12345' });
  const customButton = opened.components
    .flatMap((row) => row.components)
    .find((component) => component.data.customId?.includes(':act:quick_model:custom:'));

  await panel.handleSettingsPanelInteraction({
    customId: customButton.data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    async update() {
      throw new Error('should not update');
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal(modal) {
      modals.push(modal);
    },
  });

  assert.equal(modals.length, 1);
  assert.match(modals[0].data.components[0].components[0].data.placeholder, /sonnet/);
  assert.doesNotMatch(modals[0].data.components[0].components[0].data.placeholder, /gpt-5\.4/);
});

test('createSettingsPanel opens a global default model modal from the defaults section', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    globalDefaultModel: 'gpt-5.4',
    globalDefaultModelConfigured: true,
  };
  const modals = [];
  const panel = createPanel({ session });
  const opened = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });
  const customModelButton = opened.components[3].components[1];

  await panel.handleSettingsPanelInteraction({
    customId: customModelButton.data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    async update() {
      throw new Error('should not update');
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal(modal) {
      modals.push(modal);
    },
  });

  assert.equal(modals.length, 1);
  assert.match(modals[0].data.customId, /^stgm:default_model:12345:[a-z0-9_-]+$/);
  assert.equal(modals[0].data.components[0].components[0].data.value, 'gpt-5.4');
});

test('createSettingsPanel switches the global model default and refreshes its effort choices', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    globalDefaultModel: 'gpt-5.6-sol',
    globalDefaultModelConfigured: true,
    globalDefaultEffort: 'max',
    globalDefaultEffortConfigured: true,
  };
  const updates = [];
  const writes = [];
  const panel = createPanel({
    session,
    modelCatalog: {
      models: [
        {
          slug: 'gpt-5.6-sol',
          displayName: 'GPT-5.6 Sol',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
          visibility: 'list',
        },
        {
          slug: 'gpt-5.6-luna',
          displayName: 'GPT-5.6 Luna',
          supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
          visibility: 'list',
        },
      ],
      error: null,
    },
    commandActions: {
      setGlobalModelDefault(_session, value) {
        writes.push(value);
        session.globalDefaultModel = value === 'default' ? null : value;
        session.globalDefaultModelConfigured = value !== 'default';
      },
    },
  });
  const opened = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });
  const oldGeneration = opened.components[1].components[0].data.customId.split(':').at(-1);

  await panel.handleSettingsPanelInteraction({
    customId: opened.components[1].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['gpt-5.6-luna'],
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
  });

  assert.deepEqual(writes, ['gpt-5.6-luna']);
  assert.equal(session.globalDefaultModel, 'gpt-5.6-luna');
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].components[2].components[0].data.options.map((option) => option.value), [
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
    'default',
  ]);
  assert.notEqual(updates[0].components[1].components[0].data.customId.split(':').at(-1), oldGeneration);
});

test('createSettingsPanel rejects an incompatible global model before writing config', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    globalDefaultModel: 'gpt-5.6-sol',
    globalDefaultModelConfigured: true,
    globalDefaultEffort: 'ultra',
    globalDefaultEffortConfigured: true,
  };
  const replies = [];
  let writes = 0;
  const panel = createPanel({
    session,
    modelCatalog: {
      models: [{
        slug: 'gpt-5.6-sol',
        supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
        visibility: 'list',
      }, {
        slug: 'gpt-5.6-luna',
        supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        visibility: 'list',
      }],
      error: null,
    },
    commandActions: {
      setGlobalModelDefault() {
        writes += 1;
      },
    },
  });
  const opened = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });

  await panel.handleSettingsPanelInteraction({
    customId: opened.components[1].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['gpt-5.6-luna'],
    async update() {
      throw new Error('should not update');
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(writes, 0);
  assert.match(replies[0].content, /does not support the current effort `ultra`/);
  assert.equal(replies[0].flags, 64);
});

test('createSettingsPanel rejects an incompatible global effort before writing config', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    globalDefaultModel: 'gpt-5.6-luna',
    globalDefaultModelConfigured: true,
    globalDefaultEffort: 'high',
    globalDefaultEffortConfigured: true,
  };
  const replies = [];
  let writes = 0;
  const panel = createPanel({
    session,
    modelCatalog: {
      models: [{
        slug: 'gpt-5.6-luna',
        supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        visibility: 'list',
      }],
      error: null,
    },
    commandActions: {
      setGlobalReasoningEffortDefault() {
        writes += 1;
      },
    },
  });
  const opened = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });
  const generation = opened.components[2].components[0].data.customId.split(':').at(-1);

  await panel.handleSettingsPanelInteraction({
    customId: `stg:set:default_effort:preset:12345:${generation}`,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['ultra'],
    async update() {
      throw new Error('should not update');
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(writes, 0);
  assert.match(replies[0].content, /does not support `ultra`/);
  assert.equal(replies[0].flags, 64);
});

test('createSettingsPanel expires older global model controls in the same channel', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    globalDefaultModel: 'gpt-5.6-sol',
    globalDefaultModelConfigured: true,
    globalDefaultEffort: 'high',
    globalDefaultEffortConfigured: true,
  };
  const replies = [];
  let writes = 0;
  const panel = createPanel({
    session,
    commandActions: {
      setGlobalModelDefault() {
        writes += 1;
      },
    },
  });
  const older = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });
  panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });

  await panel.handleSettingsPanelInteraction({
    customId: older.components[1].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['o3'],
    async update() {
      throw new Error('should not update');
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(writes, 0);
  assert.match(replies[0].content, /expired/);
});

test('createSettingsPanel expires a global model modal and validates it before writing config', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    globalDefaultModel: 'gpt-5.6-sol',
    globalDefaultModelConfigured: true,
    globalDefaultEffort: 'ultra',
    globalDefaultEffortConfigured: true,
  };
  const replies = [];
  const modals = [];
  let writes = 0;
  const panel = createPanel({
    session,
    modelCatalog: {
      models: [{
        slug: 'gpt-5.6-sol',
        supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
        visibility: 'list',
      }, {
        slug: 'gpt-5.6-luna',
        supportedReasoningLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        visibility: 'list',
      }],
      error: null,
    },
    commandActions: {
      setGlobalModelDefault() {
        writes += 1;
      },
    },
  });
  const opened = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });
  await panel.handleSettingsPanelInteraction({
    customId: opened.components[3].components[1].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    async showModal(modal) {
      modals.push(modal);
    },
    async reply() {
      throw new Error('should not reply');
    },
  });
  panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });

  await panel.handleSettingsPanelModalSubmit({
    customId: modals[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    fields: {
      getTextInputValue() {
        return 'gpt-5.6-luna';
      },
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(writes, 0);
  assert.match(replies[0].content, /expired/);

  const current = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });
  const currentGeneration = current.components[1].components[0].data.customId.split(':').at(-1);
  await panel.handleSettingsPanelModalSubmit({
    customId: `stgm:default_model:12345:${currentGeneration}`,
    channelId: 'thread-1',
    user: { id: '12345' },
    fields: {
      getTextInputValue() {
        return 'gpt-5.6-luna';
      },
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(writes, 0);
  assert.match(replies[1].content, /does not support the current effort `ultra`/);
});

test('createSettingsPanel opens codex profile modals from profile and defaults sections', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    codexProfile: 'work',
    globalDefaultCodexProfile: 'review',
  };
  const modals = [];
  const panel = createPanel({ session });

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:act:profile:custom:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update() {
      throw new Error('should not update');
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal(modal) {
      modals.push(modal);
    },
  });

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:act:default_profile:custom:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update() {
      throw new Error('should not update');
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal(modal) {
      modals.push(modal);
    },
  });

  assert.equal(modals.length, 2);
  assert.equal(modals[0].data.customId, 'stgm:profile:12345');
  assert.equal(modals[0].data.components[0].components[0].data.customId, 'codex_profile_name');
  assert.equal(modals[0].data.components[0].components[0].data.value, 'work');
  assert.equal(modals[1].data.customId, 'stgm:default_profile:12345');
  assert.equal(modals[1].data.components[0].components[0].data.value, 'review');
});

test('createSettingsPanel shows compact threshold in the panel and opens compact threshold modal', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    compactStrategy: 'hard',
    compactThresholdTokens: 333000,
  };
  const modals = [];
  const panel = createPanel({ session });

  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'compact',
  });

  assert.match(payload.content, /compact 阈值：333000（当前频道）/);
  assert.match(payload.content, /当前项：上下文压缩/);

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:act:compact_threshold:custom:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update() {
      throw new Error('should not update');
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal(modal) {
      modals.push(modal);
    },
  });

  assert.equal(modals.length, 1);
  assert.equal(modals[0].data.customId, 'stgm:compact_threshold:12345');
  assert.equal(modals[0].data.components[0].components[0].data.customId, 'compact_threshold_tokens');
  assert.equal(modals[0].data.components[0].components[0].data.value, '333000');
});

test('createSettingsPanel shows and edits Claude native auto-compact independently from the hard threshold', async () => {
  const session = {
    provider: 'claude',
    language: 'zh',
    mode: 'safe',
    compactStrategy: 'native',
    compactThresholdTokens: 192000,
    nativeCompactTokenLimit: null,
  };
  const modals = [];
  const replies = [];
  const panel = createPanel({
    session,
    commandActions: {
      applyCompactConfig(currentSession, parsed) {
        if (parsed.type === 'set_native_limit') currentSession.nativeCompactTokenLimit = parsed.tokens;
        return { nativeCompactTokenLimit: currentSession.nativeCompactTokenLimit };
      },
    },
  });
  const payload = panel.openSettingsPanel({
    key: 'thread-1',
    session,
    userId: '12345',
    activeSection: 'compact',
  });

  assert.match(payload.content, /native compact.*auto/);
  assert.match(payload.content, /hard compact 阈值：192000/);
  const compactRows = payload.components.slice(1, -1);
  assert.equal(compactRows[1].components[0].data.customId, 'stg:act:native_compact_limit:custom:12345');
  assert.equal(compactRows[1].components[1].data.label, '使用 auto');

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:act:native_compact_limit:custom:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update() {
      throw new Error('should not update');
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal(modal) {
      modals.push(modal);
    },
  });

  assert.equal(modals[0].data.customId, 'stgm:native_compact_limit:12345');
  assert.equal(modals[0].data.components[0].components[0].data.customId, 'compact_threshold_tokens');
  assert.equal(modals[0].data.components[0].components[0].data.value, undefined);

  await panel.handleSettingsPanelModalSubmit({
    customId: 'stgm:native_compact_limit:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    fields: {
      getTextInputValue() {
        return '320000';
      },
    },
    async reply(reply) {
      replies.push(reply);
    },
  });

  assert.equal(session.nativeCompactTokenLimit, 320000);
  assert.match(replies[0].content, /native compact 阈值已更新/);
  assert.match(replies[0].content, /native compact：320000（当前频道）/);
});

test('createSettingsPanel applies model modal submit and replies with a refreshed panel', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    model: null,
  };
  const replies = [];
  const panel = createPanel({
    session,
    commandActions: {
      setModel(currentSession, value) {
        currentSession.model = String(value || '').trim().toLowerCase() === 'default' ? null : value;
        return { model: currentSession.model };
      },
    },
  });
  const opened = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'model' });
  const generation = opened.components[1].components[0].data.customId.split(':').at(-1);

  await panel.handleSettingsPanelModalSubmit({
    customId: `stgm:model:12345:${generation}`,
    channelId: 'thread-1',
    user: { id: '12345' },
    fields: {
      getTextInputValue() {
        return 'o3';
      },
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(session.model, 'o3');
  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, 64);
  assert.match(replies[0].content, /Model updated/);
  assert.match(replies[0].content, /model: `o3` \(this channel\)/);
});

test('createSettingsPanel applies compact threshold modal submit and refreshes compact section', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    compactStrategy: 'hard',
    compactThresholdTokens: null,
  };
  const replies = [];
  const panel = createPanel({
    session,
    commandActions: {
      applyCompactConfig(currentSession, parsed) {
        if (parsed.type === 'set_threshold') currentSession.compactThresholdTokens = parsed.tokens;
        return { compactThresholdTokens: currentSession.compactThresholdTokens };
      },
    },
  });

  await panel.handleSettingsPanelModalSubmit({
    customId: 'stgm:compact_threshold:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    fields: {
      getTextInputValue() {
        return '320000';
      },
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(session.compactThresholdTokens, 320000);
  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, 64);
  assert.match(replies[0].content, /Hard compact threshold updated/);
  assert.match(replies[0].content, /hard compact threshold: 320000 \(this channel\)/);
  assert.match(replies[0].content, /Active: Context Compaction/);
});

test('createSettingsPanel clears compact threshold override through button interaction', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    compactStrategy: 'hard',
    compactThresholdTokens: 320000,
  };
  const updates = [];
  const panel = createPanel({
    session,
    commandActions: {
      applyCompactConfig(currentSession, parsed) {
        if (parsed.type === 'set_threshold') currentSession.compactThresholdTokens = parsed.tokens;
        return { compactThresholdTokens: currentSession.compactThresholdTokens };
      },
    },
  });

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:act:compact_threshold:default:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.equal(session.compactThresholdTokens, null);
  assert.equal(updates.length, 1);
  assert.match(updates[0].content, /compact 阈值已改为跟随默认/);
  assert.match(updates[0].content, /compact 阈值：272000（环境默认）/);
});

test('createSettingsPanel rejects invalid compact threshold input', async () => {
  const session = {
    provider: 'codex',
    language: 'en',
    mode: 'safe',
    compactThresholdTokens: 320000,
  };
  const replies = [];
  const panel = createPanel({
    session,
    commandActions: {
      applyCompactConfig() {
        throw new Error('should not apply invalid compact threshold');
      },
    },
  });

  await panel.handleSettingsPanelModalSubmit({
    customId: 'stgm:compact_threshold:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    fields: {
      getTextInputValue() {
        return 'oops';
      },
    },
    async reply(payload) {
      replies.push(payload);
    },
  });

  assert.equal(session.compactThresholdTokens, 320000);
  assert.deepEqual(replies, [{
    content: '❌ Invalid compact token limit. Use a positive integer or `default`.',
    flags: 64,
  }]);
});

test('createSettingsPanel updates global effort defaults through button interaction', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    globalDefaultEffort: 'high',
    globalDefaultEffortConfigured: true,
  };
  const updates = [];
  const panel = createPanel({
    session,
    commandActions: {
      setGlobalReasoningEffortDefault(_session, value) {
        session.globalDefaultEffort = value === 'default' ? 'high' : value;
        session.globalDefaultEffortConfigured = value !== 'default';
        return { defaults: { effort: session.globalDefaultEffort, effortConfigured: session.globalDefaultEffortConfigured } };
      },
    },
  });
  const opened = panel.openSettingsPanel({ key: 'thread-1', session, userId: '12345', activeSection: 'defaults' });

  await panel.handleSettingsPanelInteraction({
    customId: opened.components[2].components[0].data.customId,
    channelId: 'thread-1',
    user: { id: '12345' },
    values: ['xhigh'],
    async update(payload) {
      updates.push(payload);
    },
    async reply() {
      throw new Error('should not reply');
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.equal(session.globalDefaultEffort, 'xhigh');
  assert.equal(updates.length, 1);
  assert.match(updates[0].content, /当前项：Codex 全局默认/);
  assert.match(updates[0].content, /effort 默认：`xhigh`（全局配置）/);
});

test('createSettingsPanel opens the existing workspace browser in a separate reply', async () => {
  const session = {
    provider: 'codex',
    language: 'zh',
    mode: 'safe',
    workspaceDir: '/repo/current',
  };
  const replies = [];
  const panel = createPanel({
    session,
    openWorkspaceBrowser: ({ mode, key, userId, flags }) => ({
      content: `browse:${mode}:${key}:${userId}`,
      components: [],
      flags,
    }),
  });

  await panel.handleSettingsPanelInteraction({
    customId: 'stg:act:workspace:browse:12345',
    channelId: 'thread-1',
    user: { id: '12345' },
    async update() {
      throw new Error('should not update');
    },
    async reply(payload) {
      replies.push(payload);
    },
    async showModal() {
      throw new Error('should not show modal');
    },
  });

  assert.deepEqual(replies, [{
    content: 'browse:thread:thread-1:12345',
    components: [],
    flags: 64,
  }]);
});

for (const section of ['overview', 'model']) {
  test(`settings ${section} presents the actual Codex catalog failure reason and recovers`, () => {
    const catalog = readCodexModelCatalog({ codexBin: `panel-catalog-${section}`, env: {}, ttlMs: 0,
      execFileSyncFn: () => JSON.stringify({ models: [{ slug: 'valid' }, {}] }) });
    const session = { provider: 'codex', language: 'zh' };
    const panel = createPanel({ session, modelCatalog: catalog });
    const payload = panel.openSettingsPanel({ key: 'channel-1', userId: '123456789', activeSection: section });
    assert.match(payload.content, /模型列表：暂不可用/);
    assert.ok(payload.content.includes(catalog.error));
    const healthy = readCodexModelCatalog({ codexBin: `panel-catalog-${section}`, env: {}, ttlMs: 0,
      execFileSyncFn: () => JSON.stringify({ models: [{ slug: 'first' }, { slug: 'second' }] }) });
    const restored = createPanel({ session, modelCatalog: healthy }).openSettingsPanel({ key: 'channel-1', userId: '123456789', activeSection: section });
    assert.doesNotMatch(restored.content, /模型列表：暂不可用/);
    assert.deepEqual(healthy.models.map(({ slug }) => slug), ['first', 'second']);
  });
}

for (const section of ['overview', 'model']) {
  test(`settings ${section} exposes CLI timeout rather than a healthy empty catalog`, () => {
    const catalog = readCodexModelCatalog({ codexBin: `panel-timeout-${section}`, env: {}, ttlMs: 0,
      execFileSyncFn: () => { throw Object.assign(new Error('catalog command timed out'), { code: 'ETIMEDOUT' }); } });
    const panel = createPanel({ session: { provider: 'codex', language: 'zh' }, modelCatalog: catalog });
    const payload = panel.openSettingsPanel({ key: 'channel-1', userId: '123456789', activeSection: section });
    assert.match(payload.content, /模型列表：暂不可用/);
    assert.match(payload.content, /catalog command timed out/);
  });
}
