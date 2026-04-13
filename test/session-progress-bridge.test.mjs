import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createSessionProgressBridgeFactory } from '../src/session-progress-bridge.js';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readMatch(file) {
  const stat = fs.statSync(file);
  return {
    file,
    mtimeMs: stat.mtimeMs,
    sizeBytes: stat.size,
  };
}

test('codex session progress bridge skips old replay when an existing rollout file is discovered late', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-in-discord-progress-codex-'));
  const rolloutFile = path.join(root, 'rollout.jsonl');
  fs.writeFileSync(
    rolloutFile,
    `${JSON.stringify({
      timestamp: '2026-03-25T10:00:00.000Z',
      type: 'item.completed',
      payload: { text: 'old replay' },
    })}\n`,
  );

  let filteredLookups = 0;
  const seen = [];
  const factory = createSessionProgressBridgeFactory({
    normalizeProvider: (provider) => provider,
    extractRawProgressTextFromEvent: (event) => String(event?.payload?.text || ''),
    findLatestRolloutFileBySessionId: () => {
      const match = readMatch(rolloutFile);
      if (filteredLookups === 0) {
        filteredLookups += 1;
        return match;
      }
      filteredLookups += 1;
      return filteredLookups >= 3 ? match : null;
    },
    findLatestClaudeSessionFileBySessionId: () => null,
  });

  const stop = factory.startSessionProgressBridge({
    provider: 'codex',
    threadId: 'sid-codex',
    onEvent: (event) => seen.push(String(event?.payload?.text || '')),
  });

  try {
    await wait(150);
    fs.appendFileSync(
      rolloutFile,
      `${JSON.stringify({
        timestamp: '2026-03-25T10:00:01.000Z',
        type: 'item.completed',
        payload: { text: 'new tail' },
      })}\n`,
    );

    await wait(900);
    assert.deepEqual(seen, ['new tail']);
  } finally {
    stop();
  }
});

test('claude session progress bridge skips old replay when an existing session file is discovered late', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-in-discord-progress-claude-'));
  const sessionFile = path.join(root, 'session.jsonl');
  fs.writeFileSync(
    sessionFile,
    `${JSON.stringify({
      timestamp: '2026-03-25T10:00:00.000Z',
      type: 'assistant',
      sessionId: 'sid-claude',
      text: 'old replay',
    })}\n`,
  );

  let filteredLookups = 0;
  const seen = [];
  const factory = createSessionProgressBridgeFactory({
    normalizeProvider: (provider) => provider,
    extractRawProgressTextFromEvent: (event) => String(event?.text || ''),
    findLatestRolloutFileBySessionId: () => null,
    findLatestClaudeSessionFileBySessionId: () => {
      const match = readMatch(sessionFile);
      if (filteredLookups === 0) {
        filteredLookups += 1;
        return match;
      }
      filteredLookups += 1;
      return filteredLookups >= 3 ? match : null;
    },
  });

  const stop = factory.startSessionProgressBridge({
    provider: 'claude',
    threadId: 'sid-claude',
    workspaceDir: '/tmp/demo',
    onEvent: (event) => seen.push(String(event?.text || '')),
  });

  try {
    await wait(150);
    fs.appendFileSync(
      sessionFile,
      `${JSON.stringify({
        timestamp: '2026-03-25T10:00:01.000Z',
        type: 'assistant',
        sessionId: 'sid-claude',
        text: 'new tail',
      })}\n`,
    );

    await wait(900);
    assert.deepEqual(seen, ['new tail']);
  } finally {
    stop();
  }
});

test('claude session progress bridge forwards user tool_result events for downstream result parsing', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-in-discord-progress-claude-tool-result-'));
  const sessionFile = path.join(root, 'session.jsonl');
  fs.writeFileSync(sessionFile, '');

  const seen = [];
  const factory = createSessionProgressBridgeFactory({
    normalizeProvider: (provider) => provider,
    extractRawProgressTextFromEvent: () => '',
    findLatestRolloutFileBySessionId: () => null,
    findLatestClaudeSessionFileBySessionId: () => readMatch(sessionFile),
  });

  const stop = factory.startSessionProgressBridge({
    provider: 'claude',
    threadId: 'sid-claude-tool-result',
    workspaceDir: '/tmp/demo',
    onEvent: (event) => seen.push(event),
  });

  try {
    await wait(150);
    fs.appendFileSync(
      sessionFile,
      `${JSON.stringify({
        timestamp: '2026-03-25T10:00:01.000Z',
        type: 'user',
        sessionId: 'sid-claude-tool-result',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              content: '## 角色卡 #1\n\n完整正文',
            },
          ],
        },
      })}\n`,
    );

    await wait(900);
    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.type, 'user');
  } finally {
    stop();
  }
});
