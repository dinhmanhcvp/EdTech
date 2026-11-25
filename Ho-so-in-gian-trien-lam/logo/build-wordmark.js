// Socratic stylised wordmark for the standing booth letters: "Socratıc" in Plus Jakarta Sans 800,
// the tittle of the i becomes the orange "question dot" and a blue iris arc sits inside the o (both from the logo mark).
// Three flat layers, each one CNC cut: white letters, orange dot, blue arc. Run: node logo/build-wordmark.js
'use strict';
const fs = require('fs'), path = require('path'), opentype = require('opentype.js');
const f = opentype.loadSync(path.join(__dirname, 'fonts', 'Plus_Jakarta_Sans_wght_800.ttf'));
const SIZE = 1000, BASE = 1000, TRACK = -0.015 * SIZE, text = 'Socratıc';
let x = 0, d = ''; const pos = [];
f.stringToGlyphs(text).forEach((g, i, a) => { pos.push(x); d += g.getPath(x, BASE, SIZE).toPathData(1); x += g.advanceWidth * (SIZE / f.unitsPerEm) + (i < a.length - 1 ? f.getKerningValue(g, a[i + 1]) * (SIZE / f.unitsPerEm) : 0) + TRACK; });
const iX = pos[6] + (44 + 194) / 2, oX = pos[1] + (33 + 618) / 2, oY = BASE - 273;
const dot = { cx: +iX.toFixed(1), cy: BASE - 690, r: 86 };
const ir = 66, icy = oY + 14, a0 = (200 * Math.PI) / 180, a1 = (340 * Math.PI) / 180;
const iris = { d: `M${(oX + ir * Math.cos(a0)).toFixed(1)} ${(icy + ir * Math.sin(a0)).toFixed(1)}A${ir} ${ir} 0 0 1 ${(oX + ir * Math.cos(a1)).toFixed(1)} ${(icy + ir * Math.sin(a1)).toFixed(1)}`, w: 40 };
const bb = new opentype.Path(); const p = f.getPath(text, 0, BASE, SIZE, { letterSpacing: TRACK / SIZE }); const box = p.getBoundingBox();
const X0 = Math.floor(Math.min(box.x1, dot.cx - dot.r)) - 20, Y0 = Math.floor(dot.cy - dot.r) - 20, W = Math.ceil(box.x2 - X0) + 20, H = Math.ceil(box.y2 - Y0) + 20;
const out = { viewBox: [X0, Y0, W, H], letters: d, dot, iris, baseline: BASE };
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'socratic-wordmark.json'), JSON.stringify(out));
const svg = (bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${X0} ${Y0} ${W} ${H}">${bg ? `<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="${bg}"/>` : ''}<path d="${d}" fill="${fg}"/><path d="${iris.d}" fill="none" stroke="#3D7BFF" stroke-width="${iris.w}" stroke-linecap="round"/><circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="#FF6A2B"/></svg>`;
fs.writeFileSync(path.join(__dirname, 'out', 'socratic-wordmark-nen-toi.svg'), svg('#0B0D13', '#F5F2EA'));
fs.writeFileSync(path.join(__dirname, 'out', 'socratic-wordmark-nen-sang.svg'), svg(null, '#0B0D13'));
console.log('wordmark', W, 'x', H);
