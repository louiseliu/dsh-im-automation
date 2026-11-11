import React from 'react';
import { dateLabel, taskProgress } from './presentation.mjs';

export function TaskFeedback({ task, config, latest }) {
  const progress = taskProgress(task, latest);
  return <div className="dia-feedback" role="status">
    <h3>{progress.label}</h3><p>{progress.hint}</p>
    {task.status !== 'inactive' && task.scheduledAt && <p><strong>下次执行：{dateLabel(task.scheduledAt)}</strong></p>}
    {task.botName && <p>通过 {task.botName} 发送给 {task.recipientName ?? '尚未确认的接收位置'}</p>}
    {task.workspaceTitle && <p className="dia-muted">资料与独立执行记录：{task.workspaceTitle}</p>}
    {config?.enabled === false && <p className="dia-warning">结果发送已关闭。任务仍会按计划执行，但不会推送到 IM。</p>}
    {!task.hasExecution && !latest && task.status !== 'inactive' && <p className="dia-muted">执行记录会在任务首次执行后自动生成。</p>}
    {task.status === 'inactive' && <p className="dia-muted">这项任务已结束，不会再次运行。</p>}
  </div>;
}
