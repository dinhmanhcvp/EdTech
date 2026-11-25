// Bản vẽ kích thước (A3 ngang) cho đơn vị thi công. Gọi từ build-thi-cong.js.
'use strict';
const P = (n) => Math.round(n).toLocaleString('vi-VN');
// k = mm thế giới trên 1 mm giấy
function dim(x1, y1, x2, y2, off, label, k, col = '#C0261A') { const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const a = [x1 + nx * off, y1 + ny * off], b = [x2 + nx * off, y2 + ny * off], t = 1.6 * k, ext = (off > 0 ? 1 : -1) * 2 * k; let ang = (Math.atan2(dy, dx) * 180) / Math.PI; if (ang > 90 || ang < -90) ang += 180;
  const sw = 0.18 * k, tick = (p) => `<path d="M${p[0] - (ux + nx) * t * 0.6} ${p[1] - (uy + ny) * t * 0.6}L${p[0] + (ux + nx) * t * 0.6} ${p[1] + (uy + ny) * t * 0.6}" stroke="${col}" stroke-width="${sw * 1.6}"/>`;
  return `<g><path d="M${x1} ${y1}L${a[0] + nx * ext} ${a[1] + ny * ext}M${x2} ${y2}L${b[0] + nx * ext} ${b[1] + ny * ext}" stroke="${col}" stroke-width="${sw * 0.7}"/><path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="${col}" stroke-width="${sw}"/>${tick(a)}${tick(b)}<text transform="translate(${(a[0] + b[0]) / 2 + nx * 1.4 * k * (off > 0 ? 1 : -1) * 0} ${(a[1] + b[1]) / 2}) rotate(${ang})" y="${-1.2 * k}" text-anchor="middle" font-family="JetBrains Mono" font-size="${2.6 * k}" fill="${col}" paint-order="stroke" stroke="#fff" stroke-width="${0.8 * k}">${label}</text></g>`; }
const txt = (x, y, s, t, k, o = {}) => `<text x="${x}" y="${y}" font-family="${o.mono ? 'JetBrains Mono' : 'Plus Jakarta Sans'}" font-weight="${o.w || 600}" font-size="${s * k}" fill="${o.c || '#14161c'}" text-anchor="${o.a || 'start'}" ${o.rot ? `transform="rotate(${o.rot} ${x} ${y})"` : ''}>${t}</text>`;
const ln = (d, k, o = {}) => `<path d="${d}" fill="${o.fill || 'none'}" stroke="${o.c || '#14161c'}" stroke-width="${(o.w || 0.35) * k}" ${o.dash ? `stroke-dasharray="${o.dash.map((v) => v * k).join(' ')}"` : ''} ${o.op ? `opacity="${o.op}"` : ''}/>`;
function hexPts(cx, cy, r, rot = 0) { return Array.from({ length: 6 }, (_, i) => { const a = rot + (i * Math.PI) / 3; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }); }
const poly = (pts) => 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L') + 'Z';
function sheet(title, no, scale, vb, body, note = '') { const [x, y, w, h] = vb, dw = Math.min(400, (215 * w) / h), k = w / dw;
  return `<section style="width:420mm;height:297mm;position:relative;page-break-after:always;font-family:'Plus Jakarta Sans'">
<svg viewBox="${x} ${y} ${w} ${h}" style="position:absolute;left:${10 + (400 - dw) / 2}mm;top:10mm;width:${dw}mm;height:${(dw * h) / w}mm">${body(k)}</svg>
<div style="position:absolute;right:10mm;bottom:10mm;width:150mm;border:.4mm solid #14161c;font-size:3mm">
<div style="display:grid;grid-template-columns:1fr 32mm;border-bottom:.3mm solid #14161c"><div style="padding:2mm"><b style="font-size:4.2mm">${title}</b><br>Gian Socratic Vision Board + GAVIS · lều 3 × 3 m</div><div style="padding:2mm;border-left:.3mm solid #14161c;text-align:center"><span style="font-size:2.4mm">TỜ</span><br><b style="font-size:6mm">${no}</b></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;font:2.6mm 'JetBrains Mono'"><div style="padding:1.5mm 2mm">TỈ LỆ ${scale}</div><div style="padding:1.5mm 2mm;border-left:.3mm solid #14161c">ĐƠN VỊ: mm</div><div style="padding:1.5mm 2mm;border-left:.3mm solid #14161c">${new Date().toISOString().slice(0, 10)}</div></div></div>
${note ? `<div style="position:absolute;left:10mm;bottom:10mm;width:240mm;font-size:3mm;line-height:1.45;color:#333">${note}</div>` : ''}</section>`; }

function plan() { // mặt bằng: gốc toạ độ = tâm lều, z tăng ra lối đi (xuống dưới trang)
  return sheet('Mặt bằng bố trí và kích thước', '01', '1:15 (khổ A3)', [-1950, -1750, 4350, 3550], (k) => {
    let s = '';
    s += ln('M-1500 -1500H1500V1500H-1500Z', k, { w: 0.25, dash: [2, 1.5], op: 0.6 }) + txt(0, 1600, 3, 'LỐI ĐI (khách đi từ trái sang phải) →', k, { a: 'middle', c: '#555' });
    s += ln('M-1470 1500V-1470H1470V1500', k, { w: 1.2 }) + txt(-1440, -1380, 2.6, 'VÁCH BTC', k, { c: '#777', mono: 1 });
    // decal ranges
    s += ln('M-1455 1400V-1455', k, { c: '#8B5CF6', w: 2 }) + ln('M-1455 -1455H-10', k, { c: '#3D7BFF', w: 2 }) + ln('M1455 -810V1400', k, { c: '#3D7BFF', w: 2 });
    // chamfer
    s += ln('M10 -1470L1470 -810', k, { w: 2.2 }) + ln('M10 -1470L1470 -810L1470 -1470Z', k, { fill: '#e9e9ef', w: 0.2 }) + txt(950, -1350, 2.4, 'khoảng giấu chân màn', k, { a: 'middle', c: '#666' });
    const cx = 740, cz = -1140; s += txt(cx - 80, cz + 120, 2.8, 'S01 VÁCH CHÉO · màn 65"', k, { rot: 24.3, w: 700 });
    // console
    s += ln('M1060 -760H1460V-160H1060Z', k, { fill: '#dfe7ff', w: 0.6 }) + txt(1000, -460, 2.6, 'S07 BÀN LAB', k, { rot: -90, a: 'middle', w: 700 });
    // plinths
    [[-400, 650], [-800, 850], [-1200, 1050]].forEach(([z, h]) => { s += ln(poly(hexPts(-1180, z, 184, Math.PI / 6)), k, { fill: '#ece6ff', w: 0.6 }) + txt(-1180, z + 12, 2.4, String(h), k, { a: 'middle', mono: 1 }); });
    s += txt(-940, -800, 2.6, 'G02 3 BỤC (cao)', k, { w: 700 });
    // letters
    s += ln('M-60 1160H1420V1440H-60Z', k, { fill: '#dfe7ff', w: 0.6 }) + txt(680, 1320, 2.6, 'S04/S05 CHỮ "Socratic?" + BỆ', k, { a: 'middle', w: 700 });
    // pen
    s += ln('M1440 520H1470V780H1440Z', k, { fill: '#3D7BFF', w: 0.4 }) + txt(1380, 650, 2.4, 'S08 BÚT', k, { a: 'end', w: 700 });
    // writing zone
    s += ln(`M${cx - 300} ${cz + 300}L${cx + 150} ${cz + 500}L${cx + 30} ${cz + 770}L${cx - 420} ${cz + 570}Z`, k, { dash: [1.5, 1], c: '#3D7BFF' }) + txt(cx - 120, cz + 560, 2.4, 'vùng đứng viết bảng', k, { a: 'middle', c: '#3D7BFF' });
    // dimensions
    s += dim(-1500, 1500, 1500, 1500, 220, '3 000 (lều)', k) + dim(1500, -1500, 1500, 1500, -260, '3 000', k);
    s += dim(10, -1470, 1470, -1470, -150, '1 460', k) + dim(1470, -1470, 1470, -810, -150, '660', k) + dim(10, -1470, 1470, -810, 120, '1 602 (vách chéo, 24,3°)', k);
    s += dim(-1470, -1470, 10, -1470, -150, '1 480 (decal S02)', k) + dim(1470, -810, 1470, 1400, -380, '2 210 (decal S03)', k) + dim(-1470, 1400, -1470, -1470, 150, '2 870 (decal G01)', k);
    s += dim(1060, -160, 1460, -160, 70, '400', k) + dim(1060, -760, 1060, -160, 80, '600', k) + dim(1470, -810, 1470, -760, -240, '50', k);
    s += dim(-60, 1440, 1420, 1440, 90, '1 480', k) + dim(1420, 1160, 1420, 1440, -60, '280', k) + dim(-1470, 1160, -60, 1160, -60, '1 410', k);
    s += dim(-1470, -1200, -996, -1200, -40, '474 (tâm bục)', k) + dim(-1364, -400, -1364, -1200, 130, '400 + 400 (tâm–tâm)', k) + dim(1470, 520, 1470, 780, -110, '260', k) + dim(1470, 780, 1470, 1400, -110, '620', k);
    return s; }, 'Toạ độ lấy mép trong vách BTC. Màu tím: decal GAVIS; màu xanh: decal Socratic. Bục lục giác cạnh 184 mm, cao 650 · 850 · 1 050 từ ngoài vào. Đo lại lều thật khi nhận mặt bằng; lệch ≤ 30 mm thì giữ vị trí vách chéo, dồn sai số về phía lối đi.'); }

function chamfer(rel) { // mặt đứng vách chéo + bàn Lab
  return sheet('Vách chéo S01 và chữ nổi S06 · mặt đứng', '02', '1:12', [-500, -2550, 2800, 2900], (k) => {
    const cw = 1493.2, ch = 906.9, x0 = (1600 - cw) / 2, yb = -995, yt = yb - ch; let s = '';
    s += ln('M0 0H1600V-2200H0Z', k, { w: 0.6, fill: '#f3f4f8' }) + ln(`M${x0} ${yb}H${x0 + cw}V${yt}H${x0}Z`, k, { w: 0.6, fill: '#fff' }) + txt(800, (yb + yt) / 2, 3, 'Ô KHOÉT MÀN', k, { a: 'middle', c: '#888' });
    s += ln(`M${x0 - 30} ${yb + 30}H${x0 + cw + 30}V${yt - 30}H${x0 - 30}Z`, k, { dash: [1.5, 1], c: '#3D7BFF' }) + txt(x0 + cw - 10, yt - 45, 2.2, 'nẹp Formex 10 mm rộng 30', k, { a: 'end', c: '#3D7BFF' });
    s += ln(`M${800 - rel / 2} -2070H${800 + rel / 2}V-1940H${800 - rel / 2}Z`, k, { fill: '#dfe7ff', w: 0.4 }) + txt(800, -1985, 2.6, 'S06 chữ nổi', k, { a: 'middle' });
    s += ln('M0 0H1600', k, { w: 1 }) + txt(0, 120, 2.6, 'SÀN', k, { mono: 1 });
    s += dim(0, -2200, 1600, -2200, -160, '1 600', k) + dim(0, 0, 0, -2200, -160, '2 200', k);
    s += dim(x0, yb, x0 + cw, yb, 130, '1 493,2', k) + dim(x0 + cw, yb, x0 + cw, yt, -120, '906,9', k) + dim(x0 + cw + 200, 0, x0 + cw + 200, yb, -60, '995', k) + dim(0, yb + 220, x0, yb + 220, 0, String(x0.toFixed(1)).replace('.', ','), k);
    s += dim(1600, yt, 1600, -2200, -220, P(2200 - 995 - ch), k) + dim(800 - rel / 2, -2070, 800 + rel / 2, -2070, -90, P(rel), k) + dim(1600, -1940, 1600, -2200, -380, '260 (chân chữ → đỉnh)', k);
    return s; }, 'Formex 15 mm, in UV trực tiếp. Ô khoét = màn đo thực 1 483,2 × 896,9 mm + khe 5 mm mỗi phía; ĐO LẠI MÀN THẬT trước khi cắt. Mặt màn phẳng với mặt vách; màn đứng trên chân đế trong khoảng tam giác phía sau. Gông vách chéo vào hai vách BTC bằng ke Formex ở 3 cao độ (300 · 1 100 · 2 000).'); }

function consoleSheet() {
  return sheet('Bàn đặt tay Lab S07 · 3 hình chiếu', '03', '1:8', [-300, -1550, 2800, 1800], (k) => { let s = '';
    // FRONT view (x 0..600)
    s += ln('M0 0H600V-800H0Z', k, { fill: '#eef0f6', w: 0.6 }) + ln('M0 -720H600', k, { w: 0.2, dash: [1, 1] }) + txt(300, -740, 2, 'mép trước 720 · mép sau 800', k, { a: 'middle', c: '#666' });
    s += ln('M10 -800V-1253M590 -800V-1253M10 -1253H590', k, { w: 0.6 }) + ln('M0 -1268H600V-1238H0Z', k, { fill: '#fff', w: 0.6 }) + ln('M250 -1238H350V-1203H250Z', k, { fill: '#14161c', w: 0.2 });
    s += txt(300, -1330, 2.6, 'MẶT TRƯỚC', k, { a: 'middle', w: 800 }) + txt(300, -1188, 2.2, 'webcam (đã có)', k, { a: 'middle' });
    s += dim(0, 0, 600, 0, 110, '600', k) + dim(600, 0, 600, -720, -110, '720 (mép trước)', k) + dim(0, 0, 0, -1253, 150, '1 253 (đỉnh thanh vòm)', k) + dim(300, -800, 300, -1203, -170, '≈ 420 webcam → mặt bàn', k);
    // SIDE view (x offset 900): depth 400, back height 800, front 720; fin quarter annulus at back
    const ox = 900; s += ln(`M${ox} 0H${ox + 400}V-720L${ox} -800Z`, k, { fill: '#eef0f6', w: 0.6 });
    s += ln(`M${ox + 40} -800V${-800 - 540}A540 540 0 0 1 ${ox + 40 + 540} -800H${ox + 40 + 440}A440 440 0 0 0 ${ox + 40} ${-800 - 440}Z`, k, { fill: '#fff', w: 0.6 });
    s += txt(ox + 200, -1430, 2.6, 'MẶT BÊN (vòm cong S07c)', k, { a: 'middle', w: 800 });
    s += dim(ox, 0, ox + 400, 0, 110, '400', k) + dim(ox, 0, ox, -800, 140, '800 (mép sau)', k) + dim(ox + 40, -800, ox + 580, -800, 260, 'R 540 / R 440', k) + dim(ox + 400, -720, ox + 400, -800, -90, '10° nghiêng', k);
    // TOP view (x offset 1700)
    const tx = 1700; s += ln(`M${tx} -300H${tx + 600}V-700H${tx}Z`, k, { fill: '#eef0f6', w: 0.6 }) + ln(`M${tx + 40} -340H${tx + 440}V-570H${tx + 40}Z`, k, { dash: [1.2, 0.8], c: '#3D7BFF' }) + txt(tx + 240, -460, 2.4, 'vùng đặt tay', k, { a: 'middle', c: '#3D7BFF' });
    s += ln(`M${tx} -660H${tx + 20}V-700H${tx}ZM${tx + 580} -660H${tx + 600}V-700H${tx + 580}Z`, k, { fill: '#14161c' }) + txt(tx + 300, -760, 2.6, 'MẶT TRÊN (lưng áp vách phải ↑)', k, { a: 'middle', w: 800 });
    s += dim(tx, -300, tx + 600, -300, 110, '600', k) + dim(tx + 600, -300, tx + 600, -700, -110, '400', k);
    return s; }, 'Thân Formex 15 mm; vòm và thanh vòm Formex 20 mm, 2 lớp. Lớp trong của vòm TRÁI và thanh vòm có rãnh 12 × 12 mm giấu dây webcam, đi xuống trong thân bàn, ra sau vách chéo tới cổng USB màn. Mặt bàn in UV CÁN MỜ (chống lóa webcam). Lưng bàn bắt ke vào vách phải; đầu sau bàn cách mép vách chéo 50 mm.'); }

function piecesSheet(wmH) {
  return sheet('Bục GAVIS G02 · chữ đứng S04/S05 · bút S08', '04', '1:12', [-250, -2100, 3700, 2650], (k) => { let s = '';
    // plinths elevations
    [[0, 650], [440, 850], [880, 1050]].forEach(([x, h]) => { s += ln(`M${x} 0H${x + 319}V${-h}H${x}Z`, k, { fill: '#ece6ff', w: 0.6 }) + ln(`M${x + 80} 0V${-h}M${x + 239} 0V${-h}`, k, { w: 0.2 }) + dim(x + 319, 0, x + 319, -h, -70, P(h), k); });
    s += dim(0, 0, 319, 0, 100, '319 (2 mặt phẳng song song)', k) + txt(560, -1180, 2.8, 'G02 · 3 BỤC LỤC GIÁC', k, { a: 'middle', w: 800 });
    s += ln(poly(hexPts(560, 220, 184, Math.PI / 6)), k, { w: 0.6, fill: '#ece6ff' }) + dim(560 - 159.3, 220 + 92, 560 - 159.3, 220 - 92, 30, '184 (cạnh)', k) + dim(560, 36, 560, 404, -200, '368 (góc–góc)', k);
    // letters + plinth
    const lx = 1450; s += ln(`M${lx} 0H${lx + 1480}V-140H${lx}Z`, k, { fill: '#dfe7ff', w: 0.6 }) + ln(`M${lx + 50} -140H${lx + 1430}V${-140 - wmH}H${lx + 50}Z`, k, { dash: [1.5, 1] }) + txt(lx + 740, -140 - wmH / 2 + 30, 6, 'Socratic?', k, { a: 'middle', w: 800 });
    s += dim(lx, 0, lx + 1480, 0, 110, '1 480 (bệ)', k) + dim(lx + 50, -140 - wmH, lx + 1430, -140 - wmH, -90, '1 380 (chữ)', k) + dim(lx + 1480, 0, lx + 1480, -140, -80, '140', k) + dim(lx + 1480, -140, lx + 1480, -140 - wmH, -80, P(wmH), k) + txt(lx + 740, 330, 2.6, 'Bệ sâu 280 · chữ đặt lùi 40 từ mép trước bệ', k, { a: 'middle' }) + txt(lx + 740, -680, 2.8, 'S04 + S05 · CHỮ ĐỨNG', k, { a: 'middle', w: 800 });
    // pen
    const px = 3200; s += ln(`M${px} 0H${px + 260}V-1750H${px}Z`, k, { dash: [1.5, 1] }) + ln(`M${px + 57} -50V-1700M${px + 203} -50V-1700`, k, { c: '#3D7BFF', w: 0.6 }) + ln(`M${px - 20} 0H${px + 280}V-15H${px - 20}Z`, k, { fill: '#14161c' });
    s += dim(px, -1750, px + 260, -1750, -90, '260', k) + dim(px + 260, 0, px + 260, -1750, -90, '1 750', k) + txt(px + 130, -1880, 2.8, 'S08 · BÚT', k, { a: 'middle', w: 800 }) + dim(px - 20, 0, px + 280, 0, 110, 'đế 300 × 250', k);
    return s; }, 'Bục: 6 tấm Formex 10 mm rộng 184 mm ghép lục giác (in theo file G02), mặt trên G02t, LED tím mép trên + chân, đáy để hở. Chữ đứng: 3 lớp phẳng (chữ trắng 20 mm, chấm cam 20 mm, cung xanh 10 mm), bắt vít từ dưới bệ. Bút: Formex 10 mm in 2 mặt, ke L bắt vào vách phải.'); }

function wallsSheet() {
  return sheet('Vị trí decal trên vách BTC · 3 mặt đứng', '05', '1:25', [-300, -2750, 9600, 3850], (k) => { let s = ''; const H = 2200;
    const wall = (x, w, label, col, blocks) => { let r = ln(`M${x} 0H${x + w}V${-H}H${x}Z`, k, { fill: col + '22', w: 0.6, c: col }) + txt(x + w / 2, -H - 330, 3.2, label, k, { a: 'middle', w: 800 }) + dim(x, 0, x + w, 0, 140, P(w), k) + dim(x, 0, x, -H, 140, '2 200', k);
      blocks.forEach(([bx, bw, bh, t]) => { r += ln(`M${x + bx} 0H${x + bx + bw}V${-bh}H${x + bx}Z`, k, { fill: '#9993', dash: [1.2, 0.8] }) + txt(x + bx + bw / 2, -bh / 2, 2.2, t, k, { a: 'middle', c: '#444' }); }); return r; };
    s += wall(0, 2850, 'G01 · VÁCH TRÁI (trái file = lối vào)', '#8B5CF6', [[1500, 1350, 1100, 'bục G02 che (chỉ họa tiết)']]);
    s += wall(3250, 1460, 'S02 · VÁCH SAU (trái)', '#3D7BFF', []);
    s += wall(5100, 2190, 'S03 · VÁCH PHẢI (trái file = vách chéo)', '#3D7BFF', [[50, 600, 1300, 'bàn Lab che']]);
    s += ln('M3250 -2220H6190V-2400H3250Z', k, { fill: '#E8C87244', c: '#a8862a', w: 0.5 }) + txt(4720, -2290, 2.2, 'C01 DẢI BẢO TRỢ 2 940 × 180 (trên đỉnh vách sau)', k, { a: 'middle' });
    s += txt(4000, 900, 3, 'Tràn lề decal 20 mm mỗi phía; không dán đè lên nẹp nhôm vách BTC: cắt decal theo từng ô vách (thường rộng ≈ 1 000 mm) và căn chữ tránh nẹp.', k, { a: 'middle', w: 500 });
    return s; }); }

module.exports = { plan, chamfer, consoleSheet, piecesSheet, wallsSheet };
