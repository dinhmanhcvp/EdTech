import {describe, it, expect} from 'vitest';
import {cleanHandwritten, parseGeometryProblem, buildScene, renderScene} from '../utils/geometryProblem';

/**
 * Đề VIẾT TAY: Vision/OCR trả về LaTeX lẫn chữ, đỉnh bị đọc tách chữ, dòng ngăn bằng \\.
 * Các chuỗi dưới đây mô phỏng đúng kiểu kết quả đó.
 */
const LATEX_PYRAMID = String.raw`\text{Cho hình chóp } S.ABCD \text{ có đáy } ABCD \text{ là hình vuông cạnh } a, SA \perp (ABCD), SA = a\sqrt{2} \\ \text{a) Gọi } M \text{ là trung điểm } SB \\ \text{b) Gọi } O = AC \cap BD`;

describe('nhận diện đề viết tay', () => {
  it('LaTeX có \\text, \\perp, \\cap, \\\\ vẫn dựng đúng hình và các phần', () => {
    const r = parseGeometryProblem(LATEX_PYRAMID);
    const sc = r.scene!;
    expect(r.isProblem).toBe(true);
    expect(sc.title).toBe('Hình chóp S.ABCD');
    expect(sc.parts.map((p) => p.label)).toEqual(['Đề', 'a)', 'b)']);
    expect(sc.pts.S[0]).toBeCloseTo(sc.pts.A[0]); // SA ⊥ đáy
    expect(sc.pts.S[1]).toBeCloseTo(Math.SQRT2);
    expect(renderScene(sc, 1).labels).toContain('M');
    expect(renderScene(sc).labels).toContain('O');
  });

  it('chữ cái đỉnh bị đọc tách cách: S . A B C D, A B C D, S A ⊥', () => {
    const t = 'Cho hình chóp S . A B C D có đáy A B C D là hình vuông cạnh a, S A ⊥ ( A B C D ), S A = a√2. Gọi M là trung điểm S B';
    expect(cleanHandwritten(t)).toContain('S.ABCD');
    const sc = parseGeometryProblem(t).scene!;
    expect(sc.title).toBe('Hình chóp S.ABCD');
    expect(sc.pts.S[1]).toBeCloseTo(Math.SQRT2);
    expect(sc.pts.M).toBeTruthy();
  });

  it("dấu phẩy viết dạng A^{\\prime}, A´, A ' và tam giác △ / \\triangle", () => {
    const t = String.raw`Cho lăng trụ đứng ABC.A^{\prime}B^{\prime}C^{\prime} có đáy \triangle ABC vuông tại A, AB = a, AC = 2a, AA^{\prime} = 3a`;
    const sc = parseGeometryProblem(t).scene!;
    expect(sc.title).toBe("Lăng trụ ABC.A'B'C'");
    expect(sc.pts["A'"][1]).toBeCloseTo(3);
  });

  it('góc viết \\widehat{ABC} và ký hiệu \\in, \\parallel được hiểu', () => {
    const t = String.raw`Cho tam giác ABC vuông tại A, AB = 3, AC = 4. Kẻ AH \perp BC, H \in BC`;
    const r = parseGeometryProblem(t);
    expect(r.scene!.pts.H).toBeTruthy();
    expect(cleanHandwritten(String.raw`\widehat{ABC} = 60°`)).toContain('góc ABC');
  });

  it('đề tóm tắt viết tay GT/KL ngăn bằng \\\\', () => {
    const t = String.raw`GT: \text{Hình chóp } S.ABCD, ABCD \text{ là hình bình hành} \\ KL: \text{a) Gọi } O = AC \cap BD`;
    const sc = buildScene(t).scene!;
    expect(sc.parts.map((p) => p.label)).toEqual(['Đề', 'a)']);
    expect(renderScene(sc).labels).toContain('O');
  });

  it('chữ thường không bị làm hỏng khi đi qua bước làm sạch', () => {
    const t = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy. Gọi M là trung điểm của SB.';
    expect(cleanHandwritten(t)).toBe(t);
    expect(parseGeometryProblem(t).scene!.pts.M).toBeTruthy();
  });
});
