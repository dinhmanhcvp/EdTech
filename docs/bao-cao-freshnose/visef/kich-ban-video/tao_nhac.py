"""Nhạc nền tự tổng hợp (miễn phí bản quyền) cho phim ViSEF theo mốc timeline.json:
không khí nhẹ → riser → DROP đúng lúc sản phẩm 3D xuất hiện → nhịp đều 96 BPM (La thứ–Fa–Đô–Son) → đoạn LẮNG (chỉ pad) ở phần kết quả
→ nhịp trở lại → hợp âm kết → im lặng. python -I -X utf8 tao_nhac.py"""
import json
import os
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, '..', '..', '..', '..', 'socratic-video', 'public', 'fn', 'visef')
M = json.load(open(os.path.join(PUB, 'timeline.json'), encoding='utf8'))['markers']
SR, BPM = 48000, 96
BEAT = 60 / BPM
TOTAL = M['total'] + 0.5
N = int(TOTAL * SR)
L, R = np.zeros(N), np.zeros(N)
rng = np.random.default_rng(11)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def add(sig, t0, pan=0.0, g=1.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i] * g
    L[i:i + len(sig)] += sig * (1 - pan) * 0.7
    R[i:i + len(sig)] += sig * (1 + pan) * 0.7


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def tone(m, dur, harm=(1, 0.4, 0.15), det=0.0):
    t = np.arange(int(dur * SR)) / SR
    return sum(a * np.sin(2 * np.pi * hz(m) * (k + 1) * (1 + det) * t) for k, a in enumerate(harm))


def lp(x, fc):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (f / fc) ** 4), len(x))


CH = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (43, [55, 59, 62])]
# 1) không khí trước drop
pad = lp(tone(57, M['drop'], (1, 0.3)) + 0.6 * tone(64, M['drop'], (1, 0.2), 0.002), 1200)
add(pad * np.minimum(1, np.arange(len(pad)) / SR / 1.2), 0, 0, 0.08)
# 2) drop
nb = int(2.2 * SR)
tb = np.arange(nb) / SR
add(np.sin(2 * np.pi * (55 * np.exp(-tb * 3) + 32) * tb) * np.exp(-tb * 1.5), M['drop'], 0, 0.6)
# 3) nhịp chính, lắng [lullA, lullB], dừng ở outro
kn = int(0.32 * SR)
tk = np.arange(kn) / SR
KICK = np.sin(2 * np.pi * (44 + 100 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 10)
HAT = lp(rng.standard_normal(int(0.04 * SR)), 9000) * env(int(0.04 * SR), 0.0005, 0.012)
HAT -= lp(HAT, 5000)
bar = 4 * BEAT
b = 0
t0 = M['drop']
while t0 < M['outro']:
    bass, chord = CH[b % 4]
    lull = M['lullA'] <= t0 < M['lullB']
    p = sum(tone(m, bar, (1, 0.25), 0.002 * i) for i, m in enumerate(chord))
    add(lp(p, 1300) * env(int(bar * SR), 0.4, 3.5), t0, 0, 0.06 if lull else 0.045)
    if not lull:
        for q in range(4):
            add(KICK, t0 + q * BEAT, 0, 0.26)
            for e in range(2):
                add(HAT, t0 + q * BEAT + e * BEAT / 2 + BEAT / 4, 0.35, 0.07)
            add(lp(tone(bass, BEAT * 0.9, (1, 0.5, 0.2)), 420) * env(int(BEAT * 0.9 * SR), 0.005, 0.3), t0 + q * BEAT, 0, 0.16)
        for s in range(8):
            m = chord[[0, 1, 2, 1, 2, 0, 1, 2][s]] + 12
            add(tone(m, 0.32, (1, 0.2)) * env(int(0.32 * SR), 0.002, 0.1), t0 + s * BEAT / 2, 0.3 * (-1) ** s, 0.04)
    b += 1
    t0 += bar
# 4) hợp âm kết, tắt trước 2 s im lặng
od = M['end'] - M['outro']
add(lp(sum(tone(m, od, (1, 0.3)) for m in [45, 57, 60, 64, 69]), 2000) * env(int(od * SR), 0.05, od / 2.5), M['outro'], 0, 0.1)
mix = np.stack([L, R], 1)
mix /= max(1e-9, np.abs(mix).max()) / 0.89
with wave.open(os.path.join(PUB, 'music.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok', TOTAL)
