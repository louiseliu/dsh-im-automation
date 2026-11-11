// dsh-im recognizes these title prefixes and renders its existing platform logo.
const channels = { weixin: '微信', feishu: '飞书', dingtalk: '钉钉', wecom: '企业微信', 'wecom-app': '企业微信',
  qq: 'QQ', slack: 'Slack', telegram: 'Telegram', discord: 'Discord', whatsapp: 'WhatsApp',
  imessage: 'iMessage', matrix: 'Matrix', office: 'AI Office' };
const prefixes = [...Object.values(channels), 'WeChat', 'Feishu', 'DingTalk', 'WeCom'];

export function scheduledTitle(title, channel) {
  const label = channels[channel];
  if (!label || typeof title !== 'string' || !title.trim()) return null;
  let base = title.trim();
  for (const prefix of prefixes) {
    if (base.startsWith(`${prefix} · `)) { base = base.slice(prefix.length + 3); break; }
  }
  if (base.startsWith('⏰ ')) base = base.slice(2).trimStart();
  return `${label} · ⏰ ${base}`;
}

/** Keep the accepted title's origin and citations; only add the two visible labels. */
export function labelSession(session, title, channel) {
  if (typeof session?.snapshotEvents !== 'function' || typeof session?.append !== 'function') return;
  const latest = session.snapshotEvents().findLast(event => event.type === 'session/title');
  const data = latest?.data;
  if (data && (!Array.isArray(data.messageSeqs) || !['user', 'fallback', 'provider'].includes(data.source?.kind))) return;
  const next = scheduledTitle(data?.title ?? title, channel);
  if (!next || next === data?.title) return;
  session.append('session/title', data ? { ...structuredClone(data), title: next }
    : { title: next, source: { kind: 'user' }, messageSeqs: [] });
}
