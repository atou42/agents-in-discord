import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

export const MIRASIM_DEFAULT_MODEL = 'claude-opus-5-5[1m]';
export const MIRASIM_DEFAULT_EFFORT = 'high';
export const MIRASIM_DEFAULT_HARNESS = 'claude';

export async function readMirasimHarnesses(options = {}) {
  const result = await mirasimRequest({ type: 'ready' }, (m) => m.type === 'init', options);
  if (!Array.isArray(result.agents) || result.agents.some((a) => !/^[a-z][a-z0-9_-]*$/.test(a.id) || typeof a.installed !== 'boolean')) {
    throw new Error('Mirasim harness inventory is malformed');
  }
  return { agents: result.agents.map(({ id, label, installed, capabilities }) => ({ id, label: label || id, installed, capabilities: capabilities || {} })), error: null };
}

export function mirasimConnectionOptions(env = process.env) {
  const url = new URL(env.MIRASIM_URL || 'ws://127.0.0.1:4970/ws');
  if (url.protocol !== 'ws:' || !['127.0.0.1', '[::1]'].includes(url.hostname)
    || url.pathname !== '/ws' || url.search || url.username || url.password || url.hash) {
    throw new Error('MIRASIM_URL must be a loopback ws://127.0.0.1:<port>/ws endpoint');
  }
  const tokenFile = env.MIRASIM_TOKEN_FILE || path.join(env.HOME || os.homedir(), '.mirasim', 'run', `local-${url.port || 80}.token`);
  let token;
  try { token = fs.readFileSync(tokenFile, 'utf8').trim(); }
  catch (error) { throw new Error(`Cannot read Mirasim local token (${error.code}); open and sign in to the desktop app`); }
  if (!token) throw new Error('Mirasim local token is empty');
  url.searchParams.set('token', token);
  return { url, token };
}

export function connectMirasim({ env = process.env, WebSocketImpl = WebSocket } = {}) {
  const { url } = mirasimConnectionOptions(env);
  // This local connection must not inherit the Discord proxy or follow redirects with its token.
  return new WebSocketImpl(url, { agent: false, followRedirects: false, handshakeTimeout: 10000, maxPayload: 16 * 1024 * 1024 });
}

export function mirasimRequest(frame, accepts, { env = process.env, connect = connectMirasim, timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    let ws;
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (ws?.readyState === 0) ws.terminate();
      else ws?.close();
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error('Mirasim local request timed out')), timeoutMs);
    try { ws = connect({ env }); } catch (error) { finish(error); return; }
    ws.on('open', () => ws.send(JSON.stringify(frame)));
    ws.on('message', (bytes) => {
      try {
        const message = JSON.parse(String(bytes));
        if (message.type === 'error') finish(new Error('Mirasim rejected the local request'));
        else if (accepts(message)) finish(null, message);
      } catch { finish(new Error('Invalid Mirasim response')); }
    });
    ws.on('error', () => finish(new Error('Cannot connect to Mirasim; open and sign in to the desktop app')));
    ws.on('close', () => finish(new Error('Mirasim disconnected before replying')));
  });
}

export async function readMirasimCatalog(options = {}) {
  const agent = options.agent || MIRASIM_DEFAULT_HARNESS;
  const catalog = await mirasimRequest({ type: 'getCatalog', agent }, (m) => m.type === 'catalog' && m.agent === agent, options);
  if (!Array.isArray(catalog.models) || catalog.models.some((m) => !m.id)) {
    throw new Error('Mirasim model catalog is malformed');
  }
  return {
    ...catalog,
    models: catalog.models.map((model) => ({
      ...model, slug: model.id, displayName: model.label || model.id,
      supportedReasoningLevels: (catalog.effortByModel?.[model.id] || catalog.effort || [])
        .filter((level) => !level.unavailable).map((level) => level.id),
    })),
    error: null,
  };
}

export async function listMirasimSessions(workspaceDir, options = {}) {
  const reqId = randomUUID();
  const result = await mirasimRequest({ type: 'listSessions', reqId, workdir: workspaceDir, limit: 10000 },
    (m) => m.type === 'sessions' && m.reqId === reqId, options);
  if (!Array.isArray(result.sessions)) throw new Error('Mirasim session list is malformed');
  const agent = options.agent || MIRASIM_DEFAULT_HARNESS;
  return result.sessions.filter((s) => s.agent === agent && s.sessionKey?.startsWith(`${agent}:`));
}

export function createMirasimCatalogReader(options = {}) {
  const entries = new Map();
  const entry = (agent) => {
    if (!entries.has(agent)) entries.set(agent, { value: { models: [], agents: [], error: 'Mirasim catalog has not been loaded' }, checkedAt: 0, pending: null });
    return entries.get(agent);
  };
  const refresh = (agent = MIRASIM_DEFAULT_HARNESS) => {
    const state = entry(agent);
    if (!state.pending) state.pending = (agent === '@harnesses' ? readMirasimHarnesses(options) : readMirasimCatalog({ ...options, agent }))
      .then((next) => { state.value = next; })
      .catch((error) => { state.value = { models: [], agents: [], error: error.message }; })
      .finally(() => { state.checkedAt = Date.now(); state.pending = null; });
    return state.pending.then(() => state.value);
  };
  const read = (agent = MIRASIM_DEFAULT_HARNESS) => {
    const state = entry(agent);
    if (Date.now() - state.checkedAt > (state.value.error ? 10000 : 60000)) void refresh(agent);
    return state.value;
  };
  return {
    refresh, read,
    readHarnesses: () => read('@harnesses'),
    refreshHarnesses: () => refresh('@harnesses'),
    health() {
      const current = this.readHarnesses();
      return { ok: !current.error, bin: 'Mirasim local API', envKey: 'MIRASIM_URL',
        version: 'desktop connection', error: current.error };
    },
  };
}
