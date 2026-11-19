import {describe, expect, it} from 'vitest';
import {buildScene} from '../utils/geometryProblem';
import {applyDefs} from '../utils/geoTools';

// Đề người dùng báo "chưa vẽ đủ hình": thiếu T, K, F; N bị đặt ở giao CE với AH thay vì giao trung trực CE với AH
const DE =
  'Câu 4 (3,0 điểm) Cho tam giác nhọn ABC cân tại A, có đường cao AH. Lấy điểm O thuộc đoạn thẳng AH sao cho OH lớn hơn OA. Đường thẳng AB cắt đường tròn tâm O bán kính OB tại điểm thứ hai T. Lấy điểm E thuộc đoạn thẳng AB sao cho AE lớn hơn AT. Đường trung trực của đoạn thẳng CE cắt đường thẳng AH tại điểm N. Chứng minh bốn điểm A, E, N, C cùng thuộc một đường tròn. Đường thẳng qua điểm A và song song với đường thẳng BC cắt đường trung trực của đoạn thẳng CE tại điểm K. Gọi F là trung điểm của đoạn thẳng ET. Chứng minh góc OFK bằng 90 độ. Chứng minh đường tròn tâm O bán kính OB, đường tròn đường kính NK và đường thẳng TK cùng đi qua một điểm.';

type V = number[];
const d = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (o: V, a: V, b: V) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function check(p: Record<string, V>) {
  const {A, B, C, H, O, T, E, N, K, F} = p;
  expect(d(O, T)).toBeCloseTo(d(O, B), 6); // T trên (O; OB)
  expect(Math.abs(cross(A, B, T))).toBeLessThan(1e-6); // T trên đường thẳng AB
  expect(d(T, B)).toBeGreaterThan(1e-3); // giao điểm THỨ HAI
  expect(d(A, E)).toBeGreaterThan(d(A, T)); // AE > AT
  expect(d(N, C)).toBeCloseTo(d(N, E), 6); // N trên trung trực CE
  expect(Math.abs(cross(A, H, N))).toBeLessThan(1e-6); // N trên AH
  expect(d(K, C)).toBeCloseTo(d(K, E), 6); // K trên trung trực CE
  expect(K[1]).toBeCloseTo(A[1], 6); // AK song song BC (BC nằm ngang)
  expect(F[0]).toBeCloseTo((E[0] + T[0]) / 2, 6);
  expect(C[1]).toBeCloseTo(B[1], 6);
}

describe('đường trung trực cắt một đường; giao thứ hai với "đường tròn tâm O bán kính OB"', () => {
  it('dựng đủ T, E, N, K, F đúng điều kiện đề', () => {
    const b = buildScene(DE);
    const sc = b.scene!;
    for (const n of ['A', 'B', 'C', 'H', 'O', 'T', 'E', 'N', 'K', 'F']) expect(sc.order).toContain(n);
    expect(b.ignored).toEqual([]);
    check(sc.pts as Record<string, V>);
    expect(sc.circles?.length).toBe(2); // (O; OB) và đường tròn đường kính NK
  });

  it('kéo đỉnh A: N, K vẫn trên trung trực CE (có công thức, không đứng yên)', () => {
    const sc = buildScene(DE).scene!;
    const moved = applyDefs({...sc, pts: {...sc.pts, A: [0.1, 1.5, 0]}});
    const {C, E, N, K} = moved.pts as Record<string, V>;
    expect(d(N, C)).toBeCloseTo(d(N, E), 6);
    expect(d(K, C)).toBeCloseTo(d(K, E), 6);
  });
});
