# Dự toán xin ngân sách gian Socratic Vision Board (Excel). Chạy: python3 du-toan/build-du-toan-socratic.py
# Đầu vào: các hạng mục đã chọn trong du-toan-gian.html (bản 26/11/2026), đơn giá mức phổ thông.
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.comments import Comment
from openpyxl.worksheet.page import PageMargins
import os

OUT = os.path.join(os.path.dirname(__file__), 'Du-toan-ngan-sach-Socratic.xlsx')
F = 'Arial'
NAVY, BLUE, SKY, ORANGE, GREY = '0E2C86', '1446D8', 'DCE7FF', 'FF7A3D', 'F3F5FA'
thin = Side(style='thin', color='B8C2DA'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
VND = '#,##0;(#,##0);"-"'
def font(**k): return Font(name=F, **{'size': 10, **k})
def fill(c): return PatternFill('solid', start_color=c, end_color=c)

wb = Workbook()
# ---------------- Giả định ----------------
ga = wb.active; ga.title = 'Gia dinh'
ga.sheet_view.showGridLines = False
ga['A1'] = 'CÁC GIẢ ĐỊNH VÀ THÔNG SỐ ĐẦU VÀO'; ga['A1'].font = font(size=14, bold=True, color=NAVY)
ga['A2'] = 'Ô chữ xanh dương = số nhập tay, sửa được; mọi bảng khác tự tính lại theo các ô này.'; ga['A2'].font = font(italic=True, color='666666')
inputs = [
    ('Ngân sách xin cấp (mục tiêu tổng)', 20000000, 'VND', 'Theo đề nghị của nhóm: tổng khoảng 20 triệu; chi phí thiết kế bù phần còn lại.'),
    ('Đơn giá Formex (đã gồm in UV + cắt CNC)', 350000, 'VND/m²', 'Báo giá xưởng quảng cáo nhóm đã hỏi (350k/m²).'),
    ('Đơn giá thuê màn tương tác 65"', 2500000, 'VND/ngày', 'Theo đề nghị của nhóm: 2,5 triệu/ngày.'),
    ('Số ngày thuê màn', 2, 'ngày', '28/11 lắp đặt + chạy thử, 29/11 trưng bày (6h30–17h00).'),
    ('Tỉ lệ Socratic chịu chi phí dùng chung', 0.7, '%', 'Gian dùng chung với GAVIS; Socratic chiếm phần lớn hạng mục Formex, decal, lắp đặt.'),
    ('Dự phòng phát sinh (trên mục I–V)', 0.05, '%', 'Giá vật tư, hao hụt cắt, vận chuyển phát sinh.'),
    ('Tỉ trọng thiết kế: nhận diện + khẩu hiệu', 0.3, '%', 'Chia chi phí thiết kế (mục VI).'),
    ('Tỉ trọng thiết kế: phối cảnh 3D gian hàng', 0.35, '%', ''),
]
ga.append([]); ga.append(['Thông số', 'Giá trị', 'Đơn vị', 'Căn cứ / ghi chú'])
for c in ga[4]: c.font = font(bold=True, color='FFFFFF'); c.fill = fill(BLUE); c.border = BOX; c.alignment = Alignment(vertical='center')
REF = {}
for i, (k, v, u, n) in enumerate(inputs):
    r = 5 + i; ga.cell(r, 1, k); ga.cell(r, 2, v); ga.cell(r, 3, u); ga.cell(r, 4, n)
    ga.cell(r, 2).font = font(color='0000FF'); ga.cell(r, 2).fill = fill('FFF6CC')
    ga.cell(r, 2).number_format = '0%' if u == '%' else VND
    for c in range(1, 5): ga.cell(r, c).border = BOX; ga.cell(r, c).alignment = Alignment(vertical='center', wrap_text=True)
    REF[i] = f"'Gia dinh'!$B${r}"
r = 5 + len(inputs)
ga.cell(r, 1, 'Tỉ trọng thiết kế: file in + bản vẽ thi công'); ga.cell(r, 2, f'=1-B11-B12'); ga.cell(r, 2).number_format = '0%'; ga.cell(r, 3, '%'); ga.cell(r, 4, 'Phần còn lại (tự tính).')
for c in range(1, 5): ga.cell(r, c).border = BOX
info = r + 2
for j, (k, v) in enumerate([('Sự kiện', 'STEM Carnival · AIROC 2026'), ('Địa điểm', 'Nhà thi đấu Phú Thọ'), ('Lắp đặt', '28/11/2026, 13h30–16h30'), ('Trưng bày', '29/11/2026, 6h30–17h00'), ('Đơn vị', 'Nhóm Socratic Vision Board · THCS Hùng Vương'), ('Đơn vị tiền', 'VND')]):
    ga.cell(info + j, 1, k).font = font(bold=True); ga.cell(info + j, 2, v)
ga.column_dimensions['A'].width = 44; ga.column_dimensions['B'].width = 16; ga.column_dimensions['C'].width = 11; ga.column_dimensions['D'].width = 70
T, PF, PB, DAYS, SHARE, CONT, D1, D2 = (REF[i] for i in range(8)); D3 = f"'Gia dinh'!$B${5 + len(inputs)}"

# ---------------- Chi tiết ----------------
ws = wb.create_sheet('Chi tiet'); ws.sheet_view.showGridLines = False
ws['A1'] = 'DỰ TOÁN CHI TIẾT KINH PHÍ GIAN TRƯNG BÀY SOCRATIC VISION BOARD'; ws['A1'].font = font(size=14, bold=True, color=NAVY)
ws['A2'] = 'STEM Carnival · AIROC 2026 · Nhà thi đấu Phú Thọ · 28–29/11/2026 · Đơn vị tính: VND'; ws['A2'].font = font(italic=True, color='555555')
ws['A3'] = '"Learn the why. Own the future." · Tự học bản chất – Làm chủ tương lai'; ws['A3'].font = font(italic=True, color=BLUE)
H = ['STT', 'Mã', 'Hạng mục', 'Quy cách / vật liệu', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Ghi chú']
hr = 5
for j, h in enumerate(H, 1):
    c = ws.cell(hr, j, h); c.font = font(bold=True, color='FFFFFF'); c.fill = fill(NAVY); c.border = BOX; c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
ws.row_dimensions[hr].height = 26
FX = ('formex',)
sections = [
 ('I', 'THIẾT BỊ TRÌNH DIỄN', [
   ('t1', 'Thuê màn tương tác 65" + chân đế', 'Màn cảm ứng 65" chạy bảng Socratic và Lab 3D', 'ngày', ('ref', DAYS), ('ref', PB), 'Đơn giá theo đề nghị của nhóm'),
   ('t3', 'Vòng đèn LED 4000K chiếu tay', 'Dải LED 5 V cắm USB dưới thanh vòm webcam', 'bộ', 1, 150000, 'Webcam nhóm đã có'),
   ('t5', 'Dây nối USB 1 m + nẹp dây', 'Webcam → cổng USB màn, đi ngầm sau vách chéo', 'bộ', 1, 60000, ''),
 ]),
 ('II', 'KẾT CẤU & VẬT PHẨM FORMEX (in UV + cắt CNC)', [
   ('k3', 'Vách chéo khoét màn 65" (S01, S06)', 'Formex 15 mm 1,87 × 2,2 m (ghép 2 tấm), khoét 1 493 × 907 mm, nẹp viền', 'm²', 4.7, FX, 'Màn 1 483 × 897 × 104 mm'),
   ('n31', 'Cổng Socratic chữ Π (S15)', '2 cột 0,22 × 2,53 m + hộp chữ 3 × 0,62 m + đĩa logo Ø 0,9 m, đỉnh 3,9 m', 'm²', 9.4, FX, 'Xin BTC chiều cao 3,9 m'),
   ('k1', 'Bàn đặt tay Lab 3D (S07)', '0,6 × 0,4 × 0,8 m, 2 vòm cong, thanh vòm gắn webcam', 'm²', 2.3, FX, ''),
   ('n12', 'Chữ đứng "Socratic?" + bệ (S04, S05)', 'Chữ 1,38 m, 3 lớp Formex; bệ 1,48 × 0,28 × 0,14 m', 'm²', 1.5, FX, 'Khu chụp ảnh'),
   ('n1', 'Chữ nổi "Socratic Vision Board" (S06)', 'Formex 10 + 5 mm, dán trên vách chéo', 'm²', 0.3, FX, ''),
   ('n20', 'Bút Socratic khổng lồ 1,75 m (S08)', 'Formex 10 mm in 2 mặt, đế Formex', 'm²', 0.6, FX, ''),
   ('n26', 'Kính lúp khổng lồ 1,5 m (S10)', 'Formex 10 mm in 2 mặt, đế Formex', 'm²', 0.7, FX, ''),
   ('n27', 'Ê-ke khổng lồ 0,7 × 0,95 m (S09)', 'Formex 10 mm khoét lòng, in 2 mặt', 'm²', 0.35, FX, ''),
   ('n28', 'Bình tam giác "3D LAB · 100+" (S13)', 'Formex 10 mm 0,52 × 0,88 m, đế chữ L', 'm²', 0.5, FX, ''),
   ('n29', 'Bóng đèn ý tưởng dây tóc "?" treo (S14)', 'Formex 5 mm 0,56 × 0,86 m, in 2 mặt, dây cước', 'm²', 0.5, FX, ''),
   ('n7s', 'Kệ tờ rơi đỉnh vòm + 3 túi A5 (S17)', 'Formex 10/15/5 mm, 0,32 × 1,45 m', 'm²', 0.8, FX, ''),
   ('a6', 'Giá chữ L cho thẻ QR A6 (S18s)', 'Formex 5 mm gấp V', 'm²', 0.05, FX, ''),
 ]),
 ('III', 'IN ẤN, DECAL & CỜ', [
   ('i1', 'Decal vách sau: ảnh nhóm + mô hình (S02)', 'Decal PP in UV cán mờ, keo bóc được, 1,24 × 2,2 m', 'm²', 2.8, 160000, ''),
   ('i2', 'Decal vách phải: how it works + QR (S03)', 'Decal PP in UV cán mờ, 2,1 × 2,2 m', 'm²', 4.7, 160000, ''),
   ('n6s', 'Cờ buồm 3,5 m Socratic (S16)', 'Vải lụa poly in chuyển nhiệt, cột sợi thủy tinh + chân nước', 'bộ', 1, 700000, ''),
   ('a1s', 'Tờ rơi A5 2 mặt (S11)', 'Couché 200 gsm, cán mờ 2 mặt', 'tờ', 120, 1200, ''),
   ('a6c', 'Thẻ QR dùng thử A6 (S18)', 'Couché 300 gsm cán mờ', 'thẻ', 2, 5000, ''),
 ]),
 ('IV', 'ĐIỆN, LED & PHỤ KIỆN', [
   ('n32', 'Phụ kiện cổng: LED viền, đế, bao cát, đai, ke', 'LED xanh ≈ 12 m + nguồn 12 V', 'lô', 1, 600000, ''),
   ('n4', 'LED chữ nổi và bệ chữ (phần Socratic)', 'LED dây 12 V + nguồn', 'lô', 1, 400000, 'share'),
   ('t4', 'Ổ cắm kéo dài, dây điện, băng dính 2 mặt', 'Nguồn điện chính do BTC cấp', 'lô', 1, 250000, 'share'),
 ]),
 ('V', 'GIA CÔNG, VẬN CHUYỂN & LẮP ĐẶT', [
   ('n0', 'Gia công lắp ghép các món Formex', 'Sơn mép, ghép mộng, keo, ke, vít, khoan đi dây', 'lô', 1, 800000, 'share'),
   ('l1', 'Dán decal, vận chuyển 28/11, tháo dỡ sau triển lãm', '2 thợ + xe nhỏ', 'lô', 1, 1200000, 'share'),
 ]),
]
r = hr + 1; sub = {}; stt = 0
def sec_row(r, code, title):
    ws.cell(r, 1, code); ws.cell(r, 3, title)
    for j in range(1, 10): c = ws.cell(r, j); c.fill = fill(SKY); c.font = font(bold=True, color=NAVY); c.border = BOX
for code, title, rows in sections:
    sec_row(r, code, title); srow = r; r += 1; first = r
    for (m, name, spec, unit, qty, price, note) in rows:
        stt += 1
        ws.cell(r, 1, stt); ws.cell(r, 2, m); ws.cell(r, 3, name); ws.cell(r, 4, spec); ws.cell(r, 5, unit)
        if isinstance(qty, tuple): ws.cell(r, 6, '=' + qty[1]); ws.cell(r, 6).font = font(color='008000')
        else: ws.cell(r, 6, qty); ws.cell(r, 6).font = font(color='0000FF')
        if price == FX: ws.cell(r, 7, '=' + PF); ws.cell(r, 7).font = font(color='008000')
        elif isinstance(price, tuple): ws.cell(r, 7, '=' + price[1]); ws.cell(r, 7).font = font(color='008000')
        else: ws.cell(r, 7, price); ws.cell(r, 7).font = font(color='0000FF')
        if note == 'share':
            ws.cell(r, 8, f'=ROUND(F{r}*G{r}*{SHARE},-3)'); ws.cell(r, 9, '=TEXT(' + SHARE + ',"0%")&" chi phí chung của gian (dùng chung với GAVIS)"')
        else:
            ws.cell(r, 8, f'=ROUND(F{r}*G{r},0)'); ws.cell(r, 9, note)
        ws.cell(r, 6).number_format = '#,##0.##'; ws.cell(r, 7).number_format = VND; ws.cell(r, 8).number_format = VND
        for j in range(1, 10):
            c = ws.cell(r, j); c.border = BOX; c.alignment = Alignment(vertical='center', wrap_text=True, horizontal='center' if j in (1, 2, 5) else None)
            if j == 9: c.font = font(color='555555', italic=True)
            elif j not in (6, 7): c.font = font()
        r += 1
    ws.cell(srow, 8, f'=SUM(H{first}:H{r - 1})'); ws.cell(srow, 8).number_format = VND
    sub[code] = f'H{srow}'
# totals
def tot_row(r, label, formula, strong=False, colr=None):
    ws.cell(r, 3, label); ws.cell(r, 8, formula); ws.cell(r, 8).number_format = VND
    for j in range(1, 10):
        c = ws.cell(r, j); c.border = BOX; c.font = font(bold=True, color='FFFFFF' if strong else NAVY); c.fill = fill(NAVY if strong else (colr or GREY))
r += 0
R_IV = r; tot_row(r, 'CỘNG CHI PHÍ THỰC HIỆN (I – V)', '=' + '+'.join(sub[c] for c in ['I', 'II', 'III', 'IV', 'V'])); r += 1
R_CONT = r; tot_row(r, 'Dự phòng phát sinh', f'=ROUND(H{R_IV}*{CONT},-3)'); ws.cell(r, 9, '=TEXT(' + CONT + ',"0%")&" trên mục I–V"'); r += 1
# VI design
sec_row(r, 'VI', 'CHI PHÍ THIẾT KẾ (bù cho đủ ngân sách xin cấp)'); R_VI = r; r += 1
design_total = f'MAX(0,{T}-H{R_IV}-H{R_CONT})'
d_rows = [('d1', 'Thiết kế nhận diện: logo, wordmark "Socratic?", bộ khẩu hiệu', 'File vector chữ đã chuyển nét, bản sáng / tối / Tiếng Việt, dùng lại cho ấn phẩm sau', D1),
          ('d2', 'Thiết kế phối cảnh 3D gian hàng', 'Mô hình 3D tương tác, các phương án bố trí, kiểm tra tầm nhìn và lối đi', D2),
          ('d3', 'Thiết kế file in + bản vẽ thi công', 'File in 1:1, đường cắt CNC, bản vẽ kích thước 7 tờ A3, bản Corel', None)]
first = r
for (m, name, spec, pct) in d_rows:
    stt += 1; ws.cell(r, 1, stt); ws.cell(r, 2, m); ws.cell(r, 3, name); ws.cell(r, 4, spec); ws.cell(r, 5, 'gói'); ws.cell(r, 6, 1)
    if pct: ws.cell(r, 7, f'=ROUND({design_total}*{pct},-3)')
    else: ws.cell(r, 7, f'={design_total}-G{first}-G{first + 1}')
    ws.cell(r, 8, f'=F{r}*G{r}'); ws.cell(r, 9, 'Tự tính: ngân sách xin cấp trừ chi phí I–V và dự phòng')
    for j in range(1, 10):
        c = ws.cell(r, j); c.border = BOX; c.alignment = Alignment(vertical='center', wrap_text=True, horizontal='center' if j in (1, 2, 5) else None)
        c.font = font(color='555555', italic=True) if j == 9 else font()
    ws.cell(r, 7).number_format = VND; ws.cell(r, 8).number_format = VND; r += 1
ws.cell(R_VI, 8, f'=SUM(H{first}:H{r - 1})'); ws.cell(R_VI, 8).number_format = VND
R_TOT = r; tot_row(r, 'TỔNG KINH PHÍ ĐỀ NGHỊ (I – VI + dự phòng)', f'=H{R_IV}+H{R_CONT}+H{R_VI}', strong=True); r += 1
ws.cell(r, 3, 'Kiểm tra: tổng = ngân sách xin cấp'); ws.cell(r, 8, f'=IF(ABS(H{R_TOT}-{T})<1,"ĐÚNG","LỆCH "&TEXT(H{R_TOT}-{T},"#,##0"))'); ws.cell(r, 3).font = font(italic=True, color='777777'); ws.cell(r, 8).font = font(italic=True, color='008000')
r += 2
ws.cell(r, 1, 'Ghi chú: đơn giá mức phổ thông tại Phú Thọ / Hà Nội, tháng 11/2026; Formex 350 000 đ/m² đã gồm in UV và cắt CNC. Bàn, ghế, vách, điện, đèn, thảm do BTC cấp. Số chữ xanh dương là số nhập; số chữ xanh lá lấy từ trang "Gia dinh".').font = font(italic=True, color='555555')
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=9); ws.row_dimensions[r].height = 30; ws.cell(r, 1).alignment = Alignment(wrap_text=True, vertical='top')
for col, w in zip('ABCDEFGHI', [6, 7, 42, 46, 7, 10, 13, 15, 34]): ws.column_dimensions[col].width = w
ws.freeze_panes = 'A6'
ws.print_title_rows = '5:5'

# ---------------- Tổng hợp ----------------
sm = wb.create_sheet('Tong hop', 0); sm.sheet_view.showGridLines = False
sm['A1'] = 'TRƯỜNG THCS HÙNG VƯƠNG'; sm['A1'].font = font(bold=True)
sm['A2'] = 'NHÓM DỰ ÁN SOCRATIC VISION BOARD'; sm['A2'].font = font(bold=True, color=BLUE)
sm['E1'] = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'; sm['E1'].font = font(bold=True); sm['E2'] = 'Độc lập – Tự do – Hạnh phúc'; sm['E2'].font = font(bold=True, underline='single')
sm['E3'] = 'Phú Thọ, ngày …… tháng 11 năm 2026'; sm['E3'].font = font(italic=True)
sm['A5'] = 'BẢNG DỰ TOÁN KINH PHÍ'; sm['A5'].font = font(size=16, bold=True, color=NAVY); sm['A5'].alignment = Alignment(horizontal='center')
sm.merge_cells('A5:F5')
sm['A6'] = 'Gian trưng bày Socratic Vision Board · STEM Carnival · AIROC 2026 · Nhà thi đấu Phú Thọ, 28–29/11/2026'; sm.merge_cells('A6:F6'); sm['A6'].alignment = Alignment(horizontal='center'); sm['A6'].font = font(italic=True, color='444444')
sm['A7'] = '"Learn the why. Own the future." — Tự học bản chất, làm chủ tương lai'; sm.merge_cells('A7:F7'); sm['A7'].alignment = Alignment(horizontal='center'); sm['A7'].font = font(italic=True, color=BLUE)
hdr = ['STT', 'Nội dung chi', 'Số hạng mục', 'Thành tiền (VND)', 'Tỉ trọng', 'Ghi chú']; HR = 9
for j, h in enumerate(hdr, 1):
    c = sm.cell(HR, j, h); c.font = font(bold=True, color='FFFFFF'); c.fill = fill(NAVY); c.border = BOX; c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
summary = [('I', 'Thiết bị trình diễn', sub['I'], 'Thuê màn 65" ' + '2 ngày × 2,5 triệu'),
           ('II', 'Kết cấu & vật phẩm Formex', sub['II'], 'Formex 350 000 đ/m², gồm cổng nhận diện cao 3,9 m'),
           ('III', 'In ấn, decal & cờ', sub['III'], 'Decal 2 vách, cờ buồm, tờ rơi, thẻ QR'),
           ('IV', 'Điện, LED & phụ kiện', sub['IV'], ''),
           ('V', 'Gia công, vận chuyển & lắp đặt', sub['V'], ''),
           ('', 'Dự phòng phát sinh', f'H{R_CONT}', '5% trên mục I–V'),
           ('VI', 'Chi phí thiết kế', f'H{R_VI}', 'Nhận diện, phối cảnh 3D, file in + bản vẽ thi công')]
r = HR + 1; s0 = r
for code, name, ref, note in summary:
    sm.cell(r, 1, code); sm.cell(r, 2, name)
    cnt = {'I': len(sections[0][2]), 'II': len(sections[1][2]), 'III': len(sections[2][2]), 'IV': len(sections[3][2]), 'V': len(sections[4][2]), 'VI': 3}.get(code, '')
    sm.cell(r, 3, cnt); sm.cell(r, 4, f"='Chi tiet'!{ref}"); sm.cell(r, 4).font = font(color='008000'); sm.cell(r, 4).number_format = VND
    sm.cell(r, 5, f'=IF($D${HR + 1 + len(summary)}=0,0,D{r}/$D${HR + 1 + len(summary)})'); sm.cell(r, 5).number_format = '0.0%'; sm.cell(r, 6, note)
    for j in range(1, 7):
        c = sm.cell(r, j); c.border = BOX; c.alignment = Alignment(vertical='center', wrap_text=True, horizontal='center' if j in (1, 3) else None)
        if j not in (4,): c.font = font(color='555555', italic=True) if j == 6 else font()
    r += 1
R_S = r; sm.cell(r, 2, 'TỔNG KINH PHÍ ĐỀ NGHỊ'); sm.cell(r, 4, f'=SUM(D{s0}:D{r - 1})'); sm.cell(r, 4).number_format = VND; sm.cell(r, 5, f'=SUM(E{s0}:E{r - 1})'); sm.cell(r, 5).number_format = '0.0%'
for j in range(1, 7): c = sm.cell(r, j); c.fill = fill(NAVY); c.font = font(bold=True, color='FFFFFF', size=11); c.border = BOX
r += 1
sm.cell(r, 2, 'Bằng chữ:'); sm.cell(r, 2).font = font(bold=True)
sm.cell(r, 3, f'=IF(D{R_S}=20000000,"Hai mươi triệu đồng chẵn.","(Cập nhật số tiền bằng chữ theo tổng mới)")'); sm.cell(r, 3).font = font(italic=True); sm.merge_cells(start_row=r, start_column=3, end_row=r, end_column=6)
r += 2
notes = ['Căn cứ: hạng mục đã chốt trong bản thiết kế gian (studio 3D, bản 26/11/2026) và bộ hồ sơ thi công gửi xưởng.',
         'BTC cấp sẵn vách, bàn ghế, điện, đèn, thảm; chi phí dùng chung với GAVIS được Socratic chịu 70%.',
         'Chi tiết từng hạng mục xem trang "Chi tiet"; thông số đầu vào xem trang "Gia dinh".']
for n in notes: sm.cell(r, 1, '• ' + n).font = font(color='444444'); sm.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6); r += 1
r += 1
for j, (t, x) in enumerate([('NGƯỜI LẬP', 1), ('TRƯỞNG NHÓM', 3), ('GIÁO VIÊN HƯỚNG DẪN', 5)]):
    c = sm.cell(r, x, t); c.font = font(bold=True); c.alignment = Alignment(horizontal='center')
    sm.cell(r + 1, x, '(Ký, ghi rõ họ tên)').font = font(italic=True, color='777777'); sm.cell(r + 1, x).alignment = Alignment(horizontal='center')
    sm.merge_cells(start_row=r, start_column=x, end_row=r, end_column=x + 1); sm.merge_cells(start_row=r + 1, start_column=x, end_row=r + 1, end_column=x + 1)
r += 6
c = sm.cell(r, 3, 'PHÊ DUYỆT CỦA NHÀ TRƯỜNG'); c.font = font(bold=True); c.alignment = Alignment(horizontal='center'); sm.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
for col, w in zip('ABCDEF', [7, 40, 13, 20, 11, 46]): sm.column_dimensions[col].width = w
sm.row_dimensions[HR].height = 28

for sh in (sm, ws, ga):
    sh.page_setup.orientation = 'landscape'; sh.page_setup.paperSize = sh.PAPERSIZE_A4; sh.page_setup.fitToWidth = 1; sh.page_setup.fitToHeight = 0
    sh.sheet_properties.pageSetUpPr.fitToPage = True; sh.page_margins = PageMargins(left=0.4, right=0.4, top=0.5, bottom=0.5)
    sh.oddFooter.center.text = 'Socratic Vision Board · Dự toán gian AIROC 2026 · Trang &P/&N'
wb.move_sheet('Gia dinh', offset=2)
wb.active = 0
wb.save(OUT); print(OUT)
