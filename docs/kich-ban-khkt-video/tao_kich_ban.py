"""Sinh kịch bản, bản thu âm cho học sinh và phụ đề SRT từ canh.py:  python -I -X utf8 tao_kich_ban.py
Thời lượng cảnh = số âm tiết đọc / 148 âm tiết/phút + 0,5 s nghỉ, không ngắn hơn mức tối thiểu của cảnh."""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from canh import CANH, DOAN  # noqa: E402

TOC_DO, TOI_DA, MAX_DONG = 148, 300, 42  # âm tiết/phút; giây (thể lệ mặc định 5:00)


def sach(s):
    return re.sub(r'/+', ' ', s.replace('**', ''))


def am_tiet(doc):
    return len([t for t in re.split(r'[\s\-]+', sach(doc)) if re.search(r'\w', t)])


def mmss(t):
    return f'{int(t // 60)}:{t % 60:04.1f}'


def srt_t(t):
    ms = int(round(t * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def dong(text):
    out, cur = [], ''
    for w in text.split():
        if cur and len(cur) + 1 + len(w) > MAX_DONG:
            out.append(cur)
            cur = w
        else:
            cur = f'{cur} {w}'.strip()
    return out + ([cur] if cur else [])


def tach_khung(text):  # mỗi khung tối đa 2 dòng
    d = dong(text)
    k = -(-len(d) // 2)  # số khung, chia đều để không sót khung 1 dòng ngắn
    cut = [round(i * len(d) / k) for i in range(k + 1)]
    return ['\n'.join(d[cut[i]:cut[i + 1]]) for i in range(k)]


# ---- thời gian ----
t, cac = 0.0, []
for ma, doan, nguoi, doc, phude, loai, hinh, chu, am, nguon, tomin in CANH:
    n = am_tiet(doc)
    d = max(tomin, n / TOC_DO * 60 + (0.5 if n else 0))
    cac.append(dict(ma=ma, doan=doan, nguoi=nguoi, doc=doc, phude=phude, loai=loai, hinh=hinh, chu=chu,
                    am=am, nguon=nguon, n=n, b=t, e=t + d))
    t += d
TONG = t
tong_chu = sum(c['n'] for c in cac)
assert TONG <= TOI_DA - 10, f'Vượt giới hạn: {mmss(TONG)}'

theo_doan = {}
for c in cac:
    theo_doan[c['doan']] = theo_doan.get(c['doan'], 0) + c['e'] - c['b']
theo_loai = {}
for c in cac:
    for k in c['loai'].split('+'):
        theo_loai[k] = theo_loai.get(k, 0) + 1

# ---- SRT ----
srt, k = [], 1
for c in cac:
    if not c['phude']:
        continue
    khung = tach_khung(c['phude'])
    tong_k = sum(len(x) for x in khung)
    b = c['b']
    span = c['e'] - c['b'] - 0.3
    for x in khung:
        d = span * len(x) / tong_k
        srt.append(f'{k}\n{srt_t(b)} --> {srt_t(b + d)}\n{x}\n')
        k += 1
        b += d
open(os.path.join(HERE, 'PhuDe_KHKT.srt'), 'w', encoding='utf-8').write('\n'.join(srt))

# ---- Kịch bản ----
TIEU_DE = open(os.path.join(HERE, 'phan_dau.md'), encoding='utf-8').read()
bang = ['| Cảnh | Thời điểm | Người dẫn | Lời thoại (đọc) | Loại | Hình ảnh & góc máy | Chữ/đồ họa trên màn hình | Âm thanh | Nguồn trong báo cáo | Số chữ |',
        '|---|---|---|---|---|---|---|---|---|---|']
dd = None
for c in cac:
    if c['doan'] != dd:
        dd = c['doan']
        bang.append(f'| **{dd}** | | | **{DOAN[dd].upper()}** | | | | | | |')
    loi = sach(c['doc']).strip() or '*(không lời)*'
    loi = re.sub(r'\s+', ' ', loi)
    bang.append(f"| {c['ma']} | {mmss(c['b'])}–{mmss(c['e'])} | {c['nguoi']} | {loi} | {c['loai']} | {c['hinh']} | {c['chu']} | {c['am']} | {c['nguon']} | {c['n']} |")
bang.append('')
bang.append(f'**Tổng thời lượng:** {mmss(TONG)} (giới hạn mặc định 5:00, còn dư {mmss(TOI_DA - TONG)}) · **Tổng số chữ đọc:** {tong_chu} · **Tốc độ trung bình:** {tong_chu / TONG * 60:.0f} âm tiết/phút (kể cả quãng demo không lời).')
bang.append('')
bang.append('| Đoạn | Thời lượng | Tỉ lệ | Khung chuẩn C2 |')
bang.append('|---|---|---|---|')
CHUAN = {1: 3, 2: 12, 3: 12, 4: 14, 5: 28, 6: 19, 7: 12}
for dn in sorted(theo_doan):
    bang.append(f'| {dn}. {DOAN[dn]} | {mmss(theo_doan[dn])} | {theo_doan[dn] / TONG * 100:.0f} % | {CHUAN[dn]} % |')
bang.append('')
bang.append(f"Đoạn 5 + 6 = {(theo_doan[5] + theo_doan[6]) / TONG * 100:.0f} % (yêu cầu ≥ 45 %). Loại hình ảnh (số cảnh, một cảnh có thể thuộc nhiều loại): " + ', '.join(f'{a} {b}' for a, b in sorted(theo_loai.items())) + '.')
open(os.path.join(HERE, 'KichBan_KHKT_UI.md'), 'w', encoding='utf-8').write(TIEU_DE.replace('{{BANG}}', '\n'.join(bang)))

# ---- Bản thu âm cho học sinh ----
VO = {}
for c in cac:
    if c['nguoi'].startswith('VO'):
        VO.setdefault(c['nguoi'], []).append(c)
PHAN = {'VO 1': 'Vấn đề, khoảng trống, mục tiêu', 'VO 2': 'Nguyên lý, phương pháp, phần bảng của thầy',
        'VO 3': 'Ứng dụng học sinh và quá trình cải tiến', 'VO 4': 'Kết quả, kết luận, hạn chế'}
th = open(os.path.join(HERE, 'phan_thu_am.md'), encoding='utf-8').read()
khoi = []
for vo in sorted(VO):
    cs = VO[vo]
    khoi.append(f"## {vo} – {PHAN[vo]} ({len(cs)} đoạn, khoảng {sum(c['e'] - c['b'] for c in cs):.0f} giây)\n")
    khoi.append('| File | Đọc | Trên màn hình lúc đó | Độ dài gợi ý |')
    khoi.append('|---|---|---|---|')
    for c in cs:
        doc = re.sub(r'\s+', ' ', c['doc'].replace('//', '//').strip())
        khoi.append(f"| `vo-{c['ma']}` | {doc} | {c['chu']} | ~{max(3, round(c['n'] / TOC_DO * 60 + 0.5))} s |")
    khoi.append('')
tong_doc = sum(c['n'] for c in cac) / TOC_DO * 60
open(os.path.join(HERE, 'KichBanThuAm_HocSinh.md'), 'w', encoding='utf-8').write(
    th.replace('{{KHOI}}', '\n'.join(khoi)).replace('{{TONG}}', f'{tong_doc / 60:.0f} phút {tong_doc % 60:.0f} giây').replace('{{SO_FILE}}', str(sum(len(v) for v in VO.values()))))
print(f'OK  {len(cac)} cảnh · {mmss(TONG)} · {tong_chu} âm tiết · {len(srt)} khung phụ đề')
for dn in sorted(theo_doan):
    print(f'   đoạn {dn}: {mmss(theo_doan[dn])} ({theo_doan[dn] / TONG * 100:.0f} %)')
