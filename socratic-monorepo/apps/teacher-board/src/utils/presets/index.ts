import type {SimulationBlueprint} from '@socratic/types';
import {ANATOMY_PRESETS} from './anatomy';
import {CURVE_PRESETS} from './curve';
import {FEEDBACK_PRESETS} from './feedback';
import {HOA_CURVE_PRESETS} from './hoaCurve';
import {HOA_FLOW_PRESETS} from './hoaFlow';
import {HOA_LAB_PRESETS} from './hoaLab';
import {HOA_SCENE1_PRESETS} from './hoaScene1';
import {HOA_SCENE2_PRESETS} from './hoaScene2';
import {HOA_TABLE_PRESETS} from './hoaTable';
import {LY_CURVE_PRESETS} from './lyCurve';
import {LY_LAB_PRESETS} from './lyLab';
import {LY_SCENE1_PRESETS} from './lyScene1';
import {LY_SCENE2_PRESETS} from './lyScene2';
import {PROCESS_PRESETS} from './process';
import {SINH2_ANAT_PRESETS} from './sinh2Anat';
import {SINH2_CURVE_PRESETS} from './sinh2Curve';
import {SINH2_MISC_PRESETS} from './sinh2Misc';
import {SINH2_SCENE_PRESETS} from './sinh2Scene';
import {SINH3_PRESETS} from './sinh3';
import {SINH_ANATOMY_PRESETS} from './sinhAnatomy';
import {SINH_CURVE_PRESETS} from './sinhCurve';
import {SINH_FEEDBACK_PRESETS} from './sinhFeedback';
import {SINH_PROCESS_PRESETS} from './sinhProcess';
import {TOAN_CURVE_PRESETS} from './toanCurve';
import {TOAN_SCENE1_PRESETS} from './toanScene1';
import {TOAN_SCENE2_PRESETS} from './toanScene2';
import {TOAN_TRIAL_PRESETS} from './toanTrial';
import type {PresetSpec} from './types';

export type {PresetSpec, PresetFamily} from './types';

/** Mọi preset. Thứ tự khai báo = thứ tự thử từ khóa: câu khớp nhiều preset thì lấy preset đứng trước. */
export const PRESETS: Record<string, PresetSpec> = {
  // Bài thí nghiệm Hóa đứng đầu: chúng luôn đi kèm "thí nghiệm/thực hành" nên không nuốt câu của mô phỏng khái niệm
  ...HOA_LAB_PRESETS,
  ...LY_LAB_PRESETS,
  ...CURVE_PRESETS,
  ...ANATOMY_PRESETS,
  ...PROCESS_PRESETS,
  ...FEEDBACK_PRESETS,
  ...SINH_CURVE_PRESETS,
  ...SINH_ANATOMY_PRESETS,
  ...SINH_PROCESS_PRESETS,
  ...SINH_FEEDBACK_PRESETS,
  ...SINH2_MISC_PRESETS,
  ...SINH3_PRESETS,
  ...SINH2_SCENE_PRESETS,
  ...SINH2_CURVE_PRESETS,
  ...SINH2_ANAT_PRESETS,
  ...LY_SCENE1_PRESETS,
  ...LY_SCENE2_PRESETS,
  ...LY_CURVE_PRESETS,
  ...HOA_SCENE1_PRESETS,
  ...HOA_SCENE2_PRESETS,
  ...HOA_CURVE_PRESETS,
  ...HOA_TABLE_PRESETS,
  ...HOA_FLOW_PRESETS,
  // Toán đứng cuối: từ khóa như "xác suất" rộng, không được nuốt câu của môn khác
  ...TOAN_SCENE1_PRESETS,
  ...TOAN_SCENE2_PRESETS,
  ...TOAN_CURVE_PRESETS,
  ...TOAN_TRIAL_PRESETS,
};

/** Bỏ dấu, hạ chữ thường: từ khóa preset viết không dấu. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

export function matchPresetId(text: string): string | null {
  const t = fold(text || '');
  for (const [id, spec] of Object.entries(PRESETS)) if (spec.keywords.test(t)) return id;
  return null;
}

export function makePresetBlueprint(id: string): SimulationBlueprint {
  const spec = PRESETS[id];
  return {
    engine: spec.engine,
    templateId: id,
    recognizedLatex: `\\text{${spec.title}}`,
    ocrAlternatives: [],
    parameters: [],
    meta: {preset: spec.family},
    socraticQuestion: spec.question,
    curriculumLevel: spec.level ?? 'THPT_STANDARD',
  };
}

/** Trả blueprint nếu `text` khớp một preset; chỉ gọi SAU các bộ định tuyến cũ để không cướp câu của chúng. */
export function matchPreset(text: string): SimulationBlueprint | null {
  const id = matchPresetId(text);
  return id ? makePresetBlueprint(id) : null;
}
