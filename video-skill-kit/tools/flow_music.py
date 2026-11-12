"""Kéo dài nhạc nền tham chiếu đến đúng thời lượng video bằng cách lặp theo ô nhịp (không nghe ra chỗ nối).

Bố cục: [intro 0→A] + [thân A→L1] + n × [vòng L0→L1] + [phần lẻ L0→L0+p] + [outro O→hết]
mọi điểm nối nằm trên vạch ô nhịp, nối chéo 40 ms. Ghi kèm JSON lưới nhịp theo thời gian của bản mới
để Remotion cắt hình đúng phách.

Dùng: python -I tools/flow_music.py <nguồn.wav> <thời lượng giây> <ra.mp3> [hết intro (s)] [vào outro (s)]
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np

FF = r"C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
src, target, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]

with wave.open(src) as w:
    sr = w.getframerate()
    ch = w.getnchannels()
    st = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32).reshape(-1, ch) / 32768
mono = st.mean(axis=1)
dur = len(mono) / sr

# ---- flux phổ
win, hop = 2048, 256
nw = (len(mono) - win) // hop
spec = np.abs(np.fft.rfft(np.stack([mono[i * hop : i * hop + win] * np.hanning(win) for i in range(nw)]), axis=1))
logs = np.log1p(spec * 10)
flux = np.concatenate([[0], np.maximum(0, np.diff(logs, axis=0)).sum(axis=1)])
freqs = np.fft.rfftfreq(win, 1 / sr)
lowflux = np.concatenate([[0], np.maximum(0, np.diff(logs[:, freqs < 150], axis=0)).sum(axis=1)])
fps = sr / hop


def grid_score(sig, period, phase):
    idx = (np.arange(phase, dur - 0.05, period) * fps).astype(int)
    return sig[idx].mean()


# ---- chu kỳ phách (quarter) tinh chỉnh: 80-100 BPM
best = (-1, 0, 0)
for period in np.arange(0.60, 0.75, 0.0005):
    for phase in np.arange(0, period, 0.004):
        s = grid_score(flux, period, phase)
        if s > best[0]:
            best = (s, period, phase)
_, beat, phase = best
# ---- phách mạnh của ô nhịp: vị trí trong 4 phách có tiếng trầm lớn nhất
pos = max(range(4), key=lambda k: grid_score(lowflux, 4 * beat, phase + k * beat))
bar = 4 * beat
bar0 = (phase + pos * beat) % bar
bars = np.arange(bar0, dur, bar)


def near_bar(t):
    return float(bars[np.argmin(np.abs(bars - t))])


norm = logs / (np.linalg.norm(logs, axis=1, keepdims=True) + 1e-9)


def sim(a, b, L=2.0):
    ia, ib, n = int(a * fps), int(b * fps), int(L * fps)
    if ib + n >= len(norm) or ia + n >= len(norm):
        return -1
    return float((norm[ia : ia + n] * norm[ib : ib + n]).sum(axis=1).mean())


# mặc định theo video Flow: 6,84 s là vết cắt đầu tiên (hết intro), 52,8 s là "Start creating." (vào outro)
A = near_bar(float(sys.argv[4]) if len(sys.argv) > 4 else 6.84)
O = near_bar(float(sys.argv[5]) if len(sys.argv) > 5 else min(52.8, dur - 6))
# vòng lặp dài nhất có độ giống cao: L0 ∈ [A, 30], L1 ∈ [L0 + 8 ô, O]
loop = None
for l0 in bars[(bars >= A) & (bars <= 30)]:
    for l1 in bars[(bars >= l0 + 8 * bar) & (bars <= O)]:
        s = sim(l0, l1) + 0.002 * (l1 - l0)  # ưu tiên vòng dài để ít lặp
        if loop is None or s > loop[0]:
            loop = (s, float(l0), float(l1))
_, L0, L1 = loop

segs = []  # (srcFrom, srcTo)
if target <= dur:
    # ngắn hơn bản gốc: intro + một phần thân + outro
    body = max(0.0, target - A - (dur - O))
    nb = int(round(body / bar))
    segs = [(0, A + nb * bar), (O, dur)] if nb > 0 else [(0, A), (O, dur)]
else:
    segs = [(0, L1)]
    total = L1 + (dur - O)
    loopLen = L1 - L0
    while total + loopLen <= target:
        segs.append((L0, L1))
        total += loopLen
    rest = target - total
    p = int(round(rest / bar))
    if p > 0:
        segs.append((L0, L0 + p * bar))
    segs.append((O, dur))

# ---- ghép với nối chéo equal-power 40 ms, điểm nối đặt sớm 15 ms trước vạch để giữ tiếng đánh
XF = int(0.04 * sr)
PRE = int(0.015 * sr)
outbuf = np.zeros((0, ch), dtype=np.float32)
track_segs = []
for i, (a, b) in enumerate(segs):
    ia = max(0, int(a * sr) - (PRE if i else 0))
    ib = min(len(st), int(b * sr) - PRE + XF) if i < len(segs) - 1 else len(st)
    piece = st[ia:ib].copy()
    if len(outbuf) == 0:
        track_segs.append({"t": 0.0, "src": round(ia / sr, 4)})
        outbuf = piece
        continue
    k = np.linspace(0, np.pi / 2, XF)[:, None]
    tail = outbuf[-XF:] * np.cos(k)
    head = piece[:XF] * np.sin(k)
    track_segs.append({"t": round((len(outbuf) - XF) / sr, 4), "src": round(ia / sr, 4)})
    outbuf = np.concatenate([outbuf[:-XF], tail + head, piece[XF:]])

total = len(outbuf) / sr


def src_to_track_grid():
    """Lưới phách theo thời gian bản mới (mỗi đoạn mang lưới gốc theo)."""
    out_beats, out_bars = [], []
    for j, s in enumerate(track_segs):
        t0, s0 = s["t"], s["src"]
        t1 = track_segs[j + 1]["t"] if j + 1 < len(track_segs) else total
        for g, lst in ((beat, out_beats), (bar, out_bars)):
            base = bar0 % g
            k0 = np.ceil((s0 - base) / g)
            tt = base + k0 * g
            while t0 + (tt - s0) < t1:
                lst.append(round(t0 + (tt - s0), 4))
                tt += g
    return sorted(set(out_beats)), sorted(set(out_bars))


tb, tbar = src_to_track_grid()
outro_at = round(total - (dur - O), 4)

wav = os.path.splitext(out)[0] + ".tmp.wav"
pcm = (np.clip(outbuf, -1, 1) * 32767).astype(np.int16)
with wave.open(wav, "wb") as w:
    w.setnchannels(ch)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes(pcm.tobytes())
subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "192k", out], check=True)
os.remove(wav)

meta = {
    "source": os.path.basename(src),
    "duration": round(total, 4),
    "bpm": round(60 / beat, 3),
    "beat": round(beat, 5),
    "bar": round(bar, 5),
    "introEnd": round(A, 4),
    "loop": [round(L0, 4), round(L1, 4)],
    "outroAt": outro_at,
    "segments": track_segs,
    "beats": tb,
    "bars": tbar,
}
with open(os.path.splitext(out)[0] + ".json", "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=1)
print(json.dumps({k: meta[k] for k in ("duration", "bpm", "introEnd", "loop", "outroAt", "segments")}, indent=1))
