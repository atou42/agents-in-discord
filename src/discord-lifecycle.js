export function isRecoverableGatewayCloseCode(code) {
  const n = Number(code);
  if (!Number.isFinite(n)) return true;
  if ([4004, 4010, 4011, 4012, 4013, 4014].includes(n)) return false;
  return true;
}

export function isInvalidTokenError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return err?.code === 'TokenInvalid' || Number(err?.code) === 4004
    || msg.includes('invalid token') || msg.includes('authentication failed');
}

export function isTerminalDiscordError(err) {
  return isInvalidTokenError(err)
    || (err?.code === 'DISCORD_GATEWAY_COOLDOWN' && (!Number.isSafeInteger(err.retryAt) || err.retryAt < 0))
    || ['DISCORD_GATEWAY_BLOCKED', 'ENOSPC', 'EDQUOT', 'EROFS'].includes(err?.code)
    || [4010, 4011, 4012, 4013, 4014].includes(Number(err?.code))
    || /^(Invalid shard|Sharding is required|Used an invalid API version|Used invalid intents|Used disallowed intents)$/.test(err?.message || '');
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
  maxLoginAttempts = 6,
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
  clearTimeoutFn = clearTimeout,
  nowFn = Date.now,
} = {}) {
  let client = null;
  let selfHealTimer = null;
  let selfHealInFlight = false;
  let loginInFlight = false;
  let terminalError = null;
  let cooldownError = null;
  let recovery = null;
  let wakeRecovery = null;
  let disposedClient = null;
  let disposal = null;
  const selfHealRestartTimestamps = [];

  function pruneSelfHealRestartTimestamps(now = nowFn()) {
    const cutoff = now - Math.max(1000, selfHealWindowMs);
    while (selfHealRestartTimestamps.length && selfHealRestartTimestamps[0] <= cutoff) {
      selfHealRestartTimestamps.shift();
    }
  }

  function stopClient() {
    if (!client) return Promise.resolve();
    if (disposedClient !== client) {
      disposedClient = client;
      const oldClient = client;
      disposal = Promise.resolve().then(async () => {
        await oldClient.destroy();
        oldClient.removeAllListeners?.();
      }).catch(err => {
        terminalError = Object.assign(new Error(`Failed to destroy previous Discord client: ${safeError(err)}`, { cause: err }), { code: 'DISCORD_GATEWAY_BLOCKED' });
        throw terminalError;
      });
    }
    return disposal;
  }

  function recoverAfterCooldown(reason, err) {
    if (!cooldownError || err.retryAt > cooldownError.retryAt) cooldownError = err;
    if (recovery) return recovery;
    if (selfHealTimer) clearTimeoutFn(selfHealTimer);
    selfHealTimer = null;
    recovery = Promise.resolve().then(async () => {
      while (true) {
        await stopClient();
        if (terminalError) throw terminalError;
        const retryAt = Math.max(cooldownError.retryAt, hasSelfHealCapacity() ? 0
          : selfHealRestartTimestamps[0] + Math.max(1000, selfHealWindowMs));
        const delay = Math.max(retryAt - nowFn(), loginInFlight || selfHealInFlight ? 1000 : 0);
        if (delay > 0) {
          logger.warn(`Discord cooling down (${reason}) until ${new Date(nowFn() + delay).toISOString()}`);
          await new Promise(resolve => {
            wakeRecovery = resolve;
            selfHealTimer = setTimeoutFn(() => {
              selfHealTimer = null;
              wakeRecovery = null;
              resolve();
            }, Math.min(delay, 2_147_483_647));
          });
          continue;
        }
        cooldownError = null;
        selfHealRestartTimestamps.push(nowFn());
        client = createClient();
        bindClientHandlers(client, lifecycleApi);
        try {
          await loginClientWithRetry(client, `cooldown:${reason}`);
          logger.log(`Discord cooldown recovered (reason=${reason}).`);
          return client;
        } catch (error) {
          if (isTerminalDiscordError(error)) {
            await stopClient();
            throw error;
          }
          if (error?.code === 'DISCORD_GATEWAY_COOLDOWN') cooldownError = error;
          else if (isTransientDiscordNetworkError(error)) {
            cooldownError = { retryAt: nowFn() + Math.max(1000, restartDelayMs) };
          } else throw error;
        }
      }
    }).finally(() => { recovery = null; });
    recovery.catch(error => logger.error('Discord cooldown recovery failed:', safeError(error)));
    return recovery;
  }

  function hasSelfHealCapacity(now = nowFn()) {
    pruneSelfHealRestartTimestamps(now);
    return selfHealRestartTimestamps.length < Math.max(1, maxSelfHealRestartsPerWindow);
  }

  async function loginClientWithRetry(bot, reason) {
    if (terminalError) throw terminalError;
    loginInFlight = true;
    try {
      let attempt = 0;
      const baseDelay = Math.max(1000, restartDelayMs);
      const maxDelay = Math.max(baseDelay, maxLoginBackoffMs);

      while (true) {
        if (terminalError) throw terminalError;
        if (cooldownError) throw cooldownError;
        attempt += 1;
        try {
          await bot.login(discordToken);
          if (terminalError) throw terminalError;
          if (cooldownError) throw cooldownError;
          if (attempt > 1) {
            logger.log(`✅ Discord reconnect success after ${attempt} attempts (reason=${reason}).`);
          }
          return;
        } catch (err) {
          if (terminalError) throw terminalError;
          if (isTerminalDiscordError(err)) {
            terminalError = err;
            throw err;
          }
          if (err?.code === 'DISCORD_GATEWAY_COOLDOWN') throw err;
          if (!selfHealEnabled) throw err;
          if (attempt >= maxLoginAttempts) {
            // Let the supervisor retry a network outage without clearing safety blocks.
            if (isTransientDiscordNetworkError(err)) throw err;
            terminalError = Object.assign(new Error(`Discord login paused after ${attempt} failures: ${safeError(err)}`, { cause: err }), { code: 'DISCORD_GATEWAY_BLOCKED' });
            throw terminalError;
          }
          const delay = Math.min(maxDelay, baseDelay * (2 ** Math.min(10, attempt - 1)));
          logger.error(`Discord login failed (reason=${reason}, attempt=${attempt}): ${safeError(err)}; retrying in ${delay}ms`);
          await sleep(delay);
        }
      }
    } finally {
      loginInFlight = false;
    }
  }

  async function bootClient(reason) {
    if (recovery) return recovery;
    if (!client) {
      client = createClient();
      bindClientHandlers(client, lifecycleApi);
    }
    try {
      await loginClientWithRetry(client, reason);
    } catch (err) {
      if (selfHealEnabled && err?.code === 'DISCORD_GATEWAY_COOLDOWN' && !isTerminalDiscordError(err)) {
        return recoverAfterCooldown(reason, err);
      }
      throw err;
    }
    return client;
  }

  function scheduleSelfHeal(reason, err = null) {
    if (terminalError) return;
    if (err && isTerminalDiscordError(err)) {
      terminalError = err;
      if (selfHealTimer) clearTimeoutFn(selfHealTimer);
      selfHealTimer = null;
      wakeRecovery?.();
      wakeRecovery = null;
      // Stop the gateway but leave ongoing agent/channel work alone.
      stopClient().catch(destroyErr => {
        logger.error('Failed to stop paused Discord client:', safeError(destroyErr));
      });
      logger.error(`[${new Date(nowFn()).toISOString()}] Discord paused (${reason}); manual intervention required: ${safeError(err)}`);
      return;
    }
    if (!selfHealEnabled) return;
    if (err?.code === 'DISCORD_GATEWAY_COOLDOWN') {
      recoverAfterCooldown(reason, err);
      return;
    }
    if (recovery) return;
    if (err && isTransientDiscordNetworkError(err)) {
      logger.warn(`🌐 Transient Discord network error (${reason}). Self-heal skipped: ${safeError(err)}`);
      return;
    }
    if (selfHealInFlight || selfHealTimer || loginInFlight) return;
    if (!hasSelfHealCapacity()) {
      recoverAfterCooldown(reason, { retryAt: selfHealRestartTimestamps[0] + Math.max(1000, selfHealWindowMs) });
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
    if (terminalError) throw terminalError;
    if (!selfHealEnabled) return;
    if (recovery) return recovery;
    if (selfHealInFlight || loginInFlight || !hasSelfHealCapacity()) return;

    selfHealInFlight = true;
    pruneSelfHealRestartTimestamps();
    selfHealRestartTimestamps.push(nowFn());

    try {
      await stopClient();
      if (terminalError) throw terminalError;
      if (cooldownError) return recoverAfterCooldown(reason, cooldownError);
      client = createClient();
      bindClientHandlers(client, lifecycleApi);
      await loginClientWithRetry(client, `self_heal:${reason}`);
      logger.log(`✅ Self-heal recovered (reason=${reason}).`);
    } catch (err) {
      if (err?.code === 'DISCORD_GATEWAY_COOLDOWN' && !isTerminalDiscordError(err)) return recoverAfterCooldown(reason, err);
      if (!terminalError && isTransientDiscordNetworkError(err)) {
        return recoverAfterCooldown(reason, { retryAt: nowFn() + Math.max(1000, restartDelayMs) });
      }
      throw err;
    } finally {
      selfHealInFlight = false;
    }
  }

  function setupProcessSelfHeal() {
    processRef.on('unhandledRejection', (reason) => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      if (isTerminalDiscordError(err)) {
        scheduleSelfHeal('unhandled_rejection', err);
        return;
      }
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
      if (isTerminalDiscordError(err)) {
        scheduleSelfHeal('uncaught_exception', err);
        return;
      }
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
    getTerminalError: () => terminalError,
  };

  return lifecycleApi;
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
