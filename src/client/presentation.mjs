const channels = { feishu: '飞书', weixin: '微信', wecom: '企业微信', 'wecom-app': '企业微信', dingtalk: '钉钉', telegram: 'Telegram', slack: 'Slack', qq: 'QQ' };
export const botLabel = bot => bot.name ? `${bot.name}（${channels[bot.channel] ?? bot.channel ?? '聊天'}）` : `未命名的${channels[bot.channel] ?? bot.channel ?? '聊天'}机器人 · ${bot.botId.slice(-4)}`;
export const workspaceLabel = workspace => workspace.title || workspace.path.split('/').filter(Boolean).at(-1) || '工作区';
export function timingLabel({ kind, minutes, time, weekdays }, timeZone) {
  if (kind === 'after') return `${minutes} 分钟后执行一次`;
  if (kind === 'every') return `每隔 ${minutes} 分钟`;
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  return `${kind === 'daily' ? '每天' : `每周${[...weekdays].sort().map(day => days[day - 1]).join('、')}`} ${time}${timeZone ? `（${timeZone}）` : ''}`;
}

export function dateLabel(value) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '时间待确认';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}
export function taskProgress(task, latest) {
  if (task.running || latest?.state === 'pending') return { label: 'AI 正在执行', hint: '正在处理任务，完成后会更新结果与发送状态。' };
  if (latest?.state === 'sending') return { label: '正在发送结果', hint: 'AI 已完成，正在提交到聊天软件。' };
  if (latest?.textState === 'sent' && latest.state === 'failed') return { label: '文字已发送，文件未全部发送', hint: '请查看文件状态，已发送的内容不会重复发送。' };
  if (latest?.textState === 'sent' && latest.state === 'unknown') return { label: '文字已发送，文件待核查', hint: '请到 IM 确认文件，不会自动重发。' };
  if (latest?.state === 'sent' && latest.files?.length) return { label: '结论和文件已发送', hint: `已发送 ${latest.files.length} 个文件。` };
  if (latest?.state === 'sent') return { label: '已完成，结果已发送', hint: `发送时间：${dateLabel(latest.updatedAt)}` };
  if (latest?.state === 'unknown') return { label: '发送结果待核查', hint: '请到聊天软件确认，系统不会自动重复发送。' };
  if (latest?.state === 'failed') return { label: '结果发送失败', hint: '请检查接收位置或机器人连接。' };
  if (latest?.state === 'skipped') return { label: '本次结果未发送', hint: '请查看下面的具体原因。' };
  if (latest?.state === 'delegated') return { label: '旧版聊天任务已触发', hint: '实际发送跟随原聊天设置。' };
  if (task.hasExecution) return { label: '已有执行记录', hint: '可查看任务过程，发送状态请刷新核对。' };
  if (task.status === 'inactive') return { label: '任务已结束', hint: '这项任务没有可查看的执行记录。' };
  return { label: '等待首次执行', hint: '任务已保存，无需再次创建。首次执行后可以查看过程和结果。' };
}
export const activityTime = (task, deliveries) => deliveries.find(row => row.taskId === task.id)?.updatedAt
  ?? (Date.parse(task.lastRunAt) || 0);
