import type {PresetSpec, Shape} from './types';
import {C, arrow, box, deg, dot, f1, f2, f3, gauss, ln, miniGraph, poly, rad, ring, seeded, spring, tick, txt} from './sceneKit';

export const G = 9.8;

// ------------------------------------------------------------------ công thức cơ học (xuất để kiểm thử)
/** Độ lớn hợp lực của hai lực F1, F2 hợp góc a (độ). */
export const resultant = (f1_: number, f2_: number, aDeg: number) => Math.sqrt(f1_ * f1_ + f2_ * f2_ + 2 * f1_ * f2_ * Math.cos(rad(aDeg)));
/** Lực căng hai dây treo vật nặng P, dây hợp phương thẳng đứng góc a (trái) và b (phải). */
export function tensions(P: number, aDeg: number, bDeg: number): [number, number] {
  const s = Math.sin(rad(aDeg + bDeg));
  return [(P * Math.sin(rad(bDeg))) / s, (P * Math.sin(rad(aDeg))) / s];
}
/** Vận tốc sau va chạm một chiều với hệ số phục hồi e. */
export function collide(m1: number, v1: number, m2: number, v2: number, e: number): [number, number] {
  const p = m1 * v1 + m2 * v2;
  return [(p + m2 * e * (v2 - v1)) / (m1 + m2), (p + m1 * e * (v1 - v2)) / (m1 + m2)];
}
export const atwood = (m1: number, m2: number): {a: number; T: number} => ({a: ((m1 - m2) * G) / (m1 + m2), T: (2 * m1 * m2 * G) / (m1 + m2)});
export const cartAccel = (F: number, m: number, mu: number) => (F > mu * m * G ? (F - mu * m * G) / m : 0);
export const springEq = (mode: string, k1: number, k2: number) => (mode === 'series' ? (k1 * k2) / (k1 + k2) : mode === 'parallel' ? k1 + k2 : k1);
export const slideAccel = (alphaDeg: number, mu: number) => Math.max(0, G * (Math.sin(rad(alphaDeg)) - mu * Math.cos(rad(alphaDeg))));
export const orbitSpeed = (hKm: number) => Math.sqrt(3.986e14 / (6.371e6 + hKm * 1000));
export const orbitPeriodH = (hKm: number) => (2 * Math.PI * (6.371e6 + hKm * 1000)) / orbitSpeed(hKm) / 3600;
export const shmX = (A: number, T: number, phiDeg: number, t: number, b = 0) => A * Math.exp(-b * t) * Math.cos((2 * Math.PI * t) / T + rad(phiDeg));
export const shmV = (A: number, T: number, phiDeg: number, t: number) => -A * ((2 * Math.PI) / T) * Math.sin((2 * Math.PI * t) / T + rad(phiDeg));
export const boatDynamics = (vb: number, vr: number, thetaDeg: number, W: number) => {
  const vx = vr + vb * Math.sin(rad(thetaDeg));
  const vy = vb * Math.cos(rad(thetaDeg));
  const T = W / vy;
  return {vx, vy, T, drift: vx * T, speed: Math.hypot(vx, vy)};
};
/** Sai số phép đo theo SGK: ΔA trung bình + sai số dụng cụ = nửa độ chia nhỏ nhất. */
export function measureStats(values: number[], res: number) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const dA = values.reduce((a, b) => a + Math.abs(b - mean), 0) / values.length;
  return {mean, dA, total: dA + res / 2, rel: (dA + res / 2) / mean};
}
export function measurements(trueV: number, res: number, n: number, sd: number): number[] {
  const rng = seeded(7);
  return Array.from({length: n}, () => Math.round((trueV + sd * gauss(rng)) / res) * res);
}

const track = (y: number): Shape => ln(40, y, 520, y, {stroke: C.ink, w: 2});

export const LY_SCENE1_PRESETS: Record<string, PresetSpec> = {
  PHYS_KINEMATICS_1D: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Chuyển động thẳng: đồ thị độ dịch chuyển–thời gian và vận tốc–thời gian',
    question: 'Độ dốc của đồ thị độ dịch chuyển–thời gian và diện tích dưới đồ thị vận tốc–thời gian cho biết những đại lượng nào? Vì sao hai vật nặng nhẹ khác nhau rơi tự do chạm đất cùng lúc?',
    keywords: /do thi do dich chuyen|do thi van toc (?:thoi gian|theo thoi gian)|chuyen dong thang (?:deu|bien doi deu)|roi tu do|ong newton|do dich chuyen va quang duong|gia toc roi tu do/,
    examples: ['đồ thị độ dịch chuyển thời gian', 'chuyển động thẳng biến đổi đều', 'rơi tự do', 'ống Newton'],
    data: {
      viewBox: [560, 340],
      choices: [{key: 'm', label: 'Chuyển động', value: 'accel', options: [['uniform', 'Thẳng đều'], ['accel', 'Biến đổi đều'], ['fall', 'Rơi tự do']]}],
      sliders: [
        {key: 'v0', label: 'Vận tốc ban đầu', unit: 'm/s', min: -10, max: 10, step: 0.5, value: 2, when: ['m', ['uniform', 'accel']]},
        {key: 'a', label: 'Gia tốc', unit: 'm/s²', min: -5, max: 5, step: 0.5, value: 1, when: ['m', ['accel']]},
        {key: 'h', label: 'Độ cao rơi', unit: 'm', min: 1, max: 80, step: 1, value: 20, when: ['m', ['fall']]},
      ],
      time: {max: 8, label: 'Thời gian t', unit: 's'},
      draw: (p, t, s) => {
        const out: Shape[] = [];
        const a = s.m === 'uniform' ? 0 : s.m === 'fall' ? G : p.a;
        const v0 = s.m === 'fall' ? 0 : p.v0;
        const tEnd = s.m === 'fall' ? Math.sqrt((2 * p.h) / G) : 8;
        const tc = Math.min(t, tEnd);
        const xf = (u: number) => v0 * u + 0.5 * a * u * u;
        const vf = (u: number) => v0 + a * u;
        if (s.m === 'fall') {
          const k = 160 / p.h;
          out.push(ln(60, 40, 60, 200, {stroke: C.grey, dash: '4 3'}), ln(100, 200, 160, 200, {stroke: C.ink, w: 2}), dot(80, 40 + xf(tc) * k, 9, C.blue), dot(130, 40 + xf(tc) * k, 5, C.red), txt(80, 24, 'nặng', {size: 10}), txt(130, 24, 'nhẹ', {size: 10}));
          out.push(txt(100, 218, `${f2(xf(tc))} m đã rơi`, {size: 11}));
        } else {
          const xs = Array.from({length: 41}, (_, i) => xf((8 * i) / 40));
          const lo = Math.min(...xs, 0);
          const hi = Math.max(...xs, 1);
          const X = (x: number) => 60 + ((x - lo) / (hi - lo)) * 400;
          out.push(track(130), ln(X(0), 120, X(0), 140, {stroke: C.grey}), box(X(xf(tc)) - 22, 98, 44, 26, C.blue), txt(X(xf(tc)), 115, 'xe', {size: 11, fill: '#fff'}), tick(X(0), 156, '0'));
          out.push(arrow(X(xf(tc)), 90, X(xf(tc)) + Math.max(-70, Math.min(70, vf(tc) * 7)), 90, C.red, 2.4));
        }
        out.push(...miniGraph(40, 230, 220, 90, (u) => xf(Math.min(u, tEnd)), 0, tEnd, C.blue, 'x(t)', tc), ...miniGraph(300, 230, 220, 90, (u) => vf(Math.min(u, tEnd)), 0, tEnd, C.red, 'v(t)', tc));
        return out;
      },
      readouts: [
        {label: 'Vận tốc tức thời v(t)', value: (p, t, s) => `${f2((s.m === 'fall' ? 0 : p.v0) + (s.m === 'uniform' ? 0 : s.m === 'fall' ? G : p.a) * Math.min(t, s.m === 'fall' ? Math.sqrt((2 * p.h) / G) : 8))} m/s`},
        {label: 'Độ dịch chuyển d(t)', value: (p, t, s) => {
          const a = s.m === 'uniform' ? 0 : s.m === 'fall' ? G : p.a;
          const v0 = s.m === 'fall' ? 0 : p.v0;
          const u = Math.min(t, s.m === 'fall' ? Math.sqrt((2 * p.h) / G) : 8);
          return `${f2(v0 * u + 0.5 * a * u * u)} m`;
        }},
        {label: 'Rơi tự do: thời gian chạm đất · vận tốc chạm đất', value: (p) => `${f2(Math.sqrt((2 * p.h) / G))} s · ${f2(Math.sqrt(2 * G * p.h))} m/s`},
      ],
      note: 'Độ dốc đồ thị d–t là vận tốc; độ dốc đồ thị v–t là gia tốc; diện tích dưới đồ thị v–t là độ dịch chuyển. Rơi tự do: g ≈ 9,8 m/s² với mọi vật khi bỏ qua sức cản.',
    },
  },

  PHYS_RELATIVE_VELOCITY: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Tổng hợp vận tốc: thuyền qua sông',
    question: 'Muốn thuyền sang đúng điểm đối diện bờ bên kia ta phải hướng mũi thuyền thế nào? Hướng nào qua sông nhanh nhất và khi đó thuyền bị trôi bao xa?',
    keywords: /thuyen qua song|tong hop van toc|van toc tuong doi|cong thuc cong van toc|van toc keo theo/,
    examples: ['tổng hợp vận tốc', 'công thức cộng vận tốc', 'vận tốc kéo theo'],
    data: {
      viewBox: [560, 320],
      sliders: [
        {key: 'vb', label: 'Vận tốc thuyền so với nước', unit: 'm/s', min: 1, max: 10, step: 0.5, value: 5},
        {key: 'vr', label: 'Vận tốc dòng nước', unit: 'm/s', min: 0, max: 8, step: 0.5, value: 3},
        {key: 'th', label: 'Góc lái so với phương vuông góc bờ (+ xuôi dòng)', unit: '°', min: -70, max: 70, step: 1, value: 0},
        {key: 'W', label: 'Chiều rộng sông', unit: 'm', min: 50, max: 200, step: 10, value: 100},
      ],
      time: {max: 10, label: 'Tiến trình qua sông (rút gọn)', unit: 's'},
      draw: (p, t) => {
        const d = boatDynamics(p.vb, p.vr, p.th, p.W);
        const k = Math.min(1.5, 400 / Math.max(Math.abs(d.drift), p.W));
        const y0 = 270;
        const y1 = y0 - p.W * k;
        const x0 = 90;
        const f = Math.min(1, t / 10);
        const bx = Math.max(40, Math.min(520, x0 + d.drift * k * f));
        const by = y0 - p.W * k * f;
        const out: Shape[] = [box(40, y1, 480, y0 - y1, 'rgba(37,99,235,0.1)', 'none'), ln(40, y1, 520, y1, {stroke: C.green, w: 3}), ln(40, y0, 520, y0, {stroke: C.green, w: 3})];
        for (let i = 0; i < 6; i++) out.push(arrow(60 + i * 80, (y0 + y1) / 2 + 12, 100 + i * 80, (y0 + y1) / 2 + 12, 'rgba(37,99,235,0.35)', 1.2));
        out.push(ln(x0, y0, Math.max(40, Math.min(520, x0 + d.drift * k)), y1, {stroke: C.grey, dash: '5 4', w: 1.4}), ln(x0, y0, x0, y1, {stroke: C.grey, dash: '2 4', w: 1}));
        out.push(dot(bx, by, 8, C.orange));
        const s = 9;
        const vbx = p.vb * Math.sin(rad(p.th)) * s;
        const vby = -p.vb * Math.cos(rad(p.th)) * s;
        out.push(arrow(bx, by, bx + vbx, by + vby, C.blue, 2.4), arrow(bx, by, bx + p.vr * s, by, C.purple, 2.4), arrow(bx, by, bx + vbx + p.vr * s, by + vby, C.red, 3));
        out.push(txt(bx + vbx / 2 - 12, by + vby / 2, 'v⃗₁₂', {fill: C.blue, size: 11}), txt(bx + p.vr * s / 2, by + 14, 'v⃗₂₃', {fill: C.purple, size: 11}), txt(bx + (vbx + p.vr * s) / 2 + 12, by + vby / 2 - 6, 'v⃗₁₃', {fill: C.red, size: 11}));
        return out;
      },
      readouts: [
        {label: 'Vận tốc so với bờ |v₁₃|', value: (p) => `${f2(boatDynamics(p.vb, p.vr, p.th, p.W).speed)} m/s`},
        {label: 'Thời gian qua sông', value: (p) => `${f1(boatDynamics(p.vb, p.vr, p.th, p.W).T)} s`},
        {label: 'Bị trôi xuôi dòng', value: (p) => `${f1(boatDynamics(p.vb, p.vr, p.th, p.W).drift)} m`},
        {label: 'Góc để sang đúng điểm đối diện', value: (p) => (p.vr <= p.vb ? `${f1(-deg(Math.asin(p.vr / p.vb)))}° (ngược dòng)` : 'không thể: nước chảy nhanh hơn thuyền')},
      ],
      note: 'v⃗₁₃ = v⃗₁₂ + v⃗₂₃ (thuyền–bờ = thuyền–nước + nước–bờ). Thành phần vuông góc bờ quyết định thời gian qua sông.',
    },
  },

  PHYS_MEASUREMENT_ERROR: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Sai số phép đo',
    question: 'Vì sao đo nhiều lần và lấy trung bình lại làm giảm sai số ngẫu nhiên nhưng không loại bỏ được sai số dụng cụ? Sai số tỉ đối cho ta so sánh điều gì?',
    keywords: /sai so phep do|sai so dung cu|sai so ngau nhien|sai so he thong|do nhieu lan (?:lay )?gia tri trung binh|do chia nho nhat/,
    examples: ['sai số phép đo', 'sai số dụng cụ và sai số ngẫu nhiên', 'đo nhiều lần lấy giá trị trung bình'],
    data: {
      viewBox: [560, 220],
      sliders: [
        {key: 'n', label: 'Số lần đo', min: 3, max: 30, step: 1, value: 8},
        {key: 'res', label: 'Độ chia nhỏ nhất', unit: 'cm', min: 0.01, max: 0.5, step: 0.01, value: 0.1},
        {key: 'sd', label: 'Dao động ngẫu nhiên khi đo', unit: 'cm', min: 0, max: 0.4, step: 0.01, value: 0.15},
      ],
      draw: (p) => {
        const vals = measurements(10, p.res, Math.round(p.n), p.sd);
        const st = measureStats(vals, p.res);
        const X = (v: number) => 280 + (v - 10) * 400;
        const out: Shape[] = [ln(40, 120, 520, 120, {stroke: C.ink, w: 1.4}), ln(X(10), 100, X(10), 140, {stroke: C.green, w: 2.5}), txt(X(10), 160, 'giá trị đúng 10', {size: 10, fill: C.green})];
        for (let v = 9.4; v <= 10.6; v += 0.2) out.push(ln(X(v), 116, X(v), 124, {stroke: C.ink}), tick(X(v), 138, f1(v)));
        const counts = new Map<number, number>();
        vals.forEach((v) => {
          const key = Math.round(v * 1000);
          const c = counts.get(key) ?? 0;
          counts.set(key, c + 1);
          out.push(dot(X(v), 110 - c * 11, 4.5, C.blue));
        });
        out.push(ln(X(st.mean), 60, X(st.mean), 130, {stroke: C.red, w: 2}), txt(X(st.mean), 52, 'Ā', {fill: C.red, bold: true}));
        out.push(box(X(st.mean - st.total), 175, X(st.mean + st.total) - X(st.mean - st.total), 12, 'rgba(234,88,12,0.3)', C.orange), txt(X(st.mean), 205, 'A = Ā ± ΔA', {size: 11, fill: C.orange}));
        return out;
      },
      readouts: [
        {label: 'Trung bình Ā', value: (p) => `${f3(measureStats(measurements(10, p.res, Math.round(p.n), p.sd), p.res).mean)} cm`},
        {label: 'ΔA (trung bình |Aᵢ − Ā|) · sai số dụng cụ', value: (p) => `${f3(measureStats(measurements(10, p.res, Math.round(p.n), p.sd), p.res).dA)} · ${f3(p.res / 2)} cm`},
        {label: 'Sai số tuyệt đối toàn phần ΔA', value: (p) => `${f3(measureStats(measurements(10, p.res, Math.round(p.n), p.sd), p.res).total)} cm`},
        {label: 'Sai số tỉ đối δ', value: (p) => `${f2(100 * measureStats(measurements(10, p.res, Math.round(p.n), p.sd), p.res).rel)} %`},
      ],
      note: 'Kết quả viết A = Ā ± ΔA. Tăng số lần đo giảm sai số ngẫu nhiên; muốn giảm sai số dụng cụ phải dùng dụng cụ có độ chia nhỏ hơn.',
    },
  },

  PHYS_FORCE_COMPOSITION: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Tổng hợp, phân tích lực và cân bằng của ba lực',
    question: 'Hợp lực của hai lực phụ thuộc góc giữa chúng thế nào? Vì sao dây treo càng gần nằm ngang thì lực căng càng lớn dù vật nặng không đổi?',
    keywords: /tong hop luc|phan tich luc|quy tac hinh binh hanh luc|can bang cua (?:vat|chat diem) (?:chiu tac dung cua )?ba luc|luc can day treo|hop luc cua hai luc/,
    examples: ['tổng hợp lực', 'phân tích lực', 'cân bằng của vật chịu tác dụng của ba lực', 'hợp lực của hai lực'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'mode', label: 'Bài toán', value: 'sum', options: [['sum', 'Tổng hợp hai lực'], ['balance', 'Vật treo bằng hai dây']]}],
      sliders: [
        {key: 'F1', label: 'F₁ hoặc trọng lượng P', unit: 'N', min: 1, max: 20, step: 0.5, value: 10},
        {key: 'F2', label: 'F₂ (khi tổng hợp)', unit: 'N', min: 1, max: 20, step: 0.5, value: 8, when: ['mode', ['sum']]},
        {key: 'a', label: 'Góc giữa F₁, F₂ · hoặc góc dây trái so với phương thẳng đứng', unit: '°', min: 0, max: 180, step: 1, value: 60},
        {key: 'b', label: 'Góc dây phải so với phương thẳng đứng (khi treo)', unit: '°', min: 5, max: 85, step: 1, value: 40, when: ['mode', ['balance']]},
      ],
      draw: (p, _t, s) => {
        const out: Shape[] = [];
        if (s.mode === 'sum') {
          const k = 9;
          const ox = 150;
          const oy = 190;
          const e1: [number, number] = [ox + p.F1 * k, oy];
          const e2: [number, number] = [ox + p.F2 * k * Math.cos(rad(p.a)), oy - p.F2 * k * Math.sin(rad(p.a))];
          const r: [number, number] = [e1[0] + e2[0] - ox, e1[1] + e2[1] - oy];
          out.push(poly([[ox, oy], e1, r, e2], {stroke: C.grey, dash: '4 3', w: 1.2}), arrow(ox, oy, e1[0], e1[1], C.blue), arrow(ox, oy, e2[0], e2[1], C.red), arrow(ox, oy, r[0], r[1], C.green, 3.2), dot(ox, oy, 4));
          out.push(txt(e1[0] + 10, e1[1] + 14, 'F₁', {fill: C.blue, bold: true}), txt(e2[0] + 10, e2[1] - 6, 'F₂', {fill: C.red, bold: true}), txt(r[0] + 12, r[1] - 6, 'F', {fill: C.green, bold: true, size: 14}));
        } else {
          const [T1, T2] = tensions(p.F1, p.a, p.b);
          const px = 280;
          const py = 210;
          const k = 140;
          const ax = px - k * Math.sin(rad(p.a)) * 1.4;
          const ay = py - k * Math.cos(rad(p.a)) * 1.4;
          const bx = px + k * Math.sin(rad(p.b)) * 1.4;
          const by = py - k * Math.cos(rad(p.b)) * 1.4;
          out.push(ln(40, 30, 520, 30, {stroke: C.ink, w: 3}), ln(ax, Math.max(30, ay), px, py, {stroke: C.ink, w: 2}), ln(bx, Math.max(30, by), px, py, {stroke: C.ink, w: 2}), box(px - 20, py, 40, 40, C.orange), txt(px, py + 26, 'P', {fill: '#fff', bold: true}));
          const s2 = 5;
          const d1x = -Math.sin(rad(p.a));
          const d1y = -Math.cos(rad(p.a));
          out.push(arrow(px, py, px + d1x * T1 * s2, py + d1y * T1 * s2, C.blue, 2.6), arrow(px, py, px + Math.sin(rad(p.b)) * T2 * s2, py - Math.cos(rad(p.b)) * T2 * s2, C.red, 2.6), arrow(px, py, px, py + p.F1 * s2, C.green, 2.6));
          out.push(txt(px + d1x * T1 * s2 - 10, py + d1y * T1 * s2 - 8, 'T₁', {fill: C.blue, bold: true}), txt(px + Math.sin(rad(p.b)) * T2 * s2 + 10, py - Math.cos(rad(p.b)) * T2 * s2 - 8, 'T₂', {fill: C.red, bold: true}));
        }
        return out;
      },
      readouts: [
        {label: 'Hợp lực |F| = √(F₁² + F₂² + 2F₁F₂cos α)', value: (p, _t, s) => (s.mode === 'sum' ? `${f2(resultant(p.F1, p.F2, p.a))} N` : '—')},
        {label: 'Lực căng T₁ · T₂ (khi treo)', value: (p, _t, s) => {
          if (s.mode !== 'balance') return '—';
          const [t1, t2] = tensions(p.F1, p.a, p.b);
          return `${f2(t1)} · ${f2(t2)} N`;
        }},
      ],
      note: 'Hai lực cùng hướng cho hợp lực lớn nhất F₁ + F₂, ngược hướng cho nhỏ nhất |F₁ − F₂|. Vật treo cân bằng khi T⃗₁ + T⃗₂ + P⃗ = 0.',
    },
  },

  PHYS_MOMENT_LEVER: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Moment lực, đòn bẩy và điều kiện cân bằng',
    question: 'Đòn bẩy cân bằng khi moment của hai lực đối với trục quay có quan hệ gì? Vì sao càng đặt vật nặng gần điểm tựa thì càng dễ nâng bằng lực nhỏ?',
    keywords: /moment luc|don bay|dieu kien can bang cua vat (?:co )?truc quay|ngau luc|quy tac moment|trong tam cua vat/,
    examples: ['moment lực', 'đòn bẩy', 'điều kiện cân bằng của vật có trục quay', 'ngẫu lực'],
    data: {
      viewBox: [560, 300],
      sliders: [
        {key: 'm1', label: 'Vật trái m₁', unit: 'kg', min: 0, max: 10, step: 0.5, value: 4},
        {key: 'd1', label: 'Cách điểm tựa d₁', unit: 'm', min: 0.5, max: 4, step: 0.1, value: 2},
        {key: 'm2', label: 'Vật phải m₂', unit: 'kg', min: 0, max: 10, step: 0.5, value: 2},
        {key: 'd2', label: 'Cách điểm tựa d₂', unit: 'm', min: 0.5, max: 4, step: 0.1, value: 4},
      ],
      draw: (p) => {
        const M = p.m1 * G * p.d1 - p.m2 * G * p.d2;
        const ang = -Math.max(-18, Math.min(18, M / 8)); // y màn hình hướng xuống: bên nặng hơn (M > 0, trái) phải hạ xuống
        const cx = 280;
        const cy = 190;
        const k = 55;
        const r = (d: number) => [cx + d * k * Math.cos(rad(ang)), cy + d * k * Math.sin(rad(ang))];
        const L = r(-4.4);
        const R = r(4.4);
        const l = r(-p.d1);
        const rr = r(p.d2);
        const out: Shape[] = [poly([[cx, cy], [cx - 24, cy + 70], [cx + 24, cy + 70]], {fill: '#E7E5E4', stroke: C.grey}), ln(L[0], L[1], R[0], R[1], {stroke: C.ink, w: 7}), dot(cx, cy, 5, C.red)];
        out.push(box(l[0] - 18, l[1] - 8 - 12 - p.m1 * 2.5, 36, 12 + p.m1 * 2.5, C.blue), txt(l[0], l[1] - 12, `${f1(p.m1)} kg`, {size: 10, fill: '#fff'}), box(rr[0] - 18, rr[1] - 8 - 12 - p.m2 * 2.5, 36, 12 + p.m2 * 2.5, C.orange), txt(rr[0], rr[1] - 12, `${f1(p.m2)} kg`, {size: 10, fill: '#fff'}));
        out.push(txt(cx, 270, Math.abs(M) < 0.05 ? 'CÂN BẰNG' : M > 0 ? 'quay ngược chiều kim đồng hồ' : 'quay cùng chiều kim đồng hồ', {size: 13, bold: true, fill: Math.abs(M) < 0.05 ? C.green : C.red}));
        return out;
      },
      readouts: [
        {label: 'Moment bên trái M₁ = m₁g·d₁', value: (p) => `${f1(p.m1 * G * p.d1)} N·m`},
        {label: 'Moment bên phải M₂ = m₂g·d₂', value: (p) => `${f1(p.m2 * G * p.d2)} N·m`},
        {label: 'Moment tổng', value: (p) => `${f1(p.m1 * G * p.d1 - p.m2 * G * p.d2)} N·m`},
        {label: 'd₂ để cân bằng', value: (p) => (p.m2 > 0 ? `${f2((p.m1 * p.d1) / p.m2)} m` : '—')},
      ],
      note: 'Cân bằng khi tổng moment theo chiều kim đồng hồ bằng tổng moment ngược chiều: M = F·d. Đòn bẩy cho lợi về lực khi cánh tay đòn của lực tác dụng dài hơn.',
    },
  },

  PHYS_NEWTON_LAWS: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Định luật II Newton: xe có ma sát và máy Atwood',
    question: 'Gia tốc phụ thuộc hợp lực và khối lượng như thế nào? Vì sao máy Atwood với hai khối lượng gần bằng nhau chuyển động chậm dù trọng lực lên mỗi vật rất lớn?',
    keywords: /dinh luat (?:2|ii|hai) (?:cua )?newton|dinh luat (?:ii|2) niu-?ton|may atwood|\batwood\b|luc ma sat truot/,
    examples: ['định luật II Newton', 'máy Atwood', 'lực ma sát trượt và gia tốc'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'mode', label: 'Hệ', value: 'cart', options: [['cart', 'Xe kéo trên mặt phẳng ngang'], ['atwood', 'Máy Atwood']]}],
      sliders: [
        {key: 'F', label: 'Lực kéo F (xe)', unit: 'N', min: 0, max: 60, step: 1, value: 30, when: ['mode', ['cart']]},
        {key: 'm', label: 'Khối lượng xe m (hoặc m₁ ở máy Atwood)', unit: 'kg', min: 1, max: 20, step: 0.5, value: 5},
        {key: 'mu', label: 'Hệ số ma sát μ', min: 0, max: 0.8, step: 0.05, value: 0.2, when: ['mode', ['cart']]},
        {key: 'm2', label: 'm₂ (máy Atwood)', unit: 'kg', min: 1, max: 20, step: 0.5, value: 3, when: ['mode', ['atwood']]},
      ],
      time: {max: 4, label: 'Thời gian', unit: 's'},
      draw: (p, t, s) => {
        const out: Shape[] = [];
        if (s.mode === 'cart') {
          const a = cartAccel(p.F, p.m, p.mu);
          const x = 0.5 * a * t * t;
          const xmax = Math.max(0.5 * a * 16, 0.1);
          const px = 70 + 330 * Math.min(1, x / xmax);
          out.push(track(200), box(px, 150, 90, 40, C.blue), ring(px + 20, 196, 7, C.ink, 2), ring(px + 70, 196, 7, C.ink, 2), txt(px + 45, 175, `${f1(p.m)} kg`, {fill: '#fff'}));
          out.push(arrow(px + 90, 170, px + 90 + Math.min(110, p.F * 2.2), 170, C.green, 3), arrow(px, 205, px - Math.min(110, p.mu * p.m * G * 2.2), 205, C.red, 3));
          out.push(txt(px + 100 + p.F, 160, 'F', {fill: C.green, bold: true}), txt(px - 30, 224, 'Fms', {fill: C.red, bold: true}), txt(280, 270, `v = ${f2(a * t)} m/s    x = ${f2(x)} m`, {size: 12}));
        } else {
          const {a} = atwood(p.m, p.m2);
          const dy = Math.max(-70, Math.min(70, 0.5 * a * t * t * 12));
          out.push(ln(250, 40, 310, 40, {stroke: C.ink, w: 4}), ring(280, 60, 22, C.ink, 3), ln(258, 60, 258, 130 + dy, {stroke: C.ink}), ln(302, 60, 302, 130 - dy, {stroke: C.ink}), box(238, 130 + dy, 40, 18 + p.m * 2, C.blue), box(282, 130 - dy, 40, 18 + p.m2 * 2, C.orange), txt(258, 142 + dy, 'm₁', {fill: '#fff', size: 11}), txt(302, 142 - dy, 'm₂', {fill: '#fff', size: 11}));
        }
        return out;
      },
      readouts: [
        {label: 'Gia tốc a', value: (p, _t, s) => `${f2(s.mode === 'cart' ? cartAccel(p.F, p.m, p.mu) : atwood(p.m, p.m2).a)} m/s²`},
        {label: 'Xe: lực ma sát trượt cực đại μmg', value: (p) => `${f1(p.mu * p.m * G)} N`},
        {label: 'Máy Atwood: lực căng dây T', value: (p) => `${f2(atwood(p.m, p.m2).T)} N`},
      ],
      note: 'F ≤ μmg thì xe đứng yên (ma sát nghỉ cân bằng). Máy Atwood: a = (m₁ − m₂)g / (m₁ + m₂), T = 2m₁m₂g / (m₁ + m₂).',
    },
  },

  PHYS_SPRING_HOOKE: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Lò xo, định luật Hooke và ghép lò xo',
    question: 'Ghép nối tiếp và ghép song song hai lò xo cho độ cứng tương đương khác nhau ra sao? Độ giãn thay đổi thế nào khi treo cùng một vật?',
    keywords: /dinh luat hooke|\bhooke\b|do cung cua lo xo|ghep lo xo|bien dang cua lo xo|luc dan hoi cua lo xo/,
    examples: ['định luật Hooke', 'độ cứng của lò xo', 'ghép lò xo nối tiếp song song'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'mode', label: 'Cách ghép', value: 'single', options: [['single', 'Một lò xo'], ['series', 'Hai lò xo nối tiếp'], ['parallel', 'Hai lò xo song song']]}],
      sliders: [
        {key: 'k1', label: 'k₁', unit: 'N/m', min: 20, max: 300, step: 10, value: 100},
        {key: 'k2', label: 'k₂', unit: 'N/m', min: 20, max: 300, step: 10, value: 200},
        {key: 'm', label: 'Khối lượng treo', unit: 'kg', min: 0.1, max: 5, step: 0.1, value: 1},
      ],
      draw: (p, _t, s) => {
        const keq = springEq(s.mode, p.k1, p.k2);
        const ext = Math.min(170, ((p.m * G) / keq) * 160);
        const top = 36;
        const out: Shape[] = [ln(160, top, 400, top, {stroke: C.ink, w: 5})];
        let bottom = top + 70 + ext;
        if (s.mode === 'single') {
          out.push(spring(280, top, 280, bottom, 9));
        } else if (s.mode === 'parallel') {
          out.push(spring(230, top, 230, bottom, 9), spring(330, top, 330, bottom, 9), ln(210, bottom, 350, bottom, {stroke: C.ink, w: 4}));
        } else {
          const e1 = ((p.m * G) / p.k1) * 160;
          const e2 = ((p.m * G) / p.k2) * 160;
          const mid = top + 50 + Math.min(120, e1);
          bottom = mid + 50 + Math.min(120, e2);
          out.push(spring(280, top, 280, mid, 6), spring(280, mid, 280, bottom, 6), dot(280, mid, 3.5));
        }
        out.push(box(250, bottom, 60, 36 + p.m * 4, C.blue), txt(280, bottom + 24, `${f1(p.m)} kg`, {fill: '#fff'}), arrow(340, bottom + 18, 340, bottom + 18 + Math.min(60, p.m * G * 3), C.red, 2.4));
        return out;
      },
      readouts: [
        {label: 'Độ cứng tương đương k', value: (p, _t, s) => `${f1(springEq(s.mode, p.k1, p.k2))} N/m`},
        {label: 'Độ giãn Δl = mg/k', value: (p, _t, s) => `${f2((p.m * G) / springEq(s.mode, p.k1, p.k2))} m`},
        {label: 'Thế năng đàn hồi ½kΔl²', value: (p, _t, s) => `${f2(0.5 * springEq(s.mode, p.k1, p.k2) * ((p.m * G) / springEq(s.mode, p.k1, p.k2)) ** 2)} J`},
      ],
      note: 'Fđh = k·|Δl|. Nối tiếp: 1/k = 1/k₁ + 1/k₂ (mềm hơn). Song song: k = k₁ + k₂ (cứng hơn).',
    },
  },

  PHYS_FLUID_PRESSURE: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Áp suất chất lỏng và lực đẩy Archimedes',
    question: 'Áp suất trong chất lỏng tăng theo độ sâu như thế nào? Vì sao vật có khối lượng riêng nhỏ hơn chất lỏng thì nổi và chìm một phần?',
    keywords: /ap suat chat long|luc day archimedes|archimedes|ap suat thuy tinh|vat noi vat chim|khoi luong rieng cua chat long/,
    examples: ['áp suất chất lỏng', 'lực đẩy Archimedes', 'vật nổi vật chìm'],
    data: {
      viewBox: [560, 320],
      sliders: [
        {key: 'rho', label: 'Khối lượng riêng chất lỏng', unit: 'kg/m³', min: 700, max: 13600, step: 100, value: 1000},
        {key: 'rhoO', label: 'Khối lượng riêng vật', unit: 'kg/m³', min: 200, max: 8000, step: 100, value: 600},
        {key: 'h', label: 'Độ sâu điểm xét', unit: 'm', min: 0, max: 10, step: 0.5, value: 4},
      ],
      draw: (p) => {
        const out: Shape[] = [box(60, 90, 300, 190, 'rgba(37,99,235,0.18)', C.ink), ln(60, 90, 360, 90, {stroke: C.blue, w: 2})];
        const cube = 70;
        const floats = p.rhoO < p.rho;
        const sub = floats ? p.rhoO / p.rho : 1;
        const top = floats ? 90 - cube * (1 - sub) : 280 - cube;
        out.push(box(120, top, cube, cube, C.orange), txt(155, top + 38, floats ? 'nổi' : 'chìm', {fill: '#fff', bold: true}));
        const py = 90 + (p.h / 10) * 190;
        out.push(dot(300, py, 5, C.red), ln(300, 90, 300, py, {stroke: C.red, dash: '3 3'}), txt(318, py + 4, `h = ${f1(p.h)} m`, {size: 11, anchor: 'start', fill: C.red}));
        const bar = Math.min(150, ((p.rho * G * p.h) / (13600 * G * 10)) * 150);
        out.push(box(420, 280 - bar, 40, bar, 'rgba(220,38,38,0.4)', C.red), txt(440, 298, 'p', {size: 12}), arrow(150, top + cube + 6, 150, top + cube + 6 + Math.min(40, 20 + sub * 20), C.green, 2.4));
        return out;
      },
      readouts: [
        {label: 'Áp suất tại độ sâu h: p = p₀ + ρgh', value: (p) => `${f1((101325 + p.rho * G * p.h) / 1000)} kPa (ρgh = ${f1((p.rho * G * p.h) / 1000)} kPa)`},
        {label: 'Trạng thái của vật', value: (p) => (p.rhoO < p.rho ? `nổi, ngập ${f1((100 * p.rhoO) / p.rho)} % thể tích` : p.rhoO === p.rho ? 'lơ lửng' : 'chìm')},
        {label: 'Lực đẩy Archimedes lên khối 1 L ngập hoàn toàn', value: (p) => `${f2(p.rho * G * 0.001)} N (trọng lượng ${f2(p.rhoO * G * 0.001)} N)`},
      ],
      note: 'Fₐ = ρ·g·V (V là thể tích phần chìm). Vật nổi khi ρ vật < ρ chất lỏng; khi nổi cân bằng thì Fₐ = P.',
    },
  },

  PHYS_WORK_ENERGY: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Công, năng lượng và bảo toàn cơ năng khi trượt xuống dốc',
    question: 'Khi vật trượt xuống dốc thế năng giảm đi chuyển thành những dạng nào? Có ma sát thì cơ năng còn bảo toàn không và phần mất đi đi đâu?',
    keywords: /bao toan co nang|dinh luat bao toan nang luong|cong va cong suat|dong nang va the nang|cong cua luc ma sat|hieu suat cua may/,
    examples: ['bảo toàn cơ năng', 'động năng và thế năng', 'công của lực ma sát', 'hiệu suất của máy'],
    data: {
      viewBox: [560, 320],
      sliders: [
        {key: 'h', label: 'Độ cao ban đầu', unit: 'm', min: 1, max: 10, step: 0.5, value: 5},
        {key: 'al', label: 'Góc nghiêng', unit: '°', min: 10, max: 60, step: 1, value: 30},
        {key: 'mu', label: 'Hệ số ma sát μ', min: 0, max: 0.6, step: 0.05, value: 0.1},
        {key: 'm', label: 'Khối lượng', unit: 'kg', min: 1, max: 10, step: 0.5, value: 2},
      ],
      time: {max: 6, label: 'Thời gian', unit: 's'},
      draw: (p, t) => {
        const a = slideAccel(p.al, p.mu);
        const L = p.h / Math.sin(rad(p.al));
        const sdist = Math.min(L, 0.5 * a * t * t);
        const k = Math.min(36, 230 / Math.max(L * Math.cos(rad(p.al)), p.h));
        const X0 = 60;
        const Y0 = 260;
        const topX = X0;
        const topY = Y0 - p.h * k;
        const bx = X0 + L * Math.cos(rad(p.al)) * k;
        const along = (u: number): [number, number] => [topX + u * Math.cos(rad(p.al)) * k, topY + u * Math.sin(rad(p.al)) * k];
        const [px, py] = along(sdist);
        const out: Shape[] = [poly([[topX, topY], [bx, Y0], [topX, Y0]], {fill: '#E7E5E4', stroke: C.ink}), box(px - 11, py - 22, 22, 22, C.blue, undefined)];
        const E = p.m * G * p.h;
        const v = a * Math.min(t, Math.sqrt((2 * L) / Math.max(a, 1e-9)));
        const Ek = a > 0 ? 0.5 * p.m * v * v : 0;
        const Q = p.mu * p.m * G * Math.cos(rad(p.al)) * sdist;
        const Ep = p.m * G * (p.h - sdist * Math.sin(rad(p.al)));
        const bw = 36;
        const sc = 150 / E;
        [[Ep, C.blue, 'Wt'], [Ek, C.red, 'Wđ'], [Q, C.orange, 'Q']].forEach(([val, col, lab], i) => {
          const hh = (val as number) * sc;
          out.push(box(340 + i * 60, 260 - hh, bw, hh, col as string), txt(340 + i * 60 + bw / 2, 278, lab as string, {size: 11}));
        });
        out.push(ln(330, 260 - E * sc, 520, 260 - E * sc, {stroke: C.ink, dash: '4 3'}), txt(526, 260 - E * sc + 4, 'E₀', {size: 10, anchor: 'start'}));
        return out;
      },
      readouts: [
        {label: 'Thế năng · động năng · nhiệt do ma sát', value: (p, t) => {
          const a = slideAccel(p.al, p.mu);
          const L = p.h / Math.sin(rad(p.al));
          const sd = Math.min(L, 0.5 * a * t * t);
          const v = a * Math.min(t, Math.sqrt((2 * L) / Math.max(a, 1e-9)));
          return `${f1(p.m * G * (p.h - sd * Math.sin(rad(p.al))))} · ${f1(a > 0 ? 0.5 * p.m * v * v : 0)} · ${f1(p.mu * p.m * G * Math.cos(rad(p.al)) * sd)} J`;
        }},
        {label: 'Tổng (luôn bằng mgh)', value: (p) => `${f1(p.m * G * p.h)} J`},
        {label: 'Gia tốc trượt a = g(sin α − μcos α)', value: (p) => (slideAccel(p.al, p.mu) > 0 ? `${f2(slideAccel(p.al, p.mu))} m/s²` : '0: ma sát giữ vật đứng yên')},
      ],
      note: 'Không ma sát: Wt + Wđ = const. Có ma sát: phần cơ năng giảm đúng bằng công của lực ma sát và tỏa thành nhiệt.',
    },
  },

  PHYS_COLLISION_1D: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Va chạm một chiều: bảo toàn động lượng',
    question: 'Trong va chạm đàn hồi và va chạm mềm, đại lượng nào luôn bảo toàn, đại lượng nào không? Vì sao động năng giảm đi trong va chạm mềm?',
    keywords: /va cham (?:dan hoi|mem|mot chieu)|dinh luat bao toan dong luong|dong luong cua vat|con lac newton/,
    examples: ['va chạm một chiều', 'định luật bảo toàn động lượng', 'va chạm đàn hồi và va chạm mềm', 'con lắc Newton'],
    data: {
      viewBox: [560, 280],
      sliders: [
        {key: 'm1', label: 'm₁', unit: 'kg', min: 1, max: 10, step: 0.5, value: 4},
        {key: 'm2', label: 'm₂', unit: 'kg', min: 1, max: 10, step: 0.5, value: 2},
        {key: 'v1', label: 'v₁', unit: 'm/s', min: -4, max: 8, step: 0.5, value: 5},
        {key: 'v2', label: 'v₂', unit: 'm/s', min: -4, max: 8, step: 0.5, value: -1},
        {key: 'e', label: 'Hệ số phục hồi e (0 mềm, 1 đàn hồi)', min: 0, max: 1, step: 0.05, value: 1},
      ],
      time: {max: 6, label: 'Thời gian', unit: 's'},
      draw: (p, t) => {
        const gap = 300;
        const x1_0 = 90;
        const approach = p.v1 - p.v2;
        const [u1, u2] = collide(p.m1, p.v1, p.m2, p.v2, p.e);
        const s = 40;
        const tcol = approach > 0 ? Math.min(3, gap / (approach * s)) : Infinity;
        const pos = (x0: number, v: number, u: number) => (t < tcol ? x0 + v * s * t : x0 + v * s * tcol + u * s * (t - tcol));
        const w = (m: number) => 28 + m * 4;
        const a = Math.max(40, Math.min(480, pos(x1_0, p.v1, u1)));
        const b = Math.max(40, Math.min(480, pos(x1_0 + gap, p.v2, u2)));
        const out: Shape[] = [track(200), box(a - w(p.m1), 200 - w(p.m1), w(p.m1), w(p.m1), C.blue), box(b, 200 - w(p.m2), w(p.m2), w(p.m2), C.orange), txt(a - w(p.m1) / 2, 200 - w(p.m1) / 2 + 4, `${f1(p.m1)} kg`, {fill: '#fff', size: 11}), txt(b + w(p.m2) / 2, 200 - w(p.m2) / 2 + 4, `${f1(p.m2)} kg`, {fill: '#fff', size: 11})];
        const vv1 = t < tcol ? p.v1 : u1;
        const vv2 = t < tcol ? p.v2 : u2;
        out.push(arrow(a - w(p.m1) / 2, 200 - w(p.m1) - 10, a - w(p.m1) / 2 + vv1 * 10, 200 - w(p.m1) - 10, C.blue, 2.4), arrow(b + w(p.m2) / 2, 200 - w(p.m2) - 10, b + w(p.m2) / 2 + vv2 * 10, 200 - w(p.m2) - 10, C.orange, 2.4));
        return out;
      },
      readouts: [
        {label: 'Vận tốc sau va chạm v₁′ · v₂′', value: (p) => {
          const [u1, u2] = collide(p.m1, p.v1, p.m2, p.v2, p.e);
          return `${f2(u1)} · ${f2(u2)} m/s`;
        }},
        {label: 'Động lượng trước · sau', value: (p) => {
          const [u1, u2] = collide(p.m1, p.v1, p.m2, p.v2, p.e);
          return `${f2(p.m1 * p.v1 + p.m2 * p.v2)} · ${f2(p.m1 * u1 + p.m2 * u2)} kg·m/s`;
        }},
        {label: 'Động năng trước · sau', value: (p) => {
          const [u1, u2] = collide(p.m1, p.v1, p.m2, p.v2, p.e);
          return `${f2(0.5 * p.m1 * p.v1 ** 2 + 0.5 * p.m2 * p.v2 ** 2)} · ${f2(0.5 * p.m1 * u1 ** 2 + 0.5 * p.m2 * u2 ** 2)} J`;
        }},
      ],
      note: 'Động lượng p = mv của hệ kín luôn bảo toàn. Chỉ va chạm đàn hồi (e = 1) bảo toàn động năng; va chạm mềm (e = 0) hai vật dính nhau và mất nhiều động năng nhất.',
    },
  },

  PHYS_CIRCULAR_MOTION: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Chuyển động tròn đều, lực hướng tâm và vệ tinh',
    question: 'Vì sao vật chuyển động tròn đều vẫn có gia tốc? Vệ tinh ở càng cao thì tốc độ dài và chu kì thay đổi ra sao?',
    keywords: /chuyen dong tron deu|luc huong tam|gia toc huong tam|toc do goc|ve tinh nhan tao|toc do vu tru/,
    examples: ['chuyển động tròn đều', 'lực hướng tâm', 'gia tốc hướng tâm', 'vệ tinh nhân tạo'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'mode', label: 'Mô hình', value: 'circle', options: [['circle', 'Vật buộc dây quay tròn'], ['sat', 'Vệ tinh quanh Trái Đất']]}],
      sliders: [
        {key: 'r', label: 'Bán kính quỹ đạo', unit: 'm', min: 0.2, max: 2, step: 0.1, value: 1},
        {key: 'T', label: 'Chu kì quay', unit: 's', min: 0.5, max: 8, step: 0.1, value: 2},
        {key: 'm', label: 'Khối lượng vật', unit: 'kg', min: 0.1, max: 5, step: 0.1, value: 0.5},
        {key: 'hk', label: 'Độ cao vệ tinh', unit: 'km', min: 300, max: 36000, step: 100, value: 400},
      ],
      time: {max: 16, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t, s) => {
        const out: Shape[] = [];
        if (s.mode === 'circle') {
          const R = 100 * p.r;
          const w = (2 * Math.PI) / p.T;
          const ang = w * t;
          const cx = 280;
          const cy = 160;
          const x = cx + R * Math.cos(ang);
          const y = cy - R * Math.sin(ang);
          const v = w * p.r;
          out.push(ring(cx, cy, R, C.light, 1.5), ln(cx, cy, x, y, {stroke: C.ink, w: 1.4}), dot(cx, cy, 3), dot(x, y, 9, C.blue));
          out.push(arrow(x, y, x - Math.sin(ang) * Math.min(80, v * 14), y - Math.cos(ang) * Math.min(80, v * 14), C.green, 2.6), arrow(x, y, x + (cx - x) * Math.min(0.6, ((v * v) / p.r) * 0.05), y + (cy - y) * Math.min(0.6, ((v * v) / p.r) * 0.05), C.red, 2.6));
          out.push(txt(x - Math.sin(ang) * Math.min(80, v * 14) + 8, y - Math.cos(ang) * Math.min(80, v * 14), 'v⃗', {fill: C.green, bold: true}), txt(x + (cx - x) * 0.3, y + (cy - y) * 0.3 - 8, 'a⃗ht', {fill: C.red, bold: true}));
        } else {
          const Rr = (6371 + p.hk) / 6371;
          const k = 22;
          const T = orbitPeriodH(p.hk);
          const ang = ((2 * Math.PI) / 12) * t * (1.5 / T);
          out.push({t: 'circle', cx: 280, cy: 160, r: k, fill: 'rgba(37,99,235,0.35)', stroke: C.blue}, ring(280, 160, Rr * k, C.light, 1.5), dot(280 + Rr * k * Math.cos(ang), 160 - Rr * k * Math.sin(ang), 5, C.red));
          out.push(txt(280, 164, 'Trái Đất', {size: 10}));
        }
        return out;
      },
      readouts: [
        {label: 'Vật quay: v = 2πr/T · ω', value: (p) => `${f2((2 * Math.PI * p.r) / p.T)} m/s · ${f2((2 * Math.PI) / p.T)} rad/s`},
        {label: 'Gia tốc hướng tâm · lực hướng tâm', value: (p) => `${f2((4 * Math.PI ** 2 * p.r) / p.T ** 2)} m/s² · ${f2((p.m * 4 * Math.PI ** 2 * p.r) / p.T ** 2)} N`},
        {label: 'Vệ tinh: tốc độ · chu kì', value: (p) => `${f2(orbitSpeed(p.hk) / 1000)} km/s · ${f2(orbitPeriodH(p.hk))} giờ`},
      ],
      note: 'Hướng của a⃗ luôn hướng vào tâm, v⃗ tiếp tuyến: tốc độ không đổi nhưng hướng thay đổi nên có gia tốc. Vệ tinh địa tĩnh ở độ cao ≈ 35 800 km có chu kì 24 giờ.',
    },
  },

  PHYS_SHM: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Dao động điều hòa của con lắc lò xo',
    question: 'Li độ, vận tốc và gia tốc của dao động điều hòa lệch pha nhau thế nào? Cơ năng chuyển hóa giữa động năng và thế năng ra sao, và khi có ma sát biên độ thay đổi thế nào?',
    keywords: /con lac lo xo|li do va van toc|chu ki dao dong|dao dong tat dan|co nang cua dao dong|cong huong co hoc/,
    examples: ['con lắc lò xo', 'dao động tắt dần', 'cơ năng của dao động', 'li độ và vận tốc'],
    data: {
      viewBox: [560, 340],
      sliders: [
        {key: 'A', label: 'Biên độ A', unit: 'cm', min: 1, max: 10, step: 0.5, value: 6},
        {key: 'T', label: 'Chu kì T', unit: 's', min: 0.5, max: 4, step: 0.1, value: 2},
        {key: 'phi', label: 'Pha ban đầu φ', unit: '°', min: -180, max: 180, step: 15, value: 0},
        {key: 'b', label: 'Hệ số tắt dần', min: 0, max: 0.5, step: 0.05, value: 0},
      ],
      time: {max: 8, label: 'Thời gian', unit: 's', autoplay: false},
      draw: (p, t) => {
        const k = 9;
        const x = shmX(p.A, p.T, p.phi, t, p.b);
        const cx = 280;
        const out: Shape[] = [ln(60, 70, 60, 120, {stroke: C.ink, w: 5}), spring(60, 95, cx + x * k - 22, 95, 10, 10), box(cx + x * k - 22, 73, 44, 44, C.blue), ln(cx, 62, cx, 128, {stroke: C.grey, dash: '3 3'}), txt(cx, 56, 'VTCB', {size: 10})];
        out.push(...miniGraph(40, 150, 300, 110, (u) => shmX(p.A, p.T, p.phi, u, p.b), 0, 8, C.blue, 'x(t)', t, [-10, 10]));
        const E0 = p.A * p.A;
        const eT = (x * x) / E0;
        const bx = 400;
        out.push(box(bx, 150, 120, 110, '#FFFFFF', C.light), box(bx + 20, 260 - 100 * Math.min(1, eT), 30, 100 * Math.min(1, eT), C.orange), box(bx + 70, 260 - 100 * Math.min(1, 1 - eT), 30, 100 * Math.min(1, 1 - eT), C.red), txt(bx + 35, 276, 'Wt', {size: 10}), txt(bx + 85, 276, 'Wđ', {size: 10}));
        // vòng pha
        out.push(ring(110, 305, 24, C.light, 1.2), ln(110, 305, 110 + 24 * Math.cos((2 * Math.PI * t) / p.T + rad(p.phi)), 305 - 24 * Math.sin((2 * Math.PI * t) / p.T + rad(p.phi)), {stroke: C.green, w: 2}), txt(190, 308, 'vectơ quay biểu diễn dao động', {size: 10, anchor: 'start', fill: C.grey}));
        return out;
      },
      readouts: [
        {label: 'x · v · a tại thời điểm t', value: (p, t) => {
          const w = (2 * Math.PI) / p.T;
          const x = shmX(p.A, p.T, p.phi, t, p.b);
          return `${f2(x)} cm · ${f2(shmV(p.A, p.T, p.phi, t))} cm/s · ${f2(-w * w * x)} cm/s²`;
        }},
        {label: 'Tần số f · tần số góc ω', value: (p) => `${f2(1 / p.T)} Hz · ${f2((2 * Math.PI) / p.T)} rad/s`},
        {label: 'vmax · amax', value: (p) => `${f2(p.A * ((2 * Math.PI) / p.T))} cm/s · ${f2(p.A * ((2 * Math.PI) / p.T) ** 2)} cm/s²`},
      ],
      note: 'x = A·cos(ωt + φ); v sớm pha π/2 so với x; a ngược pha với x. Khi b > 0, biên độ giảm dần theo hàm mũ (dao động tắt dần).',
    },
  },

  PHYS_WAVE_MECH: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Sóng cơ: sóng ngang, sóng dọc và sóng dừng',
    question: 'Phần tử môi trường có truyền đi theo sóng không? Bước sóng, tần số và tốc độ truyền sóng liên hệ nhau thế nào, và sóng dừng hình thành khi nào?',
    keywords: /song co\b(?!.*giao thoa)|song ngang|song doc|song dung|buoc song|toc do truyen song|phuong trinh song|song am\b/,
    examples: ['sóng cơ', 'sóng ngang và sóng dọc', 'sóng dừng', 'bước sóng'],
    data: {
      viewBox: [560, 300],
      choices: [{key: 'mode', label: 'Loại sóng', value: 'travel', options: [['travel', 'Sóng ngang truyền'], ['standing', 'Sóng dừng'], ['long', 'Sóng dọc']]}],
      sliders: [
        {key: 'lam', label: 'Bước sóng λ', unit: 'm', min: 1, max: 4, step: 0.25, value: 2},
        {key: 'f', label: 'Tần số f', unit: 'Hz', min: 0.25, max: 2, step: 0.25, value: 0.5},
        {key: 'A', label: 'Biên độ', unit: 'm', min: 0.2, max: 1, step: 0.1, value: 0.6},
      ],
      time: {max: 8, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t, s) => {
        const k = 46;
        const x0 = 40;
        const cy = 150;
        const out: Shape[] = [ln(x0, cy, x0 + 10 * k, cy, {stroke: C.light})];
        const kk = (2 * Math.PI) / p.lam;
        const w = 2 * Math.PI * p.f;
        const pts: [number, number][] = [];
        if (s.mode === 'long') {
          for (let row = 0; row < 3; row++) for (let i = 0; i < 60; i++) {
            const x = (i / 60) * 10;
            const d = p.A * 0.5 * Math.sin(kk * x - w * t);
            const dens = Math.sin(kk * x - w * t);
            out.push(dot(x0 + (x + d) * k, 100 + row * 40, 3, dens < -0.5 ? C.red : C.blue));
          }
          return out;
        }
        for (let i = 0; i <= 200; i++) {
          const x = (i / 200) * 10;
          const y = s.mode === 'travel' ? p.A * Math.sin(kk * x - w * t) : 2 * p.A * 0.5 * Math.sin(kk * x) * Math.cos(w * t);
          pts.push([x0 + x * k, cy - y * 60]);
        }
        out.push(poly(pts, {stroke: C.blue, w: 2.6, close: false}));
        if (s.mode === 'travel') out.push(dot(x0 + 2.5 * k, cy - p.A * Math.sin(kk * 2.5 - w * t) * 60, 6, C.red), ln(x0 + 2.5 * k, 60, x0 + 2.5 * k, 240, {stroke: C.red, dash: '3 3', w: 1}));
        else for (let n = 0; n * (p.lam / 2) <= 10; n++) out.push(dot(x0 + n * (p.lam / 2) * k, cy, 4.5, C.red));
        return out;
      },
      readouts: [
        {label: 'Tốc độ truyền sóng v = λf', value: (p) => `${f2(p.lam * p.f)} m/s`},
        {label: 'Chu kì T = 1/f', value: (p) => `${f2(1 / p.f)} s`},
        {label: 'Sóng dừng: khoảng cách hai nút liên tiếp', value: (p) => `${f2(p.lam / 2)} m`},
      ],
      note: 'Sóng truyền năng lượng và pha dao động, các phần tử chỉ dao động quanh vị trí cân bằng. Sóng dừng: hai nút (chấm đỏ) cách nhau λ/2.',
    },
  },
};
