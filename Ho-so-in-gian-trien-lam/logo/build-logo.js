// Sinh bộ logo Socratic Vision Board (SVG vector, chữ đã chuyển thành đường) + mã QR cho link demo.
// Chạy: node logo/build-logo.js   (cần opentype.js, qrcode, playwright)
'use strict';
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const QRCode = require('qrcode');

const DIR = __dirname, OUT = path.join(DIR, 'out');
const cfg = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'config.json'), 'utf8'));
const DEMO = cfg.qrDungThu || 'https://svb-stem.vercel.app';
const COL = { ink: '#0B0D13', white: '#FFFFFF', blue: '#2F6BFF', blueL: '#8FB0F5', orange: '#FF5A1F', paper: '#F7F5F0' };
const sans = opentype.loadSync(path.join(DIR, 'fonts', 'Plus_Jakarta_Sans_wght_800.ttf'));
const mono = opentype.loadSync(path.join(DIR, 'fonts', 'JetBrains_Mono_wght_600.ttf'));

// Biểu tượng trên lưới 120 × 120: cung lớn = ống kính + móc dấu hỏi, cung nhỏ = con ngươi / lượt đáp, chấm = câu hỏi.
const MARK = {
  hook: 'M31.8 39.7 A30 30 0 1 1 75 76 Q60 83 60 93',
  iris: 'M46.8 45.2 A14 14 0 0 1 73.2 45.2',
  dot: { cx: 60, cy: 109, r: 8.2 },
};
function mark(hook, iris = COL.blue, dot = COL.orange) {
  return `<path d="${MARK.hook}" fill="none" stroke="${hook}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${MARK.iris}" fill="none" stroke="${iris}" stroke-width="7.5" stroke-linecap="round"/>` +
    `<circle cx="${MARK.dot.cx}" cy="${MARK.dot.cy}" r="${MARK.dot.r}" fill="${dot}"/>`;
}
function textPath(font, txt, x, y, size, spacing = 0, fill = '#000') {
  // spacing tính theo em; tự đặt từng ký tự để giãn chữ đúng
  let cx = x, d = '';
  const glyphs = font.stringToGlyphs(txt);
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, size).toPathData(2);
    let adv = (g.advanceWidth / font.unitsPerEm) * size;
    if (i < glyphs.length - 1) adv += (font.getKerningValue(g, glyphs[i + 1]) / font.unitsPerEm) * size;
    cx += adv + spacing * size;
  });
  return { svg: `<path d="${d}" fill="${fill}"/>`, width: cx - x - spacing * size };
}
const svg = (w, h, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 4}" height="${h * 4}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`;

function horizontal(dark) {
  const fg = dark ? COL.white : COL.ink, sub = dark ? COL.blueL : COL.blue;
  const t1 = textPath(sans, 'Socratic', 0, 0, 74, -0.025, fg); const t2 = textPath(mono, 'VISION BOARD', 0, 0, 19.5, 0.36, sub);
  const tx = 132, W = tx + Math.max(t1.width, t2.width) + 14;
  const a = textPath(sans, 'Socratic', tx, 70, 74, -0.025, fg).svg, b = textPath(mono, 'VISION BOARD', tx + 3, 104, 19.5, 0.36, sub).svg;
  return { w: Math.ceil(W), h: 124, body: `<g transform="translate(4,2)">${mark(fg)}</g>${a}${b}` };
}
function stacked(dark) {
  const fg = dark ? COL.white : COL.ink, sub = dark ? COL.blueL : COL.blue;
  const t1 = textPath(sans, 'Socratic', 0, 0, 74, -0.025, fg), t2 = textPath(mono, 'VISION BOARD', 0, 0, 19.5, 0.36, sub);
  const W = Math.ceil(Math.max(t1.width, t2.width) + 20);
  const a = textPath(sans, 'Socratic', (W - t1.width) / 2, 196, 74, -0.025, fg).svg, b = textPath(mono, 'VISION BOARD', (W - t2.width) / 2, 232, 19.5, 0.36, sub).svg;
  return { w: W, h: 246, body: `<g transform="translate(${(W - 120) / 2},0)">${mark(fg)}</g>${a}${b}` };
}
function appIcon() {
  const br = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 16} V${y} H${x + sx * 16}" fill="none" stroke="${COL.blueL}" stroke-width="4" stroke-linecap="round" opacity=".75"/>`;
  return { w: 160, h: 160, body: `<rect width="160" height="160" rx="36" fill="${COL.ink}"/>${br(26, 26, 1, 1)}${br(134, 26, -1, 1)}${br(26, 134, 1, -1)}${br(134, 134, -1, -1)}<g transform="translate(20,18)">${mark(COL.white)}</g>` };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const files = {
    'svb-mark-mau-nen-sang.svg': svg(120, 124, mark(COL.ink)),
    'svb-mark-mau-nen-toi.svg': svg(120, 124, mark(COL.white)),
    'svb-mark-den.svg': svg(120, 124, mark('#000', '#000', '#000')),
    'svb-mark-trang.svg': svg(120, 124, mark('#fff', '#fff', '#fff')),
    'svb-app-icon.svg': (() => { const a = appIcon(); return svg(a.w, a.h, a.body); })(),
  };
  for (const dark of [false, true]) {
    const h = horizontal(dark), s = stacked(dark), k = dark ? 'nen-toi' : 'nen-sang';
    files[`svb-logo-ngang-${k}.svg`] = svg(h.w, h.h, h.body);
    files[`svb-logo-doc-${k}.svg`] = svg(s.w, s.h, s.body);
  }
  // QR: mức sửa lỗi H, logo chiếm khoảng 20 % ở giữa trên nền trắng
  const qr = QRCode.create(DEMO, { errorCorrectionLevel: 'H' }); const n = qr.modules.size, q = 4, S = n + 2 * q;
  let mods = ''; const hole = Math.ceil(n * 0.22) | 1, h0 = Math.floor((n - hole) / 2);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(x, y) && !(x >= h0 && x < h0 + hole && y >= h0 && y < h0 + hole)) mods += `M${x + q} ${y + q}h1v1h-1z`;
  const logoBox = `<rect x="${h0 + q - 0.2}" y="${h0 + q - 0.2}" width="${hole + 0.4}" height="${hole + 0.4}" rx="1.4" fill="${COL.white}"/><g transform="translate(${h0 + q + hole * 0.08},${h0 + q + hole * 0.06}) scale(${(hole * 0.84) / 124})">${mark(COL.ink)}</g>`;
  files['qr-svb-stem-co-logo.svg'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="1200" height="1200" shape-rendering="crispEdges"><rect width="${S}" height="${S}" fill="#fff"/><path d="${mods}" fill="${COL.ink}"/><g shape-rendering="geometricPrecision">${logoBox}</g></svg>`;
  files['qr-svb-stem-tron.svg'] = await QRCode.toString(DEMO, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, color: { dark: COL.ink, light: '#ffffff' } });
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(OUT, f), c);
  fs.writeFileSync(path.join(OUT, 'mark-paths.json'), JSON.stringify(MARK, null, 1));

  // PNG 2048 px để dùng ngay (slide, mạng xã hội, máy in không đọc được SVG)
  const { chromium } = require('playwright'); const b = await chromium.launch(); const p = await b.newPage();
  for (const f of Object.keys(files)) {
    const c = files[f]; const m = c.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/); const w = +m[1], h = +m[2]; const k = 2048 / Math.max(w, h);
    await p.setViewportSize({ width: Math.round(w * k), height: Math.round(h * k) });
    await p.setContent(`<html><body style="margin:0;background:transparent">${c.replace(/width="[\d.]+" height="[\d.]+"/, `width="${Math.round(w * k)}" height="${Math.round(h * k)}"`)}</body></html>`);
    await p.screenshot({ path: path.join(OUT, f.replace('.svg', '.png')), omitBackground: true });
  }
  await b.close();
  console.log('Đã tạo', Object.keys(files).length, 'tệp SVG + PNG trong logo/out · QR →', DEMO);
}
main().catch((e) => { console.error(e); process.exit(1); });
