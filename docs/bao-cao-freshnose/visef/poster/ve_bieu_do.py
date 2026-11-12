# Biểu đồ cho poster (vẽ lại, không chụp từ báo cáo): nền trắng, màu nhấn #0E6B47, xám #8A8A8A, chữ ≥ 22 pt ở kích thước in.
# Số liệu lấy từ báo cáo bản cuối (Bảng 4.4, mục 4.2.4) và từ PhuLucB_FreshNose_RawTimeSeries.csv. Chạy: python -X utf8 ve_bieu_do.py
import os
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets")
NAVY, GREY, INK = "#0E6B47", "#8A8A8A", "#1A1A1A"
plt.rcParams.update({"font.family": "Roboto", "font.size": 24, "axes.edgecolor": INK, "text.color": INK, "axes.labelcolor": INK, "xtick.color": INK, "ytick.color": INK})
CM = 1 / 2.54
K = 1.2   # hệ số phóng chữ so với khổ tham chiếu 100×150 cm
r = pd.read_csv(os.path.join(HERE, "..", "..", "PhuLucB_FreshNose_RawTimeSeries.csv"), encoding="utf-8-sig")


def base(w_cm, h_cm):
    fig, ax = plt.subplots(figsize=(w_cm * CM / K, h_cm * CM / K), dpi=200 * K)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    return fig, ax


def save(fig, name):
    fig.tight_layout(pad=0.4)
    fig.savefig(os.path.join(OUT, name), facecolor="white")
    plt.close(fig)


# --- ①: tổn thất sau thu hoạch (FAO, 2025; Đại học Cần Thơ, 2021) ---
fig, ax = base(54, 10)
labels = ["Mọi thực phẩm, toàn cầu", "Rau quả, toàn cầu", "Trái cây Việt Nam (ước)"]
vals, txt, cols = [13.3, 25.4, 25.0], ["13,3 %", "25,4 %", "≈ 25 %"], [GREY, NAVY, NAVY]
ax.barh(labels[::-1], vals[::-1], color=cols[::-1], height=0.62)
for y, v, t in zip(range(3), vals[::-1], txt[::-1]):
    ax.text(v + 0.7, y, t, va="center", fontsize=28, fontweight="bold")
ax.set_xlim(0, 33); ax.set_xticks([]); ax.spines["bottom"].set_visible(False)
ax.tick_params(axis="y", length=0, labelsize=24)
save(fig, "bd_ton_that.png")

# --- ④: ba đợt thí nghiệm (ngày 1–21/6/2026), đợt 1–2 huấn luyện, đợt 3 kiểm tra ---
fig, ax = base(54, 8.5)
spans = [("Đợt 1 · huấn luyện", 0.0, 10.4, True), ("Đợt 2 · huấn luyện", 5.0, 10.4, True), ("Đợt 3 · kiểm tra", 10.0, 10.4, False)]
for i, (t, x0, w, tr) in enumerate(spans[::-1]):
    ax.add_patch(Rectangle((x0, i - 0.32), w, 0.64, facecolor=NAVY if tr else "white", edgecolor=NAVY, lw=4))
    ax.text(x0 + w / 2, i, t, ha="center", va="center", color="white" if tr else NAVY, fontsize=23, fontweight="bold")
ax.set_xlim(0, 21); ax.set_ylim(-0.6, 2.6)
ax.set_xticks([0, 5, 10, 15, 20]); ax.set_xticklabels(["1/6", "6/6", "11/6", "16/6", "21/6"])
ax.set_yticks([]); ax.spines["left"].set_visible(False)
ax.tick_params(axis="x", labelsize=24)
save(fig, "bd_ba_dot.png")

# --- ⑧ chính: thời gian mức đỏ sớm hơn lúc thấy vết thối, 6 chuỗi ---
name = {"Cấy nấm thán thư": "Nhiễm nấm", "Gây xước cơ học": "Gây xước"}
rows = []
for (b, c), g in r.groupby(["Batch_ID", "Condition"]):
    if c in name:
        a = g.loc[g.Model_Red_Alert == 1, "Hour"].min(); v = g.loc[g.Visual_Rot_Status == 1, "Hour"].min()
        rows.append((f"{name[c]}, đợt {b}", v - a, c))
rows.sort(key=lambda x: (x[2], x[0]))
assert sorted(round(x[1], 1) for x in rows) == [18.5, 21.0, 24.5, 27.0, 31.5, 35.5], rows   # khớp báo cáo (mục 4.2.4)
fig, ax = base(54, 24)
lab = [x[0] for x in rows][::-1]; dv = [x[1] for x in rows][::-1]
ax.barh(lab, dv, color=NAVY, height=0.62)
for y, v in enumerate(dv):
    ax.text(v + 0.6, y, f"{v:.1f} giờ".replace(".", ","), va="center", fontsize=28, fontweight="bold")
ax.axvline(12, color=GREY, lw=3.5, ls=(0, (6, 4)))
ax.text(12.4, 5.55, "Ngưỡng thiết kế: 12 giờ", color="#5A5A5A", fontsize=25, va="bottom")
ax.set_xlim(0, 42); ax.set_ylim(-0.6, 6.2)
ax.set_xlabel("Mức đỏ báo sớm hơn lúc thấy vết thối (giờ)", fontsize=25)
ax.tick_params(axis="both", labelsize=25)
save(fig, "bd_som_hon.png")

# --- ⑧ phụ: độ nhạy theo lớp, đợt kiểm tra 1.500 mẫu (Bảng 4.4) ---
fig, ax = base(54, 11)
lab = ["An toàn", "Chín sinh lý", "Nguy cơ lên men"]
sens = [715 / 780 * 100, 99 / 220 * 100, 498 / 500 * 100]
frac = ["715/780", "99/220", "498/500"]
ax.barh(lab[::-1], sens[::-1], color=[GREY, GREY, NAVY][::-1], height=0.62)
for y, (v, f) in enumerate(zip(sens[::-1], frac[::-1])):
    ax.text(v + 1.2, y, f"{v:.1f} %".replace(".", ",") + f"  ({f})", va="center", fontsize=27, fontweight="bold")
ax.set_xlim(0, 135); ax.set_xticks([]); ax.spines["bottom"].set_visible(False)
ax.tick_params(axis="y", length=0, labelsize=25)
save(fig, "bd_do_nhay.png")

# --- ⑦: tín hiệu thật của một chuỗi nhiễm nấm (đợt 3) so với chuỗi lành lặn ---
b3 = r[r.Batch_ID == 3]
nam = b3[b3.Condition == "Cấy nấm thán thư"].sort_values("Hour"); lanh = b3[b3.Condition == "Lành lặn"].sort_values("Hour")
roll = lambda x: x.rolling(7, center=True, min_periods=1).mean()
fig, ax = base(54, 15)
ax.plot(lanh.Hour, roll(lanh.Rs_R0_TGS822), color=GREY, lw=4, label="Quả lành lặn")
ax.plot(nam.Hour, roll(nam.Rs_R0_TGS822), color=NAVY, lw=5, label="Quả nhiễm nấm")
red = nam.loc[nam.Model_Red_Alert == 1, "Hour"].min(); vis = nam.loc[nam.Visual_Rot_Status == 1, "Hour"].min()
assert (red, vis) == (120.0, 147.0)
for x in (red, vis):
    ax.axvline(x, color=INK, lw=2.5, ls=(0, (5, 4)))
ax.text(red - 3, 0.12, "Mức đỏ\ngiờ 120", ha="right", fontsize=24, fontweight="bold")
ax.text(vis + 3, 0.5, "Thấy vết thối\ngiờ 147", ha="left", fontsize=24, fontweight="bold")
ax.set_xlim(0, 250); ax.set_ylim(0, 1.15)
ax.set_xlabel("Giờ kể từ đầu đợt", fontsize=24); ax.set_ylabel("R$_s$/R$_0$ của TGS822", fontsize=24)
ax.legend(frameon=False, fontsize=24, loc="lower left")
ax.tick_params(labelsize=22)
save(fig, "bd_tin_hieu.png")
print("ok")
