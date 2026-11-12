"""Dòng thời gian phim ViSEF theo GIỌNG THẬT học sinh (src-media/1.m4a, 2.2.m4a, 3.m4a, 4.m4a + 13 đoạn thu bổ sung vo-*.m4a) + footage stock.
python -I -X utf8 tao_timeline_giong_that.py  →  public/fn/visef/real/*.wav, public/fn/visef/stock/*.mp4, timeline.json
Phụ đề = lời thật học sinh đọc (sửa chính tả từ chép lời máy, chep-loi-giong-that.txt), mốc theo câu.
Đoạn đọc 2 lần: lấy lần sau (đủ câu, ít vấp). Điểm cắt đặt vào khoảng lặng thật (đo năng lượng 50 ms), không theo mốc whisper — whisper hay báo hụt từ cuối. Ba file "Bản ghi mới*.m4a" (bản văn dài tự viết) KHÔNG dùng: dài hơn ~75 s và có số liệu ngoài báo cáo."""
import bisect
import json
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..', '..', '..')
SRC = os.path.join(ROOT, 'docs', 'bao-cao-freshnose', 'src-media')
STK = os.path.join(ROOT, 'docs', 'bao-cao-freshnose', 'visef', 'stock')
PUB = os.path.join(ROOT, 'socratic-video', 'public', 'fn', 'visef')
FF = r'C:\Users\Admin\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
os.makedirs(os.path.join(PUB, 'real'), exist_ok=True)
os.makedirs(os.path.join(PUB, 'stock'), exist_ok=True)

# stock: (mã, file gốc, giây bắt đầu, độ dài, ghi công)
STOCK = {
    's08': ('08_cho-dua-hau-len-pha-vn.mp4', 6.0, 5.0, 'Footage: khanhhoangminh / Pexels – Pexels License'),
    's01': ('01_moc-phat-trien-timelapse.mp4', 2.0, 5.0, 'Footage: adege / Pixabay – Pixabay Content License'),
    's03': ('03_tay-cham-qua-trong-thung.mp4', 3.0, 5.0, 'Footage: Ron Lach / Pexels – Pexels License'),
    's02': ('02_kiem-tra-hang-trai-cay.mp4', 1.0, 5.0, 'Footage: Phillips Vinegar / Pexels – Pexels License'),
    's06': ('06_chuoi-tren-thung.mp4', 2.0, 5.0, 'Footage: Luis Quintero / Pexels – Pexels License'),
}
for k, (f, a, d, _) in STOCK.items():
    out = os.path.join(PUB, 'stock', f'{k}.mp4')
    if not os.path.exists(out):
        subprocess.run([FF, '-v', 'error', '-y', '-ss', str(a), '-t', str(d + 0.5), '-i', os.path.join(STK, f), '-an', '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-g', '15', out], check=True)

# giọng: chuẩn hóa cả file (lọc ù, giảm ồn nhẹ, −18 LUFS) rồi cắt theo câu
NORM = {}
BS = ['vo-2.1', 'vo-2.2', 'vo-2.3', 'vo-4.3', 'vo-4.4', 'vo-5.1', 'vo-5.2', 'vo-5.3', 'vo-5.4', 'vo-6.1', 'vo-6.2', 'vo-6.3', 'vo-6.4']
for f in ['1', '2.2', '3', '4'] + BS:
    out = os.path.join(PUB, 'real', f'full-{f}.wav')
    if not os.path.exists(out):
        subprocess.run([FF, '-v', 'error', '-y', '-i', os.path.join(SRC, f'{f}.m4a'), '-af', 'highpass=f=80,afftdn=nf=-30,loudnorm=I=-18:TP=-2:LRA=9', '-ar', '48000', '-ac', '1', out], check=True)
    NORM[f] = out


def piece(src, a, b, name):
    out = os.path.join(PUB, 'real', f'{name}.wav')
    subprocess.run([FF, '-v', 'error', '-y', '-ss', f'{a:.2f}', '-to', f'{b:.2f}', '-i', NORM[src], '-af', 'afade=t=in:d=0.03,areverse,afade=t=in:d=0.08,areverse', out], check=True)
    return f'real/{name}.wav'


def cues(sents, a0):
    """câu [bắt đầu, kết thúc, chữ] (giây file gốc) → khung phụ đề ≤ 2 dòng × 42 ký tự, mốc theo giây trong cảnh"""
    out = []
    for a, b, text in sents:
        words, lines, cur = text.split(), [], ''
        for w in words:
            if cur and len(cur) + 1 + len(w) > 42:
                lines.append(cur)
                cur = w
            else:
                cur = f'{cur} {w}' if cur else w
        lines.append(cur)
        groups = [lines[i:i + 2] for i in range(0, len(lines), 2)]
        tot = sum(len(' '.join(g)) for g in groups)
        t = a
        for g in groups:
            e = t + (b - a) * len(' '.join(g)) / tot
            out.append([round(t - a0 + LEAD, 2), round(e - a0 + LEAD, 2), '\n'.join(g).replace('¤', ' ')])
            t = e
    return out


LEAD, TAIL = 0.3, 0.35
# mốc từng từ đo từ giọng thật (moc_tu.py); có thì phụ đề bám theo lời, không thì chia đều theo số ký tự
MOC_F = os.path.join(HERE, 'moc-tu.json')
MOC = json.load(open(MOC_F, encoding='utf8')) if os.path.exists(MOC_F) else {}


def retime(subs, ws):
    """khung phụ đề thứ i chiếm đoạn ký tự [f0, f1) của lời → hiện từ đầu từ ở vị trí f0, tắt sau cuối từ ở f1"""
    L = [len(c[2].replace('\n', ' ')) + 1 for c in subs]
    tot, wtot = sum(L), sum(len(w[2]) + 1 for w in ws)
    ends, acc = [], 0
    for w in ws:
        acc += len(w[2]) + 1
        ends.append(acc / wtot)
    word = lambda f: min(bisect.bisect_left(ends, f), len(ws) - 1)
    out, pos = [], 0
    for c, l in zip(subs, L):
        i0 = word(pos / tot + 1e-6)
        pos += l
        i1 = word(pos / tot - 1e-6)
        a = max(ws[i0][0] - 0.15, out[-1][1] if out else 0.0)
        out.append([round(a, 2), round(max(ws[i1][1] + 0.25, a + 0.8), 2), c[2]])
    for x, y in zip(out, out[1:]):  # khe < 0,5 s thì nối để chữ không nháy
        if y[0] - x[1] < 0.5:
            x[1] = y[0]
    return out
# (view, độ dài nếu không lời, [nguồn audio, a, b, [câu]])
V = lambda view, d: (view, d, None)
A = lambda view, src, a, b, sents: (view, None, (src, a, b, sents))
M = lambda view, d, parts: (view, d, parts)  # cảnh độ dài cố định, nhiều đoạn lời (src, a, b, câu, giây đặt)
PLAN = [
    V('1.1', 8.0),
    # VẤN ĐỀ (chưa có giọng): stock Việt Nam → 25,4 % → quả hỏng lan → pallet → tay kiểm tra → 15/18
    V('stk:s08', 3.5),
    A('2.1', 'vo-2.1', 0.35, 6.75, [[0.56, 6.48, 'Theo FAO, năm 2023 thế giới mất 25,4¤% rau quả sau thu hoạch.']]),
    V('stk:s01', 3.0),
    A('2.2', 'vo-2.2', 0.30, 6.10, [[0.50, 5.78, 'Trong kho mát, một sọt xoài dập có thể lên men rồi lây ra cả pallet, dù nhiệt độ kho vẫn bình thường.']]),
    V('stk:s03', 3.0),
    A('2.3', 'vo-2.3', 0.25, 7.15, [[0.46, 6.84, 'Nhóm em đã khảo sát 18 đơn vị: 15 nơi vẫn kiểm tra bằng mắt và mũi, tức là chỉ thấy khi quả đã thối.']]),
    # 1.m4a – hạn chế, giới thiệu, nguyên lý, mục tiêu
    A('L-sol', '1', 0.10, 17.45, [
        [0.27, 7.67, 'Các phương pháp kiểm tra hiện nay vẫn tồn tại những hạn chế nhất định: quan sát bằng mắt hay ngửi trực tiếp thường khó phát hiện hư hỏng ở giai đoạn sớm.'],
        [7.71, 13.19, 'Trong khi đó, nhiệt độ và độ ẩm chỉ phản ánh điều kiện môi trường, chưa đủ để xác định tình trạng lên men của quả.'],
        [13.59, 17.19, 'Máy đo khí cầm tay cũng đòi hỏi người sử dụng phải kiểm tra từng vị trí riêng biệt.']]),
    A('L-reveal', '1', 17.45, 27.80, [
        [17.69, 27.49, 'Xuất phát từ những hạn chế đó, nhóm em phát triển FreshNose AI – hệ thống mũi điện tử chi phí thấp, có khả năng giám sát liên tục và cảnh báo sớm nguy cơ lên men của rau quả sau thu hoạch.']]),
    A('4.1', '1', 27.80, 33.40, [[28.05, 33.21, 'Về nguyên lý, khi rau quả bắt đầu lên men, các hợp chất bay hơi, trong đó có cồn, sẽ thay đổi.']]),
    A('4.2', '1', 33.40, 43.70, [[33.61, 43.39, 'Hệ thống sử dụng hai cảm biến khí kết hợp với cảm biến nhiệt độ và độ ẩm để thu thập dữ liệu, sau đó ứng dụng thuật toán Random Forest nhằm nhận diện đặc trưng tín hiệu và phân loại trạng thái của quả.']]),
    A('L-targets', '1', 43.70, 55.15, [[43.80, 54.53, 'Thông qua đó, nhóm đặt ra ba mục tiêu: độ chính xác phân loại đạt ít nhất 85¤%, tỉ lệ cảnh báo giả không quá 10¤% và thời gian phát hiện sớm hơn bằng mắt thường ít nhất 12¤giờ.']]),
    # THIẾT KẾ THÍ NGHIỆM + SẢN PHẨM (thu bổ sung)
    A('4.3', 'vo-4.3', 0.80, 10.20, [[1.04, 9.88, 'Thí nghiệm có ba đợt, mỗi đợt ba buồng: quả lành, quả bị xước và quả nhiễm nấm, đo 30¤phút một lần, được 4.500¤mẫu.']]),
    A('4.4', 'vo-4.4', 0.50, 5.45, [[0.72, 5.12, 'Mô hình học trên hai đợt đầu, rồi kiểm tra trên đợt ba mà nó chưa từng thấy.']]),
    A('5.1', 'vo-5.1', 0.25, 6.20, [[0.46, 5.90, 'Các Node gắn nam châm trên thành pallet, rồi gửi dữ liệu qua sóng LoRa về một trạm đặt gần cửa kho.']]),
    A('5.2', 'vo-5.2', 9.20, 16.85, [[9.43, 16.61, 'Mỗi Node có hai cảm biến khí, cảm biến nhiệt ẩm, vi điều khiển ESP32 và pin; màng chống nước giữ cảm biến luôn khô.']]),
    # 5.34 = HubReplay cắt 17,5 s (phát lại chạy 3,5–18 s), hai đoạn lời đặt trong cảnh (5.3 lúc 0,3 s, 5.4 lúc 9 s)
    M('5.34', 17.5, [('vo-5.3', 0.50, 7.10, [[0.72, 6.58, 'Trạm tô màu từng phân khu: xanh là ổn định, vàng là cần theo dõi, đỏ là nguy cơ lên men.']], 0.3),
                     ('vo-5.4', 11.00, 17.80, [[11.26, 17.48, 'Đây là dữ liệu thật của đợt ba phát lại trên trạm: buồng nhiễm nấm và buồng xước lần lượt chuyển đỏ, buồng đối chứng vẫn xanh.']], 9.0)]),
    # 2.2.m4a – quá trình cải tiến
    A('I-intro', '2.2', 0.30, 7.90, [[0.56, 7.58, 'Trong quá trình nghiên cứu, nhóm không chỉ tập trung hoàn thiện nguyên lý hoạt động mà còn liên tục thử nghiệm để khắc phục những vấn đề phát sinh từ thực tế.']]),
    A('5.5', '2.2', 7.90, 20.50, [[8.14, 20.22, 'Ở phiên bản đầu tiên, các cảm biến hoạt động liên tục khiến pin nhanh chóng cạn, chưa đầy một ngày đã cần sạc lại. Để cải thiện, nhóm chuyển sang cơ chế đo định kỳ 30¤phút một lần, kết hợp chế độ ngủ sâu nhằm giảm mức tiêu thụ năng lượng.']]),
    A('5.6', '2.2', 20.50, 31.35, [[20.78, 31.06, 'Một vấn đề khác xuất hiện khi hơi nước ngưng tụ trên cảm biến làm tín hiệu đo bị thay đổi và có nguy cơ gây cảnh báo sai. Nhóm đã bổ sung màng chống nước tại cửa lấy khí để hạn chế ảnh hưởng của độ ẩm.']]),
    A('5.7', '2.2', 31.35, 44.25, [[31.60, 44.02, 'Ngoài ra, thiết bị từng ghi nhận hiện tượng cảnh báo đỏ giả theo chu kỳ, được nghi ngờ có liên quan đến quá trình xả đá của kho. Vì vậy, nhóm tiếp tục bổ sung dữ liệu về nhiệt độ và độ ẩm vào mô hình nhận dạng để cải thiện khả năng phân biệt tín hiệu.']]),
    A('5.8', '2.2', 44.25, 51.20, [[44.48, 50.70, 'Sau nhiều lần điều chỉnh, nguyên mẫu hiện tại đã hoàn thiện với một trạm trung tâm và ba Node cảm biến do chính nhóm tự lắp ráp.']]),
    # KẾT QUẢ (thu bổ sung)
    A('6.1', 'vo-6.1', 10.80, 20.90, [[11.01, 20.65, 'Trên đợt kiểm tra, mô hình phân loại đúng 87,5¤%, nhận ra 498 trên 500 mẫu đang lên men, và cảnh báo giả 6,2¤%.']]),
    A('6.2', 'vo-6.2', 0.30, 7.05, [[0.53, 6.71, 'Khi quả lên men, tín hiệu của cả hai cảm biến cùng tụt xuống khoảng 0,3, còn quả lành chỉ giảm nhẹ khi chín.']]),
    A('6.3', 'vo-6.3', 0.50, 8.10, [[0.72, 7.76, 'Ở cả sáu chuỗi quả hỏng, mức đỏ xuất hiện trước khi thấy vết thối trung bình khoảng 26¤giờ, đủ để tách sọt trong một ca.']]),
    A('6.4', 'vo-6.4', 0.20, 5.10, [[0.46, 4.90, 'Một Node chạy hơn ba tuần mới phải sạc, đủ một chu kỳ lưu kho.']]),
    # 3.m4a – hạn chế, hướng đi, chi phí, kết
    A('7.1', '3', 0.40, 21.30, [
        [0.75, 12.25, 'Bên cạnh những kết quả đạt được, nhóm cũng thẳng thắn nhìn nhận một số hạn chế của sản phẩm. Khả năng nhận diện nhóm quả chín sinh lý hiện mới đạt 45¤%, đồng thời hệ thống vẫn đang trong giai đoạn kiểm chứng ở quy mô phòng thí nghiệm.'],
        [12.63, 20.95, 'Trong giai đoạn tiếp theo, nhóm dự kiến mở rộng thử nghiệm tại hai kho mát thực tế, qua đó đánh giá độ ổn định và khả năng thích ứng của thiết bị trong điều kiện vận hành thực tế.']]),
    A('7.2', '3', 21.30, 32.50, [[21.57, 31.99, 'Về chi phí, phương án triển khai gồm một trạm trung tâm và tám Node cảm biến có giá dự kiến 22¤triệu đồng; mức chi phí này nằm trong khả năng đầu tư của 13 trên 18 đơn vị tham gia khảo sát.']]),
    A('7.3', '3', 32.50, 51.07, [[32.83, 50.39, 'Với độ chính xác 87,5¤% cùng khả năng cảnh báo sớm trung bình 26¤giờ, FreshNose AI không chỉ hướng tới việc ứng dụng công nghệ vào bảo quản nông sản mà còn mong muốn mang đến một giải pháp thiết thực, giúp người quản lý kho chủ động kiểm soát nguy cơ hư hỏng, giảm thất thoát và nâng cao hiệu quả bảo quản rau củ quả sau thu hoạch.']]),
    A('slogan', '4', 0.20, 4.33, [[0.40, 4.08, 'FreshNose AI – ngửi thấy vi khí, giữ trọn vị tươi.']]),
]

segs, t, n = [], 0.0, 0
for view, d, au in PLAN:
    n += 1
    vo, subs = [], []
    if isinstance(au, list):
        for k, (src, a, b, sents, at) in enumerate(au):
            vo.append({'file': piece(src, a, b, f'{n:02d}-{view}-{k}'), 'at': at})
            subs += [[x + at - LEAD, y + at - LEAD, z] for x, y, z in cues(sents, a)]
        assert at + (b - a) < d, view
    elif au:
        src, a, b, sents = au
        vo = [{'file': piece(src, a, b, f'{n:02d}-{view.replace(":", "")}'), 'at': LEAD}]
        subs = cues(sents, a)
        d = LEAD + (b - a) + TAIL + (0.6 if view == '7.3' else 0) + (0.9 if view == 'slogan' else 0)
    if subs and view in MOC:
        subs = retime(subs, MOC[view])
    seg = {'id': f'{n:02d}', 'view': view, 'start': round(t, 3), 'dur': round(d, 3), 'vo': vo, 'subs': subs, 'light': view in ('5.1', '5.2', '5.34')}
    if view.startswith('stk:'):
        seg['credit'] = STOCK[view[4:]][3]
    segs.append(seg)
    t += d
TOTAL = round(t, 2)
first = lambda v: next(s['start'] for s in segs if s['view'] == v)
markers = {'drop': 3.5, 'lullA': first('6.1'), 'lullB': first('7.1'), 'outro': first('7.3'), 'end': TOTAL - 2.0, 'total': TOTAL}
json.dump({'segments': segs, 'markers': markers}, open(os.path.join(PUB, 'timeline.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
stock_s = sum(s['dur'] for s in segs if s['view'].startswith('stk:'))
assert all(len(l) <= 42 for s in segs for c in s['subs'] for l in c[2].split('\n'))
assert TOTAL <= 290, TOTAL
print(f'tong {int(TOTAL // 60)}:{TOTAL % 60:05.2f}, stock {stock_s:.1f} s = {100 * stock_s / TOTAL:.0f} %, {len(segs)} canh')
