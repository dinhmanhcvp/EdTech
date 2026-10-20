// packages/types/src/simulation.ts

export type EngineType = 'MATH' | 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY';

export type CurriculumLevel = 'THPT_STANDARD' | 'OLYMPIAD_ADVANCED';

export type TemplateId =
  | 'MATH_FUNC_2D'
  | 'MATH_TRIG_WAVE'
  | 'MATH_CONIC_2D'
  | 'PHYS_PROJECTILE'
  | 'PHYS_PENDULUM'
  | 'PHYS_INCLINED'
  | 'PHYS_OPTICS_LENS'
  | 'PHYS_RLC_PHASOR'
  | 'CHEM_REACTION_LAB'
  | 'CHEM_BALANCE_SCALE'
  | 'CHEM_MOLECULE_2D3D'
  | 'CHEM_EQUILIBRIUM_TITRATION'
  | 'BIO_PHOTOSYNTHESIS'
  | 'BIO_HEART_CYCLE';

export interface SimParamConfig {
  key: string;
  label: string;
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

export interface SimulationBlueprint {
  engine: EngineType;
  templateId: TemplateId;
  recognizedLatex: string;
  ocrAlternatives?: string[]; // Top 2 OCR alternatives for Tap & Swap
  expressions?: string[]; // Dành cho Math Engine, VD: ["a * sin(omega * x + phi)"]
  meta?: {
    gasColor?: string;
    precipitateColor?: string | null;
    liquidColorStart?: string;
    liquidColorEnd?: string;
    smiles?: string;
  };
  parameters: SimParamConfig[];
  socraticQuestion: string;
  curriculumLevel?: CurriculumLevel;
}
