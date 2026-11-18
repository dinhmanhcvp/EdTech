import {describe, expect, it} from 'vitest';
import {CHEM_EXPERIMENTS} from '../utils/lab/chem/experiments';
import {BIO_EXPERIMENTS} from '../utils/lab/bio/experiments';
import {CHEM_LAB_QUESTIONS} from '../utils/presets/hoaLab';
import {BIO_LAB_QUESTIONS} from '../utils/presets/sinhLab';
import {PRESETS} from '../utils/presets';

// Câu hỏi bài lab phải buộc vào lượt làm của chính học sinh (dự đoán → kết quả của em → phản biện) để không chép đi hỏi máy được
describe('câu hỏi Socratic của bài thực hành', () => {
  const cases: [string, string, Record<string, string>, {id: string}[]][] = [
    ['Hóa', 'CHEM_LAB_', CHEM_LAB_QUESTIONS, CHEM_EXPERIMENTS],
    ['Sinh', 'BIO_LAB_', BIO_LAB_QUESTIONS, BIO_EXPERIMENTS],
  ];
  for (const [name, prefix, qs, exps] of cases) {
    it(`mọi bài ${name} có câu riêng ba nhịp và preset dùng đúng câu đó`, () => {
      expect(Object.keys(qs).sort()).toEqual(exps.map((e) => e.id).sort());
      for (const e of exps) {
        const q = qs[e.id];
        expect(q, e.id).toMatch(/^Trước khi/);
        expect(q, e.id).toMatch(/Sau khi/);
        expect(q, e.id).toMatch(/của em|em thấy|em đo|em thu|em đọc/);
        expect(PRESETS[prefix + e.id].question).toBe(q);
      }
      expect(new Set(Object.values(qs)).size).toBe(exps.length);
    });
  }

  it('mọi mô phỏng của bảng cũng hỏi ba nhịp (trừ ba phòng tự do), không câu nào trùng', () => {
    const sims = Object.entries(PRESETS).filter(([id]) => !/_LAB_BENCH$/.test(id));
    for (const [id, s] of sims) {
      expect(s.question, id).toMatch(/^Trước khi/);
      expect(s.question, id).toMatch(/Sau khi/);
    }
    expect(new Set(sims.map(([, s]) => s.question)).size).toBe(sims.length);
  });
});
