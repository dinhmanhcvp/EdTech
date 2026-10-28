import {describe, it, expect} from 'vitest';
import katex from 'katex';
import {looksMathy, typedToLatex} from '../utils/typedMath';
import {LIVE_CASES} from './liveDemoCases.test';

const renders = (latex: string) => {
  try {
    katex.renderToString(latex, {throwOnError: true, strict: 'ignore'});
    return true;
  } catch {
    return false;
  }
};

describe('chữ gõ lẫn công thức hiển thị đúng', () => {
  it('chữ tiếng Việt xen công thức không dính liền', () => {
    const l = typedToLatex('thấu kính hội tụ f = 100');
    expect(l).toContain('\\text{thấu}');
    expect(l).toContain('\\text{kính}');
    expect(l).toContain('\\text{hội}');
    expect(l).toContain('\\text{tụ}');
    expect(l).toContain('f');
    expect(l).toContain('100');
    expect(renders(l)).toBe(true);
  });

  it('độ C hiển thị đúng, không ra lệnh hỏng', () => {
    const l = typedToLatex('Mg + HCl 40°C');
    expect(l).toContain('40^{\\circ}');
    expect(l).not.toContain('\\circC');
    expect(renders(l)).toBe(true);
  });

  it('hàm toán học thành lệnh, căn bậc hai có ngoặc nhọn', () => {
    expect(typedToLatex('y = 2sin(3x)')).toContain('\\sin');
    expect(typedToLatex('y = sqrt(x + 1)')).toContain('\\sqrt{x + 1}');
    expect(renders(typedToLatex('y = sqrt(x + 1)'))).toBe(true);
  });

  it('số mũ không nuốt dấu cộng/trừ đứng sau khi viết liền', () => {
    expect(typedToLatex('(x-1)^2+(y+2)^2+(z-3)^2=25')).toBe('(x-1)^{2}+(y+2)^{2}+(z-3)^{2}=25');
    expect(typedToLatex('x^2-y^2=1')).toBe('x^{2}-y^{2}=1');
    expect(typedToLatex('e^-x')).toBe('e^{-x}');
    expect(typedToLatex('x^(n+1)')).toBe('x^{n+1}');
  });

  it('công thức thuần không thay đổi hình thức cũ', () => {
    expect(typedToLatex('x^2 + y^2 + z^2 = 9')).toBe('x^{2} + y^{2} + z^{2} = 9');
  });

  it('mọi câu trình diễn có dấu hiệu công thức đều dịch được sang KaTeX hợp lệ', () => {
    const bad: string[] = [];
    for (const c of LIVE_CASES) {
      if (c.input.includes('\n') || !looksMathy(c.input)) continue;
      const l = typedToLatex(c.input);
      if (!renders(l)) bad.push(`${c.id}: ${c.input} → ${l}`);
    }
    expect(bad).toEqual([]);
  });
});
