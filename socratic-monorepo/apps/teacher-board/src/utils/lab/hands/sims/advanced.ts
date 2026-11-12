import type {SimSpec, Values} from './types';

/**
 * Các bài còn lại của danh mục đỉnh cao `NGHIEN_CUU_THI_NGHIEM_STEAM_DINH_CAO_VA_CO_KHI_ROBOTICS.md` (thí nghiệm 1–9 và 12).
 * Logic thuần. Đều là MÔ HÌNH RÚT GỌN ở trạng thái xác lập để học sinh thấy đúng chiều và đúng cỡ số, không thay cho CFD/FEA/MPC thật.
 */

// ------------------------------------------------------------------ TN1: động cơ phản lực micro, chu trình Brayton
const T1 = 288;
export const TIT_MAX = 1373; // 1100 °C
/** bướm ga (%) và tỉ lệ nhiên liệu/không khí (g/kg) → tỉ số nén, nhiệt độ sau nén T3, trước tuabin T4 (K), lực đẩy (N) */
export function brayton(throttle: number, far: number) {
  const pr = 1.5 + 2.5 * (throttle / 100);
  const mdot = 0.1 + 0.35 * (throttle / 100);
  const T3 = T1 * (1 + (pr ** 0.2857 - 1) / 0.75);
  const flameout = far < 9;
  const T4 = flameout ? T3 : T3 + ((far / 1000) * 43e6 * 0.95) / 1150;
  const T5 = T4 - (T3 - T1) * (1005 / 1150); // tuabin chỉ lấy đủ công để kéo máy nén
  const p5 = pr * (T5 / T4) ** (4.03 / 0.85);
  const ve = p5 > 1 ? Math.sqrt(2 * 1150 * T5 * (1 - p5 ** -0.248)) : 0;
  return {pr, T3, T4, flameout, hot: T4 > TIT_MAX, thrust: flameout ? 0 : mdot * ve};
}
export const TURBINE: SimSpec = {
  id: 'turbine',
  name: 'Động cơ phản lực micro',
  task: 'Đẩy lực đẩy lên ít nhất 200 N mà nhiệt độ trước tuabin không vượt 1100 °C và buồng đốt không tắt lửa. Hỗn hợp quá nghèo hoặc quá giàu thì chuyện gì xảy ra?',
  params: [
    {id: 'throttle', label: 'Bướm ga', unit: '%', min: 10, max: 100, init: 30, digits: 0},
    {id: 'far', label: 'Nhiên liệu / không khí', unit: 'g/kg', min: 6, max: 35, init: 12, digits: 0},
  ],
  solution: {throttle: 100, far: 22},
  evaluate: (v: Values) => {
    const b = brayton(v.throttle, v.far);
    const ok = b.thrust >= 200 && !b.hot;
    return {
      ok,
      head: b.flameout ? 'Tắt lửa: hỗn hợp quá nghèo nhiên liệu' : b.hot ? `QUÁ NHIỆT: ${(b.T4 - 273).toFixed(0)} °C, cánh tuabin biến dạng` : `${ok ? 'Đạt: ' : ''}lực đẩy ${b.thrust.toFixed(0)} N`,
      lines: [`Tỉ số nén ${b.pr.toFixed(1)} · sau máy nén ${(b.T3 - 273).toFixed(0)} °C · trước tuabin ${(b.T4 - 273).toFixed(0)} °C`, 'Chu trình Brayton: nén → đốt đẳng áp → giãn nở qua tuabin và ống phun. Mô hình khí lí tưởng, hiệu suất nén 75 %'],
    };
  },
};

// ------------------------------------------------------------------ TN2: điều khiển FOC động cơ PMSM
export const PMSM = {p: 4, lam: 0.05, Ld: 0.3e-3, Lq: 0.5e-3, Rs: 0.02, Vmax: 350 / Math.sqrt(3), Imax: 100};
/** trạng thái xác lập trong hệ d–q: điện áp cần (V), mô-men (N·m), dòng tổng (A) */
export function foc(rpm: number, iq: number, id: number) {
  const we = ((rpm * 2 * Math.PI) / 60) * PMSM.p;
  const vd = PMSM.Rs * id - we * PMSM.Lq * iq;
  const vq = PMSM.Rs * iq + we * (PMSM.Ld * id + PMSM.lam);
  return {vd, vq, V: Math.hypot(vd, vq), I: Math.hypot(id, iq), torque: 1.5 * PMSM.p * (PMSM.lam * iq + (PMSM.Ld - PMSM.Lq) * id * iq)};
}
export const FOC: SimSpec = {
  id: 'foc',
  name: 'Điều khiển FOC động cơ xe điện',
  task: 'Đưa động cơ lên 12 000 vòng/phút với mô-men ít nhất 12 N·m, mà điện áp không vượt giới hạn của bộ nghịch lưu và dòng không quá 100 A. Gợi ý: dòng i_d âm làm yếu từ thông.',
  params: [
    {id: 'rpm', label: 'Tốc độ', unit: 'vòng/phút', min: 1000, max: 15000, init: 6000, digits: 0},
    {id: 'iq', label: 'Dòng i_q (sinh mô-men)', unit: 'A', min: 0, max: 100, init: 40, digits: 0},
    {id: 'id', label: 'Dòng i_d (từ thông)', unit: 'A', min: -100, max: 0, init: 0, digits: 0},
  ],
  solution: {rpm: 12000, iq: 40, id: -80},
  evaluate: (v: Values) => {
    const s = foc(v.rpm, v.iq, v.id);
    const overV = s.V > PMSM.Vmax;
    const overI = s.I > PMSM.Imax;
    const ok = v.rpm >= 12000 && s.torque >= 12 && !overV && !overI;
    return {
      ok,
      head: overV ? `Thiếu điện áp: cần ${s.V.toFixed(0)} V, nghịch lưu chỉ có ${PMSM.Vmax.toFixed(0)} V` : overI ? `Quá dòng: ${s.I.toFixed(0)} A` : `${ok ? 'Đạt: ' : ''}${s.torque.toFixed(1)} N·m ở ${v.rpm.toFixed(0)} vòng/phút`,
      lines: [`v_d = ${s.vd.toFixed(0)} V, v_q = ${s.vq.toFixed(0)} V, dòng tổng ${s.I.toFixed(0)} A`, 'T = 1,5·p·[λ·i_q + (L_d − L_q)·i_d·i_q]. Sức phản điện động ω·λ tăng theo tốc độ; i_d < 0 trừ bớt nó nên chạy được trên tốc độ định mức'],
    };
  },
};

// ------------------------------------------------------------------ TN3: động cơ Stirling áp suất cao
export const GASES = [
  {name: 'không khí', k: 0.45},
  {name: 'N₂', k: 0.45},
  {name: 'He', k: 0.85},
  {name: 'H₂', k: 1},
] as const;
/** công suất trục (W) theo số West: P = W·p·V·f·(T_h − T_c)/(T_h + T_c), V = 100 cm³, f = 25 Hz, nguồn lạnh 27 °C */
export function stirling(pBar: number, ThC: number, gas: number) {
  const g = GASES[Math.min(3, Math.max(0, Math.round(gas) - 1))];
  const Th = ThC + 273;
  return {g, power: 0.25 * pBar * 1e5 * 1e-4 * 25 * ((Th - 300) / (Th + 300)) * g.k, carnot: 1 - 300 / Th};
}
/** áp suất tương đối theo góc quay (mô hình Schmidt đẳng nhiệt, hai pít-tông lệch pha 90°); trả [thể tích, áp suất] đã chuẩn hoá */
export function schmidt(ThC: number, angle: number): [number, number] {
  const vh = (1 + Math.cos(angle)) / 2;
  const vc = (1 + Math.cos(angle - Math.PI / 2)) / 2;
  return [(vh + vc) / 2, 1 / (vc / 300 + vh / (ThC + 273) + 0.3 / ((ThC + 273 + 300) / 2)) / 300];
}
export const STIRLING: SimSpec = {
  id: 'stirling',
  name: 'Động cơ Stirling áp suất cao',
  task: 'Động cơ Stirling 100 cm³ đang cho vài chục oát. Đưa công suất trục lên trên 1000 W bằng áp suất nạp, nhiệt độ nguồn nóng và loại khí công tác. Vì sao khí nhẹ lại tốt hơn?',
  params: [
    {id: 'p', label: 'Áp suất nạp', unit: 'bar', min: 1, max: 100, init: 1, log: true, digits: 0},
    {id: 'Th', label: 'Nhiệt độ nguồn nóng', unit: '°C', min: 300, max: 800, init: 400, digits: 0},
    {id: 'gas', label: 'Khí (1 không khí · 2 N₂ · 3 He · 4 H₂)', unit: '', min: 1, max: 4, init: 1, digits: 0},
  ],
  solution: {p: 100, Th: 800, gas: 4},
  evaluate: (v: Values) => {
    const s = stirling(v.p, v.Th, v.gas);
    const ok = s.power >= 1000;
    return {
      ok,
      head: `${ok ? 'Đạt: ' : ''}công suất trục ≈ ${s.power.toFixed(0)} W với ${s.g.name}`,
      lines: [`Hiệu suất Carnot tối đa 1 − T_c/T_h = ${(s.carnot * 100).toFixed(0)} %`, 'Công mỗi vòng tỉ lệ áp suất trung bình; H₂ và He dẫn nhiệt tốt, ít nhớt nên trao đổi nhiệt kịp ở tốc độ cao. Ước lượng theo số West, không phải số đo'],
    };
  },
};

// ------------------------------------------------------------------ TN4: bánh răng sóng Harmonic Drive
/** tỉ số truyền Z_mềm/2 (vành cứng nhiều hơn 2 răng), tốc độ ra (ngược chiều), ứng suất so với giới hạn mỏi, có trượt răng không */
export function harmonic(zf: number, rpm: number, load: number) {
  const Z = Math.round(zf / 2) * 2;
  const ratio = Z / 2;
  return {Z, ratio, out: rpm / ratio, stress: 0.35 + 0.5 * (load / 100), ratchet: load > 130};
}
export const HARMONIC: SimSpec = {
  id: 'harmonic',
  name: 'Bánh răng sóng Harmonic Drive',
  task: 'Khớp robot cần tỉ số truyền ít nhất 150:1 và quay đúng 20 vòng/phút (±1) ở đầu ra, tải không quá mô-men danh định. Chọn số răng bánh mềm và tốc độ động cơ. Vì sao chỉ chênh 2 răng lại giảm tốc được hàng trăm lần?',
  params: [
    {id: 'zf', label: 'Số răng bánh mềm', unit: 'răng', min: 100, max: 320, init: 200, digits: 0},
    {id: 'rpm', label: 'Tốc độ động cơ', unit: 'vòng/phút', min: 500, max: 6000, init: 3000, digits: 0},
    {id: 'load', label: 'Mô-men tải', unit: '% danh định', min: 0, max: 150, init: 50, digits: 0},
  ],
  solution: {zf: 320, rpm: 3200, load: 50},
  evaluate: (v: Values) => {
    const h = harmonic(v.zf, v.rpm, v.load);
    const ok = h.ratio >= 150 && Math.abs(h.out - 20) <= 1 && v.load <= 100;
    return {
      ok,
      head: h.ratchet ? 'TRƯỢT RĂNG: quá tải, bánh mềm nhảy qua răng vành cứng' : `${ok ? 'Đạt: ' : ''}tỉ số ${h.ratio}:1, đầu ra ${h.out.toFixed(1)} vòng/phút`,
      lines: [`i = Z_mềm/(Z_cứng − Z_mềm) = ${h.Z}/2; ứng suất uốn bánh mềm ≈ ${(h.stress * 100).toFixed(0)} % giới hạn mỏi`, 'Mỗi vòng của bộ tạo sóng, bánh mềm chỉ lùi 2 răng so với vành cứng. Mức ứng suất là mô hình định tính'],
    };
  },
};

// ------------------------------------------------------------------ TN5: lan truyền vết nứt mỏi (Paris–Erdogan)
export const ALLOYS = [
  {name: 'Nhôm 7075-T6', C: 5e-11, K: 29},
  {name: 'Thép 4340', C: 1.4e-11, K: 60},
  {name: 'Titan Ti-6Al-4V', C: 1e-11, K: 75},
] as const;
const Y_GEO = 1.12;
const PLATE = 0.05; // bề rộng tấm (m): vết nứt không thể dài hơn
/**
 * da/dN = C·ΔK³, ΔK = Y·Δσ·√(πa) (MPa√m), chu trình mạch động (K_max = ΔK). Số mũ 3 dùng chung cho cả ba hợp kim.
 * Trả chiều dài tới hạn a_c (m), số chu kì tới lúc gãy, và ΔK ban đầu.
 */
export function fatigue(ds: number, a0mm: number, alloy: number) {
  const m = ALLOYS[Math.min(2, Math.max(0, Math.round(alloy) - 1))];
  const a0 = a0mm / 1000;
  const ac = Math.min(PLATE, (m.K / (Y_GEO * ds)) ** 2 / Math.PI);
  const cycles = ac <= a0 ? 0 : (2 * (a0 ** -0.5 - ac ** -0.5)) / (m.C * (Y_GEO * ds) ** 3 * Math.PI ** 1.5);
  return {m, ac, cycles, dK: Y_GEO * ds * Math.sqrt(Math.PI * a0)};
}
/** chiều dài vết nứt (m) sau N chu kì (nghiệm kín của định luật Paris với số mũ 3) */
export const crackAt = (ds: number, a0mm: number, alloy: number, N: number): number => {
  const f = fatigue(ds, a0mm, alloy);
  const s = (a0mm / 1000) ** -0.5 - (N * f.m.C * (Y_GEO * ds) ** 3 * Math.PI ** 1.5) / 2;
  return s <= f.ac ** -0.5 ? f.ac : s ** -2;
};
export const FATIGUE: SimSpec = {
  id: 'fatigue',
  name: 'Vết nứt mỏi kết cấu',
  task: 'Tấm kim loại có vết nứt ở mép chịu tải lặp lại. Chi tiết phải chịu được ít nhất 1 triệu chu kì trước khi gãy: chọn vật liệu, giảm biên độ ứng suất, hoặc phát hiện vết nứt từ lúc còn nhỏ.',
  params: [
    {id: 'ds', label: 'Biên độ ứng suất Δσ', unit: 'MPa', min: 50, max: 300, init: 200, digits: 0},
    {id: 'a0', label: 'Vết nứt ban đầu', unit: 'mm', min: 0.5, max: 5, init: 2, log: true, digits: 1},
    {id: 'alloy', label: 'Vật liệu (1 nhôm · 2 thép · 3 titan)', unit: '', min: 1, max: 3, init: 1, digits: 0},
  ],
  solution: {ds: 80, a0: 0.5, alloy: 3},
  evaluate: (v: Values) => {
    const f = fatigue(v.ds, v.a0, v.alloy);
    const ok = f.cycles >= 1e6;
    return {
      ok,
      head: `${ok ? 'Đạt: ' : ''}${f.m.name} gãy sau ${Math.round(f.cycles).toLocaleString('vi-VN')} chu kì`,
      lines: [`ΔK ban đầu ${f.dK.toFixed(1)} MPa√m; gãy giòn khi vết nứt dài ${(f.ac * 1000).toFixed(1)} mm (K đạt K_IC = ${f.m.K})`, 'da/dN = C·ΔK³: tốc độ nứt tăng theo lập phương của ứng suất, nên giảm tải một nửa thì tuổi thọ tăng 8 lần. Hằng số vật liệu cỡ sách giáo trình'],
    };
  },
};

// ------------------------------------------------------------------ TN6: đường hầm gió siêu thanh, sóng xung kích
const GAMMA = 1.4;
/** góc lệch dòng θ (rad) ứng với góc sóng β ở số Mach M (quan hệ θ–β–M) */
const turn = (M: number, b: number) => Math.atan((2 * (M * M * Math.sin(b) ** 2 - 1)) / (Math.tan(b) * (M * M * (GAMMA + Math.cos(2 * b)) + 2)));
/**
 * Nêm nửa góc `deg` trong dòng Mach M: góc Mach μ, góc sóng xiên β (nghiệm yếu; null = sóng tách khỏi mũi), tỉ số áp suất qua sóng.
 * Dưới Mach 1 không có sóng xung kích.
 */
export function shock(M: number, deg: number) {
  if (M <= 1) return {mu: NaN, beta: null as number | null, pr: 1, detached: false};
  const th = (deg * Math.PI) / 180;
  const mu = Math.asin(1 / M);
  let top = mu;
  for (let i = 0; i <= 400; i++) {
    const b = mu + ((Math.PI / 2 - mu) * i) / 400;
    if (turn(M, b) > turn(M, top)) top = b;
  }
  if (turn(M, top) < th) return {mu, beta: null, pr: 1 + ((2 * GAMMA) / (GAMMA + 1)) * (M * M - 1), detached: true};
  let lo = mu;
  let hi = top;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (turn(M, mid) < th) lo = mid;
    else hi = mid;
  }
  return {mu, beta: hi, pr: 1 + ((2 * GAMMA) / (GAMMA + 1)) * ((M * Math.sin(hi)) ** 2 - 1), detached: false};
}
export const SHOCK: SimSpec = {
  id: 'shock',
  name: 'Đường hầm gió siêu thanh',
  task: 'Tăng số Mach cho tới khi xuất hiện sóng xung kích xiên BÁM vào mũi nêm, với áp suất sau sóng gấp ít nhất 3 lần trước sóng. Mũi quá tù thì sóng làm sao?',
  params: [
    {id: 'M', label: 'Số Mach', unit: '', min: 0.8, max: 4, init: 0.8, digits: 2},
    {id: 'deg', label: 'Nửa góc mũi nêm', unit: '°', min: 5, max: 45, init: 15, digits: 0},
  ],
  solution: {M: 3, deg: 20},
  evaluate: (v: Values) => {
    const s = shock(v.M, v.deg);
    const ok = s.beta !== null && s.pr >= 3;
    return {
      ok,
      head: v.M <= 1 ? 'Dưới âm: chưa có sóng xung kích' : s.detached ? 'Sóng TÁCH khỏi mũi (sóng cung): mũi quá tù so với số Mach này' : `${ok ? 'Đạt: ' : ''}sóng xiên ${((s.beta! * 180) / Math.PI).toFixed(1)}°, áp suất ×${s.pr.toFixed(2)}`,
      lines: [v.M > 1 ? `Góc Mach μ = arcsin(1/M) = ${((s.mu * 180) / Math.PI).toFixed(1)}°` : 'Nhiễu động truyền ngược dòng được nên dòng khí "biết trước" vật cản', 'p₂/p₁ = 1 + 2γ/(γ + 1)·(M²·sin²β − 1). Lí thuyết sóng xiên cho nêm phẳng, khí lí tưởng γ = 1,4'],
    };
  },
};

// ------------------------------------------------------------------ TN7: robot bốn chân chịu cú đạp
export const DOG = {mass: 12, half: 0.15};
/** điều kiện tĩnh: không trượt khi F ≤ μ·m·g (nón ma sát), không lật khi F·h ≤ m·g·w (trọng tâm còn trong đa giác đỡ) */
export function quadruped(mu: number, h: number, F: number) {
  const W = DOG.mass * 9.81;
  return {slip: F > mu * W, tip: F * h > W * DOG.half, maxSlip: mu * W, maxTip: (W * DOG.half) / h};
}
export const QUADRUPED: SimSpec = {
  id: 'quadruped',
  name: 'Robot bốn chân giữ thăng bằng',
  task: 'Robot 12 kg bị đạp ngang một lực ít nhất 60 N. Chọn mặt sàn và chiều cao thân để robot không trượt chân và không lật. Trên mặt băng thì cách nào cũng không được, vì sao?',
  params: [
    {id: 'mu', label: 'Hệ số ma sát mặt sàn', unit: '', min: 0.05, max: 1, init: 0.05, log: true, digits: 2},
    {id: 'h', label: 'Chiều cao trọng tâm', unit: 'm', min: 0.15, max: 0.45, init: 0.4, digits: 2},
    {id: 'F', label: 'Lực đạp ngang', unit: 'N', min: 0, max: 200, init: 60, digits: 0},
  ],
  solution: {mu: 0.8, h: 0.25, F: 60},
  evaluate: (v: Values) => {
    const q = quadruped(v.mu, v.h, v.F);
    const ok = v.F >= 60 && !q.slip && !q.tip;
    return {
      ok,
      head: q.slip ? 'Trượt chân: lực ngang vượt nón ma sát' : q.tip ? 'Lật: trọng tâm bị đẩy ra ngoài đa giác đỡ' : `${ok ? 'Đạt: ' : ''}robot trụ vững trước ${v.F.toFixed(0)} N`,
      lines: [`Không trượt tới ${q.maxSlip.toFixed(0)} N (μ·m·g); không lật tới ${q.maxTip.toFixed(0)} N (m·g·w/h)`, 'Đây là điều kiện tĩnh mà bộ điều khiển MPC phải tôn trọng: |f_ngang| ≤ μ·f_đứng ở mỗi chân. Robot thật còn bước chân ra để đỡ, chưa mô phỏng ở đây'],
    };
  },
};

// ------------------------------------------------------------------ TN8: robot phẫu thuật từ xa
/** sai lệch đầu dụng cụ (mm): run tay 0,5 mm ở 10 Hz qua bộ lọc và tỉ lệ chuyển động K, cộng độ trễ khi tay đi 5 mm/s */
export function surgery(K: number, filt: number, delayMs: number) {
  const tremor = (0.5 * (1 - filt / 100)) / K;
  const lag = (5 * delayMs) / 1000 / K;
  return {tremor, lag, err: tremor + lag};
}
export const SURGERY: SimSpec = {
  id: 'surgery',
  name: 'Robot phẫu thuật từ xa',
  task: 'Tay bác sĩ run 0,5 mm nhưng phải khâu mạch máu đường kính 1 mm: đầu kim được lệch tối đa 0,05 mm. Dùng tỉ lệ thu nhỏ chuyển động và bộ lọc run. Thử tăng độ trễ mạng lên 200 ms.',
  params: [
    {id: 'K', label: 'Tỉ lệ thu nhỏ chuyển động', unit: ': 1', min: 1, max: 10, init: 1, digits: 1},
    {id: 'filt', label: 'Bộ lọc khử run', unit: '%', min: 0, max: 100, init: 0, digits: 0},
    {id: 'delay', label: 'Độ trễ mạng', unit: 'ms', min: 20, max: 200, init: 20, digits: 0},
  ],
  solution: {K: 10, filt: 80, delay: 20},
  evaluate: (v: Values) => {
    const s = surgery(v.K, v.filt, v.delay);
    const ok = s.err <= 0.05;
    return {
      ok,
      head: `${ok ? 'Đạt: ' : ''}đầu kim lệch ${s.err.toFixed(3)} mm`,
      lines: [`Run còn lại ${s.tremor.toFixed(3)} mm + trễ ${s.lag.toFixed(3)} mm`, 'Δx_dụng cụ = Δx_tay / K; bộ lọc khấc trừ thành phần 8–12 Hz của run sinh lí. Mô hình cộng sai số đơn giản, chưa có phản hồi lực'],
    };
  },
};

// ------------------------------------------------------------------ TN9: SLAM, trôi bản đồ và đóng vòng lặp
/** sai số vị trí (m) khi xe quay về điểm xuất phát sau quãng đường L; đóng vòng lặp chia sai số theo số điểm đặc trưng khớp lại */
export function slam(drift: number, L: number, feats: number, closure: number) {
  const raw = (drift / 100) * L;
  return {raw, err: closure >= 0.5 ? raw / (1 + feats / 10) : raw};
}
export const SLAM: SimSpec = {
  id: 'slam',
  name: 'SLAM và đóng vòng lặp',
  task: 'Xe tự hành chạy một vòng quanh phòng rồi về chỗ cũ, nhưng bản đồ bị trôi. Làm cho sai số vị trí cuối vòng còn dưới 0,1 m. Chỉ giảm độ trôi của bánh xe thì có đủ không?',
  params: [
    {id: 'drift', label: 'Độ trôi đo quãng đường', unit: '%', min: 0.5, max: 5, init: 3, digits: 1},
    {id: 'L', label: 'Chiều dài vòng chạy', unit: 'm', min: 10, max: 200, init: 100, digits: 0},
    {id: 'feats', label: 'Số điểm đặc trưng nhận lại', unit: '', min: 20, max: 500, init: 50, log: true, digits: 0},
    {id: 'closure', label: 'Đóng vòng lặp (0 tắt · 1 bật)', unit: '', min: 0, max: 1, init: 0, digits: 0},
  ],
  solution: {drift: 3, L: 100, feats: 500, closure: 1},
  evaluate: (v: Values) => {
    const s = slam(v.drift, v.L, v.feats, v.closure);
    const ok = s.err < 0.1;
    return {
      ok,
      head: `${ok ? 'Đạt: ' : ''}sai số cuối vòng ${s.err.toFixed(2)} m`,
      lines: [`Chỉ cộng dồn quãng đường: trôi ${s.raw.toFixed(2)} m sau ${v.L.toFixed(0)} m`, 'Đóng vòng lặp: nhận ra cảnh cũ rồi tối ưu lại toàn bộ quỹ đạo để sai số chiếu lại nhỏ nhất. Hệ số giảm sai số ở đây là mô hình định tính'],
    };
  },
};

// ------------------------------------------------------------------ TN12: phản ứng dao động Belousov–Zhabotinsky
export const BZ_SAMPLES = 600;
/**
 * Oregonator hai biến (Tyson–Fife): ε·dx/dt = x(1 − x) − f·z·(x − q)/(x + q), dz/dt = x − z, q = 0,002.
 * Chạy 30 đơn vị thời gian, trả z (chất xúc tác bị oxi hoá, quyết định màu) lấy mẫu đều, biên độ nửa sau và chu kì (0 = không dao động).
 */
export function oregonator(f: number, eps: number) {
  const q = 0.002;
  const dt = 2e-4;
  const steps = 150000;
  const z = new Float32Array(BZ_SAMPLES);
  let x = 0.1;
  let c = 0.1;
  let lo = Infinity;
  let hi = -Infinity;
  const ups: number[] = [];
  for (let i = 0; i < steps; i++) {
    const x1 = Math.max(0, x + (dt * (x * (1 - x) - (f * c * (x - q)) / (x + q))) / eps);
    const c1 = c + dt * (x - c);
    if (i > steps / 2) {
      lo = Math.min(lo, c1);
      hi = Math.max(hi, c1);
      if (c < 0.05 && c1 >= 0.05) ups.push(i * dt);
    }
    x = x1;
    c = c1;
    if (i % (steps / BZ_SAMPLES) === 0) z[i / (steps / BZ_SAMPLES)] = c;
  }
  const osc = hi - lo > 0.05 && ups.length >= 2;
  return {z, amp: hi - lo, period: osc ? (ups[ups.length - 1] - ups[0]) / (ups.length - 1) : 0};
}
export const BZ: SimSpec = {
  id: 'bz',
  name: 'Phản ứng dao động BZ',
  task: 'Dung dịch Belousov–Zhabotinsky đang đứng yên một màu. Chỉnh hệ số f (tỉ lệ bromomalonic/bromat) để dung dịch tự đổi màu đỏ ↔ xanh tuần hoàn. Dao động chỉ có trong một khoảng f: tìm hai bờ của khoảng đó.',
  params: [
    {id: 'f', label: 'Hệ số f', unit: '', min: 0.2, max: 4, init: 3.5, digits: 2},
    {id: 'eps', label: 'Tỉ lệ thời gian ε', unit: '', min: 0.02, max: 0.2, init: 0.04, log: true, digits: 3},
  ],
  solution: {f: 1, eps: 0.04},
  evaluate: (v: Values) => {
    const r = oregonator(v.f, v.eps);
    const ok = r.period > 0;
    return {
      ok,
      head: ok ? `Đạt: dao động với chu kì ≈ ${r.period.toFixed(1)} đơn vị thời gian` : 'Không dao động: dung dịch dừng ở một màu',
      lines: [`Biên độ chất xúc tác bị oxi hoá: ${r.amp.toFixed(2)}`, 'Mô hình Oregonator rút gọn hai biến, tham số minh hoạ. Phản ứng thật: bromat oxi hoá acid malonic với xúc tác ferroin (đỏ ↔ xanh)'],
    };
  },
};

export const ADVANCED: SimSpec[] = [TURBINE, FOC, STIRLING, HARMONIC, FATIGUE, SHOCK, QUADRUPED, SURGERY, SLAM, BZ];
