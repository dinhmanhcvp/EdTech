# Vẽ Hình 3.1 (quy trình nghiên cứu) và Hình 4.1 (sơ đồ khối hệ thống). Chạy: python -X utf8 ve_so_do.py
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

HERE = os.path.dirname(os.path.abspath(__file__))
plt.rcParams["font.family"] = "Times New Roman"
NAVY, GREY = "#1F3A5F", "#8A8A8A"

def box(ax, x, y, w, h, text, fc="white", ec=NAVY, fs=8, tc="black"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.06", fc=fc, ec=ec, lw=1.1))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color=tc, linespacing=1.15)

def arrow(ax, p, q, ls="-", color=NAVY):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=10, lw=1.1, color=color, linestyle=ls, shrinkA=0, shrinkB=0))

def canvas(w_cm, h_cm, xmax, ymax):
    fig, ax = plt.subplots(figsize=(w_cm / 2.54, h_cm / 2.54), dpi=300)
    ax.set_xlim(0, xmax); ax.set_ylim(0, ymax); ax.axis("off")
    fig.subplots_adjust(0.01, 0.01, 0.99, 0.99)
    return fig, ax

# ---------- Hình 3.1 ----------
fig, ax = canvas(15, 5.6, 15, 5.6)
w, h = 3.3, 1.35
xs = [0.15, 3.95, 7.75, 11.55]
top = ["1. Xác định vấn đề\n(khảo sát, n = 18)", "2. Đặt tiêu chí\nTC1–TC5 (Bảng 2.1)", "3. Đề xuất phương án\nMOX + SHT31 + LoRa\n+ Random Forest", "4. Chế tạo nguyên mẫu\n(1 Hub, 3 Node)"]
bot = ["8. Cải tiến", "7. Đối chiếu tiêu chí\n(Bảng 4.5)", "6. Huấn luyện, đánh giá\nmô hình (đợt 1, 2 → 3)", "5. Thí nghiệm\n3 đợt × 3 chuỗi, 4.500 mẫu"]
yt, yb = 3.7, 0.6
for x, t in zip(xs, top): box(ax, x, yt, w, h, t)
for x, t in zip(xs, bot): box(ax, x, yb, w, h, t, fc="#EEF1F6" if t.startswith("8") else "white")
for a, b in zip(xs[:-1], xs[1:]): arrow(ax, (a + w, yt + h / 2), (b, yt + h / 2))
for a, b in zip(xs[1:], xs[:-1]): arrow(ax, (a, yb + h / 2), (b + w, yb + h / 2))
arrow(ax, (xs[3] + w - 0.6, yt), (xs[3] + w - 0.6, yb + h))                      # 4 -> 5
ax.plot([xs[0] + w / 2, xs[0] + w / 2], [yb + h, 2.65], color=GREY, lw=1.1, ls="--")  # 8 -> 4: cải tiến quay lại chế tạo
ax.plot([xs[0] + w / 2, xs[3] + 0.6], [2.65, 2.65], color=GREY, lw=1.1, ls="--")
arrow(ax, (xs[3] + 0.6, 2.65), (xs[3] + 0.6, yt), ls="--", color=GREY)
ax.text(6.0, 2.8, "quay lại chế tạo nếu chưa đạt tiêu chí", fontsize=8, color=GREY, ha="center", style="italic")
fig.savefig(os.path.join(HERE, "hinh_3_1_quy_trinh.png"))

# ---------- Hình 4.1 ----------
fig, ax = canvas(15, 5.8, 15, 5.8)
ax.add_patch(FancyBboxPatch((0.15, 0.6), 6.3, 4.6, boxstyle="round,pad=0.02,rounding_size=0.08", fc="#F7F8FA", ec=GREY, lw=1, ls="--"))
ax.text(3.3, 4.95, "Node (gắn thành pallet / họng hồi gió)", ha="center", va="center", fontsize=8.5, fontweight="bold")
for y, t in zip([3.75, 2.75, 1.75], ["TGS2602 (VOC)", "TGS822 (ethanol)", "SHT31 (nhiệt, ẩm)"]): box(ax, 0.3, y, 2.4, 0.8, t, fs=7.5)
box(ax, 3.3, 2.2, 1.7, 2.1, "ESP32-S3\nđọc ADC,\nlọc trung vị,\nbù nhiệt ẩm", fs=7.5)
box(ax, 5.2, 2.2, 1.05, 2.1, "LoRa\nAS923", fs=7.5)
for y0, y1 in ((4.15, 3.95), (3.15, 3.25), (2.15, 2.55)): arrow(ax, (2.7, y0), (3.3, y1))
arrow(ax, (5.0, 3.25), (5.2, 3.25))
ax.text(3.3, 1.0, "đo 30 phút/lần: gia nhiệt 120 s, đọc 30 s,\nngủ sâu; pin LiFePO4 6.000 mAh", ha="center", va="center", fontsize=7, style="italic")
ax.add_patch(FancyBboxPatch((7.35, 0.6), 4.0, 4.6, boxstyle="round,pad=0.02,rounding_size=0.08", fc="#F7F8FA", ec=GREY, lw=1, ls="--"))
ax.text(9.35, 4.95, "Hub (gần cửa kho)", ha="center", va="center", fontsize=8.5, fontweight="bold")
box(ax, 7.55, 3.6, 3.6, 0.85, "Bộ thu LoRa AS923", fs=7.5)
box(ax, 7.55, 2.2, 3.6, 1.0, "Raspberry Pi 4\nRandom Forest: 3 trạng thái", fs=7.5)
box(ax, 7.55, 0.85, 3.6, 0.85, "Màn hình 7 inch, Dashboard", fs=7.5)
arrow(ax, (9.35, 3.6), (9.35, 3.2)); arrow(ax, (9.35, 2.2), (9.35, 1.7))
arrow(ax, (6.25, 3.25), (7.55, 4.0)); ax.text(6.55, 3.85, "LoRa", fontsize=7, style="italic")
ax.text(13.35, 4.95, "Cảnh báo", ha="center", va="center", fontsize=8.5, fontweight="bold")
for y, t, fc, tc in zip((3.6, 2.2, 0.85), ["Mức 1\nAn toàn", "Mức 2\nChín sinh lý", "Mức 3\nNguy cơ lên men"], ["white", "#C9D2E0", NAVY], ["black", "black", "white"]):
    box(ax, 12.2, y, 2.6, 0.95, t, fc=fc, fs=7.5, tc=tc); arrow(ax, (11.85, y + 0.475), (12.2, y + 0.475))
ax.plot([11.15, 11.85], [2.7, 2.7], color=NAVY, lw=1.1); ax.plot([11.85, 11.85], [1.325, 4.075], color=NAVY, lw=1.1)
fig.savefig(os.path.join(HERE, "hinh_4_1_so_do_khoi.png"))
print("ok")
