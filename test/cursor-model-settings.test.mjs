import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, SlashCommandBuilder } from 'discord.js';
import { parseCursorModel, groupCursorModelCatalog, resolveCursorModel } from '../src/cursor-model-settings.js';
import { createSessionSettings, parseFastModeAction } from '../src/session-settings.js';
import { createSessionCommandActions } from '../src/session-command-actions.js';
import { createRunnerArgsBuilder } from '../src/runner-args.js';
import { createSettingsPanel } from '../src/settings-panel.js';
import { createSlashCommandRouter } from '../src/slash-command-router.js';
import { buildSlashCommands } from '../src/slash-command-surface.js';
import { getSupportedReasoningEffortLevels } from '../src/provider-metadata.js';

const catalog = { models: [
  ['auto', 'Auto'],
  ['gpt-5.6-sol-high-fast', 'GPT-5.6 Sol 1M High Fast'],
  ['gpt-5.6-sol-high', 'GPT-5.6 Sol 1M High'],
  ['gpt-5.6-sol-medium', 'GPT-5.6 Sol 1M'],
  ['gpt-5.6-sol-medium-fast', 'GPT-5.6 Sol 1M Fast'],
  ['gpt-5.6-sol-low', 'GPT-5.6 Sol 1M Low'],
  ['gpt-5.6-sol-none', 'GPT-5.6 Sol 1M None'],
  ['composer-2.5', 'Composer 2.5'],
  ['composer-2.5-fast', 'Composer 2.5 Fast'],
  ['gemini-3.8-flash-low', 'Gemini 3.8 Flash Low'],
  ['gemini-3.8-flash-high', 'Gemini 3.8 Flash High'],
  ['claude-opus-4-8-thinking-high', 'Claude Opus 4.8 Thinking'],
  ['claude-opus-4-8-high', 'Claude Opus 4.8'],
  ['claude-opus-4-8-low', 'Claude Opus 4.8 Low'],
].map(([slug, displayName]) => ({ slug, displayName })), error: null };

function fixture(parent = null) {
  const session = { provider: 'cursor', language: 'en', model: 'gpt-5.6-sol-high', effort: null, fastMode: null };
  const settings = createSessionSettings({ readCursorModelCatalog: () => catalog, getParentSession: () => parent });
  let saves = 0;
  const actions = createSessionCommandActions({ ...settings, saveDb: () => saves++ });
  return { session, settings, actions, saves: () => saves };
}

test('Cursor groups variants without conflating thinking or model names', () => {
  const grouped = groupCursorModelCatalog(catalog);
  assert.equal(grouped.models.length, 6);
  const sol = grouped.models.find(model => model.cursorFamily === 'gpt-5.6-sol');
  assert.equal(sol.slug, 'gpt-5.6-sol-medium');
  assert.equal(sol.displayName, 'GPT-5.6 Sol 1M');
  assert.deepEqual(sol.supportedReasoningLevels, ['high', 'medium', 'low', 'none']);
  assert.equal(parseCursorModel('claude-4.6-opus-max-thinking').family, 'claude-4.6-opus-thinking');
  assert.equal(parseCursorModel('gpt-5.5-extra-high-fast').effort, 'xhigh');
});

test('Cursor validates the combination, not independent unions of capabilities', () => {
  assert.equal(resolveCursorModel('gpt-5.6-sol-high', catalog, { fast: true }), 'gpt-5.6-sol-high-fast');
  assert.equal(resolveCursorModel('gpt-5.6-sol-high-fast', catalog, { effort: 'medium' }), 'gpt-5.6-sol-medium-fast');
  assert.throws(() => resolveCursorModel('gpt-5.6-sol-high-fast', catalog, { effort: 'low' }), /does not support/);
  assert.throws(() => resolveCursorModel('composer-2.5', catalog, { effort: 'high' }), /does not support/);
  assert.throws(() => resolveCursorModel('gemini-3.8-flash-high', catalog, { fast: true }), /does not support/);
  assert.throws(() => resolveCursorModel('auto', catalog, { effort: 'high' }), /does not support/);
  assert.equal(resolveCursorModel('unknown-custom', catalog), 'unknown-custom');
  assert.throws(() => resolveCursorModel('unknown-custom', catalog, { effort: 'high' }), /not in CLI catalog/);
  assert.throws(() => resolveCursorModel('gpt-5.6-sol-high', { error: 'offline' }, { fast: true }), /offline/);
});

test('Cursor parameter overrides preserve context and reject malformed booleans', () => {
  assert.equal(resolveCursorModel('claude-opus-4-8[context=300k,effort=high]', catalog, { effort: 'low' }),
    'claude-opus-4-8[context=300k,effort=low]');
  assert.throws(() => parseCursorModel('claude-opus-4-8[fast=no]'), /true or false/);
  assert.throws(() => parseCursorModel('claude-opus-4-8[effort=high,effort=low]'), /Invalid/);
  const contextCatalog = { models: [{ slug: 'claude-opus-4-8[context=300k,effort=high]' }, ...catalog.models] };
  assert.equal(resolveCursorModel('claude-opus-4-8-low', contextCatalog, { effort: 'high' }), 'claude-opus-4-8-high');
  assert.throws(() => resolveCursorModel('claude-opus-4-8[effort=invalid]', catalog), /does not support/);
});

test('Cursor settings are inherited, atomic, and reach new and resumed runner arguments', () => {
  const parent = { provider: 'cursor', model: 'gpt-5.6-sol-high', effort: 'medium', fastMode: true };
  const { session, settings, actions, saves } = fixture(parent);
  session.parentChannelId = 'parent';
  session.model = null;
  assert.equal(settings.resolveModelSetting(session).value, 'gpt-5.6-sol-medium-fast');
  const before = structuredClone(session);
  assert.throws(() => actions.setReasoningEffort(session, 'low'), /does not support/);
  assert.deepEqual(session, before);
  assert.equal(saves(), 0);
  actions.setModelSettings(session, { effort: 'low', fastMode: false });
  assert.equal(saves(), 1);
  for (const sessionId of [null, 'existing-chat']) {
    const builder = createRunnerArgsBuilder({ ...settings, getSessionId: () => sessionId });
    const args = builder.buildSessionRunnerArgs({ provider: 'cursor', session, workspaceDir: '/tmp', prompt: 'test' });
    assert.equal(args[args.indexOf('--model') + 1], 'gpt-5.6-sol-low');
    assert.equal(args.includes('--resume'), Boolean(sessionId));
    assert.ok(!args.includes('--effort') && !args.includes('--fast'));
  }
  actions.setModelSettings(session, { effort: null, fastMode: null });
  assert.equal(settings.resolveModelSetting(session).value, 'gpt-5.6-sol-medium-fast');
  assert.equal(parent.effort, 'medium');
  assert.equal(parent.fastMode, true);
});

test('Cursor slash registration exposes optional model dimensions plus effort and fast commands', () => {
  const commands = buildSlashCommands({ SlashCommandBuilder, slashPrefix: 'cursor', botProvider: 'cursor' }).map(command => command.toJSON());
  assert.deepEqual(commands.find(command => command.name === 'cursor_model').options.map(option => option.name), ['name', 'effort', 'fast']);
  assert.ok(commands.find(command => command.name === 'cursor_effort').options[0].choices.some(choice => choice.value === 'none'));
  assert.ok(commands.some(command => command.name === 'cursor_fast'));
});

test('Cursor model slash applies all dimensions atomically and standalone commands share validation', async () => {
  const { session, settings, actions, saves } = fixture();
  const replies = [];
  const router = createSlashCommandRouter({
    ...settings, commandActions: actions, getSession: () => session, getSessionProvider: () => 'cursor',
    getSessionLanguage: () => 'en', formatFastModeConfigReport: (_lang, _provider, setting) => String(setting.enabled),
    isReasoningEffortSupported: (provider, effort) => getSupportedReasoningEffortLevels(provider).includes(effort),
    parseFastModeAction,
  });
  const invoke = (commandName, options) => router({
    commandName, interaction: { channelId: 'channel', user: { id: 'user' }, options: { getString: name => options[name] ?? null } },
    respond: async payload => replies.push(payload),
  });
  await invoke('model', { name: 'gpt-5.6-sol-high', effort: 'medium', fast: 'on' });
  assert.equal(saves(), 1);
  assert.match(replies.at(-1), /gpt-5.6-sol-medium-fast/);
  await assert.rejects(invoke('model', { name: 'composer-2.5', effort: 'high', fast: 'on' }), /does not support/);
  assert.equal(session.model, 'gpt-5.6-sol-high');
  assert.equal(saves(), 1);
  await invoke('fast', { action: 'off' });
  await invoke('effort', { level: 'none' });
  assert.equal(settings.resolveModelSetting(session).value, 'gpt-5.6-sol-none');
});

test('Cursor model panels fit Discord limits, group models, and wire effort/Fast controls', async () => {
  const { session, settings, actions } = fixture();
  const panel = createSettingsPanel({
    ...settings, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
    getSession: () => session, getSessionProvider: () => 'cursor', getSessionLanguage: () => 'en',
    getSupportedReasoningEffortLevels, getModelCatalog: () => catalog, commandActions: actions,
  });
  let payload = panel.openModelSettingsPanel({ key: 'channel', session, userId: '12345' });
  const serialized = () => payload.components.map(row => row.toJSON());
  const interact = async (target, value, values) => {
    const control = serialized().flatMap(row => row.components).find(component => component.custom_id.includes(`:${target}:${value}:`));
    assert.ok(control, `${target}:${value}`);
    await panel.handleSettingsPanelInteraction({
      customId: control.custom_id, channelId: 'channel', user: { id: '12345' }, values,
      async update(next) { payload = next; }, async reply(result) { assert.fail(result.content); },
    });
    assert.ok(payload.components.length <= 5);
    serialized();
  };
  assert.equal(serialized()[0].components[0].options.length, 7);
  await interact('quick_model_fast', 'on');
  assert.equal(settings.resolveModelSetting(session).value, 'gpt-5.6-sol-high-fast');
  const effortOptions = serialized().flatMap(row => row.components).find(component => component.custom_id.includes(':quick_model_effort:')).options;
  assert.deepEqual(effortOptions.map(option => option.value), ['high', 'medium', 'default']);
  await interact('quick_model_effort', 'preset', ['medium']);
  assert.equal(settings.resolveModelSetting(session).value, 'gpt-5.6-sol-medium-fast');
  payload = panel.openSettingsPanel({ key: 'channel', session, userId: '12345', activeSection: 'model' });
  assert.ok(payload.components.length <= 5);
  serialized();
  await interact('model_fast', 'off');
  assert.equal(settings.resolveModelSetting(session).value, 'gpt-5.6-sol-medium');
});
