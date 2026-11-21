import {describe, expect, it} from 'vitest';
import {buildScene, normalizeProblem, parseRichestGeometry, type GeoScene} from '../utils/geometryProblem';
import {freePoints, moveFreePoint} from '../utils/geoTools';

/** Đề viết TÓM TẮT bằng kí hiệu (chữ thường, viết tắt, đẳng thức, số đo góc) phải vẽ được đúng hình, đúng tính chất. */
const sc = (t: string): GeoScene => {
  const s = parseRichestGeometry([t])?.scene ?? buildScene(t).scene;
  expect(s, t).toBeTruthy();
  return s!;
};
const L = (s: GeoScene, a: string, b: string) => Math.hypot(s.pts[a][0] - s.pts[b][0], s.pts[a][1] - s.pts[b][1], s.pts[a][2] - s.pts[b][2]);
const angle = (s: GeoScene, a: string, v: string, c: string) => {
  const [u, w] = [[0, 1, 2].map((i) => (s.pts[a][i] ?? 0) - (s.pts[v][i] ?? 0)), [0, 1, 2].map((i) => (s.pts[c][i] ?? 0) - (s.pts[v][i] ?? 0))];
  return (Math.acos((u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (Math.hypot(...u) * Math.hypot(...w))) * 180) / Math.PI;
};
const perp = (s: GeoScene, p: string, q: string, a: string, b: string) => {
  const [u, v] = [[s.pts[q][0] - s.pts[p][0], s.pts[q][1] - s.pts[p][1]], [s.pts[b][0] - s.pts[a][0], s.pts[b][1] - s.pts[a][1]]];
  return Math.abs(u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]));
};
const onCircle = (s: GeoScene, n: string, i = 0) => Math.abs(Math.hypot(s.pts[n][0] - s.circles![i].center[0], s.pts[n][1] - s.circles![i].center[1]) - s.circles![i].r) / s.circles![i].r;
const near = (x: number, y: number, eps = 1e-3) => expect(Math.abs(x - y)).toBeLessThan(eps);

describe('tóm tắt bằng kí hiệu', () => {
  it.each(['tam giác abc, ab=ac', 'tg abc cân tại a', 'Δabc, ab = ac, am là trung tuyến', 'ΔABC, AB = AC', 'GT: ΔABC, AB=AC; D ∈ BC. KL: …'])('"%s" → tam giác cân tại A', (t) => {
    const s = sc(t);
    near(L(s, 'A', 'B'), L(s, 'A', 'C'));
    expect(L(s, 'B', 'C')).not.toBeCloseTo(L(s, 'A', 'B'), 2); // cân, không phải đều
  });

  it('"AB = AC = BC" → đều; "vuông tại A, AB = AC" → vuông cân', () => {
    const e = sc('ABC, AB=AC=BC');
    near(L(e, 'A', 'B'), L(e, 'B', 'C'));
    near(L(e, 'A', 'C'), L(e, 'B', 'C'));
    const v = sc('Δabc vuông tại a, ab = ac');
    near(angle(v, 'B', 'A', 'C'), 90);
    near(L(v, 'A', 'B'), L(v, 'A', 'C'));
  });

  it('tên điểm chữ thường ở mọi chỗ; độ dài a, R giữ chữ thường', () => {
    const s = sc('tam giác mnp, mn = mp, mh vuông góc np');
    near(L(s, 'M', 'N'), L(s, 'M', 'P'));
    expect(perp(s, 'M', 'H', 'N', 'P')).toBeLessThan(1e-9);
    const t = sc('tg abc vuông tại a có ab = 3, ac = 4, đường cao ah, trung tuyến am');
    near(L(t, 'B', 'C'), 5);
    expect(perp(t, 'A', 'H', 'B', 'C')).toBeLessThan(1e-9);
    near(L(t, 'B', 'M'), L(t, 'M', 'C'));
    const p = sc('s.abcd có đáy abcd là hình vuông, sa vuông góc (abcd)');
    expect(Object.keys(p.pts).sort()).toEqual(['A', 'B', 'C', 'D', 'S']);
    expect(normalizeProblem('hình vuông abcd cạnh a')).toContain('cạnh a');
    expect(normalizeProblem('s.abcd có sa = a√2, (o; r)')).toMatch(/SA = a√2.*\(O; r\)/);
    expect(normalizeProblem('Cho tam giác ABC có AB = 3')).toBe('cho tam giác ABC có AB = 3'); // đề chữ hoa không đổi tên điểm
    // tên điểm chữ hoa trùng chữ viết tắt (BK, TT, NT, HT) không bị đọc thành "bán kính", "tiếp tuyến"…
    expect(normalizeProblem('Q là giao điểm của AP và BK, MN cắt NT, (O) qua TT')).toMatch(/AP và BK, MN cắt NT.*TT/);
  });

  it('viết tắt: tđ, pg, đcao, nt, đk, tt, đtnt, đtngt, hbh, hcn, hv, htc', () => {
    let s = sc('ΔABC, M ∈ BC, MB = MC');
    near(L(s, 'B', 'M'), L(s, 'M', 'C'));
    s = sc('ΔABC, M, N lần lượt là tđ AB, AC');
    near(L(s, 'A', 'M'), L(s, 'M', 'B'));
    near(L(s, 'A', 'N'), L(s, 'N', 'C'));
    s = sc('ΔABC, AD là pg, BE là đcao, CF là trung tuyến');
    near(angle(s, 'B', 'A', 'D'), angle(s, 'D', 'A', 'C'));
    expect(perp(s, 'B', 'E', 'A', 'C')).toBeLessThan(1e-9);
    near(L(s, 'A', 'F'), L(s, 'F', 'B'));
    s = sc('ΔABC nt (O)');
    for (const n of ['A', 'B', 'C']) expect(onCircle(s, n)).toBeLessThan(1e-9);
    s = sc('ΔABC, I là tâm đtnt');
    expect(s.defs?.I).toMatchObject({k: 'calc', f: 'in'});
    s = sc('ΔABC, O là tâm đtngt');
    expect(s.defs?.O).toMatchObject({k: 'calc', f: 'circum'});
    s = sc('Từ M ngoài (O) kẻ 2 tt MA, MB');
    expect(Object.values(s.defs!).filter((d) => d.k === 'tan')).toHaveLength(2);
    expect(perp(s, 'O', 'A', 'A', 'M')).toBeLessThan(1e-9);
    s = sc('hbh abcd');
    near(L(s, 'A', 'B'), L(s, 'C', 'D'));
    near(L(s, 'A', 'D'), L(s, 'B', 'C'));
    s = sc('hcn abcd, ab = 4, ad = 3, ac cắt bd tại o');
    near(L(s, 'A', 'C'), 5);
    near(L(s, 'A', 'O'), 2.5);
    s = sc('S.ABCD đáy là hv cạnh a, SA ⊥ (ABCD), SA = a√2');
    near(L(s, 'A', 'B'), L(s, 'B', 'C'));
    near(angle(s, 'A', 'B', 'C'), 90);
    s = sc('htc abcd (ab // cd)');
    near(L(s, 'A', 'D'), L(s, 'B', 'C'));
  });

  it('số đo góc trong tam giác được dựng đúng', () => {
    let s = sc('Δ ABC có ∠B = 60°, ∠C = 45°');
    near(angle(s, 'A', 'B', 'C'), 60);
    near(angle(s, 'A', 'C', 'B'), 45);
    s = sc('tam giác abc có góc a = 60 độ, ab = 4, ac = 6');
    near(angle(s, 'B', 'A', 'C'), 60);
    near(L(s, 'A', 'B'), 4);
    near(L(s, 'B', 'C'), Math.sqrt(28));
    s = sc('ΔABC vuông tại A, góc B = 30°, BC = 6');
    near(angle(s, 'B', 'A', 'C'), 90);
    near(L(s, 'A', 'C'), 3);
    s = sc('ΔABC cân tại A, góc A = 120°');
    near(angle(s, 'B', 'A', 'C'), 120);
    near(L(s, 'A', 'B'), L(s, 'A', 'C'));
    s = sc('∆ABC, AB=AC, góc BAC = 40°');
    near(angle(s, 'B', 'A', 'C'), 40);
    near(L(s, 'A', 'B'), L(s, 'A', 'C'));
  });

  it('đường kính, điểm ngoài cách tâm cho trước, so sánh cạnh', () => {
    let s = sc('ΔABC nội tiếp (O;R), AB là đk');
    near(angle(s, 'A', 'C', 'B'), 90);
    for (const n of ['A', 'B', 'C']) expect(onCircle(s, n)).toBeLessThan(1e-9);
    s = sc('(O; R), AB là đk, C ∈ (O)');
    near(L(s, 'A', 'B'), 2 * s.circles![0].r);
    expect(onCircle(s, 'C')).toBeLessThan(1e-6);
    s = sc('Cho (O; R) và điểm A nằm ngoài (O) sao cho OA = 2R. Kẻ tt AB, AC (B, C là tiếp điểm)');
    near(L(s, 'O', 'A'), 2 * s.circles![0].r);
    near(angle(s, 'B', 'A', 'C'), 60); // OA = 2R → góc BAC = 60°
    s = sc('ΔABC có AB < AC, phân giác AD');
    expect(L(s, 'A', 'B')).toBeLessThan(L(s, 'A', 'C'));
  });

  it('đề tóm tắt dài, khó: đủ điểm, đúng tính chất, kéo đỉnh vẫn giữ', () => {
    const s = sc('Cho ΔABC nhọn (AB < AC) nội tiếp (O; R). Các đường cao AD, BE, CF cắt nhau tại H. Gọi M là tđ BC');
    expect(Object.keys(s.pts).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'H', 'M', 'O']);
    expect(L(s, 'A', 'B')).toBeLessThan(L(s, 'A', 'C'));
    for (const n of ['A', 'B', 'C']) expect(angle(s, ...([['B', 'A', 'C'], ['A', 'B', 'C'], ['A', 'C', 'B']][['A', 'B', 'C'].indexOf(n)] as [string, string, string]))).toBeLessThan(90);
    let d = s;
    for (const n of freePoints(s)) {
      d = moveFreePoint(d, n, [d.pts[n][0] + 0.2, d.pts[n][1] - 0.15, 0]);
      expect(perp(d, 'A', 'D', 'B', 'C')).toBeLessThan(1e-9);
      expect(perp(d, 'B', 'E', 'A', 'C')).toBeLessThan(1e-9);
      expect(perp(d, 'C', 'H', 'A', 'B')).toBeLessThan(1e-6); // H là trực tâm
      near(L(d, 'B', 'M'), L(d, 'M', 'C'), 1e-9);
      for (const p of ['A', 'B', 'C']) expect(onCircle(d, p)).toBeLessThan(1e-9);
    }
    const q = sc('tứ giác abcd nt (o), ac ∩ bd = i');
    for (const n of ['A', 'B', 'C', 'D']) expect(onCircle(q, n)).toBeLessThan(1e-6);
    expect(q.defs?.I).toMatchObject({k: 'inter'});
    const lo = sc('tam giác abc nhọn, các đường cao ad, be, cf cắt nhau tại h, m là trung điểm bc');
    expect(Object.keys(lo.pts).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'H', 'M']);
  });
});
