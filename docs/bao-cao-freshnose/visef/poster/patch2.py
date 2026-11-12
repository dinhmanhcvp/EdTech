# Vá lần 2: kích thước asset gọn hơn cho vừa tấm 60×120, thêm CSS thẻ/biểu tượng. Chạy: python -X utf8 patch2.py
def edit(path, pairs):
    s = open(path, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            print("KHONG THAY:", path, ascii(a[:60]))
        s = s.replace(a, b)
    open(path, "w", encoding="utf8").write(s)

edit("ve_bieu_do.py", [("base(54, 32)", "base(54, 24)"), ("base(54, 14)", "base(54, 11)")])

edit("ve_asset.py", [
    # bảng điểm 54×18
    ("fig, ax = canvas(54, 21)", "fig, ax = canvas(54, 18)"),
    ("    y = 21 - 4.0 * (i + 1) + 0.5\n    ax.text(0.1, y + 1.55, lab", "    y = 18 - 3.4 * (i + 1) + 0.5\n    ax.text(0.1, y + 1.45, lab"),
    ('ax.text(0.1, y + 0.55, "ngưỡng " + thr', 'ax.text(0.1, y + 0.45, "ngưỡng " + thr'),
    ("ax.add_patch(Rectangle((x0, y + 0.2), tw, 2.1, fc=\"#EEF1F6\", ec=\"none\"))", "ax.add_patch(Rectangle((x0, y + 0.2), tw, 1.9, fc=\"#EEF1F6\", ec=\"none\"))"),
    ("ax.add_patch(Rectangle((x0, y + 0.2), L, 2.1, fc=NAVY))", "ax.add_patch(Rectangle((x0, y + 0.2), L, 1.9, fc=NAVY))"),
    ("ax.plot([x0 + 50 * 0.18] * 2, [y - 0.15, y + 2.65], color=INK, lw=3.5)", "ax.plot([x0 + 50 * 0.18] * 2, [y - 0.1, y + 2.4], color=INK, lw=3.5)"),
    ("y + 1.25, txt, va=\"center\", ha=\"right\"", "y + 1.15, txt, va=\"center\", ha=\"right\""),
    ("crate(ax, 46.2, y + 0.3, 6.6, 1.9, NAVY, lw=1); ax.text(49.5, y + 1.25, \"Đạt\"", "crate(ax, 46.2, y + 0.25, 6.6, 1.7, NAVY, lw=1); ax.text(49.5, y + 1.1, \"Đạt\""),
    ("(\"Giá gói 1 Hub + 8 Node\", \"≤ 22 triệu\"", "(\"Giá bán gói 1 Hub + 8 Node\", \"≤ 22 triệu\""),
    # sơ đồ kho 54×10.5
    ("fig, ax = canvas(54, 11.8)\nnames", "fig, ax = canvas(54, 10.5)\nnames"),
    ("hub = (3.2, 5.9)", "hub = (3.2, 5.3)"),
    ("y = 7.5 - r * 5.0", "y = 6.7 - r * 4.6"),
    ('"báo mức đỏ", ha="center", va="center", fontsize=22, fontweight="bold", color=NAVY)', '"báo mức đỏ", ha="center", va="center", fontsize=22, fontweight="bold", color=NAVY)'),
    ("rw / 2 - 1.5, 11.2, \"báo mức đỏ\"", "rw / 2 - 1.5, 10.1, \"báo mức đỏ\""),
    ("ax.add_patch(Circle((9.0, 0.7), 0.5, fc=NAVY)); ax.text(9.9, 0.7,", "ax.add_patch(Circle((9.0, 0.6), 0.5, fc=NAVY)); ax.text(9.9, 0.6,"),
])

edit("_head.txt", [
    (".lv{display:flex;gap:.4cm}",
     ".card{display:flex;gap:1cm;align-items:center;border-left:9pt solid #1F3A5F;background:#F1F4F9;padding:.55cm .9cm;margin-bottom:.8cm;border-radius:0 .35cm .35cm 0}\n"
     ".card .ch{font-weight:900;color:#1F3A5F;font-size:34pt;flex:none;width:3.4cm}\n"
     ".card .q{flex:1;font-size:32pt;line-height:1.22}\n"
     ".card .th{flex:none;background:#1F3A5F;color:#fff;font-weight:700;font-size:28pt;padding:.35cm .7cm;border-radius:.3cm;text-align:center;line-height:1.15}\n"
     ".fl{display:flex;gap:.9cm;align-items:center}\n.fl .ic{width:3.2cm;height:3.2cm;border-radius:50%%;background:#1F3A5F;flex:none;display:flex;align-items:center;justify-content:center}\n.fl .ic svg{width:2.1cm;height:2.1cm;fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}\n.fl .tx{flex:1}\n"
     ".dot{display:inline-block;width:.95cm;height:.95cm;border-radius:50%%;vertical-align:middle}.dot.y{background:#1F3A5F}.dot.n{border:3pt solid #8A8A8A}\n"
     ".chip{display:inline-block;font-size:24pt;font-weight:700;padding:.15cm .5cm;border-radius:.25cm;margin-right:.4cm}.chip.g{background:#E3E3E3;color:#444}.chip.b{background:#1F3A5F;color:#fff}\n"
     ".lv{display:flex;gap:.4cm}"),
    (".pair{margin-bottom:1cm}", ".pair{margin-bottom:.8cm}"),
])
print("xong")
