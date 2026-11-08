import {PHYS_EXPERIMENTS} from '../lab/phys/experiments';
import type {PresetSpec} from './types';

const WITH_PREFIX = /^(?:thí nghiệm|thực hành)/i;

/** Mỗi bài thực hành / thí nghiệm Lý là một preset mở thẳng phòng thực hành với bài đó. */
export const LY_LAB_PRESETS: Record<string, PresetSpec> = {
  ...Object.fromEntries(
    PHYS_EXPERIMENTS.map((e): [string, PresetSpec] => [
      `PHYS_LAB_${e.id}`,
      {
        family: 'PHYS_BENCH',
        engine: 'PHYSICS',
        title: `Thực hành: ${e.title}`,
        question: `Sau khi đo "${e.title}", kết quả của em có phù hợp lí thuyết trong phạm vi sai số không, và nguồn sai số chính là gì?`,
        keywords: new RegExp(`(?:thi nghiem|thuc hanh|lam thi nghiem).*(?:${e.keywords.source.replace(/(^|\|)(?:thuc hanh|thi nghiem) /g, '$1')})`),
        examples: e.examples.map((x) => (WITH_PREFIX.test(x) ? x : `thí nghiệm ${x}`)),
        data: {experiment: e.id},
      },
    ]),
  ),
  PHYS_LAB_BENCH: {
    family: 'PHYS_BENCH',
    engine: 'PHYSICS',
    title: 'Phòng thực hành Vật lí ảo: đo đạc, bảng số liệu, đồ thị và sai số',
    question: 'Khi đo cùng một đại lượng nhiều lần, vì sao các kết quả không giống nhau, và làm sao em ghi kết quả cùng sai số cho đúng?',
    keywords: /phong thuc hanh vat li ao|phong thi nghiem vat li ao|tiet thuc hanh vat li|thuc hanh vat li\b/,
    examples: ['phòng thực hành vật lí ảo', 'tiết thực hành vật lí', 'thực hành vật lí'],
    data: {experiment: PHYS_EXPERIMENTS[0].id},
  },
};
