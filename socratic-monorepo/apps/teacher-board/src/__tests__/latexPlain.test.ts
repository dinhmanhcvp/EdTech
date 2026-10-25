import {describe, it, expect} from 'vitest';
import {latexToPlain} from '../utils/latexPlain';

describe('latexToPlain: LaTeX → văn bản thuần', () => {
  it('số mũ, phân số, căn, góc, chỉ số dưới', () => {
    expect(latexToPlain('y=x^{2}-3')).toBe('y=x²-3');
    expect(latexToPlain(String.raw`\frac{x+1}{x-1}=2`)).toBe('(x+1)/(x-1)=2');
    expect(latexToPlain(String.raw`y=\sqrt{x+1}`)).toBe('y=√(x+1)');
    expect(latexToPlain(String.raw`\alpha=45^{\circ}`)).toBe('α=45°');
    expect(latexToPlain(String.raw`x_{1}+x_{2}\le 5`)).toBe('x_1+x_2≤ 5');
  });
  it('tên hàm, chữ trong \\text, lồng nhau', () => {
    expect(latexToPlain(String.raw`y=A\sin x+B`)).toBe('y=Asin x+B');
    expect(latexToPlain(String.raw`\text{Giải: } x=2`)).toBe('Giải: x=2');
    expect(latexToPlain(String.raw`\frac{1}{\sqrt{x}}`)).toBe('(1)/(√(x))');
    expect(latexToPlain(String.raw`\frac{\frac{1}{2}}{3}`)).toBe('((1)/(2))/(3)');
  });
  it('số mũ nhiều ký tự hoặc chữ giữ dạng ^(...)', () => {
    expect(latexToPlain('e^{x+1}')).toBe('e^(x+1)');
    expect(latexToPlain('x^{12}')).toBe('x¹²');
  });
});
