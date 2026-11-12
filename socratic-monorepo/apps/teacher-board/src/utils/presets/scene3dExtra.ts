/**
 * Phần tính toán thuần (không three.js) của các cảnh 3D bổ sung: cấu hình electron theo lớp, hợp chất hữu cơ có H,
 * đường sức điện quay quanh trục, quỹ đạo hạt α quay quanh trục chùm tia. Tách riêng để kiểm thử được.
 */
import {configuration} from './hoaData';
import type {Organic} from './hoaScene2';
import {alphaPath, fieldLines} from './lyScene2';

export type V3 = [number, number, number];

// ------------------------------------------------------------------ nguyên tử
/** Số electron mỗi lớp n = 1..4 (K, L, M, N) theo cấu hình Aufbau của hoaData. */
export function shellCounts(z: number): number[] {
  const out = [0, 0, 0, 0];
  for (const s of configuration(z)) out[s.n - 1] += s.e;
  return out;
}
export const SHELL_NAME = ['K', 'L', 'M', 'N'];
/** Mức chiếm của các orbital phân lớp s/p lớp ngoài cùng theo quy tắc Hund: s (1 orbital), p (3 orbital): 0, 1 hay 2 electron. */
export function outerOrbitals(z: number): {n: number; s: number; p: number[]} {
  const cfg = configuration(z).filter((x) => x.e > 0);
  const n = Math.max(...cfg.map((x) => x.n));
  const s = cfg.find((x) => x.n === n && x.sub[1] === 's')?.e ?? 0;
  const pe = cfg.find((x) => x.n === n && x.sub[1] === 'p')?.e ?? 0;
  return {n, s, p: [0, 1, 2].map((i) => (pe > 3 ? (i < pe - 3 ? 2 : 1) : i < pe ? 1 : 0))};
}

// ------------------------------------------------------------------ hợp chất hữu cơ
export interface Atom3 {
  el: 'C' | 'O' | 'H';
  pos: V3;
  /** chỉ số nguyên tử khung (với H: nguyên tử mang nó) */
  host: number;
}
const VAL = {C: 4, O: 2} as const;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const ORG_SCALE = 0.03;
export const CH_LEN = 0.95;

/** Từ công thức khung 2D (px) dựng mô hình quả cầu–que: điền H cho đủ hóa trị C = 4, O = 2 theo hướng tứ diện gần đúng. */
export function organic3D(m: Organic): {atoms: Atom3[]; bonds: [number, number, number][]} {
  const heavy: Atom3[] = m.atoms.map((a, i) => ({el: a[2]?.startsWith('O') ? 'O' : 'C', pos: [(a[0] - 280) * ORG_SCALE, -(a[1] - 150) * ORG_SCALE, 0], host: i}));
  const atoms = [...heavy];
  const bonds = m.bonds.map((b) => [...b] as [number, number, number]);
  heavy.forEach((a, i) => {
    const used = m.bonds.filter((b) => b[0] === i || b[1] === i).reduce((s, b) => s + b[2], 0);
    const k = Math.max(0, VAL[a.el as 'C' | 'O'] - used);
    if (!k) return;
    const nbr = m.bonds.filter((b) => b[0] === i || b[1] === i).map((b) => nrm(sub(heavy[b[0] === i ? b[1] : b[0]].pos, a.pos)));
    const away = nrm([-nbr.reduce((s, d) => s + d[0], 0), -nbr.reduce((s, d) => s + d[1], 0), 0]);
    const flat = nbr.length === 0 || len([nbr.reduce((s, d) => s + d[0], 0), nbr.reduce((s, d) => s + d[1], 0), 0]) < 0.2;
    const base: V3 = flat ? (k === 1 ? [0, 0, 1] : [0, 1, 0]) : away;
    const ref: V3 = Math.abs(base[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    const side = cross(base, ref);
    const th = k === 1 ? 0 : k === 2 ? 0.955 : 1.23; // 54,7° và 70,5° so với hướng "ra xa"
    for (let j = 0; j < k; j++) {
      const phi = k === 2 ? Math.PI * j : (2 * Math.PI * j) / k;
      const d: V3 = [0, 1, 2].map((c) => base[c] * Math.cos(th) + (ref[c] * Math.cos(phi) + side[c] * Math.sin(phi)) * Math.sin(th)) as V3;
      atoms.push({el: 'H', pos: [a.pos[0] + d[0] * CH_LEN, a.pos[1] + d[1] * CH_LEN, a.pos[2] + d[2] * CH_LEN], host: i});
      bonds.push([i, atoms.length - 1, 1]);
    }
  });
  return {atoms, bonds};
}
/** Đếm nguyên tử theo công thức dạng "C₂H₆O" (chỉ số dưới Unicode). */
export function countFormula(f: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [, el, n] of f.matchAll(/([A-Z][a-z]?)([₀-₉]*)/g)) out[el] = (out[el] ?? 0) + (n ? Number([...n].map((d) => '₀₁₂₃₄₅₆₇₈₉'.indexOf(d)).join('')) : 1);
  return out;
}

// ------------------------------------------------------------------ điện trường
const FIELD_PX = 80;
/** Đường sức của hai điện tích đặt trên trục x: tính trong nửa mặt phẳng rồi quay quanh trục (đối xứng trục), đơn vị thế giới. */
export function fieldLines3D(q1: number, q2: number, d: number, planes = 4): V3[][] {
  const half = 25 + d * 220;
  const cs = [{x: 280 - half, y: 160, q: q1}, {x: 280 + half, y: 160, q: q2}].filter((c) => c.q !== 0);
  const out: V3[][] = [];
  for (const line of fieldLines(cs, [-150, -110, 710, 430], 12))
    for (let k = 0; k < planes; k++) {
      const a = (Math.PI * k) / planes;
      out.push(line.map(([x, y]) => [(x - 280) / FIELD_PX, ((160 - y) / FIELD_PX) * Math.cos(a), ((160 - y) / FIELD_PX) * Math.sin(a)] as V3));
    }
  return out;
}
export const chargeX = (d: number) => (25 + d * 220) / FIELD_PX;

// ------------------------------------------------------------------ tán xạ Rutherford
export const ALPHA_B = [-48, -36, -26, -18, -11, -6, -2.5, 2.5, 6, 11, 18, 26, 36, 48];
export const ALPHA_K = 0.03; // 1 fm = 0,03 đơn vị thế giới
/** Quỹ đạo α trong không gian: mỗi tham số va chạm b quay quanh trục chùm tia (x) theo `rolls` góc phương vị. */
export function alphaTracks(d0: number, rolls = 3): V3[][] {
  const out: V3[][] = [];
  for (const b of ALPHA_B) {
    const path = alphaPath(d0, b);
    for (let r = 0; r < rolls; r++) {
      const a = (Math.PI * r) / rolls;
      out.push(path.map(([x, y]) => [x * ALPHA_K, y * ALPHA_K * Math.cos(a), y * ALPHA_K * Math.sin(a)] as V3));
    }
  }
  return out;
}
/** Góc lệch (độ) giữa hướng bay vào (+x) và hướng bay ra của một quỹ đạo. */
export function turnDeg(track: V3[]): number {
  const [a, b] = [track[track.length - 2], track[track.length - 1]];
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  return (Math.acos(d[0] / (Math.hypot(d[0], d[1], d[2]) || 1)) * 180) / Math.PI;
}

// ------------------------------------------------------------------ cảnh dựng bằng Blender (board-parts.glb)
/** Góc nghiêng thanh đòn bẩy (độ, dương = đầu trái hạ xuống): M = (m₁d₁ − m₂d₂)g, cùng hệ số /8 và giới hạn ±18° với bản 2D. */
export const leverAngleDeg = (m1: number, d1: number, m2: number, d2: number): number => Math.max(-18, Math.min(18, ((m1 * d1 - m2 * d2) * 9.8) / 8));
/** Mực chìm của khối cạnh 1 trong chất lỏng: nổi thì ngập rho_vật/rho, chìm thì ngập hết. */
export const submerged = (rho: number, rhoO: number): number => Math.min(1, rhoO / rho);
export const WATER_TOP = 2.7;
export const DEPTH_UNIT = 0.26; // 1 m độ sâu = 0,26 đơn vị cảnh (trùng thước trong board_parts.py)
/** Áp suất tại độ sâu h (kPa) và góc kim đồng hồ (độ, theo chiều kim đồng hồ từ hướng 12 giờ) cho thang 0–1500 kPa. */
export const gaugeKPa = (rho: number, h: number): number => (101325 + rho * 9.8 * h) / 1000;
export const gaugeDeg = (kpa: number): number => -135 + (270 * Math.min(1500, kpa)) / 1500;
/** Đường dây điện của bình điện phân (trùng `WIRE_*` trong board_parts.py). */
export const WIRE_BLACK: V3[] = [[-0.62, 2.75, -0.12], [-0.62, 3.35, -0.12], [3.55, 3.35, -0.12], [3.55, 0.82, -0.12]];
export const WIRE_RED: V3[] = [[0.62, 2.75, 0.12], [0.62, 3.0, 0.12], [3.0, 3.0, 0.12], [3.0, 0.82, 0.12]];
/** Điểm ở phần f (0–1) của chiều dài một đường gấp khúc. */
export function polyAt(pts: V3[], f: number): V3 {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1], q[2] - pts[i][2]));
  let d = (((f % 1) + 1) % 1) * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const u = seg[i] ? Math.min(1, d / seg[i]) : 0;
      return [0, 1, 2].map((c) => pts[i][c] + (pts[i + 1][c] - pts[i][c]) * u) as V3;
    }
    d -= seg[i];
  }
  return pts[0];
}
/** Số hạt neutron vẽ ở thế hệ g: tăng theo log của quần thể k^g, tối đa 80. */
export const neutronCount = (pop: number): number => Math.min(80, Math.round(4 + 10 * Math.log2(1 + pop)));

// ------------------------------------------------------------------ dịch mã (ribosome kéo dọc mRNA)
import {CODON_AA, translate} from './sinhData';
const ANTI: Record<string, string> = {A: 'U', U: 'A', G: 'C', C: 'G'};
export const anticodon = (codon: string) => [...codon].map((b) => ANTI[b] ?? '?').join('');
/** Các codon đọc được từ AUG đầu tiên tới mã kết thúc; `aa` khớp `translate`, `start` là vị trí base đầu của AUG (−1 nếu không có). */
export function readingFrame(mrna: string): {start: number; codons: string[]; aa: string[]} {
  const start = mrna.indexOf('AUG');
  const aa = translate(mrna);
  return {start, aa, codons: aa.map((_, i) => mrna.slice(start + 3 * i, start + 3 * i + 3))};
}
/** Số amino acid đã nối khi ribosome ở vị trí `pos` (đơn vị codon, 0 = đầu AUG): codon nào ribosome đã đi qua hết thì đã dịch, mã kết thúc không thành amino acid. */
export const formedCount = (frame: {aa: string[]}, pos: number): number => Math.max(0, Math.min(frame.aa.filter((a) => a !== '*').length, Math.floor(pos)));
export const hasCodon = (c: string) => c in CODON_AA;

// ------------------------------------------------------------------ Sinh học 4: hướng động, tháp tuổi, đánh dấu – bắt lại
/** Đường cong thân cây (điểm trên trục x–y): `photo` = chậu đứng, nghiêng về phía sáng khi còn đỉnh; `grav` = chậu nằm ngang, thân cong dần lên. grow ∈ [0,1]. */
export function stemPoints(mode: string, angDeg: number, tipOn: boolean, grow: number, n = 24): V3[] {
  const L = 3.0 * (0.25 + 0.75 * grow);
  const out: V3[] = [[0, 0, 0]];
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    const a = mode === 'grav' ? Math.PI / 2 - (tipOn ? (Math.PI / 2) * grow * f : 0) : tipOn ? ((angDeg * Math.PI) / 180) * 0.9 * grow * f : 0;
    const q = out[i - 1];
    out.push([q[0] + (L / n) * Math.sin(a), q[1] + (L / n) * Math.cos(a), 0]);
  }
  return out;
}
/** Dạng tháp tuổi gần nhất với bề rộng đáy kéo được (px của preset). */
export function nearestPyramid(baseW: number, widths: Record<string, number>): string {
  return Object.entries(widths).sort((a, b) => Math.abs(a[1] - baseW) - Math.abs(b[1] - baseW))[0][0];
}
/** N cá thể rải đều trong sân (hạt giống cố định); bắt `n` cá thể gần tâm lưới nhất, trả số con có dấu (chỉ số < M là con đã đánh dấu). */
export function scatter(N: number, seed = 7): [number, number][] {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({length: N}, () => [(r() - 0.5) * 6.4, (r() - 0.5) * 4.4] as [number, number]);
}
export function capture(pts: [number, number][], M: number, n: number, cx: number, cz: number): {idx: number[]; marked: number} {
  const idx = pts.map((p, i) => [Math.hypot(p[0] - cx, p[1] - cz), i] as [number, number]).sort((a, b) => a[0] - b[0]).slice(0, n).map((q) => q[1]);
  return {idx, marked: idx.filter((i) => i < M).length};
}
