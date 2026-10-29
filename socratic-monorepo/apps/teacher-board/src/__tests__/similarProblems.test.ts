import {describe, expect, it, vi} from 'vitest';
import type {BoardContext} from '../utils/boardContext';
import {BoardQaError} from '../utils/boardQa';
import {answerLine, askSimilar, mathToHtml, problemsToHtml, problemsToMarkdown, sourceFromContext, type SimilarProblem} from '../utils/similarProblems';

const P = (over: Partial<SimilarProblem> = {}): SimilarProblem => ({statement: 'Cho tam giác $ABC$ vuông tại $A$, $AB = 6$, $AC = 8$. Tính $AH$.', steps: ['Dùng $AH = \\frac{AB \\cdot AC}{BC}$', 'Thay số'], answer_text: '4,8 cm', unit: 'cm', status: 'verified', computed: 4.8, ...over});

describe('sourceFromContext', () => {
  const ctx: BoardContext = {
    items: [
      {id: 'f1', kind: 'formula', latex: 'x^2 - 5x + 6 = 0', text: ''},
      {id: 'p1', kind: 'plane', title: 'Tam giác ABC', measures: {sides: [4, 5, 3], angles: [90, 37, 53], area: 6, sides_named: {AB: 4, BC: 5, CA: 3}, angles_named: {A: 90, B: 37, C: 53}}},
      {id: 's1', kind: 'solid', title: 'Hình chóp', geo: {problem: 'Cho hình chóp S.ABCD đáy là hình vuông cạnh a, SA vuông góc đáy, SA = a.', parts: [], edges: []}},
      {id: 'ink', kind: 'ink', count: 3},
    ],
  };
  it('gom công thức, số đo hình phẳng, đề của hình khối; bỏ nét chưa nhận dạng', () => {
    const s = sourceFromContext(ctx);
    expect(s).toContain('$x^2 - 5x + 6 = 0$');
    expect(s).toContain('Tam giác ABC: AB = 4, BC = 5, CA = 3');
    expect(s).toContain('SA vuông góc đáy');
    expect(s).not.toContain('ink');
  });
  it('có vùng chọn thì chỉ lấy phần được chọn; bảng trống thì rỗng', () => {
    expect(sourceFromContext({...ctx, selection: {item_ids: ['f1']}})).toBe('$x^2 - 5x + 6 = 0$');
    expect(sourceFromContext({items: []})).toBe('');
  });
});

describe('askSimilar', () => {
  const ok = (body: unknown, status = 200) => vi.fn().mockResolvedValue({ok: status < 400, status, json: async () => body} as Response) as unknown as typeof fetch;
  it('POST đúng địa chỉ, gửi đề/số lượng/mức, khóa AI qua tiêu đề', async () => {
    localStorage.setItem('openrouter_api_key', ' KO ');
    const f = ok({problems: [], dropped: 0, source: 'offline'});
    await askSimilar({source: '  đề gốc  ', count: 4, level: 'harder', subject: 'MATH'}, f);
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/canvas\/similar-problems$/);
    expect((init.headers as Record<string, string>)['x-openrouter-api-key']).toBe('KO');
    expect(JSON.parse(init.body as string)).toEqual({source: 'đề gốc', count: 4, level: 'harder', subject_hint: 'MATH'});
    localStorage.clear();
  });
  it('phân loại lỗi', async () => {
    await expect(askSimilar({source: 'x', count: 1, level: 'same'}, ok({}, 429))).rejects.toThrow(/quá nhanh/);
    await expect(askSimilar({source: 'x', count: 1, level: 'same'}, ok({}, 422))).rejects.toThrow(/quá ngắn/);
    await expect(askSimilar({source: 'x', count: 1, level: 'same'}, ok({}, 500))).rejects.toThrow(/500/);
    await expect(askSimilar({source: 'x', count: 1, level: 'same'}, vi.fn().mockRejectedValue(new TypeError('x')) as unknown as typeof fetch)).rejects.toBeInstanceOf(BoardQaError);
    await expect(askSimilar({source: 'x', count: 1, level: 'same'}, ok({}))).rejects.toThrow(/không đọc được/);
  });
});

describe('xuất đề', () => {
  it('đáp số không lặp đơn vị khi lời đáp đã có sẵn; thiếu thì lấy số máy tính', () => {
    expect(answerLine(P())).toBe('4,8 cm');
    expect(answerLine(P({answer_text: '4,8'}))).toBe('4,8 cm');
    expect(answerLine(P({answer_text: '', unit: '', computed: 2.5}))).toBe('2,5');
  });
  it('Markdown: đề trước, đáp án sau (khi chọn); đề chưa kiểm chứng được gắn nhãn', () => {
    const md = problemsToMarkdown('Đề luyện', [P(), P({status: 'unverified'})], true);
    expect(md.indexOf('**Câu 1.**')).toBeLessThan(md.indexOf('## Đáp án'));
    expect(md).toContain('Đáp số: 4,8 cm');
    expect(md).toContain('*(chưa được máy kiểm chứng)*');
    expect(problemsToMarkdown('Đề', [P()], false)).not.toContain('Đáp án');
  });
  it('HTML in được: công thức thành MathML, ký tự lạ được thoát, đáp án ở trang riêng', () => {
    const html = problemsToHtml('Đề <b>', [P()], true);
    expect(html).toContain('<math');
    expect(html).toContain('Đề &lt;b&gt;');
    expect(html).toContain('class="ans"');
    expect(problemsToHtml('Đề', [P()], false)).not.toContain('class="ans"');
    expect(mathToHtml('a < b và $x^2$')).toContain('a &lt; b');
    expect(mathToHtml('$\\bad{$')).toBeTruthy(); // công thức hỏng không làm sập
  });
});
