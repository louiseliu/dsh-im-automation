import { createRequire } from 'node:module';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { patchDshIm } from '../../compat/dsh-im-files.mjs';

const source = process.env.DSH_IM_FILES_SOURCE;
let root, createDeliveryService, createDeliveryAdapter, FeishuRuntime;
before(async () => {
  if (!source) return;
  root = await mkdtemp(join(tmpdir(), 'dia-files-im-test-'));
  await cp(source, root, { recursive: true, filter: path => !relative(source, path).split('/').some(part => ['node_modules', '.git'].includes(part)) });
  await patchDshIm(root);
  await mkdir(join(root, 'node_modules'));
  const require = createRequire(join(source, 'package.json'));
  await symlink(dirname(require.resolve('qrcode/package.json')), join(root, 'node_modules/qrcode'));
  const load = file => import(pathToFileURL(join(root, file)).href);
  ({ createDeliveryService } = await load('plugin-src/host/delivery-service.mjs'));
  ({ createDeliveryAdapter } = await load('plugin-src/host/delivery-adapter.mjs'));
  ({ FeishuRuntime } = await load('src/channels/feishu/feishu-runtime.mjs'));
});
after(async () => { if (root) await rm(root, { recursive: true, force: true }); });

const targets = [
  { targetId: 'dm', kind: 'user', route: { openId: 'ou_fixture_user' } },
  { targetId: 'group', kind: 'group', route: { chatId: 'oc_fixture_group' } },
];
async function fixture(t) {
  const messages = [], uploads = [];
  let response = () => ({ code: 0, data: { message_id: 'file-message' } });
  let uploadResponse = () => ({ code: 0, data: { file_key: 'file_fixture' } });
  class Client {
    constructor() {
      this.im = { v1: {
        file: { create: async payload => { uploads.push(payload); return uploadResponse(); } },
        message: { create: async payload => { messages.push(payload); return response(); } },
      } };
    }
  }
  class EventDispatcher { register() { return this; } }
  class WSClient {
    constructor(options) { this.options = options; this.state = 'idle'; }
    async start() { this.state = 'connected'; queueMicrotask(() => this.options.onReady()); }
    getConnectionStatus() { return { state: this.state }; }
    close() { this.state = 'closed'; }
  }
  const runtime = new FeishuRuntime({
    lark: { Client, EventDispatcher, WSClient, Domain: { Feishu: 'feishu', Lark: 'lark' }, LoggerLevel: { info: 'info' } },
    appId: 'app-fixture', appSecret: 'fixture-secret', ownerOpenIds: ['ou_fixture_user'],
    harness: { async ensureRunning() {} }, state: { hasSeen: () => false }, slashCommands: false, logger: { info() {}, warn() {}, error() {} },
  });
  t.after(() => runtime.stop());
  await runtime.start();
  const service = createDeliveryService();
  service.registerAdapter(createDeliveryAdapter({ channel: 'feishu',
    workspaces: { has: id => id === 'fixture-bot', listBotIds: () => ['fixture-bot'], listDeliveryTargets: () => targets },
    stateFor: async () => ({ snapshot: () => ({ sessions: {} }) }),
    coreController: { status: async () => ({ bots: [{ botId: 'fixture-bot', ready: true }] }),
      sendProactiveText: (_bot, target, text, options) => runtime.sendProactiveText(target, text, options) },
  }));
  return { service, messages, uploads, runtime, respond: value => { response = value; }, uploadRespond: value => { uploadResponse = value; } };
}
const file = { artifactId: 'hash1', deliveryKey: 'occurrence-hash1', fileName: '分析报告.xlsx', bytes: Buffer.from('fixture-result') };
const skip = source ? false : 'set DSH_IM_FILES_SOURCE to dsh-im 5.9.1 source';
test('patched real IM service uploads and delivers files to Feishu people and groups', { skip }, async t => {
  const f = await fixture(t);
  for (const target of targets) {
    assert.deepEqual(await f.service.send('fixture-bot', target.targetId, '分析结论', { format: 'markdown' }), { sent: true });
    assert.deepEqual(await f.service.sendFile('fixture-bot', target.targetId, file), { sent: true });
    const message = f.messages.at(-1);
    assert.equal(message.params.receive_id_type, target.kind === 'user' ? 'open_id' : 'chat_id');
    assert.equal(message.data.receive_id, target.route.openId ?? target.route.chatId);
    assert.equal(message.data.msg_type, 'file');
    assert.deepEqual(JSON.parse(message.data.content), { file_key: 'file_fixture' });
    assert.ok(message.data.uuid);
  }
  assert.equal(f.messages.length, 4); assert.equal(f.uploads.length, 2);
  assert.equal(f.uploads[0].data.file_name, file.fileName);
  assert.deepEqual(f.uploads[0].data.file, file.bytes);
});
test('file permission rejection is distinct from uncertain acceptance and neither retries', { skip }, async t => {
  const f = await fixture(t);
  f.uploadRespond(() => ({ code: 99991672, msg: 'permission required' }));
  await assert.rejects(f.service.sendFile('fixture-bot', 'dm', file), { code: 'artifact-permission-required' });
  assert.equal(f.messages.length, 0);
  f.uploadRespond(() => ({ code: 0, data: { file_key: 'file_fixture' } }));
  f.respond(() => ({ code: 230049, msg: 'uncertain' }));
  await assert.rejects(f.service.sendFile('fixture-bot', 'dm', file), { code: 'artifact-delivery-uncertain' });
  assert.equal(f.messages.length, 1);
});
test('unknown targets, unsupported channels, invalid files and cancelled requests do not upload', { skip }, async t => {
  const f = await fixture(t);
  await assert.rejects(f.service.sendFile('fixture-bot', 'missing', file), { code: 'unknown-target' });
  await assert.rejects(f.service.sendFile('fixture-bot', 'dm', { ...file, fileName: '../input.csv' }), { code: 'bad-request' });
  await assert.rejects(f.service.sendFile('fixture-bot', 'dm', file, { signal: AbortSignal.abort() }), { code: 'cancelled' });
  f.service.registerAdapter(createDeliveryAdapter({ channel: 'telegram',
    workspaces: { has: id => id === 'other-bot', listBotIds: () => ['other-bot'], listDeliveryTargets: () => targets },
    stateFor: async () => ({ snapshot: () => ({ sessions: {} }) }),
    coreController: { sendProactiveText: () => assert.fail('Unsupported channels must not send empty text') },
  }));
  await assert.rejects(f.service.sendFile('other-bot', 'dm', file), { code: 'file-send-unsupported' });
  assert.equal(f.uploads.length, 0);
});

test('native scheduled turn persists its declared result and delivers conclusion plus file through the patched IM service', { skip }, async t => {
  const { writeFile } = await import('node:fs/promises');
  const { nativeHarness, until } = await import('./harness.mjs');
  const f = await fixture(t);
  const directory = await mkdtemp(join(tmpdir(), 'dia-native-files-'));
  let harness, agent;
  try {
    const path = join(directory, '本次分析.xlsx');
    const facade = { fileChannels: ['feishu'], listBots: () => f.service.listBots(),
      listTargets: async bot => (await f.service.listTargets(bot)).targets,
      describeConversation: async () => null,
      send: (...args) => f.service.send(...args), sendFile: (...args) => f.service.sendFile(...args) };
    harness = await nativeHarness(directory, { im: facade, stream: async function* () {
      await writeFile(path, 'generated spreadsheet fixture');
      const turn = agent.session.snapshotEvents().findLast(event => event.type === 'turn/start').data.turn;
      agent.session.append('deliverables/presented', { turn, callId: 'file-fixture', files: [{ path }] });
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'text-delta', index: 0, text: '本次分析结论' };
      yield { type: 'block-end', index: 0, block: { type: 'text', text: '本次分析结论' } };
      yield { type: 'finish', reason: { kind: 'stop' } };
    } });
    agent = await harness.createAgent('native-files');
    const task = await harness.createTask(agent, '生成分析文件');
    await harness.engine.save({ taskId: task.id, enabled: true, botId: 'fixture-bot', targetId: 'group', expectedRevision: 0 });
    await until(() => harness.engine.snapshot().deliveries[0]?.state === 'sent');
    assert.deepEqual(f.messages.map(message => message.data.msg_type), ['interactive', 'file']);
    assert.equal(JSON.parse(f.messages[0].data.content).body.elements[0].content, '本次分析结论');
    assert.equal(f.uploads[0].data.file_name, '本次分析.xlsx');
    await harness.stopEngine(); await harness.startEngine();
    assert.equal(f.messages.length, 2);
    const row = harness.engine.snapshot().deliveries[0];
    assert.equal(row.textState, 'sent'); assert.equal(row.files[0].state, 'sent');
  } finally { await harness?.close(); await rm(directory, { recursive: true, force: true }); }
});
