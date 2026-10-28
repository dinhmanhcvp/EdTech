import {describe, expect, it} from 'vitest';
import {
  BUNDLES,
  addConstructs,
  applicable,
  arcPath,
  circumcircleOf,
  evalConstructs,
  footOnLine,
  hasConstruct,
  incircleOf,
  lineIntersect,
  toggleConstruct,
  type PlaneConstruct,
} from '../utils/planeConstruct';

const P = (x: number, y: number) => ({x, y});
const dist = (a: {x: number; y: number}, b: {x: number; y: number}) => Math.hypot(a.x - b.x, a.y - b.y);
const TRI = [P(40, 220), P(300, 200), P(120, 30)]; // tam giác nhọn, lệch
const OBTUSE = [P(40, 200), P(300, 200), P(-30, 120)];
const RIGHT = [P(0, 0), P(120, 0), P(0, 90)];

const pt = (d: ReturnType<typeof evalConstructs>, label: string) => d.points.find((p) => p.label === label)!;

describe('hình học nền', () => {
  it('chân đường vuông góc nằm trên đường thẳng và vuông góc', () => {
    const F = footOnLine(P(5, 7), P(0, 0), P(10, 0));
    expect(F).toEqual({x: 5, y: 0});
  });
  it('giao hai đường thẳng; song song → null', () => {
    const r = lineIntersect(P(0, 0), P(1, 1), P(0, 10), P(1, -1))!;
    expect(r.pt.x).toBeCloseTo(5, 9);
    expect(r.pt.y).toBeCloseTo(5, 9);
    expect(lineIntersect(P(0, 0), P(1, 0), P(0, 5), P(2, 0))).toBeNull();
  });
  it('đường tròn ngoại tiếp cách đều ba đỉnh; thẳng hàng → null', () => {
    const c = circumcircleOf(TRI[0], TRI[1], TRI[2])!;
    for (const v of TRI) expect(dist(c.O, v)).toBeCloseTo(c.R, 6);
    expect(circumcircleOf(P(0, 0), P(1, 1), P(2, 2))).toBeNull();
  });
  it('đường tròn nội tiếp cách đều ba cạnh bằng r', () => {
    const {I, r} = incircleOf(TRI[0], TRI[1], TRI[2])!;
    for (let s = 0; s < 3; s++) expect(dist(I, footOnLine(I, TRI[s], TRI[(s + 1) % 3]))).toBeCloseTo(r, 6);
  });
  it('cung góc: chiều quét đổi theo chiều quay', () => {
    expect(arcPath(P(0, 0), 0, 1, 10)).toContain(' 0 0 1 ');
    expect(arcPath(P(0, 0), 1, 0, 10)).toContain(' 0 0 0 ');
  });
});

describe('dựng hình động', () => {
  it('không có phép dựng → rỗng', () => {
    const d = evalConstructs(TRI, []);
    expect(d.points).toHaveLength(0);
    expect(d.segs).toHaveLength(0);
  });

  it('trung tuyến: đầu mút là trung điểm cạnh đối; ba trung tuyến đồng quy tại G với AG:GM = 2', () => {
    const d = evalConstructs(TRI, BUNDLES.find((b) => b.id === 'G')!.items);
    expect(d.segs).toHaveLength(3);
    const g = pt(d, 'G');
    expect(g.x).toBeCloseTo((40 + 300 + 120) / 3, 9);
    for (const s of d.segs) {
      // G thuộc mỗi trung tuyến và chia theo tỉ lệ 2:1 tính từ đỉnh
      expect(dist(s.a, g) / dist(g, s.b)).toBeCloseTo(2, 6);
    }
    expect(d.facts.join(' ')).toContain('AG : GM = 2,00');
  });

  it('đường cao: vuông góc cạnh đối, ba đường cao đồng quy tại H', () => {
    const d = evalConstructs(TRI, BUNDLES.find((b) => b.id === 'H')!.items);
    const h = pt(d, 'H');
    for (let i = 0; i < 3; i++) {
      const s = d.segs[i];
      const a = TRI[i];
      const opp = [TRI[(i + 1) % 3], TRI[(i + 2) % 3]];
      const dir = {x: s.b.x - s.a.x, y: s.b.y - s.a.y};
      const side = {x: opp[1].x - opp[0].x, y: opp[1].y - opp[0].y};
      expect(dir.x * side.x + dir.y * side.y).toBeCloseTo(0, 4);
      // H nằm trên đường thẳng chứa đường cao
      const cr = (h.x - a.x) * dir.y - (h.y - a.y) * dir.x;
      expect(Math.abs(cr)).toBeLessThan(1e-6);
    }
    expect(d.rights).toHaveLength(3);
  });

  it('tam giác tù: H nằm ngoài, chân đường cao ngoài cạnh có đoạn kéo dài nét đứt', () => {
    const d = evalConstructs(OBTUSE, BUNDLES.find((b) => b.id === 'H')!.items);
    expect(d.segs.some((s) => s.dashed)).toBe(true);
    expect(d.facts.join(' ')).toContain('NGOÀI tam giác');
  });

  it('tam giác vuông: H trùng đỉnh góc vuông, O là trung điểm cạnh huyền', () => {
    const dh = evalConstructs(RIGHT, [{k: 'altitude', i: 0}, {k: 'altitude', i: 1}, {k: 'altitude', i: 2}, {k: 'orthocenter'}]);
    expect(pt(dh, 'H').x).toBeCloseTo(0, 6);
    expect(pt(dh, 'H').y).toBeCloseTo(0, 6);
    expect(dh.facts.join(' ')).toContain('tam giác vuông tại A');
    const dO = evalConstructs(RIGHT, [{k: 'circumcenter'}]);
    expect(pt(dO, 'O').x).toBeCloseTo(60, 6);
    expect(pt(dO, 'O').y).toBeCloseTo(45, 6);
  });

  it('phân giác: chia đôi góc và định lý đường phân giác DB/DC = AB/AC', () => {
    const d = evalConstructs(TRI, [{k: 'bisector', i: 0}]);
    const s = d.segs[0];
    const A = TRI[0];
    const u = {x: TRI[2].x - A.x, y: TRI[2].y - A.y}; // tia về đỉnh trước (i-1 = 2)
    const w = {x: TRI[1].x - A.x, y: TRI[1].y - A.y};
    const v = {x: s.b.x - A.x, y: s.b.y - A.y};
    const ang = (p: {x: number; y: number}, q: {x: number; y: number}) => Math.acos((p.x * q.x + p.y * q.y) / (Math.hypot(p.x, p.y) * Math.hypot(q.x, q.y)));
    expect(ang(u, v)).toBeCloseTo(ang(v, w), 6);
    const D = s.b;
    expect(dist(D, TRI[1]) / dist(D, TRI[2])).toBeCloseTo(dist(A, TRI[1]) / dist(A, TRI[2]), 6);
    expect(d.arcs).toHaveLength(2);
    expect(d.arcs[0].n).toBe(d.arcs[1].n); // hai góc bằng nhau được đánh dấu giống nhau
  });

  it('nội tiếp: ba phân giác cắt nhau tại I, I cách đều ba cạnh', () => {
    const d = evalConstructs(TRI, BUNDLES.find((b) => b.id === 'I')!.items);
    const I = pt(d, 'I');
    const r = d.circles[0].r;
    expect(d.circles[0].c.x).toBeCloseTo(I.x, 9);
    for (let s = 0; s < 3; s++) expect(dist(I, footOnLine(I, TRI[s], TRI[(s + 1) % 3]))).toBeCloseTo(r, 6);
  });

  it('trung trực: vuông góc tại trung điểm; ba đường đồng quy tại O, OA = OB = OC', () => {
    const d = evalConstructs(TRI, BUNDLES.find((b) => b.id === 'O')!.items);
    const O = pt(d, 'O');
    const lines = d.segs.filter((s) => !s.dashed);
    expect(lines).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      const s = lines[i];
      const a = TRI[i];
      const b = TRI[(i + 1) % 3];
      const m = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
      const dir = {x: s.b.x - s.a.x, y: s.b.y - s.a.y};
      expect(dir.x * (b.x - a.x) + dir.y * (b.y - a.y)).toBeCloseTo(0, 3);
      expect(Math.abs((m.x - s.a.x) * dir.y - (m.y - s.a.y) * dir.x)).toBeLessThan(1e-6);
      expect(Math.abs((O.x - s.a.x) * dir.y - (O.y - s.a.y) * dir.x)).toBeLessThan(1e-6); // O nằm trên đường trung trực
      expect(dist(O, a)).toBeCloseTo(d.circles[0].r, 6);
    }
  });

  it('đường trung bình: song song cạnh đối và bằng nửa cạnh đối', () => {
    const d = evalConstructs(TRI, [{k: 'midline', i: 0}]);
    const s = d.segs[0];
    const dir = {x: s.b.x - s.a.x, y: s.b.y - s.a.y};
    const opp = {x: TRI[2].x - TRI[1].x, y: TRI[2].y - TRI[1].y};
    expect(Math.abs(dir.x * opp.y - dir.y * opp.x)).toBeLessThan(1e-6);
    expect(Math.hypot(dir.x, dir.y)).toBeCloseTo(Math.hypot(opp.x, opp.y) / 2, 6);
  });

  it('đường tròn 9 điểm: bán kính R/2, tâm là trung điểm OH, đi qua chân đường cao và trung điểm cạnh', () => {
    const d = evalConstructs(TRI, BUNDLES.find((b) => b.id === 'N')!.items);
    const c = circumcircleOf(TRI[0], TRI[1], TRI[2])!;
    const nine = d.circles.find((x) => x.r < c.R)!;
    expect(nine.r).toBeCloseTo(c.R / 2, 6);
    const minors = d.points.filter((p) => p.minor);
    expect(minors).toHaveLength(9);
    for (const m of minors) expect(dist(nine.c, m)).toBeCloseTo(nine.r, 5);
  });

  it('tứ giác: đường chéo cắt nhau; hình bình hành → cắt nhau tại trung điểm', () => {
    const para = [P(0, 0), P(200, 0), P(240, 100), P(40, 100)];
    const d = evalConstructs(para, [{k: 'diagonals'}]);
    expect(d.segs).toHaveLength(2);
    expect(d.facts.join(' ')).toContain('trung điểm mỗi đường');
    const kite = [P(0, 0), P(200, 0), P(260, 100), P(40, 140)];
    expect(evalConstructs(kite, [{k: 'diagonals'}]).facts.join(' ')).not.toContain('trung điểm mỗi đường');
  });

  it('Varignon: nối trung điểm 4 cạnh của tứ giác bất kỳ luôn là hình bình hành', () => {
    const d = evalConstructs([P(0, 0), P(200, 20), P(260, 130), P(30, 160)], [{k: 'varignon'}]);
    expect(d.segs).toHaveLength(4);
    expect(d.facts.join(' ')).toContain('hình bình hành');
  });

  it('tam giác suy biến: báo, không văng lỗi, không vẽ gì', () => {
    const d = evalConstructs([P(0, 0), P(50, 50), P(100, 100)], BUNDLES[0].items);
    expect(d.degenerate).toBe(true);
    expect(d.segs).toHaveLength(0);
  });

  it('phép dựng không hợp với số đỉnh bị bỏ qua (đường cao của tứ giác)', () => {
    expect(applicable('altitude', 4)).toBe(false);
    expect(applicable('diagonals', 3)).toBe(false);
    const d = evalConstructs([P(0, 0), P(100, 0), P(100, 100), P(0, 100)], [{k: 'altitude', i: 0}]);
    expect(d.segs).toHaveLength(0);
  });

  it('động: kéo một đỉnh thì mọi đường dựng đổi theo và vẫn đúng định lý', () => {
    const items = BUNDLES.find((b) => b.id === 'G')!.items;
    const a = evalConstructs(TRI, items);
    const moved = [TRI[0], TRI[1], P(200, 60)];
    const b = evalConstructs(moved, items);
    expect(pt(b, 'G').x).not.toBeCloseTo(pt(a, 'G').x, 3);
    for (const s of b.segs) expect(dist(s.a, pt(b, 'G')) / dist(pt(b, 'G'), s.b)).toBeCloseTo(2, 6);
  });
});

describe('quản lý danh sách phép dựng', () => {
  it('toggle bật/tắt, addConstructs bỏ trùng', () => {
    const c: PlaneConstruct = {k: 'median', i: 1};
    let l = toggleConstruct(undefined, c);
    expect(hasConstruct(l, c)).toBe(true);
    l = toggleConstruct(l, c);
    expect(hasConstruct(l, c)).toBe(false);
    l = addConstructs(addConstructs([], BUNDLES[0].items), BUNDLES[0].items);
    expect(l).toHaveLength(4);
  });
});
