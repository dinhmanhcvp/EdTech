/**
 * Bài "Phẫu thuật tim" (Sinh, /lab): ba chế độ trên cùng một quả tim Blender (`public/models/surgery-heart.glb`, `tools/lab-models/surgery_heart.py`).
 *  - Cắt lớp: mặt phẳng cắt xuyên tim, nắp lát cắt vẽ kín bằng stencil (thấy độ dày thành, vách ngăn, lòng buồng).
 *  - Bóc lớp: màng ngoài tim → mạch vành → thành trước → bốn van; bóc lớp ngoài mới chạm được lớp trong.
 *  - Phẫu thuật: rạch màng ngoài tim theo đường giải phẫu; lệch vào động mạch liên thất trước là biến chứng chảy máu; kẹp cầm máu, hút, khâu.
 * Logic thuần ở đây (sinh hiệu, bước mổ) để chuột, ngón tay, tay qua webcam và nút trên bảng đi cùng một đường và kiểm được bằng test.
 */

// ------------------------------------------------------------------ sinh hiệu
export interface Vitals {
  /** nhịp tim (lần/phút) */
  hr: number;
  /** huyết áp tâm thu / tâm trương (mmHg) */
  sys: number;
  dia: number;
  /** độ bão hòa oxy máu (%) */
  spo2: number;
  /** tổng máu đã mất (mL) */
  loss: number;
  /** thể tích còn thiếu (mL): bằng máu mất trừ phần dịch đã truyền bù; sinh hiệu đáp ứng theo phần thiếu này */
  deficit: number;
}
export const VITALS0: Vitals = {hr: 72, sys: 120, dia: 78, spo2: 98, loss: 0, deficit: 0};
/** truyền dịch bù khi đã cầm máu (mL/s, cùng thang thời gian phóng đại với tốc độ chảy máu) */
export const INFUSE = 25;
/**
 * Đáp ứng với mất máu theo bốn độ sốc mất máu (người lớn ~5 L máu): < 750 mL gần như không đổi; 750–1500 mL tim nhanh bù, huyết áp còn giữ;
 * 1500–2000 mL huyết áp tâm thu tụt; > 2000 mL tim rất nhanh, huyết áp thấp, SpO₂ giảm. Bảng [mất máu, nhịp tim, HA tâm thu, SpO₂].
 */
const SHOCK: [number, number, number, number][] = [
  [0, 72, 120, 98],
  [750, 96, 118, 98],
  [1500, 118, 104, 96],
  [2000, 136, 86, 93],
  [2600, 152, 64, 88],
];
export function vitalsGoal(loss: number): Omit<Vitals, 'loss' | 'deficit'> {
  const j = SHOCK.findIndex((r) => r[0] > loss);
  const i = j === -1 ? SHOCK.length - 1 : Math.max(1, j);
  const a = SHOCK[i - 1];
  const b = SHOCK[i];
  const t = Math.min(1, Math.max(0, (loss - a[0]) / (b[0] - a[0])));
  const hr = a[1] + (b[1] - a[1]) * t;
  const sys = a[2] + (b[2] - a[2]) * t;
  return {hr, sys, dia: sys * 0.65, spo2: a[3] + (b[3] - a[3]) * t};
}
/**
 * Một bước thời gian: máu mất theo `bleed` (mL/s); hết chảy thì truyền dịch bù phần thiếu (`INFUSE`). Chỉ số trôi dần về mức đáp ứng của phần thiếu
 * (hằng số thời gian vài giây, tim phản xạ nhanh hơn huyết áp).
 */
export function vitalsStep(v: Vitals, dt: number, bleed: number): Vitals {
  const b = Math.max(0, bleed);
  const loss = v.loss + b * dt;
  const deficit = b > 0 ? v.deficit + b * dt : Math.max(0, v.deficit - INFUSE * dt);
  const g = vitalsGoal(deficit);
  const k = (tau: number) => 1 - Math.exp(-dt / tau);
  return {loss, deficit, hr: v.hr + (g.hr - v.hr) * k(3), sys: v.sys + (g.sys - v.sys) * k(5), dia: v.dia + (g.dia - v.dia) * k(5), spo2: v.spo2 + (g.spo2 - v.spo2) * k(8)};
}
/** báo động của monitor: nhịp nhanh, tụt huyết áp, thiếu oxy */
export function alarms(v: Vitals): string[] {
  const out: string[] = [];
  if (v.hr > 110) out.push('Nhịp nhanh');
  if (v.sys < 90) out.push('Tụt huyết áp');
  if (v.spo2 < 94) out.push('SpO₂ thấp');
  return out;
}

// ------------------------------------------------------------------ bóc lớp
export interface Layer {
  id: string;
  name: string;
  fn: string;
  /** nút trong GLB */
  nodes: string[];
  /** chỗ lớp bay ra khi bóc hẳn (hệ cảnh: tim nằm ngửa, mặt trước lên +y, đáy tim về −z) */
  out: [number, number, number];
}
export const LAYERS: Layer[] = [
  {id: 'peri', name: 'Màng ngoài tim', fn: 'Túi hai lá bọc tim; giữa hai lá có ít dịch giúp tim co bóp không cọ xát, và giữ tim không giãn quá mức.', nodes: ['SH_peri'], out: [-2.2, 1.4, -0.8]},
  {id: 'cor', name: 'Mạch vành', fn: 'Động mạch vành (đỏ sẫm) đi trên mặt tim, nuôi chính cơ tim; tĩnh mạch tim (tím) đưa máu về. Tắc động mạch liên thất trước gây nhồi máu thành trước.', nodes: ['SH_lad', 'SH_cor'], out: [2.2, 1.2, -0.6]},
  {id: 'wall', name: 'Thành trước (cơ tim)', fn: 'Cơ tim co bóp tống máu; thành tâm thất trái dày gấp khoảng 3 lần thất phải vì bơm máu đi khắp cơ thể.', nodes: ['SH_wall_front'], out: [0, 1.2, -2.2]},
  {id: 'valves', name: 'Bốn van tim', fn: 'Van ba lá, van hai lá (nhĩ–thất, có dây chằng và cơ nhú) và hai van tổ chim (gốc động mạch chủ, động mạch phổi) giữ máu đi một chiều.', nodes: ['SH_valve_tri', 'SH_valve_mit', 'SH_valve_ao', 'SH_valve_pa'], out: [1.9, 0.9, 1.6]},
];
/** lớp bóc được lúc này: lớp ngoài cùng chưa bóc; `back` = lớp vừa bóc gần nhất (kéo về được để lắp lại) */
export function peelable(peeled: number): {next: number | null; back: number | null} {
  return {next: peeled < LAYERS.length ? peeled : null, back: peeled > 0 ? peeled - 1 : null};
}

// ------------------------------------------------------------------ phẫu thuật
export type SurgTool = 'scalpel' | 'clamp' | 'suction' | 'needle';
export const SURG_TOOLS: SurgTool[] = ['scalpel', 'clamp', 'suction', 'needle'];
export const SURG_NAME: Record<SurgTool, string> = {scalpel: 'Dao mổ', clamp: 'Kẹp cầm máu', suction: 'Ống hút', needle: 'Kim khâu'};
/** đường rạch màng ngoài tim (x, z trên mặt trước, hệ cảnh): dọc thất phải, song song và cách động mạch liên thất trước ~0,35 */
export const INCISION: [number, number][] = [[-0.55, -0.55], [-0.5, -0.15], [-0.42, 0.25], [-0.32, 0.65], [-0.18, 1.05], [-0.02, 1.38]];
/** tốc độ chảy máu khi đứt nhánh động mạch vành (mL/s). shortcut: phóng đại ~5 lần để thấy phản ứng sinh lí trong vài chục giây; mô phỏng thật thì hạ xuống */
export const NICK_BLEED = 22;
/** dịch màng ngoài tim tràn ra khi rạch hết (mL) */
export const PERI_FLUID = 40;
/** trường mổ còn quá lượng này (mL) thì phải hút trước khi làm tiếp */
export const FIELD_OK = 12;
/** ống hút: mL/s */
export const SUCTION_RATE = 45;

export interface SurgState {
  tool: SurgTool | null;
  /** tiến độ rạch 0–1 */
  incision: number;
  /** điểm đứt mạch (hệ cảnh), null = chưa biến chứng */
  nick: [number, number, number] | null;
  clamped: boolean;
  /** máu + dịch đọng trong trường mổ (mL) */
  field: number;
  /** phần máu trong dịch đọng (0–1): pha màu vũng */
  bloody: number;
  suture: number;
  vitals: Vitals;
  complications: number;
  warn: string;
}
export const newSurg = (): SurgState => ({tool: null, incision: 0, nick: null, clamped: false, field: 0, bloody: 0, suture: 0, vitals: VITALS0, complications: 0, warn: ''});
export type SurgStep = 'incise' | 'clamp' | 'suction' | 'suture' | 'done';
export function surgStep(s: SurgState): SurgStep {
  if (s.nick && !s.clamped) return 'clamp';
  if (s.field > FIELD_OK) return 'suction';
  if (s.incision < 1) return 'incise';
  if (s.suture < 1) return 'suture';
  return 'done';
}
export const STEP_TOOL: Record<Exclude<SurgStep, 'done'>, SurgTool> = {incise: 'scalpel', clamp: 'clamp', suction: 'suction', suture: 'needle'};
export const STEP_DO: Record<SurgStep, string> = {
  incise: 'Rạch màng ngoài tim theo vạch chấm',
  clamp: 'Kẹp cầm máu đúng chỗ mạch đứt',
  suction: 'Hút sạch máu và dịch trong trường mổ',
  suture: 'Khâu đóng màng ngoài tim dọc đường rạch',
  done: 'Ca mổ hoàn tất',
};
export const bleedRate = (s: SurgState) => (s.nick && !s.clamped ? NICK_BLEED : 0);

export type SAction =
  | {t: 'tool'; tool: SurgTool | null}
  | {t: 'cut'; s: number}
  | {t: 'nick'; at: [number, number, number]}
  | {t: 'clamp'; ok: boolean}
  | {t: 'suck'; dt: number}
  | {t: 'sew'; s: number}
  | {t: 'tick'; dt: number}
  | {t: 'wrong'; msg?: string}
  | {t: 'reset'};
export function surgReducer(s: SurgState, a: SAction): SurgState {
  const step = surgStep(s);
  switch (a.t) {
    case 'reset':
      return newSurg();
    case 'tool':
      return {...s, tool: a.tool, warn: ''};
    case 'tick': {
      const b = bleedRate(s);
      // máu chảy ra trường mổ: khoảng một phần tư đọng lại trong khoang ngực, còn lại thấm gạc / chảy theo ống dẫn lưu
      const add = b * a.dt * 0.25;
      const field = s.field + add;
      return {...s, vitals: vitalsStep(s.vitals, a.dt, b), field, bloody: field > 0 ? (s.bloody * s.field + add) / field : s.bloody};
    }
    case 'cut': {
      if (step !== 'incise' || s.tool !== 'scalpel') return s;
      const inc = Math.max(s.incision, Math.min(1, a.s));
      // rạch hết màng ngoài tim: dịch màng ngoài tim (trong, vàng nhạt) tràn ra trường mổ
      const field = inc >= 1 && s.incision < 1 ? s.field + PERI_FLUID : s.field;
      return {...s, incision: inc, field, bloody: field > 0 ? (s.bloody * s.field) / field : 0, warn: ''};
    }
    case 'nick':
      if (s.nick && !s.clamped) return s;
      return {...s, nick: a.at, clamped: false, complications: s.complications + 1, warn: 'Biến chứng: lưỡi dao chạm động mạch liên thất trước, máu phun theo nhịp tim! Đổi sang kẹp cầm máu và kẹp ngay chỗ đứt.'};
    case 'clamp':
      if (step !== 'clamp' || s.tool !== 'clamp') return s;
      return a.ok ? {...s, clamped: true, warn: ''} : {...s, warn: 'Kẹp trượt: phải kẹp đúng chỗ máu phun (vòng đỏ nhấp nháy).'};
    case 'suck':
      if (s.tool !== 'suction' || s.field <= 0) return s;
      return {...s, field: Math.max(0, s.field - SUCTION_RATE * a.dt)};
    case 'sew':
      if (step !== 'suture' || s.tool !== 'needle') return s;
      return {...s, suture: Math.max(s.suture, Math.min(1, a.s)), warn: ''};
    case 'wrong':
      return {...s, warn: a.msg ?? (step === 'done' ? '' : `Bước này cần ${SURG_NAME[STEP_TOOL[step]].toLowerCase()}: lấy ở khay Mayo bên phải.`)};
  }
}
/** nhận xét cuối ca: mất máu, số biến chứng */
export function debrief(s: SurgState): string {
  const ml = Math.round(s.vitals.loss);
  if (!s.complications) return `Ca mổ sạch: không chạm mạch vành, mất máu ${ml} mL. Đường rạch song song và cách xa động mạch liên thất trước là đúng kĩ thuật.`;
  return `Có ${s.complications} biến chứng chạm mạch vành, mất ${ml} mL máu${ml > 750 ? ' (đủ gây sốc mất máu độ II: tim nhanh bù trừ)' : ''}. Rạch đúng vạch, cách xa rãnh liên thất trước để tránh động mạch vành.`;
}
