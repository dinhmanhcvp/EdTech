import {describe, expect, it} from 'vitest';
import {buildScene, type GeoScene} from '../utils/geometryProblem';
import {moveFreePoint, partChips, selectPartUpTo, setLabelOffset, showUpTo} from '../utils/geoTools';
import {auxIdeas, goalOf} from '../utils/geoCoach';
import {verifyClaim} from '../utils/geoClaims';
import {MAX_LABEL_DRIFT, defaultLabelOffset} from '../utils/geoLabels';

// đề dán từ PDF/ảnh: bị ngắt dòng giữa câu, tên điểm tách dòng
const P1 = `Bài 3 (3.0 điểm). Cho tam giác đều
ABC nội tiếp đường tròn
(O), điểm
D thuộc cung nhỏ
AB (
D khác
A và
B). Các tiếp tuyến với đường tròn
(O) tại các điểm
B và
C cắt đường thẳng
AD theo thứ tự tại
E và
G. Gọi
I là giao điểm của hai đường thẳng
CE và
BG.
a) Chứng minh rằng hai tam giác
EBC và
BCG đồng dạng.b) Tính số đo góc
BIC. Từ đó, hãy chứng minh rằng tứ giác
BIDE nội tiếp.c) Gọi
K là giao điểm của hai đường thẳng
DI và
BC. Chứng minh rằng
BK
2
 =KI⋅KD.`;

const P2 = `Cho tứ giác ABCD nội tiếp đường tròn (O) với ̂ DCB < ̂ ADC < 90◦, giả sử có điểm P
nằm trong tứ giác ABCD sao cho P A ⊥ AD và P B ⊥ BC. Dựng hình bình hành P AQB.
Gọi K là hình chiếu vuông góc của Q lên AB.
1. Chứng minh rằng ̂ KQB = ̂ BCD.
2. Gọi H là hình chiếu vuông góc của P lên CD. Chứng minh rằng HD
HC = KB
KA .
3. Lấy điểm R sao cho DR song song AH và CR song song BH. Gọi giao điểm của hai
đường thẳng RH và AB là L. Chứng minh rằng các điểm D, C, K, L cùng nằm trên
một đường tròn.`;

type V = [number, number, number];
const sub = (a: V, b: V) => [a[0] - b[0], a[1] - b[1]] as [number, number];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1];
const cr = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];
const d = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** cos / sin của góc giữa hai đường thẳng PQ và RS */
const cosL = (p: V, q: V, r: V, s: V) => dot(sub(q, p), sub(s, r)) / (d(p, q) * d(r, s));
const sinL = (p: V, q: V, r: V, s: V) => cr(sub(q, p), sub(s, r)) / (d(p, q) * d(r, s));
const checkP1 = (sc: GeoScene) => {
  const p = sc.pts as Record<string, V>;
  const O = p.O;
  expect(d(p.A, p.B)).toBeCloseTo(d(p.B, p.C), 5);
  expect(d(p.A, p.B)).toBeCloseTo(d(p.A, p.C), 5);
  for (const n of ['A', 'B', 'C', 'D']) expect(d(p[n], O)).toBeCloseTo(d(p.A, O), 5);
  expect(cosL(O, p.B, p.B, p.E)).toBeCloseTo(0, 5); // BE tiếp tuyến tại B
  expect(cosL(O, p.C, p.C, p.G)).toBeCloseTo(0, 5);
  expect(sinL(p.A, p.D, p.D, p.E)).toBeCloseTo(0, 5); // E, G nằm trên đường thẳng AD
  expect(sinL(p.A, p.D, p.D, p.G)).toBeCloseTo(0, 5);
  expect(sinL(p.C, p.E, p.E, p.I)).toBeCloseTo(0, 5); // I = CE ∩ BG
  expect(sinL(p.B, p.G, p.G, p.I)).toBeCloseTo(0, 5);
  expect(sinL(p.D, p.I, p.I, p.K)).toBeCloseTo(0, 5); // K = DI ∩ BC
  expect(sinL(p.B, p.C, p.C, p.K)).toBeCloseTo(0, 5);
};

describe('đề dài: tam giác đều + tiếp tuyến + cung (đề dán bị ngắt dòng)', () => {
  const sc = buildScene(P1).scene!;
  it('dựng đủ D, E, G, I, K và đường tròn NGOẠI tiếp (không phải nội tiếp), không báo "chưa hiểu"', () => {
    expect(sc.order).toEqual(expect.arrayContaining(['A', 'B', 'C', 'O', 'D', 'E', 'G', 'I', 'K']));
    expect(sc.ignored).toEqual([]);
    expect(sc.circles![0].r).toBeCloseTo(d(sc.pts.A as V, sc.pts.O as V), 6);
    checkP1(sc);
  });
  it('tách đúng bốn phần (đề, a, b, c); K ở phần c; D, E, G, I ở hình gốc; "(D khác A và B)." không thành phần b', () => {
    expect(sc.parts.map((x) => x.label)).toEqual(['Đề', 'a)', 'b)', 'c)']);
    expect(sc.ptPart.K).toBe(3);
    for (const n of ['D', 'E', 'G', 'I']) expect(sc.ptPart[n]).toBe(0);
  });
  it('coach đọc được yêu cầu từng phần và kiểm chứng đúng (kể cả khi kéo đỉnh), gợi ý đường phụ không vẽ sẵn', () => {
    expect(sc.circles).toHaveLength(1); // chỉ đường tròn (O): đường phụ do coach gợi ý, không tự vẽ sẵn lời giải
    const g = (i: number) => goalOf(sc.parts[i].text)!;
    expect(g(1).claim.k).toBe('sim');
    expect(g(2).claim.k).toBe('cyc');
    expect(g(3).claim.k).toBe('pow');
    for (const i of [1, 2, 3]) expect(verifyClaim(sc, g(i).text).verdict, sc.parts[i].label).toBe('holds');
    const idea = auxIdeas(sc, g(3).claim).find((x) => x.tool === 'circle3')!;
    expect(idea.names.slice().sort().join('')).toBe('BDI'); // BK² = KI·KD: vẽ đường tròn qua B, I, D
  });
  it('kéo đỉnh B hoặc D: vẫn đều, D trên đường tròn, tiếp tuyến/giao điểm đúng, đường tròn BIDE vẫn qua E', () => {
    const b = sc.pts.B as V;
    const moved = moveFreePoint(sc, 'B', [b[0] + 0.25, b[1] - 0.2, 0]);
    expect(moved.pts.B).not.toEqual(sc.pts.B);
    checkP1(moved);
    expect(verifyClaim(moved, 'tứ giác BIDE nội tiếp').verdict).toBe('holds');
    const d0 = sc.pts.D as V;
    const m2 = moveFreePoint(sc, 'D', [d0[0] + 0.1, d0[1] - 0.05, 0]);
    expect(m2.pts.D).not.toEqual(sc.pts.D);
    checkP1(m2);
  });
});

describe('đề dài: tứ giác nội tiếp + hình bình hành (đề dán bị ngắt dòng)', () => {
  const sc = buildScene(P2).scene!;
  const check = (s: GeoScene) => {
    const p = s.pts as Record<string, V>;
    for (const n of ['A', 'B', 'C', 'D']) expect(d(p[n], p.O)).toBeCloseTo(d(p.A, p.O), 5);
    expect(cosL(p.P, p.A, p.A, p.D)).toBeCloseTo(0, 5); // PA ⊥ AD
    expect(cosL(p.P, p.B, p.B, p.C)).toBeCloseTo(0, 5); // PB ⊥ BC
    expect(p.Q[0] + p.P[0]).toBeCloseTo(p.A[0] + p.B[0], 5); // PAQB hình bình hành
    expect(p.Q[1] + p.P[1]).toBeCloseTo(p.A[1] + p.B[1], 5);
    expect(cosL(p.Q, p.K, p.A, p.B)).toBeCloseTo(0, 5);
    expect(cosL(p.P, p.H, p.C, p.D)).toBeCloseTo(0, 5);
    expect(sinL(p.D, p.R, p.A, p.H)).toBeCloseTo(0, 5); // DR ∥ AH
    expect(sinL(p.C, p.R, p.B, p.H)).toBeCloseTo(0, 5); // CR ∥ BH
    expect(sinL(p.R, p.H, p.H, p.L)).toBeCloseTo(0, 5);
    expect(sinL(p.A, p.B, p.B, p.L)).toBeCloseTo(0, 5);
  };
  it('tách phần 1., 2., 3. và dựng đủ P, Q, K, H, R, L', () => {
    expect(sc.parts.map((x) => x.label)).toEqual(['Đề', '1.', '2.', '3.']);
    expect(sc.order).toEqual(expect.arrayContaining(['P', 'Q', 'K', 'H', 'R', 'L']));
    expect(sc.ignored).toEqual([]);
    check(sc);
  });
  it('coach: phần 1, 2, 3 đọc được và đúng trên hình (góc, tỉ số, bốn điểm đồng viên)', () => {
    const kinds = [1, 2, 3].map((i) => goalOf(sc.parts[i].text)!);
    expect(kinds.map((x) => x.claim.k)).toEqual(['ang', 'ratio', 'cyc']);
    for (const k of kinds) expect(verifyClaim(sc, k.text).verdict).toBe('holds');
  });
  it('kéo đỉnh A, C, D: tứ giác vẫn nội tiếp, P, Q, K, H, R, L theo đúng điều kiện đề, D, C, K, L vẫn đồng viên', () => {
    for (const n of ['A', 'C', 'D']) {
      const p = sc.pts[n] as V;
      const moved = moveFreePoint(sc, n, [p[0] + 0.12, p[1] - 0.1, 0]);
      expect(moved.pts[n]).not.toEqual(sc.pts[n]);
      check(moved);
      expect(verifyClaim(moved, 'D, C, K, L cùng nằm trên một đường tròn').verdict).toBe('holds');
    }
  });
});

describe('nút phần: bấm = vẽ hình tới phần đó', () => {
  const sc = showUpTo(buildScene(P2).scene!, 0); // lúc mới dựng các phần đều ẩn; phần 1 không vẽ gì nên không có nút
  const shown = (s: GeoScene) => partChips(s).filter((c) => c.shown).map((c) => c.label);
  it('chỉ có nút cho phần có nét vẽ; bấm phần 3 hiện cả phần 2 và 3; bấm phần 2 thì chỉ còn phần 2', () => {
    expect(partChips(sc).map((c) => c.label)).toEqual(['2.', '3.']);
    const c = selectPartUpTo(sc, 3);
    expect(shown(c)).toEqual(['2.', '3.']);
    expect(shown(selectPartUpTo(c, 2))).toEqual(['2.']);
  });
  it('bấm lại đúng phần cuối đang hiện thì lùi một phần', () => {
    expect(shown(selectPartUpTo(selectPartUpTo(sc, 3), 3))).toEqual(['2.']);
    expect(shown(selectPartUpTo(selectPartUpTo(sc, 2), 2))).toEqual([]);
  });
});

describe('chữ tên đỉnh', () => {
  it('mặc định nằm vào khe trống giữa các nét; kéo bị chặn trong bán kính nhỏ; kéo về null thì về mặc định', () => {
    const verts = [{x: 0, y: 0}, {x: 100, y: 0}, {x: 0, y: 100}];
    const edges = [{a: 0, b: 1}, {a: 0, b: 2}, {a: 1, b: 2}];
    const o = defaultLabelOffset(verts, edges, 0);
    expect(o.x).toBeLessThan(0); // đỉnh góc vuông: chữ nằm phía ngoài góc, không đè lên cạnh
    expect(o.y).toBeLessThan(0);
    const sc = buildScene(P1).scene!;
    const far = setLabelOffset(sc, 'C', {x: 500, y: 0});
    expect(Math.hypot(far.labelOff!.C.x, far.labelOff!.C.y)).toBeCloseTo(MAX_LABEL_DRIFT, 6);
    expect(setLabelOffset(far, 'C', null).labelOff).toBeUndefined();
  });
});
