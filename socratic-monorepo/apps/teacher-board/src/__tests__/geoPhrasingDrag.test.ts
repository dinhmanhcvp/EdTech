import {describe, expect, it} from 'vitest';
import {buildScene, cleanHandwritten, splitParts} from '../utils/geometryProblem';
import {freePoints, moveFreePoint} from '../utils/geoTools';
import {detectFacts} from '../utils/geoClaims';
import {figureAuxIdeas} from '../utils/geoCoach';

const sc = (t: string) => buildScene(t).scene!;
const dot = (a: number[], b: number[], c: number[], d: number[]) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);

describe('cách nói thường gặp vẫn ra đủ điểm, có công thức', () => {
  it('"K là điểm đối xứng của H qua BC", "D là chân đường phân giác trong góc A", "các đường trung tuyến BM, CN cắt nhau tại G"', () => {
    expect(sc('Cho tam giác ABC nhọn, các đường cao AD, BE, CF cắt nhau tại H. Gọi K là điểm đối xứng của H qua BC.').defs!.K).toMatchObject({k: 'refl', p: 'H'});
    expect(sc('Cho tam giác ABC có AB = 3, AC = 4, BC = 5. Gọi D là chân đường phân giác trong góc A.').defs!.D).toBeTruthy();
    const g = sc('Cho tam giác ABC, các đường trung tuyến BM, CN cắt nhau tại G. Chứng minh GB = 2GM.');
    for (const n of 'MNG') expect(g.order, n).toContain(n);
    expect(sc('Cho tam giác ABC có AM là trung tuyến.').defs!.M).toBeTruthy();
  });

  it('phân giác góc cắt cạnh và đường tròn: D, E đủ', () => {
    const s = sc('Cho tam giác ABC cân tại A, nội tiếp đường tròn (O). Tia phân giác của góc BAC cắt BC tại D và cắt đường tròn tại E. Chứng minh AB.AC = AD.AE.');
    for (const n of 'DE') expect(s.order, n).toContain(n);
  });

  it('phần của đề đánh dấu a. / (a) / a:', () => {
    expect(splitParts('Cho tam giác ABC.\na. Gọi M là trung điểm BC.\nb. Gọi N là trung điểm CA.').map((p) => p.label)).toEqual(['Đề', 'a)', 'b)']);
    expect(splitParts('Cho tam giác ABC. (a) Gọi M là trung điểm BC. (b) Gọi N là trung điểm CA.').map((p) => p.label)).toEqual(['Đề', 'a)', 'b)']);
    expect(splitParts(cleanHandwritten('Cho hình vuông ABCD. 1) Tính AC. 2) Gọi O là tâm.')).map((p) => p.label)).toEqual(['Đề', '1)', '2)']);
  });
});

describe('kéo đỉnh: điểm có tính chất đi theo', () => {
  it('đường tròn đường kính BC cắt AB, AC tại M, N: kéo A thì M, N vẫn là chân đường cao, H = BN ∩ CM vẫn là trực tâm', () => {
    const s = sc('Cho tam giác ABC có ba góc nhọn, đường tròn đường kính BC cắt AB, AC lần lượt tại M và N. Gọi H là giao điểm của BN và CM. Chứng minh AH vuông góc BC.');
    expect(s.defs!.H).toMatchObject({k: 'inter'});
    const t = moveFreePoint(s, 'A', [s.pts.A[0] + 0.15, s.pts.A[1] + 0.1, 0]);
    const p = t.pts as Record<string, number[]>;
    expect(t.pts.M).not.toEqual(s.pts.M);
    expect(Math.abs(dot(p.N, p.B, p.N, p.C))).toBeLessThan(1e-7); // N nằm trên đường tròn đường kính BC
    expect(Math.abs(dot(p.B, p.C, p.A, p.H))).toBeLessThan(1e-7); // AH ⊥ BC
    expect(Math.abs(dot(p.A, p.B, p.C, p.M))).toBeLessThan(1e-7); // CM ⊥ AB
  });

  it('tiếp tuyến MA, MB và cát tuyến MCD: M kéo được, A, B, C, D, I theo, MA = MB và MA² = MC·MD giữ nguyên', () => {
    const s = sc('Từ điểm M nằm ngoài đường tròn (O) kẻ hai tiếp tuyến MA, MB (A, B là tiếp điểm) và cát tuyến MCD. Gọi I là trung điểm CD. Chứng minh MA^2 = MC.MD.');
    expect(freePoints(s)).toEqual(['M']);
    const t = moveFreePoint(s, 'M', [s.pts.M[0] + 0.5, s.pts.M[1] + 0.4, 0]);
    const p = t.pts as Record<string, number[]>;
    expect(p.A).not.toEqual(s.pts.A);
    const d = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    expect(d(p.M, p.A)).toBeCloseTo(d(p.M, p.B), 9);
    expect(d(p.O, p.A)).toBeCloseTo(1, 9);
    expect(Math.abs((p.A[0] - p.O[0]) * (p.A[0] - p.M[0]) + (p.A[1] - p.O[1]) * (p.A[1] - p.M[1]))).toBeLessThan(1e-9); // OA ⊥ MA
    expect(d(p.M, p.A) ** 2).toBeCloseTo(d(p.M, p.C) * d(p.M, p.D), 6);
    expect(new Set(detectFacts(t, 100)).size).toBeGreaterThan(0);
  });
});

describe('gợi ý đường phụ theo hình (Socratic)', () => {
  it('tiếp tuyến → nối tâm với tiếp điểm; tứ giác nội tiếp → đường chéo; trung tuyến → gấp đôi', () => {
    const tan = figureAuxIdeas(sc('Từ điểm M nằm ngoài đường tròn (O) kẻ hai tiếp tuyến MA, MB (A, B là tiếp điểm).'));
    expect(tan.some((i) => i.tool === 'segment' && i.names.join('') === 'OA')).toBe(true);
    expect(tan.every((i) => i.question.includes('?'))).toBe(true);
    const cyc = figureAuxIdeas(sc('Cho tứ giác ABCD nội tiếp đường tròn (O).'));
    expect(cyc[0].question).toContain('đường chéo');
    const med = figureAuxIdeas(sc('Cho tam giác ABC có AM là trung tuyến.'));
    expect(med[0]).toMatchObject({tool: 'reflpt', names: ['A', 'M']});
  });
});
