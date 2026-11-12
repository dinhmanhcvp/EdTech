import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
OUT=os.path.dirname(os.path.abspath(__file__))
for f in ("times.ttf","timesbd.ttf"): fm.fontManager.addfont(os.path.join("C:/Windows/Fonts",f))
plt.rcParams.update({"font.family":"Times New Roman","font.size":9,"axes.unicode_minus":False})
NAVY,MAR,GRAY,MID,LIGHT="#122F53","#A32C34","#6E7882","#5B7A99","#DCE3EA"
def t(h,m=0): return h+m/60
rows=[("Dựng đèn Set A, thử mic và máy",t(6),t(8),GRAY,"Set B được điện 2 lên đèn sẵn từ 09:30"),
("Set A, lớp trống: cảnh 01",t(8),t(8,30),NAVY,""),
("Set A, có học sinh: 12, 13, 25",t(8,30),t(9,45),NAVY,""),
("Set A, người dẫn: 02, 05, 06, 08, 11, 14",t(10),t(11,45),MAR,""),
("Set A, góc nền biểu đồ: 09, 19, 21, 27",t(11,45),t(12,45),MAR,""),
("Set A, cả nhóm: 24, 28 và tiếng phòng",t(12,45),t(13,15),MAR,""),
("Ăn trưa, đổi sang Set B",t(13,15),t(14),GRAY,""),
("Set B, bàn học tối: 03, 04, 15, 18, 26",t(14),t(16,15),MID,""),
("Ghi giao diện: 07, 10, 16, 17, 20, 22, 23",t(16,15),t(17,15),NAVY,""),
("Quay bù, sao lưu, kết thúc",t(17,15),t(18),GRAY,"")]
fig,ax=plt.subplots(figsize=(7.4,3.3))
for i,(n,a,b,c,note) in enumerate(rows[::-1]):
    ax.barh(i,b-a,left=a,color=c,height=0.6)
    ax.text(b+0.08,i,f"{int(a):02d}:{int(round((a%1)*60)):02d} - {int(b):02d}:{int(round((b%1)*60)):02d}",va="center",fontsize=7.5)
ax.set_yticks(range(len(rows))); ax.set_yticklabels([r[0] for r in rows][::-1],fontsize=8)
ax.set_xlim(6,19.6); ax.set_xticks(range(6,19)); ax.set_xticklabels([f"{h:02d}h" for h in range(6,19)],fontsize=8)
ax.xaxis.grid(True,color=LIGHT,lw=0.6); ax.set_axisbelow(True)
for s in ("top","right"): ax.spines[s].set_visible(False)
fig.savefig(os.path.join(OUT,"day_plan.png"),dpi=200,bbox_inches="tight",facecolor="white")
