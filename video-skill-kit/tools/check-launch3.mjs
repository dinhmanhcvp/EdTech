// Thời lượng từng cảnh của Launch3 + vị trí phách trong montage: node tools/check-flow.mjs
import {build} from 'esbuild';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
// ghi trong node_modules để bản bundle tìm được gói remotion
const out = path.resolve('node_modules/.cache/launch3-plan.mjs');
await build({entryPoints: ['src/launch3/plan.ts'], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', loader: {'.json': 'json'}, external: ['remotion', 'react', '@remotion/*']});
const {ITEMS, STARTS, TOTAL_FRAMES, FPS} = await import(pathToFileURL(out).href);
const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
ITEMS.forEach((it, i) => console.log(`${String(i + 1).padStart(2)} ${it.id.padEnd(8)} ${mmss(STARTS[i] / FPS)}  ${(it.frames / FPS).toFixed(1)}s  nhạc ${it.music}`));
console.log(`Tổng ${TOTAL_FRAMES} frame = ${mmss(TOTAL_FRAMES / FPS)} (${(TOTAL_FRAMES / FPS).toFixed(3)} s)`);
