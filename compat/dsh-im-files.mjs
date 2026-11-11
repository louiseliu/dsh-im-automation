import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Apply only to a disposable copy; never modify the installed IM plugin in place. */
export async function patchDshIm(root) {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (pkg.name !== '@xmanrui/dsh-im' || pkg.version !== '5.9.1') throw new Error('Expected dsh-im 5.9.1');
  const edit = async (file, change) => {
    let source = await readFile(join(root, file), 'utf8');
    const replace = (before, after) => {
      if (source.split(before).length !== 2) throw new Error(`Unexpected dsh-im source: ${file}`);
      source = source.replace(before, after);
    };
    change(replace);
    await writeFile(join(root, file), source);
  };
  await edit('plugin-src/host/index.mjs', replace => {
    replace('          receiptVersion: 1,', `          receiptVersion: 1,
          fileChannels: Object.freeze(['feishu']),
          sendFile: (botId, targetId, file, options) => deliveryService.sendFile(botId, targetId, file, options),`);
  });
  await edit('plugin-src/host/delivery-service.mjs', replace => {
    replace("  async send(botId, targetIdOrDraft, text, { signal, format = 'plain' } = {}) {", `  async sendFile(botId, targetId, file, { signal } = {}) {
    const id = botIdOf(botId);
    const key = targetIdOf(targetId);
    if (!file || !Buffer.isBuffer(file.bytes) || !file.bytes.length || file.bytes.length > 20 * 1024 * 1024
      || typeof file.fileName !== 'string' || !file.fileName || /[\\/\\\\\\u0000-\\u001f]/u.test(file.fileName)
      || typeof file.artifactId !== 'string' || !file.artifactId
      || typeof file.deliveryKey !== 'string' || !file.deliveryKey) throw deliveryError('bad-request');
    cancellation(signal);
    const adapter = await this.#adapterFor(id);
    if (adapter.channel !== 'feishu') throw deliveryError('file-send-unsupported');
    const targets = await adapter.listTargets(id);
    const target = targets.find(value => value.targetId === key);
    if (!target) throw deliveryError('unknown-target');
    cancellation(signal);
    await adapter.sendText(id, target, '', { signal, automationFile: file });
    return { sent: true };
  }

  async send(botId, targetIdOrDraft, text, { signal, format = 'plain' } = {}) {`);
  });
  await edit('src/channels/feishu/feishu-runtime.mjs', replace => {
    replace("async sendProactiveText(target, text, { signal, format = 'plain', receipt = false } = {})", "async sendProactiveText(target, text, { signal, format = 'plain', receipt = false, automationFile } = {})");
    replace('    // Use the same native Markdown element as chat, without opening a stream', `    if (automationFile) {
      const activeSignal = signal ? AbortSignal.any([signal, this.#abortController.signal]) : this.#abortController.signal;
      const channel = new VerifiedFeishuChannel({ client: this.#client });
      await channel.sendFile(receiveId, automationFile, { signal: activeSignal, receiveIdType, retryUncertain: false });
      return { sent: true };
    }
    // Use the same native Markdown element as chat, without opening a stream`);
  });
  await edit('src/channels/feishu/feishu-channel.mjs', replace => {
    replace('  async sendFile(chatId, file, {\n    replyTo,', "  async sendFile(chatId, file, {\n    receiveIdType = 'chat_id',\n    retryUncertain = true,\n    replyTo,");
    replace("      messageType: 'file',", "      messageType: 'file',\n      receiveIdType,\n      retryUncertain,");
    replace('  async #sendArtifact(chatId, file, {\n    replyTo,', "  async #sendArtifact(chatId, file, {\n    receiveIdType = 'chat_id',\n    retryUncertain = true,\n    replyTo,");
    // Other chat operations retain chat_id; only artifact delivery accepts open_id.
    replace("          params: { receive_id_type: 'chat_id' },\n          data: { receive_id: chatId, msg_type: messageType, content, uuid },", "          params: { receive_id_type: receiveIdType },\n          data: { receive_id: chatId, msg_type: messageType, content, uuid },");
    replace('        if (Number(result?.code) === 230049) {', '        if (retryUncertain && Number(result?.code) === 230049) {');
  });
  pkg.version = '5.9.1-automation-files.1';
  await writeFile(join(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}
