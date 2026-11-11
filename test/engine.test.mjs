import test from 'node:test';
import assert from 'node:assert/strict';
import { rpcHandler } from '../src/rpc.mjs';
import { AutomationDelivery } from '../src/engine.mjs';
import { creationSchema } from '../src/creation.mjs';
import { configSchema, deliverySchema, targetLabelSchema } from '../src/storage.mjs';

function fixture() {
  const maps = { configs: new Map(), deliveries: new Map(), creations: new Map(), target_labels: new Map() };
  const domain = { table: name => ({ get: key => maps[name].get(key), entries: () => maps[name].entries(),
    put: async (key, row) => maps[name].set(key, structuredClone((name === 'configs' ? configSchema : name === 'deliveries' ? deliverySchema : name === 'target_labels' ? targetLabelSchema : creationSchema).parse(row))),
    delete: async key => maps[name].delete(key) }) };
  let now = 1000;
  let tasks = [{ id: 'task1', sessionId: 'session1', title: '报告一' }];
  const histories = new Map();
  const logs = new Map();
  const sent = [];
  let bound = false;
  let createdSessions = 0, createdTasks = 0;
  const headers = new Map();
  const controller = { create: async ({ sessionId }) => { createdSessions++; headers.set(sessionId, { id: sessionId, cwd: '/fixture' }); return { sessionId }; } };
  const workspaces = { get: id => id === 'workspace1' ? { id, path: '/fixture' } : null, list: () => [{ id: 'workspace1', path: '/fixture' }] };
  let send = async (...args) => { sent.push(args); return { sent: true }; };
  const im = { listBots: async () => [{ botId: 'bot1', channel: 'feishu' }],
    listTargets: async () => [{ targetId: 'target1' }, { targetId: 'target2' }],
    describeConversation: async () => bound ? { botId: 'bot1' } : null,
    send: (...args) => send(...args) };
  const make = () => new AutomationDelivery({ domain, getIm: () => im, now: () => now,
    getController: () => controller, getWorkspaces: () => workspaces,
    schedule: { create: async (sessionId, value) => { const task = { ...value, sessionId, id: `created${++createdTasks}` }; tasks.push(task); return task; }, catalog: async () => structuredClone(tasks),
      history: async ({ id }) => ({ records: histories.get(id) ?? [] }) },
    sessions: { get: id => logs.has(id) ? { snapshotEvents: () => logs.get(id) } : undefined, flush: async () => true },
    persistence: { list: async () => [...headers.values()].map(header => ({ header })), stat: async id => ({ header: headers.get(id) ?? { id, cwd: '/fixture' } }), open: async () => { throw new Error('not persisted'); } }, logger: { warn() {} } });
  const engine = make();
  const config = (id = 'task1', targetId = 'target1', expectedRevision = 0) => engine.serial(() => engine.save({
    taskId: id, enabled: true, botId: 'bot1', targetId, expectedRevision }));
  const receipt = (id = 'm1', time = 2000) => ({ messageId: id,
    scheduledAt: new Date(time).toISOString(), deliveredAt: new Date(time + 10).toISOString() });
  const answer = (id = 'm1', text = '动态报告') => [
    { type: 'turn/start', data: { turn: 1 } },
    { type: 'user/message', data: { id, source: { kind: 'schedule' } } },
    { type: 'assistant/message', data: { step: 1, message: { content: [{ type: 'text', text }] } } },
    { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
  ];
  const ready = () => { histories.set('task1', [receipt()]); logs.set('session1', answer()); };
  return { engine, config, controller, workspaces, headers, counts: () => ({ createdTasks, createdSessions }), maps, histories, logs, sent, im, make, receipt, answer, ready,
    setTasks: value => { tasks = value; }, setBound: value => { bound = value; },
    setSend: value => { send = value; }, setNow: value => { now = value; } };
}

test('fast AI completion before the receipt is committed still sends exactly once', async () => {
  const f = fixture(); await f.config();
  f.logs.set('session1', f.answer());
  await f.engine.requestReconcile(); assert.equal(f.sent.length, 0);
  f.histories.set('task1', [f.receipt()]);
  await f.engine.requestReconcile(); await f.engine.requestReconcile();
  assert.equal(f.sent.length, 1);
  assert.deepEqual(f.sent[0].slice(0, 3), ['bot1', 'target1', '动态报告']);
  assert.equal(f.sent[0][3].format, 'markdown');
});
test('receipt before completion waits, then sends only after turn/end', async () => {
  const f = fixture(); await f.config(); f.ready();
  f.logs.set('session1', f.answer().slice(0, -1));
  await f.engine.requestReconcile(); assert.equal(f.sent.length, 0);
  assert.equal([...f.maps.deliveries.values()][0].state, 'pending');
  f.logs.set('session1', f.answer()); await f.engine.requestReconcile(); assert.equal(f.sent.length, 1);
});
test('two concurrent tasks send distinct results to their own targets', async () => {
  const f = fixture();
  f.setTasks([{ id: 'task1', sessionId: 'session1' }, { id: 'task2', sessionId: 'session2' }]);
  await f.config(); await f.config('task2', 'target2');
  f.ready(); f.histories.set('task2', [f.receipt('m2')]); f.logs.set('session2', f.answer('m2', '报告二'));
  await Promise.all([f.engine.requestReconcile(), f.engine.requestReconcile()]);
  assert.deepEqual(f.sent.map(args => args.slice(1, 3)), [['target1', '动态报告'], ['target2', '报告二']]);
});
test('shared native session is rejected both at configuration and after later task changes', async () => {
  const f = fixture(); await f.config(); f.ready();
  f.setTasks([{ id: 'task1', sessionId: 'session1' }, { id: 'task2', sessionId: 'session1' }]);
  await assert.rejects(f.config('task2'), { code: 'shared-session' });
  await f.engine.requestReconcile(); assert.equal(f.sent.length, 0);
  assert.equal([...f.maps.deliveries.values()][0].reason, 'shared-session');
});
test('an IM-bound session is rejected to avoid existing sync duplication', async () => {
  const f = fixture(); f.setBound(true);
  await assert.rejects(f.config(), { code: 'session-sync-conflict' });
  assert.equal(f.maps.configs.size, 0);
});
test('binding added after saving suppresses the scheduled send', async () => {
  const f = fixture(); await f.config(); f.ready(); f.setBound(true);
  await f.engine.requestReconcile(); assert.equal(f.sent.length, 0);
  assert.equal([...f.maps.deliveries.values()][0].reason, 'session-sync-conflict');
});
test('historical occurrences before enabling are never replayed', async () => {
  const f = fixture(); f.ready(); f.setNow(3000); await f.config();
  await f.engine.requestReconcile(); assert.equal(f.sent.length, 0);
});
test('confirmed sends remain deduplicated after engine restart', async () => {
  const f = fixture(); await f.config(); f.ready(); await f.engine.requestReconcile();
  const restarted = f.make(); await restarted.serial(() => restarted.start());
  assert.equal(f.sent.length, 1);
});
test('restart converts interrupted send attempts to unknown without retry', async () => {
  const f = fixture(); await f.config(); f.ready(); await f.engine.requestReconcile();
  for (const row of f.maps.deliveries.values()) row.state = 'sending';
  const restarted = f.make(); await restarted.serial(() => restarted.start());
  assert.equal(f.sent.length, 1);
  assert.equal([...f.maps.deliveries.values()][0].state, 'unknown');
});
test('pending occurrence recovers from a cold persisted Session', async () => {
  const f = fixture(); await f.config(); f.histories.set('task1', [f.receipt()]);
  await f.engine.requestReconcile();
  const restarted = f.make();
  restarted.persistence = { open: async () => ({ read: async () => ({ events: f.answer() }), close: async () => {} }) };
  await restarted.serial(() => restarted.start()); assert.equal(f.sent.length, 1);
});
test('network rejection is unknown and never automatically retried', async () => {
  const f = fixture(); await f.config(); f.ready(); let calls = 0;
  f.setSend(async () => { calls++; throw new Error('socket closed'); });
  await f.engine.requestReconcile(); await f.engine.requestReconcile();
  assert.equal(calls, 1); assert.equal([...f.maps.deliveries.values()][0].state, 'unknown');
});
test('deleted target is a failed preflight with no send', async () => {
  const f = fixture(); await f.config(); f.ready(); f.im.listTargets = async () => [];
  await f.engine.requestReconcile(); assert.equal(f.sent.length, 0);
  assert.equal([...f.maps.deliveries.values()][0].reason, 'unknown-target');
});
test('offline bot refusal is recorded and not retried', async () => {
  const f = fixture(); await f.config(); f.ready(); let calls = 0;
  f.setSend(async () => { calls++; throw Object.assign(new Error(), { code: 'bot-not-connected' }); });
  await f.engine.requestReconcile(); await f.engine.requestReconcile();
  assert.equal(calls, 1); assert.equal([...f.maps.deliveries.values()][0].state, 'failed');
});
test('task deletion cleans configuration without sending its pending occurrence', async () => {
  const f = fixture(); await f.config(); f.ready(); f.setTasks([]);
  await f.engine.requestReconcile(); assert.equal(f.maps.configs.size, 0); assert.equal(f.sent.length, 0);
});
test('config changes cannot redirect an already observed pending occurrence', async () => {
  const f = fixture(); await f.config(); f.histories.set('task1', [f.receipt()]); await f.engine.requestReconcile();
  await f.config('task1', 'target2', 1); f.logs.set('session1', f.answer());
  await f.engine.requestReconcile(); assert.equal(f.sent.length, 0);
  assert.equal([...f.maps.deliveries.values()][0].reason, 'config-changed');
});
test('same configuration is a no-op; stale writes conflict', async () => {
  const f = fixture(); await f.config(); const again = await f.config('task1', 'target1', 1);
  assert.equal(again.revision, 1); await assert.rejects(f.config(), { code: 'config-conflict' });
});
test('send-attempt state must be durable before calling the platform', async () => {
  const f = fixture(); await f.config(); f.ready();
  const put = f.engine.deliveries.put;
  f.engine.deliveries.put = async (key, row) => { if (row.state === 'sending') throw new Error('disk full'); return put(key, row); };
  await f.engine.requestReconcile(); assert.equal(f.sent.length, 0); assert.equal(f.engine.health, 'reconcile-failed');
});
test('confirmation-write failure cannot cause a repeated send', async () => {
  const f = fixture(); await f.config(); f.ready();
  const put = f.engine.deliveries.put;
  f.engine.deliveries.put = async (key, row) => { if (row.state === 'sent') throw new Error('disk full'); return put(key, row); };
  await f.engine.requestReconcile(); await f.engine.requestReconcile(); assert.equal(f.sent.length, 1);
  assert.equal([...f.maps.deliveries.values()][0].state, 'unknown');
  const restarted = f.make(); await restarted.serial(() => restarted.start());
  assert.equal([...f.maps.deliveries.values()][0].state, 'unknown'); assert.equal(f.sent.length, 1);
});
test('shutdown cancels an uncooperative adapter without hanging or retrying', async () => {
  const f = fixture(); await f.config(); f.ready();
  let signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  f.setSend(() => { signalStarted(); return new Promise(() => {}); });
  const job = f.engine.requestReconcile(); await started;
  await f.engine.close(); await job;
  assert.equal([...f.maps.deliveries.values()][0].state, 'unknown');
});

test('native crash redelivery with a new message identity cannot repeat a confirmed occurrence', async () => {
  const f = fixture(); await f.config(); f.ready(); await f.engine.requestReconcile();
  f.histories.set('task1', [f.receipt('m2'), f.receipt()]); f.logs.set('session1', f.answer('m2'));
  await f.engine.requestReconcile(); assert.equal(f.sent.length, 1);
});

test('disabling delivery resolves existing pending records without sending', async () => {
  const f = fixture(); await f.config(); f.histories.set('task1', [f.receipt()]); await f.engine.requestReconcile();
  await f.engine.serial(() => f.engine.save({ taskId: 'task1', enabled: false, botId: 'bot1', targetId: 'target1', expectedRevision: 1 }));
  await f.engine.requestReconcile(); assert.equal(f.sent.length, 0);
  assert.equal([...f.maps.deliveries.values()][0].reason, 'config-disabled');
});

const creation = mode => ({ requestId: '18f17d3b-551a-4ba0-b859-3119173d074d', mode,
  title: '日报', prompt: '请调用工具生成本次报告', timing: { kind: 'after', minutes: 1 }, botId: 'bot1',
  workspaceId: mode === 'direct' ? 'workspace1' : '', sessionId: mode === 'sync' ? 'session1' : '', targetId: mode === 'direct' ? 'target1' : '' });
test('wizard creates a native Session in selected workspace and one task despite repeated request', async () => {
  const f = fixture(), input = creation('direct');
  const row = await f.engine.serial(() => f.engine.create(input));
  assert.equal(row.configSaved, true);
  assert.deepEqual(f.counts(), { createdTasks: 1, createdSessions: 1 });
  assert.equal(f.headers.get(row.sessionId).cwd, '/fixture');
  const task = (await f.engine.catalog()).find(task => task.id === row.taskId);
  assert.equal(task.prompt, input.prompt); assert.equal(task.after_seconds, 60);
  assert.equal(f.maps.configs.get(row.taskId).mode, 'direct');
  assert.equal((await f.engine.create(input)).taskId, row.taskId);
  await assert.rejects(f.engine.create({ ...input, title: '另一个任务' }), { code: 'creation-request-conflict' });
  assert.deepEqual(f.counts(), { createdTasks: 1, createdSessions: 1 });
});
test('sync mode reuses bound conversation, accepts shared tasks, and never calls plugin send', async () => {
  const f = fixture(); f.setBound(true);
  const row = { taskId: 'task1' };
  await f.engine.save({ taskId: 'task1', mode: 'sync', enabled: true, botId: 'bot1', targetId: '', expectedRevision: 0 });
  assert.deepEqual(f.counts(), { createdTasks: 0, createdSessions: 0 });
  f.histories.set(row.taskId, [f.receipt()]); f.logs.set('session1', f.answer());
  await f.engine.requestReconcile(); await f.engine.requestReconcile();
  assert.equal(f.sent.length, 0);
  assert.equal([...f.maps.deliveries.values()][0].state, 'delegated');
  await assert.rejects(f.engine.save({ taskId: row.taskId, mode: 'sync', enabled: false, botId: 'bot1', targetId: '', expectedRevision: 1 }), { code: 'native-sync-global' });
});
test('new tasks cannot use chat execution, even through the creation API', async () => {
  const f = fixture(); f.setBound(true);
  await assert.rejects(f.engine.create(creation('sync')), { code: 'invalid-creation' });
  assert.deepEqual(f.counts(), { createdTasks: 0, createdSessions: 0 });
});
test('ambiguous creation survives restart without creating another native task', async () => {
  const f = fixture(); let calls = 0;
  f.engine.schedule.create = async () => { calls++; throw new Error('lost native response'); };
  await assert.rejects(f.engine.create(creation('direct')), { code: 'creation-result-unknown' });
  const restarted = f.make(); await restarted.start();
  await assert.rejects(restarted.create(creation('direct')), { code: 'creation-result-unknown' });
  assert.equal(calls, 1); assert.equal(f.counts().createdSessions, 1);
});
test('known native task survives a configuration-write failure and is not recreated', async () => {
  const f = fixture(); f.engine.configs.put = async () => { throw new Error('disk full'); };
  const row = await f.engine.create(creation('direct'));
  assert.equal(row.state, 'created'); assert.equal(row.configSaved, false); assert.ok(row.taskId);
  await f.engine.create(creation('direct'));
  assert.equal(f.counts().createdTasks, 1);
});
test('invalid timing is rejected before creating a Session or task', async () => {
  const f = fixture();
  await assert.rejects(f.engine.create({ ...creation('direct'), timing: { kind: 'daily', time: '09:00', timeZone: 'unknown/zone' } }), { code: 'invalid-time-zone' });
  assert.deepEqual(f.counts(), { createdTasks: 0, createdSessions: 0 });
});

test('progress remains readable while an IM send is still in flight', async () => {
  const f = fixture(); await f.config(); f.ready();
  const started = Promise.withResolvers();
  f.setSend(() => { started.resolve(); return new Promise(() => {}); });
  const pending = f.engine.requestReconcile(); await started.promise;
  try {
    const view = await rpcHandler(f.engine)('view', {});
    assert.equal(view.ok, true); assert.equal(view.value.deliveries[0].state, 'sending');
  } finally { await f.engine.close(); await pending; }
});

async function fileFixture(t, names = ['报告.xlsx']) {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = await mkdtemp(join(tmpdir(), 'dia-engine-files-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = names.map(name => join(root, name));
  for (const path of paths) await writeFile(path, `测试文件 ${path}`);
  const f = fixture(); await f.config(); f.ready();
  f.im.fileChannels = ['feishu']; f.fileSends = [];
  f.im.sendFile = async (...args) => { f.fileSends.push(args); return { sent: true }; };
  const events = f.answer();
  events.splice(-2, 0, { type: 'deliverables/presented', data: { turn: 1, files: paths.map(path => ({ path })) } });
  f.logs.set('session1', events);
  return { ...f, paths };
}
test('conclusion and declared files go to the same target once, including after restart', async t => {
  const f = await fileFixture(t);
  await f.engine.requestReconcile(); await f.engine.requestReconcile();
  const restarted = f.make(); await restarted.start();
  assert.equal(f.sent.length, 1); assert.equal(f.fileSends.length, 1);
  assert.deepEqual(f.fileSends[0].slice(0, 2), ['bot1', 'target1']);
  assert.ok(Buffer.isBuffer(f.fileSends[0][2].bytes));
  const row = [...f.maps.deliveries.values()][0];
  assert.equal(row.state, 'sent'); assert.equal(row.textState, 'sent'); assert.equal(row.files[0].state, 'sent');
  assert.equal(JSON.stringify(row).includes(f.paths[0]), false);
});
test('missing file sender still delivers the conclusion and reports the file failure', async t => {
  const f = await fileFixture(t); delete f.im.sendFile;
  await f.engine.requestReconcile();
  const row = [...f.maps.deliveries.values()][0];
  assert.equal(f.sent.length, 1); assert.equal(row.textState, 'sent'); assert.equal(row.state, 'failed');
  assert.equal(row.files[0].reason, 'file-send-unsupported');
});
test('uncertain file delivery stops the batch and never resends confirmed text or files', async t => {
  const f = await fileFixture(t, ['one.pdf', 'two.xlsx', 'three.docx']);
  let count = 0;
  f.im.sendFile = async () => { if (++count === 2) throw new Error('network disconnected'); return { sent: true }; };
  await f.engine.requestReconcile(); await f.make().start();
  const row = [...f.maps.deliveries.values()][0];
  assert.equal(count, 2); assert.equal(f.sent.length, 1); assert.equal(row.state, 'unknown');
  assert.deepEqual(row.files.map(file => file.state), ['sent', 'unknown', 'skipped']);
});
test('file acknowledgement persistence failure recovers as unknown without replaying either component', async t => {
  const f = await fileFixture(t);
  f.im.sendFile = async (...args) => {
    f.fileSends.push(args);
    const put = f.engine.deliveries.put;
    f.engine.deliveries.put = async (key, row) => {
      if (row.files?.some(file => file.state === 'sent')) throw new Error('disk full');
      return put(key, row);
    };
    return { sent: true };
  };
  await f.engine.requestReconcile();
  await f.make().start();
  assert.equal(f.sent.length, 1); assert.equal(f.fileSends.length, 1);
  const row = [...f.maps.deliveries.values()][0];
  assert.equal(row.state, 'unknown'); assert.equal(row.textState, 'sent'); assert.equal(row.files[0].state, 'unknown');
});
test('failed AI turns cannot send declared files', async t => {
  const f = await fileFixture(t);
  f.logs.get('session1').at(-1).data.reason.kind = 'error';
  await f.engine.requestReconcile();
  assert.equal(f.sent.length, 0); assert.equal(f.fileSends.length, 0);
});
test('a target removed after the conclusion prevents file delivery', async t => {
  const f = await fileFixture(t);
  f.setSend(async (...args) => { f.sent.push(args); f.im.listTargets = async () => []; return { sent: true }; });
  await f.engine.requestReconcile();
  assert.equal(f.sent.length, 1); assert.equal(f.fileSends.length, 0);
  const row = [...f.maps.deliveries.values()][0];
  assert.equal(row.state, 'failed'); assert.equal(row.files[0].reason, 'unknown-target');
});

test('a completed file-only answer gets a short conclusion and the declared attachment', async t => {
  const f = await fileFixture(t);
  f.logs.get('session1').find(event => event.type === 'assistant/message').data.message.content = [];
  await f.engine.requestReconcile();
  assert.equal(f.sent[0][2], '任务已完成。');
  assert.equal(f.fileSends.length, 1);
});
test('a rejected file does not suppress other valid files and remains distinct from text success', async t => {
  const f = await fileFixture(t, ['one.pdf', 'two.xlsx']);
  let count = 0;
  f.im.sendFile = async () => {
    if (++count === 1) throw Object.assign(new Error(), { code: 'artifact-permission-required' });
    return { sent: true };
  };
  await f.engine.requestReconcile();
  const row = [...f.maps.deliveries.values()][0];
  assert.equal(count, 2); assert.equal(row.state, 'failed'); assert.equal(row.textState, 'sent');
  assert.deepEqual(row.files.map(file => file.state), ['failed', 'sent']);
});
