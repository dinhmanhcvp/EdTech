"""Kịch bản THU ÂM cho học sinh từ canh.py (cùng nguồn với phim FN-Visef): python -I -X utf8 tao_kich_ban_thu_am.py
→ KichBanThuAm_HocSinh.md. Mỗi đoạn thu = một file vo-<mã>; số viết thành chữ để đọc không vấp; "/" nghỉ ngắn, "//" nghỉ hết câu."""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from canh import CANH  # noqa: E402

DV = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']


def so(n):
    """Số nguyên 0–9999 thành chữ (cách đọc phổ thông)."""
    if n < 10:
        return DV[n]
    if n < 100:
        c, d = divmod(n, 10)
        head = 'mười' if c == 1 else DV[c] + ' mươi'
        if d == 0:
            return head
        tail = {1: 'mốt' if c > 1 else 'một', 4: 'tư' if c > 1 else 'bốn', 5: 'lăm'}.get(d, DV[d])
        return f'{head} {tail}'
    if n < 1000:
        t, r = divmod(n, 100)
        return f'{DV[t]} trăm' + ('' if r == 0 else f' linh {DV[r]}' if r < 10 else f' {so(r)}')
    k, r = divmod(n, 1000)
    if r == 0:
        return f'{so(k)} nghìn'
    return f'{so(k)} nghìn ' + (f'không trăm {so(r)}' if r < 100 else so(r))


for n, w in [(2023, 'hai nghìn không trăm hai mươi ba'), (4500, 'bốn nghìn năm trăm'), (498, 'bốn trăm chín mươi tám'), (21, 'hai mươi mốt'),
             (25, 'hai mươi lăm'), (105, 'một trăm linh năm'), (15, 'mười lăm'), (10, 'mười'), (24, 'hai mươi tư'), (11, 'mười một')]:
    assert so(n) == w, (n, so(n))

DOC = {'FAO': 'ép-a-ô (FAO)', 'ESP32': 'ê-ét-pê ba hai (ESP32)', 'LoRa': 'Lô-Ra', 'Random Forest': 'Ren-đơm Pho-rét (Random Forest)', 'pallet': 'pa-lét'}


def doc(s):
    s = re.sub(r'(\d+)\.(\d{3})', lambda m: m.group(1) + m.group(2), s)                       # 4.500 → 4500
    s = re.sub(r'(\d+),(\d+)', lambda m: f'**{so(int(m.group(1)))} phẩy {" ".join(DV[int(c)] for c in m.group(2))}**', s)
    s = re.sub(r'(?<![\w*])(\d+)(?![\w*])', lambda m: f'**{so(int(m.group(1)))}**', s)
    s = s.replace(' %', ' phần trăm')
    for a, b in DOC.items():
        s = s.replace(a, b)
    return s.replace(': ', ': / ').replace(', ', ', / ').replace('. ', '. // ')


PUB = os.path.join(HERE, '..', '..', '..', '..', 'socratic-video', 'public', 'fn', 'visef')
VO = json.load(open(os.path.join(PUB, 'vo.json'), encoding='utf8'))
ROLE = {'VO 1': 'Vấn đề, khoảng trống, mục tiêu', 'VO 2': 'Nguyên lý, phương pháp, kết quả', 'VO 3': 'Sản phẩm, giao diện trạm, kết luận', 'VO 4': 'Quá trình cải tiến v1 → v2'}

md = ['# KỊCH BẢN THU ÂM – VIDEO ViSEF FRESHNOSE AI', '',
      'Dành cho 4 bạn đọc lời (VO 1–4). Video đã dựng xong hình; chỉ cần thu giọng theo từng đoạn dưới đây rồi gửi file, hình sẽ tự giãn theo giọng thật.', '',
      '**Ghi tên người đọc:** VO 1: ………… · VO 2: ………… · VO 3: ………… · VO 4: ………… (mỗi bạn đọc phần đúng với việc mình đã làm).', '',
      '## Cách thu', '',
      '1. Phòng kín, tắt quạt/điều hòa; ngồi trong góc có rèm, chăn hoặc tủ quần áo mở để bớt vang.',
      '2. Điện thoại cách miệng **khoảng 20 cm**, hơi chếch xuống, không cầm tay (đặt trên chồng sách). Dùng ứng dụng Ghi âm mặc định.',
      '3. **Mỗi đoạn một file**, đặt tên đúng mã: `vo-2.1.m4a`, `vo-2.2.m4a`… (định dạng gì cũng được: m4a, mp3, wav).',
      '4. Bấm ghi → im **1 giây** → đọc → im **1 giây** → dừng. Mỗi đoạn đọc **2 lần** trong cùng file; nhóm chọn lần tốt hơn hoặc để người dựng chọn.',
      '5. Đọc như đang **kể cho bạn nghe**, không đọc như văn bản. Tốc độ vừa phải, rõ từng số. Không cần cố khớp giây.',
      '6. Đọc **Node** là "nốt", **LoRa** là "lô-ra", **pallet** là "pa-lét". `/` = nghỉ ngắn (lấy hơi nhẹ) · `//` = nghỉ hết câu · **chữ đậm** = con số, đọc chậm và rõ hơn một chút.',
      '7. Sai thì dừng một nhịp rồi đọc lại **cả câu** đó, không cần xóa.',
      '8. Nghe lại một lần bằng tai nghe: không rè, không có tiếng xe/tiếng nói nền thì gửi.', '',
      'Gửi cả thư mục file vào `socratic-video/public/fn/visef/` (hoặc gửi cho thầy), người dựng chạy lại `tao_giong_tam.py` → `tao_timeline.py` → `tao_nhac.py` rồi render.', '']
tong = 0
for vo in ['VO 1', 'VO 2', 'VO 3', 'VO 4']:
    rows = [c for c in CANH if c[2] == vo]
    md += [f'## {vo} – {ROLE[vo]} ({len(rows)} đoạn)', '', '| File | Đọc | Trên màn hình lúc đó | Độ dài gợi ý |', '|---|---|---|---|']
    for ma, _, _, loi, hinh, chu, *_ in rows:
        so_chu = len(re.sub(r'[*/()]', ' ', doc(loi)).split())
        giay = so_chu / 155 * 60  # 155 âm tiết/phút: phần lời ≤ ~250 s để phim ≤ 4:50 (8 s mở đầu + ~26 s chuyển cảnh + 5,5 s kết)
        tong += giay
        man = (chu or hinh).split('. ')[0][:90]
        md.append(f'| `vo-{ma}` | {doc(loi)} | {man} | ~{giay:.0f} s |')
    md.append('')
assert tong <= 255, tong
md += [f'**Tổng lời đọc mục tiêu:** khoảng {int(tong // 60)} phút {int(tong % 60)} giây, **không quá 4 phút 10 giây** cộng tất cả các đoạn (nếu dài hơn, phim sẽ vượt 4:50). Giọng máy tạm hiện đọc {int(sum(VO.values()) // 60)} phút {int(sum(VO.values()) % 60)} giây. Mỗi đoạn lệch ± 2 giây so với gợi ý là bình thường.', '',
       '## Kiểm tra trước khi gửi', '',
       '- [ ] Đủ 25 file, tên đúng mã (`vo-5.3` và `vo-5.4` là hai file riêng).',
       '- [ ] Các con số đọc đúng như chữ đậm (87 phẩy 5 phần trăm, 498 trên 500, 6 phẩy 2 phần trăm, khoảng 26 giờ, 22 triệu đồng).',
       '- [ ] Không đọc tên trường, tên riêng nếu thể lệ yêu cầu ẩn danh.',
       '- [ ] Mỗi file có 1 giây im lặng ở đầu và cuối.']
open(os.path.join(HERE, 'KichBanThuAm_HocSinh.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n')
print('ok', round(tong / 60, 2), 'phut')
