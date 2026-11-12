"""Phiếu THU BỔ SUNG (13 đoạn còn thiếu lời sau khi dựng theo giọng thật 1/2.2/3/4.m4a):
python -I -X utf8 xuat_file_thu_bo_sung.py → ThuGiongBoSung_FreshNose.docx + .pdf. Lời lấy từ canh.py qua doc()."""
import html
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tao_kich_ban_thu_am import CANH, doc  # noqa: E402
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
NHOM = [
    ('1. Vấn đề', 'bạn đã thu file 1', ['2.1', '2.2', '2.3']),
    ('2. Thiết kế thí nghiệm', 'bạn đã thu file 1', ['4.3', '4.4']),
    ('3. Sản phẩm và giao diện trạm', 'bạn đã thu file 2', ['5.1', '5.2', '5.3', '5.4']),
    ('4. Kết quả', 'bạn đã thu file 3', ['6.1', '6.2', '6.3', '6.4']),
]
LOI = {c[0]: c[3] for c in CANH}
assert sum(len(m) for *_, m in NHOM) == 13 and all(m in LOI for *_, ms in NHOM for m in ms)
QUY_TAC = [
    'Thu ở đúng phòng và đúng điện thoại như lần trước để giọng khớp.',
    'Mỗi đoạn một file, đặt tên đúng mã (vd: vo-2.1). Đọc 2 lần trong cùng file.',
    'Im 1 giây trước và sau khi đọc. Sai thì đọc lại cả câu, không cần xóa.',
    'Đọc tự nhiên như kể chuyện. / nghỉ ngắn, // nghỉ hết câu, chữ đậm là con số: đọc rõ.',
    'Dài hơn gợi ý một chút cũng được, hình sẽ giãn theo giọng.',
]
TITLE = 'THU GIỌNG BỔ SUNG – VIDEO FRESHNOSE AI (13 đoạn)'

from docx import Document  # noqa: E402
from docx.shared import Pt, RGBColor  # noqa: E402

d = Document()
d.styles['Normal'].font.name = 'Arial'
d.styles['Normal'].font.size = Pt(12)
d.add_heading(TITLE, level=1)
for i, q in enumerate(QUY_TAC, 1):
    d.add_paragraph(f'{i}. {q}')
for ten, ai, mas in NHOM:
    d.add_heading(f'{ten}  (người đọc: {ai})', level=2)
    for ma in mas:
        p = d.add_paragraph()
        r = p.add_run(f'vo-{ma}   ')
        r.bold = True
        r.font.color.rgb = RGBColor(0x0E, 0x6B, 0x47)
        for k, part in enumerate(re.split(r'\*\*', doc(LOI[ma]))):
            p.add_run(part).bold = k % 2 == 1
d.save(os.path.join(HERE, 'ThuGiongBoSung_FreshNose.docx'))

body = [f'<h1>{TITLE}</h1><ol>' + ''.join(f'<li>{html.escape(q)}</li>' for q in QUY_TAC) + '</ol>']
for ten, ai, mas in NHOM:
    body.append(f'<h2>{ten} <small>(người đọc: {ai})</small></h2>')
    for ma in mas:
        t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', html.escape(doc(LOI[ma])))
        body.append(f'<p><span class="ma">vo-{ma}</span>{t}</p>')
page = ('<!doctype html><meta charset="utf-8"><style>@page{size:A4;margin:16mm}body{font:15px/1.6 Arial,sans-serif;color:#14251D}'
        'h1{font-size:21px;color:#0E6B47}h2{font-size:17px;margin-top:22px;border-bottom:2px solid #0E6B47;padding-bottom:4px}'
        'small{font-weight:400;color:#6B7A72}.ma{display:inline-block;min-width:64px;font-weight:700;color:#0E6B47}p{margin:8px 0}</style>' + ''.join(body))
hp = os.path.join(HERE, 'ThuGiongBoSung_FreshNose.html')
open(hp, 'w', encoding='utf8').write(page)
pdf = os.path.join(HERE, 'ThuGiongBoSung_FreshNose.pdf')
subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={pdf}', 'file:///' + hp.replace('\\', '/')], capture_output=True, timeout=120)
os.remove(hp)
assert os.path.getsize(pdf) > 10000, 'PDF chưa tạo được'
print('ok', os.path.getsize(pdf))
