import { createHash } from 'node:crypto';
import { answerFor } from './answer.mjs';
import { configSchema } from './storage.mjs';
import { createNativeTask } from './creation.mjs';
import { namedBots, namedTargets, recipientOptions } from './discovery.mjs';
import { labelSession } from './session-label.mjs';
import { presentedFiles, prepareFiles, fileMetadata } from './files.mjs';
import { sendFileOnce, sendOnce } from './send.mjs';

export function fail(code) { throw Object.assign(new Error(code), { code }); }
const keyFor = (taskId, scheduledAt) => createHash('sha256').update(JSON.stringify([taskId, scheduledAt])).digest('hex');
const knownPreflight = new Set(['unknown-bot', 'unknown-target', 'bot-not-connected', 'invalid-target', 'bad-request']);

export function taskSession(task) {
  return task?.sessionId ?? (task?.target?.kind === 'session' ? task.target.sessionId : undefined);
}

export class AutomationDelivery {
  constructor({ schedule, sessions, persistence, domain, getIm, getController, getWorkspaces, now = Date.now, logger = console }) {
    Object.assign(this, { schedule, sessions, persistence, domain, getIm, getController, getWorkspaces, now, logger });
    this.configs = domain.table('configs');
    this.deliveries = domain.table('deliveries');
    this.tail = Promise.resolve();
    this.closed = false;
    this.abort = new AbortController();
    this.health = null;
    this.discovery = { profiles: new Map(), bindings: null };
  }

  serial(work) {
    const pending = this.tail.then(() => {
      if (this.closed) fail('plugin-stopped');
      return work();
    });
    this.tail = pending.catch(() => {});
    return pending;
  }

  async start() {
    for (const [key, row] of this.domain.table('creations').entries()) {
      if (row.state === 'creating') await this.domain.table('creations').put(key, { ...row, state: 'unknown' });
    }
    await this.reconcile();
    await this.labelTaskSessions();
  }

  async catalog() {
    if (typeof this.schedule.catalog !== 'function' || typeof this.schedule.history !== 'function') fail('unsupported-harness');
    const tasks = await this.schedule.catalog();
    if (!Array.isArray(tasks)) fail('unsupported-harness');
    return tasks;
  }

  eligibility(task, tasks, mode = 'direct') {
    const sessionId = taskSession(task);
    if (!sessionId) return 'unsupported-task-target';
    if (mode === 'direct' && tasks.filter(value => taskSession(value) === sessionId).length !== 1) return 'shared-session';
    return null;
  }

  im() {
    const im = this.getIm();
    if (!im || ['listBots', 'listTargets', 'send', 'describeConversation'].some(name => typeof im[name] !== 'function')) {
      fail('dsh-im-unavailable');
    }
    return im;
  }

  async checkTarget(botId, targetId) {
    const im = this.im();
    const bots = await im.listBots();
    if (!bots.some(bot => bot.botId === botId)) fail('unknown-bot');
    const targets = await im.listTargets(botId);
    if (!targets.some(target => target.targetId === targetId)) fail('unknown-target');
  }

  async syncConflict(sessionId) {
    // Any IM-bound Session may already mirror answers. Dedicated automation Sessions should be unbound.
    return Boolean(await this.im().describeConversation(sessionId));
  }

  snapshot() {
    return {
      configs: [...this.configs.entries()].map(([, value]) => value),
      deliveries: [...this.deliveries.entries()].map(([, value]) => value)
        .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 100),
      health: this.health,
      creations: [...this.domain.table('creations').entries()].map(([, row]) => row).slice(-10).map(({ requestHash, ...row }) => row),
    };
  }

  async view() {
    const tasks = await this.catalog();
    let bots = [];
    let imError = null;
    try { bots = await namedBots(this); } catch (error) { imError = error.code ?? 'dsh-im-unavailable'; }
    const destinations = new Map();
    if (!imError) await Promise.all([...new Set([...this.configs.entries()].map(([, config]) => config.botId))].map(async botId => {
      try { destinations.set(botId, await namedTargets(this, botId)); } catch { /* Show unavailable destination without hiding tasks. */ }
    }));
    const enriched = [];
    for (const task of tasks) {
      const sessionId = taskSession(task);
      let binding;
      let bindingError;
      if (!imError && sessionId) {
        try { binding = await this.im().describeConversation(sessionId); }
        catch { bindingError = 'sync-check-failed'; }
      }
      const config = this.configs.get(task.id);
      const info = await this.sessionInfo(sessionId);
      const running = this.sessions.get(sessionId)?.snapshotEvents?.().findLast(event => ['turn/start', 'turn/end'].includes(event.type))?.type === 'turn/start';
      enriched.push({ id: task.id, title: task.title, status: task.status, sessionId,
        running, scheduledAt: task.scheduledAt, lastRunAt: task.lastDelivery?.deliveredAt, hasExecution: running || Boolean(task.lastDelivery)
          || [...this.deliveries.entries()].some(([, row]) => row.taskId === task.id),
        botName: bots.find(bot => bot.botId === config?.botId)?.name ?? null,
        recipientName: destinations.get(config?.botId)?.find(target => target.targetId === config?.targetId)?.name ?? null,
        ...info, workspaceTitle: this.getWorkspaces?.()?.list().find(workspace => workspace.path === info.cwd)?.title ?? null,
        binding: binding ? { botId: binding.botId, name: binding.botName ?? binding.botId } : null,
        ineligible: this.eligibility(task, tasks) ?? bindingError ?? (binding ? 'session-sync-conflict' : null),
        syncIneligible: this.eligibility(task, tasks, 'sync') ?? bindingError ?? (!binding ? 'session-not-bound' : null),
      });
    }
    return { ...this.snapshot(), tasks: enriched, bots, imError, fileChannels: this.getIm()?.fileChannels ?? [] };
  }

  async sessionInfo(sessionId) {
    if (!sessionId) return {};
    const live = this.sessions.get(sessionId);
    const header = live?.header ?? (await this.persistence.stat?.(sessionId))?.header;
    return { cwd: header?.cwd ?? null };
  }

  async validateBinding(sessionId, botId) {
    const header = (await this.persistence.stat?.(sessionId))?.header ?? this.sessions.get(sessionId)?.header;
    if (!header || header.origin === 'subagent' || (header.delegationDepth ?? 0) > 0) fail('session-not-found');
    if (this.getWorkspaces?.()?.archivedSessionIds?.includes(sessionId)) fail('session-archived');
    const binding = await this.im().describeConversation(sessionId);
    if (!binding || binding.botId !== botId) fail('session-not-bound');
    return binding;
  }

  async creationOptions() {
    const registry = this.getWorkspaces?.();
    const workspaces = registry?.list().map(value => ({ id: value.id, title: value.title, path: value.path })) ?? [];
    return { workspaces, available: typeof this.getController?.()?.create === 'function' };
  }

  async targets(botId) { return namedTargets(this, botId); }
  async recipientOptions(botId) { return recipientOptions(this, botId); }

  async create(input) { return createNativeTask(this, input); }

  async save(input, options = {}) {
    const { taskId, enabled, botId, targetId, expectedRevision, mode = 'direct' } = input;
    const current = this.configs.get(taskId);
    if ((current?.revision ?? 0) !== expectedRevision) fail('config-conflict');
    const tasks = await this.catalog();
    const task = tasks.find(value => value.id === taskId);
    if (!task) fail('task-not-found');
    const sessionId = taskSession(task);
    if (enabled) {
      const reason = this.eligibility(task, tasks, mode);
      if (reason) fail(reason);
      if (mode === 'sync') {
        if (targetId || !enabled) fail('invalid-mode');
        await this.validateBinding(sessionId, botId);
      } else {
        if (!targetId) fail('unknown-target');
        await this.checkTarget(botId, targetId);
        if (await this.syncConflict(sessionId)) fail('session-sync-conflict');
      }
    }
    if (mode === 'sync' && !enabled) fail('native-sync-global');
    if (!sessionId) fail('unsupported-task-target');
    const same = current?.enabled && enabled && current.botId === botId && current.targetId === targetId
      && current.sessionId === sessionId && (current.mode ?? 'direct') === mode;
    if (same) return current;
    const config = configSchema.parse({ taskId, sessionId, enabled, botId, targetId, mode,
      revision: (current?.revision ?? 0) + 1, enabledAt: options.enabledAt ?? this.now() });
    await this.configs.put(taskId, config);
    await this.labelTaskSessions(sessionId);
    return config;
  }

  async labelTaskSessions(sessionId) {
    // Decoration must never prevent task creation or delivery if discovery is unavailable.
    try {
      const configs = [...this.configs.entries()].map(([, value]) => value).filter(value => !sessionId || value.sessionId === sessionId);
      if (!configs.length) return;
      const [tasks, bots] = await Promise.all([this.catalog(), this.im().listBots()]);
      for (const config of configs) {
        const task = tasks.find(value => value.id === config.taskId);
        const channel = bots.find(value => value.botId === config.botId)?.channel;
        const session = this.sessions.get(config.sessionId);
        if (task && session) labelSession(session, task.title, channel);
      }
    } catch { this.logger.warn?.('[dsh-im-automation] unable to update task conversation labels'); }
  }

  async testTarget({ botId, targetId }) {
    await this.checkTarget(botId, targetId);
    const signal = AbortSignal.any([this.abort.signal, AbortSignal.timeout(30_000)]);
    const result = await sendOnce(this.im(), botId, targetId, 'DSH 自动化 IM 投递测试成功。', { format: 'plain', signal });
    if (result?.sent !== true) fail('test-result-unknown');
    return { sent: true };
  }

  async history(task) {
    const result = [];
    let before;
    do {
      const page = await this.schedule.history({ id: task.id, sessionId: taskSession(task), limit: 100,
        ...(before ? { before } : {}) });
      if (!Array.isArray(page.records)) fail('history-unavailable');
      result.push(...page.records);
      if (page.nextBefore && page.nextBefore === before) fail('history-unavailable');
      before = page.nextBefore;
    } while (before);
    return result;
  }

  async readEvents(sessionId) {
    const live = this.sessions.get(sessionId);
    if (live) {
      if (typeof live.snapshotEvents !== 'function') fail('unsupported-harness');
      return live.snapshotEvents();
    }
    const handle = await this.persistence.open(sessionId, 'read');
    try { return (await handle.read(0)).events; } finally { await handle.close(); }
  }

  async put(key, row, state, reason, extra = {}) {
    const next = { ...row, ...extra, state, reason, updatedAt: this.now() };
    await this.deliveries.put(key, next);
    return next;
  }

  async reconcile() {
    // Serial reconciliation cannot overlap a live send. Leftover attempts have an unknown external result.
    for (const [key, row] of this.deliveries.entries()) {
      if (row.state === 'sending') await this.put(key, row, 'unknown', 'previous-attempt-unconfirmed', {
        ...(row.textState ? { textState: row.textState === 'sending' ? 'unknown' : row.textState } : {}),
        ...(row.files ? { files: row.files.map(file => file.state === 'sending' || file.state === 'pending'
          ? { ...file, state: file.state === 'sending' ? 'unknown' : 'skipped', reason: 'previous-attempt-unconfirmed' } : file) } : {}),
      });
    }
    const tasks = await this.catalog();
    const byId = new Map(tasks.map(task => [task.id, task]));
    // A deleted native task loses its routing configuration, while delivery metadata remains for audit/deduplication.
    for (const [taskId] of this.configs.entries()) if (!byId.has(taskId)) await this.configs.delete(taskId);
    for (const [key, row] of this.deliveries.entries()) {
      if (row.state !== 'pending') continue;
      const config = this.configs.get(row.taskId);
      if (!config) await this.put(key, row, 'skipped', 'task-deleted');
      else if (!config.enabled) await this.put(key, row, 'skipped', 'config-disabled');
      else if (config.revision !== row.configRevision) await this.put(key, row, 'skipped', 'config-changed');
    }
    if (!this.getIm()) { this.health = 'dsh-im-unavailable'; return; }
    for (const [, config] of this.configs.entries()) {
      if (!config.enabled) continue;
      const task = byId.get(config.taskId);
      if (!task) continue;
      const history = await this.history(task);
      for (const receipt of history.reverse()) {
        if (Date.parse(receipt.scheduledAt) < config.enabledAt) continue;
        const key = keyFor(task.id, receipt.scheduledAt);
        let row = this.deliveries.get(key);
        if (row && row.state !== 'pending') continue;
        if (!row) {
          row = { taskId: task.id, sessionId: config.sessionId, messageId: receipt.messageId,
            scheduledAt: receipt.scheduledAt, configRevision: config.revision,
            botId: config.botId, targetId: config.targetId, mode: config.mode ?? 'direct',
            state: 'pending', reason: 'waiting-for-answer', updatedAt: this.now() };
          await this.deliveries.put(key, row);
        }
        if (config.mode === 'sync') {
          try {
            await this.validateBinding(config.sessionId, config.botId);
            await this.put(key, row, 'delegated', 'managed-by-dsh-im');
          } catch (error) { await this.put(key, row, 'skipped', error.code ?? 'sync-check-failed'); }
          continue;
        }
        const reason = this.eligibility(task, tasks);
        if (reason || row.sessionId !== taskSession(task)) {
          await this.put(key, row, 'skipped', reason ?? 'session-changed');
          continue;
        }
        // A changed destination never redirects an already observed occurrence.
        if (row.configRevision !== config.revision) {
          await this.put(key, row, 'skipped', 'config-changed');
          continue;
        }
        let answer, events;
        try { events = await this.readEvents(row.sessionId); answer = answerFor(events, row.messageId); }
        catch { continue; } // Storage can lag the receipt; retain pending and recover on the next reconciliation.
        if (answer.state === 'pending') continue;
        if (answer.state === 'skipped' && answer.reason === 'empty-answer' && presentedFiles(events, answer.turn).length) {
          answer = { state: 'ready', turn: answer.turn, text: '任务已完成。' };
        }
        if (answer.state === 'skipped') {
          await this.put(key, row, 'skipped', answer.reason, { turn: answer.turn });
          continue;
        }
        if (this.closed) return;
        try {
          await this.checkTarget(row.botId, row.targetId);
          if (await this.syncConflict(row.sessionId)) {
            await this.put(key, row, 'skipped', 'session-sync-conflict');
            continue;
          }
        } catch (error) {
          await this.put(key, row, 'failed', error.code ?? 'preflight-failed');
          continue;
        }
        const paths = presentedFiles(events, answer.turn);
        const bot = paths.length ? (await this.im().listBots()).find(value => value.botId === row.botId) : null;
        const supported = typeof this.im().sendFile === 'function' && this.im().fileChannels?.includes(bot?.channel);
        const files = await prepareFiles(paths, supported);
        // Recheck catalog after asynchronous discovery, immediately before committing a send attempt.
        const latestTasks = await this.catalog();
        const latest = latestTasks.find(value => value.id === row.taskId);
        const latestReason = latest && this.eligibility(latest, latestTasks);
        if (!latest || latestReason || taskSession(latest) !== row.sessionId) {
          await this.put(key, row, 'skipped', latestReason ?? 'task-changed');
          continue;
        }
        const live = this.sessions.get(row.sessionId);
        if (live && !await this.sessions.flush(live)) fail('session-flush-unconfirmed');
        if (this.closed) return;
        const hash = createHash('sha256').update(answer.text).digest('hex');
        row = await this.put(key, row, 'sending', 'attempt-started', { turn: answer.turn, answerHash: hash, textState: 'sending', files: fileMetadata(files) });
        if (this.closed) return;
        let result;
        try {
          const signal = AbortSignal.any([this.abort.signal, AbortSignal.timeout(30_000)]);
          result = await sendOnce(this.im(), row.botId, row.targetId, answer.text, { format: 'markdown', signal });
        } catch (error) {
          await this.put(key, row, knownPreflight.has(error.code) ? 'failed' : 'unknown',
            knownPreflight.has(error.code) ? error.code : 'send-result-unknown',
            { textState: knownPreflight.has(error.code) ? 'failed' : 'unknown', files: fileMetadata(files).map(file => file.state === 'pending'
              ? { ...file, state: 'skipped', reason: 'text-not-confirmed' } : file) });
          continue;
        }
        if (result?.sent !== true) {
          await this.put(key, row, 'unknown', 'send-result-unknown', { textState: 'unknown',
            files: fileMetadata(files).map(file => file.state === 'pending' ? { ...file, state: 'skipped', reason: 'text-not-confirmed' } : file) });
          continue;
        }
        // Every component is durably acknowledged separately. A lost acknowledgement never causes a replay.
        row = await this.put(key, row, 'sending', 'attempt-started', { textState: 'sent' });
        let uncertain = false;
        for (const file of files) {
          if (file.state !== 'pending') continue;
          if (this.closed) return;
          try {
            await this.checkTarget(row.botId, row.targetId);
            const currentTasks = await this.catalog();
            const current = currentTasks.find(task => task.id === row.taskId);
            if (!current || taskSession(current) !== row.sessionId || this.eligibility(current, currentTasks)) fail('task-changed');
            if (await this.syncConflict(row.sessionId)) fail('session-sync-conflict');
          } catch (error) {
            file.state = 'failed'; file.reason = error.code ?? 'preflight-failed';
            continue;
          }
          file.state = 'sending'; file.reason = 'attempt-started';
          row = await this.put(key, row, 'sending', 'attempt-started', { files: fileMetadata(files) });
          try {
            const signal = AbortSignal.any([this.abort.signal, AbortSignal.timeout(120_000)]);
            const sent = await sendFileOnce(this.im(), row.botId, row.targetId,
              { fileName: file.fileName, bytes: file.bytes, artifactId: file.hash,
                deliveryKey: `${key}:${file.hash}` }, { signal });
            file.state = sent?.sent === true ? 'sent' : 'unknown';
            file.reason = sent?.sent === true ? 'platform-accepted' : 'file-result-unknown';
          } catch (error) {
            const rejected = ['file-send-unsupported', 'unknown-target', 'unknown-bot', 'bot-not-connected',
              'artifact-permission-required', 'artifact-too-large', 'artifact-empty', 'artifact-provider-rejected', 'artifact-rate-limited'].includes(error.code);
            file.state = rejected ? 'failed' : 'unknown';
            file.reason = rejected ? error.code : 'file-result-unknown';
          }
          row = await this.put(key, row, 'sending', 'attempt-started', { files: fileMetadata(files) });
          if (file.state === 'unknown') { uncertain = true; break; }
        }
        for (const file of files) if (file.state === 'pending') { file.state = 'skipped'; file.reason = 'previous-attempt-unconfirmed'; }
        const failed = files.some(file => file.state === 'failed');
        await this.put(key, row, uncertain ? 'unknown' : failed ? 'failed' : 'sent',
          uncertain ? 'file-result-unknown' : failed ? 'files-failed' : 'platform-accepted', { files: fileMetadata(files) });
      }
    }
    this.health = null;
  }

  requestReconcile() {
    return this.serial(() => this.reconcile()).catch(error => {
      this.health = error.code ?? 'reconcile-failed';
      this.logger.warn?.(`[dsh-im-automation] reconciliation stopped (${this.health})`);
    });
  }

  async close() {
    this.closed = true;
    this.abort.abort();
    await this.tail;
  }
}
