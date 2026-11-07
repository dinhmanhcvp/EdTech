import {toleranceCurve} from './curve';
import type {P, PresetSpec} from './types';

/** Đỉnh 1 tại s = w (gamma-like), 0 khi s ≤ 0. */
export const bump = (s: number, w: number): number => (s <= 0 ? 0 : (s / w) * Math.exp(1 - s / w));

// ---- điện thế hoạt động: dạng mẫu (nghỉ −70 mV, ngưỡng −55 mV, đỉnh +30 mV, quá phân cực)
export const REST_MV = -70;
export const THRESHOLD_MV = -55;
const spike = (s: number) => (s <= 0 ? 0 : 2.76 * (Math.exp(-s / 0.7) - Math.exp(-s / 0.25)));
export function membranePotential(ms: number, stim: number): number {
  if (stim < THRESHOLD_MV - REST_MV) return REST_MV + stim * bump(ms - 1, 0.8);
  return REST_MV + 100 * spike(ms - 1) - 15 * bump(ms - 2, 1.2);
}

// ---- quang hợp theo cường độ ánh sáng (C3 bão hòa sớm, C4 muộn và cao hơn)
const photo = (i: number, pmax: number, k: number, rd: number) => pmax * (1 - Math.exp(-i / k)) - rd;
const compensation = (pmax: number, k: number, rd: number) => (rd >= pmax ? Infinity : -k * Math.log(1 - rd / pmax));

// ---- kháng thể sau tiêm
export function antibody(day: number, t2: number, boost: number): {first: number; total: number} {
  const first = bump(day - 8, 6);
  return {first, total: first + boost * bump(day - t2 - 2, 4)};
}

const f1 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 1});

export const SINH_CURVE_PRESETS: Record<string, PresetSpec> = {
  BIO_ENZYME_ACTIVITY: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Hoạt tính enzyme theo nhiệt độ',
    question:
      'Vì sao tốc độ phản ứng do enzyme xúc tác tăng theo nhiệt độ rồi giảm mạnh sau nhiệt độ tối ưu? Vì sao enzyme của vi khuẩn suối nước nóng lại có nhiệt độ tối ưu cao hơn nhiều?',
    keywords: /hoat tinh enzyme|enzyme (?:va )?(?:nhiet do|ph\b|co chat)|nhiet do (?:toi uu )?cua enzyme|bien tinh enzyme|enzyme bi bien tinh/,
    examples: ['hoạt tính enzyme', 'enzyme và nhiệt độ', 'nhiệt độ tối ưu của enzyme'],
    data: {
      xLabel: 'nhiệt độ (°C)',
      yLabel: 'tốc độ phản ứng (% mức cực đại)',
      xRange: [0, 90],
      yRange: [0, 105],
      params: [
        {key: 'topt', label: 'Nhiệt độ tối ưu của enzyme A', unit: '°C', min: 25, max: 60, step: 1, value: 37},
        {key: 'tden', label: 'Nhiệt độ làm enzyme A biến tính', unit: '°C', min: 45, max: 85, step: 1, value: 55},
      ],
      curves: [
        {id: 'a', label: 'Enzyme A (chỉnh bằng thanh trượt)', color: '#2563EB', fn: (x, p) => 100 * toleranceCurve(x, 0, p.topt, Math.max(p.tden, p.topt + 3))},
        {id: 'b', label: 'Enzyme B của vi khuẩn chịu nhiệt', color: '#E11D48', dashed: true, fn: (x) => 100 * toleranceCurve(x, 20, 70, 85)},
      ],
      readouts: [
        {label: 'Nhiệt độ tối ưu của A', value: (p: P) => `${f1(p.topt)} °C`},
        {label: 'A mất hoạt tính (biến tính) từ', value: (p: P) => `${f1(Math.max(p.tden, p.topt + 3))} °C`},
        {label: 'Nhiệt độ tối ưu của B', value: () => '70 °C'},
      ],
      note: 'Nhiệt độ tăng làm phân tử va chạm nhiều hơn nên phản ứng nhanh hơn, nhưng quá nhiệt độ tối ưu cấu trúc không gian của enzyme bị phá vỡ (biến tính).',
    },
  },

  BIO_LIGHT_COMPENSATION: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Điểm bù và điểm bão hòa ánh sáng',
    question:
      'Dưới điểm bù ánh sáng cây quang hợp được bao nhiêu so với hô hấp? Vì sao cây C₄ bão hòa ánh sáng muộn hơn và quang hợp mạnh hơn cây C₃ ở cường độ sáng cao?',
    keywords: /diem bu|diem bao hoa|thuc vat c ?[34]\b|cay c ?[34]\b|cuong do anh sang (?:va )?(?:quang hop|thuc vat)/,
    examples: ['điểm bù ánh sáng', 'điểm bão hòa ánh sáng', 'thực vật C3 và C4'],
    data: {
      xLabel: 'cường độ ánh sáng (% ánh sáng ngày nắng)',
      yLabel: 'cường độ quang hợp thực (đơn vị tương đối)',
      xRange: [0, 100],
      yRange: [-8, 40],
      params: [
        {key: 'pmax', label: 'Khả năng quang hợp tối đa của cây C₃', unit: '', min: 10, max: 30, step: 1, value: 20},
        {key: 'rd', label: 'Cường độ hô hấp', unit: '', min: 0, max: 6, step: 0.5, value: 3},
      ],
      curves: [
        {id: 'c3', label: 'Cây C₃', color: '#2563EB', fn: (x, p) => photo(x, p.pmax, 25, p.rd)},
        {id: 'c4', label: 'Cây C₄', color: '#059669', fn: (x, p) => photo(x, 1.8 * p.pmax, 45, p.rd)},
        {id: 'zero', label: 'Quang hợp = hô hấp (trục 0)', color: '#78716C', dashed: true, fn: () => 0},
      ],
      readouts: [
        {label: 'Điểm bù ánh sáng của C₃', value: (p: P) => `${f1(compensation(p.pmax, 25, p.rd))} %`},
        {label: 'Điểm bù ánh sáng của C₄', value: (p: P) => `${f1(compensation(1.8 * p.pmax, 45, p.rd))} %`},
        {label: 'Gần bão hòa (95 % mức tối đa) ở', value: () => 'C₃ ≈ 75 %; C₄ ≈ 135 % (chưa bão hòa trong khoảng vẽ)'},
      ],
      note: 'Dưới điểm bù, quang hợp nhỏ hơn hô hấp (giá trị âm). Mô hình mô phỏng định tính dạng đường cong, không phải số đo thực nghiệm.',
    },
  },

  BIO_IMMUNE_RESPONSE: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Đáp ứng miễn dịch nguyên phát và thứ phát (vaccine)',
    question:
      'Vì sao lần tiếp xúc kháng nguyên thứ hai tạo kháng thể nhanh hơn và nhiều hơn lần đầu? Điều đó giải thích vai trò của tiêm vaccine (và tiêm nhắc) như thế nào?',
    keywords: /dap ung mien dich|mien dich (?:nguyen phat|thu phat)|tiem nhac|tiem chung|vaccine|vac xin/,
    examples: ['đáp ứng miễn dịch thứ phát', 'tiêm nhắc lại vaccine', 'miễn dịch nguyên phát'],
    data: {
      xLabel: 'thời gian (ngày)',
      yLabel: 'nồng độ kháng thể (đơn vị tương đối)',
      xRange: [0, 90],
      yRange: [0, 12],
      params: [
        {key: 't2', label: 'Ngày tiêm / tiếp xúc lần 2', unit: 'ngày', min: 10, max: 70, step: 1, value: 35},
        {key: 'boost', label: 'Đáp ứng thứ phát mạnh gấp', unit: 'lần', min: 1, max: 10, step: 0.5, value: 5},
      ],
      curves: [
        {id: 'both', label: 'Tiêm hai lần', color: '#2563EB', fn: (x, p) => antibody(x, p.t2, p.boost).total},
        {id: 'one', label: 'Chỉ tiêm một lần', color: '#E11D48', dashed: true, fn: (x, p) => antibody(x, p.t2, p.boost).first},
      ],
      readouts: [
        {label: 'Đáp ứng nguyên phát xuất hiện sau', value: () => '7–10 ngày'},
        {label: 'Đáp ứng thứ phát xuất hiện sau', value: () => '2–3 ngày (nhờ tế bào nhớ)'},
        {label: 'Đỉnh thứ phát so với nguyên phát', value: (p: P) => `gấp ≈ ${f1(p.boost)} lần`},
      ],
      note: 'Lần đầu tiếp xúc tạo đáp ứng nguyên phát và tế bào nhớ; lần sau tế bào nhớ phản ứng nhanh hơn, mạnh hơn.',
    },
  },

  BIO_ACTION_POTENTIAL: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Điện thế hoạt động của neuron',
    question:
      'Vì sao kích thích dưới ngưỡng không gây xung thần kinh còn kích thích trên ngưỡng luôn cho xung có biên độ như nhau? Bao myelin giúp xung lan truyền nhanh hơn bằng cách nào?',
    keywords: /dien the hoat dong|dien the nghi|xung than kinh|action potential|bao myelin|khu cuc va tai phan cuc/,
    examples: ['điện thế hoạt động', 'điện thế nghỉ', 'xung thần kinh'],
    data: {
      xLabel: 'thời gian (ms)',
      yLabel: 'điện thế màng (mV)',
      xRange: [0, 8],
      yRange: [-95, 50],
      params: [
        {key: 'stim', label: 'Cường độ kích thích (làm màng tăng thêm)', unit: 'mV', min: 0, max: 40, step: 1, value: 25},
        {key: 'myelin', label: 'Sợi có bao myelin (0 = không, 1 = có)', unit: '', min: 0, max: 1, step: 1, value: 1},
      ],
      curves: [
        {id: 'v', label: 'Điện thế màng', color: '#2563EB', fn: (x, p) => membranePotential(x, p.stim)},
        {id: 'thr', label: 'Ngưỡng (−55 mV)', color: '#D97706', dashed: true, fn: () => THRESHOLD_MV},
        {id: 'rest', label: 'Điện thế nghỉ (−70 mV)', color: '#78716C', dashed: true, fn: () => REST_MV},
      ],
      readouts: [
        {label: 'Kết quả', value: (p: P) => (p.stim >= THRESHOLD_MV - REST_MV ? 'phát sinh xung, đỉnh ≈ +30 mV (luôn cùng biên độ)' : 'dưới ngưỡng: không phát sinh xung')},
        {label: 'Tốc độ lan truyền', value: (p: P) => (p.myelin >= 1 ? '≈ 120 m/s (nhảy cóc qua eo Ranvier)' : '≈ 3–5 m/s (lan truyền liên tiếp)')},
      ],
      note: 'Điện thế nghỉ: trong màng âm, ngoài dương. Khử cực → đảo cực → tái phân cực → trở về nghỉ. Đồ thị mô phỏng định tính.',
    },
  },

  BIO_POPULATION_GROWTH: {
    family: 'CURVE_LAB',
    engine: 'BIOLOGY',
    title: 'Tăng trưởng của quần thể (chữ J và chữ S)',
    question:
      'Khi nào quần thể tăng trưởng theo đường cong chữ J và vì sao trong thực tế thường chuyển sang chữ S? Sức chứa của môi trường (K) ảnh hưởng thế nào tới kích thước quần thể?',
    keywords: /tang truong (?:cua )?quan the|duong cong (?:chu )?(?:j|s)\b|logistic|suc chua (?:cua )?moi truong|tiem nang sinh hoc/,
    examples: ['tăng trưởng quần thể', 'đường cong chữ S', 'sức chứa của môi trường'],
    data: {
      xLabel: 'thời gian t (thế hệ)',
      yLabel: 'kích thước quần thể N (cá thể)',
      xRange: [0, 40],
      yRange: (p: P) => [0, 1.25 * p.K],
      params: [
        {key: 'r', label: 'Tốc độ tăng trưởng r', unit: '/thế hệ', min: 0.1, max: 1, step: 0.05, value: 0.4},
        {key: 'K', label: 'Sức chứa của môi trường K', unit: 'cá thể', min: 100, max: 1000, step: 50, value: 500},
        {key: 'N0', label: 'Kích thước ban đầu N₀', unit: 'cá thể', min: 1, max: 50, step: 1, value: 10},
      ],
      curves: [
        {id: 'j', label: 'Chữ J (điều kiện lí tưởng, N₀·e^(rt))', color: '#E11D48', dashed: true, fn: (x, p) => p.N0 * Math.exp(p.r * x)},
        {id: 's', label: 'Chữ S (có giới hạn nguồn sống)', color: '#2563EB', fn: (x, p) => p.K / (1 + ((p.K - p.N0) / p.N0) * Math.exp(-p.r * x))},
        {id: 'k', label: 'Sức chứa K', color: '#78716C', dashed: true, fn: (_x, p) => p.K},
      ],
      readouts: [
        {label: 'Điểm uốn của đường chữ S (N = K/2) tại t', value: (p: P) => (p.N0 >= p.K / 2 ? 'đã qua' : `${f1(Math.log((p.K - p.N0) / p.N0) / p.r)} thế hệ`)},
        {label: 'Tốc độ tăng cực đại (tại K/2)', value: (p: P) => `${f1((p.r * p.K) / 4)} cá thể/thế hệ`},
      ],
      note: 'Chữ J: nguồn sống vô hạn. Chữ S: tăng chậm → nhanh → chậm dần rồi dao động quanh sức chứa K.',
    },
  },
};
