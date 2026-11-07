import type {P, PresetSpec, S, Shape} from './types';
import {C, arrow, axes, box, deg, dot, f1, f2, f3, ln, plot, poly, rad, ring, tick, txt} from './sceneKit';

// ------------------------------------------------------------------ Đường tròn lượng giác
const norm360 = (a: number) => ((a % 360) + 360) % 360;
/** Nghiệm của sin x = m trong [0°, 360°). */
export function sinSolutions(m: number): number[] {
  const a = deg(Math.asin(Math.max(-1, Math.min(1, m))));
  return [...new Set([norm360(a), norm360(180 - a)].map((v) => Math.round(v * 1e6) / 1e6))].sort((x, y) => x - y);
}

// ------------------------------------------------------------------ Giải tam giác
export interface Tri {
  a: number;
  b: number;
  c: number;
  A: number;
  B: number;
  C: number;
}
export function solveSAS(b: number, c: number, Adeg: number): Tri {
  const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad(Adeg)));
  const B = deg(Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c)))));
  return {a, b, c, A: Adeg, B, C: 180 - Adeg - B};
}
/** Trường hợp biết a, b và góc A đối diện a: 0, 1 hoặc 2 tam giác. */
export function solveSSA(a: number, b: number, Adeg: number): Tri[] {
  const h = b * Math.sin(rad(Adeg));
  if (a < h - 1e-9) return [];
  const root = Math.sqrt(Math.max(0, a * a - h * h));
  const base = b * Math.cos(rad(Adeg));
  const out: Tri[] = [];
  for (const c of root < 1e-9 ? [base] : [base + root, base - root]) {
    if (c <= 1e-9) continue;
    const t = solveSAS(b, c, Adeg);
    out.push({...t, a});
  }
  return out;
}
const heron = (t: Tri) => {
  const s = (t.a + t.b + t.c) / 2;
  return Math.sqrt(Math.max(0, s * (s - t.a) * (s - t.b) * (s - t.c)));
};

// ------------------------------------------------------------------ vectơ 2D/3D
export const dot3 = (u: number[], v: number[]) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
export const cross3 = (u: number[], v: number[]) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
export const len3 = (u: number[]) => Math.hypot(u[0], u[1], u[2]);

// ------------------------------------------------------------------ đường thẳng và đường tròn
/** Khoảng cách từ (x0,y0) đến đường thẳng Ax+By+C=0. */
export const distPointLine = (A: number, B: number, Cc: number, x0: number, y0: number) => Math.abs(A * x0 + B * y0 + Cc) / Math.hypot(A, B);

/** A = [a1; a2] (đóng), B = (b1; b2) (mở): giao A ∩ B. */
export function intersectAB(p: P): {lo: number; hi: number; lc: boolean; uc: boolean; empty: boolean} {
  const alo = Math.min(p.a1, p.a2);
  const ahi = Math.max(p.a1, p.a2);
  const blo = Math.min(p.b1, p.b2);
  const bhi = Math.max(p.b1, p.b2);
  const lo = Math.max(alo, blo);
  const hi = Math.min(ahi, bhi);
  const lc = alo > blo;
  const uc = ahi < bhi;
  return {lo, hi, lc, uc, empty: lo > hi || (lo === hi && !(lc && uc))};
}

const CX = 280;
const CY = 180;

export const TOAN_SCENE1_PRESETS: Record<string, PresetSpec> = {
  MATH_UNIT_CIRCLE: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Đường tròn lượng giác',
    question: 'Khi điểm M chạy trên đường tròn đơn vị, hoành độ và tung độ của M cho ta những giá trị lượng giác nào? Vì sao sin(π − α) = sin α còn cos(π − α) = −cos α?',
    keywords: /duong tron luong giac|gia tri luong giac cua goc|cung lien quan|phuong trinh luong giac co ban|sin x = m/,
    examples: ['đường tròn lượng giác', 'giá trị lượng giác của góc α', 'cung liên quan đặc biệt'],
    data: {
      viewBox: [560, 340],
      sliders: [
        {key: 'a', label: 'Góc α', unit: '°', min: 0, max: 360, step: 1, value: 50},
        {key: 'm', label: 'Giải sin x = m, m =', min: -1, max: 1, step: 0.05, value: 0.5},
      ],
      toggles: [
        {key: 'rel', label: 'Cung liên quan (π−α, α+π, −α)', value: true},
        {key: 'eq', label: 'Giải phương trình sin x = m', value: false},
      ],
      draw: (p) => {
        const R = 105;
        const cx = 150;
        const cy = 170;
        const a = p.a;
        const px = cx + R * Math.cos(rad(a));
        const py = cy - R * Math.sin(rad(a));
        const out: Shape[] = [ring(cx, cy, R, C.grey, 1.6), arrow(cx - R - 15, cy, cx + R + 18, cy, C.ink, 1.3), arrow(cx, cy + R + 15, cx, cy - R - 18, C.ink, 1.3)];
        out.push(txt(cx + R + 20, cy + 14, 'cos', {size: 10}), txt(cx + 14, cy - R - 20, 'sin', {size: 10}));
        // cung α
        const arcPts: [number, number][] = [];
        for (let k = 0; k <= Math.round(a); k += 2) arcPts.push([cx + 24 * Math.cos(rad(k)), cy - 24 * Math.sin(rad(k))]);
        if (arcPts.length > 1) out.push(poly(arcPts, {stroke: C.orange, close: false, w: 2.4}));
        out.push(ln(cx, cy, px, py, {stroke: C.ink, w: 1.8}), ln(px, py, px, cy, {stroke: C.blue, w: 2.4}), ln(cx, cy, px, cy, {stroke: C.red, w: 2.4}));
        out.push(dot(px, py, 5, C.orange), txt(px + (Math.cos(rad(a)) >= 0 ? 12 : -12), py - 8, 'M', {size: 12, bold: true}));
        if (p.rel === 1) {
          for (const [d, lab, col] of [[180 - a, 'π−α', C.green], [a + 180, 'α+π', C.purple], [-a, '−α', C.teal]] as [number, string, string][]) {
            const qx = cx + R * Math.cos(rad(d));
            const qy = cy - R * Math.sin(rad(d));
            out.push(ln(cx, cy, qx, qy, {stroke: col, w: 1.2, dash: '4 3'}), dot(qx, qy, 3.5, col), txt(qx + (Math.cos(rad(d)) >= 0 ? 10 : -10), qy + 4, lab, {size: 10, fill: col, anchor: Math.cos(rad(d)) >= 0 ? 'start' : 'end'}));
          }
        }
        // đồ thị sin, cos theo góc
        const gx = 330;
        const gw = 210;
        const gy = 170;
        const amp = 80;
        out.push(ln(gx, gy, gx + gw + 8, gy, {stroke: C.ink, w: 1.2}), ln(gx, gy - amp - 10, gx, gy + amp + 10, {stroke: C.ink, w: 1.2}), txt(gx + gw + 10, gy + 14, 'α°', {size: 10, anchor: 'start'}));
        for (const k of [90, 180, 270, 360]) out.push(tick(gx + (k / 360) * gw, gy + 14, String(k)));
        out.push(plot((x) => Math.sin(rad(x)), 0, 360, gx, gy, gw / 360, amp, C.blue), plot((x) => Math.cos(rad(x)), 0, 360, gx, gy, gw / 360, amp, C.red));
        const cursorX = gx + (a / 360) * gw;
        out.push(ln(cursorX, gy - amp - 6, cursorX, gy + amp + 6, {stroke: C.ink, dash: '3 3', w: 1}), dot(cursorX, gy - amp * Math.sin(rad(a)), 4, C.blue), dot(cursorX, gy - amp * Math.cos(rad(a)), 4, C.red));
        out.push(txt(gx + 40, gy - amp - 12, 'sin α', {fill: C.blue, size: 11}), txt(gx + 100, gy - amp - 12, 'cos α', {fill: C.red, size: 11}));
        if (p.eq === 1) {
          const yl = gy - amp * p.m;
          out.push(ln(gx, yl, gx + gw, yl, {stroke: C.green, w: 1.4, dash: '5 3'}), ln(cx - R, cy - R * p.m, cx + R, cy - R * p.m, {stroke: C.green, w: 1.4, dash: '5 3'}));
          for (const x of sinSolutions(p.m)) {
            out.push(dot(gx + (x / 360) * gw, yl, 4.5, C.green), dot(cx + R * Math.cos(rad(x)), cy - R * Math.sin(rad(x)), 4.5, C.green));
          }
        }
        return out;
      },
      readouts: [
        {label: 'α (rad)', value: (p) => `${f3(rad(p.a))} = ${f3(p.a / 180)}π`},
        {label: 'sin α · cos α · tan α', value: (p) => `${f3(Math.sin(rad(p.a)))} · ${f3(Math.cos(rad(p.a)))} · ${Math.abs(Math.cos(rad(p.a))) < 1e-9 ? 'không xác định' : f3(Math.tan(rad(p.a)))}`},
        {label: 'sin²α + cos²α', value: (p) => f3(Math.sin(rad(p.a)) ** 2 + Math.cos(rad(p.a)) ** 2)},
        {label: 'Nghiệm sin x = m trong [0°, 360°)', value: (p) => sinSolutions(p.m).map((x) => `${f1(x)}°`).join(' ; ')},
      ],
      note: 'M(cos α, sin α) nằm trên đường tròn đơn vị; hoành độ là cos, tung độ là sin. Đồ thị bên phải được sinh ra từ chuyển động của M.',
    },
  },

  MATH_TRIANGLE_SOLVER: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Giải tam giác (định lí sin, cos, trường hợp hai nghiệm)',
    question: 'Biết hai cạnh và một góc, khi nào có đúng một tam giác, khi nào có hai tam giác và khi nào không có tam giác nào? Định lí cosin và định lí sin dùng ở bước nào?',
    keywords: /giai tam giac|dinh li (?:cosin|sin)\b|dinh ly (?:cosin|sin)\b|cong thuc heron|truong hop mo ho|dinh ly cos\b|ssa/,
    examples: ['giải tam giác', 'định lí cosin và định lí sin', 'công thức Heron tính diện tích'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'mode', label: 'Cho biết', value: 'sas', options: [['sas', 'Hai cạnh b, c và góc A kẹp giữa'], ['ssa', 'Cạnh a, b và góc A đối diện a']]}],
      sliders: [
        {key: 'a', label: 'Cạnh a (chỉ khi cho a, b, A)', min: 1, max: 10, step: 0.1, value: 6, when: ['mode', ['ssa']]},
        {key: 'b', label: 'Cạnh b', min: 1, max: 10, step: 0.1, value: 8},
        {key: 'c', label: 'Cạnh c (chỉ khi cho b, c, A)', min: 1, max: 10, step: 0.1, value: 7, when: ['mode', ['sas']]},
        {key: 'A', label: 'Góc A', unit: '°', min: 10, max: 150, step: 1, value: 40},
      ],
      draw: (p, _t, s) => {
        const tris = s.mode === 'sas' ? [solveSAS(p.b, p.c, p.A)] : solveSSA(p.a, p.b, p.A);
        const out: Shape[] = [];
        if (tris.length === 0) return [txt(280, 150, 'Không có tam giác nào thỏa mãn', {size: 16, fill: C.red, bold: true}), txt(280, 180, `a < b·sin A = ${f2(p.b * Math.sin(rad(p.A)))}`, {size: 12})];
        const k = 34;
        const ox = 70;
        const oy = 270;
        tris.forEach((t, i) => {
          const B: [number, number] = [ox + t.c * k, oy];
          const Cc: [number, number] = [ox + t.b * Math.cos(rad(t.A)) * k, oy - t.b * Math.sin(rad(t.A)) * k];
          const col = i === 0 ? C.blue : C.red;
          out.push(poly([[ox, oy], B, Cc], {stroke: col, w: 2.2, dash: i === 1 ? '6 4' : undefined, fill: i === 0 ? 'rgba(37,99,235,0.07)' : undefined}));
          out.push(txt(ox - 12, oy + 4, 'A', {bold: true}), txt(B[0] + 12, B[1] + 4, 'B', {bold: true}), txt(Cc[0], Cc[1] - 8, 'C', {bold: true}));
          out.push(txt((B[0] + Cc[0]) / 2 + 12, (B[1] + Cc[1]) / 2, `a=${f2(t.a)}`, {size: 11, fill: col, anchor: 'start'}));
        });
        out.push(txt(ox + 4, oy + 22, `A = ${f1(p.A)}°`, {size: 11, anchor: 'start'}));
        const t0 = tris[0];
        out.push(txt(400, 60, `Tam giác ${tris.length > 1 ? '1 (nét liền)' : ''}`, {size: 12, bold: true, anchor: 'start'}), txt(400, 80, `a=${f2(t0.a)}  b=${f2(t0.b)}  c=${f2(t0.c)}`, {size: 11, anchor: 'start'}), txt(400, 98, `A=${f1(t0.A)}°  B=${f1(t0.B)}°  C=${f1(t0.C)}°`, {size: 11, anchor: 'start'}));
        if (tris[1]) out.push(txt(400, 130, 'Tam giác 2 (nét đứt)', {size: 12, bold: true, fill: C.red, anchor: 'start'}), txt(400, 150, `c=${f2(tris[1].c)}  B=${f1(tris[1].B)}°  C=${f1(tris[1].C)}°`, {size: 11, fill: C.red, anchor: 'start'}));
        return out;
      },
      readouts: [
        {label: 'Số tam giác', value: (p, _t, s) => String(s.mode === 'sas' ? 1 : solveSSA(p.a, p.b, p.A).length)},
        {label: 'Diện tích (Heron = ½bc·sin A)', value: (p, _t, s) => {
          const t = (s.mode === 'sas' ? [solveSAS(p.b, p.c, p.A)] : solveSSA(p.a, p.b, p.A))[0];
          return t ? `${f2(heron(t))} = ${f2(0.5 * t.b * t.c * Math.sin(rad(t.A)))}` : '—';
        }},
        {label: 'Bán kính ngoại tiếp R = a / (2 sin A)', value: (p, _t, s) => {
          const t = (s.mode === 'sas' ? [solveSAS(p.b, p.c, p.A)] : solveSSA(p.a, p.b, p.A))[0];
          return t ? f2(t.a / (2 * Math.sin(rad(t.A)))) : '—';
        }},
      ],
      note: 'Cho a, b, A: nếu a < b·sin A vô nghiệm; a = b·sin A một nghiệm vuông; b·sin A < a < b hai nghiệm; a ≥ b một nghiệm.',
    },
  },

  MATH_VECTOR_2D: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Vectơ trong mặt phẳng: tổng, hiệu, tích vô hướng',
    question: 'Quy tắc hình bình hành và quy tắc ba điểm cho cùng một tổng như thế nào? Tích vô hướng cho biết gì về góc giữa hai vectơ và hình chiếu của vectơ này lên vectơ kia?',
    keywords: /tong (?:va )?hieu (?:cua )?hai vecto|quy tac hinh binh hanh|tich vo huong|toa do cua vecto|hinh chieu (?:cua )?vecto|vecto trong mat phang/,
    examples: ['tổng và hiệu hai vectơ', 'tích vô hướng của hai vectơ', 'tọa độ của vectơ'],
    data: {
      viewBox: [560, 380],
      sliders: [
        {key: 'ax', label: 'a: hoành độ', min: -5, max: 5, step: 0.5, value: 3},
        {key: 'ay', label: 'a: tung độ', min: -5, max: 5, step: 0.5, value: 1},
        {key: 'bx', label: 'b: hoành độ', min: -5, max: 5, step: 0.5, value: 1},
        {key: 'by', label: 'b: tung độ', min: -5, max: 5, step: 0.5, value: 3},
      ],
      toggles: [
        {key: 'sum', label: 'Tổng a + b', value: true},
        {key: 'diff', label: 'Hiệu a − b', value: false},
        {key: 'proj', label: 'Hình chiếu của b lên a', value: false},
      ],
      draw: (p) => {
        const k = 32;
        const ox = 270;
        const oy = 200;
        const X = (x: number) => ox + x * k;
        const Y = (y: number) => oy - y * k;
        const out: Shape[] = [...axes(ox, oy, -6.5, 6.5, -5.5, 5.5, k, k)];
        if (p.sum === 1) out.push(ln(X(p.ax), Y(p.ay), X(p.ax + p.bx), Y(p.ay + p.by), {stroke: C.grey, dash: '4 3', w: 1.2}), ln(X(p.bx), Y(p.by), X(p.ax + p.bx), Y(p.ay + p.by), {stroke: C.grey, dash: '4 3', w: 1.2}), arrow(X(0), Y(0), X(p.ax + p.bx), Y(p.ay + p.by), C.green, 2.8));
        if (p.diff === 1) out.push(arrow(X(p.bx), Y(p.by), X(p.ax), Y(p.ay), C.purple, 2.4));
        if (p.proj === 1) {
          const la = Math.hypot(p.ax, p.ay);
          if (la > 0) {
            const s = (p.ax * p.bx + p.ay * p.by) / (la * la);
            out.push(ln(X(p.bx), Y(p.by), X(s * p.ax), Y(s * p.ay), {stroke: C.orange, dash: '4 3', w: 1.4}), arrow(X(0), Y(0), X(s * p.ax), Y(s * p.ay), C.orange, 3.4));
          }
        }
        out.push(arrow(X(0), Y(0), X(p.ax), Y(p.ay), C.blue), arrow(X(0), Y(0), X(p.bx), Y(p.by), C.red), txt(X(p.ax) + 10, Y(p.ay) - 6, 'a', {fill: C.blue, bold: true, size: 14}), txt(X(p.bx) + 10, Y(p.by) - 6, 'b', {fill: C.red, bold: true, size: 14}));
        return out;
      },
      readouts: [
        {label: '|a| · |b|', value: (p) => `${f2(Math.hypot(p.ax, p.ay))} · ${f2(Math.hypot(p.bx, p.by))}`},
        {label: 'a·b = a₁b₁ + a₂b₂', value: (p) => f2(p.ax * p.bx + p.ay * p.by)},
        {label: 'Góc (a, b)', value: (p) => {
          const m = Math.hypot(p.ax, p.ay) * Math.hypot(p.bx, p.by);
          return m === 0 ? 'không xác định' : `${f1(deg(Math.acos(Math.max(-1, Math.min(1, (p.ax * p.bx + p.ay * p.by) / m)))))}°`;
        }},
        {label: 'a + b · a − b', value: (p) => `(${f1(p.ax + p.bx)}; ${f1(p.ay + p.by)}) · (${f1(p.ax - p.bx)}; ${f1(p.ay - p.by)})`},
      ],
      note: 'a·b = |a|·|b|·cos(a, b): tích vô hướng bằng 0 khi hai vectơ vuông góc, dương khi góc nhọn, âm khi góc tù.',
    },
  },

  MATH_VECTOR_3D: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Vectơ trong không gian Oxyz: tích có hướng',
    question: 'Tích có hướng của hai vectơ cho vectơ có phương và độ dài như thế nào? Vì sao độ dài của nó bằng diện tích hình bình hành dựng trên hai vectơ?',
    keywords: /tich co huong|vecto trong khong gian|he truc (?:toa do )?oxyz|toa do (?:cua )?vecto trong khong gian/,
    examples: ['tích có hướng của hai vectơ', 'tích có hướng và diện tích hình bình hành'],
    data: {
      viewBox: [560, 380],
      sliders: [
        {key: 'ax', label: 'a: x', min: -4, max: 4, step: 1, value: 2},
        {key: 'ay', label: 'a: y', min: -4, max: 4, step: 1, value: 0},
        {key: 'az', label: 'a: z', min: -4, max: 4, step: 1, value: 1},
        {key: 'bx', label: 'b: x', min: -4, max: 4, step: 1, value: 0},
        {key: 'by', label: 'b: y', min: -4, max: 4, step: 1, value: 2},
        {key: 'bz', label: 'b: z', min: -4, max: 4, step: 1, value: 1},
      ],
      toggles: [{key: 'cross', label: 'Tích có hướng [a, b]', value: true}],
      draw: (p) => {
        const k = 30;
        const ox = 250;
        const oy = 230;
        const P3 = (v: number[]): [number, number] => [ox + k * (v[1] - 0.5 * v[0]), oy - k * (v[2] - 0.5 * v[0])];
        const a = [p.ax, p.ay, p.az];
        const b = [p.bx, p.by, p.bz];
        const c = cross3(a, b);
        const out: Shape[] = [];
        for (const [v, n] of [[[5, 0, 0], 'x'], [[0, 5, 0], 'y'], [[0, 0, 5], 'z']] as [number[], string][]) {
          const q = P3(v);
          out.push(arrow(ox, oy, q[0], q[1], C.grey, 1.3), txt(q[0] + 8, q[1] + 4, n, {size: 12, bold: true, fill: C.grey}));
        }
        const pa = P3(a);
        const pb = P3(b);
        const pab = P3([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
        out.push(poly([[ox, oy], pa, pab, pb], {fill: 'rgba(124,58,237,0.12)', stroke: C.purple, w: 1, dash: '4 3'}));
        out.push(arrow(ox, oy, pa[0], pa[1], C.blue), arrow(ox, oy, pb[0], pb[1], C.red), txt(pa[0] + 8, pa[1] - 6, 'a', {fill: C.blue, bold: true, size: 14}), txt(pb[0] + 8, pb[1] - 6, 'b', {fill: C.red, bold: true, size: 14}));
        if (p.cross === 1 && len3(c) > 0) {
          const pc = P3(c);
          out.push(arrow(ox, oy, pc[0], pc[1], C.green, 3), txt(pc[0] + 8, pc[1] - 6, '[a,b]', {fill: C.green, bold: true, size: 13}));
        }
        return out;
      },
      readouts: [
        {label: 'a·b', value: (p) => f1(dot3([p.ax, p.ay, p.az], [p.bx, p.by, p.bz]))},
        {label: '[a, b]', value: (p) => `(${cross3([p.ax, p.ay, p.az], [p.bx, p.by, p.bz]).map((v) => f1(v)).join('; ')})`},
        {label: 'Diện tích hình bình hành = |[a, b]|', value: (p) => f2(len3(cross3([p.ax, p.ay, p.az], [p.bx, p.by, p.bz])))},
        {label: 'Góc (a, b)', value: (p) => {
          const m = len3([p.ax, p.ay, p.az]) * len3([p.bx, p.by, p.bz]);
          return m === 0 ? 'không xác định' : `${f1(deg(Math.acos(Math.max(-1, Math.min(1, dot3([p.ax, p.ay, p.az], [p.bx, p.by, p.bz]) / m)))))}°`;
        }},
      ],
      note: '[a, b] vuông góc với cả a và b, hướng theo quy tắc bàn tay phải; |[a, b]| = |a|·|b|·sin(a, b).',
    },
  },

  MATH_ANALYTIC_LINE_CIRCLE: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Đường thẳng và đường tròn trong mặt phẳng Oxy',
    question: 'Khoảng cách từ tâm đến đường thẳng so với bán kính cho biết đường thẳng cắt, tiếp xúc hay không cắt đường tròn như thế nào? Dây cung có độ dài bao nhiêu?',
    keywords: /vi tri tuong doi (?:cua )?duong thang va duong tron|khoang cach tu diem den duong thang|phuong trinh duong tron|tiep tuyen cua duong tron|phuong trinh tong quat cua duong thang/,
    examples: ['vị trí tương đối của đường thẳng và đường tròn', 'khoảng cách từ điểm đến đường thẳng', 'phương trình đường tròn'],
    data: {
      viewBox: [560, 360],
      sliders: [
        {key: 'A', label: 'Đường thẳng Ax+By+C=0: A', min: -4, max: 4, step: 0.5, value: 1},
        {key: 'B', label: 'B', min: -4, max: 4, step: 0.5, value: 1},
        {key: 'Cc', label: 'C', min: -10, max: 10, step: 0.5, value: -2},
        {key: 'a', label: 'Tâm I: hoành độ', min: -5, max: 5, step: 0.5, value: 1},
        {key: 'b', label: 'Tâm I: tung độ', min: -4, max: 4, step: 0.5, value: 1},
        {key: 'R', label: 'Bán kính R', min: 0.5, max: 5, step: 0.1, value: 2},
      ],
      draw: (p) => {
        const k = 28;
        const X = (x: number) => CX + x * k;
        const Y = (y: number) => CY - y * k;
        const out: Shape[] = [...axes(CX, CY, -9.5, 9.5, -6, 6, k, k, true)];
        out.push(ring(X(p.a), Y(p.b), p.R * k, C.blue, 2.4), dot(X(p.a), Y(p.b), 3.5, C.blue), txt(X(p.a) + 8, Y(p.b) - 6, 'I', {fill: C.blue, bold: true}));
        const n = Math.hypot(p.A, p.B);
        if (n === 0) return out;
        const d = distPointLine(p.A, p.B, p.Cc, p.a, p.b);
        if (Math.abs(p.B) > 1e-9) out.push(ln(X(-9.5), Y((-p.Cc + p.A * 9.5) / p.B), X(9.5), Y((-p.Cc - p.A * 9.5) / p.B), {stroke: C.red, w: 2.2}));
        else out.push(ln(X(-p.Cc / p.A), Y(-6), X(-p.Cc / p.A), Y(6), {stroke: C.red, w: 2.2}));
        // chân đường vuông góc
        const sgn = (p.A * p.a + p.B * p.b + p.Cc) / (n * n);
        const hx = p.a - p.A * sgn;
        const hy = p.b - p.B * sgn;
        out.push(ln(X(p.a), Y(p.b), X(hx), Y(hy), {stroke: C.green, dash: '4 3', w: 1.6}), dot(X(hx), Y(hy), 3.5, C.green));
        if (d < p.R - 1e-9) {
          const half = Math.sqrt(p.R * p.R - d * d);
          const ux = -p.B / n;
          const uy = p.A / n;
          for (const sg of [1, -1]) out.push(dot(X(hx + sg * half * ux), Y(hy + sg * half * uy), 4.5, C.orange));
        } else if (Math.abs(d - p.R) < 1e-9) out.push(dot(X(hx), Y(hy), 5.5, C.orange));
        return out;
      },
      readouts: [
        {label: 'Khoảng cách d(I, đường thẳng)', value: (p) => (Math.hypot(p.A, p.B) === 0 ? 'A, B không đồng thời bằng 0' : f2(distPointLine(p.A, p.B, p.Cc, p.a, p.b)))},
        {label: 'Vị trí tương đối', value: (p) => {
          if (Math.hypot(p.A, p.B) === 0) return '—';
          const d = distPointLine(p.A, p.B, p.Cc, p.a, p.b);
          return Math.abs(d - p.R) < 1e-9 ? 'tiếp xúc (d = R)' : d < p.R ? 'cắt tại hai điểm (d < R)' : 'không có điểm chung (d > R)';
        }},
        {label: 'Độ dài dây cung', value: (p) => {
          if (Math.hypot(p.A, p.B) === 0) return '—';
          const d = distPointLine(p.A, p.B, p.Cc, p.a, p.b);
          return d <= p.R ? f2(2 * Math.sqrt(p.R * p.R - d * d)) : '0';
        }},
        {label: 'Phương trình đường tròn', value: (p) => `(x ${p.a >= 0 ? '−' : '+'} ${f1(Math.abs(p.a))})² + (y ${p.b >= 0 ? '−' : '+'} ${f1(Math.abs(p.b))})² = ${f2(p.R * p.R)}`},
      ],
      note: 'd(I, Δ) = |A·a + B·b + C| / √(A² + B²). So sánh d với R: d < R cắt, d = R tiếp xúc, d > R không giao.',
    },
  },

  MATH_CONIC_LAB: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Ba đường conic: elip, hypebol, parabol',
    question: 'Tổng (hiệu) khoảng cách từ một điểm của elip (hypebol) đến hai tiêu điểm vì sao không đổi? Parabol là tập điểm cách đều tiêu điểm và đường chuẩn nghĩa là gì?',
    keywords: /\belip\b|ellipse|hypebol\b|hyperbol\b|parabol (?:co )?tieu diem|duong chuan|duong conic|\bconic\b/,
    examples: ['elip và tiêu điểm', 'hypebol', 'parabol tiêu điểm đường chuẩn', 'đường conic'],
    data: {
      viewBox: [560, 360],
      choices: [{key: 'kind', label: 'Đường conic', value: 'ellipse', options: [['ellipse', 'Elip'], ['hyperbola', 'Hypebol'], ['parabola', 'Parabol']]}],
      sliders: [
        {key: 'a', label: 'a (nửa trục lớn / thực)', min: 2, max: 8, step: 0.5, value: 6},
        {key: 'b', label: 'b (nửa trục bé / ảo)', min: 1, max: 7, step: 0.5, value: 4},
        {key: 'pp', label: 'p (tham số tiêu parabol)', min: 1, max: 6, step: 0.5, value: 3},
        {key: 't', label: 'Vị trí điểm M', min: -2.5, max: 2.5, step: 0.05, value: 0.9},
      ],
      draw: (p, _t, s) => {
        const k = 22;
        const X = (x: number) => CX + x * k;
        const Y = (y: number) => CY - y * k;
        const out: Shape[] = [...axes(CX, CY, -11, 11, -7.5, 7.5, k, k, false)];
        if (s.kind === 'ellipse') {
          const a = Math.max(p.a, p.b);
          const b = Math.min(p.a, p.b);
          const c = Math.sqrt(a * a - b * b);
          const pts: [number, number][] = [];
          for (let i = 0; i <= 120; i++) pts.push([X(a * Math.cos((i / 120) * 2 * Math.PI)), Y(b * Math.sin((i / 120) * 2 * Math.PI))]);
          out.push(poly(pts, {stroke: C.blue, w: 2.4}));
          const M: [number, number] = [a * Math.cos(p.t * 1.2), b * Math.sin(p.t * 1.2)];
          out.push(ln(X(-c), Y(0), X(M[0]), Y(M[1]), {stroke: C.red, w: 1.6}), ln(X(c), Y(0), X(M[0]), Y(M[1]), {stroke: C.green, w: 1.6}), dot(X(-c), Y(0), 4, C.ink), dot(X(c), Y(0), 4, C.ink), dot(X(M[0]), Y(M[1]), 5.5, C.orange), txt(X(-c), Y(0) + 16, 'F₁'), txt(X(c), Y(0) + 16, 'F₂'), txt(X(M[0]) + 10, Y(M[1]) - 8, 'M', {bold: true}));
        } else if (s.kind === 'hyperbola') {
          const c = Math.sqrt(p.a * p.a + p.b * p.b);
          for (const sg of [1, -1]) {
            const pts: [number, number][] = [];
            for (let i = -40; i <= 40; i++) pts.push([X(sg * p.a * Math.cosh(i / 16)), Y(p.b * Math.sinh(i / 16))]);
            out.push(poly(pts, {stroke: C.blue, w: 2.4, close: false}));
          }
          out.push(ln(X(-11), Y((-11 * p.b) / p.a), X(11), Y((11 * p.b) / p.a), {stroke: C.grey, dash: '5 4', w: 1}), ln(X(-11), Y((11 * p.b) / p.a), X(11), Y((-11 * p.b) / p.a), {stroke: C.grey, dash: '5 4', w: 1}));
          const M: [number, number] = [p.a * Math.cosh(p.t), p.b * Math.sinh(p.t)];
          out.push(ln(X(-c), Y(0), X(M[0]), Y(M[1]), {stroke: C.red, w: 1.6}), ln(X(c), Y(0), X(M[0]), Y(M[1]), {stroke: C.green, w: 1.6}), dot(X(-c), Y(0), 4, C.ink), dot(X(c), Y(0), 4, C.ink), dot(X(M[0]), Y(M[1]), 5.5, C.orange), txt(X(-c), Y(0) + 16, 'F₁'), txt(X(c), Y(0) + 16, 'F₂'));
        } else {
          const pts: [number, number][] = [];
          for (let i = -50; i <= 50; i++) pts.push([X((i / 8) ** 2 / (2 * p.pp)), Y(i / 8)]);
          out.push(poly(pts, {stroke: C.blue, w: 2.4, close: false}), ln(X(-p.pp / 2), Y(-7.5), X(-p.pp / 2), Y(7.5), {stroke: C.purple, dash: '5 4', w: 1.6}), dot(X(p.pp / 2), Y(0), 4, C.ink), txt(X(p.pp / 2), Y(0) + 16, 'F'), txt(X(-p.pp / 2) - 6, Y(7), 'Δ', {fill: C.purple, bold: true}));
          const y = p.t * 2.4;
          const x = y * y / (2 * p.pp);
          out.push(ln(X(p.pp / 2), Y(0), X(x), Y(y), {stroke: C.red, w: 1.6}), ln(X(x), Y(y), X(-p.pp / 2), Y(y), {stroke: C.green, w: 1.6}), dot(X(x), Y(y), 5.5, C.orange));
        }
        return out;
      },
      readouts: [
        {label: 'Tiêu cự 2c · tâm sai e', value: (p, _t, s) => {
          if (s.kind === 'ellipse') {
            const a = Math.max(p.a, p.b);
            const c = Math.sqrt(a * a - Math.min(p.a, p.b) ** 2);
            return `${f2(2 * c)} · ${f2(c / a)}`;
          }
          if (s.kind === 'hyperbola') {
            const c = Math.sqrt(p.a * p.a + p.b * p.b);
            return `${f2(2 * c)} · ${f2(c / p.a)}`;
          }
          return `p = ${f1(p.pp)} · e = 1`;
        }},
        {label: 'Tính chất của M', value: (p, _t, s) => {
          if (s.kind === 'ellipse') {
            const a = Math.max(p.a, p.b);
            const b = Math.min(p.a, p.b);
            const c = Math.sqrt(a * a - b * b);
            const M = [a * Math.cos(p.t * 1.2), b * Math.sin(p.t * 1.2)];
            const d1 = Math.hypot(M[0] + c, M[1]);
            const d2 = Math.hypot(M[0] - c, M[1]);
            return `MF₁ + MF₂ = ${f2(d1 + d2)} = 2a = ${f2(2 * a)}`;
          }
          if (s.kind === 'hyperbola') {
            const c = Math.sqrt(p.a * p.a + p.b * p.b);
            const M = [p.a * Math.cosh(p.t), p.b * Math.sinh(p.t)];
            return `|MF₁ − MF₂| = ${f2(Math.abs(Math.hypot(M[0] + c, M[1]) - Math.hypot(M[0] - c, M[1])))} = 2a = ${f2(2 * p.a)}`;
          }
          const y = p.t * 2.4;
          const x = (y * y) / (2 * p.pp);
          return `MF = ${f2(Math.hypot(x - p.pp / 2, y))} = d(M, Δ) = ${f2(x + p.pp / 2)}`;
        }},
      ],
      note: 'Elip: MF₁ + MF₂ = 2a. Hypebol: |MF₁ − MF₂| = 2a. Parabol y² = 2px: MF = d(M, đường chuẩn x = −p/2).',
    },
  },

  MATH_SET_LOGIC: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Tập hợp, biểu đồ Venn, khoảng trên trục số và bảng chân trị',
    question: 'Số phần tử của hợp hai tập hợp tính thế nào khi hai tập có phần chung? Hợp, giao của hai khoảng trên trục số và mệnh đề kéo theo P ⇒ Q đúng, sai khi nào?',
    keywords: /bieu do venn|\bvenn\b|hop (?:va )?giao cua hai tap hop|phan bu cua tap hop|menh de keo theo|bang chan tri|tap hop con|khoang tren truc so|giao (?:cua )?hai khoang/,
    examples: ['biểu đồ Venn', 'hợp và giao của hai tập hợp', 'bảng chân trị mệnh đề kéo theo', 'giao hai khoảng trên trục số'],
    data: {
      viewBox: [560, 380],
      choices: [{key: 'region', label: 'Tô miền', value: 'union', options: [['union', 'A ∪ B'], ['inter', 'A ∩ B'], ['aminus', 'A \\ B'], ['bminus', 'B \\ A'], ['comp', 'Phần bù của A ∪ B'], ['sym', 'Hiệu đối xứng']]}],
      sliders: [
        {key: 'nA', label: 'n(A)', min: 0, max: 30, step: 1, value: 14},
        {key: 'nB', label: 'n(B)', min: 0, max: 30, step: 1, value: 11},
        {key: 'nAB', label: 'n(A ∩ B)', min: 0, max: 30, step: 1, value: 5},
        {key: 'a1', label: 'A = [a₁; a₂]: a₁', min: -6, max: 6, step: 1, value: -2},
        {key: 'a2', label: 'a₂', min: -6, max: 6, step: 1, value: 3},
        {key: 'b1', label: 'B = (b₁; b₂): b₁', min: -6, max: 6, step: 1, value: 1},
        {key: 'b2', label: 'b₂', min: -6, max: 6, step: 1, value: 5},
      ],
      draw: (p, _t, s) => {
        const out: Shape[] = [];
        const r = 78;
        const ya = 110;
        const xa = 120;
        const xb = 210;
        const hy = Math.sqrt(r * r - 45 * 45);
        const lens = `M${(xa + xb) / 2} ${ya - hy} A${r} ${r} 0 0 1 ${(xa + xb) / 2} ${ya + hy} A${r} ${r} 0 0 1 ${(xa + xb) / 2} ${ya - hy} Z`;
        const hi = 'rgba(37,99,235,0.45)';
        const white = '#FFFFFF';
        const reg = s.region;
        if (reg === 'comp') out.push(box(20, 15, 290, 190, hi, 'none'), {t: 'circle', cx: xa, cy: ya, r, fill: white}, {t: 'circle', cx: xb, cy: ya, r, fill: white});
        if (reg === 'union' || reg === 'sym') out.push({t: 'circle', cx: xa, cy: ya, r, fill: hi}, {t: 'circle', cx: xb, cy: ya, r, fill: hi});
        if (reg === 'aminus') out.push({t: 'circle', cx: xa, cy: ya, r, fill: hi});
        if (reg === 'bminus') out.push({t: 'circle', cx: xb, cy: ya, r, fill: hi});
        if (reg === 'inter') out.push({t: 'path', d: lens, fill: hi});
        if (reg === 'aminus' || reg === 'bminus' || reg === 'sym') out.push({t: 'path', d: lens, fill: white});
        out.push(box(20, 15, 290, 190, undefined, C.grey), ring(xa, ya, r, C.blue, 2), ring(xb, ya, r, C.red, 2), txt(xa - 40, ya - 6, 'A', {bold: true, size: 16, fill: C.blue}), txt(xb + 40, ya - 6, 'B', {bold: true, size: 16, fill: C.red}));
        out.push(txt(xa - 40, ya + 14, String(Math.max(0, p.nA - p.nAB)), {size: 14}), txt((xa + xb) / 2, ya + 5, String(p.nAB), {size: 14, bold: true}), txt(xb + 40, ya + 14, String(Math.max(0, p.nB - p.nAB)), {size: 14}));
        // bảng chân trị
        const tx = 340;
        out.push(txt(tx + 100, 28, 'Bảng chân trị', {bold: true, size: 12}));
        const heads = ['P', 'Q', 'P∧Q', 'P∨Q', 'P⇒Q', 'P⇔Q'];
        heads.forEach((h, i) => out.push(txt(tx + 14 + i * 36, 52, h, {size: 11, bold: true})));
        const rows: [boolean, boolean][] = [[true, true], [true, false], [false, true], [false, false]];
        rows.forEach(([P1, Q1], j) => {
          [P1, Q1, P1 && Q1, P1 || Q1, !P1 || Q1, P1 === Q1].forEach((v, i) => out.push(txt(tx + 14 + i * 36, 74 + j * 22, v ? 'Đ' : 'S', {size: 12, fill: v ? C.green : C.red, bold: i === 4})));
        });
        // trục số
        const ox = 280;
        const k = 360 / 14;
        const X = (x: number) => ox + (x - 0.5) * k;
        const ny = 270;
        out.push(arrow(60, ny, 520, ny, C.ink, 1.4));
        for (let x = -6; x <= 6; x++) out.push(ln(X(x), ny - 3, X(x), ny + 3, {stroke: C.ink, w: 1}), tick(X(x), ny + 16, String(x)));
        const lo = Math.min(p.a1, p.a2);
        const hi2 = Math.max(p.a1, p.a2);
        const blo = Math.min(p.b1, p.b2);
        const bhi = Math.max(p.b1, p.b2);
        out.push(ln(X(lo), ny - 14, X(hi2), ny - 14, {stroke: C.blue, w: 5}), dot(X(lo), ny - 14, 5, C.blue), dot(X(hi2), ny - 14, 5, C.blue), txt(X(lo) - 6, ny - 24, 'A', {fill: C.blue, bold: true}));
        out.push(ln(X(blo), ny - 32, X(bhi), ny - 32, {stroke: C.red, w: 5}), ring(X(blo), ny - 32, 5, C.red, 2), ring(X(bhi), ny - 32, 5, C.red, 2), txt(X(blo) - 6, ny - 42, 'B', {fill: C.red, bold: true}));
        const ix = intersectAB(p);
        if (!ix.empty) out.push(ln(X(ix.lo), ny - 50, X(ix.hi), ny - 50, {stroke: C.green, w: 5}), txt(X(ix.lo) - 10, ny - 60, 'A ∩ B', {fill: C.green, bold: true, size: 11}));
        return out;
      },
      readouts: [
        {label: 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B)', value: (p) => (p.nAB > Math.min(p.nA, p.nB) ? 'n(A ∩ B) không thể lớn hơn n(A), n(B)' : String(p.nA + p.nB - p.nAB))},
        {label: 'A ∩ B trên trục số (A = [a₁; a₂], B = (b₁; b₂))', value: (p) => {
          const x = intersectAB(p);
          return x.empty ? '∅' : `${x.lc ? '[' : '('}${x.lo}; ${x.hi}${x.uc ? ']' : ')'}`;
        }},
      ],
      note: 'P ⇒ Q chỉ sai khi P đúng mà Q sai. Số phần tử ghi trong các miền Venn: chỉ A, giao, chỉ B.',
    },
  },
};
