/** Exercise published Harness services without touching the user's profile or calling an IM. */
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import AgentRegistry from '@deepseek-ai/dsh-agent';
import AgentLoop from '@deepseek-ai/dsh-agent-loop';
import LlmRuntime, { LlmAdapter } from '@deepseek-ai/dsh-llm';
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session';
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import ToolRuntime from '@deepseek-ai/dsh-tools';
import * as NativeToolExecutor from '@deepseek-ai/dsh-tool-executor-native';
import Storage from '@deepseek-ai/dsh-storage';
import * as StorageJson from '@deepseek-ai/dsh-storage-json';
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain';
import ScheduleService from '@deepseek-ai/dsh-schedule';

class ProbeAdapter extends LlmAdapter {
  async resolveModel(provider, model) { return { provider, id: model, name: model }; }
  async *stream() {
    yield { type: 'block-start', index: 0, blockType: 'text' };
    yield { type: 'text-delta', index: 0, text: '动态生成的验证回答' };
    yield { type: 'block-end', index: 0, block: { type: 'text', text: '动态生成的验证回答' } };
    yield { type: 'finish', reason: { kind: 'stop' } };
  }
}

export async function probe() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-im-probe-'));
  const ctx = new Context();
  try {
    for (const plugin of [LlmRuntime, SessionStore, SessionProjectionRegistry, SystemPrompt,
      ToolRuntime, NativeToolExecutor, AgentRegistry]) await ctx.plugin(plugin);
    await ctx.plugin(AgentLoop, { agents: [] });
    ctx.llm.registerAdapter(['probe'], new ProbeAdapter());
    const agent = await ctx.agentLoop.create(SessionId('probe-automation'), { provider: 'probe', model: 'probe' });
    // Only the persistence boundary is simulated. Scheduling, AgentLoop, and all events are official packages.
    ctx.provide('sessionPersistence', { stat: async () => ({ header: { id: agent.id, version: 4 } }) });
    ctx.provide('sessionController', { resolveAgent: async () => ({ agent }) });
    ctx.on('session/flush', () => {});
    await ctx.plugin(Storage);
    await ctx.plugin(StorageJson, { root });
    await ctx.plugin(StorageDomain, { backend: 'json' });
    await ctx.plugin(ScheduleService);
    const order = [];
    let claimed;
    const completed = Promise.withResolvers();
    ctx.on('agent/inbox/claimed', ({ message, turn }) => {
      claimed = { messageId: message.id, turn };
      order.push('agent/inbox/claimed');
    });
    ctx.on('schedule/changed', () => order.push('schedule/changed'));
    ctx.on('session/event', (_session, event) => {
      if (['turn/start', 'user/message', 'assistant/message', 'turn/end'].includes(event.type)) order.push(event.type);
      if (event.type === 'turn/end') completed.resolve(event.data.reason);
    });
    const task = await ctx.schedule.create(agent.id, { title: '关联验证', prompt: '生成本次报告', after_seconds: 1 });
    const timer = setTimeout(() => completed.reject(new Error('官方调度验证超时')), 8000);
    let reason;
    try { reason = await completed.promise; } finally { clearTimeout(timer); }
    // The answer can finish before the schedule receipt is durably committed.
    let row;
    for (let i = 0; i < 100; i++) {
      row = (await ctx.schedule.catalog()).find(value => value.id === task.id);
      if (row?.lastDelivery) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    const history = await ctx.schedule.history({ sessionId: agent.id, id: task.id, limit: 20 });
    const version = JSON.parse(await readFile(new URL('../node_modules/@deepseek-ai/dsh-schedule/package.json', import.meta.url))).version;
    return {
      packageVersion: version,
      nativeTaskId: task.id,
      receiptMatchesClaim: row?.lastDelivery?.messageId === claimed?.messageId,
      claimedTurn: claimed?.turn,
      turnEndReason: reason,
      historyRecords: history.records?.length,
      supportsNewSessionTarget: row?.target?.kind === 'new',
      catalogFields: Object.keys(row ?? {}),
      eventOrder: order,
    };
  } finally {
    await ctx.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await probe(), null, 2));
}
