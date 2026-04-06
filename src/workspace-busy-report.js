import { humanAge as defaultHumanAge } from './runtime-utils.js';

export function formatWorkspaceBusyReport(
  session,
  workspaceDir,
  owner = null,
  {
    getSessionLanguage = () => 'zh',
    normalizeUiLanguage = (value) => (String(value || '').trim().toLowerCase() === 'en' ? 'en' : 'zh'),
    humanAge = defaultHumanAge,
    slashRef = (name) => `/${name}`,
  } = {},
) {
  const language = normalizeUiLanguage(getSessionLanguage(session));
  const ownerProvider = owner?.provider ? `\`${owner.provider}\`` : null;
  const ownerKey = owner?.key ? `\`${owner.key}\`` : null;
  const acquiredAtMs = owner?.acquiredAt ? Date.parse(owner.acquiredAt) : NaN;
  const age = Number.isFinite(acquiredAtMs) ? humanAge(Math.max(0, Date.now() - acquiredAtMs)) : null;

  if (language === 'en') {
    return [
      '⏳ Workspace is busy; waiting for exclusive access.',
      `• workspace: \`${workspaceDir}\``,
      ownerProvider ? `• owner provider: ${ownerProvider}` : null,
      ownerKey ? `• owner channel: ${ownerKey}` : null,
      age ? `• lock age: ${age}` : null,
      `• quick fix: click the button below to move this channel to its own workspace right now`,
      `• future fix: enable automatic separate workspaces for new child threads`,
      `• if many channels keep colliding, update the provider default via \`${slashRef('setdefaultdir')} path:browse\``,
    ].filter(Boolean).join('\n');
  }

  return [
    '⏳ workspace 正忙，正在等待独占执行。',
    `• workspace: \`${workspaceDir}\``,
    ownerProvider ? `• 当前持有 provider: ${ownerProvider}` : null,
    ownerKey ? `• 当前持有频道: ${ownerKey}` : null,
    age ? `• 锁已持有: ${age}` : null,
    '• 快捷处理：可以直接点下方按钮，立刻把当前频道切到独立 workspace',
    '• 长期处理：也可以开启后续新子 thread 默认独立 workspace',
    `• 如果很多频道反复撞锁，请用 \`${slashRef('setdefaultdir')} path:browse\` 调整 provider 默认 workspace`,
  ].filter(Boolean).join('\n');
}
