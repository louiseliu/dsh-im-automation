import { creationInput } from './creation.mjs';

import { RPC_METHOD } from './protocol.mjs';
export { RPC_METHOD } from './protocol.mjs';
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => record(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && value.trim() === value;
const error = code => ({ ok: false, error: { code, message: code, details: {} } });
const publicCodes = new Set(['unsupported-harness', 'dsh-im-unavailable', 'unknown-bot', 'unknown-target',
  'bot-not-connected', 'shared-session', 'task-not-found', 'unsupported-task-target', 'config-conflict',
  'session-sync-conflict', 'test-result-unknown', 'sync-check-failed', 'plugin-stopped', 'invalid-mode', 'session-not-bound', 'session-not-found',
  'session-archived', 'native-sync-global', 'invalid-creation', 'invalid-time-zone', 'creation-unavailable',
  'invalid-workspace', 'workspace-mismatch', 'creation-request-conflict', 'creation-result-unknown']);

export function validRequest(method, payload) {
  if (method === 'create') return creationInput.safeParse(payload).success;
  if (method === 'creation-options') return exact(payload, []);
  if (method === 'view') return exact(payload, []);
  if (method === 'targets' || method === 'recipient-options') return exact(payload, ['botId']) && id(payload.botId);
  if (method === 'test') return exact(payload, ['botId', 'targetId']) && id(payload.botId) && id(payload.targetId);
  return method === 'save' && (exact(payload, ['taskId', 'enabled', 'botId', 'targetId', 'expectedRevision'])
    || (exact(payload, ['taskId', 'enabled', 'botId', 'targetId', 'expectedRevision', 'mode']) && ['direct', 'sync'].includes(payload.mode)))
    && id(payload.taskId) && typeof payload.enabled === 'boolean' && id(payload.botId) && (payload.mode === 'sync' ? payload.targetId === '' : id(payload.targetId))
    && Number.isSafeInteger(payload.expectedRevision) && payload.expectedRevision >= 0;
}

export function rpcHandler(engine) {
  return async (method, payload, signal) => {
    if (!validRequest(method, payload)) return error('bad-request');
    if (signal?.aborted) return error('cancelled');
    try {
      if (method === 'creation-options') return { ok: true, value: await engine.creationOptions() };
      if (method === 'view') return { ok: true, value: await engine.view() };
      if (method === 'targets') return { ok: true, value: await engine.targets(payload.botId) };
      if (method === 'recipient-options') return { ok: true, value: await engine.recipientOptions(payload.botId) };
      const value = await engine.serial(async () => {
        if (signal?.aborted) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
        if (method === 'create') return engine.create(payload);
        if (method === 'save') return engine.save(payload);
        if (method === 'test') return engine.testTarget(payload);

      });
      if (method === 'save' || method === 'create') void engine.requestReconcile();
      return { ok: true, value };
    } catch (cause) {
      return error(publicCodes.has(cause.code) ? cause.code : cause.code === 'cancelled' ? 'cancelled' : 'operation-failed');
    }
  };
}

export function installRpc(ctx, engine) {
  const handler = rpcHandler(engine);
  return ctx.connection.fetch.register({
    path: `/api/${RPC_METHOD}`, methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      // Harness owns authentication and Host/Origin checks on the shared /api carrier.
      if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return new Response('expected JSON', { status: 415 });
      }
      let message;
      try { message = await request.json(); } catch { return new Response('invalid JSON', { status: 400 }); }
      if (!record(message) || message.type !== 'client-request' || message.method !== RPC_METHOD
        || typeof message.rpcId !== 'string' || !exact(message.payload, ['method', 'payload'])) {
        return new Response('invalid RPC envelope', { status: 400 });
      }
      return Response.json({ type: 'server-response', rpcId: message.rpcId,
        result: await handler(message.payload.method, message.payload.payload, request.signal) });
    },
  });
}
