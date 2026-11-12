"""Giọng TẠM (edge-tts) + dòng thời gian cho phim KHKT:  python -I -X utf8 tao_timeline.py
canh.py  →  socratic-video/public/khkt/vo-<mã>.mp3 + timeline.json (Remotion đọc).
Thay giọng thật: bỏ file thật cùng tên vo-<mã>.<đuôi> vào cùng thư mục (mp3/m4a/wav), xoá mục cache rồi chạy lại.
Dịch vụ edge-tts hay trả rỗng → thử lại tối đa 6 lần; không được thì ước lượng theo số âm tiết."""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from canh import CANH  # noqa: E402

PUB = os.path.normpath(os.path.join(HERE, '..', '..', 'socratic-video', 'public', 'khkt'))
FF = r'C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
VOICE = {'VO 1': 'vi-VN-HoaiMyNeural', 'VO 3': 'vi-VN-HoaiMyNeural', 'VO 2': 'vi-VN-NamMinhNeural', 'VO 4': 'vi-VN-NamMinhNeural'}
STOCK = {'2.1': 'classroom', '2.3': 'students', '7.1': 'rural'}  # public/khkt/stock/<tên>.mp4 (+ .txt ghi công)
LEAD, TAIL, OUTRO = 0.6, 0.7, 4.5
MAX_DONG = 42


def noi(s):
    s = s.replace('**', '').replace('//', '. ').replace('/', ',')
    s = s.replace('R-L-C', 'e rờ, e lờ, xê').replace('-', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def dur(path):
    out = subprocess.run([FF, '-i', path], capture_output=True, text=True).stderr
    h, m, sec = re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).groups()
    return int(h) * 3600 + int(m) * 60 + float(sec)


def dong(text):
    out, cur = [], ''
    for w in text.split():
        if cur and len(cur) + 1 + len(w) > MAX_DONG:
            out.append(cur)
            cur = w
        else:
            cur = f'{cur} {w}'.strip()
    return out + ([cur] if cur else [])


def khung(text):
    d = dong(text)
    k = -(-len(d) // 2)
    cut = [round(i * len(d) / k) for i in range(k + 1)]
    return ['\n'.join(d[cut[i]:cut[i + 1]]) for i in range(k)]


os.makedirs(PUB, exist_ok=True)
segs, t = [], 0.0
for ma, doan, nguoi, doc, phude, loai, hinh, chu, am, nguon, tomin in CANH:
    vo, vd, subs = [], 0.0, []
    if doc.strip():
        f = os.path.join(PUB, f'vo-{ma}.mp3')
        for _ in range(6):
            if os.path.exists(f) and os.path.getsize(f) > 0:
                break
            subprocess.run([sys.executable, '-m', 'edge_tts', '--voice', VOICE[nguoi], '--rate=-4%', '--text', noi(doc), '--write-media', f], capture_output=True)
        if os.path.exists(f) and os.path.getsize(f) > 0:
            vd = dur(f)
            vo = [{'file': f'vo-{ma}.mp3', 'at': LEAD}]
        else:
            vd = len(doc.split()) / 2.4
        ks = khung(phude)
        tot, a = sum(len(x) for x in ks), LEAD
        for x in ks:
            d = vd * len(x) / tot
            subs.append([round(a, 3), round(a + d, 3), x])
            a += d
    d = max(tomin, (LEAD + vd + TAIL) if vd else 0)
    stock = None
    if ma in STOCK and os.path.exists(os.path.join(PUB, 'stock', STOCK[ma] + '.mp4')):
        cr = os.path.join(PUB, 'stock', STOCK[ma] + '.txt')
        stock = {'k': STOCK[ma], 'credit': open(cr, encoding='utf-8').read().strip() if os.path.exists(cr) else ''}
    segs.append({'id': ma, 'doan': doan, 'start': round(t, 3), 'dur': round(d, 3), 'vo': vo, 'subs': subs, 'stock': stock})
    t += d
segs.append({'id': 'outro', 'doan': 8, 'start': round(t, 3), 'dur': OUTRO, 'vo': [], 'subs': [], 'stock': None})
t += OUTRO
json.dump({'segments': segs, 'total': round(t, 3)}, open(os.path.join(PUB, 'timeline.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
m, s = divmod(t, 60)
print(f'timeline: {len(segs)} đoạn, {int(m)}:{s:04.1f}' + ('  CẢNH BÁO: vượt 4:50' if t > 290 else ''))
