// Trusted operator configuration, not a caller-supplied identity on the task API.
// Seed once so later Discord settings are not reset on every restart.
export function applyInitialTaskPolicies({ raw = '', sessionStore, accessPolicy, canManage }) {
  if (!raw.trim()) return;
  const policies = JSON.parse(raw);
  if (!policies || typeof policies !== 'object' || Array.isArray(policies)) throw new Error('invalid LOCAL_TASK_INITIAL_POLICIES');
  const entries = Object.entries(policies);
  for (const [guildId, policy] of entries) {
    if (!/^\d{16,22}$/.test(guildId) || !policy || typeof policy !== 'object' || Array.isArray(policy)
      || Object.keys(policy).some(key => !['mode', 'ownerUserId'].includes(key))
      || !['allow', 'approval'].includes(policy.mode) || !/^\d{16,22}$/.test(policy.ownerUserId || '')
      || !canManage(policy.ownerUserId) || !accessPolicy.isAllowedUser(policy.ownerUserId)) {
      throw new Error(`invalid or unauthorized initial task policy: ${guildId}`);
    }
  }
  for (const [guildId, policy] of entries) {
    if (!sessionStore.getAgentMessagePolicy(guildId)) {
      sessionStore.setAgentMessagePolicy(guildId, { ...policy, updatedAt: new Date().toISOString() });
    }
  }
}
