import { createChannelQueue } from './channel-queue.js';
import { createChannelRuntimeStore } from './channel-runtime.js';
import { createPromptOrchestrator } from './prompt-orchestrator.js';
import { createRuntimePresentation } from './runtime-presentation.js';
import { createRunnerExecutor } from './runner-executor.js';
import { createSessionProgressBridgeFactory } from './session-progress-bridge.js';

export function createPromptRuntime({
  runtimePresentationOptions = {},
  channelRuntimeStoreOptions = {},
  sessionProgressBridgeOptions = {},
  runnerExecutorOptions = {},
  promptOrchestratorOptions = {},
  channelQueueOptions = {},
  factories = {},
} = {}) {
  const {
    createChannelQueueFn = createChannelQueue,
    createChannelRuntimeStoreFn = createChannelRuntimeStore,
    createPromptOrchestratorFn = createPromptOrchestrator,
    createRuntimePresentationFn = createRuntimePresentation,
    createRunnerExecutorFn = createRunnerExecutor,
    createSessionProgressBridgeFactoryFn = createSessionProgressBridgeFactory,
  } = factories;

  const presentation = createRuntimePresentationFn(runtimePresentationOptions);
  const channelRuntimeStore = createChannelRuntimeStoreFn({
    ...channelRuntimeStoreOptions,
    cloneProgressPlan: presentation.cloneProgressPlan,
  });
  const {
    getChannelState,
    setActiveRun,
    cancelChannelWork,
    cancelAllChannelWork,
    getRuntimeSnapshot,
  } = channelRuntimeStore;

  const { startSessionProgressBridge } = createSessionProgressBridgeFactoryFn(sessionProgressBridgeOptions);
  const { runCodex } = createRunnerExecutorFn({
    ...runnerExecutorOptions,
    startSessionProgressBridge,
  });
  const { handlePrompt } = createPromptOrchestratorFn({
    ...promptOrchestratorOptions,
    formatTimeoutLabel: presentation.formatTimeoutLabel,
    setActiveRun,
    runTask: (options) => runCodex(options),
    summarizeCodexEvent: presentation.summarizeCodexEvent,
    extractRawProgressTextFromEvent: presentation.extractRawProgressTextFromEvent,
    cloneProgressPlan: presentation.cloneProgressPlan,
    extractPlanStateFromEvent: presentation.extractPlanStateFromEvent,
    extractCompletedStepFromEvent: presentation.extractCompletedStepFromEvent,
    appendCompletedStep: presentation.appendCompletedStep,
    appendRecentActivity: presentation.appendRecentActivity,
    formatProgressPlanSummary: presentation.formatProgressPlanSummary,
    renderProcessContentLines: presentation.renderProcessContentLines,
    localizeProgressLines: presentation.localizeProgressLines,
    renderProgressPlanLines: presentation.renderProgressPlanLines,
    renderCompletedStepsLines: presentation.renderCompletedStepsLines,
    formatRuntimePhaseLabel: presentation.formatRuntimePhaseLabel,
  });
  const { enqueuePrompt } = createChannelQueueFn({
    ...channelQueueOptions,
    getChannelState,
    handlePrompt,
  });

  return {
    ...presentation,
    enqueuePrompt,
    getChannelState,
    setActiveRun,
    cancelChannelWork,
    cancelAllChannelWork,
    getRuntimeSnapshot,
    handlePrompt,
    runCodex,
    startSessionProgressBridge,
  };
}
