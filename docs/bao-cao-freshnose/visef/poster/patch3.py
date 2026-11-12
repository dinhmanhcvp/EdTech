# Vá lần 3: sửa trùng class .n, cắt chữ. Chạy: python -X utf8 patch3.py
def edit(path, pairs):
    s = open(path, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            print("KHONG THAY:", path, ascii(a[:70]))
        s = s.replace(a, b)
    open(path, "w", encoding="utf8").write(s)

edit("_head.txt", [(".dot.y{", ".dot.yes{"), (".dot.n{", ".dot.no{")])
edit("_body.txt", [
    ("""Y, N = '<span class="dot y"></span>', '<span class="dot n"></span>'""", """Y, N = '<span class="dot yes"></span>', '<span class="dot no"></span>'"""),
    ("""{Y.replace("dot y", "dot y").replace("width:", "")} có &nbsp; {N} không.""", "{Y} có &nbsp; {N} không."),
    ('EXTRA_CSS = ".pair .g:before{content:none}', 'EXTRA_CSS = ".src .dot{width:.55cm;height:.55cm;border-width:2pt}.pair .g:before{content:none}'),
    ("Quả lên men sinh ethanol, acetaldehyde (Berna, 2010) nên {RS} của cảm biến oxit kim loại giảm (nhiễm nấm: TGS2602 0,93 → 0,33; TGS822 0,93 → 0,29). Nhiệt độ, độ ẩm đo kèm để bù trôi.",
     "Quả lên men sinh ethanol, acetaldehyde (Berna, 2010) nên {RS} giảm (nhiễm nấm: TGS2602 0,93 → 0,33; TGS822 0,93 → 0,29); nhiệt, ẩm đo kèm để bù trôi."),
    ("Cả 6 chuỗi có vết thối đều được báo sớm hơn mắt thường 18,5–35,5 giờ", "Cả 6 chuỗi đều báo sớm hơn mắt thường 18,5–35,5 giờ"),
    ('card("CH1", "Mảng cảm biến khí, nhiệt ẩm và Random Forest phân loại đúng ba trạng thái bao nhiêu phần trăm?", "≥ 85 %")', 'card("CH1", "Phân loại đúng ba trạng thái bao nhiêu phần trăm?", "≥ 85 %")'),
    ("Số liệu: nhóm tác giả, 2026. Nguồn khác ghi cạnh số liệu; danh mục đầy đủ trong báo cáo.", "Số liệu: nhóm tác giả, 2026. Danh mục tài liệu đầy đủ trong báo cáo."),
    ("""          + '<div class="cap" style="margin:.4cm 0 .6cm"><b style="color:#1A1A1A">Node</b> (1–10) gắn nam châm lên thanh ray kệ.</div>'\n""", """          + '<div style="height:.6cm"></div>'\n"""),
    ("""<div class="cap" style="display:block;margin-top:.3cm"><b style="color:#1A1A1A">Hub</b> (11–13) đặt gần cửa kho.</div></div></div>'""", """</div></div>'"""),
    ("v2 đo ngắt quãng 30 phút, có màng PTFE. Nhật ký đo v1, v2: nhóm tác giả.", "Nhật ký đo v1, v2: nhóm tác giả."),
])
print("xong")
