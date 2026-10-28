import {describe, it, expect} from 'vitest';
import {parseGeometryProblem, buildScene, renderScene, appendPart, evalLength, splitParts, normalizeProblem} from '../utils/geometryProblem';

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

describe('biểu thức độ dài và chuẩn hóa ký hiệu', () => {
  it('đọc a√2, 2a, a/2, √3/2 a', () => {
    expect(close(evalLength('a√2')!, Math.SQRT2)).toBe(true);
    expect(evalLength('2a')).toBe(2);
    expect(evalLength('a/2')).toBe(0.5);
    expect(close(evalLength('a\\sqrt{3}')!, Math.sqrt(3))).toBe(true);
    expect(evalLength('abc')).toBeNull();
  });

  it('ký hiệu ⊥ ∥ ∩ ≡ ∈ △ thành chữ', () => {
    const t = normalizeProblem("SA ⊥ (ABCD); AB ∥ CD; AC ∩ BD = O; M ≡ N; M ∈ SB; △ABC");
    expect(t).toContain('vuông góc');
    expect(t).toContain('song song');
    expect(t).toContain('giao');
    expect(t).toContain('trùng');
    expect(t).toContain('thuộc');
    expect(t).toContain('tam giác');
  });
});

describe('dựng hình từ đề', () => {
  it('hình chóp có SA vuông góc đáy, SA = a√2, M trung điểm SB', () => {
    const r = parseGeometryProblem('Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2. Gọi M là trung điểm của SB.');
    const sc = r.scene!;
    expect(r.isProblem).toBe(true);
    expect(sc.pts.S[0]).toBeCloseTo(sc.pts.A[0]);
    expect(sc.pts.S[2]).toBeCloseTo(sc.pts.A[2]);
    expect(sc.pts.S[1]).toBeCloseTo(Math.SQRT2);
    expect(sc.pts.M[0]).toBeCloseTo((sc.pts.S[0] + sc.pts.B[0]) / 2);
    expect(r.figure!.labels).toContain('M');
    expect(r.figure!.edges.some((e) => e.hidden)).toBe(true);
    expect(r.figure!.edges.some((e) => e.aux)).toBe(false);
  });

  it('đề viết tóm tắt GT/KL với ký hiệu ⊥', () => {
    const r = parseGeometryProblem('GT: S.ABCD, ABCD là hình chữ nhật, AB = 2a, AD = a, SA ⊥ (ABCD), SA = 3a\nKL: tính góc giữa SC và đáy');
    const sc = r.scene!;
    expect(sc.pts.B[0]).toBeCloseTo(2);
    expect(Math.abs(sc.pts.D[2])).toBeCloseTo(1);
    expect(sc.pts.S[1]).toBeCloseTo(3);
    expect(sc.parts.map((p) => p.label)).toEqual(['Đề', 'KL']);
  });

  it('tam giác vuông tại A có AB = 3, AC = 4 và AH ⊥ BC', () => {
    const r = parseGeometryProblem('Cho △ABC vuông tại A, AB = 3, AC = 4. Kẻ AH ⊥ BC (H ∈ BC).');
    const sc = r.scene!;
    expect(sc.dim).toBe(2);
    const [A, B, C, H] = ['A', 'B', 'C', 'H'].map((n) => sc.pts[n]);
    expect(Math.hypot(B[0] - A[0], B[1] - A[1])).toBeCloseTo(3);
    expect(Math.hypot(C[0] - A[0], C[1] - A[1])).toBeCloseTo(4);
    // AH ⊥ BC
    const ah = [H[0] - A[0], H[1] - A[1]];
    const bc = [C[0] - B[0], C[1] - B[1]];
    expect(ah[0] * bc[0] + ah[1] * bc[1]).toBeCloseTo(0);
    expect(r.figure!.edges.some((e) => e.aux)).toBe(true);
  });

  it('giao của hai đường chéo: O = AC ∩ BD', () => {
    const sc = parseGeometryProblem('Cho hình chóp S.ABCD đáy ABCD là hình bình hành, O = AC ∩ BD').scene!;
    const O = sc.pts.O;
    expect(O).toBeTruthy();
    expect(O[0]).toBeCloseTo((sc.pts.A[0] + sc.pts.C[0]) / 2);
    expect(O[2]).toBeCloseTo((sc.pts.A[2] + sc.pts.C[2]) / 2);
  });

  it('điểm trùng nhau được gộp nhãn', () => {
    const r = parseGeometryProblem('Cho hình chóp S.ABCD đáy hình vuông, O = AC ∩ BD, I trùng O');
    expect(r.figure!.labels.some((l) => l.includes('≡'))).toBe(true);
  });

  it('thiết diện qua ba điểm là trung điểm các cạnh', () => {
    const r = parseGeometryProblem('Cho hình chóp S.ABCD có đáy là hình vuông. M là trung điểm SA, N là trung điểm SC, P là trung điểm CD. Tìm thiết diện của hình chóp cắt bởi mặt phẳng (MNP).');
    expect(r.scene!.polys.length).toBe(1);
    expect(r.figure!.polys.length).toBe(1);
    expect(r.figure!.polys[0].length).toBeGreaterThanOrEqual(4);
  });

  it('giao tuyến hai mặt phẳng (SAB) ∩ (SCD) song song AB khi đáy là hình bình hành', () => {
    const sc = parseGeometryProblem('Cho hình chóp S.ABCD đáy là hình bình hành. Tìm giao tuyến d = (SAB) ∩ (SCD).').scene!;
    const d1 = sc.pts['#d1'];
    const d2 = sc.pts['#d2'];
    expect(d1 && d2).toBeTruthy();
    const dir = [d2[0] - d1[0], d2[1] - d1[1], d2[2] - d1[2]];
    const ab = [sc.pts.B[0] - sc.pts.A[0], sc.pts.B[1] - sc.pts.A[1], sc.pts.B[2] - sc.pts.A[2]];
    const cr = [dir[1] * ab[2] - dir[2] * ab[1], dir[2] * ab[0] - dir[0] * ab[2], dir[0] * ab[1] - dir[1] * ab[0]];
    expect(Math.hypot(...cr)).toBeLessThan(1e-6);
  });

  it('tên hình trần không bị coi là bài toán (để giữ mô hình 3D có sẵn)', () => {
    const r = parseGeometryProblem('hình chóp S.ABCD');
    expect(r.figure).not.toBeNull();
    expect(r.isProblem).toBe(false);
  });

  it('không nhận ra hình thì báo rõ chứ không bịa', () => {
    const r = parseGeometryProblem('Tính tích phân của x');
    expect(r.figure).toBeNull();
    expect(r.ignored.length).toBeGreaterThan(0);
  });
});

describe('vẽ từng phần của đề', () => {
  const text = 'Cho hình chóp S.ABCD đáy ABCD là hình bình hành. a) Gọi M là trung điểm SB. b) Gọi O = AC ∩ BD. c) Tìm giao tuyến d = (SAB) ∩ (SCD).';

  it('tách đúng các phần a), b), c)', () => {
    expect(splitParts(text).map((p) => p.label)).toEqual(['Đề', 'a)', 'b)', 'c)']);
    expect(splitParts('Cho hình chóp S.ABCD')).toHaveLength(1);
  });

  it('vẽ đến phần nào hiện đến phần đó, hình gốc không đổi vị trí', () => {
    const sc = buildScene(text).scene!;
    const f0 = renderScene(sc, 0);
    const f1 = renderScene(sc, 1);
    const f3 = renderScene(sc);
    expect(f0.labels).not.toContain('M');
    expect(f1.labels).toContain('M');
    expect(f1.labels).not.toContain('O');
    expect(f3.labels).toContain('O');
    // mọi đỉnh của hình gốc giữ nguyên tọa độ khi thêm phần
    f0.verts.forEach((v, i) => {
      expect(f3.verts[i]).toEqual(v);
      expect(f1.verts[i]).toEqual(v);
    });
    expect(f3.edges.filter((e) => e.aux).length).toBeGreaterThan(f1.edges.filter((e) => e.aux).length);
  });

  it('thêm yêu cầu mới vào cảnh sẵn có mà phần cũ giữ nguyên', () => {
    const sc = buildScene('Cho hình chóp S.ABCD đáy ABCD là hình vuông cạnh a, SA vuông góc đáy').scene!;
    const before = renderScene(sc);
    const sc2 = appendPart(sc, 'Gọi M là trung điểm của SC');
    const after = renderScene(sc2);
    expect(sc2.parts).toHaveLength(2);
    expect(after.labels).toContain('M');
    before.verts.forEach((v, i) => expect(after.verts[i]).toEqual(v));
    // yêu cầu vô nghĩa được báo lại
    expect(appendPart(sc2, 'blah blah').ignored.length).toBeGreaterThan(sc2.ignored.length);
  });
});

describe('đề lăng trụ có điểm trên mặt đáy trên', () => {
  it("trọng tâm tam giác A'B'C' được vẽ", () => {
    const sc = buildScene("Cho lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác vuông tại A, AB = a, AC = 2a, AA' = 3a. a) Gọi G là trọng tâm tam giác A'B'C'.").scene!;
    const g = sc.pts.G;
    expect(g).toBeTruthy();
    expect(g[1]).toBeCloseTo(sc.pts["A'"][1]);
    expect(g[0]).toBeCloseTo((sc.pts["A'"][0] + sc.pts["B'"][0] + sc.pts["C'"][0]) / 3);
  });
});
