// apps/teacher-board/src/utils/chemModels.ts
/**
 * Ba mô hình Hóa học tất định (tài liệu nghiên cứu, mục 1.3):
 *  - CHEM_MOLECULE_3D        : hình học phân tử theo thuyết VSEPR (AXE), tọa độ 3D, góc liên kết, độ phân cực (tổng vectơ lưỡng cực)
 *  - CHEM_LE_CHATELIER_GAS   : 2NO₂ (nâu) ⇌ N₂O₄ (không màu): cân bằng theo V, T (van 't Hoff) + động học trở lại cân bằng
 *  - CHEM_GALVANIC_DANIELL   : pin Daniell/Galvani: E° từ thế điện cực, phương trình Nernst, phóng điện làm đổi nồng độ
 * Hằng số ghi rõ ở từng mô hình; đây là mô hình sư phạm chính xác về xu hướng và bậc độ lớn.
 */

export type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => scale(a, 1 / (len(a) || 1));
const dotp = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const angleBetween = (a: V3, b: V3) => (Math.acos(Math.max(-1, Math.min(1, dotp(norm(a), norm(b))))) * 180) / Math.PI;

// ============================================================ VSEPR
export interface VseprGeometry {
  steric: number;
  domain: string;
  shape: string;
  hybrid: string;
  ideal: string;
}

const GEOM: Record<string, VseprGeometry> = {
  '2,0': {steric: 2, domain: 'thẳng', shape: 'thẳng', hybrid: 'sp', ideal: '180°'},
  '3,0': {steric: 3, domain: 'tam giác phẳng', shape: 'tam giác phẳng', hybrid: 'sp²', ideal: '120°'},
  '2,1': {steric: 3, domain: 'tam giác phẳng', shape: 'gấp khúc (chữ V)', hybrid: 'sp²', ideal: '< 120°'},
  '4,0': {steric: 4, domain: 'tứ diện', shape: 'tứ diện', hybrid: 'sp³', ideal: '109,5°'},
  '3,1': {steric: 4, domain: 'tứ diện', shape: 'chóp tam giác', hybrid: 'sp³', ideal: '< 109,5°'},
  '2,2': {steric: 4, domain: 'tứ diện', shape: 'gấp khúc (chữ V)', hybrid: 'sp³', ideal: '< 109,5°'},
  '5,0': {steric: 5, domain: 'lưỡng chóp tam giác', shape: 'lưỡng chóp tam giác', hybrid: 'sp³d', ideal: '90° và 120°'},
  '4,1': {steric: 5, domain: 'lưỡng chóp tam giác', shape: 'cái bập bênh', hybrid: 'sp³d', ideal: '< 90° và < 120°'},
  '3,2': {steric: 5, domain: 'lưỡng chóp tam giác', shape: 'chữ T', hybrid: 'sp³d', ideal: '< 90°'},
  '2,3': {steric: 5, domain: 'lưỡng chóp tam giác', shape: 'thẳng', hybrid: 'sp³d', ideal: '180°'},
  '6,0': {steric: 6, domain: 'bát diện', shape: 'bát diện', hybrid: 'sp³d²', ideal: '90°'},
  '5,1': {steric: 6, domain: 'bát diện', shape: 'chóp vuông', hybrid: 'sp³d²', ideal: '< 90°'},
  '4,2': {steric: 6, domain: 'bát diện', shape: 'vuông phẳng', hybrid: 'sp³d²', ideal: '90°'},
};

export const vseprGeometry = (x: number, e: number): VseprGeometry | null => GEOM[`${x},${e}`] ?? null;

export interface VseprMolecule {
  formula: string;
  name: string;
  central: string;
  ligands: string[];
  lonePairs: number;
  /** bậc liên kết của từng phối tử (mặc định 1) */
  bondOrders?: number[];
  /** góc liên kết thực đo được (độ) cho các dạng bị nén bởi cặp e riêng */
  angle?: number;
  /** ngoại lệ so với quy tắc lưỡng cực theo độ âm điện (vd. O₃ phân cực nhờ điện tích hình thức) */
  polar?: boolean;
}

const rep = (el: string, n: number) => Array.from({length: n}, () => el);

export const VSEPR_LIBRARY: VseprMolecule[] = [
  {formula: 'H2O', name: 'Nước', central: 'O', ligands: rep('H', 2), lonePairs: 2, angle: 104.5},
  {formula: 'NH3', name: 'Amoniac', central: 'N', ligands: rep('H', 3), lonePairs: 1, angle: 107.3},
  {formula: 'CH4', name: 'Metan', central: 'C', ligands: rep('H', 4), lonePairs: 0},
  {formula: 'CO2', name: 'Cacbon đioxit', central: 'C', ligands: rep('O', 2), lonePairs: 0, bondOrders: [2, 2]},
  {formula: 'SO2', name: 'Lưu huỳnh đioxit', central: 'S', ligands: rep('O', 2), lonePairs: 1, bondOrders: [2, 2], angle: 119},
  {formula: 'SO3', name: 'Lưu huỳnh trioxit', central: 'S', ligands: rep('O', 3), lonePairs: 0, bondOrders: [2, 2, 2]},
  {formula: 'BF3', name: 'Bo triflorua', central: 'B', ligands: rep('F', 3), lonePairs: 0},
  {formula: 'BeCl2', name: 'Berili clorua', central: 'Be', ligands: rep('Cl', 2), lonePairs: 0},
  {formula: 'H2S', name: 'Hiđro sunfua', central: 'S', ligands: rep('H', 2), lonePairs: 2, angle: 92.1},
  {formula: 'PCl3', name: 'Photpho triclorua', central: 'P', ligands: rep('Cl', 3), lonePairs: 1, angle: 100.3},
  {formula: 'CCl4', name: 'Cacbon tetraclorua', central: 'C', ligands: rep('Cl', 4), lonePairs: 0},
  {formula: 'CH2O', name: 'Fomanđehit', central: 'C', ligands: ['O', 'H', 'H'], lonePairs: 0, bondOrders: [2, 1, 1]},
  {formula: 'HCN', name: 'Hiđro xianua', central: 'C', ligands: ['H', 'N'], lonePairs: 0, bondOrders: [1, 3]},
  {formula: 'O3', name: 'Ozon', central: 'O', ligands: rep('O', 2), lonePairs: 1, bondOrders: [1.5, 1.5], angle: 116.8, polar: true},
  {formula: 'PCl5', name: 'Photpho pentaclorua', central: 'P', ligands: rep('Cl', 5), lonePairs: 0},
  {formula: 'SF4', name: 'Lưu huỳnh tetraflorua', central: 'S', ligands: rep('F', 4), lonePairs: 1},
  {formula: 'ClF3', name: 'Clo triflorua', central: 'Cl', ligands: rep('F', 3), lonePairs: 2},
  {formula: 'XeF2', name: 'Xenon điflorua', central: 'Xe', ligands: rep('F', 2), lonePairs: 3},
  {formula: 'SF6', name: 'Lưu huỳnh hexaflorua', central: 'S', ligands: rep('F', 6), lonePairs: 0},
  {formula: 'BrF5', name: 'Brom pentaflorua', central: 'Br', ligands: rep('F', 5), lonePairs: 1},
  {formula: 'XeF4', name: 'Xenon tetraflorua', central: 'Xe', ligands: rep('F', 4), lonePairs: 2},
];

/** Độ âm điện Pauling. */
export const ELECTRONEG: Record<string, number> = {H: 2.2, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98, P: 2.19, S: 2.58, Cl: 3.16, Br: 2.96, Xe: 2.6};
export const CPK: Record<string, string> = {H: '#F5F5F4', C: '#57534E', N: '#2563EB', O: '#DC2626', F: '#65A30D', Cl: '#16A34A', S: '#FACC15', P: '#F97316', B: '#EC4899', Be: '#84CC16', Xe: '#06B6D4', Br: '#92400E'};
export const ATOM_R: Record<string, number> = {H: 0.32, C: 0.5, N: 0.5, O: 0.5, F: 0.46, Cl: 0.62, S: 0.62, P: 0.62, B: 0.5, Be: 0.5, Xe: 0.72, Br: 0.66};

const DOMAIN: Record<number, V3[]> = {
  2: [[0, 0, 1], [0, 0, -1]],
  3: [[1, 0, 0], [-0.5, Math.sqrt(3) / 2, 0], [-0.5, -Math.sqrt(3) / 2, 0]],
  4: ([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]] as V3[]).map(norm),
  5: [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-0.5, Math.sqrt(3) / 2, 0], [-0.5, -Math.sqrt(3) / 2, 0]],
  6: [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]],
};

/** Vị trí các miền electron dành cho cặp riêng (theo quy tắc: cặp riêng ở xích đạo trong lưỡng chóp; đối nhau trong bát diện). */
const LONE_SLOTS: Record<string, number[]> = {
  '3,1': [0], '4,1': [0], '4,2': [0, 1], '4,3': [0, 1, 2],
  '5,1': [2], '5,2': [2, 3], '5,3': [2, 3, 4],
  '6,1': [1], '6,2': [0, 1],
};

export interface Atom3D {
  el: string;
  pos: V3;
  kind: 'central' | 'ligand';
}
export interface Structure3D {
  atoms: Atom3D[];
  /** [chỉ số nguyên tử, chỉ số nguyên tử, bậc liên kết] */
  bonds: [number, number, number][];
  lone: V3[];
  geometry: VseprGeometry;
  /** các góc giữa mọi cặp liên kết (độ), sắp xếp tăng dần, đã gộp nhóm */
  angles: number[];
  polar: boolean;
  dipole: number;
}

export function build3D(m: VseprMolecule): Structure3D | null {
  const X = m.ligands.length;
  const E = m.lonePairs;
  const geometry = vseprGeometry(X, E);
  if (!geometry) return null;
  const n = X + E;
  const dirs = DOMAIN[n];
  const slots = new Set(LONE_SLOTS[`${n},${E}`] ?? []);
  let bondDirs: V3[] = [];
  let loneDirs: V3[] = [];
  dirs.forEach((d, i) => (slots.has(i) ? loneDirs.push(d) : bondDirs.push(d)));
  const theta = m.angle;
  if (theta && n === 3 && X === 2 && E === 1) {
    const h = (theta * Math.PI) / 360;
    bondDirs = [[-Math.cos(h), Math.sin(h), 0], [-Math.cos(h), -Math.sin(h), 0]];
  } else if (theta && n === 4 && X === 2 && E === 2) {
    const h = (theta * Math.PI) / 360;
    bondDirs = [[Math.sin(h), 0, Math.cos(h)], [-Math.sin(h), 0, Math.cos(h)]];
    loneDirs = [norm([0, 0.8, -0.6]), norm([0, -0.8, -0.6])];
  } else if (theta && n === 4 && X === 3 && E === 1) {
    const c = Math.cos((theta * Math.PI) / 180);
    const cphi = Math.sqrt(Math.max(0, (c + 0.5) / 1.5));
    const sphi = Math.sqrt(1 - cphi * cphi);
    bondDirs = [0, 1, 2].map((k) => [sphi * Math.cos((k * 2 * Math.PI) / 3), sphi * Math.sin((k * 2 * Math.PI) / 3), -cphi] as V3);
    loneDirs = [[0, 0, 1]];
  }
  const atoms: Atom3D[] = [{el: m.central, pos: [0, 0, 0], kind: 'central'}];
  const bonds: [number, number, number][] = [];
  m.ligands.forEach((el, i) => {
    const L = el === 'H' ? 0.85 : 1.25;
    atoms.push({el, pos: scale(bondDirs[i], L), kind: 'ligand'});
    bonds.push([0, i + 1, m.bondOrders?.[i] ?? 1]);
  });
  // góc giữa các cặp liên kết
  const angs: number[] = [];
  for (let i = 0; i < bondDirs.length; i++) for (let j = i + 1; j < bondDirs.length; j++) angs.push(Math.round(angleBetween(bondDirs[i], bondDirs[j]) * 10) / 10);
  const uniq = [...new Set(angs)].sort((a, b) => a - b);
  // lưỡng cực: mỗi liên kết hướng về nguyên tử độ âm điện lớn hơn
  let dip: V3 = [0, 0, 0];
  const cEN = ELECTRONEG[m.central] ?? 2.5;
  bondDirs.forEach((d, i) => {
    const delta = (ELECTRONEG[m.ligands[i]] ?? 2.5) - cEN;
    dip = add(dip, scale(d, delta));
  });
  const dipole = len(dip);
  return {atoms, bonds, lone: loneDirs, geometry, angles: uniq, polar: m.polar ?? dipole > 0.12, dipole};
}

/** Nhận công thức: "H2O", "H_2O", "NH₃", "VSEPR CH4", hoặc kí hiệu AXE như "AX2E2". */
export function normalizeFormula(text: string): string {
  const sub: Record<string, string> = {'₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6'};
  return text.replace(/[₀-₆]/g, (c) => sub[c]).replace(/[_{}\s$\\]|\\text/g, '').replace(/^(?:vsepr|cấutrúc|hìnhdạng|hìnhhọc|gócliênkết|phântử|của)+/i, '');
}

export function parseMolecule(text: string): VseprMolecule | null {
  const t = text || '';
  const axe = /\bAX\s*(\d)\s*E\s*(\d)?\b/i.exec(t);
  if (axe) {
    const x = parseInt(axe[1], 10);
    const e = axe[2] ? parseInt(axe[2], 10) : 0;
    if (vseprGeometry(x, e)) return {formula: `AX${x}E${e}`, name: `Dạng AX${x}E${e}`, central: 'A', ligands: rep('X', x), lonePairs: e};
  }
  const isKeyword = /vsepr|hình học phân tử|hình dạng phân tử|dạng hình học|góc liên kết|cấu trúc phân tử|cấu trúc không gian/i.test(t);
  const compact = normalizeFormula(t).replace(/[.,;:!?]+$/g, '');
  const exact = VSEPR_LIBRARY.find((m) => m.formula.toLowerCase() === compact.toLowerCase());
  if (exact && (isKeyword || compact.length === t.replace(/\s/g, '').length || /^[A-Za-z0-9_{}\s₀-₆]+$/.test(t.trim()))) return exact;
  if (isKeyword) {
    // tìm công thức trong câu
    const toks = t.replace(/[₀-₆]/g, (c) => String('₀₁₂₃₄₅₆'.indexOf(c))).match(/[A-Z][A-Za-z0-9_{}]*/g) || [];
    for (const tok of toks) {
      const f = normalizeFormula(tok);
      const m = VSEPR_LIBRARY.find((v) => v.formula === f);
      if (m) return m;
    }
  }
  return null;
}

// ============================================================ Le Chatelier: 2NO₂ ⇌ N₂O₄
export const LC = {
  R: 0.082057, // L·atm/(mol·K)
  Kp298: 6.8, // atm⁻¹ cho 2NO₂ ⇌ N₂O₄ ở 298 K
  dH: -57.2e3, // J/mol (thuận tỏa nhiệt)
  Rj: 8.314,
};

export const kpAt = (T: number) => LC.Kp298 * Math.exp((-LC.dH / LC.Rj) * (1 / T - 1 / 298.15));

export interface LcState {
  /** số mol N₂O₄ đã tạo (ξ); NO₂ = N0 − 2ξ */
  xi: number;
}

/** ξ cân bằng cho N0 mol NO₂ ban đầu ở thể tích V (L) và nhiệt độ T (K). Giải bằng chia đôi. */
export function lcEquilibrium(N0: number, V: number, T: number): number {
  const Kp = kpAt(T);
  const f = (xi: number) => xi * V - Kp * LC.R * T * (N0 - 2 * xi) ** 2;
  let lo = 0;
  let hi = N0 / 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface LcView {
  nNO2: number;
  nN2O4: number;
  total: number;
  pressure: number; // atm
  cNO2: number; // mol/L
  cN2O4: number;
  /** độ đậm của màu nâu 0..1 (định luật Beer: ∝ [NO₂]) */
  color: number;
  Q: number;
  Kp: number;
  shift: 'forward' | 'reverse' | 'none';
}

export function lcView(N0: number, V: number, T: number, xi: number): LcView {
  const nNO2 = Math.max(0, N0 - 2 * xi);
  const nN2O4 = xi;
  const total = nNO2 + nN2O4;
  const pressure = (total * LC.R * T) / V;
  const pNO2 = (nNO2 * LC.R * T) / V;
  const pN2O4 = (nN2O4 * LC.R * T) / V;
  const Q = pNO2 > 1e-12 ? pN2O4 / (pNO2 * pNO2) : Infinity;
  const Kp = kpAt(T);
  const eq = lcEquilibrium(N0, V, T);
  const shift = Math.abs(eq - xi) < N0 * 1e-4 ? 'none' : eq > xi ? 'forward' : 'reverse';
  const cNO2 = nNO2 / V;
  return {nNO2, nN2O4, total, pressure, cNO2, cN2O4: nN2O4 / V, color: Math.min(1, cNO2 / 0.08), Q, Kp, shift};
}

/** Tiến trình về cân bằng bậc nhất: ξ' = k (ξ_eq − ξ). dt tính bằng giây mô phỏng. */
export const lcRelax = (xi: number, xiEq: number, dt: number, k = 1.1) => xi + (xiEq - xi) * (1 - Math.exp(-k * dt));

// ============================================================ Pin Daniell / Galvani
export interface Electrode {
  metal: string;
  name: string;
  /** thế điện cực chuẩn của cặp M²⁺/M (V) */
  E0: number;
  color: string;
}
export const ELECTRODES: Electrode[] = [
  {metal: 'Mg', name: 'Magie', E0: -2.37, color: '#CBD5E1'},
  {metal: 'Zn', name: 'Kẽm', E0: -0.76, color: '#94A3B8'},
  {metal: 'Fe', name: 'Sắt', E0: -0.44, color: '#78716C'},
  {metal: 'Ni', name: 'Niken', E0: -0.25, color: '#A8A29E'},
  {metal: 'Pb', name: 'Chì', E0: -0.13, color: '#64748B'},
  {metal: 'Cu', name: 'Đồng', E0: 0.34, color: '#C2410C'},
];
export const ION_COLOR: Record<string, string> = {Mg: '#E0F2FE', Zn: '#F1F5F9', Fe: '#D9F99D', Ni: '#BBF7D0', Pb: '#F1F5F9', Cu: '#7DD3FC'};

export const NERNST_SLOPE = 0.05916; // V ở 25 °C: 2,303RT/F
export interface DaniellCell {
  anode: Electrode; // oxi hóa (E° thấp hơn)
  cathode: Electrode;
  E0: number;
}
export function daniellCell(a: string, b: string): DaniellCell | null {
  const x = ELECTRODES.find((e) => e.metal === a);
  const y = ELECTRODES.find((e) => e.metal === b);
  if (!x || !y || x.metal === y.metal) return null;
  const [anode, cathode] = x.E0 < y.E0 ? [x, y] : [y, x];
  return {anode, cathode, E0: cathode.E0 - anode.E0};
}

/** E = E° − (0,0592/2)·log([ion anot]/[ion catot]) ; hai nửa pin đều là ion hóa trị II. */
export function nernstE(cell: DaniellCell, cAnode: number, cCathode: number): number {
  const q = Math.max(cAnode, 1e-12) / Math.max(cCathode, 1e-12);
  return cell.E0 - (NERNST_SLOPE / 2) * Math.log10(q);
}

export interface DaniellState {
  cAnode: number;
  cCathode: number;
  /** khối lượng điện cực thay đổi tương đối (g) so với ban đầu */
  dmAnode: number;
  dmCathode: number;
  charge: number; // C đã chạy qua
  t: number;
}

const F = 96485;
/** Một bước phóng điện: dòng I (A) trong dt (s), mỗi nửa pin 100 mL. Nồng độ catot không giảm quá 99,9 %. */
export function daniellStep(s: DaniellState, cell: DaniellCell, I: number, dt: number, Vl = 0.1): DaniellState {
  const molMax = Math.max(0, (s.cCathode - 1e-6) * Vl);
  const mol = Math.min((I * dt) / (2 * F), molMax);
  const M = (m: string) => ({Mg: 24.3, Zn: 65.4, Fe: 55.8, Ni: 58.7, Pb: 207.2, Cu: 63.5}[m] ?? 60);
  return {
    cAnode: s.cAnode + mol / Vl,
    cCathode: Math.max(1e-6, s.cCathode - mol / Vl),
    dmAnode: s.dmAnode - mol * M(cell.anode.metal),
    dmCathode: s.dmCathode + mol * M(cell.cathode.metal),
    charge: s.charge + mol * 2 * F,
    t: s.t + dt,
  };
}

// ============================================================ nhận từ khóa
export type ChemMatch = {templateId: 'CHEM_MOLECULE_3D'; meta: {molecule: VseprMolecule}; title: string} | {templateId: 'CHEM_LE_CHATELIER_GAS'; meta: Record<string, never>; title: string} | {templateId: 'CHEM_GALVANIC_DANIELL'; meta: {anode: string; cathode: string}; title: string};

export function matchChemKeywords(text: string): ChemMatch | null {
  const t = (text || '').replace(/[₀-₆]/g, (c) => String('₀₁₂₃₄₅₆'.indexOf(c)));
  const low = t.toLowerCase();
  if (/pin\s+(?:daniell|galvani|điện hóa)|pin\s+(?:Mg|Zn|Fe|Ni|Pb|Cu)\s*[-–/]\s*(?:Mg|Zn|Fe|Ni|Pb|Cu)\b|daniell|cầu muối|nernst|\bzn\s*[|/-]\s*cu\b|\bzn\s*\|\s*zn\s*\^?\{?2\+/i.test(t)) {
    const metals = (t.match(/\b(Mg|Zn|Fe|Ni|Pb|Cu)\b/g) || []).filter((m, i, a) => a.indexOf(m) === i);
    const [a, b] = metals.length >= 2 ? metals : ['Zn', 'Cu'];
    const cell = daniellCell(a, b) ?? daniellCell('Zn', 'Cu')!;
    return {templateId: 'CHEM_GALVANIC_DANIELL', meta: {anode: cell.anode.metal, cathode: cell.cathode.metal}, title: `Pin ${cell.anode.metal}–${cell.cathode.metal}`};
  }
  if (/le\s*chatelier|chuyển dịch cân bằng|no\s*_?2\s*(?:⇌|<=>|<->|\\rightleftharpoons|⇋|=)\s*n\s*_?2\s*o\s*_?4|2\s*no\s*_?2.*n\s*_?2\s*o\s*_?4|no2.*n2o4/i.test(t) || /(?:khí|bình|xilanh|piston).*n\s*_?2\s*o\s*_?4/.test(low)) {
    return {templateId: 'CHEM_LE_CHATELIER_GAS', meta: {}, title: 'Cân bằng NO₂ và N₂O₄'};
  }
  const mol = parseMolecule(text);
  if (mol) return {templateId: 'CHEM_MOLECULE_3D', meta: {molecule: mol}, title: mol.name};
  return null;
}
