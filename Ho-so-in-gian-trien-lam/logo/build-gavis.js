// Bộ logo GAVIS: chữ G một nét cung (khung nhìn), con ngươi ở tâm, hai sóng âm lan về phía sau, thanh ngang của G là tia ánh nhìn.
// Chạy: node logo/build-gavis.js   (cần opentype.js, playwright)
'use strict';
const fs = require('fs'), path = require('path'), opentype = require('opentype.js');
const DIR = __dirname, OUT = path.join(DIR, 'gavis');
const sans = opentype.loadSync(path.join(DIR, 'fonts', 'Plus_Jakarta_Sans_wght_800.ttf'));
const mono = opentype.loadSync(path.join(DIR, 'fonts', 'JetBrains_Mono_wght_600.ttf'));
const C = { ink: '#0E0B16', white: '#FFFFFF', v1: '#C4B5FD', v2: '#8B5CF6', v3: '#6D28D9', wave1: '#A78BFA', wave2: '#C4B5FD', pupil: '#2DD4BF', paper: '#F7F5FB' };
const pt = (r, a) => [60 + r * Math.cos((a * Math.PI) / 180), 60 + r * Math.sin((a * Math.PI) / 180)].map((v) => +v.toFixed(2));
const arc = (r, a0, a1, sweep) => { const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1); let d = (((a1 - a0) % 360) + 360) % 360; if (!sweep) d = 360 - d; return `M${x0} ${y0}A${r} ${r} 0 ${d > 180 ? 1 : 0} ${sweep ? 1 : 0} ${x1} ${y1}`; };
const MARK = { g: `${arc(46, -44, 0, 0)}L75 60`, w1: arc(30.5, 142, 218, 1), w2: arc(18, 128, 232, 1), pupil: { cx: 60, cy: 60, r: 7.2 } };
function mark(mode = 'colour', id = 'gv') {
  // mode: colour | white | black
  const grad = `<defs><linearGradient id="${id}" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="${C.v1}"/><stop offset=".5" stop-color="${C.v2}"/><stop offset="1" stop-color="${C.v3}"/></linearGradient></defs>`;
  const g = mode === 'colour' ? `url(#${id})` : mode === 'white' ? C.white : '#000';
  const w1 = mode === 'colour' ? C.wave1 : g, w2 = mode === 'colour' ? C.wave2 : g, pu = mode === 'colour' ? C.pupil : g;
  return (mode === 'colour' ? grad : '') +
    `<path d="${MARK.g}" fill="none" stroke="${g}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${MARK.w1}" fill="none" stroke="${w1}" stroke-width="6" stroke-linecap="round" opacity="${mode === 'colour' ? 0.95 : 1}"/>` +
    `<path d="${MARK.w2}" fill="none" stroke="${w2}" stroke-width="4.6" stroke-linecap="round" opacity="${mode === 'colour' ? 0.9 : 1}"/>` +
    `<circle cx="${MARK.pupil.cx}" cy="${MARK.pupil.cy}" r="${MARK.pupil.r}" fill="${pu}"/>`;
}
function text(font, txt, x, y, size, track, fill) { let cx = x, d = ''; const gl = font.stringToGlyphs(txt);
  gl.forEach((g, i) => { d += g.getPath(cx, y, size).toPathData(2); cx += (g.advanceWidth / font.unitsPerEm) * size + (i < gl.length - 1 ? (font.getKerningValue(g, gl[i + 1]) / font.unitsPerEm) * size : 0) + track * size; });
  return { svg: `<path d="${d}" fill="${fill}"/>`, w: cx - x - track * size }; }
const svg = (w, h, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 4}" height="${h * 4}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`;
function horizontal(dark) { const fg = dark ? C.white : C.ink, sub = dark ? C.v1 : C.v2;
  const t = text(sans, 'GAVIS', 0, 0, 70, 0.06, fg), s = text(mono, 'HEAR WITH YOUR EYES', 0, 0, 13.5, 0.32, sub);
  const tx = 140, W = Math.ceil(tx + Math.max(t.w, s.w) + 12);
  return { w: W, h: 124, body: `<g transform="translate(2,2)">${mark(dark ? 'colour' : 'colour', dark ? 'gvd' : 'gvl')}</g>${text(sans, 'GAVIS', tx, 76, 70, 0.06, fg).svg}${text(mono, 'HEAR WITH YOUR EYES', tx + 3, 103, 13.5, 0.32, sub).svg}` }; }
function stacked(dark) { const fg = dark ? C.white : C.ink, sub = dark ? C.v1 : C.v2;
  const t = text(sans, 'GAVIS', 0, 0, 64, 0.08, fg), s = text(mono, 'HEAR WITH YOUR EYES', 0, 0, 12.5, 0.32, sub); const W = Math.ceil(Math.max(t.w, s.w, 120) + 24);
  return { w: W, h: 232, body: `<g transform="translate(${(W - 120) / 2},0)">${mark('colour', dark ? 'gsd' : 'gsl')}</g>${text(sans, 'GAVIS', (W - t.w) / 2, 192, 64, 0.08, fg).svg}${text(mono, 'HEAR WITH YOUR EYES', (W - s.w) / 2, 220, 12.5, 0.32, sub).svg}` }; }
function appIcon() { return { w: 160, h: 160, body: `<defs><radialGradient id="bgg" cx=".75" cy=".2" r="1"><stop offset="0" stop-color="#2A1F4D"/><stop offset="1" stop-color="${C.ink}"/></radialGradient></defs><rect width="160" height="160" rx="36" fill="url(#bgg)"/><g transform="translate(20,20)">${mark('colour', 'gai')}</g>` }; }
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const files = { 'gavis-mark-mau.svg': svg(120, 120, mark('colour', 'm1')), 'gavis-mark-trang.svg': svg(120, 120, mark('white')), 'gavis-mark-den.svg': svg(120, 120, mark('black')), 'gavis-app-icon.svg': (() => { const a = appIcon(); return svg(a.w, a.h, a.body); })() };
  for (const dark of [false, true]) { const k = dark ? 'nen-toi' : 'nen-sang', h = horizontal(dark), s = stacked(dark); files[`gavis-logo-ngang-${k}.svg`] = svg(h.w, h.h, h.body, dark ? C.ink : null); files[`gavis-logo-doc-${k}.svg`] = svg(s.w, s.h, s.body, dark ? C.ink : null); }
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(OUT, f), c);
  fs.writeFileSync(path.join(OUT, 'mark-paths.json'), JSON.stringify({ ...MARK, colours: C, strokes: { g: 9.5, w1: 6, w2: 4.6 } }, null, 1));
  const { chromium } = require('playwright'); const b = await chromium.launch(); const p = await b.newPage();
  for (const f of Object.keys(files)) { const c = files[f]; const m = c.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/); const w = +m[1], h = +m[2], k = 2048 / Math.max(w, h);
    await p.setViewportSize({ width: Math.round(w * k), height: Math.round(h * k) }); await p.setContent(`<html><body style="margin:0;background:transparent">${c.replace(/width="[\d.]+" height="[\d.]+"/, `width="${Math.round(w * k)}" height="${Math.round(h * k)}"`)}</body></html>`);
    await p.screenshot({ path: path.join(OUT, f.replace('.svg', '.png')), omitBackground: true }); }
  await b.close(); console.log('GAVIS:', Object.keys(files).length, 'SVG + PNG trong logo/gavis');
}
main().catch((e) => { console.error(e); process.exit(1); });
