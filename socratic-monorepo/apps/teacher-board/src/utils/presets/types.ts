import type {CurriculumLevel, SimulationBlueprint} from '@socratic/types';

/**
 * Preset = một mô phỏng mới khai báo bằng DỮ LIỆU, dùng chung một họ engine (engines/families).
 * Thêm mô phỏng: viết một PresetSpec trong utils/presets/<họ>.ts; định tuyến, widget, hướng dẫn và kiểm thử tự nhận.
 */
export type P = Record<string, number>;

export interface PresetParam {
  key: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** chỉ hiện khi lựa chọn S[khóa] nằm trong danh sách */
  when?: [string, string[]];
}

// ---------------------------------------------------------------- CURVE_LAB
export interface CurveData {
  xLabel: string;
  yLabel: string;
  xRange: [number, number] | ((p: P) => [number, number]);
  yRange: [number, number] | ((p: P) => [number, number]);
  params: PresetParam[];
  curves: {id: string; label: string; color: string; fn: (x: number, p: P) => number; dashed?: boolean}[];
  readouts?: {label: string; value: (p: P) => string}[];
  note?: string;
}

// ---------------------------------------------------------------- ANATOMY_FLOW
export interface AnatomyPart {
  id: string;
  label: string;
  /** đường SVG; bộ phận dạng ống chỉ có stroke */
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  labelAt: [number, number];
  title: string;
  body: string;
  facts?: [string, string][];
}
export interface AnatomyData {
  viewBox: [number, number];
  parts: AnatomyPart[];
  /** đường chảy có hạt chuyển động (thức ăn, máu, khí...) */
  flow?: {label: string; d: string; color: string};
  /** thứ tự các bộ phận khi bấm "đi theo" */
  tour?: string[];
  note?: string;
}

// ---------------------------------------------------------------- PROCESS_STEPS
export interface ProcessFrame {
  at: number;
  x: number;
  y: number;
  o?: number;
  label?: string;
  fill?: string;
}
export interface ProcessItem {
  id: string;
  kind: 'rect' | 'circle' | 'pill' | 'text';
  w?: number;
  h?: number;
  r?: number;
  fill: string;
  stroke?: string;
  label?: string;
  /** trạng thái từ bước `at` trở đi (giữ nguyên tới khung kế); trước khung đầu vật ẩn */
  frames: ProcessFrame[];
}
export interface ProcessData {
  viewBox: [number, number];
  steps: {title: string; body: string}[];
  items: ProcessItem[];
  note?: string;
}

// ---------------------------------------------------------------- FEEDBACK_SYSTEM
export type Phase = 'high' | 'ok' | 'low';
export interface FeedbackData {
  variable: {label: string; unit: string; setpoint: number; band: [number, number]; yRange: [number, number]};
  params: PresetParam[];
  toggles: {key: string; label: string; value: boolean}[];
  tMax: number;
  dt: number;
  timeUnit: string;
  eventAt: number;
  eventLabel: string;
  /** chuỗi giá trị lấy mẫu mỗi `dt`, độ dài tMax/dt + 1 */
  simulate: (p: P, on: Record<string, boolean>) => number[];
  sense: string;
  states: Record<Phase, {control: string; effect: string; result: string}>;
  note?: string;
}

// ---------------------------------------------------------------- điều khiển chung (SCENE_LAB, TRIAL_LAB)
export type S = Record<string, string>;
export interface Controls {
  /** thanh trượt: giá trị số trong P */
  sliders?: PresetParam[];
  /** công tắc: 1/0 trong P */
  toggles?: {key: string; label: string; value: boolean; when?: [string, string[]]}[];
  /** chọn một: chuỗi trong S */
  choices?: {key: string; label: string; options: [string, string][]; value: string; when?: [string, string[]]}[];
  /** ô nhập chữ: chuỗi trong S */
  texts?: {key: string; label: string; value: string; maxLength?: number}[];
}

// ---------------------------------------------------------------- SCENE_LAB
export type Shape =
  | {t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke?: string; w?: number; dash?: string; arrow?: boolean}
  | {t: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; w?: number; o?: number}
  | {t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; rx?: number; o?: number}
  | {t: 'poly'; pts: [number, number][]; fill?: string; stroke?: string; w?: number; close?: boolean; dash?: string; o?: number}
  | {t: 'path'; d: string; fill?: string; stroke?: string; w?: number; dash?: string; o?: number}
  | {t: 'text'; x: number; y: number; s: string; size?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; bold?: boolean; rot?: number};

export interface SceneData extends Controls {
  viewBox: [number, number];
  /** có `time` thì hiện nút chạy và thanh thời gian; draw nhận t (giây mô phỏng) */
  time?: {max: number; loop?: boolean; autoplay?: boolean; label?: string; unit?: string};
  /** hàm thuần: cùng (p, t, s) cho cùng hình */
  draw: (p: P, t: number, s: S) => Shape[];
  readouts?: {label: string; value: (p: P, t: number, s: S) => string}[];
  note?: string;
}

// ---------------------------------------------------------------- TRIAL_LAB
export interface TrialData extends Controls {
  outcomes: (p: P, s: S) => {label: string; color: string}[];
  /** xác suất lí thuyết, cùng thứ tự outcomes, tổng 1 */
  theory: (p: P, s: S) => number[];
  /** một lần thử → chỉ số kết quả; rng() ∈ [0,1) */
  trial: (rng: () => number, p: P, s: S) => number;
  unit: string;
  note?: string;
}

// ---------------------------------------------------------------- TABLE_LAB
export interface TableCell {
  id: string;
  label: string;
  sub?: string;
  row: number;
  col: number;
  group: string;
  title: string;
  body?: string;
  props?: Record<string, number | string>;
}
export interface TableData {
  cols: number;
  rows: number;
  groups: {id: string; label: string; color: string}[];
  /** thuộc tính số để tô màu theo gradient; mặc định tô theo nhóm */
  propDefs: {key: string; label: string; unit?: string; numeric?: boolean}[];
  cells: TableCell[];
  /** ô nhỏ (chữ ô nhỏ hơn) cho bảng dày như bảng mã 16×4 */
  dense?: boolean;
  note?: string;
}

// ---------------------------------------------------------------- CHEM_BENCH
export interface BenchData {
  /** mã bài thí nghiệm mở sẵn; null = tự do */
  experiment: string | null;
}

// ---------------------------------------------------------------- khai báo chung
interface Base {
  engine: SimulationBlueprint['engine'];
  title: string;
  question: string;
  level?: CurriculumLevel;
  /** viết trên chuỗi đã bỏ dấu, chữ thường */
  keywords: RegExp;
  /** câu mẫu: phải mở đúng mô phỏng; được kiểm tự động */
  examples: string[];
}
export type PresetSpec =
  | (Base & {family: 'CURVE_LAB'; data: CurveData})
  | (Base & {family: 'ANATOMY_FLOW'; data: AnatomyData})
  | (Base & {family: 'PROCESS_STEPS'; data: ProcessData})
  | (Base & {family: 'FEEDBACK_SYSTEM'; data: FeedbackData})
  | (Base & {family: 'SCENE_LAB'; data: SceneData})
  | (Base & {family: 'TRIAL_LAB'; data: TrialData})
  | (Base & {family: 'TABLE_LAB'; data: TableData})
  | (Base & {family: 'CHEM_BENCH'; data: BenchData});
export type PresetFamily = PresetSpec['family'];
