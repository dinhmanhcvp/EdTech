import {describe, expect, it} from 'vitest';
import {buildScene} from '../utils/geometryProblem';
import {canUnfold, faceOnView, unfoldNet} from '../utils/netUnfold';
import {dot, len, sub, type V3} from '../utils/solids';

const solids: [string, string][] = [
  ['lập phương', "hình lập phương ABCD.A'B'C'D' cạnh a"],
  ['hộp chữ nhật', "hình hộp chữ nhật ABCD.A'B'C'D' có AB = 3, AD = 2, AA' = 1"],
  ['chóp tứ giác', 'hình chóp S.ABCD đáy ABCD là hình vuông cạnh a, SA vuông góc đáy, SA = a√2'],
  ['tứ diện đều', 'tứ diện đều ABCD cạnh a'],
  ['lăng trụ', "lăng trụ tam giác đều ABC.A'B'C' cạnh đáy a"],
];

describe.each(solids)('khai triển %s', (_n, text) => {
  const sc = buildScene(text).scene!;
  it('khai triển được và t = 0 trả lại đúng khối', () => {
    expect(canUnfold(sc)).toBe(true);
    const st = unfoldNet(sc, 0)!;
    expect(st).not.toBeNull();
    for (const f of st.faces) f.names.forEach((n, i) => expect(len(sub(f.pts[i], sc.pts[n] as V3))).toBeLessThan(1e-9));
  });
  it('mỗi mặt giữ nguyên hình dạng ở mọi t (không co giãn)', () => {
    for (const t of [0.3, 0.7, 1]) {
      const st = unfoldNet(sc, t)!;
      st.faces.forEach((f) => {
        f.names.forEach((n, i) => {
          const j = (i + 1) % f.names.length;
          const orig = len(sub(sc.pts[n] as V3, sc.pts[f.names[j]] as V3));
          expect(Math.abs(len(sub(f.pts[i], f.pts[j])) - orig)).toBeLessThan(1e-9);
        });
      });
    }
  });
  it('t = 1: mọi mặt cùng nằm trong một mặt phẳng và không chồng lên nhau', () => {
    const st = unfoldNet(sc, 1)!;
    const n = st.faces[0].normal;
    const d0 = dot(n, st.faces[0].pts[0]);
    for (const f of st.faces) {
      for (const p of f.pts) expect(Math.abs(dot(n, p) - d0)).toBeLessThan(1e-6);
      expect(dot(f.normal, n)).toBeGreaterThan(0.99); // mặt ngoài của mọi mặt cùng hướng về phía người xem
    }
    // tâm các mặt cách nhau (không chồng)
    const cs = st.faces.map((f) => f.pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]] as V3, [0, 0, 0] as V3).map((v) => v / f.pts.length) as V3);
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) expect(len(sub(cs[i], cs[j]))).toBeGreaterThan(0.2);
  });
});

it('hình phẳng không khai triển được', () => {
  expect(canUnfold(buildScene('tam giác ABC vuông tại A').scene!)).toBe(false);
});

it('faceOnView đưa pháp tuyến về hướng người xem', () => {
  for (const n of [[0, -1, 0], [0.3, 0.5, 0.8], [-0.7, 0.1, -0.2]] as V3[]) {
    const l = Math.hypot(...n);
    const u = n.map((v) => v / l) as V3;
    const {yaw, pitch} = faceOnView(u);
    const x1 = u[0] * Math.cos(yaw) + u[2] * Math.sin(yaw);
    const z1 = -u[0] * Math.sin(yaw) + u[2] * Math.cos(yaw);
    const y2 = u[1] * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = u[1] * Math.sin(pitch) + z1 * Math.cos(pitch);
    expect(Math.abs(x1)).toBeLessThan(1e-9);
    expect(Math.abs(y2)).toBeLessThan(1e-9);
    expect(z2).toBeCloseTo(1, 9);
  }
});

import {renderScene} from '../utils/geometryProblem';
import {polygonStats, sliceSection} from '../utils/netUnfold';

describe('vẽ lưới khai triển và thiết diện cắt ngang', () => {
  const cube = buildScene("hình lập phương ABCD.A'B'C'D' cạnh a").scene!;
  it('t = 0 giữ nguyên hình; t > 0 thành các mặt riêng, nhiều đỉnh hơn', () => {
    const f0 = renderScene({...cube, net: 0});
    const f1 = renderScene({...cube, net: 1});
    expect(f1.verts.length).toBe(24); // 6 mặt x 4 đỉnh
    expect(f1.faces).toHaveLength(6);
    expect(f1.verts.length).toBeGreaterThan(f0.verts.length);
  });
  it('lưới phẳng nằm gọn trong khung, mọi t', () => {
    for (const t of [0.1, 0.4, 0.8, 1]) {
      for (const p of renderScene({...cube, net: t}).verts) {
        expect(p.x).toBeGreaterThan(-30);
        expect(p.x).toBeLessThan(330);
        expect(p.y).toBeGreaterThan(-30);
        expect(p.y).toBeLessThan(330);
      }
    }
  });
  it('mặt phẳng cắt ngang song song đáy của lập phương: thiết diện là hình vuông cạnh a ở mọi độ cao', () => {
    for (const h of [0.2, 0.5, 0.8]) {
      const sec = sliceSection(cube, h)!;
      expect(sec).toHaveLength(4);
      const st = polygonStats(sec);
      expect(st.area).toBeCloseTo(1, 6);
      expect(st.perimeter).toBeCloseTo(4, 6);
    }
  });
  it('chóp S.ABCD cắt ngang: diện tích thu nhỏ theo (1 - h)^2', () => {
    const pyr = buildScene('hình chóp đều S.ABCD cạnh đáy a, cạnh bên 2a').scene!;
    const s1 = polygonStats(sliceSection(pyr, 0.25)!).area;
    const s2 = polygonStats(sliceSection(pyr, 0.5)!).area;
    expect(s2 / s1).toBeCloseTo(((1 - 0.5) / (1 - 0.25)) ** 2, 4);
  });
  it('thiết diện hiện thành đa giác tô xanh và cạnh phụ trong hình', () => {
    const f = renderScene({...cube, slice: 0.5});
    expect(f.polys.length).toBe(1);
    expect(f.edges.filter((e) => e.aux).length).toBe(4);
  });
});
