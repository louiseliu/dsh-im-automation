import test from 'node:test';
import assert from 'node:assert/strict';
import { namedBots, namedTargets, recipientOptions, rememberTargetName } from '../src/discovery.mjs';
const fixture = () => {
  const labels = new Map(); let profiles = 0;
  const bindings = { s1: { botId: 'bot1', chatType: 'p2p', senderId: 'ou_target', senderName: '小林' } };
  const im = { listBots: async () => [{ botId: 'bot1', channel: 'feishu' }],
    describeBot: async () => { profiles++; return { account: { name: '经营助手', fingerprint: 'not-for-ui' }, token: 'secret' }; },
    describeConversationSync: id => bindings[id] ?? null,
    listTargets: async () => [{ targetId: 't1', kind: 'user', name: '私聊 · ou_target', route: { openId: 'ou_target' } }] };
  const engine = { im: () => im, now: () => 1, discovery: { profiles: new Map(), bindings: null },
    domain: { table: () => ({ get: key => labels.get(key), put: async (key, value) => labels.set(key, value) }) },
    persistence: { list: async () => [{ header: { id: 's1', cwd: '/store' } }] },
    getWorkspaces: () => ({ list: () => [{ id: 'w1', title: '店铺资料', path: '/store' }], archivedSessionIds: [] }) };
  return { engine, im, bindings, profiles: () => profiles };
};
test('public account name is cached; credentials and account fingerprints never leave discovery', async () => {
  const f = fixture();
  assert.deepEqual(await namedBots(f.engine), [{ botId: 'bot1', channel: 'feishu', name: '经营助手' }]);
  await namedBots(f.engine); assert.equal(f.profiles(), 1);
});
test('recipient names require exact bot and private-recipient identity; workspace matches bound directory', async () => {
  const f = fixture();
  const value = await recipientOptions(f.engine, 'bot1');
  assert.equal(value.targets[0].name, '小林'); assert.equal(value.workspaceId, 'w1'); assert.equal(value.workspaceMatched, true);
  assert.equal(JSON.stringify(value).includes('ou_target'), false);
  f.bindings.s1.senderId = 'another-user'; f.engine.discovery.bindings = null;
  assert.equal((await namedTargets(f.engine, 'bot1'))[0].needsName, true);
});
test('missing contact names use a persistent user note, without changing platform routes', async () => {
  const f = fixture(); delete f.bindings.s1.senderName;
  assert.equal((await namedTargets(f.engine, 'bot1'))[0].needsName, true);
  await rememberTargetName(f.engine, 'bot1', 't1', '我的飞书');
  assert.deepEqual((await namedTargets(f.engine, 'bot1'))[0], { targetId: 't1', name: '我的飞书', needsName: false, hasNote: true });
  assert.equal((await f.im.listTargets())[0].route.openId, 'ou_target');
});
test('conflicting bot directories never silently select a workspace', async () => {
  const f = fixture(); f.bindings.s2 = { ...f.bindings.s1 };
  f.engine.persistence.list = async () => [{ header: { id: 's1', cwd: '/store' } }, { header: { id: 's2', cwd: '/other' } }];
  f.engine.getWorkspaces = () => ({ list: () => [{ id: 'w1', path: '/store' }, { id: 'w2', path: '/other' }], archivedSessionIds: [] });
  const value = await recipientOptions(f.engine, 'bot1');
  assert.equal(value.workspaceId, null); assert.equal(value.workspaceMatched, false);
});

test('a changed target route invalidates its old note instead of displaying a stale recipient name', async () => {
  const f = fixture(); await rememberTargetName(f.engine, 'bot1', 't1', '我的飞书');
  f.im.listTargets = async () => [{ targetId: 't1', kind: 'user', name: '私聊 · ou_new', route: { openId: 'ou_new' } }];
  const target = (await namedTargets(f.engine, 'bot1'))[0];
  assert.equal(target.needsName, true); assert.notEqual(target.name, '我的飞书');
});

test('cold synchronous metadata falls back to public persisted conversation lookup', async () => {
  const f = fixture();
  f.im.describeConversationSync = () => null;
  f.im.describeConversation = async id => f.bindings[id] ?? null;
  const value = await recipientOptions(f.engine, 'bot1');
  assert.equal(value.workspaceId, 'w1');
  assert.equal(value.workspaceMatched, true);
});
