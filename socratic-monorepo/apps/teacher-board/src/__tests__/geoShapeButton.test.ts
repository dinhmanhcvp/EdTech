import {describe, expect, it} from 'vitest';
import {arrowStrokePoints, circleStrokePoints, detectPlaneShapeFromStrokes, detectSolidSketch, frameStrokes, recentShapeCluster, squareStrokePoints, triangleStrokePoints} from '../utils/sketchSolid';
import {buildScene} from '../utils/geometryProblem';
import {planeTextWithCoords, problemTextForSolid} from '../utils/geoTools';

/**
 * Nút "Hình" trên thanh công cụ: công cụ vẽ tròn / thẳng / mũi tên / chữ nhật / vuông / tam giác và chế độ Trực quan hình học
 * (vẽ tay → hình dựng). Hình vẽ ra phải ĐÚNG như người vẽ / như tên công cụ.
 */
type Pt = {x: number; y: number};
const P = (x: number, y: number) => ({x, y});
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
const seg = (a: Pt, b: Pt, n = 14): Pt[] => Array.from({length: n + 1}, (_, i) => ({x: a.x + ((b.x - a.x) * i) / n + rnd(), y: a.y + ((b.y - a.y) * i) / n + rnd()}));
const lines = (es: [Pt, Pt][]) => es.map(([a, b]) => ({points: seg(a, b)}));
const ring = (vs: Pt[]) => vs.map((v, i) => [v, vs[(i + 1) % vs.length]] as [Pt, Pt]);
const boxInk = (w: number, h: number) => {
  const f = [P(100, 200), P(100 + w, 200), P(100 + w, 200 + h), P(100, 200 + h)];
  const b = f.map((p) => P(p.x + 70, p.y - 50));
  return lines([...ring(f), ...ring(b), ...f.map((p, i) => [p, b[i]] as [Pt, Pt])]);
};

describe('công cụ vẽ của nút Hình', () => {
  it('mũi tên giữ đầu mũi tên sau khi thả tay; hình tròn khép kín; hình vuông đủ 4 cạnh bằng nhau theo hướng kéo; tam giác cân trong khung', () => {
    const a = arrowStrokePoints(0, 0, 100, 0, 14);
    expect(a.length).toBe(5);
    expect(a[1]).toEqual({x: 100, y: 0});
    expect(a[2].x).toBeLessThan(100);
    expect(a[2].y * a[4].y).toBeLessThan(0); // hai cánh hai bên thân
    const c = circleStrokePoints(50, 50, 30);
    expect(Math.hypot(c[0].x - c[c.length - 1].x, c[0].y - c[c.length - 1].y)).toBeLessThan(1e-9);
    for (const p of c) expect(Math.hypot(p.x - 50, p.y - 50)).toBeCloseTo(30, 9);
    const s = squareStrokePoints(10, 10, -50, 30); // kéo sang trái, xuống
    expect(s[2]).toEqual({x: -50, y: 70});
    expect(Math.abs(s[1].x - s[0].x)).toBe(Math.abs(s[3].y - s[0].y));
    const t = triangleStrokePoints(0, 0, 100, 80);
    expect(t[0]).toEqual({x: 50, y: 0});
    expect(Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y)).toBeCloseTo(Math.hypot(t[0].x - t[2].x, t[0].y - t[2].y), 9);
  });
});

describe('Trực quan hình học: vẽ tay → hình đúng như vẽ', () => {
  it('hình hộp dẹt / cao: cạnh ngắn không bị bỏ như chữ ghi chú, nhận đúng hình hộp và tỉ lệ', () => {
    for (const [w, h] of [[320, 100], [120, 260]]) {
      const ink = boxInk(w, h);
      expect(frameStrokes(ink)).toHaveLength(12);
      const sk = detectSolidSketch(frameStrokes(ink))!;
      expect(sk.kind).toBe('box');
      expect(sk.dims.a! > sk.dims.c!).toBe(w > h);
    }
  });

  it('nhãn chữ viết cạnh hình vẫn được bỏ (nét ngắn, cong, không nối khung)', () => {
    const ink = [...lines(ring([P(100, 100), P(400, 100), P(400, 300), P(100, 300)])), {points: Array.from({length: 20}, (_, i) => P(80 + 10 * Math.cos(i / 3), 85 + 10 * Math.sin(i / 3)))}];
    expect(frameStrokes(ink)).toHaveLength(4);
  });

  it('chóp vẽ đỉnh thẳng trên một đỉnh đáy → SA ⊥ đáy (không thay bằng chóp đều); chóp/lăng trụ có chiều cao theo hình vẽ', () => {
    const bs = [P(100, 330), P(330, 330), P(400, 260), P(170, 260)];
    const right = detectSolidSketch(lines([...ring(bs), ...bs.map((p) => [P(102, 80), p] as [Pt, Pt])]))!;
    const t1 = problemTextForSolid(right.kind, right.dims, right.wire)!;
    expect(t1).toMatch(/SA vuông góc với đáy/);
    const s1 = buildScene(t1).scene!;
    const v = (a: string, b: string) => [0, 1, 2].map((i) => s1.pts[b][i] - s1.pts[a][i]);
    const dot = (x: number[], y: number[]) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
    expect(Math.abs(dot(v('A', 'S'), v('A', 'B'))) + Math.abs(dot(v('A', 'S'), v('A', 'D')))).toBeLessThan(1e-9);
    const tall = detectSolidSketch(lines([...ring(bs), ...bs.map((p) => [P(250, 20), p] as [Pt, Pt])]))!;
    const low = detectSolidSketch(lines([...ring(bs), ...bs.map((p) => [P(250, 200), p] as [Pt, Pt])]))!;
    const h = (t: string) => parseFloat(/chiều cao ([\d,]+)/.exec(t)![1].replace(',', '.'));
    expect(h(problemTextForSolid(tall.kind, tall.dims, tall.wire)!)).toBeGreaterThan(h(problemTextForSolid(low.kind, low.dims, low.wire)!));
  });

  it('ngũ giác, lục giác vẽ tay (một nét hoặc mỗi cạnh một nét) ra đúng đa giác đủ cạnh', () => {
    for (const n of [5, 6]) {
      const vs = Array.from({length: n}, (_, i) => P(250 + 150 * Math.cos((2 * Math.PI * i) / n), 220 + 150 * Math.sin((2 * Math.PI * i) / n)));
      for (const ink of [[{points: ring(vs).flatMap(([a, b]) => seg(a, b))}], lines(ring(vs))]) {
        const pl = detectPlaneShapeFromStrokes(frameStrokes(ink))!;
        expect(pl, `${n} cạnh, ${ink.length} nét`).toBeTruthy();
        const sc = buildScene(planeTextWithCoords(pl.kind, pl.vertices2D)!).scene!;
        expect(sc.edges).toHaveLength(n);
      }
    }
  });

  it('tam giác thường (các cạnh lệch nhau ≥ 10%) không bị nắn thành tam giác cân hay đều', () => {
    const pl = detectPlaneShapeFromStrokes(lines(ring([P(130, 80), P(90, 320), P(460, 320)])))!;
    expect(pl.kind).toBe('triangle_scalene');
  });

  it('chỉ lấy cụm nét vừa vẽ: chữ viết ở xa không bị gom vào hình (và không bị xóa)', () => {
    const word = {points: seg(P(900, 100), P(1000, 120))};
    const tri = lines(ring([P(100, 300), P(300, 300), P(200, 120)]));
    const got = recentShapeCluster([word, ...tri]);
    expect(got).toHaveLength(3);
    expect(got).not.toContain(word);
  });
});
