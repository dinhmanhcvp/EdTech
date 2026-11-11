import {describe, expect, it} from 'vitest';
import {detectPlaneShapeFromStrokes} from '../utils/sketchSolid';
import {shapeFromBlueprint} from '../utils/inlineShape';
import {planeMeasures} from '../utils/planeConstraints';
import {makePlaneGeometryBlueprint} from '../utils/localRouter';

// nét vẽ tay: 4 cạnh là 4 nét thẳng, có lệch nhẹ như tay thật
const poly = (pts: [number, number][], jitter = 3) =>
  pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    return {points: Array.from({length: 12}, (_, k) => ({x: a[0] + ((b[0] - a[0]) * k) / 11 + ((k * 7 + i) % 3) * jitter * 0.3, y: a[1] + ((b[1] - a[1]) * k) / 11 + ((k * 5 + i) % 3) * jitter * 0.3}))};
  });

describe('nhận hình phẳng vẽ tay → hình thoi / hình thang / tứ giác', () => {
  it('hình thoi', () => {
    const r = detectPlaneShapeFromStrokes(poly([[200, 100], [330, 175], [200, 250], [70, 175]]));
    expect(r?.kind).toBe('rhombus');
  });
  it('hình thang (đáy trên ngắn hơn đáy dưới, hai đáy song song)', () => {
    const r = detectPlaneShapeFromStrokes(poly([[150, 100], [250, 100], [330, 240], [70, 240]], 1));
    expect(r?.kind).toBe('trapezoid');
  });
  it('tứ giác thường không còn bị gọi là hình bình hành', () => {
    const r = detectPlaneShapeFromStrokes(poly([[100, 100], [300, 100], [360, 300], [40, 200]], 1));
    expect(r?.kind).toBe('quadrilateral');
  });
  it('hình bình hành vẫn nhận đúng', () => {
    const r = detectPlaneShapeFromStrokes(poly([[100, 100], [300, 100], [350, 220], [150, 220]], 1));
    expect(r?.kind).toBe('parallelogram');
  });
});

describe('hình nhận dạng được khớp đúng ràng buộc khi tạo', () => {
  it('hình chữ nhật vẽ tay lệch → 4 góc vuông đúng', () => {
    const sh = detectPlaneShapeFromStrokes(poly([[100, 100], [320, 108], [316, 230], [96, 222]], 2));
    expect(sh?.kind).toBe('rectangle');
    const made = shapeFromBlueprint(makePlaneGeometryBlueprint(sh!), 400, 300);
    const {angles} = planeMeasures(made!.plane!.verts);
    angles.forEach((a) => expect(a).toBeCloseTo(90, 3));
  });
});

// đa giác 5–8 cạnh thường vẽ liền một nét khép kín
const oneStroke = (pts: [number, number][], jitter = 1) => [{points: poly([...pts, pts[0]].slice(0, pts.length), jitter).flatMap((s) => s.points).concat([{x: pts[0][0], y: pts[0][1]}])}];

describe('đa giác 5–8 cạnh', () => {
  const reg = (n: number, r = 120, wob = 0): [number, number][] =>
    Array.from({length: n}, (_, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const k = 1 + (i % 2 ? wob : -wob);
      return [300 + r * k * Math.cos(a), 300 + r * k * Math.sin(a)];
    });
  const names = ['pentagon', 'hexagon', 'heptagon', 'octagon'];
  [5, 6, 7, 8].forEach((n, i) => {
    it(`đa giác đều ${n} cạnh`, () => {
      const r = detectPlaneShapeFromStrokes(oneStroke(reg(n)));
      expect(r?.kind).toBe(names[i]);
      expect(r?.title).toContain('đều');
    });
  });
  it('ngũ giác không đều vẫn là ngũ giác, không "đều"', () => {
    const r = detectPlaneShapeFromStrokes(oneStroke(reg(5, 120, 0.3)));
    expect(r?.kind).toBe('pentagon');
    expect(r?.title).not.toContain('đều');
  });
  it('khớp tạo hình: 5 đỉnh giữ nguyên, không lỗi', () => {
    const sh = detectPlaneShapeFromStrokes(oneStroke(reg(6)))!;
    expect(shapeFromBlueprint(makePlaneGeometryBlueprint(sh), 400, 300)?.plane?.verts).toHaveLength(6);
  });
});
