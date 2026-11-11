import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { rememberTargetName } from './discovery.mjs';

const timingSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('after'), minutes: z.number().int().min(1).max(525600) }).strict(),
  z.object({ kind: z.literal('daily'), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timeZone: z.string().min(1).max(128) }).strict(),
  z.object({ kind: z.literal('weekly'), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timeZone: z.string().min(1).max(128),
    weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7) }).strict(),
  z.object({ kind: z.literal('every'), minutes: z.number().int().min(1).max(525600) }).strict(),
]);
export const creationInput = z.object({
  requestId: z.string().uuid(), mode: z.literal('direct'), title: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(100000), timing: timingSchema,
  targetName: z.string().trim().min(1).max(80).optional(),
  workspaceId: z.string().max(256), sessionId: z.string().max(256), botId: z.string().min(1).max(256), targetId: z.string().max(256),
}).strict();
export const creationSchema = z.object({
  requestId: z.string(), requestHash: z.string(), mode: z.enum(['direct', 'sync']), title: z.string(),
  state: z.enum(['creating', 'created', 'unknown']), updatedAt: z.number(),
  sessionId: z.string().optional(), taskId: z.string().optional(), configSaved: z.boolean().optional(),
}).strict();
const reject = code => { throw Object.assign(new Error(code), { code }); };
export function nativeTiming(value) {
  if (value.timeZone) {
    try { new Intl.DateTimeFormat('en', { timeZone: value.timeZone }); } catch { reject('invalid-time-zone'); }
  }
  if (value.kind === 'after') return { after_seconds: value.minutes * 60 };
  if (value.kind === 'every') return { every_seconds: value.minutes * 60 };
  const rule = { time: value.time, time_zone: value.timeZone };
  if (value.kind === 'weekly') return { weekly: { ...rule, weekdays: [...new Set(value.weekdays)].sort() } };
  return { daily: rule };
}

/** One durable request identity prevents a lost response from creating a second native task. */
export async function createNativeTask(engine, raw) {
  const parsed = creationInput.safeParse(raw);
  if (!parsed.success) reject('invalid-creation');
  const input = parsed.data;
  const timing = nativeTiming(input.timing);
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const table = engine.domain.table('creations');
  const previous = table.get(input.requestId);
  if (previous) {
    if (previous.requestHash !== requestHash) reject('creation-request-conflict');
    if (previous.state !== 'created') reject('creation-result-unknown');
    return previous;
  }
  const controller = engine.getController?.();
  if (typeof controller?.create !== 'function') reject('creation-unavailable');
  const workspace = engine.getWorkspaces?.()?.get(input.workspaceId);
  if (!workspace || input.sessionId || !input.targetId) reject('invalid-workspace');
  await engine.checkTarget(input.botId, input.targetId);
  if (input.targetName) await rememberTargetName(engine, input.botId, input.targetId, input.targetName);
  let sessionId = `session-${randomUUID()}`;
  const enabledAt = engine.now();
  let row = { requestId: input.requestId, requestHash, mode: input.mode, title: input.title,
    state: 'creating', sessionId, updatedAt: enabledAt };
  await table.put(input.requestId, row);
  try {
    {
      const created = await controller.create({ sessionId, workspaceId: workspace.id });
      if (!created?.sessionId) reject('creation-result-unknown');
      sessionId = created.sessionId;
      row = { ...row, sessionId, updatedAt: engine.now() };
      await table.put(input.requestId, row);
      const metadata = await engine.sessionInfo(sessionId);
      if (metadata.cwd !== workspace.path) reject('workspace-mismatch');
      if (await engine.syncConflict(sessionId)) reject('session-sync-conflict');
    }
    const task = await engine.schedule.create(sessionId, { title: input.title, prompt: input.prompt, ...timing });
    if (!task?.id) reject('creation-result-unknown');
    row = { ...row, taskId: task.id, state: 'created', configSaved: false, updatedAt: engine.now() };
    // Keep the created native task visible even if its routing configuration cannot be persisted.
    await table.put(input.requestId, row);
    await engine.save({ taskId: task.id, mode: input.mode, enabled: true, botId: input.botId,
      targetId: input.targetId, expectedRevision: 0 }, { enabledAt });
    row = { ...row, configSaved: true, updatedAt: engine.now() };
    await table.put(input.requestId, row);
    return row;
  } catch (error) {
    if (row.state === 'created') return row;
    try { await table.put(input.requestId, { ...row, state: 'unknown', updatedAt: engine.now() }); } catch { /* original failure remains authoritative */ }
    reject('creation-result-unknown');
  }
}
