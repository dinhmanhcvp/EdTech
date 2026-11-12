import React from 'react';
import type {SimulationBlueprint} from '@socratic/types';
import {lazyEngine} from './lazyEngine';

/** Các engine mô phỏng của bảng, nạp theo nhu cầu (mỗi engine là một gói riêng). Dùng trong `SimulationWidget`, bao bằng `<Suspense>`. */
export const MathPlotEngine = lazyEngine(() => import('./MathPlotEngine').then((m) => m.MathPlotEngine));
export const GraphEngine = lazyEngine(() => import('./GraphEngine').then((m) => m.GraphEngine));
export const GeometryEngine = lazyEngine(() => import('./GeometryEngine').then((m) => m.GeometryEngine));
export const PunnettEngine = lazyEngine(() => import('./StemModelEngines').then((m) => m.PunnettEngine));
export const HardyWeinbergEngine = lazyEngine(() => import('./StemModelEngines').then((m) => m.HardyWeinbergEngine));
export const LinearProgrammingEngine = lazyEngine(() => import('./StemModelEngines').then((m) => m.LinearProgrammingEngine));
export const CobwebEngine = lazyEngine(() => import('./StemModelEngines').then((m) => m.CobwebEngine));
export const VseprEngine = lazyEngine(() => import('./ChemEngines').then((m) => m.VseprEngine));
export const LeChatelierEngine = lazyEngine(() => import('./ChemEngines').then((m) => m.LeChatelierEngine));
export const DaniellEngine = lazyEngine(() => import('./ChemEngines').then((m) => m.DaniellEngine));
export const StomataEngine = lazyEngine(() => import('./MoreStemEngines').then((m) => m.StomataEngine));
export const OsmosisEngine = lazyEngine(() => import('./MoreStemEngines').then((m) => m.OsmosisEngine));
export const OperonLacEngine = lazyEngine(() => import('./MoreStemEngines').then((m) => m.OperonLacEngine));
export const BoxplotEngine = lazyEngine(() => import('./MoreStemEngines').then((m) => m.BoxplotEngine));
export const VariationTableEngine = lazyEngine(() => import('./MoreStemEngines').then((m) => m.VariationTableEngine));
export const GasEngine = lazyEngine(() => import('./PhysEngines').then((m) => m.GasEngine));
export const DoublePendulumEngine = lazyEngine(() => import('./PhysEngines').then((m) => m.DoublePendulumEngine));
export const CoriolisEngine = lazyEngine(() => import('./PhysEngines').then((m) => m.CoriolisEngine));
export const FraunhoferEngine = lazyEngine(() => import('./PhysEngines').then((m) => m.FraunhoferEngine));
export const PhysicsSandboxEngine = lazyEngine(() => import('./PhysicsSandboxEngine').then((m) => m.PhysicsSandboxEngine));
export const ChemistryLabEngine = lazyEngine(() => import('./ChemistryLabEngine').then((m) => m.ChemistryLabEngine));
export const BioSystemEngine = lazyEngine(() => import('./BioSystemEngine').then((m) => m.BioSystemEngine));
export const PresetEngine = lazyEngine(() => import('./families').then((m) => m.PresetEngine));
/** engine nâng cao theo mã mẫu: nạp bảng `ADVANCED_ENGINES` một lần rồi chọn engine theo `id` */
export const AdvancedEngineById = lazyEngine(() =>
  import('./AdvancedStemEngines').then((m) => {
    const Picked: React.FC<{id: string; blueprint: SimulationBlueprint}> = ({id, blueprint}) => {
      const E = Object.prototype.hasOwnProperty.call(m.ADVANCED_ENGINES, id) ? m.ADVANCED_ENGINES[id] : undefined;
      return E ? <E blueprint={blueprint} /> : null;
    };
    return Picked;
  }),
);

const ALL = [MathPlotEngine, GraphEngine, GeometryEngine, PunnettEngine, HardyWeinbergEngine, LinearProgrammingEngine, CobwebEngine, VseprEngine, LeChatelierEngine, DaniellEngine, StomataEngine, OsmosisEngine, OperonLacEngine, BoxplotEngine, VariationTableEngine, GasEngine, DoublePendulumEngine, CoriolisEngine, FraunhoferEngine, PhysicsSandboxEngine, ChemistryLabEngine, BioSystemEngine, PresetEngine, AdvancedEngineById];
/** nạp trước mọi engine (kiểm thử dùng để dựng đồng bộ; bản chạy thật có thể gọi khi rảnh để lần mở mô phỏng đầu không phải chờ) */
export const preloadEngines = (): Promise<void> => Promise.all(ALL.map((e) => e.preload())).then(() => undefined);
