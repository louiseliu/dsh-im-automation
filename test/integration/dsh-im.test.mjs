import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { nativeHarness, until } from './harness.mjs';

const reference = process.env.DSH_IM_REFERENCE;
test('official native task integrates with unmodified dsh-im discovery and Markdown delivery service',
  { skip: reference ? false : 'set DSH_IM_REFERENCE to an unmodified dsh-im checkout' }, async () => {
    const { createDeliveryService } = await import(pathToFileURL(join(reference, 'plugin-src/host/delivery-service.mjs')).href);
    const version = JSON.parse(await readFile(join(reference, 'package.json'))).version;
    assert.equal(version, '5.9.1');
    const im = createDeliveryService();
    const sends = [];
    const targets = [{ targetId: 'daily-report', name: '日报群', kind: 'group', route: { chatId: 'oc_test' } }];
    im.registerAdapter({ channel: 'feishu', ownsBot: bot => bot === 'bot1', listBots: () => ['bot1'],
      listTargets: () => targets, listSuggestions: () => [], createTarget() {}, updateTarget() {}, deleteTarget() {},
      sendText: async (...args) => { sends.push(args); }, describeConversationBySession: () => null });
    const root = await mkdtemp(join(tmpdir(), 'dia-dsh-im-'));
    let harness;
    try {
      // Match the public ctx.dshIm facade, not DeliveryService's internal response envelope.
      const facade = { listBots: () => im.listBots(),
        listTargets: async botId => (await im.listTargets(botId)).targets,
        describeConversation: sessionId => im.describeConversation(sessionId),
        send: (...args) => im.send(...args) };
      harness = await nativeHarness(root, { im: facade });
      const agent = await harness.createAgent('real-service-task');
      const task = await harness.createTask(agent, '服务集成验证');
      await harness.configure(task, 'daily-report');
      await until(() => harness.engine.snapshot().deliveries[0]?.state === 'sent');
      assert.equal(sends.length, 1);
      assert.equal(sends[0][0], 'bot1');
      assert.equal(sends[0][1].targetId, 'daily-report');
      assert.equal(sends[0][2], '原生任务动态报告');
      assert.equal(sends[0][3].format, 'markdown');
      assert.equal(harness.engine.snapshot().deliveries[0].state, 'sent');
    } finally { await harness?.close(); await rm(root, { recursive: true, force: true }); }
  });

test('native scheduled AI answer is mirrored once by real dsh-im coordinator; global off retains dialogue only',
  { skip: reference ? false : 'set DSH_IM_REFERENCE to an unmodified dsh-im checkout' }, async () => {
    const { installSessionSyncCoordinator } = await import(pathToFileURL(join(reference, 'plugin-src/host/session-sync-coordinator.mjs')).href);
    const root = await mkdtemp(join(tmpdir(), 'dia-sync-coordinator-'));
    let harness, coordinator;
    const mirrors = []; let enabled = false;
    const im = { listBots: async () => [{ botId: 'bot1', channel: 'feishu' }], listTargets: async () => [],
      describeConversation: async id => id === 'im-bound' ? { botId: 'bot1' } : null,
      send: async () => assert.fail('plugin must not duplicate session synchronization') };
    try {
      harness = await nativeHarness(root, { im });
      coordinator = installSessionSyncCoordinator(harness.ctx, {
        deliverSessionText: async (sessionId, text) => { mirrors.push({ sessionId, text }); return { sent: true }; },
      }, { loadSettings: async () => ({ deliverModelAnswers: enabled, mirrorUserInput: false, inputIcon: '', modelIcon: '' }) });
      const agent = await harness.createAgent('im-bound');
      for (const globalEnabled of [false, true]) {
        enabled = globalEnabled;
        const task = await harness.createTask(agent, 'IM同步任务');
        await harness.engine.serial(() => harness.engine.save({ taskId: task.id, mode: 'sync', enabled: true, botId: 'bot1', targetId: '', expectedRevision: 0 }));
        await until(() => harness.engine.snapshot().deliveries.some(row => row.taskId === task.id));
        await agent.whenIdle(); await coordinator.whenIdle();
        assert.equal(mirrors.length, globalEnabled ? 1 : 0);
      }
      assert.equal(mirrors[0].sessionId, 'im-bound');
      assert.equal(mirrors[0].text, '原生任务动态报告');
      assert.equal((await harness.engine.readEvents('im-bound')).filter(event => event.type === 'turn/end').length, 2);
    } finally { coordinator?.close(); await harness?.close(); await rm(root, { recursive: true, force: true }); }
  });

test('native task sidebar title is recognized by unchanged dsh-im platform-logo parser',
  { skip: reference ? false : 'set DSH_IM_REFERENCE to an unmodified dsh-im checkout' }, async () => {
    const { parseSessionChannelTitle } = await import(pathToFileURL(join(reference, 'src/channels/shared/session-channel-labels.mjs')).href);
    const root = await mkdtemp(join(tmpdir(), 'dia-task-label-')); let harness;
    try {
      harness = await nativeHarness(root);
      const ordinary = await harness.createAgent('ordinary-chat');
      const agent = await harness.createAgent('labeled-task');
      const task = await harness.createTask(agent, '每日销售简报', 3600);
      await harness.configure(task);
      const events = agent.session.snapshotEvents();
      assert.deepEqual(parseSessionChannelTitle(events.findLast(event => event.type === 'session/title').data.title), { channel: 'feishu', title: '⏰ 每日销售简报' });
      const before = events.filter(event => event.type === 'session/title').length;
      await harness.engine.labelTaskSessions(); await harness.engine.labelTaskSessions();
      assert.equal(agent.session.snapshotEvents().filter(event => event.type === 'session/title').length, before);
      assert.equal(ordinary.session.snapshotEvents().some(event => event.type === 'session/title'), false);
    } finally { await harness?.close(); await rm(root, { recursive: true, force: true }); }
  });
