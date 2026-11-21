import {describe, expect, it} from 'vitest';
import {placeOnInk, sketchFigure} from '../utils/sketchFigure';
import {detectPlaneShapeFromStrokes, detectSolidSketch, frameStrokes, recentSession} from '../utils/sketchSolid';
import {circleFigureText, moveFreePoint, freePoints} from '../utils/geoTools';
import {renderScene, type GeoScene} from '../utils/geometryProblem';

/** Hình GHÉP vẽ tay (nhiều nét lồng nhau) → một hình dựng đủ mọi đoạn, đường tròn, điểm, có ràng buộc; kéo đỉnh vẫn giữ tính chất. */
type Pt = {x: number; y: number};
const P = (x: number, y: number) => ({x, y});
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
/** nét thẳng tay: rung ±1,5 px, hai đầu lệch ±j px (đầu mút không trùng khít) */
const seg = (a: Pt, b: Pt, j = 4, n = 16) => {
  const [a1, b1] = [P(a.x + rnd() * j, a.y + rnd() * j), P(b.x + rnd() * j, b.y + rnd() * j)];
  return {points: Array.from({length: n + 1}, (_, i) => P(a1.x + ((b1.x - a1.x) * i) / n + rnd() * 1.5, a1.y + ((b1.y - a1.y) * i) / n + rnd() * 1.5))};
};
/** một nét đi qua nhiều đỉnh (tam giác vẽ liền một nét) */
const path = (vs: Pt[]) => ({points: vs.slice(1).flatMap((v, k) => seg(vs[k], v, 0).points)});
const circle = (c: Pt, r: number, a0 = 0.3) => ({points: Array.from({length: 91}, (_, i) => {
  const a = a0 + (2.05 * Math.PI * i) / 90;
  return P(c.x + r * 1.03 * Math.cos(a) + rnd() * 2, c.y + r * 0.97 * Math.sin(a) + rnd() * 2);
})});
const foot = (p: Pt, a: Pt, b: Pt) => {
  const d = {x: b.x - a.x, y: b.y - a.y};
  const t = ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / (d.x * d.x + d.y * d.y);
  return P(a.x + d.x * t, a.y + d.y * t);
};
type V = [number, number, number];
const d2 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const perp = (s: GeoScene, p: string, q: string, a: string, b: string) => {
  const [u, v] = [[s.pts[q][0] - s.pts[p][0], s.pts[q][1] - s.pts[p][1]], [s.pts[b][0] - s.pts[a][0], s.pts[b][1] - s.pts[a][1]]];
  return Math.abs(u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]));
};
const collinear = (s: GeoScene, a: string, b: string, c: string) => {
  const [A, B, C] = [s.pts[a], s.pts[b], s.pts[c]];
  return Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])) / (d2(A, B) * d2(A, C) || 1);
};
const segs = (s: GeoScene) => new Set([...s.edges, ...s.aux].map(([a, b]) => [a, b].sort().join('')));
/** kéo từng điểm tự do đi vài hướng, trả các cảnh sau mỗi lần kéo */
const drags = (s: GeoScene) => {
  const out: GeoScene[] = [];
  for (const n of freePoints(s)) for (const [dx, dy] of [[0.3, 0.2], [-0.25, 0.35]]) out.push((s = moveFreePoint(s, n, [s.pts[n][0] + dx, s.pts[n][1] + dy, 0])));
  return out;
};

const A = P(420, 120), B = P(240, 420), C = P(680, 420);

describe('hình ghép vẽ tay → hình dựng có ràng buộc', () => {
  it('tam giác + ba đường cao + trực tâm: đủ ba chân đường cao, trực tâm là giao, kéo đỉnh vẫn vuông góc và đồng quy', () => {
    const [D, E, F] = [foot(A, B, C), foot(B, C, A), foot(C, A, B)];
    const ink = [path([A, B, C, A]), seg(A, D), seg(B, E), seg(C, F)];
    // không phải đa giác đơn; đồ thị 6 đỉnh 9 cạnh giống lăng trụ → hình ghép báo "phẳng" để được xét trước bộ nhận dạng khối
    expect(detectPlaneShapeFromStrokes(frameStrokes(ink))).toBeNull();
    expect(detectSolidSketch(frameStrokes(ink))?.kind).toBe('prism3');
    const fig = sketchFigure(ink)!;
    expect(fig.planar).toBe(true);
    const s = fig.scene;
    expect(s.order.slice(0, 3)).toEqual(['A', 'B', 'C']);
    const feet = Object.entries(s.defs!).filter(([, d]) => d.k === 'foot');
    expect(feet).toHaveLength(3);
    const H = Object.entries(s.defs!).find(([, d]) => d.k === 'inter')!;
    expect(H[0]).toBe('H');
    expect(segs(s).size).toBe(6); // 3 cạnh + 3 đường cao, không bỏ nét nào
    for (const sc of [s, ...drags(s)]) {
      for (const [n, d] of feet) if (d.k === 'foot') {
        expect(perp(sc, d.p, n, d.a, d.b)).toBeLessThan(1e-6);
        expect(collinear(sc, d.p, n, 'H')).toBeLessThan(1e-6); // ba đường cao đồng quy tại H
      }
    }
    expect(freePoints(s).sort()).toEqual(['A', 'B', 'C']);
  });

  it('tam giác + đường tròn ngoại tiếp + trung tuyến: đường tròn qua ba đỉnh, trung điểm cố định khi kéo', () => {
    const O = P(460, 330);
    const R = Math.hypot(A.x - O.x, A.y - O.y);
    // đặt B, C đúng trên đường tròn
    const Bc = P(O.x + R * Math.cos(2.9), O.y + R * Math.sin(2.9));
    const Cc = P(O.x + R * Math.cos(0.25), O.y + R * Math.sin(0.25));
    const Ac = P(O.x + R * Math.cos(-1.2), O.y + R * Math.sin(-1.2));
    const M = P((Bc.x + Cc.x) / 2, (Bc.y + Cc.y) / 2);
    const ink = [circle(O, R), seg(Ac, Bc), seg(Bc, Cc), seg(Cc, Ac), seg(Ac, M)];
    const fig = sketchFigure(ink)!;
    const s = fig.scene;
    expect(s.circles).toHaveLength(1);
    expect(s.circles![0].of?.f).toBe('circum');
    const mid = Object.entries(s.defs!).find(([, d]) => d.k === 'seg')!;
    expect(mid[0]).toBe('M');
    expect(mid[1]).toMatchObject({t: 0.5, fix: true});
    expect(segs(s).size).toBe(4);
    for (const sc of [s, ...drags(s)]) {
      const c = sc.circles![0];
      for (const n of ['A', 'B', 'C']) expect(Math.abs(d2(sc.pts[n], c.center) - c.r)).toBeLessThan(1e-6);
      const [Bp, Cp, Mp] = [sc.pts.B, sc.pts.C, sc.pts.M];
      expect(Math.hypot(Mp[0] - (Bp[0] + Cp[0]) / 2, Mp[1] - (Bp[1] + Cp[1]) / 2)).toBeLessThan(1e-6);
    }
  });

  it('hai tiếp tuyến từ điểm ngoài đường tròn (kèm bán kính tới tiếp điểm và đoạn nối tâm): tiếp điểm có công thức, kéo điểm ngoài vẫn vuông góc', () => {
    const O = P(330, 300), r = 110, M = P(700, 300);
    const d = M.x - O.x;
    const al = Math.acos(r / d);
    const T1 = P(O.x + r * Math.cos(al), O.y - r * Math.sin(al));
    const T2 = P(O.x + r * Math.cos(al), O.y + r * Math.sin(al));
    const ink = [circle(O, r), seg(M, T1), seg(M, T2), seg(O, T1), seg(O, T2), seg(O, M)];
    // trước đây: chỉ ra đường tròn, mất hết tiếp tuyến
    expect(circleFigureText(frameStrokes(ink))).toBe('Cho đường tròn (O; 2)');
    const s = sketchFigure(ink)!.scene;
    const tans = Object.entries(s.defs!).filter(([, x]) => x.k === 'tan');
    expect(tans).toHaveLength(2);
    expect(new Set(tans.map(([, x]) => (x.k === 'tan' ? x.w : 0)))).toEqual(new Set([1, -1]));
    expect(segs(s).size).toBe(5);
    const ext = (tans[0][1] as {p: string}).p;
    expect(freePoints(s)).toContain(ext);
    for (const sc of [s, ...drags(s)]) {
      const c = sc.circles![0];
      for (const [n, x] of tans) if (x.k === 'tan') {
        expect(perp(sc, x.o, n, n, x.p)).toBeLessThan(1e-6);
        expect(Math.abs(d2(sc.pts[n], c.center) - c.r)).toBeLessThan(1e-6);
      }
    }
    // tiếp điểm nằm đúng chỗ đã vẽ (không đổi bên)
    const placed = placeOnInk(s, sketchFigure(ink)!.anchors);
    const f = renderScene(placed.scene);
    for (const [n] of tans) {
      const v = f.verts[placed.scene.order.indexOf(n)];
      const want = [T1, T2].sort((p, q) => Math.hypot(p.x - v.x - placed.origin.x, p.y - v.y - placed.origin.y) - Math.hypot(q.x - v.x - placed.origin.x, q.y - v.y - placed.origin.y))[0];
      expect(Math.hypot(v.x + placed.origin.x - want.x, v.y + placed.origin.y - want.y)).toBeLessThan(12);
    }
  });

  it('tứ giác nội tiếp có hai đường chéo: đường tròn qua bốn đỉnh, giao điểm I của hai đường chéo, kéo đỉnh vẫn nội tiếp', () => {
    const O = P(450, 300), R = 160;
    const at = (a: number) => P(O.x + R * Math.cos(a), O.y + R * Math.sin(a));
    const [Q1, Q2, Q3, Q4] = [at(-2.5), at(2.3), at(1.1), at(-0.4)];
    const ink = [circle(O, R, 1), path([Q1, Q2, Q3, Q4, Q1]), seg(Q1, Q3), seg(Q2, Q4)];
    expect(circleFigureText(frameStrokes(ink))).toBe('Cho đường tròn (O; 2)'); // trước đây: chỉ ra đường tròn
    const s = sketchFigure(ink)!.scene;
    expect(s.order.slice(0, 4)).toEqual(['A', 'B', 'C', 'D']);
    expect(s.circles![0].of?.f).toBe('circum');
    const I = Object.entries(s.defs!).find(([, d]) => d.k === 'inter')!;
    expect(I[0]).toBe('I');
    expect(segs(s).size).toBe(6);
    for (const sc of [s, ...drags(s)]) {
      const c = sc.circles![0];
      for (const n of ['A', 'B', 'C', 'D']) expect(Math.abs(d2(sc.pts[n], c.center) - c.r) / c.r).toBeLessThan(1e-3);
      expect(collinear(sc, 'A', 'C', 'I')).toBeLessThan(1e-6);
      expect(collinear(sc, 'B', 'D', 'I')).toBeLessThan(1e-6);
    }
  });

  it('hình dựng đặt KHÍT lên chính các nét: mỗi điểm cách chỗ vẽ không quá vài px', () => {
    const [D, E] = [foot(A, B, C), foot(B, C, A)];
    const ink = [seg(A, B), seg(B, C), seg(C, A), seg(A, D), seg(B, E)];
    const fig = sketchFigure(ink)!;
    const {scene, origin} = placeOnInk(fig.scene, fig.anchors);
    const f = renderScene(scene);
    scene.order.forEach((n, i) => {
      const a = fig.anchors[n];
      expect(Math.hypot(f.verts[i].x + origin.x - a.x, f.verts[i].y + origin.y - a.y), n).toBeLessThan(10);
    });
  });

  it('hình đơn không thuộc hình ghép: một tam giác, một đường tròn vẫn đi đường cũ', () => {
    expect(sketchFigure([circle(P(300, 300), 100)])).toBeNull();
    expect(detectPlaneShapeFromStrokes([path([A, B, C, A])])?.kind).toMatch(/^triangle/);
  });
});

describe('cung tròn và cát tuyến vẽ tay', () => {
  /** cung tay: tâm c, bán kính r, từ góc a0 tới a1 (radian, góc màn hình) */
  const arc = (c: Pt, r: number, a0: number, a1: number, n = 50) => ({points: Array.from({length: n + 1}, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return P(c.x + r * Math.cos(a) + rnd() * 1.5, c.y + r * Math.sin(a) + rnd() * 1.5);
  })});
  const onC = (s: GeoScene, n: string, i = 0) => Math.abs(d2(s.pts[n], s.circles![i].center) - s.circles![i].r) / s.circles![i].r;
  const nameAt = (s: GeoScene, anchors: Record<string, Pt>, p: Pt) => Object.keys(anchors).sort((a, b) => Math.hypot(anchors[a].x - p.x, anchors[a].y - p.y) - Math.hypot(anchors[b].x - p.x, anchors[b].y - p.y))[0];

  it('cát tuyến MXY từ điểm ngoài (một nét từ M tới Y trên đường tròn): X là giao thứ hai, kéo M vẫn thẳng hàng và trên đường tròn', () => {
    const O = P(330, 300), r = 120, M = P(720, 260);
    const Y = P(O.x + r * Math.cos(2.9), O.y + r * Math.sin(2.9));
    const ink = [circle(O, r), seg(M, Y), seg(O, M)];
    const fig = sketchFigure(ink)!;
    const s = fig.scene;
    const [m, y] = [nameAt(s, fig.anchors, M), nameAt(s, fig.anchors, Y)];
    const x = Object.entries(s.defs!).find(([, d]) => d.k === 'lcx' || d.k === 'lcint')?.[0];
    expect(x, JSON.stringify(s.defs)).toBeTruthy();
    expect(freePoints(s)).toContain(m);
    for (const sc of [s, ...drags(s)]) {
      expect(onC(sc, x!)).toBeLessThan(1e-6);
      expect(onC(sc, y)).toBeLessThan(1e-6);
      expect(collinear(sc, m, x!, y)).toBeLessThan(1e-6);
      expect(d2(sc.pts[x!], sc.pts[y])).toBeGreaterThan(1e-3); // hai giao khác nhau
    }
  });

  it('đường thẳng vẽ xuyên qua đường tròn (hai đầu ở ngoài): thêm đủ hai giao điểm, có công thức', () => {
    const O = P(400, 300), r = 120;
    const ink = [circle(O, r), seg(P(180, 230), P(650, 380)), seg(O, P(400, 180))];
    const s = sketchFigure(ink)!.scene;
    const hits = Object.entries(s.defs!).filter(([, d]) => d.k === 'lcint');
    expect(hits).toHaveLength(2);
    for (const sc of [s, ...drags(s)]) {
      const c = sc.circles![0];
      for (const [n, d] of hits) if (d.k === 'lcint') {
        expect(Math.abs(d2(sc.pts[n], c.center) - c.r)).toBeLessThan(1e-6);
        expect(collinear(sc, d.a, d.b, n)).toBeLessThan(1e-6);
      }
      expect(d2(sc.pts[hits[0][0]], sc.pts[hits[1][0]])).toBeGreaterThan(1e-3);
    }
  });

  it('đường cao AD kéo dài cắt đường tròn ngoại tiếp tại K: D là chân đường cao, K là giao thứ hai', () => {
    const O = P(460, 330), R = 190;
    const at = (a: number) => P(O.x + R * Math.cos(a), O.y + R * Math.sin(a));
    const [Ac, Bc, Cc] = [at(-1.25), at(2.75), at(0.35)];
    const Dp = foot(Ac, Bc, Cc);
    // K: giao thứ hai của AD với đường tròn
    const u = {x: Dp.x - Ac.x, y: Dp.y - Ac.y};
    const L = Math.hypot(u.x, u.y);
    const ux = u.x / L, uy = u.y / L;
    const tK = -2 * ((Ac.x - O.x) * ux + (Ac.y - O.y) * uy);
    const K = P(Ac.x + ux * tK, Ac.y + uy * tK);
    const ink = [circle(O, R), path([Ac, Bc, Cc, Ac]), seg(Ac, K)];
    const fig = sketchFigure(ink)!;
    const s = fig.scene;
    const D = Object.entries(s.defs!).find(([, d]) => d.k === 'foot');
    const Kn = Object.entries(s.defs!).find(([, d]) => d.k === 'lcx');
    expect(D, JSON.stringify(s.defs)).toBeTruthy();
    expect(Kn, JSON.stringify(s.defs)).toBeTruthy();
    for (const sc of [s, ...drags(s)]) {
      expect(perp(sc, 'A', D![0], 'B', 'C')).toBeLessThan(1e-6);
      expect(collinear(sc, 'A', D![0], Kn![0])).toBeLessThan(1e-6);
      expect(onC(sc, Kn![0])).toBeLessThan(1e-6);
    }
  });

  it('nửa đường tròn đường kính AB + điểm C trên cung: C luôn trên nửa đường tròn, góc ACB vuông', () => {
    const O = P(420, 360), r = 160;
    const Ap = P(O.x - r, O.y), Bp = P(O.x + r, O.y), Cp = P(O.x + r * Math.cos(-2.1), O.y + r * Math.sin(-2.1));
    const ink = [arc(O, r, Math.PI, 2 * Math.PI), seg(Ap, Bp), seg(Ap, Cp), seg(Cp, Bp)];
    expect(circleFigureText(frameStrokes(ink))).toBeNull(); // trước đây: không nhận ra
    const fig = sketchFigure(ink)!;
    const s = fig.scene;
    const c = s.circles![0];
    expect(c.of?.f).toBe('semi');
    const [a, b, cc] = [nameAt(s, fig.anchors, Ap), nameAt(s, fig.anchors, Bp), nameAt(s, fig.anchors, Cp)];
    expect(s.defs![cc]?.k).toBe('onc');
    const ang = (sc: GeoScene) => {
      const [u, v] = [[sc.pts[a][0] - sc.pts[cc][0], sc.pts[a][1] - sc.pts[cc][1]], [sc.pts[b][0] - sc.pts[cc][0], sc.pts[b][1] - sc.pts[cc][1]]];
      return Math.abs(u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]));
    };
    for (const sc of [s, ...drags(s)]) {
      expect(onC(sc, cc)).toBeLessThan(1e-6);
      expect(ang(sc)).toBeLessThan(1e-6);
    }
    // cung vẽ ở nửa TRÊN (màn hình): điểm giữa cung dựng ra cũng ở phía trên AB
    const placed = placeOnInk(s, fig.anchors);
    const f = renderScene(placed.scene);
    const arcPts = f.curves[0].pts;
    expect(arcPts[Math.floor(arcPts.length / 2)].y + placed.origin.y).toBeLessThan(O.y - 0.5 * r);
  });

  it('cung AB tâm O có hai bán kính OA, OB: B luôn cách O bằng OA', () => {
    const O = P(300, 400), r = 200;
    const Ap = P(O.x + r * Math.cos(-0.3), O.y + r * Math.sin(-0.3)), Bp = P(O.x + r * Math.cos(-1.9), O.y + r * Math.sin(-1.9));
    const ink = [arc(O, r, -0.3, -1.9), seg(O, Ap), seg(O, Bp)];
    const fig = sketchFigure(ink)!;
    const s = fig.scene;
    expect(s.circles![0].of?.f).toBe('sector');
    const [o, a, b] = [nameAt(s, fig.anchors, O), nameAt(s, fig.anchors, Ap), nameAt(s, fig.anchors, Bp)];
    for (const sc of [s, ...drags(s)]) near1(d2(sc.pts[o], sc.pts[a]), d2(sc.pts[o], sc.pts[b]));
  });

  it('đường tròn vẽ bằng hai cung vẫn là đường tròn; nét chữ V, cạnh hơi phồng không phải cung', () => {
    const O = P(400, 300), r = 130;
    const s = sketchFigure([arc(O, r, 0, Math.PI + 0.1), arc(O, r, Math.PI, 2 * Math.PI + 0.1), seg(P(400, 170), P(400, 430))])!.scene;
    expect(s.circles).toHaveLength(1);
    expect(s.circles![0].arc).toBeUndefined();
    const v = sketchFigure([path([P(200, 200), P(320, 420), P(440, 200)]), seg(P(200, 200), P(440, 200))])!.scene;
    expect(v.circles ?? []).toHaveLength(0);
  });
});
const near1 = (x: number, y: number) => expect(Math.abs(x - y)).toBeLessThan(1e-6);

describe('cạnh vẽ hơi cong không thành đỉnh mới', () => {
  /** cạnh cong: điểm giữa lệch khỏi dây cung `bow` (tỉ lệ độ dài cạnh) */
  const bowed = (a: Pt, b: Pt, bow: number, n = 24) => {
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
    return Array.from({length: n + 1}, (_, i) => {
      const t = i / n;
      const h = 4 * bow * L * t * (1 - t);
      return P(a.x + (b.x - a.x) * t + nx * h, a.y + (b.y - a.y) * t + ny * h);
    });
  };
  it('tam giác một nét có cạnh phồng 6–10% vẫn là tam giác, hình vuông vẫn là hình vuông', () => {
    for (const bow of [0.06, 0.08, 0.1]) {
      const tri = {points: [...bowed(A, B, bow), ...bowed(B, C, -bow).slice(1), ...bowed(C, A, 0).slice(1)]};
      expect(detectPlaneShapeFromStrokes([tri])?.vertices2D, `phồng ${bow}`).toHaveLength(3);
      const [p, q, r, t] = [P(200, 200), P(200, 420), P(420, 420), P(420, 200)];
      const sq = {points: [...bowed(p, q, bow), ...bowed(q, r, 0).slice(1), ...bowed(r, t, bow).slice(1), ...bowed(t, p, 0).slice(1)]};
      expect(detectPlaneShapeFromStrokes([sq])?.vertices2D, `vuông phồng ${bow}`).toHaveLength(4);
    }
  });
  it('lục giác, bát giác đều vẫn đủ đỉnh', () => {
    for (const n of [6, 8]) {
      const vs = Array.from({length: n + 1}, (_, i) => P(400 + 150 * Math.cos((2 * Math.PI * i) / n), 300 + 150 * Math.sin((2 * Math.PI * i) / n)));
      expect(detectPlaneShapeFromStrokes([path(vs)])?.vertices2D).toHaveLength(n);
    }
  });
});

describe('Trực quan hình học: gom cả lần vẽ', () => {
  it('nét vẽ liền nhau (cách nhau vài giây) được gom hết; nét của lần vẽ trước (dừng tay lâu) thì không', () => {
    const t0 = 1_763_000_000_000;
    const mk = (dt: number) => ({id: `stroke-${t0 + dt}-x`});
    const old = mk(0);
    const fresh = [mk(30_000), mk(33_000), mk(38_000), mk(41_000), mk(47_000), mk(52_000)];
    expect(recentSession([old, ...fresh])).toEqual(fresh);
  });
});
