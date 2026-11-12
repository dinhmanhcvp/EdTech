// Giọng thuyết minh cho phim Launch v3: mỗi cảnh một câu ngắn (src/launch3/vo-lines.json).
// node tools/tts-launch3.mjs [--only id1,id2] [--force]  → public/voice3/<id>.mp3 + src/launch3/vo.json {id: {dur}}
// Khóa: socratic-video/.env (ELEVENLABS_API_KEY). Giọng Daniel, eleven_v3 (gói free: rõ lời nhất, CER ≈ 4%).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const FF = 'C:/Users/Admin/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
const VOICE = 'onwK4e9ZLuTAKqWW03F9';
const MODEL = 'eleven_v3';
const args = process.argv.slice(2);
const only = (args[args.indexOf('--only') + 1] || '').split(',').filter((x) => args.includes('--only') && x);
const force = args.includes('--force');

const key = (() => {
  const m = /^\s*ELEVENLABS_API_KEY\s*=\s*(.+)$/m.exec(fs.readFileSync(path.join(ROOT, '.env'), 'utf8'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
})();
if (!key) throw new Error('Thiếu ELEVENLABS_API_KEY trong .env');

// đọc đúng tên riêng / ký hiệu (phụ đề không dùng chuỗi này)
const PRON = [
  [/Socratic Vision Board/g, 'Sô-cra-tích Vi-sần Boóc'],
  [/Socratic/g, 'Sô-cra-tích'],
  [/\bQR\b/g, 'ki-u a'],
];
const norm = (t) => PRON.reduce((s, [re, to]) => s.replace(re, to), t);

const lines = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/launch3/vo-lines.json'), 'utf8'));
const outDir = path.join(ROOT, 'public/voice3');
const cacheDir = path.join(ROOT, 'tools/.tts-cache');
fs.mkdirSync(outDir, {recursive: true});
fs.mkdirSync(cacheDir, {recursive: true});
const voPath = path.join(ROOT, 'src/launch3/vo.json');
const vo = fs.existsSync(voPath) ? JSON.parse(fs.readFileSync(voPath, 'utf8')) : {};

const mp3Dur = (f) => {
  const r = spawnSync(FF, ['-hide_banner', '-i', f], {encoding: 'utf8'});
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
};

let chars = 0;
for (const [id, text] of Object.entries(lines)) {
  if (only.length && !only.includes(id)) continue;
  const t = norm(text);
  const hash = crypto.createHash('sha1').update(JSON.stringify([t, VOICE, MODEL])).digest('hex').slice(0, 16);
  const cache = path.join(cacheDir, `L3-${id}-${hash}.mp3`);
  if (force || !fs.existsSync(cache)) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {'xi-api-key': key, 'Content-Type': 'application/json'},
      body: JSON.stringify({text: t, model_id: MODEL, voice_settings: {stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true}}),
    });
    if (!r.ok) throw new Error(`[${id}] HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer()));
    chars += t.length;
    console.log(`[${id}] đã tạo, ${t.length} ký tự`);
  }
  // cắt khoảng lặng đầu/cuối để câu vào đúng nhịp
  const out = path.join(outDir, `${id}.mp3`);
  spawnSync(FF, ['-y', '-loglevel', 'error', '-i', cache, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-b:a', '160k', out]);
  vo[id] = {dur: +mp3Dur(out).toFixed(2), text};
}
fs.writeFileSync(voPath, JSON.stringify(vo, null, 1));
console.log(`Xong · credit dùng lần này ≈ ${chars} ký tự · ghi ${path.relative(ROOT, voPath)}`);
