/** Phòng thí nghiệm Hóa ảo: mô hình theo loài (ion, phân tử, chất rắn, khí) và luật phản ứng. */
export type Phase = 'aq' | 's' | 'l' | 'g';

export interface SpeciesInfo {
  name: string;
  phase: Phase;
  /** màu khi hòa tan (aq) hoặc màu chất rắn/lỏng */
  color?: string;
  /** pH của dung dịch bão hòa/chất (dùng khi không có acid hoặc base mạnh dư) */
  ph?: number;
  smell?: string;
  /** hệ số tăng tốc (chất rắn dạng bột, đá vôi nhỏ…) */
  speed?: number;
  /** là chất làm đục (kết tủa keo, huyền phù) */
  turbid?: boolean;
  /** nồng độ tối thiểu (M) để ph có tác dụng */
  phMinConc?: number;
  /** ion hay phân tử tham gia dẫn điện: điện tích tuyệt đối */
  charge?: number;
}

export type Kind = 'solution' | 'solid' | 'liquid' | 'indicator';
export interface Substance {
  id: string;
  label: string;
  formula: string;
  kind: Kind;
  /** loài tạo ra trên 1 mol công thức */
  species: Record<string, number>;
  /** mol/L (dung dịch) */
  conc?: number;
  /** g/mol (chất rắn), g/mL và g/mol (chất lỏng nguyên chất) */
  molar?: number;
  density?: number;
  /** lượng thêm một lần: mL cho dung dịch/lỏng, g cho chất rắn */
  amounts: {label: string; value: number}[];
  group: string;
  hazard?: string;
}

export interface Rule {
  id: string;
  reactants: Record<string, number>;
  products: Record<string, number>;
  eq: string;
  /** hiện tượng ghi vào nhật kí khi phản ứng bắt đầu */
  text?: string;
  /** thứ tự xét (nhỏ trước); mặc định 5 */
  priority?: number;
  /** hằng số tốc độ (1/s) ở 25 °C với nồng độ chuẩn 0,1 M; không có = tức thời */
  k?: number;
  /** loài aq làm tốc độ phụ thuộc nồng độ (so với 0,1 M) */
  rateSpecies?: string[];
  /** cần nhiệt độ tối thiểu (°C) */
  minTemp?: number;
  needsLight?: boolean;
  /** cần có chất lỏng (hòa tan, phản ứng với nước) */
  wet?: boolean;
  /** chất xúc tác/điều kiện: phải có mặt, không bị tiêu thụ */
  catalysts?: string[];
  /** hệ số làm tăng tốc khi có xúc tác */
  /** nhiệt phản ứng, kJ trên mỗi mol tiến độ (âm = tỏa nhiệt) */
  heat?: number;
}

export interface Vessel {
  id: string;
  kind: 'tube' | 'beaker';
  capacityMl: number;
  moles: Record<string, number>;
  liquidMl: number;
  /** phần nước (dung dịch, chất chỉ thị) */
  waterMl: number;
  temp: number;
  t: number;
  /** khí sinh ra trong bước gần nhất (mol/s) */
  gasRate: number;
  /** lần đầu rule nổ: để ghi nhật kí không lặp */
  fired: string[];
  light: boolean;
  /** thời điểm (giây) lần đầu đục */
  turbidAt: number | null;
  log: string[];
}

export interface Action {
  type: 'add' | 'heat' | 'wait' | 'discard' | 'transferGas' | 'light' | 'goggles' | 'reset';
  v?: number;
  to?: number;
  sub?: string;
  amount?: number;
  seconds?: number;
  on?: boolean;
}

export interface LabState {
  vessels: Vessel[];
  added: string[];
  goggles: boolean;
  violations: string[];
  log: {t: number; v: number; text: string}[];
  clock: number;
}

export interface Derived {
  color: string;
  colorAlpha: number;
  precipitates: {species: string; name: string; color: string; mol: number}[];
  turbidity: number;
  bubbles: number;
  ph: number | null;
  temp: number;
  volumeMl: number;
  smell: string[];
  conducts: number;
  species: string[];
}

export interface CheckCtx {
  state: LabState;
  d: Derived[];
  added: (id: string) => boolean;
  seen: (text: string) => boolean;
  has: (v: number, species: string) => boolean;
}
export interface Experiment {
  id: string;
  lesson: string;
  title: string;
  goal: string;
  hazards: string[];
  steps: {text: string; done: (c: CheckCtx) => boolean}[];
  questions: {q: string; options: string[]; answer: number; why: string}[];
  /** câu hỏi định tuyến */
  keywords: RegExp;
  examples: string[];
  /** thao tác mẫu hoàn thành bài (dùng cho kiểm thử và nút "xem mẫu") */
  script: Action[];
  shelf?: string[];
}
