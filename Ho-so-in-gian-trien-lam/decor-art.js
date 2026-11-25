// Shared drawings for the one-off Formex pieces (studio 3D canvas + print kit SVG use the same layers).
// Units: mm. Each piece: { w, h, outline (die line, one closed path), layers: [...] }.
// Layer kinds: { d, fill } | { d, stroke, sw, cap } | { edge: sw, fill } (inner border of the outline) | { text, x, y, size, fill, font, weight, italic, anchor, rot, ls }
// | { circle: [cx, cy, r], fill } | { grad: [c0, c1], d } (vertical gradient fill).
function decorArt(kind) {
  const C = { ink: '#0B0D13', blue: '#3D7BFF', blueD: '#2B5FD9', blueL: '#9CC0FF', cream: '#F5F2EA', orange: '#FF6A2B', vio: '#8B5CF6', vioL: '#C4B5FD', vioD: '#0E0B16', green: '#3FB97A' };
  const SANS = 'Plus Jakarta Sans', MONO = 'JetBrains Mono', SERIF = 'Newsreader';
  if (kind === 'flask') {
    // Giant Erlenmeyer flask "3D LAB": glass outline, blue liquid with the 100+ labs count, bubbles rising into a "?" in the neck.
    const W = 520, H = 880, nl = 0.36 * W, nr = 0.64 * W, ny = 0.38 * H, bl = 0.045 * W, br = 0.955 * W, by = 0.9 * H;
    const outline = `M${0.3 * W} 6 Q${0.3 * W} 0 ${0.31 * W} 0 H${0.69 * W} Q${0.7 * W} 0 ${0.7 * W} 6 V${0.05 * H} H${nr} V${ny} L${br} ${by} Q${W} ${0.99 * H} ${0.88 * W} ${H} H${0.12 * W} Q0 ${0.99 * H} ${bl} ${by} L${nl} ${ny} V${0.05 * H} H${0.3 * W} Z`;
    const yl = 0.6 * H, t = (yl - ny) / (by - ny), xl = nl - t * (nl - bl), xr = nr + t * (br - nr);
    const liquid = `M${xl - 30} ${yl} C${0.36 * W} ${yl - 34} ${0.46 * W} ${yl + 30} ${W / 2} ${yl} S${0.68 * W} ${yl - 30} ${xr + 30} ${yl} L${W} ${by} V${H} H0 V${by} Z`;
    const L = [{ d: outline, fill: '#EAF1FF' }, { d: liquid, grad: [C.blue, C.blueD], clip: outline }];
    for (let i = 0; i < 5; i++) { const y = ny + 30 + i * 44, ex = nl - ((y - ny) / (by - ny)) * (nl - bl) + 8; L.push({ d: `M${ex} ${y}H${ex + (i % 2 ? 24 : 46)}`, stroke: C.blue, sw: 5 }); }
    L.push({ text: '100+', x: W / 2, y: 0.8 * H, size: 124, fill: '#FFFFFF', font: SANS, weight: 800, anchor: 'middle' });
    L.push({ text: '3D LABS · BY HAND', x: W / 2, y: 0.865 * H, size: 26, fill: C.cream, font: MONO, weight: 700, anchor: 'middle', ls: 4 });
    [[0.3, 0.7, 16], [0.7, 0.72, 11], [0.62, 0.66, 20], [0.4, 0.64, 9], [0.56, 0.54, 15], [0.44, 0.48, 11], [0.53, 0.42, 8]].forEach(([x, y, r]) => L.push({ circle: [x * W, y * H, r], fill: y < 0.6 ? C.blueL : 'rgba(255,255,255,.55)' }));
    L.push({ text: '?', x: W / 2, y: 0.33 * H, size: 190, fill: C.orange, font: SANS, weight: 800, anchor: 'middle' });
    L.push({ text: 'LAB 3D', x: W / 2, y: 0.53 * H, size: 30, fill: C.blue, font: MONO, weight: 700, anchor: 'middle', ls: 6 });
    L.push({ edge: 18, fill: C.ink });
    L.push({ d: `M${0.3 * W} ${0.05 * H}H${0.7 * W}`, stroke: C.ink, sw: 14 });
    return { w: W, h: H, outline, layers: L };
  }
  if (kind === 'bulb') {
    // Hanging idea bulb: the filament is a question mark; screw base reads ASK WHY.
    const W = 560, H = 860, cx = W / 2, cy = 0.34 * H, R = 0.46 * W, a1 = (125 * Math.PI) / 180, a2 = (55 * Math.PI) / 180;
    const p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)], p2 = [cx + R * Math.cos(a2), cy + R * Math.sin(a2)], bL = 0.3 * W, bR = 0.7 * W, b0 = 0.7 * H, b1 = 0.88 * H;
    const outline = `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${R} ${R} 0 1 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} L${bR} ${b0} V${b1} L${0.62 * W} ${0.94 * H} Q${cx} ${H + 4} ${0.38 * W} ${0.94 * H} L${bL} ${b1} V${b0} Z`;
    const glass = `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${R} ${R} 0 1 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} L${bR} ${b0} H${bL} Z`;
    const L = [{ d: outline, fill: C.ink }, { d: glass, grad: ['#FFF7D6', '#FFD873'] }];
    L.push({ circle: [cx, cy, R * 0.62], fill: 'rgba(255,255,255,.45)' });
    L.push({ d: `M${cx - 36} ${b0} L${cx - 22} ${0.6 * H} M${cx + 36} ${b0} L${cx + 22} ${0.6 * H}`, stroke: '#5A5F6E', sw: 7, cap: 'round' });
    const r = 0.19 * W, hy = cy - 6;
    L.push({ d: `M${cx - r} ${hy} A${r} ${r} 0 1 1 ${cx + r * 0.5} ${hy + r * 0.87} Q${cx} ${hy + r * 1.1} ${cx} ${hy + r * 1.55} V${hy + r * 1.75}`, stroke: C.orange, sw: 28, cap: 'round' });
    L.push({ circle: [cx, hy + r * 2.35, 20], fill: C.orange });
    L.push({ d: `M${cx - R * 0.6} ${cy - R * 0.55} A${R * 0.8} ${R * 0.8} 0 0 1 ${cx - R * 0.1} ${cy - R * 0.82}`, stroke: '#FFFFFF', sw: 16, cap: 'round' });
    for (let i = 0; i < 2; i++) { const y = b0 + 34 + i * 40; L.push({ d: `M${bL + 10} ${y}H${bR - 10}`, stroke: '#3A3F4C', sw: 6 }); }
    L.push({ text: 'ASK WHY', x: cx, y: b1 - 14, size: 34, fill: C.cream, font: MONO, weight: 700, anchor: 'middle', ls: 4 });
    L.push({ circle: [cx, 0.965 * H, 14], fill: C.blue });
    L.push({ edge: 14, fill: C.ink });
    return { w: W, h: H, outline, layers: L, holes: [[cx - 90, cy - R + 26], [cx + 90, cy - R + 26]] };
  }
  if (kind === 'glasses') {
    // GAVIS caption glasses (front view): brow bar with violet LED line and camera, captions running across the lenses.
    const W = 1100, H = 420;
    const outline = `M0 40 Q0 20 20 20 H${W - 20} Q${W} 20 ${W} 40 V120 H${W - 22} L${W - 32} 300 Q${W - 42} 400 ${W - 142} 400 H${W - 410} Q${W - 500} 400 ${W - 512} 300 L${W - 522} 196 Q${W / 2} 162 522 196 L512 300 Q500 400 410 400 H142 Q42 400 32 300 L22 120 H0 Z`;
    const lens = (m) => { const X = (x) => (m ? W - x : x); return `M${X(56)} 100 H${X(484)} L${X(478)} 292 Q${X(470)} 366 ${X(400)} 366 H${X(150)} Q${X(80)} 366 ${X(66)} 292 Z`; };
    const L = [{ d: outline, fill: C.vioD }, { d: lens(0), grad: ['#2A1F4A', '#151026'] }, { d: lens(1), grad: ['#2A1F4A', '#151026'] }];
    L.push({ d: `M60 66H${W - 60}`, stroke: C.vio, sw: 6, cap: 'round' });
    L.push({ circle: [W / 2, 60, 15], fill: '#1E1830' }, { circle: [W / 2, 60, 7], fill: C.green });
    L.push({ text: 'GAVIS', x: 92, y: 54, size: 24, fill: C.vioL, font: MONO, weight: 700, ls: 6 });
    L.push({ text: 'CAPTION ▸ ON', x: W - 92, y: 54, size: 20, fill: C.vioL, font: MONO, weight: 700, anchor: 'end', ls: 3 });
    for (let i = 0; i < 15; i++) { const h = 14 + 62 * Math.pow(Math.sin(((i + 0.5) / 15) * Math.PI), 1.6) * (0.75 + 0.25 * Math.sin(i * 2.1)); L.push({ d: `M${118 + i * 21} ${168 - h / 2}V${168 + h / 2}`, stroke: i % 3 ? C.vio : C.vioL, sw: 10, cap: 'round' }); }
    L.push({ text: '“Hear', x: 270, y: 300, size: 92, fill: '#FFFFFF', font: SERIF, italic: true, weight: 400, anchor: 'middle' });
    L.push({ text: 'with your eyes.”', x: W - 270, y: 210, size: 66, fill: C.vioL, font: SERIF, italic: true, weight: 400, anchor: 'middle' });
    L.push({ d: `M${W - 440} 262H${W - 100}`, stroke: '#3B2F63', sw: 3 });
    L.push({ text: 'SPEECH → CAPTION · 0.28 s', x: W - 270, y: 312, size: 22, fill: C.cream, font: MONO, weight: 700, anchor: 'middle', ls: 2 });
    L.push({ edge: 12, fill: '#241B3D' });
    return { w: W, h: H, outline, layers: L, holes: [[340, 36], [W - 340, 36]] };
  }
  return null;
}
// SVG renderer (print kit). mirror=true gives the back face.
function decorSVG(kind, id = kind) {
  const A = decorArt(kind), defs = [], body = [];
  defs.push(`<clipPath id="${id}-o"><path d="${A.outline}"/></clipPath>`);
  A.layers.forEach((l, i) => {
    if (l.grad) { defs.push(`<linearGradient id="${id}-g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l.grad[0]}"/><stop offset="1" stop-color="${l.grad[1]}"/></linearGradient>`); body.push(`<path d="${l.d}" fill="url(#${id}-g${i})" clip-path="url(#${id}-o)"/>`); }
    else if (l.edge) body.push(`<path d="${A.outline}" fill="none" stroke="${l.fill}" stroke-width="${l.edge * 2}" clip-path="url(#${id}-o)"/>`);
    else if (l.circle) body.push(`<circle cx="${l.circle[0]}" cy="${l.circle[1]}" r="${l.circle[2]}" fill="${l.fill}" clip-path="url(#${id}-o)"/>`);
    else if (l.text) body.push(`<text x="${l.x}" y="${l.y}" font-family="${l.font}" font-weight="${l.weight || 400}"${l.italic ? ' font-style="italic"' : ''} font-size="${l.size}" fill="${l.fill}" text-anchor="${l.anchor || 'start'}"${l.ls ? ` letter-spacing="${l.ls}"` : ''}>${l.text}</text>`);
    else if (l.stroke) body.push(`<path d="${l.d}" fill="none" stroke="${l.stroke}" stroke-width="${l.sw}" stroke-linecap="${l.cap || 'butt'}" clip-path="url(#${id}-o)"/>`);
    else body.push(`<path d="${l.d}" fill="${l.fill}"/>`);
  });
  (A.holes || []).forEach(([x, y]) => body.push(`<circle cx="${x}" cy="${y}" r="5" fill="#ffffff" stroke="#999" stroke-width=".5"/>`));
  return { ...A, svg: `<svg viewBox="0 0 ${A.w} ${A.h}" style="position:absolute;inset:0;width:${A.w}mm;height:${A.h}mm"><defs>${defs.join('')}</defs>${body.join('')}</svg>` };
}
// Canvas renderer (studio). ctx is already scaled to mm.
function decorCanvas(ctx, kind, fonts) {
  const A = decorArt(kind), O = new Path2D(A.outline);
  A.layers.forEach((l) => {
    ctx.save();
    if (!l.text && !(l.d && !l.grad && !l.stroke)) ctx.clip(O);
    if (l.grad) { const g = ctx.createLinearGradient(0, 0, 0, A.h); g.addColorStop(0, l.grad[0]); g.addColorStop(1, l.grad[1]); ctx.fillStyle = g; ctx.fill(new Path2D(l.d)); }
    else if (l.edge) { ctx.strokeStyle = l.fill; ctx.lineWidth = l.edge * 2; ctx.stroke(O); }
    else if (l.circle) { ctx.fillStyle = l.fill; ctx.beginPath(); ctx.arc(l.circle[0], l.circle[1], l.circle[2], 0, Math.PI * 2); ctx.fill(); }
    else if (l.text) { const f = { 'Plus Jakarta Sans': fonts.sans, 'JetBrains Mono': fonts.mono, Newsreader: fonts.serif }[l.font] || l.font; ctx.font = `${l.italic ? 'italic ' : ''}${l.weight || 400} ${l.size}px ${f}`; ctx.fillStyle = l.fill; ctx.textAlign = { middle: 'center', end: 'right' }[l.anchor] || 'left'; if (l.ls && 'letterSpacing' in ctx) ctx.letterSpacing = l.ls + 'px'; ctx.fillText(l.text, l.x, l.y); }
    else if (l.stroke) { ctx.strokeStyle = l.stroke; ctx.lineWidth = l.sw; ctx.lineCap = l.cap || 'butt'; ctx.stroke(new Path2D(l.d)); }
    else { ctx.fillStyle = l.fill; ctx.fill(new Path2D(l.d)); }
    ctx.restore();
  });
  return A;
}
if (typeof module !== 'undefined') module.exports = { decorArt, decorSVG, decorCanvas };
