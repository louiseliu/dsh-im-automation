import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nativeHarness, until, createUserMessage } from './harness.mjs';

test('official native schedule → real AgentLoop → persistent plugin delivery; restart never resends', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dia-native-'));
  let harness;
  try {
    harness = await nativeHarness(root);
    const first = await harness.createAgent('automation-first');
    const second = await harness.createAgent('automation-second');
    const task1 = await harness.createTask(first, '日报');
    const task2 = await harness.createTask(second, '告警');
    await harness.configure(task1);
    await harness.configure(task2, '告警群');
    await until(() => harness.sent.length === 2);
    assert.deepEqual(harness.sent.map(args => args[1]).sort(), ['告警群', '日报群']);
    for (const args of harness.sent) { assert.equal(args[2], '原生任务动态报告'); assert.equal(args[3].format, 'markdown'); }
    assert.equal((await harness.ctx.schedule.catalog()).length, 2);
    first.followup(createUserMessage({ content: [{ type: 'text', text: '普通提问' }], source: { kind: 'user' } }));
    await first.whenIdle(); await harness.engine.requestReconcile();
    assert.equal(harness.sent.length, 2);
    await harness.close();
    harness = await nativeHarness(root);
    await harness.engine.requestReconcile();
    assert.equal(harness.sent.length, 0);
    assert.equal(harness.engine.snapshot().deliveries.filter(value => value.state === 'sent').length, 2);
  } finally { await harness?.close(); await rm(root, { recursive: true, force: true }); }
});

test('completed native result recovers from real cold JSONL storage after plugin was disabled', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dia-cold-'));
  const started = Promise.withResolvers();
  const release = Promise.withResolvers();
  let harness;
  try {
    harness = await nativeHarness(root, { stream: async function* () {
      started.resolve(); await release.promise;
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'block-end', index: 0, block: { type: 'text', text: '重启后恢复的结果' } };
      yield { type: 'finish', reason: { kind: 'stop' } };
    } });
    const agent = await harness.createAgent('cold-result-session');
    const task = await harness.createTask(agent, '冷恢复');
    await harness.configure(task);
    await started.promise;
    await until(() => harness.engine.snapshot().deliveries[0]?.state === 'pending');
    await harness.stopEngine();
    release.resolve(); await agent.whenIdle(); await harness.ctx.sessions.flush(agent.session);
    assert.equal(harness.sent.length, 0);
    await harness.close();
    harness = await nativeHarness(root);
    assert.equal(harness.ctx.sessions.get(agent.id), undefined, 'recovery must not activate the native Session');
    assert.equal(harness.sent.length, 1);
    assert.equal(harness.sent[0][2], '重启后恢复的结果');
  } finally { release.resolve(); await harness?.close(); await rm(root, { recursive: true, force: true }); }
});

test('cancelled native AI execution produces a skipped record rather than a partial IM message', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dia-cancel-'));
  const started = Promise.withResolvers();
  let harness;
  try {
    harness = await nativeHarness(root, { stream: async function* (request) {
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'text-delta', index: 0, text: '尚未完成' };
      started.resolve();
      await new Promise((_, reject) => request.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
    } });
    const agent = await harness.createAgent('cancel-session');
    const task = await harness.createTask(agent, '取消验证'); await harness.configure(task);
    await started.promise;
    agent.cancel({ kind: 'user' }); await agent.whenIdle();
    await until(() => harness.engine.snapshot().deliveries[0]?.state === 'skipped');
    assert.equal(harness.engine.snapshot().deliveries[0].reason, 'turn-aborted');
    assert.equal(harness.sent.length, 0);
  } finally { await harness?.close(); await rm(root, { recursive: true, force: true }); }
});

test('native multi-step tool processing sends only the final AI answer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dia-tools-'));
  let step = 0;
  let calls = 0;
  let harness;
  try {
    harness = await nativeHarness(root, { stream: async function* () {
      step++;
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'block-end', index: 0, block: { type: 'text', text: step < 3 ? `工具处理第${step}步` : '处理完成后的最终报告' } };
      if (step < 3) {
        yield { type: 'block-start', index: 1, blockType: 'tool-call' };
        yield { type: 'block-end', index: 1, block: { type: 'tool-call', id: `call-${step}`, name: 'lookup', arguments: '{}' } };
        yield { type: 'finish', reason: { kind: 'tool-calls' } };
      } else yield { type: 'finish', reason: { kind: 'stop' } };
    } });
    harness.ctx.tools.register({ name: 'lookup', description: 'Read fixture data',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
      execute: async () => { calls++; return process.env.DSH_TEST_RUNTIME ? [{ type: 'text', text: '数据' }] : '数据'; } });
    const agent = await harness.createAgent('tools-session');
    const task = await harness.createTask(agent, '工具处理'); await harness.configure(task);
    await until(() => harness.engine.snapshot().deliveries[0]?.state === 'sent');
    assert.equal(step, 3); assert.equal(calls, 2);
    assert.equal(harness.sent.length, 1);
    assert.equal(harness.sent[0][2], '处理完成后的最终报告');
  } finally { await harness?.close(); await rm(root, { recursive: true, force: true }); }
});
