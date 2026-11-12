# Bộ hình bổ sung cho báo cáo rút gọn: thay bảng bằng đồ họa. Chạy: python -X utf8 figs2.py
import os, textwrap
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import FancyBboxPatch, Rectangle, Wedge, FancyArrowPatch

OUT = os.path.dirname(os.path.abspath(__file__))
for f in ("times.ttf", "timesbd.ttf", "timesi.ttf", "timesbi.ttf"):
    fm.fontManager.addfont(os.path.join("C:/Windows/Fonts", f))
plt.rcParams.update({"font.family": "Times New Roman", "font.size": 8, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.edgecolor": "#6E7882", "axes.unicode_minus": False})
NAVY, MAR, GRAY, LIGHT, MID, INK, PALE = "#122F53", "#A32C34", "#6E7882", "#DCE3EA", "#5B7A99", "#212B38", "#F1F5F8"


def save(fig, name):
    fig.savefig(os.path.join(OUT, name), dpi=220, bbox_inches="tight", facecolor="white"); plt.close(fig)


def rbox(ax, x, y, w, h, fc="white", ec=NAVY, lw=0.9, r=0.03):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0.005,rounding_size={r}", fc=fc, ec=ec, lw=lw))


def arrow(ax, p, q, color=NAVY, lw=1.0, rad=0.0):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=9, color=color, lw=lw, connectionstyle=f"arc3,rad={rad}"))


# ---------------------------------------------------------------- 1. Canvas
fig, ax = plt.subplots(figsize=(7.2, 4.5)); ax.set_xlim(0, 100); ax.set_ylim(0, 62); ax.axis("off")
cols = [0, 20, 40, 60, 80]; w = 20
def blk(x, y, ww, hh, title, lines, fc="white", tc=NAVY):
    ax.add_patch(Rectangle((x, y), ww, hh, fc=fc, ec=NAVY, lw=0.9))
    ax.add_patch(Rectangle((x, y + hh - 4.2), ww, 4.2, fc=tc, ec=NAVY, lw=0.9))
    ax.text(x + ww / 2, y + hh - 2.1, title, ha="center", va="center", color="white", fontsize=5.7 if ww < 30 else 6.4, fontweight="bold")
    ax.text(x + 1.2, y + hh - 5.2, "\n".join(lines), ha="left", va="top", fontsize=6.6, color=INK, linespacing=1.3)
blk(0, 17, 20, 45, "1. ĐỐI TÁC CHÍNH", ["• Nhà phân phối màn\n  hình tương tác", "• Trường công lập,\n  chuyên, tư thục", "• Tổ chuyên môn STEM", "• Nhà cung cấp\n  đám mây"])
blk(20, 40, 20, 22, "2. HOẠT ĐỘNG CHÍNH", ["• Nhận diện nét vẽ,\n  engine mô phỏng", "• Rào chắn sư phạm", "• Dạy thử, tập huấn"])
blk(20, 17, 20, 23, "6. NGUỒN LỰC", ["• Nhóm tác giả học sinh\n  và cộng tác viên", "• 10 engine nâng cao", "• Cố vấn sư phạm,\n  trường thử nghiệm"])
blk(40, 17, 20, 45, "3. GIẢI PHÁP GIÁ TRỊ", ["• Khoanh một nét, mô\n  hình dựng tại chỗ", "• Bảng không che\n  nét phấn", "• Trợ lý Socratic\n  không đưa đáp án", "• Dự trù tối đa 350\n  đồng mỗi tiết"], fc=PALE, tc=MAR)
blk(60, 40, 20, 22, "4. QUAN HỆ KHÁCH HÀNG", ["• Tập huấn, hỗ trợ\n  tổ chuyên môn", "• Báo cáo nỗ lực\n  gửi phụ huynh"])
blk(60, 17, 20, 23, "7. KÊNH TIẾP CẬN", ["• Mã QR Smart Notes\n  cuối mỗi tiết", "• Cài sẵn cùng hãng\n  thiết bị", "• Thao giảng, hội thảo"])
blk(80, 17, 20, 45, "5. PHÂN KHÚC KHÁCH HÀNG", ["• Trường phổ thông,\n  trung tâm bồi dưỡng", "• Học sinh và\n  phụ huynh", "• Giáo viên luyện thi,\n  câu lạc bộ chuyên đề"])
blk(0, 0, 50, 17, "8. CƠ CẤU CHI PHÍ (năm 3: 3.840 triệu đồng)", ["• Nghiên cứu, kỹ thuật 37,5%   • Máy chủ 14,1%", "• Triển khai, truyền thông 35,9%   • Hành chính, pháp lý 12,5%"], tc=GRAY)
blk(50, 0, 50, 17, "9. DÒNG DOANH THU (năm 3: 23.238 triệu đồng)", ["• Thuê bao học sinh 72,3%   • Bản quyền trường, tập huấn 18,6%", "• Giáo viên 4,8%   • Đối tác thiết bị 4,3%"], tc=GRAY)
save(fig, "fig_s20_canvas.png")

# ---------------------------------------------------------------- 2. Bốn bên
fig, ax = plt.subplots(figsize=(7.2, 2.2)); ax.set_xlim(0, 100); ax.set_ylim(0, 30); ax.axis("off")
cards = [("GIÁO VIÊN", "−89,1%", "chuẩn bị mô phỏng thí nghiệm\ncho các chuyển động\n38,5 xuống 4,2 phút/tiết"),
         ("HỌC SINH", "+0,85", "điểm đầu ra so với đối chứng\nbài tập về nhà 24,5% lên 71,2%"),
         ("PHỤ HUYNH", "7,9%", "chi phí so với gia sư thấp nhất\n84,6% chủ động xem báo cáo"),
         ("NHÀ TRƯỜNG", "15% → 92%", "hiệu suất khai thác\nmàn hình tương tác sẵn có")]
for i, (t, big, sub) in enumerate(cards):
    x = 1 + i * 24.7
    rbox(ax, x, 1, 23, 28, fc=PALE if i % 2 == 0 else "white")
    ax.text(x + 11.5, 25, t, ha="center", fontsize=7.2, fontweight="bold", color=GRAY)
    ax.text(x + 11.5, 16, big, ha="center", va="center", fontsize=15, fontweight="bold", color=MAR)
    ax.text(x + 11.5, 6.5, sub, ha="center", va="center", fontsize=6.6, color=INK, linespacing=1.3)
save(fig, "fig_s21_stakeholders.png")

# ---------------------------------------------------------------- 3. Ba chế độ
fig, ax = plt.subplots(figsize=(7.2, 3.0)); ax.set_xlim(0, 100); ax.set_ylim(0, 42); ax.axis("off")
modes = [("MODE 01", "Bảng tương tác", ["Magic Lasso, Tap & Swap", "10 engine nâng cao và các mẫu", "Lớp học BYOD qua mã QR"], "Khoanh phương trình ném xiên: mô phỏng hiện tại chỗ", "OCR top-1 85-89%; BYOD tối đa 120 HS/phòng (chưa load test)"),
         ("MODE 02", "Socratic 1:1", ["Bước giải bị khóa, chặn dán", "SymPy chấm từng bước", "Widget: cân hóa học, đa giác lực"], "Nhập bước sai: nhận câu hỏi gợi mở, không có đáp án", "Đáp án mẫu do bài dựng sẵn cung cấp; cache theo từ khóa"),
         ("MODE 03", "Bản đồ nhiệt, Notes", ["Điểm nghẽn theo lớp", "Parent Pulse", "Màn hình xem lại ghi chú"], "Mở bản đồ nhiệt: thấy bước cả lớp vướng", "Gói ghi chú về nhà qua QR đang hoàn thiện")]
for i, (m, t, feats, demo, lim) in enumerate(modes):
    x = 1 + i * 33.2
    rbox(ax, x, 1, 31.5, 40, fc="white")
    ax.add_patch(Rectangle((x, 34), 31.5, 7, fc=NAVY, ec=NAVY))
    ax.text(x + 1.5, 37.5, m, color="#F4C7CA", fontsize=6.8, fontweight="bold", va="center")
    ax.text(x + 30, 37.5, t, color="white", fontsize=7.4, fontweight="bold", va="center", ha="right")
    ax.text(x + 1.5, 32, "CHẠY ĐƯỢC", fontsize=6.3, color=GRAY, fontweight="bold", va="top")
    ax.text(x + 1.5, 29, "\n".join("• " + f for f in feats), fontsize=6.7, va="top", color=INK, linespacing=1.35)
    ax.text(x + 1.5, 17.5, "DEMO TRONG 10 GIÂY", fontsize=6.3, color=MAR, fontweight="bold", va="top")
    ax.text(x + 1.5, 14.7, textwrap.fill(demo, 34), fontsize=6.4, va="top", color=INK, linespacing=1.3)
    ax.text(x + 1.5, 8.2, "GIỚI HẠN", fontsize=6.3, color=GRAY, fontweight="bold", va="top")
    ax.text(x + 1.5, 5.6, textwrap.fill(lim, 36), fontsize=6.1, va="top", color=INK, linespacing=1.3)
for i in range(3):
    pass
save(fig, "fig_s22_modes.png")

# ---------------------------------------------------------------- 4. Đối sánh cạnh tranh (định tính)
crit = ["Dùng được trên bục giảng", "Mô phỏng tương tác", "Chống chép lời giải", "Liền mạch lớp và nhà", "Chi phí AI thấp", "Hợp đề thi mới"]
sol = ["Phần mềm bảng\ntruyền thống", "Mô phỏng\nrời rạc", "Ứng dụng\ngiải bài", "Chatbot\nvăn bản", "Socratic\nVision Board"]
S = np.array([[1, 0, 0, 0, 2], [0, 1, 0, 0, 2], [np.nan, np.nan, 0, 0, 2], [0, 0, 0, 0, 2], [np.nan, np.nan, 0, 1, 2], [0, 0, 1, 1, 2]], dtype=float)
fig, ax = plt.subplots(figsize=(6.8, 3.0))
cmap = {0: "#F1F5F8", 1: "#BCCADA", 2: MAR}
for i in range(6):
    for j in range(5):
        v = S[i, j]
        if np.isnan(v):
            ax.add_patch(Rectangle((j, 5 - i), 0.96, 0.92, fc="white", ec="#C9D1D9", lw=0.6, hatch="////")); lab = "không áp dụng"; tc = GRAY
        else:
            ax.add_patch(Rectangle((j, 5 - i), 0.96, 0.92, fc=cmap[int(v)], ec="white")); lab = ["chưa có", "một phần", "đầy đủ"][int(v)]; tc = "white" if v == 2 else INK
        ax.text(j + 0.48, 5 - i + 0.46, lab, ha="center", va="center", fontsize=6.4, color=tc, fontweight="bold" if v == 2 else "normal")
ax.set_xlim(0, 5); ax.set_ylim(0, 6.3)
ax.set_xticks(np.arange(5) + 0.48); ax.set_xticklabels(sol, fontsize=7, fontweight="bold"); ax.xaxis.tick_top()
ax.set_yticks(np.arange(6) + 0.46); ax.set_yticklabels(crit[::-1], fontsize=7.3)
for s in ax.spines.values(): s.set_visible(False)
ax.tick_params(length=0)
save(fig, "fig_s23_compete.png")

# ---------------------------------------------------------------- 5. Chu kỳ mua
fig, axs = plt.subplots(1, 2, figsize=(7.2, 2.5), gridspec_kw={"width_ratios": [1.6, 1]})
ax = axs[0]
seg = [("Học sinh (phụ huynh trả)", 1, 3, MAR, "100-150 nghìn đồng/tháng"), ("Giáo viên luyện thi, trung tâm", 7, 14, MID, "khoảng 300 nghìn đồng/tháng"),
       ("Trường tư, công lập tự chủ", 30, 90, NAVY, "12-24 triệu đồng/năm"), ("Trường công lập", 90, 180, GRAY, "12-24 triệu đồng/năm")]
for i, (n, a, b, c, bud) in enumerate(seg[::-1]):
    ax.barh(i, b - a, left=a, color=c, height=0.5)
    ax.text(b * 1.12, i, f"{a}-{b} ngày", va="center", fontsize=6.8, fontweight="bold")
ax.set_xscale("log"); ax.set_xlim(0.8, 700); ax.set_yticks(range(4)); ax.set_yticklabels([s[0] for s in seg[::-1]], fontsize=7)
ax.set_xlabel("Chu kỳ ra quyết định mua (ngày, thang log)", fontsize=7); ax.xaxis.grid(True, color=LIGHT, lw=0.6); ax.set_axisbelow(True)
ax = axs[1]; ax.axis("off"); ax.set_xlim(0, 10); ax.set_ylim(0, 10)
ax.text(0, 9.4, "Ngân sách chi trả", fontsize=7.4, fontweight="bold", color=NAVY)
for i, (n, a, b, c, bud) in enumerate(seg):
    ax.text(0, 7.6 - i * 2.2, n, fontsize=6.6, color=GRAY); ax.text(0, 6.7 - i * 2.2, bud, fontsize=7.2, color=INK, fontweight="bold")
save(fig, "fig_s24_cycle.png")

# ---------------------------------------------------------------- 6. Cơ cấu doanh thu + lợi nhuận
fig, axs = plt.subplots(1, 2, figsize=(7.2, 2.8), gridspec_kw={"width_ratios": [1, 1.25]})
ax = axs[0]; vals = [72.3, 18.6, 4.8, 4.3]; labs = ["Thuê bao\nhọc sinh", "Bản quyền\ntrường", "Giáo viên", "Đối tác\nthiết bị"]
cols = [MAR, NAVY, MID, "#B8C4D0"]
wedges, _ = ax.pie(vals, colors=cols, startangle=90, counterclock=False, wedgeprops=dict(width=0.42, edgecolor="white"))
ax.text(0, 0.06, "23.238", ha="center", fontsize=11, fontweight="bold", color=NAVY); ax.text(0, -0.2, "triệu đồng, năm 3", ha="center", fontsize=6.4, color=GRAY)
for w_, v, l in zip(wedges, vals, labs):
    ang = np.deg2rad((w_.theta1 + w_.theta2) / 2); xx, yy = np.cos(ang), np.sin(ang)
    ax.annotate(f"{l}\n{v:.1f}%".replace(".", ","), (0.8 * xx, 0.8 * yy), (1.38 * xx, 1.3 * yy), ha="center", va="center", fontsize=6.4,
                arrowprops=dict(arrowstyle="-", color=GRAY, lw=0.5))
ax = axs[1]; yrs = ["Năm 1", "Năm 2", "Năm 3"]; rev = [1879.4, 7565.0, 23238.0]; net = [943.0, 4347.0, 14562.0]; x = np.arange(3)
ax.bar(x - 0.19, rev, 0.36, color=NAVY, label="Doanh thu thuần"); ax.bar(x + 0.19, net, 0.36, color=MAR, label="Lợi nhuận ròng")
for i in range(3):
    ax.text(x[i] - 0.19, rev[i] + 450, f"{rev[i]:,.0f}".replace(",", "."), ha="center", fontsize=6.6, fontweight="bold")
    ax.text(x[i] + 0.19, net[i] + 450, f"{net[i]:,.0f}".replace(",", "."), ha="center", fontsize=6.6, fontweight="bold", color=MAR)
    ax.text(x[i], -3600, f"biên ròng {net[i] / rev[i] * 100:.2f}%".replace(".", ","), ha="center", fontsize=6.4, color=GRAY)
ax.set_xticks(x); ax.set_xticklabels(yrs, fontsize=7.3); ax.set_ylim(0, 26500); ax.set_ylabel("triệu đồng", fontsize=7)
ax.legend(frameon=False, fontsize=6.8, loc="upper left"); ax.yaxis.grid(True, color=LIGHT, lw=0.6); ax.set_axisbelow(True); ax.tick_params(labelsize=6.8)
save(fig, "fig_s25_mix.png")

# ---------------------------------------------------------------- 7. CAPEX và OPEX
fig, axs = plt.subplots(1, 2, figsize=(7.2, 2.7), gridspec_kw={"width_ratios": [1.05, 1]})
ax = axs[0]
cap = [("Thiết bị xử lý, máy tính bảng", 63), ("Thiết bị cảm ứng thử nghiệm", 54), ("Máy chủ và lưu trữ", 42), ("Dịch vụ AI kiểm thử", 25), ("Bản quyền, pháp lý", 20), ("Thực nghiệm thực địa", 16)]
ax.barh(range(6), [c[1] for c in cap][::-1], color=[NAVY if c[1] >= 54 else MID for c in cap][::-1], height=0.6)
for i, c in enumerate(cap[::-1]): ax.text(c[1] + 1.2, i, f"{c[1]} ({c[1] / 220 * 100:.1f}%)".replace(".", ","), va="center", fontsize=6.6)
ax.set_yticks(range(6)); ax.set_yticklabels([c[0] for c in cap][::-1], fontsize=6.8); ax.set_xlim(0, 95); ax.tick_params(axis="x", labelsize=6.5)
ax.set_title("CAPEX 220 triệu đồng", fontsize=7.8, fontweight="bold", color=NAVY, loc="left"); ax.xaxis.grid(True, color=LIGHT, lw=0.6); ax.set_axisbelow(True)
ax = axs[1]
items = {"Hỗ trợ nghiên cứu, kỹ thuật": [336, 720, 1440], "Triển khai, hỗ trợ": [72, 300, 780], "Máy chủ": [54, 180, 540], "Truyền thông": [60, 240, 600], "Hành chính": [42, 120, 300], "Pháp lý, dự phòng": [24, 60, 180]}
cc = [NAVY, MAR, MID, GRAY, "#B8C4D0", "#E8C9CB"]; bot = np.zeros(3)
for (k, v), c in zip(items.items(), cc):
    ax.bar(["Năm 1", "Năm 2", "Năm 3"], v, bottom=bot, color=c, label=k, width=0.55); bot += np.array(v)
for i, t in enumerate([588, 1620, 3840]): ax.text(i, t + 60, f"{t:,}".replace(",", "."), ha="center", fontsize=6.8, fontweight="bold")
for i, (e, t) in enumerate(zip([336, 720, 1440], [588, 1620, 3840])): ax.text(i, 40, f"{e / t * 100:.0f}%", ha="center", fontsize=6.3, color="white", fontweight="bold")
ax.set_ylim(0, 4400); ax.legend(frameon=False, fontsize=5.8, loc="upper left"); ax.tick_params(labelsize=6.5)
ax.set_title("OPEX tiền mặt (triệu đồng)", fontsize=7.8, fontweight="bold", color=NAVY, loc="left"); ax.yaxis.grid(True, color=LIGHT, lw=0.6); ax.set_axisbelow(True)
save(fig, "fig_s26_cost.png")

# ---------------------------------------------------------------- 8. Giá vốn
fig, axs = plt.subplots(1, 2, figsize=(7.2, 2.7))
ax = axs[0]
lab = ["Flash, cả 4,3 lượt\nqua đám mây", "Flash-Lite, cả 4,3\nlượt qua đám mây", "Flash, có tầng\ncục bộ (18,6%)", "Mức dự trù tối đa\nkế hoạch"]
v = [102, 18, 19, 350]; c = [MID, MID, NAVY, MAR]
ax.bar(range(4), v, color=c, width=0.6)
for i, t in enumerate(v): ax.text(i, t + 8, f"{t}", ha="center", fontsize=7.4, fontweight="bold")
ax.set_xticks(range(4)); ax.set_xticklabels(lab, fontsize=6.2); ax.set_ylim(0, 400); ax.set_yticks([])
ax.spines["left"].set_visible(False); ax.set_title("Giá vốn mỗi tiết 45 phút (đồng)", fontsize=7.8, fontweight="bold", color=NAVY, loc="left")
ax.text(2.55, 230, "gấp 3,4 lần\ncận trên Flash", ha="right", fontsize=6.4, color=MAR, style="italic")
ax = axs[1]
lab = ["100% lượt qua\nmô hình", "Có tầng cục bộ\n(18,6% qua mô hình)", "Mức dự trù tối đa\nkế hoạch"]
v = [2880, 536, 3800]; c = [MID, NAVY, MAR]
ax.bar(range(3), v, color=c, width=0.55)
for i, t in enumerate(v): ax.text(i, t + 80, f"{t:,}".replace(",", "."), ha="center", fontsize=7.4, fontweight="bold")
ax.axhline(119000 / 1000 * 0 + 0, color="white")
ax.set_xticks(range(3)); ax.set_xticklabels(lab, fontsize=6.2); ax.set_ylim(0, 4500); ax.set_yticks([]); ax.spines["left"].set_visible(False)
ax.set_title("Giá vốn mỗi học sinh mỗi tháng (đồng)", fontsize=7.8, fontweight="bold", color=NAVY, loc="left")
ax.text(1, 1300, "tiết kiệm\n81,4%", ha="center", fontsize=6.6, color=NAVY, style="italic")
save(fig, "fig_s27_cogs.png")

# ---------------------------------------------------------------- 9. Thang giá
fig, ax = plt.subplots(figsize=(7.2, 2.9)); ax.set_xlim(0, 100); ax.set_ylim(0, 40); ax.axis("off")
def tier(x, y, w, h, name, price, sub, hi=False):
    rbox(ax, x, y, w, h, fc=PALE if hi else "white", ec=MAR if hi else NAVY, lw=1.3 if hi else 0.9)
    ax.text(x + w / 2, y + h - 3, name, ha="center", fontsize=7, fontweight="bold", color=GRAY)
    ax.text(x + w / 2, y + h / 2 - 0.5, price, ha="center", va="center", fontsize=9.6, fontweight="bold", color=MAR if hi else NAVY)
    ax.text(x + w / 2, y + 3, sub, ha="center", fontsize=6, color=INK, linespacing=1.25, va="center")
ax.text(0, 38.5, "NGƯỜI DÙNG CÁ NHÂN (B2C)", fontsize=7.2, fontweight="bold", color=NAVY)
T1 = [("Học sinh Cơ bản", "Miễn phí", "xem lại ghi chú, câu hỏi\ncủng cố cơ bản", False), ("Học sinh Nâng cao", "119.000 đ/tháng", "10 tháng = 1 năm\n(1.190.000 đ)", True),
      ("Học sinh Chuyên sâu", "169.000 đ/tháng", "công cụ đại số chuyên sâu\n(1.690.000 đ/năm)", False), ("Giáo viên", "299.000 đ/tháng", "gói năm 2.490.000 đ\n(tương đương 8,3 tháng)", False)]
for i, (a, b, c, h) in enumerate(T1): tier(0.5 + i * 25, 22, 24, 15, a, b, c, h)
ax.text(0, 19.5, "TỔ CHỨC (B2B)", fontsize=7.2, fontweight="bold", color=NAVY)
T2 = [("Trường Cơ bản", "12 triệu đ/năm", "trường dưới 15 phòng học", False), ("Trường Nâng cao", "24 triệu đ/năm", "thêm bản đồ năng lực toàn trường", False),
      ("Tập huấn", "4 triệu đ/đợt", "một ngày cho tổ chuyên môn", False), ("Đối tác thiết bị (OEM)", "15% đến 20%", "chia sẻ giá bản quyền\nkích hoạt", False)]
for i, (a, b, c, h) in enumerate(T2): tier(0.5 + i * 25, 2, 24, 15, a, b, c, h)
save(fig, "fig_s28_pricing.png")

# ---------------------------------------------------------------- 10. Kinh tế đơn vị
fig = plt.figure(figsize=(7.2, 2.7)); gs = fig.add_gridspec(1, 2, width_ratios=[1, 1.2])
ax = fig.add_subplot(gs[0]); ax.set_xlim(0, 20); ax.set_ylim(0, 20); ax.axis("off")
k = [("CAC", "38.500 đ", "cận xấu 133.333 đ"), ("LTV", "856.000 đ", "lợi nhuận đóng góp 823.700 đ"), ("LTV / CAC", "22,2 lần", "cận xấu 6,4 lần"), ("Thu hồi CAC", "11,5 ngày", "cận xấu 39,7 ngày")]
for i, (a, b, c) in enumerate(k):
    x = 0.4 + (i % 2) * 9.9; y = 10.4 - (i // 2) * 10
    rbox(ax, x, y, 9.3, 9, fc=PALE if i == 2 else "white", ec=MAR if i == 2 else NAVY)
    ax.text(x + 4.65, y + 7.4, a, ha="center", fontsize=7, fontweight="bold", color=GRAY)
    ax.text(x + 4.65, y + 4.6, b, ha="center", va="center", fontsize=10.5, fontweight="bold", color=MAR if i == 2 else NAVY)
    ax.text(x + 4.65, y + 1.5, c, ha="center", fontsize=5.8, color=INK)
ax = fig.add_subplot(gs[1]); n = np.linspace(0, 900, 100)
ax.plot(n, n * 0.119, color=MAR, lw=1.8, label="Doanh thu (119.000 đ/học sinh/tháng)")
ax.axhline(54.46, color=NAVY, ls="--", lw=1.3, label="OPEX tiền mặt / biên gộp = 54,46 triệu đồng")
ax.scatter([458], [54.46], s=40, color=INK, zorder=5); ax.annotate("Hòa vốn: 458 học sinh trả phí", (458, 54.46), (470, 22), arrowprops=dict(arrowstyle="->", lw=0.7), fontsize=6.8)
ax.axvline(990, color=GRAY, lw=0.8, ls=":"); ax.text(985, 8, "bình quân năm 1: 990", rotation=90, ha="right", fontsize=6.2, color=GRAY)
ax.set_xlim(0, 1100); ax.set_ylim(0, 130); ax.set_xlabel("Học sinh trả phí mỗi tháng", fontsize=7); ax.set_ylabel("triệu đồng/tháng", fontsize=7)
ax.legend(frameon=False, fontsize=6, loc="upper left"); ax.tick_params(labelsize=6.5); ax.yaxis.grid(True, color=LIGHT, lw=0.6)
save(fig, "fig_s29_unit.png")

# ---------------------------------------------------------------- 11. Lộ trình
fig, ax = plt.subplots(figsize=(7.2, 2.7))
q = ["Q4/26", "Q1/27", "Q2/27", "Q3/27", "Q4/27", "Q1/28", "Q2/28", "Q3/28", "Q4/28", "Q1/29", "Q2/29", "Q3/29", "Q4/29", "Q1/30"]
ph = [("1. Chuẩn hóa", 0, 2, NAVY, "10 trường, 50 GV"), ("2. Thương mại hóa (năm 1)", 2, 4, MAR, "15 trường, 990 HS trả phí\nhòa vốn tháng 7"),
      ("3. Mở rộng (năm 2)", 6, 4, MID, "60 trường, 5.100 HS\nOEM đầu tiên; R&D GĐ2"), ("4. Nhân rộng (năm 3)", 10, 4, GRAY, "180 trường, 16.500 HS")]
for i, (t, s, d, c, note) in enumerate(ph):
    ax.barh(3 - i, d, left=s, color=c, height=0.55)
    ax.text(s + d / 2, 3 - i, note, ha="center", va="center", color="white", fontsize=6.3, fontweight="bold", linespacing=1.2)
ax.set_yticks(range(4)); ax.set_yticklabels([p[0] for p in ph][::-1], fontsize=7)
ax.set_xticks(np.arange(14) + 0.0); ax.set_xticklabels(q, fontsize=6, rotation=0); ax.set_xlim(0, 14)
ax.xaxis.grid(True, color=LIGHT, lw=0.6); ax.set_axisbelow(True); ax.spines["left"].set_visible(False); ax.tick_params(axis="y", length=0)
ax.axvline(2, color=INK, lw=0.8, ls=":"); ax.text(2.05, 3.55, "bắt đầu thương mại hóa (Q2/2027)", fontsize=6.2, color=INK)
save(fig, "fig_s30_roadmap.png")

# ---------------------------------------------------------------- 12. Rủi ro trước và sau phòng vệ
fig, ax = plt.subplots(figsize=(5.4, 3.2)); ax.set_xlim(0.5, 3.5); ax.set_ylim(0.5, 3.5)
sh = {(1, 1): "#F1F5F8", (2, 1): "#F1F5F8", (1, 2): "#F1F5F8", (2, 2): "#DCE3EA", (3, 1): "#DCE3EA", (1, 3): "#DCE3EA", (3, 2): "#E8C9CB", (2, 3): "#E8C9CB", (3, 3): "#D9A3A7"}
for (a, b), c in sh.items(): ax.add_patch(Rectangle((a - 0.5, b - 0.5), 1, 1, fc=c, ec="white", lw=2))
R = {"R1 OCR sai": ((3, 2.25), (1, 1.2)), "R2 Hạn mức, giá mô hình": ((2, 2.0), (1, 1.75)), "R3 Lách luật lấy đáp án": ((3, 1.75), (1.35, 1.0)),
     "R4 Mua sắm công": ((3, 3.0), (3, 2.0)), "R5 Quy mô, bảo mật": ((2, 2.9), (2, 2.1))}
for k, ((x0, y0), (x1, y1)) in R.items():
    ax.scatter(x0, y0, s=60, color=MAR, zorder=4); ax.scatter(x1, y1, s=60, facecolor="white", edgecolor=NAVY, lw=1.4, zorder=4)
    arrow(ax, (x0, y0), (x1, y1), color=GRAY, lw=0.7, rad=0.1)
    ax.text(x0 - 0.08, y0 + 0.08, k, ha="right" if x0 > 1.5 else "left", fontsize=6.4, color=INK)
ax.set_xticks([1, 2, 3]); ax.set_xticklabels(["Thấp", "Vừa", "Cao"], fontsize=7); ax.set_yticks([1, 2, 3]); ax.set_yticklabels(["Thấp", "Trung bình", "Cao"], fontsize=7)
ax.set_xlabel("Khả năng xảy ra", fontsize=7); ax.set_ylabel("Mức ảnh hưởng", fontsize=7)
ax.scatter([], [], s=40, color=MAR, label="trước phòng vệ"); ax.scatter([], [], s=40, facecolor="white", edgecolor=NAVY, label="sau phòng vệ")
ax.legend(frameon=False, fontsize=6.4, loc="lower left", ncol=2, bbox_to_anchor=(0, -0.28))
for s in ax.spines.values(): s.set_visible(False)
save(fig, "fig_s31_risk.png")
print("ok")
