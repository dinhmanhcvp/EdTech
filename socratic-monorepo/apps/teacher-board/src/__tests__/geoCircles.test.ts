import {describe, expect, it} from 'vitest';
import {appendPart, buildScene, renderScene} from '../utils/geometryProblem';
import {layoutGeo} from '../utils/geoTools';

const tri = () => buildScene('tam giác ABC vuông tại A').scene!;
const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

describe('yêu cầu bằng lời thêm vào hình đang có (không vẽ hình mới)', () => {
  it('đường tròn ngoại tiếp tam giác vuông: tâm là trung điểm cạnh huyền', () => {
    const sc = appendPart(tri(), 'vẽ đường tròn ngoại tiếp tam giác ABC');
    expect(sc.circles).toHaveLength(1);
    const c = sc.circles![0];
    const mid = [0, 1, 2].map((i) => (sc.pts.B[i] + sc.pts.C[i]) / 2);
    expect(dist(c.center, mid)).toBeLessThan(1e-6);
    expect(c.r).toBeCloseTo(dist(sc.pts.B, sc.pts.C) / 2, 6);
    // không thêm điểm hay hình mới, chỉ thêm một phần của đề
    expect(Object.keys(sc.pts)).toEqual(Object.keys(tri().pts));
    expect(sc.parts.length).toBe(2);
  });

  it('không ghi tên đa giác thì lấy tam giác cơ sở; có tên tâm thì thêm điểm O', () => {
    const sc = appendPart(tri(), 'Gọi O là tâm đường tròn ngoại tiếp');
    expect(sc.circles).toHaveLength(1);
    expect(sc.pts.O).toBeDefined();
    expect(dist(sc.pts.O, sc.circles![0].center)).toBeLessThan(1e-9);
  });

  it('đường tròn nội tiếp: bán kính r = (b + c - a)/2 với tam giác vuông', () => {
    const sc = appendPart(tri(), 'vẽ đường tròn nội tiếp tam giác ABC');
    const a = dist(sc.pts.B, sc.pts.C);
    const b = dist(sc.pts.A, sc.pts.C);
    const c = dist(sc.pts.A, sc.pts.B);
    expect(sc.circles![0].r).toBeCloseTo((b + c - a) / 2, 6);
  });

  it('hình vuông có đường tròn ngoại tiếp; hình bình hành thì báo không có', () => {
    const sq = appendPart(buildScene('hình vuông ABCD').scene!, 'vẽ đường tròn ngoại tiếp hình vuông ABCD');
    expect(sq.circles).toHaveLength(1);
    const para = appendPart(buildScene('hình bình hành ABCD').scene!, 'vẽ đường tròn ngoại tiếp ABCD');
    expect(para.circles ?? []).toHaveLength(0);
    expect(para.ignored.join(' ')).toContain('ngoại tiếp');
  });

  it('trực tâm, trung tuyến, phân giác', () => {
    const base = buildScene('tam giác ABC vuông tại A').scene!;
    const h = appendPart(base, 'Gọi H là trực tâm tam giác ABC');
    expect(h.merged.A).toContain('H'); // tam giác vuông tại A: trực tâm trùng A
    const h2 = appendPart(buildScene('tam giác ABC').scene!, 'Gọi H là trực tâm tam giác ABC');
    expect(h2.pts.H).toBeDefined(); // tam giác thường: H là điểm mới
    const med = appendPart(base, 'vẽ trung tuyến AM');
    expect(dist(med.pts.M, [0, 1, 2].map((i) => (base.pts.B[i] + base.pts.C[i]) / 2) as [number, number, number])).toBeLessThan(1e-9);
    const bis = appendPart(base, 'vẽ phân giác AD');
    expect(bis.pts.D).toBeDefined();
  });

  it('đường tròn được chiếu xuống bảng và nằm trong khung của hình', () => {
    const sc = appendPart(tri(), 'vẽ đường tròn ngoại tiếp tam giác ABC');
    const fig = renderScene(sc);
    expect(fig.curves).toHaveLength(1);
    expect(fig.curves[0].pts.length).toBeGreaterThan(60);
    const L = layoutGeo(sc, 1, {x: 100, y: 100});
    for (const p of L.sketch.curves![0].pts) {
      expect(p.x).toBeGreaterThanOrEqual(-1);
      expect(p.x).toBeLessThanOrEqual(L.w + 1);
      expect(p.y).toBeGreaterThanOrEqual(-1);
      expect(p.y).toBeLessThanOrEqual(L.h + 1);
    }
    // phần đã ẩn thì đường tròn cũng ẩn
    expect(renderScene(sc, 0).curves).toHaveLength(0);
  });

  it('đường tròn trong khối: ngoại tiếp đáy hình chóp', () => {
    const sc = appendPart(buildScene('hình chóp S.ABCD đáy ABCD là hình vuông cạnh a, SA vuông góc đáy').scene!, 'vẽ đường tròn ngoại tiếp hình vuông ABCD');
    expect(sc.circles).toHaveLength(1);
    expect(sc.circles![0].r).toBeCloseTo(Math.SQRT2 / 2, 6);
  });
});
