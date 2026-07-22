import { createClaudeProviderAdapter } from './providers/claude.js';
import { createCodexProviderAdapter } from './providers/codex.js';
import { createAntigravityProviderAdapter } from './providers/antigravity.js';
import { createZCodeProviderAdapter } from './providers/zcode.js';
import { createProviderAdapterRegistry } from './providers/index.js';
import {
  extractUnphasedCodexAgentMessage,
  isCodexTurnTerminalEvent,
  isCodexWorkEvent,
} from './codex-event-utils.js';

export function createRunnerEventParser({
  normalizeProvider = (value) => String(value || '').trim().toLowerCase(),
  extractAgentMessageText = () => '',
  isFinalAnswerLikeAgentMessage = () => true,
} = {}) {
  const providerAdapters = createProviderAdapterRegistry([
    createCodexProviderAdapter({
      parseEvent: (event, state, ensureSessionBridge) => handleCodexRunnerEvent(event, state, ensureSessionBridge, {
        extractAgentMessageText,
        isFinalAnswerLikeAgentMessage,
      }),
    }),
    createClaudeProviderAdapter({
      parseEvent: (event, state, ensureSessionBridge) => handleClaudeRunnerEvent(event, state, ensureSessionBridge),
    }),
    createAntigravityProviderAdapter({
      parseEvent: (event, state, ensureSessionBridge) => handleAntigravityRunnerEvent(event, state, ensureSessionBridge),
    }),
    createZCodeProviderAdapter({
      parseEvent: (event, state) => handleZCodeRunnerEvent(event, state),
    }),
  ]);

  return function handleRunnerEvent(provider, event, state, ensureSessionBridge) {
    const adapter = providerAdapters.get(normalizeProvider(provider));
    adapter.runtime.parseEvent(event, state, ensureSessionBridge);
  };
}

export function handleZCodeRunnerEvent(event, state) {
  const sessionId = String(event?.sessionId || '').trim();
  if (sessionId) state.threadId = sessionId;

  const response = String(event?.response || '').trim();
  if (response) appendUniqueText(state.finalAnswerMessages, response);
  if (event?.usage && typeof event.usage === 'object') state.usage = event.usage;
  if (event?.projection && typeof event.projection === 'object') {
    state.meta.zcodeProjection = event.projection;
  }
}

export function handleCodexRunnerEvent(event, state, ensureSessionBridge, {
  extractAgentMessageText = () => '',
  isFinalAnswerLikeAgentMessage = () => true,
} = {}) {
  const eventType = String(event?.type || '').trim();
  if ((eventType === 'event_msg' || eventType === 'response_item') && event?.payload && typeof event.payload === 'object') {
    return handleCodexRunnerEvent(event.payload, state, ensureSessionBridge, {
      extractAgentMessageText,
      isFinalAnswerLikeAgentMessage,
    });
  }

  if (isCodexWorkEvent(event)) {
    flushPendingCodexAgentMessages(state, state.messages);
  }

  switch (event.type) {
    case 'thread.started':
    case 'thread.created':
    case 'thread.resumed':
      state.threadId = event.thread_id || state.threadId;
      if (state.threadId) ensureSessionBridge(state.threadId);
      break;
    case 'item.completed':
    case 'item.delta':
    case 'item.updated': {
      const item = event.item;
      const itemType = String(item?.type || '').trim().toLowerCase();
      if (itemType === 'reasoning') {
        const text = String(item?.text || item?.summary || '').trim();
        if (text) state.reasonings.push(text);
        break;
      }
      if (!['agent_message', 'assistant_message', 'message'].includes(itemType)) break;
      const text = extractAgentMessageText(item);
      if (!text) break;
      const unphasedText = extractUnphasedCodexAgentMessage(event);
      if (unphasedText) {
        appendPendingCodexAgentMessage(state, unphasedText);
        break;
      }
      if (isFinalAnswerLikeAgentMessage(item)) appendUniqueText(state.finalAnswerMessages, text);
      else appendUniqueText(state.messages, text);
      break;
    }
    case 'assistant.message.delta':
    case 'assistant.message': {
      const text = extractAgentMessageText(event);
      if (!text) break;
      if (isFinalAnswerLikeAgentMessage(event)) appendUniqueText(state.finalAnswerMessages, text);
      else appendUniqueText(state.messages, text);
      break;
    }
    case 'agent_message':
    case 'assistant_message':
    case 'message': {
      const text = extractAgentMessageText(event);
      if (!text) break;
      if (isFinalAnswerLikeAgentMessage(event)) appendUniqueText(state.finalAnswerMessages, text);
      else appendUniqueText(state.messages, text);
      break;
    }
    case 'task_complete': {
      const text = String(event.last_agent_message || '').trim();
      if (matchesAnyComparableText(state.messages, text)) break;
      if (text) appendUniqueText(state.finalAnswerMessages, text);
      break;
    }
    case 'reasoning.delta':
    case 'reasoning': {
      const text = String(event.text || '').trim();
      if (text) state.reasonings.push(text);
      break;
    }
    case 'usage':
      state.usage = event;
      break;
    case 'turn.completed':
      flushPendingCodexAgentMessages(state, state.finalAnswerMessages);
      state.usage = event;
      break;
    case 'turn.failed':
    case 'turn.cancelled':
      flushPendingCodexAgentMessages(state, state.messages);
      break;
    default:
      if (isCodexTurnTerminalEvent(event)) clearPendingCodexAgentMessages(state);
      break;
  }
}

export function handleAntigravityRunnerEvent(event, state, ensureSessionBridge) {
  switch (String(event?.type || '').trim().toLowerCase()) {
    case 'init':
      state.threadId = event.session_id || event.sessionId || state.threadId;
      if (state.threadId) ensureSessionBridge(state.threadId);
      break;
    case 'message': {
      if (String(event.role || '').trim().toLowerCase() !== 'assistant') break;
      const text = String(event.content || '');
      if (!text) break;
      if (event.delta === true) {
        state.meta.antigravityDeltaBuffer = `${state.meta.antigravityDeltaBuffer || ''}${text}`;
      } else {
        state.messages.push(text.trim());
      }
      break;
    }
    case 'result':
      state.usage = event.stats && typeof event.stats === 'object' ? event.stats : event;
      break;
    default:
      break;
  }
}

export function handleClaudeRunnerEvent(event, state, ensureSessionBridge) {
  switch (event.type) {
    case 'stream_event': {
      const block = event.event?.content_block;
      if (event.event?.type === 'content_block_start' && block?.type === 'tool_use') {
        const toolName = String(block.name || '').trim().toLowerCase();
        if (toolName === 'agent') state.meta.claudeSawAgentToolUse = true;
      }
      break;
    }
    case 'session.created':
    case 'session.resumed':
      state.threadId = event.session_id || event.sessionId || state.threadId;
      if (state.threadId) ensureSessionBridge(state.threadId);
      break;
    case 'user': {
      appendClaudeToolResultText(state, event);
      const nextThreadId = event.session_id || event.sessionId || state.threadId;
      if (nextThreadId && nextThreadId !== state.threadId) {
        state.threadId = nextThreadId;
        ensureSessionBridge(state.threadId);
      }
      break;
    }
    case 'message':
    case 'assistant': {
      appendClaudeToolResultText(state, event);
      const text = extractClaudeText(event);
      if (!text) break;
      if (isClaudeFinalAnswerEvent(event)) appendUniqueText(state.finalAnswerMessages, text);
      else appendUniqueText(state.messages, text);
      const nextThreadId = event.session_id || event.sessionId || state.threadId;
      if (nextThreadId && nextThreadId !== state.threadId) {
        state.threadId = nextThreadId;
        ensureSessionBridge(state.threadId);
      }
      break;
    }
    case 'result': {
      const text = extractClaudeText(event);
      if (text) appendUniqueText(state.finalAnswerMessages, text);
      state.meta.claudeStopReason = extractClaudeStopReason(event);
      const nextThreadId = event.session_id || event.sessionId || state.threadId;
      if (nextThreadId) {
        state.threadId = nextThreadId;
        ensureSessionBridge(state.threadId);
      }
      if (event.usage) state.usage = event.usage;
      break;
    }
    default:
      break;
  }
}

function appendUniqueText(list, text) {
  const next = String(text || '').trim();
  if (!next) return;
  const previous = String(list?.[list.length - 1] || '').trim();
  if (normalizeComparableText(previous) === normalizeComparableText(next)) return;
  list.push(next);
}

function appendPendingCodexAgentMessage(state, text) {
  if (!state.meta || typeof state.meta !== 'object') state.meta = {};
  if (!Array.isArray(state.meta.pendingCodexAgentMessages)) {
    state.meta.pendingCodexAgentMessages = [];
  }
  appendUniqueText(state.meta.pendingCodexAgentMessages, text);
}

function flushPendingCodexAgentMessages(state, target) {
  const pending = Array.isArray(state?.meta?.pendingCodexAgentMessages)
    ? state.meta.pendingCodexAgentMessages
    : [];
  for (const text of pending) appendUniqueText(target, text);
  clearPendingCodexAgentMessages(state);
}

function clearPendingCodexAgentMessages(state) {
  if (!state?.meta || typeof state.meta !== 'object') return;
  delete state.meta.pendingCodexAgentMessages;
}

function normalizeComparableText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function matchesAnyComparableText(list, text) {
  const normalized = normalizeComparableText(text);
  if (!normalized) return false;
  if (!Array.isArray(list)) return false;
  return list.some((item) => normalizeComparableText(item) === normalized);
}

function appendClaudeToolResultText(state, event) {
  const text = extractClaudeToolResultText(event);
  if (!text) return;
  if (!state.meta || typeof state.meta !== 'object') {
    state.meta = {};
  }
  if (!Array.isArray(state.meta.claudeToolResultMessages)) {
    state.meta.claudeToolResultMessages = [];
  }
  appendUniqueText(state.meta.claudeToolResultMessages, text);
}

function extractClaudeToolResultText(event) {
  const parts = collectClaudeToolResultParts([
    event?.message,
    event?.content,
    event?.result,
  ]);
  return parts.join('\n\n').trim();
}

function collectClaudeToolResultParts(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectClaudeToolResultParts(item));
  if (typeof value !== 'object') return [];

  const type = String(value.type || '').trim().toLowerCase();
  const parts = [];

  if (type === 'tool_result') {
    parts.push(...collectClaudeTextParts([
      value.content,
      value.text,
      value.output_text,
      value.input_text,
      value.stdout,
      value.stderr,
      value.message,
    ]));
  }

  if (value.message && typeof value.message === 'object') {
    parts.push(...collectClaudeToolResultParts(value.message));
  }
  if (Array.isArray(value.content)) {
    parts.push(...collectClaudeToolResultParts(value.content));
  }
  if (value.result && typeof value.result === 'object') {
    parts.push(...collectClaudeToolResultParts(value.result));
  }

  return parts;
}

function collectClaudeTextParts(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    const text = value.trim();
    return text ? [text] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectClaudeTextParts(item));
  }
  if (typeof value !== 'object') return [];

  const type = String(value.type || '').trim().toLowerCase();
  if (type === 'tool_use' || type === 'tool_result' || type === 'server_tool_use' || type === 'thinking') {
    return [];
  }

  const parts = [
    ...collectClaudeTextParts(value.text),
    ...collectClaudeTextParts(value.output_text),
    ...collectClaudeTextParts(value.input_text),
    ...collectClaudeTextParts(value.reasoning_text),
  ];

  if (typeof value.message === 'string') {
    parts.push(...collectClaudeTextParts(value.message));
  } else if (value.message && typeof value.message === 'object') {
    parts.push(...collectClaudeTextParts(value.message));
  }

  if (Array.isArray(value.content)) {
    parts.push(...collectClaudeTextParts(value.content));
  }

  return parts;
}

function extractClaudeStopReason(event) {
  const candidates = [
    event?.stop_reason,
    event?.stopReason,
    event?.message?.stop_reason,
    event?.message?.stopReason,
    event?.result?.stop_reason,
    event?.result?.stopReason,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || '').trim();
    if (text) return text;
  }
  return '';
}

function isClaudeFinalAnswerEvent(event) {
  return extractClaudeStopReason(event).toLowerCase() === 'end_turn';
}

function extractClaudeText(event) {
  if (!event || typeof event !== 'object') return '';
  const parts = collectClaudeTextParts([
    event.text,
    event.message,
    event.content,
    event.result,
  ]);
  return parts.join('\n\n').trim();
}
