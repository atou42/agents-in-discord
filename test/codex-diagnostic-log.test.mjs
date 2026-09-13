import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCodexDiagnosticLog } from '../src/codex-diagnostic-log.js';

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-diagnostic-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, filePath: path.join(dir, 'logs', 'diagnostics.jsonl') };
}

test('creates private files lazily and appends only allowed scalar fields', (t) => {
  const { filePath } = fixture(t);
  const logger = createCodexDiagnosticLog({ filePath });
  assert.equal(fs.existsSync(path.dirname(filePath)), false);
  logger({ at: 'now', event: 'start\n', pid: 12, body: 'SECRET', error: 'SECRET', stage: { raw: 'SECRET' } });
  logger({ event: 'done', elapsedMs: 42, firstOutputMs: NaN });
  const content = fs.readFileSync(filePath, 'utf8');
  assert.deepEqual(content.trim().split('\n').map(JSON.parse), [
    { at: 'now', event: 'start', pid: 12 }, { event: 'done', elapsedMs: 42 },
  ]);
  assert.equal(content.includes('SECRET'), false);
  assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.dirname(filePath)).mode & 0o777, 0o700);
});

test('rotates before exceeding the budget and retains only one complete backup', (t) => {
  const { filePath } = fixture(t);
  const warnings = [];
  const logger = createCodexDiagnosticLog({ filePath, maxBytes: 256, warn: (v) => warnings.push(v) });
  for (let i = 0; i < 100; i++) logger({ event: 'phase', key: 'k'.repeat(128), pid: i });
  assert.deepEqual(warnings, []);
  assert.deepEqual(fs.readdirSync(path.dirname(filePath)).sort(), ['diagnostics.jsonl', 'diagnostics.jsonl.1']);
  for (const name of [filePath, `${filePath}.1`]) {
    assert.ok(fs.statSync(name).size <= 256);
    for (const line of fs.readFileSync(name, 'utf8').trim().split('\n')) assert.doesNotThrow(() => JSON.parse(line));
  }
  assert.equal(JSON.parse(fs.readFileSync(filePath, 'utf8')).pid, 99);
  assert.equal(JSON.parse(fs.readFileSync(`${filePath}.1`, 'utf8')).pid, 98);
});

test('bounds long Unicode records by characters and encoded bytes', (t) => {
  const { filePath } = fixture(t);
  const logger = createCodexDiagnosticLog({ filePath });
  logger(Object.fromEntries(['at', 'event', 'key', 'stage', 'outcome', 'startupStderrKind'].map((field) => [field, '\u{1f642}\n\u0000'.repeat(1000)])));
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(Buffer.byteLength(content) <= 2048);
  for (const value of Object.values(JSON.parse(content))) {
    assert.ok(Array.from(value).length <= 128);
    assert.equal(/[\u0000-\u001f\ufffd]/u.test(value), false);
  }
});

test('a write failure warns once without exposing the error path and disables writes', (t) => {
  const { dir } = fixture(t);
  const filePath = path.join(dir, 'SECRET');
  fs.mkdirSync(filePath);
  const warnings = [];
  const logger = createCodexDiagnosticLog({ filePath, warn: (v) => warnings.push(v) });
  assert.doesNotThrow(() => logger({ event: 'start' }));
  fs.rmdirSync(filePath);
  logger({ event: 'retry' });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /ELOGTYPE/);
  assert.equal(warnings[0].includes('SECRET'), false);
  assert.equal(fs.existsSync(filePath), false);
});

for (const suffix of ['', '.1']) {
  test(`rejects symlink at ${suffix || 'current'} without changing its target`, (t) => {
    const { dir, filePath } = fixture(t);
    fs.mkdirSync(path.dirname(filePath));
    const target = path.join(dir, 'target');
    fs.writeFileSync(target, 'keep');
    fs.symlinkSync(target, filePath + suffix);
    const warnings = [];
    const logger = createCodexDiagnosticLog({ filePath, warn: (v) => warnings.push(v) });
    logger({ event: 'start' });
    logger({ event: 'retry' });
    assert.equal(fs.readFileSync(target, 'utf8'), 'keep');
    assert.equal(fs.lstatSync(filePath + suffix).isSymbolicLink(), true);
    assert.equal(warnings.length, 1);
  });
}

test('a throwing warning callback cannot affect the caller', (t) => {
  const { dir } = fixture(t);
  const logger = createCodexDiagnosticLog({ filePath: dir, warn: () => { throw new Error('callback'); } });
  assert.doesNotThrow(() => logger({ event: 'start' }));
});
