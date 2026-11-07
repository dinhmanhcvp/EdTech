import type {P, PresetSpec} from './types';

const SET = 5;
const MEAL_AT = 20;
const TAU = 20;
const K0 = 0.002;
const K1 = 0.01;
const INS0 = 1;
const C = K1 * INS0 * SET + K0 * SET;
const GAIN = 0.5;

/** Glucose máu (mmol/L) lấy mẫu mỗi phút. `loop` = điều hòa ngược insulin–glucagon còn hoạt động. */
export function simulateGlucose(p: P, on: Record<string, boolean>): number[] {
  const out: number[] = [];
  const dt = 0.5;
  let g = SET;
  for (let t = 0; t <= 240 + 1e-9; t += dt) {
    if (Math.abs(t - Math.round(t)) < 1e-9) out.push(g);
    const meal = t >= MEAL_AT ? (p.meal / TAU) * Math.exp(-(t - MEAL_AT) / TAU) : 0;
    const ins = on.loop ? INS0 + p.sens * Math.max(0, g - SET) : 0;
    const glucagon = on.loop ? GAIN * Math.max(0, SET - g) : 0;
    const run = on.exercise && t >= 120 && t < 150 ? 0.18 * g : 0;
    g += dt * (C - K0 * g - K1 * ins * g + glucagon + meal - run);
    g = Math.min(30, Math.max(0.5, g));
  }
  return out;
}

export const FEEDBACK_PRESETS: Record<string, PresetSpec> = {
  BIO_FEEDBACK_LOOP: {
    family: 'FEEDBACK_SYSTEM',
    engine: 'BIOLOGY',
    title: 'Điều hòa glucose máu bằng liên hệ ngược',
    question:
      'Khi glucose máu tăng sau bữa ăn, bộ phận tiếp nhận, điều khiển và thực hiện nào hoạt động? Điều gì xảy ra với glucose máu nếu tuyến tụy không tiết đủ insulin?',
    keywords: /insulin|glucagon|duong huyet|glucose (?:mau|huyet)|lien he nguoc|dieu hoa nguoc|can bang noi moi|negative feedback|homeostasis/,
    examples: ['insulin glucagon', 'điều hòa glucose máu', 'cân bằng nội môi', 'liên hệ ngược'],
    data: {
      variable: {label: 'Glucose máu', unit: 'mmol/L', setpoint: SET, band: [3.9, 6.4], yRange: [0, 24]},
      params: [
        {key: 'meal', label: 'Lượng đường ăn vào (làm glucose tăng tối đa)', unit: 'mmol/L', min: 2, max: 12, step: 0.5, value: 6},
        {key: 'sens', label: 'Độ nhạy của tế bào với insulin', unit: '', min: 0.2, max: 3, step: 0.1, value: 1},
      ],
      toggles: [
        {key: 'loop', label: 'Điều hòa ngược insulin–glucagon hoạt động', value: true},
        {key: 'exercise', label: 'Chạy bộ (phút 120–150)', value: false},
      ],
      tMax: 240,
      dt: 1,
      timeUnit: 'phút',
      eventAt: MEAL_AT,
      eventLabel: 'bữa ăn',
      simulate: simulateGlucose,
      sense: 'Tế bào tuyến tụy nhận biết nồng độ glucose máu',
      states: {
        high: {control: 'Tế bào β đảo tụy tiết INSULIN', effect: 'Gan và cơ nhận glucose, gan tổng hợp glycogen dự trữ', result: 'Glucose máu giảm'},
        low: {control: 'Tế bào α đảo tụy tiết GLUCAGON', effect: 'Gan phân giải glycogen thành glucose đưa vào máu', result: 'Glucose máu tăng'},
        ok: {control: 'Tuyến tụy tiết cầm chừng', effect: 'Không cần điều chỉnh mạnh', result: 'Glucose giữ trong khoảng 3,9–6,4 mmol/L'},
      },
      note: 'Cân bằng nội môi là cân bằng động: giá trị dao động quanh điểm đặt nhờ liên hệ ngược. Tắt điều hòa ngược để thấy hậu quả khi tuyến tụy hỏng.',
    },
  },
};
