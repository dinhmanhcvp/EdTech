"""Chép lời có mốc thời gian (faster-whisper, tiếng Việt) để chọn điểm cắt: python -I -X utf8 transcribe.py <file> [<file>...]
Mỗi dòng: [bắt đầu → kết thúc] câu. Dùng cho cả clip quay người (âm thanh trong video) lẫn file giọng thu riêng."""
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

FF = r"C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
model = WhisperModel("small", device="cpu", compute_type="int8")
for path in sys.argv[1:]:
    # giải mã bằng ffmpeg (bản PyAV cài sẵn không tương thích faster-whisper)
    pcm = subprocess.run([FF, "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    segs, _ = model.transcribe(audio, language="vi", vad_filter=True, beam_size=5, word_timestamps=True)
    print(f"=== {path}")
    for s in segs:
        # mốc theo từ đầu/cuối chính xác hơn mốc đoạn (đoạn VAD hay tròn 2 giây)
        a, b = (s.words[0].start, s.words[-1].end) if s.words else (s.start, s.end)
        print(f"[{a:7.2f} -> {b:7.2f}] {s.text.strip()}")
    sys.stdout.flush()
