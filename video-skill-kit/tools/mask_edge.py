"""Đo mép một người/vật đi ngang khung để làm mặt nạ chuyển cảnh (masking transition) khớp thật:
python -I -X utf8 mask_edge.py <clip.mp4> <giây từ> <giây đến> <ra.json> [left|right]

Nền = trung vị của CẢ clip (người đi ngang chỉ chiếm một đoạn ngắn nên trung vị gần như nền trống;
KHÔNG dùng vài khung đầu làm nền — máy hơi trôi/đổi sáng là mọi cột đều "khác").
Mỗi khung: cột nào có > 25% điểm ảnh lệch nền > 35 (bỏ phần trời phía trên) là có người.
left  = mép TRÁI của người (người đi trái → phải, cảnh sau lộ ra bên trái, sau lưng người)
right = mép PHẢI (người đi phải → trái).
Ghi [[giây clip, mép 0–1 bề ngang], ...], mép chỉ đi một chiều, lùi vào 1% để mặt nạ luôn nằm sau người.
Dùng trong Remotion: interpolate(giây clip, bảng) → mask-image linear-gradient(90deg, #000 e−1.5%, transparent e%).
"""
import json
import subprocess
import sys

import numpy as np

FF = r"C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
clip, t0, t1, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
side = sys.argv[5] if len(sys.argv) > 5 else "left"
W, H = 480, 270
raw = subprocess.run([FF, "-v", "error", "-i", clip, "-vf", f"scale={W}:{H},fps=30,format=gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
bg = np.median(fr, axis=0)
rows = []
last = 0.0
for i in range(len(fr)):
    t = i / 30
    if t < t0 or t > t1:
        continue
    occ = np.where(((np.abs(fr[i] - bg) > 35)[H // 5 :, :].mean(axis=0)) > 0.25)[0]
    if side == "left":
        e = (occ.min() / W) if len(occ) else (1.0 if last > 0.5 else 0.0)
    else:  # mép phải đi từ 1 về 0 → đổi sang "đã quét" 0–1 cho cùng một kiểu dùng
        e = (1 - occ.max() / W) if len(occ) else (1.0 if last > 0.5 else 0.0)
    e = max(last, e)  # mép chỉ tiến một chiều
    last = e
    rows.append([round(t, 3), round(max(0.0, e - 0.01), 3)])
assert rows and all(b[1] >= a[1] for a, b in zip(rows, rows[1:])), "không đo được mép — xem lại khoảng giây"
json.dump(rows, open(out, "w"))
print(f"{len(rows)} khung, mép {rows[0][1]:.2f} → {rows[-1][1]:.2f}; người vào khung lúc ~{next((r[0] for r in rows if r[1] > 0.02), rows[0][0]):.2f} s")
