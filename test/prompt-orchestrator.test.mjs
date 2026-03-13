import test from 'node:test';
import assert from 'node:assert/strict';

import { createPromptOrchestrator } from '../src/prompt-orchestrator.js';

function createOrchestrator(overrides = {}) {
  const replyLog = [];
  let saveCount = 0;
  const session = {
    provider: 'codex',
    runnerSessionId: 'sess-1',
    codexThreadId: 'sess-1',
    language: 'zh',
    lastInputTokens: 0,
    name: 'demo',
  };

  const deps = {
    defaultUiLanguage: 'zh',
    progressUpdatesEnabled: false,
    progressProcessLines: 2,
    progressUpdateIntervalMs: 1000,
    progressEventFlushMs: 100,
    progressEventDedupeWindowMs: 100,
    progressIncludeStdout: true,
    progressIncludeStderr: false,
    progressTextPreviewChars: 120,
    progressProcessPushIntervalMs: 100,
    progressMessageMaxChars: 1800,
    progressPlanMaxLines: 4,
    progressDoneStepsMax: 4,
    showReasoning: true,
    resultChunkChars: 1900,
    safeReply: async (_message, payload) => {
      replyLog.push(payload);
      return { id: `reply-${replyLog.length}`, edit: async () => {} };
    },
    withDiscordNetworkRetry: async (fn) => fn(),
    splitForDiscord: (text) => [text],
    getSession: () => session,
    ensureWorkspace: () => '/repo/demo',
    saveDb: () => {
      saveCount += 1;
    },
    clearSessionId: (currentSession) => {
      currentSession.runnerSessionId = null;
      currentSession.codexThreadId = null;
    },
    getSessionId: (currentSession) => currentSession.runnerSessionId || currentSession.codexThreadId || null,
    setSessionId: (currentSession, value) => {
      currentSession.runnerSessionId = value;
      currentSession.codexThreadId = value;
    },
    getSessionProvider: (currentSession) => currentSession.provider || 'codex',
    getSessionLanguage: (currentSession) => currentSession.language || 'zh',
    normalizeUiLanguage: (value) => (String(value || '').trim().toLowerCase() === 'en' ? 'en' : 'zh'),
    getProviderDisplayName: (provider) => provider === 'codex' ? 'Codex CLI' : provider,
    getProviderShortName: (provider) => provider === 'codex' ? 'Codex' : provider,
    getProviderDefaultBin: () => 'codex',
    getProviderBinEnvName: () => 'CODEX_BIN',
    resolveTimeoutSetting: () => ({ timeoutMs: 60_000, source: 'session override' }),
    resolveCompactStrategySetting: () => ({ strategy: 'hard', source: 'env default' }),
    resolveCompactEnabledSetting: () => ({ enabled: true, source: 'env default' }),
    resolveCompactThresholdSetting: () => ({ tokens: 200_000, source: 'env default' }),
    formatWorkspaceBusyReport: () => 'busy',
    formatTimeoutLabel: (timeoutMs) => `${timeoutMs}ms`,
    setActiveRun: (channelState, message, prompt, child = null, phase = 'exec') => {
      channelState.activeRun = {
        messageId: message.id,
        prompt,
        child,
        phase,
        queue: channelState.queue,
        completedSteps: [],
        recentActivities: [],
        progressPlan: null,
      };
    },
    acquireWorkspace: async () => ({ acquired: true, aborted: false, release() {} }),
    stopChildProcess: () => {},
    runTask: async () => ({
      ok: true,
      cancelled: false,
      timedOut: false,
      error: '',
      logs: [],
      notes: [],
      reasonings: ['thinking'],
      messages: ['done'],
      finalAnswerMessages: ['final answer'],
      threadId: 'sess-2',
      usage: { input_tokens: 321 },
    }),
    isCliNotFound: () => false,
    slashRef: (name) => `/bot-${name}`,
    safeError: (err) => err?.message || String(err),
    truncate: (text, max) => (String(text || '').length <= max ? String(text || '') : `${String(text).slice(0, max - 3)}...`),
    toOptionalInt: (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? Math.floor(n) : null;
    },
    humanElapsed: () => '1s',
    summarizeCodexEvent: () => '',
    extractRawProgressTextFromEvent: () => '',
    cloneProgressPlan: (plan) => plan,
    extractPlanStateFromEvent: () => null,
    extractCompletedStepFromEvent: () => null,
    appendCompletedStep: () => {},
    appendRecentActivity: () => {},
    formatProgressPlanSummary: () => '',
    renderProcessContentLines: () => [],
    localizeProgressLines: (lines) => lines,
    renderProgressPlanLines: () => [],
    renderCompletedStepsLines: () => [],
    formatRuntimePhaseLabel: () => 'exec',
    createProgressEventDeduper: () => () => false,
    buildProgressEventDedupeKey: () => 'key',
    extractInputTokensFromUsage: (usage) => usage?.input_tokens ?? null,
    composeFinalAnswerText: ({ finalAnswerMessages }) => finalAnswerMessages.join('\n\n'),
  };

  return {
    session,
    replyLog,
    get saveCount() {
      return saveCount;
    },
    orchestrator: createPromptOrchestrator({ ...deps, ...overrides }),
  };
}

test('createPromptOrchestrator.shouldCompactSession respects strategy threshold and session binding', () => {
  const { session, orchestrator } = createOrchestrator();
  session.lastInputTokens = 250_000;

  assert.equal(orchestrator.shouldCompactSession(session), true);

  session.runnerSessionId = null;
  session.codexThreadId = null;
  assert.equal(orchestrator.shouldCompactSession(session), false);
});

test('createPromptOrchestrator.composeResultText renders reasoning answer notes and session label', () => {
  const { session, orchestrator } = createOrchestrator();

  const text = orchestrator.composeResultText({
    reasonings: ['step one', 'step two'],
    messages: ['fallback'],
    finalAnswerMessages: ['final answer'],
    notes: ['auto reset'],
    threadId: 'sess-9',
  }, session);

  assert.match(text, /🧠 Reasoning/);
  assert.match(text, /final answer/);
  assert.match(text, /• auto reset/);
  assert.match(text, /• session: \*\*demo\*\* \(`sess-9`\)/);
});

test('createPromptOrchestrator.handlePrompt runs task updates session and replies with result', async () => {
  const harness = createOrchestrator();
  const { session, replyLog, orchestrator } = harness;
  const message = {
    id: 'msg-1',
    channel: {
      async sendTyping() {},
      async send(payload) {
        replyLog.push(payload);
      },
    },
  };
  const channelState = { queue: [], cancelRequested: false, activeRun: null };

  const outcome = await orchestrator.handlePrompt(message, 'thread-1', 'do work', channelState);

  assert.deepEqual(outcome, { ok: true, cancelled: false });
  assert.equal(session.runnerSessionId, 'sess-2');
  assert.equal(session.codexThreadId, 'sess-2');
  assert.equal(session.lastInputTokens, 321);
  assert.equal(harness.saveCount > 0, true);
  assert.equal(replyLog.length, 1);
  assert.match(replyLog[0], /final answer/);
  assert.match(replyLog[0], /• session: \*\*demo\*\* \(`sess-2`\)/);
});
