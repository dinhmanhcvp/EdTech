import type {P, PresetSpec, Shape} from './types';
import {C, arrow, box, deg, dot, f1, f2, f3, ln, miniGraph, poly, rad, ring, seeded, gauss, tick, txt} from './sceneKit';

// ------------------------------------------------------------------ công thức (xuất để kiểm thử)
export const K_COULOMB = 9e9;
/** Lực Coulomb giữa hai điện tích (µC) cách nhau d (m): dương = đẩy. */
export const coulomb = (q1uC: number, q2uC: number, d: number) => (K_COULOMB * q1uC * 1e-6 * q2uC * 1e-6) / (d * d);
export function circuit(mode: string, E: number, r: number, R1: number, R2: number) {
  const Rn = mode === 'parallel' ? (R1 * R2) / (R1 + R2) : R1 + R2;
  const I = E / (Rn + r);
  const U = E - I * r;
  return {Rn, I, U, P: U * I, H: U / E};
}
export const lorentzRadius = (vMs: number, BT: number) => (9.109e-31 * vMs) / (1.602e-19 * BT);
export const lorentzPeriod = (BT: number) => (2 * Math.PI * 9.109e-31) / (1.602e-19 * BT);
export const wireField = (I: number, rM: number) => (4e-7 * Math.PI * I) / (2 * Math.PI * rM);
export const wireForcePerLength = (I1: number, I2: number, dM: number) => (4e-7 * Math.PI * I1 * I2) / (2 * Math.PI * dM);
export const emfPeak = (N: number, B: number, Scm2: number, f: number) => N * B * (Scm2 * 1e-4) * 2 * Math.PI * f;
/** Khoảng cách tiếp cận gần nhất (fm) của hạt α động năng E (MeV) tới hạt nhân Z. */
export const closestApproach = (Z: number, EMeV: number) => (1.44 * 2 * Z) / EMeV;
/** Góc tán xạ Rutherford (độ) với tham số va chạm b (fm). */
export const scatterAngle = (d0: number, b: number) => 2 * deg(Math.atan(d0 / (2 * b)));
export const chainPopulation = (k: number, g: number) => Math.pow(k, g);
export const effectiveK = (k0: number, rodPct: number) => k0 * (1 - 0.5 * (rodPct / 100));
export const criticalRod = (k0: number) => Math.max(0, Math.min(100, ((1 - 1 / k0) / 0.5) * 100));
export const idealGasPressure = (N: number, T: number, V: number) => (N * T) / V;
export const vRmsN2 = (T: number) => Math.sqrt((3 * 8.314 * T) / 0.028);

/** Tích phân quỹ đạo hạt α trong trường Coulomb (đơn vị fm, tốc độ ban đầu 1). */
export function alphaPath(d0: number, b: number, steps = 1400): [number, number][] {
  let x = -150;
  let y = b;
  let vx = 1;
  let vy = 0;
  const dt = 0.25;
  const out: [number, number][] = [[x, y]];
  for (let i = 0; i < steps; i++) {
    const r2 = x * x + y * y;
    const r = Math.sqrt(r2);
    if (r < 1.5) break;
    const a = d0 / (2 * r2);
    vx += (a * x) / r * dt;
    vy += (a * y) / r * dt;
    x += vx * dt;
    y += vy * dt;
    if (i % 4 === 0) out.push([x, y]);
    if (Math.abs(x) > 160 || Math.abs(y) > 160) break;
  }
  return out;
}

/** Đường sức điện: xuất phát quanh các điện tích dương (hoặc âm nếu không có dương) bằng bước nhỏ. */
export function fieldLines(charges: {x: number; y: number; q: number}[], bounds: [number, number, number, number], perCharge = 12): [number, number][][] {
  const E = (x: number, y: number): [number, number] => {
    let ex = 0;
    let ey = 0;
    for (const c of charges) {
      const dx = x - c.x;
      const dy = y - c.y;
      const r2 = dx * dx + dy * dy + 1;
      const r = Math.sqrt(r2);
      ex += (c.q * dx) / (r2 * r);
      ey += (c.q * dy) / (r2 * r);
    }
    return [ex, ey];
  };
  const pos = charges.filter((c) => c.q > 0);
  const sources = pos.length ? pos : charges.filter((c) => c.q < 0);
  const sign = pos.length ? 1 : -1;
  const lines: [number, number][][] = [];
  for (const c of sources) {
    const n = Math.max(4, Math.round(perCharge * (Math.abs(c.q) / 3 + 0.5)));
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n + 0.01;
      let x = c.x + 10 * Math.cos(a);
      let y = c.y + 10 * Math.sin(a);
      const pts: [number, number][] = [[x, y]];
      for (let s = 0; s < 500; s++) {
        const [ex, ey] = E(x, y);
        const m = Math.hypot(ex, ey) || 1;
        x += (sign * 4 * ex) / m;
        y += (sign * 4 * ey) / m;
        pts.push([x, y]);
        if (x < bounds[0] || x > bounds[2] || y < bounds[1] || y > bounds[3]) break;
        if (charges.some((o) => o !== c && o.q * sign < 0 && Math.hypot(x - o.x, y - o.y) < 9)) break;
      }
      lines.push(pts);
    }
  }
  return lines;
}

/** Vị trí phản xạ qua hai thành của hộp [0, W] sau quãng đường s. */
export const bounce = (s: number, W: number) => {
  const m = ((s % (2 * W)) + 2 * W) % (2 * W);
  return m <= W ? m : 2 * W - m;
};

const loopPoint = (pts: [number, number][], u: number): [number, number] => {
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let d = (((u % 1) + 1) % 1) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) return [pts[i][0] + ((pts[i + 1][0] - pts[i][0]) * d) / lens[i], pts[i][1] + ((pts[i + 1][1] - pts[i][1]) * d) / lens[i]];
    d -= lens[i];
  }
  return pts[0];
};

export const LY_SCENE2_PRESETS: Record<string, PresetSpec> = {
  PHYS_ELECTRIC_FIELD: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Điện trường, đường sức và định luật Coulomb',
    question: 'Đường sức điện xuất phát từ điện tích nào và kết thúc ở đâu? Lực Coulomb giữa hai điện tích thay đổi thế nào khi khoảng cách tăng gấp đôi?',
    keywords: /dinh luat coulomb|\bcoulomb\b|duong suc dien|dien truong deu|cuong do dien truong|dien tich diem|luc tuong tac tinh dien/,
    examples: ['định luật Coulomb', 'đường sức điện', 'cường độ điện trường', 'điện tích điểm'],
    data: {
      viewBox: [560, 320],
      sliders: [
        {key: 'q1', label: 'Điện tích q₁', unit: 'µC', min: -5, max: 5, step: 1, value: 3},
        {key: 'q2', label: 'Điện tích q₂', unit: 'µC', min: -5, max: 5, step: 1, value: -3},
        {key: 'd', label: 'Khoảng cách', unit: 'm', min: 0.2, max: 1, step: 0.05, value: 0.5},
      ],
      draw: (p) => {
        const half = 25 + p.d * 220;
        const cs = [{x: 280 - half, y: 160, q: p.q1}, {x: 280 + half, y: 160, q: p.q2}].filter((c) => c.q !== 0);
        const out: Shape[] = [];
        for (const pts of fieldLines(cs, [10, 10, 550, 310], 12)) out.push(poly(pts, {stroke: '#7C93C9', w: 1.2, close: false}));
        for (const c of [{x: 280 - half, q: p.q1}, {x: 280 + half, q: p.q2}]) out.push(dot(c.x, 160, 14, c.q > 0 ? C.red : c.q < 0 ? C.blue : C.grey), txt(c.x, 165, c.q > 0 ? '+' : c.q < 0 ? '−' : '0', {fill: '#fff', size: 16, bold: true}));
        return out;
      },
      readouts: [
        {label: 'Lực Coulomb F = k|q₁q₂|/r²', value: (p) => `${f2(Math.abs(coulomb(p.q1, p.q2, p.d)))} N`},
        {label: 'Tương tác', value: (p) => (p.q1 * p.q2 > 0 ? 'đẩy nhau (cùng dấu)' : p.q1 * p.q2 < 0 ? 'hút nhau (trái dấu)' : 'không tương tác')},
        {label: 'Khi khoảng cách tăng gấp đôi lực còn', value: (p) => `${f3(Math.abs(coulomb(p.q1, p.q2, 2 * p.d)))} N (giảm 4 lần)`},
      ],
      note: 'Đường sức đi ra từ điện tích dương, đi vào điện tích âm, không cắt nhau; chỗ đường sức dày điện trường mạnh.',
    },
  },

  PHYS_DC_CIRCUIT: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Mạch điện một chiều: định luật Ohm cho toàn mạch',
    question: 'Hiệu điện thế giữa hai cực nguồn giảm thế nào khi dòng điện tăng? Điện trở ngoài bằng bao nhiêu thì công suất tiêu thụ lớn nhất?',
    keywords: /dinh luat ohm|ohm cho toan mach|suat dien dong|dien tro trong cua nguon|mach noi tiep|mach song song|cong suat tieu thu|hieu suat cua nguon/,
    examples: ['định luật Ohm cho toàn mạch', 'suất điện động và điện trở trong', 'mạch nối tiếp và song song'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'mode', label: 'Mắc điện trở', value: 'series', options: [['series', 'Nối tiếp'], ['parallel', 'Song song']]}],
      sliders: [
        {key: 'E', label: 'Suất điện động E', unit: 'V', min: 1, max: 24, step: 0.5, value: 12},
        {key: 'r', label: 'Điện trở trong r', unit: 'Ω', min: 0, max: 5, step: 0.1, value: 1},
        {key: 'R1', label: 'R₁', unit: 'Ω', min: 1, max: 50, step: 1, value: 10},
        {key: 'R2', label: 'R₂', unit: 'Ω', min: 1, max: 50, step: 1, value: 20},
      ],
      time: {max: 10, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t, s) => {
        const c = circuit(s.mode, p.E, p.r, p.R1, p.R2);
        const loop: [number, number][] = [[60, 80], [300, 80], [300, 240], [60, 240], [60, 80]];
        const out: Shape[] = [poly(loop, {stroke: C.ink, w: 2, close: false}), box(40, 140, 40, 40, '#FFFFFF', C.ink), txt(60, 165, 'E, r', {size: 12, bold: true})];
        if (s.mode === 'series') out.push(box(120, 68, 50, 24, C.blue), box(200, 68, 50, 24, C.orange), txt(145, 84, 'R₁', {fill: '#fff'}), txt(225, 84, 'R₂', {fill: '#fff'}));
        else out.push(ln(300, 130, 300, 190, {stroke: C.ink, w: 2}), box(284, 100, 32, 20, C.blue), box(284, 200, 32, 20, C.orange), txt(300, 115, 'R₁', {fill: '#fff', size: 10}), txt(300, 215, 'R₂', {fill: '#fff', size: 10}));
        for (let i = 0; i < 14; i++) {
          const [x, y] = loopPoint(loop, i / 14 + (t * c.I) / 40);
          out.push(dot(x, y, 3.5, C.red));
        }
        // đặc tuyến U = E − I r
        const gx = 340;
        const gy = 250;
        const Imax = p.r > 0 ? p.E / p.r : p.E / 0.5;
        const X = (i: number) => gx + (i / Imax) * 190;
        const Y = (u: number) => gy - (u / p.E) * 170;
        out.push(ln(gx, gy, gx + 200, gy, {stroke: C.ink}), ln(gx, gy, gx, gy - 180, {stroke: C.ink}), txt(gx + 200, gy + 14, 'I', {size: 11}), txt(gx - 8, gy - 182, 'U', {size: 11}), ln(X(0), Y(p.E), X(Imax), Y(0), {stroke: C.blue, w: 2.4}), dot(X(c.I), Y(c.U), 5.5, C.red));
        return out;
      },
      readouts: [
        {label: 'Điện trở ngoài · dòng điện I = E/(R + r)', value: (p, _t, s) => {
          const c = circuit(s.mode, p.E, p.r, p.R1, p.R2);
          return `${f2(c.Rn)} Ω · ${f2(c.I)} A`;
        }},
        {label: 'Hiệu điện thế hai cực U = E − Ir', value: (p, _t, s) => `${f2(circuit(s.mode, p.E, p.r, p.R1, p.R2).U)} V`},
        {label: 'Công suất mạch ngoài · hiệu suất', value: (p, _t, s) => {
          const c = circuit(s.mode, p.E, p.r, p.R1, p.R2);
          return `${f2(c.P)} W · ${f1(100 * c.H)} %`;
        }},
      ],
      note: 'Công suất ngoài lớn nhất khi R = r (khi đó hiệu suất chỉ 50 %). Đường xanh: U giảm tuyến tính theo I với độ dốc −r.',
    },
  },

  PHYS_OSCILLOSCOPE: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Dao động kí điện tử: đọc chu kì và biên độ',
    question: 'Làm sao đọc chu kì, tần số và hiệu điện thế từ màn hình dao động kí khi biết thang thời gian và thang điện áp?',
    keywords: /dao dong ky|dao dong ki|\boscilloscope\b|man hinh dao dong ky|time\/?div|thang thoi gian/,
    examples: ['dao động kí', 'đọc chu kì trên màn hình dao động kí', 'thang thời gian ms/div'],
    data: {
      viewBox: [560, 320],
      sliders: [
        {key: 'f', label: 'Tần số tín hiệu', unit: 'Hz', min: 50, max: 2000, step: 10, value: 500},
        {key: 'A', label: 'Biên độ tín hiệu', unit: 'V', min: 0.5, max: 8, step: 0.5, value: 3},
        {key: 'vd', label: 'Thang điện áp', unit: 'V/div', min: 0.5, max: 5, step: 0.5, value: 2},
        {key: 'td', label: 'Thang thời gian', unit: 'ms/div', min: 0.1, max: 5, step: 0.1, value: 0.5},
      ],
      draw: (p) => {
        const x0 = 80;
        const y0 = 40;
        const W = 400;
        const H = 240;
        const out: Shape[] = [box(x0 - 12, y0 - 12, W + 24, H + 24, '#1C1917', '#44403C')];
        for (let i = 0; i <= 10; i++) out.push(ln(x0 + i * 40, y0, x0 + i * 40, y0 + H, {stroke: '#57534E', w: i === 5 ? 1.4 : 0.6}));
        for (let j = 0; j <= 6; j++) out.push(ln(x0, y0 + j * 40, x0 + W, y0 + j * 40, {stroke: '#57534E', w: j === 3 ? 1.4 : 0.6}));
        const pts: [number, number][] = [];
        for (let i = 0; i <= 400; i++) {
          const tMs = (i / 40) * p.td;
          const v = p.A * Math.sin(2 * Math.PI * p.f * (tMs / 1000));
          const y = Math.max(y0, Math.min(y0 + H, y0 + H / 2 - (v / p.vd) * 40));
          pts.push([x0 + i, y]);
        }
        out.push(poly(pts, {stroke: '#4ADE80', w: 2.2, close: false}));
        return out;
      },
      readouts: [
        {label: 'Chu kì thực T = 1/f', value: (p) => `${f2(1000 / p.f)} ms`},
        {label: 'Số ô ngang cho một chu kì', value: (p) => `${f2(1000 / p.f / p.td)} ô → T = ${f2((1000 / p.f / p.td) * p.td)} ms`},
        {label: 'Điện áp đỉnh – đỉnh đọc được', value: (p) => `${f2(2 * p.A)} V = ${f2((2 * p.A) / p.vd)} ô × ${f1(p.vd)} V/ô${p.A / p.vd > 3 ? ' (vượt màn hình!)' : ''}`},
      ],
      note: 'T = (số ô ngang của một chu kì) × (ms/ô); U₀ = (số ô theo phương đứng) × (V/ô). Chọn thang phù hợp để thấy 1–3 chu kì đầy đủ.',
    },
  },

  PHYS_KINETIC_GAS_PARTICLES: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Mô hình động học phân tử của chất khí',
    question: 'Áp suất chất khí sinh ra từ đâu theo mô hình hạt? Vì sao tăng nhiệt độ hoặc giảm thể tích đều làm áp suất tăng?',
    keywords: /mo hinh dong hoc phan tu|chuyen dong nhiet cua phan tu khi|ap suat chat khi theo|dong nang tinh tien trung binh|phuong trinh clapeyron|toc do can quan phuong/,
    examples: ['mô hình động học phân tử', 'chuyển động nhiệt của phân tử khí', 'phương trình Clapeyron', 'tốc độ căn quân phương'],
    data: {
      viewBox: [560, 320],
      sliders: [
        {key: 'T', label: 'Nhiệt độ', unit: 'K', min: 100, max: 600, step: 10, value: 300},
        {key: 'V', label: 'Chiều rộng bình (thể tích)', unit: 'đvtđ', min: 120, max: 400, step: 10, value: 320},
        {key: 'N', label: 'Số hạt', min: 10, max: 80, step: 5, value: 40},
      ],
      time: {max: 20, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t) => {
        const rng = seeded(11);
        const H = 220;
        const out: Shape[] = [box(60, 50, p.V, H, undefined, C.ink), box(60 + p.V, 50, 12, H, C.grey, C.ink)];
        const sp = 24 * Math.sqrt(p.T / 300);
        for (let i = 0; i < p.N; i++) {
          const fx = rng() * p.V;
          const fy = rng() * H;
          const ang = rng() * 2 * Math.PI;
          const mag = sp * (0.4 + 1.2 * Math.abs(gauss(rng)) * 0.6);
          out.push(dot(60 + bounce(fx + mag * Math.cos(ang) * t, p.V), 50 + bounce(fy + mag * Math.sin(ang) * t, H), 4.2, p.T > 400 ? C.red : C.blue));
        }
        return out;
      },
      readouts: [
        {label: 'Áp suất tỉ đối p ∝ N·T/V (so với trạng thái đầu)', value: (p) => f2(idealGasPressure(p.N, p.T, p.V) / idealGasPressure(40, 300, 320))},
        {label: 'Tốc độ căn quân phương của N₂', value: (p) => `${Math.round(vRmsN2(p.T))} m/s`},
        {label: 'Động năng tịnh tiến trung bình (3/2)kT', value: (p) => `${f2(1.5 * 1.38e-23 * p.T * 1e21)} × 10⁻²¹ J`},
      ],
      note: 'Áp suất là kết quả va chạm của rất nhiều hạt vào thành bình. Nhiệt độ tuyệt đối tỉ lệ với động năng tịnh tiến trung bình của hạt.',
    },
  },

  PHYS_STATES_OF_MATTER: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Mô hình phân tử của chất rắn, lỏng, khí và sự chuyển thể',
    question: 'Khoảng cách và chuyển động của các phân tử khác nhau thế nào ở thể rắn, lỏng, khí? Nhiệt độ tăng qua nhiệt độ nóng chảy và sôi thì mô hình thay đổi ra sao?',
    keywords: /cau tao chat|mo hinh phan tu (?:cua )?(?:chat )?(?:ran|long|khi)|su chuyen the|chat ran chat long chat khi|noi nang cua vat|su nong chay|su hoa hoi/,
    examples: ['cấu tạo chất', 'mô hình phân tử của chất rắn lỏng khí', 'sự chuyển thể', 'nội năng của vật'],
    data: {
      viewBox: [560, 300],
      sliders: [{key: 'T', label: 'Nhiệt độ của nước', unit: 'K', min: 200, max: 450, step: 5, value: 250}],
      time: {max: 20, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t) => {
        const state = p.T < 273 ? 'ran' : p.T < 373 ? 'long' : 'khi';
        const rng = seeded(5);
        const out: Shape[] = [box(60, 40, 400, 220, undefined, C.ink)];
        const cols = 8;
        const rows = 5;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const bx = 110 + c * 42;
          const by = 80 + r * 38;
          const a = rng() * 6.28;
          const b = rng() * 6.28;
          if (state === 'ran') out.push(dot(bx + 3 * Math.sin(3 * t + a) * (p.T / 273), by + 3 * Math.cos(3 * t + b) * (p.T / 273), 8, C.blue));
          else if (state === 'long') out.push(dot(bx + 16 * Math.sin(0.9 * t + a) + 10 * Math.sin(2 * t + b), 120 + (r * 30 + 18 * Math.cos(0.7 * t + b)) * 0.75 + 30, 8, C.teal));
          else out.push(dot(60 + 10 + bounce(rng() * 380 + 60 * Math.cos(a) * t * (p.T / 373), 380), 40 + 10 + bounce(rng() * 200 + 60 * Math.sin(b) * t * (p.T / 373), 200), 7, C.red));
        }
        out.push(txt(510, 150, state === 'ran' ? 'RẮN' : state === 'long' ? 'LỎNG' : 'KHÍ', {size: 14, bold: true}));
        return out;
      },
      readouts: [
        {label: 'Thể', value: (p) => (p.T < 273 ? 'rắn (băng): dưới 273 K' : p.T < 373 ? 'lỏng (nước): 273–373 K' : 'khí (hơi nước): trên 373 K')},
        {label: 'Khoảng cách phân tử', value: (p) => (p.T < 273 ? 'nhỏ, sắp xếp có trật tự' : p.T < 373 ? 'nhỏ, không trật tự' : 'rất lớn so với kích thước phân tử')},
        {label: 'Chuyển động', value: (p) => (p.T < 273 ? 'dao động quanh vị trí cân bằng' : p.T < 373 ? 'dao động và trượt qua nhau' : 'chuyển động hỗn loạn tự do')},
      ],
      note: 'Lực liên kết giảm dần từ rắn tới khí. Khi nóng chảy hay sôi, nhiệt cung cấp làm tăng thế năng phân tử (phá liên kết) nên nhiệt độ giữ nguyên.',
    },
  },

  PHYS_MAGNETIC_FIELD: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Từ trường: lực Lorentz và từ trường của dòng điện thẳng',
    question: 'Điện tích chuyển động trong từ trường đều chịu lực như thế nào, và vì sao quỹ đạo là đường tròn? Hai dây dẫn thẳng song song mang dòng điện cùng chiều hút hay đẩy nhau?',
    keywords: /luc lorentz|\blorentz\b|tu truong cua dong dien thang|quy tac ban tay (?:trai|phai)|duong suc tu|cam ung tu|luc tu tac dung len day dan/,
    examples: ['lực Lorentz', 'từ trường của dòng điện thẳng', 'quy tắc bàn tay phải', 'đường sức từ'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'mode', label: 'Hiện tượng', value: 'lorentz', options: [['lorentz', 'Electron bay trong từ trường đều'], ['wire', 'Hai dây thẳng song song']]}],
      sliders: [
        {key: 'v', label: 'Tốc độ electron', unit: '10⁶ m/s', min: 0.5, max: 5, step: 0.5, value: 1, when: ['mode', ['lorentz']]},
        {key: 'B', label: 'Cảm ứng từ B', unit: 'mT', min: 1, max: 50, step: 1, value: 1, when: ['mode', ['lorentz']]},
        {key: 'I1', label: 'Dòng I₁ (dây thẳng)', unit: 'A', min: -10, max: 10, step: 1, value: 5, when: ['mode', ['wire']]},
        {key: 'I2', label: 'Dòng I₂', unit: 'A', min: -10, max: 10, step: 1, value: 5, when: ['mode', ['wire']]},
        {key: 'd', label: 'Khoảng cách hai dây', unit: 'cm', min: 2, max: 20, step: 1, value: 10, when: ['mode', ['wire']]},
      ],
      toggles: [{key: 'pos', label: 'Hạt mang điện dương', value: false, when: ['mode', ['lorentz']]}],
      time: {max: 12, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t, s) => {
        const out: Shape[] = [];
        if (s.mode === 'lorentz') {
          for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) out.push(ring(80 + i * 55, 60 + j * 55, 6, '#A8A29E', 1), ln(76 + i * 55, 56 + j * 55, 84 + i * 55, 64 + j * 55, {stroke: '#A8A29E', w: 1}), ln(84 + i * 55, 56 + j * 55, 76 + i * 55, 64 + j * 55, {stroke: '#A8A29E', w: 1}));
          const r = lorentzRadius(p.v * 1e6, p.B * 1e-3);
          const rpx = Math.min(130, 60 * (r / 5.7e-3));
          const dir = p.pos === 1 ? 1 : -1;
          const cx = 140;
          const cy = 170 - dir * rpx;
          const ang = (dir * Math.PI) / 2 - dir * (t * 60) / rpx;
          const x = cx + rpx * Math.cos(ang);
          const y = cy + rpx * Math.sin(ang);
          out.push(ring(cx, cy, rpx, 'rgba(37,99,235,0.35)', 1.6), dot(x, y, 7, p.pos === 1 ? C.red : C.blue), txt(x + 12, y - 8, p.pos === 1 ? '+' : '−', {size: 14, bold: true}));
          out.push(txt(420, 300, 'B hướng vào trang (×)', {size: 11, fill: C.grey}));
        } else {
          const d = p.d * 18;
          const x1 = 280 - d / 2;
          const x2 = 280 + d / 2;
          const draw = (x: number, I: number, col: string) => {
            out.push(ring(x, 160, 14, col, 2.4), I > 0 ? dot(x, 160, 4, col) : txt(x, 165, '×', {size: 16, fill: col, bold: true}));
            for (const rr of [30, 55, 80]) out.push(ring(x, 160, rr, 'rgba(120,113,108,0.25)', 1));
          };
          draw(x1, p.I1, C.blue);
          draw(x2, p.I2, C.red);
          const F = wireForcePerLength(p.I1, p.I2, p.d / 100);
          const att = F > 0;
          if (F !== 0) out.push(arrow(x1, 160, x1 + (att ? 1 : -1) * Math.min(70, Math.abs(F) * 3e4), 160, C.green, 3), arrow(x2, 160, x2 - (att ? 1 : -1) * Math.min(70, Math.abs(F) * 3e4), 160, C.green, 3));
        }
        return out;
      },
      readouts: [
        {label: 'Bán kính quỹ đạo r = mv/(eB)', value: (p) => `${f2(lorentzRadius(p.v * 1e6, p.B * 1e-3) * 1000)} mm`},
        {label: 'Chu kì quay T = 2πm/(eB)', value: (p) => `${f2(lorentzPeriod(p.B * 1e-3) * 1e9)} ns`},
        {label: 'Dây thẳng: B tại dây kia · lực trên 1 m dây', value: (p) => `${f2(wireField(p.I1, p.d / 100) * 1000)} mT · ${f2(Math.abs(wireForcePerLength(p.I1, p.I2, p.d / 100)) * 1000)} mN (${p.I1 * p.I2 > 0 ? 'hút nhau' : p.I1 * p.I2 < 0 ? 'đẩy nhau' : '0'})`},
      ],
      note: 'Lực Lorentz F = |q|vB sin α luôn vuông góc với v nên không sinh công, chỉ đổi hướng chuyển động. Hai dòng điện cùng chiều hút nhau, ngược chiều đẩy nhau.',
    },
  },

  PHYS_EM_INDUCTION: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Cảm ứng điện từ: từ thông và suất điện động của khung dây quay',
    question: 'Suất điện động xuất hiện khi nào, và vì sao khung dây quay đều trong từ trường sinh ra dòng điện xoay chiều? Khi từ thông cực đại thì suất điện động bằng bao nhiêu?',
    keywords: /cam ung dien tu|dinh luat faraday|\bfaraday\b|dinh luat lenz|\blenz\b|tu thong|suat dien dong cam ung|may phat dien xoay chieu|may phat dien/,
    examples: ['cảm ứng điện từ', 'định luật Faraday', 'định luật Lenz', 'máy phát điện xoay chiều'],
    data: {
      viewBox: [560, 340],
      sliders: [
        {key: 'B', label: 'Cảm ứng từ B', unit: 'T', min: 0.1, max: 1, step: 0.1, value: 0.5},
        {key: 'N', label: 'Số vòng dây N', min: 10, max: 200, step: 10, value: 100},
        {key: 'S', label: 'Diện tích khung S', unit: 'cm²', min: 50, max: 400, step: 10, value: 200},
        {key: 'f', label: 'Tần số quay', unit: 'Hz', min: 1, max: 5, step: 0.5, value: 2},
      ],
      time: {max: 2, loop: true, label: 'Thời gian', unit: 's'},
      draw: (p, t) => {
        const w = 2 * Math.PI * p.f;
        const th = w * t;
        const E0 = emfPeak(p.N, p.B, p.S, p.f);
        const phi = (u: number) => p.N * p.B * p.S * 1e-4 * Math.cos(w * u);
        const e = (u: number) => E0 * Math.sin(w * u);
        const out: Shape[] = [];
        for (let i = 0; i < 4; i++) out.push(arrow(40, 50 + i * 22, 140, 50 + i * 22, 'rgba(37,99,235,0.45)', 1.4));
        out.push(txt(90, 38, 'B', {fill: C.blue, bold: true}));
        const cx = 90;
        const cy = 160;
        const hl = 55;
        out.push(ln(cx - hl * Math.sin(th), cy - hl * Math.cos(th), cx + hl * Math.sin(th), cy + hl * Math.cos(th), {stroke: C.orange, w: 6}), dot(cx, cy, 4));
        out.push(txt(90, 235, 'khung dây (nhìn từ trên)', {size: 10, fill: C.grey}));
        out.push(...miniGraph(180, 20, 360, 130, phi, 0, 2, C.blue, 'Φ(t)', t), ...miniGraph(180, 175, 360, 130, e, 0, 2, C.red, 'e(t)', t));
        return out;
      },
      readouts: [
        {label: 'Suất điện động cực đại E₀ = NBSω', value: (p) => `${f2(emfPeak(p.N, p.B, p.S, p.f))} V`},
        {label: 'Giá trị hiệu dụng E = E₀/√2', value: (p) => `${f2(emfPeak(p.N, p.B, p.S, p.f) / Math.SQRT2)} V`},
        {label: 'Từ thông cực đại Φ₀ = NBS', value: (p) => `${f3(p.N * p.B * p.S * 1e-4)} Wb`},
      ],
      note: 'e = −dΦ/dt: e cực đại khi Φ bằng 0 (khung song song với B) và e = 0 khi Φ cực đại. Φ và e lệch pha π/2.',
    },
  },

  PHYS_ALPHA_SCATTERING: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Thí nghiệm tán xạ hạt α của Rutherford',
    question: 'Vì sao một số hạt α bị bật ngược trở lại, điều mà mẫu bánh pudding của Thomson không giải thích được? Điều đó nói gì về kích thước và điện tích của hạt nhân?',
    keywords: /tan xa (?:hat )?alpha|tan xa rutherford|\brutherford\b|thi nghiem rutherford|mau hanh tinh nguyen tu|cau tao hat nhan/,
    examples: ['tán xạ hạt alpha', 'thí nghiệm Rutherford', 'mẫu hành tinh nguyên tử', 'cấu tạo hạt nhân'],
    data: {
      viewBox: [560, 320],
      sliders: [
        {key: 'Z', label: 'Số proton của bia (Z)', min: 2, max: 82, step: 1, value: 79},
        {key: 'E', label: 'Động năng hạt α', unit: 'MeV', min: 2, max: 10, step: 0.5, value: 5},
      ],
      toggles: [{key: 'thomson', label: 'Mẫu Thomson (điện tích trải đều)', value: false}],
      draw: (p) => {
        const d0 = p.thomson === 1 ? 0.04 : closestApproach(p.Z, p.E);
        const k = 1.8;
        const X = (x: number) => 280 + x * k;
        const Y = (y: number) => 160 - y * k;
        const out: Shape[] = [];
        const bs = [-48, -36, -26, -18, -11, -6, -2.5, 2.5, 6, 11, 18, 26, 36, 48];
        bs.forEach((b, i) => {
          const pts = alphaPath(d0, b).map(([x, y]) => [X(x), Y(y)] as [number, number]);
          out.push(poly(pts, {stroke: i % 2 ? C.blue : C.teal, w: 1.6, close: false}));
        });
        out.push(dot(280, 160, p.thomson === 1 ? 70 : 4, p.thomson === 1 ? 'rgba(220,38,38,0.12)' : C.red), txt(280, 188, p.thomson === 1 ? 'điện tích dương trải đều' : 'hạt nhân', {size: 10, fill: C.red}));
        return out;
      },
      readouts: [
        {label: 'Khoảng cách tiếp cận gần nhất khi đâm thẳng d₀', value: (p) => `${f1(closestApproach(p.Z, p.E))} fm`},
        {label: 'Góc lệch với tham số va chạm b = 6 fm', value: (p) => `${f1(scatterAngle(closestApproach(p.Z, p.E), 6))}°`},
        {label: 'Bán kính hạt nhân ≈ 1,2·A^(1/3)', value: (p) => `${f1(1.2 * Math.cbrt(2.4 * p.Z))} fm`},
      ],
      note: 'tan(θ/2) = d₀/(2b): tham số va chạm b càng nhỏ góc lệch càng lớn. Hạt α bật ngược chứng tỏ điện tích dương tập trung trong hạt nhân rất nhỏ.',
    },
  },

  PHYS_FISSION_REACTOR: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Phân hạch dây chuyền và thanh điều khiển lò phản ứng',
    question: 'Hệ số nhân neutron k bằng bao nhiêu thì phản ứng dây chuyền tắt dần, ổn định hay tăng nhanh? Thanh điều khiển giúp đưa lò về trạng thái tới hạn như thế nào?',
    keywords: /phan hach|phan ung day chuyen|lo phan ung hat nhan|thanh dieu khien|nha may dien hat nhan|he so nhan neutron|ban toi han/,
    examples: ['phân hạch', 'phản ứng dây chuyền', 'lò phản ứng hạt nhân', 'thanh điều khiển'],
    data: {
      viewBox: [560, 320],
      sliders: [
        {key: 'k0', label: 'Hệ số nhân khi chưa có thanh điều khiển', min: 1.0, max: 2.0, step: 0.05, value: 1.3},
        {key: 'rod', label: 'Thanh điều khiển cắm sâu', unit: '%', min: 0, max: 100, step: 5, value: 0},
        {key: 'g', label: 'Số thế hệ', min: 1, max: 8, step: 1, value: 5},
      ],
      draw: (p) => {
        const k = effectiveK(p.k0, p.rod);
        const out: Shape[] = [box(30, 40, 200, 220, '#F5F5F4', C.ink), txt(130, 30, 'Vùng hoạt', {size: 11})];
        for (let i = 0; i < 5; i++) out.push(box(50 + i * 36, 70, 14, 170, '#D97706', undefined));
        for (let i = 0; i < 4; i++) out.push(box(68 + i * 36 + 4, 40, 8, 40 + (p.rod / 100) * 150, '#1C1917', undefined));
        out.push(txt(130, 276, 'nâu: nhiên liệu · đen: thanh điều khiển', {size: 9, fill: C.grey}));
        const g = Math.round(p.g);
        const bars = Array.from({length: g + 1}, (_, i) => Math.pow(k, i));
        const mx = Math.max(...bars, 1);
        bars.forEach((v, i) => out.push(box(270 + i * 28, 260 - (Math.log10(v * 10) / Math.log10(mx * 10)) * 190 - 4, 22, (Math.log10(v * 10) / Math.log10(mx * 10)) * 190 + 4, k > 1.001 ? C.red : k < 0.999 ? C.blue : C.green), txt(281 + i * 28, 276, String(i), {size: 10})));
        out.push(txt(400, 36, `k = ${f2(k)} → ${k > 1.001 ? 'trên tới hạn' : k < 0.999 ? 'dưới tới hạn' : 'tới hạn'}`, {size: 13, bold: true, fill: k > 1.001 ? C.red : k < 0.999 ? C.blue : C.green}));
        return out;
      },
      readouts: [
        {label: 'Hệ số nhân hiệu dụng k', value: (p) => f2(effectiveK(p.k0, p.rod))},
        {label: 'Số phân hạch ở thế hệ cuối (xuất phát 1)', value: (p) => f1(chainPopulation(effectiveK(p.k0, p.rod), Math.round(p.g)))},
        {label: 'Độ cắm thanh để lò tới hạn (k = 1)', value: (p) => `${f1(criticalRod(p.k0))} %`},
      ],
      note: 'k < 1: phản ứng tắt dần; k = 1: ổn định (lò hoạt động); k > 1: tăng theo cấp số nhân (nguy hiểm). Thanh điều khiển hấp thụ neutron nên giảm k.',
    },
  },
};
export type {P};
