/**
 * Đo cảm ứng từ bằng cân dòng điện (Vật lí 12, bài "Lực từ tác dụng lên dây dẫn mang dòng điện. Cảm ứng từ"). Logic thuần.
 * Khung dây N vòng treo ở một đầu đòn cân, cạnh đáy dài L nằm ngang trong khe nam châm điện; đầu kia đòn cân móc vào lực kế.
 * Mô hình lí tưởng: B đều trong khe và tỉ lệ với dòng qua nam châm (chưa bão hoà), bỏ qua lực lên hai cạnh bên.
 */
export const BAL = {
  N: 200,
  /** chiều dài cạnh đáy trong khe (m) */
  L: 0.08,
  /** nam châm điện: tesla cho mỗi ampe */
  kB: 0.02,
  /** số chỉ lực kế khi chưa có dòng (N): lực kế căng sẵn để đo được cả lực hướng lên */
  F0: 0.1,
  /** thang đo lực kế (N) và độ chia nhỏ nhất */
  max: 0.5,
  div: 0.005,
  Imax: 1,
  ImMax: 2,
} as const;

export interface BalState {
  /** công tắc K đóng: có dòng qua khung */
  K: boolean;
  /** dòng qua khung (A) */
  I: number;
  /** dòng qua nam châm điện (A) */
  Im: number;
  /** đã đảo chiều dòng qua khung / qua nam châm */
  revI: boolean;
  revB: boolean;
}
export const START: BalState = {K: false, I: 0.1, Im: 1, revI: false, revB: false};

export const field = (Im: number): number => BAL.kB * Im;
/** lực từ lên cạnh đáy (N); dương = kéo khung xuống. Đảo chiều I hoặc B thì lực đổi chiều, đảo cả hai thì giữ nguyên. */
export const force = (s: BalState): number => (s.K ? (s.revI !== s.revB ? -1 : 1) * BAL.N * field(s.Im) * s.I * BAL.L : 0);
/** lực mà lực kế phải giữ trước khi kẹp thang đo */
const raw = (s: BalState): number => BAL.F0 + force(s);
/** số chỉ lực kế (N): kẹp trong thang 0–0,5 N và làm tròn tới độ chia 0,005 N */
export const reading = (s: BalState): number => Math.round(Math.min(BAL.max, Math.max(0, raw(s))) / BAL.div) * BAL.div;
/** 'over' = vượt thang đo, 'slack' = lực hướng lên lớn hơn lực căng sẵn nên lực kế chùng */
export const range = (s: BalState): 'ok' | 'over' | 'slack' => (raw(s) > BAL.max ? 'over' : raw(s) < 0 ? 'slack' : 'ok');

/** một dòng trong sổ ghi: dòng qua khung, dòng qua nam châm, độ lớn lực từ |số chỉ − số chỉ ban đầu| */
export interface Sample {
  I: number;
  Im: number;
  F: number;
}
/** ghi số đo hiện tại; null nếu K đang mở hoặc lực kế ngoài thang (số đọc không dùng được) */
export const measure = (s: BalState): Sample | null => (s.K && range(s) === 'ok' ? {I: Math.round(s.I * 100) / 100, Im: s.Im, F: Math.abs(reading(s) - BAL.F0)} : null);

/** B từ độ dốc đường F theo I (đường thẳng qua gốc, bình phương tối thiểu): F = (N·B·L)·I */
export function fitB(samples: Sample[]): number {
  const sii = samples.reduce((a, q) => a + q.I * q.I, 0);
  return sii > 0 ? samples.reduce((a, q) => a + q.I * q.F, 0) / (BAL.N * BAL.L * sii) : NaN;
}

const vn = (x: number, d: number) => x.toFixed(d).replace('.', ',');
export interface Verdict {
  ok: boolean;
  head: string;
  lines: string[];
}
/** Thí nghiệm 1: đã thấy lực từ theo cả hai chiều chưa (bằng cách đảo chiều dòng điện hoặc từ trường). */
export function directionVerdict(seen: {down: boolean; up: boolean}, s: BalState): Verdict {
  const f = force(s);
  const ok = seen.down && seen.up;
  return {
    ok,
    head: ok ? 'Đạt: đã thấy lực từ theo cả hai chiều' : !s.K ? 'Công tắc K đang mở: chưa có lực từ' : `Lực từ đang hướng ${f > 0 ? 'xuống' : 'lên'}: thử đảo chiều dòng điện hoặc từ trường`,
    lines: ['Quy tắc bàn tay trái: đường sức từ đâm vào lòng bàn tay, bốn ngón chỉ chiều dòng điện, ngón cái choãi ra chỉ chiều lực từ', 'Đảo chiều I hoặc đảo chiều B thì lực đổi chiều; đảo cả hai thì lực giữ nguyên chiều'],
  };
}
/** Thí nghiệm 2: đo B từ ít nhất 4 số đo ở cùng một dòng nam châm, trải ít nhất 0,3 A; đạt khi sai dưới 5 %. */
export function measureVerdict(samples: Sample[], Im: number): Verdict {
  const used = samples.filter((q) => Math.abs(q.Im - Im) < 0.005);
  const span = used.length ? Math.max(...used.map((q) => q.I)) - Math.min(...used.map((q) => q.I)) : 0;
  const B = fitB(used);
  const err = Math.abs(B - field(Im)) / field(Im);
  const enough = new Set(used.map((q) => q.I)).size >= 4 && span >= 0.3;
  const ok = enough && err < 0.05;
  return {
    ok,
    head: ok ? `Đạt: B ≈ ${vn(B * 1000, 1)} mT` : enough ? `B đo được ${vn(B * 1000, 1)} mT: lệch nhiều, kiểm tra lại số đo` : `Đã ghi ${used.length} số đo: cần ít nhất 4 giá trị dòng khác nhau, trải 0,3 A trở lên`,
    lines: [Number.isFinite(B) ? `Độ dốc F/I = ${vn(B * BAL.N * BAL.L, 3)} N/A → B = (F/I)/(N·L) với N = ${BAL.N}, L = ${BAL.L * 100} cm` : 'F = N·B·I·L: đổi I, đọc lực kế, lấy độ dốc đường F theo I', 'Lực kế chia tới 0,005 N nên mỗi số đo sai tối đa nửa độ chia; đo nhiều điểm rồi lấy độ dốc sẽ chính xác hơn một điểm'],
  };
}
