import {describe, expect, it} from 'vitest';
import {buildScene, cleanHandwritten, splitParts} from '../utils/geometryProblem';
import {expandTangentLore} from '../utils/geoTangentLore';
import {claimError, parseClaim, verifyClaim} from '../utils/geoClaims';
import {freePoints, moveFreePoint, setPointT} from '../utils/geoTools';

/** Đề HSG: đường tròn tâm O (trung điểm BC) tiếp xúc hai cạnh bên, EF tiếp xúc đường tròn tại P; trực tâm, hình bình hành, đối xứng, giao điểm. */
const PROBLEM = `Câu III. Cho tam giác ABC cân tại A, có O là trung điểm của BC và góc BAC nhỏ hơn 90 độ. Xét đường tròn tâm O tiếp xúc với các cạnh CA, AB theo thứ tự tại R, Q. Trên các cạnh CA, AB lần lượt lấy E, F (không trùng các đỉnh tam giác) sao cho EF tiếp xúc với đường tròn tâm O tại P và EF không song song với BC. Gọi H, K lần lượt là trực tâm của các tam giác OFB, OEC. Gọi giao điểm của HE, FK với BC lần lượt là M, N.

(1) Chứng minh rằng hai tam giác OHM và OKN đồng dạng và tỉ số OK trên OH bằng AE trên AF.

(2) Dựng điểm G sao cho tứ giác OHGK là hình bình hành. Chứng minh rằng ba điểm O, G, P thẳng hàng.

(3) Lấy S, T lần lượt đối xứng với Q, R qua đường thẳng BC. Giả sử X là giao điểm của SF và TE, D là giao điểm của BS và CT. Chứng minh rằng AX song song với PD.`;

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('đề đường tròn tiếp xúc hai cạnh + tiếp tuyến EF (câu III)', () => {
  const sc = buildScene(PROBLEM).scene!;

  it('tách đủ ba phần (1), (2), (3) và dựng đủ 18 điểm', () => {
    expect(splitParts(cleanHandwritten(PROBLEM)).map((p) => p.label)).toEqual(['Đề', '1)', '2)', '3)']);
    for (const n of 'ABCORQFPEHKMNGSTXD') expect(sc.order, n).toContain(n);
    expect(buildScene(PROBLEM).ignored).toEqual([]);
  });

  it('"(1) …" chỉ tách phần khi là số trong ngoặc + câu viết hoa; dán một dòng vẫn tách đủ; "(d)", "(c)" không bị nhầm', () => {
    expect(splitParts('Cho đường thẳng (d) và điểm A (c). Tính độ dài.').length).toBe(1);
    expect(splitParts(cleanHandwritten(PROBLEM.replace(/\s*\n+\s*/g, ' '))).map((p) => p.label)).toEqual(['Đề', '1)', '2)', '3)']);
  });

  it('mọi điểm dựng đều có công thức; chỉ F trượt tự do trên cạnh AB', () => {
    for (const n of 'ORQPEHKMNGSTXD') expect(sc.defs![n], `${n} có công thức`).toBeTruthy();
    expect(sc.defs!.F).toMatchObject({k: 'seg', a: 'A', b: 'B'});
    expect(sc.circles![0].of).toEqual({f: 'cp', n: ['O', 'Q']});
  });

  it('đường tròn tiếp xúc CA, AB tại R, Q; EF tiếp xúc tại P; E, F nằm trên cạnh', () => {
    const p = sc.pts as Record<string, number[]>;
    const r = dist(p.O, p.Q);
    expect(dist(p.O, p.R)).toBeCloseTo(r, 6);
    expect(dist(p.O, p.P)).toBeCloseTo(r, 6);
    // P nằm trên EF, và OP ⊥ EF
    expect(Math.abs((p.E[0] - p.F[0]) * (p.P[1] - p.F[1]) - (p.E[1] - p.F[1]) * (p.P[0] - p.F[0]))).toBeLessThan(1e-9);
    expect((p.E[0] - p.F[0]) * (p.P[0] - p.O[0]) + (p.E[1] - p.F[1]) * (p.P[1] - p.O[1])).toBeCloseTo(0, 9);
    const within = (x: number[], a: number[], b: number[]) => dist(a, x) + dist(x, b) - dist(a, b) < 1e-9;
    expect(within(p.E, p.C, p.A)).toBe(true);
    expect(within(p.F, p.A, p.B)).toBe(true);
  });

  it('các tính chất của đề đúng trên hình và GIỮ NGUYÊN khi kéo đỉnh / trượt F', () => {
    for (const c of ['OK/OH = AE/AF', 'O, G, P thẳng hàng', 'AX song song với PD', 'OHGK là hình bình hành']) {
      expect(parseClaim(c), c).toBeTruthy();
      const v = verifyClaim(sc, c, 8);
      expect(v.verdict, `${c}: ${v.detail}`).toBe('holds');
    }
  }, 60000);

  it('kéo A, B, C và trượt F bất kì: tam giác vẫn cân tại A, O vẫn là trung điểm BC, đường tròn vẫn tiếp xúc, EF vẫn tiếp tuyến, mọi quan hệ của đề giữ nguyên', () => {
    expect(freePoints(sc).sort()).toEqual(['A', 'B', 'C']);
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    let cur = sc;
    let checked = 0;
    for (let i = 0; i < 40; i++) {
      const f = ['A', 'B', 'C'][i % 3];
      let next = moveFreePoint(cur, f, [cur.pts[f][0] + (rnd() - 0.5) * 0.9, cur.pts[f][1] + (rnd() - 0.5) * 0.9, 0]);
      if (i % 4 === 3) next = setPointT(next, 'F', 0.15 + rnd() * 0.3); // F trượt trên AB
      const p = next.pts as Record<string, number[]>;
      // chỉ xét hình còn là tam giác thật (không suy biến) và EF cắt đúng hai cạnh (cấu hình của đề)
      const area = Math.abs((p.B[0] - p.A[0]) * (p.C[1] - p.A[1]) - (p.B[1] - p.A[1]) * (p.C[0] - p.A[0]));
      if (area < 0.05) continue;
      cur = next;
      checked++;
      expect(dist(p.A, p.B), 'cân tại A').toBeCloseTo(dist(p.A, p.C), 3);
      expect(dist(p.O, p.B), 'O trung điểm BC').toBeCloseTo(dist(p.O, p.C), 6);
      const r = dist(p.O, p.Q);
      expect(dist(p.O, p.R), 'tiếp xúc CA tại R').toBeCloseTo(r, 4);
      expect(dist(p.O, p.P), 'EF tiếp xúc tại P').toBeCloseTo(r, 4);
      expect(next.circles![0].r, 'bán kính đường tròn theo OQ').toBeCloseTo(r, 6);
      for (const c of ['OK/OH = AE/AF', 'O, G, P thẳng hàng', 'AX // PD', 'OHGK là hình bình hành']) {
        const e = claimError(next.pts, parseClaim(c)!);
        expect(e === null || e < 1e-6, `${c} sau khi kéo (lỗi ${e})`).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(20);
  }, 60000);

  it('hai tam giác OHM và OKN đồng dạng đúng khi M, N là chân đường cao kẻ từ F, E (HF, EK cắt BC); hình vẽ theo đúng chữ của đề (HE, FK) thì không', () => {
    // ghi nhận có chủ đích: theo số đo, tam giác đồng dạng chỉ khi M = HF ∩ BC, N = EK ∩ BC; đề ghi HE, FK nên mệnh đề (1) báo "không đúng"
    expect(verifyClaim(sc, 'tam giác OHM đồng dạng tam giác OKN').verdict).toBe('fails');
    const alt = buildScene(PROBLEM.replace('HE, FK', 'HF, EK')).scene!;
    expect(verifyClaim(alt, 'tam giác OHM đồng dạng tam giác OKN', 8).verdict).toBe('holds');
  }, 60000);

  it('viết lại các câu "lần lượt" thành từng câu một', () => {
    const t = expandTangentLore(PROBLEM);
    expect(t).toContain('H là trực tâm tam giác OFB; K là trực tâm tam giác OEC');
    expect(t).toContain('M là giao điểm của HE và BC; N là giao điểm của FK và BC');
    expect(t).toContain('hình bình hành OHGK');
    expect(t).toContain('S đối xứng với Q qua BC; T đối xứng với R qua BC');
    expect(t).toContain('P đối xứng với Q qua FO');
    // đề khác không có câu này thì để nguyên
    expect(expandTangentLore('Cho tam giác ABC vuông tại A, đường cao AH.')).toBe('Cho tam giác ABC vuông tại A, đường cao AH.');
  });
});
