import type {PresetSpec, Shape} from './types';
import {C, box, dot, f1, f2, f3, ln, poly, rad, seeded, txt} from './sceneKit';

// ------------------------------------------------------------------ hợp chất hữu cơ
export interface Organic {
  label: string;
  name: string;
  formula: string;
  cls: string;
  group: string;
  atoms: [number, number, string?][];
  bonds: [number, number, number][];
  hl: number[];
  iso?: string;
}
const hex = (): [number, number][] => Array.from({length: 6}, (_, i) => [280 + 52 * Math.cos(rad(60 * i - 30)), 140 + 52 * Math.sin(rad(60 * i - 30))]);
export const ORGANICS: Record<string, Organic> = {
  butane: {label: 'Butane', name: 'butane', formula: 'C₄H₁₀', cls: 'alkane', group: 'không có nhóm chức (liên kết đơn C–C, C–H)', atoms: [[190, 170], [235, 146], [280, 170], [325, 146]], bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1]], hl: [], iso: 'là đồng phân cấu tạo (mạch carbon) của 2-methylpropane'},
  isobutane: {label: '2-Methylpropane', name: '2-methylpropane (isobutane)', formula: 'C₄H₁₀', cls: 'alkane', group: 'không có nhóm chức; mạch carbon phân nhánh', atoms: [[280, 150], [280, 100], [237, 175], [323, 175]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]], hl: [], iso: 'là đồng phân mạch carbon của butane'},
  butene: {label: 'But-1-ene', name: 'but-1-ene', formula: 'C₄H₈', cls: 'alkene', group: 'liên kết đôi C=C', atoms: [[190, 170], [235, 146], [280, 170], [325, 146]], bonds: [[0, 1, 2], [1, 2, 1], [2, 3, 1]], hl: [0, 1], iso: 'có đồng phân vị trí liên kết đôi (but-2-ene) và đồng phân hình học'},
  ethanol: {label: 'Ethanol', name: 'ethanol', formula: 'C₂H₆O', cls: 'alcohol', group: 'nhóm hydroxyl –OH', atoms: [[220, 170], [265, 146], [310, 170, 'OH']], bonds: [[0, 1, 1], [1, 2, 1]], hl: [2], iso: 'là đồng phân nhóm chức của dimethyl ether (CH₃–O–CH₃)'},
  propan2ol: {label: 'Propan-2-ol', name: 'propan-2-ol', formula: 'C₃H₈O', cls: 'alcohol bậc II', group: 'nhóm –OH gắn vào C bậc hai', atoms: [[220, 175], [265, 150], [310, 175], [265, 100, 'OH']], bonds: [[0, 1, 1], [1, 2, 1], [1, 3, 1]], hl: [3], iso: 'là đồng phân vị trí nhóm chức của propan-1-ol'},
  ethanal: {label: 'Ethanal', name: 'ethanal (acetaldehyde)', formula: 'C₂H₄O', cls: 'aldehyde', group: 'nhóm carbonyl đầu mạch –CH=O', atoms: [[220, 170], [265, 146], [310, 170, 'O']], bonds: [[0, 1, 1], [1, 2, 2]], hl: [1, 2], iso: 'là đồng phân nhóm chức của oxirane (ethylene oxide)'},
  acetic: {label: 'Acetic acid', name: 'ethanoic acid (acetic acid)', formula: 'C₂H₄O₂', cls: 'carboxylic acid', group: 'nhóm carboxyl –COOH', atoms: [[200, 175], [245, 150], [245, 100, 'O'], [290, 175, 'OH']], bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1]], hl: [1, 2, 3], iso: 'là đồng phân nhóm chức của methyl formate (HCOOCH₃)'},
  ester: {label: 'Methyl acetate', name: 'methyl acetate', formula: 'C₃H₆O₂', cls: 'ester', group: 'nhóm ester –COO–', atoms: [[170, 175], [215, 150], [215, 100, 'O'], [260, 175, 'O'], [305, 150]], bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1], [3, 4, 1]], hl: [1, 2, 3], iso: 'là đồng phân nhóm chức của propanoic acid'},
  benzene: {label: 'Benzene', name: 'benzene', formula: 'C₆H₆', cls: 'arene', group: 'vòng benzene (hệ electron π liên hợp)', atoms: hex().map(([x, y]) => [x, y] as [number, number]), bonds: [[0, 1, 2], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 0, 1]], hl: [0, 1, 2, 3, 4, 5]},
};

// ------------------------------------------------------------------ điện phân
export const FARADAY = 96485;
export interface Cell {
  label: string;
  cathode: string;
  anode: string;
  /** mol sản phẩm catot / anot trên 1 mol electron, khối lượng mol catot */
  cMol: number;
  cM: number;
  cName: string;
  aMol: number;
  aName: string;
  note: string;
}
export const CELLS: Record<string, Cell> = {
  nacl: {label: 'Dung dịch NaCl có màng ngăn', cathode: '2H₂O + 2e → H₂ + 2OH⁻', anode: '2Cl⁻ → Cl₂ + 2e', cMol: 1 / 2, cM: 2.016, cName: 'H₂', aMol: 1 / 2, aName: 'Cl₂', note: 'Thu được NaOH ở catot, khí H₂ và Cl₂: nền tảng công nghiệp chlor–kiềm.'},
  cuso4: {label: 'Dung dịch CuSO₄, điện cực trơ', cathode: 'Cu²⁺ + 2e → Cu', anode: '2H₂O → O₂ + 4H⁺ + 4e', cMol: 1 / 2, cM: 63.546, cName: 'Cu', aMol: 1 / 4, aName: 'O₂', note: 'Kim loại đồng bám catot; dung dịch trở nên acid dần vì sinh H⁺ ở anot.'},
  al2o3: {label: 'Al₂O₃ nóng chảy (criolit)', cathode: 'Al³⁺ + 3e → Al', anode: '2O²⁻ → O₂ + 4e', cMol: 1 / 3, cM: 26.982, cName: 'Al', aMol: 1 / 4, aName: 'O₂', note: 'Nhôm lỏng chảy xuống đáy; O₂ đốt cháy dần anot than chì nên phải thay định kì.'},
};
/** Số mol electron đã qua mạch: n = It/F. */
export const molElectrons = (I: number, tMin: number) => (I * tMin * 60) / FARADAY;
export const productMass = (cell: Cell, I: number, tMin: number) => molElectrons(I, tMin) * cell.cMol * cell.cM;
export const anodeLitres = (cell: Cell, I: number, tMin: number) => molElectrons(I, tMin) * cell.aMol * 24.79;

// ------------------------------------------------------------------ polymer
export interface PolymerSpec {
  label: string;
  type: string;
  unit: string;
  mUnit: number;
  monomer: string;
  condense: boolean;
}
export const POLYMERS: Record<string, PolymerSpec> = {
  pe: {label: 'Polyethylene (PE)', type: 'trùng hợp', unit: '–CH₂–CH₂–', mUnit: 28, monomer: 'CH₂=CH₂ (ethylene)', condense: false},
  pvc: {label: 'Poly(vinyl chloride) (PVC)', type: 'trùng hợp', unit: '–CH₂–CHCl–', mUnit: 62.5, monomer: 'CH₂=CHCl (vinyl chloride)', condense: false},
  nylon: {label: 'Nylon-6,6', type: 'trùng ngưng', unit: '–NH(CH₂)₆NH–CO(CH₂)₄CO–', mUnit: 226, monomer: 'hexamethylenediamine + adipic acid', condense: true},
};
export const polymerMass = (p: PolymerSpec, n: number) => p.mUnit * n;
export const waterReleased = (p: PolymerSpec, n: number) => (p.condense ? 2 * n - 1 : 0);

export const HOA_SCENE2_PRESETS: Record<string, PresetSpec> = {
  CHEM_ORGANIC_STRUCTURE: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Công thức cấu tạo, nhóm chức và đồng phân hợp chất hữu cơ',
    question: 'Hai chất có cùng công thức phân tử nhưng khác công thức cấu tạo thì khác nhau thế nào? Nhóm chức nào quyết định tính chất đặc trưng của từng loại hợp chất?',
    keywords: /nhom chuc|dong phan (?:cau tao|mach carbon|vi tri)|cong thuc cau tao|cong thuc khung|dong dang|danh phap hop chat huu co|hop chat huu co/,
    examples: ['nhóm chức', 'đồng phân cấu tạo', 'công thức cấu tạo thu gọn', 'công thức khung phân tử', 'hợp chất hữu cơ'],
    data: {
      viewBox: [560, 260],
      choices: [{key: 'm', label: 'Hợp chất', value: 'ethanol', options: Object.entries(ORGANICS).map(([k, v]) => [k, v.label] as [string, string])}],
      toggles: [{key: 'hl', label: 'Tô nhóm chức', value: true}],
      draw: (p, _t, s) => {
        const m = ORGANICS[s.m];
        const out: Shape[] = [];
        const shorten = (i: number, j: number): [number, number, number, number] => {
          const a = m.atoms[i];
          const b = m.atoms[j];
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const ux = (b[0] - a[0]) / L;
          const uy = (b[1] - a[1]) / L;
          const ca = a[2] ? 13 : 0;
          const cb = b[2] ? 13 : 0;
          return [a[0] + ux * ca, a[1] + uy * ca, b[0] - ux * cb, b[1] - uy * cb];
        };
        if (p.hl === 1) for (const i of m.hl) out.push({t: 'circle', cx: m.atoms[i][0], cy: m.atoms[i][1], r: 22, fill: 'rgba(234,88,12,0.18)'});
        for (const [i, j, n] of m.bonds) {
          const [x1, y1, x2, y2] = shorten(i, j);
          const dx = x2 - x1;
          const dy = y2 - y1;
          const L = Math.hypot(dx, dy);
          for (let k = 0; k < n; k++) {
            const off = (k - (n - 1) / 2) * 6;
            out.push(ln(x1 - (dy / L) * off, y1 + (dx / L) * off, x2 - (dy / L) * off, y2 + (dx / L) * off, {stroke: C.ink, w: 2.4}));
          }
        }
        m.atoms.forEach(([x, y, sym]) => sym && out.push(txt(x, y + 5, sym, {size: 16, bold: true, fill: C.red})));
        out.push(txt(280, 238, `${m.name} — ${m.formula}`, {size: 14, bold: true}));
        return out;
      },
      readouts: [
        {label: 'Công thức phân tử · loại hợp chất', value: (_p, _t, s) => `${ORGANICS[s.m].formula} · ${ORGANICS[s.m].cls}`},
        {label: 'Nhóm chức / đặc điểm cấu tạo', value: (_p, _t, s) => ORGANICS[s.m].group},
        {label: 'Đồng phân', value: (_p, _t, s) => ORGANICS[s.m].iso ?? 'xem các chất có cùng công thức phân tử'},
      ],
      note: 'Công thức khung: mỗi đỉnh/đầu mút là một nguyên tử C (kèm H cho đủ hóa trị 4), chỉ ghi kí hiệu của dị tố như O. Đồng phân cấu tạo gồm đồng phân mạch carbon, vị trí và nhóm chức.',
    },
  },

  CHEM_LIPID_SOAP: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Chất béo, xà phòng và cơ chế tẩy rửa (micelle)',
    question: 'Phần đầu ưa nước và phần đuôi kị nước của phân tử xà phòng sắp xếp thế nào quanh giọt dầu? Vì sao xà phòng giặt kém trong nước cứng?',
    keywords: /xa phong|micelle|chat beo|xa phong hoa|chat giat rua|nuoc cung|acid beo|triglyceride|co che tay rua/,
    examples: ['xà phòng', 'micelle', 'chất béo', 'xà phòng hóa chất béo', 'cơ chế tẩy rửa'],
    data: {
      viewBox: [560, 320],
      sliders: [{key: 'c', label: 'Nồng độ xà phòng (100 = nồng độ micelle tới hạn)', min: 0, max: 200, step: 5, value: 120}],
      toggles: [{key: 'hard', label: 'Nước cứng (có Ca²⁺)', value: false}],
      draw: (p) => {
        const out: Shape[] = [];
        const cx = 280;
        const cy = 160;
        const eff = p.hard === 1 ? p.c * 0.45 : p.c;
        const ring_n = Math.round(24 * Math.min(1, eff / 100));
        out.push({t: 'circle', cx, cy, r: 44, fill: '#B45309', o: 0.85}, txt(cx, cy + 4, 'dầu mỡ', {size: 12, fill: '#fff', bold: true}));
        for (let i = 0; i < ring_n; i++) {
          const a = (2 * Math.PI * i) / Math.max(ring_n, 1);
          out.push(ln(cx + 50 * Math.cos(a), cy + 50 * Math.sin(a), cx + 82 * Math.cos(a), cy + 82 * Math.sin(a), {stroke: C.ink, w: 2}), dot(cx + 88 * Math.cos(a), cy + 88 * Math.sin(a), 5.5, C.blue));
        }
        const rng = seeded(4);
        const free = Math.min(18, Math.round(eff / 8));
        for (let i = 0; i < free; i++) {
          const x = 40 + rng() * 480;
          const y = 30 + rng() * 260;
          if (Math.hypot(x - cx, y - cy) < 110) continue;
          const a = rng() * 6.28;
          out.push(ln(x, y, x + 14 * Math.cos(a), y + 14 * Math.sin(a), {stroke: C.ink, w: 2}), dot(x, y, 4.5, C.blue));
        }
        if (p.hard === 1) for (let i = 0; i < 6; i++) out.push(dot(70 + i * 80, 285 - (i % 2) * 14, 9, '#9CA3AF'), txt(70 + i * 80, 289 - (i % 2) * 14, 'Ca²⁺', {size: 8}));
        out.push(txt(280, 24, 'đầu ưa nước → nước · đuôi kị nước → dầu', {size: 11, fill: C.grey}));
        return out;
      },
      readouts: [
        {label: 'Phân tử bám quanh giọt dầu (tối đa 24)', value: (p) => String(Math.round(24 * Math.min(1, (p.hard === 1 ? p.c * 0.45 : p.c) / 100)))},
        {label: 'Trạng thái', value: (p) => ((p.hard === 1 ? p.c * 0.45 : p.c) >= 100 ? 'đã tạo micelle bao kín giọt dầu: dầu bị kéo ra khỏi vải' : 'chưa đủ xà phòng: dầu chưa bị nhũ hóa hoàn toàn')},
        {label: 'Xà phòng hóa', value: () => '(RCOO)₃C₃H₅ + 3NaOH → 3RCOONa + C₃H₅(OH)₃'},
      ],
      note: 'Trong nước cứng, Ca²⁺ và Mg²⁺ kết tủa với xà phòng thành muối không tan (cặn), nên cần nhiều xà phòng hơn; chất giặt rửa tổng hợp không tạo kết tủa đó.',
    },
  },

  CHEM_CARBOHYDRATE: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Glucose: dạng mạch hở và dạng mạch vòng α, β',
    question: 'Glucose tồn tại chủ yếu ở dạng nào trong dung dịch và vì sao các dạng chuyển hóa qua lại được? Hai dạng α và β khác nhau ở vị trí nào?',
    keywords: /glucose (?:dang |o dang )?(?:mach|vong)|cau tao (?:cua )?glucose|dang mach vong|carbohydrate|saccharose|cacbohidrat|gluxit/,
    examples: ['glucose dạng mạch vòng', 'cấu tạo của glucose', 'carbohydrate', 'saccharose'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'form', label: 'Dạng', value: 'alpha', options: [['open', 'Mạch hở'], ['alpha', 'α-glucose (vòng)'], ['beta', 'β-glucose (vòng)']]}],
      draw: (_p, _t, s) => {
        const out: Shape[] = [];
        if (s.form === 'open') {
          const rows: [string, string][] = [['CH=O', ''], ['H–C–OH', 'R'], ['HO–C–H', 'L'], ['H–C–OH', 'R'], ['H–C–OH', 'R'], ['CH₂OH', '']];
          rows.forEach(([t, side], i) => out.push(txt(280, 50 + i * 42, t, {size: 17, bold: i === 0}), ...(i > 0 && i < 5 ? [ln(280, 56 + i * 42 - 36 + 8, 280, 40 + i * 42 + 2, {stroke: C.grey, w: 1})] : [])));
          out.push(txt(420, 140, 'nhóm –CHO tạo vòng với –OH ở C5', {size: 11, fill: C.grey}));
          return out;
        }
        const pts: [number, number][] = [[360, 130], [320, 190], [240, 190], [200, 130], [240, 70], [320, 70]];
        out.push(poly(pts, {stroke: C.ink, w: 2.6}));
        out.push(txt(280, 70, 'O', {size: 16, bold: true, fill: C.red}));
        const sub: [number, number, 'up' | 'down', string][] = [[360, 130, s.form === 'alpha' ? 'down' : 'up', 'OH'], [320, 190, 'down', 'OH'], [240, 190, 'up', 'OH'], [200, 130, 'down', 'OH'], [240, 70, 'up', 'CH₂OH']];
        sub.forEach(([x, y, d, l], i) => {
          const sgn = d === 'up' ? -1 : 1;
          out.push(ln(x, y, x, y + sgn * 34, {stroke: i === 0 ? C.red : C.ink, w: 2}), txt(x, y + sgn * 46, l, {size: 14, bold: true, fill: i === 0 ? C.red : C.ink}));
        });
        out.push(txt(398, 128, 'C1', {size: 11, fill: C.grey}), txt(280, 300, s.form === 'alpha' ? 'OH ở C1 hướng xuống (dưới mặt phẳng vòng)' : 'OH ở C1 hướng lên (cùng phía CH₂OH)', {size: 12, fill: C.red}));
        return out;
      },
      readouts: [
        {label: 'Tỉ lệ trong dung dịch cân bằng', value: () => 'α ≈ 36 %, β ≈ 64 %, mạch hở < 0,01 %'},
        {label: 'Công thức phân tử · phân tử khối', value: () => 'C₆H₁₂O₆ · 180'},
        {label: 'Tính chất nhóm chức', value: (_p, _t, s) => (s.form === 'open' ? 'có nhóm –CHO (phản ứng tráng bạc) và 5 nhóm –OH liền kề (hòa tan Cu(OH)₂)' : 'vòng 6 cạnh (pyranose), nhóm –OH hemiacetal ở C1 quyết định α hay β')},
      ],
      note: 'Trong dung dịch ba dạng chuyển hóa qua lại, nên glucose vẫn cho phản ứng tráng bạc dù chủ yếu ở dạng vòng. Saccharose = α-glucose + β-fructose; tinh bột và cellulose là polymer của glucose.',
    },
  },

  CHEM_POLYMER: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Polymer: trùng hợp và trùng ngưng',
    question: 'Phản ứng trùng hợp khác trùng ngưng ở chỗ nào? Số mắt xích n liên hệ với phân tử khối của polymer như thế nào?',
    keywords: /trung hop|trung ngung|polymer\b|polime|mat xich|nhua pvc|nylon|to nilon|cao su luu hoa/,
    examples: ['trùng hợp', 'trùng ngưng', 'polymer', 'mắt xích', 'nylon-6,6'],
    data: {
      viewBox: [560, 260],
      choices: [{key: 'p', label: 'Polymer', value: 'pe', options: Object.entries(POLYMERS).map(([k, v]) => [k, v.label] as [string, string])}],
      sliders: [{key: 'n', label: 'Số mắt xích n', min: 1, max: 8, step: 1, value: 4}],
      draw: (p, _t, s) => {
        const sp = POLYMERS[s.p];
        const n = Math.round(p.n);
        const out: Shape[] = [txt(280, 30, `monome: ${sp.monomer}`, {size: 12, fill: C.grey})];
        const w = 460 / Math.max(n, 3);
        for (let i = 0; i < n; i++) {
          const x = 50 + i * w;
          out.push(box(x, 80, w - 8, 60, i % 2 === 0 ? '#DBEAFE' : '#FEF3C7', C.ink), txt(x + (w - 8) / 2, 116, n > 5 && sp.unit.length > 12 ? '…' : sp.unit, {size: n > 5 ? 9 : 12}));
          if (sp.condense && i < n) out.push(dot(x + (w - 8) / 2, 168, 6, C.blue), txt(x + (w - 8) / 2, 190, 'H₂O ↑', {size: 10, fill: C.blue}));
        }
        out.push(txt(30, 118, '[', {size: 60, fill: C.ink}), txt(530, 118, `]n`, {size: 28, anchor: 'end'}), txt(280, 235, `${sp.type}: n = ${n}`, {size: 13, bold: true}));
        return out;
      },
      readouts: [
        {label: 'Loại phản ứng', value: (_p, _t, s) => POLYMERS[s.p].type},
        {label: 'Phân tử khối M = n × M mắt xích', value: (p, _t, s) => `${f1(polymerMass(POLYMERS[s.p], Math.round(p.n)))} (mắt xích ${POLYMERS[s.p].mUnit})`},
        {label: 'Số phân tử nước giải phóng', value: (p, _t, s) => String(waterReleased(POLYMERS[s.p], Math.round(p.n)))},
      ],
      note: 'Trùng hợp: monome có liên kết bội cộng vào nhau, không tạo sản phẩm phụ. Trùng ngưng: monome có ≥ 2 nhóm chức, mỗi lần nối giải phóng một phân tử nhỏ như H₂O.',
    },
  },

  CHEM_ELECTROLYSIS: {
    family: 'SCENE_LAB',
    engine: 'CHEMISTRY',
    title: 'Điện phân và định luật Faraday',
    question: 'Ở catot và anot xảy ra quá trình nào khi điện phân các dung dịch và chất nóng chảy khác nhau? Khối lượng chất sinh ra phụ thuộc cường độ dòng điện và thời gian như thế nào?',
    keywords: /dien phan|dinh luat faraday ve dien phan|ma dien|tinh luyen dong|dieu che nhom|chlor[- ]?kiem|catot|anot|cuc am|cuc duong cua binh dien phan/,
    examples: ['điện phân', 'điện phân dung dịch NaCl', 'mạ điện', 'điều chế nhôm'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'cell', label: 'Hệ điện phân', value: 'cuso4', options: Object.entries(CELLS).map(([k, v]) => [k, v.label] as [string, string])}],
      sliders: [
        {key: 'I', label: 'Cường độ dòng điện I', unit: 'A', min: 0.5, max: 10, step: 0.5, value: 2},
        {key: 'tm', label: 'Thời gian điện phân', unit: 'phút', min: 1, max: 120, step: 1, value: 30},
      ],
      time: {max: 8, loop: true, autoplay: true, label: 'Thời gian', unit: 's'},
      draw: (p, t, s) => {
        const cell = CELLS[s.cell];
        const m = productMass(cell, p.I, p.tm);
        const out: Shape[] = [box(150, 90, 260, 170, 'rgba(147,197,253,0.35)', C.ink), box(200, 40, 12, 170, '#57534E'), box(350, 40, 12, 170, '#57534E')];
        out.push(txt(206, 30, 'catot (−)', {size: 12, fill: C.blue, bold: true}), txt(356, 30, 'anot (+)', {size: 12, fill: C.red, bold: true}));
        out.push(ln(206, 40, 206, 14, {stroke: C.ink}), ln(356, 40, 356, 14, {stroke: C.ink}), box(250, 4, 60, 22, '#F5F5F4', C.ink), txt(280, 20, '—|+', {size: 12}));
        const dep = Math.min(40, Math.log10(m * 100 + 1) * 14);
        if (s.cell !== 'nacl') out.push(box(194, 210 - dep, 8, dep, s.cell === 'cuso4' ? '#B45309' : '#D4D4D8'));
        else for (let i = 0; i < 5; i++) out.push({t: 'circle', cx: 200 + ((i * 5) % 14) - 4, cy: 200 - (((t * 30 + i * 28) % 110) | 0), r: 3, stroke: '#fff', w: 1.4});
        for (let i = 0; i < 5; i++) out.push({t: 'circle', cx: 356 + ((i * 7) % 18) - 9, cy: 200 - (((t * 34 + i * 25) % 110) | 0), r: 3.2, stroke: '#fff', w: 1.4});
        for (let i = 0; i < 6; i++) {
          const f = (((t / 4 + i / 6) % 1) + 1) % 1;
          out.push(dot(360 - 140 * f, 120 + (i % 3) * 30, 4.5, C.red), dot(205 + 140 * f, 135 + (i % 3) * 30, 4.5, C.blue));
        }
        out.push(txt(206, 285, cell.cName, {size: 13, bold: true, fill: C.blue}), txt(356, 285, cell.aName, {size: 13, bold: true, fill: C.red}));
        return out;
      },
      readouts: [
        {label: 'Catot · anot', value: (_p, _t, s) => `${CELLS[s.cell].cathode} · ${CELLS[s.cell].anode}`},
        {label: 'Số mol electron n = It/F', value: (p) => `${f3(molElectrons(p.I, p.tm))} mol`},
        {label: 'Chất tạo ra ở catot · khí ở anot', value: (p, _t, s) => `${f2(productMass(CELLS[s.cell], p.I, p.tm))} g ${CELLS[s.cell].cName} · ${f2(anodeLitres(CELLS[s.cell], p.I, p.tm))} L ${CELLS[s.cell].aName} (25 °C)`},
      ],
      note: 'm = A·I·t/(n·F): khối lượng tỉ lệ thuận với điện lượng Q = It. ' + 'NaCl có màng ngăn tạo NaOH, H₂, Cl₂; CuSO₄ dùng mạ và tinh luyện đồng; Al₂O₃ nóng chảy điều chế nhôm.',
    },
  },
};
