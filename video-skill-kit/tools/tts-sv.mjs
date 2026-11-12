// Giọng AI cho phim SV_STARTUP (thay đoạn cả nhóm hô): node tools/tts-sv.mjs [--force]
// Đọc src/sv/vo-ai.json {id: câu} → public/sv/ai_<id>.mp3 (cắt lặng hai đầu) + in độ dài. Khóa: .env (ELEVENLABS_API_KEY).
// Cùng giọng/model với Launch v3 + FlowCut (Daniel, eleven_v3; thẻ [excited] của v3 cho sắc thái hô hào).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const FF = 'C:/Users/Admin/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
const VOICE = 'onwK4e9ZLuTAKqWW03F9';
const MODEL = 'eleven_v3';
const force = process.argv.includes('--force');

const key = (() => {
  const m = /^\s*ELEVENLABS_API_KEY\s*=\s*(.+)$/m.exec(fs.readFileSync(path.join(ROOT, '.env'), 'utf8'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
})();
if (!key) throw new Error('Thiếu ELEVENLABS_API_KEY trong .env');

const PRON = [[/Socratic Vision Board/g, 'Sô-cra-tích Vi-sần Boóc']];
const norm = (t) => PRON.reduce((s, [re, to]) => s.replace(re, to), t);
const lines = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/sv/vo-ai.json'), 'utf8'));
const cacheDir = path.join(ROOT, 'tools/.tts-cache');
fs.mkdirSync(cacheDir, {recursive: true});

for (const [id, text] of Object.entries(lines)) {
  const t = norm(text);
  const hash = crypto.createHash('sha1').update(JSON.stringify([t, VOICE, MODEL])).digest('hex').slice(0, 16);
  const cache = path.join(cacheDir, `SV-${id}-${hash}.mp3`);
  if (force || !fs.existsSync(cache)) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {'xi-api-key': key, 'Content-Type': 'application/json'},
      body: JSON.stringify({text: t, model_id: MODEL, voice_settings: {stability: 0.5, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true}}),
    });
    if (!r.ok) throw new Error(`[${id}] HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer()));
    console.log(`[${id}] đã tạo, ${t.length} ký tự`);
  }
  const out = path.join(ROOT, `public/sv/ai_${id}.mp3`);
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse';
  spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', cache, '-af', trim, '-ar', '48000', out]);
  const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(spawnSync(FF, ['-hide_banner', '-i', out], {encoding: 'utf8'}).stderr);
  console.log(id, d ? (+d[2] * 60 + +d[3]).toFixed(2) + ' s' : '?');
}
