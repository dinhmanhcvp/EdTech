// apps/teacher-board/src/utils/autoInkPresets.ts
import { Stroke, Point } from './lassoGeometry';
import { SimulationBlueprint } from '@socratic/types';

export interface AutoInkScene {
  id: string;
  name: string;
  shortLabel: string;
  subject: 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY' | 'MATH';
  title: string;
  description: string;
  strokes: Stroke[];
  lassoLoop: Point[];
  blueprint: SimulationBlueprint;
}

// -----------------------------------------------------------------------------
// SCENE 1: VẬT LÝ — BIỂU THỨC TỔNG TRỞ RLC & PHƯƠNG TRÌNH NÉM XIÊN
// (100% Chữ & Ký hiệu công thức toán học, tách nét tự nhiên, KHÔNG VẼ HÌNH)
// -----------------------------------------------------------------------------
const scene1Strokes: Stroke[] = [
  // DÒNG 1: Z = \sqrt{R^2 + (Z_L - Z_C)^2}
  // Ký tự Z
  { id: 'phys-z-top', color: '#18181B', width: 2.8, points: [{ x: 95, y: 115 }, { x: 120, y: 115 }] },
  { id: 'phys-z-diag', color: '#18181B', width: 2.8, points: [{ x: 120, y: 115 }, { x: 95, y: 145 }] },
  { id: 'phys-z-bot', color: '#18181B', width: 2.8, points: [{ x: 95, y: 145 }, { x: 120, y: 145 }] },
  // Dấu =
  { id: 'phys-eq-1', color: '#18181B', width: 2.2, points: [{ x: 132, y: 126 }, { x: 148, y: 126 }] },
  { id: 'phys-eq-2', color: '#18181B', width: 2.2, points: [{ x: 132, y: 134 }, { x: 148, y: 134 }] },
  // Dấu căn bậc hai \sqrt{}
  { id: 'phys-sqrt-tick', color: '#2563EB', width: 2.4, points: [{ x: 158, y: 130 }, { x: 164, y: 146 }, { x: 172, y: 108 }] },
  { id: 'phys-sqrt-bar', color: '#2563EB', width: 2.4, points: [{ x: 172, y: 108 }, { x: 375, y: 108 }] },
  // Chữ R
  { id: 'phys-r-stem', color: '#18181B', width: 2.8, points: [{ x: 182, y: 118 }, { x: 182, y: 145 }] },
  { id: 'phys-r-loop', color: '#18181B', width: 2.6, points: [{ x: 182, y: 118 }, { x: 196, y: 118 }, { x: 200, y: 126 }, { x: 182, y: 132 }] },
  { id: 'phys-r-leg', color: '#18181B', width: 2.6, points: [{ x: 190, y: 132 }, { x: 200, y: 145 }] },
  // Số mũ 2 của R
  { id: 'phys-pow2-r', color: '#18181B', width: 2.0, points: [{ x: 204, y: 116 }, { x: 212, y: 114 }, { x: 204, y: 124 }, { x: 214, y: 124 }] },
  // Dấu +
  { id: 'phys-plus-h', color: '#18181B', width: 2.2, points: [{ x: 224, y: 130 }, { x: 238, y: 130 }] },
  { id: 'phys-plus-v', color: '#18181B', width: 2.2, points: [{ x: 231, y: 123 }, { x: 231, y: 137 }] },
  // Dấu mở ngoặc (
  { id: 'phys-paren-o', color: '#18181B', width: 2.4, points: [{ x: 246, y: 116 }, { x: 242, y: 130 }, { x: 246, y: 144 }] },
  // Z_L
  { id: 'phys-zl-z', color: '#18181B', width: 2.6, points: [{ x: 254, y: 120 }, { x: 270, y: 120 }, { x: 254, y: 142 }, { x: 270, y: 142 }] },
  { id: 'phys-zl-sub', color: '#2563EB', width: 2.2, points: [{ x: 274, y: 132 }, { x: 274, y: 145 }, { x: 282, y: 145 }] },
  // Dấu trừ -
  { id: 'phys-minus-1', color: '#18181B', width: 2.4, points: [{ x: 288, y: 130 }, { x: 298, y: 130 }] },
  // Z_C
  { id: 'phys-zc-z', color: '#18181B', width: 2.6, points: [{ x: 306, y: 120 }, { x: 322, y: 120 }, { x: 306, y: 142 }, { x: 322, y: 142 }] },
  { id: 'phys-zc-sub', color: '#2563EB', width: 2.2, points: [{ x: 330, y: 134 }, { x: 324, y: 138 }, { x: 324, y: 144 }, { x: 330, y: 146 }] },
  // Dấu đóng ngoặc )
  { id: 'phys-paren-c', color: '#18181B', width: 2.4, points: [{ x: 338, y: 116 }, { x: 342, y: 130 }, { x: 338, y: 144 }] },
  // Số mũ 2 của cụm (ZL - ZC)
  { id: 'phys-pow2-c', color: '#18181B', width: 2.0, points: [{ x: 348, y: 116 }, { x: 356, y: 114 }, { x: 348, y: 124 }, { x: 358, y: 124 }] },

  // DÒNG 2: v_0 = 24 m/s, \alpha = 45^\circ
  // v_0
  { id: 'phys-v-stem', color: '#18181B', width: 2.8, points: [{ x: 95, y: 185 }, { x: 104, y: 206 }, { x: 113, y: 185 }] },
  { id: 'phys-v-sub0', color: '#18181B', width: 2.0, points: [{ x: 116, y: 200 }, { x: 122, y: 196 }, { x: 126, y: 200 }, { x: 122, y: 208 }, { x: 116, y: 200 }] },
  // Dấu =
  { id: 'phys-v-eq1', color: '#18181B', width: 2.2, points: [{ x: 136, y: 192 }, { x: 150, y: 192 }] },
  { id: 'phys-v-eq2', color: '#18181B', width: 2.2, points: [{ x: 136, y: 198 }, { x: 150, y: 198 }] },
  // Số 24
  { id: 'phys-num-2', color: '#18181B', width: 2.6, points: [{ x: 160, y: 188 }, { x: 170, y: 186 }, { x: 160, y: 204 }, { x: 172, y: 204 }] },
  { id: 'phys-num-4a', color: '#18181B', width: 2.6, points: [{ x: 186, y: 186 }, { x: 178, y: 198 }, { x: 192, y: 198 }] },
  { id: 'phys-num-4b', color: '#18181B', width: 2.6, points: [{ x: 188, y: 188 }, { x: 188, y: 204 }] },
  // m/s
  { id: 'phys-unit-m', color: '#64748B', width: 2.2, points: [{ x: 200, y: 194 }, { x: 200, y: 204 }, { x: 204, y: 194 }, { x: 204, y: 204 }, { x: 208, y: 194 }, { x: 208, y: 204 }] },
  { id: 'phys-unit-slash', color: '#64748B', width: 2.0, points: [{ x: 214, y: 206 }, { x: 220, y: 190 }] },
  { id: 'phys-unit-s', color: '#64748B', width: 2.2, points: [{ x: 228, y: 194 }, { x: 224, y: 196 }, { x: 228, y: 200 }, { x: 224, y: 204 }] },
  // Dấu phẩy ,
  { id: 'phys-comma', color: '#18181B', width: 2.5, points: [{ x: 236, y: 202 }, { x: 234, y: 208 }] },
  // \alpha
  { id: 'phys-alpha-sym', color: '#D97706', width: 2.6, points: [{ x: 252, y: 198 }, { x: 260, y: 188 }, { x: 256, y: 204 }, { x: 266, y: 204 }] },
  // Dấu =
  { id: 'phys-a-eq1', color: '#18181B', width: 2.2, points: [{ x: 276, y: 192 }, { x: 290, y: 192 }] },
  { id: 'phys-a-eq2', color: '#18181B', width: 2.2, points: [{ x: 276, y: 198 }, { x: 290, y: 198 }] },
  // 45^\circ
  { id: 'phys-num-4c', color: '#18181B', width: 2.6, points: [{ x: 306, y: 186 }, { x: 298, y: 198 }, { x: 312, y: 198 }] },
  { id: 'phys-num-4d', color: '#18181B', width: 2.6, points: [{ x: 308, y: 188 }, { x: 308, y: 204 }] },
  { id: 'phys-num-5', color: '#18181B', width: 2.6, points: [{ x: 326, y: 186 }, { x: 318, y: 186 }, { x: 318, y: 194 }, { x: 326, y: 196 }, { x: 326, y: 204 }, { x: 318, y: 204 }] },
  { id: 'phys-deg', color: '#18181B', width: 2.0, points: [{ x: 332, y: 186 }, { x: 336, y: 184 }, { x: 338, y: 186 }, { x: 336, y: 190 }, { x: 332, y: 186 }] }
];

const scene1Lasso: Point[] = [
  { x: 75, y: 95 }, { x: 240, y: 90 }, { x: 395, y: 95 },
  { x: 405, y: 155 }, { x: 395, y: 215 }, { x: 360, y: 225 },
  { x: 210, y: 225 }, { x: 80, y: 220 }, { x: 68, y: 160 },
  { x: 75, y: 95 }
];

const scene1Blueprint: SimulationBlueprint = {
  engine: 'PHYSICS',
  templateId: 'PHYS_PROJECTILE',
  recognizedLatex: 'Z = \\sqrt{R^2 + (Z_L - Z_C)^2}, \\quad v_0 = 24\\text{ m/s}, \\quad \\alpha = 45^\\circ',
  ocrAlternatives: [
    'Z = \\sqrt{R^2 + (Z_L - Z_C)^2} \\quad (\\text{Tổng trở RLC})',
    'v_0 = 24\\text{ m/s}, \\quad \\alpha = 45^\\circ \\quad (\\text{Ném xiên vi phân})',
    'u = U_0\\cos(\\omega t + \\varphi)'
  ],
  parameters: [
    { key: 'v0', label: 'Vận tốc đầu (v₀)', unit: 'm/s', defaultValue: 24.0, min: 5.0, max: 50.0, step: 1.0 },
    { key: 'alpha', label: 'Góc ném (α)', unit: 'độ', defaultValue: 45.0, min: 10.0, max: 85.0, step: 5.0 },
    { key: 'g', label: 'Gia tốc g', unit: 'm/s²', defaultValue: 9.8, min: 1.6, max: 25.0, step: 0.1 },
    { key: 'R', label: 'Điện trở R', unit: 'Ω', defaultValue: 50.0, min: 10.0, max: 200.0, step: 10.0 },
    { key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 200.0, min: 50.0, max: 500.0, step: 10.0 }
  ],
  socraticQuestion: 'Trong mạch RLC, khi cảm kháng ZL bằng dung kháng ZC thì tổng trở Z đạt giá trị nào? Góc ném 45° mang ý nghĩa cực trị gì trong bài toán ném xiên?',
  curriculumLevel: 'THPT_STANDARD'
};

// -----------------------------------------------------------------------------
// SCENE 2: HÓA HỌC — PHƯƠNG TRÌNH PHẢN ỨNG HABER & PHẢN ỨNG OXI HÓA
// (100% Phương trình phản ứng hóa học kinh điển, KHÔNG VẼ HÌNH LỤC GIÁC)
// -----------------------------------------------------------------------------
const scene2Strokes: Stroke[] = [
  // DÒNG 1: N_2 + 3H_2 \rightleftharpoons 2NH_3 \quad (\Delta H < 0)
  // N_2
  { id: 'chem-n-stem1', color: '#18181B', width: 2.8, points: [{ x: 95, y: 145 }, { x: 95, y: 118 }] },
  { id: 'chem-n-diag', color: '#18181B', width: 2.8, points: [{ x: 95, y: 118 }, { x: 112, y: 145 }] },
  { id: 'chem-n-stem2', color: '#18181B', width: 2.8, points: [{ x: 112, y: 145 }, { x: 112, y: 118 }] },
  { id: 'chem-n-sub2', color: '#18181B', width: 2.0, points: [{ x: 118, y: 138 }, { x: 126, y: 136 }, { x: 118, y: 148 }, { x: 128, y: 148 }] },
  // Dấu +
  { id: 'chem-plus1-h', color: '#18181B', width: 2.2, points: [{ x: 138, y: 130 }, { x: 150, y: 130 }] },
  { id: 'chem-plus1-v', color: '#18181B', width: 2.2, points: [{ x: 144, y: 124 }, { x: 144, y: 136 }] },
  // 3H_2
  { id: 'chem-num-3', color: '#18181B', width: 2.6, points: [{ x: 160, y: 122 }, { x: 170, y: 122 }, { x: 164, y: 130 }, { x: 172, y: 136 }, { x: 162, y: 144 }] },
  { id: 'chem-h-stem1', color: '#18181B', width: 2.8, points: [{ x: 180, y: 118 }, { x: 180, y: 145 }] },
  { id: 'chem-h-stem2', color: '#18181B', width: 2.8, points: [{ x: 194, y: 118 }, { x: 194, y: 145 }] },
  { id: 'chem-h-bar', color: '#18181B', width: 2.6, points: [{ x: 180, y: 131 }, { x: 194, y: 131 }] },
  { id: 'chem-h-sub2', color: '#18181B', width: 2.0, points: [{ x: 200, y: 138 }, { x: 208, y: 136 }, { x: 200, y: 148 }, { x: 210, y: 148 }] },
  // Mũi tên thuận nghịch \rightleftharpoons
  { id: 'chem-arrow-top', color: '#2563EB', width: 2.4, points: [{ x: 220, y: 127 }, { x: 250, y: 127 }, { x: 244, y: 122 }] },
  { id: 'chem-arrow-bot', color: '#2563EB', width: 2.4, points: [{ x: 250, y: 135 }, { x: 220, y: 135 }, { x: 226, y: 140 }] },
  // 2NH_3
  { id: 'chem-num-2a', color: '#18181B', width: 2.6, points: [{ x: 262, y: 122 }, { x: 272, y: 120 }, { x: 262, y: 138 }, { x: 274, y: 138 }] },
  { id: 'chem-n2-stem1', color: '#18181B', width: 2.8, points: [{ x: 282, y: 145 }, { x: 282, y: 118 }] },
  { id: 'chem-n2-diag', color: '#18181B', width: 2.8, points: [{ x: 282, y: 118 }, { x: 298, y: 145 }] },
  { id: 'chem-n2-stem2', color: '#18181B', width: 2.8, points: [{ x: 298, y: 145 }, { x: 298, y: 118 }] },
  { id: 'chem-h2-stem1', color: '#18181B', width: 2.8, points: [{ x: 306, y: 118 }, { x: 306, y: 145 }] },
  { id: 'chem-h2-stem2', color: '#18181B', width: 2.8, points: [{ x: 320, y: 118 }, { x: 320, y: 145 }] },
  { id: 'chem-h2-bar', color: '#18181B', width: 2.6, points: [{ x: 306, y: 131 }, { x: 320, y: 131 }] },
  { id: 'chem-h2-sub3', color: '#18181B', width: 2.0, points: [{ x: 326, y: 136 }, { x: 334, y: 136 }, { x: 328, y: 142 }, { x: 334, y: 146 }, { x: 326, y: 150 }] },
  // (\Delta H < 0)
  { id: 'chem-paren-o', color: '#64748B', width: 2.2, points: [{ x: 344, y: 120 }, { x: 340, y: 132 }, { x: 344, y: 144 }] },
  { id: 'chem-delta', color: '#E11D48', width: 2.4, points: [{ x: 350, y: 142 }, { x: 357, y: 122 }, { x: 364, y: 142 }, { x: 350, y: 142 }] },
  { id: 'chem-dh-h', color: '#E11D48', width: 2.4, points: [{ x: 370, y: 122 }, { x: 370, y: 142 }, { x: 380, y: 142 }, { x: 380, y: 122 }] },
  { id: 'chem-lt', color: '#64748B', width: 2.2, points: [{ x: 390, y: 126 }, { x: 384, y: 132 }, { x: 390, y: 138 }] },
  { id: 'chem-zero', color: '#64748B', width: 2.2, points: [{ x: 398, y: 124 }, { x: 406, y: 124 }, { x: 406, y: 140 }, { x: 398, y: 140 }, { x: 398, y: 124 }] },
  { id: 'chem-paren-c', color: '#64748B', width: 2.2, points: [{ x: 412, y: 120 }, { x: 416, y: 132 }, { x: 412, y: 144 }] },

  // DÒNG 2: 4Fe + 3O_2 \rightarrow 2Fe_2O_3
  // 4Fe
  { id: 'chem-num-4', color: '#18181B', width: 2.6, points: [{ x: 102, y: 186 }, { x: 96, y: 198 }, { x: 108, y: 198 }] },
  { id: 'chem-num-4-stem', color: '#18181B', width: 2.6, points: [{ x: 104, y: 188 }, { x: 104, y: 204 }] },
  { id: 'chem-fe-f', color: '#18181B', width: 2.8, points: [{ x: 116, y: 204 }, { x: 116, y: 186 }, { x: 128, y: 186 }] },
  { id: 'chem-fe-f-bar', color: '#18181B', width: 2.4, points: [{ x: 116, y: 194 }, { x: 124, y: 194 }] },
  { id: 'chem-fe-e', color: '#18181B', width: 2.4, points: [{ x: 132, y: 196 }, { x: 142, y: 196 }, { x: 142, y: 190 }, { x: 134, y: 190 }, { x: 132, y: 200 }, { x: 142, y: 204 }] },
  // + 3O_2
  { id: 'chem-plus2-h', color: '#18181B', width: 2.2, points: [{ x: 152, y: 196 }, { x: 164, y: 196 }] },
  { id: 'chem-plus2-v', color: '#18181B', width: 2.2, points: [{ x: 158, y: 190 }, { x: 158, y: 202 }] },
  { id: 'chem-num-3b', color: '#18181B', width: 2.6, points: [{ x: 172, y: 188 }, { x: 182, y: 188 }, { x: 176, y: 196 }, { x: 184, y: 202 }, { x: 174, y: 208 }] },
  { id: 'chem-o2-o', color: '#18181B', width: 2.8, points: [{ x: 192, y: 188 }, { x: 204, y: 188 }, { x: 204, y: 206 }, { x: 192, y: 206 }, { x: 192, y: 188 }] },
  { id: 'chem-o2-sub2', color: '#18181B', width: 2.0, points: [{ x: 210, y: 198 }, { x: 218, y: 196 }, { x: 210, y: 208 }, { x: 220, y: 208 }] },
  // Mũi tên \rightarrow
  { id: 'chem-arrow2-stem', color: '#2563EB', width: 2.4, points: [{ x: 230, y: 197 }, { x: 262, y: 197 }] },
  { id: 'chem-arrow2-head', color: '#2563EB', width: 2.4, points: [{ x: 254, y: 191 }, { x: 262, y: 197 }, { x: 254, y: 203 }] },
  // 2Fe_2O_3
  { id: 'chem-num-2b', color: '#18181B', width: 2.6, points: [{ x: 274, y: 188 }, { x: 284, y: 186 }, { x: 274, y: 204 }, { x: 286, y: 204 }] },
  { id: 'chem-prod-f', color: '#18181B', width: 2.8, points: [{ x: 294, y: 204 }, { x: 294, y: 186 }, { x: 304, y: 186 }] },
  { id: 'chem-prod-f-bar', color: '#18181B', width: 2.4, points: [{ x: 294, y: 194 }, { x: 302, y: 194 }] },
  { id: 'chem-prod-e', color: '#18181B', width: 2.4, points: [{ x: 308, y: 196 }, { x: 316, y: 196 }, { x: 316, y: 190 }, { x: 310, y: 190 }, { x: 308, y: 200 }, { x: 316, y: 204 }] },
  { id: 'chem-prod-sub2', color: '#18181B', width: 2.0, points: [{ x: 322, y: 198 }, { x: 328, y: 196 }, { x: 322, y: 208 }, { x: 330, y: 208 }] },
  { id: 'chem-prod-o', color: '#18181B', width: 2.8, points: [{ x: 336, y: 188 }, { x: 348, y: 188 }, { x: 348, y: 206 }, { x: 336, y: 206 }, { x: 336, y: 188 }] },
  { id: 'chem-prod-sub3', color: '#18181B', width: 2.0, points: [{ x: 354, y: 198 }, { x: 362, y: 198 }, { x: 356, y: 203 }, { x: 362, y: 206 }, { x: 354, y: 209 }] }
];

const scene2Lasso: Point[] = [
  { x: 75, y: 95 }, { x: 250, y: 90 }, { x: 430, y: 95 },
  { x: 440, y: 155 }, { x: 420, y: 220 }, { x: 350, y: 228 },
  { x: 200, y: 228 }, { x: 75, y: 220 }, { x: 65, y: 155 },
  { x: 75, y: 95 }
];

const scene2Blueprint: SimulationBlueprint = {
  engine: 'CHEMISTRY',
  templateId: 'CHEM_REACTION_LAB',
  recognizedLatex: '\\text{N}_2 + 3\\text{H}_2 \\rightleftharpoons 2\\text{NH}_3 \\quad (\\Delta H < 0), \\quad 4\\text{Fe} + 3\\text{O}_2 \\longrightarrow 2\\text{Fe}_2\\text{O}_3',
  ocrAlternatives: [
    '\\text{N}_2 + 3\\text{H}_2 \\rightleftharpoons 2\\text{NH}_3 \\quad (\\text{Cân bằng Haber - Le Chatelier})',
    '4\\text{Fe} + 3\\text{O}_2 \\longrightarrow 2\\text{Fe}_2\\text{O}_3 \\quad (\\text{Cân bằng tỉ lượng})',
    'k = A \\cdot e^{-\\frac{E_a}{RT}} \\quad (\\text{Động học Arrhenius})'
  ],
  parameters: [
    { key: 'temperature', label: 'Nhiệt độ (T)', unit: 'K', defaultValue: 298.0, min: 250.0, max: 600.0, step: 10.0 },
    { key: 'concentration', label: 'Nồng độ chất phản ứng', unit: 'M', defaultValue: 1.5, min: 0.2, max: 4.0, step: 0.2 },
    { key: 'surfaceArea', label: 'Xúc tác (Hạ rào E_a)', unit: '', defaultValue: 3.0, min: 1.0, max: 8.0, step: 1.0 },
    { key: 'thetaY', label: 'Xoay phân tử Y', unit: 'rad', defaultValue: 0.6, min: 0.0, max: 6.28, step: 0.2 }
  ],
  socraticQuestion: 'Theo nguyên lý chuyển dịch cân bằng Le Chatelier, khi tăng nhiệt độ thì cân bằng tổng hợp NH3 dịch chuyển theo chiều thuận hay nghịch? Chất xúc tác Fe có làm thay đổi vị trí cân bằng không?',
  curriculumLevel: 'THPT_STANDARD'
};

// -----------------------------------------------------------------------------
// SCENE 3: SINH HỌC — PHƯƠNG TRÌNH QUANG HỢP & NGUYÊN TẮC BỔ SUNG ADN
// (100% Phương trình hóa sinh chuẩn THPT, KHÔNG VẼ SÓNG ADN)
// -----------------------------------------------------------------------------
const scene3Strokes: Stroke[] = [
  // DÒNG 1: 6CO_2 + 6H_2O \longrightarrow C_6H_{12}O_6 + 6O_2
  // 6CO_2
  { id: 'bio-num-6a', color: '#18181B', width: 2.6, points: [{ x: 95, y: 120 }, { x: 95, y: 144 }, { x: 106, y: 144 }, { x: 106, y: 134 }, { x: 95, y: 134 }] },
  { id: 'bio-c1', color: '#18181B', width: 2.8, points: [{ x: 122, y: 122 }, { x: 112, y: 128 }, { x: 112, y: 138 }, { x: 122, y: 144 }] },
  { id: 'bio-o1', color: '#18181B', width: 2.8, points: [{ x: 130, y: 122 }, { x: 142, y: 122 }, { x: 142, y: 144 }, { x: 130, y: 144 }, { x: 130, y: 122 }] },
  { id: 'bio-sub2-a', color: '#18181B', width: 2.0, points: [{ x: 148, y: 136 }, { x: 156, y: 134 }, { x: 148, y: 146 }, { x: 158, y: 146 }] },
  // + 6H_2O
  { id: 'bio-plus1-h', color: '#18181B', width: 2.2, points: [{ x: 168, y: 132 }, { x: 180, y: 132 }] },
  { id: 'bio-plus1-v', color: '#18181B', width: 2.2, points: [{ x: 174, y: 126 }, { x: 174, y: 138 }] },
  { id: 'bio-num-6b', color: '#18181B', width: 2.6, points: [{ x: 190, y: 120 }, { x: 190, y: 144 }, { x: 201, y: 144 }, { x: 201, y: 134 }, { x: 190, y: 134 }] },
  { id: 'bio-h1', color: '#18181B', width: 2.8, points: [{ x: 210, y: 122 }, { x: 210, y: 144 }, { x: 222, y: 144 }, { x: 222, y: 122 }] },
  { id: 'bio-h1-bar', color: '#18181B', width: 2.4, points: [{ x: 210, y: 133 }, { x: 222, y: 133 }] },
  { id: 'bio-sub2-b', color: '#18181B', width: 2.0, points: [{ x: 228, y: 136 }, { x: 236, y: 134 }, { x: 228, y: 146 }, { x: 238, y: 146 }] },
  { id: 'bio-o2', color: '#18181B', width: 2.8, points: [{ x: 244, y: 122 }, { x: 256, y: 122 }, { x: 256, y: 144 }, { x: 244, y: 144 }, { x: 244, y: 122 }] },
  // Mũi tên \longrightarrow
  { id: 'bio-arrow-stem', color: '#059669', width: 2.4, points: [{ x: 268, y: 133 }, { x: 304, y: 133 }] },
  { id: 'bio-arrow-head', color: '#059669', width: 2.4, points: [{ x: 296, y: 127 }, { x: 304, y: 133 }, { x: 296, y: 139 }] },
  // C_6H_{12}O_6
  { id: 'bio-c2', color: '#18181B', width: 2.8, points: [{ x: 324, y: 122 }, { x: 314, y: 128 }, { x: 314, y: 138 }, { x: 324, y: 144 }] },
  { id: 'bio-sub6-a', color: '#18181B', width: 2.0, points: [{ x: 328, y: 136 }, { x: 328, y: 146 }, { x: 334, y: 146 }, { x: 334, y: 141 }, { x: 328, y: 141 }] },
  { id: 'bio-h2', color: '#18181B', width: 2.8, points: [{ x: 342, y: 122 }, { x: 342, y: 144 }, { x: 352, y: 144 }, { x: 352, y: 122 }] },
  { id: 'bio-h2-bar', color: '#18181B', width: 2.4, points: [{ x: 342, y: 133 }, { x: 352, y: 133 }] },
  { id: 'bio-sub12', color: '#18181B', width: 2.0, points: [{ x: 358, y: 136 }, { x: 358, y: 146 }, { x: 362, y: 138 }, { x: 368, y: 136 }, { x: 362, y: 146 }, { x: 370, y: 146 }] },
  { id: 'bio-o3', color: '#18181B', width: 2.8, points: [{ x: 376, y: 122 }, { x: 386, y: 122 }, { x: 386, y: 144 }, { x: 376, y: 144 }, { x: 376, y: 122 }] },
  { id: 'bio-sub6-b', color: '#18181B', width: 2.0, points: [{ x: 390, y: 136 }, { x: 390, y: 146 }, { x: 396, y: 146 }, { x: 396, y: 141 }, { x: 390, y: 141 }] },
  // + 6O_2
  { id: 'bio-plus2-h', color: '#18181B', width: 2.2, points: [{ x: 404, y: 132 }, { x: 414, y: 132 }] },
  { id: 'bio-plus2-v', color: '#18181B', width: 2.2, points: [{ x: 409, y: 127 }, { x: 409, y: 137 }] },
  { id: 'bio-num-6c', color: '#18181B', width: 2.6, points: [{ x: 420, y: 120 }, { x: 420, y: 144 }, { x: 429, y: 144 }, { x: 429, y: 134 }, { x: 420, y: 134 }] },
  { id: 'bio-o4', color: '#18181B', width: 2.8, points: [{ x: 436, y: 122 }, { x: 448, y: 122 }, { x: 448, y: 144 }, { x: 436, y: 144 }, { x: 436, y: 122 }] },
  { id: 'bio-sub2-c', color: '#18181B', width: 2.0, points: [{ x: 454, y: 136 }, { x: 462, y: 134 }, { x: 454, y: 146 }, { x: 464, y: 146 }] },

  // DÒNG 2: ADN: A = T, G = X (T = 25°C)
  // ADN:
  { id: 'bio-adn-a', color: '#18181B', width: 2.8, points: [{ x: 95, y: 204 }, { x: 105, y: 186 }, { x: 115, y: 204 }] },
  { id: 'bio-adn-a-bar', color: '#18181B', width: 2.4, points: [{ x: 99, y: 197 }, { x: 111, y: 197 }] },
  { id: 'bio-adn-d', color: '#18181B', width: 2.8, points: [{ x: 122, y: 186 }, { x: 122, y: 204 }, { x: 132, y: 204 }, { x: 134, y: 195 }, { x: 128, y: 186 }, { x: 122, y: 186 }] },
  { id: 'bio-adn-n', color: '#18181B', width: 2.8, points: [{ x: 142, y: 204 }, { x: 142, y: 186 }, { x: 154, y: 204 }, { x: 154, y: 186 }] },
  { id: 'bio-colon', color: '#18181B', width: 2.4, points: [{ x: 160, y: 192 }, { x: 160, y: 194 }] },
  // A = T
  { id: 'bio-bp-a', color: '#0284C7', width: 2.8, points: [{ x: 172, y: 204 }, { x: 180, y: 186 }, { x: 188, y: 204 }] },
  { id: 'bio-bp-a-bar', color: '#0284C7', width: 2.4, points: [{ x: 175, y: 197 }, { x: 185, y: 197 }] },
  { id: 'bio-bp-eq1', color: '#18181B', width: 2.2, points: [{ x: 196, y: 192 }, { x: 208, y: 192 }] },
  { id: 'bio-bp-eq2', color: '#18181B', width: 2.2, points: [{ x: 196, y: 198 }, { x: 208, y: 198 }] },
  { id: 'bio-bp-t', color: '#E11D48', width: 2.8, points: [{ x: 216, y: 186 }, { x: 230, y: 186 }] },
  { id: 'bio-bp-t-stem', color: '#E11D48', width: 2.8, points: [{ x: 223, y: 186 }, { x: 223, y: 204 }] },
  { id: 'bio-comma2', color: '#18181B', width: 2.4, points: [{ x: 234, y: 202 }, { x: 232, y: 206 }] },
  // G = X
  { id: 'bio-bp-g', color: '#059669', width: 2.8, points: [{ x: 254, y: 188 }, { x: 244, y: 194 }, { x: 244, y: 202 }, { x: 254, y: 204 }, { x: 254, y: 196 }, { x: 248, y: 196 }] },
  { id: 'bio-bp-eq3', color: '#18181B', width: 2.2, points: [{ x: 262, y: 192 }, { x: 274, y: 192 }] },
  { id: 'bio-bp-eq4', color: '#18181B', width: 2.2, points: [{ x: 262, y: 198 }, { x: 274, y: 198 }] },
  { id: 'bio-bp-x', color: '#D97706', width: 2.8, points: [{ x: 282, y: 186 }, { x: 294, y: 204 }] },
  { id: 'bio-bp-x-cross', color: '#D97706', width: 2.8, points: [{ x: 294, y: 186 }, { x: 282, y: 204 }] },
  // (T = 25°C)
  { id: 'bio-temp-paren1', color: '#64748B', width: 2.2, points: [{ x: 306, y: 186 }, { x: 302, y: 195 }, { x: 306, y: 204 }] },
  { id: 'bio-temp-t', color: '#64748B', width: 2.4, points: [{ x: 314, y: 186 }, { x: 326, y: 186 }] },
  { id: 'bio-temp-t-stem', color: '#64748B', width: 2.4, points: [{ x: 320, y: 186 }, { x: 320, y: 204 }] },
  { id: 'bio-temp-eq1', color: '#64748B', width: 2.0, points: [{ x: 332, y: 192 }, { x: 344, y: 192 }] },
  { id: 'bio-temp-eq2', color: '#64748B', width: 2.0, points: [{ x: 332, y: 198 }, { x: 344, y: 198 }] },
  { id: 'bio-temp-2', color: '#18181B', width: 2.6, points: [{ x: 352, y: 188 }, { x: 362, y: 186 }, { x: 352, y: 204 }, { x: 364, y: 204 }] },
  { id: 'bio-temp-5', color: '#18181B', width: 2.6, points: [{ x: 374, y: 186 }, { x: 368, y: 186 }, { x: 368, y: 194 }, { x: 374, y: 196 }, { x: 374, y: 204 }, { x: 368, y: 204 }] },
  { id: 'bio-temp-deg', color: '#18181B', width: 2.0, points: [{ x: 380, y: 186 }, { x: 384, y: 184 }, { x: 384, y: 188 }, { x: 380, y: 186 }] },
  { id: 'bio-temp-c', color: '#18181B', width: 2.4, points: [{ x: 398, y: 188 }, { x: 388, y: 195 }, { x: 398, y: 204 }] },
  { id: 'bio-temp-paren2', color: '#64748B', width: 2.2, points: [{ x: 404, y: 186 }, { x: 408, y: 195 }, { x: 404, y: 204 }] }
];

const scene3Lasso: Point[] = [
  { x: 75, y: 95 }, { x: 260, y: 90 }, { x: 475, y: 95 },
  { x: 485, y: 155 }, { x: 460, y: 220 }, { x: 380, y: 228 },
  { x: 190, y: 228 }, { x: 75, y: 220 }, { x: 65, y: 155 },
  { x: 75, y: 95 }
];

const scene3Blueprint: SimulationBlueprint = {
  engine: 'BIOLOGY',
  templateId: 'BIO_PHOTOSYNTHESIS',
  recognizedLatex: '6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{h\\nu} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2, \\quad \\text{ADN: } A = T, \\ G = X',
  ocrAlternatives: [
    '6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\longrightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\quad (\\text{Phương trình quang hợp})',
    '\\text{ADN: Nguyên tắc bổ sung } A=T, \\ G=X',
    'Rate = f(T = 25.0^\\circ\\text{C} \\rightarrow 50.0^\\circ\\text{C})'
  ],
  parameters: [
    { key: 'temperature', label: 'Nhiệt độ môi trường (T)', unit: '°C', defaultValue: 25.0, min: 10.0, max: 55.0, step: 2.5 },
    { key: 'light', label: 'Cường độ ánh sáng (I)', unit: '%', defaultValue: 75.0, min: 10.0, max: 100.0, step: 5.0 },
    { key: 'helicaseProgress', label: 'Tiến trình Helicase tách mạch', unit: '%', defaultValue: 50.0, min: 0.0, max: 100.0, step: 5.0 },
    { key: 'co2Concentration', label: 'Nồng độ CO₂ khuếch tán', unit: 'ppm', defaultValue: 415.0, min: 200.0, max: 800.0, step: 25.0 }
  ],
  socraticQuestion: 'Trong pha sáng của quang hợp, các phân tử nước H2O bị phân ly giải phóng khí Oxi nhờ quá trình nào? Nhiệt độ môi trường ảnh hưởng như thế nào đến hoạt tính enzyme RuBisCO?',
  curriculumLevel: 'THPT_STANDARD'
};

// -----------------------------------------------------------------------------
// SCENE 4: TOÁN GIẢI TÍCH — PHƯƠNG TRÌNH TÍCH PHÂN & ĐẠO HÀM f'(x) = 0
// (100% Ký hiệu giải tích & Biểu thức vi phân, KHÔNG VẼ TRỤC TỌA ĐỘ HAY ĐỒ THỊ)
// -----------------------------------------------------------------------------
const scene4Strokes: Stroke[] = [
  // DÒNG 1: y = \int_{-2}^{2} (x^3 - 3x)\,dx
  // y =
  { id: 'math-y-1', color: '#18181B', width: 2.8, points: [{ x: 95, y: 122 }, { x: 104, y: 136 }] },
  { id: 'math-y-2', color: '#18181B', width: 2.8, points: [{ x: 112, y: 122 }, { x: 96, y: 148 }] },
  { id: 'math-eq-1', color: '#18181B', width: 2.2, points: [{ x: 122, y: 128 }, { x: 136, y: 128 }] },
  { id: 'math-eq-2', color: '#18181B', width: 2.2, points: [{ x: 122, y: 134 }, { x: 136, y: 134 }] },
  // Dấu tích phân \int
  { id: 'math-int-sign', color: '#2563EB', width: 2.8, points: [{ x: 148, y: 116 }, { x: 156, y: 108 }, { x: 153, y: 144 }, { x: 146, y: 150 }] },
  // Cận trên 2
  { id: 'math-lim-sup', color: '#2563EB', width: 2.0, points: [{ x: 162, y: 112 }, { x: 168, y: 110 }, { x: 162, y: 118 }, { x: 170, y: 118 }] },
  // Cận dưới -2
  { id: 'math-lim-inf-minus', color: '#2563EB', width: 1.8, points: [{ x: 142, y: 146 }, { x: 147, y: 146 }] },
  { id: 'math-lim-inf-2', color: '#2563EB', width: 2.0, points: [{ x: 152, y: 144 }, { x: 156, y: 142 }, { x: 152, y: 149 }, { x: 158, y: 149 }] },
  // (x^3 - 3x)
  { id: 'math-paren-o', color: '#18181B', width: 2.4, points: [{ x: 178, y: 116 }, { x: 174, y: 130 }, { x: 178, y: 144 }] },
  { id: 'math-x-1', color: '#18181B', width: 2.6, points: [{ x: 186, y: 122 }, { x: 198, y: 142 }] },
  { id: 'math-x-2', color: '#18181B', width: 2.6, points: [{ x: 198, y: 122 }, { x: 186, y: 142 }] },
  { id: 'math-pow3', color: '#18181B', width: 2.0, points: [{ x: 202, y: 114 }, { x: 210, y: 114 }, { x: 205, y: 120 }, { x: 210, y: 124 }, { x: 203, y: 128 }] },
  { id: 'math-minus', color: '#18181B', width: 2.2, points: [{ x: 218, y: 130 }, { x: 230, y: 130 }] },
  { id: 'math-num3', color: '#18181B', width: 2.6, points: [{ x: 238, y: 122 }, { x: 248, y: 122 }, { x: 242, y: 130 }, { x: 250, y: 136 }, { x: 240, y: 144 }] },
  { id: 'math-x3-1', color: '#18181B', width: 2.6, points: [{ x: 256, y: 122 }, { x: 268, y: 142 }] },
  { id: 'math-x3-2', color: '#18181B', width: 2.6, points: [{ x: 268, y: 122 }, { x: 256, y: 142 }] },
  { id: 'math-paren-c', color: '#18181B', width: 2.4, points: [{ x: 276, y: 116 }, { x: 280, y: 130 }, { x: 276, y: 144 }] },
  // dx
  { id: 'math-d', color: '#18181B', width: 2.4, points: [{ x: 290, y: 128 }, { x: 290, y: 142 }, { x: 296, y: 142 }, { x: 296, y: 116 }] },
  { id: 'math-dx-1', color: '#18181B', width: 2.4, points: [{ x: 304, y: 124 }, { x: 314, y: 142 }] },
  { id: 'math-dx-2', color: '#18181B', width: 2.4, points: [{ x: 314, y: 124 }, { x: 304, y: 142 }] },

  // DÒNG 2: f'(x) = 3x^2 - 3 = 0 \iff x = \pm 1
  // f'(x)
  { id: 'math-f', color: '#18181B', width: 2.6, points: [{ x: 102, y: 186 }, { x: 96, y: 188 }, { x: 96, y: 206 }] },
  { id: 'math-f-bar', color: '#18181B', width: 2.4, points: [{ x: 92, y: 194 }, { x: 102, y: 194 }] },
  { id: 'math-prime', color: '#18181B', width: 2.4, points: [{ x: 106, y: 186 }, { x: 104, y: 192 }] },
  { id: 'math-f-paren-o', color: '#18181B', width: 2.2, points: [{ x: 110, y: 188 }, { x: 106, y: 197 }, { x: 110, y: 206 }] },
  { id: 'math-f-x1', color: '#18181B', width: 2.4, points: [{ x: 116, y: 190 }, { x: 126, y: 204 }] },
  { id: 'math-f-x2', color: '#18181B', width: 2.4, points: [{ x: 126, y: 190 }, { x: 116, y: 204 }] },
  { id: 'math-f-paren-c', color: '#18181B', width: 2.2, points: [{ x: 132, y: 188 }, { x: 136, y: 197 }, { x: 132, y: 206 }] },
  // = 3x^2 - 3
  { id: 'math-f-eq1', color: '#18181B', width: 2.2, points: [{ x: 144, y: 193 }, { x: 156, y: 193 }] },
  { id: 'math-f-eq2', color: '#18181B', width: 2.2, points: [{ x: 144, y: 199 }, { x: 156, y: 199 }] },
  { id: 'math-f-num3', color: '#18181B', width: 2.6, points: [{ x: 166, y: 188 }, { x: 176, y: 188 }, { x: 170, y: 195 }, { x: 178, y: 201 }, { x: 168, y: 207 }] },
  { id: 'math-f-x3', color: '#18181B', width: 2.4, points: [{ x: 186, y: 190 }, { x: 196, y: 204 }] },
  { id: 'math-f-x4', color: '#18181B', width: 2.4, points: [{ x: 196, y: 190 }, { x: 186, y: 204 }] },
  { id: 'math-f-pow2', color: '#18181B', width: 2.0, points: [{ x: 200, y: 186 }, { x: 206, y: 184 }, { x: 200, y: 192 }, { x: 208, y: 192 }] },
  { id: 'math-f-minus', color: '#18181B', width: 2.2, points: [{ x: 216, y: 196 }, { x: 226, y: 196 }] },
  { id: 'math-f-num3b', color: '#18181B', width: 2.6, points: [{ x: 234, y: 188 }, { x: 244, y: 188 }, { x: 238, y: 195 }, { x: 246, y: 201 }, { x: 236, y: 207 }] },
  // = 0
  { id: 'math-f-eq3', color: '#18181B', width: 2.2, points: [{ x: 254, y: 193 }, { x: 266, y: 193 }] },
  { id: 'math-f-eq4', color: '#18181B', width: 2.2, points: [{ x: 254, y: 199 }, { x: 266, y: 199 }] },
  { id: 'math-f-zero', color: '#18181B', width: 2.4, points: [{ x: 274, y: 188 }, { x: 284, y: 188 }, { x: 284, y: 206 }, { x: 274, y: 206 }, { x: 274, y: 188 }] },
  // \iff
  { id: 'math-iff-bar', color: '#2563EB', width: 2.2, points: [{ x: 294, y: 196 }, { x: 316, y: 196 }] },
  { id: 'math-iff-arrow-l', color: '#2563EB', width: 2.2, points: [{ x: 298, y: 191 }, { x: 294, y: 196 }, { x: 298, y: 201 }] },
  { id: 'math-iff-arrow-r', color: '#2563EB', width: 2.2, points: [{ x: 312, y: 191 }, { x: 316, y: 196 }, { x: 312, y: 201 }] },
  // x = \pm 1
  { id: 'math-res-x1', color: '#18181B', width: 2.4, points: [{ x: 326, y: 190 }, { x: 336, y: 204 }] },
  { id: 'math-res-x2', color: '#18181B', width: 2.4, points: [{ x: 336, y: 190 }, { x: 326, y: 204 }] },
  { id: 'math-res-eq1', color: '#18181B', width: 2.2, points: [{ x: 344, y: 193 }, { x: 356, y: 193 }] },
  { id: 'math-res-eq2', color: '#18181B', width: 2.2, points: [{ x: 344, y: 199 }, { x: 356, y: 199 }] },
  { id: 'math-res-pm-h', color: '#18181B', width: 2.2, points: [{ x: 368, y: 190 }, { x: 378, y: 190 }] },
  { id: 'math-res-pm-v', color: '#18181B', width: 2.2, points: [{ x: 373, y: 185 }, { x: 373, y: 195 }] },
  { id: 'math-res-pm-bar', color: '#18181B', width: 2.2, points: [{ x: 368, y: 201 }, { x: 378, y: 201 }] },
  { id: 'math-res-num1', color: '#18181B', width: 2.6, points: [{ x: 386, y: 190 }, { x: 390, y: 186 }, { x: 390, y: 204 }] }
];

const scene4Lasso: Point[] = [
  { x: 75, y: 95 }, { x: 240, y: 90 }, { x: 405, y: 95 },
  { x: 415, y: 155 }, { x: 400, y: 220 }, { x: 330, y: 228 },
  { x: 190, y: 228 }, { x: 75, y: 220 }, { x: 65, y: 155 },
  { x: 75, y: 95 }
];

const scene4Blueprint: SimulationBlueprint = {
  engine: 'MATH',
  templateId: 'MATH_FUNC_2D',
  recognizedLatex: 'y = \\int_{-2}^{2} (x^3 - 3x)\\,dx, \\quad f\'(x) = 3x^2 - 3 = 0 \\iff x = \\pm 1',
  ocrAlternatives: [
    'y = \\int_{-2}^{2} (x^3 - 3x)\\,dx \\quad (\\text{Tích phân Riemann})',
    'f\'(x) = 3x^2 - 3 = 0 \\iff x = \\pm 1 \\quad (\\text{Cực trị hàm số})',
    'y = x^3 - 3x + m'
  ],
  parameters: [
    { key: 'a', label: 'Hệ số a (x³)', unit: '', defaultValue: 1.0, min: -3.0, max: 3.0, step: 0.5 },
    { key: 'b', label: 'Hệ số b (x²)', unit: '', defaultValue: 0.0, min: -4.0, max: 4.0, step: 0.5 },
    { key: 'c', label: 'Hệ số c (x)', unit: '', defaultValue: -3.0, min: -6.0, max: 6.0, step: 0.5 },
    { key: 'd', label: 'Tham số tự do (d/m)', unit: '', defaultValue: 1.0, min: -5.0, max: 5.0, step: 0.5 },
    { key: 'm', label: 'Đường cắt y = m', unit: '', defaultValue: 0.0, min: -4.0, max: 4.0, step: 0.2 },
    { key: 'n', label: 'Số phân hoạch Riemann (N)', unit: 'hình', defaultValue: 16.0, min: 4.0, max: 80.0, step: 4.0 }
  ],
  socraticQuestion: 'Tại sao tại các điểm x = ±1 đạo hàm f\'(x) = 0? Khi tăng số lượng phân hoạch Riemann N từ 16 lên 80, tổng diện tích xấp xỉ có tiệm cận về giá trị tích phân giải tích không?',
  curriculumLevel: 'THPT_STANDARD'
};

// -----------------------------------------------------------------------------
// EXPORT ALL 4 SCENES
// -----------------------------------------------------------------------------
export const AUTO_INK_SCENES: AutoInkScene[] = [
  {
    id: 'SCENE_1_PHYSICS',
    name: '01. Vật lý: Biểu thức RLC & Ném xiên',
    shortLabel: '01. Vật lý',
    subject: 'PHYSICS',
    title: 'Biểu thức Tổng trở RLC & Phương trình ném xiên',
    description: 'Phương trình vi phân ném xiên v₀ = 24 m/s, α = 45° & Biểu thức tổng trở Z = √(R² + (ZL - ZC)²) mở Mô phỏng 60FPS',
    strokes: scene1Strokes,
    lassoLoop: scene1Lasso,
    blueprint: scene1Blueprint
  },
  {
    id: 'SCENE_2_CHEMISTRY',
    name: '02. Hóa học: Phương trình Haber & Fe + O2',
    shortLabel: '02. Hóa học',
    subject: 'CHEMISTRY',
    title: 'Phương trình cân bằng Haber & Phản ứng Oxi hóa',
    description: 'N₂ + 3H₂ ⇌ 2NH₃ (ΔH < 0) & 4Fe + 3O₂ → 2Fe₂O₃ mở Studio Phân tử 3D PBR & Cân bằng động học',
    strokes: scene2Strokes,
    lassoLoop: scene2Lasso,
    blueprint: scene2Blueprint
  },
  {
    id: 'SCENE_3_BIOLOGY',
    name: '03. Sinh học: Phương trình Quang hợp & ADN',
    shortLabel: '03. Sinh học',
    subject: 'BIOLOGY',
    title: 'Phương trình Quang hợp & Nguyên tắc bổ sung ADN',
    description: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ & ADN: A = T, G = X mở Visualizer ADN 3D & Đồ thị quang hợp 25°C',
    strokes: scene3Strokes,
    lassoLoop: scene3Lasso,
    blueprint: scene3Blueprint
  },
  {
    id: 'SCENE_4_MATH',
    name: '04. Toán Giải tích: Tích phân & f\'(x) = 0',
    shortLabel: '04. Toán học',
    subject: 'MATH',
    title: 'Biểu thức Tích phân Riemann & Cực trị f\'(x) = 0',
    description: 'y = ∫ (x³ - 3x) dx & f\'(x) = 3x² - 3 = 0 ⇔ x = ±1 mở Đồ thị giải tích 60FPS với Phân hoạch Riemann N = 4 → 80',
    strokes: scene4Strokes,
    lassoLoop: scene4Lasso,
    blueprint: scene4Blueprint
  }
];
