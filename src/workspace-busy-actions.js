import path from 'node:path';

const WORKSPACE_BUSY_PREFIX = 'wbusy';

export function buildWorkspaceBusyComponentId(action, userId) {
  const normalizedAction = String(action || '').trim().toLowerCase();
  const normalizedUserId = String(userId || '').trim();
  return `${WORKSPACE_BUSY_PREFIX}:${normalizedAction}:${normalizedUserId}`;
}

export function parseWorkspaceBusyComponentId(customId) {
  const match = /^wbusy:([a-z_]+):([0-9]{5,32})$/i.exec(String(customId || '').trim());
  if (!match) return null;
  const action = String(match[1] || '').trim().toLowerCase();
  if (!['isolate', 'auto', 'default'].includes(action)) return null;
  return {
    action,
    userId: String(match[2] || '').trim(),
  };
}

export function isWorkspaceBusyComponentId(customId) {
  return Boolean(parseWorkspaceBusyComponentId(customId));
}

function normalizeLanguage(value) {
  return String(value || '').trim().toLowerCase() === 'en' ? 'en' : 'zh';
}

export function createWorkspaceBusyActions({
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  commandActions,
  workspaceRoot,
  ensureDir = () => {},
  getSession,
  getSessionLanguage = () => 'zh',
  getSessionProvider = () => 'codex',
  getWorkspaceBinding = () => ({ workspaceDir: null, source: 'unset' }),
  resolveChildThreadWorkspaceMode = () => ({ mode: 'inherit', source: 'default' }),
  setChildThreadWorkspaceMode = () => ({ mode: 'inherit', source: 'default' }),
  formatWorkspaceBusyReport,
  formatWorkspaceUpdateReport,
  openWorkspaceBrowser,
  slashRef = (name) => `/${name}`,
} = {}) {
  function buildWorkspaceBusyPayload({ key, session, userId, workspaceDir, owner, flags } = {}) {
    const payload = {
      content: formatWorkspaceBusyReport(session, workspaceDir, owner),
      components: [],
    };

    if (ActionRowBuilder && ButtonBuilder && ButtonStyle && userId) {
      payload.components = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(buildWorkspaceBusyComponentId('isolate', userId))
            .setLabel(normalizeLanguage(getSessionLanguage(session)) === 'en' ? 'Use separate workspace' : '切到独立 workspace')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(buildWorkspaceBusyComponentId('auto', userId))
            .setLabel(normalizeLanguage(getSessionLanguage(session)) === 'en' ? 'Auto avoid future locks' : '以后默认独立')
            .setStyle(ButtonStyle.Success),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(buildWorkspaceBusyComponentId('default', userId))
            .setLabel(normalizeLanguage(getSessionLanguage(session)) === 'en' ? 'Change default workspace' : '修改默认 workspace')
            .setStyle(ButtonStyle.Secondary),
        ),
      ];
    }

    if (flags !== undefined) payload.flags = flags;
    return payload;
  }

  async function handleWorkspaceBusyInteraction(interaction) {
    const parsed = parseWorkspaceBusyComponentId(interaction.customId);
    if (!parsed) return false;

    const key = String(interaction.channelId || '').trim();
    const session = key ? getSession(key, { channel: interaction.channel || null }) : null;
    const language = normalizeLanguage(getSessionLanguage(session));

    if (!key || !session) {
      await interaction.reply({
        content: language === 'en' ? '❌ This workspace action is no longer available.' : '❌ 这条 workspace 操作已经失效。',
        flags: 64,
      });
      return true;
    }

    if (parsed.userId !== interaction.user.id) {
      await interaction.reply({
        content: language === 'en' ? '⛔ These workspace actions belong to another user.' : '⛔ 这组 workspace 操作属于别的用户。',
        flags: 64,
      });
      return true;
    }

    if (parsed.action === 'default') {
      if (typeof openWorkspaceBrowser === 'function') {
        await interaction.reply(openWorkspaceBrowser({
          key,
          session,
          userId: interaction.user.id,
          mode: 'default',
          flags: 64,
        }));
      } else {
        await interaction.reply({
          content: language === 'en'
            ? `Use \`${slashRef('setdefaultdir')} path:browse\` to update the provider default workspace.`
            : `请用 \`${slashRef('setdefaultdir')} path:browse\` 调整 provider 默认 workspace。`,
          flags: 64,
        });
      }
      return true;
    }

    const isolatedWorkspaceDir = path.resolve(path.join(workspaceRoot, key));
    const currentBinding = getWorkspaceBinding(session, key) || {};
    const provider = getSessionProvider(session);
    const currentMode = resolveChildThreadWorkspaceMode(provider);
    const alreadyIsolated = String(currentBinding.workspaceDir || '') === isolatedWorkspaceDir;

    if (parsed.action === 'auto') {
      const nextMode = setChildThreadWorkspaceMode(provider, 'separate');
      if (alreadyIsolated) {
        await interaction.reply({
          content: language === 'en'
            ? [
              '✅ Automatic lock avoidance is now enabled for new child threads.',
              'This channel is already using its own workspace.',
              `Provider mode: \`${nextMode.mode}\` (${nextMode.source})`,
            ].join('\n')
            : [
              '✅ 已开启自动避锁。后续新的子 thread 会默认使用独立 workspace。',
              '当前频道已经在用自己的独立 workspace。',
              `• 当前 provider 策略：\`${nextMode.mode}\`（${nextMode.source}）`,
            ].join('\n'),
          flags: 64,
        });
        return true;
      }

      ensureDir(isolatedWorkspaceDir);
      const result = commandActions.setWorkspaceDir(session, key, isolatedWorkspaceDir);
      await interaction.update({
        content: language === 'en'
          ? [
            '✅ Automatic lock avoidance enabled for new child threads.',
            formatWorkspaceUpdateReport(key, session, result),
          ].join('\n')
          : [
            '✅ 已开启自动避锁。后续新的子 thread 会默认使用独立 workspace。',
            formatWorkspaceUpdateReport(key, session, result),
          ].join('\n'),
        components: [],
      });
      return true;
    }

    if (alreadyIsolated) {
      await interaction.reply({
        content: language === 'en'
          ? [
            'ℹ️ This channel is already using its own workspace.',
            'The lock is coming from another active run in the same workspace.',
            currentMode.mode === 'separate'
              ? 'Automatic lock avoidance for new child threads is already enabled.'
              : `If you want future child threads to avoid shared locks, click the auto button below or use \`${slashRef('setdefaultdir')} path:browse\` for the default path.`,
          ].join('\n')
          : [
            'ℹ️ 当前频道已经在用自己的独立 workspace。',
            '这次锁住说明同一个 workspace 里还有别的运行没结束。',
            currentMode.mode === 'separate'
              ? '后续新的子 thread 也已经默认会走独立 workspace。'
              : `如果希望后续新的子 thread 默认避开共享锁，可以点下方的自动避锁按钮；如果问题在共享默认目录，也可以用 \`${slashRef('setdefaultdir')} path:browse\` 调整 provider 默认 workspace。`,
          ].join('\n'),
        flags: 64,
      });
      return true;
    }

    ensureDir(isolatedWorkspaceDir);
    const result = commandActions.setWorkspaceDir(session, key, isolatedWorkspaceDir);
    await interaction.update({
      content: formatWorkspaceUpdateReport(key, session, result),
      components: [],
    });
    return true;
  }

  return {
    buildWorkspaceBusyPayload,
    handleWorkspaceBusyInteraction,
    isWorkspaceBusyComponentId,
  };
}
