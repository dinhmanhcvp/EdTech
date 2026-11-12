"""Xuất dữ liệu đợt 3 (PhuLucB_Test_Predictions_1500samples.csv) thành JSON gọn cho giao diện Trạm phát lại (cảnh 5.3–5.4).
python -I -X utf8 xuat_du_lieu_tram.py  →  socratic-video/public/fn/hub-replay.json
Quy tắc cảnh báo đỏ theo báo cáo (Mục 4.2.4): mô hình dự đoán lớp 2 ở 6 mẫu liên tiếp (3 giờ)."""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'PhuLucB_Test_Predictions_1500samples.csv')
OUT = os.path.join(HERE, '..', '..', '..', '..', 'socratic-video', 'public', 'fn', 'hub-replay.json')

rows = list(csv.DictReader(open(SRC, encoding='utf-8-sig')))
chambers = []
for cid in ('1', '2', '3'):
    x = [r for r in rows if r['Chamber_ID'] == cid]
    run, red_start = 0, None
    for r in x:
        run = run + 1 if r['Predicted_State'] == '2' else 0
        if run == 6 and red_start is None:
            red_start = float(r['Hour']) - 2.5  # giờ của mẫu đầu tiên trong chuỗi 6 mẫu
    rot = next((float(r['Hour']) for r in x if r['Visual_Rot_Status'] == '1'), None)
    chambers.append({
        'id': int(cid),
        'condition': x[0]['Condition'],
        'hour': [float(r['Hour']) for r in x],
        'tgs2602': [float(r['Rs_R0_TGS2602']) for r in x],
        'tgs822': [float(r['Rs_R0_TGS822']) for r in x],
        'temp': [float(r['Temp_C']) for r in x],
        'rh': [float(r['RH_pct']) for r in x],
        'pred': [int(r['Predicted_State']) for r in x],
        'redStart': red_start,
        'rot': rot,
    })

# tự kiểm: phải khớp báo cáo (Mục 4.2.4): đỏ liên tục từ giờ 129,5 (xước) và 119,5 (nấm); Δt 36,0 và 27,5 giờ; đối chứng không đỏ liên tục
assert chambers[0]['redStart'] is None and chambers[0]['rot'] is None
assert (chambers[1]['redStart'], chambers[1]['rot'] - chambers[1]['redStart']) == (129.5, 36.0)
assert (chambers[2]['redStart'], chambers[2]['rot'] - chambers[2]['redStart']) == (119.5, 27.5)
json.dump({'batch': 3, 'start': rows[0]['Timestamp'], 'chambers': chambers}, open(OUT, 'w', encoding='utf8'), ensure_ascii=False)
print('ok', os.path.abspath(OUT), [(c['condition'], c['redStart'], c['rot'], sum(p == 2 for p in c['pred'])) for c in chambers])
