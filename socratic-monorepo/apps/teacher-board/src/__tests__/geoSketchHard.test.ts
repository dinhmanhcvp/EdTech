import {describe, expect, it} from 'vitest';
import {hasDashedLine, placeOnInk, sketchFigure, type SketchFigure} from '../utils/sketchFigure';
import {frameStrokes} from '../utils/sketchSolid';
import {circleFigureText, freePoints, moveFreePoint} from '../utils/geoTools';
import {renderScene, type GeoScene} from '../utils/geometryProblem';

/**
 * Hình ghép vẽ tay KHÓ: cả hình của một đề thi (nhiều đường lồng nhau), nét ẩu (lệch đầu mút, vẽ quá, rung tay, chiều vẽ ngược),
 * có chữ nhãn viết kèm. Mỗi hình: đi đúng nhánh hình ghép của bảng, đủ điểm, đúng ràng buộc, kéo MỌI điểm tự do nhiều lần vẫn đúng, đặt khít nét.
 */
type Pt = {x: number; y: number};
type Ink = {points: Pt[]}[];
const P = (x: number, y: number) => ({x, y});
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
let J = 4; // độ ẩu: lệch đầu mút (px)
/** nét thẳng tay: đầu mút lệch ±J, rung ±1,5 px; có thể vẽ ngược chiều */
const seg = (a: Pt, b: Pt, n = 18) => {
  const [a1, b1] = [P(a.x + rnd() * J, a.y + rnd() * J), P(b.x + rnd() * J, b.y + rnd() * J)];
  const pts = Array.from({length: n + 1}, (_, i) => P(a1.x + ((b1.x - a1.x) * i) / n + rnd() * 1.5, a1.y + ((b1.y - a1.y) * i) / n + rnd() * 1.5));
  return {points: rnd() > 0 ? pts : pts.reverse()};
};
const circle = (c: Pt, r: number) => {
  const a0 = rnd() * 3;
  return {points: Array.from({length: 91}, (_, i) => {
    const a = a0 + (2.06 * Math.PI * i) / 90;
    return P(c.x + r * 1.03 * Math.cos(a) + rnd() * 2, c.y + r * 0.97 * Math.sin(a) + rnd() * 2);
  })};
};
/** chữ nhãn nhỏ viết cạnh đỉnh (nét gấp khúc ~16 px) */
const label = (p: Pt) => ({points: [P(p.x + 14, p.y - 22), P(p.x + 20, p.y - 6), P(p.x + 26, p.y - 22), P(p.x + 22, p.y - 14)]});
const on = (c: Pt, R: number, a: number) => P(c.x + R * Math.cos(a), c.y + R * Math.sin(a));
const footPt = (p: Pt, a: Pt, b: Pt) => {
  const d = {x: b.x - a.x, y: b.y - a.y};
  const t = ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / (d.x * d.x + d.y * d.y);
  return P(a.x + d.x * t, a.y + d.y * t);
};
/** giao thứ hai của đường từ p (trên đường tròn) qua q với đường tròn */
const second = (c: Pt, p: Pt, q: Pt) => {
  const L = Math.hypot(q.x - p.x, q.y - p.y);
  const u = {x: (q.x - p.x) / L, y: (q.y - p.y) / L};
  const t = -2 * ((p.x - c.x) * u.x + (p.y - c.y) * u.y);
  return P(p.x + u.x * t, p.y + u.y * t);
};

// ---- kiểm trên cảnh
type V = number[];
const d2 = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cosLines = (s: GeoScene, a: string, b: string, c: string, d: string) => {
  const [u, v] = [[s.pts[b][0] - s.pts[a][0], s.pts[b][1] - s.pts[a][1]], [s.pts[d][0] - s.pts[c][0], s.pts[d][1] - s.pts[c][1]]];
  return Math.abs(u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]));
};
const col = (s: GeoScene, a: string, b: string, c: string) => {
  const [A, B, C] = [s.pts[a], s.pts[b], s.pts[c]];
  return Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])) / (d2(A, B) * d2(A, C) || 1);
};
const onC = (s: GeoScene, n: string, i = 0) => Math.abs(d2(s.pts[n], s.circles![i].center) - s.circles![i].r) / s.circles![i].r;
const E = 1e-6;
/** kéo lần lượt mọi điểm tự do theo 3 hướng; trả mọi cảnh trung gian */
const drags = (s: GeoScene) => {
  const out: GeoScene[] = [s];
  for (let round = 0; round < 2; round++)
    for (const n of freePoints(s))
      for (const [dx, dy] of [[0.22, 0.15], [-0.3, 0.2], [0.05, -0.28]]) out.push((s = moveFreePoint(s, n, [s.pts[n][0] + dx, s.pts[n][1] + dy, 0])));
  return out;
};
/** tên của điểm vẽ gần p nhất */
const at = (f: SketchFigure, p: Pt) => Object.keys(f.anchors).sort((a, b) => Math.hypot(f.anchors[a].x - p.x, f.anchors[a].y - p.y) - Math.hypot(f.anchors[b].x - p.x, f.anchors[b].y - p.y))[0];
/** bảng đi đúng nhánh hình ghép: không bị nhận là "đường tròn trần" hay hình đơn khác trước đó */
const recognize = (ink: Ink): SketchFigure => {
  const frame = frameStrokes(ink);
  expect(frame.length, 'bộ lọc khung bỏ mất nét của hình').toBe(ink.filter((q) => q.points.length > 4).length);
  const f = sketchFigure(frame)!;
  expect(f, 'không nhận ra hình ghép').toBeTruthy();
  expect(f.planar).toBe(true);
  // như convertSketchToFigure: hình ghép có đường phụ / nhiều đường tròn thì đi trước "đường tròn + đa giác"
  const rich = f.scene.aux.length > 0 || (f.scene.circles?.length ?? 0) > 1;
  const circ = circleFigureText(frame);
  expect(rich || !circ || circ === 'Cho đường tròn (O; 2)', `bộ nhận dạng hình đơn giành mất: ${circ}`).toBe(true);
  return f;
};
const visible = (s: GeoScene) => Object.keys(s.pts).filter((n) => !s.hiddenLabels?.includes(n));
/** mọi điểm của hình dựng nằm khít chỗ đã vẽ (≤ 12 px), kể cả điểm suy ra ở xa (giao của tiếp tuyến với đường kéo dài) */
const fitsInk = (f: SketchFigure) => {
  const {scene, origin} = placeOnInk(f.scene, f.anchors);
  const fig = renderScene(scene);
  scene.order.forEach((n, i) => {
    const a = f.anchors[n];
    if (a) expect(Math.hypot(fig.verts[i].x + origin.x - a.x, fig.verts[i].y + origin.y - a.y), `điểm ${n}`).toBeLessThan(12);
  });
};

/** Đề 1: tam giác nhọn nội tiếp (O), ba đường cao cắt nhau tại H, M trung điểm BC (OM ⊥ BC), AD kéo dài cắt (O) tại K, trung tuyến AM. */
function exam1() {
  const O = P(500, 380), R = 220;
  const [A, B, C] = [on(O, R, -1.35), on(O, R, 2.6), on(O, R, 0.45)];
  const [D, Eb, F] = [footPt(A, B, C), footPt(B, C, A), footPt(C, A, B)];
  const K = second(O, A, D);
  const M = P((B.x + C.x) / 2, (B.y + C.y) / 2);
  const ink: Ink = [circle(O, R), seg(A, B), seg(B, C), seg(C, A), seg(A, K), seg(B, Eb), seg(C, F), seg(O, M), seg(A, M)];
  return {ink, A, B, C, D, Eb, F, K, M, O};
}

describe('hình ghép vẽ tay khó nhất', () => {
  it('đề thi: tam giác nội tiếp + 3 đường cao + trực tâm + AD kéo dài tới K + trung điểm M (OM ⊥ BC) + trung tuyến AM', () => {
    const g = exam1();
    const f = recognize(g.ink);
    const n = (p: Pt) => at(f, p);
    const [A, B, C, D, Eb, F, K, M, O] = [g.A, g.B, g.C, g.D, g.Eb, g.F, g.K, g.M, g.O].map(n);
    const s = f.scene;
    expect([A, B, C, D, Eb, F, K, M, O]).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'K', 'M', 'O']); // tên theo quy ước đề
    expect(visible(s).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'H', 'K', 'M', 'O']); // chỗ trung tuyến cắt đường cao: điểm ẩn tên
    const H = Object.keys(s.pts).find((x) => s.defs?.[x]?.k === 'inter');
    expect(H, JSON.stringify(s.defs)).toBe('H');
    expect(s.defs![D]).toMatchObject({k: 'foot'});
    expect(s.defs![K]).toMatchObject({k: 'lcx'});
    expect(s.circles![0].of?.f).toBe('circum');
    for (const sc of drags(s)) {
      expect(cosLines(sc, A, D, B, C)).toBeLessThan(E);
      expect(cosLines(sc, B, Eb, C, A)).toBeLessThan(E);
      expect(cosLines(sc, C, F, A, B)).toBeLessThan(E);
      for (const [p, q] of [[A, D], [B, Eb], [C, F]]) expect(col(sc, p, q, 'H')).toBeLessThan(1e-5);
      for (const x of [A, B, C, K]) expect(onC(sc, x)).toBeLessThan(E);
      expect(col(sc, A, D, K)).toBeLessThan(E);
      expect(d2(sc.pts[M], sc.pts[B]) - d2(sc.pts[M], sc.pts[C])).toBeCloseTo(0, 6);
      expect(cosLines(sc, O, M, B, C)).toBeLessThan(E);
    }
    fitsInk(f);
  });

  it('nét ẩu: 6 lần vẽ lại đề 1 với đầu mút lệch 3–8 px, chiều vẽ ngẫu nhiên, kèm chữ nhãn → vẫn đủ cấu trúc', () => {
    for (const [sd, j] of [[3, 3], [11, 5], [29, 6], [41, 7], [57, 8], [73, 6]]) {
      seed = sd;
      J = j;
      const g = exam1();
      const ink = [...g.ink, label(g.A), label(g.B), label(g.C), label(g.K)];
      const f = recognize(ink);
      const defs = Object.values(f.scene.defs!);
      const msg = `seed ${sd}, lệch ${j}px: ${JSON.stringify(f.scene.defs)}`;
      expect(defs.filter((d) => d.k === 'foot').length, msg).toBeGreaterThanOrEqual(3); // AD, BE, CF (+ OM)
      expect(defs.some((d) => d.k === 'inter'), msg).toBe(true);
      expect(defs.some((d) => d.k === 'lcx'), msg).toBe(true);
      expect(f.scene.circles?.[0].of?.f, msg).toBe('circum');
      // chỗ cắt tình cờ (tâm O sát trung tuyến) trên hình dựng không đồng quy thật → ẩn tên, chỉ còn đúng 10 điểm có tên
      expect(visible(f.scene).sort(), msg).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'H', 'K', 'M', 'O']);
      fitsInk(f);
    }
    J = 4;
  });

  it('đề tiếp tuyến: hai tiếp tuyến MA, MB, dây AB cắt OM tại H, cát tuyến MCD — kéo M, O, D mọi hướng vẫn đúng', () => {
    seed = 5;
    const O = P(330, 330), r = 125, M = P(790, 330);
    const al = Math.acos(r / (M.x - O.x));
    const [A, B] = [on(O, r, -al), on(O, r, al)];
    const Dp = on(O, r, 2.55); // cát tuyến không tình cờ vuông góc dây AB
    const Cp = second(O, Dp, M);
    const Hh = P(A.x, O.y);
    const ink: Ink = [circle(O, r), seg(M, A), seg(M, B), seg(O, A), seg(O, B), seg(A, B), seg(O, M), seg(M, Dp)];
    const f = recognize(ink);
    const n = (p: Pt) => at(f, p);
    const [a, b, m, o, c, d, h] = [A, B, M, O, Cp, Dp, Hh].map(n);
    const s = f.scene;
    expect(new Set([a, b, m, o, c, d, h]).size).toBe(7);
    expect(s.defs![a]?.k).toBe('tan');
    expect(s.defs![b]?.k).toBe('tan');
    expect(s.defs![c]?.k).toBe('lcx');
    expect(s.defs![h]?.k).toBe('inter');
    expect(freePoints(s)).toContain(m);
    for (const sc of drags(s)) {
      expect(cosLines(sc, o, a, a, m)).toBeLessThan(E);
      expect(cosLines(sc, o, b, b, m)).toBeLessThan(E);
      expect(cosLines(sc, o, m, a, b)).toBeLessThan(1e-5); // OM ⊥ AB
      for (const x of [a, b, c, d]) expect(onC(sc, x)).toBeLessThan(E);
      expect(col(sc, m, c, d)).toBeLessThan(E);
      expect(col(sc, o, h, m)).toBeLessThan(E);
      expect(d2(sc.pts[c], sc.pts[d])).toBeGreaterThan(1e-3);
    }
    fitsInk(f);
  });

  it('đường tròn nội tiếp tam giác + ba bán kính tới tiếp điểm: tiếp điểm là chân đường vuông góc từ tâm, luôn trên đường tròn', () => {
    seed = 9;
    const [A, B, C] = [P(430, 110), P(170, 500), P(720, 480)];
    const [a, b, c] = [Math.hypot(B.x - C.x, B.y - C.y), Math.hypot(A.x - C.x, A.y - C.y), Math.hypot(A.x - B.x, A.y - B.y)];
    const I = P((a * A.x + b * B.x + c * C.x) / (a + b + c), (a * A.y + b * B.y + c * C.y) / (a + b + c));
    const [D, Ee, F] = [footPt(I, B, C), footPt(I, C, A), footPt(I, A, B)];
    const r = Math.hypot(I.x - D.x, I.y - D.y);
    const ink: Ink = [seg(A, B), seg(B, C), seg(C, A), circle(I, r), seg(I, D), seg(I, Ee), seg(I, F)];
    const f = recognize(ink);
    const s = f.scene;
    expect(s.circles![0].of?.f).toBe('in');
    const [i, d, e, ff] = [I, D, Ee, F].map((p) => at(f, p));
    expect(i).toBe('I');
    for (const sc of drags(s)) {
      for (const x of [d, e, ff]) expect(onC(sc, x)).toBeLessThan(E);
      expect(cosLines(sc, i, d, 'B', 'C')).toBeLessThan(E);
      expect(cosLines(sc, i, e, 'C', 'A')).toBeLessThan(E);
      expect(cosLines(sc, i, ff, 'A', 'B')).toBeLessThan(E);
    }
    fitsInk(f);
  });

  it('ba đường từ một đỉnh: đường cao, trung tuyến, và một đường bất kì tới cạnh đối', () => {
    seed = 13;
    const [A, B, C] = [P(300, 100), P(120, 460), P(720, 460)];
    const D = footPt(A, B, C), M = P((B.x + C.x) / 2, (B.y + C.y) / 2), X = P(B.x + (C.x - B.x) * 0.8, B.y);
    const f = recognize([seg(A, B), seg(B, C), seg(C, A), seg(A, D), seg(A, M), seg(A, X)]);
    const s = f.scene;
    const [d, m, x] = [D, M, X].map((p) => at(f, p));
    expect(s.defs![d]?.k).toBe('foot');
    expect(s.defs![m]).toMatchObject({k: 'seg', t: 0.5, fix: true});
    expect(s.defs![x]?.k).toBe('seg');
    for (const sc of drags(s)) {
      expect(cosLines(sc, 'A', d, 'B', 'C')).toBeLessThan(E);
      expect(d2(sc.pts[m], sc.pts.B) - d2(sc.pts[m], sc.pts.C)).toBeCloseTo(0, 6);
      expect(col(sc, 'B', 'C', x)).toBeLessThan(E);
    }
  });

  it('tứ giác nội tiếp có hai đường chéo, tiếp tuyến tại A cắt đường thẳng CD kéo dài tại S', () => {
    seed = 21;
    const O = P(420, 330), R = 170;
    const [A, B, C, D] = [on(O, R, -1.9), on(O, R, 2.9), on(O, R, 1.6), on(O, R, -0.2)]; // AC không phải đường kính
    // tiếp tuyến tại A: vuông góc OA; giao với đường DC kéo dài (phía D)
    const t = {x: -(A.y - O.y), y: A.x - O.x};
    const u = {x: D.x - C.x, y: D.y - C.y};
    const den = t.x * u.y - t.y * u.x;
    const k = ((C.x - A.x) * u.y - (C.y - A.y) * u.x) / den;
    const S = P(A.x + t.x * k, A.y + t.y * k);
    const f = recognize([circle(O, R), seg(A, B), seg(B, C), seg(C, D), seg(D, A), seg(A, C), seg(B, D), seg(S, A), seg(C, S)]);
    const s = f.scene;
    const [a, c, d, ss] = [A, C, D, S].map((p) => at(f, p));
    // S là giao của tiếp tuyến tại A với CD (không phải A là tiếp điểm kẻ từ S); A, B, C, D là tứ giác nội tiếp
    expect(s.defs![ss], JSON.stringify(s.defs)).toMatchObject({k: 'tanx', t: a});
    expect(s.edges.map((e) => e.join('')).sort()).toEqual(['AB', 'BC', 'CD', 'DA']);
    expect(Object.values(s.defs!).some((x) => x.k === 'inter')).toBe(true);
    const o = Object.keys(s.pts).find((x) => s.defs?.[x]?.k === 'calc')!;
    for (const sc of drags(s)) {
      expect(cosLines(sc, o, a, a, ss)).toBeLessThan(1e-5);
      expect(col(sc, c, d, ss)).toBeLessThan(1e-5);
      for (const x of ['A', 'B', 'C', 'D']) expect(onC(sc, x)).toBeLessThan(1e-5);
    }
    fitsInk(f);
  });

  it('ba trung tuyến đồng quy tại trọng tâm G: kéo đỉnh vẫn là trung điểm và G chia trung tuyến 2 : 1', () => {
    seed = 17;
    const [A, B, C] = [P(380, 90), P(140, 470), P(740, 430)];
    const mid = (p: Pt, q: Pt) => P((p.x + q.x) / 2, (p.y + q.y) / 2);
    const f = recognize([seg(A, B), seg(B, C), seg(C, A), seg(A, mid(B, C)), seg(B, mid(C, A)), seg(C, mid(A, B))]);
    const s = f.scene;
    const m = at(f, mid(B, C));
    expect(s.defs!.G, JSON.stringify(s.defs)).toMatchObject({k: 'inter'});
    for (const sc of drags(s)) {
      expect(d2(sc.pts[m], sc.pts.B) - d2(sc.pts[m], sc.pts.C)).toBeCloseTo(0, 6);
      const G = sc.pts.G;
      expect(Math.hypot(G[0] - (sc.pts.A[0] + sc.pts.B[0] + sc.pts.C[0]) / 3, G[1] - (sc.pts.A[1] + sc.pts.B[1] + sc.pts.C[1]) / 3)).toBeLessThan(1e-6);
    }
    fitsInk(f);
  });

  it('hình chữ nhật nội tiếp đường tròn, hai đường chéo cắt nhau tại tâm', () => {
    seed = 33;
    const O = P(420, 320), R = 180;
    const [A, B, C, D] = [on(O, R, -2.4), on(O, R, 2.4), on(O, R, 0.74), on(O, R, -0.74)];
    const f = recognize([circle(O, R), seg(A, B), seg(B, C), seg(C, D), seg(D, A), seg(A, C), seg(B, D)]);
    const s = f.scene;
    const o = at(f, O);
    expect(s.defs![o]).toMatchObject({k: 'calc', f: 'circum'});
    for (const sc of drags(s)) for (const x of ['A', 'B', 'C', 'D']) expect(onC(sc, x)).toBeLessThan(1e-5);
    fitsInk(f);
  });
});

describe('tứ giác có hai đường chéo, không đường tròn', () => {
  /** nét đứt: n gạch ngắn nối tiếp trên đoạn ab */
  const dashed = (a: Pt, b: Pt, n = 6) => Array.from({length: n}, (_, i) => {
    const [t0, t1] = [i / n, (i + 0.55) / n];
    return {points: [0, 0.5, 1].map((k) => P(a.x + (b.x - a.x) * (t0 + (t1 - t0) * k), a.y + (b.y - a.y) * (t0 + (t1 - t0) * k)))};
  });
  it('hình bình hành + hai đường chéo vẽ liền: là tứ giác phẳng (không phải tứ diện), giao O của hai đường chéo, kéo đỉnh vẫn là hình bình hành', () => {
    seed = 61;
    const [A, B, C, D] = [P(200, 150), P(160, 420), P(620, 420), P(660, 150)];
    const ink = [seg(A, B), seg(B, C), seg(C, D), seg(D, A), seg(A, C), seg(B, D)];
    expect(hasDashedLine(ink)).toBe(false);
    const f = sketchFigure(frameStrokes(ink))!;
    expect(f.quadDiag).toBe(true);
    const s = f.scene;
    expect(s.edges.map((e) => e.join('')).sort()).toEqual(['AB', 'BC', 'CD', 'DA']);
    const I = Object.keys(s.pts).find((x) => s.defs?.[x]?.k === 'inter')!;
    expect(s.hiddenLabels ?? []).not.toContain(I);
    for (const sc of drags(s)) {
      expect(col(sc, 'A', 'C', I)).toBeLessThan(E);
      expect(col(sc, 'B', 'D', I)).toBeLessThan(E);
    }
    fitsInk(f);
  });
  it('tứ diện vẽ có nét khuất đứt: nhận ra nét đứt (để đi đường hình khối); chữ nhãn, vạch đánh dấu cạnh không phải nét đứt', () => {
    const [S, A, B, C] = [P(400, 80), P(180, 420), P(430, 500), P(650, 400)];
    expect(hasDashedLine([seg(S, A), seg(S, B), seg(S, C), seg(A, B), seg(B, C), ...dashed(A, C)])).toBe(true);
    const ticks = [0, 1, 2].map((i) => ({points: [P(380 + i * 7, 280), P(380 + i * 7, 300)]}));
    expect(hasDashedLine([seg(A, B), seg(B, C), seg(C, A), label(A), label(B), ...ticks, {points: [P(300, 300), P(320, 300)]}, {points: [P(300, 308), P(320, 308)]}])).toBe(false);
  });
});
