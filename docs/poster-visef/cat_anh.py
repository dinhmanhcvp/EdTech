# Cắt gọn ảnh chụp sản phẩm (assets/chup → assets/*.png) và ảnh bảng AI iFLYTEK cho poster.
# Chạy: python -X utf8 cat_anh.py "<đường dẫn ảnh iFLYTEK>"   (bỏ tham số nếu assets/iflytek.png đã có)
import os, sys
from PIL import Image

A = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")


def board(src, dst, pad=40):
    """Khung hình bảng: bỏ thanh công cụ (mép trên, cột trái dưới), lấy vùng có nét mực/mô phỏng."""
    im = Image.open(f"{A}/chup/{src}.png").convert("RGB")
    g = im.convert("L").point(lambda v: 255 if v < 185 else 0)
    w, h = im.size
    g.paste(0, (0, 0, w, 75)); g.paste(0, (0, 600, 330, h)); g.paste(0, (0, h - 60, w, h))
    x0, y0, x1, y1 = g.getbbox()
    im.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))).save(f"{A}/{dst}.png")


for s, d in [("demo-10d-90", "bang_rlc"), ("demo-08-95", "bang_conlac"), ("demo-10b-90", "bang_no2"), ("demo-10f-90", "bang_adn"),
             ("demo-06-07-95", "bang_khoi"), ("demo-13A-90", "bang_buoc"), ("demo-10c-90", "bang_chop")]:
    board(s, d)

# khung không cần dò: cắt theo hộp cố định (px trên ảnh 1920×1080)
for s, d, box in [("demo-13-phone-90", "hs_dienthoai", (660, 0, 1260, 1080)), ("demo-12a-90", "gv_console", (100, 0, 1820, 1080)),
                  ("demo-14b-90", "hs_giasu", (360, 0, 1560, 1080)), ("lab-balance", "lab_can", (0, 0, 1920, 1080)),
                  ("lab-chem", "lab_hoa", (0, 0, 1920, 1080)), ("lab-titration", "lab_chuando", (0, 0, 1920, 1080))]:
    Image.open(f"{A}/chup/{s}.png").convert("RGB").crop(box).save(f"{A}/{d}.png")

if len(sys.argv) > 1:
    im = Image.open(sys.argv[1]).convert("RGB")
    w, h = im.size
    im = im.crop((0, round(h * .215), w, round(h * .785)))          # bỏ hai dải xám trên dưới của video dọc
    im.resize((im.width * 3, im.height * 3), Image.LANCZOS).save(f"{A}/iflytek.png")   # phóng để bớt răng cưa khi in; không thêm chi tiết
print("ok")
