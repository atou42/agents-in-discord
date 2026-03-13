import fs from 'node:fs';

export function createSingleInstanceLock({
  dataDir,
  lockFile,
  rootDir,
  ensureDir = () => {},
  safeError = (err) => err?.message || String(err),
  logger = console,
  processRef = process,
  exit = (code) => processRef.exit(code),
} = {}) {
  let lockFd = null;

  function readLockFile() {
    try {
      if (!fs.existsSync(lockFile)) return null;
      const raw = fs.readFileSync(lockFile, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        pid: toOptionalInt(parsed?.pid),
      };
    } catch {
      return null;
    }
  }

  function isProcessAlive(pid) {
    const n = Number(pid);
    if (!Number.isInteger(n) || n <= 0) return false;
    try {
      processRef.kill(n, 0);
      return true;
    } catch (err) {
      return err?.code === 'EPERM';
    }
  }

  function acquire() {
    ensureDir(dataDir);
    const lockBody = JSON.stringify({
      pid: processRef.pid,
      startedAt: new Date().toISOString(),
      root: rootDir,
    }, null, 2);

    try {
      lockFd = fs.openSync(lockFile, 'wx');
      fs.writeFileSync(lockFd, `${lockBody}\n`, 'utf8');
      logger.log(`🔒 Single-instance lock acquired: ${lockFile} (pid=${processRef.pid})`);
      return true;
    } catch (err) {
      if (err?.code !== 'EEXIST') throw err;
    }

    const existing = readLockFile();
    if (existing?.pid && isProcessAlive(existing.pid)) {
      logger.error(`⛔ Another bot instance is running (pid=${existing.pid}). Exit without takeover.`);
      exit(0);
      return false;
    }

    try {
      fs.unlinkSync(lockFile);
      lockFd = fs.openSync(lockFile, 'wx');
      fs.writeFileSync(lockFd, `${lockBody}\n`, 'utf8');
      logger.warn(`♻️ Removed stale lock and acquired new lock: ${lockFile} (pid=${processRef.pid})`);
      return true;
    } catch (err) {
      logger.error(`❌ Failed to acquire lock ${lockFile}: ${safeError(err)}`);
      exit(1);
      return false;
    }
  }

  function release() {
    if (lockFd !== null) {
      try {
        fs.closeSync(lockFd);
      } catch {
        // ignore
      }
      lockFd = null;
    }

    try {
      fs.unlinkSync(lockFile);
    } catch (err) {
      if (err?.code !== 'ENOENT') {
        logger.warn(`Failed to remove lock file ${lockFile}: ${safeError(err)}`);
      }
    }
  }

  function setupCleanupHandlers() {
    processRef.on('exit', () => {
      release();
    });

    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']) {
      processRef.on(signal, () => {
        release();
        exit(0);
      });
    }
  }

  return {
    acquire,
    release,
    setupCleanupHandlers,
    readLockFile,
    isProcessAlive,
  };
}

function toOptionalInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}
