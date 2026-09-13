import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIELDS = [
  'at', 'event', 'key', 'pid', 'stage', 'outcome', 'elapsedMs', 'prepareMs',
  'firstOutputMs', 'startupStderrBytes', 'startupStderrKind',
];

function logError(code) {
  return Object.assign(new Error(code), { code });
}

function regularFile(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile()) throw logError('ELOGTYPE');
    return stat;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function encodeRecord(record, maxBytes) {
  const safe = {};
  for (const field of FIELDS) {
    const value = record?.[field];
    if (typeof value === 'string') {
      safe[field] = Array.from(value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/gu, '')).slice(0, 128).join('');
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      safe[field] = value;
    }
  }
  const limit = Math.min(2048, maxBytes);
  let line = `${JSON.stringify(safe)}\n`;
  // Bound encoded bytes as well as characters, including multibyte Unicode.
  while (Buffer.byteLength(line) > limit) {
    const longest = Object.keys(safe)
      .filter((field) => typeof safe[field] === 'string' && safe[field].length)
      .sort((a, b) => Buffer.byteLength(safe[b]) - Buffer.byteLength(safe[a]))[0];
    if (!longest) throw logError('ELOGRECORDSIZE');
    safe[longest] = Array.from(safe[longest]).slice(0, -1).join('');
    line = `${JSON.stringify(safe)}\n`;
  }
  return line;
}

export function createCodexDiagnosticLog({
  filePath = fileURLToPath(new URL('../logs/codex.diagnostics.jsonl', import.meta.url)),
  maxBytes = 512 * 1024,
  warn = console.warn,
} = {}) {
  let disabled = false;
  return (record) => {
    if (disabled) return;
    let fd;
    try {
      if (!Number.isSafeInteger(maxBytes) || maxBytes < 3) throw logError('ELOGLIMIT');
      const line = encodeRecord(record, maxBytes);
      const bytes = Buffer.byteLength(line);
      fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
      const current = regularFile(filePath);
      const backup = regularFile(`${filePath}.1`);
      if ((current?.size ?? 0) > maxBytes || (backup?.size ?? 0) > maxBytes) {
        throw logError('ELOGOVERSIZE');
      }
      if (current && current.size + bytes > maxBytes) {
        fs.renameSync(filePath, `${filePath}.1`);
      }
      fd = fs.openSync(filePath, fs.constants.O_WRONLY | fs.constants.O_APPEND |
        fs.constants.O_CREAT | fs.constants.O_NOFOLLOW, 0o600);
      const opened = fs.fstatSync(fd);
      if (!opened.isFile()) throw logError('ELOGTYPE');
      if (opened.size + bytes > maxBytes) throw logError('ELOGOVERSIZE');
      fs.fchmodSync(fd, 0o600);
      fs.writeFileSync(fd, line);
    } catch (error) {
      disabled = true;
      const code = /^[A-Z0-9_]{1,32}$/.test(error?.code) ? error.code : 'ELOGWRITE';
      try { warn(`Codex diagnostic log disabled (${code})`); } catch {}
    } finally {
      if (fd !== undefined) {
        try { fs.closeSync(fd); } catch {}
      }
    }
  };
}
