// Khung hình mẫu của FlowCut, ghép thành tờ liên hoàn: node tools/stills-flow.mjs <thư mục ra> open:1,3,5 montage:2,9 ...
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const [outDir, ...args] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const plan = path.resolve('node_modules/.cache/launch3-plan-st.mjs');
await build({entryPoints: ['src/launch3/plan.ts'], bundle: true, platform: 'node', format: 'esm', outfile: plan, logLevel: 'error', loader: {'.json': 'json'}, external: ['remotion', 'react', '@remotion/*']});
const {ITEMS, STARTS, FPS} = await import(pathToFileURL(plan).href);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
const comp = await selectComposition({serveUrl, id: 'Launch3', port: 3123});
for (const a of args) {
  const [id, list] = a.split(':');
  const i = ITEMS.findIndex((x) => x.id === id);
  for (const s of list.split(',').map(Number)) {
    const frame = STARTS[i] + Math.round(s * FPS);
    const output = path.join(outDir, `${String(i + 1).padStart(2, '0')}_${id}_${s}s.jpg`);
    await renderStill({composition: comp, serveUrl, frame, output, imageFormat: 'jpeg', scale: 0.5, port: 3123});
    console.log('ok', path.basename(output));
  }
}
