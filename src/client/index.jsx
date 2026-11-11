import React from 'react';
import { Settings } from './Settings.jsx';
import { RPC_METHOD } from '../protocol.mjs';
import css from './styles.css';

export const name = 'dsh-im-automation-settings';
export const inject = ['slots', 'connection'];
export function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
    return () => style.remove();
  });
  const api = async (method, payload, signal) => {
    const result = await ctx.connection.rpc.call('/api', RPC_METHOD, { method, payload }, signal);
    if (result?.ok !== true) throw Object.assign(new Error(result?.error?.message ?? 'operation-failed'),
      { code: result?.error?.code ?? 'operation-failed' });
    return result.value;
  };
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'dsh-im-automation', order: 22,
    label: () => '定时任务与消息', inject: () => ({ api, openAutomation: () => {
      const layout = ctx.get('layout');
      if (typeof layout?.selectPanel !== 'function') throw new Error('automation-navigation-unavailable');
      layout.selectPanel('schedules');
    }, openSession: id => {
      const workspace = ctx.get('uiWorkspace');
      if (typeof workspace?.openSession !== 'function') throw new Error('session-navigation-unavailable');
      workspace.openSession(id);
    } }),
  }, props => <Settings {...props} />));
}
