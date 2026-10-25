import {describe, it, expect} from 'vitest';
import {detectSolidFromStrokes, simplify, buildGraph, type SketchPt} from '../utils/sketchSolid';
import {makeSolid, edgesOf, faceNormal, mulMV, rotAxis, mulMM, type V3} from '../utils/solids';
import type {SolidKind} from '../utils/localRouter';

// bộ sinh số ngẫu nhiên xác định để test lặp lại được
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Style = 'rot' | 'oblique';

/** Vẽ khối thành các nét "tay": mỗi cạnh một nét có nhiễu, đầu mút lệch/trễ. */
function sketch(kind: SolidKind, opts: {style?: Style; hidden?: boolean; seed?: number; dims?: {a?: number; b?: number; c?: number; h?: number}; joinFaces?: boolean} = {}) {
  const {style = 'rot', hidden = true, seed = 1, dims, joinFaces = false} = opts;
  const rnd = rng(seed);
  const solid = makeSolid(kind, dims);
  const R = mulMM(rotAxis([1, 0, 0], -0.45), rotAxis([0, 1, 0], 0.55));
  const P = (v: V3): SketchPt => {
    if (style === 'oblique') return {x: v[0] + 0.5 * v[2] * 0.7, y: -(v[1] + 0.5 * v[2] * 0.7)};
    const r = mulMV(R, v);
    return {x: r[0], y: -r[1]};
  };
  const S = 70; // đơn vị → pixel
  const pts = solid.verts.map((v) => {
    const p = P(v);
    return {x: 300 + p.x * S, y: 300 + p.y * S};
  });
  // mặt nhìn thấy
  const vis = solid.faces.map((f) => {
    const n = style === 'oblique' ? faceNormal(solid.verts, f) : mulMV(R, faceNormal(solid.verts, f));
    return style === 'oblique' ? n[2] > 1e-6 || n[0] * 0 + n[1] > 1e-6 || n[0] > 1e-6 : n[2] > 1e-6;
  });
  const es = edgesOf(solid.faces).filter(([a, b]) => {
    if (hidden) return true;
    return solid.faces.some((f, i) => vis[i] && f.includes(a) && f.includes(b));
  });
  const strokes: {points: SketchPt[]}[] = [];
  const jit = () => (rnd() - 0.5) * 3.2;
  for (const [a, b] of es) {
    const A = pts[a];
    const B = pts[b];
    const ov = (rnd() - 0.3) * 8; // thừa/thiếu ở hai đầu
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const L = Math.hypot(dx, dy);
    const p0 = {x: A.x - (dx / L) * ov, y: A.y - (dy / L) * ov};
    const p1 = {x: B.x + (dx / L) * ((rnd() - 0.3) * 8), y: B.y + (dy / L) * ((rnd() - 0.3) * 8)};
    const n = 14;
    const line: SketchPt[] = [];
    for (let i = 0; i <= n; i++) line.push({x: p0.x + ((p1.x - p0.x) * i) / n + jit(), y: p0.y + ((p1.y - p0.y) * i) / n + jit()});
    strokes.push({points: line});
  }
  void joinFaces;
  return strokes;
}

describe('sketchSolid: đơn giản hóa nét', () => {
  it('đường thẳng nhiễu rút về 2 điểm; chữ L giữ 3 điểm', () => {
    const line = Array.from({length: 30}, (_, i) => ({x: i * 5, y: (i % 2) * 1.2}));
    expect(simplify(line, 4)).toHaveLength(2);
    const L = [...Array.from({length: 20}, (_, i) => ({x: i * 5, y: 0})), ...Array.from({length: 20}, (_, i) => ({x: 95, y: i * 5}))];
    expect(simplify(L, 4)).toHaveLength(3);
  });
});

describe('sketchSolid: nhận khối từ hình vẽ tay giả lập (chiếu 3D thật + nhiễu)', () => {
  const seeds = [1, 2, 3, 4, 5];

  it('hình lập phương vẽ đủ nét khuất (8 đỉnh, 12 cạnh)', () => {
    for (const seed of seeds) {
      const r = detectSolidFromStrokes(sketch('cube', {seed, hidden: true}));
      expect(r?.kind, `seed ${seed}`).toBe('cube');
    }
  });

  it('hình lập phương xiên (kiểu vẽ trên bảng) đủ nét', () => {
    for (const seed of seeds) {
      const r = detectSolidFromStrokes(sketch('cube', {seed, style: 'oblique', hidden: true}));
      expect(r?.kind, `seed ${seed}`).toBe('cube');
    }
  });

  it('hình hộp chữ nhật dài → "box" với tỉ lệ cạnh hợp lý', () => {
    for (const seed of seeds) {
      const r = detectSolidFromStrokes(sketch('box', {seed, style: 'oblique', hidden: true, dims: {a: 4, b: 2, c: 1.5}}));
      expect(r?.kind, `seed ${seed}`).toBe('box');
      if (r?.kind === 'box') {
        expect(r.dims.a!).toBeGreaterThan(r.dims.c!); // dài hơn cao
        expect(r.dims.a!).toBeLessThanOrEqual(5);
      }
    }
  });

  it('hình chóp tứ giác đều (đủ nét khuất)', () => {
    for (const seed of seeds) {
      const r = detectSolidFromStrokes(sketch('pyramid4', {seed, hidden: true}));
      expect(r?.kind, `seed ${seed}`).toBe('pyramid4');
    }
  });

  it('lăng trụ tam giác (đủ nét)', () => {
    for (const seed of seeds) {
      const r = detectSolidFromStrokes(sketch('prism3', {seed, hidden: true}));
      expect(r?.kind, `seed ${seed}`).toBe('prism3');
    }
  });

  it('không nhầm: hình vuông, tam giác, hình tròn, chữ viết → null', () => {
    const sq = [{points: [{x: 100, y: 100}, {x: 300, y: 100}, {x: 300, y: 300}, {x: 100, y: 300}, {x: 100, y: 100}]}];
    expect(detectSolidFromStrokes(sq)).toBeNull();
    const tri = [{points: [{x: 100, y: 300}, {x: 300, y: 300}, {x: 200, y: 120}, {x: 100, y: 300}]}];
    expect(detectSolidFromStrokes(tri)).toBeNull();
    const circle = [{points: Array.from({length: 60}, (_, i) => ({x: 300 + 120 * Math.cos((i / 59) * Math.PI * 2), y: 300 + 120 * Math.sin((i / 59) * Math.PI * 2)}))}];
    expect(detectSolidFromStrokes(circle)).toBeNull();
    expect(detectSolidFromStrokes([])).toBeNull();
  });

  it('đồ thị đỉnh/cạnh của hình lập phương đủ nét đúng 8/12', () => {
    const built = buildGraph(sketch('cube', {seed: 7, hidden: true}));
    expect(built?.graph.verts.length).toBe(8);
    expect(built?.graph.edges.length).toBe(12);
  });
});
