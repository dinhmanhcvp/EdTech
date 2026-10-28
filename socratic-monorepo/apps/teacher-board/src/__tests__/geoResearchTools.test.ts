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
