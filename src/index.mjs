import { automationDomain } from './storage.mjs';
import { AutomationDelivery } from './engine.mjs';
import { installRpc } from './rpc.mjs';

export const name = 'dsh-im-automation';
export const inject = ['schedule', 'sessions', 'sessionPersistence', 'storageDomain', 'connection'];

export async function apply(ctx) {
  await ctx.effect(async function* () {
    const domain = await ctx.storageDomain.open(automationDomain);
    yield () => domain.close();
    const engine = new AutomationDelivery({ schedule: ctx.schedule, sessions: ctx.sessions,
      persistence: ctx.sessionPersistence, domain, getIm: () => ctx.get('dshIm'), getController: () => ctx.get('sessionController'),
      getWorkspaces: () => ctx.get('workspaceRegistry'), logger: ctx.logger });
    yield () => engine.close();
    yield installRpc(ctx, engine);
    // Both edges are necessary: a fast answer may precede the schedule receipt commit.
    yield ctx.on('schedule/changed', () => { void engine.requestReconcile(); });
    yield ctx.on('session/event', (_session, event) => {
      if (event.type === 'turn/end') void engine.requestReconcile();
      if (event.type === 'session/title') void engine.serial(() => engine.labelTaskSessions(_session.id)).catch(() => {});
    });
    yield ctx.on('session/created', session => { void engine.serial(() => engine.labelTaskSessions(session.id)).catch(() => {}); });
    const promptFiber = ctx.inject(['systemPrompt'], promptCtx => {
      promptCtx.systemPrompt.context({ name: 'dsh-im-automation:files', order: 116, text: assembly => {
        const session = assembly?.agent?.session;
        if (![...engine.configs.entries()].some(([, config]) => config.enabled && config.mode !== 'sync' && config.sessionId === session?.id)) return '';
        return 'This is an automated task whose final answer is delivered to its configured IM recipient. If you produce result files, call the native present tool with their paths after finishing them, then provide a concise text conclusion. Only files declared through present in the current task turn are attached automatically. Do not present input files or unrelated files. Do not call dsh_im_return_file; this task uses a separate delivery channel. Say files are prepared, never that delivery has already succeeded.';
      } });
    });
    yield () => promptFiber.dispose();
    const imFiber = ctx.inject(['dshIm'], () => { void engine.requestReconcile(); });
    yield () => imFiber.dispose();
    const timer = setInterval(() => { void engine.requestReconcile(); }, 15_000);
    timer.unref?.(); // Reconciliation only; Harness remains the sole task scheduler.
    yield () => clearInterval(timer);
    await engine.serial(() => engine.start());
  });
}
