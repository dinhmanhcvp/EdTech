// apps/teacher-board/src/utils/localRouter.ts
/**
 * Định tuyến cục bộ (offline, 0 ms, 0 API): nhận ra chữ vừa viết/nhận dạng là
 *  - một hoặc nhiều phương trình hàm số  → engine đồ thị đa hàm (MATH_GRAPH)
 *  - tên một khối hình học / hình vẽ hộp → engine hình học 3D (GEO_SOLID)
 * Trả về null nếu không chắc chắn để phần còn lại của hệ thống (backend/Gemini) xử lý như trước.
 */
import {SimulationBlueprint} from '@socratic/types';
import {latexToExpr, normalizeMathInput, parseEquation, toLatex} from './mathExpr';

/** Tách "y = x^2 - 3; y = A sin x + B" thành từng phương trình. */
export function splitEquations(text: string): string[] {
  const t = (text || '')
    .replace(/\\\\|\\quad|\\qquad|\\text\{[^}]*\}/g, ';')
    .replace(/\s+(?:và|and)\s+/gi, ';')
    .replace(/[\n\r]+/g, ';');
  return t
    .split(/;|,\s*(?=\s*(?:y|f|g|h)\s*(?:\(\s*x\s*\))?\s*=)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

const HAS_XY = /[xy]/i;

export interface GraphMatch {
  expressions: string[];
  implicitCount: number;
}

/** Các phần là phương trình/hàm số hợp lệ có chứa x hoặc y; trả về null nếu có phần không hiểu được. */
export function matchGraphEquations(text: string): GraphMatch | null {
  const parts = splitEquations(text);
  if (!parts.length) return null;
  const good: string[] = [];
  let implicitCount = 0;
  for (const raw of parts) {
    // bỏ lời dẫn phía trước ("vẽ đồ thị y = x^2" → "y = x^2")
    const lead = /(?:^|\s)((?:y|f|g|h)\s*(?:\(\s*x\s*\))?\s*=.*)$/i.exec(raw);
    const p = lead && raw.indexOf(lead[1]) > 0 && /\s/.test(raw.slice(0, raw.indexOf(lead[1]))) ? lead[1] : raw;
    const norm = normalizeMathInput(p);
    if (!/=/.test(norm) || !HAS_XY.test(norm.replace(/\b(?:sin|cos|tan|exp|sec|csc|max|min|log)\b/g, ''))) continue; // thiếu "=" hoặc không có biến → bỏ qua
    try {
      const eq = parseEquation(p);
      if (eq.kind === 'explicit') good.push(p);
      else if (eq.kind === 'implicit' && eq.fn.variables.length > 0) {
        good.push(p);
        implicitCount++;
      }
    } catch {
      /* phần này không phải phương trình hàm số */
    }
  }
  return good.length ? {expressions: good, implicitCount} : null;
}

export function makeGraphBlueprint(expressions: string[]): SimulationBlueprint {
  const latex = expressions
    .map((e) => {
      try {
        const eq = parseEquation(e);
        if (eq.kind === 'explicit') return `${eq.name === 'y' ? 'y' : `${eq.name}(x)`} = ${eq.fn.latex}`;
        return e;
      } catch {
        return e;
      }
    })
    .join(',\\ \\ ');
  const two = expressions.length >= 2;
  return {
    engine: 'MATH',
    templateId: 'MATH_GRAPH',
    recognizedLatex: latex,
    ocrAlternatives: [],
    expressions,
    parameters: [],
    socraticQuestion: two
      ? 'Hai đồ thị cắt nhau tại mấy điểm? Khi kéo các tham số, số giao điểm thay đổi thế nào và vì sao có lúc hai đồ thị không còn cắt nhau?'
      : 'Đồ thị cắt các trục tại đâu? Khi thay đổi tham số, hình dạng đồ thị biến đổi ra sao và điều gì không đổi?',
    curriculumLevel: 'THPT_STANDARD',
  };
}

// ------------------------------------------------------------------ hình học
export type SolidKind = 'cube' | 'box' | 'pyramid4' | 'pyramid3' | 'prism3' | 'prism6' | 'octahedron' | 'dodecahedronLite';

const SOLID_WORDS: [RegExp, SolidKind][] = [
  [/lập phương|lap phuong|\bcube\b|hình hộp lập phương/i, 'cube'],
  [/hộp chữ nhật|hop chu nhat|hình hộp|hinh hop|\bbox\b|cuboid/i, 'box'],
  [/chóp tam giác|tứ diện|tu dien|chop tam giac|tetra/i, 'pyramid3'],
  [/chóp tứ giác|chóp s\.?abcd|hình chóp|hinh chop|chop tu giac|pyramid/i, 'pyramid4'],
  [/lăng trụ tam giác|lang tru tam giac|triangular prism/i, 'prism3'],
  [/lăng trụ lục giác|lang tru luc giac/i, 'prism6'],
  [/bát diện|bat dien|octahedron/i, 'octahedron'],
  [/lăng trụ|lang tru|prism/i, 'prism3'],
];

export function matchSolidWord(text: string): SolidKind | null {
  const t = text || '';
  for (const [re, kind] of SOLID_WORDS) if (re.test(t)) return kind;
  return null;
}

export const SOLID_TITLES: Record<SolidKind, string> = {
  cube: 'Hình lập phương',
  box: 'Hình hộp chữ nhật',
  pyramid4: 'Hình chóp tứ giác đều',
  pyramid3: 'Tứ diện đều',
  prism3: 'Lăng trụ tam giác',
  prism6: 'Lăng trụ lục giác đều',
  octahedron: 'Bát diện đều',
  dodecahedronLite: 'Khối đa diện',
};

export function makeSolidBlueprint(kind: SolidKind, dims?: {a?: number; b?: number; c?: number}): SimulationBlueprint {
  return {
    engine: 'GEOMETRY',
    templateId: 'GEO_SOLID',
    recognizedLatex: `\\text{${SOLID_TITLES[kind]}}`,
    ocrAlternatives: [],
    parameters: [],
    meta: {solid: kind, dims: dims ?? {}},
    socraticQuestion:
      kind === 'cube'
        ? 'Hình lập phương có bao nhiêu mặt, cạnh, đỉnh? Có bao nhiêu cách khai triển khác nhau thành hình phẳng và vì sao hai mặt đối diện không bao giờ nằm cạnh nhau trong mạng khai triển?'
        : 'Khi khai triển khối này thành hình phẳng, diện tích toàn phần thay đổi thế nào? Chọn mặt đáy khác nhau thì hình khai triển có khác nhau không?',
    curriculumLevel: 'THPT_STANDARD',
  };
}

/**
 * Định tuyến theo văn bản. `explicit` = người dùng bấm "Vẽ đồ thị" (chấp nhận cả một hàm đơn).
 * Mặc định chỉ tự định tuyến khi chắc chắn: từ ≥ 2 hàm, đường cong ẩn (conic), hoặc có tên khối hình học.
 */
export function routeLocally(text: string, opts: {explicitGraph?: boolean} = {}): SimulationBlueprint | null {
  const raw = text || '';
  const solid = matchSolidWord(raw);
  const g = matchGraphEquations(raw);
  if (solid && !g) return makeSolidBlueprint(solid);
  if (g && (opts.explicitGraph || g.expressions.length >= 2 || g.implicitCount > 0 || /đồ thị|do thi|graph|vẽ/i.test(raw))) return makeGraphBlueprint(g.expressions);
  if (solid) return makeSolidBlueprint(solid);
  return null;
}

export {latexToExpr, toLatex};
