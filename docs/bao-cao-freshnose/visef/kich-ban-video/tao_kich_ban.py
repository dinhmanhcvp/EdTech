"""Sinh kịch bản (Markdown) + phụ đề (SRT) từ canh.py: python -I -X utf8 tao_kich_ban.py
Thời lượng mỗi cảnh = số âm tiết đọc / 148 âm tiết/phút + 0,5 s nghỉ (con số đọc thành chữ: mỗi chữ số ≈ 1,5 âm tiết)."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from canh import CANH, DOAN  # noqa: E402

TOC_DO = 148  # âm tiết/phút (prompt: 130–150)
HERE = os.path.dirname(os.path.abspath(__file__))


def am_tiet(s):
    n = 0
    for tok in s.split():
        if re.search(r'\d', tok):
            digits = re.sub(r'\D', '', tok)
            n += round(1.5 * len(digits)) + (1 if ',' in tok else 0)
        elif re.search(r'\w', tok):
            n += 1
        if '%' in tok:
            n += 2
    return n


def giay(t):
    m, s = divmod(t, 60)
    return f'{int(m)}:{s:04.1f}'


def srt_time(t):
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f'{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}'


def chia_dong(text, maxc=42):
    words, lines, cur = text.split(), [], ''
    for w in words:
        if len(cur) + len(w) + (1 if cur else 0) > maxc:
            lines.append(cur)
            cur = w
        else:
            cur = f'{cur} {w}' if cur else w
    if cur:
        lines.append(cur)
    return lines


t = 0.0
rows, by_doan, srt = [], {}, []
tong_chu = 0
for ma, doan, nguoi, loi, hinh, chu, am, nguon, toi_thieu in CANH:
    n = am_tiet(loi)
    d = max(toi_thieu, n / TOC_DO * 60 + (0.5 if n else 0))
    rows.append((ma, doan, t, t + d, nguoi, loi, hinh, chu, am, nguon, n))
    by_doan[doan] = by_doan.get(doan, 0) + d
    tong_chu += n
    if loi:
        # phụ đề: chia câu thành khung ≤ 2 dòng × 42 ký tự, chia thời gian theo độ dài
        lines = chia_dong(loi)
        cues = [' \n'.join(lines[i:i + 2]).replace(' \n', '\n') for i in range(0, len(lines), 2)]
        tot = sum(len(c) for c in cues)
        a = t + 0.2
        span = d - 0.4
        for c in cues:
            b = a + span * len(c) / tot
            srt.append((a, b, c))
            a = b
    t += d
TONG = t

md = []
md.append('# KỊCH BẢN VIDEO ViSEF – FRESHNOSE AI (bản ưu tiên giao diện và đồ họa)\n')
md.append('Theo `KHKT/00_PROMPT/02_Prompt_KichBanVideo.md`. Nguồn duy nhất: `visef/bao-cao_ban-final.md` (bản FINAL 06/11/2026, số liệu từ CSV). '
          'File này **sinh tự động** từ `canh.py` bằng `tao_kich_ban.py`: sửa lời/hình trong `canh.py` rồi chạy lại để cập nhật mốc giờ, số chữ và phụ đề.\n')
md.append('**Nguyên tắc riêng của bản này:** không quay mặt người. Lời thoại là giọng đọc của thành viên (VO 1–4). Hình chủ yếu là giao diện trạm (phát lại dữ liệu thật trong CSV), đồ họa và mô hình 3D. Chỉ còn 2 cảnh quay **tay và thiết bị** (5.6, 5.8) cùng 2 ảnh thật (4.3, 6.3) để chứng minh có nguyên mẫu và thí nghiệm thật.\n')
md.append(open(os.path.join(HERE, 'buoc1.md'), encoding='utf8').read())
md.append('\n## BƯỚC 2 – KỊCH BẢN CHI TIẾT\n')
md.append('| Cảnh | Thời điểm | Người dẫn | Lời thoại | Hình ảnh & góc máy | Chữ/đồ họa trên màn hình | Âm thanh | Nguồn trong báo cáo | Số chữ |')
md.append('|---|---|---|---|---|---|---|---|---|')
cur = None
for ma, doan, a, b, nguoi, loi, hinh, chu, am, nguon, n in rows:
    if doan != cur:
        cur = doan
        md.append(f'| **{doan}** | | | **{DOAN[doan][0].upper()}** | | | | | |')
    md.append(f'| {ma} | {giay(a)}–{giay(b)} | {nguoi} | {loi or "*(không lời)*"} | {hinh} | {chu} | {am} | {nguon} | {n} |')
md.append('')
md.append(f'**Tổng thời lượng dự kiến:** {giay(TONG)} (tốc độ {TOC_DO} âm tiết/phút, nghỉ 0,5 s mỗi cảnh) · **Tổng số chữ lời thoại:** {tong_chu} âm tiết\n')
md.append('| Đoạn | Thời lượng thực | Khung chuẩn (5:00) | Tỉ lệ thực | Tỉ lệ chuẩn |')
md.append('|---|---|---|---|---|')
for k, (ten, chuan) in DOAN.items():
    md.append(f'| {k}. {ten} | {by_doan[k]:.1f} s | {chuan} s | {100 * by_doan[k] / TONG:.0f} % | {100 * chuan / 300:.0f} % |')
md.append(f'\nĐoạn 5 + 6: {100 * (by_doan[5] + by_doan[6]) / TONG:.0f} % thời lượng (yêu cầu ≥ 45 %).\n')
md.append(open(os.path.join(HERE, 'buoc3-5.md'), encoding='utf8').read())

open(os.path.join(HERE, 'KichBan_ViSEF_UI.md'), 'w', encoding='utf8').write('\n'.join(md))
with open(os.path.join(HERE, 'PhuDe_ViSEF_UI.srt'), 'w', encoding='utf8') as f:
    for i, (a, b, c) in enumerate(srt, 1):
        f.write(f'{i}\n{srt_time(a)} --> {srt_time(b)}\n{c}\n\n')
assert all(len(x) <= 42 for _, _, c in srt for x in c.split('\n')), 'dòng phụ đề > 42 ký tự'
print(f'tong {giay(TONG)}, {tong_chu} am tiet, {len(srt)} khung phu de')
for k in DOAN:
    print(k, round(by_doan[k], 1))
