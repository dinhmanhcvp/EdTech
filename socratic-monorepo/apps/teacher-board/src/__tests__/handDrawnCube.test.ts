import {describe, it, expect} from 'vitest';
import {detectSolidFromStrokes} from '../utils/sketchSolid';

type P = {x: number; y: number};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function line(a: P, b: P, r: () => number, j: number, n = 16): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) out.push({x: a.x + ((b.x - a.x) * i) / n + (r() - 0.5) * j, y: a.y + ((b.y - a.y) * i) / n + (r() - 0.5) * j});
  return out;
}

function closedPoly(pts: P[], r: () => number, j: number): P[] {
  const q = [...pts, pts[0]];
  const out: P[] = [];
  for (let i = 0; i < q.length - 1; i++) out.push(...line(q[i], q[i + 1], r, j, 10).slice(i ? 1 : 0));
  return out;
}

/**
 * Cách người thật vẽ hình lập phương: hai hình vuông lệch nhau (chiều sâu khoảng 0,4–0,75 cạnh) nối bốn cạnh,
 * hình vuông vẽ bằng bốn nét rời hoặc một vòng kín, có hoặc không vẽ nét khuất.
 */
function cube(seed: number, hidden: boolean, closed: boolean, jit: number) {
  const r = rng(seed);
  const s = 0.8 + r() * 0.5;
  const ox = 0.28 + r() * 0.22;
  const oy = 0.28 + r() * 0.22;
  const cx = 300 + r() * 100;
  const cy = 250 + r() * 100;
  const rot = (r() - 0.5) * 0.3;
  const T = (p: P): P => ({x: cx + p.x * s * Math.cos(rot) - p.y * s * Math.sin(rot), y: cy + p.x * s * Math.sin(rot) + p.y * s * Math.cos(rot)});
  const f: P[] = [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 100}, {x: 0, y: 100}];
  const front = f.map(T);
  const back = f.map((p) => T({x: p.x + ox * 100, y: p.y - oy * 100}));
  const strokes: {points: P[]}[] = [];
  const square = (v: P[]) => (closed ? strokes.push({points: closedPoly(v, r, jit)}) : v.forEach((_, i) => strokes.push({points: line(v[i], v[(i + 1) % 4], r, jit)})));
  square(front);
  if (hidden) square(back);
  else strokes.push({points: closedPoly([back[3], back[0], back[1], back[2]], r, jit).slice(0, -1)});
  for (let i = 0; i < 4; i++) if (hidden || i !== 3) strokes.push({points: line(front[i], back[i], r, jit)});
  return strokes;
}

describe('hình lập phương vẽ tay kiểu người thật', () => {
  for (const hidden of [true, false]) {
    for (const closed of [false, true]) {
      it(`nhận đúng lập phương (${hidden ? 'có' : 'không'} nét khuất, ${closed ? 'vòng kín' : 'nét rời'})`, () => {
        const N = 40;
        let ok = 0;
        for (let i = 0; i < N; i++) if (detectSolidFromStrokes(cube(i + 1, hidden, closed, 4))?.kind === 'cube') ok++;
        expect(ok / N).toBeGreaterThanOrEqual(0.95);
      });
    }
  }
});
