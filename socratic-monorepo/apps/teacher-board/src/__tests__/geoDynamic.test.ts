import {describe, expect, it} from 'vitest';
import {buildScene, renderScene} from '../utils/geometryProblem';
import {addFoot, addPointOnSegment, addSection, applyDefs, draggablePoints, setPointT} from '../utils/geoTools';
import {polygonStats} from '../utils/netUnfold';
import {sectionHits} from '../utils/geometryProblem';
import type {V3} from '../utils/solids';

const PYR = 'Cho hình chóp S.ABCD đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2.';
const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

describe('điểm kéo được trên cạnh: hình động', () => {
  it('điểm từ "M là trung điểm SB" kéo được; M trượt dọc SB', () => {
    const sc = buildScene(`${PYR} Gọi M là trung điểm SB.`).scene!;
    expect(draggablePoints(sc).map((d) => d.name)).toEqual(['M']);
    const moved = setPointT(sc, 'M', 0.25);
    const t = dist(moved.pts.S, moved.pts.M) / dist(moved.pts.S, moved.pts.B);
    expect(t).toBeCloseTo(0.25, 9);
    // M vẫn nằm đúng trên đường thẳng SB
    const cross = [0, 1, 2].map((i) => moved.pts.M[i] - moved.pts.S[i]);
    const d = [0, 1, 2].map((i) => moved.pts.B[i] - moved.pts.S[i]);
    const c = [cross[1] * d[2] - cross[2] * d[1], cross[2] * d[0] - cross[0] * d[2], cross[0] * d[1] - cross[1] * d[0]];
    expect(Math.hypot(...c)).toBeLessThan(1e-9);
  });
  it('kéo giới hạn trong (0,1), không ra ngoài cạnh', () => {
    const sc = buildScene(`${PYR} Gọi M là trung điểm SB.`).scene!;
    expect(setPointT(sc, 'M', -5).defs!.M).toMatchObject({t: 0.02});
    expect(setPointT(sc, 'M', 9).defs!.M).toMatchObject({t: 0.98});
  });
  it('điểm đặt bằng dụng cụ cũng kéo được; chân đường vuông góc tự theo', () => {
    let sc = buildScene(PYR).scene!;
    const a = addPointOnSegment(sc, 'S', 'C', 0.5, 0);
    sc = a.scene;
    const f = addFoot(sc, a.name, 'A', 'B', 0);
    sc = f.scene;
    expect(draggablePoints(sc).map((d) => d.name)).toEqual([a.name]); // chân đường vuông góc không kéo trực tiếp
    const before = sc.pts[f.name];
    const moved = setPointT(sc, a.name, 0.9);
    expect(dist(moved.pts[f.name], before)).toBeGreaterThan(1e-3);
    // chân vẫn vuông góc: (P - H) · (B - A) = 0
    const P = moved.pts[a.name] as V3;
    const H = moved.pts[f.name] as V3;
    const AB = [0, 1, 2].map((i) => moved.pts.B[i] - moved.pts.A[i]);
    const PH = [0, 1, 2].map((i) => P[i] - H[i]);
    expect(Math.abs(PH[0] * AB[0] + PH[1] * AB[1] + PH[2] * AB[2])).toBeLessThan(1e-9);
  });
  it('thiết diện (MNP) đổi theo khi kéo M', () => {
    let sc = buildScene(PYR).scene!;
    sc = addPointOnSegment(sc, 'S', 'B', 0.5, 0).scene; // M
    sc = addPointOnSegment(sc, 'S', 'D', 0.5, 0).scene; // N
    sc = addPointOnSegment(sc, 'C', 'D', 0.5, 0).scene; // P
    sc = addSection(sc, ['M', 'N', 'P'], 0);
    const area = (s: typeof sc) => {
      const f = renderScene(s);
      return JSON.stringify(f.polys) + JSON.stringify(f.verts);
    };
    const before = area(sc);
    const moved = setPointT(sc, 'M', 0.2);
    expect(area(moved)).not.toBe(before);
    // thiết diện thật sự là giao của mặt phẳng (MNP) mới với hình
    const hits = sectionHits(moved.edges as [string, string][], (n) => moved.pts[n] as V3, ['M', 'N', 'P'])!;
    expect(hits.length).toBeGreaterThanOrEqual(3);
    expect(polygonStats(hits).area).toBeGreaterThan(0);
  });
  it('applyDefs không đổi gì khi chưa có điểm kéo được', () => {
    const sc = buildScene(PYR).scene!;
    expect(applyDefs(sc)).toBe(sc);
  });
  it('mỗi lần dựng cùng cho cùng kết quả (kéo rồi trả t cũ về y như cũ)', () => {
    const sc = buildScene(`${PYR} Gọi M là trung điểm SB.`).scene!;
    const back = setPointT(setPointT(sc, 'M', 0.7), 'M', 0.5);
    expect(back.pts.M[0]).toBeCloseTo(sc.pts.M[0], 12);
    expect(back.pts.M[1]).toBeCloseTo(sc.pts.M[1], 12);
  });
});
