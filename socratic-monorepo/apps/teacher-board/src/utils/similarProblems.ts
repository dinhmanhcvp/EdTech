/**
 * Sinh đề tương tự: POST {apiBase}/api/v1/canvas/similar-problems (services/ai-engine/routers/similar_problems.py), lấy đề gốc từ bảng,
 * và xuất ra đề/đáp án để in hoặc gửi học sinh. Không có AI thì không có đề (không tự bịa).
 */
import katex from 'katex';
import {apiBase} from './apiBase';
import {BoardQaError, aiHeaders} from './boardQa';
import type {BoardContext} from './boardContext';

export type ProblemStatus = 'verified' | 'unverified';
export type Level = 'same' | 'harder' | 'easier';

export interface SimilarProblem {
  statement: string;
  steps: string[];
  answer_text: string;
  unit: string;
  status: ProblemStatus;
  computed: number | null;
}

export interface SimilarResponse {
  problems: SimilarProblem[];
  /** số đề bị loại vì máy tính lại thấy đáp án lệch */
  dropped: number;
  source: 'gemini' | 'openrouter' | 'offline';
  model?: string | null;
  note?: string;
}

const clip = (s: unknown, n: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const num = (v: number) => (Math.round(v * 100) / 100).toString().replace('.', ',');

/** Đề gốc đọc từ bảng: công thức/chữ đã nhận dạng, đề của hình dựng từ chữ, hình phẳng kèm độ dài cạnh. Rỗng nếu bảng chưa có gì. */
export function sourceFromContext(ctx: BoardContext): string {
  const picked = ctx.selection ? new Set(ctx.selection.item_ids) : null;
  const lines: string[] = [];
  for (const it of ctx.items) {
    if (picked && !picked.has(it.id)) continue;
    if (it.kind === 'formula') {
      const t = it.text || (it.latex ? `$${it.latex}$` : '');
      if (t) lines.push(clip(t, 400));
    } else if (it.kind === 'plane' && it.measures) {
      const sides = Object.entries(it.measures.sides_named).map(([k, v]) => `${k} = ${num(v)}`).join(', ');
      lines.push(`${it.title || 'Hình phẳng'}: ${sides}`);
    } else if (it.kind === 'solid') {
      lines.push(it.geo?.problem ? clip(it.geo.problem, 600) : it.title || 'Khối hình học');
    }
  }
  return lines.join('\n').slice(0, 2400);
}

export async function askSimilar(
  input: {source: string; count: number; level: Level; subject?: string | null},
  fetchImpl: typeof fetch = fetch,
): Promise<SimilarResponse> {
  let res: Response;
  try {
    res = await fetchImpl(`${apiBase()}/api/v1/canvas/similar-problems`, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({source: input.source.trim().slice(0, 2500), count: input.count, level: input.level, subject_hint: input.subject ?? undefined}),
    });
  } catch {
    throw new BoardQaError('Không kết nối được máy chủ AI. Kiểm tra mạng hoặc địa chỉ máy chủ trong "Kết nối AI".');
  }
  if (res.status === 429) throw new BoardQaError('Gọi AI quá nhanh, đợi vài giây rồi thử lại.', 429);
  if (!res.ok) throw new BoardQaError(res.status === 422 ? 'Đề gốc quá ngắn hoặc không hợp lệ.' : `Máy chủ AI trả lỗi ${res.status}.`, res.status);
  const data = (await res.json()) as SimilarResponse;
  if (!data || !Array.isArray(data.problems)) throw new BoardQaError('Máy chủ AI trả về dữ liệu không đọc được.');
  return data;
}

export const answerLine = (p: SimilarProblem): string => {
  const a = p.answer_text || (p.computed !== null ? num(p.computed) : '');
  return p.unit && a && !a.includes(p.unit) ? `${a} ${p.unit}` : a;
};

// ------------------------------------------------------------------ xuất
export function problemsToMarkdown(title: string, problems: SimilarProblem[], withAnswers: boolean): string {
  const out = [`# ${title}`, ''];
  problems.forEach((p, i) => out.push(`**Câu ${i + 1}.** ${p.statement}`, ''));
  if (withAnswers) {
    out.push('---', '', '## Đáp án và lời giải', '');
    problems.forEach((p, i) => {
      out.push(`**Câu ${i + 1}.** Đáp số: ${answerLine(p) || '(chưa có)'}${p.status === 'unverified' ? ' *(chưa được máy kiểm chứng)*' : ''}`);
      p.steps.forEach((s, k) => out.push(`${k + 1}. ${s}`));
      out.push('');
    });
  }
  return out.join('\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** chữ có công thức $...$ → HTML; công thức xuất MathML (trình duyệt tự vẽ, không cần CSS hay mạng) */
export function mathToHtml(text: string): string {
  return text
    .split(/(\$[^$]+\$)/g)
    .map((seg) => {
      if (/^\$[^$]+\$$/.test(seg)) {
        try {
          return katex.renderToString(seg.slice(1, -1), {output: 'mathml', throwOnError: false});
        } catch {
          return esc(seg);
        }
      }
      return esc(seg);
    })
    .join('');
}

/** Trang HTML tự đủ để in (Ctrl+P → Lưu PDF) hoặc mở bằng Word. Đáp án ở trang riêng sau đề. */
export function problemsToHtml(title: string, problems: SimilarProblem[], withAnswers: boolean): string {
  const qs = problems.map((p, i) => `<p class="q"><b>Câu ${i + 1}.</b> ${mathToHtml(p.statement)}</p>`).join('\n');
  const ans = withAnswers
    ? `<section class="ans"><h2>Đáp án và lời giải</h2>${problems
        .map(
          (p, i) =>
            `<div class="a"><b>Câu ${i + 1}.</b> Đáp số: ${mathToHtml(answerLine(p) || '(chưa có)')}${p.status === 'unverified' ? ' <i>(chưa được máy kiểm chứng)</i>' : ''}<ol>${p.steps.map((s) => `<li>${mathToHtml(s)}</li>`).join('')}</ol></div>`,
        )
        .join('')}</section>`
    : '';
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
body{font:15px/1.6 'Times New Roman',serif;max-width:760px;margin:24px auto;padding:0 16px;color:#111}
h1{font-size:20px;text-align:center}h2{font-size:17px}.q{margin:14px 0}.a{margin:12px 0}.ans{break-before:page;margin-top:32px}
@media print{body{margin:0;max-width:none}}</style></head><body><h1>${esc(title)}</h1>
${qs}
${ans}</body></html>`;
}
