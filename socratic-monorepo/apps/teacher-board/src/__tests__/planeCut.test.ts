import {describe, expect, it} from 'vitest';
import {evalConstructs, nearestSide, toggleConstruct, type PlaneConstruct} from '../utils/planeConstruct';

// A(0,150) B(200,150) C(0,0): AB = 4, CA = 3, vuông tại A, diện tích 6 (1 đơn vị = 50 px)
const TRI = [{x: 0, y: 150}, {x: 200, y: 150}, {x: 0, y: 0}];
const cut = (over: Partial<PlaneConstruct> = {}): PlaneConstruct => ({k: 'cut', i: 0, j: 2, ta: 0.5, tb: 0.5, ...over});

describe('cắt hình (cut)', () => {
  it('đường cắt nối trung điểm AB với trung điểm CA: hai mảnh có diện tích 4,5 và 1,5, tổng bằng diện tích hình', () => {
    const d = evalConstructs(TRI, [cut()]);
    expect(d.segs).toHaveLength(1);
    expect(d.segs[0].a).toEqual({x: 100, y: 150});
    expect(d.segs[0].b).toEqual({x: 0, y: 75});
    expect(d.fills).toHaveLength(1);
    expect(d.fills[0].pts).toHaveLength(4); // mảnh tứ giác P-B-C-Q
    const fact = d.facts.join(' ');
    expect(fact).toContain('S₁ = 4,50');
    expect(fact).toContain('S₂ = 1,50');
    expect(fact).toContain('tổng 6,00');
    expect(fact).toContain('góc tại M = 143°, tại N = 127°'); // góc của mảnh 1 tại hai đầu đường cắt
  });

  it('tách mảnh: chỗ cũ chỉ còn viền đứt, mảnh 1 dời ra xa mảnh 2 một đoạn cố định', () => {
    const d = evalConstructs(TRI, [cut({sep: true})]);
    expect(d.fills).toHaveLength(2);
    expect(d.fills[0].dashed).toBe(true);
    const moved = d.fills[1].pts;
    const orig = d.fills[0].pts;
    const shift = Math.hypot(moved[0].x - orig[0].x, moved[0].y - orig[0].y);
    expect(shift).toBeCloseTo(16, 5);
    // mảnh 2 là tam giác Q-A-P ở góc dưới trái (màn hình, y xuống); mảnh 1 phải dời lên-phải, ra xa nó
    expect(moved[0].x - moved[0].y).toBeGreaterThan(orig[0].x - orig[0].y);
  });

  it('cắt sống khi kéo đỉnh: lưu theo cạnh + tham số, kéo B thì điểm P đi theo', () => {
    const moved = [TRI[0], {x: 300, y: 150}, TRI[2]];
    expect(evalConstructs(moved, [cut()]).segs[0].a).toEqual({x: 150, y: 150});
  });

  it('tham số hỏng (cùng cạnh, sát đầu mút, thiếu cạnh) bị bỏ qua chứ không vẽ bậy', () => {
    for (const bad of [cut({j: 0}), cut({ta: 0}), cut({tb: 1}), cut({j: undefined}), cut({j: 9})]) {
      const d = evalConstructs(TRI, [bad]);
      expect(d.segs).toHaveLength(0);
      expect(d.fills).toHaveLength(0);
    }
  });

  it('hai đường cắt khác nhau cùng tồn tại; bật lại đúng đường cũ thì bỏ nó', () => {
    const a = cut();
    const b = cut({ta: 0.25});
    const both = toggleConstruct(toggleConstruct([], a), b);
    expect(both).toHaveLength(2);
    expect(toggleConstruct(both, a)).toEqual([b]);
  });

  it('tứ giác cũng cắt được (hai cạnh đối)', () => {
    const sq = [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 100}, {x: 0, y: 100}];
    const d = evalConstructs(sq, [{k: 'cut', i: 0, j: 2, ta: 0.5, tb: 0.5}]);
    expect(d.segs).toHaveLength(1);
    expect(d.facts[0]).toMatch(/S₁ = [\d,]+, S₂ = [\d,]+/);
  });
});

describe('nearestSide', () => {
  it('trả cạnh gần nhất trong tầm với, bỏ cạnh xuất phát', () => {
    expect(nearestSide(TRI, {x: 100, y: 152}, 14)).toMatchObject({i: 0, t: 0.5});
    expect(nearestSide(TRI, {x: 100, y: 152}, 14, 0)).toBeNull();
    expect(nearestSide(TRI, {x: 100, y: 100}, 14)).toBeNull();
  });
});
