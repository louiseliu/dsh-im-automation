import test from 'node:test';
import assert from 'node:assert/strict';
import { answerFor } from '../src/answer.mjs';
const event = (type, data) => ({ type, data });
const input = (id = 'm', kind = 'schedule') => event('user/message', { id, source: { kind } });
const assistant = (text, step = 1, extra = {}) => event('assistant/message', {
  turn: 1, step, message: { content: [{ type: 'text', text }] }, ...extra });
const start = event('turn/start', { turn: 1 });
const end = kind => event('turn/end', { turn: 1, reason: { kind } });

test('only text after the last tool call is sent, never earlier preambles or reasoning', () => {
  const events = [start, input(), assistant('正在查询'), event('tool/call', { turn: 1 }),
    assistant('继续查询', 2), event('tool/call', { turn: 1 }), assistant('最终报告', 3), end('completed')];
  assert.deepEqual(answerFor(events, 'm'), { state: 'ready', text: '最终报告', turn: 1 });
});
test('ordinary chat and other turns do not become the scheduled answer', () => {
  const events = [start, input(), assistant('任务报告'), end('completed'),
    event('turn/start', { turn: 2 }), input('human', 'user'), assistant('私人问题', 2),
    event('turn/end', { turn: 2, reason: { kind: 'completed' } })];
  assert.equal(answerFor(events, 'm').text, '任务报告');
  assert.equal(answerFor(events, 'human').reason, 'ambiguous-input');
});
test('steering before or after schedule input rejects the whole answer', () => {
  for (const messages of [[input('human', 'user'), input()], [input(), input('human', 'user')]]) {
    assert.equal(answerFor([start, ...messages, assistant('混合回答'), end('completed')], 'm').reason, 'ambiguous-input');
  }
});
test('runtime context snapshots are allowed', () => {
  assert.equal(answerFor([start, input(), input('ctx', 'runtime-context'), assistant('报告'), end('completed')], 'm').text, '报告');
});
for (const kind of ['aborted', 'error', 'blocked', 'max-tokens', 'interrupted']) {
  test(`${kind} never sends partial text`, () => {
    assert.equal(answerFor([start, input(), assistant('不完整'), end(kind)], 'm').reason, `turn-${kind}`);
  });
}
test('empty canonical final text clears earlier text', () => {
  assert.equal(answerFor([start, input(), assistant('旧回答'), assistant('', 2), end('completed')], 'm').reason, 'empty-answer');
});
test('an assistant message containing tool calls clears its text even before the tool/call event', () => {
  const toolMessage = event('assistant/message', { step: 2, message: { content: [{ type: 'text', text: '查询中' }, { type: 'tool-call' }] } });
  assert.equal(answerFor([start, input(), assistant('旧回答'), toolMessage, end('completed')], 'm').reason, 'empty-answer');
});
test('durable inbox claim recovers pre-step rejection without a user/message', () => {
  const message = { id: 'm', source: { kind: 'schedule' } };
  const insert = event('agent/inbox/spliced', { target: 'next-turn', start: 0, inserted: [message] });
  const claim = event('agent/inbox/spliced', { target: 'next-turn', start: 0, removedCount: 1, inserted: [] });
  assert.equal(answerFor([insert, start, claim, end('blocked')], 'm').reason, 'turn-blocked');
  assert.equal(answerFor([insert, start, { ...claim, data: { ...claim.data, outcome: 'canceled' } }], 'm').reason, 'input-discarded');
});
test('missing or still running input stays pending', () => {
  assert.equal(answerFor([start, input(), assistant('执行中')], 'm').state, 'pending');
  assert.equal(answerFor([], 'm').state, 'pending');
});

test('subagent completion notices remain part of the scheduled workflow; human steering never does', () => {
  const notice = event('user/message', { id: 'notice', source: { kind: 'subagent-settled', form: 'notice' } });
  assert.equal(answerFor([start, input(), notice, assistant('综合结果'), end('completed')], 'm').text, '综合结果');
  notice.data.source.kind = 'user';
  assert.equal(answerFor([start, input(), notice, assistant('综合结果'), end('completed')], 'm').reason, 'ambiguous-input');
});

test('official first-turn workspace instructions, skill catalog and time snapshot are Host context', () => {
  const sources = [{ kind: 'agent-instructions', form: 'instructions' }, { kind: 'skill-catalog', form: 'catalog' }, { kind: 'time-context', form: 'snapshot' }];
  const context = sources.map((source, index) => event('user/message', { id: `host-${index}`, source }));
  assert.equal(answerFor([start, input(), ...context, assistant('3973'), end('completed')], 'm').text, '3973');
  for (const form of ['instructions', 'catalog', 'snapshot']) {
    const human = event('user/message', { id: 'human', source: { kind: 'user', form } });
    assert.equal(answerFor([start, input(), human, assistant('混合输入'), end('completed')], 'm').reason, 'ambiguous-input');
  }
});
