import {describe, it, expect} from 'vitest';
import {recognizeInk, classify, resample, type Pt} from '../utils/inkRecognizer';
import fixtures from './fixtures/ink-fixtures.json';

type Fx = Record<string, {src: string; expect: string; variants: number[][][][]}>;
const FX = fixtures as unknown as Fx;
const SCALE = 60; // đơn vị chữ hoa → pixel

const toStrokes = (v: number[][][]) => v.map((s) => ({points: s.map(([x, y]) => ({x: x * SCALE, y: y * SCALE}))}));

/** Chuẩn hóa LaTeX để so sánh: bỏ khoảng trắng và \, ; ^{x} → ^x; xuống dòng \\ → | */
export const canon = (s: string) =>
  s
    .replace(/\\,/g, '')
    .replace(/\s+/g, '')
    .replace(/\\\\/g, '|')
    .replace(/([\^_])\{(\w)\}/g, '$1$2');

const EXPECT: Record<string, string> = {
  lin1: '2x+3=7',
  lin2: '3x-5=2x+1',
  par: 'y=x^2-3',
  circ: 'x^2+y^2=25',
  pyth: 'a^2+b^2=c^2',
  sinf: String.raw`y=A\sinx+B`,
  fx: 'f(x)=2x^2-4x+1',
  neg: 'y=-x+4',
  sum: '12+35=47',
  sub: 'x_1+x_2=5',
  frac1: String.raw`\frac{1}{2}+\frac{3}{4}`,
  frac2: String.raw`\frac{x+1}{x-1}=2`,
  sqrt1: String.raw`y=\sqrt{x+1}`,
  cub: 'y=x^3-3x',
  two: 'x+y=5|x-y=1',
};

describe('inkRecognizer: hình học nét', () => {
  it('resample trả đúng n điểm, giữ hai đầu', () => {
    const p = resample([{x: 0, y: 0}, {x: 10, y: 0}, {x: 10, y: 10}], 21);
    expect(p).toHaveLength(21);
    expect(p[0]).toEqual({x: 0, y: 0});
    expect(Math.hypot(p[20].x - 10, p[20].y - 10)).toBeLessThan(1e-9);
  });
  it('nét rỗng không làm hỏng', () => {
    expect(recognizeInk([]).lines).toEqual([]);
    expect(recognizeInk([{points: [{x: 1, y: 1}]}]).symbolCount).toBeGreaterThanOrEqual(0);
  });
});

describe('inkRecognizer: đo độ chính xác trên nét Hershey người hóa', () => {
  const results: {id: string; v: number; got: string; ok: boolean; ms: number; conf: number; inAlt: boolean}[] = [];
  for (const [id, f] of Object.entries(FX)) {
    f.variants.forEach((v, vi) => {
      const r = recognizeInk(toStrokes(v));
      const got = canon(r.latex);
      const alts = r.lines.length === 1 ? r.lines[0].alternatives.map((a) => canon(a.latex)) : [];
      results.push({id, v: vi, got, ok: got === EXPECT[id], inAlt: got === EXPECT[id] || alts.includes(EXPECT[id]), ms: r.ms, conf: r.confidence});
    });
  }
  it('báo cáo độ chính xác', () => {
    const ok = results.filter((r) => r.ok).length;
    const inAlt = results.filter((r) => r.inAlt).length;
    console.log(`\nChính xác nguyên công thức: ${ok}/${results.length}  (đúng nếu tính cả 3 phương án gợi ý: ${inAlt}/${results.length})`);
    for (const r of results.filter((r) => !r.ok)) console.log(`  ✗ ${r.id}#${r.v}: ${r.got}   (cần ${EXPECT[r.id]})`);
    console.log(`  thời gian TB ${(results.reduce((s, r) => s + r.ms, 0) / results.length).toFixed(0)} ms, tối đa ${Math.max(...results.map((r) => r.ms)).toFixed(0)} ms`);
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('inkRecognizer: phân loại ký hiệu đơn', () => {
  it('trả về ứng viên có điểm tăng dần', () => {
    const line: Pt[] = Array.from({length: 20}, (_, i) => ({x: 0, y: i * 3}));
    const c = classify([line]);
    expect(c.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < c.length; i++) expect(c[i].cost).toBeGreaterThanOrEqual(c[i - 1].cost);
  });
});

describe('inkRecognizer: nét bảng thật có nhiễu và đảo thứ tự nét', () => {
  it('giữ đúng công thức khi điểm bị rung và lặp', () => {
    const base = toStrokes(FX.lin1.variants[0]);
    const noisy = base.map((s, si) => ({
      points: s.points.flatMap((p, i) => [
        {x: p.x + Math.sin(i * 1.7 + si) * 1.8, y: p.y + Math.cos(i * 1.3) * 1.4},
        i % 4 === 0 ? {x: p.x + 0.1, y: p.y + 0.1} : null,
      ].filter(Boolean) as Pt[]),
    }));
    const result = recognizeInk(noisy);
    expect(canon(result.latex)).toBe(EXPECT.lin1);
  });

  it('không phụ thuộc thứ tự hai nét của dấu bằng', () => {
    const base = toStrokes(FX.lin1.variants[0]);
    const swapped = [...base];
    const eqStart = swapped.findIndex((s) => s.points.length > 10 && Math.abs(s.points[0].y - s.points[s.points.length - 1].y) < 8);
    if (eqStart >= 0 && eqStart + 1 < swapped.length) {
      [swapped[eqStart], swapped[eqStart + 1]] = [swapped[eqStart + 1], swapped[eqStart]];
    }
    expect(canon(recognizeInk(swapped).latex)).toBe(EXPECT.lin1);
  });
});
