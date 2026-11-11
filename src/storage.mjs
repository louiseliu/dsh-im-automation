import { z } from 'zod';
import { creationSchema } from './creation.mjs';

const id = z.string().min(1).max(256);
export const configSchema = z.object({
  taskId: id, sessionId: id, enabled: z.boolean(), botId: id, targetId: z.string().max(256),
  mode: z.enum(['direct', 'sync']).default('direct'),
  revision: z.number().int().positive(), enabledAt: z.number().int().nonnegative(),
}).strict();
export const deliverySchema = z.object({
  taskId: id, sessionId: id, messageId: id, scheduledAt: z.string(),
  configRevision: z.number().int(), botId: id, targetId: z.string().max(256),
  mode: z.enum(['direct', 'sync']).default('direct'),
  state: z.enum(['pending', 'sending', 'sent', 'unknown', 'skipped', 'failed', 'delegated']),
  textState: z.enum(['pending', 'sending', 'sent', 'unknown', 'failed']).optional(),
  files: z.array(z.object({ fileName: z.string(), hash: z.string().optional(),
    state: z.enum(['pending', 'sending', 'sent', 'unknown', 'failed', 'skipped']), reason: z.string() }).strict()).optional(),
  reason: z.string(), updatedAt: z.number(), turn: z.number().optional(), answerHash: z.string().optional(),
}).strict();

export const targetLabelSchema = z.object({ botId: id, targetId: id, name: z.string().trim().min(1).max(80), routeHash: z.string() }).strict();

// Uses the Host's authoritative storage facility and its configured backend/locking.
export const automationDomain = {
  name: 'dsh_im_automation', version: 1,
  tables: { target_labels: { valueSchema: targetLabelSchema }, creations: { valueSchema: creationSchema }, configs: { valueSchema: configSchema }, deliveries: { valueSchema: deliverySchema } },
};
