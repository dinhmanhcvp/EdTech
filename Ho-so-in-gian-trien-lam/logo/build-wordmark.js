// Socratic stylised wordmark for the standing booth letters: "Socratıc" in Plus Jakarta Sans 800,
// the tittle of the i becomes the orange "question dot" and a blue iris arc sits inside the o (both from the logo mark).
// Three flat layers, each one CNC cut: white letters, orange dot, blue arc. Run: node logo/build-wordmark.js
'use strict';
const fs = require('fs'), path = require('path'), opentype = require('opentype.js');
const f = opentype.loadSync(path.join(__dirname, 'fonts', 'Plus_Jakarta_Sans_wght_800.ttf'));
const SIZE = 1000, BASE = 1000, TRACK = -0.015 * SIZE, text = 'Socratic';
let x = 0, d = '';
f.stringToGlyphs(text).forEach((g, i, a) => { d += g.getPath(x, BASE, SIZE).toPathData(1); x += g.advanceWidth * (SIZE / f.unitsPerEm) + (i < a.length - 1 ? f.getKerningValue(g, a[i + 1]) * (SIZE / f.unitsPerEm) : 0) + TRACK; });
// the logo mark as the closing question mark: hook in letter weight, blue iris inside, orange dot on the baseline
const capTop = f.charToGlyph('S').getBoundingBox().y2, s = capTop / 97.2, mx = x + 70, X = (gx) => mx + (gx - 21) * s, Y = (gy) => BASE - (117.2 - gy) * s;
const P = (gx, gy) => `${X(gx).toFixed(1)} ${Y(gy).toFixed(1)}`;
const hook = { d: `M${P(31.8, 39.7)}A${(30 * s).toFixed(1)} ${(30 * s).toFixed(1)} 0 1 1 ${P(75, 76)}Q${P(60, 81)} ${P(60, 86)}`, w: 140 };
const iris = { d: `M${P(46.8, 45.2)}A${(14 * s).toFixed(1)} ${(14 * s).toFixed(1)} 0 0 1 ${P(73.2, 45.2)}`, w: +(7.5 * s).toFixed(1) };
const dot = { cx: +X(60).toFixed(1), cy: BASE - 74, r: 74 };
const p = f.getPath(text, 0, BASE, SIZE, { letterSpacing: TRACK / SIZE }); const box = p.getBoundingBox();
const X0 = Math.floor(box.x1) - 20, Y0 = Math.floor(Math.min(box.y1, Y(20) - 70)) - 20, W = Math.ceil(X(99) - X0) + 40, H = Math.ceil(box.y2 - Y0) + 20;
const out = { viewBox: [X0, Y0, W, H], letters: d, hook, dot, iris, baseline: BASE };
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'socratic-wordmark.json'), JSON.stringify(out));
const svg = (bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${X0} ${Y0} ${W} ${H}">${bg ? `<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" fill="${bg}"/>` : ''}<path d="${d}" fill="${fg}"/><path d="${hook.d}" fill="none" stroke="${fg}" stroke-width="${hook.w}" stroke-linecap="round"/><path d="${iris.d}" fill="none" stroke="#3D7BFF" stroke-width="${iris.w}" stroke-linecap="round"/><circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="#FF6A2B"/></svg>`;
fs.writeFileSync(path.join(__dirname, 'out', 'socratic-wordmark-nen-toi.svg'), svg('#0B0D13', '#F5F2EA'));
fs.writeFileSync(path.join(__dirname, 'out', 'socratic-wordmark-nen-sang.svg'), svg(null, '#0B0D13'));
console.log('wordmark', W, 'x', H);
