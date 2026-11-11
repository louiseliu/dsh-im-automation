import test from 'node:test';
import assert from 'node:assert/strict';
import { taskProgress } from '../src/client/presentation.mjs';
test('live execution takes priority over the previous successful recurring result', () => {
  assert.equal(taskProgress({ running: true }, { state: 'sent' }).label, 'AI 正在执行');
});
test('unknown, failed and skipped delivery never claim the result was sent', () => {
  for (const state of ['unknown', 'failed', 'skipped']) assert.notEqual(taskProgress({ status: 'inactive' }, { state }).label, '已完成，结果已发送');
  assert.equal(taskProgress({ status: 'active', hasExecution: false }).label, '等待首次执行');
});

test('file failures cannot be presented as full delivery success', () => {
  assert.equal(taskProgress({}, { state: 'failed', textState: 'sent' }).label, '文字已发送，文件未全部发送');
  assert.equal(taskProgress({}, { state: 'unknown', textState: 'sent' }).label, '文字已发送，文件待核查');
  assert.equal(taskProgress({}, { state: 'sent', textState: 'sent', files: [{ state: 'sent' }] }).label, '结论和文件已发送');
});
