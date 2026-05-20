import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatProviderNativeCompactSurface,
  formatProviderRawConfigSurface,
  formatProviderReasoningSurface,
  formatProviderResumeSurface,
  formatProviderRuntimeSummary,
  formatProviderSessionLabel,
  formatProviderSessionTerm,
  formatProviderSessionStoreSurface,
  formatRecentSessionsLookup,
  formatRecentSessionsTitle,
} from '../src/provider-runtime-surface.js';

test('provider-runtime-surface formats provider-specific runtime vocabulary', () => {
  assert.match(formatRecentSessionsTitle('claude', 'en'), /Claude Project Sessions/);
  assert.match(formatRecentSessionsLookup('antigravity', 'en'), /last_conversations\.json/);
  assert.equal(formatProviderSessionTerm('claude', 'en'), 'project session');
  assert.equal(formatProviderSessionLabel('antigravity', 'en'), 'Antigravity conversation');
  assert.match(formatProviderRuntimeSummary('codex', 'zh'), /native limit/);
  assert.match(formatProviderSessionStoreSurface('claude', 'zh'), /~\/\.claude\/projects\/<workspace>/);
  assert.match(formatProviderResumeSurface('antigravity', 'zh'), /切换 workspace 时会重置/);
  assert.match(formatProviderNativeCompactSurface('claude', 'en'), /no exposed native limit override/);
  assert.match(formatProviderRawConfigSurface('codex', 'en'), /-c key=value/);
  assert.match(formatProviderReasoningSurface('claude', 'en'), /`low`, `medium`, `high`/);
  assert.equal(formatProviderReasoningSurface('antigravity', 'en'), 'reasoning effort not exposed');
});
