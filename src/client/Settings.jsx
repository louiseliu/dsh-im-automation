import React, { useEffect, useState } from 'react';
import { TaskFeedback } from './TaskFeedback.jsx';
import { botLabel, dateLabel, taskProgress, activityTime } from './presentation.mjs';
import { messageFor, stateLabel } from './messages.mjs';
import { Wizard } from './Wizard.jsx';

export function TaskEditor({ api, task, config, deliveries, onSaved }) {
  const [draft, setDraft] = useState(() => ({ enabled: config?.enabled ?? false, mode: config?.mode ?? 'direct',
    botId: config?.botId ?? '', targetId: config?.targetId ?? '', expectedRevision: config?.revision ?? 0 }));
  const [targets, setTargets] = useState([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [targetError, setTargetError] = useState(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setTargets([]);
    setTargetError(null);
    setTargetsLoading(Boolean(draft.botId));
    if (!draft.botId || draft.mode === 'sync') { setTargetsLoading(false); return () => abort.abort(); }
    api('targets', { botId: draft.botId }, abort.signal).then(value => {
      if (!abort.signal.aborted) setTargets(value);
    }, error => { if (!abort.signal.aborted) setTargetError(messageFor(error.code)); })
      .finally(() => { if (!abort.signal.aborted) setTargetsLoading(false); });
    return () => abort.abort();
  }, [api, draft.botId, draft.mode, reload]);
  const validTarget = targets.some(value => value.targetId === draft.targetId);
  const canSend = draft.botId && validTarget && !targetsLoading;
  const bots = task.bots ?? [];
  const ineligible = draft.mode === 'sync' ? task.syncIneligible : task.ineligible;
  const update = patch => { setDraft(value => ({ ...value, ...patch })); setNotice(null); };
  const action = async kind => {
    setBusy(true);
    setNotice(null);
    try {
      if (kind === 'save') {
        const value = await api('save', { taskId: task.id, ...draft });
        setDraft({ mode: value.mode ?? 'direct', enabled: value.enabled, botId: value.botId, targetId: value.targetId, expectedRevision: value.revision });
        setNotice('已保存，从下次任务开始生效。');
        await onSaved();
      } else {
        await api('test', { botId: draft.botId, targetId: draft.targetId });
        setNotice('测试消息已提交，请到聊天软件查看。');
      }
    } catch (error) { setNotice(messageFor(error.code)); }
    finally { setBusy(false); }
  };
  return <section className="dia-editor" aria-label="任务投递配置">
    <h3>{task.title}</h3>
    <TaskFeedback task={task} config={config} latest={deliveries[0]} />
    <details className="dia-edit-settings"><summary>修改接收设置</summary>
    <p className="dia-muted">AI 做好后发送文字结论；有结果文件时一并发送，无需额外设置。</p>
    {ineligible && <p className="dia-warning" role="status">{messageFor(ineligible)}</p>}
    
    <fieldset disabled={busy}>
      {draft.mode === 'sync' ? <>
        <p className="dia-note">这是旧版创建的聊天任务，执行记录仍留在原聊天中。新任务已统一单独保存记录；如需使用新方式，请创建新任务，并在“自动化任务”中停用旧任务。</p>
        <p>绑定机器人：{bots.find(bot => bot.botId === task.binding?.botId) ? botLabel(bots.find(bot => bot.botId === task.binding?.botId)) : '当前聊天机器人'}</p>
        
      </> : <>
      <label className="dia-switch"><input type="checkbox" checked={draft.enabled}
        disabled={Boolean(task.ineligible) && !draft.enabled}
        onChange={event => update({ enabled: event.target.checked })} /> 做好后发送结果</label>
      <label>发送机器人<select value={draft.botId} onChange={event => update({ botId: event.target.value, targetId: '' })}>
        <option value="">请选择机器人</option>
        {draft.botId && !bots.some(bot => bot.botId === draft.botId)
          && <option value={draft.botId}>原机器人已移除</option>}
        {bots.map(bot => <option key={bot.botId} value={bot.botId}>{botLabel(bot)}</option>)}
      </select></label>
      <label>发给谁<select value={draft.targetId} disabled={!draft.botId || targetsLoading}
        onChange={event => update({ targetId: event.target.value })}>
        <option value="">{targetsLoading ? '正在读取目标…' : '请选择一个人或群聊'}</option>
        {draft.targetId && !validTarget && <option value={draft.targetId}>原接收位置已移除</option>}
        {targets.map(target => <option key={target.targetId} value={target.targetId}>{target.name}</option>)}
      </select></label>
      {targetError && <p role="alert">{targetError}</p>}
      {draft.botId && !targetsLoading && targets.length === 0 && !targetError
        && <p className="dia-muted">请到「IM机器人」中为这个机器人添加接收位置，再点击“刷新接收位置”。</p>}
      <div className="dia-actions">
        <button type="button" disabled={!draft.botId || targetsLoading} onClick={() => setReload(value => value + 1)}>刷新接收位置</button>
        <button type="button" disabled={!canSend} onClick={() => action('test')}>发一条测试消息</button>
        <button type="button" className="dia-primary"
          disabled={draft.enabled ? !canSend || Boolean(task.ineligible) : !draft.botId || !draft.targetId}
          onClick={() => action('save')}>保存更改</button>
      </div>
      <details><summary>更多信息</summary>
      <p className="dia-muted">资料目录：{task.cwd ?? '未设置'}<br />对话编号：{task.sessionId}</p>
      <button type="button" className="dia-link" onClick={() => {
        setDraft({ enabled: config?.enabled ?? false, mode: config?.mode ?? 'direct', botId: config?.botId ?? '',
          targetId: config?.targetId ?? '', expectedRevision: config?.revision ?? 0 });
        setNotice(null);
      }}>放弃未保存的更改</button></details>
      </>}
    </fieldset>
    {notice && <p role="status">{notice}</p>}
    </details>
    <h3>最近的结果</h3>
    {deliveries.length === 0 ? <p className="dia-muted">还没有发送记录。任务第一次做好后，会在这里显示结果状态。</p>
      : <ul className="dia-history">{deliveries.map(row => <li key={row.messageId}>
        <div><strong>{stateLabel[row.state]}</strong><time>{dateLabel(row.updatedAt)}</time></div>
        <p>{messageFor(row.reason)}</p>
        {row.files?.length > 0 && <ul>{row.files.map((file, index) => <li key={index}>
          <strong>{file.fileName}</strong> · {stateLabel[file.state]}<p>{messageFor(file.reason)}</p>
        </li>)}</ul>}
        
      </li>)}</ul>}
  </section>;
}

export function Settings({ api, openSession, openAutomation, close }) {
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState(null);
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let inflight = false;
    const load = async () => {
      if (inflight) return;
      inflight = true;
      setLoading(true);
      try {
        const value = await api('view', {}, abort.signal);
        if (!abort.signal.aborted) { setView(value); setError(null); }
      } catch (cause) { if (!abort.signal.aborted) setError(messageFor(cause.code)); }
      finally { inflight = false; if (!abort.signal.aborted) setLoading(false); }
    };
    void load();
    const timer = setInterval(load, 5_000);
    return () => { abort.abort(); clearInterval(timer); };
  }, [api, reload]);
  const task = view?.tasks.find(value => value.id === selected);
  const allTasks = view?.tasks ?? [];
  const inProgress = value => value.running || ['pending', 'sending'].includes(view.deliveries.find(row => row.taskId === value.id)?.state);
  const activeTasks = allTasks.filter(value => value.status !== 'inactive' || inProgress(value))
    .sort((a, b) => (Date.parse(a.scheduledAt) || Infinity) - (Date.parse(b.scheduledAt) || Infinity));
  const endedTasks = allTasks.filter(value => value.status === 'inactive' && !inProgress(value))
    .sort((a, b) => activityTime(b, view.deliveries) - activityTime(a, view.deliveries));
  const cards = (tasks, compact = false) => <ul className={compact ? "dia-task-list dia-compact-list" : "dia-task-list"}>{tasks.map(value => {
    const config = view.configs.find(config => config.taskId === value.id);
    const latest = view.deliveries.find(row => row.taskId === value.id);
    const progress = taskProgress(value, latest);
    if (compact) return <li key={value.id}><button type="button" className="dia-task-row" onClick={() => setSelected(value.id)}>
      <span className="dia-row-name"><strong>{value.title}</strong>{value.recipientName && <span className="dia-muted">{value.recipientName}</span>}</span>
      <span className="dia-row-state"><span>{progress.label}</span><time>{dateLabel(latest?.updatedAt ?? value.lastRunAt)}</time></span>
      <span className="dia-row-arrow" aria-hidden="true">›</span>
    </button></li>;
    return <li key={value.id}><button type="button" className="dia-task-card" onClick={() => setSelected(value.id)}>
      <span className="dia-card-top"><strong>{value.title}</strong><span className="dia-badge">{progress.label}</span></span>
      <span className="dia-muted">{value.status !== 'inactive' && value.scheduledAt ? `下次执行：${dateLabel(value.scheduledAt)}` : progress.hint}</span>
      {value.recipientName && <span className="dia-muted">发送给：{value.recipientName}</span>}
      <span className="dia-card-result">{config?.mode === 'sync' ? '旧版聊天任务' : config?.enabled ? '独立保存记录 · 完成后发送到 IM' : config ? '结果发送已关闭' : 'DSH 原生任务 · 未配置消息发送'}<span aria-hidden="true">查看进度与结果 →</span></span>
    </button></li>;
  })}</ul>;
  const onSaved = async () => { setReload(value => value + 1); };
  return <div className="dia-root">
    <header><div><h2>定时任务与消息</h2><p className="dia-muted">让 AI 按时做事，把结果发到你的聊天里。</p></div>
      {!creating && <button type="button" className="dia-primary" disabled={!view} onClick={() => { setSelected(''); setCreating(true); setNotice(null); }}>创建定时任务</button>}</header>
    {!creating && <div className="dia-note">
      <p>这里列出当前 Host 的全部 DSH 原生定时任务。创建后直接由 DSH 调度，可在“自动化任务”中修改时间、指令或停止任务。</p>
      {openAutomation && <button type="button" onClick={async () => {
        try { await openAutomation(); close?.(); }
        catch { setNotice('暂时无法打开，请从 DSH 左侧进入“自动化任务”。'); }
      }}>打开 DSH 自动化任务</button>}
    </div>}
    {notice && <p role="status" className="dia-note">{notice}</p>}
    {error && <p className="dia-warning" role="alert">{error}</p>}
    {view?.imError && <p className="dia-warning" role="alert">{messageFor(view.imError)}</p>}
    {view?.health && <p className="dia-warning" role="alert">{messageFor(view.health)}</p>}
    {!view && !error && <p>正在读取任务…</p>}
    {creating && view ? <Wizard api={api} bots={view.bots} fileChannels={view.fileChannels} onCancel={() => setCreating(false)} onCreated={async result => {
      setCreating(false); setSelected(result.taskId); setReload(value => value + 1);
      setNotice(result.configSaved ? '任务已保存，无需再次创建。你可以在“自动化任务”中修改时间或停止任务。' : '任务已创建，但接收设置还没保存好。请在下面继续设置，不要重复创建。');
    }} /> : <>
      {view?.creations?.filter(value => value.state !== 'created' || !value.configSaved).map(value => <p key={value.requestId} className="dia-warning">“{value.title}”：{value.state === 'created' ? '已经创建，请继续设置接收位置。' : '创建结果暂时无法确认。请先在“自动化任务”中检查，避免重复创建。'}</p>)}
      {selected && !task && <p role="status">任务已创建，正在读取执行时间和接收设置…</p>}
      {task ? <>
        <div className="dia-actions"><button type="button" onClick={() => setSelected('')}>返回任务列表</button><button type="button" disabled={loading} onClick={() => setReload(value => value + 1)}>刷新状态</button>
        {openSession && <button type="button" disabled={!task.hasExecution && !view.deliveries.some(row => row.taskId === task.id)} onClick={async () => {
          try { await openSession(task.sessionId); close?.(); } catch { setNotice('暂时无法打开记录，请在对应工作区查看。'); }
        }}>{task.hasExecution || view.deliveries.some(row => row.taskId === task.id) ? '查看执行记录' : '首次执行后可查看记录'}</button>}</div>
        <TaskEditor key={task.id} api={api} task={{ ...task, bots: view.bots }}
          config={view.configs.find(value => value.taskId === task.id)}
          deliveries={view.deliveries.filter(value => value.taskId === task.id).slice(0, 20)} onSaved={onSaved} />
      </> : view && <>
        <div className="dia-list-heading"><h3>当前定时任务（{activeTasks.length}）</h3><button type="button" disabled={loading} onClick={() => setReload(value => value + 1)}>{loading ? '刷新中…' : '刷新'}</button></div>
        {activeTasks.length > 0 ? cards(activeTasks) : endedTasks.length === 0
          ? <div className="dia-empty"><h3>把重复的工作交给 AI</h3><p>例如每天早上整理销售情况，或每周汇总需要跟进的事情。</p><p className="dia-muted">点击右上角“创建定时任务”，填写工作内容和时间，选好接收位置即可创建。</p></div>
          : <p className="dia-muted">当前没有待执行任务，最近完成的结果仍保留在下面。</p>}
        {endedTasks.length > 0 && <section aria-label="最近完成的任务"><h3>最近完成的任务</h3>{cards(endedTasks.slice(0, 5), true)}</section>}
        {endedTasks.length > 5 && <details><summary>更早的任务记录（{endedTasks.length - 5}）</summary>{cards(endedTasks.slice(5), true)}</details>}

      </>}

    </>}
  </div>;
}
