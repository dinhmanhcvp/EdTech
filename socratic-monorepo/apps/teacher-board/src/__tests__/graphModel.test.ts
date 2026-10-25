import {describe, it, expect} from 'vitest';
import {compileGraphFns, collectParams, syncParams, paramValues, fitView, sampleExplicit, specialPoints, areaBetween, nearestOnCurves, toScreen, toWorld, niceStep, implicitSegments, defaultView, viewBounds, FN_COLORS} from '../utils/graphModel';

const mk = (texts: string[]) => compileGraphFns(texts.map((text, i) => ({id: `f${i}`, text, color: FN_COLORS[i], visible: true})));

describe('graphModel: hai hàm như video (y = x² − 3 và y = A sin x + B)', () => {
  const cfns = mk(['y = x² − 3', 'y = A sin x + B']);

  it('biên dịch cả hai và tự tìm tham số A, B', () => {
    expect(cfns.map((f) => f.kind)).toEqual(['explicit', 'explicit']);
    expect(collectParams(cfns)).toEqual(['A', 'B']);
    expect(cfns[0].latex).toBe('y = x^{2} - 3');
    expect(cfns[1].latex).toBe(String.raw`y = A \sin\,x + B`);
  });

  it('thanh trượt có mặc định hợp lý và đổi được', () => {
    const cfg = syncParams(['A', 'B'], {});
    expect(cfg.A.value).toBe(2);
    expect(cfg.B.value).toBe(1);
    const again = syncParams(['A', 'B', 'k'], {...cfg, A: {...cfg.A, value: 3.5}});
    expect(again.A.value).toBe(3.5); // giữ giá trị người dùng đã kéo
    expect(Object.keys(again)).toEqual(['A', 'B', 'k']);
  });

  it('giao điểm khớp hai đường tại mọi điểm và cập nhật khi kéo tham số', () => {
    const p1 = paramValues(syncParams(['A', 'B'], {}));
    const pts = specialPoints(cfns, p1, -6, 6, {intersections: true, zeros: false, extrema: false});
    expect(pts.length).toBeGreaterThanOrEqual(2);
    for (const p of pts) {
      expect(Math.abs(cfns[0].compiled!.eval(p.x, p1) - cfns[1].compiled!.eval(p.x, p1))).toBeLessThan(1e-6);
    }
    const p2 = {...p1, A: 4, B: -2};
    const pts2 = specialPoints(cfns, p2, -6, 6, {intersections: true, zeros: false, extrema: false});
    expect(pts2.map((p) => p.x.toFixed(2))).not.toEqual(pts.map((p) => p.x.toFixed(2)));
  });

  it('nghiệm và cực trị: parabol có 2 nghiệm ±√3 và 1 cực tiểu tại 0', () => {
    const sp = specialPoints([cfns[0]], {}, -6, 6);
    const zeros = sp.filter((p) => p.kind === 'zero').map((p) => +p.x.toFixed(4));
    expect(zeros).toEqual([-1.7321, 1.7321]);
    const mins = sp.filter((p) => p.kind === 'min');
    expect(mins.length).toBe(1);
    expect(Math.abs(mins[0].x)).toBeLessThan(1e-3);
    expect(mins[0].y).toBeCloseTo(-3, 3);
  });

  it('diện tích giữa hai đường: x² và x giới hạn bởi 0..1 là 1/6', () => {
    const [f, g] = mk(['y = x^2', 'y = x']);
    const r = areaBetween(f, g, {}, 0, 1)!;
    expect(r.area).toBeCloseTo(1 / 6, 5);
    const auto = areaBetween(f, g, {})!; // tự chọn hai giao điểm 0 và 1
    expect(auto.a).toBeCloseTo(0, 5);
    expect(auto.b).toBeCloseTo(1, 5);
    expect(auto.area).toBeCloseTo(1 / 6, 5);
  });
});

describe('graphModel: khung nhìn, lấy mẫu, gần con trỏ', () => {
  it('đổi tọa độ màn hình ↔ thế giới là nghịch đảo của nhau', () => {
    const v = {cx: 1.5, cy: -2, sx: 40, sy: 25};
    const s = toScreen(v, 600, 400, 3.2, 1.1);
    const w = toWorld(v, 600, 400, s.px, s.py);
    expect(w.x).toBeCloseTo(3.2, 9);
    expect(w.y).toBeCloseTo(1.1, 9);
  });

  it('tan(x) bị ngắt nét ở tiệm cận (không nối dây qua vô cực)', () => {
    const [f] = mk(['y = tan x']);
    const v = defaultView(600, 400, 6);
    const s = sampleExplicit(f, {}, v, 600, 400);
    expect(s.filter((p) => p === null).length).toBeGreaterThanOrEqual(3);
  });

  it('con trỏ hít vào đường gần nhất và báo độ dốc', () => {
    const [f] = mk(['y = x^2']);
    const v = defaultView(600, 400, 6);
    const at = toScreen(v, 600, 400, 2, 4);
    const hit = nearestOnCurves([f], {}, v, 600, 400, at.px + 3, at.py - 2)!;
    expect(hit).not.toBeNull();
    expect(hit.x).toBeCloseTo(2, 0);
    expect(hit.slope).toBeCloseTo(2 * hit.x, 3);
    expect(nearestOnCurves([f], {}, v, 600, 400, 5, 5)).toBeNull(); // xa đường → không hít
  });

  it('fitView luôn 1:1, chứa gốc tọa độ và không bị kéo xa bởi phần vọt lên rất cao', () => {
    for (const expr of ['y = x^2 - 3', 'y = 10 x^2', 'y = A sin x + B']) {
      const cf = mk([expr]);
      const pv = paramValues(syncParams(collectParams(cf), {}));
      const v = fitView(cf, pv, 600, 400);
      expect(v.sx).toBe(v.sy);
      const b = viewBounds(v, 600, 400);
      expect(b.yMin).toBeLessThan(0);
      expect(b.yMax).toBeGreaterThan(0);
      expect(b.xMin).toBeLessThanOrEqual(-5.9);
      expect(Math.abs(v.cy)).toBeLessThan(6);
    }
    const v = fitView(mk(['y = x^2 - 3']), {}, 600, 400);
    const b = viewBounds(v, 600, 400);
    expect(b.yMin).toBeLessThanOrEqual(-3); // thấy đỉnh parabol (0, −3)
  });

  it('bước lưới đẹp 1-2-5', () => {
    expect(niceStep(12)).toBe(2);
    expect(niceStep(40)).toBe(5);
    expect(niceStep(0.3)).toBe(0.05);
  });

  it('đường tròn x² + y² = 4 vẽ bằng marching squares nằm đúng bán kính 2', () => {
    const [c] = mk(['x^2 + y^2 = 4']);
    expect(c.kind).toBe('implicit');
    const v = defaultView(600, 400, 6);
    const segs = implicitSegments(c, {}, v, 600, 400);
    expect(segs.length).toBeGreaterThan(60);
    for (const [x1, y1, x2, y2] of segs) {
      expect(Math.abs(Math.hypot(x1, y1) - 2)).toBeLessThan(0.05);
      expect(Math.abs(Math.hypot(x2, y2) - 2)).toBeLessThan(0.05);
    }
  });

  it('hàm sai cú pháp báo lỗi thay vì làm hỏng đồ thị', () => {
    const [bad] = mk(['y = 2 +']);
    expect(bad.kind).toBe('error');
    expect(bad.error).toBeTruthy();
  });
});
