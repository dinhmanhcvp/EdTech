import type {SimSpec, Values} from './types';

/** Các bài Vật lí – Công nghệ THPT của danh mục `NGHIEN_CUU_THI_NGHIEM_STEAM_THPT_CHUAN_GDPT2018.md` (bài 2, 3, 4, 5, 6, 8, 10). Logic thuần. */

// ------------------------------------------------------------------ bài 2: va chạm trên đệm khí (xe 2 đứng yên)
export function collide(m1: number, m2: number, v1: number, e: number) {
  const u1 = ((m1 - e * m2) * v1) / (m1 + m2);
  const u2 = ((1 + e) * m1 * v1) / (m1 + m2);
  return {u1, u2, lost: 1 - (m1 * u1 * u1 + m2 * u2 * u2) / (m1 * v1 * v1)};
}
export const COLLISION: SimSpec = {
  id: 'collision',
  name: 'Va chạm trên đệm khí',
  task: 'Xe 1 lao vào xe 2 đang đứng yên. Chỉnh khối lượng và hệ số phục hồi e để sau va chạm xe 1 dừng hẳn, truyền toàn bộ chuyển động cho xe 2. Rồi thử e = 0 (va chạm mềm): động lượng còn bảo toàn không, động năng thì sao?',
  params: [
    {id: 'm1', label: 'Khối lượng xe 1', unit: 'kg', min: 0.1, max: 0.5, init: 0.2, digits: 2},
    {id: 'm2', label: 'Khối lượng xe 2', unit: 'kg', min: 0.1, max: 0.5, init: 0.2, digits: 2},
    {id: 'v1', label: 'Vận tốc xe 1', unit: 'm/s', min: 0.2, max: 1, init: 0.6, digits: 2},
    {id: 'e', label: 'Hệ số phục hồi e', unit: '', min: 0, max: 1, init: 0.5, digits: 2},
  ],
  solution: {m1: 0.2, m2: 0.2, v1: 0.6, e: 1},
  evaluate: (v: Values) => {
    const c = collide(v.m1, v.m2, v.v1, v.e);
    const ok = Math.abs(c.u1) < 0.03 && c.lost < 0.05;
    return {
      ok,
      head: ok ? 'Đạt: xe 1 dừng, xe 2 nhận toàn bộ chuyển động' : `Sau va chạm: v₁′ = ${c.u1.toFixed(2)} m/s, v₂′ = ${c.u2.toFixed(2)} m/s`,
      lines: [`Động lượng trước ${(v.m1 * v.v1).toFixed(3)} = sau ${(v.m1 * c.u1 + v.m2 * c.u2).toFixed(3)} kg·m/s (luôn bảo toàn)`, `Động năng mất ${(c.lost * 100).toFixed(0)} % = (1 − e²)·m₂/(m₁ + m₂); đệm khí lí tưởng, không ma sát`],
    };
  },
};

// ------------------------------------------------------------------ bài 3: ống tia catot Thomson đo e/m
export const EM = 1.75882e11;
const PLATE_GAP = 0.01;
const PLATE_LEN = 0.08;
const COIL = 7.8e-4; // T/A của cặp cuộn Helmholtz (130 vòng, bán kính 15 cm)
/** vận tốc electron, điện trường, từ trường, độ lệch ở cuối bản (m, dương = lệch theo lực điện) và e/m tính từ E, B, U gia tốc */
export function beam(U: number, I: number, Ua: number) {
  const v = Math.sqrt(2 * EM * Ua);
  const E = U / PLATE_GAP;
  const B = COIL * I;
  return {v, E, B, y: (EM * (E - v * B) * PLATE_LEN ** 2) / (2 * v * v), em: B > 0 ? (E / B) ** 2 / (2 * Ua) : NaN};
}
export const THOMSON: SimSpec = {
  id: 'thomson',
  name: 'Ống tia catot đo e/m',
  task: 'Điện trường giữa hai bản làm chùm electron lệch. Tăng dòng điện cuộn Helmholtz cho tới khi lực từ cân bằng lực điện, chùm tia đi thẳng trở lại (lệch dưới 0,5 mm). Khi đó v = E/B, từ đó tính ra e/m.',
  params: [
    {id: 'U', label: 'Hiệu điện thế hai bản', unit: 'V', min: 0, max: 400, init: 200, digits: 0},
    {id: 'I', label: 'Dòng điện cuộn dây', unit: 'A', min: 0, max: 2, init: 0, digits: 3},
    {id: 'Ua', label: 'Điện áp gia tốc', unit: 'V', min: 1000, max: 5000, init: 3000, digits: 0},
  ],
  solution: {U: 200, I: 200 / PLATE_GAP / Math.sqrt(2 * EM * 3000) / COIL, Ua: 3000},
  evaluate: (v: Values) => {
    const b = beam(v.U, v.I, v.Ua);
    const ok = v.U >= 50 && Math.abs(b.y) < 5e-4;
    return {
      ok,
      head: ok ? `Chùm tia đi thẳng: e/m ≈ ${(b.em / 1e11).toFixed(2)}·10¹¹ C/kg` : `Chùm tia lệch ${(b.y * 1000).toFixed(1)} mm ${b.y > 0 ? 'về phía lực điện' : 'về phía lực từ'}`,
      lines: [`E = U/d = ${(b.E / 1000).toFixed(1)} kV/m, B = ${(b.B * 1e3).toFixed(3)} mT, v = ${(b.v / 1e7).toFixed(2)}·10⁷ m/s`, 'Cân bằng: eE = evB → v = E/B; với eU_gia tốc = ½mv² suy ra e/m = E²/(2·U_gia tốc·B²). Giá trị chuẩn 1,76·10¹¹ C/kg'],
    };
  },
};

// ------------------------------------------------------------------ bài 4: hãm từ Foucault (nam châm rơi trong ống kim loại dài 1 m)
const G = 9.81;
export const TUBE = 1;
/** shortcut: hằng số gộp (khối lượng nam châm, B², hình học) chỉnh để ống đồng dày 2 mm cho vận tốc giới hạn ≈ 0,1 m/s; mô hình định tính F = −k·σ·w·v. */
const EDDY = 11.6;
/** vận tốc giới hạn (m/s); σ tính bằng MS/m, w bằng mm, rãnh xẻ bằng % chiều dài ống */
export const terminal = (sigma: number, w: number, slit: number): number => {
  const vt = EDDY / Math.max(sigma * w * (1 - slit / 100), 1e-9);
  return vt > 50 ? Infinity : vt;
};
export const fallPos = (vt: number, t: number): number => (Number.isFinite(vt) ? vt * (t - (vt / G) * (1 - Math.exp((-t * G) / vt))) : (G * t * t) / 2);
export function fallTime(vt: number): number {
  let lo = 0;
  let hi = Number.isFinite(vt) ? TUBE / vt + vt / G + 1 : 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (fallPos(vt, mid) < TUBE) lo = mid;
    else hi = mid;
  }
  return hi;
}
export const EDDY_BRAKE: SimSpec = {
  id: 'eddy',
  name: 'Hãm từ Foucault',
  task: 'Thả nam châm rơi trong ống kim loại dài 1 m. Chọn vật liệu và bề dày ống để nam châm rơi mất hơn 5 giây (rơi tự do chỉ 0,45 s). Sau đó xẻ rãnh dọc ống: vì sao nam châm lại rơi nhanh?',
  params: [
    {id: 'sigma', label: 'Độ dẫn điện của ống', unit: 'MS/m', min: 1, max: 60, init: 35, digits: 0},
    {id: 'w', label: 'Bề dày thành ống', unit: 'mm', min: 0.5, max: 5, init: 1, digits: 1},
    {id: 'slit', label: 'Rãnh xẻ dọc ống', unit: '%', min: 0, max: 100, init: 0, digits: 0},
  ],
  solution: {sigma: 58, w: 3, slit: 0},
  evaluate: (v: Values) => {
    const vt = terminal(v.sigma, v.w, v.slit);
    const T = fallTime(vt);
    const ok = T >= 5;
    return {
      ok,
      head: ok ? `Đạt: nam châm rơi 1 m mất ${T.toFixed(1)} s` : `Nam châm rơi 1 m mất ${T.toFixed(2)} s`,
      lines: [Number.isFinite(vt) ? `Vận tốc giới hạn ≈ ${(vt * 100).toFixed(1)} cm/s: lực hãm F ∝ σ·B²·v cân bằng trọng lực` : 'Dòng Foucault bị cắt đứt: gần như rơi tự do', 'Đồng 58, nhôm 35, đồng thau 15, thép không gỉ 1,4 MS/m. Mô hình định tính: lực hãm tỉ lệ độ dẫn điện, bề dày và phần ống còn liền'],
    };
  },
};

// ------------------------------------------------------------------ bài 5: hiệu ứng quang điện, đo h
export const H_EV = 4.135667e-15;
/** điện áp hãm (V) với tần số f tính bằng 10¹⁴ Hz, công thoát A tính bằng eV */
export const stopU = (f: number, A: number): number => Math.max(0, H_EV * f * 1e14 - A);
export const photoCurrent = (f: number, A: number, U: number): number => (stopU(f, A) > 0 ? Math.max(0, 1 - U / stopU(f, A)) : 0);
export const PHOTO: SimSpec = {
  id: 'photo',
  name: 'Quang điện đo hằng số Planck',
  task: 'Chiếu ánh sáng vào catot rồi tăng dần điện áp hãm cho tới khi dòng quang điện vừa về 0 (sai không quá 0,05 V). Từ U_h tính ra h. Thử giảm tần số xuống dưới giới hạn quang điện: tăng cường độ sáng có ích gì không?',
  params: [
    {id: 'f', label: 'Tần số ánh sáng', unit: '·10¹⁴ Hz', min: 4, max: 12, init: 7, digits: 2},
    {id: 'A', label: 'Công thoát catot', unit: 'eV', min: 1.9, max: 4.7, init: 2.1, digits: 2},
    {id: 'U', label: 'Điện áp hãm', unit: 'V', min: 0, max: 3, init: 0, digits: 2},
  ],
  solution: {f: 7, A: 2.1, U: stopU(7, 2.1)},
  evaluate: (v: Values) => {
    const Uh = stopU(v.f, v.A);
    const ok = Uh > 0.1 && Math.abs(v.U - Uh) <= 0.05;
    const h = ((v.U + v.A) / (v.f * 1e14)) * 1.602177e-19;
    return {
      ok,
      head: ok ? `Dòng vừa về 0 ở U_h ≈ ${v.U.toFixed(2)} V → h ≈ ${(h * 1e34).toFixed(2)}·10⁻³⁴ J·s` : Uh === 0 ? 'Không có electron bật ra: tần số dưới giới hạn quang điện' : `Dòng quang điện còn ${(photoCurrent(v.f, v.A, v.U) * 100).toFixed(0)} %`,
      lines: [`Năng lượng photon hf = ${(H_EV * v.f * 1e14).toFixed(2)} eV, giới hạn quang điện f₀ = A/h = ${(v.A / H_EV / 1e14).toFixed(2)}·10¹⁴ Hz`, 'hf = A + e·U_h → U_h = (h/e)·f − A/e: đường thẳng theo f, hệ số góc h/e. Cs 2,1; Na 2,3; Zn 4,3; Ag 4,7 eV'],
    };
  },
};

// ------------------------------------------------------------------ bài 6: tán xạ Rutherford
/** khoảng cách gần nhất khi bắn trực diện (fm): d = 2Z·e²/(4πε₀·E_k), e²/4πε₀ = 1,44 MeV·fm */
export const closest = (Z: number, Ek: number): number => (2.88 * Z) / Ek;
/** góc lệch (độ) theo tham số va chạm b (fm): tan(θ/2) = d/(2b) */
export const scatterAngle = (Z: number, Ek: number, b: number): number => (2 * Math.atan(closest(Z, Ek) / (2 * b)) * 180) / Math.PI;
/** phần hạt bật ngược quá 90° qua lá dày 0,4 µm (mật độ nguyên tử của vàng) */
export const backFraction = (Z: number, Ek: number): number => 5.9e28 * 4e-7 * Math.PI * ((closest(Z, Ek) * 1e-15) / 2) ** 2;
export const RUTHERFORD: SimSpec = {
  id: 'rutherford',
  name: 'Tán xạ Rutherford',
  task: 'Bắn hạt α vào lá kim loại mỏng. Thu nhỏ tham số va chạm b (khoảng cách từ đường bay tới hạt nhân) cho tới khi hạt bật ngược lại quá 90°. Phải bắn gần cỡ nào so với kích thước nguyên tử (100 000 fm)?',
  params: [
    {id: 'Ek', label: 'Động năng hạt α', unit: 'MeV', min: 1, max: 10, init: 5, digits: 1},
    {id: 'Z', label: 'Số hiệu nguyên tử lá kim loại', unit: '', min: 13, max: 92, init: 79, digits: 0},
    {id: 'b', label: 'Tham số va chạm b', unit: 'fm', min: 1, max: 1000, init: 300, log: true, digits: 0},
  ],
  solution: {Ek: 5, Z: 79, b: 10},
  evaluate: (v: Values) => {
    const Z = Math.round(v.Z);
    const th = scatterAngle(Z, v.Ek, v.b);
    const ok = th > 90;
    return {
      ok,
      head: ok ? `Hạt α bật ngược: lệch ${th.toFixed(0)}°` : `Hạt α lệch ${th.toFixed(1)}°`,
      lines: [`Bắn trực diện thì dừng cách tâm d = ${closest(Z, v.Ek).toFixed(1)} fm; bật ngược khi b < d/2`, `Chỉ khoảng 1 trên ${Math.round(1 / backFraction(Z, v.Ek)).toLocaleString('vi-VN')} hạt bật ngược qua lá dày 0,4 µm: nguyên tử gần như rỗng, điện tích dương dồn vào hạt nhân rất nhỏ`],
    };
  },
};

// ------------------------------------------------------------------ bài 8: bộ vi sai ô tô
const TRACK = 1.6;
/** tốc độ hai bánh so với vỏ vi sai (= 1), lực kéo so với một bánh bám tốt, và xe có đi được không */
export function differential(R: number, mu: number, lock: number) {
  const locked = lock >= 0.5;
  const traction = locked ? mu + 1 : 2 * Math.min(mu, 1);
  const stuck = traction < 0.6;
  const rel = TRACK / (2 * R);
  // sa lầy với vi sai mở: vỏ vẫn quay nhưng bánh bám tốt đứng yên, bánh trong lầy quay gấp đôi
  const [wl, wr] = locked ? [1, 1] : stuck ? [2, 0] : [1 - rel, 1 + rel];
  return {locked, traction, stuck, wl, wr};
}
export const DIFFERENTIAL: SimSpec = {
  id: 'differential',
  name: 'Bộ vi sai ô tô',
  task: 'Bánh trái đang nằm trong vũng lầy (độ bám ≤ 0,2). Với vi sai mở, xe có thoát ra được không? Tìm cách để xe đi được. Sau đó cho bánh trái bám tốt và thu nhỏ bán kính cua: hai bánh quay khác nhau thế nào?',
  params: [
    {id: 'R', label: 'Bán kính cua (bánh trái ở trong)', unit: 'm', min: 4, max: 100, init: 100, log: true, digits: 0},
    {id: 'mu', label: 'Độ bám bánh trái', unit: '', min: 0.05, max: 1, init: 0.1, digits: 2},
    {id: 'lock', label: 'Khoá vi sai (0 mở · 1 khoá)', unit: '', min: 0, max: 1, init: 0, digits: 0},
  ],
  solution: {R: 100, mu: 0.1, lock: 1},
  evaluate: (v: Values) => {
    const d = differential(v.R, v.mu, v.lock);
    const ok = v.mu <= 0.2 && !d.stuck;
    return {
      ok,
      head: ok ? 'Đạt: khoá vi sai, bánh phải bám đường kéo xe ra khỏi lầy' : d.stuck ? 'Xe sa lầy: bánh trái quay tít, bánh phải đứng yên' : `Xe chạy: bánh trái ${d.wl.toFixed(2)}, bánh phải ${d.wr.toFixed(2)} lần tốc độ vỏ vi sai`,
      lines: [`ω_vỏ = (ω_trái + ω_phải)/2 = ${((d.wl + d.wr) / 2).toFixed(2)}; lực kéo ${d.traction.toFixed(2)} (cần ≥ 0,6)`, d.locked ? 'Khoá: hai bánh buộc quay cùng tốc độ; vào cua gắt thì lốp bị trượt, nên chỉ khoá khi sa lầy' : 'Vi sai mở chia mô-men đều cho hai bánh: bánh trượt nhận được bao nhiêu thì bánh bám cũng chỉ nhận bấy nhiêu'],
    };
  },
};

// ------------------------------------------------------------------ bài 10: xe hai bánh tự cân bằng, PID
export const PID_HZ = 100;
/**
 * Con lắc ngược dài 0,3 m bị đẩy lệch 0,1 rad và chịu mô-men lệch không đổi (trọng tâm lệch); bộ điều khiển trễ 15 ms.
 * Trả góc nghiêng theo thời gian (5 s, 100 mẫu/giây), đã ngã chưa, và độ lệch lớn nhất trong giây cuối (rad).
 */
export function balance(kp: number, ki: number, kd: number) {
  const dt = 0.001;
  const th = new Float32Array(5 * PID_HZ);
  const us: number[] = [];
  let a = 0.1;
  let w = 0;
  let integ = 0;
  let fell = false;
  for (let i = 0; i < 5000; i++) {
    if (!fell) {
      integ += a * dt;
      us.push(kp * a + ki * integ + kd * w);
      w += (32.7 * Math.sin(a) + 1.5 - (us[i - 15] ?? 0)) * dt;
      a += w * dt;
      if (Math.abs(a) > 0.8) {
        fell = true;
        a = (Math.sign(a) * Math.PI) / 2;
      }
    }
    if (i % 10 === 0) th[i / 10] = a;
  }
  let err = 0;
  for (let i = 4 * PID_HZ; i < th.length; i++) err = Math.max(err, Math.abs(th[i]));
  return {th, fell, err};
}
export const PID: SimSpec = {
  id: 'pid',
  name: 'Xe tự cân bằng PID',
  task: 'Xe hai bánh bị đẩy lệch 6° và có trọng tâm hơi lệch. Chỉnh K_p, K_i, K_d để xe đứng thẳng lại và sau 4 giây lệch không quá 0,3°. Thử từng hệ số một để thấy vai trò của nó.',
  params: [
    {id: 'kp', label: 'K_p (tỉ lệ)', unit: '', min: 0, max: 100, init: 5, digits: 0},
    {id: 'ki', label: 'K_i (tích phân)', unit: '', min: 0, max: 80, init: 0, digits: 0},
    {id: 'kd', label: 'K_d (vi phân)', unit: '', min: 0, max: 10, init: 0, digits: 1},
  ],
  solution: {kp: 60, ki: 40, kd: 8},
  evaluate: (v: Values) => {
    const r = balance(v.kp, v.ki, v.kd);
    const ok = !r.fell && r.err < 0.005;
    const deg = (r.err * 180) / Math.PI;
    return {
      ok,
      head: ok ? `Đạt: xe đứng vững, lệch cuối ${deg.toFixed(2)}°` : r.fell ? 'Xe ngã' : deg > 2 ? `Xe còn lắc ±${deg.toFixed(1)}°` : `Xe đứng nhưng còn lệch ${deg.toFixed(2)}°`,
      lines: ['u = K_p·θ + K_i·∫θ dt + K_d·dθ/dt', 'K_p nhỏ hơn g/l ≈ 33 thì không đủ lực đỡ; K_d hãm dao động; K_i khử độ lệch tĩnh do trọng tâm lệch'],
    };
  },
};

export const THPT_PHYS: SimSpec[] = [COLLISION, THOMSON, EDDY_BRAKE, PHOTO, RUTHERFORD, DIFFERENTIAL, PID];
