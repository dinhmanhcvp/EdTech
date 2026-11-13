/**
 * Ba mô phỏng kiểu 3D (học từ studio "Vẻ đẹp Vật lí" của board hntech, tự dựng bằng bộ chiếu 3D nhẹ, không cần WebGL):
 * sóng điện từ (E ⊥ B ⊥ v), Trái Đất nghiêng 23,5° (ngày – đêm và các mùa), con lắc Newton.
 * Khác bản gốc: có thanh trượt xoay/nhìn (chạy "Tự chạy" để tự xoay), số liệu đọc được ngay (λ ↔ f, độ dài ngày, bảo toàn động lượng),
 * và mỗi hình luôn có câu hỏi quan sát dẫn dắt.
 */
import type {PresetSpec, Shape} from './types';
import {C, arrow, callout, deg, dot, f1, f2, glassPlinth, ln, lensFrame, rad, txt} from './sceneKit';
import {axes3, depthSorted, line3, poly3, project, sphere3, type Cam, type V3} from './scene3d';

// ------------------------------------------------------------------ công thức (xuất để kiểm thử)
export const LIGHT_SPEED = 3e8;
/** Trường E, B của sóng điện từ phẳng tại vị trí x (m) lúc t (s hiển thị): E = E₀ sin(kx − ωt), B = E/c. */
export function emWave(E0: number, lamM: number, x: number, tSec: number, periodS = 2): {E: number; B: number; k: number; w: number} {
  const k = (2 * Math.PI) / lamM;
  const w = (2 * Math.PI) / periodS;
  const E = E0 * Math.sin(k * x - w * tSec);
  return {E, B: E / LIGHT_SPEED, k, w};
}
export const freqFromLambda = (lamM: number) => LIGHT_SPEED / lamM;

/** Độ lệch xích vĩ của Mặt Trời (độ) ở ngày thứ N trong năm, độ nghiêng trục tilt (độ): sin δ = sin(tilt)·cos α, α = 2π(N − 172)/365. */
export function declination(tiltDeg: number, dayOfYear: number): number {
  const alpha = (2 * Math.PI * (dayOfYear - 172)) / 365;
  return deg(Math.asin(Math.sin(rad(tiltDeg)) * Math.cos(alpha)));
}
/** Độ dài ngày (giờ) ở vĩ độ lat với xích vĩ decl: 24/π · arccos(−tan φ tan δ); 24 = ngày địa cực, 0 = đêm địa cực. */
export function dayLengthH(latDeg: number, declDeg: number): number {
  const x = -Math.tan(rad(latDeg)) * Math.tan(rad(declDeg));
  if (x >= 1) return 0;
  if (x <= -1) return 24;
  return (24 / Math.PI) * Math.acos(x);
}
export const noonElevation = (latDeg: number, declDeg: number) => 90 - Math.abs(latDeg - declDeg);
const MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function dateOfDay(n: number): string {
  let d = Math.max(1, Math.min(365, Math.round(n)));
  for (let m = 0; m < 12; m++) {
    if (d <= MONTHS[m]) return `${d}/${m + 1}`;
    d -= MONTHS[m];
  }
  return '31/12';
}
export function seasonNorth(n: number): string {
  const d = ((n - 80 + 365) % 365) / 91.25;
  return d < 1 ? 'Xuân' : d < 2 ? 'Hè' : d < 3 ? 'Thu' : 'Đông';
}

/** Góc lệch (độ, trái âm, phải dương) của từng quả cầu con lắc Newton lúc t: n quả bên trái nâng lên, n quả bên phải bật ra. */
export function cradleAngles(n: number, theta0: number, periodS: number, t: number, loss = 0, total = 5): number[] {
  const out = Array.from({length: total}, () => 0);
  const half = periodS / 2;
  const q = periodS / 4;
  const cycle = Math.floor(t / half); // mỗi nửa chu kì biên độ giảm theo hao hụt
  const amp = theta0 * Math.pow(1 - loss, cycle);
  const ph = ((t % periodS) + periodS) % periodS;
  const w = (2 * Math.PI) / periodS;
  let left = 0;
  let right = 0;
  if (ph < q) left = -amp * Math.cos(w * ph);
  else if (ph < 3 * q) right = amp * Math.sin(w * (ph - q));
  else left = -amp * Math.sin(w * (ph - 3 * q));
  for (let i = 0; i < n; i++) out[i] = left;
  for (let i = 0; i < n; i++) out[total - 1 - i] = right;
  return out;
}
export const cradleSpeed = (L: number, theta0: number, g = 9.8) => Math.sqrt(2 * g * L * (1 - Math.cos(rad(theta0))));

const view = (p: Record<string, number>, cx: number, cy: number, s: number): Cam => ({az: p.az, el: p.el, cx, cy, s});

export const LY_SCENE3_PRESETS: Record<string, PresetSpec> = {
  PHYS_EM_WAVE_3D: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Sóng điện từ trong không gian: E vuông góc B vuông góc phương truyền',
    question: 'Điện trường và từ trường của sóng điện từ dao động trong những mặt phẳng nào so với phương truyền? Khi E đạt cực đại thì B đang ở đâu, và nếu giảm bước sóng thì tần số đổi ra sao?',
    keywords: /su lan truyen cua song dien tu|song dien tu lan truyen|song dien tu 3d|vecto e vuong goc b|dien truong va tu truong bien thien|song dien tu trong khong gian/,
    examples: ['sự lan truyền của sóng điện từ', 'sóng điện từ 3D', 'vectơ E vuông góc B', 'điện trường và từ trường biến thiên'],
    data: {
      viewBox: [560, 340],
      stage: 'night',
      sliders: [
        {key: 'lam', label: 'Bước sóng λ', unit: 'm', min: 1, max: 4, step: 0.1, value: 2},
        {key: 'E0', label: 'Biên độ điện trường E₀', unit: 'V/m', min: 20, max: 100, step: 5, value: 60},
        {key: 'az', label: 'Xoay hình (ngang)', unit: '°', min: 0, max: 360, step: 5, value: 35},
        {key: 'el', label: 'Nhìn từ trên xuống', unit: '°', min: 0, max: 70, step: 5, value: 22},
      ],
      tryIt: 'Kéo bước sóng λ về 1 m rồi lên 4 m; bật chỉ E, rồi chỉ B; xoay hình để nhìn từ trên xuống.',
      see: 'λ nhỏ thì sóng dày hơn và tần số f lớn hơn; E và B luôn đạt cực đại cùng lúc ở một vị trí và luôn vuông góc nhau.',
      toggles: [
        {key: 'showE', label: 'Hiện điện trường E (đỏ)', value: true},
        {key: 'showB', label: 'Hiện từ trường B (xanh)', value: true},
        {key: 'stems', label: 'Hiện các mũi tên', value: true},
      ],
      time: {max: 8, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t) => {
        const cam = view(p, 280, 175, 56);
        const out: Shape[] = [];
        const L = 7;
        const x0 = -3.5;
        const amp = 1.5 * (p.E0 / 100) + 0.35;
        // trục truyền sóng + mặt phẳng dao động của E (đứng) và B (ngang): vẽ khung nhạt cho thấy hai mặt phẳng vuông góc
        out.push(line3([x0, 0, 0], [x0 + L, 0, 0], cam, C.ink, 2, {arrow: true}));
        out.push(poly3([[x0, -amp - 0.3, 0], [x0 + L, -amp - 0.3, 0], [x0 + L, amp + 0.3, 0], [x0, amp + 0.3, 0]], cam, {stroke: C.red, fill: C.red, close: true, w: 1, o: 0.05}));
        out.push(poly3([[x0, 0, -amp - 0.3], [x0 + L, 0, -amp - 0.3], [x0 + L, 0, amp + 0.3], [x0, 0, amp + 0.3]], cam, {stroke: C.blue, fill: C.blue, close: true, w: 1, o: 0.05}));
        const N = 56;
        const Epts: V3[] = [];
        const Bpts: V3[] = [];
        const items: {z: number; shapes: Shape[]}[] = [];
        for (let i = 0; i <= N; i++) {
          const x = x0 + (L * i) / N;
          const {E} = emWave(p.E0, p.lam, x, t);
          const e = (E / p.E0) * amp;
          Epts.push([x, e, 0]);
          Bpts.push([x, 0, e]);
        }
        if (p.showE) out.push(poly3(Epts, cam, {stroke: C.red, w: 2.6}));
        if (p.showB) out.push(poly3(Bpts, cam, {stroke: C.blue, w: 2.6}));
        if (p.stems) {
          for (let i = 0; i <= N; i += 2) {
            const x = x0 + (L * i) / N;
            const q = project([x, 0, 0], cam);
            if (p.showE) items.push({z: q.z, shapes: [line3([x, 0, 0], Epts[i], cam, C.red, 1.4, {arrow: Math.abs(Epts[i][1]) > 0.15})]});
            if (p.showB) items.push({z: q.z, shapes: [line3([x, 0, 0], Bpts[i], cam, C.blue, 1.4, {arrow: Math.abs(Bpts[i][2]) > 0.15})]});
          }
          out.push(...depthSorted(items));
        }
        out.push(...axes3({...cam, cx: 70, cy: 285, s: 28}, 1, ['x', 'y', 'z']));
        const tip = project([x0 + L + 0.4, 0, 0], cam);
        out.push(txt(tip.x + 4, tip.y - 8, 'v⃗ = c⃗', {size: 13, fill: C.ink, bold: true, anchor: 'start'}));
        const eTip = project([x0 + 1.2, amp, 0], cam);
        const bTip = project([x0 + 2.4, 0, amp], cam);
        if (p.showE) out.push(...callout(eTip.x, eTip.y, 30, 20, 'Điện trường E: dao động theo phương đứng', C.red));
        if (p.showB) out.push(...callout(bTip.x, bTip.y, 30, 48, 'B: dao động ngang, ⊥ E', '#6C8CFF'));
        return out;
      },
      readouts: [
        {label: 'Tần số f = c/λ', value: (p) => `${f1(freqFromLambda(p.lam) / 1e6, 1)} MHz (λ = ${f1(p.lam, 1)} m)`},
        {label: 'Biên độ B₀ = E₀/c', value: (p) => `${f2((p.E0 / LIGHT_SPEED) * 1e9)} nT`},
        {label: 'Quan hệ giữa E, B và phương truyền', value: () => 'E⃗ ⊥ B⃗ ⊥ v⃗; E và B cùng pha'},
      ],
      note: 'Điện trường và từ trường biến thiên cùng pha, vuông góc nhau và vuông góc phương truyền: sóng điện từ là sóng ngang. Giảm bước sóng thì tần số tăng vì f = c/λ (c = 3·10⁸ m/s).',
    },
  },

  PHYS_EARTH_SEASONS: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Trái Đất nghiêng 23,5°: ngày – đêm và các mùa',
    question: 'Vì sao cùng một ngày mà nơi ngày dài, nơi ngày ngắn? Nếu trục Trái Đất không nghiêng thì còn có mùa không, và độ dài ngày ở xích đạo thay đổi thế nào quanh năm?',
    keywords: /trai dat nghieng|ngay dem va cac mua|do dai ngay dem|ngay dai dem ngan|trai dat quay quanh mat troi|ngay dem dai ngan theo mua|goc nghieng cua truc trai dat/,
    examples: ['Trái Đất nghiêng', 'ngày đêm và các mùa', 'độ dài ngày đêm', 'góc nghiêng của trục Trái Đất'],
    data: {
      viewBox: [560, 340],
      stage: 'night',
      tryIt: 'Kéo "Ngày trong năm" qua 21/6 rồi 22/12; đổi vĩ độ lên 80°; cuối cùng đặt Độ nghiêng trục về 0°.',
      see: 'Hạ chí: Bắc bán cầu ngày dài, tia nắng gần vuông góc; đông chí thì ngược lại. Ở 80° có ngày hoặc đêm kéo dài 24 giờ. Khi trục không nghiêng, ngày luôn 12 giờ và hết mùa.',
      sliders: [
        {key: 'day', label: 'Ngày trong năm', unit: 'ngày', min: 1, max: 365, step: 1, value: 172},
        {key: 'lat', label: 'Vĩ độ quan sát', unit: '°', min: -90, max: 90, step: 1, value: 21},
        {key: 'tilt', label: 'Độ nghiêng trục', unit: '°', min: 0, max: 45, step: 0.5, value: 23.5},
        {key: 'az', label: 'Xoay quỹ đạo', unit: '°', min: 0, max: 360, step: 5, value: 20},
      ],
      draw: (p) => {
        const out: Shape[] = [];
        const cam = {...view(p, 150, 175, 52), el: 52};
        const R = 2.4;
        const alpha = (2 * Math.PI * (p.day - 172)) / 365;
        // quỹ đạo + Mặt Trời + Trái Đất nhỏ
        const orbit: V3[] = Array.from({length: 73}, (_, i) => [-R * Math.cos((2 * Math.PI * i) / 72), 0, -R * Math.sin((2 * Math.PI * i) / 72)] as V3);
        out.push(poly3(orbit, cam, {stroke: C.grey, w: 1.4, dash: '4 4'}));
        const sunP = project([0, 0, 0], cam);
        out.push({t: 'circle', cx: sunP.x, cy: sunP.y, r: 46, fill: '#FACC15', o: 0.1}, {t: 'circle', cx: sunP.x, cy: sunP.y, r: 32, fill: '#FACC15', o: 0.16});
        const sun = sphere3([0, 0, 0], 0.5, cam, '#FACC15', '#CA8A04');
        const pos: V3 = [-R * Math.cos(alpha), 0, -R * Math.sin(alpha)];
        const earth = sphere3(pos, 0.24, cam, '#60A5FA', '#1D4ED8');
        const a: V3 = [Math.sin(rad(p.tilt)), Math.cos(rad(p.tilt)), 0];
        out.push(...depthSorted([sun, earth]));
        out.push(line3([pos[0] - a[0] * 0.5, pos[1] - a[1] * 0.5, pos[2]], [pos[0] + a[0] * 0.5, pos[1] + a[1] * 0.5, pos[2]], cam, C.red, 2));
        for (const [n, label] of [[172, '21/6'], [264, '23/9'], [355, '22/12'], [80, '21/3']] as [number, string][]) {
          const al = (2 * Math.PI * (n - 172)) / 365;
          const q = project([-R * 1.22 * Math.cos(al), 0, -R * 1.22 * Math.sin(al)], cam);
          out.push(txt(q.x, q.y + 4, label, {size: 10, fill: C.grey, anchor: 'middle'}));
        }
        out.push(txt(150, 24, 'Quỹ đạo nhìn từ trên cao', {size: 12, fill: C.grey, anchor: 'middle'}));

        // Trái Đất cỡ lớn: xoay hình để Mặt Trời luôn ở bên trái, thấy rõ ranh giới ngày – đêm và trục nghiêng
        const cx = 420;
        const cy = 170;
        const r = 74;
        const s = [Math.cos(alpha), 0, Math.sin(alpha)];
        const beta = Math.atan2(s[2], -s[0]); // quay quanh y để s → (−1, 0, 0)
        const rot = (v: V3): V3 => [v[0] * Math.cos(beta) + v[2] * Math.sin(beta), v[1], -v[0] * Math.sin(beta) + v[2] * Math.cos(beta)];
        const av = rot(a);
        out.push({t: 'circle', cx, cy, r, fill: '#1E3A8A', stroke: C.ink, w: 1.6}); // nửa đêm (nền)
        out.push({t: 'path', d: `M${cx} ${cy - r} A${r} ${r} 0 0 0 ${cx} ${cy + r} Z`, fill: '#93C5FD', stroke: undefined, o: 0.95}); // nửa ngày (trái)
        out.push(ln(cx, cy - r, cx, cy + r, {stroke: '#F59E0B', w: 1.4, dash: '3 3'}));
        out.push(txt(cx - r - 8, cy - r - 10, '☀ Mặt Trời', {size: 11, fill: '#B45309', anchor: 'start', bold: true}));
        // trục quay
        out.push(ln(cx - av[0] * r * 1.35, cy + av[1] * r * 1.35, cx + av[0] * r * 1.35, cy - av[1] * r * 1.35, {stroke: C.red, w: 2}));
        out.push(txt(cx + av[0] * r * 1.5, cy - av[1] * r * 1.5, 'B', {size: 12, fill: C.red, bold: true, anchor: 'middle'}));
        out.push(txt(cx - av[0] * r * 1.5, cy + av[1] * r * 1.5 + 8, 'N', {size: 12, fill: C.red, bold: true, anchor: 'middle'}));
        // xích đạo và vĩ tuyến quan sát
        const e1raw: V3 = [av[1], -av[0], 0];
        const n1 = Math.hypot(e1raw[0], e1raw[1]) || 1;
        const e1: V3 = [e1raw[0] / n1, e1raw[1] / n1, 0];
        const e2: V3 = [av[1] * e1[2] - av[2] * e1[1], av[2] * e1[0] - av[0] * e1[2], av[0] * e1[1] - av[1] * e1[0]];
        const lat = (phi: number, stroke: string, w: number) => {
          const pts: [number, number][] = [];
          for (let i = 0; i <= 90; i++) {
            const lm = (2 * Math.PI * i) / 90;
            const P: V3 = [0, 1, 2].map((k) => r * (Math.cos(rad(phi)) * (Math.cos(lm) * e1[k] + Math.sin(lm) * e2[k]) + Math.sin(rad(phi)) * av[k])) as V3;
            if (P[2] >= 0) pts.push([cx + P[0], cy - P[1]]);
            else if (pts.length > 1) {
              out.push({t: 'poly', pts: [...pts], stroke, w, close: false});
              pts.length = 0;
            } else pts.length = 0;
          }
          if (pts.length > 1) out.push({t: 'poly', pts, stroke, w, close: false});
        };
        lat(0, '#475569', 1.2);
        lat(p.lat, '#DC2626', 2);
        const lm0 = Math.atan2(e2[2], e1[2]);
        const Pq: V3 = [0, 1, 2].map((k) => r * (Math.cos(rad(p.lat)) * (Math.cos(lm0) * e1[k] + Math.sin(lm0) * e2[k]) + Math.sin(rad(p.lat)) * av[k])) as V3;
        const lit = Pq[0] < 0;
        out.push(dot(cx + Pq[0], cy - Pq[1], 6, lit ? '#FACC15' : '#E2E8F0'));
        out.push(ring0(cx + Pq[0], cy - Pq[1]));
        out.push(txt(cx, cy + r + 24, lit ? 'Nơi quan sát (chấm đỏ) đang là ban ngày' : 'Nơi quan sát (chấm đỏ) đang là ban đêm', {size: 12, fill: C.ink, anchor: 'middle', bold: true}));
        // phóng to minh họa: tia nắng chiếu xuống mặt đất ở nơi quan sát lúc giữa trưa
        const elev = Math.max(0, Math.min(90, noonElevation(p.lat, declination(p.tilt, p.day))));
        const lc = {x: 78, y: 262, r: 42};
        const lens = lensFrame(lc.x, lc.y, lc.r, `Tia nắng lúc trưa: ${f1(elev, 0)}°`);
        const gy = lc.y + 20;
        out.push(...lens.back, ln(lc.x - 32, gy, lc.x + 32, gy, {stroke: C.grey, w: 2.4}));
        out.push(arrow(lc.x - Math.cos(rad(elev)) * 36, gy - Math.sin(rad(elev)) * 36, lc.x, gy, '#F59E0B', 2.6));
        out.push(...lens.front);
        return out;
      },
      readouts: [
        {label: 'Ngày · mùa ở Bắc bán cầu', value: (p) => `${dateOfDay(p.day)} · ${seasonNorth(p.day)}`},
        {label: 'Xích vĩ Mặt Trời δ', value: (p) => `${f1(declination(p.tilt, p.day), 1)}°`},
        {label: 'Độ dài ngày ở vĩ độ đã chọn', value: (p) => {
          const h = dayLengthH(p.lat, declination(p.tilt, p.day));
          return h >= 24 ? 'Ngày địa cực: 24 giờ' : h <= 0 ? 'Đêm địa cực: 0 giờ' : `${f1(h, 1)} giờ ngày · ${f1(24 - h, 1)} giờ đêm`;
        }},
        {label: 'Góc cao Mặt Trời lúc giữa trưa', value: (p) => `${f1(noonElevation(p.lat, declination(p.tilt, p.day)), 1)}°`},
      ],
      note: 'Mùa do trục nghiêng không đổi hướng khi Trái Đất đi quanh Mặt Trời: kéo Độ nghiêng về 0° thì xích vĩ luôn bằng 0, mọi nơi ngày dài 12 giờ và không còn mùa. Cách Trái Đất gần hay xa Mặt Trời không phải nguyên nhân chính.',
    },
  },

  PHYS_NEWTON_CRADLE: {
    family: 'SCENE_LAB',
    engine: 'PHYSICS',
    title: 'Con lắc Newton: bảo toàn động lượng và năng lượng',
    question: 'Nâng hai quả cầu lên rồi thả, vì sao đúng hai quả bên kia bật ra mà không phải một quả bay nhanh hơn? Nếu có hao hụt năng lượng thì điều gì thay đổi sau mỗi lần va chạm?',
    keywords: /qua lac newton|newton cradle|cac qua cau treo va cham|va cham cua cac qua cau treo|bo qua cau treo cua newton/,
    examples: ['quả lắc Newton', 'Newton cradle', 'các quả cầu treo va chạm', 'bộ quả cầu treo của Newton'],
    data: {
      viewBox: [560, 340],
      stage: 'glass',
      tryIt: 'Đổi số quả nâng từ 1 đến 3; rồi tăng hao hụt lên 0,2 và quan sát biên độ sau vài lần va chạm.',
      see: 'Đúng bấy nhiêu quả bật ra phía bên kia; khi có hao hụt, biên độ giảm dần sau mỗi lần va chạm.',
      sliders: [
        {key: 'n', label: 'Số quả nâng lên', min: 1, max: 4, step: 1, value: 2},
        {key: 'th0', label: 'Góc nâng ban đầu', unit: '°', min: 10, max: 60, step: 5, value: 40},
        {key: 'L', label: 'Chiều dài dây', unit: 'cm', min: 20, max: 60, step: 5, value: 40},
        {key: 'loss', label: 'Hao hụt năng lượng mỗi lần va chạm', unit: '', min: 0, max: 0.3, step: 0.05, value: 0},
        {key: 'az', label: 'Xoay hình (ngang)', unit: '°', min: -60, max: 60, step: 5, value: 20},
      ],
      time: {max: 20, loop: false, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t) => {
        const cam: Cam = {az: p.az, el: 12, cx: 280, cy: 70, s: 150};
        const L = p.L / 40; // đơn vị thế giới
        const T = 2 * Math.PI * Math.sqrt(p.L / 100 / 9.8) * 1.6; // hơi chậm hơn thực tế cho dễ quan sát
        const ang = cradleAngles(Math.round(p.n), p.th0, T, t, p.loss);
        const out: Shape[] = [];
        const topY = 0;
        const w = 0.42; // nửa bề rộng giữa hai thanh ngang (chiều sâu)
        const xs = [-2, -1, 0, 1, 2].map((i) => i * 0.34); // các quả chạm nhau (bán kính 0,17)
        const floor = project([0, baseYShadow(L), 0], cam);
        out.push(...glassPlinth(floor.x, floor.y + 2, 190));
        // khung: đế, hai trụ, hai thanh ngang trước/sau
        const half = 0.95;
        const baseY = -L - 0.35;
        out.push(poly3([[-half - 0.2, baseY, -w - 0.2], [half + 0.2, baseY, -w - 0.2], [half + 0.2, baseY, w + 0.2], [-half - 0.2, baseY, w + 0.2]], cam, {stroke: C.ink, fill: '#E7E5E4', close: true, w: 1.6}));
        for (const sx of [-half, half]) for (const sz of [-w, w]) out.push(line3([sx, baseY, sz], [sx, topY, sz], cam, C.ink, 3));
        out.push(line3([-half, topY, -w], [half, topY, -w], cam, C.ink, 3), line3([-half, topY, w], [half, topY, w], cam, C.ink, 3));
        // dây (hình chữ V) + quả cầu, vẽ xa → gần
        const items: {z: number; shapes: Shape[]}[] = [];
        xs.forEach((x0, i) => {
          const th = rad(ang[i]);
          const bx = x0 + L * Math.sin(th);
          const by = topY - L * Math.cos(th);
          const bob = sphere3([bx, by, 0], 0.17, cam, Math.abs(ang[i]) > 0.3 ? '#FB923C' : '#94A3B8'); // quả đang chuyển động tô cam
          const strings: Shape[] = [line3([x0, topY, -w], [bx, by, 0], cam, C.grey, 1.2), line3([x0, topY, w], [bx, by, 0], cam, C.grey, 1.2)];
          items.push({z: bob.z, shapes: [...strings, ...bob.shapes]});
        });
        out.push(...depthSorted(items));
        const v = cradleSpeed(p.L / 100, p.th0);
        const moving = ang.findIndex((a) => Math.abs(a) > 0.3);
        if (moving >= 0) {
          const bx = xs[moving] + L * Math.sin(rad(ang[moving]));
          const by = topY - L * Math.cos(rad(ang[moving]));
          const q = project([bx, by, 0], cam);
          out.push(...callout(q.x, q.y, ang[moving] < 0 ? q.x + 36 : q.x - 150, q.y - 34, 'Quả đang chuyển động', C.orange));
        }
        out.push(txt(30, 26, `Vận tốc ngay trước va chạm v = ${f2(v)} m/s`, {size: 13, fill: C.ink, anchor: 'start', bold: true}));
        out.push(txt(30, 46, `Động lượng truyền đi: ${Math.round(p.n)} quả × v`, {size: 12, fill: '#6B665B', anchor: 'start'}));
        return out;
      },
      readouts: [
        {label: 'v = √(2gL(1 − cosθ₀))', value: (p) => `${f2(cradleSpeed(p.L / 100, p.th0))} m/s`},
        {label: 'Động lượng p = n·m·v (mỗi quả m = 50 g)', value: (p) => `${f2(Math.round(p.n) * 0.05 * cradleSpeed(p.L / 100, p.th0))} kg·m/s`},
        {label: 'Biên độ sau 5 lần va chạm', value: (p) => `${f1(p.th0 * Math.pow(1 - p.loss, 5), 1)}° (hao hụt ${Math.round(p.loss * 100)}% mỗi lần)`},
      ],
      note: 'Va chạm đàn hồi giữa các quả giống nhau trao trọn vận tốc cho quả kế tiếp: đúng n quả bật ra thì cả động lượng lẫn động năng mới cùng bảo toàn. Nếu chỉ một quả bật ra nhanh gấp đôi thì động lượng giữ nhưng động năng không giữ.',
    },
  },
};

const baseYShadow = (L: number) => -L - 0.35;

function ring0(x: number, y: number): Shape {
  return {t: 'circle', cx: x, cy: y, r: 9, stroke: '#DC2626', w: 1.6};
}
