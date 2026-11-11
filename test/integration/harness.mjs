import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { automationDomain } from '../../src/storage.mjs';
import { AutomationDelivery } from '../../src/engine.mjs';

// DSH_TEST_RUNTIME selects an untouched official desktop runtime for a second compatibility pass.
const require = createRequire(process.env.DSH_TEST_RUNTIME
  ? join(process.env.DSH_TEST_RUNTIME, 'package.json') : import.meta.url);
const load = async name => {
  if (name === '@deepseek-ai/dsh-tool-executor-native' && process.env.DSH_TEST_RUNTIME) return { apply() {} };
  return import(pathToFileURL(require.resolve(name)).href);
};
const [cordis, agentRegistry, agentLoop, llm, session, projections, systemPrompt, tools, executor,
  storage, storageJson, storageDomain, schedule, persistence] = await Promise.all([
  '@deepseek-ai/cordis', '@deepseek-ai/dsh-agent', '@deepseek-ai/dsh-agent-loop', '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-session', '@deepseek-ai/dsh-session-projection', '@deepseek-ai/dsh-system-prompt',
  '@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-tool-executor-native', '@deepseek-ai/dsh-storage',
  '@deepseek-ai/dsh-storage-json', '@deepseek-ai/dsh-storage-domain', '@deepseek-ai/dsh-schedule',
  '@deepseek-ai/dsh-session-persistence-jsonl',
].map(load));
export const { createUserMessage } = llm;

export async function nativeHarness(root, options = {}) {
  const ctx = new cordis.Context();
  try {
    for (const plugin of [llm.default, session.default, projections.default, systemPrompt.default,
      tools.default, executor, agentRegistry.default]) await ctx.plugin(plugin);
    await ctx.plugin(persistence, { root: join(root, 'sessions'), compression: 'none' });
    await ctx.plugin(agentLoop.default, { agents: [] });
    class Adapter extends llm.LlmAdapter {
      async resolveModel(provider, model) { return { provider, id: model, name: model }; }
      async *stream(request) {
        if (options.stream) { yield* options.stream(request); return; }
        const text = options.text ?? '原生任务动态报告';
        yield { type: 'block-start', index: 0, blockType: 'text' };
        yield { type: 'text-delta', index: 0, text };
        yield { type: 'block-end', index: 0, block: { type: 'text', text } };
        yield { type: 'finish', reason: { kind: 'stop' } };
      }
    }
    ctx.llm.registerAdapter(['fixture'], new Adapter());
    const sent = [];
    const im = options.im ?? {
      listBots: async () => [{ botId: 'bot1', channel: 'feishu' }],
      listTargets: async () => [{ targetId: '日报群' }, { targetId: '告警群' }],
      describeConversation: async () => null,
      send: async (...args) => { sent.push(args); return { sent: true }; },
    };
    ctx.provide('dshIm', im);
    const assertWorkspace = id => { if (id !== 'workspace1') throw new Error('unknown workspace'); };
    const workspace = { id: 'workspace1', title: '机器人工作区', path: join(root, 'bot-workspace'), sessionIds: [] };
    ctx.provide('workspaceRegistry', { get: id => id === workspace.id ? workspace : undefined, list: () => [workspace], archivedSessionIds: [] });
    ctx.provide('sessionController', { create: async ({ sessionId, workspaceId }) => {
      assertWorkspace(workspaceId);
      const agent = await ctx.agentLoop.create(session.SessionId(sessionId), { provider: 'fixture', model: 'fixture' }, { cwd: workspace.path });
      workspace.sessionIds.push(agent.id);
      return { sessionId: agent.id };
    }, resolveAgent: async id => {
      const agent = ctx.agents.get(id);
      if (agent) return { agent };
      const handle = await ctx.agents.resume({ resumeSessionId: id, agentOptions: { provider: 'fixture', model: 'fixture' } });
      return { agent: handle.agent };
    } });
    await ctx.plugin(storage.default);
    await ctx.plugin(storageJson, { root: join(root, 'domains') });
    await ctx.plugin(storageDomain, { backend: 'json' });
    await ctx.plugin(schedule.default);
    let domain;
    let engine;
    let stops = [];
    const startEngine = async () => {
      domain = await ctx.storageDomain.open(automationDomain);
      engine = new AutomationDelivery({ schedule: ctx.schedule, sessions: ctx.sessions,
        persistence: ctx.sessionPersistence, getController: () => ctx.sessionController, getWorkspaces: () => ctx.workspaceRegistry, domain, getIm: () => ctx.dshIm, logger: { warn() {} } });
      stops = [ctx.on('schedule/changed', () => { void engine.requestReconcile(); }),
        ctx.on('session/event', (_session, event) => { if (event.type === 'turn/end') void engine.requestReconcile(); })];
      await engine.serial(() => engine.start());
      return engine;
    };
    if (options.engine !== false) await startEngine();
    return {
      ctx, sent, get engine() { return engine; }, startEngine,
      stopEngine: async () => {
        stops.forEach(stop => stop()); stops = [];
        await engine?.close(); await domain?.close();
      },
      createAgent: id => ctx.agentLoop.create(session.SessionId(id), { provider: 'fixture', model: 'fixture' }),
      createTask: (agent, title, delay = 1) => ctx.schedule.create(agent.id, { title, prompt: `生成${title}`, after_seconds: delay }),
      configure: (task, targetId = '日报群') => engine.serial(() => engine.save({ taskId: task.id,
        enabled: true, botId: 'bot1', targetId, expectedRevision: 0 })),
      close: async () => {
        stops.forEach(stop => stop());
        await engine?.close();
        await domain?.close();
        await ctx.fiber.dispose();
      },
    };
  } catch (error) { await ctx.fiber.dispose(); throw error; }
}

export async function until(predicate, timeout = 8000) {
  const end = Date.now() + timeout;
  while (!await predicate()) {
    if (Date.now() > end) throw new Error('integration condition timed out');
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}
