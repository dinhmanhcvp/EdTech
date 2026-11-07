import {CHEM_EXPERIMENTS} from '../lab/chem/experiments';
import type {PresetSpec} from './types';

const WITH_PREFIX = /^(?:thí nghiệm|thực hành)/i;

/** Mỗi bài thí nghiệm Hóa là một preset mở thẳng giá thí nghiệm với bài đó; từ khóa luôn đi kèm "thí nghiệm/thực hành". */
export const HOA_LAB_PRESETS: Record<string, PresetSpec> = {
  CHEM_LAB_BENCH: {
    family: 'CHEM_BENCH',
    engine: 'CHEMISTRY',
    title: 'Phòng thí nghiệm Hóa học ảo: giá ống nghiệm, kệ hóa chất và nhật kí hiện tượng',
    question: 'Khi trộn các chất với nhau, hiện tượng nào cho biết đã có phản ứng xảy ra, và em viết được phương trình hóa học nào để giải thích?',
    keywords: /phong thi nghiem hoa (?:hoc )?ao|phong thuc hanh hoa|thuc hanh hoa hoc|tiet thuc hanh hoa/,
    examples: ['phòng thí nghiệm hóa học ảo', 'thực hành hóa học', 'tiết thực hành hóa'],
    data: {experiment: null},
  },
  ...Object.fromEntries(
    CHEM_EXPERIMENTS.map((e): [string, PresetSpec] => [
      `CHEM_LAB_${e.id}`,
      {
        family: 'CHEM_BENCH',
        engine: 'CHEMISTRY',
        title: `Thực hành: ${e.title}`,
        question: `Quan sát thí nghiệm "${e.title}": hiện tượng nào xảy ra và em giải thích bằng phương trình hóa học nào?`,
        keywords: e.keywords.source.startsWith('thi nghiem') ? e.keywords : new RegExp(`(?:thi nghiem|thuc hanh|lam thi nghiem).*(?:${e.keywords.source})`),
        examples: e.examples.map((x) => (WITH_PREFIX.test(x) ? x : `thí nghiệm ${x}`)),
        data: {experiment: e.id},
      },
    ]),
  ),
};
