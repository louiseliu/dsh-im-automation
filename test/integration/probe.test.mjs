import test from 'node:test';
import assert from 'node:assert/strict';
import { probe } from '../../scripts/probe.mjs';

test('published Harness schedules real AgentLoop input and correlates its completed answer', async () => {
  const result = await probe();
  assert.equal(result.packageVersion, '0.2.2-alpha.2');
  assert.equal(result.receiptMatchesClaim, true);
  assert.equal(result.claimedTurn, 1);
  assert.equal(result.turnEndReason.kind, 'completed');
  assert.equal(result.historyRecords, 1);
  const claimed = result.eventOrder.indexOf('agent/inbox/claimed');
  const answered = result.eventOrder.indexOf('assistant/message');
  const ended = result.eventOrder.indexOf('turn/end');
  assert.ok(claimed >= 0 && answered > claimed && ended > answered);
  // Regression guard: the published alpha is NOT the current master implementation.
  assert.equal(result.supportsNewSessionTarget, false);
  assert.ok(result.catalogFields.includes('sessionId'));
  assert.ok(!result.catalogFields.includes('target'));
});
