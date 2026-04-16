import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createWorkspaceRuntime } from '../src/workspace-runtime.js';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

test('createWorkspaceRuntime serializes access to the same workspace', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cli-discord-workspace-lock-'));
  const runtime = createWorkspaceRuntime({
    lockRoot: path.join(root, 'locks'),
    ensureDir,
    pollIntervalMs: 30,
  });

  const first = await runtime.acquireWorkspace('/tmp/workspace-a', { key: 'thread-a' });
  assert.equal(first.acquired, true);

  let waited = false;
  const secondPromise = runtime.acquireWorkspace('/tmp/workspace-a', { key: 'thread-b' }, {
    onWait: () => {
      waited = true;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(waited, true);

  const beforeRelease = Date.now();
  first.release();
  const second = await secondPromise;
  assert.equal(second.acquired, true);
  assert.ok(Date.parse(second.owner.acquiredAt) >= beforeRelease);
  second.release();
});

test('createWorkspaceRuntime removes stale workspace locks from dead processes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cli-discord-workspace-lock-'));
  const runtime = createWorkspaceRuntime({
    lockRoot: path.join(root, 'locks'),
    ensureDir,
    pollIntervalMs: 30,
  });
  const info = runtime.readLock('/tmp/workspace-b');
  ensureDir(path.dirname(info.lockFile));
  fs.writeFileSync(info.lockFile, JSON.stringify({
    pid: 999999,
    key: 'stale-thread',
    acquiredAt: new Date(Date.now() - 60_000).toISOString(),
  }));

  const lock = await runtime.acquireWorkspace('/tmp/workspace-b', { key: 'thread-live' });
  assert.equal(lock.acquired, true);
  lock.release();
  assert.equal(fs.existsSync(info.lockFile), false);
});

test('createWorkspaceRuntime archives stale malformed workspace locks before acquiring', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cli-discord-workspace-lock-'));
  const runtime = createWorkspaceRuntime({
    lockRoot: path.join(root, 'locks'),
    ensureDir,
    pollIntervalMs: 30,
    malformedLockStaleMs: 100,
  });
  const info = runtime.readLock('/tmp/workspace-corrupt');
  ensureDir(path.dirname(info.lockFile));
  fs.writeFileSync(info.lockFile, '');
  const old = new Date(Date.now() - 60_000);
  fs.utimesSync(info.lockFile, old, old);

  let aborted = false;
  const acquirePromise = runtime.acquireWorkspace('/tmp/workspace-corrupt', { key: 'thread-live' }, {
    isAborted: () => aborted,
  });
  const result = await Promise.race([
    acquirePromise,
    new Promise((resolve) => setTimeout(() => resolve('timeout'), 500)),
  ]);
  if (result === 'timeout') {
    aborted = true;
    await acquirePromise;
  }

  assert.notEqual(result, 'timeout');
  assert.equal(result.acquired, true);
  result.release();

  const archived = fs.readdirSync(path.dirname(info.lockFile))
    .filter((name) => name.startsWith(`${path.basename(info.lockFile)}.corrupt-`));
  assert.equal(archived.length, 1);
});

test('createWorkspaceRuntime waits on fresh malformed workspace locks', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cli-discord-workspace-lock-'));
  const runtime = createWorkspaceRuntime({
    lockRoot: path.join(root, 'locks'),
    ensureDir,
    pollIntervalMs: 30,
    malformedLockStaleMs: 10_000,
  });
  const info = runtime.readLock('/tmp/workspace-fresh-corrupt');
  ensureDir(path.dirname(info.lockFile));
  fs.writeFileSync(info.lockFile, '');

  let aborted = false;
  const acquirePromise = runtime.acquireWorkspace('/tmp/workspace-fresh-corrupt', { key: 'thread-live' }, {
    isAborted: () => aborted,
  });
  const result = await Promise.race([
    acquirePromise,
    new Promise((resolve) => setTimeout(() => resolve('timeout'), 150)),
  ]);
  aborted = true;
  const abortedResult = await acquirePromise;

  assert.equal(result, 'timeout');
  assert.equal(abortedResult.aborted, true);
  assert.equal(fs.existsSync(info.lockFile), true);
  const archived = fs.readdirSync(path.dirname(info.lockFile))
    .filter((name) => name.startsWith(`${path.basename(info.lockFile)}.corrupt-`));
  assert.equal(archived.length, 0);
});
