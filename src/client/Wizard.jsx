import React, { useEffect, useRef, useState } from 'react';
import { messageFor } from './messages.mjs';
import { botLabel, workspaceLabel, timingLabel } from './presentation.mjs';

export function Wizard({ api, bots, fileChannels = [], onCreated, onCancel }) {
  const submitted = useRef(false);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [botId, setBotId] = useState(bots.length === 1 ? bots[0].botId : '');
  const [targetId, setTargetId] = useState('');
  const [targets, setTargets] = useState([]);
  const [targetName, setTargetName] = useState('');
  const [workspaceHint, setWorkspaceHint] = useState(null);
  const [selectedBot, setSelectedBot] = useState(null);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState('daily');
  const [minutes, setMinutes] = useState(5);
  const [time, setTime] = useState('09:00');
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [requestId] = useState(() => globalThis.crypto.randomUUID());
  useEffect(() => {
    const abort = new AbortController();
    api('creation-options', {}, abort.signal).then(value => {
      if (abort.signal.aborted) return;
      setOptions(value);
    }, cause => { if (!abort.signal.aborted) setError(messageFor(cause.code)); });
    return () => abort.abort();
  }, [api]);
  useEffect(() => {
    const abort = new AbortController();
    setTargets([]); setTargetId(''); setTargetName(''); setWorkspaceHint(null); setSelectedBot(null); setWorkspaceId(''); setTargetsLoading(false);
    if (botId) {
      setTargetsLoading(true);
      api('recipient-options', { botId }, abort.signal).then(value => {
        if (abort.signal.aborted) return;
        setTargets(value.targets); setSelectedBot(value.bot);
        if (value.targets.length === 1) { setTargetId(value.targets[0].targetId); if (value.targets[0].hasNote) setTargetName(value.targets[0].name); }
        if (value.workspaceId) { setWorkspaceId(value.workspaceId); setWorkspaceHint({ id: value.workspaceId, matched: value.workspaceMatched }); }
      }, cause => { if (!abort.signal.aborted) setError(messageFor(cause.code)); })
        .finally(() => { if (!abort.signal.aborted) setTargetsLoading(false); });
    }
    return () => abort.abort();
  }, [api, botId]);
  const timing = kind === 'after' || kind === 'every' ? { kind, minutes }
    : { kind, time, timeZone, ...(kind === 'weekly' ? { weekdays } : {}) };
  const taskTitle = title.trim() || prompt.trim().split('\n')[0].slice(0, 40);
  const workReady = prompt.trim() && prompt.trim().length <= 100000 && taskTitle.length <= 120
    && ((kind === 'after' || kind === 'every') ? Number.isInteger(minutes) && minutes >= 1 && minutes <= 525600
      : time && timeZone && (kind !== 'weekly' || weekdays.length > 0));
  const placeReady = options?.available && botId
    && !targetsLoading && options.workspaces.some(value => value.id === workspaceId)
    && targets.some(value => value.targetId === targetId && (!(value.needsName || value.hasNote) || targetName.trim().length > 0));
  const workspace = options?.workspaces.find(value => value.id === workspaceId);
  const target = targets.find(value => value.targetId === targetId);
  const destinationName = target?.needsName || target?.hasNote ? targetName.trim() || target.name : target?.name;
  const automaticWorkspace = workspaceHint?.id === workspaceId;
  const workspaceSelect = <label>使用哪个工作区的资料<select aria-label="资料所在工作区" value={workspaceId} disabled={targetsLoading} onChange={event => setWorkspaceId(event.target.value)}>
    <option value="">请选择工作区</option>{options?.workspaces.map(value => <option key={value.id} value={value.id}>{workspaceLabel(value)}</option>)}
  </select></label>;
  const schedule = timingLabel({ kind, minutes, time, weekdays }, kind === 'daily' || kind === 'weekly' ? timeZone : null);
  const create = async () => {
    if (submitted.current) return;
    setError(null);
    if (!workReady) { setError('请填写要做的事，并检查执行时间。'); return; }
    try { if (kind === 'daily' || kind === 'weekly') new Intl.DateTimeFormat('zh', { timeZone }); }
    catch { setError('时区无法识别，请在“更多设置”中检查。'); return; }
    if ((target?.needsName || target?.hasNote) && !targetName.trim()) { setError('请给这个接收位置填写一个容易辨认的名字。'); return; }
    if (!placeReady) { setError('请选好接收位置和资料工作区。'); return; }
    submitted.current = true;
    setAttempted(true); setBusy(true); setError(null);
    try {
      await onCreated(await api('create', { requestId, mode: 'direct', title: taskTitle, prompt, timing, botId,
        workspaceId, sessionId: '', targetId, ...((target?.needsName || target?.hasNote) && targetName.trim() !== target?.name ? { targetName: targetName.trim() } : {}) }));
    } catch (cause) { setError(messageFor(cause.code)); }
    finally { setBusy(false); }
  };
  return <section className="dia-wizard" aria-label="创建定时任务">
    <fieldset disabled={busy || attempted}>
      <>
        <h3>想让 AI 定时帮你做什么？</h3>
        <label>要做的事<textarea aria-label="要做的事" rows={5} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="例如：查看今天的销售数据，总结营业额、畅销菜品和需要注意的问题。" /></label>
        <p className="dia-muted">完成后自动发送文字结论；支持文件投递的接收方式会自动附上结果文件。</p>
        <label>什么时候做<select aria-label="什么时候做" value={kind} onChange={event => setKind(event.target.value)}>
          <option value="daily">每天</option><option value="weekly">每周</option><option value="after">只做一次</option><option value="every">每隔一段时间</option>
        </select></label>
        {kind === 'after' || kind === 'every' ? <label>{kind === 'after' ? '多少分钟后执行' : '每隔多少分钟'}<input aria-label="间隔分钟" type="number" min={1} max={525600} value={minutes} onChange={event => setMinutes(Number(event.target.value))} /></label>
          : <label>几点执行<input aria-label="几点执行" type="time" value={time} onChange={event => setTime(event.target.value)} /></label>}
        {kind === 'weekly' && <div className="dia-days" role="group" aria-label="选择星期">{['一', '二', '三', '四', '五', '六', '日'].map((day, index) => <label key={day}><input type="checkbox" checked={weekdays.includes(index + 1)} onChange={event => { const checked = event.target.checked; setWeekdays(value => checked ? [...value, index + 1] : value.filter(item => item !== index + 1)); }} />周{day}</label>)}</div>}
      </>
      <>
        <h3>做好后，发到哪里？</h3>
        <p className="dia-muted">任务单独保存执行记录，完成后把结果发到你选择的 IM 接收位置。</p>
        {botId && (selectedBot?.channel || bots.find(bot => bot.botId === botId)?.channel) && <p className="dia-muted">{
          fileChannels.includes(selectedBot?.channel ?? bots.find(bot => bot.botId === botId)?.channel)
            ? '有结果文件时自动一并发送，无需额外设置。'
            : '当前接收方式只支持文字。飞书发送附件需配套升级 dsh-im 文件投递版。'
        }</p>}
        {bots.length === 0 ? <p className="dia-warning">还没有连接聊天机器人。请先到 Harness 的「IM机器人」中连接机器人，再返回此页刷新。</p>
          : bots.length === 1 ? <p className="dia-muted">发送机器人：{botLabel(selectedBot ?? bots[0])}</p>
          : <label>通过哪个机器人发送<select aria-label="发送机器人" value={botId} onChange={event => { setBotId(event.target.value); setTargetId(''); setError(null); }}>
            <option value="">请选择机器人</option>{bots.map(value => <option key={value.botId} value={value.botId}>{botLabel(selectedBot?.botId === value.botId ? selectedBot : value)}</option>)}
          </select></label>}
          <label>发给谁<select aria-label="发给谁" value={targetId} disabled={!botId || targetsLoading} onChange={event => { setTargetId(event.target.value); const chosen = targets.find(value => value.targetId === event.target.value); setTargetName(chosen?.hasNote ? chosen.name : ''); }}>
            <option value="">{targetsLoading ? '正在读取接收位置…' : '请选择一个人或群聊'}</option>{targets.map(value => <option key={value.targetId} value={value.targetId}>{value.name}</option>)}
          </select></label>
          {botId && !targetsLoading && !targets.length && <p className="dia-warning">这个机器人还没有保存接收位置。请到「IM机器人 → 对应机器人 → 主动投递」添加并测试一个人或群聊，然后返回重新打开创建页。</p>}
          {target?.needsName && <div className="dia-note"><label>给这个接收位置起个名字<input aria-label="接收位置备注" value={targetName} maxLength={80} onChange={event => setTargetName(event.target.value)} placeholder="例如：我的飞书、门店运营群" /></label>
            <p>聊天软件没有提供可辨认的名称。备注只需填一次，会自动记住；不会改变实际接收位置。</p></div>}
          {target?.hasNote && <details><summary>修改接收位置备注</summary><label>接收位置备注<input aria-label="接收位置备注" value={targetName} maxLength={80} onChange={event => setTargetName(event.target.value)} /></label><p className="dia-muted">只更改显示名称，不改变实际接收位置。</p></details>}
          {automaticWorkspace ? <div className="dia-note"><strong>使用「{workspace ? workspaceLabel(workspace) : ''}」的资料</strong>
            <p>{workspaceHint.matched ? '已根据该机器人的现有对话自动匹配。' : '已选用唯一可用的工作区。'}任务记录也会单独保存在这里。</p>
            <details><summary>更换工作区</summary>{workspaceSelect}</details></div>
            : <>{workspaceSelect}<p className="dia-muted">暂时无法确定机器人的资料目录，请选择本次任务要使用的工作区。</p></>}
          {options && !options.workspaces.length && <p className="dia-warning">还没有工作区。请先在 Harness 侧边栏点击“添加工作区”，选择资料文件夹。</p>}
        {!options && <p>正在读取可用的工作区…</p>}
        {options && !options.available && <p className="dia-warning">当前 Harness 暂不支持创建任务，请检查版本是否受支持。</p>}
      </>
      <details><summary>更多设置</summary>
        <label>任务名称（可选）<input aria-label="任务名称" value={title} maxLength={120} onChange={event => setTitle(event.target.value)} placeholder="自动根据工作内容命名" /></label>
        {(kind === 'daily' || kind === 'weekly') && <label>时区<input aria-label="时区" value={timeZone} onChange={event => setTimeZone(event.target.value)} /></label>}
      </details>
      <div className="dia-note" aria-label="安排预览">
        <p>{schedule}{destinationName ? ` · 发给 ${destinationName}` : ' · 请选择接收位置'}</p>
        <p className="dia-muted">直接保存到 DSH「自动化任务」，可随时修改或停止。</p>
      </div>
    </fieldset>
    {error && <p className="dia-warning" role="alert">{error}</p>}
    {attempted && !busy && error && <p>请先返回任务列表确认是否已创建，避免重复安排。</p>}
    <div className="dia-actions"><button type="button" disabled={busy} onClick={onCancel}>取消</button>
      <button type="button" className="dia-primary" disabled={!options?.available || targetsLoading || busy || attempted} onClick={create}>{busy ? '正在安排…' : '创建任务'}</button></div>
  </section>;
}
