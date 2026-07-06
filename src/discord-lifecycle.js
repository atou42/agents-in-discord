export function isRecoverableGatewayCloseCode(code) {
  const n = Number(code);
  if (!Number.isFinite(n)) return true;
  if ([4004, 4010, 4011, 4012, 4013, 4014].includes(n)) return false;
  return true;
}

export function isInvalidTokenError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('invalid token');
}

export function isIgnorableDiscordRuntimeError(err) {
  const code = Number(err?.code);
  if (code === 10062 || code === 40060) return true;

  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('unknown interaction') || msg.includes('interaction has already been acknowledged');
}

export function isTransientDiscordNetworkError(err) {
  const code = String(err?.code || err?.cause?.code || '').trim().toUpperCase();
  if ([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
  ].includes(code)) {
    return true;
  }

  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('connect timeout error')
    || msg.includes('client network socket disconnected before secure tls connection was established')
    || msg.includes('opening handshake has timed out')
    || msg.includes('websocket is not open: readystate 0 (connecting)')
    || msg.includes('websocket was closed before the connection was established')
    || msg.includes('socket hang up')
    || msg.includes('econnrefused')
    || msg.includes('econnreset')
    || msg.includes('etimedout')
    || msg.includes('proxy connection timed out')
    || msg.includes('proxy refused')
    || msg.includes('not enough sessions remaining to spawn');
}

export function createDiscordLifecycle({
  selfHealEnabled = true,
  restartDelayMs = 5000,
  maxLoginBackoffMs = 60000,
  maxSelfHealRestartsPerWindow = 10,
  selfHealWindowMs = 15 * 60_000,
  discordToken,
  createClient,
  bindClientHandlers,
  cancelAllChannelWork = () => {},
  safeError = (err) => err?.message || String(err),
  logger = console,
  processRef = process,
  sleep = defaultSleep,
  setTimeoutFn = setTimeout,
  nowFn = Date.now,
} = {}) {
  let client = null;
  let selfHealTimer = null;
  let selfHealInFlight = false;
  const selfHealRestartTimestamps = [];

  function pruneSelfHealRestartTimestamps(now = nowFn()) {
    const cutoff = now - Math.max(1000, selfHealWindowMs);
    while (selfHealRestartTimestamps.length && selfHealRestartTimestamps[0] < cutoff) {
      selfHealRestartTimestamps.shift();
    }
  }

  function hasSelfHealCapacity(now = nowFn()) {
    pruneSelfHealRestartTimestamps(now);
    return selfHealRestartTimestamps.length < Math.max(1, maxSelfHealRestartsPerWindow);
  }

  async function loginClientWithRetry(bot, reason) {
    if (!selfHealEnabled) {
      await bot.login(discordToken);
      return;
    }

    let attempt = 0;
    const baseDelay = Math.max(1000, restartDelayMs);
    const maxDelay = Math.max(baseDelay, maxLoginBackoffMs);

    while (true) {
      attempt += 1;
      try {
        await bot.login(discordToken);
        if (attempt > 1) {
          logger.log(`✅ Discord reconnect success after ${attempt} attempts (reason=${reason}).`);
        }
        return;
      } catch (err) {
        if (isInvalidTokenError(err)) {
          throw err;
        }

        const delay = Math.min(maxDelay, baseDelay * (2 ** Math.min(10, attempt - 1)));
        logger.error(`Discord login failed (reason=${reason}, attempt=${attempt}): ${safeError(err)}; retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  async function bootClient(reason) {
    if (!client) {
      client = createClient();
      bindClientHandlers(client, lifecycleApi);
    }
    await loginClientWithRetry(client, reason);
    return client;
  }

  function scheduleSelfHeal(reason, err = null) {
    if (!selfHealEnabled) return;
    if (err && isInvalidTokenError(err)) {
      logger.error('❌ Discord token invalid. Self-heal skipped; please fix DISCORD_TOKEN.');
      return;
    }
    if (err && isTransientDiscordNetworkError(err)) {
      logger.warn(`🌐 Transient Discord network error (${reason}). Self-heal skipped: ${safeError(err)}`);
      return;
    }
    if (selfHealInFlight || selfHealTimer) return;
    if (!hasSelfHealCapacity()) {
      logger.error(`🛑 Self-heal paused after ${selfHealRestartTimestamps.length} restarts within ${Math.round(selfHealWindowMs / 60000)} minutes. Fix network/proxy first, then restart manually.`);
      return;
    }

    if (err) {
      logger.error(`♻️ Self-heal triggered by ${reason}:`, safeError(err));
    } else {
      logger.error(`♻️ Self-heal triggered by ${reason}.`);
    }

    const delay = Math.max(1000, restartDelayMs);
    selfHealTimer = setTimeoutFn(() => {
      selfHealTimer = null;
      restartClient(reason).catch((restartErr) => {
        logger.error('Self-heal restart failed:', restartErr);
        scheduleSelfHeal('restart_failed', restartErr);
      });
    }, delay);
    selfHealTimer?.unref?.();
  }

  async function restartClient(reason) {
    if (!selfHealEnabled) return;
    if (selfHealInFlight) return;

    selfHealInFlight = true;
    pruneSelfHealRestartTimestamps();
    selfHealRestartTimestamps.push(nowFn());

    try {
      if (client) {
        client.removeAllListeners();
        client.destroy();
      }
    } catch (err) {
      logger.error('Failed to destroy previous Discord client:', safeError(err));
    }

    client = createClient();
    bindClientHandlers(client, lifecycleApi);

    try {
      await loginClientWithRetry(client, `self_heal:${reason}`);
      logger.log(`✅ Self-heal recovered (reason=${reason}).`);
    } finally {
      selfHealInFlight = false;
    }
  }

  function setupProcessSelfHeal() {
    if (!selfHealEnabled) return;

    processRef.on('unhandledRejection', (reason) => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      if (isIgnorableDiscordRuntimeError(err)) {
        logger.warn(`Ignoring non-fatal unhandled rejection: ${safeError(err)}`);
        return;
      }
      if (isTransientDiscordNetworkError(err)) {
        logger.warn(`Ignoring transient Discord network rejection: ${safeError(err)}`);
        return;
      }
      logger.error('Unhandled rejection:', err);
      if (isInvalidTokenError(err)) return;
      scheduleSelfHeal('unhandled_rejection', err);
    });

    processRef.on('uncaughtException', (err) => {
      if (isIgnorableDiscordRuntimeError(err)) {
        logger.warn(`Ignoring non-fatal uncaught exception: ${safeError(err)}`);
        return;
      }
      if (isTransientDiscordNetworkError(err)) {
        logger.warn(`Ignoring transient Discord network exception: ${safeError(err)}`);
        return;
      }
      logger.error('Uncaught exception:', err);
      if (isInvalidTokenError(err)) return;
      scheduleSelfHeal('uncaught_exception', err);
    });
  }

  const lifecycleApi = {
    bootClient,
    loginClientWithRetry,
    scheduleSelfHeal,
    restartClient,
    setupProcessSelfHeal,
    getClient: () => client,
  };

  return lifecycleApi;
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
