import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { connectMirasim, readMirasimCatalog, readMirasimHarnesses, listMirasimSessions, MIRASIM_DEFAULT_MODEL, MIRASIM_DEFAULT_EFFORT } from './mirasim-client.js';

export function applyMirasimPatch(snapshot, patch) {
  if (!patch || typeof patch !== 'object') throw new Error('Invalid Mirasim session patch');
  const next = patch.full ? { ...patch.full } : { ...snapshot, ...patch.set };
  if (patch.appendText !== undefined) next.text = (next.text || '') + patch.appendText;
  if (patch.appendReasoning !== undefined) next.reasoning = (next.reasoning || '') + patch.appendReasoning;
  return next;
}

export function createMirasimRunner({
  spawnEnv = process.env, getSessionId = (s) => s?.runnerSessionId,
  resolveModelSetting = () => ({}), resolveReasoningEffortSetting = () => ({}),
  resolveMirasimHarnessSetting = (s) => ({ value: s?.mirasimHarness || 'claude' }),
  resolveTimeoutSetting = () => ({ timeoutMs: 0 }),
  connect = connectMirasim, readCatalog = readMirasimCatalog, listSessions = listMirasimSessions,
  readHarnesses = readMirasimHarnesses,
  startupTimeoutMs = 30000, stopTimeoutMs = 10000,
} = {}) {
  const active = new Map();

  async function runTask({ session, sessionKey, workspaceDir, prompt, systemPrompt = '', inputImages = [],
    onSpawn, onThreadReady, onEvent, onLog, wasCancelled = () => false }) {
    const key = sessionKey || randomUUID();
    const base = { ok: false, cancelled: false, timedOut: false, retryable: false, logs: [], messages: [], finalAnswerMessages: [], reasonings: [], usage: null, threadId: getSessionId(session) || null, meta: {} };
    if (active.has(key)) return { ...base, error: 'Mirasim channel already has an active turn' };
    let cancelled = false;
    const control = new EventEmitter();
    control.exitCode = null;
    control.kill = () => { cancelled = true; return true; };
    active.set(key, control);
    try {
      onSpawn?.(control);
      if (session?.modeOverride) throw new Error('Mirasim permissions are managed in its desktop app; reset the channel mode override');
      const agent = resolveMirasimHarnessSetting(session).value;
      const inventory = await readHarnesses({ env: spawnEnv, connect });
      const harness = inventory.agents.find((a) => a.id === agent && a.installed);
      if (!harness) throw new Error(`Mirasim harness is unavailable: ${agent}`);
      const catalog = await readCatalog({ env: spawnEnv, connect, agent });
      const modelSetting = resolveModelSetting(session) || {};
      const effortSetting = resolveReasoningEffortSetting(session) || {};
      const model = (agent !== 'claude' && modelSetting.source === 'provider' ? catalog.defaultModel : modelSetting.value)
        || (agent === 'claude' ? MIRASIM_DEFAULT_MODEL : catalog.defaultModel) || undefined;
      const choice = catalog.models.find((m) => m.slug === model);
      if (model && !choice) throw new Error(`Mirasim model is unavailable: ${model}`);
      const effortLevels = choice?.supportedReasoningLevels || (catalog.models.length ? [] : (catalog.effort || []).filter((e) => !e.unavailable).map((e) => e.id));
      const defaultEffort = effortLevels.length ? (agent === 'claude' ? MIRASIM_DEFAULT_EFFORT : catalog.defaultEffort) : undefined;
      const effort = effortSetting.source === 'provider'
        ? (effortLevels.length ? (agent === 'claude' ? effortSetting.value || defaultEffort : defaultEffort) : undefined)
        : effortSetting.value || defaultEffort;
      if (effort && !effortLevels.includes(effort)) throw new Error(`Mirasim effort ${effort} is unavailable for ${model}`);
      if (base.threadId) {
        if (!harness.capabilities.resume) throw new Error(`Mirasim ${agent} cannot resume sessions`);
        if (!base.threadId.startsWith(`${agent}:`) || !/^[a-z][a-z0-9_-]*:[a-zA-Z0-9_-]+$/.test(base.threadId)) throw new Error(`Invalid Mirasim session key; expected ${agent}:<id>; start a new session`);
        const rows = await listSessions(workspaceDir, { env: spawnEnv, connect, agent });
        const existing = rows.find((s) => s.sessionKey === base.threadId);
        if (!existing || !existing.workdir || fs.realpathSync(existing.workdir) !== fs.realpathSync(workspaceDir)) {
          throw new Error('Mirasim session is missing or belongs to another workspace; start a new session');
        }
        if (['running', 'awaiting_input', 'waiting'].includes(existing.runState)) throw new Error('Mirasim session is busy in the desktop app');
      }
      if (cancelled || wasCancelled()) return { ...base, cancelled: true, error: 'Cancelled before submission' };
      const attachments = inputImages.map((file) => {
        const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }[path.extname(file).toLowerCase()];
        if (!mime) throw new Error('Unsupported Mirasim image attachment');
        return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
      });
      return await new Promise((resolve) => {
        let ws, settled = false, sent = false, accepted = false, taskId = null, snapshot = {}, seq = 0;
        let timedOut = false, stopSent = false, stopTimer;
        const clientRef = randomUUID();
        const finish = (error = '', extra = {}) => {
          if (settled) return;
          settled = true;
          clearTimeout(startTimer); clearTimeout(runTimer); clearTimeout(stopTimer); clearInterval(poll);
          if (ws?.readyState === 0) ws.terminate(); else ws?.close();
          const text = String(snapshot.text || '').trim();
          resolve({ ...base, threadId: base.threadId, ok: !error, error, cancelled, timedOut,
            messages: text ? [text] : [], finalAnswerMessages: !error && text ? [text] : [],
            reasonings: snapshot.reasoning ? [snapshot.reasoning] : [],
            usage: snapshot.usage ? { ...snapshot.usage, cache_read_input_tokens: snapshot.usage.cachedInputTokens } : null,
            meta: { model: snapshot.model || model, harness: agent }, ...extra });
        };
        const send = (frame) => ws.send(JSON.stringify(frame));
        const stop = () => {
          if (stopSent || settled) return;
          if (!sent) { finish(timedOut ? 'Mirasim timed out before submission' : 'Cancelled before submission'); return; }
          if (!accepted) return;
          stopSent = true;
          send({ type: 'stop', sessionKey: base.threadId });
          stopTimer = setTimeout(() => finish('Mirasim stop was not confirmed; check the desktop app before resubmitting'), stopTimeoutMs);
        };
        const startTimer = setTimeout(() => finish(sent
          ? 'Mirasim acceptance timed out; submission outcome unknown, check the desktop app before resubmitting'
          : 'Mirasim connection timed out'), startupTimeoutMs);
        const timeoutMs = resolveTimeoutSetting(session)?.timeoutMs || 0;
        const runTimer = timeoutMs > 0 ? setTimeout(() => { timedOut = true; stop(); }, timeoutMs) : null;
        const poll = setInterval(() => { if (wasCancelled()) cancelled = true; if (cancelled || timedOut) stop(); }, 100);
        try { ws = connect({ env: spawnEnv }); } catch (error) { finish(error.message); return; }
        ws.on('open', () => {
          if (cancelled || timedOut) { stop(); return; }
          sent = true;
          send({ type: 'prompt', clientRef, sessionKey: base.threadId || undefined, agent, model, effort,
            workdir: workspaceDir, prompt: [systemPrompt, prompt].filter(Boolean).join('\n\n'), attachments });
        });
        ws.on('message', (bytes) => {
          try {
            const message = JSON.parse(String(bytes));
            if (message.type === 'error' && (!message.clientRef || message.clientRef === clientRef)) {
              finish('Mirasim rejected the task; check desktop login, model access and permissions'); return;
            }
            if (message.type === 'accepted' && message.clientRef === clientRef) {
              if (!message.sessionKey?.startsWith(`${agent}:`)) throw new Error('Invalid Mirasim accepted session');
              if (base.threadId && base.threadId !== message.sessionKey) {
                send(message.taskId ? { type: 'stop', sessionKey: message.sessionKey }
                  : { type: 'recall', sessionKey: message.sessionKey, ref: clientRef });
                finish('Mirasim unexpectedly changed the bound session; refused to adopt it'); return;
              }
              base.threadId = message.sessionKey;
              onThreadReady?.(base.threadId);
              if (!message.taskId) {
                send({ type: 'recall', sessionKey: base.threadId, ref: clientRef });
                finish('Mirasim session became busy; queued request recall sent, check desktop before resubmitting'); return;
              }
              accepted = true; taskId = message.taskId; clearTimeout(startTimer);
              if (cancelled || timedOut) stop();
              return;
            }
            if (!accepted || message.sessionKey !== base.threadId) return;
            if (message.type === 'snapshot') {
              if (message.seq < seq) return;
              snapshot = message.snapshot; seq = message.seq;
            } else if (message.type === 'session') {
              if (message.seq <= seq) return;
              if ((message.fromSeq ?? message.seq - 1) !== seq) {
                send({ type: 'subscribe', sessionKey: base.threadId }); return;
              }
              snapshot = applyMirasimPatch(snapshot, message.patch); seq = message.seq;
            } else return;
            if (snapshot.taskId !== taskId) return;
            if (snapshot.activity) onLog?.(snapshot.activity);
            if (snapshot.text) onEvent?.({ type: 'item.updated', item: { type: 'agent_message', text: snapshot.text } });
            if (snapshot.interactions?.length || ['awaiting_input', 'waiting_input'].includes(snapshot.phase)) {
              onLog?.('Mirasim requires input in its desktop app');
            }
            if (snapshot.phase === 'done') {
              finish(cancelled ? 'Cancelled' : timedOut ? 'Mirasim task timed out' : snapshot.error || snapshot.incomplete
                ? 'Mirasim turn ended with an error or incomplete output' : !String(snapshot.text || '').trim()
                  ? 'Mirasim completed without assistant output' : '');
            } else if (['idle', 'error', 'failed', 'stopped', 'cancelled'].includes(snapshot.phase)) {
              finish(cancelled ? 'Cancelled' : timedOut ? 'Mirasim task timed out' : 'Mirasim turn did not complete successfully');
            }
          } catch { finish('Mirasim protocol failure; check the desktop app before resubmitting'); }
        });
        ws.on('error', () => finish('Mirasim local connection failed; check the desktop app'));
        ws.on('close', () => finish(sent ? 'Mirasim disconnected; task outcome unknown, check the desktop app before resubmitting' : 'Mirasim disconnected'));
      });
    } catch (error) { return { ...base, cancelled, error: error.message }; }
    finally { active.delete(key); control.exitCode = 0; control.emit('exit', 0); }
  }

  return { runTask,
    closeSession(key) { const task = active.get(key); task?.kill(); return Boolean(task); },
    closeAll() { const count = active.size; for (const task of active.values()) task.kill(); return count; },
  };
}
