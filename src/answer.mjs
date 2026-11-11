/** Resolve by message identity, including a claim whose pre-step failed before user/message. */
export function answerFor(events, messageId) {
  let openTurn;
  let source;
  let userSeen = 0;
  let discarded = false;
  const turns = new Set();
  const inbox = { 'next-turn': [], 'next-step': [] };
  const locate = message => { turns.add(openTurn); source = message.source; };
  for (const { type, data } of events) {
    if (type === 'turn/start') openTurn = data.turn;
    if (type === 'turn/end') openTurn = undefined;
    if (type === 'agent/inbox/spliced') {
      const removed = inbox[data.target].splice(data.start, data.removedCount ?? 0, ...data.inserted);
      const match = removed.find(message => message.id === messageId);
      if (match) {
        if (data.outcome === 'canceled') discarded = true;
        else locate(match);
      }
    }
    if (type === 'user/message' && data.id === messageId) { userSeen++; locate(data); }
  }
  if (discarded) return { state: 'skipped', reason: 'input-discarded' };
  if (turns.size === 0) return { state: 'pending', reason: 'waiting-for-answer' };
  const [targetTurn] = turns;
  if (turns.size !== 1 || source?.kind !== 'schedule' || !Number.isSafeInteger(targetTurn) || userSeen > 1) {
    return { state: 'skipped', reason: 'ambiguous-input' };
  }
  const text = new Map();
  let ambiguous = false;
  let ended;
  for (const { type, data } of events) {
    if (type === 'turn/start') openTurn = data.turn;
    if (openTurn !== targetTurn) continue;
    if (type === 'user/message' && data.id !== messageId) {
      const internal = data.source?.kind === 'runtime-context'
        || (data.source?.kind === 'agent-instructions' && data.source?.form === 'instructions')
        || (data.source?.kind === 'skill-catalog' && data.source?.form === 'catalog')
        || (data.source?.kind === 'time-context' && data.source?.form === 'snapshot')
        || (data.source?.form === 'notice' && !['user', 'schedule'].includes(data.source?.kind));
      if (!internal) ambiguous = true;
    }
    if (type === 'tool/call') text.clear();
    if (type === 'assistant/message') {
      const content = data.message?.content ?? [];
      if (data.interrupted || content.some(part => part.type === 'tool-call')) text.clear();
      else {
        const value = content.filter(part => part.type === 'text').map(part => part.text).join('\n').trim();
        if (!value) text.clear();
        else text.set(data.step, value);
      }
    }
    if (type === 'turn/end') { ended = data.reason?.kind; break; }
  }
  if (!ended) return { state: 'pending', reason: 'waiting-for-answer' };
  if (ambiguous) return { state: 'skipped', reason: 'ambiguous-input', turn: targetTurn };
  if (ended !== 'completed') return { state: 'skipped', reason: `turn-${ended}`, turn: targetTurn };
  const answer = [...text.entries()].sort(([a], [b]) => a - b).map(([, value]) => value).join('\n\n').trim();
  return answer ? { state: 'ready', text: answer, turn: targetTurn }
    : { state: 'skipped', reason: 'empty-answer', turn: targetTurn };
}
