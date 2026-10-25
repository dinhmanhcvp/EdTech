import {describe, it, expect} from 'vitest';
import {makeSolid, edgesOf, surfaceArea, volume, planUnfold, unfoldedFaces, netOverlaps, faceNormal, dot, sub, len, centroid, faceArea, viewAlign, mulMV, project, I3, pointInPoly, type V3} from '../utils/solids';
import type {SolidKind} from '../utils/localRouter';

const KINDS: SolidKind[] = ['cube', 'box', 'pyramid4', 'pyramid3', 'prism3', 'prism6', 'octahedron'];
const near = (a: number, b: number, d = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('solids: số liệu hình học đúng', () => {
  it('Euler V − E + F = 2 với mọi khối', () => {
    for (const k of KINDS) {
      const s = makeSolid(k);
      expect(s.verts.length - edgesOf(s.faces).length + s.faces.length, k).toBe(2);
    }
  });

  it('số mặt, cạnh, đỉnh đúng', () => {
    const cnt = (k: SolidKind) => {
      const s = makeSolid(k);
      return [s.faces.length, edgesOf(s.faces).length, s.verts.length];
    };
    expect(cnt('cube')).toEqual([6, 12, 8]);
    expect(cnt('pyramid4')).toEqual([5, 8, 5]);
    expect(cnt('pyramid3')).toEqual([4, 6, 4]);
    expect(cnt('prism3')).toEqual([5, 9, 6]);
    expect(cnt('prism6')).toEqual([8, 18, 12]);
    expect(cnt('octahedron')).toEqual([8, 12, 6]);
  });

  it('diện tích toàn phần và thể tích khớp công thức', () => {
    const area = (k: SolidKind, d = {}) => surfaceArea(makeSolid(k, d));
    const vol = (k: SolidKind, d = {}) => volume(makeSolid(k, d));
    near(area('cube', {a: 2}), 24);
    near(vol('cube', {a: 2}), 8);
    near(area('box', {a: 3, b: 2, c: 1.5}), 2 * (6 + 4.5 + 3));
    near(vol('box', {a: 3, b: 2, c: 1.5}), 9);
    near(vol('pyramid4', {a: 2, h: 2.5}), (4 * 2.5) / 3);
    near(area('pyramid4', {a: 2, h: 2.5}), 4 + 4 * Math.sqrt(1 + 6.25));
    near(area('pyramid3', {a: 2}), 4 * Math.sqrt(3));
    near(vol('pyramid3', {a: 2}), 8 / (6 * Math.SQRT2));
    near(area('prism3', {a: 2, h: 3}), 2 * Math.sqrt(3) + 18);
    near(vol('prism3', {a: 2, h: 3}), Math.sqrt(3) * 3);
    near(vol('prism6', {a: 2, h: 3}), ((3 * Math.sqrt(3)) / 2) * 4 * 3);
    near(area('octahedron', {a: 2}), 2 * Math.sqrt(3) * 4);
    near(vol('octahedron', {a: 2}), (Math.SQRT2 / 3) * 8);
  });

  it('pháp tuyến mọi mặt hướng ra ngoài (khối lồi)', () => {
    for (const k of KINDS) {
      const s = makeSolid(k);
      const c = centroid(s.verts);
      s.faces.forEach((f, i) => {
        const fc = centroid(f.map((v) => s.verts[v]));
        expect(dot(faceNormal(s.verts, f), sub(fc, c)), `${k} mặt ${i}`).toBeGreaterThan(0);
      });
    }
  });

  it('đổi kích thước giữ đúng cấu trúc và cập nhật số liệu', () => {
    const a = makeSolid('cube', {a: 2});
    const b = makeSolid('cube', {a: 4});
    expect(b.faces).toEqual(a.faces);
    near(b.formulas[1].value, 64);
  });
});

describe('solids: khai triển thành mạng phẳng', () => {
  it('mọi khối, mọi mặt gốc đều có mạng khai triển hợp lệ không chồng mặt', () => {
    for (const k of KINDS) {
      const s = makeSolid(k);
      for (let root = 0; root < s.faces.length; root++) {
        const plan = planUnfold(s, root);
        expect(plan.nodes.length, `${k}/${root}`).toBe(s.faces.length);
        expect(plan.valid, `${k} gốc ${root}`).toBe(true);
        expect(netOverlaps(s, plan)).toBe(false);
      }
    }
  });

  it('u = 0 trả lại đúng khối ban đầu', () => {
    for (const k of KINDS) {
      const s = makeSolid(k);
      const flat = unfoldedFaces(s, planUnfold(s, 0), 0);
      s.faces.forEach((f, i) => f.forEach((vi, j) => expect(len(sub(flat[i][j], s.verts[vi])), `${k}`).toBeLessThan(1e-9)));
    }
  });

  it('u = 1: mọi mặt nằm trong một mặt phẳng (mặt phẳng của mặt gốc)', () => {
    for (const k of KINDS) {
      const s = makeSolid(k);
      const plan = planUnfold(s, 0);
      const flat = unfoldedFaces(s, plan, 1);
      const n = faceNormal(s.verts, s.faces[0]);
      const p0 = s.verts[s.faces[0][0]];
      flat.forEach((f) => f.forEach((v) => expect(Math.abs(dot(sub(v, p0), n)), `${k}`).toBeLessThan(1e-9)));
    }
  });

  it('gấp/mở bảo toàn độ dài cạnh và diện tích mỗi mặt ở mọi mức u', () => {
    for (const k of KINDS) {
      const s = makeSolid(k);
      const plan = planUnfold(s, 0);
      for (const u of [0, 0.25, 0.5, 0.8, 1]) {
        const fo = unfoldedFaces(s, plan, u);
        s.faces.forEach((f, i) => {
          for (let j = 0; j < f.length; j++) {
            const a = len(sub(s.verts[f[j]], s.verts[f[(j + 1) % f.length]]));
            const b = len(sub(fo[i][j], fo[i][(j + 1) % f.length]));
            expect(Math.abs(a - b), `${k} u=${u}`).toBeLessThan(1e-9);
          }
          expect(Math.abs(faceArea(fo[i].map((_, q) => fo[i][q]).map((v) => v) as V3[], fo[i].map((_, q) => q)) - faceArea(s.verts, f))).toBeLessThan(1e-9);
        });
      }
    }
  });

  it('cạnh chung (bản lề) cha–con luôn trùng nhau khi gấp (mặt không bị rời)', () => {
    for (const k of KINDS) {
      const s = makeSolid(k);
      const plan = planUnfold(s, 0);
      for (const u of [0.3, 0.7, 1]) {
        const fo = unfoldedFaces(s, plan, u);
        for (const n of plan.nodes.filter((x) => x.parent >= 0)) {
          const [p, q] = n.hinge!;
          const pi = s.verts.findIndex((v) => len(sub(v, p)) < 1e-12);
          const qi = s.verts.findIndex((v) => len(sub(v, q)) < 1e-12);
          for (const vi of [pi, qi]) {
            const a = fo[n.face][s.faces[n.face].indexOf(vi)];
            const b = fo[n.parent][s.faces[n.parent].indexOf(vi)];
            expect(len(sub(a, b)), `${k} u=${u}`).toBeLessThan(1e-9);
          }
        }
      }
    }
  });

  it('hình lập phương khai triển thành mạng chữ thập: 6 hình vuông cạnh a, tổng diện tích 6a²', () => {
    const s = makeSolid('cube', {a: 2});
    const plan = planUnfold(s, 0);
    const flat = unfoldedFaces(s, plan, 1);
    flat.forEach((f) => near(faceArea(f, [0, 1, 2, 3]), 4, 1e-9));
    // trong mạng chữ thập, hai mặt đối diện không bao giờ kề nhau qua một cạnh
    const opposite = (a: number, b: number) => dot(faceNormal(s.verts, s.faces[a]), faceNormal(s.verts, s.faces[b])) < -0.99;
    for (const n of plan.nodes.filter((x) => x.parent >= 0)) expect(opposite(n.face, n.parent)).toBe(false);
  });

  it('căn chỉnh nhìn thẳng: mặt gốc quay về hướng người xem', () => {
    const s = makeSolid('box', {a: 3, b: 2, c: 1.5});
    const R = viewAlign(s, 0);
    const n = mulMV(R, faceNormal(s.verts, s.faces[0]));
    near(n[2], 1, 1e-9);
  });
});

describe('solids: phép chiếu và chọn mặt', () => {
  it('chiếu phối cảnh đưa tâm về giữa canvas', () => {
    const p = project({R: I3, zoom: 50, cx: 300, cy: 200, dist: 12}, [0, 0, 0]);
    near(p.x, 300, 1e-9);
    near(p.y, 200, 1e-9);
  });
  it('điểm trong đa giác', () => {
    const sq = [{x: 0, y: 0}, {x: 10, y: 0}, {x: 10, y: 10}, {x: 0, y: 10}];
    expect(pointInPoly(sq, 5, 5)).toBe(true);
    expect(pointInPoly(sq, 12, 5)).toBe(false);
  });
});

import {slerpRot, rotAxis, orthonormalize, matToAxisAngle} from '../utils/solids';
describe('solids: nội suy phép quay', () => {
  it('slerpRot đi từ R0 đến R1 và giữ trực giao', () => {
    const R0 = rotAxis([1, 0, 0], 0.4);
    const R1 = rotAxis([0, 1, 0], 2.2);
    const a = slerpRot(R0, R1, 0);
    const b = slerpRot(R0, R1, 1);
    const mid = slerpRot(R0, R1, 0.5);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      expect(Math.abs(a[i][j] - R0[i][j])).toBeLessThan(1e-9);
      expect(Math.abs(b[i][j] - R1[i][j])).toBeLessThan(1e-9);
    }
    const o = orthonormalize(mid);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(Math.abs(o[i][j] - mid[i][j])).toBeLessThan(1e-9);
    expect(matToAxisAngle(rotAxis([0, 0, 1], 1.0)).angle).toBeCloseTo(1.0, 9);
    // góc π: trục phải khôi phục đúng (tới dấu)
    const pi = matToAxisAngle(rotAxis([1, 2, 2], Math.PI));
    expect(pi.angle).toBeCloseTo(Math.PI, 6);
    expect(Math.abs(pi.axis[0] * 1 + pi.axis[1] * 2 + pi.axis[2] * 2)).toBeCloseTo(3, 6);
    // nội suy qua góc π vẫn đến đúng đích
    const Rpi = rotAxis([1, 0, 0], Math.PI);
    const end = slerpRot(rotAxis([0, 0, 1], 0), Rpi, 1);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(Math.abs(end[i][j] - Rpi[i][j])).toBeLessThan(1e-6);
  });
});
