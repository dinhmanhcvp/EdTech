"""Gộp các file vo-<mã> thành giọng theo CẢNH của phim KHKT kiểu FlowCut:  python -I -X utf8 tao_flow.py
Cần đã chạy tao_timeline.py (hoặc có vo-<mã>.mp3 thật trong socratic-video/public/khkt).
Ra: public/khkt/fv/<cảnh>.mp3  +  thêm/ghi đè các khóa k-* trong socratic-video/src/demo2/voice.json
(file, dur, caps = phụ đề theo mốc, text = lời; FlowCut tìm giọng theo text). Các khóa khác giữ nguyên."""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from canh import CANH  # noqa: E402

SV = os.path.normpath(os.path.join(HERE, '..', '..', 'socratic-video'))
PUB = os.path.join(SV, 'public', 'khkt')
VJ = os.path.join(SV, 'src', 'demo2', 'voice.json')
FF = r'C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
GAP, MAX_DONG = 0.3, 42
GROUPS = {
    'k-problem': ['2.1', '2.2', '2.3'], 'k-brand': ['3.1', '3.2'], 'k-method': ['3.3', '4.1', '4.2'],
    'k-nem': ['5.1', '5.2'], 'k-demo': ['5.3', '5.4'], 'k-gia': ['5.6', '5.7'], 'k-design': ['5.8', '5.9'],
    'k-results': ['4.3', '6.1', '6.2', '6.3', '6.4'], 'k-closing': ['7.1', '7.2', '7.3'],
}
PHUDE = {c[0]: c[4] for c in CANH}


def dur(path):
    out = subprocess.run([FF, '-i', path], capture_output=True, text=True).stderr
    h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


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
    return [' '.join(d[cut[i]:cut[i + 1]]) for i in range(k)]


raw = open(VJ, 'rb').read()
bom = raw.startswith(b'\xef\xbb\xbf')
J = json.loads(raw.decode('utf-8-sig'))
os.makedirs(os.path.join(PUB, 'fv'), exist_ok=True)
for gid, mas in GROUPS.items():
    files = [os.path.join(PUB, f'vo-{m}.mp3') for m in mas]
    ds = [dur(f) for f in files]
    inp = [x for f in files for x in ('-i', f)]
    fc = ''.join(f'[{i}:a]apad=pad_dur={GAP}[a{i}];' for i in range(len(files) - 1)) + f'[{len(files) - 1}:a]anull[a{len(files) - 1}];'
    fc += ''.join(f'[a{i}]' for i in range(len(files))) + f'concat=n={len(files)}:v=0:a=1[o]'
    out = os.path.join(PUB, 'fv', f'{gid}.mp3')
    subprocess.run([FF, '-y', '-v', 'error', *inp, '-filter_complex', fc, '-map', '[o]', '-b:a', '128k', out], check=True)
    caps, off = [], 0.0
    for m, d in zip(mas, ds):
        ks = khung(PHUDE[m])
        tot, a = sum(len(x) for x in ks), off
        for x in ks:
            e = a + d * len(x) / tot
            caps.append([round(a, 2), round(e - 0.04, 2), x])
            a = e
        off += d + GAP
    J[gid] = {'file': f'khkt/fv/{gid}.mp3', 'dur': round(dur(out), 2), 'caps': caps, 'text': ' '.join(PHUDE[m] for m in mas)}
    print(gid, J[gid]['dur'])
open(VJ, 'wb').write((b'\xef\xbb\xbf' if bom else b'') + json.dumps(J, ensure_ascii=False, indent=1).encode('utf-8'))
