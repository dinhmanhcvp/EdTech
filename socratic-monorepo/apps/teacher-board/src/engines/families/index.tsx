'use client';

import React from 'react';
import type {SimulationBlueprint} from '@socratic/types';
import {PRESETS, isLabTemplate} from '../../utils/presets';
import {LabMoved} from '../LabMoved';
import type {PresetFamily} from '../../utils/presets';
import {AnatomyFlow} from './AnatomyFlow';
import {ChemBench} from './ChemBench';
import {CurveLab} from './CurveLab';
import {FeedbackSystem} from './FeedbackSystem';
import {PhysBench} from './PhysBench';
import {ProcessSteps} from './ProcessSteps';
import {SceneLab} from './SceneLab';
import {TableLab} from './TableLab';
import {TrialLab} from './TrialLab';

/** Dựng engine cho một blueprint preset; trả null nếu templateId không phải preset. `lab` = đang ở trang /lab: chỉ ở đó bài thực hành mới dựng thật, trên bảng chỉ có thẻ dẫn sang. */
export const PresetEngine: React.FC<{blueprint: SimulationBlueprint; lab?: boolean}> = ({blueprint, lab}) => {
  const id = blueprint.templateId;
  const spec = Object.prototype.hasOwnProperty.call(PRESETS, id) ? PRESETS[id] : undefined;
  if (!spec) return null;
  if (!lab && isLabTemplate(id)) return <LabMoved id={id} title={spec.title} />;
  switch (spec.family) {
    case 'CURVE_LAB':
      return <CurveLab id={id} data={spec.data} />;
    case 'ANATOMY_FLOW':
      return <AnatomyFlow id={id} data={spec.data} />;
    case 'PROCESS_STEPS':
      return <ProcessSteps id={id} data={spec.data} />;
    case 'FEEDBACK_SYSTEM':
      return <FeedbackSystem id={id} data={spec.data} />;
    case 'SCENE_LAB':
      return <SceneLab id={id} data={spec.data} />;
    case 'TRIAL_LAB':
      return <TrialLab id={id} data={spec.data} />;
    case 'TABLE_LAB':
      return <TableLab id={id} data={spec.data} />;
    case 'CHEM_BENCH':
      return <ChemBench id={id} experiment={spec.data.experiment} />;
    case 'PHYS_BENCH':
      return <PhysBench id={id} experiment={spec.data.experiment} />;
  }
};

export const isPreset = (templateId: string): boolean => Object.prototype.hasOwnProperty.call(PRESETS, templateId);
export type {PresetFamily};
