// apps/teacher-board/src/utils/sketchActions.ts
/** Hình phác thảo STEM đã nhận ra → việc cần làm: dựng ngay bằng engine cục bộ, hoặc gửi một "gợi ý khóa" đúng chủ đề cho bộ biên dịch AI. */
import type {SimulationBlueprint} from '@socratic/types';
import type {SketchKind} from './sketchGestures';
import {makeGraphBlueprint, matchStemModel} from './localRouter';

export interface SketchAction {
  label: string;
  /** dựng ngay không cần máy chủ */
  blueprint?: SimulationBlueprint;
  /** gợi ý văn bản đưa vào bộ định tuyến (khớp từ khóa của backend) */
  hint?: string;
}

export const SKETCH_ACTIONS: Record<SketchKind, () => SketchAction> = {
  SPRING: () => ({label: 'Con lắc lò xo', hint: 'con lắc lò xo dao động điều hòa'}),
  WAVE: () => ({label: 'Đồ thị hình sin', blueprint: makeGraphBlueprint(['y = A sin(B x)'])}),
  PARABOLA: () => ({label: 'Parabol y = ax² + bx + c', blueprint: makeGraphBlueprint(['y = a x^2 + b x + c'])}),
  ELLIPSE: () => ({label: 'Elip (đường conic)', blueprint: makeGraphBlueprint(['x^2/a^2 + y^2/b^2 = 1'])}),
  CIRCUIT: () => ({label: 'Mạch RLC & giản đồ Fresnel', hint: 'mạch điện RLC nối tiếp giản đồ Fresnel'}),
  Y_FORK: () => ({label: 'Chạc sao chép ADN', hint: 'tái bản ADN chạc sao chép helicase'}),
  BEANS: () => ({label: 'Cơ chế đóng mở khí khổng', blueprint: matchStemModel('khí khổng') ?? undefined, hint: 'quang hợp khí khổng lá cây'}),
};

/** Tên hiển thị khác dùng cho phương án thay thế của hình mơ hồ (ví dụ parabol ↔ ném xiên). */
export const SKETCH_EXTRA: Partial<Record<SketchKind, SketchAction>> = {
  PARABOLA: {label: 'Quỹ đạo ném xiên (Vật lí)', hint: 'ném xiên v_0 alpha quỹ đạo parabol'},
};
