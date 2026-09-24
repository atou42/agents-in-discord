import {
  getSupportedReasoningEffortLevels,
  getProviderShortName,
  normalizeProvider,
  providerSupportsRawConfigOverrides,
} from './provider-metadata.js';

const PROVIDER_RUNTIME_SURFACES = Object.freeze({
  mirasim: Object.freeze({
    sessionTerm: { en: { singular: 'desktop session', plural: 'desktop sessions' }, zh: { singular: '桌面会话', plural: '桌面会话' } },
    recentSessionsTitle: { en: 'Recent Mirasim Sessions', zh: '最近 Mirasim 会话' },
    recentSessionsLookup: { en: 'Mirasim desktop API, current workspace', zh: 'Mirasim 桌面 API，当前工作目录' },
    runtimeSummary: { en: 'Mirasim desktop harnesses, workspace-bound sessions, native login and permissions', zh: 'Mirasim 桌面 Harness、工作目录绑定会话、原生登录与权限' },
    sessionStore: { en: 'Mirasim desktop session store', zh: 'Mirasim 桌面会话存储' },
    resumeSurface: { en: '<harness>:<id> session key; harness or workspace changes reset the binding', zh: '通过 <harness>:<id> 会话键续接；Harness 或工作目录变化时重置绑定' },
    nativeCompactSurface: { en: 'automatic compaction managed by Mirasim; no Discord override', zh: '自动压缩由 Mirasim 管理；不提供 Discord 覆盖' },
    rawConfigSurface: { en: 'login, routing and permissions managed in Mirasim desktop', zh: '登录、路由和权限由 Mirasim 桌面端管理' },
  }),
  codex: Object.freeze({
    sessionTerm: Object.freeze({
      en: Object.freeze({ singular: 'rollout session', plural: 'rollout sessions' }),
      zh: Object.freeze({ singular: 'rollout session', plural: 'rollout sessions' }),
    }),
    recentSessionsTitle: Object.freeze({
      en: 'Recent Codex Sessions',
      zh: '最近 Codex Sessions',
    }),
    recentSessionsLookup: Object.freeze({
      en: 'global rollout history in `~/.codex/sessions`',
      zh: '全局 rollout 历史，来源 `~/.codex/sessions`',
    }),
    runtimeSummary: Object.freeze({
      en: 'global rollout sessions, raw config passthrough, configurable native limit',
      zh: '全局 rollout sessions、原生 config 透传、可配置 native limit',
    }),
    sessionStore: Object.freeze({
      en: 'global rollout history (`~/.codex/sessions`)',
      zh: '全局 rollout 历史（`~/.codex/sessions`）',
    }),
    resumeSurface: Object.freeze({
      en: 'session-id resume; workspace binding is handled separately by the bot',
      zh: '按 session id 恢复；workspace 绑定由 bot 单独处理',
    }),
    nativeCompactSurface: Object.freeze({
      en: 'provider-native compaction with configurable token limit',
      zh: 'provider 原生压缩，并支持可配置 token limit',
    }),
    rawConfigSurface: Object.freeze({
      en: 'stable raw config passthrough via `-c key=value`',
      zh: '暴露稳定的 raw config passthrough（`-c key=value`）',
    }),
  }),
  claude: Object.freeze({
    sessionTerm: Object.freeze({
      en: Object.freeze({ singular: 'project session', plural: 'project sessions' }),
      zh: Object.freeze({ singular: 'project session', plural: 'project sessions' }),
    }),
    recentSessionsTitle: Object.freeze({
      en: 'Recent Claude Project Sessions',
      zh: '最近 Claude Project Sessions',
    }),
    recentSessionsLookup: Object.freeze({
      en: 'prefers current workspace in `~/.claude/projects/<workspace>`, then falls back to other Claude projects',
      zh: '优先读取当前 workspace 对应的 `~/.claude/projects/<workspace>`，再回退到其他 Claude projects',
    }),
    runtimeSummary: Object.freeze({
      en: 'project sessions, portable resume, provider-default native compaction',
      zh: 'project sessions、可迁移 resume、provider 默认 native 压缩',
    }),
    sessionStore: Object.freeze({
      en: 'project session files (`~/.claude/projects/<workspace>`)',
      zh: 'project session 文件（`~/.claude/projects/<workspace>`）',
    }),
    resumeSurface: Object.freeze({
      en: 'project-session resume; workspace changes reset the bound session',
      zh: '按 project session 恢复；切换 workspace 时会重置已绑定 session',
    }),
    nativeCompactSurface: Object.freeze({
      en: 'provider-native compaction; no exposed native limit override',
      zh: 'provider 原生压缩；不暴露 native limit 覆盖',
    }),
    rawConfigSurface: Object.freeze({
      en: 'no stable raw config passthrough surface exposed by the CLI',
      zh: 'CLI 没有暴露稳定的 raw config passthrough',
    }),
  }),
  cursor: Object.freeze({
    sessionTerm: Object.freeze({
      en: Object.freeze({ singular: 'chat session', plural: 'chat sessions' }),
      zh: Object.freeze({ singular: 'chat session', plural: 'chat sessions' }),
    }),
    recentSessionsTitle: Object.freeze({
      en: 'Recent Cursor Chat Sessions',
      zh: '最近 Cursor Chat Sessions',
    }),
    recentSessionsLookup: Object.freeze({
      en: 'workspace chats in `~/.cursor/chats`',
      zh: 'workspace chats，来源 `~/.cursor/chats`',
    }),
    runtimeSummary: Object.freeze({
      en: 'streaming JSON, workspace chats, sandboxed safe mode',
      zh: 'streaming JSON、workspace chats、沙箱安全模式',
    }),
    sessionStore: Object.freeze({
      en: 'Cursor chat metadata (`~/.cursor/chats`)',
      zh: 'Cursor chat 元数据（`~/.cursor/chats`）',
    }),
    resumeSurface: Object.freeze({
      en: 'chat-id resume; workspace changes reset the binding',
      zh: '按 chat id 恢复；切换 workspace 时重置绑定',
    }),
    nativeCompactSurface: Object.freeze({
      en: 'native compaction is not exposed by the headless runner',
      zh: 'headless runner 暂未暴露原生压缩',
    }),
    rawConfigSurface: Object.freeze({
      en: 'configuration is managed by Cursor CLI flags and settings',
      zh: '配置由 Cursor CLI 参数和设置管理',
    }),
  }),
  grok: Object.freeze({
    sessionTerm: Object.freeze({
      en: Object.freeze({ singular: 'session', plural: 'sessions' }),
      zh: Object.freeze({ singular: 'session', plural: 'sessions' }),
    }),
    recentSessionsTitle: Object.freeze({
      en: 'Recent Grok Sessions',
      zh: '最近 Grok Sessions',
    }),
    recentSessionsLookup: Object.freeze({
      en: 'workspace sessions in `~/.grok/sessions`',
      zh: 'workspace sessions，来源 `~/.grok/sessions`',
    }),
    runtimeSummary: Object.freeze({
      en: 'streaming JSON, workspace sessions, sandboxed safe mode, provider-native compaction',
      zh: 'streaming JSON、workspace sessions、沙箱安全模式、provider 原生压缩',
    }),
    sessionStore: Object.freeze({
      en: 'Grok session directories (`~/.grok/sessions`)',
      zh: 'Grok session 目录（`~/.grok/sessions`）',
    }),
    resumeSurface: Object.freeze({
      en: 'session-id resume via `--session-id`; workspace changes reset the binding',
      zh: '通过 `--session-id` 恢复；切换 workspace 时重置绑定',
    }),
    nativeCompactSurface: Object.freeze({
      en: 'provider-native compaction; no exposed native limit override',
      zh: 'provider 原生压缩；不暴露 native limit 覆盖',
    }),
    rawConfigSurface: Object.freeze({
      en: 'configuration is managed by `~/.grok/config.toml` and stable CLI flags',
      zh: '配置由 `~/.grok/config.toml` 和稳定 CLI 参数管理',
    }),
  }),
  antigravity: Object.freeze({
    sessionTerm: Object.freeze({
      en: Object.freeze({ singular: 'conversation', plural: 'conversations' }),
      zh: Object.freeze({ singular: 'conversation', plural: 'conversations' }),
    }),
    recentSessionsTitle: Object.freeze({
      en: 'Recent Antigravity Conversations',
      zh: '最近 Antigravity Conversations',
    }),
    recentSessionsLookup: Object.freeze({
      en: 'current workspace mapping in `~/.gemini/antigravity-cli/cache/last_conversations.json`',
      zh: '当前 workspace 对应的 `~/.gemini/antigravity-cli/cache/last_conversations.json` 映射',
    }),
    runtimeSummary: Object.freeze({
      en: 'workspace conversations, workspace-bound resume, provider-default native compaction',
      zh: 'workspace conversations、workspace 绑定 resume、provider 默认 native 压缩',
    }),
    sessionStore: Object.freeze({
      en: 'Antigravity CLI cache (`~/.gemini/antigravity-cli`)',
      zh: 'Antigravity CLI cache（`~/.gemini/antigravity-cli`）',
    }),
    resumeSurface: Object.freeze({
      en: 'conversation resume; workspace changes reset the bound conversation',
      zh: '按 conversation 恢复；切换 workspace 时会重置已绑定 conversation',
    }),
    nativeCompactSurface: Object.freeze({
      en: 'provider-native compaction; no exposed native limit override',
      zh: 'provider 原生压缩；不暴露 native limit 覆盖',
    }),
    rawConfigSurface: Object.freeze({
      en: 'no stable raw config passthrough surface exposed by the CLI',
      zh: 'CLI 没有暴露稳定的 raw config passthrough',
    }),
  }),
  zcode: Object.freeze({
    sessionTerm: Object.freeze({
      en: Object.freeze({ singular: 'ZCode session', plural: 'ZCode sessions' }),
      zh: Object.freeze({ singular: 'ZCode session', plural: 'ZCode sessions' }),
    }),
    recentSessionsTitle: Object.freeze({
      en: 'Recent ZCode Sessions',
      zh: '最近 ZCode Sessions',
    }),
    recentSessionsLookup: Object.freeze({
      en: 'ZCode CLI rollout history in `~/.zcode/cli/rollout`',
      zh: 'ZCode CLI rollout 历史，来源 `~/.zcode/cli/rollout`',
    }),
    runtimeSummary: Object.freeze({
      en: 'workspace sessions, workspace-bound resume, headless JSON runner',
      zh: 'workspace sessions、workspace 绑定 resume、headless JSON runner',
    }),
    sessionStore: Object.freeze({
      en: 'ZCode CLI state (`~/.zcode/cli`)',
      zh: 'ZCode CLI 状态（`~/.zcode/cli`）',
    }),
    resumeSurface: Object.freeze({
      en: 'session-id resume; workspace changes reset the bound session',
      zh: '按 session id 恢复；切换 workspace 时会重置已绑定 session',
    }),
    nativeCompactSurface: Object.freeze({
      en: 'native compaction is not exposed by the headless runner',
      zh: 'headless runner 暂未暴露原生压缩',
    }),
    rawConfigSurface: Object.freeze({
      en: 'configuration is managed by `~/.zcode/cli/config.json`',
      zh: '配置由 `~/.zcode/cli/config.json` 管理',
    }),
  }),
  pi: Object.freeze({
    sessionTerm: Object.freeze({
      en: Object.freeze({ singular: 'session', plural: 'sessions' }),
      zh: Object.freeze({ singular: 'session', plural: 'sessions' }),
    }),
    recentSessionsTitle: Object.freeze({
      en: 'Recent Pi Sessions',
      zh: '最近 Pi Sessions',
    }),
    recentSessionsLookup: Object.freeze({
      en: 'workspace session journals in `~/.pi/agent/sessions`',
      zh: 'workspace session 记录，来源 `~/.pi/agent/sessions`',
    }),
    runtimeSummary: Object.freeze({
      en: 'Pi JSON event stream, workspace sessions, native compaction',
      zh: 'Pi JSON 事件流、workspace sessions、原生压缩',
    }),
    sessionStore: Object.freeze({
      en: 'Pi session journals (`~/.pi/agent/sessions`)',
      zh: 'Pi session 记录（`~/.pi/agent/sessions`）',
    }),
    resumeSurface: Object.freeze({
      en: 'session-id resume via `--session`; workspace changes reset the binding',
      zh: '通过 `--session` 按 session id 恢复；切换 workspace 时重置绑定',
    }),
    nativeCompactSurface: Object.freeze({
      en: 'provider-native compaction; no exposed native limit override',
      zh: 'provider 原生压缩；不暴露 native limit 覆盖',
    }),
    rawConfigSurface: Object.freeze({
      en: 'configuration is managed by Pi settings and CLI flags',
      zh: '配置由 Pi settings 和 CLI flags 管理',
    }),
  }),
  omp: Object.freeze({
    sessionTerm: Object.freeze({
      en: Object.freeze({ singular: 'session', plural: 'sessions' }),
      zh: Object.freeze({ singular: 'session', plural: 'sessions' }),
    }),
    recentSessionsTitle: Object.freeze({
      en: 'Recent OMP Sessions',
      zh: '最近 OMP Sessions',
    }),
    recentSessionsLookup: Object.freeze({
      en: 'workspace session journals in `~/.omp/agent/sessions`',
      zh: 'workspace session 记录，来源 `~/.omp/agent/sessions`',
    }),
    runtimeSummary: Object.freeze({
      en: 'OMP JSON event stream, workspace sessions, approval modes, native compaction',
      zh: 'OMP JSON 事件流、workspace sessions、审批模式、原生压缩',
    }),
    sessionStore: Object.freeze({
      en: 'OMP session journals (`~/.omp/agent/sessions`)',
      zh: 'OMP session 记录（`~/.omp/agent/sessions`）',
    }),
    resumeSurface: Object.freeze({
      en: 'session-id resume via `--resume`; workspace changes reset the binding',
      zh: '通过 `--resume` 按 session id 恢复；切换 workspace 时重置绑定',
    }),
    nativeCompactSurface: Object.freeze({
      en: 'provider-native compaction; no exposed native limit override',
      zh: 'provider 原生压缩；不暴露 native limit 覆盖',
    }),
    rawConfigSurface: Object.freeze({
      en: 'configuration is managed by OMP settings and CLI flags',
      zh: '配置由 OMP settings 和 CLI flags 管理',
    }),
  }),
});

function getSurface(provider) {
  return PROVIDER_RUNTIME_SURFACES[normalizeProvider(provider)] || PROVIDER_RUNTIME_SURFACES.codex;
}

function readLocalized(value, language = 'en') {
  if (!value || typeof value !== 'object') return '';
  return language === 'zh' ? value.zh || value.en || '' : value.en || value.zh || '';
}

export function formatProviderRuntimeSummary(provider, language = 'en') {
  return readLocalized(getSurface(provider).runtimeSummary, language);
}

export function formatProviderSessionTerm(provider, language = 'en', { plural = false } = {}) {
  const surface = getSurface(provider);
  const localized = language === 'zh' ? surface.sessionTerm?.zh : surface.sessionTerm?.en;
  if (!localized || typeof localized !== 'object') return plural ? 'sessions' : 'session';
  return plural ? localized.plural || localized.singular || 'sessions' : localized.singular || 'session';
}

export function formatProviderSessionLabel(provider, language = 'en', { plural = false } = {}) {
  return `${getProviderShortName(provider)} ${formatProviderSessionTerm(provider, language, { plural })}`.trim();
}

export function formatProviderSessionStoreSurface(provider, language = 'en') {
  return readLocalized(getSurface(provider).sessionStore, language);
}

export function formatProviderResumeSurface(provider, language = 'en') {
  return readLocalized(getSurface(provider).resumeSurface, language);
}

export function formatProviderNativeCompactSurface(provider, language = 'en') {
  return readLocalized(getSurface(provider).nativeCompactSurface, language);
}

export function formatProviderRawConfigSurface(provider, language = 'en') {
  if (providerSupportsRawConfigOverrides(provider)) {
    return readLocalized(PROVIDER_RUNTIME_SURFACES.codex.rawConfigSurface, language);
  }
  return readLocalized(getSurface(provider).rawConfigSurface, language);
}

export function formatProviderReasoningSurface(provider, language = 'en') {
  const levels = getSupportedReasoningEffortLevels(provider);
  if (!levels.length) {
    return language === 'zh' ? '未暴露 reasoning effort 能力面' : 'reasoning effort not exposed';
  }
  return levels.map((level) => `\`${level}\``).join(language === 'zh' ? '、' : ', ');
}

export function formatRecentSessionsTitle(provider, language = 'en') {
  return readLocalized(getSurface(provider).recentSessionsTitle, language);
}

export function formatRecentSessionsLookup(provider, language = 'en') {
  return readLocalized(getSurface(provider).recentSessionsLookup, language);
}
