"""Nhạc nền tự tổng hợp cho phim SV_STARTUP (không bản quyền): python -I tools/sv_music.py public/sv/times.json public/sv/music.wav
Đọc times.json (node tools/sv-tool.mjs times): phần 1 (0 → snap) La thứ, căng, nhịp đồng hồ;
phần 2 (snap → outro) Đô trưởng C–G–Am–F, trống 4/4, bass, pad, arp; snap rơi đúng phách 1; phần kết ngân hợp âm."""
import json
import sys
import wave

import numpy as np

SR = 48000
BPM = 100
BEAT = 60 / BPM
t_info = json.load(open(sys.argv[1], encoding="utf8"))
TOTAL, SNAP, OUTRO = t_info["total"], t_info["snap"], t_info["outro"]
N = int((TOTAL + 2) * SR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


# lọc qua FFT với biên độ kiểu Butterworth bậc 2 (scipy cài sẵn lệch phiên bản numpy nên không dùng)
def _filt(x, gain):
    f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-9
    return np.fft.irfft(np.fft.rfft(x) * gain(f), len(x))


def lp(x, fc):
    return _filt(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** 4))


def hp(x, fc):
    return _filt(x, lambda f: 1 / np.sqrt(1 + (fc / f) ** 4))


def bp(x, a, b):
    return hp(lp(x, b), a)


def saw(f, n, harm=14):
    t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, harm + 1) if f * k < 12000) * 0.6


def env(n, a=0.005, r=0.1, hold=None):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    if hold is None:  # nhả theo hàm mũ suốt nốt
        e[na:] = np.exp(-np.arange(n - na) / (r * SR))
    else:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def put(sig, at, gl=1.0, gr=None):
    i = int(at * SR)
    if i >= N or i + len(sig) <= 0:
        return
    s = sig[: N - i]
    L[i : i + len(s)] += s * gl
    R[i : i + len(s)] += s * (gl if gr is None else gr)


# ---------- phần 1: căng (La thứ), 0 → SNAP
n1 = int(SNAP * SR)
t = np.arange(n1) / SR
swell = np.clip(t / SNAP, 0, 1) ** 1.5
drone = (np.sin(2 * np.pi * hz(45) * t) * 0.5 + lp(saw(hz(52), n1, 6), 500) * 0.35) * (0.10 + 0.12 * swell)
drone *= np.minimum(1, t / 2.0) * np.minimum(1, (SNAP - 0.35 - t).clip(0) / 0.25)  # vào mềm, cắt lặng 0,35 s trước snap
put(drone, 0, 1.0, 0.92)
# nhịp đồng hồ mỗi phách, đếm ngược từ snap để khớp lưới
k = 1
while SNAP - k * BEAT > 0.5:
    at = SNAP - k * BEAT
    n = int(0.05 * SR)
    put(hp(rng.standard_normal(n), 3000) * env(n, 0.001, 0.012) * (0.10 if k % 2 else 0.06), at)
    k += 1
# pluck La thứ móc 8 nốt từ giây 17 (lúc vào câu về AI), dày dần
arp = [57, 60, 64, 69, 64, 60, 57, 52]
k = 1
while SNAP - k * BEAT / 2 > 17:
    at = SNAP - k * BEAT / 2
    if at < SNAP - 0.4:
        n = int(0.4 * SR)
        f = hz(arp[k % len(arp)])
        sig = lp(saw(f, n, 8), 2200) * env(n, 0.003, 0.12) * (0.05 + 0.05 * (at / SNAP))
        put(sig, at, 0.8 if k % 2 else 1.0, 1.0 if k % 2 else 0.8)
    k += 1

# ---------- phần 2: bừng sáng (Đô trưởng), SNAP → OUTRO
CHORDS = [[48, 52, 55, 60], [43, 47, 50, 55], [45, 48, 52, 57], [41, 45, 48, 53]]  # C G Am F
bars = int((OUTRO - SNAP) / (4 * BEAT)) + 1
for b in range(bars):
    t0 = SNAP + b * 4 * BEAT
    if t0 >= OUTRO:
        break
    ch = CHORDS[b % 4]
    nb = int(4 * BEAT * SR)
    pad = sum(lp(saw(hz(m + 12), nb, 10), 1600) for m in ch[1:]) * env(nb, 0.25, 0.3, hold=True) * 0.035
    put(pad, t0, 1.0, 0.0)
    pad2 = sum(lp(saw(hz(m + 12) * 1.004, nb, 10), 1600) for m in ch[1:]) * env(nb, 0.25, 0.3, hold=True) * 0.035
    put(pad2, t0, 0.0, 1.0)
    for q in range(8):  # bass móc 8 nốt
        at = t0 + q * BEAT / 2
        if at >= OUTRO:
            break
        n = int(BEAT / 2 * SR * 0.9)
        put(lp(saw(hz(ch[0] - 12), n, 12), 380) * env(n, 0.004, 0.18) * 0.22, at)
    for q in range(8):  # arp trên
        at = t0 + q * BEAT / 2
        if at >= OUTRO:
            break
        n = int(0.35 * SR)
        m = ch[[1, 2, 3, 2, 1, 2, 3, 2][q]] + 24
        put(lp(saw(hz(m), n, 6), 3000) * env(n, 0.002, 0.09) * 0.035, at, 1.0 if q % 2 else 0.7, 0.7 if q % 2 else 1.0)
    for q in range(4):  # trống
        at = t0 + q * BEAT
        if at >= OUTRO:
            break
        n = int(0.35 * SR)
        tt = np.arange(n) / SR
        kick = np.sin(2 * np.pi * np.cumsum(48 + 90 * np.exp(-tt / 0.03)) / SR) * env(n, 0.001, 0.12)
        put(kick * 0.42, at)
        if q in (1, 3):
            nn = int(0.2 * SR)
            put(bp(rng.standard_normal(nn), 900, 4000) * env(nn, 0.001, 0.05) * 0.16, at)
        for h in (0.5,):
            nn = int(0.06 * SR)
            put(hp(rng.standard_normal(nn), 6000) * env(nn, 0.001, 0.02) * 0.07, at + h * BEAT, 0.8, 1.0)

# ---------- kết: hợp âm Đô ngân dài + một tiếng trống
n = int((TOTAL + 1.5 - OUTRO) * SR)
fin = sum(lp(saw(hz(m + 12), n, 10), 1500) for m in [48, 52, 55, 60, 64]) * env(n, 0.05, 2.5) * 0.06
put(fin, OUTRO)
put(np.sin(2 * np.pi * 45 * np.arange(int(0.8 * SR)) / SR) * env(int(0.8 * SR), 0.001, 0.25) * 0.4, OUTRO)

st = np.stack([L, R], 1)[: int(TOTAL * SR)]
st *= 10 ** (-1 / 20) / np.abs(st).max()
assert np.isfinite(st).all() and abs(len(st) / SR - TOTAL) < 0.01
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print("ok", sys.argv[2], f"{TOTAL:.2f}s snap {SNAP:.2f}")
