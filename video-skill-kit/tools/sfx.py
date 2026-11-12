"""Tạo bộ âm thanh xúc giác + nhạc nền (tự tổng hợp, không bản quyền) vào public/sfx."""
import os
import subprocess
import wave
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
FF = r"C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t_(d):
    return np.linspace(0, d, int(SR * d), endpoint=False)


def env(n, a=0.005, r=0.1):
    e = np.ones(n)
    na = max(1, int(SR * a))
    nr = max(1, int(SR * r))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.zeros_like(x)
    p = 0.0
    for i in range(len(x)):
        p = (1 - a) * x[i] + a * p
        y[i] = p
    return y


def highpass(x, fc):
    return x - lowpass(x, fc)


def save(name, x, gain=0.9):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    pcm = (x * 32767).astype(np.int16)
    wav = os.path.join(OUT, name + ".wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    mp3 = os.path.join(OUT, name + ".mp3")
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", wav, "-b:a", "160k", mp3], check=True)
    os.remove(wav)
    print(name, f"{len(x) / SR:.2f}s")


# Tiếng phấn viết sột soạt (nhiễu băng cao, nhịp rung nhanh)
d = 0.95
n = int(SR * d)
nz = highpass(rng.normal(0, 1, n), 2500)
nz = lowpass(nz, 9000)
amp = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 9 * t_(d))) * (0.6 + 0.4 * np.sin(2 * np.pi * 2.3 * t_(d)))
save("chalk", nz * amp * env(n, 0.03, 0.2), 0.55)

# Whoosh trầm khi khoanh Magic Lasso
d = 0.9
n = int(SR * d)
nz = rng.normal(0, 1, n)
sweep = np.zeros(n)
for i, fc in enumerate(np.linspace(300, 3200, 12)):
    s0, s1 = int(i * n / 12), int((i + 1) * n / 12)
    sweep[s0:s1] = lowpass(nz[s0:s1], fc)
sweep = lowpass(sweep, 3500)
bump = np.sin(np.linspace(0, np.pi, n)) ** 2
save("whoosh", sweep * bump * env(n, 0.05, 0.25), 0.8)

# Click cơ học nhẹ
n = int(SR * 0.12)
tt = t_(0.12)
click = rng.normal(0, 1, n) * np.exp(-tt * 700)
click = highpass(click, 1800)
thump = np.sin(2 * np.pi * 170 * tt) * np.exp(-tt * 60) * 0.5
save("click", click + thump, 0.7)

# Ding xác minh (SymPy verified)
d = 0.9
tt = t_(d)
ding = (np.sin(2 * np.pi * 988 * tt) + 0.5 * np.sin(2 * np.pi * 1480 * tt) + 0.25 * np.sin(2 * np.pi * 1976 * tt)) * np.exp(-tt * 5.5)
save("ding", ding * env(len(tt), 0.002, 0.2), 0.7)

# Thud trầm khi khiên Socratic chặn
d = 0.7
tt = t_(d)
thud = np.sin(2 * np.pi * (95 - 30 * tt) * tt) * np.exp(-tt * 7) + 0.3 * rng.normal(0, 1, len(tt)) * np.exp(-tt * 40)
thud = lowpass(thud, 700)
save("thud", thud, 0.9)

# Cảnh báo lệch (hai tiếng bíp thấp)
d = 0.55
tt = t_(d)
b = np.sign(np.sin(2 * np.pi * 330 * tt)) * 0.4 + np.sin(2 * np.pi * 330 * tt) * 0.6
gate = ((tt % 0.27) < 0.17).astype(float)
save("warn", lowpass(b * gate, 1800) * env(len(tt), 0.005, 0.1), 0.6)

# Shimmer biên dịch AI (arpeggio lên)
d = 0.8
x = np.zeros(int(SR * d))
for i, f in enumerate([660, 880, 1100, 1320, 1760]):
    s0 = int(i * 0.07 * SR)
    seg = t_(d - i * 0.07)
    note = np.sin(2 * np.pi * f * seg) * np.exp(-seg * 7)
    x[s0 : s0 + len(note)] += note
save("shimmer", x, 0.55)

# Mic bắt đầu thu
d = 0.25
tt = t_(d)
save("blip", np.sin(2 * np.pi * 740 * tt) * env(len(tt), 0.004, 0.08), 0.5)

# Tiếng thanh trượt mềm (tick liên tục ngắn)
d = 0.35
n = int(SR * d)
tt = t_(d)
nz = highpass(rng.normal(0, 1, n), 3000) * (np.abs(np.sin(2 * np.pi * 35 * tt)) > 0.7)
save("slide", lowpass(nz, 8000) * env(n, 0.01, 0.1), 0.25)

# Chime thành công (cộng điểm Eureka)
d = 1.8
x = np.zeros(int(SR * d))
for i, f in enumerate([523, 659, 784, 1047]):
    s0 = int(i * 0.11 * SR)
    seg = t_(d - i * 0.11)
    note = (np.sin(2 * np.pi * f * seg) + 0.4 * np.sin(2 * np.pi * 2 * f * seg)) * np.exp(-seg * 2.8)
    x[s0 : s0 + len(note)] += note
save("chime", x, 0.75)

# Nhạc nền ambient (pad chậm, Am - F - C - G), 190 giây
D = 190
tt = t_(D)
chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]]
pad = np.zeros_like(tt)
seg_len = 12.0
for i in range(int(D / seg_len) + 1):
    s0, s1 = int(i * seg_len * SR), min(len(tt), int((i + 1) * seg_len * SR + SR * 2))
    if s0 >= len(tt):
        break
    ch = chords[i % 4]
    loc = tt[s0:s1] - tt[s0]
    e = np.minimum(1, loc / 3.0) * np.minimum(1, (loc[-1] - loc) / 3.0)
    for f in ch:
        for det in (-0.6, 0.0, 0.6):
            pad[s0:s1] += np.sin(2 * np.pi * (f + det) * tt[s0:s1]) * e * 0.12
    pad[s0:s1] += np.sin(2 * np.pi * (ch[0] / 2) * tt[s0:s1]) * e * 0.18
pad *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.08 * tt)
pad = lowpass(pad, 1800)
pad *= np.minimum(1, tt / 4) * np.minimum(1, (D - tt) / 6)
save("music", pad, 0.5)
