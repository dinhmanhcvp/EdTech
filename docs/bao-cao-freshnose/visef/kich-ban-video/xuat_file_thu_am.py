"""Bản TỐI GIẢN gửi học sinh thu giọng: ThuGiong_FreshNose.docx (sửa được, điền tên) + ThuGiong_FreshNose.pdf (xem trên điện thoại).
python -I -X utf8 xuat_file_thu_am.py — lời đọc lấy từ canh.py qua hàm doc() của tao_kich_ban_thu_am.py."""
import html
import os
import re
import subprocess

from tao_kich_ban_thu_am import CANH, ROLE, doc  # chạy lại bản .md đầy đủ, không hại

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
QUY_TAC = [
    'Phòng yên tĩnh, tắt quạt. Điện thoại đặt cố định, cách miệng khoảng 20 cm.',
    'Mỗi đoạn một file, đặt tên đúng mã (vd: vo-2.1). Đọc 2 lần trong cùng file.',
    'Im 1 giây trước và sau khi đọc. Sai thì đọc lại cả câu, không cần xóa.',
    'Đọc tự nhiên như kể chuyện. / nghỉ ngắn, // nghỉ hết câu, chữ đậm là con số: đọc rõ.',
    'Node đọc là "nốt", LoRa là "lô-ra", pallet là "pa-lét". Cả phần của 4 bạn cộng lại không quá 4 phút 10 giây.',
]
NHOM = [(vo, [c for c in CANH if c[2] == vo]) for vo in ['VO 1', 'VO 2', 'VO 3', 'VO 4']]
assert sum(len(x) for _, x in NHOM) == 25

# ---- DOCX
from docx import Document  # noqa: E402
from docx.shared import Pt, RGBColor  # noqa: E402

d = Document()
st = d.styles['Normal']
st.font.name = 'Arial'
st.font.size = Pt(12)
d.add_heading('THU GIỌNG – VIDEO FRESHNOSE AI', level=1)
for i, q in enumerate(QUY_TAC, 1):
    d.add_paragraph(f'{i}. {q}')
for vo, rows in NHOM:
    d.add_heading(f'{vo}: ……………………  ({ROLE[vo]})', level=2)
    for ma, *_rest in rows:
        p = d.add_paragraph()
        r = p.add_run(f'vo-{ma}   ')
        r.bold = True
        r.font.color.rgb = RGBColor(0x0E, 0x6B, 0x47)
        for k, part in enumerate(re.split(r'\*\*', doc(_rest[2]))):
            run = p.add_run(part)
            run.bold = k % 2 == 1
d.save(os.path.join(HERE, 'ThuGiong_FreshNose.docx'))

# ---- PDF (HTML → Chrome)
body = ['<h1>THU GIỌNG – VIDEO FRESHNOSE AI</h1><ol>' + ''.join(f'<li>{html.escape(q)}</li>' for q in QUY_TAC) + '</ol>']
for vo, rows in NHOM:
    body.append(f'<h2>{vo}: ……………………… <small>({ROLE[vo]})</small></h2>')
    for ma, *_rest in rows:
        t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', html.escape(doc(_rest[2])))
        body.append(f'<p><span class="ma">vo-{ma}</span>{t}</p>')
page = ('<!doctype html><meta charset="utf-8"><style>@page{size:A4;margin:16mm}body{font:15px/1.6 Arial,sans-serif;color:#14251D}'
        'h1{font-size:22px;color:#0E6B47}h2{font-size:17px;margin-top:22px;border-bottom:2px solid #0E6B47;padding-bottom:4px}'
        'small{font-weight:400;color:#6B7A72}.ma{display:inline-block;min-width:64px;font-weight:700;color:#0E6B47}p{margin:8px 0}</style>' + ''.join(body))
hp = os.path.join(HERE, 'ThuGiong_FreshNose.html')
open(hp, 'w', encoding='utf8').write(page)
pdf = os.path.join(HERE, 'ThuGiong_FreshNose.pdf')
subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={pdf}', 'file:///' + hp.replace('\\', '/')], capture_output=True, timeout=120)
os.remove(hp)
assert os.path.getsize(pdf) > 10000, 'PDF chưa tạo được'
print('ok', os.path.getsize(pdf), os.path.getsize(os.path.join(HERE, 'ThuGiong_FreshNose.docx')))
