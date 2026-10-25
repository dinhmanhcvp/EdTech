import {describe, it, expect} from 'vitest';
import {recognizeSketch, type SkPt, type SkStroke} from '../utils/sketchGestures';
import fixtures from './fixtures/ink-fixtures.json';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const jit = (r: () => number, a = 2.2) => (r() - 0.5) * a;
const poly = (pts: [number, number][], r: () => number, per = 12): SkStroke => {
  const out: SkPt[] = [];
  for (let i = 1; i < pts.length; i++)
    for (let k = 0; k < per; k++) {
      const t = k / per;
      out.push({x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t + jit(r), y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t + jit(r)});
    }
  out.push({x: pts[pts.length - 1][0], y: pts[pts.length - 1][1]});
  return {points: out};
};
const fn = (f: (t: number) => [number, number], n: number, r: () => number): SkStroke => ({points: Array.from({length: n}, (_, i) => {
  const [x, y] = f(i / (n - 1));
  return {x: x + jit(r), y: y + jit(r)};
})});

const SEEDS = [1, 2, 3, 4, 5, 6];

describe('sketchGestures: nhận hình phác thảo STEM', () => {
  it('lò xo ziczac nằm ngang và thẳng đứng', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const teeth: [number, number][] = Array.from({length: 11}, (_, i) => [100 + i * 24, 300 + (i % 2 ? 40 : -40)]);
      expect(recognizeSketch([poly(teeth, r)])?.best.kind, `ngang ${seed}`).toBe('SPRING');
      const vert: [number, number][] = Array.from({length: 11}, (_, i) => [300 + (i % 2 ? 40 : -40), 100 + i * 24]);
      expect(recognizeSketch([poly(vert, r)])?.best.kind, `dọc ${seed}`).toBe('SPRING');
    }
  });

  it('đường lượn sóng hình sin (2,5 chu kỳ)', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const w = fn((t) => [100 + t * 400, 300 - 50 * Math.sin(t * Math.PI * 5)], 140, r);
      expect(recognizeSketch([w])?.best.kind, `seed ${seed}`).toBe('WAVE');
    }
  });

  it('parabol úp và ngửa', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const up = fn((t) => [100 + t * 300, 400 - 4 * 160 * t * (1 - t)], 80, r);
      const dn = fn((t) => [100 + t * 300, 240 + 4 * 160 * t * (1 - t)], 80, r);
      expect(recognizeSketch([up])?.best.kind, `úp ${seed}`).toBe('PARABOLA');
      expect(recognizeSketch([dn])?.best.kind, `ngửa ${seed}`).toBe('PARABOLA');
    }
  });

  it('elip kín (không có góc) khác khung chữ nhật mạch điện', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const e = fn((t) => [300 + 150 * Math.cos(t * 2 * Math.PI), 300 + 90 * Math.sin(t * 2 * Math.PI)], 90, r);
      expect(recognizeSketch([e])?.best.kind, `elip ${seed}`).toBe('ELLIPSE');
      const c = poly([[150, 200], [450, 200], [450, 340], [150, 340], [150, 202]], r, 20);
      expect(recognizeSketch([c])?.best.kind, `mạch ${seed}`).toBe('CIRCUIT');
    }
  });

  it('chạc chữ Y gồm 3 nét (thân + hai nhánh)', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const strokes = [poly([[300, 440], [300, 300]], r), poly([[300, 300], [220, 190]], r), poly([[300, 300], [380, 190]], r)];
      expect(recognizeSketch(strokes)?.best.kind, `seed ${seed}`).toBe('Y_FORK');
    }
  });

  it('hai hạt đậu "( )" ôm lấy khe ở giữa (khí khổng)', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const left = fn((t) => [260 - 40 * Math.sin(t * Math.PI), 180 + t * 200], 50, r); // phình trái
      const right = fn((t) => [310 + 40 * Math.sin(t * Math.PI), 180 + t * 200], 50, r); // phình phải
      expect(recognizeSketch([left, right])?.best.kind, `seed ${seed}`).toBe('BEANS');
    }
  });

  it('KHÔNG nhận nhầm: chữ viết tay, đường thẳng, nét nhỏ, hình vuông 4 nét, quá nhiều nét', () => {
    const r = rng(9);
    const FX = fixtures as unknown as Record<string, {variants: number[][][][]}>;
    for (const id of ['par', 'lin1', 'sinf', 'frac1', 'circ']) {
      const strokes = FX[id].variants[0].map((s) => ({points: s.map(([x, y]) => ({x: x * 60, y: y * 60}))}));
      expect(recognizeSketch(strokes), `chữ ${id}`).toBeNull();
    }
    expect(recognizeSketch([poly([[100, 100], [400, 300]], r)])).toBeNull(); // một đường thẳng
    expect(recognizeSketch([poly([[100, 100], [110, 108], [100, 116]], r, 4)])).toBeNull(); // nét nhỏ
    expect(recognizeSketch([])).toBeNull();
    const many = Array.from({length: 5}, (_, i) => poly([[100 + i * 30, 100], [100 + i * 30, 300]], r));
    expect(recognizeSketch(many)).toBeNull();
  });

  it('có phương án thay thế (Tap & Swap) khi hình mơ hồ', () => {
    const r = rng(3);
    const e = fn((t) => [300 + 150 * Math.cos(t * 2 * Math.PI), 300 + 100 * Math.sin(t * 2 * Math.PI)], 90, r);
    const res = recognizeSketch([e])!;
    expect(res.best.score).toBeGreaterThanOrEqual(0.6);
    expect(Array.isArray(res.alternatives)).toBe(true);
  });
});
