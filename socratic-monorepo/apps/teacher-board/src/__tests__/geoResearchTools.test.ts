import {describe, expect, it} from 'vitest';
import {parseGeometryProblem, renderScene} from '../utils/geometryProblem';
import {fmtLen, measureAngle, measureDistance, toTikz} from '../utils/geoTools';

describe('Vẽ hình: tên hình trần cũng dựng được (khoanh tên hình rồi bấm Vẽ hình)', () => {
  for (const t of ['S.ABCD', 'hình chóp S.ABCD', 'tam giác nhọn ABC', 'tam giác tù ABC', "hình lập phương ABCD.A'B'C'D'", "hình hộp chữ nhật ABCD.A'B'C'D'", 'tam giác ABC vuông tại A']) {
    it(`dựng được "${t}"`, () => {
      const r = parseGeometryProblem(t);
      expect(r.scene, t).not.toBeNull();
    });
  }
});

describe('Đo, nét khuất và xuất TikZ trên hình dựng', () => {
  const sc = parseGeometryProblem('hình chóp S.ABCD đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2').scene!;
  it('độ dài và góc theo cạnh a = 1', () => {
    expect(measureDistance(sc, 'A', 'B')).toContain('AB = a');
    expect(measureDistance(sc, 'A', 'C')).toContain('a√2');
    expect(measureDistance(sc, 'S', 'A')).toContain('a√2');
    expect(measureAngle(sc, 'B', 'A', 'D')).toContain('90°');
    expect(fmtLen(Math.SQRT2 / 2)).toBe('a√2/2');
    expect(fmtLen(3)).toBe('3a');
  });
  it('ẩn hẳn nét khuất bớt đúng các cạnh đứt', () => {
    const withDash = renderScene(sc).edges.filter((e) => e.hidden).length;
    expect(withDash).toBeGreaterThan(0);
    const hidden = renderScene({...sc, hideHidden: true});
    expect(hidden.edges.filter((e) => e.hidden).length).toBe(0);
    expect(hidden.edges.length).toBe(renderScene(sc).edges.length - withDash);
  });
  it('mã TikZ có nét đứt cho cạnh khuất và đủ đỉnh', () => {
    const code = toTikz(sc, 0);
    expect(code).toContain('\\begin{tikzpicture}');
    expect(code).toContain('\\draw[dashed]');
    expect(code).toContain('\\coordinate (P0)');
    expect(code).toContain('\\end{tikzpicture}');
  });
});

import {problemTextForPlane, problemTextForSolid} from '../utils/geoTools';

describe('nét vẽ tay đã nhận dạng → hình dựng có đủ dụng cụ', () => {
  for (const k of ['cube', 'box', 'pyramid4', 'pyramid3', 'prism3']) {
    it(`khối ${k}`, () => {
      const t = problemTextForSolid(k, {a: 3, b: 2, c: 1})!;
      const r = parseGeometryProblem(t);
      expect(r.scene, t).not.toBeNull();
      expect(r.scene!.dim).toBe(3);
    });
  }
  for (const k of ['triangle_equilateral', 'triangle_right', 'triangle_isosceles', 'triangle_scalene', 'square', 'rectangle', 'parallelogram']) {
    it(`hình phẳng ${k}`, () => {
      const t = problemTextForPlane(k)!;
      expect(parseGeometryProblem(t).scene, t).not.toBeNull();
    });
  }
  it('hộp chữ nhật khác lập phương theo kích thước', () => {
    const sc = parseGeometryProblem(problemTextForSolid('box', {a: 3, b: 2, c: 1})!).scene!;
    const d = (p: string, q: string) => Math.hypot(...(sc.pts[p].map((v, i) => v - sc.pts[q][i]) as [number, number, number]));
    expect(d('A', 'B')).toBeCloseTo(3, 3);
    expect(d('A', 'D')).toBeCloseTo(2, 3);
    expect(d('A', "A'")).toBeCloseTo(1, 3);
  });
});

import {renderScene as renderSc} from '../utils/geometryProblem';

describe('xoay tự do và tô màu mặt', () => {
  const sc = parseGeometryProblem("hình lập phương ABCD.A'B'C'D' cạnh a").scene!;
  it('góc chuẩn SGK không đổi khi không đặt rot; có rot thì đổi hình chiếu', () => {
    const a = renderSc(sc);
    const b = renderSc({...sc, rot: {yaw: 0.6, pitch: 0.4}});
    expect(a.verts).not.toEqual(b.verts);
    expect(renderSc({...sc, rot: undefined}).verts).toEqual(a.verts);
  });
  it('khối xoay: luôn 3 mặt thấy và 3 mặt khuất của lập phương, cạnh khuất là nét đứt', () => {
    for (const rot of [{yaw: 0.6, pitch: 0.4}, {yaw: -1.1, pitch: 0.7}, {yaw: 2.5, pitch: -0.5}]) {
      const f = renderSc({...sc, rot, colors: true});
      expect(f.faces).toHaveLength(6);
      expect(f.faces.filter((x) => x.visible)).toHaveLength(3);
      const dashed = f.edges.filter((e) => e.hidden).length;
      expect(dashed).toBe(3);
    }
  });
  it('màu từng mặt khác nhau; tắt màu thì không có mặt tô', () => {
    const f = renderSc({...sc, rot: {yaw: 0.6, pitch: 0.4}, colors: true});
    expect(new Set(f.faces.map((x) => x.color)).size).toBe(6);
    expect(renderSc({...sc, rot: {yaw: 0.6, pitch: 0.4}}).faces).toHaveLength(0);
  });
  it('xoay không làm hình nhảy khỏi khung 300x300', () => {
    for (let i = 0; i < 12; i++) {
      const f = renderSc({...sc, rot: {yaw: i * 0.5, pitch: (i % 5) * 0.3 - 0.6}});
      for (const p of f.verts) {
        expect(p.x).toBeGreaterThan(-20);
        expect(p.x).toBeLessThan(320);
        expect(p.y).toBeGreaterThan(-20);
        expect(p.y).toBeLessThan(320);
      }
    }
  });
});

import {fmtQuantity, measureAngleLinePlane, measureDihedral, measureDistPointLine, measureDistPointPlane, solidStats} from '../utils/geoTools';

describe('đo nâng cao: khoảng cách, góc đường–mặt, nhị diện, thể tích', () => {
  const cube = parseGeometryProblem("hình lập phương ABCD.A'B'C'D' cạnh a").scene!;
  const pyr = parseGeometryProblem('hình chóp S.ABCD đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2').scene!;
  it('fmtQuantity viết dạng đẹp', () => {
    expect(fmtQuantity(Math.SQRT2, 'a')).toContain('√2 a');
    expect(fmtQuantity(1 / 3, 'a³')).toContain('1/3 a³');
    expect(fmtQuantity(Math.sqrt(3) / 2, 'a')).toContain('√3/2 a');
    expect(fmtQuantity((4 / 3) * Math.PI, 'a³', true)).toContain('4/3 π a³');
  });
  it('khoảng cách điểm–mặt: lập phương, A đến (A\'B\'C\'D\') bằng a; C\' đến (ABCD) bằng a', () => {
    expect(measureDistPointPlane(cube, 'A', "A'", "B'", "C'")).toContain('= 1 a');
    expect(measureDistPointPlane(cube, "C'", 'A', 'B', 'C')).toContain('= 1 a');
  });
  it('khoảng cách điểm–đường: đường chéo, B đến AC bằng a√2/2', () => {
    expect(measureDistPointLine(cube, 'B', 'A', 'C')).toContain('√2/2 a');
  });
  it('góc đường–mặt: SC và (ABCD) của chóp có SA = a√2: tan = √2/√2 = 1 → 45°', () => {
    expect(measureAngleLinePlane(pyr, 'S', 'C', 'A', 'B', 'D')).toContain('= 45°');
  });
  it('nhị diện [A, BC, D]… cạnh BC của lập phương: mặt đáy và mặt bên vuông nên 90°', () => {
    expect(measureDihedral(cube, 'B', 'C', 'A', "B'")).toContain('= 90°');
    expect(measureDihedral(cube, 'B', 'C', 'A', "D'")).toContain('= 45°');
  });
  it('thể tích và diện tích', () => {
    expect(solidStats(cube)).toContain('V = 1 a³');
    expect(solidStats(cube)).toContain('Stp = 6 a²');
    expect(solidStats(cube)).toContain('Sxq = 4 a²');
    expect(solidStats(pyr)).toContain('V = √2/3 a³');
    const box = parseGeometryProblem("hình hộp chữ nhật ABCD.A'B'C'D' có AB = 3, AD = 2, AA' = 1").scene!;
    expect(solidStats(box)).toContain('V = 6 a³');
    expect(solidStats(box)).toContain('Stp = 22 a²');
  });
  it('khối tròn xoay theo công thức', () => {
    expect(solidStats(parseGeometryProblem('Hình nón r = 3, h = 4').scene!)).toContain('V = 12 π a³');
    expect(solidStats(parseGeometryProblem('Hình nón r = 3, h = 4').scene!)).toContain('Sxq = 15 π a²');
    expect(solidStats(parseGeometryProblem('Hình trụ R = 2, h = 5').scene!)).toContain('V = 20 π a³');
    expect(solidStats(parseGeometryProblem('Hình cầu tâm O bán kính R = 3').scene!)).toContain('V = 36 π a³');
  });
});
