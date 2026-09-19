import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { TASK_SUBMISSION } from './task-submission-events.js';

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled', 'interrupted', 'rejected', 'notified']);
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const SNOWFLAKE = /^\d{16,22}$/;
export const MAX_PROMPT_BYTES = 128 * 1024;

export function parseTaskAuthorization(content) {
  const existing = String(content || '').trim().match(/^!task-authorize ([a-zA-Z0-9][a-zA-Z0-9_-]{0,79}) thread (\d{16,22})$/);
  if (existing) return { requestId: existing[1], targetThreadId: existing[2], workspaceMode: 'target' };
  const match = String(content || '').trim().match(/^!task-authorize ([a-zA-Z0-9][a-zA-Z0-9_-]{0,79}) (\d{16,22})( share-source)?$/);
  return match ? { requestId: match[1], parentId: match[2], workspaceMode: match[3] ? 'share-source' : 'isolated' } : null;
}

export function normalizeTaskInput(input) {
  const existing = input && Object.hasOwn(input, 'targetThreadId');
  const fields = existing
    ? ['requestId', 'targetThreadId', 'sourceThreadId', 'authorizationMessageId', 'prompt', 'workspaceMode']
    : ['requestId', 'parentId', 'sourceThreadId', 'authorizationMessageId', 'title', 'prompt', 'workspaceMode'];
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some((key) => !fields.includes(key) && key !== 'kind')) throw new Error('invalid submission fields');
  const normalized = {};
  for (const key of fields) {
    if (key === 'authorizationMessageId' && input[key] === undefined) continue;
    const value = key === 'workspaceMode' ? input[key] ?? (existing ? 'target' : 'isolated') : input[key];
    if (typeof value !== 'string' || !value.trim()) throw new Error(`missing or invalid ${key}`);
    normalized[key] = value;
  }
  if (!ID.test(normalized.requestId) || ['__proto__', 'constructor', 'prototype'].includes(normalized.requestId)) throw new Error('invalid request ID');
  for (const key of [existing ? 'targetThreadId' : 'parentId', 'sourceThreadId', ...(normalized.authorizationMessageId ? ['authorizationMessageId'] : [])]) {
    if (!SNOWFLAKE.test(normalized[key])) throw new Error(`invalid ${key}`);
  }
  if (!existing && (normalized.title.length > 100 || /[\r\n]/.test(normalized.title))) throw new Error('title must be one line, at most 100 characters');
  if (Buffer.byteLength(normalized.prompt) > MAX_PROMPT_BYTES) throw new Error(`prompt exceeds ${MAX_PROMPT_BYTES} bytes; nothing was submitted`);
  if (!(existing ? ['target'] : ['isolated', 'share-source']).includes(normalized.workspaceMode)) throw new Error('invalid workspace mode; arbitrary paths are not accepted');
  if (input.kind !== undefined) {
    if (!['task', 'notify'].includes(input.kind) || (input.kind === 'notify' && !existing)) throw new Error('notifications require an existing target thread');
    normalized.kind = input.kind;
  }
  return normalized;
}

export function validateTaskRecord(record, id) {
  if (!record || record.requestId !== id || !record.input || typeof record.input.workspaceMode !== 'string'
    || !Number.isFinite(Date.parse(record.createdAt)) || !Number.isFinite(Date.parse(record.updatedAt))
    || !['accepted', 'approval_publishing', 'pending_approval', 'approved', 'creating', 'thread_created', 'thread_bound', 'publishing', 'queued', 'starting', 'started', ...TERMINAL].includes(record.status)
    || !Array.isArray(record.history) || !record.history.length
    || record.history.some((entry) => !entry || typeof entry.status !== 'string' || !Number.isFinite(Date.parse(entry.at)))) {
    throw new Error('invalid task request record');
  }
  const input = normalizeTaskInput(record.input);
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  if (input.requestId !== id || record.fingerprint !== fingerprint) throw new Error('task request fingerprint mismatch');
  if (['thread_created', 'thread_bound', 'publishing', 'queued', 'starting', 'started', 'succeeded'].includes(record.status)
    && (!SNOWFLAKE.test(record.threadId || '') || typeof record.threadUrl !== 'string')) throw new Error('missing task thread evidence');
  if (['queued', 'starting', 'started', 'succeeded'].includes(record.status)
    && (!SNOWFLAKE.test(record.messageId || '') || !SNOWFLAKE.test(record.ownerUserId || '')
      || typeof record.workspaceDir !== 'string' || !path.isAbsolute(record.workspaceDir))) throw new Error('missing queue evidence');
  if (record.status === 'started' && !record.sessionId && !record.startedEvent) throw new Error('missing started session evidence');
  if (['approval_publishing', 'pending_approval', 'approved'].includes(record.status)
    && (!SNOWFLAKE.test(record.ownerUserId || '') || !SNOWFLAKE.test(record.guildId || ''))) throw new Error('missing approval ownership evidence');
  if (record.status === 'approved' && !SNOWFLAKE.test(record.approvedBy || '')) throw new Error('missing approval decision evidence');
  if (input.targetThreadId && record.threadId
    && (record.threadId !== input.targetThreadId || !record.expectedSessionId || !path.isAbsolute(record.workspaceDir || ''))) throw new Error('invalid target binding evidence');
}

function requirePermissions(channel, member, permissions) {
  const actual = channel.permissionsFor(member);
  if (!actual || !permissions.every((permission) => actual.has(permission))) throw new Error(`Discord access denied: ${channel.id}`);
}

export function createLocalTaskSubmission({
  getClient, sessionStore, identity, accessPolicy, securityPolicy, enqueuePrompt, workspaceRoot,
  discordWriter,
  provider = 'codex', canManage = () => false, slashPrefix = '',
  isAllowedSourceChannel = (channel) => accessPolicy.isAllowedChannel(channel),
  logger = console, discordTimeoutMs = 30_000,
}) {
  const pending = new Map();
  async function discord(operation) {
    let timer;
    try {
      return await Promise.race([Promise.resolve().then(operation), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Discord operation timed out; side effects may be uncertain')), discordTimeoutMs);
      })]);
    } finally { clearTimeout(timer); }
  }

  function update(id, status, details = {}) {
    const previous = sessionStore.getTaskRequest(id);
    if (!previous) throw new Error(`missing task request: ${id}`);
    if (TERMINAL.has(previous.status)) return previous;
    // A retry may start another attempt; do not erase evidence of an existing session.
    if (previous.status === 'started' && status === 'starting') return previous;
    if (previous.status === status && Object.entries(details).every(([key, value]) => previous[key] === value)) return previous;
    const at = new Date().toISOString();
    const next = { ...previous, ...details, status, updatedAt: at,
      history: [...previous.history, { status, at, ...details }] };
    sessionStore.putTaskRequest(next);
    return next;
  }

  function get(id) {
    if (typeof id !== 'string' || !ID.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id)) throw new Error('invalid request ID');
    const record = sessionStore.getTaskRequest(id);
    if (!record) throw new Error('request not found');
    const session = record.threadId ? sessionStore.peekSession(record.threadId) : null;
    const sessionId = record.sessionId || record.expectedSessionId || (session && identity.getSessionId(session)) || null;
    return {
      requestId: id, status: record.status, threadId: record.threadId || null,
      threadUrl: record.threadUrl || null, sessionId,
      // Never derive this from configured defaults.
      observedModel: session && identity.getSessionId(session) === sessionId ? session.lastObservedModel || null : null,
      ownerUserId: record.ownerUserId || null, sourceUrl: record.sourceUrl || null,
      kind: record.input.kind || 'task', approvalMessageId: record.approvalMessageId || null,
      workspaceDir: record.workspaceDir || null, error: record.error || null,
      errorCode: record.errorCode ?? null, httpStatus: record.httpStatus ?? null,
      timedOut: record.timedOut || false, history: record.history,
    };
  }

  async function authorize(input, ownerUserId = null) {
    const client = getClient();
    if (!client?.isReady()) throw new Error('Discord client is not ready');
    const source = await discord(() => client.channels.fetch(input.sourceThreadId));
    const target = input.targetThreadId ? await discord(() => client.channels.fetch(input.targetThreadId)) : null;
    if (input.targetThreadId && (!target?.isThread?.() || target.archived || target.locked)) throw new Error('target must be an active unlocked thread');
    const parent = await discord(() => client.channels.fetch(target ? target.parentId : input.parentId));
    if (!source?.isThread?.() || !source.guild || source.guild.id !== parent?.guild?.id) throw new Error('source must be a thread in the target guild');
    if (![0, 15].includes(parent.type)) throw new Error('target must be a guild text or forum parent channel');
    if (!accessPolicy.isAllowedChannel(parent)) throw new Error('channel not allowed');
    if (target && (!accessPolicy.isAllowedChannel(target) || target.guild?.id !== source.guild.id)) throw new Error('target channel not allowed');
    const sourceSession = sessionStore.peekSession(source.id);
    if (sourceSession?.sideConversation?.status === 'open') throw new Error('source must be an ordinary task thread');
    if (input.workspaceMode === 'share-source' && !sourceSession) throw new Error('shared source workspace unavailable in this Agent');
    let authorization;
    let userId = ownerUserId;
    if (!userId) {
      if (!input.authorizationMessageId) throw new Error('configure receiver agent-messages policy in Discord first');
      authorization = await discord(() => source.messages.fetch({ message: input.authorizationMessageId, force: true }));
      const grant = parseTaskAuthorization(authorization.content);
      if (authorization.author?.bot || authorization.webhookId || authorization.system || !grant
      || grant.requestId !== input.requestId || grant.parentId !== input.parentId
      || grant.targetThreadId !== input.targetThreadId || grant.workspaceMode !== input.workspaceMode) {
        throw new Error('a real user must send the exact !task-authorize command in the source thread');
      }
      userId = authorization.author.id;
    }
    if (!accessPolicy.isAllowedUser(userId)) throw new Error('user not allowed');
    if (!isAllowedSourceChannel(source, userId)) throw new Error('source channel not allowed');
    const member = await discord(() => source.guild.members.fetch({ user: userId, force: true }));
    requirePermissions(source, member, ['ViewChannel', 'ReadMessageHistory', 'SendMessagesInThreads']);
    if (target) {
      requirePermissions(target, member, ['ViewChannel', 'ReadMessageHistory', 'SendMessagesInThreads']);
      if (target.type === 12) await discord(() => target.members.fetch(userId));
      assertTargetSession(target.id);
    } else requirePermissions(parent, member, ['ViewChannel', 'SendMessages', 'SendMessagesInThreads', 'CreatePublicThreads']);
    if (source.type === 12) {
      // A private source requires actual thread membership, not just parent visibility.
      await discord(() => source.members.fetch(userId));
    }
    const sourceUrl = `https://discord.com/channels/${source.guild.id}/${source.id}${authorization ? `/${authorization.id}` : ''}`;
    return { parent, source, sourceSession, target, userId, sourceUrl };
  }

  function assertTargetSession(threadId, binding = null) {
    const session = sessionStore.peekSession(threadId);
    if (!session || identity.getSessionProvider(session) !== provider || !identity.getSessionId(session)
      || session.sideConversation || session.pendingForkFromSessionId || session.pendingCompactSummary) {
      throw new Error(`target must have an existing ordinary ${provider} session`);
    }
    const workspaceDir = sessionStore.ensureWorkspace(session, threadId);
    if (binding && (identity.getSessionId(session) !== binding.expectedSessionId || workspaceDir !== binding.workspaceDir)) {
      throw new Error('target session or workspace changed; refusing to run in another context');
    }
    return { session, workspaceDir };
  }

  async function acknowledgeAuthorization(message) {
    const grant = parseTaskAuthorization(message.content);
    if (!grant) throw new Error('usage: !task-authorize <request-id> <parent-channel-id> [share-source] OR !task-authorize <request-id> thread <thread-id>');
    await authorize({ ...grant, sourceThreadId: message.channel.id, authorizationMessageId: message.id });
    await message.reply({ content: `已授权本机 Agent 为请求 \`${grant.requestId}\` 向 <#${grant.targetThreadId || grant.parentId}> 提交一项任务。${grant.targetThreadId ? '继续目标 thread 原有 session，不新建会话。' : ''}工作区：${grant.workspaceMode}。授权消息 ID：\`${message.id}\`。完整 prompt 由本机调用方提供，此授权不确认其具体内容。`, allowedMentions: { parse: [] } });
  }

  function isolatedWorkspace(threadId) {
    const root = fs.realpathSync(workspaceRoot);
    const container = path.join(root, 'agent-tasks');
    if (!fs.existsSync(container)) fs.mkdirSync(container, { mode: 0o700 });
    if (fs.lstatSync(container).isSymbolicLink() || fs.realpathSync(container) !== container) throw new Error('invalid isolated workspace root');
    const dir = path.join(container, threadId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { mode: 0o700 });
    if (fs.lstatSync(dir).isSymbolicLink() || !fs.statSync(dir).isDirectory() || fs.realpathSync(dir) !== dir) throw new Error('invalid isolated workspace');
    return dir;
  }

  async function processRequest(id) {
    let record = sessionStore.getTaskRequest(id);
    const { input } = record;
    const source = await discord(() => getClient().channels.fetch(input.sourceThreadId));
    const policy = sessionStore.getAgentMessagePolicy?.(source.guild?.id);
    const owner = record.approvedBy || policy?.ownerUserId;
    if (owner && !canManage(owner)) throw new Error('delegating user no longer has management permission');
    const { parent, sourceSession, target, userId, sourceUrl } = await authorize(input, owner);
    if (policy?.mode === 'approval' && !record.approvedBy) {
      update(id, 'approval_publishing', { ownerUserId: userId, sourceUrl, guildId: source.guild.id });
      const command = `/${slashPrefix ? `${slashPrefix}_` : ''}agent-messages`;
      const notice = await discord(() => discordWriter.sendStarter(source, {
        content: `<@${userId}> 待审批的 Agent ${input.kind === 'notify' ? '通知' : '任务'}\n请求：${id}\n来源：${sourceUrl}\n目标：<#${input.targetThreadId || input.parentId}>\n标题：${input.title || '继续已有会话'}\n工作区：${input.workspaceMode}\n完整内容见附件。使用 ${command} action:approve 或 reject，request-id:${id}。尚未入队或运行。`,
        files: [{ attachment: Buffer.from(input.prompt), name: 'task-prompt.txt' }],
        allowedMentions: { parse: [], users: [userId] },
      }));
      update(id, 'pending_approval', { approvalMessageId: notice.id });
      return;
    }
    const sharedWorkspace = input.workspaceMode === 'share-source'
      ? sessionStore.ensureWorkspace(sourceSession, input.sourceThreadId) : null;
    update(id, record.status, { ownerUserId: userId, sourceUrl, guildId: source.guild.id });
    let thread;
    let firstMessage;
    const header = `由来源会话经用户授权发起${input.kind === 'notify' ? '（仅通知，不触发运行）' : ''}\n来源：${sourceUrl}\n请求 ID：${id}\n提交者：本机 Agent；授权用户 ID：${userId}\n\n`;
    const payload = {
      content: header + (header.length + input.prompt.length <= 2000 ? input.prompt : '完整任务内容见附件 task-prompt.txt（未截断）。'),
      allowedMentions: { parse: [] },
      ...(header.length + input.prompt.length > 2000 ? { files: [{ attachment: Buffer.from(input.prompt, 'utf8'), name: 'task-prompt.txt' }] } : {}),
    };
    const boundStatus = target ? 'thread_bound' : 'thread_created';
    if (target && !record.threadId) {
      const binding = assertTargetSession(target.id);
      record = update(id, boundStatus, { threadId: target.id,
        threadUrl: `https://discord.com/channels/${parent.guild.id}/${target.id}`,
        expectedSessionId: identity.getSessionId(binding.session), workspaceDir: binding.workspaceDir });
    } else if (!record.threadId) {
      update(id, 'creating');
      // Do not retry this non-idempotent Discord request after an uncertain response.
      const created = await discord(() => discordWriter.createThread(parent, { title: input.title, payload, requestId: id }));
      record = update(id, 'thread_created', { threadId: created.id, threadUrl: `https://discord.com/channels/${parent.guild.id}/${created.id}` });
    }
    thread = await discord(() => getClient().channels.fetch(record.threadId));
    if (!accessPolicy.isAllowedChannel(thread)) throw new Error('created thread not allowed');
    const session = sessionStore.getSession(thread.id, { channel: thread });
    if (target) assertTargetSession(thread.id, record);
    if (identity.getSessionProvider(session) !== provider) throw new Error('target provider does not match receiver Agent');
    if (!record.workspaceDir) {
      if (identity.getSessionId(session)) throw new Error('new thread already has a session; refusing to overwrite');
      session.workspaceDir = sharedWorkspace || isolatedWorkspace(thread.id);
      sessionStore.saveDb();
      record = update(id, record.status, { workspaceDir: session.workspaceDir });
    }
    if (sessionStore.ensureWorkspace(session, thread.id) !== record.workspaceDir) throw new Error('task workspace binding changed before submission');
    if (record.messageId) {
      firstMessage = await discord(() => thread.messages.fetch(record.messageId));
    } else {
      update(id, 'publishing');
      firstMessage = await discord(() => !target && parent.type === 15 ? thread.fetchStarterMessage() : discordWriter.sendStarter(thread, payload));
      if (!firstMessage) throw new Error('missing thread starter message');
      record = update(id, boundStatus, { messageId: firstMessage.id });
    }
    if (input.kind === 'notify') {
      update(id, 'notified');
      return;
    }
    // Keep the actual bot author. Ownership for cancellation/retry/mentions is separate.
    firstMessage[TASK_SUBMISSION] = { userId, update: (status, details) => update(id, status, details),
      validate: target ? () => assertTargetSession(thread.id, record) : null };
    const result = await enqueuePrompt(firstMessage, thread.id, input.prompt, securityPolicy.resolveSecurityContext(thread, session));
    if (!result?.enqueued) throw new Error(`queue rejected: ${result?.reason || 'not enqueued'}`);
  }

  function schedule(id) {
    if (pending.has(id)) return;
    const work = Promise.resolve().then(() => processRequest(id)).catch((err) => {
      logger.error(`local task ${id}:`, err);
      const previous = sessionStore.getTaskRequest(id);
      update(id, ['creating', 'publishing', 'approval_publishing'].includes(previous.status) ? 'interrupted' : 'failed', {
        error: err.stack || String(err), errorCode: err.code ?? null, httpStatus: err.status ?? null,
      });
    }).catch((err) => {
      // Preserve the last durable state and surface storage failures, never reset the DB.
      logger.error(`local task ${id} persistence failure:`, err);
    }).finally(() => pending.delete(id));
    pending.set(id, work);
  }

  function submit(raw) {
    const input = normalizeTaskInput(raw);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const existing = sessionStore.getTaskRequest(input.requestId);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new Error('request ID conflict: content differs');
      return get(input.requestId);
    }
    const at = new Date().toISOString();
    sessionStore.putTaskRequest({ requestId: input.requestId, input, fingerprint, status: 'accepted',
      createdAt: at, updatedAt: at, history: [{ status: 'accepted', at }] });
    schedule(input.requestId);
    return get(input.requestId);
  }

  function recover() {
    for (const record of sessionStore.listTaskRequests()) {
      if (TERMINAL.has(record.status)) continue;
      if (record.status === 'pending_approval') continue;
      if (['accepted', 'approved', 'thread_created', 'thread_bound', 'queued'].includes(record.status)) schedule(record.requestId);
      else update(record.requestId, 'interrupted', { error: `bot restarted during ${record.status}; outcome uncertain, not replayed; inspect the recorded thread/session before continuing` });
    }
  }

  function assertManager(interaction) {
    if (!interaction.guildId || interaction.user?.bot || !canManage(interaction.user?.id)
      || !accessPolicy.isAllowedUser(interaction.user.id) || !accessPolicy.isAllowedChannel(interaction.channel)) {
      throw new Error('only existing authorized managers may manage Agent messages');
    }
  }

  function setPolicy(interaction, mode) {
    assertManager(interaction);
    if (!['allow', 'approval'].includes(mode)) throw new Error('choose allow or approval');
    sessionStore.setAgentMessagePolicy(interaction.guildId, { mode, ownerUserId: interaction.user.id, updatedAt: new Date().toISOString() });
  }

  async function manage(interaction, respond) {
    assertManager(interaction);
    const action = interaction.options.getString('action') || 'status';
    const mode = interaction.options.getString('mode');
    const id = interaction.options.getString('request-id');
    if (action === 'policy') {
      setPolicy(interaction, mode);
      return respond({ content: `接收方 ${provider}：${mode === 'allow' ? '完全放行' : '需要审批'}。作用域：本服务器内此 Agent 的所有 thread。归属用户：${interaction.user.id}。仍检查该用户的频道和工作区权限；旧的待审批请求不会自动放行。`, flags: 64 });
    }
    if (action === 'status') {
      const policy = sessionStore.getAgentMessagePolicy(interaction.guildId);
      const waiting = sessionStore.listTaskRequests().filter(r => r.status === 'pending_approval' && r.guildId === interaction.guildId);
      const content = `策略：${policy ? JSON.stringify(policy) : '尚未配置'}\n待审批：${waiting.length}\n${waiting.slice(0, 15).map(r => r.requestId).join('\n')}`;
      return respond({ content, flags: 64 });
    }
    const record = sessionStore.getTaskRequest(id);
    if (!record || record.guildId !== interaction.guildId) throw new Error('request not found in this guild');
    // Read access is checked as well: prompts may contain private source content.
    await authorize(record.input, interaction.user.id);
    if (action === 'show') {
      const content = `请求：${id}\n状态：${record.status}\n来源：${record.sourceUrl}\n目标：<#${record.input.targetThreadId || record.input.parentId}>\n${record.input.title || ''}\n工作区：${record.input.workspaceMode}`;
      return respond({ content, files: [{ attachment: Buffer.from(record.input.prompt), name: 'task-prompt.txt' }], flags: 64 });
    }
    if (!['approve', 'reject'].includes(action)) throw new Error('invalid action');
    if (pending.has(id)) throw new Error('request is still being processed; retry shortly');
    const current = sessionStore.getTaskRequest(id);
    if (current.status !== 'pending_approval') throw new Error(`request is ${current.status}, not pending approval`);
    update(id, action === 'approve' ? 'approved' : 'rejected', { approvedBy: action === 'approve' ? interaction.user.id : null, decidedBy: interaction.user.id });
    if (action === 'approve') schedule(id);
    return respond({ content: `${id}：${action === 'approve' ? '已批准，等待入队' : '已拒绝'}`, flags: 64 });
  }

  return { submit, get, recover, manage, setPolicy, acknowledgeAuthorization, drain: () => Promise.all([...pending.values()]) };
}
