"""Đoạn KIẾN TRÚC 4 thành phần (giọng sửa 11/11, 1:22) → cảnh n-1:  python -I -X utf8 tao_kien_truc.py
Cắt theo câu từ public/khkt/voice/kien-truc-goc.mp3 (mốc từ trong words_kien_truc.json), bỏ câu "Bốn thành phần này liên kết chặt chẽ…",
tăng tốc TOC_DO (mặc định 1,10), ghi khóa n-1 vào socratic-video/src/demo2/voice.json."""
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SV = os.path.normpath(os.path.join(HERE, '..', '..', 'socratic-video'))
SRC = os.path.join(SV, 'public', 'khkt', 'voice', 'kien-truc-goc.mp3')
OUT = os.path.join(SV, 'public', 'khkt', 'voice', 'n-1.mp3')
VJ = os.path.join(SV, 'src', 'demo2', 'voice.json')
FF = r'C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
SPEED, GAP, MAX_DONG = float(os.environ.get('TOC_DO', '1.10')), 0.2, 42
BO = {13}  # câu bỏ
SUA = [(r'chư trình', 'chu trình'), (r'SimPy', 'SymPy'), (r'giảm bài', 'giảng bài'), (r'TeacherBoard', 'Teacher Board'), (r'StudentApp', 'Student App'),
       (r'\s+([,.?!])', r'\1')]


def sua(t):
    for a, b in SUA:
        t = re.sub(a, b, t)
    return re.sub(r'\s+', ' ', t).strip()


def khung(text):
    out, cur = [], ''
    for w in text.split():
        if cur and len(cur) + 1 + len(w) > MAX_DONG:
            out.append(cur)
            cur = w
        else:
            cur = f'{cur} {w}'.strip()
    d = out + ([cur] if cur else [])
    k = -(-len(d) // 2)
    cut = [round(i * len(d) / k) for i in range(k + 1)]
    return [' '.join(d[cut[i]:cut[i + 1]]) for i in range(k)]


W = json.load(open(os.path.join(HERE, 'words_kien_truc.json'), encoding='utf-8'))['new.mp3']
sents, cur = [], []
for a, b, w in W['words']:
    cur.append((a, b, w))
    if re.search(r'[.?!]$', w):
        sents.append(cur)
        cur = []
if cur:
    sents.append(cur)
keep = [i for i in range(len(sents)) if i not in BO]
cl = [0.0 if i == 0 else (sents[i - 1][-1][1] + s[0][0]) / 2 for i, s in enumerate(sents)]
cr = [(s[-1][1] + sents[i + 1][0][0]) / 2 if i + 1 < len(sents) else W['dur'] for i, s in enumerate(sents)]
fc, off, caps, full = '', 0.0, [], []
for k, i in enumerate(keep):
    fc += f'[0:a]atrim={cl[i]:.3f}:{cr[i]:.3f},asetpts=PTS-STARTPTS,apad=pad_dur={GAP}[a{k}];'
    t = sua(' '.join(w for _, _, w in sents[i]))
    full.append(t)
    ks = khung(t)
    tot, x, e = sum(len(z) for z in ks), sents[i][0][0] - cl[i] + off, sents[i][-1][1] - cl[i] + off
    for z in ks:
        d = (e - x) * len(z) / tot
        caps.append([round(x / SPEED, 2), round((x + d - 0.04) / SPEED, 2), z])
        x += d
    off += cr[i] - cl[i] + GAP
fc += ''.join(f'[a{k}]' for k in range(len(keep))) + f'concat=n={len(keep)}:v=0:a=1[o0];[o0]atempo={SPEED}[o]'
subprocess.run([FF, '-y', '-v', 'error', '-i', SRC, '-filter_complex', fc, '-map', '[o]', '-b:a', '128k', OUT], check=True)
err = subprocess.run([FF, '-i', OUT], capture_output=True, text=True).stderr
h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', err).groups()
dur = round(int(h) * 3600 + int(m) * 60 + float(s), 2)
raw = open(VJ, 'rb').read()
bom = raw.startswith(b'\xef\xbb\xbf')
J = json.loads(raw.decode('utf-8-sig'))
J['n-1'] = {'file': 'khkt/voice/n-1.mp3', 'dur': dur, 'caps': caps, 'text': ' '.join(full)}
open(VJ, 'wb').write((b'\xef\xbb\xbf' if bom else b'') + json.dumps(J, ensure_ascii=False, indent=1).encode('utf-8'))
print('n-1', dur, 'giây;', len(caps), 'phụ đề')
