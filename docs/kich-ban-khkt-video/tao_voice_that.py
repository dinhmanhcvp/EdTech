"""Giọng thật (ElevenLabs) → phim KHKT:  python -I -X utf8 tao_voice_that.py <thư mục giọng> <words.json từ chep_loi.py>
Sắp file theo tên (= thứ tự đọc), chép sang socratic-video/public/khkt/voice/v-N.mp3, sửa lỗi nhận dạng bằng bảng SUA,
chia phụ đề theo mốc từng từ, ghi khóa v-N (file, dur, caps, text) vào socratic-video/src/demo2/voice.json
và loi_giong_that.md (bản chép đã sửa để nhóm đối chiếu)."""
import glob
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SV = os.path.normpath(os.path.join(HERE, '..', '..', 'socratic-video'))
PUB = os.path.join(SV, 'public', 'khkt', 'voice')
VJ = os.path.join(SV, 'src', 'demo2', 'voice.json')
MAX_DONG = 42

# Lỗi nhận dạng (đã nghe đối chiếu ngữ cảnh). Dòng có "?" là chỗ không chắc: ghi vào báo cáo cho nhóm xác nhận.
SUA = [
    (r'rủi do', 'rủi ro'), (r'để thi tốt nghiệp', 'đề thi tốt nghiệp'), (r'chọn vẹn', 'trọn vẹn'), (r'chat nguyên', 'chép nguyên'),  # ?
    (r'SimPy|SIMP\b|SymPy', 'SymPy'), (r'độ chẽ', 'độ trễ'),  # ?
    (r'Ưng dụng', 'Ứng dụng'), (r'rời dạc', 'rời rạc'), (r'chuyên tải', 'truyền tải'), (r'bài dạng', 'bài giảng'),
    (r'ren luyện', 'rèn luyện'), (r'hàng giàu', 'hàng rào'), (r'chiệt để', 'triệt để'), (r'cân nguyên tử', 'cân bằng electron'),  # ?
    (r'chân tru', 'trơn tru'), (r'chú trình', 'chu trình'), (r'luân truyền', 'luân chuyển'), (r'Scrotic', 'Socratic'),
    (r'tranh lệch', 'chênh lệch'), (r'đúng gạch chéo sai', 'Đúng/Sai'), (r'chê nhóm', 'chia nhóm'), (r'chọn một học kỳ', 'trọn một học kỳ'),
    (r'Tính thưa', 'Kính thưa'), (r'truyền đổi', 'chuyển đổi'), (r'Đầu tiên là', 'Đầu tiên là'), (r'giảm 17%', 'giảm 17%'),
    (r'(\d+) ,(\d+) ?%', r'\1,\2%'), (r'(\d+) ?%', r'\1%'), (r'0 ,92', '0,92'), (r'ngoại tuyến', 'ngoại tuyến'),
    (r'lơ lửng', 'lơ lửng'), (r'\s+([,.?!])', r'\1'),
]


def sua(t):
    for a, b in SUA:
        t = re.sub(a, b, t)
    return re.sub(r'\s+', ' ', t).strip()


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


src, wj = sys.argv[1], sys.argv[2]
W = json.load(open(wj, encoding='utf-8'))
files = sorted(glob.glob(os.path.join(src, '*.mp3')))
os.makedirs(PUB, exist_ok=True)
raw = open(VJ, 'rb').read()
bom = raw.startswith(b'\xef\xbb\xbf')
J = json.loads(raw.decode('utf-8-sig'))
md = ['# Lời giọng thật đã chép và sửa lỗi nhận dạng (đối chiếu với kịch bản của nhóm)\n', 'Dòng có dấu `[?]` là chỗ nhận dạng không chắc; nghe lại và báo nếu sai.\n']
for n, f in enumerate(files, 1):
    base = os.path.basename(f)
    shutil.copyfile(f, os.path.join(PUB, f'v-{n}.mp3'))
    toks = W[base]['words']
    sents, cur = [], []
    for a, b, w in toks:
        cur.append((a, b, w))
        if re.search(r'[.?!]$', w):
            sents.append(cur)
            cur = []
    if cur:
        sents.append(cur)
    caps, full = [], []
    for s in sents:
        t = sua(' '.join(w for _, _, w in s))
        full.append(t)
        ks = khung(t)
        tot, a, e = sum(len(x) for x in ks), s[0][0], s[-1][1]
        for x in ks:
            d = (e - a) * len(x) / tot
            caps.append([round(a, 2), round(a + d - 0.04, 2), x])
            a += d
    J[f'v-{n}'] = {'file': f'khkt/voice/v-{n}.mp3', 'dur': W[base]['dur'], 'caps': caps, 'text': ' '.join(full)}
    md.append(f'\n## Đoạn {n} (`{base[11:30]}`, {W[base]["dur"]:.0f} giây)\n')
    md.extend(f'{t}\n' for t in full)
    print(n, W[base]['dur'], len(caps))
open(VJ, 'wb').write((b'\xef\xbb\xbf' if bom else b'') + json.dumps(J, ensure_ascii=False, indent=1).encode('utf-8'))
open(os.path.join(HERE, 'loi_giong_that.md'), 'w', encoding='utf-8').write('\n'.join(md))
