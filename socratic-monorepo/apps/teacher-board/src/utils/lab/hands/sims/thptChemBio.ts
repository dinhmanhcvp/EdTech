import type {SimSpec, Values} from './types';

/** Các bài Hóa – Sinh THPT của danh mục `NGHIEN_CUU_THI_NGHIEM_STEAM_THPT_CHUAN_GDPT2018.md` (bài 11–16). Logic thuần, mô hình định tính đúng chiều. */

// ------------------------------------------------------------------ bài 11: clo khô và clo ẩm
/** phần màu đã mất của mảnh vải; shortcut: tốc độ tỉ lệ độ ẩm × nồng độ clo, chỉnh để clo ẩm đậm đặc tẩy trắng trong ~2 s (không phải số đo) */
export const bleach = (humid: number, cl: number, t: number): number => 1 - Math.exp(-1.5 * (humid / 100) * (cl / 100) * t);
export const CHLORINE: SimSpec = {
  id: 'chlorine',
  name: 'Clo khô và clo ẩm',
  task: 'Mảnh vải màu đặt trong bình khí clo đã làm khô bằng H₂SO₄ đặc. Làm cho vải mất màu hoàn toàn (trên 95 %). Thứ gì thực sự tẩy màu: Cl₂ hay một chất khác?',
  params: [
    {id: 'humid', label: 'Độ ẩm của khí', unit: '%', min: 0, max: 100, init: 0, digits: 0},
    {id: 'cl', label: 'Nồng độ khí clo', unit: '%', min: 10, max: 100, init: 50, digits: 0},
    {id: 't', label: 'Thời gian tiếp xúc', unit: 's', min: 0, max: 30, init: 10, digits: 0},
  ],
  solution: {humid: 100, cl: 100, t: 10},
  evaluate: (v: Values) => {
    const b = bleach(v.humid, v.cl, v.t);
    const ok = b >= 0.95;
    return {
      ok,
      head: ok ? 'Đạt: vải bị tẩy trắng' : v.humid < 1 ? 'Clo khô: vải không mất màu dù để bao lâu' : `Vải mất ${(b * 100).toFixed(0)} % màu`,
      lines: ['Cl₂ + H₂O ⇌ HCl + HClO; chính HClO (oxi hoá mạnh) tẩy màu, nên clo khô không tẩy được', 'Khí clo rất độc: ngoài đời phải làm trong tủ hút. Tốc độ tẩy ở đây là mô hình định tính'],
    };
  },
};

// ------------------------------------------------------------------ bài 12: kim loại kiềm với nước
export const ALKALI = [
  {sym: 'Li', M: 6.94, rho: 0.534, r: 0.25, flame: '#E0314B'},
  {sym: 'Na', M: 22.99, rho: 0.971, r: 1, flame: '#FFC53D'},
  {sym: 'K', M: 39.1, rho: 0.862, r: 3, flame: '#B58CFF'},
  {sym: 'Rb', M: 85.47, rho: 1.532, r: 8, flame: '#D05CE0'},
  {sym: 'Cs', M: 132.91, rho: 1.93, r: 20, flame: '#6F8BFF'},
] as const;
const LEVELS = ['sủi bọt êm trên mặt nước', 'nóng chảy, vo tròn chạy trên mặt nước', 'khí H₂ bốc cháy', 'NỔ, bắn kiềm nóng ra ngoài'];
/** mẩu kim loại hình cầu đường kính d (mm) thả vào 0,5 L nước; mức 0–3 theo "độ dữ dội" = hoạt động × cỡ mẩu (định tính) */
export function alkali(metal: number, d: number) {
  const m = ALKALI[Math.min(4, Math.max(0, Math.round(metal) - 1))];
  const mol = (m.rho * Math.PI * (d / 10) ** 3) / 6 / m.M;
  const power = m.r * d;
  return {m, mol, pH: 14 + Math.log10(mol / 0.5), level: power < 2 ? 0 : power < 6 ? 1 : power < 15 ? 2 : 3};
}
export const ALKALI_WATER: SimSpec = {
  id: 'alkali',
  name: 'Kim loại kiềm với nước',
  task: 'Thả mẩu kim loại kiềm vào cốc nước có phenolphtalein. Chọn kim loại và cỡ mẩu để dung dịch hồng rõ (pH ≥ 11) mà khí H₂ KHÔNG bốc cháy hay nổ. Đi dần từ Li tới Cs: quy luật là gì?',
  params: [
    {id: 'metal', label: 'Kim loại (1 Li · 2 Na · 3 K · 4 Rb · 5 Cs)', unit: '', min: 1, max: 5, init: 2, digits: 0},
    {id: 'd', label: 'Cỡ mẩu kim loại', unit: 'mm', min: 1, max: 20, init: 10, digits: 1},
  ],
  solution: {metal: 2, d: 4},
  evaluate: (v: Values) => {
    const a = alkali(v.metal, v.d);
    const ok = a.pH >= 11 && a.level < 2;
    return {
      ok,
      head: `${ok ? 'Đạt: ' : ''}${a.m.sym} ${v.d.toFixed(1)} mm: ${LEVELS[a.level]}`,
      lines: [`2${a.m.sym} + 2H₂O → 2${a.m.sym}OH + H₂↑; ${(a.mol * 1000).toFixed(2)} mmol kim loại → pH ≈ ${a.pH.toFixed(1)}`, 'Từ Li tới Cs phản ứng mạnh dần (electron ngoài cùng càng xa hạt nhân càng dễ nhường). Ngưỡng cháy/nổ là mô hình định tính'],
    };
  },
};

// ------------------------------------------------------------------ bài 13: cân bằng 2NO₂ ⇌ N₂O₄
/** N₂O₄ ⇌ 2NO₂, ΔH = +57,2 kJ, K_p(25 °C) = 0,148 atm; trả K_p, độ phân li α và phần mol NO₂ (khí nâu) */
export function no2(Tc: number, P: number) {
  const Kp = 0.148 * Math.exp((-57200 / 8.314) * (1 / (Tc + 273.15) - 1 / 298.15));
  const alpha = Math.sqrt(Kp / (Kp + 4 * P));
  return {Kp, alpha, x: (2 * alpha) / (1 + alpha)};
}
export const NO2: SimSpec = {
  id: 'no2',
  name: 'Cân bằng NO₂ ⇌ N₂O₄',
  task: 'Ống kín chứa hỗn hợp NO₂ (nâu đỏ) và N₂O₄ (không màu). Dùng nhiệt độ và áp suất để ống gần như mất màu: phần mol NO₂ dưới 10 %. Giải thích bằng nguyên lí Le Chatelier.',
  params: [
    {id: 'T', label: 'Nhiệt độ bể', unit: '°C', min: 0, max: 100, init: 25, digits: 0},
    {id: 'P', label: 'Áp suất', unit: 'atm', min: 0.5, max: 5, init: 1, digits: 1},
  ],
  solution: {T: 0, P: 3},
  evaluate: (v: Values) => {
    const q = no2(v.T, v.P);
    const ok = q.x < 0.1;
    return {
      ok,
      head: ok ? `Đạt: chỉ còn ${(q.x * 100).toFixed(1)} % NO₂, ống gần như không màu` : `NO₂ chiếm ${(q.x * 100).toFixed(0)} % số phân tử: ống màu nâu`,
      lines: [`K_p = ${q.Kp.toPrecision(2)} atm, N₂O₄ phân li ${(q.alpha * 100).toFixed(0)} %`, '2NO₂ ⇌ N₂O₄ toả nhiệt và giảm số mol khí: làm lạnh hoặc nén đều đẩy cân bằng về phía N₂O₄ không màu'],
    };
  },
};

// ------------------------------------------------------------------ bài 14: chuẩn độ HCl bằng NaOH
const ACID_MMOL = 2; // 20 mL HCl 0,1 M
export function titrationPH(V: number, cb: number): number {
  const diff = ACID_MMOL - V * cb;
  if (Math.abs(diff) < 1e-9) return 7;
  return diff > 0 ? -Math.log10(diff / (20 + V)) : 14 + Math.log10(-diff / (20 + V));
}
export const TITRATION: SimSpec = {
  id: 'titration',
  name: 'Chuẩn độ acid – base',
  task: 'Nhỏ NaOH từ buret vào 20 mL HCl 0,1 M. Dừng đúng điểm tương đương, lệch không quá 0,1 mL. Quan sát đường cong pH: vì sao chỉ một giọt cũng làm pH nhảy từ 4 lên 10?',
  params: [
    {id: 'V', label: 'Thể tích NaOH đã nhỏ', unit: 'mL', min: 0, max: 40, init: 0, digits: 2},
    {id: 'cb', label: 'Nồng độ NaOH', unit: 'M', min: 0.05, max: 0.2, init: 0.1, digits: 3},
  ],
  solution: {V: 20, cb: 0.1},
  evaluate: (v: Values) => {
    const pH = titrationPH(v.V, v.cb);
    const Veq = ACID_MMOL / v.cb;
    const ok = Math.abs(v.V - Veq) <= 0.1;
    return {
      ok,
      head: ok ? `Đạt: dừng ở ${v.V.toFixed(2)} mL, pH = ${pH.toFixed(1)}` : `pH = ${pH.toFixed(2)} · ${v.V < Veq ? 'còn dư acid' : 'đã quá điểm tương đương'}`,
      lines: [`Điểm tương đương: V = n(HCl)/C(NaOH) = ${Veq.toFixed(2)} mL`, 'Phenolphtalein không màu dưới pH 8,2 và hồng trên đó. Gần điểm tương đương lượng H⁺ dư gần bằng 0 nên một giọt base đổi pH vài đơn vị'],
    };
  },
};

// ------------------------------------------------------------------ bài 15: điện di gel agarose
export const GEL_LEN = 8;
export const LADDER = [3000, 1500, 900, 600, 300, 100];
export const LANES: [string, number[]][] = [
  ['Thang chuẩn', LADDER],
  ['Hiện trường', [1500, 600]],
  ['Nghi phạm 1', [1500, 900]],
  ['Nghi phạm 2', [1500, 600]],
];
/** quãng đường (cm) của đoạn DNA dài `bp` cặp base; shortcut: tuyến tính theo −log(bp), tỉ lệ V·t và 1/nồng độ gel, không phải số đo */
export const migrate = (bp: number, volt: number, min: number, agar: number): number => (0.0012 * volt * min * Math.max(0, 4.2 - Math.log10(bp))) / agar;
export const GEL: SimSpec = {
  id: 'gel',
  name: 'Điện di DNA',
  task: 'Chạy điện di ba mẫu DNA cùng thang chuẩn. Chạy đủ lâu để hai vạch 600 và 900 cặp base tách nhau ít nhất 0,5 cm, nhưng vạch ngắn nhất (100 cặp base) chưa chạy ra khỏi gel 8 cm. Mẫu hiện trường trùng với nghi phạm nào?',
  params: [
    {id: 'volt', label: 'Hiệu điện thế', unit: 'V', min: 50, max: 150, init: 100, digits: 0},
    {id: 'min', label: 'Thời gian chạy', unit: 'phút', min: 0, max: 60, init: 0, digits: 0},
    {id: 'agar', label: 'Nồng độ agarose', unit: '%', min: 0.7, max: 2, init: 1, digits: 1},
  ],
  solution: {volt: 100, min: 27, agar: 1},
  evaluate: (v: Values) => {
    const at = (bp: number) => migrate(bp, v.volt, v.min, v.agar);
    const sep = at(600) - at(900);
    const lost = at(100) > GEL_LEN;
    const ok = sep >= 0.5 && !lost;
    return {
      ok,
      head: ok ? 'Đạt: các vạch tách rõ. Mẫu hiện trường trùng nghi phạm 2' : lost ? 'Chạy quá lâu: đoạn ngắn đã ra khỏi gel' : `Vạch 600 và 900 mới cách nhau ${sep.toFixed(2)} cm`,
      lines: ['DNA tích điện âm (nhóm phosphate) nên chạy về cực dương; đoạn càng ngắn luồn qua gel càng nhanh', 'Nghi phạm 1 có vạch 900 thay cho 600 cặp base: khác alen. Quãng đường ở đây là mô hình định tính'],
    };
  },
};

// ------------------------------------------------------------------ bài 16: lai phân tích ruồi giấm của Morgan
const frac = (x: number) => x - Math.floor(x);
const seeded = (a: number, b: number) => {
  const u = frac(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453);
  const w = frac(Math.sin(a * 39.346 + b * 11.135) * 24634.6345);
  return Math.sqrt(-2 * Math.log(u + 1e-6)) * Math.cos(2 * Math.PI * w);
};
/**
 * Lai phân tích ruồi cái F1 (xám dài × đen cụt): đếm n con, hai gen cách nhau d cM.
 * Số liệu ngẫu nhiên có hạt giống (cùng n, d cho cùng kết quả). Trả bốn lớp kiểu hình, tần số hoán vị ước lượng và sai số chuẩn.
 */
export function cross(n: number, d: number) {
  const N = Math.round(n);
  const f = d / 100;
  const clamp = (x: number, hi: number) => Math.min(hi, Math.max(0, Math.round(x)));
  const rec = clamp(N * f + seeded(N, d) * Math.sqrt(N * f * (1 - f)), N);
  const greyShort = clamp(rec / 2 + (seeded(d, N) * Math.sqrt(rec)) / 2, rec);
  const greyLong = clamp((N - rec) / 2 + (seeded(N + 1, d) * Math.sqrt(N - rec)) / 2, N - rec);
  const est = rec / N;
  return {N, counts: [greyLong, N - rec - greyLong, greyShort, rec - greyShort], est, se: Math.sqrt((est * (1 - est)) / N)};
}
export const MORGAN: SimSpec = {
  id: 'morgan',
  name: 'Ruồi giấm của Morgan',
  task: 'Lai phân tích ruồi cái F1 thân xám, cánh dài. Đếm đủ nhiều ruồi con để sai số chuẩn của tần số hoán vị gen không quá 1 %. Với 20 con thì kết luận được gì? Vì sao Morgan phải đếm hàng nghìn con?',
  params: [
    {id: 'n', label: 'Số ruồi con đếm được', unit: 'con', min: 20, max: 5000, init: 20, log: true, digits: 0},
    {id: 'd', label: 'Khoảng cách hai gen', unit: 'cM', min: 1, max: 50, init: 17, digits: 0},
  ],
  solution: {n: 2300, d: 17},
  evaluate: (v: Values) => {
    const c = cross(v.n, v.d);
    const ok = c.se <= 0.01;
    return {
      ok,
      head: `${ok ? 'Đạt: ' : ''}f = ${(c.est * 100).toFixed(1)} % ± ${(c.se * 100).toFixed(1)} % (${c.N} con)`,
      lines: [`Xám dài ${c.counts[0]} · đen cụt ${c.counts[1]} · xám cụt ${c.counts[2]} · đen dài ${c.counts[3]}`, 'f = số cá thể tái tổ hợp / tổng số; 1 % hoán vị = 1 cM. Số liệu sinh ngẫu nhiên theo phân phối nhị thức, không phải số đếm thật'],
    };
  },
};

export const THPT_CHEM_BIO: SimSpec[] = [CHLORINE, ALKALI_WATER, NO2, TITRATION, GEL, MORGAN];
