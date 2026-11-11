import { createHash } from 'node:crypto';
const labelKey = (botId, targetId) => JSON.stringify([botId, targetId]);
const routeHash = target => createHash('sha256').update(JSON.stringify({ kind: target.kind ?? null, route: Object.fromEntries(Object.entries(target.route ?? {}).sort(([a], [b]) => a.localeCompare(b))) })).digest('hex');
const clean = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const genericName = value => !clean(value) || /^(?:私聊|群聊|用户|user|group|chat)$/iu.test(value)
  || /^(?:私聊|群聊|用户|user|group|chat)\s*[·:：]\s*(?:ou_|oc_|[\d@])/iu.test(value);

export async function namedBots(engine) {
  const im = engine.im();
  return Promise.all((await im.listBots()).map(async bot => {
    if (clean(bot.name)) return { ...bot, name: bot.name.trim() };
    if (typeof im.describeBot !== 'function') return bot;
    let cached = engine.discovery.profiles.get(bot.botId);
    if (!cached || cached.until < engine.now()) {
      const result = Promise.resolve().then(() => im.describeBot(bot.botId)).then(value => clean(value?.account?.name), () => null);
      // Metadata discovery must not hold the UI indefinitely; delivery uses its own unchanged preflight.
      const promise = new Promise(resolve => {
        const timer = setTimeout(() => resolve(null), 8000); timer.unref?.();
        result.then(value => { clearTimeout(timer); resolve(value); });
      });
      cached = { until: engine.now() + 300_000, promise };
      engine.discovery.profiles.set(bot.botId, cached);
    }
    const name = await cached.promise;
    return name ? { ...bot, name } : bot;
  }));
}

export async function boundMetadata(engine) {
  let cached = engine.discovery.bindings;
  if (cached && cached.until >= engine.now()) return cached.promise;
  const promise = (async () => {
    const im = engine.im();
    const candidates = await engine.persistence.list();
    const archived = engine.getWorkspaces?.()?.archivedSessionIds ?? [];
    const found = [];
    for (let offset = 0; offset < candidates.length; offset += 8) {
      await Promise.all(candidates.slice(offset, offset + 8).map(async ({ header }) => {
        if (archived.includes(header.id) || header.origin === 'subagent' || (header.delegationDepth ?? 0) > 0) return;
        const cachedBinding = typeof im.describeConversationSync === 'function' ? im.describeConversationSync(header.id) : null;
        const binding = cachedBinding ?? await im.describeConversation(header.id);
        if (binding) found.push({ ...binding, cwd: header.cwd });
      }));
    }
    return found;
  })();
  engine.discovery.bindings = { until: engine.now() + 60_000, promise };
  try { return await promise; } catch { engine.discovery.bindings = null; return []; }
}

export async function namedTargets(engine, botId, metadata) {
  const targets = await engine.im().listTargets(botId);
  const bindings = metadata ?? await boundMetadata(engine);
  return targets.map(target => {
    const stored = engine.domain.table('target_labels').get(labelKey(botId, target.targetId));
    const saved = stored?.routeHash === routeHash(target) ? stored : null;
    let name = saved?.name ?? clean(target.name);
    if (!saved && (genericName(name) || name === target.targetId)) {
      const matches = bindings.filter(binding => binding.botId === botId && (
        (target.kind === 'user' && target.route?.openId && binding.senderId === target.route.openId && binding.chatType === 'p2p')
        || (target.kind === 'group' && target.route?.chatId && binding.chatId === target.route.chatId)));
      const names = [...new Set(matches.map(binding => clean(target.kind === 'user' ? binding.senderName : binding.chatTitle)).filter(Boolean))];
      name = names.length === 1 ? names[0] : null;
    }
    return { targetId: target.targetId, name: name ?? (target.kind === 'group' ? '未命名的群聊' : '未命名的接收位置'), needsName: !name, ...(saved ? { hasNote: true } : {}) };
  });
}

export async function recipientOptions(engine, botId) {
  const [bots, bindings] = await Promise.all([namedBots(engine), boundMetadata(engine)]);
  const bot = bots.find(value => value.botId === botId);
  if (!bot) throw Object.assign(new Error('unknown-bot'), { code: 'unknown-bot' });
  const workspaces = engine.getWorkspaces?.()?.list() ?? [];
  const paths = [...new Set(bindings.filter(binding => binding.botId === botId && binding.cwd).map(binding => binding.cwd))];
  const matches = paths.length === 1 ? workspaces.filter(workspace => workspace.path === paths[0]) : [];
  return { bot, targets: await namedTargets(engine, botId, bindings),
    workspaceId: matches.length === 1 ? matches[0].id : workspaces.length === 1 ? workspaces[0].id : null,
    workspaceMatched: matches.length === 1 };
}

export async function rememberTargetName(engine, botId, targetId, name) {
  const target = (await engine.im().listTargets(botId)).find(value => value.targetId === targetId);
  if (!target) throw Object.assign(new Error('unknown-target'), { code: 'unknown-target' });
  await engine.domain.table('target_labels').put(labelKey(botId, targetId), { botId, targetId, name, routeHash: routeHash(target) });
}
