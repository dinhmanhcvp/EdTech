"""Giọng đọc TẠM (edge-tts, giọng Microsoft) cho từng cảnh của canh.py để căn nhịp dựng; thay bằng giọng thật của nhóm trước khi nộp.
python -I -X utf8 tao_giong_tam.py  →  socratic-video/public/fn/visef/vo-<mã>.mp3 + vo.json (độ dài giây)
VO 1, VO 3: giọng nữ HoaiMy; VO 2, VO 4: giọng nam NamMinh. Dịch vụ hay trả rỗng → thử lại tối đa 6 lần."""
import json
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from canh import CANH  # noqa: E402

OUT = os.path.join(HERE, '..', '..', '..', '..', 'socratic-video', 'public', 'fn', 'visef')
FF = r'C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
VOICE = {'VO 1': 'vi-VN-HoaiMyNeural', 'VO 3': 'vi-VN-HoaiMyNeural', 'VO 2': 'vi-VN-NamMinhNeural', 'VO 4': 'vi-VN-NamMinhNeural'}


def doc_so(s):
    s = re.sub(r'(\d)\.(\d{3})', r'\1\2', s)            # 4.500 → 4500
    s = re.sub(r'(\d),(\d)', r'\1 phẩy \2', s)          # 25,4 → 25 phẩy 4
    s = s.replace('%', ' phần trăm').replace('ESP32', 'E S P ba mươi hai').replace('LoRa', 'Lo-Ra')
    return re.sub(r'\s+', ' ', s).strip()


def dur(path):
    out = subprocess.run([FF, '-i', path], capture_output=True, text=True).stderr
    h, m, sec = re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).groups()
    return int(h) * 3600 + int(m) * 60 + float(sec)


os.makedirs(OUT, exist_ok=True)
info = {}
for ma, _, nguoi, loi, *_ in CANH:
    if not loi:
        continue
    f = os.path.join(OUT, f'vo-{ma}.mp3')
    if not (os.path.exists(f) and os.path.getsize(f) > 0):
        for k in range(10):
            try:
                subprocess.run([sys.executable, '-m', 'edge_tts', '--voice', VOICE[nguoi], '--rate=+4%', '--text', doc_so(loi), '--write-media', f], capture_output=True, timeout=45)
            except subprocess.TimeoutExpired:
                pass  # dịch vụ treo: thử lại
            if os.path.exists(f) and os.path.getsize(f) > 0:
                break
            time.sleep(3 + 2 * k)
    assert os.path.getsize(f) > 0, f'không tạo được giọng cảnh {ma}'
    info[ma] = round(dur(f), 2)
    print(ma, info[ma])
json.dump(info, open(os.path.join(OUT, 'vo.json'), 'w', encoding='utf8'), indent=1)
print('tong', round(sum(info.values()), 1))
