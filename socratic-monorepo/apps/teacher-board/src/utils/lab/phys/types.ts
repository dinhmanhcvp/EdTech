import type {P, PresetParam, S, Shape} from '../../presets/types';

export type Row = Record<string, number>;

export interface Col {
  key: string;
  label: string;
  unit?: string;
  digits?: number;
}

export interface Result {
  key: string;
  label: string;
  value: number;
  unit?: string;
  digits?: number;
}

export interface PhysState {
  p: P;
  s: S;
  rows: Row[];
  /** số lần đã đo (dùng làm hạt giống nhiễu: mỗi lần đo cho số khác nhau nhưng lặp lại được) */
  count: number;
}

export type PhysAction =
  | {type: 'set'; key: string; value: number}
  | {type: 'choose'; key: string; value: string}
  | {type: 'measure'}
  | {type: 'delete'; i: number}
  | {type: 'clear'};

export interface PhysCtx {
  rows: Row[];
  p: P;
  s: S;
  results: Record<string, number>;
  distinct: (key: string) => number;
}

export interface PhysExperiment {
  id: string;
  lesson: string;
  title: string;
  goal: string;
  hazards: string[];
  /** dụng cụ cần dùng, hiển thị cho học sinh */
  apparatus: string;
  sliders: PresetParam[];
  choices?: {key: string; label: string; options: [string, string][]; value: string}[];
  /** để trống = bài không đo (ví dụ an toàn phòng thực hành) */
  columns: Col[];
  /** một lần đo: giá trị thật cộng nhiễu ngẫu nhiên, làm tròn theo độ chia nhỏ nhất của dụng cụ */
  measure: (p: P, s: S, rng: () => number, n: number) => Row;
  viewBox: [number, number];
  scene: (p: P, s: S, last: Row | null) => Shape[];
  results: (rows: Row[], p: P, s: S) => Result[];
  chart?: {x: string; y: string; xLabel: string; yLabel: string; fit: boolean};
  /** nhận xét kết quả so với giá trị chuẩn (chỉ hiện khi học sinh bấm kiểm tra) */
  verdict: (c: PhysCtx) => {ok: boolean; text: string};
  steps: {text: string; done: (c: PhysCtx) => boolean}[];
  questions: {q: string; options: string[]; answer: number; why: string}[];
  keywords: RegExp;
  examples: string[];
  /** thao tác mẫu: dùng cho kiểm thử và nút "Xem thao tác mẫu" */
  script: PhysAction[];
}
