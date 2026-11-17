import {describe, expect, it} from 'vitest';
import {detectCircleSketch, detectPlaneShapeFromStrokes, detectRoundSketch, ellipseStrokePoints, frameStrokes} from '../utils/sketchSolid';
import {roundSolidText} from '../utils/geoTools';
import {buildScene} from '../utils/geometryProblem';

/** Elip, hình trụ, hình nón, hình cầu vẽ tay (Trực quan hình học / khoanh rồi Vẽ hình). */
type Pt = {x: number; y: number};
const P = (x: number, y: number) => ({x, y});
let seed = 3;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
/** elip tay: tâm, bán trục a (ngang), b (dọc), từ góc t0 quét `sweep` độ, rung ±j */
const ell = (cx: number, cy: number, a: number, b: number, t0 = 0, sweep = 365, j = 2, n = 70) => ({
  points: Array.from({length: n + 1}, (_, i) => {
    const t = t0 + ((sweep * Math.PI) / 180) * (i / n);
    return P(cx + a * Math.cos(t) + rnd() * j, cy + b * Math.sin(t) + rnd() * j);
  }),
});
const seg = (a: Pt, b: Pt, n = 16) => ({points: Array.from({length: n + 1}, (_, i) => P(a.x + ((b.x - a.x) * i) / n + rnd(), a.y + ((b.y - a.y) * i) / n + rnd()))});
const ratioOf = (t: string) => {
  const r = parseFloat(/r = ([\d.]+)/.exec(t)![1]);
  const h = parseFloat(/h = ([\d.]+)/.exec(t)![1]);
  return h / r;
};

describe('khối tròn xoay và elip vẽ tay', () => {
  it('hình trụ: elip trên + elip dưới (đủ hoặc chỉ nửa trước) + hai đường sinh → hình trụ, tỉ lệ cao/bán kính như vẽ', () => {
    for (const halfBottom of [false, true]) {
      const ink = [ell(300, 120, 100, 30), halfBottom ? ell(300, 360, 100, 30, 0, 180) : ell(300, 360, 100, 30), seg(P(200, 122), P(201, 358)), seg(P(400, 119), P(399, 361))];
      const rd = detectRoundSketch(frameStrokes(ink))!;
      expect(rd?.kind, `nửa đáy=${halfBottom}`).toBe('cylinder');
      const t = roundSolidText(rd)!;
      expect(ratioOf(t)).toBeCloseTo(240 / 100, 1);
      const s = buildScene(t).scene!;
      expect(s.title).toMatch(/trụ/i);
    }
  });

  it('hình nón: elip đáy + hai đường sinh gặp nhau ở đỉnh (đỉnh trên hoặc đỉnh dưới)', () => {
    for (const up of [true, false]) {
      const cy = up ? 340 : 100;
      const apex = P(300, up ? 60 : 380);
      const ink = [ell(300, cy, 110, 32), seg(apex, P(190, cy + 2)), seg(P(411, cy - 1), P(apex.x + 2, apex.y + 1))];
      const rd = detectRoundSketch(frameStrokes(ink))!;
      expect(rd?.kind, `đỉnh ${up ? 'trên' : 'dưới'}`).toBe('cone');
      const t = roundSolidText(rd)!;
      expect(ratioOf(t)).toBeCloseTo(280 / 110, 1);
      expect(buildScene(t).scene!.title).toMatch(/nón/i);
    }
  });

  it('hình cầu: đường tròn + elip xích đạo → hình cầu (không phải chỉ đường tròn)', () => {
    const ink = [ell(300, 250, 120, 120, 0.3, 365, 2), ell(300, 252, 118, 30, 0, 365, 1.5)];
    expect(detectRoundSketch(ink)?.kind).toBe('sphere');
    expect(buildScene(roundSolidText(detectRoundSketch(ink)!)!).scene!.circles!.some((c) => c.kind === 'sphere')).toBe(true);
  });

  it('elip đứng riêng (nằm ngang hoặc dựng đứng) → elip gọn đúng tâm, đúng bán trục; không bị coi là đường tròn', () => {
    for (const [a, b] of [[150, 70], [60, 140]]) {
      const ink = [ell(300, 250, a, b, 0.2, 370, 2.5)];
      const rd = detectRoundSketch(ink)!;
      expect(rd.kind).toBe('ellipse');
      expect(Math.abs(rd.cx - 300) + Math.abs(rd.cy - 250)).toBeLessThan(8);
      expect(Math.abs(rd.r - a) / a).toBeLessThan(0.08);
      expect(Math.abs(rd.h - b) / b).toBeLessThan(0.08);
      expect(detectCircleSketch(ink)).toBeNull();
      const e = ellipseStrokePoints(rd.cx, rd.cy, rd.r, rd.h);
      expect(e[0]).toEqual(e[e.length - 1]);
    }
  });

  it('không nhận nhầm: đường tròn đứng riêng, tam giác, hình chữ nhật, hai nét thẳng', () => {
    expect(detectRoundSketch([ell(300, 250, 100, 100, 0, 365, 1.5)])).toBeNull();
    const tri = [seg(P(100, 300), P(300, 300)), seg(P(300, 300), P(200, 120)), seg(P(200, 120), P(100, 300))];
    expect(detectRoundSketch(tri)).toBeNull();
    expect(detectPlaneShapeFromStrokes(tri)?.kind).toMatch(/triangle/);
    const rect = [seg(P(100, 100), P(400, 100)), seg(P(400, 100), P(400, 250)), seg(P(400, 250), P(100, 250)), seg(P(100, 250), P(100, 100))];
    expect(detectRoundSketch(rect)).toBeNull();
    expect(detectRoundSketch([seg(P(0, 0), P(200, 0)), seg(P(0, 50), P(200, 50))])).toBeNull();
  });

  it('hình trụ có đáy dưới chỉ vẽ nửa elip RẤT dẹt (gần như thẳng) vẫn là hình trụ, không phải hình hộp', () => {
    const ink = [ell(350, 180, 90, 26, 0, 365, 0.5), ell(350, 420, 90, 26, 0, 180, 0.5), seg(P(260, 182), P(261, 418)), seg(P(440, 179), P(439, 421))];
    expect(detectRoundSketch(frameStrokes(ink))?.kind).toBe('cylinder');
  });

  it('elip vẽ NGHIÊNG (30°, −50°) → elip gọn đúng tâm, bán trục, góc nghiêng', () => {
    for (const deg of [30, -50]) {
      const t = (deg * Math.PI) / 180;
      const [a, b] = [140, 60];
      const pts = Array.from({length: 81}, (_, i) => {
        const s = (i / 80) * 2.05 * Math.PI;
        const [u, v] = [a * Math.cos(s), b * Math.sin(s)];
        return P(300 + u * Math.cos(t) - v * Math.sin(t) + rnd() * 2, 250 + u * Math.sin(t) + v * Math.cos(t) + rnd() * 2);
      });
      const rd = detectRoundSketch([{points: pts}])!;
      expect(rd?.kind, `${deg}°`).toBe('ellipse');
      // bán trục dài 140 theo hướng deg (hoặc bán trục ngắn theo hướng vuông góc khi góc được quy về (−45°, 45°])
      const long = Math.max(rd.r, rd.h);
      expect(Math.abs(long - a) / a).toBeLessThan(0.06);
      const dirLong = rd.r >= rd.h ? rd.ang! : rd.ang! + Math.PI / 2;
      expect(Math.abs(Math.sin(dirLong - t))).toBeLessThan(0.08);
      // nét elip gọn đi qua đúng các điểm vẽ
      const e = ellipseStrokePoints(rd.cx, rd.cy, rd.r, rd.h, rd.ang);
      const toSeg = (p: Pt, a1: Pt, b1: Pt) => {
        const [dx, dy] = [b1.x - a1.x, b1.y - a1.y];
        const k = Math.max(0, Math.min(1, ((p.x - a1.x) * dx + (p.y - a1.y) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(p.x - a1.x - k * dx, p.y - a1.y - k * dy);
      };
      const far = Math.max(...pts.map((p) => Math.min(...e.slice(1).map((q, i) => toSeg(p, e[i], q)))));
      expect(far).toBeLessThan(6); // rung tay ±2 px
    }
  });

  it('hình nón cụt: hai elip khác bề ngang + hai đường sinh xiên → nón cụt, tỉ lệ hai bán kính và chiều cao như vẽ', () => {
    for (const smallTop of [true, false]) {
      const [rt, rb] = smallTop ? [50, 110] : [110, 50];
      const ink = [ell(300, 120, rt, rt * 0.28), smallTop ? ell(300, 360, rb, rb * 0.28, 0, 180) : ell(300, 360, rb, rb * 0.28), seg(P(300 - rt, 121), P(300 - rb, 359)), seg(P(300 + rt, 119), P(300 + rb, 361))];
      const rd = detectRoundSketch(frameStrokes(ink))!;
      expect(rd?.kind, `đáy nhỏ ở ${smallTop ? 'trên' : 'dưới'}`).toBe('frustum');
      const t = roundSolidText(rd)!;
      const R = parseFloat(/R = ([\d.]+)/.exec(t)![1]);
      const r = parseFloat(/r = ([\d.]+)/.exec(t)![1]);
      expect(r / R).toBeCloseTo(50 / 110, 1);
      const s = buildScene(t).scene!;
      expect(s.title).toMatch(/nón cụt/i);
      expect(s.circles!.map((c) => +c.r.toFixed(2)).sort()).toEqual([r, R].map((x) => +x.toFixed(2)).sort());
    }
  });

  it('nửa hình cầu: cung tròn nửa trên + elip đáy cùng bề ngang → nửa hình cầu (không phải hình cầu, không phải đường tròn)', () => {
    const ink = [ell(300, 300, 120, 120, Math.PI, 182, 1.5, 50), ell(300, 302, 118, 32, 0, 365, 1.5)];
    const rd = detectRoundSketch(ink)!;
    expect(rd?.kind).toBe('hemisphere');
    const s = buildScene(roundSolidText(rd)!).scene!;
    expect(s.title).toBe('Nửa hình cầu');
    const outline = s.circles!.find((c) => c.kind === 'sphere')!;
    expect(outline.upper).toBe(true);
  });

  it('hình nửa cầu vẽ ra: viền nửa trên nối đúng hai mép đường tròn đáy, nằm phía trên đáy', async () => {
    const {renderScene} = await import('../utils/geometryProblem');
    const s = buildScene('nửa hình cầu tâm O bán kính R = 2').scene!;
    const f = renderScene(s);
    const top = f.curves.find((c) => c.label === 'nửa mặt cầu')!.pts;
    const base = f.curves.filter((c) => c.label === 'đường tròn đáy').flatMap((c) => c.pts);
    const [bl, br] = [Math.min(...base.map((p) => p.x)), Math.max(...base.map((p) => p.x))];
    expect(Math.abs(top[0].x - bl) + Math.abs(top[top.length - 1].x - br)).toBeLessThan(1.5);
    expect(Math.min(...top.map((p) => p.y))).toBeLessThan(Math.min(...base.map((p) => p.y)));
  });
});
