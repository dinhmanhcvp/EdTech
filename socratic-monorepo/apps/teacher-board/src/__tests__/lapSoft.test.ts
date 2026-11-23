import {describe, expect, it} from 'vitest';
import {SoftBody, TEAR_PULL, applySkin, buildSkin, linkWithin, sampleCloud} from '../utils/lab/hands/lapSoft';
import type {P3} from '../utils/lab/hands/laparo';

const sheet = (nx = 9, nz = 9, s = 0.2) => {
  const p: number[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) p.push((i - (nx - 1) / 2) * s, 0, (j - (nz - 1) / 2) * s);
  return p;
};
const make = (home = 0.08) => {
  const p = sheet();
  return new SoftBody(p, home, linkWithin(p, 0.3));
};
const run = (b: SoftBody, n: number, at?: P3, h: 0 | 1 = 0) => {
  for (let i = 0; i < n; i++) b.step(1 / 60, at ? [{at, r: 0.3, h}] : []);
};
const mid = 40;

describe('thân mềm', () => {
  it('không có lực thì đứng yên và báo hết chuyển động', () => {
    const b = make();
    run(b, 30);
    expect(b.point(mid)[1]).toBeCloseTo(0, 4);
    expect(b.moving).toBe(false);
  });
  it('mũi ấn thì mô lún, nhấc lên thì đàn hồi về chỗ cũ', () => {
    const b = make();
    run(b, 40, [0, 0.1, 0]);
    expect(b.point(mid)[1]).toBeLessThan(-0.05);
    run(b, 240);
    expect(Math.abs(b.point(mid)[1])).toBeLessThan(0.01);
  });
  it('cầm rồi kéo: điểm cầm theo mũi, hạt lân cận đi theo và xa dần thì đi ít hơn', () => {
    const b = make();
    expect(b.grasp(0, [0, 0, 0], 0.2)).toBe(true);
    run(b, 40, [0.4, 0.3, 0]);
    expect(b.point(mid)[0]).toBeCloseTo(0.4, 1);
    const near = b.point(mid + 1)[1];
    const far = b.point(mid + 4)[1];
    expect(near).toBeGreaterThan(0.05);
    expect(far).toBeLessThan(near);
    expect(b.pulled(0)).toBeGreaterThan(0.3);
    expect(b.pulled(0)).toBeLessThan(TEAR_PULL);
    b.release(0);
    expect(b.pulled(0)).toBe(0);
  });
  it('ngoài tầm thì không cầm được', () => {
    expect(make().grasp(0, [5, 5, 5], 0.3)).toBe(false);
  });
  it('cắt: hai nửa không còn kéo nhau', () => {
    const b = make(0.02);
    const before = b.edgeCount;
    b.cutX(0.01);
    expect(b.edgeCount).toBeLessThan(before);
    b.grasp(0, b.point(39), 0.05);
    run(b, 40, [-0.2, 0.6, 0]);
    expect(Math.abs(b.point(41)[1])).toBeLessThan(0.02);
  });
  it('bước thời gian lớn và kéo mạnh vẫn ổn định, không ra NaN', () => {
    const b = make();
    b.grasp(0, [0, 0, 0], 0.2);
    for (let i = 0; i < 200; i++) b.step(0.2, [{at: [Math.sin(i) * 4, Math.cos(i) * 4, 2], r: 0.3, h: 0}]);
    expect(b.pos.every(Number.isFinite)).toBe(true);
  });
});

describe('bám lưới và lấy mẫu', () => {
  it('lưới bám đúng khi nghỉ và theo hạt khi hạt di chuyển', () => {
    const pts = sheet(5, 5, 0.5);
    const b = new SoftBody(pts, 0.05, linkWithin(pts, 0.75));
    const verts = [0.1, 0.05, 0.1, -0.6, 0, 0.4];
    const s = buildSkin(verts, pts);
    const out = new Float32Array(6);
    applySkin(s, verts, b, out);
    expect(out[0]).toBeCloseTo(0.1);
    expect(out[4]).toBeCloseTo(0);
    b.pos.forEach((_, i) => {
      if (i % 3 === 1) b.pos[i] = 0.5;
    });
    applySkin(s, verts, b, out);
    expect(out[1]).toBeCloseTo(0.55);
    for (let v = 0; v < 2; v++) expect(s.w.slice(v * 4, v * 4 + 4).reduce((a, x) => a + x, 0)).toBeCloseTo(1);
  });
  it('`only` giữ hai nửa ống không bám sang nhau', () => {
    const pts = [-0.1, 0, 0, 0.1, 0, 0];
    const s = buildSkin([0.09, 0, 0], pts, 2, (i) => i === 0);
    expect(Array.from(s.idx)).toEqual([0, 0]);
  });
  it('lấy mẫu giảm số điểm', () => {
    const d = sheet(30, 30, 0.02);
    const c = sampleCloud(d, 0.1);
    expect(c.length).toBeLessThan(d.length / 5);
    expect(c.length).toBeGreaterThan(0);
  });
});
