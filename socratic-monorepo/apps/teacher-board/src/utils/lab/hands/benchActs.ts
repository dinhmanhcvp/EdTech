/**
 * Thao tác THẬT trong bước chuẩn bị của bài thực hành SGK (thay cho "kéo cục cam vào vòng cam"): học sinh cầm đúng vật cần dùng
 * (lọ thuốc thử, lam kính, giá ống nghiệm, chày, bóng bơm…) và làm đúng việc đó. Chỉ dùng cử chỉ 2D của webcam thường (chụm, kéo, giữ yên, vẽ vòng, chụm–nhả).
 *  - `place`: kéo vật tới chỗ đặt rồi buông (đặt lam kính lên bàn kính, giá ống vào bể ổn nhiệt, bình vào cốc nước…).
 *  - `pour`: kéo lọ / cốc tới miệng dụng cụ và GIỮ YÊN: vật tự nghiêng và rót, giữ càng lâu càng được nhiều; nhấc ra thì ngừng, không mất phần đã rót.
 *  - `stir`: đưa chày / đũa vào dụng cụ rồi vẽ vòng tròn quanh tâm: đủ số vòng là nghiền / khuấy xong.
 *  - `squeeze`: chụm vào bóng giữ để bóp, nhả ra cho phồng lại: mỗi lần chụm–nhả là một nhịp bơm.
 * Mọi đích đều rộng ≥ tầm với của tay (0,16) để tay run vẫn trúng.
 */
export type ActKind = 'place' | 'pour' | 'stir' | 'squeeze' | 'connect' | 'press' | 'turn';
export interface BenchAct {
  kind: ActKind;
  /** tên vật trong `bench-props.glb` (nút `Prop_<tên>`) */
  prop: string;
  /** chỗ vật nằm lúc đầu (hệ của bộ dụng cụ), gốc vật ở giữa đáy */
  from: [number, number, number];
  /** pour: màu tia và chất lỏng dâng lên trong dụng cụ đích */
  color?: string;
  /** pour: số giây giữ yên để rót đủ; stir: số vòng; squeeze: số nhịp bơm */
  n?: number;
  /** place: góc quay quanh trục đứng khi đặt (rad) */
  rot?: number;
  /** place: chỗ vật nằm sau khi đặt (gốc ở giữa đáy), khi khác chỗ vòng cam (vòng cam nổi lên trên để dễ thấy, vật thì nằm trong cốc / bể) */
  rest?: [number, number, number];
  /** place: dùng chính phần động `Mov_<MÃ BÀI>_<part>` của bộ dụng cụ làm vật để cầm (xe, cổng quang, quả cân…) thay vì vật trong `bench-props.glb` */
  part?: number;
  /** nhãn động từ của chỉ dẫn trên cảnh: "Rót", "Khuấy", "Bóp bóng", "Đặt" */
  verb: string;
  /** connect: đầu CỐ ĐỊNH của dây / ống (cực của thiết bị nguồn); dây võng từ đây tới đuôi phích / đầu ống học sinh cầm */
  src?: [number, number, number];
  /** connect: kiểu dây — màu, bán kính (đơn vị cảnh), độ trong (ống silicone) */
  cable?: {color: string; r: number; opacity?: number};
  /** turn: phần động bị chỉnh theo số vòng vặn (thanh đòn nghiêng `angle` rad lúc đầu, về 0 khi vặn đủ) */
  tilt?: {part: number; angle: number};
}
const act = (kind: ActKind, verb: string) => (label: string, prop: string, from: [number, number, number], at: [number, number, number], o: Partial<BenchAct> = {}) => ({label, at, act: {kind, verb, prop, from, ...o} as BenchAct});
export const place = act('place', 'Đặt');
export const pour = act('pour', 'Rót');
export const stir = act('stir', 'Khuấy');
export const squeeze = act('squeeze', 'Bóp');
/** nối dây: kéo đầu phích (dây còn nối với nguồn ở mép bàn) tới đúng chốt cần nối rồi buông */
export const connect = act('connect', 'Nối');
/** bật máy / đèn: chụm một lần vào công tắc (vòng cam trên chính thiết bị); không có vật để cầm */
export const press = act('press', 'Bật');
/** vặn ốc / núm: cầm vào ốc (vòng cam) rồi vẽ vòng tròn quanh nó, đủ `n` vòng là chỉnh xong */
export const turn = act('turn', 'Vặn');
/** dây nối: các điểm (x, y, z) của dây đi từ nguồn `a` tới đuôi phích `b`, võng xuống theo trọng lực và không chui xuống mặt bàn */
export function wirePath(a: [number, number, number], b: [number, number, number], n = 20): [number, number, number][] {
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  return Array.from({length: n + 1}, (_, i) => {
    const t = i / n;
    const sag = Math.sin(Math.PI * t) * Math.min(0.35, 0.08 + len * 0.08);
    return [a[0] + (b[0] - a[0]) * t, Math.max(0.03, a[1] + (b[1] - a[1]) * t - sag), a[2] + (b[2] - a[2]) * t];
  });
}

/** vòng tròn / dải rót: bán kính nhận "đang ở trên miệng dụng cụ" (đơn vị cảnh, hệ bộ dụng cụ) */
export const OVER_R = 0.5;
/** rót: tiến độ 0–1 sau một khung hình; `over` = miệng lọ đang ở trên dụng cụ đích, `held` = đang chụm giữ */
export function pourStep(progress: number, dt: number, over: boolean, held: boolean, seconds = 2.2): number {
  return over && held ? Math.min(1, progress + dt / seconds) : progress;
}
/** góc nghiêng của lọ (rad): nghiêng dần theo tiến độ khi ở trên miệng đích, dựng thẳng khi đang mang đi */
export function pourTilt(current: number, over: boolean, held: boolean, dt: number): number {
  const goal = over && held ? 1.3 : 0.12;
  return current + (goal - current) * (1 - Math.exp(-dt * 7));
}

export interface StirState {
  /** góc lần đo trước quanh tâm (rad), null = chưa / ở vùng chết */
  last: number | null;
  /** tổng góc đã quét (rad, chỉ cộng giá trị tuyệt đối) */
  total: number;
}
export const newStir = (): StirState => ({last: null, total: 0});
/**
 * Khuấy: tay vẽ vòng quanh tâm (cx, cz) của dụng cụ. Gần tâm hơn `dead` thì góc nhảy loạn nên bỏ qua; xa hơn `rmax` là ra ngoài dụng cụ, không tính.
 * Cộng góc quét giữa hai lần đo (qua mốc ±π đúng); quay ngược chiều cũng tính (khuấy theo chiều nào cũng được).
 */
export function stirStep(s: StirState, x: number, z: number, cx: number, cz: number, dead = 0.06, rmax = 0.6): StirState {
  const r = Math.hypot(x - cx, z - cz);
  if (r < dead || r > rmax) return {last: null, total: s.total};
  const a = Math.atan2(z - cz, x - cx);
  if (s.last === null) return {last: a, total: s.total};
  let d = a - s.last;
  d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
  return {last: a, total: s.total + Math.abs(d)};
}
export const stirProgress = (s: StirState, turns: number) => Math.min(1, s.total / (2 * Math.PI * turns));

export interface SqueezeState {
  down: boolean;
  pumps: number;
}
export const newSqueeze = (): SqueezeState => ({down: false, pumps: 0});
/** Bóp bóng: chụm trúng bóng thì bóp, nhả ra mới tính một nhịp (giữ chụm mãi không bơm thêm). */
export function squeezeStep(s: SqueezeState, pinching: boolean, onBulb: boolean): SqueezeState {
  if (pinching && onBulb) return s.down ? s : {...s, down: true};
  return s.down ? {down: false, pumps: s.pumps + 1} : s;
}
/** mức bóp của bóng 0–1 để vẽ: giảm dần khi nhả */
export const squash = (down: boolean, current: number, dt: number) => current + ((down ? 1 : 0) - current) * (1 - Math.exp(-dt * 16));

/** đặt vật: thả trong bán kính `snap` (tính trên màn hình, đơn vị chiều cao) quanh chỗ đặt thì nhận */
export const dropped = (screenDist: number, snap: number) => screenDist <= snap;
