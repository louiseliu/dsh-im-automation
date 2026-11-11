import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledTitle, labelSession } from '../src/session-label.mjs';

test('task titles use dsh-im platform prefixes followed by a clock without duplicates', () => {
  assert.equal(scheduledTitle('每日销售简报', 'feishu'), '飞书 · ⏰ 每日销售简报');
  assert.equal(scheduledTitle('飞书 · ⏰ 每日销售简报', 'feishu'), '飞书 · ⏰ 每日销售简报');
  assert.equal(scheduledTitle('Feishu · ⏰ 每日销售简报', 'weixin'), '微信 · ⏰ 每日销售简报');
  assert.equal(scheduledTitle('日报', 'unknown'), null);
});
test('title decoration preserves automatic title citations and respects later renames', () => {
  const events = [{ type: 'session/title', data: { title: '销售简报', source: { kind: 'provider', provider: 'fixture' }, messageSeqs: [8] } }];
  const session = { snapshotEvents: () => events, append: (type, data) => events.push({ type, data }) };
  labelSession(session, '任务名', 'feishu'); labelSession(session, '任务名', 'feishu');
  assert.equal(events.length, 2); assert.deepEqual(events[1].data.messageSeqs, [8]);
  assert.equal(events[1].data.source.kind, 'provider');
  events.push({ type: 'session/title', data: { title: '我改的名字', source: { kind: 'user' }, messageSeqs: [] } });
  labelSession(session, '任务名', 'feishu');
  assert.equal(events.at(-1).data.title, '飞书 · ⏰ 我改的名字');
});
test('new empty task conversation gets a readable task title', () => {
  const events = []; const session = { snapshotEvents: () => events, append: (type, data) => events.push({ type, data }) };
  labelSession(session, '每日销售简报', 'feishu');
  assert.equal(events[0].data.title, '飞书 · ⏰ 每日销售简报');
  labelSession(session, '每日销售简报', 'feishu'); assert.equal(events.length, 1);
});
