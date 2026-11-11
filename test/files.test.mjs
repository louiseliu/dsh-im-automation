import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { presentedFiles, prepareFiles, fileMetadata, readResultFile, MAX_FILE_BYTES } from '../src/files.mjs';

const event = (type, data) => ({ type, data });
test('only native final deliverables from the selected turn are collected and deduplicated', () => {
  const declared = (turn, paths) => event('deliverables/presented', { turn, files: paths.map(path => ({ path })) });
  const events = [event('turn/start', { turn: 1 }), declared(1, ['/old.xlsx']), event('turn/end', {}),
    event('turn/start', { turn: 2 }), declared(1, ['/wrong-turn.xlsx']), declared(2, ['/result.xlsx', '/result.xlsx', 'relative.xlsx']),
    event('assistant/message', { message: { content: [{ type: 'text', text: '[input](/private/input.csv)' }] } }), event('turn/end', {}), declared(2, ['/late.xlsx'])];
  assert.deepEqual(presentedFiles(events, 2), ['/result.xlsx']);
});
test('files are read as bytes; missing, symbolic, empty and oversized files fail without suppressing valid files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dia-files-'));
  try {
    const valid = join(root, '结果.xlsx');
    await writeFile(valid, Buffer.from([0, 1, 255]));
    const link = join(root, 'link.xlsx'); await symlink(valid, link);
    const empty = join(root, 'empty'); await writeFile(empty, '');
    const large = join(root, 'large'); await writeFile(large, Buffer.alloc(MAX_FILE_BYTES + 1));
    const files = await prepareFiles([valid, link, empty, large, join(root, 'missing'), root], true);
    assert.equal(files[0].state, 'pending'); assert.deepEqual(files[0].bytes, Buffer.from([0, 1, 255]));
    assert.deepEqual(files.slice(1).map(file => file.reason), ['file-unavailable', 'file-unavailable', 'file-too-large', 'file-unavailable', 'file-unavailable']);
    assert.equal(Object.hasOwn(fileMetadata(files)[0], 'bytes'), false);
    assert.equal((await prepareFiles([valid], false))[0].reason, 'file-send-unsupported');
    assert.equal((await readResultFile(valid)).fileName, '结果.xlsx');
  } finally { await rm(root, { recursive: true, force: true }); }
});
