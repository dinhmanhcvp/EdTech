# Asset đồ họa cho poster: sơ đồ lây lan (minh họa), biểu đồ ô vuông khảo sát, ma trận thiết kế thí nghiệm, biểu đồ pin v1→v2,
# bảng điểm đối chiếu ngưỡng, sơ đồ kho nhiều Node (thiết kế dự kiến). Số liệu lấy từ báo cáo bản cuối; hình minh họa ghi rõ trong poster.
# Chạy: python -X utf8 ve_asset.py
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets")
NAVY, GREY, LIGHT, PALE, INK = "#0E6B47", "#8A8A8A", "#8CCBA9", "#CFE8D9", "#1A1A1A"
K = 1.2
plt.rcParams.update({"font.family": "Roboto", "font.size": 24, "text.color": INK})
CM = 1 / 2.54


def canvas(w, h):
    """Hệ tọa độ = cm trên bản in; chữ phóng ×K bằng cách thu khung vẽ."""
    fig = plt.figure(figsize=(w * CM / K, h * CM / K), dpi=200 * K)
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, w); ax.set_ylim(0, h); ax.axis("off")
    return fig, ax


def save(fig, name):
    fig.savefig(os.path.join(OUT, name), facecolor="white"); plt.close(fig)


def crate(ax, x, y, w, h, fc, ec=NAVY, lw=3.2):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.35", fc=fc, ec=ec, lw=lw))


# ---- ①: một sọt thối lây sang sọt kế bên (minh họa cơ chế, không phải số đo) ----
fig, ax = canvas(54, 10)
cw, ch, gx, gy = 3.6, 1.8, 0.5, 0.4
bad = (2, 1)
def grid(x0, y0, spread):
    for r in range(3):
        for c in range(5):
            dist = max(abs(r - bad[1]), abs(c - bad[0]))
            if (c, r) == bad: fc = NAVY
            elif spread and dist == 1: fc = LIGHT
            else: fc = "white"
            crate(ax, x0 + c * (cw + gx), y0 + (2 - r) * (ch + gy), cw, ch, fc)
grid(1.0, 2.5, False); grid(30.2, 2.5, True)
ax.add_patch(FancyArrowPatch((22.5, 5.4), (28.8, 5.4), arrowstyle="-|>", mutation_scale=45, lw=5, color=NAVY))
ax.text(10.1, 0.9, "Lúc đầu: 1 sọt hỏng", ha="center", fontsize=25, fontweight="bold")
ax.text(39.3, 0.9, "Sau đó: lan sang sọt kế bên", ha="center", fontsize=25, fontweight="bold")
ax.text(25.65, 7.0, "ethylene,\nbào tử", ha="center", va="bottom", fontsize=22, color="#5A5A5A")
for x, fc, t in ((1.0, NAVY, "sọt hỏng"), (9.0, LIGHT, "sọt bị lây")):
    crate(ax, x, 9.0, 1.2, 0.8, fc, lw=2); ax.text(x + 1.5, 9.4, t, va="center", fontsize=21)
save(fig, "bd_lay_lan.png")

# ---- ②: khảo sát 18 đơn vị, mỗi ô vuông là một đơn vị ----
fig, ax = canvas(54, 12)
rows = [("Kiểm tra bằng mắt, mũi", 15), ("Từng bị thối lây cả pallet", 14), ("Sẵn sàng chi 15–25 triệu đồng", 13)]
s, gap = 1.1, 0.18
for i, (lab, k) in enumerate(rows):
    y = 12 - 3.6 * (i + 1) + 0.5
    ax.text(0.2, y + s / 2, lab, va="center", fontsize=26)
    for j in range(18):
        ax.add_patch(Rectangle((24.2 + j * (s + gap), y), s, s, fc=NAVY if j < k else "white", ec=NAVY if j < k else GREY, lw=2.5))
    ax.text(53.8, y + s / 2, f"{k}/18", va="center", ha="right", fontsize=34, fontweight="bold", color=NAVY)
ax.add_patch(Rectangle((24.2, 0.15), 0.9, 0.9, fc=NAVY, ec=NAVY)); ax.text(25.4, 0.6, "= 1 đơn vị trả lời có", va="center", fontsize=21)
save(fig, "bd_khao_sat.png")

# ---- ④: thiết kế thực nghiệm 3 điều kiện × 3 đợt, 500 mẫu mỗi chuỗi ----
fig, ax = canvas(54, 11.5)
conds = ["Lành lặn (đối chứng)", "Gây xước", "Nhiễm nấm thán thư"]
cx0, cwid, rh = 17.0, 11.6, 2.5
for j, h in enumerate(["Đợt 1", "Đợt 2", "Đợt 3 · kiểm tra"]):
    ax.text(cx0 + j * (cwid + 0.5) + cwid / 2, 10.3, h, ha="center", fontsize=24, fontweight="bold", color=NAVY)
for i, cname in enumerate(conds):
    y = 7.6 - i * (rh + 0.4)
    ax.text(0.1, y + rh / 2, cname, va="center", fontsize=24)
    for j in range(3):
        train = j < 2
        crate(ax, cx0 + j * (cwid + 0.5), y, cwid, rh, NAVY if train else "white", lw=3.5)
        ax.text(cx0 + j * (cwid + 0.5) + cwid / 2, y + rh / 2, "500 mẫu", ha="center", va="center", fontsize=24, fontweight="bold", color="white" if train else NAVY)
crate(ax, 17.0, 0.2, 1.1, 0.8, NAVY, lw=2); ax.text(18.5, 0.6, "huấn luyện (3.000 mẫu)", va="center", fontsize=21)
crate(ax, 35.0, 0.2, 1.1, 0.8, "white", lw=2.5); ax.text(36.5, 0.6, "kiểm tra (1.500 mẫu)", va="center", fontsize=21)
save(fig, "bd_thiet_ke_tn.png")

# ---- ⑤: thời gian chạy pin v1 so với v2 (nhật ký đo v1, v2 và nhật ký pin 23,5 ngày) ----
fig, ax = canvas(54, 6.5)
ax.add_patch(Rectangle((11.5, 4.1), 18.5 / 700 * 40, 1.7, fc=GREY)); ax.text(11.5 + 0.3 + 18.5 / 700 * 40 + 0.3, 4.95, "18–19 giờ", va="center", fontsize=27, fontweight="bold")
ax.text(0.1, 4.95, "v1 · đo liên tục", va="center", fontsize=25)
ax.add_patch(Rectangle((11.5, 1.3), 563.5 / 700 * 40, 1.7, fc=NAVY)); ax.text(11.5 + 563.5 / 700 * 40 - 0.5, 2.15, "23,5 ngày", va="center", ha="right", fontsize=27, fontweight="bold", color="white")
ax.text(0.1, 2.15, "v2 · đo ngắt quãng", va="center", fontsize=25)
save(fig, "bd_pin.png")

# ---- ⑧: bảng điểm đối chiếu ngưỡng thiết kế (Bảng 4.5 của báo cáo) ----
fig, ax = canvas(54, 18)
items = [("Độ chính xác", "≥ 85 %", 87.5, 85, "87,5 %"), ("Cảnh báo giả", "≤ 10 %", 6.2, 10, "6,2 %"),
         ("Báo sớm hơn mắt thường", "≥ 12 giờ", 26.3, 12, "26,3 giờ"), ("Node chạy trên pin", "≥ 20 ngày", 23.5, 20, "23,5 ngày"),
         ("Giá bán gói 1 Hub + 8 Node", "≤ 22 triệu", 22.0, 22, "22 triệu")]
x0, scale = 17.5, 0.2          # ngưỡng ở vị trí x0 + 50*scale*... (mọi hàng chuẩn hóa: ngưỡng = 50 đơn vị)
tw = 150 * 0.18
for i, (lab, thr, val, tv, txt) in enumerate(items):
    y = 18 - 3.4 * (i + 1) + 0.5
    ax.text(0.1, y + 1.45, lab, va="center", fontsize=24)
    ax.text(0.1, y + 0.45, "ngưỡng " + thr, va="center", fontsize=21, color="#5A5A5A")
    ax.add_patch(Rectangle((x0, y + 0.2), tw, 1.9, fc="#E3F2E9", ec="none"))
    L = val / tv * 50 * 0.18
    ax.add_patch(Rectangle((x0, y + 0.2), L, 1.9, fc=NAVY))
    ax.plot([x0 + 50 * 0.18] * 2, [y - 0.1, y + 2.4], color=INK, lw=3.5)
    ax.text(x0 + L - 0.5, y + 1.15, txt, va="center", ha="right", fontsize=26, fontweight="bold", color="white")
    crate(ax, 46.2, y + 0.25, 6.6, 1.7, NAVY, lw=1); ax.text(49.5, y + 1.1, "Đạt", ha="center", va="center", fontsize=25, fontweight="bold", color="white")
ax.plot([x0 + 50 * 0.18] * 2, [0.2, 0.55], color=INK, lw=3.5); ax.text(x0 + 50 * 0.18 + 0.5, 0.4, "vạch = ngưỡng thiết kế", va="center", fontsize=21, color="#5A5A5A")
save(fig, "bd_tieu_chi.png")

# ---- ⑨: thiết kế dự kiến, mỗi dãy kệ một Node (chưa kiểm chứng) ----
fig, ax = canvas(54, 10.5)
names = [["A1", "A2", "A3", "A4"], ["B1", "B2", "B3", "B4"]]
rw, rhh = 10.4, 2.9
hub = (3.2, 5.3)
ax.add_patch(Rectangle((hub[0] - 1.2, hub[1] - 1.2), 2.4, 2.4, fc=INK)); ax.text(hub[0], hub[1] - 2.0, "Hub", ha="center", va="top", fontsize=22, fontweight="bold")
for r in range(2):
    for c in range(4):
        x = 8.2 + c * (rw + 0.7); y = 6.7 - r * 4.6
        hot = (r, c) == (0, 3)
        crate(ax, x, y, rw, rhh, NAVY if hot else "white", lw=3.2)
        ax.text(x + 1.0, y + rhh / 2, names[r][c], va="center", fontsize=26, fontweight="bold", color="white" if hot else NAVY)
        nx, ny = x + rw - 1.6, y + rhh / 2
        ax.plot([hub[0] + 1.2, nx], [hub[1], ny], color=GREY, lw=1.8, ls=(0, (4, 4)), zorder=0)
        ax.add_patch(Circle((nx, ny), 0.55, fc="white" if hot else NAVY, ec="white" if hot else NAVY, lw=2))
ax.text(8.2 + 3 * (rw + 0.7) + rw / 2 - 1.5, 10.1, "báo mức đỏ", ha="center", va="center", fontsize=22, fontweight="bold", color=NAVY)
ax.add_patch(Circle((9.0, 0.6), 0.5, fc=NAVY)); ax.text(9.9, 0.6, "Node (mỗi dãy kệ một Node)", va="center", fontsize=21)
save(fig, "bd_kho_dang_ke.png")
print("ok")
