"""Bản RÚT GỌN từ giọng thật: cắt giọng ElevenLabs theo câu (không thu lại), ghi khóa s-1…s-7 vào demo2/voice.json và ban_rut_gon.md.
python -I -X utf8 tao_ban_rut_gon.py <thư mục giọng> <words.json>
CHON[n] = các câu giữ lại của đoạn n (n = thứ tự file); (i, 'bo0,92') = giữ câu i nhưng cắt cụm "0,92 điểm" (lệch dữ liệu 0,83).
Bỏ cả đoạn 4 (trùng với đoạn 6). Cắt tại giữa quãng lặng giữa hai câu để không mất chữ."""
import glob
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SV = os.path.normpath(os.path.join(HERE, '..', '..', 'socratic-video'))
PUB = os.path.join(SV, 'public', 'khkt', 'voice')
VJ = os.path.join(SV, 'src', 'demo2', 'voice.json')
FF = r'C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
GAP, SAME = 0.22, 0.04
SPEED = float(os.environ.get('TOC_DO', '1.10'))  # tăng tốc giọng (atempo, giữ cao độ) để vừa thời lượng; chỉnh bằng biến môi trường TOC_DO
CHON = {1: [0, 1, 3, 5], 2: [0, 1, 3, 5, 7, 8, 9], 3: [0, 1, 3, 4, 6, 7], 5: [1, 2, 4, 6, 8, 9, 11], 6: [1, 3, 5, 7, 9],
        7: [0, (2, 'bo0,92'), 3, 4, 5, 7], 8: [0, 1, 2, 3, 4]}
RA = {1: 's-1', 2: 's-2', 3: 's-3', 5: 's-4', 6: 's-5', 7: 's-6', 8: 's-7'}

src, wj = sys.argv[1], sys.argv[2]
exec(open(os.path.join(HERE, 'tao_voice_that.py'), encoding='utf-8').read().split('src, wj = sys.argv')[0].replace('HERE = os.path.dirname(os.path.abspath(__file__))', ''))  # sua, khung, dong
W = json.load(open(wj, encoding='utf-8'))
files = sorted(glob.glob(os.path.join(src, '*.mp3')))
raw = open(VJ, 'rb').read()
bom = raw.startswith(b'\xef\xbb\xbf')
J = json.loads(raw.decode('utf-8-sig'))
md = ['# Bản rút gọn lời (cắt từ giọng thật, không cần thu lại)\n', 'Mỗi dòng là một câu giữ nguyên từ bản thu. Đoạn 4 (luồng đồng bộ) bỏ vì trùng đoạn 6.\n']
tong = 0.0
for n, items in CHON.items():
    base = os.path.basename(files[n - 1])
    toks = W[base]['words']
    sents, cur = [], []
    for a, b, w in toks:
        cur.append((a, b, w))
        if re.search(r'[.?!]$', w):
            sents.append(cur)
            cur = []
    if cur:
        sents.append(cur)
    # điểm cắt = giữa quãng lặng
    cutL = [0.0 if i == 0 else (sents[i - 1][-1][1] + s[0][0]) / 2 for i, s in enumerate(sents)]
    cutR = [(s[-1][1] + sents[i + 1][0][0]) / 2 if i + 1 < len(sents) else W[base]['dur'] for i, s in enumerate(sents)]
    segs = []  # (a, b, tokens, nối_liền)
    for it in items:
        i, mode = (it, None) if isinstance(it, int) else it
        s = sents[i]
        if mode == 'bo0,92':
            k = next(j for j in range(len(s) - 1) if s[j][2] == '0' and s[j + 1][2].startswith(',92'))
            e = k + 2 + (1 if s[k + 2][2].startswith('điểm') else 0)
            segs.append((cutL[i], (s[k - 1][1] + s[k][0]) / 2, s[:k], False))
            segs.append(((s[e - 1][1] + s[e][0]) / 2, cutR[i], s[e:], True))
        else:
            segs.append((cutL[i], cutR[i], s, False))
    fc, off, caps, full, ins = '', 0.0, [], [], 0
    for k, (a, b, tk, same) in enumerate(segs):
        pad = SAME if k + 1 < len(segs) and segs[k + 1][3] else GAP
        fc += f'[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,apad=pad_dur={pad}[a{k}];'
        t = sua(' '.join(w for _, _, w in tk))
        ks = khung(t)
        tot, x, e = sum(len(z) for z in ks), tk[0][0] - a + off, tk[-1][1] - a + off
        for z in ks:
            d = (e - x) * len(z) / tot
            caps.append([round(x / SPEED, 2), round((x + d - 0.04) / SPEED, 2), z])
            x += d
        full.append(t)
        off += (b - a) + pad
    fc += ''.join(f'[a{k}]' for k in range(len(segs))) + f'concat=n={len(segs)}:v=0:a=1[o0];[o0]atempo={SPEED}[o]'
    out = os.path.join(PUB, f'{RA[n]}.mp3')
    subprocess.run([FF, '-y', '-v', 'error', '-i', files[n - 1], '-filter_complex', fc, '-map', '[o]', '-b:a', '128k', out], check=True)
    dur = float(re.search(r'Duration: \d+:\d+:([\d.]+)', subprocess.run([FF, '-i', out], capture_output=True, text=True).stderr).group(1))
    dur = round(dur + 60 * int(re.search(r'Duration: \d+:(\d+):', subprocess.run([FF, '-i', out], capture_output=True, text=True).stderr).group(1)), 2)
    J[RA[n]] = {'file': f'khkt/voice/{RA[n]}.mp3', 'dur': dur, 'caps': caps, 'text': ' '.join(full)}
    tong += dur
    md.append(f'\n## {RA[n]} (từ đoạn {n}, {dur:.0f} giây)\n')
    md.extend(f'{t}\n' for t in full)
    print(RA[n], dur)
print('tổng giọng', round(tong, 1))
open(VJ, 'wb').write((b'\xef\xbb\xbf' if bom else b'') + json.dumps(J, ensure_ascii=False, indent=1).encode('utf-8'))
open(os.path.join(HERE, 'ban_rut_gon.md'), 'w', encoding='utf-8').write('\n'.join(md) + f'\n\n**Tổng giọng:** {tong / 60:.0f} phút {tong % 60:.0f} giây.\n')
