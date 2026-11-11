/**
 * Ngữ cảnh hình cho chấm bài / hỏi đáp hình học: đề + các quan hệ đo được trên hình + kiểm chứng số của từng dòng bài làm
 * (dòng nào là một mệnh đề đọc được như "AB ⊥ CD" thì đo trên hình, kéo thử đỉnh). Là BẰNG CHỨNG cho người/AI chấm, không phải kết luận:
 * "không khớp trên hình" nghĩa là mệnh đề không đúng ở hình này (hoặc đọc sai tên điểm), AI vẫn phải xét lập luận.
 */
import type {Stroke} from './lassoGeometry';
import type {GeoScene} from './geometryProblem';
import {detectFacts, verifyClaim} from './geoClaims';
import {goalOf} from './geoCoach';

/** LaTeX viết tay đã nhận dạng → văn bản mệnh đề mà `parseClaim` đọc được. */
export const latexToClaimText = (s: string): string =>
  (s || '')
    .replace(/\\perp|\\bot/g, '⊥')
    .replace(/\\parallel|\\\/\\\//g, '∥')
    .replace(/\\(?:widehat|hat|angle)\s*\{?\s*([A-Z]{3})\s*\}?/g, '∠$1')
    .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '$1/$2')
    .replace(/\\(?:overline|overrightarrow)\s*\{([^}]*)\}/g, '$1')
    .replace(/\\(?:text|mathrm)\s*\{([^}]*)\}/g, '$1')
    .replace(/[{}\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Hình phẳng gần nhất / đầu tiên trên bảng (hình dựng từ đề hoặc từ nét vẽ). */
export const sceneOnBoard = (strokes: Stroke[]): GeoScene | null => {
  const s = strokes.find((q) => q.shape?.geo?.scene.dim === 2);
  return s?.shape?.geo?.scene ?? null;
};

export interface FigureContext {
  /** lời đề của hình (nếu hình dựng từ đề) */
  problem: string;
  /** quan hệ đo được trên hình + kết quả kiểm chứng từng dòng bài làm */
  figure: string;
}

export function figureContext(strokes: Stroke[], lines: string[]): FigureContext | null {
  const sc = sceneOnBoard(strokes);
  if (!sc) return null;
  const facts = detectFacts(sc, 30);
  const rows: string[] = [];
  lines.forEach((ln, i) => {
    const text = latexToClaimText(ln);
    if (!text) return;
    const v = verifyClaim(sc, text);
    if (v.verdict === 'unparsed') return;
    rows.push(`Dòng [${i}] «${text}»: ${v.verdict === 'holds' ? 'đúng trên hình' : v.verdict === 'fails' ? 'KHÔNG khớp trên hình' : 'chưa kiểm được'}${v.verdict === 'holds' && v.tried > 1 ? ` (${v.tried} vị trí kéo thử)` : ''}`);
  });
  const goal = goalOf(sc.parts.map((p) => p.text).join(' '));
  const figure = [
    `Điểm trên hình: ${sc.order.filter((n) => sc.pts[n]).join(', ')}.`,
    facts.length ? `Quan hệ đo được trên hình: ${facts.join('; ')}.` : '',
    goal ? `Cần chứng minh: ${goal.text}.` : '',
    rows.length ? `Kiểm chứng số từng dòng bài làm (chỉ là bằng chứng số, không thay cho lập luận):\n${rows.join('\n')}` : '',
  ].filter(Boolean).join('\n');
  return {problem: sc.parts.map((p) => p.text).join(' ').slice(0, 1900), figure: figure.slice(0, 1500)};
}
