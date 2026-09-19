import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalTaskSourceAccess } from '../src/local-task-source-access.js';

test('only enabled peers explicit source scopes and user restrictions are accepted', () => {
  const accessPolicy = { isAllowedChannel: c => c.id === 'own' };
  const env = { CLAUDE__LOCAL_TASK_SOCKET_DIR: '/private/claude', CLAUDE__ALLOWED_CHANNEL_IDS: 'claude-parent',
    CLAUDE__ALLOWED_USER_IDS: 'owner', GROK__ALLOWED_CHANNEL_IDS: 'disabled-parent',
    OMP__LOCAL_TASK_SOCKET_DIR: '/private/omp', ALLOWED_CHANNEL_IDS: 'unrelated-global' };
  const allowed = createLocalTaskSourceAccess({ accessPolicy, env });
  const thread = parentId => ({ id: 'thread', parentId, isThread: () => true });
  assert.equal(allowed({ id: 'own' }, 'owner'), true);
  assert.equal(allowed(thread('claude-parent'), 'owner'), true);
  assert.equal(allowed(thread('claude-parent'), 'other'), false);
  assert.equal(allowed(thread('disabled-parent'), 'owner'), false);
  assert.equal(allowed(thread('unrelated-global'), 'owner'), false);
  assert.equal(allowed(thread('arbitrary'), 'owner'), false);
  assert.equal(accessPolicy.isAllowedChannel(thread('claude-parent')), false);
});
