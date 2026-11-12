"""Chép lời có mốc từng từ cho các file giọng thật (faster-whisper medium, tiếng Việt):
python -I -X utf8 chep_loi.py <thư mục giọng> <ra.json>   → {tên file: {dur, words: [[bắt đầu, kết thúc, từ], ...]}}"""
import glob
import json
import os
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

FF = r'C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
src, out = sys.argv[1], sys.argv[2]
model = WhisperModel('medium', device='cpu', compute_type='int8')
res = {}
for f in sorted(glob.glob(os.path.join(src, '*.mp3'))):
    pcm = subprocess.run([FF, '-v', 'error', '-i', f, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    segs, _ = model.transcribe(audio, language='vi', beam_size=5, word_timestamps=True)
    ws = [[round(w.start, 2), round(w.end, 2), w.word.strip()] for g in segs for w in g.words]
    res[os.path.basename(f)] = {'dur': round(len(audio) / 16000, 2), 'words': ws}
    print(os.path.basename(f)[:30], len(ws), flush=True)
    json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
