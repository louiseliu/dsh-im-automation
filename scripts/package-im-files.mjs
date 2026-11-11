import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { patchDshIm } from '../compat/dsh-im-files.mjs';
import { execFileSync } from 'node:child_process';

const source = process.argv[2];
const dependencyRoot = process.argv[3];
if (!source || !dependencyRoot) throw new Error('Usage: node scripts/package-im-files.mjs <dsh-im-5.9.1-directory> <build-dependencies-directory>');
const root = await mkdtemp(join(tmpdir(), 'dia-im-files-'));
await cp(resolve(source), root, { recursive: true, filter: path => !relative(source, path).split('/').some(part => ['node_modules', '.git'].includes(part)) });
await patchDshIm(root);
const { larkSdkHandshakePatch } = await import(join(root, 'plugin-src/host/lark-sdk-handshake-patch.mjs'));
await build({ entryPoints: [join(root, 'plugin-src/host/index.mjs')], outfile: join(root, 'lib/index.js'),
  bundle: true, format: 'esm', platform: 'node', target: ['node22'], mainFields: ['module', 'main'],
  nodePaths: [join(resolve(dependencyRoot), 'node_modules'), fileURLToPath(new URL('../node_modules', import.meta.url))],
  external: ['@tencent-connect/qqbot-connector', '@tencent-connect/qqbot-nodejs', '@wecom/aibot-node-sdk',
    'dingtalk-stream', 'imapflow', 'mailparser', 'nodemailer', 'qrcode', 'sharp', 'undici'],
  plugins: [larkSdkHandshakePatch], minify: true, legalComments: 'eof',
  banner: { js: `import { createRequire } from 'node:module';\nimport { dirname } from 'node:path';\nimport { fileURLToPath } from 'node:url';\nconst require = createRequire(import.meta.url);\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);` },
});
const note = '\n\n## Local automation file delivery extension\n\nThis package is a local derivative of dsh-im 5.9.1, not an official upstream release. It adds host-only Feishu file sending for dsh-im-automation. The original client, bot configuration and dependencies are retained. See the source changes in plugin-src/host and src/channels/feishu.\n';
await writeFile(join(root, 'README.md'), await readFile(join(root, 'README.md'), 'utf8') + note);
execFileSync('npm', ['pack', root, '--ignore-scripts', '--cache', join(tmpdir(), 'dsh-im-automation-pack-cache')], { stdio: 'inherit', cwd: process.cwd() });
console.log(`Patched source for testing: ${root}`);
