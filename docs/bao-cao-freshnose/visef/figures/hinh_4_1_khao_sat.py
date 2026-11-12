# Hinh 4.1: ket qua khao sat so bo (n = 18). So lan suy ra tu ti le nhom bao cao: 83%->15, 78%->14, 72%->13 (kiem tra: x/18 lam tron trung khop).
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

n = 18
items = [("Kiểm tra chất lượng\nbằng mắt và mũi", 15),
         ("Từng thiệt hại do một sọt\nthối lây cả pallet", 14),
         ("Sẵn sàng chi 15–25 triệu\nđồng cho cảnh báo tự động", 13)]

def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return 100 * p, 100 * (c - h), 100 * (c + h)

res = [wilson(k, n) for _, k in items]
for (lab, k), (p, lo, hi) in zip(items, res):
    print(f"{k}/{n} = {p:.1f} %  Wilson 95 %: {lo:.1f}-{hi:.1f}  | {lab.replace(chr(10), ' ')}")

plt.rcParams["font.family"] = "Times New Roman"
plt.rcParams["font.size"] = 12
fig, ax = plt.subplots(figsize=(15 / 2.54, 7.5 / 2.54), dpi=300)
x = range(len(items))
ps = [r[0] for r in res]
err = [[r[0] - r[1] for r in res], [r[2] - r[0] for r in res]]
ax.bar(x, ps, color="#1F3A5F", width=0.55, yerr=err, ecolor="#8A8A8A", capsize=4)
ax.set_xticks(list(x))
ax.set_xticklabels([i[0] for i in items], fontsize=10)
ax.set_ylabel("Tỉ lệ đơn vị trả lời (%)")
ax.set_ylim(0, 100)
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
fig.tight_layout()
fig.savefig("hinh_4_1_khao_sat.png")
