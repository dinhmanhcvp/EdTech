"""Mốc từng từ (faster-whisper medium) của mọi đoạn giọng trong timeline.json, quy về giây TRONG CẢNH → moc-tu.json
{view: [[bắt đầu, kết thúc, từ], ...]}. tao_timeline_giong_that.py dùng file này để đặt phụ đề theo lời thật.
Chạy lại sau khi đổi điểm cắt giọng: python -I -X utf8 tao_timeline_giong_that.py → moc_tu.py → tao_timeline_giong_that.py"""
import json
import os
import subprocess

import numpy as np
from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, '..', '..', '..', '..', 'socratic-video', 'public', 'fn', 'visef')
FF = r'C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
tl = json.load(open(os.path.join(PUB, 'timeline.json'), encoding='utf8'))
model = WhisperModel('medium', device='cpu', compute_type='int8')
out = {}
for s in tl['segments']:
    ws = []
    for v in s['vo']:
        pcm = subprocess.run([FF, '-v', 'error', '-i', os.path.join(PUB, v['file']), '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
        audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
        segs, _ = model.transcribe(audio, language='vi', beam_size=5, word_timestamps=True)
        ws += [[round(w.start + v['at'], 2), round(w.end + v['at'], 2), w.word.strip()] for g in segs for w in g.words]
    if ws:
        out[s['view']] = ws
json.dump(out, open(os.path.join(HERE, 'moc-tu.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print('ok', len(out), 'canh')
