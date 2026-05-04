import fs from 'node:fs';
import path from 'node:path';

import {
  formatProjectUpgradeReport,
  formatProjectUpgradeStatusLine,
  normalizeProjectUpgradeMode,
} from './project-upgrade.js';

export function createProjectUpgradeScheduler({
  manager,
  intervalMs = 6 * 60 * 60_000,
  initialDelayMs = 30_000,
  notifyChannelIds = [],
  getClient = () => null,
  getRuntimeSnapshots = () => [],
  requestRestart = () => false,
  stateFile = '',
  heartbeatDir = '',
  heartbeatId = `${process.pid}`,
  heartbeatIntervalMs = 10_000,
  heartbeatMaxAgeMs = 90_000,
  logger = console,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  let timer = null;
  let heartbeatTimer = null;
  let running = false;
  let stopped = false;

  function start() {
    if (!manager || timer) return stop;
    stopped = false;
    startHeartbeat();
    schedule(initialDelayMs);
    return stop;
  }

  function stop() {
    stopped = true;
    if (timer) clearTimer(timer);
    if (heartbeatTimer) clearTimer(heartbeatTimer);
    timer = null;
    heartbeatTimer = null;
  }

  function schedule(delayMs = intervalMs) {
    if (stopped) return;
    timer = setTimer(async () => {
      timer = null;
      try {
        await tick();
      } finally {
        schedule(intervalMs);
      }
    }, Math.max(1000, Number(delayMs) || intervalMs));
    timer.unref?.();
  }

  async function tick() {
    if (running || !manager) return;
    running = true;
    try {
      const config = manager.resolveConfig();
      const mode = normalizeProjectUpgradeMode(config.mode);
      if (mode === 'off') return;
      const status = await manager.check({ fetch: true });
      if (!status?.ok || !status.updateAvailable) return;
      if (mode === 'notify') {
        await notifyOnce(status);
        return;
      }
      if (hasActiveWork()) {
        await notifyOnce({
          ...status,
          canApply: false,
          reasons: [...(status.reasons || []), 'bot has running or queued work'],
        });
        return;
      }
      await notifyAll(`🧭 ${formatProjectUpgradeStatusLine(status, 'zh')}\n正在自动升级，完成后会请求重启。`);
      const result = await manager.apply({ restart: false, requireIdle: checkIdle });
      await notifyAll(formatProjectUpgradeReport(null, 'zh', { applyResult: result }));
      if (result?.ok && result.changed) requestRestart();
    } catch (err) {
      logger.warn?.(`project upgrade scheduler failed: ${String(err?.message || err)}`);
    } finally {
      running = false;
    }
  }

  async function notifyOnce(status) {
    const state = readState();
    const key = status.remoteHead || `${status.remoteVersion || ''}:${status.remoteShort || ''}`;
    if (!key || state.lastNotified === key) return;
    const sent = await notifyAll(formatProjectUpgradeReport(status, 'zh'));
    if (sent > 0) writeState({ ...state, lastNotified: key, lastNotifiedAt: new Date().toISOString() });
  }

  async function notifyAll(content) {
    const ids = [...new Set(notifyChannelIds.map((id) => String(id || '').trim()).filter(Boolean))];
    if (!ids.length) return 0;
    const client = getClient();
    if (!client?.channels?.fetch) return 0;
    const results = await Promise.all(ids.map(async (id) => {
      try {
        const channel = await client.channels.fetch(id);
        if (channel?.send) {
          await channel.send({ content });
          return true;
        }
      } catch (err) {
        logger.warn?.(`project upgrade notify failed for ${id}: ${String(err?.message || err)}`);
      }
      return false;
    }));
    return results.filter(Boolean).length;
  }

  function hasActiveWork() {
    return !checkIdle().ok;
  }

  function checkIdle() {
    const snapshots = getRuntimeSnapshots() || [];
    const peerHeartbeats = readPeerHeartbeats();
    const busyHeartbeat = peerHeartbeats.find((item) => item.busy);
    if (busyHeartbeat) {
      return {
        ok: false,
        error: `bot has running or queued work in ${busyHeartbeat.id || 'another process'}`,
      };
    }
    const busy = snapshots.find((item) => item?.running || Number(item?.queued || 0) > 0);
    if (!busy) return { ok: true };
    return {
      ok: false,
      error: `bot has running or queued work in ${busy.key || 'a channel'}`,
    };
  }

  function startHeartbeat() {
    if (!heartbeatDir || heartbeatTimer) return;
    const beat = () => {
      writeHeartbeat();
      heartbeatTimer = setTimer(beat, Math.max(1000, Number(heartbeatIntervalMs) || 10_000));
      heartbeatTimer.unref?.();
    };
    beat();
  }

  function writeHeartbeat() {
    if (!heartbeatDir) return;
    const snapshots = getRuntimeSnapshots() || [];
    const busy = snapshots.some((item) => item?.running || Number(item?.queued || 0) > 0);
    const body = {
      id: heartbeatId,
      pid: process.pid,
      busy,
      updatedAt: Date.now(),
    };
    try {
      fs.mkdirSync(heartbeatDir, { recursive: true });
      fs.writeFileSync(path.join(heartbeatDir, `${sanitizeFileName(heartbeatId)}.json`), `${JSON.stringify(body, null, 2)}\n`, 'utf8');
    } catch (err) {
      logger.warn?.(`project upgrade heartbeat failed: ${String(err?.message || err)}`);
    }
  }

  function readPeerHeartbeats() {
    if (!heartbeatDir) return [];
    let entries = [];
    try {
      entries = fs.readdirSync(heartbeatDir);
    } catch {
      return [];
    }
    const now = Date.now();
    return entries.filter((name) => name.endsWith('.json')).map((name) => {
      try {
        const item = JSON.parse(fs.readFileSync(path.join(heartbeatDir, name), 'utf8'));
        const age = now - Number(item.updatedAt || 0);
        if (age < 0 || age > heartbeatMaxAgeMs) return null;
        return item;
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  function readState() {
    if (!stateFile) return {};
    try {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch {
      return {};
    }
  }

  function writeState(state) {
    if (!stateFile) return;
    try {
      fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    } catch {
      // ignore
    }
    fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  return {
    start,
    stop,
    tick,
  };
}

function sanitizeFileName(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_.-]+/g, '_') || 'unknown';
}
