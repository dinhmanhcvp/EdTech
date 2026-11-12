"""Dòng thời gian phim ViSEF (FN-Visef) từ canh.py + độ dài giọng (vo.json) → socratic-video/public/fn/visef/timeline.json
python -I -X utf8 tao_timeline.py
Mỗi cảnh: giọng vào ở 0,45 s, kết thúc cảnh 0,6 s sau giọng; 5.3 + 5.4 gộp thành một cảnh giao diện (≥ 21 s);
1.1 = 8 s; 7.3 thêm 3,5 s cho thẻ kết + 2 s im lặng. Phụ đề ≤ 42 ký tự/dòng, ≤ 2 dòng/khung (Khối B3)."""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from canh import CANH  # noqa: E402

PUB = os.path.join(HERE, '..', '..', '..', '..', 'socratic-video', 'public', 'fn', 'visef')
VO = json.load(open(os.path.join(PUB, 'vo.json'), encoding='utf8'))
LEAD, TAIL = 0.45, 0.6
LIGHT = {'5.1', '5.2', '5.34'}  # cảnh nền sáng (kho, bản vẽ bóc tách, giao diện trạm)


def lines(text, maxc=42):
    out, cur = [], ''
    for w in text.split():
        if cur and len(cur) + 1 + len(w) > maxc:
            out.append(cur)
            cur = w
        else:
            cur = f'{cur} {w}' if cur else w
    return out + ([cur] if cur else [])


def cues(text, a, dur):
    # giữ số và đơn vị/dấu % trên cùng dòng
    ls = [x.replace('¤', ' ') for x in lines(re.sub(r'(\d) (%|giờ|ngày|triệu)', r'\1¤\2', text))]
    groups = [ls[i:i + 2] for i in range(0, len(ls), 2)]
    # tránh khung cuối chỉ một dòng rất ngắn: dồn lại
    tot = sum(len(' '.join(g)) for g in groups)
    out, t = [], a
    for g in groups:
        b = t + dur * len(' '.join(g)) / tot
        out.append([round(t, 2), round(b, 2), '\n'.join(g)])
        t = b
    return out


text = {c[0]: c[3] for c in CANH}
order = [c[0] for c in CANH]
segs, t = [], 0.0
i = 0
while i < len(order):
    ma = order[i]
    if ma == '1.1':
        d, vo, subs = 8.0, [], []
    elif ma == '5.3':
        a53, a54 = LEAD, 3.8
        d = max(21.0, a54 + VO['5.4'] + TAIL)
        vo = [{'file': 'vo-5.3.mp3', 'at': a53}, {'file': 'vo-5.4.mp3', 'at': a54}]
        subs = cues(text['5.3'], a53, VO['5.3']) + cues(text['5.4'], a54, VO['5.4'])
        ma = '5.34'
        i += 1
    else:
        d = LEAD + VO[ma] + TAIL + (5.5 if ma == '7.3' else 0)
        vo = [{'file': f'vo-{ma}.mp3', 'at': LEAD}]
        subs = cues(text[ma], LEAD, VO[ma])
    segs.append({'id': ma, 'start': round(t, 3), 'dur': round(d, 3), 'vo': vo, 'subs': subs, 'light': ma in LIGHT})
    t += d
    i += 1
TOTAL = round(t, 2)
start = {s['id']: s['start'] for s in segs}
markers = {
    'drop': 3.5,                                   # sản phẩm 3D xuất hiện lần đầu (1.1, Reveal)
    'lullA': start['6.1'], 'lullB': start['6.4'],  # đoạn lắng khi nói kết quả
    'outro': start['7.3'], 'end': TOTAL - 2.0,     # 2 s im lặng cuối
    'total': TOTAL,
}
json.dump({'segments': segs, 'markers': markers}, open(os.path.join(PUB, 'timeline.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
assert all(len(l) <= 42 for s in segs for c in s['subs'] for l in c[2].split('\n'))
m, s_ = divmod(TOTAL, 60)
print(f'tong {int(m)}:{s_:05.2f} ({TOTAL} s), {len(segs)} canh')
for s in segs:
    print(s['id'], s['start'], s['dur'])
