/**
 * Gọi endpoint hỏi đáp hiểu ngữ cảnh bảng: POST {apiBase}/api/v1/canvas/ask-board (services/ai-engine/routers/board_qa.py).
 * Khóa AI do người dùng nhập (localStorage) đi kèm qua tiêu đề, giống các endpoint nhận dạng khác.
 */
import {apiBase} from './apiBase';
import type {BoardContext} from './boardContext';

export interface BoardQaAction {
  type: 'visualize';
  label: string;
  text: string;
}

export interface BoardQaAnswer {
  headline: string;
  steps: string[];
  formula_latex: string;
  highlights: string[];
  follow_ups: string[];
  actions: BoardQaAction[];
  clarify: string;
  used: string[];
}

export interface BoardQaResponse {
  answer: BoardQaAnswer;
  /** gemini | openrouter = mô hình AI; offline = chỉ đọc số đo có sẵn trên bảng */
  source: 'gemini' | 'openrouter' | 'offline';
  model?: string | null;
  note?: string;
}

export interface BoardQaTurn {
  q: string;
  a: string;
}

export class BoardQaError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

const readKey = (name: string): string => {
  try {
    return (typeof window !== 'undefined' && window.localStorage.getItem(name)) || '';
  } catch {
    return '';
  }
};

export async function askBoard(
  input: {question: string; context: BoardContext; history?: BoardQaTurn[]; subject?: string | null; signal?: AbortSignal},
  fetchImpl: typeof fetch = fetch,
): Promise<BoardQaResponse> {
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  const g = readKey('gemini_api_key').trim();
  const o = readKey('openrouter_api_key').trim();
  if (g) headers['x-gemini-api-key'] = g;
  if (o) headers['x-openrouter-api-key'] = o;
  let res: Response;
  try {
    res = await fetchImpl(`${apiBase()}/api/v1/canvas/ask-board`, {
      method: 'POST',
      headers,
      signal: input.signal,
      body: JSON.stringify({
        question: input.question.trim().slice(0, 600),
        context: input.context,
        history: (input.history ?? []).slice(-4).map((t) => ({q: t.q.slice(0, 600), a: t.a.slice(0, 1200)})),
        subject_hint: input.subject ?? undefined,
      }),
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new BoardQaError('Không kết nối được máy chủ AI. Kiểm tra mạng hoặc địa chỉ máy chủ trong "Kết nối AI".');
  }
  if (res.status === 429) throw new BoardQaError('Hỏi quá nhanh, đợi vài giây rồi hỏi lại.', 429);
  if (!res.ok) throw new BoardQaError(res.status === 422 ? 'Câu hỏi không hợp lệ (trống hoặc quá dài).' : `Máy chủ AI trả lỗi ${res.status}.`, res.status);
  const data = (await res.json()) as BoardQaResponse;
  if (!data?.answer) throw new BoardQaError('Máy chủ AI trả về dữ liệu không đọc được.');
  return data;
}

/** Tóm tắt một câu trả lời để làm lịch sử cho câu hỏi tiếp theo. */
export function answerDigest(a: BoardQaAnswer): string {
  return [a.headline, ...a.steps.slice(-2)].filter(Boolean).join(' ').slice(0, 1200);
}
