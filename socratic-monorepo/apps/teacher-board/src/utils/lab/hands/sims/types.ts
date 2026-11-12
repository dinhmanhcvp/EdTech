/** Khung chung cho các bài mô phỏng điều khiển bằng thanh trượt 3D trong phòng thực hành tay. Logic thuần. */
export interface SimParam {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  init: number;
  /** thang lôgarit (áp suất, tần số…) */
  log?: boolean;
  digits?: number;
}
export type Values = Record<string, number>;
export interface Verdict {
  ok: boolean;
  head: string;
  lines: string[];
}
export interface SimSpec {
  id: string;
  name: string;
  task: string;
  params: SimParam[];
  /** đánh giá thuần theo giá trị các thanh trượt */
  evaluate: (v: Values) => Verdict;
  /** bộ giá trị cho kết quả đạt (dùng cho nút "Đặt mẫu" và test) */
  solution: Values;
}
export const fromUnit = (p: SimParam, t: number): number => (p.log ? p.min * (p.max / p.min) ** t : p.min + (p.max - p.min) * t);
export const toUnit = (p: SimParam, x: number): number => Math.min(1, Math.max(0, p.log ? Math.log(x / p.min) / Math.log(p.max / p.min) : (x - p.min) / (p.max - p.min)));
export const initial = (s: SimSpec): Values => Object.fromEntries(s.params.map((p) => [p.id, p.init]));
export const fmt = (p: SimParam, x: number): string => `${(x !== 0 && Math.abs(x) < 0.01) ||Math.abs(x) >= 1e4 ? x.toExponential(1) : x.toFixed(p.digits ?? (Math.abs(x) >= 100 ? 0 : 1))} ${p.unit}`.trim();
