export function createPromptOrchestrator({
  defaultUiLanguage = 'zh',
  progressUpdatesEnabled = true,
  progressProcessLines = 2,
  progressUpdateIntervalMs = 15000,
  progressEventFlushMs = 5000,
  progressEventDedupeWindowMs = 2500,
  progressIncludeStdout = true,
  progressIncludeStderr = false,
  progressTextPreviewChars = 140,
  progressProcessPushIntervalMs = 1100,
  progressMessageMaxChars = 1800,
  progressPlanMaxLines = 4,
  progressDoneStepsMax = 4,
  showReasoning = false,
  resultChunkChars = 1900,
  safeReply,
  withDiscordNetworkRetry,
  splitForDiscord,
  getSession,
  ensureWorkspace,
  saveDb,
  clearSessionId,
  getSessionId,
  setSessionId,
  getSessionProvider,
  getSessionLanguage,
  normalizeUiLanguage,
  getProviderDisplayName,
  getProviderShortName,
  getProviderDefaultBin,
  getProviderBinEnvName,
  resolveTimeoutSetting,
  resolveCompactStrategySetting,
  resolveCompactEnabledSetting,
  resolveCompactThresholdSetting,
  formatWorkspaceBusyReport,
  formatTimeoutLabel,
  setActiveRun,
  acquireWorkspace,
  stopChildProcess,
  runTask,
  isCliNotFound,
  slashRef,
  safeError,
  truncate,
  toOptionalInt,
  humanElapsed,
  summarizeCodexEvent,
  extractRawProgressTextFromEvent,
  cloneProgressPlan,
  extractPlanStateFromEvent,
  extractCompletedStepFromEvent,
  appendCompletedStep,
  appendRecentActivity,
  formatProgressPlanSummary,
  renderProcessContentLines,
  localizeProgressLines,
  renderProgressPlanLines,
  renderCompletedStepsLines,
  formatRuntimePhaseLabel,
  createProgressEventDeduper,
  buildProgressEventDedupeKey,
  extractInputTokensFromUsage,
  composeFinalAnswerText,
} = {}) {
  function createProgressReporter({
    message,
    channelState,
    language = defaultUiLanguage,
    processLines = progressProcessLines,
  }) {
    if (!progressUpdatesEnabled) return null;

    const startedAt = Date.now();
    const lang = normalizeUiLanguage(language);
    const processLineLimit = Math.max(1, Math.min(5, Number(processLines || progressProcessLines)));
    let progressMessage = null;
    let timer = null;
    let stopped = false;
    let lastEmitAt = 0;
    let lastRendered = '';
    let events = 0;
    let latestStep = lang === 'en'
      ? 'Task started, waiting for the first event...'
      : '任务已开始，等待首个事件...';
    let planState = cloneProgressPlan(channelState.activeRun?.progressPlan);
    const completedSteps = Array.isArray(channelState.activeRun?.completedSteps)
      ? [...channelState.activeRun.completedSteps]
      : [];
    const recentActivities = Array.isArray(channelState.activeRun?.recentActivities)
      ? [...channelState.activeRun.recentActivities]
      : [];
    const pendingActivities = [];
    let lastActivityPushAt = 0;
    let isEmitting = false;
    let rerunEmit = false;
    let activityTimer = null;
    const isDuplicateProgressEvent = createProgressEventDeduper({
      ttlMs: progressEventDedupeWindowMs,
      maxKeys: 700,
    });

    const syncActiveRun = () => {
      if (!channelState.activeRun) return;
      channelState.activeRun.progressEvents = events;
      channelState.activeRun.lastProgressText = latestStep;
      channelState.activeRun.lastProgressAt = Date.now();
      channelState.activeRun.progressPlan = cloneProgressPlan(planState);
      channelState.activeRun.completedSteps = [...completedSteps];
      channelState.activeRun.recentActivities = [...recentActivities];
      if (progressMessage?.id) {
        channelState.activeRun.progressMessageId = progressMessage.id;
      }
    };

    const render = (status = 'running') => {
      const elapsed = humanElapsed(Math.max(0, Date.now() - startedAt));
      const phase = formatRuntimePhaseLabel(channelState.activeRun?.phase || 'starting', lang);
      const hint = status === 'running'
        ? (lang === 'en'
          ? `Use \`!abort\` / \`${slashRef('cancel')}\` to interrupt, and \`!progress\` for details.`
          : `可用 \`!abort\` / \`${slashRef('cancel')}\` 中断，\`!progress\` 查看详情。`)
        : (lang === 'en'
          ? 'You can continue with a new message, or check remaining backlog with `!queue`.'
          : '可继续发送新消息，或用 `!queue` 查看是否还有排队任务。');
      const statusLine = status === 'running'
        ? (lang === 'en' ? '⏳ **Task Running**' : '⏳ **任务进行中**')
        : status;
      const body = [
        statusLine,
        `${lang === 'en' ? '• elapsed' : '• 耗时'}: ${elapsed}`,
        `${lang === 'en' ? '• phase' : '• 阶段'}: ${phase}`,
        `${lang === 'en' ? '• event count' : '• 事件数'}: ${events}`,
        `${lang === 'en' ? '• latest activity' : '• 最新活动'}: ${latestStep}`,
        ...renderProcessContentLines(recentActivities, lang, processLineLimit),
        ...localizeProgressLines(renderProgressPlanLines(planState, progressPlanMaxLines), lang),
        ...localizeProgressLines(renderCompletedStepsLines(completedSteps, {
          planState,
          latestStep,
          maxSteps: progressDoneStepsMax,
        }), lang),
        `${lang === 'en' ? '• queued prompts' : '• 排队任务'}: ${channelState.queue.length}`,
        `${lang === 'en' ? '• hint' : '• 提示'}: ${hint}`,
      ].filter(Boolean).join('\n');
      return truncate(body, progressMessageMaxChars);
    };

    const emit = async (force = false) => {
      if (!progressMessage || stopped) return;
      if (isEmitting) {
        rerunEmit = true;
        return;
      }

      const now = Date.now();
      if (!force && now - lastEmitAt < progressEventFlushMs) return;
      const body = render('running');
      if (!force && body === lastRendered) return;

      isEmitting = true;
      try {
        await progressMessage.edit(body);
        lastEmitAt = Date.now();
        lastRendered = body;
        syncActiveRun();
      } catch {
        // ignore edit failures
      } finally {
        isEmitting = false;
        if (rerunEmit && !stopped) {
          rerunEmit = false;
          void emit(false);
        }
      }
    };

    const normalizeActivityKey = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

    const enqueueActivity = (activityText) => {
      const text = String(activityText || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      const key = normalizeActivityKey(text);
      if (!key) return;

      const latestVisible = normalizeActivityKey(recentActivities[recentActivities.length - 1]);
      if (latestVisible && latestVisible === key) return;
      const latestQueued = normalizeActivityKey(pendingActivities[pendingActivities.length - 1]);
      if (latestQueued && latestQueued === key) return;

      pendingActivities.push(text);
      if (pendingActivities.length > 80) {
        pendingActivities.splice(0, pendingActivities.length - 80);
      }
    };

    const pushOneActivity = ({ force = false } = {}) => {
      if (!pendingActivities.length) return false;
      const now = Date.now();
      if (!force && now - lastActivityPushAt < progressProcessPushIntervalMs) return false;
      const next = pendingActivities.shift();
      if (!next) return false;
      appendRecentActivity(recentActivities, next);
      lastActivityPushAt = now;
      return true;
    };

    const start = async () => {
      try {
        const body = render('running');
        progressMessage = await safeReply(message, body);
        lastEmitAt = Date.now();
        lastRendered = body;
        syncActiveRun();
        timer = setInterval(() => {
          void emit(true);
        }, progressUpdateIntervalMs);
        timer.unref?.();
        activityTimer = setInterval(() => {
          if (stopped) return;
          if (!pushOneActivity()) return;
          syncActiveRun();
          void emit(false);
        }, progressProcessPushIntervalMs);
        activityTimer.unref?.();
      } catch {
        progressMessage = null;
      }
    };

    const onEvent = (ev) => {
      if (stopped) return;
      const summaryStep = summarizeCodexEvent(ev);
      const rawActivity = extractRawProgressTextFromEvent(ev);
      const nextPlan = extractPlanStateFromEvent(ev);
      const completedStep = extractCompletedStepFromEvent(ev);
      const dedupeKey = buildProgressEventDedupeKey({
        summaryStep,
        rawActivity,
        completedStep,
        planSummary: formatProgressPlanSummary(nextPlan),
      });
      if (isDuplicateProgressEvent(dedupeKey)) return;

      events += 1;
      if (summaryStep && !summaryStep.startsWith('agent message')) {
        latestStep = summaryStep;
      } else if (!latestStep) {
        latestStep = summaryStep;
      }
      if (rawActivity) {
        enqueueActivity(rawActivity);
        if (recentActivities.length === 0) {
          pushOneActivity({ force: true });
        } else {
          pushOneActivity();
        }
      }
      if (nextPlan) {
        planState = nextPlan;
        for (const item of nextPlan.steps) {
          if (item.status === 'completed') {
            appendCompletedStep(completedSteps, item.step);
          }
        }
      }
      if (completedStep) appendCompletedStep(completedSteps, completedStep);
      syncActiveRun();
      void emit(false);
    };

    const onLog = (line, source) => {
      if (stopped) return;
      if (source === 'stderr' && !progressIncludeStderr) return;
      if (source === 'stdout' && !progressIncludeStdout) return;
      events += 1;
      const sourceLabel = lang === 'en'
        ? source
        : (source === 'stderr' ? '标准错误' : '标准输出');
      latestStep = `${sourceLabel}: ${truncate(String(line || '').replace(/\s+/g, ' ').trim(), progressTextPreviewChars)}`;
      syncActiveRun();
      void emit(false);
    };

    const finish = async ({ ok = false, cancelled = false, timedOut = false, error = '' } = {}) => {
      if (stopped) return;
      stopped = true;
      if (timer) clearInterval(timer);
      if (activityTimer) clearInterval(activityTimer);
      while (pushOneActivity({ force: true })) {
        // Drain buffered activity lines into the final card.
      }
      syncActiveRun();
      if (!progressMessage) return;

      const elapsed = humanElapsed(Math.max(0, Date.now() - startedAt));
      const status = cancelled
        ? (lang === 'en' ? '🛑 **Task Cancelled**' : '🛑 **任务已中断**')
        : ok
          ? (lang === 'en' ? '✅ **Task Completed**' : '✅ **任务已完成**')
          : timedOut
            ? (lang === 'en' ? '⏱️ **Task Timed Out**' : '⏱️ **任务超时**')
            : (lang === 'en' ? '❌ **Task Failed**' : '❌ **任务失败**');
      const body = [
        status,
        `${lang === 'en' ? '• elapsed' : '• 耗时'}: ${elapsed}`,
        `${lang === 'en' ? '• phase' : '• 阶段'}: ${formatRuntimePhaseLabel(channelState.activeRun?.phase || 'done', lang)}`,
        `${lang === 'en' ? '• event count' : '• 事件数'}: ${events}`,
        `${lang === 'en' ? '• latest activity' : '• 最新活动'}: ${latestStep}`,
        ...renderProcessContentLines(recentActivities, lang, processLineLimit),
        ...localizeProgressLines(renderProgressPlanLines(planState, progressPlanMaxLines), lang),
        ...localizeProgressLines(renderCompletedStepsLines(completedSteps, {
          planState,
          latestStep,
          maxSteps: progressDoneStepsMax,
        }), lang),
        !ok && !cancelled && error ? `${lang === 'en' ? '• error' : '• 错误'}: ${truncate(String(error), 260)}` : null,
      ].filter(Boolean).join('\n');
      const safeBody = truncate(body, progressMessageMaxChars);

      try {
        await progressMessage.edit(safeBody);
      } catch {
        // ignore
      }
    };

    return {
      start,
      onEvent,
      onLog,
      finish,
    };
  }

  function shouldCompactSession(session) {
    const compactSetting = resolveCompactStrategySetting(session);
    const enabledSetting = resolveCompactEnabledSetting(session);
    const thresholdSetting = resolveCompactThresholdSetting(session);
    if (!enabledSetting.enabled) return false;
    if (compactSetting.strategy !== 'hard') return false;
    if (!getSessionId(session)) return false;
    const last = toOptionalInt(session.lastInputTokens);
    if (!Number.isFinite(last)) return false;
    return last >= thresholdSetting.tokens;
  }

  async function compactSessionContext({ session, workspaceDir, onSpawn, wasCancelled, onEvent, onLog }) {
    if (!getSessionId(session)) {
      return { ok: false, summary: '', error: 'missing session id' };
    }

    const compactPrompt = [
      '请压缩总结当前会话上下文，供新会话继续工作使用。',
      '输出要求：',
      '1) 用中文，结构化分段，控制在 1200 字以内。',
      '2) 包含：目标、已完成工作、关键代码/文件、未完成事项、风险与约束、下一步建议。',
      '3) 只输出摘要正文，不要寒暄。',
    ].join('\n');

    const result = await runTask({
      session,
      workspaceDir,
      prompt: compactPrompt,
      onSpawn,
      wasCancelled,
      onEvent,
      onLog,
    });
    if (!result.ok) {
      return {
        ok: false,
        summary: '',
        error: result.error || truncate(result.logs.join('\n'), 400),
      };
    }

    const summary = result.messages.join('\n\n').trim();
    if (!summary) {
      return { ok: false, summary: '', error: 'empty compact summary' };
    }

    return { ok: true, summary, usage: result.usage };
  }

  function buildPromptFromCompactedContext(summary, userPrompt) {
    return [
      '下面是上一轮会话的压缩摘要，请先把它作为上下文再回答新的用户请求。',
      '',
      '【压缩摘要开始】',
      summary,
      '【压缩摘要结束】',
      '',
      '请在不丢失关键上下文的前提下继续处理以下新请求：',
      userPrompt,
    ].join('\n');
  }

  function composeResultText(result, session) {
    const sections = [];

    if (showReasoning && result.reasonings.length) {
      sections.push([
        '🧠 Reasoning',
        truncate(result.reasonings.join('\n\n'), 1200),
      ].join('\n'));
    }

    const answer = composeFinalAnswerText({
      messages: result.messages,
      finalAnswerMessages: result.finalAnswerMessages,
    });
    sections.push(answer || `（${getProviderShortName(getSessionProvider(session))} 没有返回可见文本）`);

    const tail = [];
    if (result.notes.length) {
      tail.push(...result.notes.map((note) => `• ${note}`));
    }
    const currentSessionId = getSessionId(session);
    if (currentSessionId || result.threadId) {
      const id = result.threadId || currentSessionId;
      const label = session.name ? `**${session.name}** (\`${id}\`)` : `\`${id}\``;
      tail.push(`• session: ${label}`);
    }

    if (tail.length) {
      sections.push(['', '—', ...tail].join('\n'));
    }

    return sections.join('\n\n').trim();
  }

  async function handlePrompt(message, key, prompt, channelState) {
    if (channelState.cancelRequested) {
      return { ok: false, cancelled: true };
    }

    const session = getSession(key);
    const workspaceDir = ensureWorkspace(session, key);
    const language = normalizeUiLanguage(getSessionLanguage(session));
    let workspaceLock = null;

    setActiveRun(channelState, message, prompt, null, 'workspace');
    if (channelState.activeRun) {
      channelState.activeRun.lastProgressText = language === 'en'
        ? `Waiting for workspace lock: ${workspaceDir}`
        : `等待 workspace 锁：${workspaceDir}`;
      channelState.activeRun.lastProgressAt = Date.now();
    }

    await message.channel.sendTyping();
    const typingInterval = setInterval(() => {
      message.channel.sendTyping().catch(() => {});
    }, 8000);
    const progress = createProgressReporter({
      message,
      channelState,
      language: getSessionLanguage(session),
      processLines: progressProcessLines,
    });
    await progress?.start();
    let progressOutcome = { ok: false, cancelled: false, timedOut: false, error: '' };

    const releaseWorkspaceLock = () => {
      if (!workspaceLock?.acquired || typeof workspaceLock.release !== 'function') return;
      try {
        workspaceLock.release();
      } catch (err) {
        console.warn(`Failed to release workspace lock: ${safeError(err)}`);
      }
      workspaceLock = null;
    };

    try {
      workspaceLock = await acquireWorkspace(
        workspaceDir,
        {
          key,
          provider: getSessionProvider(session),
          messageId: message.id,
          sessionId: getSessionId(session),
          sessionName: session.name || null,
        },
        {
          isAborted: () => Boolean(channelState.cancelRequested || channelState.activeRun?.cancelRequested),
          onWait: ({ owner }) => {
            if (channelState.activeRun) {
              channelState.activeRun.lastProgressText = language === 'en'
                ? `Workspace busy: ${workspaceDir}`
                : `workspace 正忙：${workspaceDir}`;
              channelState.activeRun.lastProgressAt = Date.now();
            }
            return safeReply(message, formatWorkspaceBusyReport(session, workspaceDir, owner)).catch(() => {});
          },
        },
      );

      if (workspaceLock?.aborted || channelState.cancelRequested) {
        progressOutcome = { ok: false, cancelled: true, timedOut: false, error: 'cancelled by user' };
        return { ok: false, cancelled: true };
      }

      if (channelState.activeRun) {
        channelState.activeRun.lastProgressText = language === 'en'
          ? `Workspace lock acquired: ${workspaceDir}`
          : `已获取 workspace 锁：${workspaceDir}`;
        channelState.activeRun.lastProgressAt = Date.now();
      }

      let promptToRun = prompt;
      const preNotes = [];
      if (shouldCompactSession(session)) {
        const previousThreadId = getSessionId(session);
        const compacted = await compactSessionContext({
          session,
          workspaceDir,
          onSpawn: (child) => {
            setActiveRun(channelState, message, 'auto-compact summary request', child, 'compact');
            if (channelState.cancelRequested) stopChildProcess(child);
          },
          wasCancelled: () => Boolean(channelState.cancelRequested || channelState.activeRun?.cancelRequested),
          onEvent: progress?.onEvent,
          onLog: progress?.onLog,
        });
        if (compacted.ok && compacted.summary) {
          clearSessionId(session);
          saveDb();
          promptToRun = buildPromptFromCompactedContext(compacted.summary, prompt);
          preNotes.push(`上下文输入 token=${session.lastInputTokens}，已自动压缩并切换新会话（旧 session: ${previousThreadId}）。`);
        } else {
          clearSessionId(session);
          saveDb();
          preNotes.push(`上下文输入 token=${session.lastInputTokens}，自动压缩失败，已回退 reset（旧 session: ${previousThreadId}）。`);
          if (compacted.error) preNotes.push(`压缩失败原因：${compacted.error}`);
        }
      }

      if (channelState.cancelRequested) {
        progressOutcome = { ok: false, cancelled: true, timedOut: false, error: 'cancelled by user' };
        return { ok: false, cancelled: true };
      }

      let result = await runTask({
        session,
        workspaceDir,
        prompt: promptToRun,
        onSpawn: (child) => {
          setActiveRun(channelState, message, promptToRun, child, 'exec');
          if (channelState.cancelRequested) stopChildProcess(child);
        },
        wasCancelled: () => Boolean(channelState.cancelRequested || channelState.activeRun?.cancelRequested),
        onEvent: progress?.onEvent,
        onLog: progress?.onLog,
      });
      if (preNotes.length) {
        result.notes.unshift(...preNotes);
      }

      if (!result.ok && getSessionId(session) && !result.cancelled && !result.timedOut) {
        const previous = getSessionId(session);
        clearSessionId(session);
        saveDb();
        result = await runTask({
          session,
          workspaceDir,
          prompt,
          onSpawn: (child) => {
            setActiveRun(channelState, message, prompt, child, 'retry');
            if (channelState.cancelRequested) stopChildProcess(child);
          },
          wasCancelled: () => Boolean(channelState.cancelRequested || channelState.activeRun?.cancelRequested),
          onEvent: progress?.onEvent,
          onLog: progress?.onLog,
        });
        if (result.ok) {
          result.notes.push(`已自动重置旧会话：${previous}`);
        }
      }

      const inputTokens = extractInputTokensFromUsage(result.usage);
      let sessionDirty = false;
      if (result.threadId) {
        setSessionId(session, result.threadId);
        sessionDirty = true;
      }
      if (inputTokens !== null) {
        session.lastInputTokens = inputTokens;
        sessionDirty = true;
      }
      if (sessionDirty) {
        saveDb();
      }

      releaseWorkspaceLock();

      if (!result.ok) {
        if (result.cancelled) {
          progressOutcome = { ok: false, cancelled: true, timedOut: false, error: result.error || 'cancelled' };
          await safeReply(message, '🛑 当前任务已中断。');
          return { ok: false, cancelled: true };
        }

        const provider = getSessionProvider(session);
        const cliMissing = isCliNotFound(result.error);
        const timeoutSetting = resolveTimeoutSetting(session);
        const failText = [
          result.timedOut ? `❌ ${getProviderShortName(provider)} 执行超时` : `❌ ${getProviderShortName(provider)} 执行失败`,
          result.error ? `• error: ${result.error}` : null,
          result.logs.length ? `• logs: ${truncate(result.logs.join('\n'), 1200)}` : null,
          result.timedOut
            ? `• 处理: 可用 \`${slashRef('timeout')} <ms|off|status>\` 或 \`!timeout <ms|off|status>\` 调整本频道超时。当前: ${formatTimeoutLabel(timeoutSetting.timeoutMs)} (${timeoutSetting.source})`
            : null,
          cliMissing ? `• 诊断: 当前环境找不到 ${getProviderDisplayName(provider)} CLI 可执行文件。` : null,
          cliMissing ? `• 处理: 在该设备安装 ${getProviderDefaultBin(provider)}，或在 .env 配置 \`${getProviderBinEnvName(provider)}=/绝对路径/${getProviderDefaultBin(provider)}\`，然后重启 bot。` : null,
          cliMissing ? `• 自检: 用 \`${slashRef('status')}\` 或 \`!status\` 查看 CLI 状态。` : null,
          '',
          `可以先 \`${slashRef('reset')}\` 再重试，或 \`${slashRef('status')}\` 看状态。`,
        ].filter(Boolean).join('\n');
        progressOutcome = {
          ok: false,
          cancelled: false,
          timedOut: Boolean(result.timedOut),
          error: result.error || `${getSessionProvider(session)} run failed`,
        };
        await safeReply(message, failText);
        return { ok: false, cancelled: false };
      }

      const body = composeResultText(result, session);
      const parts = splitForDiscord(body, resultChunkChars);

      if (parts.length === 0) {
        await safeReply(message, '✅ 完成（无可展示文本输出）。');
        progressOutcome = { ok: true, cancelled: false, timedOut: false, error: '' };
        return { ok: true, cancelled: false };
      }

      await safeReply(message, parts[0]);
      for (let i = 1; i < parts.length; i += 1) {
        await withDiscordNetworkRetry(
          () => message.channel.send(parts[i]),
          { logger: console, label: 'channel.send (result part)' },
        );
      }

      progressOutcome = { ok: true, cancelled: false, timedOut: false, error: '' };
      return { ok: true, cancelled: false };
    } catch (err) {
      progressOutcome = { ok: false, cancelled: false, timedOut: false, error: safeError(err) };
      throw err;
    } finally {
      releaseWorkspaceLock();
      clearInterval(typingInterval);
      await progress?.finish(progressOutcome);
    }
  }

  return {
    createProgressReporter,
    shouldCompactSession,
    compactSessionContext,
    buildPromptFromCompactedContext,
    composeResultText,
    handlePrompt,
  };
}
