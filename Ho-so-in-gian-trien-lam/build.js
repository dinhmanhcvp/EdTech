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

// ---------- kích thước theo lều 3 × 3 m (sửa trong config.leu) ----------
const LEU = cfg.leu;
const PW = LEU.rongTrongCot - 20;      // bề rộng khung cổng và backdrop
const PH = LEU.caoMepMai - 100;        // cao khung cổng
const BH = LEU.caoMepMai - 200;        // cao backdrop và cánh
const HEAD = 700, BAR = 300, BAND = 350, R = 250; // đầu cổng, bề rộng chân, băng tên, bán kính bo góc
const LEG = PH - HEAD;
const WW = 900;                         // bề rộng cánh
const blueBand = (w, top) => `<div style="position:absolute;left:-80mm;top:${top}mm;width:${w + 160}mm;height:300mm;background:${C.blue}"></div>`;
const en = (size, color, txt, extra = '') => `<div style="font:italic 400 ${size}mm/1.25 'Newsreader';color:${color};${extra}">${txt}</div>`;
const pipe = ['Nét mực', 'Nhận diện', 'Suy luận', 'Hỏi Socratic', 'Ghi nhớ'];
const pipeEn = ['Ink', 'Recognition', 'Reasoning', 'Socratic questions', 'Knowledge tracing'];
const pipeV = ['&lt;16 ms', '&lt;15 ms', 'tất định', '4 mức', 'BKT'];
function pipeBars(w, fs, gap) {
  return pipe.map((p, k) => `<div style="display:flex;align-items:center;gap:${fs * 0.6}mm;border-radius:${fs * 0.25}mm;padding:${fs * 0.45}mm ${fs * 0.7}mm;margin-bottom:${gap}mm;${k === 0 ? `background:${C.blue}` : `border:${fs * 0.08}mm solid ${k === 3 ? C.orangeL : C.blueL}`}">
    <span style="font:500 ${fs * 0.8}mm 'JetBrains Mono';color:${k === 0 ? '#DCE6FB' : (k === 3 ? C.orangeL : C.blueL)}">0${k + 1}</span>
    <span style="font:700 ${fs}mm 'Plus Jakarta Sans';color:#fff;flex:1">${p} <span style="font:italic 400 ${fs * 0.85}mm 'Newsreader';color:${k === 0 ? '#DCE6FB' : C.mute2}">· ${pipeEn[k]}</span></span>
    <span style="font:500 ${fs * 0.75}mm 'JetBrains Mono';color:${k === 0 ? '#fff' : C.mute2}">${pipeV[k]}</span></div>`).join('');
}
const bigQ = (w, h, color) => `<svg viewBox="0 0 60 100" style="width:${w}mm;height:${h}mm;display:block"><path d="M13 30 C13 9, 47 9, 47 30 C47 46, 30 46, 30 62 V68" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="30" cy="85" r="6" fill="${color}"/></svg>`;

function dieCircle(d) { return `<svg viewBox="0 0 ${d} ${d}" style="position:absolute;inset:0;width:${d}mm;height:${d}mm"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="none" stroke="#EC008C" stroke-width="0.25"/></svg>`; }

// BD — backdrop bạt căng khung
function artBackdrop() {
  const scrL = 528, scrR = 1972, por = [2150, 2690];
  const met = [['&lt;16', 'ms', 'độ trễ nét viết', 'ink latency'], ['&lt;15', 'ms', 'nhận diện tại chỗ', 'on-device recognition'], ['10', '', 'mô phỏng STEM', 'STEM simulations'], ['37', '', 'bài Lab bằng tay', 'hand-tracked labs']]
    .map(([n, u, v, e]) => `<div style="border-top:1.5mm solid ${C.line};padding-top:12mm;margin-bottom:22mm"><div style="font:500 66mm/1 'JetBrains Mono';color:${C.fg}">${n}<span style="font-size:30mm;color:${C.mute}"> ${u}</span></div><div style="font:600 20mm/1.3 'Plus Jakarta Sans';color:${C.mute2};margin-top:6mm">${v}</div>${en(17, C.mute, e)}</div>`).join('');
  const ticks = pipe.map((p, i) => A(scrR + 20, 520 + i * 180, 150, `<div style="font:600 30mm 'JetBrains Mono';color:${i === 3 ? C.orangeL : C.blueL}">0${i + 1}</div><div style="font:500 14mm/1.2 'Plus Jakarta Sans';color:${C.mute2}">${p}</div>`)).join('');
  const team = cfg.thanhVien.map((m) => `<div style="font:600 20mm/1.5 'Plus Jakarta Sans';color:${C.fg}">${T(m.ten)} <span style="font:400 15mm 'JetBrains Mono';color:${C.mute}">· ${esc(m.vaiEn)}</span></div>`).join('');
  return grid(PW, BH, 100, C.gridD, 0.6) + corners(PW, BH - 150, 40, 70, 4, '#6E6A62') +
    A(80, 60, 2200, mono(22, C.blueL, `// AI · STEM · EDTECH — ${esc(cfg.suKien.toUpperCase())}`)) +
    A(80, 110, 2250, `<div style="font:800 118mm/1 'Plus Jakarta Sans';letter-spacing:-.03em;color:${C.fg};white-space:nowrap">Bảng lớp biết <span style="font:italic 400 128mm 'Newsreader';color:${C.blueL};letter-spacing:-.01em">hỏi lại.</span></div>`) +
    A(84, 262, 2250, en(58, C.mute2, 'The classroom board that asks back.', 'white-space:nowrap')) +
    A(80, 540, 400, met) +
    A(scrL + 20, 1395, scrR - scrL - 40, `<div style="border:2mm solid #57534E;border-radius:10mm;padding:18mm 26mm;display:flex;justify-content:space-between;align-items:center"><div><div style="font:700 34mm 'Plus Jakarta Sans';color:${C.fg}">Thử: viết một phương trình</div>${en(24, C.mute2, 'Try it: write any equation')}</div><span style="font:500 24mm 'JetBrains Mono';color:${C.orangeL}">bút · pen ↓</span></div>`) +
    ticks +
    A(por[0], 70, PW - por[0] - 60, `<div style="display:flex;gap:20mm;align-items:center">${img(cfg.logoDonVi, 'LOGO ĐƠN VỊ', 120, 120, true)}${img(cfg.logoBTC, 'LOGO SỞ', 120, 120, true)}</div>` + mono(15, C.mute, 'ĐƠN VỊ TRƯNG BÀY · EXHIBITOR', 'margin-top:16mm') + `<div style="font:700 30mm/1.2 'Plus Jakarta Sans';color:${C.fg};margin-top:6mm">${esc(cfg.donVi)}</div>${en(19, C.mute2, esc(cfg.hocSinhCuaEn))}`) +
    A(por[0], 1520, PW - por[0] - 60, mono(16, C.mute, 'NHÓM DỰ ÁN · TEAM') + `<div style="margin-top:8mm">${team}</div>`) +
    blueBand(PW, BH - 150);
}

// Khung cổng: đầu cổng (một mảnh hình chữ U ngược, ghép đôi ở giữa) + 2 chân
const HEAD_PATH = `M0 0 H${PW} V${HEAD} H${PW - BAR} A${R} ${R} 0 0 0 ${PW - BAR - R} ${BAND} H${BAR + R} A${R} ${R} 0 0 0 ${BAR} ${HEAD} H0 Z`;
function artHeader() {
  const inner = `M${PW - BAR + 25} ${HEAD} A${R + 25} ${R + 25} 0 0 0 ${PW - BAR - R} ${BAND - 25} H${BAR + R} A${R + 25} ${R + 25} 0 0 0 ${BAR - 25} ${HEAD}`;
  return `<svg viewBox="-10 -10 ${PW + 20} ${HEAD + 20}" style="position:absolute;left:-10mm;top:-10mm;width:${PW + 20}mm;height:${HEAD + 20}mm"><path d="${HEAD_PATH}" fill="${C.ink}" stroke="${C.ink}" stroke-width="20" stroke-linejoin="round"/><path d="${inner}" fill="none" stroke="${C.blue}" stroke-width="10"/></svg>` +
    A(70, 34, 1200, mono(18, C.mute, `${esc(cfg.suKien.toUpperCase())}`)) +
    A(PW - 870, 34, 800, mono(18, C.mute, `GIAN · BOOTH ${T(cfg.soGian)}`, 'text-align:right')) +
    A(0, 70, PW, `<div style="display:flex;justify-content:center">${wordmark(132, C.fg)}</div>`) +
    A(0, 262, PW, `<div style="text-align:center;font:500 22mm 'JetBrains Mono';letter-spacing:.12em;color:${C.blueL}">BẢNG TƯƠNG TÁC THÔNG MINH · SMART INTERACTIVE BOARD FOR STEM</div>`);
}
function dieHeader() { return `<svg viewBox="0 0 ${PW} ${HEAD}" style="position:absolute;inset:0;width:${PW}mm;height:${HEAD}mm"><path d="${HEAD_PATH}" fill="none" stroke="#EC008C" stroke-width="0.5"/><path d="M${PW / 2} 0 V${BAND}" stroke="#EC008C" stroke-width="0.5" stroke-dasharray="6 4"/></svg><div style="position:absolute;left:${PW / 2 + 8}mm;top:${BAND / 2}mm;font:600 14mm 'JetBrains Mono';color:#EC008C">ĐƯỜNG GHÉP 2 TẤM</div>`; }

function artLeg(side) {
  const innerX = side === 'L' ? BAR - 25 : 25;
  return `<div style="position:absolute;left:${innerX - 5}mm;top:-20mm;width:10mm;height:${LEG + 40}mm;background:${C.blue}"></div>` +
    `<div style="position:absolute;left:${BAR / 2}mm;top:${LEG / 2 - 120}mm;width:0;height:0"><div style="position:absolute;left:0;top:0;transform:translate(-50%,-50%) rotate(${side === 'L' ? -90 : 90}deg);white-space:nowrap;font:800 92mm 'Plus Jakarta Sans';letter-spacing:.02em;color:${C.fg}">SOCRATIC VISION</div></div>` +
    A((BAR - 170) / 2, LEG - 260, 170, ringLogo(170, C.fg, C.orange)) +
    A(40, 60, BAR - 80, mono(20, C.mute, side === 'L' ? 'AI · STEM' : 'EDTECH', 'text-align:center'));
}

// Cánh trong: câu chuyện song ngữ
function storyBlock(i, w, big) {
  const s = cfg.cauChuyen[i];
  const acc = i === 0 || i === 4 ? C.orange : (i === 3 ? C.orangeL : C.blueL);
  const k = big ? 1 : 0.78;
  return `<div style="border-top:1.5mm solid ${C.line};padding-top:${18 * k}mm">
    <div style="display:flex;align-items:flex-end;gap:${20 * k}mm"><div style="font:400 ${190 * k}mm/0.8 'Newsreader';color:${acc}">0${i + 1}</div>
    <div><div style="font:800 ${74 * k}mm/1 'Plus Jakarta Sans';letter-spacing:-.02em;color:${C.fg}">${T(s.tieuDe)}</div>${en(44 * k, C.mute2, T(s.tieuDeEn))}</div></div>
    <div style="font:500 ${25 * k}mm/1.42 'Plus Jakarta Sans';color:${C.fg};margin-top:${22 * k}mm">${T(s.noiDung)}</div>
    ${en(21 * k, C.mute, T(s.noiDungEn), `margin-top:${10 * k}mm;line-height:1.4`)}
    ${s.soLieu ? `<div style="margin-top:${18 * k}mm;display:inline-block;border:1.2mm solid ${acc};border-radius:4mm;padding:${8 * k}mm ${12 * k}mm;font:600 ${22 * k}mm 'Plus Jakarta Sans';color:${C.fg}">${T(s.soLieu)}</div>` : ''}
    ${i === 2 ? `<div style="margin-top:${20 * k}mm">${pipeBars(w, 20, 6)}</div>` : ''}</div>`;
}
function artWingIn(side) {
  const w = WW - 140;
  const head = A(70, 60, w, mono(18, C.blueL, side === 'L' ? '// HÀNH TRÌNH · OUR JOURNEY' : '// CÔNG NGHỆ & LỘ TRÌNH · TECH & ROADMAP'));
  const body = side === 'L'
    ? A(70, 140, w, storyBlock(0, w, true)) + A(70, 1120, w, storyBlock(1, w, true))
    : A(70, 130, w, storyBlock(2, w, false)) + A(70, 1080, w, storyBlock(3, w, false)) + A(70, 1580, w, storyBlock(4, w, false));
  return grid(WW, BH, 100, C.gridD, 0.6) + head + body + blueBand(WW, BH - 150);
}
function artWingOut() {
  return grid(WW, BH, 100, C.gridD, 0.6) + A((WW - 420) / 2, 140, 420, ringLogo(420, C.fg, C.orange)) +
    `<div style="position:absolute;left:${WW / 2}mm;top:${(BH - 150) / 2 + 230}mm;width:0;height:0"><div style="position:absolute;transform:translate(-50%,-50%) rotate(-90deg);white-space:nowrap;font:800 150mm 'Plus Jakarta Sans';color:${C.fg}">SOCRATIC</div></div>` +
    A(60, BH - 260, WW - 120, mono(20, C.mute, 'AI · STEM · EDTECH', 'text-align:center')) + blueBand(WW, BH - 150);
}

// Totem tam giác: 3 mặt 600 × 2200
const TW = 600, TH = 2200;
function artTotemA() {
  return grid(TW, TH, 60, C.gridD, 0.5) +
    A(50, 560, 500, `<div style="font:800 96mm/0.98 'Plus Jakarta Sans';letter-spacing:-.035em;color:${C.fg}">Bảng lớp<br>biết <i style="font:italic 400 104mm 'Newsreader';color:${C.blueL}">hỏi lại.</i></div>`) +
    A(52, 805, 500, en(40, C.mute2, 'The board that asks back.')) +
    A(50, 930, 500, pipeBars(500, 21, 10)) +
    A(50, 1500, 500, `<div style="font:500 22mm/1.45 'Plus Jakarta Sans';color:${C.mute2}">Học sinh viết tay, AI hỏi lại từng bước, không đưa sẵn đáp án.</div>${en(19, C.mute, 'Students write by hand. The AI asks back, step by step, never handing over the answer.', 'margin-top:8mm')}`) +
    A(50, 1820, 500, `<div style="font:700 30mm 'Plus Jakarta Sans';color:${C.fg}">Mời vào thử →</div>${en(24, C.blueL, 'Step inside and try it')}`) +
    blueBand(TW, TH - 150);
}
function artTotemB() {
  return grid(TW, TH, 60, C.gridD, 0.5) +
    A(50, 110, 500, mono(20, C.mute, 'GIẢI THƯỞNG · AWARD')) +
    A(50, 170, 500, `<div style="font:800 120mm/0.95 'Plus Jakarta Sans';letter-spacing:-.03em;color:${C.orange}">GIẢI<br>NHẤT</div><div style="font:700 58mm/1.1 'Plus Jakarta Sans';color:${C.fg};margin-top:14mm">cấp tỉnh</div>${en(44, C.mute2, esc(cfg.giaiThuongEn), 'margin-top:8mm')}`) +
    A(50, 820, 500, `<div style="border-top:1.5mm solid ${C.line};padding-top:22mm;font:600 26mm/1.4 'Plus Jakarta Sans';color:${C.fg}">${esc(cfg.cuocThi)}</div>${en(21, C.mute, esc(cfg.cuocThiEn), 'margin-top:10mm')}`) +
    A(50, 1260, 500, `<div style="border-top:1.5mm solid ${C.line};padding-top:22mm">${mono(16, C.mute, 'DỰ ÁN · PROJECT')}<div style="font:500 22mm/1.42 'Plus Jakarta Sans';color:${C.mute2};margin-top:8mm">${esc(cfg.tenDuAnDayDu)}</div></div>`) +
    A(50, 1700, 500, `<div style="font:700 28mm/1.3 'Plus Jakarta Sans';color:${C.fg}">${esc(cfg.hocSinhCua)}</div>${en(22, C.mute2, esc(cfg.hocSinhCuaEn))}<div style="display:flex;gap:14mm;margin-top:18mm">${img(cfg.logoDonVi, 'LOGO ĐƠN VỊ', 120, 120, true)}${img(cfg.logoBTC, 'LOGO SỞ', 120, 120, true)}</div>`) +
    blueBand(TW, TH - 150);
}
async function artTotemC() {
  return grid(TW, TH, 60, C.gridD, 0.5) +
    A(50, 110, 500, mono(20, C.blueL, '// THỬ NGAY · TRY IT NOW')) +
    A(50, 170, 500, `<div style="font:800 92mm/0.98 'Plus Jakarta Sans';letter-spacing:-.03em;color:${C.fg}">Quét<br>để thử.</div>${en(46, C.blueL, 'Scan to try.', 'margin-top:8mm')}`) +
    A(50, 560, 500, await qr(cfg.qrDungThu, 500, 'qrDungThu')) +
    A(50, 1110, 500, `<div style="font:600 26mm/1.4 'Plus Jakarta Sans';color:${C.fg}">Gia sư Socratic trên điện thoại, không cần cài đặt.</div>${en(21, C.mute, 'The Socratic tutor on your phone. No install needed.', 'margin-top:8mm')}`) +
    A(50, 1420, 500, `<div style="border-top:1.5mm solid ${C.line};padding-top:22mm">${mono(16, C.mute, 'LIÊN HỆ NHÓM · CONTACT')}<div style="font:700 26mm/1.4 'Plus Jakarta Sans';color:${C.fg};margin-top:8mm">${T(cfg.truongNhom)}</div><div style="font:500 20mm/1.4 'JetBrains Mono';color:${C.mute2}">${T(cfg.lienHe)}</div></div>`) +
    blueBand(TW, TH - 150);
}

// Quầy 1000 × 500 × 1000
function artCounterFront() {
  return grid(1000, 1000, 100, C.gridD, 0.6) + A(640, 70, 320, bigQ(320, 533, C.orange)) +
    A(70, 90, 560, mono(18, C.blueL, '// XEM AI NGHĨ · WATCH THE AI THINK')) +
    A(70, 140, 600, `<div style="font:800 88mm/1 'Plus Jakarta Sans';letter-spacing:-.03em;color:${C.fg}">Bảng lớp</div><div style="font:italic 400 94mm/1.05 'Newsreader';color:${C.blueL}">biết hỏi lại.</div>`) +
    A(72, 390, 560, en(34, C.mute2, 'The board that asks back.')) +
    A(70, 500, 560, `<div style="font:500 24mm/1.45 'Plus Jakarta Sans';color:${C.mute2}">Mỗi nét viết đi qua 5 lớp. Lớp đang chạy sáng lên trên tháp mica.</div>${en(19, C.mute, 'Every stroke passes 5 layers. Watch them light up on the acrylic tower.', 'margin-top:8mm')}`) +
    A(70, 730, 860, wordmark(34, C.fg)) + blueBand(1000, 850);
}
function artCounterSide() {
  return grid(500, 1000, 100, C.gridD, 0.6) + A(110, 110, 280, ringLogo(280, C.fg, C.orange)) +
    A(40, 470, 420, `<div style="text-align:center;font:800 40mm/1.1 'Plus Jakarta Sans';color:${C.fg}">AI · STEM</div><div style="text-align:center;font:500 20mm 'JetBrains Mono';color:${C.mute};margin-top:10mm">EDTECH · PHÚ THỌ</div>`) + blueBand(500, 850);
}

// Cờ buồm: vùng in 700 × 2800
const FW = 700, FH = 2800;
function artFlag() {
  return grid(FW, FH, 70, C.gridD, 0.5) + `<div style="position:absolute;left:${FW - 90}mm;top:-30mm;width:120mm;height:${FH + 60}mm;background:${C.blue}"></div>` +
    A(110, 160, 400, ringLogo(400, C.fg, C.orange)) +
    `<div style="position:absolute;left:${(FW - 90) / 2}mm;top:${FH / 2 + 250}mm;width:0;height:0"><div style="position:absolute;transform:translate(-50%,-50%) rotate(-90deg);white-space:nowrap;font:800 190mm 'Plus Jakarta Sans';letter-spacing:-.01em;color:${C.fg}">SOCRATIC <span style="font:italic 400 200mm 'Newsreader';color:${C.blueL}">vision</span></div></div>` +
    A(60, FH - 220, FW - 180, mono(26, C.mute, 'AI · STEM · EDTECH', 'text-align:center'));
}

// Huy hiệu giải thưởng Ø440
function artSeal() {
  const d = 440, r = d / 2;
  return `<svg viewBox="-5 -5 ${d + 10} ${d + 10}" style="position:absolute;left:-5mm;top:-5mm;width:${d + 10}mm;height:${d + 10}mm">
    <defs><path id="arc" d="M ${r} ${r} m -${r - 38} 0 a ${r - 38} ${r - 38} 0 1 1 ${2 * (r - 38)} 0 a ${r - 38} ${r - 38} 0 1 1 -${2 * (r - 38)} 0"/></defs>
    <circle cx="${r}" cy="${r}" r="${r + 5}" fill="${C.orange}"/><circle cx="${r}" cy="${r}" r="${r - 70}" fill="${C.ink}"/>
    <circle cx="${r}" cy="${r}" r="${r - 82}" fill="none" stroke="${C.orangeL}" stroke-width="2"/>
    <text font-family="JetBrains Mono" font-size="22" font-weight="600" fill="#fff" letter-spacing="3"><textPath href="#arc" startOffset="0">${esc(cfg.cuocThiEn.toUpperCase())} · ${esc(cfg.giaiThuongEn.toUpperCase())} · </textPath></text>
  </svg>` + `<div style="position:absolute;left:90mm;top:108mm;width:260mm;text-align:center;color:#fff">
    <div style="font:500 20mm 'JetBrains Mono';letter-spacing:.1em;color:${C.orangeL}">2026–2027</div>
    <div style="font:800 72mm/0.98 'Plus Jakarta Sans';margin-top:26mm">GIẢI<br>NHẤT</div>
    <div style="font:600 26mm 'Plus Jakarta Sans';margin-top:6mm">cấp tỉnh</div></div>`;
}

function artFloorBi() {
  return `<div style="position:absolute;left:-5mm;top:-5mm;width:810mm;height:810mm;border-radius:50%;background:${C.blue}"></div>
    <div style="position:absolute;left:55mm;top:55mm;width:690mm;height:690mm;border-radius:50%;background:${C.ink};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16mm;text-align:center">
      <div style="font:700 32mm 'JetBrains Mono';color:${C.blueL}">▲ MÀN HÌNH · SCREEN</div>
      <div style="font:800 112mm/0.95 'Plus Jakarta Sans';letter-spacing:-.02em;color:${C.fg}">ĐỨNG<br>ĐÂY</div>
      <div style="font:italic 400 62mm 'Newsreader';color:${C.blueL}">Stand here</div>
      <div style="font:500 30mm/1.3 'Plus Jakarta Sans';color:${C.mute2}">giơ tay · chụm để chọn<br><span style="font-family:'JetBrains Mono';font-size:24mm">raise hand · pinch to pick</span></div></div>`;
}

async function artA5(lang) {
  const vi = lang === 'vi';
  const st = cfg.cauChuyen;
  return grid(148, 210, 10, C.gridD, 0.1) +
    A(14, 14, 120, `<div style="display:flex;justify-content:space-between;font:500 2.4mm 'JetBrains Mono';letter-spacing:.06em;color:${C.mute}"><span>SOCRATIC VISION BOARD</span><span>${vi ? 'GIAN' : 'BOOTH'} ${T(cfg.soGian)}</span></div>`) +
    A(14, 24, 120, vi ? `<div style="font:800 12mm/1 'Plus Jakarta Sans';letter-spacing:-.03em;color:${C.fg}">Bảng lớp biết <i style="font:italic 400 13mm 'Newsreader';color:${C.blueL}">hỏi lại.</i></div>` : `<div style="font:800 11mm/1.02 'Plus Jakarta Sans';letter-spacing:-.03em;color:${C.fg}">The board that <i style="font:italic 400 12mm 'Newsreader';color:${C.blueL}">asks back.</i></div>`) +
    A(14, 42, 120, `<div style="display:inline-block;background:${C.orange};color:#fff;border-radius:1mm;padding:1.4mm 2.4mm;font:700 3mm 'Plus Jakarta Sans'">${vi ? esc(cfg.giaiThuong) : esc(cfg.giaiThuongEn)}</div><span style="font:400 2.5mm 'Plus Jakarta Sans';color:${C.mute2};margin-left:2mm">${vi ? esc(cfg.cuocThi) : esc(cfg.cuocThiEn)}</span>`) +
    A(14, 56, 120, `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4.5mm 6mm">${st.map((s, i) => `<div><div style="font:600 2.4mm 'JetBrains Mono';color:${i === 0 || i === 4 ? C.orangeL : C.blueL}">0${i + 1}</div><div style="font:800 3.6mm/1.2 'Plus Jakarta Sans';color:${C.fg}">${T(vi ? s.tieuDe : s.tieuDeEn)}</div><div style="font:400 2.6mm/1.4 'Plus Jakarta Sans';color:${C.mute2};margin-top:1mm">${T(vi ? s.noiDung : s.noiDungEn)}</div></div>`).join('')}<div><div style="font:600 2.4mm 'JetBrains Mono';color:${C.mute}">06</div><div style="font:800 3.6mm/1.2 'Plus Jakarta Sans';color:${C.fg}">${vi ? 'Nhóm cần' : 'We are looking for'}</div><div style="font:400 2.6mm/1.4 'Plus Jakarta Sans';color:${C.mute2};margin-top:1mm">${vi ? 'Mentor đồng hành, lớp thử nghiệm, tài trợ thiết bị.' : 'Mentors, pilot classrooms and hardware sponsors.'}</div></div></div>`) +
    A(14, 172, 120, `<div style="border-top:0.3mm solid ${C.line};padding-top:4mm;display:flex;gap:5mm;align-items:center">${await qr(cfg.qrDungThu, 22, 'qrDungThu')}<div style="font:400 2.6mm/1.45 'Plus Jakarta Sans';color:${C.mute2}"><b style="color:${C.fg}">${T(cfg.truongNhom)}</b> · ${esc(vi ? cfg.hocSinhCua : cfg.hocSinhCuaEn)}<br>${T(cfg.lienHe)}<br>${vi ? 'Đơn vị trưng bày' : 'Exhibitor'}: ${esc(cfg.donVi)}</div></div>`);
}
function artStickerBi() {
  return `<div style="position:absolute;left:-2mm;top:-2mm;width:64mm;height:64mm;border-radius:50%;background:${C.orange}"></div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center">
  <div style="font:400 22mm/0.8 'Newsreader'">?</div><div style="font:800 4.2mm/1.15 'Plus Jakarta Sans';margin-top:2mm">Tôi đã hỏi<br>bảng 1 câu</div><div style="font:italic 400 3.4mm 'Newsreader';margin-top:1mm">I asked the board</div></div>`;
}
function artBadgeBi(m) {
  const q = { 'Người kỹ thuật': ['Hỏi mình cách AI nghĩ.', 'Ask me how the AI thinks.'], 'Người pitch': ['Hỏi mình về dự án.', 'Ask me about the project.'], 'Người demo': ['Thử viết một câu nhé.', 'Try writing on the board.'] }[m.vai] || ['Bạn đang học, dạy hay tìm dự án?', 'Student, teacher or investor?'];
  return grid(90, 130, 6, C.gridD, 0.1) + `<div style="position:absolute;left:-3mm;top:-3mm;width:96mm;height:12mm;background:${C.blue}"></div>
  ${A(10, 20, 70, mono(2.5, C.mute, 'ĐỒNG SÁNG LẬP · CO-FOUNDER'))}
  ${A(10, 28, 70, `<div style="font:400 10mm/1.05 'Newsreader';color:${C.fg}">${T(m.ten)}</div>`)}
  ${A(10, 60, 70, `<div style="font:700 4.4mm 'Plus Jakarta Sans';color:${C.fg}">${esc(m.vai)} <span style="font:italic 400 4mm 'Newsreader';color:${C.blueL}">· ${esc(m.vaiEn)}</span></div><div style="font:500 3.2mm 'Plus Jakarta Sans';color:${C.mute};margin-top:1.5mm">${T(m.lop)} · ${esc(cfg.hocSinhCua)}</div>`)}
  ${A(10, 92, 70, `<div style="border:0.4mm solid ${C.blueL};color:${C.fg};border-radius:2mm;padding:3.5mm 4.5mm;font:600 4.2mm/1.3 'Plus Jakarta Sans'">${q[0]}<div style="font:italic 400 3.8mm 'Newsreader';color:${C.blueL};margin-top:1mm">${q[1]}</div></div>`)}
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
async function items() {
  const L = [];
  const add = (o) => L.push(o);
  CUR = 'BD'; add({ group: '01-khung-va-bat', code: 'BD', name: 'Backdrop sau', w: PW, h: BH, bleed: 50, bg: C.ink, html: artBackdrop(), mat: 'Bạt hiflex 440 gsm in UV ngoài trời (hoặc bạt PP)', fin: 'Căng khung sắt hộp, biên 50 mm mỗi cạnh cuốn ra sau', qty: 1, where: 'Sát mép sau lều' });
  CUR = 'K-DAU'; add({ group: '01-khung-va-bat', code: 'K-DAU', name: 'Khung cổng — đầu cổng', w: PW, h: HEAD, bleed: 10, bg: '#fff', html: artHeader(), die: dieHeader(), mat: 'Decal PP in UV cán mờ, dán lên fomex 10 mm cắt CNC', fin: 'Cắt CNC theo đường hồng, ghép 2 tấm ở giữa, đèn LED viền trong', qty: 1, where: 'Mặt trước, lùi 600 mm' });
  CUR = 'K-CHAN'; add({ group: '01-khung-va-bat', code: 'K-CHAN-T', name: 'Khung cổng — chân trái', w: BAR, h: LEG, bleed: 10, bg: C.ink, html: artLeg('L'), mat: 'Decal PP in UV cán mờ trên fomex 10 mm', fin: 'Bọc khung sắt hộp 300 × 200; mặt hông dán decal đen', qty: 1, where: 'Chân trái cổng' });
  add({ group: '01-khung-va-bat', code: 'K-CHAN-P', name: 'Khung cổng — chân phải', w: BAR, h: LEG, bleed: 10, bg: C.ink, html: artLeg('R'), mat: 'Decal PP in UV cán mờ trên fomex 10 mm', fin: 'Bọc khung sắt hộp 300 × 200; mặt hông dán decal đen', qty: 1, where: 'Chân phải cổng' });
  CUR = 'C-TRONG'; add({ group: '01-khung-va-bat', code: 'C-TRONG-T', name: 'Cánh trái — mặt trong', w: WW, h: BH, bleed: 50, bg: C.ink, html: artWingIn('L'), mat: 'Bạt hiflex in UV', fin: 'Căng khung sắt hộp 900 × ' + BH, qty: 1, where: 'Cánh trái, mặt nhìn vào gian' });
  add({ group: '01-khung-va-bat', code: 'C-TRONG-P', name: 'Cánh phải — mặt trong', w: WW, h: BH, bleed: 50, bg: C.ink, html: artWingIn('R'), mat: 'Bạt hiflex in UV', fin: 'Căng khung sắt hộp 900 × ' + BH, qty: 1, where: 'Cánh phải, mặt nhìn vào gian' });
  CUR = 'C-NGOAI'; add({ group: '01-khung-va-bat', code: 'C-NGOAI', name: 'Cánh — mặt ngoài', w: WW, h: BH, bleed: 50, bg: C.ink, html: artWingOut(), mat: 'Bạt hiflex in UV', fin: 'Căng mặt ngoài 2 cánh', qty: 2, where: 'Mặt ngoài 2 cánh' });
  CUR = 'TT'; add({ group: '01-khung-va-bat', code: 'TT-A', name: 'Totem tam giác — mặt A', w: TW, h: TH, bleed: 10, bg: C.ink, html: artTotemA(), mat: 'Decal PP in UV trên fomex 5 mm', fin: 'Dán lên khung tam giác sắt, đế đổ cát 15 kg', qty: 1, where: 'Góc trước trái, ngoài cổng' });
  add({ group: '01-khung-va-bat', code: 'TT-B', name: 'Totem tam giác — mặt B (giải thưởng)', w: TW, h: TH, bleed: 10, bg: C.ink, html: artTotemB(), mat: 'Decal PP in UV trên fomex 5 mm', fin: 'Như mặt A', qty: 1, where: 'Mặt hướng lối đi chính' });
  add({ group: '01-khung-va-bat', code: 'TT-C', name: 'Totem tam giác — mặt C (QR)', w: TW, h: TH, bleed: 10, bg: C.ink, html: await artTotemC(), mat: 'Decal PP in UV trên fomex 5 mm', fin: 'Như mặt A', qty: 1, where: 'Mặt hướng vào gian' });
  CUR = 'Q'; add({ group: '01-khung-va-bat', code: 'Q-TRUOC', name: 'Quầy — mặt trước', w: 1000, h: 1000, bleed: 10, bg: C.ink, html: artCounterFront(), mat: 'Decal PP in UV cán mờ', fin: 'Dán lên quầy gỗ/fomex 1000 × 500 × 1000, gấp mép 10 mm', qty: 1, where: 'Quầy ngoài cổng, quay ra lối đi' });
  add({ group: '01-khung-va-bat', code: 'Q-HONG', name: 'Quầy — mặt hông', w: 500, h: 1000, bleed: 10, bg: C.ink, html: artCounterSide(), mat: 'Decal PP in UV cán mờ', fin: 'Dán 2 mặt hông', qty: 2, where: 'Hai hông quầy' });
  CUR = 'CO'; add({ group: '01-khung-va-bat', code: 'CO', name: 'Cờ buồm 3,5 m', w: FW, h: FH, bleed: 20, bg: C.ink, html: artFlag(), mat: 'Vải voan lưới in chuyển nhiệt (xuyên 2 mặt)', fin: 'May theo khuôn cờ của nhà cung cấp; chân cắm đế nước hoặc kẹp cột lều', qty: 2, where: 'Hai cột trước của lều' });
  CUR = 'HH'; add({ group: '01-khung-va-bat', code: 'HH', name: 'Huy hiệu Giải Nhất Ø440', w: 440, h: 440, bleed: 5, bg: '#fff', html: artSeal(), die: dieCircle(440), mat: 'Decal PP in UV trên fomex 10 mm', fin: 'Cắt CNC tròn, gắn nổi 30 mm bằng ke nhựa', qty: 1, where: 'Đầu totem, mặt A (cách mép trên 60 mm)' });
  CUR = 'D01'; add({ group: '01-khung-va-bat', code: 'D01', name: 'Decal sàn "Đứng đây / Stand here" Ø800', w: 800, h: 800, bleed: 5, bg: '#fff', html: artFloorBi(), die: dieCircle(800), mat: 'Decal sàn cán màng chống trượt R10, dán trên thảm cứng', fin: 'Bế tròn Ø800', qty: 1, where: 'Trước màn 65", tâm cách backdrop 1,1 m' });
  CUR = 'A5'; add({ group: '02-an-pham-nho', code: 'A5', name: 'Tờ giới thiệu A5 song ngữ (mặt Việt, mặt Anh)', w: 148, h: 210, bleed: 3, marks: true, bg: C.ink, html: await artA5('vi'), pages2: { bg: C.ink, html: await artA5('en') }, mat: 'Couche mờ 250 gsm, in 4/4', fin: 'Xén thành phẩm', qty: 600, where: 'Quầy' });
  CUR = 'ST'; add({ group: '02-an-pham-nho', code: 'ST', name: 'Sticker tròn Ø60 song ngữ', w: 60, h: 60, bleed: 2, marks: true, bg: '#fff', html: artStickerBi(), die: dieCircle(60), mat: 'Decal nhựa sữa, cán bóng', fin: 'Bế tròn Ø60', qty: 600, where: 'Quà tặng' });
  cfg.thanhVien.forEach((m, i) => { CUR = `TD${i + 1}`; add({ group: '02-an-pham-nho', code: `TD${i + 1}`, name: `Thẻ đeo — ${m.vai}`, w: 90, h: 130, bleed: 3, marks: true, bg: C.ink, html: artBadgeBi(m), mat: 'Thẻ nhựa PVC 0,76 mm in 2 mặt (mặt sau đen)', fin: 'Đục lỗ ô van 13 × 3 mm, dây đeo xanh', qty: 1, where: 'Thành viên nhóm' }); });
  PLATES.forEach((p, i) => { CUR = `M0${i + 1}`; add({ group: '03-mica-laser', code: `M0${i + 1}`, name: `Tấm mica ${p.n.replace(' · ', ' ')}`, w: 300, h: p.h + 10, bleed: 0, bg: '#fff', html: artPlate(p), mat: 'Mica trong loại đúc (cast) 5 mm', fin: 'Đỏ nét mảnh = cắt; đen = khắc mặt sau (lật gương)', qty: 1, where: 'Tháp 5 lớp trên quầy' }); });
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
<div><div class="m" style="font-size:7.5pt;letter-spacing:.08em;color:#57534E">BẢNG KÊ HẠNG MỤC IN ẤN · GIAN ${esc(cfg.soGian)}</div><h1>Socratic Vision Board — gian lều 3 × 3 m · ${esc(cfg.suKien)}</h1>
<div>Đơn vị trưng bày: ${esc(cfg.donVi)} · ${esc(cfg.giaiThuong)} · ${esc(cfg.diaDiem)} · lắp ${esc(cfg.ngayLap)} · trưng bày ${esc(cfg.ngayTrienLam)}</div></div>
<div style="text-align:right">Liên hệ duyệt file: <b>${esc(cfg.truongNhom)}</b><br>${esc(cfg.lienHe)}<br><span class="m">Ngày xuất file: ${TODAY}</span></div></div>
<h2>QUY CÁCH CHUNG</h2>
<div class="grid">
<div class="box"><b>File</b><br>PDF vector tỷ lệ 1:1, đơn vị mm. Font đã nhúng. Hàng khổ lớn: không dấu cắt, đã có tràn lề. Ấn phẩm nhỏ: có dấu cắt và dòng thông tin.</div>
<div class="box"><b>Màu</b><br>File hệ RGB. Nhờ nhà in chuyển CMYK theo mã bên dưới và <b>in thử màu</b> (proof) trên đúng vật liệu trước khi in hàng loạt.</div>
<div class="box"><b>Đường cắt</b><br>Bế tròn, đục lỗ: nét màu hồng (#EC008C) trong tệp *_DUONG-CAT.pdf hoặc trên file, không in. Mica: nét đỏ 0,01 mm = cắt.</div>
<div class="box"><b>Lều</b><br>File theo lều cao mép mái ${LEU.caoMepMai} mm, rộng trong cột ${LEU.rongTrongCot} mm. <b>Đo lều thật</b>; khác thì sửa config.leu và xuất lại.</div>
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
<div class="box"><b>Ngoài trời, có gió:</b> mọi khung đứng (backdrop, cánh, cổng, totem, cờ) có chân đế và bao cát hoặc đế nước; buộc dây vào cột lều. Bạt và decal loại ngoài trời.</div>
<div class="box"><b>Lắp trong 3 giờ</b> (${esc(cfg.ngayLap)}): khung sơn đen, gia công sẵn tại xưởng, chỉ bắt bu lông tại chỗ. Bạt căng sẵn trên khung trước khi chở đến.</div>
<div class="box">Logo Sở GD&amp;ĐT Phú Thọ chỉ dùng file chính thức do BTC cung cấp. Ô còn ghi "CHƯA ĐỦ" là file chưa được in.</div>
</div></body></html>`;
}

main().catch((e) => { console.error(e); process.exit(1); });
