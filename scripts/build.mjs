import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
const pkg = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../package.json', import.meta.url)));
await mkdir(new URL('../lib', import.meta.url), { recursive: true });
await build({ entryPoints: ['src/index.mjs'], bundle: true, platform: 'node', format: 'esm',
  target: 'node22', outfile: 'lib/index.js', legalComments: 'none' });
const result = await build({ entryPoints: ['src/client/index.jsx'], bundle: true, platform: 'browser',
  loader: { '.css': 'text' }, format: 'cjs', target: 'chrome100', external: ['react'], write: false, legalComments: 'none' });
await writeFile('lib/client.js', `window.__ModuleLoader__.load({id:${JSON.stringify(pkg.name)},factory:(require)=>{\nvar module={exports:{}};var exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;\n}});\n`);
console.log('Built Host plugin and browser settings module.');
