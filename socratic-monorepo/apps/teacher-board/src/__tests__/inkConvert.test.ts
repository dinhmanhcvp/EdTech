import {describe, it, expect, vi} from 'vitest';
import {recognizeLocal, recognizeWithAi, layoutTypeset, typesetStroke, localVisualization, sourceStrokes, bboxOfStrokes} from '../utils/inkConvert';
import fixtures from './fixtures/ink-fixtures.json';
import type {Stroke} from '../utils/lassoGeometry';

type Fx = Record<string, {variants: number[][][][]}>;
const FX = fixtures as unknown as Fx;
const strokesOf = (id: string, v = 0, dx = 100, dy = 100, k = 60): Stroke[] =>
  FX[id].variants[v].map((s, i) => ({id: `s${i}`, color: '#000', width: 3, points: s.map(([x, y]) => ({x: dx + x * k, y: dy + y * k}))}));

describe('inkConvert: nhận dạng cục bộ → công thức', () => {
  it('y = x² − 3 viết tay ra LaTeX chuẩn', () => {
    const r = recognizeLocal(strokesOf('par'));
    expect(r.engine).toBe('local');
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].latex.replace(/\s/g, '')).toBe('y=x^{2}-3');
    expect(r.lines[0].valid).toBe(true);
  });

  it('bỏ qua đối tượng công thức đã gõ khi nhận dạng', () => {
    const typeset: Stroke = {id: 't', color: '#000', width: 0, points: [{x: 0, y: 0}], typeset: {latex: 'x', text: 'x', size: 30, w: 30, h: 40}};
    expect(sourceStrokes([typeset, ...strokesOf('par')])).toHaveLength(strokesOf('par').length);
  });

  it('hai dòng → hai dòng kết quả', () => {
    const r = recognizeLocal(strokesOf('two'));
    expect(r.lines.map((l) => l.latex.replace(/\s/g, ''))).toEqual(['x+y=5', 'x-y=1']);
  });
});

describe('inkConvert: đặt công thức lên bảng', () => {
  it('thay thế: đặt đúng vùng nét viết cũ, cỡ chữ hợp lý', () => {
    const src = strokesOf('par', 0, 200, 300);
    const r = recognizeLocal(src);
    const [p] = layoutTypeset(r.lines, src, 'replace');
    const bb = bboxOfStrokes(src);
    expect(Math.abs(p.x - bb.x0)).toBeLessThan(40);
    expect(p.y).toBeGreaterThan(bb.y0 - 40);
    expect(p.y).toBeLessThan(bb.y1);
    expect(p.meta.size).toBeGreaterThanOrEqual(22);
    expect(p.meta.size).toBeLessThanOrEqual(64);
  });

  it('chèn bên cạnh: nằm bên phải vùng gốc', () => {
    const src = strokesOf('par', 0, 200, 300);
    const [p] = layoutTypeset(recognizeLocal(src).lines, src, 'insert');
    expect(p.x).toBeGreaterThan(bboxOfStrokes(src).x1);
  });

  it('typesetStroke tạo nét một điểm mang metadata', () => {
    const src = strokesOf('par');
    const [p] = layoutTypeset(recognizeLocal(src).lines, src, 'replace');
    const t = typesetStroke(p, '#111');
    expect(t.points).toHaveLength(1);
    expect(t.typeset?.latex).toContain('x');
  });

  it('nhiều dòng từ AI (không có bbox) chia đều theo chiều dọc', () => {
    const src = strokesOf('two');
    const lines = [
      {text: 'x+y=5', latex: 'x+y=5', confidence: 0.9, alternatives: []},
      {text: 'x-y=1', latex: 'x-y=1', confidence: 0.9, alternatives: []},
    ];
    const ps = layoutTypeset(lines, src, 'replace');
    expect(ps).toHaveLength(2);
    expect(ps[1].y).toBeGreaterThan(ps[0].y + 20);
  });
});

describe('inkConvert: dựng trực quan cục bộ từ công thức đã nhận dạng', () => {
  it('y = x² − 3 → đồ thị', () => {
    const bp = localVisualization('y=x^{2}-3');
    expect(bp?.templateId).toBe('MATH_GRAPH');
  });
  it('hai hàm số (có tham số) → đồ thị nhiều hàm', () => {
    const bp = localVisualization('y=x^{2}-3 \\\\ y=A\\sin x+B');
    expect(bp?.templateId).toBe('MATH_GRAPH');
    expect((bp as unknown as {expressions: string[]}).expressions).toHaveLength(2);
  });
  it('chữ vô nghĩa không dựng được', () => {
    expect(localVisualization('lorem ipsum')).toBeNull();
  });
});

describe('inkConvert: đường AI (giả lập, KHÔNG gọi Gemini thật)', () => {
  const exportImage = async () => 'data:image/png;base64,AAAA';
  const ok = (body: unknown) => ({ok: true, status: 200, json: async () => body}) as unknown as Response;

  it('chuẩn hóa kết quả máy chủ', async () => {
    const fetchImpl = vi.fn(async () => ok({engine: 'gemini', model: 'gemini-2.5-flash', confidence: 0.9, lines: [{text: 'Giải: x = 2', latex: '\\text{Giải: } x = 2', confidence: 0.9}], alternatives: ['x=3']}));
    const r = await recognizeWithAi(strokesOf('par'), {fetchImpl: fetchImpl as unknown as typeof fetch, apiKey: 'k', exportImage});
    expect(r?.engine).toBe('gemini');
    expect(r?.lines[0].latex).toBe('\\text{Giải: } x = 2');
    expect(r?.lines[0].alternatives[0].latex).toBe('x=3');
    const call = fetchImpl.mock.calls[0] as unknown as [string, {headers: Record<string, string>; body: string}];
    expect(call[1].headers['x-gemini-api-key']).toBe('k');
    expect(JSON.parse(call[1].body).image_base64).toContain('base64');
  });

  it('503 (chưa có khóa) → null để dùng bản cục bộ', async () => {
    const fetchImpl = vi.fn(async () => ({ok: false, status: 503, json: async () => ({detail: 'no_key'})}) as unknown as Response);
    expect(await recognizeWithAi(strokesOf('par'), {fetchImpl: fetchImpl as unknown as typeof fetch, apiKey: '', exportImage})).toBeNull();
  });

  it('mất mạng → null, không ném lỗi', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await recognizeWithAi(strokesOf('par'), {fetchImpl: fetchImpl as unknown as typeof fetch, apiKey: 'k', exportImage})).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2); // thử lại qua 127.0.0.1:8000
  });

  it('không có nét → null, không gọi mạng', async () => {
    const fetchImpl = vi.fn();
    expect(await recognizeWithAi([], {fetchImpl: fetchImpl as unknown as typeof fetch, exportImage})).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
