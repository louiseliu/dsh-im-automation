/** Bound a single attempt even when an adapter fails to settle on cancellation; never retry it. */
export function sendOnce(im, botId, targetId, text, options) {
  return attemptOnce(() => im.send(botId, targetId, text, options), options.signal);
}

export function sendFileOnce(im, botId, targetId, file, options) {
  return attemptOnce(() => im.sendFile(botId, targetId, file, options), options.signal);
}

function attemptOnce(send, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new Error('cancelled'));
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(() => {
      signal.throwIfAborted();
      return send();
    }).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
