import { randomUUID } from 'node:crypto';

import { canCreateDiscordForkThread, createSyntheticForkMessage } from './codex-fork-flow.js';

export const CODEX_SIDE_BOUNDARY_TEXT = [
  'You are now in a Codex side conversation.',
  'Treat this as a temporary read-only side track by default.',
  'Do not change parent session goals, progress, queue, compact state, or reply delivery.',
  'Do not modify files or run destructive actions unless the user explicitly asks for edits inside this side thread.',
  'When answering, stay focused on the side question and do not claim that parent state changed.',
].join('\n');

export const CODEX_SIDE_DEVELOPER_INSTRUCTIONS = [
  'Side conversation rules:',
  '- This is an ephemeral side thread forked from the parent Codex thread.',
  '- Prefer explanation, inspection, and lightweight non-destructive exploration.',
  '- File edits require an explicit user request in this side Discord thread.',
  '- Never update or complete the parent goal from this side conversation.',
].join('\n');

function normalizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function shortenId(value) {
  const text = normalizeText(value);
  if (!text) return 'new';
  return text.length <= 12 ? text : text.slice(0, 8);
}

function resolveThreadCreateChannel(channel) {
  if (channel?.threads && typeof channel.threads.create === 'function') return channel;
  if (typeof channel?.isThread === 'function' && channel.isThread() && channel.parent?.threads && typeof channel.parent.threads.create === 'function') {
    return channel.parent;
  }
  if (channel?.parent?.threads && typeof channel.parent.threads.create === 'function') return channel.parent;
  return null;
}

function normalizeSideThreadName(value) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  return text ? text.slice(0, 100) : '';
}

function getRequesterId(source) {
  return String(source?.user?.id || source?.author?.id || '').trim() || null;
}

export function parseSideTextInput(input = '') {
  const [head, ...rest] = String(input || '').trim().split(/\s+/);
  const raw = String(head || '').trim().toLowerCase();
  if (!raw) return { action: 'start', threadName: '' };
  if (['start', 'open', 'new', '开启', '打开'].includes(raw)) {
    return { action: 'start', threadName: normalizeSideThreadName(rest.join(' ')) };
  }
  if (['status', 'state', 'show', '查看', '状态'].includes(raw)) {
    return { action: 'status', threadName: '' };
  }
  if (['close', 'stop', 'end', '关闭', '结束'].includes(raw)) {
    return { action: 'close', threadName: '' };
  }
  return { action: 'start', threadName: normalizeSideThreadName(input) };
}

export function buildCodexSideBoundaryItems() {
  return [{
    type: 'message',
    role: 'user',
    content: [{
      type: 'input_text',
      text: CODEX_SIDE_BOUNDARY_TEXT,
    }],
  }];
}

export function formatCodexSideThreadName({ parentSessionId, sideSessionId, threadName = '' } = {}) {
  const requested = normalizeSideThreadName(threadName);
  if (requested) return requested;
  return `codex side ${shortenId(sideSessionId)} from ${shortenId(parentSessionId)}`.slice(0, 100);
}

async function createDiscordSideThread(source, { parentSessionId, sideSessionId, threadName = '' } = {}) {
  const targetChannel = resolveThreadCreateChannel(source?.channel);
  if (!targetChannel) {
    throw new Error('当前频道不支持创建 Discord thread，无法放置 side conversation。');
  }
  const thread = await targetChannel.threads.create({
    name: formatCodexSideThreadName({ parentSessionId, sideSessionId, threadName }),
    autoArchiveDuration: 1440,
    reason: `codex side from ${parentSessionId}`,
  });
  try {
    await thread.join?.();
  } catch {
  }
  return thread;
}

function formatSideOriginNotice({ userId, parentSessionId, parentChannelId, sideSessionId, language = 'zh' } = {}) {
  const mention = userId ? `<@${userId}> ` : '';
  const parentLabel = parentChannelId ? `<#${parentChannelId}>` : 'parent Discord thread';
  if (language === 'en') {
    return `${mention}Codex side conversation opened from ${parentLabel}, parent session \`${parentSessionId}\`. Side session: \`${sideSessionId}\`. Inherited context is for reference only; this thread must not change parent state.`;
  }
  return `${mention}已从父 Discord thread ${parentLabel}、父 Codex session \`${parentSessionId}\` 开启 side conversation。side session：\`${sideSessionId}\`。继承上下文只用于参考，这里不能改父线程状态。`;
}

async function sendSideOriginNotice(childThread, {
  source,
  parentSessionId,
  parentChannelId,
  sideSessionId,
  language,
} = {}) {
  if (typeof childThread?.send !== 'function') {
    return { ok: false, skipped: true, error: 'child thread cannot send messages' };
  }
  const userId = getRequesterId(source);
  const payload = {
    content: formatSideOriginNotice({
      userId,
      parentSessionId,
      parentChannelId,
      sideSessionId,
      language,
    }),
  };
  if (userId) payload.allowedMentions = { users: [userId] };
  try {
    const message = await childThread.send(payload);
    return { ok: true, message, userId };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      userId,
      error: String(err?.message || err || 'unknown error'),
    };
  }
}

function getOpenSideMeta(session) {
  const meta = session?.openSideConversation;
  if (!meta || !['open', 'cleanup_failed'].includes(meta.status)) return null;
  if (!normalizeText(meta.sideSessionId) || !normalizeText(meta.sideChannelId)) return null;
  return meta;
}

function getCurrentSideMeta(session) {
  const meta = session?.sideConversation;
  if (!meta || !['open', 'cleanup_failed'].includes(meta.status)) return null;
  if (!normalizeText(meta.sideSessionId) || !normalizeText(meta.sideChannelId)) return null;
  return meta;
}

async function deleteDiscordSideThread(childThread, reason) {
  try {
    await childThread?.delete?.(reason);
    return { ok: true, deleted: true };
  } catch (err) {
    return {
      ok: false,
      deleted: false,
      error: String(err?.message || err || 'unknown error'),
    };
  }
}

async function resolveDiscordSideThread(source, sideChannelId) {
  const normalizedSideChannelId = normalizeText(sideChannelId);
  if (!normalizedSideChannelId) return null;
  if (source?.channel?.id === normalizedSideChannelId) return source.channel;
  const cached = source?.client?.channels?.cache?.get?.(normalizedSideChannelId)
    || source?.channel?.client?.channels?.cache?.get?.(normalizedSideChannelId);
  if (cached) return cached;
  const fetcher = source?.client?.channels?.fetch || source?.channel?.client?.channels?.fetch;
  if (typeof fetcher !== 'function') return null;
  return fetcher.call(source?.client?.channels || source?.channel?.client?.channels, normalizedSideChannelId);
}

async function archiveDiscordSideThread(source, meta) {
  const thread = await resolveDiscordSideThread(source, meta?.sideChannelId);
  if (!thread) {
    return { ok: false, archived: false, locked: false, error: 'side Discord thread not found' };
  }
  const result = { ok: true, archived: false, locked: false, error: '' };
  try {
    if (typeof thread.setLocked === 'function') {
      await thread.setLocked(true, 'Codex side conversation closed');
      result.locked = true;
    }
  } catch (err) {
    result.ok = false;
    result.error = String(err?.message || err || 'lock failed');
  }
  try {
    if (typeof thread.setArchived === 'function') {
      await thread.setArchived(true, 'Codex side conversation closed');
      result.archived = true;
    }
  } catch (err) {
    result.ok = false;
    const message = String(err?.message || err || 'archive failed');
    result.error = result.error ? `${result.error}; ${message}` : message;
  }
  if (typeof thread.setArchived !== 'function') {
    result.ok = false;
    result.error = result.error || 'side Discord thread cannot be archived';
  }
  return result;
}

export async function createCodexSideConversation({
  key,
  session,
  source,
  parentSessionId,
  threadName = '',
  provider = 'codex',
  getRuntimeSnapshot = () => ({ running: false }),
  getSession,
  commandActions = {},
  startCodexSideConversation,
  closeCodexSideConversation,
  enqueuePrompt,
  resolveSecurityContext,
  ensureWorkspace,
  getSessionLanguage = () => 'zh',
  createThread = createDiscordSideThread,
  generateSideSeed = randomUUID,
} = {}) {
  if (provider !== 'codex') {
    return { ok: false, reason: 'provider_unsupported', provider };
  }
  const normalizedParentSessionId = normalizeText(parentSessionId);
  if (!normalizedParentSessionId) {
    return { ok: false, reason: 'missing_parent_session' };
  }
  if (['open', 'cleanup_failed'].includes(session?.sideConversation?.status)) {
    return { ok: false, reason: 'nested_side' };
  }
  const openSide = getOpenSideMeta(session);
  if (openSide?.status === 'cleanup_failed') {
    return { ok: false, reason: 'cleanup_failed', error: openSide.cleanupError || 'previous side cleanup failed' };
  }
  if (openSide) {
    return { ok: true, reused: true, sideSessionId: openSide.sideSessionId, childThread: { id: openSide.sideChannelId }, parentSessionId: normalizedParentSessionId };
  }
  if (!canCreateDiscordForkThread(source)) {
    return { ok: false, reason: 'thread_unavailable' };
  }
  if (typeof startCodexSideConversation !== 'function') {
    return { ok: false, reason: 'side_unavailable' };
  }
  if (typeof getSession !== 'function') {
    throw new Error('getSession is required for Codex side conversation');
  }
  if (typeof commandActions.bindSideConversation !== 'function') {
    throw new Error('bindSideConversation is required for Codex side conversation');
  }

  const runtime = getRuntimeSnapshot(key) || {};
  const workspaceDir = typeof ensureWorkspace === 'function' ? ensureWorkspace(session, key) : session?.workspaceDir;
  const plannedSideSessionId = normalizeText(generateSideSeed()) || `side-${Date.now()}`;
  const requesterId = getRequesterId(source);
  const childThread = await createThread(source, {
    parentSessionId: normalizedParentSessionId,
    sideSessionId: plannedSideSessionId,
    threadName,
  });
  if (!childThread?.id) {
    throw new Error('Discord thread creation did not return a thread id');
  }

  let sideResult = null;
  try {
    sideResult = await startCodexSideConversation({
      session,
      sessionKey: key,
      workspaceDir,
      sideDeveloperInstructions: CODEX_SIDE_DEVELOPER_INSTRUCTIONS,
      boundaryItems: buildCodexSideBoundaryItems(),
    });
  } catch (err) {
    await deleteDiscordSideThread(childThread, 'Codex side conversation failed before session binding');
    throw err;
  }
  if (!sideResult?.ok || !normalizeText(sideResult.sideThreadId)) {
    await deleteDiscordSideThread(childThread, 'Codex side conversation did not return a side session id');
    return {
      ok: false,
      reason: sideResult?.reason || 'side_start_failed',
      error: sideResult?.error || 'Codex side conversation did not return a side session id',
    };
  }

  const sideSessionId = normalizeText(sideResult.sideThreadId);
  const childSession = getSession(childThread.id, {
    channel: childThread,
    parentChannelId: key,
  });
  if (!normalizeSideThreadName(threadName) && typeof childThread.setName === 'function') {
    try {
      await childThread.setName(
        formatCodexSideThreadName({ parentSessionId: normalizedParentSessionId, sideSessionId }),
        'codex side session assigned',
      );
    } catch {
    }
  }
  const notice = await sendSideOriginNotice(childThread, {
    source,
    parentSessionId: normalizedParentSessionId,
    parentChannelId: key,
    sideSessionId,
    language: getSessionLanguage(session),
  });
  if (!notice.ok) {
    let cleanup = { ok: false, skipped: true, reason: 'cleanup_unavailable' };
    if (typeof closeCodexSideConversation === 'function') {
      cleanup = await closeCodexSideConversation({
        session: childSession,
        sessionKey: key,
        threadId: sideSessionId,
        reason: 'side origin notice failed',
      });
    }
    const discordCleanup = await deleteDiscordSideThread(childThread, 'Codex side origin notice failed');
    return {
      ok: false,
      reason: 'origin_notice_failed',
      error: notice.error || 'failed to send side origin notice',
      sideSessionId,
      parentSessionId: normalizedParentSessionId,
      cleanup,
      discordCleanup,
    };
  }
  let binding = null;
  try {
    binding = commandActions.bindSideConversation(session, childSession, {
      sideSessionId,
      parentSessionId: normalizedParentSessionId,
      parentChannelId: key,
      sideChannelId: childThread.id,
      requesterId,
      workspaceDir,
    });
  } catch (err) {
    let cleanup = { ok: false, skipped: true, reason: 'cleanup_unavailable' };
    if (typeof closeCodexSideConversation === 'function') {
      cleanup = await closeCodexSideConversation({
        session: childSession,
        sessionKey: key,
        threadId: sideSessionId,
        reason: 'side session binding failed',
      });
    }
    const discordCleanup = await deleteDiscordSideThread(childThread, 'Codex side binding failed');
    return {
      ok: false,
      reason: 'binding_failed',
      error: String(err?.message || err || 'binding failed'),
      sideSessionId,
      parentSessionId: normalizedParentSessionId,
      cleanup,
      discordCleanup,
    };
  }
  const promptQueue = runtime.running ? null : null;
  void enqueuePrompt;
  void resolveSecurityContext;
  return {
    ok: true,
    parentSessionId: normalizedParentSessionId,
    sideSessionId,
    parentThreadId: sideResult.parentThreadId || normalizedParentSessionId,
    childThread,
    childSession,
    binding,
    notice,
    promptQueue,
  };
}

export async function closeCodexSideConversationFlow({
  key,
  session,
  getSession,
  commandActions = {},
  closeCodexSideConversation,
  cancelChannelWork,
  source = null,
} = {}) {
  const parentMeta = getOpenSideMeta(session);
  const currentSideMeta = getCurrentSideMeta(session);
  const meta = parentMeta || currentSideMeta;
  if (!meta) return { ok: false, reason: 'no_open_side' };
  const parentSession = parentMeta ? session : getSession(meta.parentChannelId, { channel: null });
  const sideSession = currentSideMeta ? session : getSession(meta.sideChannelId, { parentChannelId: key });
  const cancelOutcome = typeof cancelChannelWork === 'function'
    ? cancelChannelWork(meta.sideChannelId, 'side_close')
    : null;
  let cleanup = { ok: true, skipped: true };
  if (typeof closeCodexSideConversation === 'function') {
    cleanup = await closeCodexSideConversation({
      session: sideSession,
      sessionKey: meta.parentChannelId,
      threadId: meta.sideSessionId,
      reason: 'side conversation closed',
    });
  }
  const cleanupError = cleanup?.ok ? null : (cleanup?.error || cleanup?.reason || 'cleanup failed');
  commandActions.markSideConversationClosed?.(parentSession, sideSession, {
    status: cleanup?.ok ? 'closed' : 'cleanup_failed',
    cleanupError,
  });
  const discordArchive = cleanup?.ok ? await archiveDiscordSideThread(source, meta) : { ok: false, skipped: true };
  return {
    ok: Boolean(cleanup?.ok),
    sideSessionId: meta.sideSessionId,
    sideChannelId: meta.sideChannelId,
    cleanup,
    discordArchive,
    cancelOutcome,
    error: cleanupError,
  };
}

export function formatCodexSideResult(result, language = 'zh') {
  if (!result?.ok) {
    if (result?.reason === 'missing_parent_session') {
      return language === 'en' ? '❌ No Codex session is bound here yet. Run one task first.' : '❌ 当前频道还没有绑定 Codex session。先跑一轮。';
    }
    if (result?.reason === 'provider_unsupported') {
      return language === 'en' ? '❌ Side conversation is only available for Codex.' : '❌ side conversation 只支持 Codex。';
    }
    if (result?.reason === 'nested_side') {
      return language === 'en' ? '❌ Nested side conversations are not supported.' : '❌ side 线程里不能再开 side。';
    }
    if (result?.reason === 'thread_unavailable') {
      return language === 'en' ? '❌ This Discord channel cannot create a side thread.' : '❌ 当前 Discord 频道不能创建 side thread。';
    }
    if (result?.reason === 'side_unavailable' || result?.reason === 'unsupported_runtime') {
      return language === 'en' ? '❌ Codex side conversation requires Codex long runtime.' : '❌ Codex side conversation 需要 Codex long runtime。';
    }
    if (result?.reason === 'origin_notice_failed') {
      return language === 'en' ? `❌ Codex side failed before opening: ${result?.error || 'origin notice failed'}` : `❌ Codex side 开启前失败：${result?.error || 'origin notice failed'}`;
    }
    if (result?.reason === 'binding_failed') {
      return language === 'en' ? `❌ Codex side failed before binding: ${result?.error || 'binding failed'}` : `❌ Codex side 绑定前失败：${result?.error || 'binding failed'}`;
    }
    if (result?.reason === 'cleanup_failed') {
      return language === 'en' ? `❌ Previous Codex side cleanup failed. Close it again before starting a new side: ${result?.error || 'unknown error'}` : `❌ 上次 Codex side 清理失败。先再关闭一次，再开新的 side：${result?.error || '未知错误'}`;
    }
    return language === 'en' ? `❌ Codex side failed: ${result?.error || result?.reason || 'unknown error'}` : `❌ Codex side 失败：${result?.error || result?.reason || '未知错误'}`;
  }
  const channelLabel = result.childThread?.id ? `<#${result.childThread.id}>` : '(new thread)';
  const prefix = result.reused
    ? (language === 'en' ? 'ℹ️ Existing Codex side conversation' : 'ℹ️ 已有 Codex side conversation')
    : (language === 'en' ? '✅ Codex side conversation opened' : '✅ 已开启 Codex side conversation');
  return [
    `${prefix}：${channelLabel}`,
    `• side session: \`${result.sideSessionId}\``,
    `• parent session: \`${result.parentSessionId}\``,
  ].join('\n');
}

export function formatCodexSideStatus(session, language = 'zh', runtime = null) {
  const meta = getOpenSideMeta(session) || getCurrentSideMeta(session);
  if (!meta) {
    return language === 'en' ? 'No open Codex side conversation.' : '当前没有打开的 Codex side conversation。';
  }
  const running = runtime
    ? (runtime.running || runtime.queued ? (language === 'en' ? 'yes' : '是') : (language === 'en' ? 'no' : '否'))
    : (language === 'en' ? 'unknown' : '未知');
  const statusLine = meta.status === 'cleanup_failed'
    ? (language === 'en'
      ? `Cleanup previously failed: ${meta.cleanupError || 'unknown error'}`
      : `上次清理失败：${meta.cleanupError || '未知错误'}`)
    : (language === 'en' ? 'Codex side conversation is open and temporary.' : 'Codex side conversation 已打开，是临时线程。');
  return [
    statusLine,
    `• parent thread: <#${meta.parentChannelId}>`,
    `• side thread: <#${meta.sideChannelId}>`,
    `• side session: \`${meta.sideSessionId}\``,
    `• parent session: \`${meta.parentSessionId}\``,
    `• opened: ${meta.openedAt || '(unknown)'}`,
    `• running: ${running}`,
  ].join('\n');
}

export function formatCodexSideCloseResult(result, language = 'zh') {
  if (!result?.ok) {
    if (result?.reason === 'no_open_side') {
      return language === 'en' ? 'No open Codex side conversation to close.' : '当前没有可关闭的 Codex side conversation。';
    }
    return language === 'en' ? `❌ Codex side close failed: ${result?.error || 'unknown error'}` : `❌ Codex side 关闭失败：${result?.error || '未知错误'}`;
  }
  const archiveWarning = result.discordArchive && result.discordArchive.ok === false && !result.discordArchive.skipped
    ? (language === 'en' ? `\n⚠️ Discord thread cleanup warning: ${result.discordArchive.error || 'archive failed'}` : `\n⚠️ Discord thread 清理警告：${result.discordArchive.error || 'archive failed'}`)
    : '';
  return language === 'en'
    ? `✅ Closed Codex side conversation \`${result.sideSessionId}\`.${archiveWarning}`
    : `✅ 已关闭 Codex side conversation：\`${result.sideSessionId}\`。${archiveWarning}`;
}

export function createSyntheticSideMessage(source, childThread) {
  return createSyntheticForkMessage(source, childThread);
}
