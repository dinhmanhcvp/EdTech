import {describe, expect, it} from 'vitest';
import {detectCircleSketch, detectPlaneShapeFromStrokes} from '../utils/sketchSolid';
import {circleFigureText, fitSceneToBox} from '../utils/geoTools';
import {buildScene, renderScene, type GeoScene} from '../utils/geometryProblem';

/** Đường tròn vẽ tay (chế độ Trực quan hình học / khoanh rồi Vẽ hình): phải ra ĐƯỜNG TRÒN, kèm đúng các nét khác vẽ cùng. */
type Pt = {x: number; y: number};
const P = (x: number, y: number) => ({x, y});
let seed = 5;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
/** vòng tròn tay: rung ±j px, hơi méo (e), bắt đầu ở góc a0, quét `sweep` độ (tay vẽ thường thừa/thiếu một chút) */
const handCircle = (cx: number, cy: number, r: number, j = 3, e = 0.05, a0 = 0.7, sweep = 370, n = 80): {points: Pt[]} => ({
  points: Array.from({length: n + 1}, (_, i) => {
    const a = a0 + ((sweep * Math.PI) / 180) * (i / n);
    return P(cx + r * (1 + e) * Math.cos(a) + rnd() * j, cy + r * (1 - e) * Math.sin(a) + rnd() * j);
  }),
});
const seg = (a: Pt, b: Pt, n = 14) => ({points: Array.from({length: n + 1}, (_, i) => P(a.x + ((b.x - a.x) * i) / n + rnd(), a.y + ((b.y - a.y) * i) / n + rnd()))});
const ring = (vs: Pt[]) => vs.map((v, i) => seg(v, vs[(i + 1) % vs.length]));
const scene = (t: string | null): GeoScene => {
  expect(t).toBeTruthy();
  const s = buildScene(t!).scene!;
  expect(s, t!).toBeTruthy();
  return s;
};
const onCircle = (s: GeoScene, n: string) => {
  const c = s.circles![0];
  return Math.abs(Math.hypot(s.pts[n][0] - c.center[0], s.pts[n][1] - c.center[1]) - c.r) / c.r;
};

describe('đường tròn vẽ tay', () => {
  it('một nét (tròn đều, hơi méo, rung tay, thừa/thiếu một đoạn) → đường tròn đúng tâm, bán kính', () => {
    for (const [e, j, sweep] of [[0, 1, 360], [0.06, 3, 380], [0.04, 4, 335], [0.08, 2, 350]]) {
      const c = detectCircleSketch([handCircle(300, 250, 120, j, e, 0.4, sweep)]);
      expect(c, `méo ${e}, rung ${j}, quét ${sweep}°`).toBeTruthy();
      expect(Math.hypot(c!.cx - 300, c!.cy - 250)).toBeLessThan(10);
      expect(Math.abs(c!.r - 120)).toBeLessThan(12);
      const s = scene(circleFigureText([handCircle(300, 250, 120, j, e, 0.4, sweep)]));
      expect(s.circles).toHaveLength(1);
    }
  });

  it('vẽ hai cung (nhấc bút giữa chừng) vẫn là một đường tròn', () => {
    const c = detectCircleSketch([handCircle(300, 250, 100, 2, 0.03, 0, 190, 40), handCircle(300, 250, 100, 2, 0.03, Math.PI, 180, 40)]);
    expect(c).toBeTruthy();
    expect(c!.circle).toHaveLength(2);
  });

  it('không nhận nhầm: hình vuông/tam giác vẽ một nét, đường cong hở (cung 180°), elip dẹt, chữ O nhỏ cạnh hình', () => {
    const sq = {points: [P(100, 100), P(300, 100), P(300, 300), P(100, 300), P(100, 100)].flatMap((p, i, a) => (i ? seg(a[i - 1], p).points : []))};
    expect(detectCircleSketch([sq])).toBeNull();
    expect(detectPlaneShapeFromStrokes([sq])?.kind).toBe('square');
    const tri = {points: [P(100, 300), P(300, 300), P(200, 120), P(100, 300)].flatMap((p, i, a) => (i ? seg(a[i - 1], p).points : []))};
    expect(detectCircleSketch([tri])).toBeNull();
    expect(detectCircleSketch([handCircle(300, 250, 100, 1, 0, 0, 180)])).toBeNull();
    expect(detectCircleSketch([handCircle(300, 250, 100, 1, 0.45, 0, 360)])).toBeNull();
    // tam giác lớn + chữ O nhỏ ghi tên: vẫn là tam giác, không thành đường tròn
    expect(circleFigureText([...ring([P(100, 400), P(500, 400), P(300, 100)]), handCircle(300, 300, 12, 0.5, 0, 0, 360, 30)])).toBeNull();
  });

  it('tròn + đường kính (nét thẳng qua tâm) → đường tròn đường kính AB, A, B trên đường tròn và đối xứng qua tâm', () => {
    const t = circleFigureText([handCircle(300, 250, 120), seg(P(185, 230), P(415, 270))]);
    expect(t).toMatch(/đường kính AB/);
    const s = scene(t);
    expect(s.circles).toHaveLength(1);
    expect(onCircle(s, 'A') + onCircle(s, 'B')).toBeLessThan(1e-3);
  });

  it('tròn + bán kính (từ tâm ra đường tròn) → có đoạn OA', () => {
    const t = circleFigureText([handCircle(300, 250, 120), seg(P(302, 252), P(410, 200))]);
    const s = scene(t);
    expect(onCircle(s, 'A')).toBeLessThan(1e-3); // tọa độ làm tròn 3 chữ số
    expect(s.aux.some(([a, b]) => [a, b].sort().join('') === 'AO')).toBe(true);
  });

  it('tam giác / tứ giác vẽ trong đường tròn, đỉnh chạm đường tròn → nội tiếp đường tròn (O), mọi đỉnh nằm trên đường tròn', () => {
    const cx = 300, cy = 250, r = 120;
    const at = (deg: number) => P(cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180));
    for (const angs of [[-90, 30, 150], [-70, 20, 110, 200]]) {
      const t = circleFigureText([handCircle(cx, cy, r, 2), ...ring(angs.map(at))]);
      expect(t).toMatch(/nội tiếp đường tròn/);
      const s = scene(t);
      for (const n of 'ABCD'.slice(0, angs.length)) expect(onCircle(s, n), `${t}: ${n}`).toBeLessThan(0.02);
    }
  });

  it('đường tròn nằm trong tam giác, tiếp xúc ba cạnh → đường tròn nội tiếp tam giác', () => {
    const [A, B, C] = [P(100, 400), P(500, 400), P(300, 54)];
    // tâm nội tiếp và bán kính nội tiếp của tam giác vẽ
    const [a, b, c] = [Math.hypot(B.x - C.x, B.y - C.y), Math.hypot(A.x - C.x, A.y - C.y), Math.hypot(A.x - B.x, A.y - B.y)];
    const I = P((a * A.x + b * B.x + c * C.x) / (a + b + c), (a * A.y + b * B.y + c * C.y) / (a + b + c));
    const s2 = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / (a + b + c);
    const t = circleFigureText([...ring([A, B, C]), handCircle(I.x, I.y, s2, 1.5, 0.02)]);
    expect(t).toMatch(/nội tiếp tam giác ABC/);
    const s = scene(t);
    expect(s.circles?.some((q) => q.of?.f === 'in')).toBe(true);
  });

  it('hình dựng giữ đúng cỡ nét vẽ (đường tròn vẽ đường kính 220 px → hình dựng rộng 220 px)', () => {
    const s = fitSceneToBox(scene(circleFigureText([handCircle(300, 250, 110, 1, 0)])), 220, 220);
    const xs = renderScene(s).curves.flatMap((c) => c.pts.map((p) => p.x));
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(220, -1);
  });

  it('nửa đường tròn (cung + đường kính) → nửa đường tròn đường kính AB, cung nằm đúng phía đã vẽ', () => {
    for (const up of [true, false]) {
      const arc = handCircle(300, 250, 120, 1.5, 0.02, up ? Math.PI : 0, 180, 50); // y màn hình hướng xuống: góc π → 2π cho y nhỏ hơn tâm = nửa TRÊN
      const t = circleFigureText([arc, seg(P(178, 251), P(421, 249))]);
      expect(t, `up=${up}`).toMatch(/nửa đường tròn \(O\) đường kính AB/);
      const s = scene(t);
      // điểm giữa cung vẽ ra (renderScene, y màn hình xuống) cùng phía với cung tay
      const f = renderScene(s);
      const ys = f.curves.flatMap((c) => c.pts.map((p) => p.y));
      const yA = f.verts[s.order.indexOf('A')].y;
      const arcBelow = Math.max(...ys) - yA > yA - Math.min(...ys);
      expect(arcBelow, `up=${up}`).toBe(!up);
    }
  });
});
