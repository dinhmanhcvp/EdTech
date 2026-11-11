import {describe, it, expect} from 'vitest';
import {buildScene} from '../utils/geometryProblem';
import {freePoints, moveFreePoint, planeTextWithCoords} from '../utils/geoTools';
import {detectPlaneShapeFromStrokes} from '../utils/sketchSolid';

const angle = (p: Record<string, number[]>, v: string, a: string, b: string) => {
  const u = [p[a][0] - p[v][0], p[a][1] - p[v][1]];
  const w = [p[b][0] - p[v][0], p[b][1] - p[v][1]];
  return (Math.acos((u[0] * w[0] + u[1] * w[1]) / (Math.hypot(...u) * Math.hypot(...w))) * 180) / Math.PI;
};
const dist = (p: Record<string, number[]>, a: string, b: string) => Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1]);

describe('nét vẽ tay → cảnh GeoScene giữ đúng hình đã vẽ', () => {
  it('tam giác vuông vẽ lệch, góc vuông ở đỉnh thứ 2: A là đỉnh góc vuông, tỉ lệ cạnh giữ nguyên, kéo đỉnh vẫn vuông', () => {
    // vuông tại (4,0); chân 4 và 2 (hơi lệch tay)
    const t = planeTextWithCoords('triangle_right', [[0, 0.05], [4, 0], [4.03, 2]])!;
    expect(t).toMatch(/^tam giác ABC vuông tại A, A\(/);
    const sc = buildScene(t).scene!;
    expect(angle(sc.pts, 'A', 'B', 'C')).toBeCloseTo(90, 0);
    const ratio = dist(sc.pts, 'A', 'B') / dist(sc.pts, 'A', 'C');
    expect(Math.max(ratio, 1 / ratio)).toBeGreaterThan(1.8); // 4 : 2, không phải mặc định 1,6 : 1,2
    expect(Math.max(ratio, 1 / ratio)).toBeLessThan(2.2);
    const f = freePoints(sc)[1];
    const moved = moveFreePoint(sc, f, [sc.pts[f][0] + 0.7, sc.pts[f][1] + 0.4, 0]);
    expect(angle(moved.pts, 'A', 'B', 'C')).toBeCloseTo(90, 0);
  });

  it('hình chữ nhật vẽ nghiêng vẫn là hình chữ nhật, tỉ lệ giữ nguyên và kéo đỉnh giữ 4 góc vuông', () => {
    const t = planeTextWithCoords('rectangle', [[0, 0], [5, 0.3], [4.7, 2.3], [-0.3, 2]])!;
    const sc = buildScene(t).scene!;
    for (const [v, a, b] of [['A', 'B', 'D'], ['B', 'A', 'C'], ['C', 'B', 'D'], ['D', 'A', 'C']] as const) expect(angle(sc.pts, v, a, b)).toBeCloseTo(90, 0);
    expect(dist(sc.pts, 'A', 'B') / dist(sc.pts, 'B', 'C')).toBeGreaterThan(2);
    const moved = moveFreePoint(sc, 'A', [sc.pts.A[0] + 0.5, sc.pts.A[1] + 0.5, 0]);
    expect(angle(moved.pts, 'B', 'A', 'C')).toBeCloseTo(90, 0);
    expect(angle(moved.pts, 'D', 'A', 'C')).toBeCloseTo(90, 0);
  });

  it('tam giác cân: đỉnh cân là A (AB = AC)', () => {
    const t = planeTextWithCoords('triangle_isosceles', [[0, 0], [4, 0], [2, 3]])!;
    const sc = buildScene(t).scene!;
    expect(dist(sc.pts, 'A', 'B')).toBeCloseTo(dist(sc.pts, 'A', 'C'), 3);
  });

  it('hình thang: AB ∥ CD khi tìm được cặp song song; không chắc thì dùng đề không tọa độ', () => {
    const ok = planeTextWithCoords('trapezoid', [[0, 0], [4, 0], [3, 2], [1, 2]])!;
    expect(ok).toContain('A(');
    const sc = buildScene(ok).scene!;
    const ab = [sc.pts.B[0] - sc.pts.A[0], sc.pts.B[1] - sc.pts.A[1]];
    const cd = [sc.pts.D[0] - sc.pts.C[0], sc.pts.D[1] - sc.pts.C[1]];
    expect(Math.abs(ab[0] * cd[1] - ab[1] * cd[0])).toBeLessThan(1e-6);
    expect(planeTextWithCoords('trapezoid', [[0, 0], [4, 0], [3, 3], [-2, 1]])).toBe('hình thang ABCD');
  });

  it('số đỉnh không khớp loại hình / loại không biết: trả đề thuần, không tọa độ sai', () => {
    expect(planeTextWithCoords('triangle_right', [[0, 0], [1, 0]])).toBe('tam giác ABC vuông tại A');
    expect(planeTextWithCoords('???', [[0, 0]])).toBeNull();
  });

  it('nét vẽ thật: nhận dạng hình chữ nhật từ nét rồi dựng cảnh đúng tỉ lệ', () => {
    const strokes = [
      {id: 'a', points: [{x: 100, y: 100}, {x: 400, y: 100}], color: '#000', width: 3},
      {id: 'b', points: [{x: 400, y: 100}, {x: 400, y: 200}], color: '#000', width: 3},
      {id: 'c', points: [{x: 400, y: 200}, {x: 100, y: 200}], color: '#000', width: 3},
      {id: 'd', points: [{x: 100, y: 200}, {x: 100, y: 100}], color: '#000', width: 3},
    ];
    const pl = detectPlaneShapeFromStrokes(strokes)!;
    expect(pl.kind).toBe('rectangle');
    const sc = buildScene(planeTextWithCoords(pl.kind, pl.vertices2D)!).scene!;
    const r = dist(sc.pts, 'A', 'B') / dist(sc.pts, 'B', 'C');
    expect(Math.max(r, 1 / r)).toBeGreaterThan(2.5); // 300 : 100
  });
});
