import type {P, PresetSpec, TableCell} from './types';

const f1 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 1});
const f2 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 2});

// ------------------------------------------------------------------ công thức (xuất để kiểm thử)
/** Khoảng vân i = λD/a (mm), λ nm, a mm, D m. */
export const fringeSpacing = (lamNm: number, aMm: number, DM: number) => (lamNm * 1e-9 * DM) / (aMm * 1e-3) * 1e3;
/** Cường độ tương đối ở vị trí y (mm) trên màn giao thoa Young. */
export const youngIntensity = (yMm: number, lamNm: number, aMm: number, DM: number) => Math.cos((Math.PI * yMm) / fringeSpacing(lamNm, aMm, DM)) ** 2;
export const capEnergy = (CuF: number, U: number) => 0.5 * CuF * U * U;
export const capSeries = (c1: number, c2: number) => (c1 * c2) / (c1 + c2);

export interface HeatStages {
  q: number[];
  total: number;
}
const C_ICE = 2100;
const C_WATER = 4180;
const C_STEAM = 2010;
const L_FUS = 3.34e5;
const L_VAP = 2.26e6;
/** Nhiệt lượng (kJ) cho từng giai đoạn: làm nóng băng −20→0, nóng chảy, làm nóng nước 0→100, hóa hơi, làm nóng hơi 100→120. */
export function heatStages(m: number): HeatStages {
  const q = [m * C_ICE * 20, m * L_FUS, m * C_WATER * 100, m * L_VAP, m * C_STEAM * 20].map((j) => j / 1000);
  return {q, total: q.reduce((a, b) => a + b, 0)};
}
/** Nhiệt độ (°C) sau khi truyền Q (kJ) cho m kg nước đá ở −20 °C. */
export function heatCurve(Q: number, m: number): number {
  const {q} = heatStages(m);
  let r = Q;
  const rates = [C_ICE, 0, C_WATER, 0, C_STEAM].map((c) => (c * m) / 1000);
  const starts = [-20, 0, 0, 100, 100];
  for (let i = 0; i < 5; i++) {
    if (r <= q[i] || i === 4) return rates[i] === 0 ? starts[i] : starts[i] + r / rates[i];
    r -= q[i];
  }
  return 120;
}
export const toF = (c: number) => c * 1.8 + 32;
export const toK = (c: number) => c + 273.15;
export const transmissionLoss = (PMw: number, R: number, UkV: number) => (PMw * R) / (UkV * UkV);

/** Năng lượng liên kết riêng (MeV/nucleon) theo công thức bán thực nghiệm Weizsäcker. */
export function bindingPerNucleon(A: number): number {
  if (A < 2) return 0;
  const Z = A / (1.98 + 0.0155 * Math.pow(A, 2 / 3));
  const av = 15.75;
  const as = 17.8;
  const ac = 0.711;
  const aa = 23.7;
  const B = av * A - as * Math.pow(A, 2 / 3) - (ac * Z * (Z - 1)) / Math.cbrt(A) - (aa * (A - 2 * Z) ** 2) / A;
  return Math.max(0, B / A);
}
export function bindingPeak(): {A: number; value: number} {
  let best = {A: 2, value: 0};
  for (let A = 20; A <= 240; A++) {
    const v = bindingPerNucleon(A);
    if (v > best.value) best = {A, value: v};
  }
  return best;
}

const BANDS: [string, string, string, string, string, string, number, string][] = [
  ['radio', 'Sóng vô tuyến', '> 0,1 m', '< 3 GHz', '< 10⁻⁵ eV', 'phát thanh, truyền hình, thông tin di động', 1, 'radio'],
  ['micro', 'Vi sóng', '1 mm – 0,1 m', '3 GHz – 300 GHz', '10⁻⁵ – 10⁻³ eV', 'lò vi sóng, radar, Wi‑Fi', -1.5, 'micro'],
  ['ir', 'Hồng ngoại', '700 nm – 1 mm', '300 GHz – 430 THz', '10⁻³ – 1,8 eV', 'điều khiển từ xa, camera nhiệt, sưởi', -4.5, 'ir'],
  ['vis', 'Ánh sáng nhìn thấy', '380 – 700 nm', '430 – 790 THz', '1,8 – 3,3 eV', 'thị giác, quang hợp, cáp quang', -6.3, 'vis'],
  ['uv', 'Tử ngoại', '10 – 380 nm', '790 THz – 30 PHz', '3,3 – 120 eV', 'diệt khuẩn, nhận biết tiền giả, tia gây rám nắng', -7.5, 'uv'],
  ['x', 'Tia X', '0,01 – 10 nm', '30 PHz – 30 EHz', '0,12 – 120 keV', 'chụp X-quang, kiểm tra an ninh', -9.5, 'x'],
  ['gamma', 'Tia gamma', '< 0,01 nm', '> 30 EHz', '> 120 keV', 'xạ trị, khử trùng, nghiên cứu hạt nhân', -12, 'gamma'],
];
const COLORS: [string, string, string, string][] = [
  ['red', 'Đỏ', '620 – 700 nm', '#DC2626'],
  ['orange', 'Cam', '590 – 620 nm', '#EA580C'],
  ['yellow', 'Vàng', '570 – 590 nm', '#EAB308'],
  ['green', 'Lục', '495 – 570 nm', '#16A34A'],
  ['cyan', 'Lam', '450 – 495 nm', '#0891B2'],
  ['blue', 'Chàm', '425 – 450 nm', '#2563EB'],
  ['violet', 'Tím', '380 – 425 nm', '#7C3AED'],
];
const BAND_COLORS = ['#FED7AA', '#FDE68A', '#FCA5A5', '#BBF7D0', '#C4B5FD', '#93C5FD', '#D6D3D1'];

export const LY_CURVE_PRESETS: Record<string, PresetSpec> = {
  PHYS_YOUNG_INTERFERENCE: {
    family: 'CURVE_LAB',
    engine: 'PHYSICS',
    title: 'Giao thoa ánh sáng Young',
    question: 'Khoảng vân phụ thuộc bước sóng, khoảng cách hai khe và khoảng cách đến màn như thế nào? Vì sao ánh sáng đỏ cho vân thưa hơn ánh sáng tím?',
    keywords: /giao thoa (?:anh sang )?young|khe young|thi nghiem young|khoang van|van sang van toi|giao thoa anh sang/,
    examples: ['giao thoa Young', 'khoảng vân', 'vân sáng vân tối', 'thí nghiệm Young'],
    data: {
      xLabel: 'vị trí trên màn y (mm)',
      yLabel: 'cường độ sáng tương đối',
      xRange: [-6, 6],
      yRange: [0, 1.05],
      params: [
        {key: 'lam', label: 'Bước sóng λ', unit: 'nm', min: 400, max: 700, step: 10, value: 600},
        {key: 'a', label: 'Khoảng cách hai khe a', unit: 'mm', min: 0.2, max: 2, step: 0.1, value: 1},
        {key: 'D', label: 'Khoảng cách tới màn D', unit: 'm', min: 0.5, max: 3, step: 0.1, value: 2},
      ],
      curves: [{id: 'I', label: 'Cường độ I(y)', color: '#EA580C', fn: (y, p) => youngIntensity(y, p.lam, p.a, p.D)}],
      readouts: [
        {label: 'Khoảng vân i = λD/a', value: (p: P) => `${f2(fringeSpacing(p.lam, p.a, p.D))} mm`},
        {label: 'Vân sáng bậc 3 cách vân trung tâm', value: (p: P) => `${f2(3 * fringeSpacing(p.lam, p.a, p.D))} mm`},
        {label: 'Số vân sáng trên đoạn −6…6 mm', value: (p: P) => String(2 * Math.floor(6 / fringeSpacing(p.lam, p.a, p.D)) + 1)},
      ],
      note: 'Vân sáng khi hiệu đường đi bằng số nguyên lần λ; vân tối khi bằng số bán nguyên lần λ. Khoảng vân tỉ lệ với λ và D, tỉ lệ nghịch với a.',
    },
  },

  PHYS_CAPACITOR: {
    family: 'CURVE_LAB',
    engine: 'PHYSICS',
    title: 'Tụ điện: điện tích, năng lượng và ghép tụ',
    question: 'Điện tích tụ tích được tăng theo hiệu điện thế thế nào, và năng lượng dự trữ phụ thuộc ra sao? Ghép nối tiếp hay song song làm điện dung tương đương thay đổi thế nào?',
    keywords: /tu dien(?! deu| abcd)|dien dung cua tu|nang luong cua tu dien|ghep tu dien|tich dien cho tu/,
    examples: ['tụ điện', 'điện dung của tụ', 'năng lượng của tụ điện', 'ghép tụ điện'],
    data: {
      xLabel: 'hiệu điện thế U (V)',
      yLabel: 'Q (µC) · W (µJ)',
      xRange: [0, 20],
      yRange: (p: P) => [0, Math.max(p.C * 20, capEnergy(p.C, 20)) * 1.05],
      params: [
        {key: 'C', label: 'Điện dung C₁', unit: 'µF', min: 1, max: 100, step: 1, value: 10},
        {key: 'C2', label: 'Điện dung C₂ (để ghép)', unit: 'µF', min: 1, max: 100, step: 1, value: 20},
      ],
      curves: [
        {id: 'Q', label: 'Q = CU (µC)', color: '#2563EB', fn: (u, p) => p.C * u},
        {id: 'W', label: 'W = ½CU² (µJ)', color: '#E11D48', fn: (u, p) => capEnergy(p.C, u)},
      ],
      readouts: [
        {label: 'Ghép song song C₁ + C₂', value: (p: P) => `${f1(p.C + p.C2)} µF`},
        {label: 'Ghép nối tiếp C₁C₂/(C₁ + C₂)', value: (p: P) => `${f2(capSeries(p.C, p.C2))} µF`},
        {label: 'Ở U = 12 V: Q · W', value: (p: P) => `${f1(p.C * 12)} µC · ${f1(capEnergy(p.C, 12))} µJ`},
      ],
      note: 'Q tỉ lệ thuận U (độ dốc là C); năng lượng W tỉ lệ với U² nên tăng U gấp đôi thì năng lượng tăng gấp bốn.',
    },
  },

  PHYS_HEAT_CALORIMETRY: {
    family: 'CURVE_LAB',
    engine: 'PHYSICS',
    title: 'Đồ thị đun nóng nước đá: nhiệt dung riêng và nhiệt nóng chảy, hóa hơi',
    question: 'Vì sao nhiệt độ không đổi trong lúc nước đá đang tan và nước đang sôi dù vẫn cung cấp nhiệt? Nhiệt lượng nào lớn nhất trong toàn bộ quá trình?',
    keywords: /nhiet dung rieng|nhiet nong chay|nhiet hoa hoi|nhiet luong|can bang nhiet|dinh luat i cua nhiet dong luc hoc|do thi chuyen the|nuoc da/,
    examples: ['nhiệt dung riêng', 'nhiệt nóng chảy riêng', 'nhiệt lượng cân bằng nhiệt', 'đồ thị chuyển thể của nước đá'],
    data: {
      xLabel: 'nhiệt lượng cung cấp Q (kJ)',
      yLabel: 'nhiệt độ (°C)',
      xRange: (p: P) => [0, heatStages(p.m).total],
      yRange: [-30, 130],
      params: [{key: 'm', label: 'Khối lượng nước đá', unit: 'kg', min: 0.1, max: 2, step: 0.1, value: 0.5}],
      curves: [{id: 'T', label: 'T(Q)', color: '#2563EB', fn: (q, p) => heatCurve(q, p.m)}],
      readouts: [
        {label: 'Làm nóng đá (−20→0 °C) · nóng chảy', value: (p: P) => `${f1(heatStages(p.m).q[0])} kJ · ${f1(heatStages(p.m).q[1])} kJ`},
        {label: 'Làm nóng nước (0→100 °C) · hóa hơi', value: (p: P) => `${f1(heatStages(p.m).q[2])} kJ · ${f1(heatStages(p.m).q[3])} kJ`},
        {label: 'Tổng đến hơi 120 °C', value: (p: P) => `${f1(heatStages(p.m).total)} kJ`},
      ],
      note: 'Q = mcΔT khi nhiệt độ đổi; Q = mλ khi nóng chảy, Q = mL khi hóa hơi (nhiệt độ giữ nguyên). L của nước (2,26 MJ/kg) gấp ≈ 7 lần λ của băng.',
    },
  },

  PHYS_THERMOMETER: {
    family: 'CURVE_LAB',
    engine: 'PHYSICS',
    title: 'Nhiệt độ và các thang đo: Celsius, Kelvin, Fahrenheit',
    question: 'Vì sao thang Kelvin bắt đầu từ độ không tuyệt đối? Đổi 36,6 °C sang kelvin và Fahrenheit thế nào?',
    keywords: /thang nhiet do|nhiet do tuyet doi|do khong tuyet doi|nhiet ke|thang kelvin|thang celsius|thang fahrenheit|nhiet do cua vat/,
    examples: ['thang nhiệt độ', 'nhiệt độ tuyệt đối', 'nhiệt kế', 'thang Celsius Kelvin Fahrenheit'],
    data: {
      xLabel: 'nhiệt độ Celsius (°C)',
      yLabel: 'giá trị trên thang khác',
      xRange: [-50, 150],
      yRange: [-50, 450],
      params: [{key: 'T', label: 'Nhiệt độ cần đổi', unit: '°C', min: -50, max: 150, step: 0.5, value: 36.5}],
      curves: [
        {id: 'K', label: 'Kelvin (K)', color: '#2563EB', fn: (c) => toK(c)},
        {id: 'F', label: 'Fahrenheit (°F)', color: '#E11D48', fn: (c) => toF(c)},
      ],
      readouts: [
        {label: 'Nhiệt độ đã chọn theo Kelvin', value: (p: P) => `${f2(toK(p.T))} K`},
        {label: 'Nhiệt độ đã chọn theo Fahrenheit', value: (p: P) => `${f2(toF(p.T))} °F`},
        {label: 'Điểm mốc của nước', value: () => 'đóng băng 0 °C = 273,15 K = 32 °F; sôi 100 °C = 373,15 K = 212 °F'},
      ],
      note: 'T(K) = t(°C) + 273,15. Một độ chia Celsius bằng một kelvin; không tồn tại nhiệt độ thấp hơn 0 K (−273,15 °C).',
    },
  },

  PHYS_TRANSFORMER_GRID: {
    family: 'CURVE_LAB',
    engine: 'PHYSICS',
    title: 'Máy biến áp và hao phí khi truyền tải điện',
    question: 'Vì sao truyền tải điện đi xa phải dùng điện áp rất cao? Máy biến áp thay đổi điện áp và cường độ dòng điện theo tỉ lệ nào?',
    keywords: /may bien ap|hao phi (?:dien )?khi truyen tai|truyen tai dien (?:nang )?di xa|cong suat hao phi|bien ap/,
    examples: ['máy biến áp', 'hao phí khi truyền tải điện', 'truyền tải điện năng đi xa'],
    data: {
      xLabel: 'điện áp truyền tải U (kV)',
      yLabel: 'hao phí (% công suất)',
      xRange: [10, 500],
      yRange: [0, 100],
      params: [
        {key: 'P', label: 'Công suất truyền tải', unit: 'MW', min: 10, max: 500, step: 10, value: 100},
        {key: 'R', label: 'Điện trở đường dây', unit: 'Ω', min: 1, max: 50, step: 1, value: 10},
        {key: 'n', label: 'Tỉ số vòng N₂/N₁ của máy biến áp', min: 0.1, max: 50, step: 0.1, value: 10},
        {key: 'u1', label: 'Điện áp cuộn sơ cấp', unit: 'kV', min: 1, max: 30, step: 1, value: 11},
      ],
      curves: [{id: 'loss', label: 'Hao phí ΔP/P = PR/U²', color: '#E11D48', fn: (u, p) => Math.min(100, 100 * transmissionLoss(p.P, p.R, u))}],
      readouts: [
        {label: 'Hao phí tại U = 110 kV · 220 kV · 500 kV', value: (p: P) => [110, 220, 500].map((u) => `${f1(100 * transmissionLoss(p.P, p.R, u))} %`).join(' · ')},
        {label: 'Máy biến áp: U₂ = U₁·N₂/N₁', value: (p: P) => `${f1(p.u1 * p.n)} kV`},
        {label: 'Cường độ dòng: I₂/I₁ = N₁/N₂', value: (p: P) => `I₂ = I₁ / ${f1(p.n)}`},
      ],
      note: 'ΔP = P²R/U²: tăng U lên k lần thì hao phí giảm k² lần. Máy biến áp tăng áp thì giảm dòng (công suất gần như không đổi).',
    },
  },

  PHYS_NUCLEAR_BINDING: {
    family: 'CURVE_LAB',
    engine: 'PHYSICS',
    title: 'Năng lượng liên kết riêng của hạt nhân',
    question: 'Vì sao hạt nhân ở gần số khối 56 (sắt) bền nhất? Vì sao phân hạch hạt nhân nặng và nhiệt hạch hạt nhân nhẹ đều giải phóng năng lượng?',
    keywords: /nang luong lien ket rieng|nang luong lien ket cua hat nhan|do hut khoi|phan ung nhiet hach|nhiet hach|do ben vung cua hat nhan/,
    examples: ['năng lượng liên kết riêng', 'độ hụt khối', 'phản ứng nhiệt hạch', 'độ bền vững của hạt nhân'],
    data: {
      xLabel: 'số khối A',
      yLabel: 'năng lượng liên kết riêng (MeV/nucleon)',
      xRange: [1, 240],
      yRange: [0, 10],
      params: [],
      curves: [
        {id: 'be', label: 'ε(A) theo công thức bán thực nghiệm', color: '#2563EB', fn: (a) => bindingPerNucleon(a)},
        {id: 'fe', label: 'Đỉnh gần Fe-56 (≈ 8,8 MeV)', color: '#A8A29E', dashed: true, fn: () => 8.8},
      ],
      readouts: [
        {label: 'Hạt nhân bền nhất theo mô hình', value: () => `A ≈ ${bindingPeak().A}, ε ≈ ${f2(bindingPeak().value)} MeV/nucleon`},
        {label: 'ε tại A = 4 · 56 · 238', value: () => `${f2(bindingPerNucleon(4))} · ${f2(bindingPerNucleon(56))} · ${f2(bindingPerNucleon(238))} MeV`},
        {label: 'Năng lượng giải phóng khi phân hạch U-235 (≈)', value: () => '≈ 200 MeV mỗi hạt nhân'},
      ],
      note: 'Đường cong là công thức khối lượng bán thực nghiệm (không có hiệu ứng lớp nên He-4 không nhô lên). Nhẹ → nặng (nhiệt hạch) và rất nặng → trung bình (phân hạch) đều tăng ε nên tỏa năng lượng.',
    },
  },

  PHYS_EM_SPECTRUM: {
    family: 'TABLE_LAB',
    engine: 'PHYSICS',
    title: 'Thang sóng điện từ',
    question: 'Các loại sóng điện từ khác nhau về bước sóng, tần số và năng lượng photon thế nào? Vì sao tia X và gamma nguy hiểm hơn sóng vô tuyến?',
    keywords: /thang song dien tu|pho song dien tu|song dien tu|tia hong ngoai|tia tu ngoai|tia x\b|tia gamma|anh sang nhin thay/,
    examples: ['thang sóng điện từ', 'phổ sóng điện từ', 'tia hồng ngoại và tử ngoại'],
    data: {
      cols: 7,
      rows: 2,
      groups: [...BANDS.map(([id, label], i) => ({id, label, color: BAND_COLORS[i]})), ...COLORS.map(([id, label, , color]) => ({id: `c-${id}`, label: `Ánh sáng ${label.toLowerCase()}`, color}))],
      propDefs: [
        {key: 'lam', label: 'Bước sóng'},
        {key: 'f', label: 'Tần số'},
        {key: 'E', label: 'Năng lượng photon'},
        {key: 'use', label: 'Ứng dụng'},
        {key: 'loglam', label: 'Bước sóng (thang log)', numeric: true},
      ],
      cells: [
        ...BANDS.map(([id, label, lam, f, E, use, loglam], i): TableCell => ({id, label, sub: lam, row: 0, col: i, group: id, title: label, props: {lam, f, E, use, loglam}})),
        ...COLORS.map(([id, label, lam, color], i): TableCell => ({id: `c-${id}`, label, sub: lam, row: 1, col: i, group: `c-${id}`, title: `Ánh sáng ${label.toLowerCase()}`, body: `Nằm trong vùng nhìn thấy; ${id === 'red' ? 'bước sóng dài nhất, năng lượng photon nhỏ nhất' : id === 'violet' ? 'bước sóng ngắn nhất, năng lượng photon lớn nhất' : 'giữa đỏ và tím'}.`, props: {lam, loglam: -6.4 - i * 0.04}, ...(color ? {} : {})})),
      ],
      note: 'Tất cả sóng điện từ truyền trong chân không với c = 3×10⁸ m/s; c = λf. Bước sóng càng ngắn thì tần số và năng lượng photon E = hf càng lớn.',
    },
  },
};
