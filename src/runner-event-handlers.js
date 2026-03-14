export function createRunnerEventParser({
  normalizeProvider = (value) => String(value || '').trim().toLowerCase(),
  extractAgentMessageText = () => '',
  isFinalAnswerLikeAgentMessage = () => true,
} = {}) {
  return function handleRunnerEvent(provider, event, state, ensureSessionBridge) {
    switch (normalizeProvider(provider)) {
      case 'claude':
        handleClaudeRunnerEvent(event, state, ensureSessionBridge);
        break;
      case 'gemini':
        handleGeminiRunnerEvent(event, state, ensureSessionBridge);
        break;
      default:
        handleCodexRunnerEvent(event, state, ensureSessionBridge, {
          extractAgentMessageText,
          isFinalAnswerLikeAgentMessage,
        });
        break;
    }
  };
}

export function handleCodexRunnerEvent(event, state, ensureSessionBridge, {
  extractAgentMessageText = () => '',
  isFinalAnswerLikeAgentMessage = () => true,
} = {}) {
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
      if (isFinalAnswerLikeAgentMessage(item)) state.finalAnswerMessages.push(text);
      else state.messages.push(text);
      break;
    }
    case 'assistant.message.delta':
    case 'assistant.message': {
      const text = extractAgentMessageText(event);
      if (!text) break;
      if (isFinalAnswerLikeAgentMessage(event)) state.finalAnswerMessages.push(text);
      else state.messages.push(text);
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
      state.usage = event;
      break;
    default:
      break;
  }
}

export function handleGeminiRunnerEvent(event, state, ensureSessionBridge) {
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
        state.meta.geminiDeltaBuffer = `${state.meta.geminiDeltaBuffer || ''}${text}`;
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
      state.threadId = event.session_id || state.threadId;
      if (state.threadId) ensureSessionBridge(state.threadId);
      break;
    case 'message':
    case 'assistant': {
      const text = extractClaudeText(event);
      if (!text) break;
      state.messages.push(text);
      break;
    }
    case 'result': {
      const text = extractClaudeText(event);
      if (text) state.finalAnswerMessages.push(text);
      state.meta.claudeStopReason = event.stop_reason ?? '';
      if (event.session_id) {
        state.threadId = event.session_id;
        ensureSessionBridge(state.threadId);
      }
      if (event.usage) state.usage = event.usage;
      break;
    }
    default:
      break;
  }
}

function extractClaudeText(event) {
  if (!event || typeof event !== 'object') return '';
  if (typeof event.text === 'string') return event.text.trim();
  if (typeof event.message === 'string') return event.message.trim();
  if (Array.isArray(event.content)) {
    return event.content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.type === 'text') return item.text || '';
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}
