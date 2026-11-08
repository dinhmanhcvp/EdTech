import {BIO_EXPERIMENTS} from '../lab/bio/experiments';
import type {PresetSpec} from './types';

const WITH_PREFIX = /^(?:thí nghiệm|thực hành)/i;

/** Mỗi bài thực hành Sinh là một preset mở phòng thực hành (dùng chung giao diện PHYS_BENCH) với bài đó. */
export const SINH_LAB_PRESETS: Record<string, PresetSpec> = {
  ...Object.fromEntries(
    BIO_EXPERIMENTS.map((e): [string, PresetSpec] => [
      `BIO_LAB_${e.id}`,
      {
        family: 'PHYS_BENCH',
        engine: 'BIOLOGY',
        title: `Thực hành: ${e.title}`,
        question: `Sau khi làm "${e.title}", nhóm đối chứng cho em biết điều gì, và kết quả có đủ để rút ra kết luận chưa?`,
        keywords: new RegExp(`(?:thi nghiem|thuc hanh|lam thi nghiem).*(?:${e.keywords.source})`),
        examples: e.examples.map((x) => (WITH_PREFIX.test(x) ? x : `thí nghiệm ${x}`)),
        data: {experiment: e.id},
      },
    ]),
  ),
  BIO_LAB_BENCH: {
    family: 'PHYS_BENCH',
    engine: 'BIOLOGY',
    title: 'Phòng thực hành Sinh học ảo: kính hiển vi, nhóm đối chứng, số liệu',
    question: 'Vì sao một thí nghiệm sinh học cần nhóm đối chứng và cần lặp lại trên nhiều mẫu?',
    keywords: /phong thuc hanh sinh hoc ao|phong thi nghiem sinh hoc ao|tiet thuc hanh sinh hoc|thuc hanh sinh hoc\b/,
    examples: ['phòng thực hành sinh học ảo', 'tiết thực hành sinh học', 'thực hành sinh học'],
    data: {experiment: BIO_EXPERIMENTS[0].id},
  },
};
