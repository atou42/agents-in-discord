function normalizeComparableText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeTextList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function dedupeTextList(list) {
  const next = [];
  const seen = new Set();
  for (const item of normalizeTextList(list)) {
    const key = normalizeComparableText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}

function isClaudeReferenceOnlyFinalAnswer(value) {
  const text = String(value || '').trim();
  if (!text || text.length > 200) return false;
  return /(如上|见上|上面|上文|上述|如前|above|as above|see above|shown above|output above)/i.test(text);
}

export function hasVisibleAssistantText(result) {
  return Boolean(
    (Array.isArray(result?.finalAnswerMessages) && result.finalAnswerMessages.some((item) => String(item || '').trim()))
    || (Array.isArray(result?.messages) && result.messages.some((item) => String(item || '').trim())),
  );
}

export function normalizeClaudeResultForDisplay(result) {
  if (!result || typeof result !== 'object') return result;

  const toolResultMessages = dedupeTextList(result?.meta?.claudeToolResultMessages);
  if (!toolResultMessages.length) return result;

  const finalAnswerMessages = normalizeTextList(result.finalAnswerMessages);
  if (!finalAnswerMessages.length) {
    return {
      ...result,
      finalAnswerMessages: toolResultMessages,
    };
  }

  const lastFinalAnswer = finalAnswerMessages[finalAnswerMessages.length - 1] || '';
  if (!isClaudeReferenceOnlyFinalAnswer(lastFinalAnswer)) return result;

  return {
    ...result,
    finalAnswerMessages: dedupeTextList([
      ...toolResultMessages,
      ...finalAnswerMessages,
    ]),
  };
}

export function shouldAutoRecoverClaudeResult(result) {
  if (!result || typeof result !== 'object') return false;
  if (!result.ok || result.cancelled || result.timedOut) return false;

  const meta = result.meta && typeof result.meta === 'object' ? result.meta : null;
  if (!meta?.claudeSawAgentToolUse) return false;
  if (meta.claudeStopReason !== null && meta.claudeStopReason !== '') return false;

  const finalText = normalizeComparableText(result.finalAnswerMessages?.[result.finalAnswerMessages.length - 1] || '');
  const latestMessage = normalizeComparableText(result.messages?.[result.messages.length - 1] || '');
  if (!finalText || !latestMessage) return false;
  return finalText === latestMessage;
}

export function buildClaudeRecoveryPrompt() {
  return [
    '继续刚才的同一任务。',
    '不要把“我来看看 / 我会分析 / 我将研究”之类的过程说明当作最终答案。',
    '请直接完成任务并输出最终答案。',
    '如果确实被工具、权限或外部访问限制卡住，请明确说明阻塞原因和下一步建议，不要只输出一句开场白。',
  ].join('\n');
}
