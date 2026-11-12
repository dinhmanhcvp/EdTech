# Sinh toàn bộ hình/biểu đồ cho STARTUP_BUSINESS_REPORT_FINAL. Chạy: python -X utf8 figs.py
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Wedge

OUT = os.path.dirname(os.path.abspath(__file__))
for f in ("times.ttf", "timesbd.ttf", "timesi.ttf", "timesbi.ttf"):
    fm.fontManager.addfont(os.path.join("C:/Windows/Fonts", f))
plt.rcParams.update({
    "font.family": "Times New Roman", "font.size": 11, "axes.spines.top": False,
    "axes.spines.right": False, "axes.edgecolor": "#6E7882", "axes.labelcolor": "#212B38",
    "xtick.color": "#212B38", "ytick.color": "#212B38", "figure.dpi": 100,
    "axes.unicode_minus": False,
})
NAVY, MAR, GRAY, LIGHT, MID, INK = "#122F53", "#A32C34", "#6E7882", "#DCE3EA", "#5B7A99", "#212B38"


def save(fig, name):
    fig.savefig(os.path.join(OUT, name), dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def box(ax, x, y, w, h, text, fc=LIGHT, ec=NAVY, tc=INK, fs=10.5, bold=False, lw=1.2):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.06", fc=fc, ec=ec, lw=lw))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color=tc,
            fontweight="bold" if bold else "normal", linespacing=1.3)


def arrow(ax, p, q, color=NAVY, rad=0.0, lw=1.4):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=14, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}"))


# 1. Quy trình năm bước ------------------------------------------------------
fig, ax = plt.subplots(figsize=(11, 3.4)); ax.set_xlim(0, 11); ax.set_ylim(0, 3.4); ax.axis("off")
steps = [("1", "Viết tay trên bảng", "Nhận diện nét vẽ\ntrễ dưới 15 ms"),
         ("2", "Mô hình tại chỗ", "Xoay, cắt, đổi tham số\nbằng cảm ứng trực tiếp"),
         ("3", "Đóng gói bài giảng", "Chuỗi vector dưới 60 KB\nnhúng trong mã QR"),
         ("4", "Trợ lý Socratic", "4 bước giàn giáo,\nkhông đưa đáp án"),
         ("5", "Bản đồ năng lực", "Bản đồ nhiệt cho giáo viên,\nbáo cáo cho phụ huynh")]
for i, (n, t, d) in enumerate(steps):
    x = 0.15 + i * 2.17
    box(ax, x, 0.35, 1.9, 2.55, "", fc="white", ec=NAVY)
    ax.add_patch(plt.Circle((x + 0.95, 2.45), 0.26, fc=MAR, ec="none"))
    ax.text(x + 0.95, 2.45, n, color="white", ha="center", va="center", fontsize=13, fontweight="bold")
    ax.text(x + 0.95, 1.8, t, ha="center", va="center", fontsize=11, fontweight="bold", color=NAVY)
    ax.text(x + 0.95, 1.0, d, ha="center", va="center", fontsize=9.5, color=INK, linespacing=1.4)
    if i < 4:
        arrow(ax, (x + 1.93, 1.6), (x + 2.14, 1.6))
ax.text(0.15, 0.1, "Trên lớp (bước 1-3)", fontsize=9.5, color=GRAY, style="italic")
ax.text(6.5, 0.1, "Tại nhà và quản trị (bước 4-5)", fontsize=9.5, color=GRAY, style="italic")
save(fig, "fig_s01_workflow.png")

# 2. Thị trường TAM/SAM/SOM -----------------------------------------------------
fig, ax = plt.subplots(figsize=(7.4, 3.6))
lab = ["TAM", "SAM", "SOM"]; val = [3767.45, 1285.78, 64.21]; usd = [150.70, 51.43, 2.57]
b = ax.barh(lab[::-1], val[::-1], color=[GRAY, MID, MAR][::-1], height=0.55)
for r, v, u in zip(b, val[::-1], usd[::-1]):
    ax.text(v + 40, r.get_y() + r.get_height() / 2, f"{v:,.2f} tỷ đồng  |  {u:,.2f} triệu USD", va="center", fontsize=10.5)
ax.set_xlim(0, 6200); ax.set_xlabel("Quy mô thị trường (tỷ đồng, theo giá niêm yết)")
ax.xaxis.grid(True, color=LIGHT, lw=0.8); ax.set_axisbelow(True)
save(fig, "fig_s02_market.png")

# 3. Điểm trước/sau theo trường -------------------------------------------------
import numpy as np
groups = ["Khối chuyên", "Công lập\nchuẩn quốc gia", "Tư thục\nchất lượng cao", "Toàn bộ\n(N = 412)"]
pre_e = [7.38, 5.86, 6.45, 6.43]; pre_c = [7.41, 5.91, 6.42, 6.46]
post_e = [8.54, 7.08, 7.69, 7.65]; post_c = [7.72, 6.24, 6.81, 6.80]
sd_e = [0.74, 1.05, 0.91, 1.08]; sd_c = [0.85, 1.18, 1.08, 1.21]
x = np.arange(4); w = 0.2
fig, ax = plt.subplots(figsize=(9, 4.2))
ax.bar(x - 1.5 * w, pre_c, w, color=LIGHT, edgecolor=GRAY, label="Đối chứng, đầu vào")
ax.bar(x - 0.5 * w, post_c, w, color=GRAY, label="Đối chứng, đầu ra", yerr=sd_c, capsize=3, error_kw=dict(lw=0.9))
ax.bar(x + 0.5 * w, pre_e, w, color="#E8C9CB", edgecolor=MAR, label="Thực nghiệm, đầu vào")
ax.bar(x + 1.5 * w, post_e, w, color=MAR, label="Thực nghiệm, đầu ra", yerr=sd_e, capsize=3, error_kw=dict(lw=0.9))
for i in range(4):
    ax.text(x[i] + 1.5 * w, post_e[i] + sd_e[i] + 0.12, f"{post_e[i]:.2f}", ha="center", fontsize=9, color=MAR, fontweight="bold")
    ax.text(x[i] - 0.5 * w, post_c[i] + sd_c[i] + 0.12, f"{post_c[i]:.2f}", ha="center", fontsize=9, color=INK)
ax.set_xticks(x); ax.set_xticklabels(groups); ax.set_ylim(0, 10.8); ax.set_ylabel("Điểm trung bình (thang 10), thanh sai số ± SD")
ax.legend(ncol=2, fontsize=9, frameon=False, loc="upper center", bbox_to_anchor=(0.5, 1.2))
ax.yaxis.grid(True, color=LIGHT, lw=0.8); ax.set_axisbelow(True)
save(fig, "fig_s03_pilot_scores.png")

# 4. Forest: chênh lệch ròng và Cohen's d ---------------------------------------
fig, axs = plt.subplots(1, 2, figsize=(9, 3.4), sharey=True)
names = ["Khối chuyên (n = 112)", "Công lập chuẩn QG (n = 184)", "Tư thục CLC (n = 116)", "Tổng hợp (N = 412)"][::-1]
net = [0.82, 0.84, 0.88, 0.85][::-1]; d = [1.03, 0.75, 0.88, 0.73][::-1]
cols = [MAR, GRAY, GRAY, GRAY][::-1]
for a, vals, ttl, xl in ((axs[0], net, "Chênh lệch điểm đầu ra (điểm)", (0, 1.1)), (axs[1], d, "Hệ số tác động Cohen's d", (0, 1.25))):
    a.barh(names, vals, color=[NAVY if n.startswith("Tổng") else MID for n in names], height=0.5)
    for i, v in enumerate(vals):
        a.text(v + 0.02, i, f"{v:.2f}".replace(".", ","), va="center", fontsize=10.5, fontweight="bold", bbox=dict(fc="white", ec="none", pad=0.5))
    a.set_xlim(*xl); a.set_xlabel(ttl); a.xaxis.grid(True, color=LIGHT); a.set_axisbelow(True)
axs[1].axvline(0.8, color=MAR, ls="--", lw=1); axs[1].text(0.805, -0.45, "ngưỡng d = 0,8", color=MAR, fontsize=8.5)
axs[1].axvline(0.5, color=GRAY, ls=":", lw=1); axs[1].text(0.505, -0.45, "d = 0,5", color=GRAY, fontsize=8.5)
save(fig, "fig_s04_effect.png")

# 5. Ba chỉ số hiệu quả --------------------------------------------------------
fig, axs = plt.subplots(1, 3, figsize=(10, 3.4))
specs = [("Hoàn thành bài tập về nhà (%)", ["Trước", "Sau"], [24.5, 71.2], [GRAY, MAR], "{:.1f}%"),
         ("Giữ kiến thức sau 2 tuần (%)", ["Đối chứng", "Thực nghiệm"], [60.5, 81.9], [GRAY, MAR], "{:.1f}%"),
         ("Thời gian chuẩn bị học liệu (phút/tiết)", ["Trước", "Sau"], [38.5, 4.2], [GRAY, MAR], "{:.1f}")]
for a, (t, l, v, c, f) in zip(axs, specs):
    bars = a.bar(l, v, color=c, width=0.55)
    for r, val in zip(bars, v):
        a.text(r.get_x() + r.get_width() / 2, val + max(v) * 0.02, f.format(val), ha="center", fontweight="bold", fontsize=11)
    a.set_title(t, fontsize=10.5, color=NAVY, fontweight="bold"); a.set_ylim(0, max(v) * 1.18); a.set_yticks([])
    a.spines["left"].set_visible(False)
axs[0].text(0.5, 85, "+46,7 điểm %", ha="center", fontsize=9.5, color=MAR) if False else None
save(fig, "fig_s05_outcomes.png")

# 6. Phân tầng xử lý -----------------------------------------------------------
fig, ax = plt.subplots(figsize=(11, 4.4)); ax.set_xlim(0, 11); ax.set_ylim(0, 4.4); ax.axis("off")
box(ax, 0.1, 1.7, 1.6, 1.0, "Yêu cầu của\ngiáo viên / học sinh", fc="white", bold=True)
tiers = [("TẦNG 0 - Quy tắc", "Nhận diện nét vẽ, quy tắc,\nkho câu hỏi theo từ khóa\nchi phí đám mây: 0 đồng", LIGHT, NAVY),
         ("TẦNG 1 - Đại số hình thức", "SymPy kiểm tra bước giải,\ncân bằng nguyên tử\nchi phí đám mây: 0 đồng", LIGHT, NAVY),
         ("TẦNG 2 - Mô hình ngôn ngữ", "Chỉ khi hai tầng trước không\nxử lý được; chỉ sinh câu hỏi gợi mở\n18,6% tác vụ", "#F4DADC", MAR)]
for i, (t, d, fc, ec) in enumerate(tiers):
    x = 2.4 + i * 2.95
    box(ax, x, 1.2, 2.55, 2.0, "", fc=fc, ec=ec)
    ax.text(x + 1.275, 2.85, t, ha="center", fontsize=10.5, fontweight="bold", color=ec)
    ax.text(x + 1.275, 1.95, d, ha="center", va="center", fontsize=9.5, linespacing=1.45)
arrow(ax, (1.72, 2.2), (2.38, 2.2))
arrow(ax, (4.97, 2.2), (5.33, 2.2)); arrow(ax, (7.92, 2.2), (8.28, 2.2))
ax.add_patch(plt.Rectangle((2.4, 0.35), 5.5, 0.4, fc=NAVY, ec="none"))
ax.text(5.15, 0.55, "81,4% lượt tự học xử lý xong mà không tốn token", ha="center", va="center", color="white", fontsize=10.5, fontweight="bold")
ax.add_patch(plt.Rectangle((8.0, 0.35), 1.65 + 0.9, 0.4, fc=MAR, ec="none"))
ax.text(9.28, 0.55, "18,6% gọi đám mây", ha="center", va="center", color="white", fontsize=10.5, fontweight="bold")
ax.text(5.5, 4.15, "Mức dự trù tối đa: 350 đồng/tiết dạy  |  3.800 đồng/học sinh/tháng", ha="center", fontsize=11, color=NAVY, fontweight="bold")
save(fig, "fig_s06_tiers.png")

# 7. Vòng lan tỏa QR ------------------------------------------------------------
fig, ax = plt.subplots(figsize=(7.4, 5.6)); ax.set_xlim(-3.7, 3.7); ax.set_ylim(-2.9, 2.9); ax.axis("off"); ax.set_aspect("equal")
nodes = [("Giáo viên dạy\nbằng phần mềm", 0, 2.1), ("Mã QR bài học\ntrên bảng", 2.55, 0.65), ("70-80% học sinh\nquét mã, miễn phí", 1.6, -1.95),
         ("Tự học cùng trợ lý;\nphụ huynh nhận báo cáo", -1.6, -1.95), ("5-8% nâng cấp\ngói trả phí", -2.55, 0.65)]
for i, (t, x, y) in enumerate(nodes):
    box(ax, x - 1.05, y - 0.4, 2.1, 0.8, t, fc="white" if i != 4 else "#F4DADC", ec=NAVY if i != 4 else MAR, fs=9.5, bold=(i == 4))
for i in range(5):
    a, b2 = nodes[i], nodes[(i + 1) % 5]
    arrow(ax, (a[1] * 0.78 + b2[1] * 0.22, a[2] * 0.78 + b2[2] * 0.22 + (-0.0)), (a[1] * 0.22 + b2[1] * 0.78, a[2] * 0.22 + b2[2] * 0.78), rad=-0.18)
ax.text(0, 0.1, "CAC thực tế\ntiến về 0", ha="center", va="center", fontsize=13, fontweight="bold", color=MAR)
ax.text(0, -0.65, "38.500 đồng / khách trả phí", ha="center", fontsize=9.5, color=GRAY)
save(fig, "fig_s07_flywheel.png")

# 8. Doanh thu theo nguồn + biên ròng ------------------------------------------
yrs = ["Năm 1", "Năm 2", "Năm 3"]
streams = {"Thuê bao học sinh": [1300.0, 5400.0, 16800.0], "Bản quyền trường + tập huấn": [360.0, 1440.0, 4320.0],
           "Bản quyền giáo viên": [99.6, 373.5, 1120.5], "Chia sẻ đối tác thiết bị": [119.8, 351.5, 997.5]}
cc = [MAR, NAVY, MID, "#B8C4D0"]
fig, ax = plt.subplots(figsize=(8, 4.4)); bot = np.zeros(3)
for (k, v), c in zip(streams.items(), cc):
    ax.bar(yrs, v, bottom=bot, color=c, label=k, width=0.55); bot += np.array(v)
tot = [1879.4, 7565.0, 23238.0]; net_p = [943.0, 4347.0, 14562.0]
for i, t in enumerate(tot):
    ax.text(i, t + 400, f"{t:,.1f}".replace(",", " "), ha="center", fontweight="bold", fontsize=10.5)
ax.set_ylabel("Triệu đồng"); ax.set_ylim(0, 27500); ax.legend(frameon=False, fontsize=9.5, loc="upper left")
ax.yaxis.grid(True, color=LIGHT); ax.set_axisbelow(True)
ax2 = ax.twinx(); ax2.spines["right"].set_visible(True); ax2.plot(yrs, [n / t * 100 for n, t in zip(net_p, tot)], color=INK, marker="o", lw=1.6)
for i, (n, t) in enumerate(zip(net_p, tot)):
    ax2.text(i + 0.07, n / t * 100 + 2.2, f"{n / t * 100:.2f}%", fontsize=9.5)
ax2.set_ylim(0, 100); ax2.set_ylabel("Tỷ suất lợi nhuận ròng (%)")
save(fig, "fig_s08_revenue.png")

# 9. Thác nước P&L năm 3 -------------------------------------------------------
steps = [("Doanh thu\nthuần", 23238.0, "tot"), ("Giá vốn\ndịch vụ", -2450.0, "d"), ("Chi phí\nhoạt động", -4608.0, "d"),
         ("Thuế\nTNDN", -1618.0, "d"), ("Lợi nhuận\nròng", 14562.0, "tot")]
fig, ax = plt.subplots(figsize=(8, 4.2)); run = 0
for i, (n, v, k) in enumerate(steps):
    if k == "tot":
        ax.bar(i, v, color=NAVY if i == 0 else MAR, width=0.55); run = v; top = v
    else:
        ax.bar(i, -v, bottom=run + v, color=GRAY, width=0.55); top = run; run += v
    ax.text(i, top + 450, f"{v:,.0f}".replace(",", " "), ha="center", fontsize=10, fontweight="bold")
ax.set_xticks(range(5)); ax.set_xticklabels([s[0] for s in steps]); ax.set_ylabel("Triệu đồng"); ax.set_ylim(0, 26500)
ax.yaxis.grid(True, color=LIGHT); ax.set_axisbelow(True)
save(fig, "fig_s09_waterfall.png")

# 10. Chi phí hoạt động 6.3 ------------------------------------------------------
items = {"Nghiên cứu và kỹ thuật": [336, 720, 1440], "Triển khai và hỗ trợ": [72, 300, 780], "Máy chủ và băng thông": [54, 180, 540],
         "Truyền thông và sự kiện": [60, 240, 600], "Văn phòng, hành chính": [42, 120, 300], "Pháp lý và dự phòng": [24, 60, 180]}
cols6 = [NAVY, MAR, MID, GRAY, "#B8C4D0", "#E8C9CB"]
fig, ax = plt.subplots(figsize=(8, 4.2)); bot = np.zeros(3)
for (k, v), c in zip(items.items(), cols6):
    ax.bar(yrs, v, bottom=bot, color=c, label=k, width=0.55); bot += np.array(v)
for i, t in enumerate([588, 1620, 3840]):
    ax.text(i, t + 60, f"{t:,}".replace(",", " "), ha="center", fontweight="bold")
ax.set_ylabel("Triệu đồng"); ax.set_ylim(0, 4400); ax.legend(frameon=False, fontsize=9, loc="upper left")
ax.yaxis.grid(True, color=LIGHT); ax.set_axisbelow(True)
save(fig, "fig_s10_opex.png")

# 11. Hòa vốn ---------------------------------------------------------------------
n = np.linspace(0, 900, 200); price = 119000
fig, ax = plt.subplots(figsize=(7.6, 4.0))
ax.plot(n, n * price / 1e6, color=MAR, lw=2, label="Doanh thu gói Nâng cao (119.000 đ/học sinh/tháng)")
ax.axhline(54.46, color=NAVY, lw=1.6, ls="--", label="Chi phí hoạt động hòa vốn: 54,46 triệu đồng/tháng")
ax.scatter([458], [54.46], s=70, color=INK, zorder=5)
ax.annotate("Hòa vốn: 458 học sinh trả phí", (458, 54.46), (505, 28), arrowprops=dict(arrowstyle="->", color=INK), fontsize=10)
ax.set_xlabel("Số học sinh trả phí mỗi tháng"); ax.set_ylabel("Triệu đồng/tháng"); ax.set_ylim(0, 110); ax.set_xlim(0, 900)
ax.legend(frameon=False, fontsize=9, loc="upper left"); ax.yaxis.grid(True, color=LIGHT)
save(fig, "fig_s11_breakeven.png")

# 12. Lộ trình --------------------------------------------------------------------
ph = [("GĐ1: Chuẩn hóa giải pháp", 0, 2, NAVY), ("GĐ2: Thương mại hóa bước đầu", 2, 3, MAR), ("GĐ3: Mở rộng và hợp tác", 5, 2, MID), ("GĐ4: Nhân rộng toàn quốc", 7, 2, GRAY)]
fig, ax = plt.subplots(figsize=(10, 3.2))
for i, (t, s, d, c) in enumerate(ph):
    ax.barh(3 - i, d, left=s, color=c, height=0.5)
    ax.text(s + d / 2, 3 - i, ["10 trường, 50 GV", "15-25 trường, 1.000 HS trả phí", "60 trường, 5.000 HS", "180 trường, 16.500 HS"][i], ha="center", va="center", color="white", fontsize=9, fontweight="bold")
ax.set_yticks(range(4)); ax.set_yticklabels([p[0] for p in ph][::-1])
ax.set_xticks([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
ax.set_xticklabels(["Q4/26", "Q1/27", "Q2/27", "Q3/27", "Q4/27", "Q1/28", "Q2/28", "Q3/28", "Q4/28", ""])
ax.set_xlim(0, 9); ax.xaxis.grid(True, color=LIGHT); ax.set_axisbelow(True); ax.spines["left"].set_visible(False); ax.tick_params(axis="y", length=0)
save(fig, "fig_s12_roadmap.png")

# 13. Ma trận rủi ro -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(6.6, 4.6)); ax.set_xlim(0.5, 3.5); ax.set_ylim(0.5, 3.5)
shade = {(1, 1): "#EFF3F7", (2, 1): "#EFF3F7", (1, 2): "#EFF3F7", (2, 2): "#DCE3EA", (3, 1): "#DCE3EA", (1, 3): "#DCE3EA", (3, 2): "#E8C9CB", (2, 3): "#E8C9CB", (3, 3): "#D9A3A7"}
for (a, b), c in shade.items():
    ax.add_patch(plt.Rectangle((a - 0.5, b - 0.5), 1, 1, fc=c, ec="white", lw=2))
risks = [("R1 Mạng trường", 3, 3, 1.0), ("R2 Giá dịch vụ", 2, 2, 1.0), ("R3 Lấy đáp án", 3, 3, 0.55), ("R4 Mua sắm công", 3, 3, 0.1), ("R5 Đổi ma trận đề", 2, 1, 1.0)]
pos = {"R1 Mạng trường": (3.0, 3.25), "R2 Giá dịch vụ": (2.0, 2.0), "R3 Lấy đáp án": (3.0, 2.85), "R4 Mua sắm công": (3.0, 2.45), "R5 Đổi ma trận đề": (1.0, 2.0)}
# trục X: khả năng xảy ra (1 thấp - 3 cao); Y: mức độ ảnh hưởng ban đầu
xy = {"R1 Mạng trường": (3, 3), "R2 Giá dịch vụ": (2, 2), "R3 Lấy đáp án": (3, 2), "R4 Mua sắm công": (3, 3), "R5 Đổi ma trận đề": (1, 2)}
off = {"R1 Mạng trường": (0, 0.18), "R4 Mua sắm công": (0, -0.18)}
for k, (a, b) in xy.items():
    dx, dy = off.get(k, (0, 0))
    ax.scatter(a + dx, b + dy, s=150, color=MAR if k.startswith(("R1", "R3", "R4")) else NAVY, zorder=4)
    if k.startswith("R5"):
        ax.text(a, b + 0.24, k, ha="center", va="bottom", fontsize=9.5, color=INK)
    else:
        ax.text(a + dx - 0.12, b + dy, k, ha="right", va="center", fontsize=9.5, color=INK)
ax.set_xticks([1, 2, 3]); ax.set_xticklabels(["Thấp", "Vừa", "Cao"]); ax.set_yticks([1, 2, 3]); ax.set_yticklabels(["Thấp", "Trung bình", "Cao"])
ax.set_xlabel("Khả năng xảy ra"); ax.set_ylabel("Mức độ ảnh hưởng nếu không xử lý")
for s in ax.spines.values(): s.set_visible(False)
save(fig, "fig_s13_risk.png")

# 14. Kinh tế đơn vị ---------------------------------------------------------------
fig, axs = plt.subplots(1, 2, figsize=(9, 3.4))
axs[0].bar(["CAC", "LTV"], [38500, 856000], color=[GRAY, MAR], width=0.5)
axs[0].text(0, 38500 + 20000, "38.500 đ", ha="center", fontweight="bold"); axs[0].text(1, 856000 + 20000, "856.000 đ", ha="center", fontweight="bold")
axs[0].set_title("LTV / CAC = 22,2 lần", color=NAVY, fontweight="bold"); axs[0].set_ylim(0, 1000000); axs[0].set_yticks([])
axs[0].spines["left"].set_visible(False)
axs[1].bar(["Thuê bao\n119.000 đ", "Chi phí biến đổi\n3.800 đ"], [119000, 3800], color=[NAVY, MAR], width=0.5)
axs[1].text(0, 119000 + 2500, "119.000 đ", ha="center", fontweight="bold"); axs[1].text(1, 3800 + 2500, "3.800 đ", ha="center", fontweight="bold")
axs[1].set_title("Mỗi học sinh/tháng", color=NAVY, fontweight="bold"); axs[1].set_ylim(0, 140000); axs[1].set_yticks([]); axs[1].spines["left"].set_visible(False)
save(fig, "fig_s14_unit.png")

# 15. Định vị cạnh tranh (định tính) -----------------------------------------------
fig, ax = plt.subplots(figsize=(7, 4.6)); ax.set_xlim(0, 10); ax.set_ylim(0, 10)
pts = [("Phần mềm bảng\ntruyền thống", 2.2, 2.4, GRAY), ("Công cụ mô phỏng\nrời rạc", 4.2, 7.0, GRAY), ("Ứng dụng giải bài\ntrực tuyến", 7.8, 2.0, GRAY), ("Bot đàm thoại\nvăn bản", 7.2, 4.4, GRAY)]
for t, a, b, c in pts:
    ax.scatter(a, b, s=170, color=c); ax.text(a, b - 0.95, t, ha="center", va="top", fontsize=9.5)
ax.scatter(8.4, 8.6, s=420, color=MAR, zorder=5); ax.text(8.4, 7.6, "Socratic Vision Board", ha="center", va="top", fontsize=10.5, fontweight="bold", color=MAR)
ax.axhline(5, color=LIGHT); ax.axvline(5, color=LIGHT)
ax.set_xlabel("Mức bảo vệ tư duy người học (rào chắn sư phạm)  >"); ax.set_ylabel("Mức tương tác thực nghiệm trên màn hình  >")
ax.set_xticks([]); ax.set_yticks([])
ax.text(0.2, 0.25, "Định vị định tính, dựa trên ma trận so sánh ở Mục 3.2", fontsize=8.5, style="italic", color=GRAY)
save(fig, "fig_s15_positioning.png")

# 16. Semantic Compiler ------------------------------------------------------------
fig, ax = plt.subplots(figsize=(11, 3.9)); ax.set_xlim(0, 11); ax.set_ylim(0, 3.9); ax.axis("off")
box(ax, 0.1, 1.5, 1.7, 1.0, "Nét viết hoặc\nvòng khoanh\ntrên bảng", fc="white", bold=True, fs=10)
box(ax, 2.2, 1.5, 2.1, 1.0, "Nhận diện cục bộ\ntop-3 ứng viên\n(Tap & Swap)", fs=10)
box(ax, 4.7, 1.5, 1.7, 1.0, "Định tuyến\ntheo mẫu và\nmôn học", fs=10)
box(ax, 6.9, 2.35, 2.5, 1.1, "A. Engine xác định\nRK4, RLC/Fresnel, hình học,\ntích phân; 60 FPS mục tiêu", fc="#DCE3EA", fs=9.5)
box(ax, 6.9, 0.55, 2.5, 1.1, "B. SVG tương tác do AI sinh\n(dự phòng cho hình ngoài\nthư viện); chi phí theo lượt", fc="#F4DADC", ec=MAR, fs=9.5)
box(ax, 9.75, 1.5, 1.15, 1.0, "Mô phỏng\ntại chỗ", fc="white", bold=True, fs=10)
arrow(ax, (1.82, 2.0), (2.18, 2.0)); arrow(ax, (4.32, 2.0), (4.68, 2.0))
arrow(ax, (6.42, 2.1), (6.88, 2.9)); arrow(ax, (6.42, 1.9), (6.88, 1.1))
arrow(ax, (9.42, 2.9), (9.73, 2.15)); arrow(ax, (9.42, 1.1), (9.73, 1.85))
ax.text(3.25, 1.2, "chọn sai: thanh công thức,\nsửa trực tiếp LaTeX", ha="center", va="top", fontsize=8.5, color=GRAY, style="italic")
ax.text(8.15, 3.65, "Tầng xác định: chi phí kết xuất 0 đồng", ha="center", fontsize=9, color=NAVY, fontweight="bold")
save(fig, "fig_s16_compiler.png")
print("done")
