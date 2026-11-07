import type {PresetSpec, P} from './types';

/** Hàm đáp ứng dạng chuông lệch (Yan–Hunt): 0 ở Tmin và Tmax, 1 tại Topt. */
export function toleranceCurve(x: number, tmin: number, topt: number, tmax: number): number {
  if (x <= tmin || x >= tmax) return 0;
  const a = (topt - tmin) / (tmax - topt);
  return ((tmax - x) / (tmax - topt)) * Math.pow((x - tmin) / (topt - tmin), a);
}

/** Đoạn [lo, hi] mà hàm ≥ ngưỡng (quét lưới 0,1). */
export function favourableRange(f: (x: number) => number, from: number, to: number, level: number): [number, number] | null {
  let lo: number | null = null;
  let hi: number | null = null;
  for (let x = from; x <= to + 1e-9; x += 0.1) {
    if (f(x) >= level) {
      if (lo === null) lo = x;
      hi = x;
    }
  }
  return lo === null || hi === null ? null : [lo, hi];
}

const fmt1 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 1});

export const CURVE_PRESETS: Record<string, PresetSpec> = {
  BIO_ECOLOGICAL_LIMITS: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Giới hạn sinh thái',
    question:
      'Vì sao ngoài khoảng thuận lợi mức hoạt động sinh lí giảm dần rồi về 0 ở điểm gây chết? Loài có giới hạn sinh thái rộng và loài có giới hạn hẹp khác nhau thế nào về vùng phân bố?',
    keywords: /gioi han sinh thai|khoang thuan loi|diem gay chet|khoang uc che|ecological (?:tolerance|limit)/,
    examples: ['giới hạn sinh thái', 'khoảng thuận lợi và điểm gây chết', 'giới hạn sinh thái của nhiệt độ'],
    data: {
      xLabel: 'nhiệt độ (°C)',
      yLabel: 'mức hoạt động sinh lí (%)',
      xRange: [0, 50],
      yRange: [0, 105],
      params: [
        {key: 'tmin', label: 'Điểm gây chết dưới', unit: '°C', min: 0, max: 20, step: 1, value: 10},
        {key: 'topt', label: 'Điểm cực thuận', unit: '°C', min: 22, max: 38, step: 1, value: 30},
        {key: 'tmax', label: 'Điểm gây chết trên', unit: '°C', min: 40, max: 50, step: 1, value: 42},
      ],
      curves: [
        {id: 'a', label: 'Loài A (chỉnh bằng thanh trượt)', color: '#2563EB', fn: (x, p) => 100 * toleranceCurve(x, p.tmin, p.topt, p.tmax)},
        {id: 'b', label: 'Loài B (giới hạn hẹp, cố định)', color: '#E11D48', dashed: true, fn: (x) => 100 * toleranceCurve(x, 20, 27, 33)},
      ],
      readouts: [
        {label: 'Giới hạn sinh thái của A', value: (p: P) => `${fmt1(p.tmin)}–${fmt1(p.tmax)} °C (rộng ${fmt1(p.tmax - p.tmin)} °C)`},
        {
          label: 'Khoảng thuận lợi của A (≥ 50 %)',
          value: (p: P) => {
            const r = favourableRange((x) => 100 * toleranceCurve(x, p.tmin, p.topt, p.tmax), 0, 50, 50);
            return r ? `${fmt1(r[0])}–${fmt1(r[1])} °C` : 'không có';
          },
        },
        {label: 'Giới hạn sinh thái của B', value: () => '20–33 °C (rộng 13 °C)'},
      ],
      note: 'Khoảng thuận lợi: hoạt động sinh lí tốt; hai bên là khoảng ức chế; ngoài điểm gây chết sinh vật không sống được.',
    },
  },

  PHYS_RADIOACTIVE_DECAY: {
    family: 'CURVE_LAB',
    engine: 'PHYSICS',
    title: 'Phân rã phóng xạ và chu kì bán rã',
    question:
      'Sau mỗi chu kì bán rã lượng chất phóng xạ còn lại giảm một nửa: tại sao đường cong không bao giờ chạm trục thời gian? Muốn tính tuổi mẫu vật bằng C-14 ta cần biết những đại lượng nào?',
    keywords: /chu k[yi] ban ra|phan ra phong xa|dinh tuoi (?:bang )?(?:c-?14|carbon)|carbon-?14|\bc-?14\b|radioactive decay|half-?life/,
    examples: ['chu kì bán rã', 'phân rã phóng xạ', 'định tuổi bằng carbon-14'],
    data: {
      xLabel: 'thời gian t (năm)',
      yLabel: 'tỉ lệ so với ban đầu (%)',
      xRange: (p: P) => [0, 6 * p.T],
      yRange: [0, 105],
      params: [
        {key: 'T', label: 'Chu kì bán rã T', unit: 'năm', min: 1, max: 12000, step: 1, value: 5730},
        {key: 'r', label: 'Tỉ lệ còn lại cần định tuổi', unit: '%', min: 1, max: 100, step: 1, value: 25},
      ],
      curves: [
        {id: 'left', label: 'Chất phóng xạ còn lại N/N₀', color: '#2563EB', fn: (x, p) => 100 * Math.pow(2, -x / p.T)},
        {id: 'gone', label: 'Đã phân rã', color: '#E11D48', dashed: true, fn: (x, p) => 100 - 100 * Math.pow(2, -x / p.T)},
      ],
      readouts: [
        {label: 'Sau 1T, 2T, 3T còn lại', value: () => '50 %, 25 %, 12,5 %'},
        {label: 'Tuổi mẫu khi còn lại r %', value: (p: P) => `${Math.round(p.T * Math.log2(100 / p.r)).toLocaleString('vi-VN')} năm`},
      ],
      note: 'N(t) = N₀·2^(−t/T). C-14 có T ≈ 5730 năm nên đo được tuổi mẫu hữu cơ cỡ vài chục nghìn năm.',
    },
  },
};
