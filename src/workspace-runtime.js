import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch (err) {
    return err?.code === 'EPERM';
  }
}

function normalizeWorkspaceKey(workspaceDir) {
  const resolved = path.resolve(String(workspaceDir || ''));
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

function hashWorkspaceKey(key) {
  return createHash('sha1').update(String(key || '')).digest('hex');
}

export function createWorkspaceRuntime({
  lockRoot,
  ensureDir,
  pollIntervalMs = 600,
  malformedLockStaleMs = 30_000,
} = {}) {
  const normalizedMalformedLockStaleMs = Number.isFinite(Number(malformedLockStaleMs))
    ? Math.max(0, Number(malformedLockStaleMs))
    : 30_000;

  function getLockFilePath(workspaceDir) {
    const key = normalizeWorkspaceKey(workspaceDir);
    return {
      workspaceKey: key,
      lockFile: path.join(lockRoot, `${hashWorkspaceKey(key)}.json`),
    };
  }

  function readLock(workspaceDir) {
    const { workspaceKey, lockFile } = getLockFilePath(workspaceDir);
    try {
      if (!fs.existsSync(lockFile)) return { workspaceKey, lockFile, owner: null };
      const raw = fs.readFileSync(lockFile, 'utf8');
      const owner = JSON.parse(raw);
      if (!owner || typeof owner !== 'object') {
        return { workspaceKey, lockFile, owner: null, malformed: true };
      }
      return { workspaceKey, lockFile, owner, malformed: false };
    } catch {
      return { workspaceKey, lockFile, owner: null, malformed: true };
    }
  }

  function archiveMalformedLock(lockFile) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveFile = `${lockFile}.corrupt-${timestamp}-${process.pid}`;
    fs.renameSync(lockFile, archiveFile);
    return archiveFile;
  }

  function getLockAgeMs(lockFile) {
    try {
      const stat = fs.statSync(lockFile);
      return Date.now() - stat.mtimeMs;
    } catch {
      return null;
    }
  }

  async function acquireWorkspace(workspaceDir, owner = {}, options = {}) {
    const isAborted = typeof options.isAborted === 'function' ? options.isAborted : () => false;
    const onWait = typeof options.onWait === 'function' ? options.onWait : null;
    const { workspaceKey, lockFile } = getLockFilePath(workspaceDir);
    const token = randomUUID();

    ensureDir(lockRoot);
    let waitNotified = false;
    let fd = null;

    while (true) {
      if (isAborted()) {
        return {
          acquired: false,
          aborted: true,
          workspaceKey,
          workspaceDir: workspaceKey,
          lockFile,
        };
      }

      try {
        fd = fs.openSync(lockFile, 'wx');
        const lockBody = {
          token,
          pid: process.pid,
          workspaceDir: workspaceKey,
          acquiredAt: new Date().toISOString(),
          ...owner,
        };
        try {
          fs.writeFileSync(fd, `${JSON.stringify(lockBody, null, 2)}\n`, 'utf8');
        } catch (writeErr) {
          try {
            fs.closeSync(fd);
          } catch {
          }
          fd = null;
          try {
            fs.unlinkSync(lockFile);
          } catch {
          }
          throw writeErr;
        }
        return {
          acquired: true,
          aborted: false,
          workspaceKey,
          workspaceDir: workspaceKey,
          lockFile,
          owner: lockBody,
          release() {
            try {
              if (fd !== null) fs.closeSync(fd);
            } catch {
            }
            fd = null;
            try {
              const current = fs.existsSync(lockFile)
                ? JSON.parse(fs.readFileSync(lockFile, 'utf8'))
                : null;
              if (!current || current.token === token) {
                fs.unlinkSync(lockFile);
              }
            } catch (err) {
              if (err?.code !== 'ENOENT') {
                throw err;
              }
            }
          },
        };
      } catch (err) {
        if (err?.code !== 'EEXIST') throw err;
      }

      const existing = readLock(workspaceKey);
      const existingOwner = existing.owner;
      if (existing.malformed) {
        const ageMs = getLockAgeMs(lockFile);
        if (ageMs !== null && ageMs >= normalizedMalformedLockStaleMs) {
          try {
            archiveMalformedLock(lockFile);
            continue;
          } catch {
          }
        }
      }
      if (existingOwner?.pid && !isProcessAlive(existingOwner.pid)) {
        try {
          fs.unlinkSync(lockFile);
          continue;
        } catch {
        }
      }

      if (!waitNotified && onWait) {
        waitNotified = true;
        onWait({
          workspaceKey,
          workspaceDir: workspaceKey,
          owner: existingOwner,
          lockFile,
        });
      }

      await sleep(pollIntervalMs);
    }
  }

  return {
    acquireWorkspace,
    readLock,
  };
}
