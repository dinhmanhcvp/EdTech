// Phim SV_STARTUP (src/sv): node tools/sv-tool.mjs times          → in bảng cắt + ghi public/sv/times.json (cho sv_music.py)
//                           node tools/sv-tool.mjs stills <dir> <giây tuyệt đối,...>  → khung soát (scale 0.5)
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const [cmd, ...args] = process.argv.slice(2);
// ghi trong node_modules để bản bundle tìm được gói remotion
const out = path.resolve('node_modules/.cache/sv-plan.mjs');
await build({entryPoints: ['src/sv/plan.ts'], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', external: ['remotion', 'react', '@remotion/*']});
const {SEGS, STARTS, TOTAL_SEC, FPS, startOf, absOf} = await import(pathToFileURL(out).href);
const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

if (cmd === 'times') {
  SEGS.forEach((s, i) => console.log(`${String(i + 1).padStart(2)} ${s.id.padEnd(16)} ${mmss(STARTS[i])}  ${s.dur.toFixed(1)}s ${s.chapter ?? ''}`));
  console.log(`Tổng ${mmss(TOTAL_SEC)} (${TOTAL_SEC.toFixed(2)} s)`);
  const speech = SEGS.flatMap((s) => (s.subs ?? []).map(([a, b]) => [absOf(s.id, a), absOf(s.id, b)]));
  // segs: [id, bắt đầu, độ dài] cho tools/qc_video.py (đo khung lặp + lệch điểm cắt theo cảnh)
  const segs = SEGS.map((s, i) => [s.id, +STARTS[i].toFixed(3), s.dur]);
  const t = {total: TOTAL_SEC, snap: startOf('A6-ho'), outro: startOf('O1-outro'), speech, segs};
  fs.writeFileSync('public/sv/times.json', JSON.stringify(t, null, 1));
  console.log('snap', t.snap.toFixed(2), 'outro', t.outro.toFixed(2));
} else if (cmd === 'stills') {
  const {bundle} = await import('@remotion/bundler');
  const {renderStill, selectComposition} = await import('@remotion/renderer');
  const [dir, list] = args;
  fs.mkdirSync(dir, {recursive: true});
  const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
  const comp = await selectComposition({serveUrl, id: 'SvStartup', port: 3123});
  for (const s of list.split(',').map(Number)) {
    const output = path.join(dir, `t${s.toFixed(1).padStart(5, '0')}.jpg`);
    await renderStill({composition: comp, serveUrl, frame: Math.round(s * FPS), output, imageFormat: 'jpeg', scale: 0.5, port: 3123});
    console.log('ok', path.basename(output));
  }
}
