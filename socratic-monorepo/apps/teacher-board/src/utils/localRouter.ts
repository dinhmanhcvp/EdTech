// apps/teacher-board/src/utils/localRouter.ts
/**
 * Định tuyến cục bộ (offline, 0 ms, 0 API): nhận ra chữ vừa viết/nhận dạng là
 *  - một hoặc nhiều phương trình hàm số  → engine đồ thị đa hàm (MATH_GRAPH)
 *  - tên một khối hình học / hình vẽ hộp → engine hình học 3D (GEO_SOLID)
 * Trả về null nếu không chắc chắn để phần còn lại của hệ thống (backend/Gemini) xử lý như trước.
 */
import {SimulationBlueprint} from '@socratic/types';
import {latexToExpr, normalizeMathInput, parseEquation, toLatex} from './mathExpr';
import {parseCross, parseGenotypeFreqs, parseLP, parseRecurrence} from './stemModels';
import {matchBioKeywords} from './bioModels';
import {matchChemKeywords} from './chemModels';
import {matchPhysKeywords} from './physicsModels';
import {matchAdvancedKeywords, ADVANCED_TEMPLATES} from './advancedStemModels';
import {parseBoxplot, parseVariationTable} from './mathModels';

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

// ------------------------------------------------------------------ mô hình STEM từ cú pháp giáo viên viết
const stemBase = {parameters: [] as SimulationBlueprint['parameters'], ocrAlternatives: [] as string[]};

/** Lai Menđen, cân bằng Hardy–Weinberg, quy hoạch tuyến tính, dãy số quy nạp (mạng nhện). Trả null nếu không chắc. */
export function matchStemModel(text: string): SimulationBlueprint | null {
  const raw = text || '';
  const advanced = matchAdvancedKeywords(raw);
  if (advanced) {
    const spec = ADVANCED_TEMPLATES[advanced.templateId];
    return {...stemBase, engine: spec.engine, templateId: advanced.templateId, recognizedLatex: `\\text{${spec.title}}`, meta: advanced.meta, socraticQuestion: spec.question,
      curriculumLevel: [
        'MATH_DYNAMIC_GEOMETRY',
        'CHEM_CFT_COMPLEX_3D',
        'CHEM_SN2_MECHANISM',
        'CHEM_CRYSTAL_LATTICE',
        'BIO_LOTKA_VOLTERRA',
        'BIO_CELL_SIGNALING',
      ].includes(advanced.templateId) ? 'OLYMPIAD_ADVANCED' : 'THPT_STANDARD'};
  }
  const rec = parseRecurrence(raw);
  if (rec) {
    return {
      ...stemBase,
      engine: 'MATH',
      templateId: 'MATH_COBWEB_CHAOS',
      recognizedLatex: `${rec.name}_{n+1} = f(${rec.name}_n)`,
      expressions: [raw],
      meta: {recurrence: rec},
      socraticQuestion: 'Dãy số hội tụ khi nào? Hãy thử thay đổi tham số và xem điểm bất động ổn định mất tính ổn định ra sao: ngưỡng nào làm dãy rẽ nhánh rồi hỗn loạn?',
      curriculumLevel: 'OLYMPIAD_ADVANCED',
    };
  }
  const lp = parseLP(raw);
  if (lp) {
    return {
      ...stemBase,
      engine: 'MATH',
      templateId: 'MATH_LINEAR_PROGRAMMING',
      recognizedLatex: '\\text{Quy hoạch tuyến tính}',
      expressions: [raw],
      socraticQuestion: 'Tại sao giá trị lớn nhất (nhỏ nhất) của F luôn đạt tại một đỉnh của miền đa giác lồi mà không phải ở giữa miền?',
      curriculumLevel: 'THPT_STANDARD',
    };
  }
  const cross = parseCross(raw);
  if (cross) {
    return {
      ...stemBase,
      engine: 'BIOLOGY',
      templateId: 'BIO_PUNNETT_SQUARE',
      recognizedLatex: `P: ${cross.p1} \\times ${cross.p2}`,
      meta: {cross},
      socraticQuestion: 'Tỉ lệ kiểu hình thay đổi thế nào nếu hai gen liên kết hoàn toàn thay vì phân li độc lập? Hãy kéo tần số hoán vị gen f để kiểm chứng.',
      curriculumLevel: 'THPT_STANDARD',
    };
  }
  const vt = /biến thiên|bảng/i.test(raw) || /^\s*x\s*[|:]/im.test(raw) ? parseVariationTable(raw) : null;
  if (vt) {
    return {
      ...stemBase,
      engine: 'MATH',
      templateId: 'MATH_VARIATION_TABLE',
      recognizedLatex: '\\text{Bảng biến thiên}',
      meta: {table: vt},
      socraticQuestion: "Nếu f′(x) không đổi dấu khi đi qua x₀ thì x₀ có phải là điểm cực trị không? Hãy kéo tiếp tuyến qua các điểm cực trị để kiểm chứng.",
      curriculumLevel: 'THPT_STANDARD',
    };
  }
  const box = parseBoxplot(raw);
  if (box) {
    return {
      ...stemBase,
      engine: 'MATH',
      templateId: 'MATH_STAT_BOXPLOT',
      recognizedLatex: '\\text{Biểu đồ hộp}',
      meta: {input: box},
      socraticQuestion: 'Khoảng tứ phân vị ΔQ = Q₃ − Q₁ cho biết điều gì về độ phân tán của dữ liệu? Vì sao một giá trị ngoại lai làm trung bình đổi nhiều nhưng hầu như không làm trung vị đổi?',
      curriculumLevel: 'THPT_STANDARD',
    };
  }
  const bio = matchBioKeywords(raw);
  if (bio) {
    const q: Record<string, string> = {
      BIO_STOMATA_GAS: 'Tại sao khi nhiệt độ vượt quá 45 °C, tế bào hạt đậu mất nước và lỗ khí đóng kín? Điều đó ảnh hưởng thế nào tới quang hợp?',
      BIO_OSMOSIS_CELL: 'Tại sao tế bào thực vật trong dung dịch nhược trương chỉ trương căng mà không vỡ như hồng cầu?',
      BIO_OPERON_LAC: 'Khi môi trường có cả glucose và lactose, vi khuẩn sẽ ưu tiên sử dụng loại đường nào trước? Cơ chế phân tử nào quyết định điều đó?',
    };
    return {...stemBase, engine: 'BIOLOGY', templateId: bio.templateId, recognizedLatex: `\\text{${bio.title}}`, meta: bio.meta, socraticQuestion: q[bio.templateId], curriculumLevel: 'THPT_STANDARD'};
  }
  const chem = matchChemKeywords(raw);
  if (chem) {
    const q: Record<string, string> = {
      CHEM_MOLECULE_3D: 'Tại sao góc liên kết trong phân tử nước chỉ còn 104,5° thay vì 109,5° của tứ diện đều?',
      CHEM_LE_CHATELIER_GAS: 'Khi nén piston làm tăng áp suất, màu nâu đỏ của khí đậm lên hay nhạt đi? Hãy quan sát cả khoảnh khắc ngay sau khi nén và lúc cân bằng mới được thiết lập.',
      CHEM_GALVANIC_DANIELL: 'Vai trò của cầu muối là gì, và điện thế của pin thay đổi thế nào khi pin dần cạn?',
    };
    return {...stemBase, engine: 'CHEMISTRY', templateId: chem.templateId, recognizedLatex: `\\text{${chem.title}}`, meta: chem.meta, socraticQuestion: q[chem.templateId], curriculumLevel: 'THPT_STANDARD'};
  }
  const phys = matchPhysKeywords(raw);
  if (phys) {
    const q: Record<string, string> = {
      PHYS_GAS_STATE_PV: 'Tại sao khi nén piston giữ nhiệt độ không đổi, áp suất lại tăng tỉ lệ nghịch? Trên đồ thị p–V, diện tích bên trong chu trình biểu diễn đại lượng vật lí nào?',
      PHYS_DOUBLE_PENDULUM: 'Tại sao 2 con lắc kép thả lệch nhau chỉ 0,001 rad lại rẽ nhánh quỹ đạo sau vài giây, trong khi con lắc đơn thì không?',
      PHYS_CORIOLIS_FORCE: 'Tại sao trong bão ở Bắc bán cầu, luồng không khí luôn xoáy ngược chiều kim đồng hồ? Trong hệ quán tính, vật có thật sự bị cong không?',
      PHYS_FRAUNHOFER_DIFF: 'Tại sao tăng số khe N lại làm các vạch cực đại chính hẹp lại và sáng rực rỡ, còn giữa hai vạch xuất hiện N − 2 cực đại phụ rất yếu?',
    };
    return {
      ...stemBase,
      engine: 'PHYSICS',
      templateId: phys.templateId,
      recognizedLatex: `\\text{${phys.title}}`,
      meta: phys.meta,
      socraticQuestion: q[phys.templateId],
      curriculumLevel: ['PHYS_DOUBLE_PENDULUM', 'PHYS_CORIOLIS_FORCE', 'PHYS_FRAUNHOFER_DIFF'].includes(phys.templateId) ? 'OLYMPIAD_ADVANCED' : 'THPT_STANDARD',
    };
  }
  const freqs = parseGenotypeFreqs(raw);
  if (freqs && (/hardy|weinberg|quần thể|quan the|alen|cân bằng di truyền/i.test(raw) || /\d\s*%?\s*(?:AA|Aa|aa)\b/.test(raw))) {
    return {
      ...stemBase,
      engine: 'BIOLOGY',
      templateId: 'BIO_HARDY_WEINBERG',
      recognizedLatex: 'p^2 + 2pq + q^2 = 1',
      meta: {freqs},
      socraticQuestion: 'Quần thể này có đang cân bằng di truyền không? Nếu có di nhập gen hoặc chọn lọc thì tần số alen p thay đổi theo hướng nào?',
      curriculumLevel: 'THPT_STANDARD',
    };
  }
  return null;
}

/**
 * Định tuyến theo văn bản. `explicit` = người dùng bấm "Vẽ đồ thị" (chấp nhận cả một hàm đơn).
 * Mặc định chỉ tự định tuyến khi chắc chắn: từ ≥ 2 hàm, đường cong ẩn (conic), hoặc có tên khối hình học.
 */
export function routeLocally(text: string, opts: {explicitGraph?: boolean} = {}): SimulationBlueprint | null {
  const raw = text || '';
  const stem = matchStemModel(raw);
  if (stem) return stem;
  const solid = matchSolidWord(raw);
  const g = matchGraphEquations(raw);
  if (solid && !g) return makeSolidBlueprint(solid);
  if (g && (opts.explicitGraph || g.expressions.length >= 2 || g.implicitCount > 0 || /đồ thị|do thi|graph|vẽ/i.test(raw))) return makeGraphBlueprint(g.expressions);
  if (solid) return makeSolidBlueprint(solid);
  return null;
}

export {latexToExpr, toLatex};
