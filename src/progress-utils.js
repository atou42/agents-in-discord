const DEFAULT_PREVIEW_CHARS = 140;
const DEFAULT_PLAN_MAX_LINES = 4;
const DEFAULT_DONE_STEPS_MAX = 4;
const DEFAULT_ACTIVITY_MAX = 4;

function truncate(text, max) {
  const value = String(text || '');
  if (!value || value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeEventType(type) {
  return String(type || '').trim().toLowerCase().replace(/[./-]/g, '_');
}

function prettifyEventType(type) {
  const value = normalizeWhitespace(String(type || '').replace(/[._-]+/g, ' '));
  return value || 'received event';
}

function parseJsonMaybe(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (!(text.startsWith('{') || text.startsWith('['))) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeStatus(status) {
  const value = normalizeWhitespace(status).toLowerCase();
  if (!value) return '';
  if (['completed', 'complete', 'done', 'finished', 'success', 'ok'].includes(value)) return 'completed';
  if (['started', 'start', 'running', 'in_progress', 'in-progress', 'active'].includes(value)) return 'started';
  return value;
}

function extractEventPayload(ev) {
  if (!ev || typeof ev !== 'object') return null;
  if (ev.payload && typeof ev.payload === 'object') return ev.payload;
  if (ev.message && typeof ev.message === 'object') return ev.message;
  return null;
}

function compactUrl(rawUrl, previewChars = DEFAULT_PREVIEW_CHARS) {
  const text = normalizeWhitespace(rawUrl);
  if (!text) return '';

  try {
    const url = new URL(text);
    const host = url.hostname || '';
    const pathname = url.pathname && url.pathname !== '/' ? url.pathname : '';
    const summary = `${host}${pathname}` || text;
    return truncate(summary, Math.max(28, Math.floor(previewChars * 0.8)));
  } catch {
    return truncate(text, Math.max(28, Math.floor(previewChars * 0.8)));
  }
}

function extractWebSearchActionSummary(raw, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  if (!raw || typeof raw !== 'object') return '';

  const action = raw.action && typeof raw.action === 'object' ? raw.action : raw;
  const actionType = normalizeEventType(action.type || raw.action_type || raw.kind || '');
  const query = normalizeWhitespace(action.query || action.q || raw.query || raw.q || '');
  const queries = Array.isArray(action.queries) ? action.queries : Array.isArray(raw.queries) ? raw.queries : [];
  const firstQuery = query || normalizeWhitespace(queries[0] || '');
  const url = compactUrl(action.url || raw.url || '', previewChars);
  const pattern = normalizeWhitespace(action.pattern || raw.pattern || '');

  if (actionType.includes('search') || firstQuery) {
    return firstQuery ? `search: ${truncate(firstQuery, previewChars)}` : 'search';
  }

  if (actionType.includes('open') || (url && !pattern)) {
    return url ? `open page: ${url}` : 'open page';
  }

  if (actionType.includes('find') || pattern) {
    if (pattern && url) return `find "${truncate(pattern, Math.floor(previewChars * 0.55))}" in ${url}`;
    if (pattern) return `find "${truncate(pattern, Math.floor(previewChars * 0.7))}"`;
    if (url) return `find in ${url}`;
    return 'find in page';
  }

  if (url) return `open page: ${url}`;
  if (pattern) return `find "${truncate(pattern, Math.floor(previewChars * 0.7))}"`;
  return '';
}

function extractCommandPreview(raw, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  if (!raw || typeof raw !== 'object') return '';

  const candidates = [
    raw.command,
    raw.cmd,
    raw.parsed_cmd,
    raw.parsedCmd,
    raw.invocation?.command,
    raw.input?.command,
    raw.output?.command,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const joined = normalizeWhitespace(candidate.join(' '));
      if (joined) return truncate(joined, previewChars);
      continue;
    }

    const text = normalizeWhitespace(candidate);
    if (text) return truncate(text, previewChars);
  }

  return '';
}

function extractItemToolName(item) {
  if (!item || typeof item !== 'object') return null;
  const raw = item.tool_name || item.name || item.call?.name || item.tool?.name || null;
  const normalized = normalizeWhitespace(raw);
  return normalized || null;
}

function extractToolCallArguments(item) {
  if (!item || typeof item !== 'object') return null;
  const raw = item.call?.arguments ?? item.call?.args ?? item.arguments ?? item.args ?? null;
  if (!raw) return null;

  if (typeof raw === 'string') {
    const parsed = parseJsonMaybe(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }

  return raw && typeof raw === 'object' ? raw : null;
}

function extractDirectToolName(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const direct = normalizeWhitespace(raw.tool_name || raw.name || raw.tool?.name || '');
  if (direct) return direct;
  const toolId = normalizeWhitespace(raw.tool_id || '');
  if (!toolId) return null;
  const match = toolId.match(/^([a-z0-9_]+?)(?:_\d.*)?$/i);
  return normalizeWhitespace(match?.[1] || toolId) || null;
}

function compactAgentId(rawId) {
  const id = normalizeWhitespace(rawId);
  if (!id) return '';
  const grouped = id.match(/^([0-9a-z]+-[0-9a-z]+)/i);
  if (grouped?.[1]) return grouped[1];
  return id.length <= 14 ? id : id.slice(0, 14);
}

function formatSubagentLabel({ agentId = '', nickname = '' } = {}) {
  const compactId = compactAgentId(agentId);
  const name = normalizeWhitespace(nickname);
  if (name && compactId) return `${name} (${compactId})`;
  return name || compactId || 'subagent';
}

function isSubagentToolName(toolName) {
  const normalized = normalizeEventType(toolName);
  return normalized === 'spawn_agent'
    || normalized === 'send_input'
    || normalized === 'wait_agent'
    || normalized === 'resume_agent'
    || normalized === 'close_agent';
}

function extractSubagentTaskPreview(args, options = {}) {
  if (!args || typeof args !== 'object') return '';
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));

  const candidates = [
    args.message,
    args.task,
    args.prompt,
    args.instructions,
    args.question,
  ];

  for (const candidate of candidates) {
    const text = normalizeWhitespace(candidate);
    if (text) return truncate(text, previewChars);
  }

  if (Array.isArray(args.items)) {
    const merged = normalizeWhitespace(args.items
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        return item.type === 'text'
          ? item.text
          : item.text || item.name || '';
      })
      .filter(Boolean)
      .join(' '));
    if (merged) return truncate(merged, previewChars);
  }

  return '';
}

function formatSubagentTargets(rawTargets) {
  const list = Array.isArray(rawTargets)
    ? rawTargets
    : rawTargets
      ? [rawTargets]
      : [];
  const labels = list
    .map((item) => formatSubagentLabel({ agentId: item }))
    .filter(Boolean);
  if (!labels.length) return '';
  if (labels.length <= 2) return labels.join(', ');
  return `${labels[0]}, ${labels[1]} +${labels.length - 2} more`;
}

function summarizeSubagentToolCall(toolName, args, options = {}) {
  const normalizedTool = normalizeEventType(toolName);
  if (!isSubagentToolName(normalizedTool)) return '';

  if (normalizedTool === 'spawn_agent') {
    const task = extractSubagentTaskPreview(args, options);
    const agentType = normalizeWhitespace(args?.agent_type || '');
    const prefix = agentType ? `subagent ${agentType}` : 'subagent';
    return task ? `${prefix} starting: ${task}` : `${prefix} starting`;
  }

  if (normalizedTool === 'send_input') {
    const target = formatSubagentTargets(args?.target || args?.targets);
    const task = extractSubagentTaskPreview(args, options);
    const prefix = target ? `subagent update ${target}` : 'subagent update';
    return task ? `${prefix}: ${task}` : prefix;
  }

  if (normalizedTool === 'wait_agent') {
    const target = formatSubagentTargets(args?.targets || args?.target);
    return target ? `waiting for subagent ${target}` : 'waiting for subagent';
  }

  if (normalizedTool === 'resume_agent') {
    const target = formatSubagentTargets(args?.id || args?.target);
    return target ? `resuming subagent ${target}` : 'resuming subagent';
  }

  if (normalizedTool === 'close_agent') {
    const target = formatSubagentTargets(args?.target);
    return target ? `closing subagent ${target}` : 'closing subagent';
  }

  return '';
}

function extractFunctionCallOutputObject(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload.output ?? payload.result ?? payload.data ?? null;
  if (!raw) return null;
  if (typeof raw === 'string') {
    const parsed = parseJsonMaybe(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }
  return raw && typeof raw === 'object' ? raw : null;
}

function extractSubagentStatusInfo(status) {
  if (!status || typeof status !== 'object' || Array.isArray(status)) {
    return { state: '', detail: '' };
  }
  const [entry] = Object.entries(status);
  if (!entry) return { state: '', detail: '' };
  const [rawState, rawDetail] = entry;
  return {
    state: normalizeStatus(rawState) || normalizeEventType(rawState),
    detail: normalizeWhitespace(rawDetail),
  };
}

function summarizeSubagentToolOutput(payload) {
  const output = extractFunctionCallOutputObject(payload);
  if (!output) return '';

  if (output.agent_id || output.nickname) {
    return `subagent started: ${formatSubagentLabel({
      agentId: output.agent_id,
      nickname: output.nickname,
    })}`;
  }

  if (output.submission_id) return 'subagent message queued';

  if (Object.prototype.hasOwnProperty.call(output, 'timed_out') || output.status) {
    if (output.timed_out === true) return 'subagent wait timed out';
    const statusInfo = extractSubagentStatusInfo(output.status);
    if (statusInfo.state) return `subagent ${statusInfo.state}`;
    return 'subagent wait updated';
  }

  return '';
}

function parseSubagentNotificationText(rawText) {
  const text = String(rawText || '');
  if (!text.includes('<subagent_notification>')) return null;
  const match = text.match(/<subagent_notification>\s*([\s\S]*?)\s*<\/subagent_notification>/i);
  if (!match?.[1]) return null;
  const parsed = parseJsonMaybe(match[1].trim());
  return parsed && typeof parsed === 'object' ? parsed : null;
}

function extractSubagentNotification(item) {
  if (!item || typeof item !== 'object') return null;
  const candidates = [];
  if (typeof item.text === 'string') candidates.push(item.text);
  if (typeof item.message === 'string') candidates.push(item.message);
  if (typeof item.content === 'string') candidates.push(item.content);
  if (Array.isArray(item.content)) {
    for (const part of item.content) {
      if (!part || typeof part !== 'object') continue;
      if (typeof part.text === 'string') candidates.push(part.text);
      if (typeof part.output_text === 'string') candidates.push(part.output_text);
      if (typeof part.input_text === 'string') candidates.push(part.input_text);
    }
  }

  for (const candidate of candidates) {
    const parsed = parseSubagentNotificationText(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function summarizeSubagentNotification(notification) {
  if (!notification || typeof notification !== 'object') return '';
  const label = formatSubagentLabel({
    agentId: notification.agent_path || notification.agent_id,
    nickname: notification.nickname,
  });
  const statusInfo = extractSubagentStatusInfo(notification.status);
  const state = statusInfo.state || 'updated';
  return label ? `subagent ${state}: ${label}` : `subagent ${state}`;
}

function extractSubagentNotificationReportPreview(notification, options = {}) {
  if (!notification || typeof notification !== 'object') return '';
  const statusInfo = extractSubagentStatusInfo(notification.status);
  if (!statusInfo.detail) return summarizeSubagentNotification(notification);
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  const label = formatSubagentLabel({
    agentId: notification.agent_path || notification.agent_id,
    nickname: notification.nickname,
  });
  const preview = truncate(statusInfo.detail, previewChars);
  return label ? `subagent report ${label}: ${preview}` : `subagent report: ${preview}`;
}

function summarizeKnownArgObject(args, options = {}) {
  if (!args || typeof args !== 'object') return '';

  const webSearch = extractWebSearchActionSummary(args, options);
  if (webSearch) return webSearch;

  const command = extractCommandPreview(args, options);
  if (command) return `run: ${command}`;

  const scalarKeys = ['query', 'q', 'url', 'pattern', 'location', 'ticker', 'path', 'file_path', 'team', 'ref_id', 'name', 'title'];
  for (const key of scalarKeys) {
    const value = normalizeWhitespace(args[key]);
    if (!value) continue;
    if (key === 'url') return `open page: ${compactUrl(value, options.previewChars)}`;
    if (key === 'pattern') return `find "${truncate(value, Math.floor((options.previewChars || DEFAULT_PREVIEW_CHARS) * 0.7))}"`;
    return `${key}: ${truncate(value, options.previewChars || DEFAULT_PREVIEW_CHARS)}`;
  }

  const list = Array.isArray(args.search_query) ? args.search_query : null;
  if (list?.length) {
    const first = list[0] && typeof list[0] === 'object' ? list[0] : null;
    const query = normalizeWhitespace(first?.q);
    if (query) return `search: ${truncate(query, options.previewChars || DEFAULT_PREVIEW_CHARS)}`;
  }

  return '';
}

function extractPayloadTextPreview(payload, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  if (!payload || typeof payload !== 'object') return '';

  const textCandidates = [];
  if (typeof payload.text === 'string') textCandidates.push(payload.text);
  if (typeof payload.content === 'string') textCandidates.push(payload.content);

  if (Array.isArray(payload.content)) {
    for (const part of payload.content) {
      if (!part || typeof part !== 'object') continue;
      if (typeof part.text === 'string') textCandidates.push(part.text);
      if (typeof part.output_text === 'string') textCandidates.push(part.output_text);
      if (typeof part.input_text === 'string') textCandidates.push(part.input_text);
      if (typeof part.reasoning_text === 'string') textCandidates.push(part.reasoning_text);
    }
  }

  const normalized = normalizeWhitespace(textCandidates.join(' '));
  if (!normalized) return '';
  return truncate(normalized, previewChars);
}

function extractDeltaTextPreview(ev, payload, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  const textCandidates = [];
  const pushText = (value) => {
    if (typeof value !== 'string') return;
    const normalized = normalizeWhitespace(value);
    if (!normalized) return;
    textCandidates.push(normalized);
  };

  pushText(ev?.delta);
  pushText(ev?.delta?.text);
  pushText(ev?.text_delta);
  pushText(ev?.output_text_delta);
  pushText(ev?.reasoning_delta);
  pushText(payload?.delta);
  pushText(payload?.delta?.text);
  pushText(payload?.text_delta);
  pushText(payload?.output_text_delta);
  pushText(payload?.reasoning_delta);
  pushText(payload?.text);

  if (Array.isArray(payload?.content)) {
    for (const part of payload.content) {
      if (!part || typeof part !== 'object') continue;
      pushText(part.delta);
      pushText(part.text);
      pushText(part.output_text);
      pushText(part.input_text);
      pushText(part.reasoning_text);
    }
  }

  if (!textCandidates.length) {
    const preview = extractPayloadTextPreview(payload, { previewChars });
    if (preview) textCandidates.push(preview);
  }

  const merged = normalizeWhitespace(textCandidates.join(' '));
  return merged ? truncate(merged, previewChars) : '';
}

function summarizeResponseItem(payload, options = {}) {
  if (!payload || typeof payload !== 'object') return '';
  const payloadType = normalizeEventType(payload.type || '');
  const status = normalizeStatus(payload.status || '');

  if (payloadType === 'web_search_call') {
    const detail = extractWebSearchActionSummary(payload.action || payload, options);
    const phase = status || 'updated';
    return detail ? `web search ${phase}: ${detail}` : `web search ${phase}`;
  }

  if (payloadType === 'local_shell_call') {
    const command = extractCommandPreview(payload, options);
    const phase = status || 'updated';
    return command ? `command ${phase}: ${command}` : `command ${phase}`;
  }

  if (payloadType === 'message') {
    const notification = extractSubagentNotification(payload);
    if (notification) return summarizeSubagentNotification(notification);
    const preview = extractPayloadTextPreview(payload, options);
    return preview ? `agent message: ${preview}` : 'agent message';
  }

  if (payloadType === 'reasoning') {
    if (!options.showReasoning) return status ? `reasoning ${status}` : 'reasoning';
    const preview = extractPayloadTextPreview(payload, options);
    return preview ? `reasoning: ${preview}` : status ? `reasoning ${status}` : 'reasoning';
  }

  if (payloadType === 'function_call' || payloadType === 'custom_tool_call') {
    const toolName = extractItemToolName(payload) || normalizeWhitespace(payload.name || payload.tool_name || payload.call?.name || 'tool');
    const subagentSummary = summarizeSubagentToolCall(toolName, extractToolCallArguments(payload) || payload, options);
    if (subagentSummary) return subagentSummary;
    const detail = summarizeKnownArgObject(extractToolCallArguments(payload) || payload, options);
    const phase = status || 'updated';
    return detail ? `tool ${toolName} ${phase}: ${detail}` : `tool ${toolName} ${phase}`;
  }

  if (payloadType === 'function_call_output') {
    const subagentSummary = summarizeSubagentToolOutput(payload);
    if (subagentSummary) return subagentSummary;
  }

  return '';
}

export function summarizeCodexEvent(ev, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  const showReasoning = Boolean(options.showReasoning);
  const opts = { previewChars, showReasoning };

  if (!ev || typeof ev !== 'object') return 'received event';

  const rawType = normalizeWhitespace(ev.type || '');
  if (!rawType) return 'received event';

  const type = normalizeEventType(rawType);
  const payload = extractEventPayload(ev);
  const apiErrorSummary = extractApiErrorSummary(ev, payload, opts);
  if (apiErrorSummary) return apiErrorSummary;

  if (type === 'event_msg' && payload && typeof payload === 'object') {
    const nestedType = normalizeWhitespace(payload.type || '');
    if (nestedType && nestedType.toLowerCase() !== 'event_msg') {
      return summarizeCodexEvent({
        ...payload,
        type: nestedType,
      }, options);
    }
  }

  if (type === 'stream_event' && ev.event && typeof ev.event === 'object') {
    return summarizeCodexEvent({
      ...ev.event,
      type: ev.event.type,
      session_id: ev.session_id || ev.sessionId,
    }, options);
  }

  if (type === 'response_item' && payload) {
    const summary = summarizeResponseItem(payload, opts);
    if (summary) return summary;
  }

  if (type === 'assistant' || type === 'assistant_message') {
    const preview = extractPayloadTextPreview(payload || ev.message || ev, opts);
    return preview ? `agent message: ${preview}` : 'agent message';
  }

  if (type === 'message') {
    const role = normalizeEventType(ev.role || payload?.role || '');
    if (role && role !== 'assistant') return prettifyEventType(rawType);
    const preview = extractPayloadTextPreview(ev, opts) || extractDeltaTextPreview(ev, payload, opts);
    return preview ? `agent message: ${preview}` : 'agent message';
  }

  if (type.endsWith('_delta')) {
    const delta = extractDeltaTextPreview(ev, payload, opts);
    if (type.includes('reasoning')) {
      if (!showReasoning) return 'reasoning delta';
      return delta ? `reasoning: ${delta}` : 'reasoning delta';
    }
    if (type.includes('output_text') || type.includes('message') || type.includes('content_part') || type.includes('content_block')) {
      return delta ? `agent message: ${delta}` : 'agent message delta';
    }
    return delta ? `${prettifyEventType(rawType)}: ${delta}` : prettifyEventType(rawType);
  }

  switch (type) {
    case 'thread_started':
      return ev.thread_id ? `session started: ${ev.thread_id}` : 'session started';
    case 'init':
      return ev.session_id || ev.sessionId ? `session started: ${ev.session_id || ev.sessionId}` : 'session started';
    case 'system_init':
      return ev.session_id ? `session started: ${ev.session_id}` : 'session started';
    case 'message_start':
      return 'turn started';
    case 'content_block_start':
      return 'agent message started';
    case 'assistant':
    case 'assistant_message': {
      const preview = extractPayloadTextPreview(ev.message || ev, { previewChars });
      return preview ? `agent message: ${preview}` : 'agent message';
    }
    case 'queue_operation': {
      const op = normalizeEventType(ev.operation || 'updated');
      if (op === 'enqueue') return 'prompt queued';
      if (op === 'dequeue') return 'prompt dequeued';
      return op ? `queue ${op}` : 'queue updated';
    }
    case 'result': {
      const input = extractInputTokensFromUsage(ev.usage || ev.stats);
      return input === null ? 'turn completed' : `turn completed (input tokens: ${input})`;
    }
    case 'system_init':
      return ev.session_id || ev.sessionId ? `session started: ${ev.session_id || ev.sessionId}` : 'session started';
    case 'turn_started':
      return 'turn started';
    case 'turn_completed': {
      const input = extractInputTokensFromUsage(ev.usage);
      return input === null ? 'turn completed' : `turn completed (input tokens: ${input})`;
    }
    case 'result': {
      const input = extractInputTokensFromUsage(ev.usage || ev.result?.usage);
      return input === null ? 'turn completed' : `turn completed (input tokens: ${input})`;
    }
    case 'error': {
      let detail = '';
      if (typeof ev.error === 'string') {
        detail = ev.error;
      } else {
        try {
          detail = JSON.stringify(ev.error);
        } catch {
          detail = String(ev.error || 'unknown');
        }
      }
      return `error: ${truncate(String(detail || 'unknown'), previewChars)}`;
    }
    case 'tool_use': {
      const toolName = extractDirectToolName(ev) || 'tool';
      const subagentSummary = summarizeSubagentToolCall(toolName, ev.parameters || ev.args || ev, opts);
      if (subagentSummary) return subagentSummary;
      const detail = summarizeKnownArgObject(ev.parameters || ev.args || ev, opts);
      return detail ? `tool ${toolName} started: ${detail}` : `tool ${toolName} started`;
    }
    case 'tool_result': {
      const toolName = extractDirectToolName(ev) || 'tool';
      const phase = normalizeStatus(ev.status || '') || 'completed';
      return `tool ${toolName} ${phase}`;
    }
    case 'item_started':
    case 'item_completed': {
      const item = ev.item || {};
      const action = type === 'item_started' ? 'started' : 'completed';
      const itemType = normalizeEventType(item.type || 'item');

      if (itemType === 'agent_message') {
        const preview = extractEventTextPreview(item, { previewChars });
        return preview ? `agent message ${action}: ${preview}` : `agent message ${action}`;
      }

      if (itemType === 'reasoning') {
        if (!showReasoning) return `reasoning ${action}`;
        const preview = extractEventTextPreview(item, { previewChars });
        return preview ? `reasoning ${action}: ${preview}` : `reasoning ${action}`;
      }

      if (itemType === 'web_search_call') {
        const detail = extractWebSearchActionSummary(item.action || item, opts);
        return detail ? `web search ${action}: ${detail}` : `web search ${action}`;
      }

      if (itemType === 'local_shell_call') {
        const command = extractCommandPreview(item, opts);
        return command ? `command ${action}: ${command}` : `command ${action}`;
      }

      const toolName = extractItemToolName(item);
      if (toolName) {
        const subagentSummary = summarizeSubagentToolCall(toolName, extractToolCallArguments(item) || item, opts);
        if (subagentSummary) return subagentSummary;
        const detail = summarizeKnownArgObject(extractToolCallArguments(item) || item, opts);
        return detail ? `tool ${toolName} ${action}: ${detail}` : `tool ${toolName} ${action}`;
      }

      const preview = extractEventTextPreview(item, { previewChars });
      if (preview) return `${itemType} ${action}: ${preview}`;
      return `${itemType} ${action}`;
    }
    default:
      break;
  }

  if (type.startsWith('web_search_')) {
    const detail = extractWebSearchActionSummary(ev, opts) || extractWebSearchActionSummary(payload || {}, opts);
    const phase = type.endsWith('completed') || type.endsWith('end')
      ? 'completed'
      : type.endsWith('begin') || type.endsWith('started')
        ? 'started'
        : 'updated';
    return detail ? `web search ${phase}: ${detail}` : `web search ${phase}`;
  }

  if (type.startsWith('exec_command_')) {
    const command = extractCommandPreview(ev, opts) || extractCommandPreview(payload || {}, opts);
    const phase = type.endsWith('end') ? 'completed' : 'started';
    return command ? `command ${phase}: ${command}` : `command ${phase}`;
  }

  return prettifyEventType(rawType);
}

function pickFirstRawText(values) {
  if (!Array.isArray(values)) return '';
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const text = value.replace(/\r/g, '').trim();
    if (text) return text;
  }
  return '';
}

function pickFirstRawTextFromContent(content) {
  if (!Array.isArray(content)) return '';
  for (const part of content) {
    if (!part || typeof part !== 'object') continue;
    const text = pickFirstRawText([
      part.delta,
      part.text,
      part.output_text,
      part.input_text,
      part.reasoning_text,
    ]);
    if (text) return text;
  }
  return '';
}

function extractStopReason(ev, payload) {
  const candidates = [
    ev?.stop_reason,
    ev?.stopReason,
    payload?.stop_reason,
    payload?.stopReason,
    payload?.message?.stop_reason,
    payload?.message?.stopReason,
  ];
  for (const candidate of candidates) {
    const text = normalizeEventType(candidate);
    if (text) return text;
  }
  return '';
}

function extractApiErrorSummary(ev, payload, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  const type = normalizeEventType(ev?.type || '');
  const subtype = normalizeEventType(ev?.subtype || '');
  const role = normalizeEventType(ev?.role || payload?.role || '');
  if (type === 'system' && subtype === 'api_error') {
    const statusCode = normalizeWhitespace(
      ev?.error?.status
      || ev?.error?.error?.status
      || ev?.error?.error?.error?.status,
    );
    const detail = normalizeWhitespace(
      ev?.error?.error?.error?.message
      || ev?.error?.error?.message
      || ev?.error?.message
      || '',
    );
    const prefix = statusCode ? `API error ${statusCode}` : 'API error';
    if (!detail) return prefix;
    return `${prefix}: ${truncate(detail, previewChars)}`;
  }
  if (!['assistant', 'assistant_message', 'message', 'result', 'error'].includes(type) && role !== 'assistant') {
    return '';
  }

  const text = pickFirstRawText([
    payload?.message,
    payload?.text,
    payload?.output_text,
    payload?.input_text,
    ev?.message,
    ev?.text,
  ]) || pickFirstRawTextFromContent(payload?.content || ev?.content);
  const normalized = normalizeWhitespace(text);
  if (!/^api error\s*:/i.test(normalized)) return '';

  const match = normalized.match(/^api error\s*:\s*(\d{3})\s*(.*)$/i);
  const statusCode = match?.[1] || '';
  const remainder = String(match?.[2] || '').trim();

  let detail = remainder;
  if (remainder.startsWith('{')) {
    const parsed = parseJsonMaybe(remainder);
    if (parsed && typeof parsed === 'object') {
      detail = normalizeWhitespace(
        parsed?.error?.message
        || parsed?.message
        || parsed?.error_description
        || remainder,
      );
    }
  }

  const prefix = statusCode ? `API error ${statusCode}` : 'API error';
  if (!detail) return prefix;
  return `${prefix}: ${truncate(detail, previewChars)}`;
}

function isLowSignalProcessText(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return true;
  const lower = normalized.toLowerCase();
  if (lower === '...') return true;
  if (/^asking\b/.test(lower)) return true;
  if (/^reasoning\b/.test(lower)) return true;
  if (/^thinking\b/.test(lower)) return true;
  return false;
}

export function extractRawProgressTextFromEvent(ev) {
  if (!ev || typeof ev !== 'object') return '';
  const type = normalizeEventType(ev.type || '');
  const payload = extractEventPayload(ev);
  const item = ev.item && typeof ev.item === 'object' ? ev.item : null;
  const apiErrorSummary = extractApiErrorSummary(ev, payload);
  if (apiErrorSummary) return apiErrorSummary;

  if (type === 'event_msg' && payload && typeof payload === 'object') {
    const nestedType = normalizeEventType(payload.type || '');
    if (nestedType === 'agent_message') {
      const phase = normalizeEventType(payload.phase || '');
      if (phase === 'final_answer') return '';
      const text = pickFirstRawText([
        payload.message,
        payload.text,
        payload.payload?.text,
      ]);
      if (!text || isLowSignalProcessText(text)) return '';
      return text;
    }
    if (nestedType === 'agent_reasoning' || nestedType === 'reasoning') return '';
    if (nestedType) {
      return extractRawProgressTextFromEvent({
        ...payload,
        type: payload.type,
      });
    }
  }

  if (type === 'stream_event' && ev.event && typeof ev.event === 'object') {
    const nestedType = normalizeEventType(ev.event.type || '');
    if (nestedType === 'content_block_delta' || nestedType === 'content_block_start') {
      return '';
    }
    return extractRawProgressTextFromEvent({
      ...ev.event,
      type: ev.event.type,
      session_id: ev.session_id || ev.sessionId,
    });
  }

  if (type === 'assistant') {
    const content = Array.isArray(payload?.content) ? payload.content : Array.isArray(ev?.content) ? ev.content : [];
    const hasClaudeMessageShape = payload && typeof payload === 'object'
      && normalizeEventType(payload.type || '') === 'message'
      && normalizeEventType(payload.role || '') === 'assistant';
    const containsStructuredBlocks = content.some((part) => part && typeof part === 'object' && normalizeEventType(part.type || ''));
    // Claude stream-json emits assistant snapshots before the trailing message_delta/result.
    // They often contain the final answer body without a stop_reason yet, so they should not
    // be treated as process content for the Discord progress card.
    if (hasClaudeMessageShape && containsStructuredBlocks) return '';
  }

  if (type === 'assistant' || type === 'assistant_message') {
    const phase = normalizeEventType(payload?.phase || ev.phase || '');
    const stopReason = extractStopReason(ev, payload);
    if (phase === 'final_answer') return '';
    if (stopReason === 'end_turn') return '';
    const text = pickFirstRawText([
      payload?.message,
      payload?.text,
      payload?.output_text,
      payload?.input_text,
      ev?.message,
      ev?.text,
    ]) || pickFirstRawTextFromContent(payload?.content || ev?.content);
    if (!text || isLowSignalProcessText(text)) return '';
    return text;
  }

  if (type === 'message') {
    const notification = extractSubagentNotification(ev) || extractSubagentNotification(payload);
    if (notification) {
      const preview = extractSubagentNotificationReportPreview(notification);
      return isLowSignalProcessText(preview) ? '' : preview;
    }
    const role = normalizeEventType(ev.role || payload?.role || '');
    const stopReason = extractStopReason(ev, payload);
    if (role && role !== 'assistant') return '';
    if (stopReason === 'end_turn') return '';
    const text = pickFirstRawText([
      ev.content,
      ev.message,
      ev.text,
      payload?.message,
      payload?.text,
    ]) || pickFirstRawTextFromContent(ev.content || payload?.content);
    if (!text || isLowSignalProcessText(text)) return '';
    return text;
  }

  if (type.endsWith('_delta')) {
    if (type.includes('reasoning')) return '';
    if (!(type.includes('output_text') || type.includes('message') || type.includes('content_part') || type.includes('content_block'))) return '';
    const text = pickFirstRawText([
      ev.delta,
      ev.delta?.text,
      ev.text_delta,
      ev.output_text_delta,
      payload?.delta,
      payload?.delta?.text,
      payload?.text_delta,
      payload?.output_text_delta,
      payload?.text,
    ]) || pickFirstRawTextFromContent(payload?.content);
    if (!text || isLowSignalProcessText(text)) return '';
    return text;
  }

  if (type === 'item_completed' || type === 'item_started') {
    const itemType = normalizeEventType(item?.type || '');
    if (itemType === 'agent_message') return '';
    if (itemType === 'reasoning') return '';
    if (itemType === 'message') return '';
    return '';
  }

  if (type === 'response_item' && payload && typeof payload === 'object') {
    const payloadType = normalizeEventType(payload.type || '');
    if (payloadType === 'function_call' || payloadType === 'custom_tool_call') {
      const toolName = extractItemToolName(payload) || normalizeWhitespace(payload.name || payload.tool_name || '');
      const subagentSummary = summarizeSubagentToolCall(toolName, extractToolCallArguments(payload) || payload);
      if (subagentSummary) return subagentSummary;
    }
    if (payloadType === 'function_call_output') {
      const subagentSummary = summarizeSubagentToolOutput(payload);
      if (subagentSummary) return subagentSummary;
    }
    if (payloadType === 'message') {
      const notification = extractSubagentNotification(payload);
      if (notification) {
        const preview = extractSubagentNotificationReportPreview(notification);
        return isLowSignalProcessText(preview) ? '' : preview;
      }
      const phase = normalizeEventType(payload.phase || '');
      const role = normalizeEventType(payload.role || '');
      if (phase === 'final_answer') return '';
      if (role && role !== 'assistant') return '';
      const text = pickFirstRawText([
        payload.message,
        payload.text,
        payload.output_text,
        payload.input_text,
      ]) || pickFirstRawTextFromContent(payload.content);
      if (!text || isLowSignalProcessText(text)) return '';
      return text;
    }
    if (payloadType === 'reasoning') return '';
    if (payloadType === 'agent_message') return '';
  }

  if (type === 'tool_use') {
    const toolName = extractDirectToolName(ev) || 'tool';
    const detail = summarizeKnownArgObject(ev.parameters || ev.args || ev);
    return detail ? `${toolName}: ${detail}` : `tool ${toolName}`;
  }

  if (type === 'tool_result') {
    const status = normalizeStatus(ev.status || '');
    if (status === 'completed') {
      const toolName = extractDirectToolName(ev) || 'tool';
      return `tool ${toolName}`;
    }
  }

  return '';
}

export function extractEventTextPreview(item, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  const raw = typeof item?.text === 'string'
    ? item.text
    : Array.isArray(item?.content)
      ? item.content
        .map((x) => (typeof x?.text === 'string'
          ? x.text
          : typeof x?.output_text === 'string'
            ? x.output_text
            : typeof x?.input_text === 'string'
              ? x.input_text
              : ''))
        .join(' ')
      : '';
  const normalized = normalizeWhitespace(raw);
  if (!normalized) return '';
  return truncate(normalized, previewChars);
}

export function cloneProgressPlan(planState, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  if (!planState || typeof planState !== 'object' || !Array.isArray(planState.steps)) return null;
  const steps = planState.steps
    .map((item) => ({
      status: normalizePlanStatus(item?.status),
      step: truncate(normalizeWhitespace(item?.step || ''), previewChars),
    }))
    .filter((item) => item.step);
  if (!steps.length) return null;

  const completed = steps.filter((item) => item.status === 'completed').length;
  const inProgress = steps.filter((item) => item.status === 'in_progress').length;
  return {
    explanation: truncate(normalizeWhitespace(planState.explanation || ''), previewChars),
    steps,
    total: steps.length,
    completed,
    inProgress,
  };
}

export function normalizePlanStatus(value) {
  const raw = normalizeWhitespace(value).toLowerCase();
  if (!raw) return 'pending';
  if (['completed', 'complete', 'done', 'finished', 'success', 'ok'].includes(raw)) return 'completed';
  if (['in_progress', 'in-progress', 'progress', 'running', 'active', 'doing', 'current'].includes(raw)) return 'in_progress';
  if (['pending', 'todo', 'not_started', 'queued', 'planned', 'next'].includes(raw)) return 'pending';
  return 'pending';
}

function normalizePlanEntries(raw, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const hasStatusLike = Object.prototype.hasOwnProperty.call(item, 'status')
      || Object.prototype.hasOwnProperty.call(item, 'state')
      || Object.prototype.hasOwnProperty.call(item, 'phase');
    const explicitPlanText = item.step || item.title || item.task || '';
    const todoLike = Object.prototype.hasOwnProperty.call(item, 'status')
      && (Object.prototype.hasOwnProperty.call(item, 'content') || Object.prototype.hasOwnProperty.call(item, 'activeForm'));
    const step = normalizeWhitespace(
      explicitPlanText
      || (hasStatusLike ? item.name : '')
      || (hasStatusLike ? item.label : '')
      || (todoLike ? item.content : '')
      || (todoLike ? item.activeForm : '')
      || '',
    );
    if (!step) continue;
    out.push({
      status: normalizePlanStatus(item.status || item.state || item.phase),
      step: truncate(step, previewChars),
    });
  }
  return out;
}

function buildPlanStateFromUnknown(raw, options = {}, depth = 0) {
  if (depth > 3 || raw === null || raw === undefined) return null;

  if (typeof raw === 'string') {
    const parsed = parseJsonMaybe(raw);
    return parsed ? buildPlanStateFromUnknown(parsed, options, depth + 1) : null;
  }

  if (Array.isArray(raw)) {
    const direct = normalizePlanEntries(raw, options);
    if (direct.length) return cloneProgressPlan({ explanation: '', steps: direct }, options);
    for (const item of raw) {
      const nested = buildPlanStateFromUnknown(item, options, depth + 1);
      if (nested) return nested;
    }
    return null;
  }

  if (typeof raw !== 'object') return null;

  const directSource = Array.isArray(raw.plan)
    ? raw.plan
    : Array.isArray(raw.steps)
      ? raw.steps
      : Array.isArray(raw.todos)
        ? raw.todos
        : Array.isArray(raw.newTodos)
          ? raw.newTodos
          : Array.isArray(raw.oldTodos)
            ? raw.oldTodos
            : null;
  const direct = normalizePlanEntries(directSource, options);
  if (direct.length) {
    return cloneProgressPlan({
      explanation: raw.explanation || raw.summary || raw.note || '',
      steps: direct,
    }, options);
  }

  const keys = ['arguments', 'input', 'output', 'result', 'data', 'payload', 'value', 'content'];
  for (const key of keys) {
    if (!(key in raw)) continue;
    const nested = buildPlanStateFromUnknown(raw[key], options, depth + 1);
    if (nested) return nested;
  }

  return null;
}

export function extractPlanStateFromEvent(ev, options = {}) {
  if (!ev || typeof ev !== 'object') return null;
  const item = ev.item && typeof ev.item === 'object' ? ev.item : null;
  const payload = extractEventPayload(ev);
  const candidates = [
    ev.plan,
    ev.result,
    ev.output,
    ev.data,
    ev.tool_use_result,
    ev.toolUseResult,
    ev.payload,
    payload?.plan,
    payload?.result,
    payload?.output,
    payload?.input,
    payload?.tool_use_result,
    payload?.toolUseResult,
    payload?.call?.arguments,
    payload?.call?.args,
    payload?.content,
    item?.plan,
    item?.result,
    item?.output,
    item?.input,
    item?.tool_use_result,
    item?.toolUseResult,
    item?.call?.arguments,
    item?.call?.args,
    item?.content,
  ];

  for (const candidate of candidates) {
    const plan = buildPlanStateFromUnknown(candidate, options);
    if (plan) return plan;
  }

  const toolName = extractItemToolName(item || payload || {});
  if (toolName && toolName.toLowerCase().includes('update_plan')) {
    return buildPlanStateFromUnknown(item?.call?.arguments || payload?.call?.arguments, options);
  }
  return null;
}

function isCompletedLikeEvent(type) {
  return type === 'item_completed'
    || type.endsWith('_completed')
    || type.endsWith('_end')
    || type === 'turn_completed';
}

function summarizeCompletedPayload(payload, options = {}) {
  if (!payload || typeof payload !== 'object') return '';
  const payloadType = normalizeEventType(payload.type || '');
  if (payloadType === 'message' || payloadType === 'reasoning') return '';

  if (payloadType === 'web_search_call') {
    const detail = extractWebSearchActionSummary(payload.action || payload, options);
    return detail ? `web search: ${detail}` : 'web search';
  }

  if (payloadType === 'local_shell_call') {
    const command = extractCommandPreview(payload, options);
    return command ? `command: ${command}` : 'command completed';
  }

  if (payloadType === 'function_call' || payloadType === 'custom_tool_call') {
    const toolName = extractItemToolName(payload) || normalizeWhitespace(payload.name || payload.tool_name || 'tool');
    if (isSubagentToolName(toolName)) return '';
    if (toolName.toLowerCase().includes('update_plan')) return '';
    const detail = summarizeKnownArgObject(extractToolCallArguments(payload) || payload, options);
    return detail ? `${toolName}: ${detail}` : `tool ${toolName}`;
  }

  if (payloadType === 'function_call_output') {
    const output = extractFunctionCallOutputObject(payload);
    if (!output) return '';
    if (output.timed_out === true) return '';
    const statusInfo = extractSubagentStatusInfo(output.status);
    if (statusInfo.state === 'completed') return summarizeSubagentToolOutput(payload);
    return '';
  }

  const preview = extractPayloadTextPreview(payload, options);
  if (preview) return `${payloadType || 'item'}: ${preview}`;
  return payloadType ? `${payloadType} completed` : '';
}

export function extractCompletedStepFromEvent(ev, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  const opts = { previewChars };

  if (!ev || typeof ev !== 'object') return '';
  const type = normalizeEventType(ev.type || '');
  const payload = extractEventPayload(ev);

  if (type === 'response_item' && payload) {
    const payloadType = normalizeEventType(payload.type || '');
    if (payloadType === 'message') {
      const notification = extractSubagentNotification(payload);
      if (notification) {
        const statusInfo = extractSubagentStatusInfo(notification.status);
        return statusInfo.state === 'completed' ? summarizeSubagentNotification(notification) : '';
      }
    }
    const status = normalizeStatus(payload.status || '');
    if (status === 'completed') return summarizeCompletedPayload(payload, opts);

    if (!status && ['function_call', 'custom_tool_call', 'local_shell_call', 'web_search_call'].includes(payloadType)) {
      const toolName = extractItemToolName(payload) || normalizeWhitespace(payload.name || payload.tool_name || '');
      if (isSubagentToolName(toolName)) return '';
      return summarizeCompletedPayload(payload, opts);
    }

    return '';
  }

  if (type === 'tool_result') {
    const status = normalizeStatus(ev.status || '');
    if (status !== 'completed') return '';
    const toolName = extractDirectToolName(ev) || 'tool';
    return `tool ${toolName}`;
  }

  if (type.startsWith('web_search_') && isCompletedLikeEvent(type)) {
    const detail = extractWebSearchActionSummary(ev, opts) || extractWebSearchActionSummary(payload || {}, opts);
    return detail ? `web search: ${detail}` : 'web search';
  }

  if (type !== 'item_completed') {
    if (isCompletedLikeEvent(type)) {
      const command = extractCommandPreview(ev, opts) || extractCommandPreview(payload || {}, opts);
      if (command) return `command: ${command}`;
    }
    return '';
  }

  const item = ev.item || {};
  const itemType = normalizeEventType(item.type || '');
  if (!itemType || itemType === 'agent_message' || itemType === 'reasoning') return '';

  if (itemType === 'web_search_call') {
    const detail = extractWebSearchActionSummary(item.action || item, opts);
    return detail ? `web search: ${detail}` : 'web search';
  }

  if (itemType === 'local_shell_call') {
    const command = extractCommandPreview(item, opts);
    return command ? `command: ${command}` : 'command completed';
  }

  const toolName = extractItemToolName(item);
  if (toolName) {
    if (isSubagentToolName(toolName)) return '';
    if (toolName.toLowerCase().includes('update_plan')) return '';
    const detail = summarizeKnownArgObject(extractToolCallArguments(item) || item, opts);
    return detail ? `${toolName}: ${detail}` : `tool ${toolName}`;
  }

  const preview = extractEventTextPreview(item, opts);
  if (preview) return `${itemType}: ${preview}`;
  return `${itemType} completed`;
}

export function appendCompletedStep(list, stepText, options = {}) {
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  const doneStepsMax = Math.max(1, Number(options.doneStepsMax || DEFAULT_DONE_STEPS_MAX));

  const text = normalizeWhitespace(stepText);
  if (!text) return;

  const normalized = truncate(text, previewChars);
  const key = normalized.toLowerCase();
  const existing = list.findIndex((item) => normalizeWhitespace(String(item || '')).toLowerCase() === key);
  if (existing >= 0) list.splice(existing, 1);
  list.push(normalized);

  const maxKeep = Math.max(doneStepsMax + 2, doneStepsMax * 3);
  if (list.length > maxKeep) {
    list.splice(0, list.length - maxKeep);
  }
}

export function appendRecentActivity(list, activityText, options = {}) {
  if (!Array.isArray(list)) return;
  const previewChars = Math.max(60, Number(options.previewChars || DEFAULT_PREVIEW_CHARS));
  const maxSteps = Math.max(1, Number(options.maxSteps || DEFAULT_ACTIVITY_MAX));
  const preserveWhitespace = options.preserveWhitespace === true;
  const truncateText = options.truncateText !== false;
  const text = preserveWhitespace
    ? String(activityText || '').replace(/\r/g, '').replace(/\n+/g, ' ').trim()
    : normalizeWhitespace(activityText);
  if (!text) return;

  const normalized = truncateText ? truncate(text, previewChars) : text;
  const key = normalizeWhitespace(normalized).toLowerCase();
  const existing = list.findIndex((item) => normalizeWhitespace(String(item || '')).toLowerCase() === key);
  if (existing >= 0) list.splice(existing, 1);
  list.push(normalized);

  const maxKeep = Math.max(maxSteps + 3, maxSteps * 4);
  if (list.length > maxKeep) {
    list.splice(0, list.length - maxKeep);
  }
}

export function formatRecentActivitiesSummary(activities, options = {}) {
  if (!Array.isArray(activities) || !activities.length) return '';
  const maxSteps = Math.max(1, Number(options.maxSteps || DEFAULT_ACTIVITY_MAX));
  return activities.slice(-maxSteps).join(' | ');
}

export function renderRecentActivitiesLines(activities, options = {}) {
  if (!Array.isArray(activities) || !activities.length) return [];
  const maxSteps = Math.max(1, Number(options.maxSteps || DEFAULT_ACTIVITY_MAX));
  const visible = activities.slice(-maxSteps);
  const lines = [];
  for (let i = 0; i < visible.length; i += 1) {
    lines.push(`• activity ${i + 1}: ${visible[i]}`);
  }
  return lines;
}

export function formatProgressPlanSummary(planState) {
  if (!planState || !Array.isArray(planState.steps) || !planState.steps.length) return '';
  const inProgressPart = planState.inProgress > 0 ? `, ${planState.inProgress} in progress` : '';
  return `${planState.completed}/${planState.total} completed${inProgressPart}`;
}

export function renderProgressPlanLines(planState, maxLines = DEFAULT_PLAN_MAX_LINES) {
  if (!planState || !Array.isArray(planState.steps) || !planState.steps.length) return [];

  const lines = [];
  const summary = formatProgressPlanSummary(planState);
  lines.push(summary ? `• plan: ${summary}` : '• plan: received');
  if (planState.explanation) lines.push(`  note: ${planState.explanation}`);

  const limit = Math.max(1, maxLines);
  const visible = planState.steps.slice(0, limit);
  for (const step of visible) {
    const icon = step.status === 'completed'
      ? '✓'
      : step.status === 'in_progress'
        ? '…'
        : '○';
    lines.push(`  ${icon} ${step.step}`);
  }
  if (planState.steps.length > visible.length) {
    lines.push(`  … +${planState.steps.length - visible.length} more`);
  }
  return lines;
}

export function formatCompletedStepsSummary(steps, maxSteps = DEFAULT_DONE_STEPS_MAX) {
  if (!Array.isArray(steps) || !steps.length) return '';
  const limit = Math.max(1, maxSteps);
  const visible = steps.slice(-limit);
  return visible.join(' | ');
}

export function renderCompletedStepsLines(steps, maxSteps = DEFAULT_DONE_STEPS_MAX) {
  const summary = formatCompletedStepsSummary(steps, maxSteps);
  if (!summary) return [];
  return [`• completed steps: ${summary}`];
}

function toOptionalInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function extractInputTokensFromUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;

  const directKeys = [
    'input_tokens',
    'inputTokens',
    'prompt_tokens',
    'promptTokens',
    'input_token_count',
    'prompt_token_count',
  ];

  for (const key of directKeys) {
    const n = toOptionalInt(usage[key]);
    if (n !== null) return n;
  }

  const queue = [usage];
  const seen = new Set();
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;
    if (seen.has(node)) continue;
    seen.add(node);

    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === 'object') {
        queue.push(value);
        continue;
      }

      const n = toOptionalInt(value);
      if (n === null) continue;
      if (/input.*token|token.*input|prompt.*token|token.*prompt/i.test(key)) {
        return n;
      }
    }
  }

  return null;
}
