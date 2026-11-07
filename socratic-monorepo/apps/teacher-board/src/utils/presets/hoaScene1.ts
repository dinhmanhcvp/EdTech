import type {PresetSpec, Shape} from './types';
import {C, arrow, box, dot, f2, ln, poly, tick, txt} from './sceneKit';
import {ELEMENTS, ELEMENT_BY_SYM, configString, configuration, unpaired, valenceElectrons} from './hoaData';

const SYMS = ELEMENTS.filter((e) => e.z <= 36);

// ------------------------------------------------------------------ liên kết
export interface Molecule {
  label: string;
  formula: string;
  atoms: {s: string; x: number; y: number; lone: number}[];
  bonds: [number, number, number][];
  ionic?: boolean;
  geom: string;
  energy: string;
  note: string;
}
export const MOLECULES: Record<string, Molecule> = {
  H2: {label: 'H₂', formula: 'H₂', atoms: [{s: 'H', x: 215, y: 150, lone: 0}, {s: 'H', x: 345, y: 150, lone: 0}], bonds: [[0, 1, 1]], geom: 'thẳng', energy: 'H–H: 436 kJ/mol', note: 'Mỗi nguyên tử H góp 1 electron tạo một cặp electron dùng chung; cả hai đạt cấu hình bền của He.'},
  O2: {label: 'O₂', formula: 'O₂', atoms: [{s: 'O', x: 215, y: 150, lone: 2}, {s: 'O', x: 345, y: 150, lone: 2}], bonds: [[0, 1, 2]], geom: 'thẳng', energy: 'O=O: 498 kJ/mol', note: 'Liên kết đôi gồm một liên kết σ và một liên kết π; mỗi O còn hai cặp electron chưa liên kết.'},
  N2: {label: 'N₂', formula: 'N₂', atoms: [{s: 'N', x: 215, y: 150, lone: 1}, {s: 'N', x: 345, y: 150, lone: 1}], bonds: [[0, 1, 3]], geom: 'thẳng', energy: 'N≡N: 945 kJ/mol', note: 'Liên kết ba (1σ + 2π) rất bền nên N₂ trơ ở điều kiện thường.'},
  HF: {label: 'HF', formula: 'HF', atoms: [{s: 'H', x: 215, y: 150, lone: 0}, {s: 'F', x: 345, y: 150, lone: 3}], bonds: [[0, 1, 1]], geom: 'thẳng', energy: 'H–F: 565 kJ/mol', note: 'Cặp electron lệch hẳn về F (độ âm điện lớn nhất); giữa các phân tử HF có liên kết hydrogen.'},
  H2O: {label: 'H₂O', formula: 'H₂O', atoms: [{s: 'O', x: 280, y: 110, lone: 2}, {s: 'H', x: 210, y: 195, lone: 0}, {s: 'H', x: 350, y: 195, lone: 0}], bonds: [[0, 1, 1], [0, 2, 1]], geom: 'gấp khúc (104,5°)', energy: 'O–H: 464 kJ/mol', note: 'Hai cặp electron chưa liên kết đẩy làm phân tử gấp khúc, phân cực mạnh; tạo liên kết hydrogen giữa các phân tử nước.'},
  CO2: {label: 'CO₂', formula: 'CO₂', atoms: [{s: 'O', x: 160, y: 150, lone: 2}, {s: 'C', x: 280, y: 150, lone: 0}, {s: 'O', x: 400, y: 150, lone: 2}], bonds: [[0, 1, 2], [1, 2, 2]], geom: 'thẳng (180°)', energy: 'C=O: 799 kJ/mol', note: 'Mỗi liên kết C=O phân cực nhưng phân tử thẳng nên hai momen lưỡng cực triệt tiêu: CO₂ không phân cực.'},
  NH3: {label: 'NH₃', formula: 'NH₃', atoms: [{s: 'N', x: 280, y: 105, lone: 1}, {s: 'H', x: 205, y: 205, lone: 0}, {s: 'H', x: 280, y: 225, lone: 0}, {s: 'H', x: 355, y: 205, lone: 0}], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]], geom: 'chóp tam giác', energy: 'N–H: 391 kJ/mol', note: 'Ba cặp liên kết và một cặp chưa liên kết: phân tử hình chóp tam giác, phân cực, tạo được liên kết hydrogen.'},
  NaCl: {label: 'NaCl', formula: 'NaCl', atoms: [{s: 'Na', x: 190, y: 150, lone: 0}, {s: 'Cl', x: 370, y: 150, lone: 4}], bonds: [], ionic: true, geom: 'mạng tinh thể ion', energy: 'năng lượng mạng 787 kJ/mol', note: 'Na nhường 1 electron cho Cl tạo ion Na⁺ và Cl⁻ hút nhau bằng lực tĩnh điện; chất rắn ion có nhiệt độ nóng chảy cao.'},
};
export const bondEN = (m: Molecule): [number, number] => {
  const ens = m.atoms.map((a) => ELEMENT_BY_SYM[a.s]?.en ?? 0);
  return [Math.min(...ens), Math.max(...ens)];
};
export function bondKind(dEN: number): string {
  if (dEN < 0.4) return 'cộng hóa trị không phân cực';
  if (dEN < 1.7) return 'cộng hóa trị phân cực';
  return 'liên kết ion';
}

// ------------------------------------------------------------------ oxi hóa khử
export interface RedoxCase {
  eq: string;
  reducer: string;
  reducerChange: [string, string];
  oxidant: string;
  oxidantChange: [string, string];
  electrons: number;
  note: string;
}
export const REDOX: Record<string, RedoxCase> = {
  zncu: {eq: 'Zn + CuSO₄ → ZnSO₄ + Cu', reducer: 'Zn', reducerChange: ['0', '+2'], oxidant: 'Cu²⁺', oxidantChange: ['+2', '0'], electrons: 2, note: 'Zn nhường 2e (bị oxi hóa), ion Cu²⁺ nhận 2e (bị khử); kim loại đồng bám lên thanh kẽm.'},
  fehcl: {eq: 'Fe + 2HCl → FeCl₂ + H₂', reducer: 'Fe', reducerChange: ['0', '+2'], oxidant: 'H⁺', oxidantChange: ['+1', '0'], electrons: 2, note: 'Fe nhường 2e; 2 ion H⁺ mỗi ion nhận 1e tạo H₂ thoát ra.'},
  nacl: {eq: '2Na + Cl₂ → 2NaCl', reducer: 'Na', reducerChange: ['0', '+1'], oxidant: 'Cl₂', oxidantChange: ['0', '−1'], electrons: 2, note: 'Mỗi Na nhường 1e, mỗi nguyên tử Cl nhận 1e: tổng 2e chuyển từ 2 Na sang Cl₂.'},
  mgo2: {eq: '2Mg + O₂ → 2MgO', reducer: 'Mg', reducerChange: ['0', '+2'], oxidant: 'O₂', oxidantChange: ['0', '−2'], electrons: 4, note: 'Hai Mg nhường tổng 4e, hai nguyên tử O nhận tổng 4e: số electron nhường bằng số electron nhận.'},
  cuag: {eq: 'Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag', reducer: 'Cu', reducerChange: ['0', '+2'], oxidant: 'Ag⁺', oxidantChange: ['+1', '0'], electrons: 2, note: 'Cu nhường 2e cho 2 ion Ag⁺; bạc kim loại bám lên dây đồng.'},
  h2cuo: {eq: 'H₂ + CuO → Cu + H₂O', reducer: 'H₂', reducerChange: ['0', '+1'], oxidant: 'CuO (Cu²⁺)', oxidantChange: ['+2', '0'], electrons: 2, note: 'H₂ khử CuO thành Cu: mỗi nguyên tử H nhường 1e, Cu²⁺ nhận 2e.'},
};

// ------------------------------------------------------------------ ống nghiệm ảo
export interface LabResult {
  liquid: string;
  precip?: string;
  gas?: boolean;
  text: string;
}
const CLEAR = '#E0F2FE';
const COLOR_OF: Record<string, string> = {Cu: '#60A5FA', Fe2: '#BEF264', Fe3: '#FBBF24', Br: '#FDBA74', I: '#92400E', Cl: '#ECFCCB'};
export const HALOGEN_SALTS: [string, string][] = [['F', 'NaF'], ['Cl', 'NaCl'], ['Br', 'NaBr'], ['I', 'NaI']];
export function halogenResult(salt: string, reagent: string): LabResult {
  if (reagent === 'ag') {
    if (salt === 'F') return {liquid: CLEAR, text: 'AgF tan trong nước nên không có kết tủa: NaF + AgNO₃ → không phản ứng nhìn thấy.'};
    const p = {Cl: ['#FFFFFF', 'AgCl kết tủa trắng'], Br: ['#FEF08A', 'AgBr kết tủa vàng nhạt'], I: ['#FACC15', 'AgI kết tủa vàng']}[salt as 'Cl' | 'Br' | 'I'];
    return {liquid: CLEAR, precip: p[0], text: `${p[1]}: Ag⁺ + X⁻ → AgX↓.`};
  }
  if (reagent === 'cl2') {
    if (salt === 'Br') return {liquid: COLOR_OF.Br, text: 'Cl₂ + 2NaBr → 2NaCl + Br₂: dung dịch chuyển cam (brom được đẩy ra).'};
    if (salt === 'I') return {liquid: COLOR_OF.I, text: 'Cl₂ + 2NaI → 2NaCl + I₂: dung dịch nâu sẫm (iot được đẩy ra).'};
    return {liquid: COLOR_OF.Cl, text: 'Cl₂ không oxi hóa được F⁻ hay Cl⁻: không có phản ứng, vẫn là nước clo vàng lục nhạt.'};
  }
  if (salt === 'I') return {liquid: COLOR_OF.I, text: 'Br₂ + 2NaI → 2NaBr + I₂: dung dịch nâu sẫm (iot được đẩy ra).'};
  return {liquid: COLOR_OF.Br, text: 'Br₂ không đẩy được F⁻ hoặc Cl⁻ khỏi muối: không có phản ứng, vẫn là nước brom màu cam.'};
}

export const TUBE_SOLUTIONS: [string, string, string][] = [
  ['Cu', 'CuSO₄ (Cu²⁺)', COLOR_OF.Cu],
  ['Fe2', 'FeSO₄ (Fe²⁺)', COLOR_OF.Fe2],
  ['Fe3', 'FeCl₃ (Fe³⁺)', COLOR_OF.Fe3],
  ['Al', 'AlCl₃ (Al³⁺)', CLEAR],
  ['Zn', 'ZnSO₄ (Zn²⁺)', CLEAR],
  ['Mg', 'MgCl₂ (Mg²⁺)', CLEAR],
  ['NH4', 'NH₄Cl (NH₄⁺)', CLEAR],
  ['Cl', 'NaCl (Cl⁻)', CLEAR],
  ['SO4', 'Na₂SO₄ (SO₄²⁻)', CLEAR],
  ['CO3', 'Na₂CO₃ (CO₃²⁻)', CLEAR],
];
export const TUBE_REAGENTS: [string, string][] = [['naoh', 'NaOH'], ['bacl2', 'BaCl₂'], ['agno3', 'AgNO₃'], ['hcl', 'HCl']];
const STOCK: Record<string, string> = Object.fromEntries(TUBE_SOLUTIONS.map(([k, , c]) => [k, c]));
export function testTubeResult(sol: string, reagent: string, excess: boolean): LabResult {
  const base = STOCK[sol];
  const no = (extra = ''): LabResult => ({liquid: base, text: `Không có hiện tượng${extra}.`});
  if (reagent === 'naoh') {
    const t: Record<string, LabResult> = {
      Cu: {liquid: base, precip: '#2563EB', text: 'Cu²⁺ + 2OH⁻ → Cu(OH)₂↓ xanh lam; không tan trong NaOH dư.'},
      Fe2: {liquid: base, precip: '#D9F99D', text: 'Fe²⁺ + 2OH⁻ → Fe(OH)₂↓ trắng xanh, để ngoài không khí hóa nâu đỏ.'},
      Fe3: {liquid: base, precip: '#B45309', text: 'Fe³⁺ + 3OH⁻ → Fe(OH)₃↓ nâu đỏ.'},
      Al: excess ? {liquid: CLEAR, text: 'Al(OH)₃ ban đầu kết tủa keo trắng, tan trong NaOH dư tạo [Al(OH)₄]⁻ trong suốt.'} : {liquid: base, precip: '#F5F5F4', text: 'Al³⁺ + 3OH⁻ → Al(OH)₃↓ keo trắng (tan khi cho NaOH dư).'},
      Zn: excess ? {liquid: CLEAR, text: 'Zn(OH)₂ ban đầu kết tủa trắng, tan trong NaOH dư tạo [Zn(OH)₄]²⁻ trong suốt.'} : {liquid: base, precip: '#F5F5F4', text: 'Zn²⁺ + 2OH⁻ → Zn(OH)₂↓ trắng (tan khi cho NaOH dư).'},
      Mg: {liquid: base, precip: '#FFFFFF', text: 'Mg²⁺ + 2OH⁻ → Mg(OH)₂↓ trắng; không tan trong NaOH dư.'},
      NH4: {liquid: base, gas: true, text: 'NH₄⁺ + OH⁻ → NH₃↑ + H₂O khi đun nhẹ: khí mùi khai, làm xanh quỳ tím ẩm.'},
    };
    return t[sol] ?? no();
  }
  if (reagent === 'bacl2') {
    if (sol === 'SO4') return {liquid: base, precip: '#FFFFFF', text: 'Ba²⁺ + SO₄²⁻ → BaSO₄↓ trắng, không tan trong acid.'};
    if (sol === 'CO3') return {liquid: base, precip: '#FFFFFF', text: 'Ba²⁺ + CO₃²⁻ → BaCO₃↓ trắng, tan trong acid mạnh có khí CO₂.'};
    return no();
  }
  if (reagent === 'agno3') {
    if (sol === 'Cl') return {liquid: base, precip: '#FFFFFF', text: 'Ag⁺ + Cl⁻ → AgCl↓ trắng, hóa tím đen ngoài ánh sáng, tan trong NH₃.'};
    if (sol === 'CO3') return {liquid: base, precip: '#E7E5E4', text: 'Ag⁺ + CO₃²⁻ → Ag₂CO₃↓ trắng ngà, tan trong acid.'};
    if (sol === 'SO4') return {liquid: base, precip: '#F5F5F4', text: 'Ag₂SO₄ ít tan nên có thể đục nhẹ khi nồng độ lớn.'};
    return no();
  }
  if (sol === 'CO3') return {liquid: base, gas: true, text: 'CO₃²⁻ + 2H⁺ → CO₂↑ + H₂O: sủi bọt khí không màu, làm đục nước vôi trong.'};
  return no(' (HCl chỉ phát hiện được muối cacbonat, sunfit, sunfua)');
}

// ------------------------------------------------------------------ phổ IR và MS
export interface SpectrumCompound {
  label: string;
  formula: string;
  M: number;
  ir: [number, number, number, string][];
  ms: [number, number, string][];
}
export const SPECTRA: Record<string, SpectrumCompound> = {
  ethanol: {label: 'Ethanol C₂H₅OH', formula: 'C₂H₆O', M: 46, ir: [[3350, 0.8, 260, 'O–H (rộng)'], [2950, 0.5, 60, 'C–H'], [1050, 0.7, 40, 'C–O']], ms: [[46, 30, 'M⁺'], [45, 50, 'M−1'], [31, 100, 'CH₂OH⁺'], [29, 30, ''], [27, 25, '']]},
  acetone: {label: 'Acetone CH₃COCH₃', formula: 'C₃H₆O', M: 58, ir: [[2970, 0.3, 50, 'C–H'], [1715, 0.9, 30, 'C=O'], [1220, 0.4, 40, 'C–C(=O)–C']], ms: [[58, 55, 'M⁺'], [43, 100, 'CH₃CO⁺'], [15, 25, 'CH₃⁺']]},
  acetic: {label: 'Acetic acid CH₃COOH', formula: 'C₂H₄O₂', M: 60, ir: [[3000, 0.7, 350, 'O–H (acid, rất rộng)'], [1710, 0.9, 30, 'C=O'], [1280, 0.5, 40, 'C–O']], ms: [[60, 75, 'M⁺'], [45, 100, 'COOH⁺'], [43, 70, 'CH₃CO⁺'], [15, 20, '']]},
  hexane: {label: 'Hexane C₆H₁₄', formula: 'C₆H₁₄', M: 86, ir: [[2930, 0.8, 90, 'C–H'], [1460, 0.4, 30, 'C–H uốn']], ms: [[86, 15, 'M⁺'], [71, 25, ''], [57, 100, 'C₄H₉⁺'], [43, 90, 'C₃H₇⁺'], [29, 60, 'C₂H₅⁺']]},
};
export const irTransmittance = (c: SpectrumCompound, x: number) => 100 - c.ir.reduce((a, [x0, s, w]) => a + 90 * s * Math.exp(-(((x - x0) / w) ** 2)), 0);

const bondAngles = (m: Molecule, i: number) => m.bonds.filter((b) => b[0] === i || b[1] === i).map((b) => {
  const o = m.atoms[b[0] === i ? b[1] : b[0]];
  return Math.atan2(o.y - m.atoms[i].y, o.x - m.atoms[i].x);
});
function lonePairs(m: Molecule, i: number): number[] {
  const bonded = bondAngles(m, i);
  const cands = Array.from({length: 8}, (_, k) => (k * Math.PI) / 4 - Math.PI);
  const free = cands.filter((a) => bonded.every((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) > 0.9));
  const need = m.atoms[i].lone;
  if (free.length <= need) return free;
  const step = free.length / need;
  return Array.from({length: need}, (_, k) => free[Math.floor(k * step)]);
}

export const FLAMES: Record<string, {label: string; name: string; color: string; inner: string; wave: string; use: string}> = {
  Li: {label: 'Li⁺ (muối lithium)', name: 'đỏ tía', color: '#DC2626', inner: '#7F1D1D', wave: '≈ 670 nm', use: 'pháo hoa đỏ, nhận biết lithium'},
  Na: {label: 'Na⁺ (muối natri)', name: 'vàng tươi', color: '#FACC15', inner: '#CA8A04', wave: '≈ 589 nm', use: 'đèn đường natri, nhận biết natri'},
  K: {label: 'K⁺ (muối kali)', name: 'tím', color: '#A78BFA', inner: '#6D28D9', wave: '≈ 766 nm', use: 'pháo hoa tím; quan sát qua kính coban để loại màu vàng của natri'},
  Ca: {label: 'Ca²⁺ (muối canxi)', name: 'đỏ cam (đỏ gạch)', color: '#EA580C', inner: '#9A3412', wave: '≈ 620 nm', use: 'pháo hoa cam, nhận biết canxi'},
  Sr: {label: 'Sr²⁺ (muối stronti)', name: 'đỏ son', color: '#E11D48', inner: '#881337', wave: '≈ 650 nm', use: 'pháo sáng tín hiệu màu đỏ'},
  Ba: {label: 'Ba²⁺ (muối bari)', name: 'lục vàng', color: '#A3E635', inner: '#4D7C0F', wave: '≈ 524 nm', use: 'pháo hoa xanh lục'},
  Cu: {label: 'Cu²⁺ (muối đồng)', name: 'lục lam', color: '#2DD4BF', inner: '#0F766E', wave: '≈ 510–530 nm', use: 'pháo hoa xanh lục, nhận biết đồng'},
};

export const HOA_SCENE1_PRESETS: Record<string, PresetSpec> = {
  CHEM_ATOM_STRUCTURE: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Cấu hình electron: Aufbau, Hund, Pauli',
    question: 'Electron được điền vào các orbital theo thứ tự năng lượng và quy tắc nào? Vì sao Cr và Cu có cấu hình khác với dự đoán theo Aufbau?',
    keywords: /cau hinh electron|quy tac hund|nguyen l[yi] pauli|nguyen l[yi] vung ben|orbital nguyen tu|aufbau|lop va phan lop electron/,
    examples: ['cấu hình electron', 'quy tắc Hund', 'nguyên lí Pauli', 'orbital nguyên tử'],
    data: {
      viewBox: [560, 330],
      sliders: [{key: 'z', label: 'Số hiệu nguyên tử Z', min: 1, max: 36, step: 1, value: 26}],
      draw: (p) => {
        const z = Math.round(p.z);
        const cfg = configuration(z);
        const rows = [...cfg].sort((a, b) => ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p'].indexOf(a.sub) - ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p'].indexOf(b.sub));
        const out: Shape[] = [arrow(36, 300, 36, 20, C.grey, 1.4), txt(36, 14, 'E', {size: 11, fill: C.grey})];
        rows.forEach((s, i) => {
          const y = 270 - i * 33;
          out.push(txt(70, y + 18, s.sub, {size: 13, bold: true}));
          for (let o = 0; o < s.orbitals; o++) {
            const x = 100 + o * 34;
            out.push(box(x, y, 30, 26, undefined, C.ink));
            const up = o < s.e ? 1 : 0;
            const down = s.e > s.orbitals && o < s.e - s.orbitals ? 1 : 0;
            if (up) out.push(arrow(x + 10, y + 22, x + 10, y + 4, C.blue, 2));
            if (down) out.push(arrow(x + 20, y + 4, x + 20, y + 22, C.red, 2));
          }
        });
        out.push(txt(330, 60, ELEMENTS.find((e) => e.z === z)?.name ?? '', {size: 22, bold: true, anchor: 'start'}), txt(330, 90, `Z = ${z}`, {size: 14, anchor: 'start'}));
        return out;
      },
      readouts: [
        {label: 'Cấu hình electron', value: (p) => `${SYMS[Math.round(p.z) - 1].sym}: ${configString(Math.round(p.z))}`},
        {label: 'Electron độc thân · electron hóa trị', value: (p) => `${unpaired(Math.round(p.z))} · ${valenceElectrons(Math.round(p.z))}`},
        {label: 'Lớp ngoài cùng (chu kì)', value: (p) => `n = ${Math.max(...configuration(Math.round(p.z)).filter((s) => s.e > 0).map((s) => s.n))}`},
      ],
      note: 'Aufbau: điền theo thứ tự 1s 2s 2p 3s 3p 4s 3d 4p. Hund: mỗi orbital một electron (mũi tên lên) trước khi ghép đôi. Pauli: mỗi orbital tối đa 2 electron ngược chiều spin. Cr (Z = 24) và Cu (Z = 29) ưu tiên 3d bán bão hòa/bão hòa.',
    },
  },

  CHEM_BONDING: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Liên kết hóa học: cộng hóa trị và liên kết ion',
    question: 'Hiệu độ âm điện giữa hai nguyên tử cho biết loại liên kết thế nào? Vì sao CO₂ có liên kết phân cực nhưng phân tử lại không phân cực?',
    keywords: /lien ket hoa hoc|lien ket cong hoa tri|lien ket ion|cong thuc lewis|quy tac octet|lien ket (?:don|doi|ba)|do am dien va lien ket|phan tu phan cuc/,
    examples: ['liên kết hóa học', 'liên kết cộng hóa trị', 'liên kết ion', 'công thức Lewis', 'quy tắc octet'],
    data: {
      viewBox: [560, 300],
      choices: [{key: 'm', label: 'Chất', value: 'H2O', options: Object.entries(MOLECULES).map(([k, v]) => [k, v.label] as [string, string])}],
      draw: (_p, _t, s) => {
        const m = MOLECULES[s.m];
        const out: Shape[] = [];
        if (m.ionic) {
          out.push({t: 'circle', cx: 190, cy: 150, r: 38, fill: '#FCA5A5', stroke: C.red, w: 2}, {t: 'circle', cx: 370, cy: 150, r: 46, fill: '#A5B4FC', stroke: C.blue, w: 2}, txt(190, 156, 'Na⁺', {size: 18, bold: true}), txt(370, 156, 'Cl⁻', {size: 18, bold: true}), arrow(250, 150, 318, 150, C.orange, 3), txt(284, 136, '1 e⁻', {size: 12, fill: C.orange, bold: true}), txt(280, 236, 'lực hút tĩnh điện giữa ion trái dấu', {size: 11, fill: C.grey}));
          for (let k = 0; k < 8; k++) out.push(dot(370 + 58 * Math.cos((k * Math.PI) / 4 + 0.39), 150 + 58 * Math.sin((k * Math.PI) / 4 + 0.39), 3, C.blue));
          return out;
        }
        for (const [a, b, n] of m.bonds) {
          const A = m.atoms[a];
          const B = m.atoms[b];
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const L = Math.hypot(dx, dy);
          const nx = -dy / L;
          const ny = dx / L;
          for (let i = 0; i < n; i++) {
            const off = (i - (n - 1) / 2) * 7;
            out.push(ln(A.x + nx * off + (dx / L) * 24, A.y + ny * off + (dy / L) * 24, B.x + nx * off - (dx / L) * 24, B.y + ny * off - (dy / L) * 24, {stroke: C.ink, w: 2.4}));
          }
        }
        m.atoms.forEach((a, i) => {
          out.push({t: 'circle', cx: a.x, cy: a.y, r: 24, fill: a.s === 'H' ? '#E7E5E4' : a.s === 'O' ? '#FCA5A5' : a.s === 'N' ? '#A5B4FC' : a.s === 'C' ? '#D6D3D1' : '#BBF7D0', stroke: C.ink, w: 1.6}, txt(a.x, a.y + 5, a.s, {size: 16, bold: true}));
          for (const ang of lonePairs(m, i)) {
            const cx = a.x + 40 * Math.cos(ang);
            const cy = a.y + 40 * Math.sin(ang);
            out.push(dot(cx - 4.5 * Math.sin(ang), cy + 4.5 * Math.cos(ang), 3.4, C.blue), dot(cx + 4.5 * Math.sin(ang), cy - 4.5 * Math.cos(ang), 3.4, C.blue));
          }
        });
        return out;
      },
      readouts: [
        {label: 'Độ âm điện lớn nhất / nhỏ nhất · hiệu', value: (_p, _t, s) => {
          const [lo, hi] = bondEN(MOLECULES[s.m]);
          return `${hi} / ${lo} · Δχ = ${f2(hi - lo)}`;
        }},
        {label: 'Loại liên kết (theo hiệu độ âm điện)', value: (_p, _t, s) => {
          const [lo, hi] = bondEN(MOLECULES[s.m]);
          return bondKind(hi - lo);
        }},
        {label: 'Hình dạng · năng lượng liên kết', value: (_p, _t, s) => `${MOLECULES[s.m].geom} · ${MOLECULES[s.m].energy}`},
      ],
      note: 'Chấm xanh là cặp electron chưa liên kết. Δχ < 0,4: cộng hóa trị không cực; 0,4–1,7: có cực; ≥ 1,7: ion. ',
    },
  },

  CHEM_REDOX: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Phản ứng oxi hóa – khử: số oxi hóa và chuyển electron',
    question: 'Chất nào nhường electron, chất nào nhận electron? Vì sao tổng số electron nhường luôn bằng tổng số electron nhận?',
    keywords: /so oxi hoa|chat khu va chat oxi hoa|can bang electron|nhuong electron|nhan electron/,
    examples: ['số oxi hóa', 'chất khử và chất oxi hóa', 'cân bằng electron', 'nhường electron'],
    data: {
      viewBox: [560, 280],
      choices: [{key: 'r', label: 'Phản ứng', value: 'zncu', options: Object.entries(REDOX).map(([k, v]) => [k, v.eq] as [string, string])}],
      time: {max: 6, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (_p, t, s) => {
        const r = REDOX[s.r];
        const out: Shape[] = [box(30, 50, 170, 130, '#FEE2E2', C.red), box(360, 50, 170, 130, '#DBEAFE', C.blue)];
        out.push(txt(115, 34, 'CHẤT KHỬ (nhường e)', {size: 11, bold: true, fill: C.red}), txt(445, 34, 'CHẤT OXI HÓA (nhận e)', {size: 11, bold: true, fill: C.blue}));
        out.push(txt(115, 100, r.reducer, {size: 26, bold: true}), txt(115, 140, `${r.reducerChange[0]} → ${r.reducerChange[1]}`, {size: 18}), txt(115, 168, 'bị oxi hóa', {size: 11, fill: C.red}));
        out.push(txt(445, 100, r.oxidant, {size: 26, bold: true}), txt(445, 140, `${r.oxidantChange[0]} → ${r.oxidantChange[1]}`, {size: 18}), txt(445, 168, 'bị khử', {size: 11, fill: C.blue}));
        out.push(arrow(205, 115, 355, 115, C.orange, 3));
        for (let i = 0; i < r.electrons; i++) {
          const f = (((t / 3 + i / r.electrons) % 1) + 1) % 1;
          out.push({t: 'circle', cx: 205 + 150 * f, cy: 115 - 16 - (i % 2) * 8, r: 6, fill: C.orange}, txt(205 + 150 * f, 119 - 16 - (i % 2) * 8, 'e', {size: 8, fill: '#fff', bold: true}));
        }
        out.push(txt(280, 220, r.eq, {size: 16, bold: true}), txt(280, 248, `${r.electrons} e chuyển từ chất khử sang chất oxi hóa`, {size: 12, fill: C.grey}));
        return out;
      },
      readouts: [
        {label: 'Chất khử → chất oxi hóa', value: (_p, _t, s) => `${REDOX[s.r].reducer} → ${REDOX[s.r].oxidant}`},
        {label: 'Số electron trao đổi', value: (_p, _t, s) => String(REDOX[s.r].electrons)},
        {label: 'Giải thích', value: (_p, _t, s) => REDOX[s.r].note},
      ],
      note: 'Chất khử có số oxi hóa tăng (bị oxi hóa), chất oxi hóa có số oxi hóa giảm (bị khử). Quá trình nhường và nhận electron xảy ra đồng thời.',
    },
  },

  CHEM_HALOGEN_LAB: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Ống nghiệm ảo: nhận biết halide và phản ứng đẩy halogen',
    question: 'Vì sao AgNO₃ tạo kết tủa với Cl⁻, Br⁻, I⁻ nhưng không với F⁻? Halogen nào đẩy được halogen nào ra khỏi muối và điều đó nói gì về tính oxi hóa?',
    keywords: /nhan biet (?:ion )?halide|nhan biet ion halogenua|phan ung day halogen|halogen day halogen|tinh oxi hoa cua halogen|nuoc clo|nuoc brom|ket tua agcl|agbr|\bagi\b/,
    examples: ['nhận biết ion halide', 'phản ứng đẩy halogen', 'nước clo và muối bromide', 'kết tủa AgCl AgBr'],
    data: {
      viewBox: [560, 280],
      choices: [
        {key: 'salt', label: 'Muối natri', value: 'Br', options: HALOGEN_SALTS.map(([k, l]) => [k, l] as [string, string])},
        {key: 'reagent', label: 'Thuốc thử', value: 'ag', options: [['ag', 'Dung dịch AgNO₃'], ['cl2', 'Nước clo'], ['br2', 'Nước brom']]},
      ],
      toggles: [{key: 'mix', label: 'Trộn hai ống', value: false}],
      draw: (p, _t, s) => {
        const res = halogenResult(s.salt, s.reagent);
        const out: Shape[] = [];
        const reagentColor = s.reagent === 'cl2' ? COLOR_OF.Cl : s.reagent === 'br2' ? COLOR_OF.Br : CLEAR;
        out.push(...tubeShapes(110, CLEAR, undefined), ...tubeShapes(210, reagentColor, undefined), txt(110, 250, s.salt === 'F' ? 'NaF' : `Na${s.salt}`, {size: 12}), txt(210, 250, s.reagent === 'ag' ? 'AgNO₃' : s.reagent === 'cl2' ? 'nước Cl₂' : 'nước Br₂', {size: 12}));
        out.push(arrow(260, 150, 330, 150, C.grey, 2.4));
        if (p.mix === 1) out.push(...tubeShapes(400, res.liquid, res.precip), txt(400, 250, 'sau khi trộn', {size: 12}));
        else out.push(txt(400, 150, 'bật “Trộn hai ống”', {size: 12, fill: C.grey}));
        return out;
      },
      readouts: [{label: 'Hiện tượng và phương trình', value: (p, _t, s) => (p.mix === 1 ? halogenResult(s.salt, s.reagent).text : 'chưa trộn')}],
      note: 'Tính oxi hóa: F₂ > Cl₂ > Br₂ > I₂, nên halogen đứng trên đẩy được halogen đứng dưới ra khỏi dung dịch muối. AgF tan, AgCl trắng, AgBr vàng nhạt, AgI vàng.',
    },
  },

  CHEM_VIRTUAL_TESTTUBE: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Ống nghiệm ảo: nhận biết ion bằng kết tủa, màu và chất khí',
    question: 'Từ hiện tượng (màu kết tủa, tan trong thuốc thử dư, khí thoát ra) ta suy ra ion nào có trong dung dịch như thế nào?',
    keywords: /ong nghiem ao|nhan biet (?:cac )?(?:ion|cation|anion)|nhan biet dung dich|ket tua cua cu\(oh\)2|phan ung tao ket tua|phan ung tao khi/,
    examples: ['ống nghiệm ảo', 'nhận biết các ion', 'phản ứng tạo kết tủa', 'nhận biết dung dịch'],
    data: {
      viewBox: [560, 280],
      choices: [
        {key: 'sol', label: 'Dung dịch cần thử', value: 'Cu', options: TUBE_SOLUTIONS.map(([k, l]) => [k, l] as [string, string])},
        {key: 'reagent', label: 'Thuốc thử', value: 'naoh', options: TUBE_REAGENTS.map(([k, l]) => [k, l] as [string, string])},
      ],
      toggles: [{key: 'mix', label: 'Nhỏ thuốc thử vào', value: false}, {key: 'excess', label: 'Cho dư thuốc thử', value: false}],
      time: {max: 8, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t, s) => {
        const res = testTubeResult(s.sol, s.reagent, p.excess === 1);
        const out: Shape[] = [];
        const sol = STOCK[s.sol];
        out.push(...tubeShapes(120, sol, undefined), ...tubeShapes(220, CLEAR, undefined), txt(120, 250, TUBE_SOLUTIONS.find((x) => x[0] === s.sol)![1], {size: 11}), txt(220, 250, TUBE_REAGENTS.find((x) => x[0] === s.reagent)![1], {size: 11}));
        out.push(arrow(270, 150, 340, 150, C.grey, 2.4));
        if (p.mix === 1) {
          out.push(...tubeShapes(410, res.liquid, res.precip, res.gas ? 6 : 0, t), txt(410, 250, p.excess === 1 ? 'thuốc thử dư' : 'sau phản ứng', {size: 11}));
        } else out.push(txt(410, 150, 'bật “Nhỏ thuốc thử vào”', {size: 12, fill: C.grey}));
        return out;
      },
      readouts: [{label: 'Hiện tượng', value: (p, _t, s) => (p.mix === 1 ? testTubeResult(s.sol, s.reagent, p.excess === 1).text : 'chưa nhỏ thuốc thử')}],
      note: 'Kết tủa Al(OH)₃ và Zn(OH)₂ tan trong NaOH dư (lưỡng tính), còn Mg(OH)₂, Cu(OH)₂, Fe(OH)₃ thì không. Màu kết tủa giúp phân biệt Fe²⁺ và Fe³⁺.',
    },
  },

  CHEM_SPECTRA: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Phổ hồng ngoại (IR) và phổ khối lượng (MS)',
    question: 'Các peak hấp thụ ở số sóng đặc trưng cho nhóm chức nào? Peak ion phân tử trong phổ khối cho ta biết điều gì về phân tử khối?',
    keywords: /pho hong ngoai|pho khoi luong|pho ir\b|pho ms\b|peak ion phan tu|so song|lap cong thuc phan tu/,
    examples: ['phổ hồng ngoại', 'phổ khối lượng', 'phổ IR của ethanol', 'peak ion phân tử'],
    data: {
      viewBox: [560, 300],
      choices: [
        {key: 'c', label: 'Hợp chất', value: 'ethanol', options: Object.entries(SPECTRA).map(([k, v]) => [k, v.label] as [string, string])},
        {key: 'mode', label: 'Loại phổ', value: 'ir', options: [['ir', 'Hồng ngoại (IR)'], ['ms', 'Khối lượng (MS)']]},
      ],
      draw: (_p, _t, s) => {
        const c = SPECTRA[s.c];
        const out: Shape[] = [ln(50, 250, 520, 250, {stroke: C.ink, w: 1.4}), ln(50, 250, 50, 30, {stroke: C.ink, w: 1.4})];
        if (s.mode === 'ir') {
          const X = (x: number) => 50 + ((4000 - x) / 3500) * 470;
          const Y = (tr: number) => 250 - (tr / 100) * 210;
          const pts: [number, number][] = [];
          for (let x = 4000; x >= 500; x -= 10) pts.push([X(x), Y(irTransmittance(c, x))]);
          out.push(poly(pts, {stroke: C.blue, w: 2.2, close: false}));
          for (let x = 4000; x >= 500; x -= 500) out.push(tick(X(x), 266, String(x)));
          out.push(txt(285, 286, 'số sóng (cm⁻¹)', {size: 11}), txt(18, 140, 'T (%)', {size: 11, rot: -90}));
          c.ir.forEach(([x0, st, , lab]) => out.push(txt(X(x0), Y(100 - 90 * st) + 16, lab, {size: 10, fill: C.red, bold: true})));
        } else {
          const X = (mz: number) => 50 + (mz / (c.M + 6)) * 470;
          for (const [mz, rel, lab] of c.ms) {
            out.push(ln(X(mz), 250, X(mz), 250 - rel * 2, {stroke: mz === c.M ? C.red : C.blue, w: 5}), txt(X(mz), 244 - rel * 2, String(mz), {size: 11, bold: true}));
            if (lab) out.push(txt(X(mz), 262, lab, {size: 9, fill: C.grey}));
          }
          out.push(txt(285, 288, 'm/z', {size: 11}), txt(18, 140, 'cường độ tương đối (%)', {size: 11, rot: -90}));
        }
        return out;
      },
      readouts: [
        {label: 'Công thức phân tử · phân tử khối M', value: (_p, _t, s) => `${SPECTRA[s.c].formula} · ${SPECTRA[s.c].M}`},
        {label: 'Peak đặc trưng', value: (_p, _t, s) => (s.mode === 'ir' ? SPECTRA[s.c].ir.map((x) => `${x[0]} cm⁻¹: ${x[3]}`).join('; ') : `peak ion phân tử ở m/z = ${SPECTRA[s.c].M}; peak cao nhất (100 %) ở m/z = ${SPECTRA[s.c].ms.find((x) => x[1] === 100)![0]}`)},
      ],
      note: 'IR: trục số sóng đảo chiều, peak hướng xuống là hấp thụ. Phổ khối: peak có m/z lớn nhất ứng với ion phân tử [M]⁺, cho phân tử khối.',
    },
  },

  CHEM_ALKALI_EARTH: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Thử màu ngọn lửa của kim loại kiềm, kiềm thổ và đồng',
    question: 'Vì sao mỗi kim loại cho ngọn lửa một màu đặc trưng? Màu ngọn lửa giúp nhận ra ion kim loại nào và được dùng ở đâu?',
    keywords: /mau ngon lua|thu mau ngon lua|phan ung mau ngon lua|kim loai kiem|kim loai kiem tho|nuoc cung|phao hoa/,
    examples: ['màu ngọn lửa', 'thử màu ngọn lửa', 'kim loại kiềm', 'kim loại kiềm thổ'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'ion', label: 'Muối của kim loại', value: 'Na', options: Object.entries(FLAMES).map(([k, v]) => [k, v.label] as [string, string])}],
      time: {max: 8, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (_p, t, s) => {
        const F = FLAMES[s.ion];
        const flick = 5 * Math.sin(t * 9) + 3 * Math.sin(t * 17);
        const out: Shape[] = [box(262, 210, 36, 80, '#78716C', C.ink), box(240, 288, 80, 16, '#57534E', C.ink)];
        out.push({t: 'path', d: `M280 205 C ${248 + flick * 0.3} 160, ${250 - flick * 0.4} 105, 280 ${50 + flick} C ${310 + flick * 0.4} 105, ${312 - flick * 0.3} 160, 280 205 Z`, fill: F.color, o: 0.88});
        out.push({t: 'path', d: `M280 205 C 266 180, 268 150, 280 ${110 + flick * 0.5} C 292 150, 294 180, 280 205 Z`, fill: F.inner, o: 0.9});
        out.push(txt(280, 28, F.label, {size: 15, bold: true}));
        return out;
      },
      readouts: [
        {label: 'Màu ngọn lửa', value: (_p, _t, s) => FLAMES[s.ion].name},
        {label: 'Bước sóng ánh sáng phát ra (xấp xỉ)', value: (_p, _t, s) => FLAMES[s.ion].wave},
        {label: 'Ứng dụng', value: (_p, _t, s) => FLAMES[s.ion].use},
      ],
      note: 'Khi bị nung, electron bị kích thích rồi trở về mức năng lượng thấp và phát ra ánh sáng có bước sóng đặc trưng của nguyên tố.',
    },
  },
};

function tubeShapes(cx: number, liquid: string, precip?: string, bubbles = 0, t = 0): Shape[] {
  const out: Shape[] = [];
  const w = 40;
  const top = 70;
  const h = 150;
  const x0 = cx - w / 2;
  const bottom = top + h;
  const ly = bottom - h * 0.6;
  out.push({t: 'path', d: `M${x0} ${ly} V${bottom - w / 2} A${w / 2} ${w / 2} 0 0 0 ${x0 + w} ${bottom - w / 2} V${ly} Z`, fill: liquid, o: 0.9});
  if (precip) out.push({t: 'path', d: `M${x0 + 3} ${bottom - 16} Q${cx} ${bottom - 34} ${x0 + w - 3} ${bottom - 16} A${w / 2 - 3} ${w / 2 - 3} 0 0 1 ${x0 + 3} ${bottom - 16} Z`, fill: precip, stroke: '#78716C', w: 0.6});
  for (let i = 0; i < bubbles; i++) out.push({t: 'circle', cx: cx - 10 + ((i * 7) % 20), cy: bottom - 24 - (((t * 28 + i * 21) % (h * 0.6 - 26)) | 0), r: 2.4 + (i % 2), stroke: '#FFFFFF', w: 1.4});
  out.push({t: 'path', d: `M${x0} ${top} V${bottom - w / 2} A${w / 2} ${w / 2} 0 0 0 ${x0 + w} ${bottom - w / 2} V${top}`, stroke: C.ink, w: 2.2});
  return out;
}
