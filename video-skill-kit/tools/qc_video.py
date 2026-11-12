"""Soát phim đã render, theo từng cảnh: python -I -X utf8 qc_video.py <video.mp4> <times.json>

times.json cần khóa "segs": [[id, giây bắt đầu, độ dài], ...] (sv-tool.mjs times ghi sẵn).
In ra cho mỗi cảnh:
  - lap-le %  : tỉ lệ khung lặp LẺ (mpdecimate max=1) = giật thật. Shot người thật phải 0%;
                cảnh đồ họa đứng yên cao là bình thường (chữ/số đã dừng).
  - lech-cat  : khoảng cách từ mốc cắt dự kiến tới điểm đổi cảnh thật gần nhất (≤ 0,07 s = ≤ 2 khung là đạt);
                "noi-lien" = không thấy vết cắt (chuyển cảnh liền mạch có chủ đích: mask, khớp khung trời...).
Cuối cùng: độ to tích hợp (LUFS), đỉnh, độ dài, fps, tổng khung. Chuẩn giao: −14 ±0,5 LUFS, đỉnh ≤ −1 dBFS, fps 30 cố định.
"""
import json
import re
import subprocess
import sys

FF = r"C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
video, times = sys.argv[1], sys.argv[2]
segs = json.load(open(times, encoding="utf8"))["segs"]


def run(args):
    return subprocess.run([FF, "-hide_banner", *args], capture_output=True, text=True, encoding="utf8", errors="replace").stderr


kept = {round(float(x) * 30) for x in re.findall(r"pts_time:([\d.]+)", run(["-i", video, "-an", "-vf", "scale=480:-1,mpdecimate=hi=128:lo=64:frac=0.1:max=1,showinfo", "-f", "null", "-"]))}
cuts = [float(x) for x in re.findall(r"pts_time:([\d.]+)", run(["-i", video, "-an", "-vf", "scale=320:-1,select='gt(scene,0.25)',showinfo", "-f", "null", "-"]))]
assert kept, "không đọc được khung nào — kiểm tra đường dẫn video"

for sid, a, d in segs:
    fr = range(round(a * 30) + 1, round((a + d) * 30))
    n = sum(1 for f in fr if f not in kept)
    near = [abs(c - a) for c in cuts if abs(c - a) < 0.5]
    off = f"{min(near):.2f}" if near else ("dau-phim" if a == 0 else "noi-lien")
    print(f"{sid:18} lap-le {n / max(1, len(fr)) * 100:5.1f}%  lech-cat {off}")

info = run(["-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"])
lufs = re.findall(r"^\s+I:\s+(-?[\d.]+) LUFS", info, re.M)
peak = re.findall(r"^\s+Peak:\s+(-?[\d.]+) dBFS", info, re.M)
head = run(["-i", video])
dur = re.search(r"Duration: ([\d:.]+)", head)
fps = re.search(r"([\d.]+) fps", head)
print(f"\nĐộ to {lufs[-1] if lufs else '?'} LUFS · đỉnh {peak[-1] if peak else '?'} dBFS · dài {dur.group(1) if dur else '?'} · {fps.group(1) if fps else '?'} fps")
