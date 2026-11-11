import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nativeHarness, until } from './harness.mjs';
import { automationDomain, configSchema, deliverySchema } from '../../src/storage.mjs';

const input = mode => ({ requestId: crypto.randomUUID(), mode, title: '向导报告', prompt: '生成本次报告',
  timing: { kind: 'after', minutes: 1 }, workspaceId: mode === 'direct' ? 'workspace1' : '',
  sessionId: mode === 'sync' ? 'bound-session' : '', botId: 'bot1', targetId: mode === 'direct' ? '日报群' : '' });

test('wizard stores native tasks and Session logs in chosen workspace; reload preserves creation identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dia-creation-')); let h;
  try {
    h = await nativeHarness(root);
    const request = { ...input('direct'), targetName: '我的飞书' };
    const row = await h.engine.serial(() => h.engine.create(request));
    assert.equal(row.configSaved, true);
    assert.equal(h.ctx.sessions.get(row.sessionId).snapshotEvents().findLast(event => event.type === 'session/title')?.data.title, '飞书 · ⏰ 向导报告');
    assert.ok((await h.ctx.schedule.catalog()).some(task => task.id === row.taskId && task.sessionId === row.sessionId));
    const header = h.ctx.sessions.get(row.sessionId).header;
    assert.equal(header.cwd, join(root, 'bot-workspace'));
    assert.ok(h.ctx.workspaceRegistry.get('workspace1').sessionIds.includes(row.sessionId));
    // Accelerate only the native test schedule; production wizard uses its minute setting.
    const { sessionId, status, lastDelivery, ...nativeTask } = (await h.ctx.schedule.catalog()).find(task => task.id === row.taskId);
    const updated = await h.ctx.schedule.update({ id: row.taskId, sessionId: row.sessionId, expected: nativeTask, change: { kind: 'at', at: new Date(Date.now() + 1000).toISOString() } });
    assert.equal(updated.updated, true);
    await until(() => h.sent.length === 1);
    const events = await h.engine.readEvents(row.sessionId);
    assert.ok(events.some(event => event.type === 'user/message' && event.data.source?.kind === 'schedule'));
    await h.stopEngine(); await h.startEngine();
    assert.equal((await h.engine.create(request)).taskId, row.taskId);
    assert.equal((await h.ctx.schedule.catalog()).length, 1);
    assert.equal((await h.engine.targets('bot1')).find(target => target.targetId === '日报群').name, '我的飞书');
    assert.equal(h.sent.length, 1);
  } finally { await h?.close(); await rm(root, { recursive: true, force: true }); }
});

test('legacy chat task keeps its native Session and never adds a direct send', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dia-sync-')); let h;
  try {
    const im = { listBots: async () => [{ botId: 'bot1', channel: 'feishu' }], listTargets: async () => [],
      describeConversation: async id => id === 'bound-session' ? { botId: 'bot1' } : null,
      send: async () => { assert.fail('sync mode must never send directly'); } };
    h = await nativeHarness(root, { im });
    const agent = await h.createAgent('bound-session');
    const task = await h.createTask(agent, '旧版聊天任务', 3600);
    const row = { taskId: task.id, sessionId: 'bound-session' };
    await h.engine.serial(() => h.engine.save({ taskId: task.id, mode: 'sync', enabled: true, botId: 'bot1', targetId: '', expectedRevision: 0 }));
    const { sessionId, status, lastDelivery, ...nativeTask } = (await h.ctx.schedule.catalog()).find(task => task.id === row.taskId);
    const updated = await h.ctx.schedule.update({ id: row.taskId, sessionId: row.sessionId, expected: nativeTask, change: { kind: 'at', at: new Date(Date.now() + 1000).toISOString() } });
    assert.equal(updated.updated, true);
    await until(async () => (await h.engine.readEvents(row.sessionId)).some(event => event.type === 'turn/end'));
    await until(() => h.engine.snapshot().deliveries[0]?.state === 'delegated');
    assert.equal(h.engine.snapshot().deliveries[0].state, 'delegated');
    assert.equal((await h.ctx.sessionPersistence.list()).length, 1);
  } finally { await h?.close(); await rm(root, { recursive: true, force: true }); }
});

test('existing version 1 configs upgrade to direct mode without losing confirmed-send records', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dia-migrate-')); let h;
  try {
    h = await nativeHarness(root, { engine: false });
    const old = await h.ctx.storageDomain.open({ name: automationDomain.name, version: 1,
      tables: { configs: { valueSchema: configSchema.omit({ mode: true }) }, deliveries: { valueSchema: deliverySchema.omit({ mode: true }) } } });
    await old.table('configs').put('task1', { taskId: 'task1', sessionId: 's1', enabled: true, botId: 'bot1', targetId: '日报群', revision: 1, enabledAt: 1 });
    await old.table('deliveries').put('receipt1', { taskId: 'task1', sessionId: 's1', messageId: 'm1', scheduledAt: new Date().toISOString(), configRevision: 1, botId: 'bot1', targetId: '日报群', state: 'sent', reason: 'platform-accepted', updatedAt: 1 });
    await old.close();
    const next = await h.ctx.storageDomain.open(automationDomain);
    assert.equal(next.table('configs').get('task1').mode, 'direct');
    assert.equal(next.table('deliveries').get('receipt1').state, 'sent');
    assert.equal([...next.table('creations').entries()].length, 0);
    assert.equal([...next.table('target_labels').entries()].length, 0);
    await next.close();
  } finally { await h?.close(); await rm(root, { recursive: true, force: true }); }
});
