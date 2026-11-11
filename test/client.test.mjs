import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { build } from 'esbuild';

await mkdir('.test-data', { recursive: true });
const temp = await mkdtemp(join(process.cwd(), '.test-data', 'ui-'));
await build({ entryPoints: ['src/client/Settings.jsx'], bundle: true, format: 'esm', platform: 'node',
  external: ['react'], outfile: join(temp, 'settings.mjs') });
const { TaskEditor, Settings } = await import(pathToFileURL(join(temp, 'settings.mjs')).href);
await build({ entryPoints: ['src/client/Wizard.jsx'], bundle: true, format: 'esm', platform: 'node', external: ['react'], outfile: join(temp, 'wizard.mjs') });
const { Wizard } = await import(pathToFileURL(join(temp, 'wizard.mjs')).href);
after(() => rm(temp, { recursive: true, force: true }));
const label = node => node.children.filter(value => typeof value === 'string').join('');
const button = (root, text) => root.findAllByType('button').find(node => label(node) === text);
const task = { id: 'task1', title: '日报', bots: [{ botId: 'bot1', channel: 'feishu' }], ineligible: null };

test('settings selects saved targets and saves only routing, never a fixed message', async () => {
  const calls = [];
  const api = async (method, payload) => {
    calls.push([method, payload]);
    if (method === 'targets') return [{ targetId: 'daily', name: '日报群' }];
    if (method === 'save') return { ...payload, revision: 1 };
    return { sent: true };
  };
  let tree;
  try {
    await act(async () => { tree = Renderer.create(React.createElement(TaskEditor, { api, task,
      deliveries: [], onSaved: async () => {} })); });
    await act(async () => tree.root.findAllByType('select')[0].props.onChange({ target: { value: 'bot1' } }));
    await act(async () => tree.root.findAllByType('select')[1].props.onChange({ target: { value: 'daily' } }));
    await act(async () => tree.root.findByType('input').props.onChange({ target: { checked: true } }));
    assert.equal(button(tree.root, '保存更改').props.disabled, false);
    await act(async () => button(tree.root, '保存更改').props.onClick());
    assert.deepEqual(calls.find(([method]) => method === 'save')[1], {
      taskId: 'task1', mode: 'direct', enabled: true, botId: 'bot1', targetId: 'daily', expectedRevision: 0,
    });
    assert.equal(tree.root.findAllByType('textarea').length, 0);
  } finally { await act(async () => tree?.unmount()); }
});
test('shared-session configuration cannot be enabled, but an existing enabled config can be disabled', async () => {
  let tree;
  try {
    await act(async () => { tree = Renderer.create(React.createElement(TaskEditor, {
      api: async () => [{ targetId: 'daily', name: '日报群' }], task: { ...task, ineligible: 'shared-session' },
      config: { enabled: true, botId: 'bot1', targetId: 'daily', revision: 1 },
      deliveries: [], onSaved: async () => {},
    })); });
    assert.equal(button(tree.root, '保存更改').props.disabled, true);
    await act(async () => tree.root.findByType('input').props.onChange({ target: { checked: false } }));
    assert.equal(button(tree.root, '保存更改').props.disabled, false);
    assert.equal(tree.root.findByType('input').props.disabled, true);
  } finally { await act(async () => tree?.unmount()); }
});
test('built browser module registers the official settings slot and removes its style on unload', async () => {
  let module;
  let entry;
  const removed = [];
  const context = { window: { __ModuleLoader__: { load: definition => {
    assert.equal(definition.id, 'dsh-im-automation'); module = definition.factory(name => {
      assert.equal(name, 'react'); return React;
    });
  } } }, document: { createElement: () => ({ remove: () => removed.push(true) }), head: { append() {} } } };
  vm.runInNewContext(await readFile('lib/client.js', 'utf8'), context);
  const disposers = [];
  module.apply({ effect: body => disposers.push(body()), connection: {}, slots: {
    inject: (_name, body) => body(), register: (value, component) => { entry = { value, component }; },
  } });
  assert.equal(entry.value.name, 'settings.section');
  assert.equal(entry.value.label(), '定时任务与消息');
  disposers.forEach(dispose => dispose()); assert.equal(removed.length, 1);
});

test('wizard submits native task instructions with selected workspace and prevents a second click', async () => {
  let tree; const calls = [];
  const api = async (method, payload) => {
    calls.push([method, payload]);
    if (method === 'creation-options') return { available: true, workspaces: [{ id: 'w1', path: '/bot' }], sessions: [] };
    if (method === 'recipient-options') return { bot: { botId: 'b1', name: '销售助手' }, targets: [{ targetId: 't1', name: '日报群' }], workspaceId: 'w1', workspaceMatched: true };
    if (method === 'create') return { taskId: 'created1', configSaved: true };
  };
  const change = async (name, value) => act(async () => tree.root.findByProps({ 'aria-label': name }).props.onChange({ target: { value } }));
  let created;
  try {
    await act(async () => { tree = Renderer.create(React.createElement(Wizard, { api, bots: [{ botId: 'b1' }], onCreated: row => { created = row; }, onCancel() {} })); });
    assert.equal(tree.root.findAllByProps({ 'aria-label': '发送机器人' }).length, 0);
    await change('要做的事', '读取文件并生成本次动态报告');
    assert.equal(calls.some(([method]) => method === 'create'), false);
    assert.equal(tree.root.findAllByProps({ 'aria-label': '发送机器人' }).length, 0);
    assert.equal(tree.root.findByProps({ 'aria-label': '资料所在工作区' }).props.value, 'w1');
    assert.equal(tree.root.findByProps({ 'aria-label': '发给谁' }).props.value, 't1');
    assert.equal(calls.some(([method]) => method === 'create'), false);
    assert.ok(JSON.stringify(tree.toJSON()).includes('每天 09:00'));
    await act(async () => button(tree.root, '创建任务').props.onClick());
    await act(async () => button(tree.root, '创建任务').props.onClick());
    assert.equal(calls.filter(([method]) => method === 'create').length, 1);
    assert.equal(button(tree.root, '下一步'), undefined);
    assert.equal(created.taskId, 'created1');
    const payload = calls.find(([method]) => method === 'create')[1];
    assert.equal(payload.mode, 'direct'); assert.equal(payload.workspaceId, 'w1'); assert.equal(payload.sessionId, ''); assert.equal(payload.prompt, '读取文件并生成本次动态报告');
    assert.equal(button(tree.root, '创建任务').props.disabled, true);
  } finally { await act(async () => tree?.unmount()); }
});
test('legacy chat task remains read-only and homepage never queries global chat settings', async () => {
  let tree; const calls = [];
  const api = async method => { calls.push(method); return { tasks: [], bots: [], configs: [], deliveries: [] }; };
  try {
    await act(async () => { tree = Renderer.create(React.createElement(Settings, { api })); });
    assert.deepEqual(calls, ['view']);
    assert.equal(tree.root.findAllByType('input').length, 0);
    await act(async () => tree.unmount());
    await act(async () => { tree = Renderer.create(React.createElement(TaskEditor, { api, task: { ...task, binding: { botId: 'b1' } }, config: { mode: 'sync', enabled: true, botId: 'b1', targetId: '', revision: 1 }, deliveries: [], onSaved() {} })); });
    assert.equal(button(tree.root, '保存更改'), undefined);
    assert.ok(JSON.stringify(tree.toJSON()).includes('旧版创建的聊天任务'));
  } finally { await act(async () => tree?.unmount()); }
});
test('single-page creation validates missing work and destination without losing input', async () => {
  let tree; const calls = [];
  const api = async method => { calls.push(method); return method === 'creation-options' ? { available: true, workspaces: [{ id: 'w1', path: '/bot' }] } : { targets: [], bot: { botId: 'b1' }, workspaceId: 'w1' }; };
  try {
    await act(async () => { tree = Renderer.create(React.createElement(Wizard, { api, bots: [{ botId: 'b1' }], onCreated() {}, onCancel() {} })); });
    await act(async () => button(tree.root, '创建任务').props.onClick());
    assert.ok(tree.root.findByProps({ role: 'alert' }));
    await act(async () => tree.root.findByProps({ 'aria-label': '要做的事' }).props.onChange({ target: { value: '总结销售' } }));
    assert.equal(tree.root.findAllByProps({ 'aria-label': '任务记录放在哪里' }).length, 0);
    assert.ok(JSON.stringify(tree.toJSON()).includes('任务单独保存执行记录'));
    await act(async () => button(tree.root, '创建任务').props.onClick());
    assert.ok(tree.root.findByProps({ role: 'alert' }));
    assert.equal(calls.includes('create'), false); assert.equal(calls.includes('bound-sessions'), false);
    assert.equal(tree.root.findByProps({ 'aria-label': '要做的事' }).props.value, '总结销售');
  } finally { await act(async () => tree?.unmount()); }
});
test('homepage shows task cards and keeps chat-wide settings secondary', async () => {
  let tree;
  const api = async method => method === 'view' ? { tasks: [{ id: 't1', title: '每日销售简报', status: 'active' }], bots: [], configs: [], deliveries: [] } : null;
  try {
    await act(async () => { tree = Renderer.create(React.createElement(Settings, { api })); });
    assert.equal(tree.root.findAllByType('select').length, 0);
    assert.equal(tree.root.findAllByType('details').length, 0);
    assert.ok(tree.root.findByProps({ className: 'dia-task-card' }));
    assert.ok(button(tree.root, '创建定时任务'));
  } finally { await act(async () => tree?.unmount()); }
});

test('unresolved recipient requires one clear note and confirmation shows names and matched workspace', async () => {
  let tree, created;
  const api = async (method, payload) => {
    if (method === 'creation-options') return { available: true, workspaces: [{ id: 'w1', title: '店铺资料', path: '/store' }] };
    if (method === 'recipient-options') return { bot: { botId: 'b1', channel: 'feishu', name: '经营助手' }, targets: [{ targetId: 't1', name: '未命名的接收位置', needsName: true }], workspaceId: 'w1', workspaceMatched: true };
    if (method === 'create') { created = payload; return { taskId: 'created1' }; }
  };
  try {
    await act(async () => { tree = Renderer.create(React.createElement(Wizard, { api, bots: [{ botId: 'b1', name: '经营助手' }], onCreated() {}, onCancel() {} })); });
    await act(async () => tree.root.findByProps({ 'aria-label': '要做的事' }).props.onChange({ target: { value: '整理销售' } }));
    assert.ok(JSON.stringify(tree.toJSON()).includes('已根据该机器人的现有对话自动匹配'));
    await act(async () => button(tree.root, '创建任务').props.onClick());
    assert.ok(tree.root.findByProps({ role: 'alert' })); assert.equal(created, undefined);
    await act(async () => tree.root.findByProps({ 'aria-label': '接收位置备注' }).props.onChange({ target: { value: '我的飞书' } }));
    assert.ok(JSON.stringify(tree.toJSON()).includes('我的飞书'));
    assert.ok(JSON.stringify(tree.toJSON()).includes('经营助手'));
    await act(async () => button(tree.root, '创建任务').props.onClick());
    assert.equal(created.targetName, '我的飞书'); assert.equal(created.workspaceId, 'w1');
  } finally { await act(async () => tree?.unmount()); }
});

test('waiting has an exact next time and no blank-session link; completed task stays visible on homepage', async () => {
  let tree; let finished = false, opened = 0;
  const currentTask = () => ({ id: 't1', sessionId: 's1', title: '每日销售', scheduledAt: '2026-11-03T14:00:00Z', status: finished ? 'inactive' : 'active', hasExecution: finished, botName: '经营助手', recipientName: '我的飞书', workspaceTitle: '店铺资料' });
  const api = async method => method === 'targets' ? [{ targetId: 'target1', name: '我的飞书' }] : {
    tasks: [currentTask()], bots: [{ botId: 'b1', name: '经营助手' }], configs: [{ taskId: 't1', enabled: true, botId: 'b1', targetId: 'target1', revision: 1 }],
    deliveries: finished ? [{ taskId: 't1', messageId: 'm1', state: 'sent', updatedAt: Date.now(), reason: 'platform-accepted' }] : [] };
  try {
    await act(async () => { tree = Renderer.create(React.createElement(Settings, { api, openSession: () => { opened++; } })); });
    await act(async () => tree.root.findByProps({ className: 'dia-task-card' }).props.onClick());
    assert.ok(JSON.stringify(tree.toJSON()).includes('等待首次执行'));
    assert.ok(JSON.stringify(tree.toJSON()).includes('下次执行'));
    assert.equal(button(tree.root, '首次执行后可查看记录').props.disabled, true);
    assert.equal(tree.root.findByProps({ className: 'dia-edit-settings' }).props.open, undefined);
    finished = true;
    await act(async () => button(tree.root, '刷新状态').props.onClick());
    assert.ok(JSON.stringify(tree.toJSON()).includes('已完成，结果已发送'));
    await act(async () => button(tree.root, '返回任务列表').props.onClick());
    assert.ok(tree.root.findByProps({ 'aria-label': '最近完成的任务' }));
    assert.ok(tree.root.findByProps({ className: 'dia-task-row' })); assert.equal(opened, 0);
  } finally { await act(async () => tree?.unmount()); }
});

test('current native tasks are counted and sorted, and native navigation closes settings only on success', async () => {
  let tree, opened = 0, closed = 0, fail = false;
  const api = async () => ({ tasks: [
    { id: 'later', title: '晚间任务', status: 'active', scheduledAt: '2026-11-03T20:00:00Z' },
    { id: 'ended', title: '旧任务', status: 'inactive' },
    { id: 'earlier', title: '早间任务', status: 'active', scheduledAt: '2026-11-03T09:00:00Z' },
  ], bots: [], configs: [], deliveries: [] });
  try {
    await act(async () => { tree = Renderer.create(React.createElement(Settings, { api,
      openAutomation: () => { opened++; if (fail) throw new Error('unavailable'); }, close: () => { closed++; } })); });
    assert.ok(JSON.stringify(tree.toJSON()).includes('当前定时任务（'));
    assert.deepEqual(tree.root.findAllByProps({ className: 'dia-task-card' }).map(node => node.findByType('strong').children[0]), ['早间任务', '晚间任务']);
    assert.ok(JSON.stringify(tree.toJSON()).includes('DSH 原生任务 · 未配置消息发送'));
    await act(async () => button(tree.root, '打开 DSH 自动化任务').props.onClick());
    assert.equal(opened, 1); assert.equal(closed, 1);
    fail = true;
    await act(async () => button(tree.root, '打开 DSH 自动化任务').props.onClick());
    assert.equal(closed, 1);
    assert.ok(JSON.stringify(tree.toJSON()).includes('请从 DSH 左侧进入'));
  } finally { await act(async () => tree?.unmount()); }
});

test('single-page creation rejects an invalid timezone before submitting and keeps the draft editable', async () => {
  let tree, created = 0;
  const api = async method => {
    if (method === 'creation-options') return { available: true, workspaces: [{ id: 'w1', path: '/bot' }] };
    if (method === 'recipient-options') return { targets: [{ targetId: 't1', name: '日报群' }], workspaceId: 'w1' };
    if (method === 'create') { created++; return { taskId: 't1' }; }
  };
  const change = async (name, value) => act(async () => tree.root.findByProps({ 'aria-label': name }).props.onChange({ target: { value } }));
  try {
    await act(async () => { tree = Renderer.create(React.createElement(Wizard, { api, bots: [{ botId: 'b1' }], onCreated() {}, onCancel() {} })); });
    await change('要做的事', '整理日报');
    await change('时区', 'invalid/timezone');
    await act(async () => button(tree.root, '创建任务').props.onClick());
    assert.equal(created, 0);
    assert.ok(JSON.stringify(tree.toJSON()).includes('时区无法识别'));
    await change('时区', 'Asia/Shanghai');
    await act(async () => button(tree.root, '创建任务').props.onClick());
    assert.equal(created, 1);
  } finally { await act(async () => tree?.unmount()); }
});
