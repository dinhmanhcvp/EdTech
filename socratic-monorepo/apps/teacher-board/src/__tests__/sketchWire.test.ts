import {describe, it, expect} from 'vitest';
import {detectSolidFromStrokes, type SketchPt} from '../utils/sketchSolid';
import {buildSketchWire} from '../utils/sketchWire';

type P = {x: number; y: number};
const seg = (a: P, b: P, jitter = 0, seed = 1) => {
  let s = seed;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5) * jitter;
  return {points: Array.from({length: 13}, (_, i) => ({x: a.x + ((b.x - a.x) * i) / 12 + r(), y: a.y + ((b.y - a.y) * i) / 12 + r()}))};
};

/** Hình lập phương vẽ xiên: hình vuông trước (trái dưới) + hình vuông sau lệch lên phải; đủ 12 nét. */
function obliqueCube(jitter = 0, drawHidden = true) {
  const f: P[] = [{x: 100, y: 200}, {x: 220, y: 200}, {x: 220, y: 320}, {x: 100, y: 320}]; // trên-trái, trên-phải, dưới-phải, dưới-trái
  const b: P[] = f.map((p) => ({x: p.x + 60, y: p.y - 50}));
  const strokes = [];
  let k = 1;
  for (let i = 0; i < 4; i++) strokes.push(seg(f[i], f[(i + 1) % 4], jitter, k++));
  // đỉnh sau-dưới-trái b[3] và 3 cạnh chạm vào nó (b2-b3, b3-b0, f3-b3) chỉ vẽ khi drawHidden
  for (let i = 0; i < 4; i++) if (drawHidden || (i !== 3 && i !== 2)) strokes.push(seg(b[i], b[(i + 1) % 4], jitter, k++));
  for (let i = 0; i < 4; i++) if (drawHidden || i !== 3) strokes.push(seg(f[i], b[i], jitter, k++));
  // đỉnh sau-dưới-trái (ẩn) là b[3]
  return {strokes, f, b};
}

describe('hình khối giữ đúng nét người vẽ', () => {
  it('đồ thị nét vẽ đi theo SKetchSolid: số đỉnh/cạnh đúng, đỉnh nằm gần nét vẽ chứ không phải khối mẫu', () => {
    const {strokes, f, b} = obliqueCube(3);
    const sk = detectSolidFromStrokes(strokes)!;
    expect(sk.kind).toBe('cube');
    expect(sk.wire!.verts).toHaveLength(8);
    expect(sk.wire!.edges).toHaveLength(12);
    // mỗi đỉnh vẽ đều có một đỉnh của hình trong vòng 12 px (hình mẫu chuẩn sẽ lệch hàng chục px)
    for (const p of [...f, ...b]) {
      const near = Math.min(...sk.wire!.verts.map((v: SketchPt) => Math.hypot(v.x - p.x, v.y - p.y)));
      expect(near, `đỉnh (${p.x},${p.y})`).toBeLessThan(12);
    }
  });

  it('tỉ lệ người vẽ được giữ: hộp dẹt vẫn dẹt, không thành lập phương', () => {
    const f: P[] = [{x: 100, y: 250}, {x: 400, y: 250}, {x: 400, y: 330}, {x: 100, y: 330}];
    const b = f.map((p) => ({x: p.x + 80, y: p.y - 60}));
    const strokes = [
      ...f.map((p, i) => seg(p, f[(i + 1) % 4])),
      ...b.map((p, i) => seg(p, b[(i + 1) % 4])),
      ...f.map((p, i) => seg(p, b[i])),
    ];
    const sk = detectSolidFromStrokes(strokes)!;
    const w = buildSketchWire(sk.kind, sk.dims, sk.wire!, {x: 0, y: 0});
    const xs = w.verts.map((v) => v.x);
    const ys = w.verts.map((v) => v.y);
    expect((Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys))).toBeGreaterThan(2);
  });

  it('suy ra đúng 3 cạnh khuất tại một đỉnh và đặt tên đỉnh theo khối', () => {
    const {strokes} = obliqueCube(2);
    const sk = detectSolidFromStrokes(strokes)!;
    const w = buildSketchWire(sk.kind, sk.dims, sk.wire!, {x: 0, y: 0});
    expect(w.fitted).toBe(true);
    const hidden = w.edges.filter((e) => e.hidden);
    expect(hidden).toHaveLength(3);
    // ba cạnh khuất chung một đỉnh
    const common = [hidden[0].a, hidden[0].b].filter((v) => hidden.every((e) => e.a === v || e.b === v));
    expect(common).toHaveLength(1);
    // đỉnh khuất nằm bên trong (không phải đỉnh bao ngoài): ở đây là đỉnh sau-dưới-trái
    const hv = w.verts[common[0]];
    expect(hv.x).toBeGreaterThan(100 + 30);
    expect(hv.y).toBeLessThan(320 - 30);
    // đủ nhãn khác nhau
    expect(new Set(w.labels).size).toBe(8);
  });

  it('chỉ vẽ ba mặt thấy được (7 đỉnh): không có cạnh nào bị coi là khuất', () => {
    const {strokes} = obliqueCube(2, false);
    const sk = detectSolidFromStrokes(strokes);
    expect(sk?.kind).toBe('cube');
    const w = buildSketchWire(sk!.kind, sk!.dims, sk!.wire!, {x: 0, y: 0});
    expect(w.edges.filter((e) => e.hidden)).toHaveLength(0);
    expect(w.verts.length).toBe(sk!.wire!.verts.length);
  });

  it('hình không giống phép chiếu của khối: giữ nét liền hết, không bịa nét đứt', () => {
    const verts = [
      {x: 0, y: 0},
      {x: 300, y: 10},
      {x: 20, y: 200},
      {x: 280, y: 260},
      {x: 150, y: 400},
      {x: 40, y: 120},
      {x: 260, y: 130},
      {x: 160, y: 40},
    ];
    const edges: [number, number][] = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 6], [2, 7], [3, 5]];
    const w = buildSketchWire('cube', {}, {verts, edges}, {x: 0, y: 0});
    expect(w.edges.every((e) => !e.hidden)).toBe(true);
    expect(w.fitted).toBe(false);
  });

  it('tọa độ được dời về gốc của khung hình', () => {
    const {strokes} = obliqueCube(0);
    const sk = detectSolidFromStrokes(strokes)!;
    const w = buildSketchWire(sk.kind, sk.dims, sk.wire!, {x: 50, y: 100});
    expect(Math.min(...w.verts.map((v) => v.x))).toBeCloseTo(Math.min(...sk.wire!.verts.map((v) => v.x)) - 50, 5);
  });
});
