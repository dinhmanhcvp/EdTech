import type {P, PresetSpec, S} from './types';

const rollDie = (rng: () => number) => 1 + Math.floor(rng() * 6);

/** Xác suất tổng hai xúc xắc bằng s (2..12). */
export const sumProb = (s: number) => (6 - Math.abs(s - 7)) / 36;
/** Bayes: P(bệnh | dương tính). */
export function bayes(prev: number, sens: number, spec: number): number {
  const pos = prev * sens + (1 - prev) * (1 - spec);
  return pos === 0 ? 0 : (prev * sens) / pos;
}

export const TOAN_TRIAL_PRESETS: Record<string, PresetSpec> = {
  MATH_PROBABILITY_LAB: {
    family: 'TRIAL_LAB',
    engine: 'MATH',
    title: 'Phòng thí nghiệm xác suất: tần suất, luật số lớn, Monty Hall, Bayes',
    question: 'Vì sao tần suất quan sát dao động mạnh khi ít lần thử nhưng tiến gần xác suất lí thuyết khi thử rất nhiều lần? Đổi cửa trong trò Monty Hall có lợi hơn giữ nguyên không?',
    keywords: /xac suat|luat so lon|tan suat|monty hall|cong thuc bayes|bien co doc lap|tung (?:dong xu|xuc xac)|lay bi/,
    examples: ['xác suất', 'luật số lớn', 'tung đồng xu và xúc xắc', 'Monty Hall', 'công thức Bayes'],
    data: {
      choices: [
        {key: 'exp', label: 'Thí nghiệm', value: 'coin', options: [['coin', 'Tung đồng xu'], ['die', 'Tung xúc xắc'], ['sum', 'Tổng hai xúc xắc'], ['urn', 'Lấy bi từ túi'], ['monty', 'Monty Hall'], ['bayes', 'Xét nghiệm bệnh (Bayes)']]},
        {key: 'strategy', label: 'Monty Hall: chiến lược', value: 'switch', options: [['switch', 'Đổi cửa'], ['stay', 'Giữ nguyên']], when: ['exp', ['monty']]},
      ],
      sliders: [
        {key: 'p', label: 'Đồng xu: P(sấp) · Túi: tỉ lệ bi đỏ', min: 0.05, max: 0.95, step: 0.05, value: 0.5, when: ['exp', ['coin', 'urn']]},
        {key: 'prev', label: 'Tỉ lệ người mắc bệnh', min: 0.001, max: 0.2, step: 0.001, value: 0.01, when: ['exp', ['bayes']]},
        {key: 'sens', label: 'Độ nhạy của xét nghiệm', min: 0.5, max: 1, step: 0.01, value: 0.95, when: ['exp', ['bayes']]},
        {key: 'spec', label: 'Độ đặc hiệu', min: 0.5, max: 1, step: 0.01, value: 0.9, when: ['exp', ['bayes']]},
      ],
      outcomes: (_p: P, s: S) => {
        switch (s.exp) {
          case 'die': return [1, 2, 3, 4, 5, 6].map((k) => ({label: `Mặt ${k}`, color: '#2563EB'}));
          case 'sum': return Array.from({length: 11}, (_, i) => ({label: `Tổng ${i + 2}`, color: '#7C3AED'}));
          case 'urn': return [{label: 'Bi đỏ', color: '#E11D48'}, {label: 'Bi xanh', color: '#2563EB'}];
          case 'monty': return [{label: 'Trúng xe', color: '#16A34A'}, {label: 'Trượt (dê)', color: '#A8A29E'}];
          case 'bayes': return [{label: 'Dương tính và có bệnh', color: '#E11D48'}, {label: 'Dương tính nhưng không bệnh', color: '#EA580C'}];
          default: return [{label: 'Sấp', color: '#2563EB'}, {label: 'Ngửa', color: '#EA580C'}];
        }
      },
      theory: (p: P, s: S) => {
        switch (s.exp) {
          case 'die': return Array(6).fill(1 / 6);
          case 'sum': return Array.from({length: 11}, (_, i) => sumProb(i + 2));
          case 'urn': return [p.p, 1 - p.p];
          case 'monty': return s.strategy === 'switch' ? [2 / 3, 1 / 3] : [1 / 3, 2 / 3];
          case 'bayes': {
            const post = bayes(p.prev, p.sens, p.spec);
            return [post, 1 - post];
          }
          default: return [p.p, 1 - p.p];
        }
      },
      trial: (rng, p, s) => {
        switch (s.exp) {
          case 'die': return rollDie(rng) - 1;
          case 'sum': return rollDie(rng) + rollDie(rng) - 2;
          case 'urn': return rng() < p.p ? 0 : 1;
          case 'monty': {
            const car = Math.floor(rng() * 3);
            const pick = Math.floor(rng() * 3);
            // chủ trò luôn mở một cửa dê khác cửa chọn: đổi cửa thắng khi lúc đầu chọn sai
            const win = s.strategy === 'switch' ? pick !== car : pick === car;
            return win ? 0 : 1;
          }
          case 'bayes': {
            // chỉ ghi nhận người DƯƠNG TÍNH: lặp tới khi có một ca dương tính
            for (let i = 0; i < 100000; i++) {
              const sick = rng() < p.prev;
              const positive = rng() < (sick ? p.sens : 1 - p.spec);
              if (positive) return sick ? 0 : 1;
            }
            return 1;
          }
          default: return rng() < p.p ? 0 : 1;
        }
      },
      unit: 'lần thử',
      note: 'Luật số lớn: tần suất → xác suất khi số lần thử tăng. Monty Hall: đổi cửa thắng 2/3. Bayes: người dương tính chưa chắc mắc bệnh nếu bệnh hiếm.',
    },
  },
};
