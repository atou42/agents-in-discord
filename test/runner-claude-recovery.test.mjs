import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildClaudeRecoveryPrompt,
  hasVisibleAssistantText,
  shouldAutoRecoverClaudeResult,
} from '../src/runner-claude-recovery.js';

test('hasVisibleAssistantText detects final or commentary assistant text', () => {
  assert.equal(hasVisibleAssistantText({
    messages: ['我先查一下。'],
    finalAnswerMessages: [],
  }), true);

  assert.equal(hasVisibleAssistantText({
    messages: [],
    finalAnswerMessages: ['最终答案'],
  }), true);

  assert.equal(hasVisibleAssistantText({
    messages: ['   '],
    finalAnswerMessages: [],
  }), false);
});

test('shouldAutoRecoverClaudeResult detects agent handoff early exit', () => {
  const shouldRecover = shouldAutoRecoverClaudeResult({
    ok: true,
    cancelled: false,
    timedOut: false,
    messages: ['我来深入研究一下这个仓库，看看对你们有什么价值。'],
    finalAnswerMessages: ['我来深入研究一下这个仓库，看看对你们有什么价值。'],
    meta: {
      claudeSawAgentToolUse: true,
      claudeStopReason: null,
    },
  });

  assert.equal(shouldRecover, true);
});

test('shouldAutoRecoverClaudeResult ignores normal Claude completion', () => {
  const shouldRecover = shouldAutoRecoverClaudeResult({
    ok: true,
    cancelled: false,
    timedOut: false,
    messages: ['我先查一下。'],
    finalAnswerMessages: ['结论：这个仓库更适合作为交互样例。'],
    meta: {
      claudeSawAgentToolUse: true,
      claudeStopReason: 'end_turn',
    },
  });

  assert.equal(shouldRecover, false);
});

test('buildClaudeRecoveryPrompt asks for a final answer instead of preamble', () => {
  const prompt = buildClaudeRecoveryPrompt();
  assert.match(prompt, /继续刚才的同一任务/);
  assert.match(prompt, /请直接完成任务并输出最终答案/);
  assert.match(prompt, /不要只输出一句开场白/);
});
