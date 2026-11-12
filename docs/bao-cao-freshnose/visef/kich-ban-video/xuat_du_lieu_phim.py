"""Dữ liệu thật cho các cảnh đồ họa của phim ViSEF (FN-Visef) → socratic-video/public/fn/visef/data.json
python -I -X utf8 xuat_du_lieu_phim.py
Mỗi trường ghi nguồn; có assert đối chiếu với số trong báo cáo FINAL."""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, '..')
OUT = os.path.join(HERE, '..', '..', '..', '..', 'socratic-video', 'public', 'fn', 'visef', 'data.json')


def rd(name):
    return list(csv.DictReader(open(os.path.join(D, name), encoding='utf-8-sig')))


# v1: pin rơi, đọng sương (Bảng 4.2)
v1 = rd('PhuLucB_NhatKy_DoKiem_v1.csv')
v1_nodes = {}
for r in v1:
    n = v1_nodes.setdefault(r['Node_ID'], {'h': [], 'v': [], 'rs': [], 'cond': [], 'rh': []})
    n['h'].append(float(r['Test_Hour']))
    n['v'].append(float(r['Battery_Voltage_V']))
    n['rs'].append(float(r['TGS2602_Rs_kOhm']) if r['TGS2602_Rs_kOhm'] else None)  # trống sau khi ngắt nguồn (SHUTDOWN_CUTOFF)
    n['cond'].append(r['Condensation_Observed'] == 'YES')
    n['rh'].append(float(r['Chamber_RH_pct']))
# v2: các pha của một chu kỳ đo (Mục 4.2.4)
v2 = rd('PhuLucB_NhatKy_DoKiem_v2.csv')
phases = []
for r in v2:
    if r['Node_ID'] == v2[0]['Node_ID'] and r['Cycle_Index'] == '1':
        phases.append({'name': r['Phase_Name'], 's': float(r['Duration_s']), 'mA': float(r['Phase_Current_mA'])})
dry = sum(r['PTFE_Membrane_Status'] == 'NORMAL_DRY' for r in v2)
# pin 1.128 chu kỳ
bat = rd('PhuLucB_Battery_Discharge_Log.csv')
soc_full = [(float(r['Day']), float(r['State_Of_Charge_pct'])) for r in bat]
soc = soc_full[::8] + [soc_full[-1]]
# đợt 3: nhiệt độ + dự đoán (5.7), tín hiệu mẫu (4.2)
pred = rd('PhuLucB_Test_Predictions_1500samples.csv')
b3 = {}
for r in pred:
    c = b3.setdefault(r['Chamber_ID'], {'h': [], 'temp': [], 'rh': [], 'g1': [], 'g2': [], 'fp': []})
    c['h'].append(float(r['Hour']))
    c['temp'].append(float(r['Temp_C']))
    c['rh'].append(float(r['RH_pct']))
    c['g1'].append(float(r['Rs_R0_TGS2602']))
    c['g2'].append(float(r['Rs_R0_TGS822']))
    c['fp'].append(r['Predicted_State'] == '2' and r['State_Label'] != '2')
fp_total = sum(sum(c['fp']) for c in b3.values())
neg_total = sum(r['State_Label'] != '2' for r in pred)
assert (fp_total, neg_total) == (62, 1000), (fp_total, neg_total)       # cảnh báo giả 62/1.000 (Bảng 4.4)
assert dry == 108                                                        # màng PTFE khô 108/108
assert abs(soc_full[-1][1] - 10.3) < 0.6 and abs(soc_full[-1][0] - 23.5) < 0.1, soc_full[-1]             # 10,3 % ở ngày 23,5

data = {
    'v1': v1_nodes, 'v2phases': phases, 'ptfeDry': dry, 'soc': soc,
    'b3': b3,
    # Bảng 4.3 (trung bình Rs/R0): [TGS2602, TGS822]
    'table43': {'lanh_antoan': [0.868, 0.910], 'lanh_chin': [0.661, 0.826], 'nam_lenmen': [0.332, 0.287]},
    # Bảng 4.4
    'cm': [[715, 42, 23], [82, 99, 39], [0, 2, 498]],
    # Mục 4.2.4: Δt từng chuỗi (giờ), [điều kiện, đợt, giờ]
    'dt': [['Nhiễm nấm', 1, 18.5], ['Nhiễm nấm', 2, 21.0], ['Nhiễm nấm', 3, 27.0], ['Gây xước', 1, 24.5], ['Gây xước', 2, 31.5], ['Gây xước', 3, 35.5]],
}
json.dump(data, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('ok', os.path.getsize(OUT), 'v1 nodes', list(v1_nodes), 'phases', [(p['name'], p['s']) for p in phases])
