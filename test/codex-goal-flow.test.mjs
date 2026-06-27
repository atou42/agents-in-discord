import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CODEX_GOAL_CONTINUATION_PROMPT,
  formatCodexGoalResult,
  isCodexGoalContinuationPrompt,
  parseCodexGoalSlashInput,
  shouldStartCodexGoalContinuation,
} from '../src/codex-goal-flow.js';

test('Codex goal continuation prompt targets the persisted active goal', () => {
  assert.match(CODEX_GOAL_CONTINUATION_PROMPT, /Continue working toward the active Codex goal/);
  assert.match(CODEX_GOAL_CONTINUATION_PROMPT, /persisted goal state/);
});

test('Codex goal continuation prompt still matches when runtime context is appended', () => {
  assert.equal(isCodexGoalContinuationPrompt(CODEX_GOAL_CONTINUATION_PROMPT), true);
  assert.equal(
    isCodexGoalContinuationPrompt(`${CODEX_GOAL_CONTINUATION_PROMPT}\n\n[Via agents-in-discord; discord_thread=thread-1]`),
    true,
  );
  assert.equal(isCodexGoalContinuationPrompt(`not this ${CODEX_GOAL_CONTINUATION_PROMPT}`), false);
});

test('Codex goal continuation only starts when a command makes the goal active', () => {
  assert.equal(shouldStartCodexGoalContinuation(
    { type: 'set' },
    { ok: true, goal: { status: 'active' } },
  ), true);
  assert.equal(shouldStartCodexGoalContinuation(
    { type: 'set_status', status: 'active' },
    { ok: true, goal: { status: 'active' } },
  ), true);
  assert.equal(shouldStartCodexGoalContinuation(
    { type: 'status' },
    { ok: true, goal: { status: 'active' } },
  ), false);
  assert.equal(shouldStartCodexGoalContinuation(
    { type: 'set_status', status: 'complete' },
    { ok: true, goal: { status: 'complete' } },
  ), false);
});

test('Codex goal slash input rejects fields on unrelated actions', () => {
  assert.deepEqual(
    parseCodexGoalSlashInput({ action: 'status', objective: 'ship it' }),
    { type: 'invalid', message: 'objective is only valid for goal set' },
  );
  assert.deepEqual(
    parseCodexGoalSlashInput({ action: 'pause', tokenBudget: '120000' }),
    { type: 'invalid', message: 'token_budget is only valid for goal set or budget' },
  );
});

test('Codex goal active status says to finish by marking complete or reporting a blocker', () => {
  const text = formatCodexGoalResult({
    ok: true,
    kind: 'status',
    goal: {
      objective: 'ship goal mode',
      status: 'active',
      tokenBudget: null,
    },
  }, 'zh');

  assert.match(text, /直到把 goal 标为已完成/);
  assert.match(text, /明确报告阻塞/);
});
