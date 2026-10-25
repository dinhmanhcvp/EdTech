import {describe, it, expect} from 'vitest';
import {compileExpr, tryCompile, parseEquation, normalizeMathInput, findRoots, findIntersections, findExtrema, integrate, derivative, toLatex, parseExpr, fmtNum} from '../utils/mathExpr';

const ev = (src: string, x = 0, p: Record<string, number> = {}) => compileExpr(src).eval(x, p);
const close = (a: number, b: number, d = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('mathExpr: phân tích và tính giá trị', () => {
  it('thứ tự ưu tiên và lũy thừa kết hợp phải', () => {
    close(ev('2+3*4'), 14);
    close(ev('(2+3)*4'), 20);
    close(ev('2^3^2'), 512);
    close(ev('-x^2', 3), -9); // -(x^2), không phải (-x)^2
    close(ev('2^-2'), 0.25);
    close(ev('10/4/5'), 0.5);
  });

  it('nhân ngầm kiểu viết tay: 2x, 3(x+1), (x+1)(x-1), 2sin x', () => {
    close(ev('2x', 3), 6);
    close(ev('3(x+1)', 1), 6);
    close(ev('(x+1)(x-1)', 4), 15);
    close(ev('2sin x', Math.PI / 2), 2);
    close(ev('x sin x', Math.PI / 2), Math.PI / 2);
  });

  it('hàm không ngoặc: sin 2x cos x = sin(2x)·cos(x), sin²x = (sin x)²', () => {
    close(ev('sin 2x cos x', 0.7), Math.sin(1.4) * Math.cos(0.7));
    close(ev('sin^2 x', 0.7), Math.sin(0.7) ** 2);
    close(ev('sin²x', 0.7), Math.sin(0.7) ** 2);
    close(ev('cos(x)^2 + sin(x)^2', 1.3), 1);
  });

  it('ký hiệu Unicode và dấu phẩy thập phân', () => {
    close(ev('x² − 3', 2), 1);
    close(ev('√(x+1)', 8), 3);
    close(ev('2π'), 2 * Math.PI);
    close(ev('x×2', 4), 8);
    close(ev('0,5x', 4), 2);
    close(ev('x³', -2), -8);
  });

  it('LaTeX: \\frac, \\sqrt, \\sin, mũ có ngoặc nhọn', () => {
    close(ev('\\frac{x^2}{2} + \\sqrt{x}', 4), 10);
    close(ev('\\sin\\left(2x\\right)', 0.4), Math.sin(0.8));
    close(ev('x^{-1}', 4), 0.25);
    close(ev('\\frac{1}{x+1}', 1), 0.5);
    close(ev('\\sqrt[3]{x}', 27), 3);
    close(ev('2\\cdot x', 5), 10);
    close(ev('\\left|x-3\\right|', 1), 2);
    close(ev('\\sin x \\cos x', 0.5), Math.sin(0.5) * Math.cos(0.5));
  });

  it('trị tuyệt đối |x| và căn bậc lẻ của số âm', () => {
    close(ev('|x|', -4), 4);
    close(ev('|x-1| + |x+1|', 0), 2);
    close(ev('x^(1/3)', -8), -2);
  });

  it('tự phát hiện tham số tự do để tạo thanh trượt', () => {
    const f = compileExpr('A sin x + B');
    expect(f.params).toEqual(['A', 'B']);
    close(f.eval(Math.PI / 2, {A: 2, B: 1}), 3);
    expect(compileExpr('a x^2 + b x + c').params).toEqual(['a', 'b', 'c']);
    expect(compileExpr('x^2 - 3').params).toEqual([]);
    expect(compileExpr('k sin(omega x + phi)').params).toEqual(['k', 'omega', 'phi']);
    close(ev('A sin(omega x)', Math.PI / 2, {A: 3, omega: 1}), 3);
  });

  it('báo lỗi rõ ràng với biểu thức sai', () => {
    for (const bad of ['', '2+', '(x+1', 'sin', '3 $ 4', 'x^']) {
      const r = tryCompile(bad);
      expect(r.ok, `"${bad}" phải lỗi`).toBe(false);
    }
  });
});

describe('mathExpr: phương trình', () => {
  it('y = x² − 3 và y = A sin x + B (hai hàm trong video)', () => {
    const a = parseEquation('y = x² − 3');
    expect(a.kind).toBe('explicit');
    close((a as any).fn.eval(3), 6);
    const b = parseEquation('y = A sin x + B');
    expect(b.kind).toBe('explicit');
    expect((b as any).fn.params).toEqual(['A', 'B']);
  });

  it('f(x) = …, biểu thức trần, đường tròn ẩn', () => {
    expect(parseEquation('f(x) = 2x + 1').kind).toBe('explicit');
    expect(parseEquation('x^2 - 3').kind).toBe('expression');
    const c = parseEquation('x^2 + y^2 = 4');
    expect(c.kind).toBe('implicit');
    close((c as any).fn.evalXY(2, 0), 0);
    close((c as any).fn.evalXY(0, 0), -4);
  });
});

describe('mathExpr: nghiệm, giao điểm, cực trị, tích phân', () => {
  it('nghiệm x² − 3 = 0 là ±√3', () => {
    const r = findRoots((x) => x * x - 3, -5, 5);
    expect(r.length).toBe(2);
    close(r[0], -Math.sqrt(3), 1e-6);
    close(r[1], Math.sqrt(3), 1e-6);
  });

  it('không báo nghiệm giả ở điểm gián đoạn của tan, 1/x', () => {
    expect(findRoots((x) => 1 / x, -2, 2).length).toBe(0);
    const t = findRoots((x) => Math.tan(x), -1.4, 1.4);
    expect(t.length).toBe(1);
    close(t[0], 0, 1e-6);
  });

  it('giao điểm x² − 3 và x − 1 là x = −1, 2', () => {
    const pts = findIntersections((x) => x * x - 3, (x) => x - 1, -5, 5);
    expect(pts.map((p) => +p.x.toFixed(4))).toEqual([-1, 2]);
    close(pts[1].y, 1, 1e-6);
  });

  it('giao điểm parabol với đồ thị sin (cảnh trong video)', () => {
    const f = compileExpr('x^2 - 3');
    const g = compileExpr('2 sin x + 1');
    const pts = findIntersections((x) => f.eval(x), (x) => g.eval(x, {}), -6, 6);
    expect(pts.length).toBeGreaterThanOrEqual(2);
    for (const p of pts) close(f.eval(p.x), g.eval(p.x), 1e-6);
  });

  it('cực trị của x³ − 3x: max tại −1 (y=2), min tại 1 (y=−2)', () => {
    const e = findExtrema((x) => x ** 3 - 3 * x, -3, 3);
    expect(e.length).toBe(2);
    expect(e[0].kind).toBe('max');
    close(e[0].x, -1, 1e-3);
    close(e[0].y, 2, 1e-3);
    expect(e[1].kind).toBe('min');
    close(e[1].x, 1, 1e-3);
  });

  it('tích phân và đạo hàm số', () => {
    close(integrate((x) => x * x, 0, 3), 9, 1e-9);
    close(integrate(Math.sin, 0, Math.PI), 2, 1e-6);
    close(derivative((x) => x ** 3, 2), 12, 1e-4);
  });
});

describe('mathExpr: xuất LaTeX chuẩn', () => {
  it('hiển thị phân số, căn, lũy thừa và hàm lượng giác', () => {
    expect(toLatex(parseExpr('x^2 - 3'))).toBe('x^{2} - 3');
    expect(toLatex(parseExpr('1/(x+1)'))).toContain('\\frac{1}{x + 1}');
    expect(toLatex(parseExpr('sqrt(x)'))).toBe('\\sqrt{x}');
    expect(toLatex(parseExpr('A sin x + B'))).toBe('A \\sin\\,x + B');
    expect(toLatex(parseExpr('2x'))).toBe('2 x');
    expect(toLatex(parseExpr('(x+1)^2'))).toContain('\\left(x + 1\\right)^{2}');
  });

  it('chuẩn hóa chuỗi nhận dạng thô', () => {
    expect(normalizeMathInput('y = x² − 3')).toBe('y = x^(2) - 3');
    expect(fmtNum(1.23456)).toBe('1,235');
    expect(fmtNum(0)).toBe('0');
  });
});
