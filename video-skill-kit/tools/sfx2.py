"""Bộ SFX kiểu keynote/launch (tự tổng hợp, không bản quyền) → public/sfx/*.mp3

riser · impact · hit · whip · swoosh · tick · pop · glass · keys · shutter · swell · pen1-3 · sub
Dùng: python -I tools/sfx2.py
"""
import os
import subprocess
import wave

import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
FF = r"C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
rng = np.random.default_rng(11)


def t_(d):
    return np.arange(int(SR * d)) / SR


def bp(x, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return lfilter(b, a, x)


def lp(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), "low")
    return lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), "high")
    return lfilter(b, a, x)


def sweep_filter(x, f0, f1, kind="low", chunks=60):
    """Lọc có tần số cắt trượt từ f0 → f1 (theo từng khúc, nối mềm)."""
    n = len(x)
    out = np.zeros(n)
    fcs = np.geomspace(f0, f1, chunks)
    edges = np.linspace(0, n, chunks + 1).astype(int)
    for i, fc in enumerate(fcs):
        a, b = max(0, edges[i] - 512), edges[i + 1]
        y = (lp if kind == "low" else hp)(x[a:b], fc)
        out[edges[i] : b] = y[edges[i] - a :]
    return out


def stereo(x, width=0.0):
    """Ra stereo; width > 0 tạo độ rộng bằng trễ rất ngắn ở kênh phải."""
    d = int(width * SR)
    r = np.r_[np.zeros(d), x[: len(x) - d]] if d else x
    return np.c_[x, r]


def reverb(x, size=0.35, mix=0.25):
    """Vang giả bằng nhiều trễ dội (đủ cho SFX, không cần IR)."""
    y = x.copy()
    for k, (dl, g) in enumerate([(0.029, 0.6), (0.037, 0.55), (0.041, 0.5), (0.053, 0.45), (0.067, 0.4), (0.083, 0.35)]):
        d = int(dl * SR * (1 + size))
        tail = np.zeros(len(x) + d * 6)
        for m in range(1, 6):
            seg = x * (g**m)
            tail[d * m : d * m + len(x)] += seg
        y = np.r_[y, np.zeros(len(tail) - len(y))] + tail * mix / 6
    return lp(y, 7000)


def save(name, x, peak=0.9):
    if x.ndim == 1:
        x = stereo(x)
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    fade = min(len(x), int(0.01 * SR))
    x[-fade:] *= np.linspace(1, 0, fade)[:, None]
    wav = os.path.join(OUT, name + ".wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", wav, "-b:a", "192k", os.path.join(OUT, name + ".mp3")], check=True)
    os.remove(wav)
    print(f"{name:8s} {len(x) / SR:.2f}s")


# Riser 2,4 s: nhiễu trắng mở lọc dần + tông cao trượt lên, kết thúc gắt để rơi vào impact
d = 2.4
tt = t_(d)
nz = sweep_filter(rng.normal(0, 1, len(tt)), 300, 9000)
tone = sum(np.sin(2 * np.pi * np.cumsum(f0 * 2 ** (tt / d * 2)) / SR) for f0 in (220, 330.5, 441))
env = (tt / d) ** 2.2
save("riser", stereo(reverb((nz * 0.8 + tone * 0.25) * env, 0.6, 0.35), 0.012), 0.8)

# Impact: sub 45 Hz rơi + thân 120 Hz + lớp nhiễu sáng, đuôi vang dài
d = 2.2
tt = t_(d)
sub = np.sin(2 * np.pi * np.cumsum(45 + 40 * np.exp(-tt * 18)) / SR) * np.exp(-tt * 2.2)
body = np.sin(2 * np.pi * 120 * tt) * np.exp(-tt * 14) * 0.6
crack = hp(rng.normal(0, 1, len(tt)), 2500) * np.exp(-tt * 30) * 0.5
save("impact", stereo(reverb(sub + body + crack, 0.9, 0.4), 0.01), 0.95)

# Hit ngắn cho cắt montage: kick + tiếng búng kim loại
d = 0.5
tt = t_(d)
kick = np.sin(2 * np.pi * np.cumsum(55 + 120 * np.exp(-tt * 40)) / SR) * np.exp(-tt * 9)
snap = bp(rng.normal(0, 1, len(tt)), 1800, 6000) * np.exp(-tt * 45) * 0.6
save("hit", kick + snap, 0.85)

# Whip pan: nhiễu dải hẹp quét nhanh cao → thấp, 0,35 s
d = 0.38
tt = t_(d)
nz = rng.normal(0, 1, len(tt))
w = np.zeros(len(tt))
for i, f in enumerate(np.geomspace(5000, 600, 24)):
    a, b = int(i * len(tt) / 24), int((i + 1) * len(tt) / 24)
    w[a:b] = bp(nz[max(0, a - 400) : b], f * 0.7, f * 1.3)[a - max(0, a - 400) :]
save("whip", stereo(w * np.sin(np.pi * tt / d) ** 1.5, 0.006), 0.8)

# Swoosh mềm cho thẻ/cửa sổ bay vào (1 s, lên rồi xuống)
d = 1.0
tt = t_(d)
nz = rng.normal(0, 1, len(tt))
s = sweep_filter(nz, 400, 4000) * np.sin(np.pi * tt / d) ** 2
save("swoosh", stereo(reverb(s, 0.4, 0.2), 0.015), 0.7)

# Tick UI cho từng từ chữ hiện ra
d = 0.06
tt = t_(d)
save("tick", bp(rng.normal(0, 1, len(tt)), 3000, 9000) * np.exp(-tt * 140) + np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 90) * 0.4, 0.5)

# Pop mềm cho chip/nhãn
d = 0.18
tt = t_(d)
save("pop", np.sin(2 * np.pi * np.cumsum(300 + 900 * np.exp(-tt * 35)) / SR) * np.exp(-tt * 28), 0.6)

# Glass ping cho Metric Pill
d = 1.6
tt = t_(d)
g = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt * k) for f, a, k in ((1568, 1, 3.2), (2350, 0.5, 4.5), (3920, 0.25, 7), (5274, 0.12, 9)))
save("glass", stereo(reverb(g, 0.5, 0.3), 0.008), 0.6)

# Gõ phím: chuỗi 10 tiếng phím ngẫu nhiên trong 1,4 s
d = 1.4
x = np.zeros(int(SR * d))
for k in range(10):
    s0 = int((k * 0.13 + rng.uniform(-0.03, 0.03) + 0.02) * SR)
    tt = t_(0.05)
    key = bp(rng.normal(0, 1, len(tt)), 1500, 7000) * np.exp(-tt * 160) + np.sin(2 * np.pi * rng.uniform(180, 260) * tt) * np.exp(-tt * 120) * 0.5
    x[s0 : s0 + len(key)] += key * rng.uniform(0.6, 1)
save("keys", x, 0.55)

# Màn trập máy ảnh (2 tiếng cơ khí sát nhau)
d = 0.22
x = np.zeros(int(SR * d))
for s0, g in ((0, 1), (0.07, 0.7)):
    tt = t_(0.06)
    c = bp(rng.normal(0, 1, len(tt)), 900, 5000) * np.exp(-tt * 110) * g
    x[int(s0 * SR) : int(s0 * SR) + len(c)] += c
save("shutter", x, 0.6)

# Swell: cymbal ngược 1,6 s dẫn vào chuyển cảnh lớn
d = 1.6
tt = t_(d)
cym = hp(rng.normal(0, 1, len(tt)), 4000) * np.exp(-(d - tt) * 3.5)
save("swell", stereo(cym, 0.01), 0.6)

# Tiếng bút dạ trên bảng: 3 biến thể dài 0,25-0,7 s (nhiễu dải giữa, có độ "rít")
for k, d in enumerate((0.28, 0.45, 0.7), 1):
    tt = t_(d)
    nz = bp(rng.normal(0, 1, len(tt)), 900, 4200)
    squeak = np.sin(2 * np.pi * np.cumsum(rng.uniform(1700, 2300) + 200 * np.sin(2 * np.pi * 3 * tt)) / SR) * 0.08
    amp = (0.65 + 0.35 * np.sin(2 * np.pi * rng.uniform(5, 9) * tt + rng.uniform(0, 6))) * np.minimum(1, tt / 0.03) * np.minimum(1, (d - tt) / 0.06)
    save(f"pen{k}", (nz + squeak) * amp, 0.45)

# Sub drop dưới khung logo
d = 1.8
tt = t_(d)
save("sub", np.sin(2 * np.pi * np.cumsum(70 - 35 * tt / d) / SR) * np.exp(-tt * 1.8) * np.minimum(1, tt / 0.02), 0.9)
