import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nativeHarness, until } from './harness.mjs';
import * as plugin from '../../lib/index.js';

test('packaged plugin loads in official Host, serves RPC, delivers and unloads cleanly', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dia-plugin-'));
  let harness;
  let fiber;
  try {
    harness = await nativeHarness(root, { engine: false });
    const routes = new Map();
    harness.ctx.provide('connection', { fetch: { register: route => {
      routes.set(route.path, route);
      return () => routes.delete(route.path);
    } } });
    fiber = await harness.ctx.plugin(plugin);
    assert.ok(routes.has('/api/dsh-im-automation'));
    const rpc = async (method, payload) => {
      const route = routes.get('/api/dsh-im-automation');
      const response = await route.fetch(new Request('http://localhost/api/dsh-im-automation', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', method: 'dsh-im-automation', rpcId: 'test', payload: { method, payload } }),
      }));
      return (await response.json()).result;
    };
    const agent = await harness.createAgent('plugin-task-session');
    const task = await harness.createTask(agent, '完整插件测试');
    const saved = await rpc('save', { taskId: task.id, enabled: true, botId: 'bot1', targetId: '日报群', expectedRevision: 0 });
    assert.equal(saved.ok, true);
    await until(async () => (await rpc('view', {})).value?.deliveries[0]?.state === 'sent');
    assert.equal(harness.sent.length, 1);
    const view = await rpc('view', {});
    assert.equal(view.value.deliveries[0].state, 'sent');
    await fiber.dispose(); fiber = null;
    assert.equal(routes.size, 0);
    fiber = await harness.ctx.plugin(plugin);
    const restored = await rpc('view', {});
    assert.equal(restored.value.configs[0].taskId, task.id);
    assert.equal(restored.value.deliveries[0].state, 'sent');
    assert.equal(harness.sent.length, 1);
  } finally {
    await fiber?.dispose();
    await harness?.close();
    await rm(root, { recursive: true, force: true });
  }
});
