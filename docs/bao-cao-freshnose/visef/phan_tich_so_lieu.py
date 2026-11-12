# Phân tích số liệu thô FreshNose cho báo cáo. Chạy: python -X utf8 phan_tich_so_lieu.py  (cần pandas, matplotlib)
# Đọc các file PhuLuc*.csv ở thư mục cha, in các bảng dùng trong báo cáo và vẽ Hình 4.3, 4.4 vào figures/.
import os, math
import numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
rd = lambda f: pd.read_csv(os.path.join(ROOT, f), encoding="utf-8-sig")
raw = rd("PhuLucB_FreshNose_RawTimeSeries.csv")
COND = {"Lành lặn": "Lành lặn", "Gây xước cơ học": "Gây xước", "Cấy nấm thán thư": "Nhiễm nấm"}
STATE = {0: "An toàn", 1: "Chín sinh lý", 2: "Nguy cơ lên men"}
raw["cond"] = raw.Condition.map(COND)

# --- Bảng 4.3: tín hiệu theo nhóm quả và trạng thái (gộp 3 đợt) ---
t = raw.groupby(["cond", "State_Label"]).agg(n=("Sample_Index", "size"),
    a_m=("Rs_R0_TGS2602", "mean"), a_s=("Rs_R0_TGS2602", "std"),
    b_m=("Rs_R0_TGS822", "mean"), b_s=("Rs_R0_TGS822", "std")).reset_index()
print("== BANG 4.3 (cond, state, n, TGS2602 mean±SD, TGS822 mean±SD)")
for _, r in t.iterrows():
    print(f"{r.cond} | {STATE[r.State_Label]} | {r.n} | {r.a_m:.3f} ± {r.a_s:.3f} | {r.b_m:.3f} ± {r.b_s:.3f}")

# --- Thời điểm nhãn mức đỏ (cột Model_Red_Alert) và thời điểm thấy vết thối, mỗi đợt x nhóm ---
rows = []
for (b, c), g in raw.groupby(["Batch_ID", "cond"]):
    a = g.loc[g.Model_Red_Alert == 1, "Hour"].min(); v = g.loc[g.Visual_Rot_Status == 1, "Hour"].min()
    if not math.isnan(a): rows.append((b, c, a, v, v - a))
ev = pd.DataFrame(rows, columns=["batch", "cond", "alert_h", "visual_h", "delta_h"])
print("\n== DELTA T theo dot x nhom"); print(ev.to_string(index=False))
print(f"Delta t trung binh ± SD (n={len(ev)}): {ev.delta_h.mean():.1f} ± {ev.delta_h.std(ddof=1):.1f}; min {ev.delta_h.min()}, max {ev.delta_h.max()}")
print(ev.groupby("cond").delta_h.agg(["mean", "std", "min", "max"]).round(1).to_string())
print("Model_Red_Alert trung nhan State_Label==2 o moi mau:", bool((raw.Model_Red_Alert == (raw.State_Label == 2).astype(int)).all()))

# --- Nhiệt độ, độ ẩm theo buồng ---
print("\n== Nhiet do/do am theo nhom (mean ± SD)")
print(raw.groupby("cond")[["Temp_C", "RH_pct"]].agg(["mean", "std"]).round(2).to_string())

# --- Ma trận nhầm lẫn do nhóm cung cấp (tập kiểm tra = đợt 3) ---
cm = np.array([[715, 42, 23], [82, 99, 39], [0, 2, 498]])
acc = np.trace(cm) / cm.sum(); n = cm.sum(); z = 1.96
c = (acc + z*z/(2*n)) / (1 + z*z/n); h = z*math.sqrt(acc*(1-acc)/n + z*z/(4*n*n)) / (1 + z*z/n)
print(f"\nAccuracy {acc*100:.2f} % ({np.trace(cm)}/{n}); Wilson 95 % (coi mau doc lap): {100*(c-h):.1f}-{100*(c+h):.1f}")
f1 = []
for i in range(3):
    tp = cm[i, i]; rec = tp/cm[i].sum(); prec = tp/cm[:, i].sum(); f1.append(2*prec*rec/(prec+rec))
print("F1 macro:", round(np.mean(f1)*100, 1), "%")
print("Canh bao gia (khong phai lop 2 bi du doan lop 2):", cm[:2, 2].sum(), "/", cm[:2].sum())

# --- Pin ---
bat = rd("PhuLucB_Battery_Discharge_Log.csv")
per_day = bat.Capacity_Used_mAh.iloc[-1] / bat.Day.iloc[-1]
d20 = bat.loc[bat.State_Of_Charge_pct <= 20, "Day"].min()
print(f"\nPin: {len(bat)} chu ky, {bat.Day.iloc[-1]} ngay, SOC cuoi {bat.State_Of_Charge_pct.iloc[-1]} %, {per_day:.1f} mAh/ngay, SOC<=20 % tai ngay {d20}; "
      f"retry {int((bat.Tx_Status != 'SUCCESS').sum())}/{len(bat)}, thanh cong cuoi cung {100*bat.Tx_Status.str.contains('SUCCESS').mean():.0f} %")

# --- Hình 4.3: tín hiệu theo giờ kể từ đầu mỗi đợt, trung bình ± SD qua 3 đợt ---
plt.rcParams.update({"font.family": "Times New Roman", "font.size": 11})
style = {"Lành lặn": ("#8A8A8A", "-"), "Gây xước": ("#1F3A5F", "--"), "Nhiễm nấm": ("#1F3A5F", "-")}
fig, axs = plt.subplots(1, 2, figsize=(15/2.54, 6.5/2.54), dpi=300, sharey=True)
for ax, col, ttl in zip(axs, ["Rs_R0_TGS2602", "Rs_R0_TGS822"], ["TGS2602", "TGS822"]):
    for cname, (colr, ls) in style.items():
        p = raw[raw.cond == cname].pivot_table(index="Hour", columns="Batch_ID", values=col)
        m, s = p.mean(axis=1), p.std(axis=1)
        ax.plot(m.index, m.values, color=colr, ls=ls, lw=1.2, label=cname)
        ax.fill_between(m.index, m - s, m + s, color=colr, alpha=0.12, lw=0)
    ax.set_title(ttl, fontsize=11); ax.set_xlabel("Giờ kể từ đầu đợt")
    for s_ in ("top", "right"): ax.spines[s_].set_visible(False)
axs[0].set_ylabel(r"$R_s/R_0$"); axs[0].legend(frameon=False, fontsize=9)
fig.tight_layout(); fig.savefig(os.path.join(HERE, "figures", "hinh_4_3_tin_hieu.png"))

# --- Hình 4.4: từ nhãn mức đỏ đến lúc thấy vết thối, mỗi đợt x nhóm ---
fig, ax = plt.subplots(figsize=(15/2.54, 5.5/2.54), dpi=300)
ev = ev.sort_values(["cond", "batch"]).reset_index(drop=True)
for i, r in ev.iterrows():
    ax.plot([r.alert_h, r.visual_h], [i, i], color="#1F3A5F", lw=3, solid_capstyle="butt")
    ax.plot(r.alert_h, i, "o", color="#1F3A5F", ms=5); ax.plot(r.visual_h, i, "s", color="#8A8A8A", ms=5)
    ax.text(r.visual_h + 3, i, f"{r.delta_h:.1f} giờ", va="center", fontsize=9)
ax.set_yticks(range(len(ev))); ax.set_yticklabels([f"{r.cond}, đợt {r.batch}" for _, r in ev.iterrows()], fontsize=9)
ax.set_xlabel("Giờ kể từ đầu đợt (tròn: nhãn mức đỏ; vuông: thấy vết thối)"); ax.set_xlim(40, 215)
for s_ in ("top", "right"): ax.spines[s_].set_visible(False)
fig.tight_layout(); fig.savefig(os.path.join(HERE, "figures", "hinh_4_4_som.png"))
