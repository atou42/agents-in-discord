import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInitialTaskPolicies } from '../src/local-task-policy-config.js';

const guild = '1052577697466953758';
const owner = '477027411532316683';
const raw = JSON.stringify({ [guild]: { mode: 'allow', ownerUserId: owner } });
function fixture() {
  const policies = new Map();
  let writes = 0;
  const options = { raw, sessionStore: { getAgentMessagePolicy: id => policies.get(id),
    setAgentMessagePolicy: (id, policy) => { writes++; policies.set(id, policy); } },
  accessPolicy: { isAllowedUser: id => id === owner }, canManage: id => id === owner };
  return { options, policies, writes: () => writes };
}
test('operator seed persists allow once; settings changes survive restart', () => {
  const f = fixture();
  applyInitialTaskPolicies(f.options);
  assert.equal(f.policies.get(guild).mode, 'allow');
  assert.equal(f.policies.get(guild).ownerUserId, owner);
  assert.ok(Number.isFinite(Date.parse(f.policies.get(guild).updatedAt)));
  f.policies.set(guild, { mode: 'approval', ownerUserId: owner });
  applyInitialTaskPolicies(f.options);
  assert.equal(f.policies.get(guild).mode, 'approval');
  assert.equal(f.writes(), 1);
});
test('blank config is inert; malformed or unauthorized input never writes', () => {
  for (const value of ['', '   ']) {
    const f = fixture(); applyInitialTaskPolicies({ ...f.options, raw: value }); assert.equal(f.writes(), 0);
  }
  for (const value of ['{', 'null', '[]', '{"bad":{}}',
    JSON.stringify({ [guild]: { mode: 'allow', ownerUserId: '111111111111111111' } }),
    JSON.stringify({ [guild]: { mode: 'allow', ownerUserId: owner, extra: true } }),
    JSON.stringify({ [guild]: { mode: 'unknown', ownerUserId: owner } }),
    JSON.stringify({ [guild]: { mode: 'allow', ownerUserId: owner }, bad: {} })]) {
    const f = fixture(); assert.throws(() => applyInitialTaskPolicies({ ...f.options, raw: value })); assert.equal(f.writes(), 0);
  }
  const f = fixture();
  assert.throws(() => applyInitialTaskPolicies({ ...f.options, canManage: () => false }));
  assert.equal(f.writes(), 0);
});
test('storage failure surfaces without retry or replacing existing policies', () => {
  const f = fixture();
  f.options.sessionStore.setAgentMessagePolicy = () => { throw new Error('disk failed'); };
  assert.throws(() => applyInitialTaskPolicies(f.options), /disk failed/);
});
