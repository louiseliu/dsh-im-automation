import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { basename, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';

// Only native `present` declarations are eligible; prose paths and workspace inputs are never scanned.
export function presentedFiles(events, turn) {
  const paths = new Set();
  let current;
  for (const event of events) {
    if (event.type === 'turn/start') current = event.data.turn;
    if (event.type === 'deliverables/presented' && current === turn && event.data.turn === turn) {
      for (const file of event.data.files ?? []) {
        if (typeof file.path === 'string' && isAbsolute(file.path)) paths.add(file.path);
      }
    }
    if (event.type === 'turn/end') current = undefined;
  }
  return [...paths];
}

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export async function readResultFile(path) {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size === 0n) throw new Error('file-unavailable');
    if (before.size > BigInt(MAX_FILE_BYTES)) throw new Error('file-too-large');
    // Bound the allocation even if another process grows the file while we read it.
    const bytes = Buffer.alloc(Number(before.size) + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    if (offset !== Number(before.size) || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) {
      throw new Error('file-changed');
    }
    const content = bytes.subarray(0, offset);
    return { fileName: basename(path), bytes: content, hash: createHash('sha256').update(content).digest('hex') };
  } catch (error) {
    throw Object.assign(new Error(error.message), { code: ['file-too-large', 'file-changed'].includes(error.message) ? error.message : 'file-unavailable' });
  } finally { await handle?.close(); }
}

export async function prepareFiles(paths, supported) {
  const files = [];
  // Total memory stays bounded as well as each individual file.
  let total = 0;
  for (const path of paths) {
    try {
      if (!supported) throw Object.assign(new Error(), { code: 'file-send-unsupported' });
      const file = await readResultFile(path);
      total += file.bytes.length;
      if (total > MAX_FILE_BYTES) throw Object.assign(new Error(), { code: 'file-too-large' });
      files.push({ ...file, state: 'pending', reason: 'waiting-to-send' });
    } catch (error) { files.push({ fileName: basename(path), state: 'failed', reason: error.code }); }
  }
  return files;
}
export const fileMetadata = files => files.map(({ bytes, ...file }) => file);
