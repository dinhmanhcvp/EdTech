"""Kiểm tra độ rõ lời của giọng AI bằng nhận dạng giọng nói (faster-whisper, tiếng Việt).
Dùng: python tools/asr_check.py <file.mp3> "<văn bản gốc>"   (in tỉ lệ lỗi ký tự CER, càng thấp càng rõ)
      python tools/asr_check.py --scenes           (kiểm tra mọi cảnh trong src/demo2/voice.json bằng lời đã chuẩn hóa)
"""
import json, os, re, subprocess, sys, unicodedata, wave
import numpy as np
from faster_whisper import WhisperModel

FF = r"C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_model = None

def norm(t):
    t = unicodedata.normalize("NFC", t.lower())
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def lev(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]

def transcribe(mp3):
    global _model
    if _model is None:
        _model = WhisperModel("small", device="cpu", compute_type="int8")
    wav = mp3 + ".16k.wav"
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "16000", wav], check=True)
    with wave.open(wav) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    os.remove(wav)
    segs, _ = _model.transcribe(a, language="vi", beam_size=5, vad_filter=True)
    return " ".join(s.text.strip() for s in segs)

def cer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    return lev(r, h) / max(1, len(r))

if __name__ == "__main__":
    if sys.argv[1] == "--scenes":
        voice = json.load(open(os.path.join(ROOT, "src/demo2/voice.json"), encoding="utf-8"))
        for sid, v in voice.items():
            ref = " ".join(c[2] for c in v["caps"])
            hyp = transcribe(os.path.join(ROOT, "public", v["file"]))
            print(f"{sid:8s} CER={cer(ref, hyp):.2f}  ({v['dur']:.1f}s)\n   nghe được: {hyp[:150]}")
    else:
        mp3, ref = sys.argv[1], sys.argv[2]
        hyp = transcribe(mp3)
        print(f"CER={cer(ref, hyp):.3f}\nnghe được: {hyp}")
