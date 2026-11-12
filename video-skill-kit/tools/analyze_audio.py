"""Phân tích nhạc nền video tham chiếu: BPM, nhịp, điểm nhấn (onset), đường năng lượng, ứng viên điểm vòng lặp.

Dùng: python -I tools/analyze_audio.py analysis/flow/flow_audio.wav analysis/flow/audio.json
"""
import json
import sys
import wave

import numpy as np

src, out = sys.argv[1], sys.argv[2]
with wave.open(src) as w:
    sr = w.getframerate()
    ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
x = x.reshape(-1, ch).mean(axis=1)
dur = len(x) / sr

# --- năng lượng theo khung 1/20 s
hop = sr // 20
n = len(x) // hop
frames = x[: n * hop].reshape(n, hop)
rms = np.sqrt((frames**2).mean(axis=1) + 1e-12)
db = 20 * np.log10(rms + 1e-9)

# --- phổ ngắn hạn để tính spectral flux (onset)
win = 2048
hop2 = 512
nw = (len(x) - win) // hop2
spec = np.abs(np.fft.rfft(np.stack([x[i * hop2 : i * hop2 + win] * np.hanning(win) for i in range(nw)]), axis=1))
logs = np.log1p(spec * 10)
flux = np.maximum(0, np.diff(logs, axis=0)).sum(axis=1)
flux = (flux - flux.mean()) / (flux.std() + 1e-9)
ft = (np.arange(len(flux)) + 1) * hop2 / sr
# tách dải: trống trầm (<150 Hz) và tiếng cao (>4 kHz) để nhận biết kick / hit / riser
freqs = np.fft.rfftfreq(win, 1 / sr)
low = np.maximum(0, np.diff(logs[:, freqs < 150], axis=0)).sum(axis=1)
high = np.maximum(0, np.diff(logs[:, freqs > 4000], axis=0)).sum(axis=1)


def peaks(sig, t, thr, gap):
    out, last = [], -9
    for i in range(1, len(sig) - 1):
        if sig[i] > thr and sig[i] >= sig[i - 1] and sig[i] >= sig[i + 1] and t[i] - last > gap:
            out.append(round(float(t[i]), 3))
            last = t[i]
    return out


onsets = peaks(flux, ft, 2.0, 0.12)
lowz = (low - low.mean()) / (low.std() + 1e-9)
kicks = peaks(lowz, ft, 2.0, 0.2)

# --- BPM bằng tự tương quan của flux
fps = sr / hop2
ac = np.correlate(flux, flux, mode="full")[len(flux) - 1 :]
lo, hi = int(fps * 60 / 180), int(fps * 60 / 70)
lag = lo + int(np.argmax(ac[lo:hi]))
bpm = 60 * fps / lag
beat = 60 / bpm
# pha nhịp: dịch sao cho tổng flux tại các vạch nhịp lớn nhất
best, phase = -1e9, 0.0
for ph in np.arange(0, beat, 0.01):
    idx = ((np.arange(ph, dur, beat)) * fps).astype(int)
    idx = idx[idx < len(flux)]
    s = flux[idx].sum()
    if s > best:
        best, phase = s, ph
beats = [round(float(b), 3) for b in np.arange(phase, dur, beat)]

# --- đoạn năng lượng (để biết intro / build / drop / outro)
sec = []
for s in range(int(np.ceil(dur))):
    seg = db[s * 20 : (s + 1) * 20]
    if len(seg):
        sec.append(round(float(seg.mean()), 1))

# --- ứng viên điểm vòng lặp: hai điểm cách nhau bội số 4 nhịp (1 ô nhịp) có phổ giống nhau nhất
chroma = logs / (np.linalg.norm(logs, axis=1, keepdims=True) + 1e-9)
cands = []
bar = 4 * beat
for a in beats:
    for k in (4, 8, 16):
        b = a + k * bar
        if b > dur - 2 or a < 2:
            continue
        ia, ib = int(a * fps), int(b * fps)
        L = int(1.0 * fps)
        if ib + L >= len(chroma):
            continue
        sim = float((chroma[ia : ia + L] * chroma[ib : ib + L]).sum(axis=1).mean())
        cands.append({"from": round(b, 3), "to": round(a, 3), "bars": k, "sim": round(sim, 4)})
cands.sort(key=lambda c: -c["sim"])

res = {
    "duration": round(dur, 3),
    "bpm": round(bpm, 2),
    "beat_sec": round(beat, 4),
    "beat_phase": round(phase, 3),
    "beats": beats,
    "onsets_strong": onsets,
    "kicks": kicks,
    "loudness_db_per_sec": sec,
    "loop_candidates": cands[:12],
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(res, f, ensure_ascii=False, indent=1)
print(json.dumps({k: res[k] for k in ("duration", "bpm", "beat_phase", "loudness_db_per_sec")}, ensure_ascii=False))
print("onsets", onsets)
print("kicks", kicks)
print("loops", cands[:6])
