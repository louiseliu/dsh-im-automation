import test from 'node:test';
import assert from 'node:assert/strict';
import { namedTargets } from '../src/discovery.mjs';
import { validRequest, rpcHandler, installRpc } from '../src/rpc.mjs';

test('management rejects arbitrary platform routes, message bodies and unversioned saves', () => {
  assert.equal(validRequest('save', { taskId: 't', enabled: true, botId: 'b', targetId: 'x', expectedRevision: 0 }), true);
  assert.equal(validRequest('save', { taskId: 't', enabled: true, botId: 'b', targetId: 'x' }), false);
  assert.equal(validRequest('test', { botId: 'b', targetId: 'x', text: 'arbitrary message' }), false);
  assert.equal(validRequest('targets', { botId: 'b', route: {} }), false);
  assert.equal(validRequest('delete', {}), false);
});
test('target discovery exposes only display names and stable IDs', async () => {
  const engine = { now: () => 0, discovery: { bindings: { until: Infinity, promise: Promise.resolve([]) } },
    domain: { table: () => ({ get: () => undefined }) }, im: () => ({
      listTargets: async () => [{ targetId: 'x', name: '日报群', route: { chatId: 'private' }, token: 'secret' }],
    }) };
  engine.targets = botId => namedTargets(engine, botId);
  const handler = rpcHandler(engine);
  assert.deepEqual(await handler('targets', { botId: 'b' }), { ok: true, value: [{ targetId: 'x', name: '日报群', needsName: false }] });
});
test('RPC uses the authenticated Harness carrier and rejects malformed envelopes', async () => {
  let route;
  installRpc({ connection: { fetch: { register: value => { route = value; } } } }, {
    serial: work => work(), view: async () => ({ tasks: [] }),
  });
  const url = `http://localhost${route.path}`;
  const malformed = await route.fetch(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }));
  assert.equal(malformed.status, 400);
  const response = await route.fetch(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'r1', method: 'dsh-im-automation', payload: { method: 'view', payload: {} } }) }));
  assert.deepEqual(await response.json(), { type: 'server-response', rpcId: 'r1', result: { ok: true, value: { tasks: [] } } });
});
