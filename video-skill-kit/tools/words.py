"""In mốc từng từ (faster-whisper) để canh chữ nổi theo lời: python -I -X utf8 words.py <file> [<file>...]"""
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

FF = r"C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
model = WhisperModel("small", device="cpu", compute_type="int8")
for path in sys.argv[1:]:
    pcm = subprocess.run([FF, "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    segs, _ = model.transcribe(audio, language="vi", vad_filter=True, beam_size=5, word_timestamps=True)
    print(f"=== {path}")
    print(" ".join(f"{w.word.strip()}@{w.start:.2f}" for s in segs for w in s.words))
    sys.stdout.flush()
