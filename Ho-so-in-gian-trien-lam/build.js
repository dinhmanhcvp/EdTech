// Sinh file in 1:1 (PDF vector) cho gian triển lãm Socratic Vision Board.
// Chạy: npm install && npm run build   (cần Playwright + Chromium)
// Kết quả: out/  — xem README.md.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const QRCode = require('qrcode');
const { chromium } = require('playwright');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'out');
const TMP = path.join(ROOT, '.tmp');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- màu (RGB cho màn hình; CMYK tham khảo ghi trong bảng kê) ----------
const C = {
  ink: '#141310', ink2: '#1D1B16', paper: '#FBF9F4', paper2: '#F2EEE4',
  blue: '#2459C9', blueL: '#8FB0F5', orange: '#D9481C', orangeL: '#F08A66', orangeD: '#B83A12',
  fg: '#F5F2EA', mute: '#A8A29E', mute2: '#C9C5BB', line: '#3A362F', gridD: '#25231E', gridL: '#E4DED1',
  text2: '#3B3830', text3: '#57534E', oak: '#C9B89A',
};

// ---------- tiện ích ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const missing = new Map(); // mã hạng mục -> Set các ô còn thiếu
let CUR = '';
function need(label) { if (!missing.has(CUR)) missing.set(CUR, new Set()); missing.get(CUR).add(label); }
// đánh dấu ô [ ... ] còn trống
function T(s) { const v = String(s ?? ''); const m = v.match(/\[[^\]]+\]/g); if (m) m.forEach((x) => need(x)); return esc(v); }

function img(file, label, w, h, dark) {
  if (file) {
    const p = path.join(ROOT, 'assets', file);
    if (fs.existsSync(p)) {
      const ext = path.extname(p).slice(1).toLowerCase().replace('jpg', 'jpeg');
      const b64 = fs.readFileSync(p).toString('base64');
      return `<img src="data:image/${ext};base64,${b64}" style="width:${w}mm;height:${h}mm;object-fit:cover;display:block">`;
    }
  }
  need(label);
  const st = dark ? C.line : '#B9B3A6';
  return `<div style="width:${w}mm;height:${h}mm;position:relative;background:${dark ? '#1C1B18' : '#E9E4D8'}">
    <svg viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0;width:100%;height:100%"><path d="M0 0 L${w} ${h} M${w} 0 L0 ${h}" stroke="${st}" stroke-width="0.6"/></svg>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:600 ${Math.max(4, Math.min(w, h) / 12)}mm 'JetBrains Mono';color:${dark ? C.mute : C.text3};text-align:center;padding:4mm">${esc(label)}</div></div>`;
}

async function qr(url, size, label, dark) {
  if (!url) {
    need(label);
    return `<div style="width:${size}mm;height:${size}mm;background:#fff;border:${size / 60}mm dashed #999;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font:600 ${size / 10}mm 'JetBrains Mono';color:#666;text-align:center">QR<br>${esc(label)}</div>`;
  }
  const svg = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#141310', light: '#ffffff' } });
  const pad = size * 0.08;
  return `<div style="width:${size}mm;height:${size}mm;background:#fff;padding:${pad}mm;box-sizing:border-box">${svg.replace('<svg', `<svg style="width:100%;height:100%;display:block"`)}</div>`;
}

function grid(w, h, step, color, sw) {
  let d = '';
  for (let x = step; x < w; x += step) d += `M${x} 0V${h}`;
  for (let y = step; y < h; y += step) d += `M0 ${y}H${w}`;
  return `<svg viewBox="0 0 ${w} ${h}" style="position:absolute;left:0;top:0;width:${w}mm;height:${h}mm"><path d="${d}" stroke="${color}" stroke-width="${sw}" fill="none"/></svg>`;
}
function corners(w, h, m, len, th, color) {
  const s = (x, y, bx, by) => `<div style="position:absolute;left:${x}mm;top:${y}mm;width:${len}mm;height:${len}mm;${bx}:${th}mm solid ${color};${by}:${th}mm solid ${color}"></div>`;
  return s(m, m, 'border-left', 'border-top') + s(w - m - len, m, 'border-right', 'border-top') +
    s(m, h - m - len, 'border-left', 'border-bottom') + s(w - m - len, h - m - len, 'border-right', 'border-bottom');
}
const A = (x, y, w, inner, extra = '') => `<div style="position:absolute;left:${x}mm;top:${y}mm;${w ? `width:${w}mm;` : ''}${extra}">${inner}</div>`;
const mono = (size, color, txt, extra = '') => `<div style="font:500 ${size}mm/1.2 'JetBrains Mono';letter-spacing:.08em;color:${color};${extra}">${txt}</div>`;
function ringLogo(d, color, q) {
  return `<div style="width:${d}mm;height:${d}mm;border-radius:50%;border:${d * 0.06}mm solid ${color};box-sizing:border-box;display:flex;align-items:center;justify-content:center;font:400 ${d * 0.68}mm/1 'Newsreader';color:${q}">?</div>`;
}
function wordmark(size, color, q = C.orange) {
  return `<div style="display:flex;align-items:center;gap:${size * 0.35}mm">${ringLogo(size * 1.25, color, q)}<div style="font:800 ${size}mm/1 'Plus Jakarta Sans';letter-spacing:-.015em;color:${color};white-space:nowrap">Socratic Vision Board</div></div>`;
}

// ---------- khung trang: tràn lề, dấu cắt, dòng thông tin ----------
function pageHTML(spec, inner) {
  const { w, h, bleed: b, marks, bg } = spec;
  const s = marks ? 12 : 0;
  const PW = w + 2 * b + 2 * s, PH = h + 2 * b + 2 * s;
  let cm = '';
  if (marks) {
    const L = 6, off = b + 1.5, k = '#000', t = 0.1;
    const line = (x, y, ww, hh) => `<div style="position:absolute;left:${x}mm;top:${y}mm;width:${ww}mm;height:${hh}mm;background:${k}"></div>`;
    const X0 = s + b, X1 = s + b + w, Y0 = s + b, Y1 = s + b + h;
    for (const [x, sx] of [[X0, -1], [X1, 1]]) for (const [y, sy] of [[Y0, -1], [Y1, 1]]) {
      cm += line(sx < 0 ? x - off - L : x + off, y - t / 2, L, t);
      cm += line(x - t / 2, sy < 0 ? y - off - L : y + off, t, L);
    }
    cm += `<div style="position:absolute;left:${s + b + 8}mm;top:${PH - 5.5}mm;font:400 2mm 'JetBrains Mono';color:#000;white-space:nowrap">${esc(spec.code)} · ${w}×${h} mm · tràn ${b} mm${w >= 140 ? ` · ${esc(spec.name)} · ${TODAY}` : ''}</div>`;
  }
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<link rel="stylesheet" href="../fonts/fonts.css">
<style>@page{size:${PW}mm ${PH}mm;margin:0}html,body{margin:0;padding:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Plus Jakarta Sans',sans-serif}</style></head><body>
<div style="position:relative;width:${PW}mm;height:${PH}mm;overflow:hidden;background:#fff">
${cm}
<div style="position:absolute;left:${s}mm;top:${s}mm;width:${w + 2 * b}mm;height:${h + 2 * b}mm;background:${bg || '#fff'};overflow:hidden">
<div style="position:absolute;left:${b}mm;top:${b}mm;width:${w}mm;height:${h}mm">${inner}</div>
</div></div></body></html>`;
}

// ---------- vách ----------
const VW = cfg.vach.rongTam, VH = cfg.vach.caoTam, VN = cfg.vach.soTam;
const WALL_W = VW * VN;
const SKIRT_TOP = VH - 150; // chân vách xanh cao 150 mm

function artBack(q) {
  const x1 = 120, x2 = VW + 50, x3 = 2 * VW + 60;
  const metrics = [['&lt;16', ' ms', 'độ trễ nét viết'], ['&lt;15', ' ms', 'nhận diện tại chỗ'], ['10', '', 'mô phỏng STEM nâng cao'], ['37', '', 'bài Lab điều khiển bằng tay']]
    .map(([n, u, l]) => `<div style="border-top:1.5mm solid ${C.line};padding-top:16mm;margin-bottom:34mm"><div style="font:500 82mm/1 'JetBrains Mono';letter-spacing:-.02em;color:${C.fg}">${n}<span style="font-size:38mm;color:${C.mute}">${u}</span></div><div style="font:500 24mm/1.3 'Plus Jakarta Sans';color:${C.mute};margin-top:8mm">${l}</div></div>`).join('');
  const layers = ['Nét mực', 'Nhận diện', 'Suy luận', 'Hỏi Socratic', 'Ghi nhớ']
    .map((l, i) => A(x3, 600 + i * 165, 190, `<div style="display:flex;align-items:baseline;gap:6mm"><span style="font:600 30mm 'JetBrains Mono';color:${i === 3 ? C.orangeL : C.blueL}">0${i + 1}</span></div><div style="font:500 19mm/1.2 'Plus Jakarta Sans';color:${C.mute2}">${l}</div><div style="position:absolute;left:150mm;top:18mm;width:${2150 - x3 - 160}mm;height:1.5mm;background:${C.line}"></div>`)).join('');
  return grid(WALL_W, VH, 100, C.gridD, 0.6) + corners(WALL_W, VH - 150, 60, 80, 4, '#6E6A62') +
    // ô 1
    A(x1, 150, 760, mono(22, C.blueL, '// TRIỂN LÃM CÔNG NGHỆ · KHỞI NGHIỆP')) +
    A(x1, 205, 800, `<div style="font:800 100mm/1.02 'Plus Jakarta Sans';letter-spacing:-.03em;color:${C.fg};white-space:nowrap">Viết một câu.</div><div style="font:italic 400 108mm/1.02 'Newsreader';color:${C.blueL};white-space:nowrap">Xem AI nghĩ.</div>`) +
    A(x1, 470, 400, `<div style="font:500 24mm/1.4 'Plus Jakarta Sans';color:${C.mute2}">Bảng tương tác AI biết hỏi lại học sinh, không đưa sẵn đáp án.</div>`) +
    A(x1, 720, 380, metrics) +
    // ô 2
    A(x2, 150, 850, wordmark(54, C.fg)) +
    A(x2, 470, 850, mono(20, C.mute, 'FIG.01 — BẢNG TƯƠNG TÁC · PHIÊN TRỰC TIẾP')) +
    A(x2, 1430, 850, `<div style="border:2mm solid #57534E;border-radius:10mm;padding:22mm 28mm;display:flex;justify-content:space-between;align-items:center"><span style="font:700 38mm 'Plus Jakarta Sans';color:${C.fg}">Thử: viết một phương trình</span><span style="font:500 24mm 'JetBrains Mono';color:${C.orangeL}">bút ở đây ↓</span></div>`) +
    // ô 3
    A(x3, 150, 830, mono(22, C.blueL, '// HỘP KÍNH · PIPELINE')) +
    A(x3, 205, 830, `<div style="font:400 66mm/1.06 'Newsreader';color:${C.fg}">Nhìn AI nghĩ,<br><i style="color:${C.blueL}">từng lớp một.</i></div>`) +
    layers +
    A(x3, 1620, 830, mono(20, C.mute, 'ƯƠM MẦM BỞI') + `<div style="font:700 38mm/1.2 'Plus Jakarta Sans';color:${C.fg};margin-top:8mm">Sở Giáo dục và Đào tạo Phú Thọ</div>`) +
    A(x3, 1800, 830, `<div style="display:flex;gap:26mm;align-items:center">${img(cfg.logoBTC, 'LOGO BTC (file chính thức)', 230, 230, true)}<div style="font:500 26mm/1.4 'Plus Jakarta Sans';color:${C.mute2}">Dự án khởi nghiệp học sinh<br><b style="color:${C.fg}">${T(cfg.tenTruong)}</b></div></div>`) +
    `<div style="position:absolute;left:-40mm;top:${SKIRT_TOP}mm;width:${WALL_W + 80}mm;height:200mm;background:${C.blue}"></div>`;
}

async function artLeft() {
  const st = cfg.cauChuyen;
  const cx = [35 + 210, 495 + 210, VW + 35 + 210, VW + 495 + 210, 2 * VW + 35 + 210];
  const dotC = [C.orange, C.ink2, C.blue, C.ink2, C.orange];
  const tl = cx.map((x, i) => A(x - 18, 1862, 36, `<div style="width:36mm;height:36mm;border-radius:50%;background:${dotC[i]}"></div>`) +
    A(x - 200, 1925, 400, `<div style="text-align:center;font:500 20mm/1.3 'JetBrains Mono';color:${C.text2}">${T(st[i].moc)}</div>`)).join('');
  const x3 = 2 * VW + 485;
  return grid(WALL_W, VH, 100, C.gridL, 0.6) +
    A(70, 80, 800, mono(20, C.text3, '// HÀNH TRÌNH KHỞI NGHIỆP')) +
    A(70, 140, 860, `<div style="font:400 88mm/1 'Newsreader';color:${C.ink2};white-space:nowrap">Bắt đầu từ</div>`) +
    A(VW + 70, 140, 860, `<div style="font:italic 400 88mm/1 'Newsreader';color:${C.orange};white-space:nowrap">một tiết học</div>`) +
    A(2 * VW + 70, 140, 860, `<div style="font:italic 400 88mm/1 'Newsreader';color:${C.orange};white-space:nowrap">ở Phú Thọ.</div>`) +
    A(x3, 380, VW - 485 - 50, `<div style="font:800 40mm/1.1 'Plus Jakarta Sans';color:${C.ink2}">Nhóm đang tìm</div>
      ${['Mentor đồng hành', 'Lớp học thử nghiệm', 'Tài trợ thiết bị'].map((t, i) => `<div style="display:flex;gap:10mm;margin-top:22mm;align-items:baseline"><span style="font:600 26mm 'JetBrains Mono';color:${C.orange}">0${i + 1}</span><span style="font:600 28mm/1.25 'Plus Jakarta Sans';color:${C.ink2}">${t}</span></div>`).join('')}
      <div style="margin-top:70mm">${await qr(cfg.qrLienHe, 240, 'qrLienHe')}</div>
      <div style="font:500 20mm/1.35 'Plus Jakarta Sans';color:${C.text2};margin-top:14mm">Quét để liên hệ nhóm<br><b style="color:${C.ink2}">${T(cfg.lienHe)}</b></div>`) +
    `<div style="position:absolute;left:35mm;top:1877mm;width:${WALL_W - 70}mm;height:6mm;background:${C.ink2}"></div>` + tl +
    `<div style="position:absolute;left:-40mm;top:${SKIRT_TOP}mm;width:${WALL_W + 80}mm;height:200mm;background:${C.blue}"></div>`;
}

async function artRight() {
  const tv = cfg.thanhVien;
  const cells = tv.map((m, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    return A(70 + col * 430, 430 + row * 640, 390, img(m.anh, `ẢNH ${m.ten}`, 390, 490, false) +
      `<div style="font:700 30mm/1.2 'Plus Jakarta Sans';color:${C.ink2};margin-top:14mm">${T(m.ten)}</div><div style="font:500 20mm/1.3 'Plus Jakarta Sans';color:${C.text3}">${esc(m.vai)} · ${T(m.lop)}</div>`);
  }).join('');
  const x2 = VW + 70, x3 = 2 * VW + 70;
  return grid(WALL_W, VH, 100, C.gridL, 0.6) +
    A(70, 80, 800, mono(20, C.text3, '// ĐỘI NGŨ')) +
    A(70, 140, 860, `<div style="font:400 88mm/1 'Newsreader';color:${C.ink2}">Những người<br><i style="color:${C.blue}">làm ra nó.</i></div>`) + cells +
    A(x2, 80, 800, mono(20, C.text3, '// ĐỒNG HÀNH')) +
    A(x2, 140, 860, `<div style="font:400 88mm/1 'Newsreader';color:${C.ink2}">Được ươm mầm<br><i style="color:${C.blue}">tại Phú Thọ.</i></div>`) +
    A(x2, 470, 820, `<div style="display:flex;gap:30mm;align-items:center">${img(cfg.logoBTC, 'LOGO BTC (file chính thức)', 260, 260, false)}<div><div style="font:700 34mm/1.25 'Plus Jakarta Sans';color:${C.ink2}">Sở Giáo dục và Đào tạo Phú Thọ</div><div style="font:500 22mm/1.4 'Plus Jakarta Sans';color:${C.text3};margin-top:8mm">Đơn vị bảo trợ và ươm mầm</div></div></div>`) +
    A(x2, 840, 820, `<div style="border-top:1.5mm solid ${C.ink2};padding-top:24mm">${mono(20, C.text3, 'GIÁO VIÊN HƯỚNG DẪN')}<div style="font:700 40mm/1.25 'Plus Jakarta Sans';color:${C.ink2};margin-top:10mm">${T(cfg.giaoVienHuongDan)}</div></div>`) +
    A(x2, 1180, 820, `<div style="border-top:1.5mm solid ${C.ink2};padding-top:24mm;display:flex;gap:30mm;align-items:center">${img(cfg.logoTruong, 'LOGO TRƯỜNG', 200, 200, false)}<div>${mono(20, C.text3, 'TRƯỜNG')}<div style="font:700 36mm/1.25 'Plus Jakarta Sans';color:${C.ink2};margin-top:10mm">${T(cfg.tenTruong)}</div></div></div>`) +
    A(x3, 80, 800, mono(20, C.text3, '// DÙNG THỬ')) +
    A(x3, 140, 820, `<div style="font:800 64mm/1.05 'Plus Jakarta Sans';letter-spacing:-.02em;color:${C.ink2}">Thử gia sư<br><span style="font:italic 400 70mm 'Newsreader';color:${C.blue}">Socratic ngay.</span></div>`) +
    A(x3, 520, 420, await qr(cfg.qrDungThu, 400, 'qrDungThu')) +
    A(x3, 960, 760, `<div style="font:600 28mm/1.35 'Plus Jakarta Sans';color:${C.ink2}">Quét bằng điện thoại.<br><span style="font-weight:500;color:${C.text3}">Không cần cài đặt, chạy trên trình duyệt.</span></div>`) +
    `<div style="position:absolute;left:-40mm;top:${SKIRT_TOP}mm;width:${WALL_W + 80}mm;height:200mm;background:${C.blue}"></div>`;
}

// ---------- các hạng mục khác ----------
function artFascia() {
  return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 60mm">
    <div style="font:600 110mm/1 'JetBrains Mono';background:${C.ink};color:${C.fg};padding:22mm 34mm">${T(cfg.soGian)}</div>
    ${wordmark(118, C.ink2)}
    <div style="text-align:right;font:500 34mm/1.3 'Plus Jakarta Sans';color:${C.text2}">Dự án khởi nghiệp<br><b style="color:${C.ink2}">${T(cfg.tenTruong)} · Phú Thọ</b></div></div>
    <div style="position:absolute;left:-10mm;bottom:-10mm;width:3100mm;height:22mm;background:${C.blue}"></div>`;
}

async function artStandee() {
  const bars = [['05', 'Ghi nhớ', C.fg], ['04', 'Hỏi Socratic', C.orangeL], ['03', 'Suy luận', C.blueL], ['02', 'Nhận diện', C.blueL], ['01', 'Nét mực', null]]
    .map(([n, l, c], i) => `<div style="display:flex;align-items:center;gap:14mm;height:66mm;padding:0 22mm;margin:0 ${80 - i * 20}mm 12mm ${i * 20}mm;border-radius:6mm;${c ? `border:2.5mm solid ${c}` : `background:${C.blue}`}"><span style="font:500 22mm 'JetBrains Mono';color:${c || '#DCE6FB'}">${n}</span><span style="font:700 28mm 'Plus Jakarta Sans';color:#fff">${l}</span></div>`).join('');
  return grid(800, 2100, 80, C.gridD, 0.5) + corners(800, 2000, 30, 50, 3, '#6E6A62') +
    A(70, 90, 660, mono(18, C.blueL, '// DỰ ÁN KHỞI NGHIỆP HỌC SINH')) +
    A(70, 150, 680, `<div style="font:800 118mm/0.98 'Plus Jakarta Sans';letter-spacing:-.035em;color:${C.fg}">Bảng lớp<br>biết <i style="font:italic 400 124mm 'Newsreader';color:${C.blueL};letter-spacing:-.02em">hỏi lại.</i></div>`) +
    A(70, 470, 640, `<div style="font:500 26mm/1.45 'Plus Jakarta Sans';color:${C.mute2}">Học sinh viết tay lên bảng. AI nhận diện ngay trên máy, dựng mô phỏng và hỏi gợi mở, không đưa sẵn đáp án.</div>`) +
    A(70, 690, 660, bars) +
    A(70, 1110, 660, `<div style="display:grid;grid-template-columns:1fr 1fr;border-top:1.2mm solid ${C.line};border-left:1.2mm solid ${C.line}">${[['&lt;16 ms', 'độ trễ nét viết'], ['&lt;15 ms', 'nhận diện tại chỗ'], ['10', 'mô phỏng STEM'], ['37', 'bài Lab bằng tay']].map(([a, b]) => `<div style="border-right:1.2mm solid ${C.line};border-bottom:1.2mm solid ${C.line};padding:18mm 20mm"><div style="font:500 50mm/1 'JetBrains Mono';color:${C.fg}">${a}</div><div style="font:500 18mm/1.3 'Plus Jakarta Sans';color:${C.mute};margin-top:6mm">${b}</div></div>`).join('')}</div>`) +
    A(70, 1500, 660, `<div style="display:flex;gap:30mm;align-items:center">${await qr(cfg.qrDungThu, 230, 'qrDungThu')}<div style="font:700 32mm/1.25 'Plus Jakarta Sans';color:${C.fg}">Quét để thử<br>gia sư Socratic<div style="font:500 18mm 'JetBrains Mono';color:${C.mute};margin-top:10mm">không cần cài đặt</div></div></div>`) +
    A(70, 1800, 660, `<div style="border-top:1.2mm solid ${C.line};padding-top:22mm;display:flex;justify-content:space-between;align-items:center"><div style="font:500 18mm/1.35 'Plus Jakarta Sans';color:${C.mute}">Ươm mầm bởi<br><b style="color:${C.fg}">Sở GD&amp;ĐT Phú Thọ</b></div>${img(cfg.logoBTC, 'LOGO BTC', 110, 110, true)}</div>`) +
    `<div style="position:absolute;left:-20mm;top:2000mm;width:840mm;height:120mm;background:${C.ink}"></div>`;
}

function artCounter() {
  return grid(1400, 1000, 100, C.gridD, 0.6) +
    // chữ quá lớn (> ~1000 px) bị Chromium bỏ khi in PDF → vẽ dấu "?" bằng nét vector
    A(880, 60, 460, `<svg viewBox="0 0 60 100" style="width:460mm;height:767mm;display:block"><path d="M13 30 C13 9, 47 9, 47 30 C47 46, 30 46, 30 62 V68" fill="none" stroke="${C.orange}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="30" cy="85" r="6" fill="${C.orange}"/></svg>`) +
    A(90, 110, 820, mono(20, C.blueL, '// MỜI BẠN VÀO THỬ')) +
    A(90, 165, 880, `<div style="font:800 104mm/1 'Plus Jakarta Sans';letter-spacing:-.03em;color:${C.fg}">Bảng lớp</div><div style="font:italic 400 112mm/1.05 'Newsreader';color:${C.blueL}">biết hỏi lại.</div>`) +
    A(90, 440, 700, `<div style="font:500 30mm/1.45 'Plus Jakarta Sans';color:${C.mute2}">Viết một câu lên bảng phía sau. Xem AI nghĩ từng bước, ngay trên tháp mica này.</div>`) +
    A(90, 700, 1000, wordmark(40, C.fg)) +
    `<div style="position:absolute;left:-30mm;top:850mm;width:1460mm;height:180mm;background:${C.blue}"></div>`;
}

function artFloor() {
  return `<div style="position:absolute;left:-5mm;top:-5mm;width:810mm;height:810mm;border-radius:50%;background:${C.orange}"></div>
    <div style="position:absolute;left:55mm;top:55mm;width:690mm;height:690mm;border-radius:50%;background:${C.paper2};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24mm;text-align:center">
      <div style="font:700 36mm 'JetBrains Mono';color:${C.orangeD}">▲ MÀN HÌNH</div>
      <div style="font:800 118mm/0.95 'Plus Jakarta Sans';letter-spacing:-.02em;color:${C.ink2}">ĐỨNG<br>ĐÂY</div>
      <div style="font:500 38mm/1.3 'Plus Jakarta Sans';color:${C.text2}">giơ tay về phía camera<br>chụm ngón để chọn</div></div>`;
}
function dieCircle(d) { return `<svg viewBox="0 0 ${d} ${d}" style="position:absolute;inset:0;width:${d}mm;height:${d}mm"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="none" stroke="#EC008C" stroke-width="0.25"/></svg>`; }

function artStory(i) {
  const s = cfg.cauChuyen[i];
  const dark = i === 2;
  const fg = dark ? C.fg : C.ink2, sub = dark ? C.mute2 : C.text2, acc = i === 0 || i === 4 ? C.orange : (dark ? C.blueL : C.ink2);
  const extra = dark
    ? `<div style="display:flex;flex-direction:column;gap:8mm">${['Nét mực · &lt;16 ms', 'Nhận diện · &lt;15 ms', 'Suy luận · tất định', 'Hỏi Socratic · 4 mức', 'Ghi nhớ · BKT'].map((t, k) => `<div style="border:${k === 0 ? 'none' : `1.2mm solid ${k === 3 ? C.orangeL : C.blueL}`};${k === 0 ? `background:${C.blue};` : ''}border-radius:4mm;padding:9mm 12mm;font:600 15mm 'Plus Jakarta Sans';color:#fff">${t}</div>`).join('')}</div>`
    : img(s.anh, `ẢNH ${s.tieuDe}`, 340, 420, false);
  return (dark ? grid(420, 1400, 40, C.gridD, 0.4) : '') +
    A(40, 50, 340, mono(14, dark ? C.mute : C.text3, `${String(i + 1).padStart(2, '0')} / 05 · HÀNH TRÌNH`)) +
    A(40, 90, 340, `<div style="font:400 170mm/1 'Newsreader';color:${acc}">0${i + 1}</div>`) +
    A(40, 290, 340, `<div style="font:800 56mm/1.05 'Plus Jakarta Sans';letter-spacing:-.02em;color:${fg}">${T(s.tieuDe)}</div>`) +
    A(40, 380, 340, `<div style="font:500 17mm/1.45 'Plus Jakarta Sans';color:${sub}">${T(s.noiDung)}</div>`) +
    (s.soLieu ? A(40, 700, 340, `<div style="border-top:1.2mm solid ${fg};padding-top:12mm;font:600 22mm/1.3 'Plus Jakarta Sans';color:${fg}">${T(s.soLieu)}</div>`) : '') +
    A(40, 880, 340, extra) +
    A(40, 1340, 340, `<div style="font:600 12mm 'Plus Jakarta Sans';color:${dark ? C.mute : C.text3}">Socratic Vision Board</div>`);
}

async function artA5front() {
  return A(14, 14, 120, `<div style="display:flex;justify-content:space-between;font:500 2.6mm 'JetBrains Mono';letter-spacing:.06em;color:${C.text3}"><span>SOCRATIC VISION BOARD</span><span>GIAN ${T(cfg.soGian)}</span></div>`) +
    A(14, 26, 120, `<div style="font:400 15mm/1.02 'Newsreader';color:${C.ink2}">Bảng lớp không đưa đáp án. <i style="color:${C.orange}">Nó hỏi lại.</i></div>`) +
    A(14, 82, 120, `<div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm 6mm">${cfg.cauChuyen.map((s, i) => `<div><div style="font:600 2.4mm 'JetBrains Mono';color:${i === 0 || i === 4 ? C.orangeD : C.text3}">0${i + 1}</div><div style="font:800 3.6mm/1.2 'Plus Jakarta Sans';color:${C.ink2}">${T(s.tieuDe)}</div><div style="font:500 2.75mm/1.4 'Plus Jakarta Sans';color:${C.text2};margin-top:1mm">${T(s.noiDung)}</div></div>`).join('')}<div><div style="font:600 2.4mm 'JetBrains Mono';color:${C.text3}">06</div><div style="font:800 3.6mm/1.2 'Plus Jakarta Sans';color:${C.ink2}">Nhóm cần</div><div style="font:500 2.75mm/1.4 'Plus Jakarta Sans';color:${C.text2};margin-top:1mm">Mentor đồng hành, lớp thử nghiệm, tài trợ thiết bị.</div></div></div>`) +
    A(14, 176, 120, `<div style="border-top:0.3mm solid ${C.ink2};padding-top:5mm;display:flex;gap:5mm;align-items:center">${await qr(cfg.qrDungThu, 20, 'qrDungThu')}<div style="font:500 2.8mm/1.45 'Plus Jakarta Sans';color:${C.text2}"><b style="color:${C.ink2}">${T(cfg.truongNhom)}</b> · ${T(cfg.tenTruong)}<br>${T(cfg.lienHe)}<br>Ươm mầm bởi Sở GD&amp;ĐT Phú Thọ</div></div>`);
}
async function artA5back() {
  const nodes = [['Console giáo viên', 'lớp · tiết · bài tập'], ['AI Engine', 'nhận diện · suy luận · BKT'], ['Bảng lớp', 'viết · mô phỏng · QR'], ['App học sinh', 'gia sư sau giờ học'], ['Phụ huynh', 'báo cáo tiến bộ']];
  return grid(148, 210, 10, C.gridD, 0.1) +
    A(14, 14, 120, mono(2.6, C.blueL, '// KIẾN TRÚC · TAM GIÁC 3 ĐỈNH')) +
    A(14, 24, 120, `<div style="font:400 11mm/1.05 'Newsreader';color:${C.fg}">Một nét viết,<br><i style="color:${C.blueL}">năm lớp xử lý.</i></div>`) +
    A(14, 56, 120, ['Nét mực · &lt;16 ms', 'Nhận diện · &lt;15 ms', 'Suy luận · tất định', 'Hỏi Socratic · 4 mức', 'Ghi nhớ · BKT'].map((t, k) => `<div style="margin-bottom:2.2mm;border-radius:1.2mm;padding:2.4mm 3mm;font:600 3.2mm 'Plus Jakarta Sans';color:#fff;${k === 0 ? `background:${C.blue}` : `border:0.35mm solid ${k === 3 ? C.orangeL : C.blueL}`}">0${k + 1} · ${t}</div>`).join('')) +
    A(14, 122, 120, nodes.map(([a, b], k) => `<div style="display:flex;align-items:center;gap:3mm;margin-bottom:2.4mm"><div style="width:2.4mm;height:2.4mm;border-radius:50%;background:${k === 1 ? C.blue : C.mute}"></div><div style="font:700 3.2mm 'Plus Jakarta Sans';color:${C.fg}">${a}</div><div style="font:400 2.6mm 'JetBrains Mono';color:${C.mute}">${b}</div></div>`).join('')) +
    A(14, 168, 120, `<div style="border-top:0.3mm solid ${C.line};padding-top:5mm;display:flex;gap:5mm;align-items:center">${await qr(cfg.qrDungThu, 22, 'qrDungThu')}<div style="font:600 3.6mm/1.35 'Plus Jakarta Sans';color:${C.fg}">Quét để thử gia sư Socratic<div style="font:400 2.6mm 'JetBrains Mono';color:${C.mute};margin-top:1mm">không cần cài đặt</div></div></div>`);
}
function artSticker() {
  return `<div style="position:absolute;left:-2mm;top:-2mm;width:64mm;height:64mm;border-radius:50%;background:${C.orange}"></div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center">
  <div style="font:400 26mm/0.8 'Newsreader'">?</div><div style="font:800 4.6mm/1.15 'Plus Jakarta Sans';margin-top:2mm">Tôi đã hỏi<br>bảng 1 câu</div></div>`;
}
function artBadge(m) {
  return `<div style="position:absolute;left:-3mm;top:-3mm;width:96mm;height:12mm;background:${C.blue}"></div>
  ${A(10, 22, 70, mono(2.6, C.text3, 'ĐỒNG SÁNG LẬP · SOCRATIC VISION BOARD'))}
  ${A(10, 32, 70, `<div style="font:400 10mm/1.05 'Newsreader';color:${C.ink2}">${T(m.ten)}</div>`)}
  ${A(10, 62, 70, `<div style="font:700 4.4mm 'Plus Jakarta Sans';color:${C.ink2}">${esc(m.vai)}</div><div style="font:500 3.4mm 'Plus Jakarta Sans';color:${C.text3};margin-top:1.5mm">${T(m.lop)} · ${T(cfg.tenTruong)}</div>`)}
  ${A(10, 98, 70, `<div style="background:${C.ink};color:${C.fg};border-radius:2mm;padding:4mm 5mm;font:italic 400 5.2mm/1.25 'Newsreader'">${m.vai === 'Người kỹ thuật' ? 'Hỏi mình cách AI nghĩ.' : m.vai === 'Người pitch' ? 'Hỏi mình về dự án.' : m.vai === 'Người demo' ? 'Thử viết một câu nhé.' : 'Bạn đang học, dạy, hay tìm dự án?'}</div>`)}
  <div style="position:absolute;left:38.5mm;top:6mm;width:13mm;height:3mm;border-radius:1.5mm;border:0.25mm solid #EC008C"></div>`;
}

// ---------- tấm mica (cắt laser) ----------
const PLATES = [
  { h: 120, n: '01 · NÉT MỰC', r: '&lt; 16 ms', art: `<text x="30" y="70" font-family="Newsreader" font-style="italic" font-size="34" fill="none" stroke="#000" stroke-width="0.4">x² − 4x + 3</text><path d="M28 80 C 80 86, 150 76, 205 82" fill="none" stroke="#000" stroke-width="0.4"/>` },
  { h: 145, n: '02 · NHẬN DIỆN', r: '&lt; 15 ms', art: `<g fill="none" stroke="#000" stroke-width="0.4" stroke-dasharray="3 2"><rect x="27" y="89" width="44" height="34"/><rect x="76" y="89" width="22" height="34"/><rect x="103" y="89" width="44" height="34"/><rect x="152" y="89" width="22" height="34"/><rect x="179" y="89" width="24" height="34"/></g><rect x="196" y="59" width="84" height="20" rx="10" fill="#000"/><text x="238" y="73" font-family="Plus Jakarta Sans" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">x ⇄ ×</text><path d="M203 79 L188 89" stroke="#000" stroke-width="0.4"/>` },
  { h: 170, n: '03 · SUY LUẬN', r: '10 mô phỏng', art: `<path d="M140 115 H288 M155 158 V36" stroke="#000" stroke-width="0.4" fill="none"/><path d="M155 49 Q215 225 275 49" stroke="#000" stroke-width="0.8" fill="none"/><circle cx="215" cy="137" r="4" fill="#000"/><text x="222" y="152" font-family="JetBrains Mono" font-size="9" fill="#000">x = 2</text>` },
  { h: 195, n: '04 · HỎI SOCRATIC', r: 'không lộ đáp án', art: `<text x="20" y="48" font-family="Newsreader" font-style="italic" font-size="17" fill="#000">Đỉnh parabol nằm ở đâu?</text><text x="20" y="70" font-family="Newsreader" font-style="italic" font-size="14" fill="#000">Em thử dùng −b / 2a xem?</text><text x="232" y="104" font-family="Newsreader" font-size="86" fill="#000">?</text>` },
  { h: 220, n: '05 · GHI NHỚ', r: 'BKT', art: `<path d="M20 88 C 90 88, 130 46, 280 38" stroke="#000" stroke-width="0.8" fill="none"/><g fill="#000"><circle cx="20" cy="88" r="3"/><circle cx="85" cy="82" r="3"/><circle cx="150" cy="56" r="3"/><circle cx="215" cy="43" r="3"/><circle cx="280" cy="38" r="3"/></g><text x="20" y="108" font-family="JetBrains Mono" font-size="9" fill="#000">P(L) · mức hiểu sau mỗi câu trả lời</text>` },
];
function artPlate(p) {
  const H = p.h;
  return `<svg viewBox="0 0 300 ${H + 10}" style="position:absolute;inset:0;width:300mm;height:${H + 10}mm">
  <path d="M8 0 H292 A8 8 0 0 1 300 8 V${H} H290 V${H + 10} H10 V${H} H0 V8 A8 8 0 0 1 8 0 Z" fill="none" stroke="#FF0000" stroke-width="0.01"/>
  <text x="14" y="18" font-family="Plus Jakarta Sans" font-size="11" font-weight="800" fill="#000">${p.n}</text>
  <text x="286" y="18" font-family="JetBrains Mono" font-size="10" fill="#000" text-anchor="end">${p.r}</text>
  ${p.art}</svg>`;
}

// ---------- danh sách hạng mục ----------
const T_W = (n) => `${VW}×${VH}`;
async function items() {
  const L = [];
  CUR = 'V-HAU'; const back = artBack();
  CUR = 'V-TRAI'; const left = await artLeft();
  CUR = 'V-PHAI'; const right = await artRight();
  const tiles = (code, name, art, where) => {
    for (let i = 0; i < VN; i++) L.push({
      group: '01-kho-lon', code: `${code}-${i + 1}`, name: `${name} — tấm ${i + 1}/${VN}`, w: VW, h: VH, bleed: 10, bg: code === 'V-HAU' ? C.ink : C.paper2,
      html: `<div style="position:absolute;left:${-i * VW}mm;top:0;width:${WALL_W}mm;height:${VH}mm">${art}</div>`,
      mat: 'Decal PP keo xám (chống thấu), in UV, cán màng mờ', fin: 'Dán phủ kín tấm vách, xén mép tại chỗ', qty: 1, where: `${where}, tấm ${i + 1} ${where === 'Vách hậu' ? 'tính từ trái' : 'tính từ lối đi'}`,
    });
  };
  CUR = 'V-HAU'; tiles('V-HAU', 'Phủ vách hậu', back, 'Vách hậu');
  CUR = 'V-TRAI'; tiles('V-TRAI', 'Phủ vách trái', left, 'Vách trái');
  CUR = 'V-PHAI'; tiles('V-PHAI', 'Phủ vách phải', right, 'Vách phải');
  CUR = 'F01'; L.push({ group: '01-kho-lon', code: 'F01', name: 'Bảng tên cửa gian (fascia)', w: 3000, h: 300, bleed: 5, bg: C.paper, html: artFascia(), mat: 'Decal PP in UV (hoặc theo mẫu BTC)', fin: 'Dán lên băng fascia BTC', qty: 1, where: 'Trên cửa gian' });
  CUR = 'S01'; L.push({ group: '01-kho-lon', code: 'S01', name: 'Standee cuốn', w: 800, h: 2100, bleed: 5, bg: C.ink, html: await artStandee(), mat: 'Bạt PP/PET chống quăn mép, in UV', fin: 'Lắp chân cuốn nhôm 80×200; 100 mm dưới cùng cuộn vào chân', qty: 1, where: 'Góc phải phía trước' });
  CUR = 'Q01'; L.push({ group: '01-kho-lon', code: 'Q01', name: 'Ốp mặt trước quầy', w: 1400, h: 1000, bleed: 10, bg: C.ink, html: artCounter(), mat: 'Decal PP in UV, cán mờ', fin: 'Dán phủ mặt quầy, gấp mép 10 mm', qty: 1, where: 'Mặt quầy quay ra lối đi' });
  CUR = 'D01'; L.push({ group: '01-kho-lon', code: 'D01', name: 'Decal sàn "Đứng đây" Ø800', w: 800, h: 800, bleed: 5, bg: '#fff', html: artFloor(), die: dieCircle(800), mat: 'Decal sàn, cán màng chống trượt R10', fin: 'Bế tròn Ø800 theo đường cắt riêng', qty: 1, where: 'Sàn trước bảng, tâm cách vách hậu 1,1 m' });
  for (let i = 0; i < 5; i++) { CUR = `T0${i + 1}`; L.push({ group: '01-kho-lon', code: `T0${i + 1}`, name: `Tấm câu chuyện ${i + 1}: ${cfg.cauChuyen[i].tieuDe}`, w: 420, h: 1400, bleed: 5, bg: i === 2 ? C.ink : C.paper, html: artStory(i), mat: 'Decal PP cán mờ bồi Format (foam) 5 mm', fin: 'Cắt thẳng, dán băng keo xốp 2 mặt', qty: 1, where: `Vách trái, vị trí ${i + 1}` }); }
  CUR = 'A5'; L.push({ group: '02-an-pham-nho', code: 'A5', name: 'Tờ giới thiệu một trang A5 (2 mặt)', w: 148, h: 210, bleed: 3, marks: true, bg: C.paper, html: await artA5front(), pages2: { bg: C.ink, html: await artA5back() }, mat: 'Couche mờ 250 gsm, in 4/4', fin: 'Xén thành phẩm', qty: 500, where: 'Quầy' });
  CUR = 'ST'; L.push({ group: '02-an-pham-nho', code: 'ST', name: 'Sticker tròn Ø60', w: 60, h: 60, bleed: 2, marks: true, bg: '#fff', html: artSticker(), die: dieCircle(60), mat: 'Decal giấy hoặc nhựa sữa, cán bóng', fin: 'Bế tròn Ø60 (đường cắt màu hồng)', qty: 500, where: 'Quà tặng học sinh' });
  cfg.thanhVien.forEach((m, i) => { CUR = `TD${i + 1}`; L.push({ group: '02-an-pham-nho', code: `TD${i + 1}`, name: `Thẻ đeo — ${m.vai}`, w: 90, h: 130, bleed: 3, marks: true, bg: C.paper, html: artBadge(m), mat: 'PVC trắng 0,76 mm (thẻ nhựa) hoặc giấy C300 ép plastic', fin: 'Đục lỗ ô van 13×3 mm (đường hồng), dây đeo xanh', qty: 1, where: 'Thành viên nhóm' }); });
  PLATES.forEach((p, i) => { CUR = `M0${i + 1}`; L.push({ group: '03-mica-laser', code: `M0${i + 1}`, name: `Tấm mica ${p.n.replace(' · ', ' ')}`, w: 300, h: p.h + 10, bleed: 0, bg: '#fff', html: artPlate(p), mat: 'Mica trong loại đúc (cast) 5 mm', fin: 'Đỏ nét mảnh = cắt; đen = khắc mặt sau (lật gương)', qty: 1, where: 'Tháp 5 lớp trên quầy' }); });
  return L;
}

// ---------- xuất ----------
async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  const list = await items();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const files = [];
  for (const it of list) {
    const dir = path.join(OUT, it.group); fs.mkdirSync(dir, { recursive: true });
    const slug = it.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);
    const base = `${it.code}_${slug}_${it.w}x${it.h}mm${it.bleed ? `_tran${it.bleed}` : ''}`;
    const render = async (html, file) => {
      const hp = path.join(TMP, 'p.html'); fs.writeFileSync(hp, html);
      await page.goto('file://' + hp); await page.evaluate(() => document.fonts.ready);
      const s = it.marks ? 12 : 0;
      await page.pdf({ path: file, width: `${it.w + 2 * it.bleed + 2 * s}mm`, height: `${it.h + 2 * it.bleed + 2 * s}mm`, printBackground: true, pageRanges: '1' });
    };
    const out = path.join(dir, base + '.pdf');
    await render(pageHTML(it, it.html), out);
    if (it.pages2) {
      const o2 = path.join(TMP, 'b.pdf');
      await render(pageHTML({ ...it, bg: it.pages2.bg }, it.pages2.html), o2);
      const o1 = path.join(TMP, 'a.pdf'); fs.copyFileSync(out, o1);
      execFileSync('pdfunite', [o1, o2, out]);
    }
    if (it.die) await render(pageHTML({ ...it, bg: '#fff' }, it.die), path.join(dir, base + '_DUONG-CAT.pdf'));
    const pv = path.join(OUT, 'xem-truoc', it.code);
    fs.mkdirSync(path.dirname(pv), { recursive: true });
    execFileSync('pdftoppm', ['-png', '-singlefile', '-scale-to', '700', out, pv]);
    files.push({ ...it, file: path.relative(OUT, out), preview: pv + '.png', miss: [...(missing.get(it.code.replace(/-\d+$/, '')) || missing.get(it.code) || [])] });
    console.log('✓', path.relative(ROOT, out));
  }
  // bảng kê
  const sheet = jobSheet(files);
  const hp = path.join(TMP, 'sheet.html'); fs.writeFileSync(hp, sheet);
  await page.goto('file://' + hp); await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(OUT, '00_BANG-KE-IN-AN.pdf'), format: 'A4', landscape: true, printBackground: true, margin: { top: '10mm', bottom: '12mm', left: '10mm', right: '10mm' },
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: `<div style="font:8px sans-serif;width:100%;text-align:right;padding-right:10mm;color:#555">Socratic Vision Board · bảng kê in ấn · ${TODAY} · trang <span class="pageNumber"></span>/<span class="totalPages"></span></div>` });
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  const allMiss = new Set(files.flatMap((f) => f.miss));
  console.log(`\n${files.length} hạng mục.`, allMiss.size ? `CÒN THIẾU ${allMiss.size} ô: ${[...allMiss].join(', ')}` : 'Đủ thông tin, sẵn sàng gửi in.');
}

function jobSheet(files) {
  const rows = files.map((f) => `<tr>
    <td><img src="file://${f.preview}" style="max-width:30mm;max-height:17mm;border:0.2mm solid #ccc"></td>
    <td class="m"><b>${esc(f.code)}</b></td><td>${esc(f.name)}</td>
    <td class="m">${f.w} × ${f.h}</td><td class="m">${f.bleed || '—'}</td>
    <td>${esc(f.mat)}</td><td>${esc(f.fin)}</td><td class="m">${f.qty}</td><td>${esc(f.where)}</td>
    <td class="${f.miss.length ? 'warn' : 'ok'}">${f.miss.length ? 'CHƯA ĐỦ: ' + esc(f.miss.join(', ')) : 'Sẵn sàng'}</td></tr>`).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><link rel="stylesheet" href="${path.join(ROOT, 'fonts/fonts.css')}">
<style>body{font:9pt/1.35 'Plus Jakarta Sans';color:#1D1B16;margin:0}h1{font:400 22pt 'Newsreader';margin:0 0 2mm}
.m{font-family:'JetBrains Mono';white-space:nowrap}table{border-collapse:collapse;width:100%}th{font:600 7pt 'JetBrains Mono';letter-spacing:.05em;text-align:left;border-bottom:0.5mm solid #1D1B16;padding:2mm}
td{border-bottom:0.2mm solid #DCD9D0;padding:1.6mm 2mm;vertical-align:top;font-size:8pt}tr{page-break-inside:avoid}.warn{color:#B83A12;font-weight:600}.ok{color:#1F7A4D;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin:4mm 0 6mm}.box{border:0.3mm solid #1D1B16;padding:3mm;border-radius:1.5mm}.sw{height:9mm;border-radius:1mm;margin-bottom:2mm}
h2{font:700 10pt 'Plus Jakarta Sans';margin:5mm 0 2mm;letter-spacing:.04em}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:0.5mm solid #1D1B16;padding-bottom:3mm">
<div><div class="m" style="font-size:7.5pt;letter-spacing:.08em;color:#57534E">BẢNG KÊ HẠNG MỤC IN ẤN · GIAN ${esc(cfg.soGian)}</div><h1>Socratic Vision Board — gian 3 × 3 m</h1>
<div>Dự án khởi nghiệp học sinh · ${esc(cfg.tenTruong)} · ươm mầm bởi Sở GD&amp;ĐT Phú Thọ · triển lãm ${esc(cfg.ngayTrienLam)}</div></div>
<div style="text-align:right">Liên hệ duyệt file: <b>${esc(cfg.truongNhom)}</b><br>${esc(cfg.lienHe)}<br><span class="m">Ngày xuất file: ${TODAY}</span></div></div>
<h2>QUY CÁCH CHUNG</h2>
<div class="grid">
<div class="box"><b>File</b><br>PDF vector tỷ lệ 1:1, đơn vị mm. Font đã nhúng. Hàng khổ lớn: không dấu cắt, đã có tràn lề. Ấn phẩm nhỏ: có dấu cắt và dòng thông tin.</div>
<div class="box"><b>Màu</b><br>File hệ RGB. Nhờ nhà in chuyển CMYK theo mã bên dưới và <b>in thử màu</b> (proof) trên đúng vật liệu trước khi in hàng loạt.</div>
<div class="box"><b>Đường cắt</b><br>Bế tròn, đục lỗ: nét màu hồng (#EC008C) trong tệp *_DUONG-CAT.pdf hoặc trên file, không in. Mica: nét đỏ 0,01 mm = cắt.</div>
<div class="box"><b>Vách</b><br>File làm theo tấm nhìn thấy ${VW} × ${VH} mm, ${VN} tấm mỗi vách. <b>Đo thực tế trước khi in</b>; khác thì báo nhóm xuất lại.</div>
</div>
<div class="grid">
<div class="box"><div class="sw" style="background:#141310"></div><b>Đen nền</b> #141310<br><span class="m">C50 M40 Y40 K100</span></div>
<div class="box"><div class="sw" style="background:#2459C9"></div><b>Xanh công nghệ</b> #2459C9<br><span class="m">C88 M65 Y0 K0 · ≈ Pantone 2728 C</span></div>
<div class="box"><div class="sw" style="background:#D9481C"></div><b>Cam câu hỏi</b> #D9481C<br><span class="m">C5 M85 Y100 K0 · ≈ Pantone 1665 C</span></div>
<div class="box"><div class="sw" style="background:#F2EEE4;border:0.2mm solid #ccc"></div><b>Nền giấy</b> #F2EEE4 / #FBF9F4<br><span class="m">C2 M3 Y8 K0 — in nền, không để trắng</span></div>
</div>
<h2>DANH SÁCH HẠNG MỤC (${files.length} file)</h2>
<table><thead><tr><th>XEM TRƯỚC</th><th>MÃ</th><th>HẠNG MỤC</th><th>THÀNH PHẨM (mm)</th><th>TRÀN LỀ</th><th>VẬT LIỆU</th><th>GIA CÔNG</th><th>SL</th><th>VỊ TRÍ</th><th>TRẠNG THÁI FILE</th></tr></thead><tbody>${rows}</tbody></table>
<h2>LƯU Ý THI CÔNG</h2>
<div class="grid" style="grid-template-columns:repeat(3,1fr)">
<div class="box">Vách tiêu chuẩn của BTC: <b>không khoan, không bắn đinh</b>. Decal dán trực tiếp; tấm Format dán băng keo xốp 2 mặt. Màn hình đặt trên chân đứng.</div>
<div class="box">Tấm câu chuyện T01–T05: đáy tấm cách sàn 570 mm, khoảng cách theo bản vẽ mặt đứng (2 tấm mỗi tấm vách, cách nhau 40 mm, cách mép tấm vách 35 mm).</div>
<div class="box">Logo Sở GD&amp;ĐT Phú Thọ chỉ dùng file chính thức do BTC cung cấp. Ô còn ghi "CHƯA ĐỦ" là file chưa được in.</div>
</div></body></html>`;
}

main().catch((e) => { console.error(e); process.exit(1); });
