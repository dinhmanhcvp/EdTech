import {describe, expect, it} from 'vitest';
import {buildScene, makeProjector, renderScene, type GeoScene} from '../utils/geometryProblem';
import {dragTarget3, freePoints, moveFreePoint, partChips, selectPartUpTo, showUpTo} from '../utils/geoTools';

/**
 * Đề hình học không gian khó, nhiều phần (chóp có cạnh bên vuông góc đáy, chóp đều, lăng trụ đứng/xiên, lập phương, hộp chữ nhật, tứ diện vuông):
 * dựng đủ điểm, ĐÚNG số liệu và quan hệ của đề (vuông góc, trung điểm, hình chiếu, giao với mặt phẳng), vẽ được từng phần.
 * Các mệnh đề "Chứng minh…" là định lí đúng của hình nên được kiểm bằng số trên tọa độ dựng ra, trên hình vừa dựng VÀ sau khi kéo
 * từng đỉnh kéo được (đỉnh đáy trượt trong mặt đáy, đỉnh chóp/đỉnh trên đổi chiều cao), kể cả kéo liên tiếp và khi đã xoay hình.
 */
const SOLIDS: Record<string, string> = {
  "S01": "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng (ABCD) và SA = a√2. Gọi O là giao điểm của AC và BD.\na) Chứng minh BD vuông góc với mặt phẳng (SAC).\nb) Gọi H, K lần lượt là hình chiếu vuông góc của A trên SB, SD. Chứng minh SC vuông góc với mặt phẳng (AHK).\nc) Gọi I là giao điểm của SC và mặt phẳng (AHK). Chứng minh HK song song với BD.\nd) Tính góc giữa SC và mặt phẳng (ABCD).",
  "S02": "Cho hình chóp S.ABCD có đáy ABCD là hình bình hành tâm O. Gọi M, N lần lượt là trung điểm của SA, SC.\na) Tìm giao tuyến của hai mặt phẳng (SAC) và (SBD).\nb) Chứng minh MN song song với mặt phẳng (ABCD).\nc) Gọi P là trung điểm của CD. Xác định thiết diện của hình chóp cắt bởi mặt phẳng (MNP).",
  "S03": "Cho hình chóp S.ABC có đáy ABC là tam giác đều cạnh a, SA vuông góc với đáy, SA = a. Gọi M là trung điểm của BC, H là hình chiếu của A trên SM.\na) Chứng minh BC vuông góc với mặt phẳng (SAM).\nb) Chứng minh AH vuông góc với mặt phẳng (SBC).\nc) Tính khoảng cách từ A đến mặt phẳng (SBC).",
  "S04": "Cho hình lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác vuông tại B, AB = a, BC = a√3, AA' = 2a. Gọi M là trung điểm của A'C'.\na) Chứng minh BC vuông góc với mặt phẳng (ABB'A').\nb) Tính góc giữa đường thẳng A'C và mặt phẳng (ABC).\nc) Gọi N là trung điểm của BB'. Tính khoảng cách giữa hai đường thẳng MN và AC.",
  "S05": "Cho hình lập phương ABCD.A'B'C'D' cạnh a. Gọi M, N lần lượt là trung điểm của AB và C'D'.\na) Chứng minh A'C vuông góc với mặt phẳng (AB'D').\nb) Xác định thiết diện của hình lập phương cắt bởi mặt phẳng (A'MN).\nc) Tính khoảng cách giữa hai đường thẳng AC và B'D'.",
  "S06": "Cho tứ diện ABCD có AB, AC, AD đôi một vuông góc và AB = AC = AD = a. Gọi M là trung điểm của BC, H là hình chiếu của A trên mặt phẳng (BCD).\na) Chứng minh BC vuông góc với mặt phẳng (ADM).\nb) Chứng minh H là trọng tâm tam giác BCD.\nc) Tính khoảng cách từ A đến mặt phẳng (BCD).",
  "S07": "Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a, cạnh bên bằng a√2. Gọi O là tâm của đáy, M là trung điểm của CD.\na) Chứng minh SO vuông góc với mặt phẳng (ABCD).\nb) Tính góc giữa mặt bên (SCD) và mặt đáy.\nc) Gọi G là trọng tâm tam giác SCD. Tính khoảng cách từ G đến mặt phẳng (SAB).",
  "S08": "Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật, AB = a, AD = a√2, SA vuông góc với đáy và SA = a. Gọi M là trung điểm của AD, E là giao điểm của BM và AC.\na) Chứng minh BM vuông góc với mặt phẳng (SAC).\nb) Tính góc giữa SC và mặt phẳng (SAB).\nc) Tính khoảng cách từ E đến mặt phẳng (SBM).",
  "S09": "Cho hình chóp S.ABC có SA, SB, SC đôi một vuông góc, SA = SB = SC = a. Gọi M, N, P lần lượt là trung điểm của AB, BC, CA.\na) Chứng minh SC vuông góc với AB.\nb) Xác định thiết diện của hình chóp cắt bởi mặt phẳng (MNP).\nc) Tính thể tích khối chóp S.MNP.",
  "S10": "Cho hình hộp chữ nhật ABCD.A'B'C'D' có AB = a, AD = 2a, AA' = 3a. Gọi M là trung điểm của BB', N là điểm trên cạnh DD' sao cho DN = 2ND'.\na) Xác định giao điểm của đường thẳng C'M với mặt phẳng (ABCD).\nb) Xác định thiết diện của hình hộp cắt bởi mặt phẳng (AMN).\nc) Tính thể tích khối tứ diện AMNC'.",
  "S11": "Cho hình chóp S.ABCD có đáy ABCD là hình thang vuông tại A và B, AB = BC = a, AD = 2a, SA vuông góc với đáy, SA = a√2. Gọi E là trung điểm của AD.\na) Chứng minh tứ giác ABCE là hình vuông.\nb) Chứng minh CD vuông góc với mặt phẳng (SAC).\nc) Gọi H là hình chiếu của A trên SC. Chứng minh AH vuông góc với mặt phẳng (SCD).",
  "S12": "Cho lăng trụ ABC.A'B'C' có đáy là tam giác đều cạnh a, hình chiếu vuông góc của A' lên mặt phẳng (ABC) là trung điểm H của BC, AA' = a√3.\na) Chứng minh BC vuông góc với mặt phẳng (A'AH).\nb) Tính góc giữa AA' và mặt phẳng (ABC).\nc) Tính thể tích khối lăng trụ.",
};

type V = number[];
const sub = (a: V, b: V) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const mid = (a: V, b: V) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const E = 1e-8;
const tools = (s: GeoScene) => {
  const p = (n: string) => s.pts[n] as V;
  const d = (a: string, b: string) => len(sub(p(a), p(b)));
  /** |cos| góc giữa hai đường XY, ZW (0 = vuông góc) */
  const perp = (x: string, y: string, z: string, w: string) => Math.abs(dot(sub(p(y), p(x)), sub(p(w), p(z)))) / (d(x, y) * d(z, w));
  const par = (x: string, y: string, z: string, w: string) => len(cross(sub(p(y), p(x)), sub(p(w), p(z)))) / (d(x, y) * d(z, w));
  const onLine = (n: string, a: string, b: string) => len(cross(sub(p(b), p(a)), sub(p(n), p(a)))) / d(a, b) ** 2;
  const onPlane = (n: string, a: string, b: string, c: string) => Math.abs(dot(cross(sub(p(b), p(a)), sub(p(c), p(a))), sub(p(n), p(a)))) / d(a, b) ** 3;
  const same = (a: V, b: V) => len(sub(a, b)) / Math.max(1e-9, d(s.faces[0][0], s.faces[0][1]));
  const cen = (...ns: string[]) => [0, 1, 2].map((i) => ns.reduce((t, n) => t + p(n)[i], 0) / ns.length);
  return {p, d, perp, par, onLine, onPlane, same, cen};
};
const close = (a: number, b: number) => expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(1e-8);

/** Quan hệ của hình (dạng đáy, vuông góc, trung điểm, hình chiếu, giao điểm) và các định lí cần chứng minh: phải đúng cả sau khi kéo. */
const KEEP: Record<string, (s: GeoScene) => void> = {
  S01: (s) => {
    const {p, d, perp, par, onLine, onPlane, same} = tools(s);
    expect(perp('S', 'A', 'A', 'B') + perp('S', 'A', 'A', 'D') + perp('A', 'B', 'A', 'D')).toBeLessThan(E);
    close(d('A', 'B'), d('A', 'D'));
    expect(same(p('O'), mid(p('A'), p('C')))).toBeLessThan(E);
    expect(onLine('H', 'S', 'B') + perp('A', 'H', 'S', 'B') + onLine('K', 'S', 'D') + perp('A', 'K', 'S', 'D')).toBeLessThan(E);
    expect(onLine('I', 'S', 'C') + onPlane('I', 'A', 'H', 'K')).toBeLessThan(E);
    expect(perp('S', 'C', 'A', 'H') + perp('S', 'C', 'A', 'K') + par('H', 'K', 'B', 'D') + perp('B', 'D', 'S', 'C')).toBeLessThan(E);
  },
  S02: (s) => {
    const {p, par, same, onLine} = tools(s);
    expect(same(p('O'), mid(p('A'), p('C'))) + same(p('O'), mid(p('B'), p('D')))).toBeLessThan(E);
    expect(same(p('M'), mid(p('S'), p('A'))) + same(p('P'), mid(p('C'), p('D')))).toBeLessThan(E);
    expect(par('M', 'N', 'A', 'C') + par('A', 'B', 'D', 'C') + par('A', 'D', 'B', 'C')).toBeLessThan(E);
    // giao tuyến (SAC) ∩ (SBD) là đường SO: hai đầu mút vẽ nằm trên SO
    expect(onLine('#d1', 'S', 'O') + onLine('#d2', 'S', 'O')).toBeLessThan(E);
    expect((s.sections ?? []).some((x) => x.plane.join('') === 'MNP')).toBe(true);
  },
  S03: (s) => {
    const {d, perp, onLine} = tools(s);
    close(d('A', 'B'), d('B', 'C'));
    close(d('A', 'C'), d('B', 'C'));
    expect(perp('S', 'A', 'A', 'B') + perp('S', 'A', 'A', 'C')).toBeLessThan(E);
    expect(onLine('H', 'S', 'M') + perp('A', 'H', 'S', 'M') + perp('A', 'H', 'B', 'C') + perp('B', 'C', 'A', 'M')).toBeLessThan(E);
  },
  S04: (s) => {
    const {p, perp, same} = tools(s);
    expect(perp('A', 'B', 'B', 'C') + perp('A', "A'", 'A', 'B') + perp('A', "A'", 'B', 'C') + perp('B', 'C', 'A', "A'")).toBeLessThan(E);
    expect(same(p('M'), mid(p("A'"), p("C'"))) + same(p('N'), mid(p('B'), p("B'")))).toBeLessThan(E);
  },
  S05: (s) => {
    const {d, perp} = tools(s);
    for (const [a, b] of [['A', 'D'], ['A', "A'"], ['B', 'C']]) close(d(a, b), d('A', 'B'));
    expect(perp('A', 'B', 'A', 'D') + perp('A', "A'", 'A', 'B') + perp('A', "A'", 'A', 'D')).toBeLessThan(E);
    expect(perp("A'", 'C', 'A', "B'") + perp("A'", 'C', 'A', "D'") + perp('A', 'C', "B'", "D'")).toBeLessThan(E);
    expect((s.sections ?? []).some((x) => x.plane.join('') === "A'MN")).toBe(true);
  },
  S06: (s) => {
    const {p, perp, same, onPlane} = tools(s);
    expect(perp('A', 'B', 'A', 'C') + perp('A', 'B', 'A', 'D') + perp('A', 'C', 'A', 'D')).toBeLessThan(E);
    expect(onPlane('H', 'B', 'C', 'D') + perp('A', 'H', 'B', 'C') + perp('A', 'H', 'C', 'D')).toBeLessThan(E);
    expect(same(p('M'), mid(p('B'), p('C')))).toBeLessThan(E);
  },
  S07: (s) => {
    const {p, d, perp, same, cen} = tools(s);
    for (const v of ['B', 'C', 'D']) close(d('S', v), d('S', 'A'));
    close(d('A', 'B'), d('B', 'C'));
    expect(perp('A', 'B', 'B', 'C') + perp('S', 'O', 'A', 'C') + perp('S', 'O', 'B', 'D')).toBeLessThan(E);
    expect(same(p('G'), cen('S', 'C', 'D')) + same(p('M'), mid(p('C'), p('D')))).toBeLessThan(E);
  },
  S08: (s) => {
    const {perp, onLine} = tools(s);
    expect(perp('A', 'B', 'A', 'D') + perp('S', 'A', 'A', 'B') + perp('S', 'A', 'A', 'D')).toBeLessThan(E);
    expect(onLine('E', 'B', 'M') + onLine('E', 'A', 'C')).toBeLessThan(E);
  },
  S09: (s) => {
    const {p, perp, same} = tools(s);
    expect(perp('S', 'A', 'S', 'B') + perp('S', 'A', 'S', 'C') + perp('S', 'B', 'S', 'C') + perp('S', 'C', 'A', 'B')).toBeLessThan(E);
    expect(same(p('M'), mid(p('A'), p('B'))) + same(p('N'), mid(p('B'), p('C'))) + same(p('P'), mid(p('C'), p('A')))).toBeLessThan(E);
    expect((s.sections ?? []).some((x) => x.plane.join('') === 'MNP')).toBe(true);
  },
  S10: (s) => {
    const {d, perp, onLine, onPlane} = tools(s);
    expect(perp('A', 'B', 'A', 'D') + perp('A', "A'", 'A', 'B') + perp('A', "A'", 'A', 'D')).toBeLessThan(E);
    close(d('D', 'N') / d('N', "D'"), 2);
    expect(onLine('K', "C'", 'M') + onPlane('K', 'A', 'B', 'C')).toBeLessThan(E);
    expect(s.merged).toEqual({});
  },
  S11: (s) => {
    const {perp, onLine, par} = tools(s);
    expect(perp('A', 'B', 'A', 'D') + perp('A', 'B', 'B', 'C') + par('A', 'D', 'B', 'C') + perp('S', 'A', 'A', 'B') + perp('S', 'A', 'A', 'D')).toBeLessThan(E);
    expect(onLine('H', 'S', 'C') + perp('A', 'H', 'S', 'C')).toBeLessThan(E);
  },
  S12: (s) => {
    const {p, d, perp, same} = tools(s);
    close(d('A', 'B'), d('B', 'C'));
    close(d('A', 'C'), d('B', 'C'));
    expect(same(p('H'), mid(p('B'), p('C')))).toBeLessThan(E);
    expect(perp("A'", 'H', 'A', 'B') + perp("A'", 'H', 'B', 'C')).toBeLessThan(E);
  },
};

/** Số liệu của đề: đúng trên hình vừa dựng (kéo thì số đo đổi, như trên GeoGebra). */
const DATA: Record<string, (s: GeoScene) => void> = {
  S01: (s) => close(tools(s).d('S', 'A') / tools(s).d('A', 'B'), Math.SQRT2),
  S03: (s) => close(tools(s).d('S', 'A'), tools(s).d('A', 'B')),
  S04: (s) => {
    const {d} = tools(s);
    close(d('B', 'C') / d('A', 'B'), Math.sqrt(3));
    close(d('A', "A'") / d('A', 'B'), 2);
  },
  S06: (s) => {
    const {p, d, same, cen} = tools(s);
    close(d('A', 'B'), d('A', 'C'));
    close(d('A', 'C'), d('A', 'D'));
    expect(same(p('H'), cen('B', 'C', 'D'))).toBeLessThan(1e-7);
  },
  S07: (s) => close(tools(s).d('S', 'A') / tools(s).d('A', 'B'), Math.SQRT2),
  S08: (s) => {
    const {d, perp} = tools(s);
    close(d('A', 'D') / d('A', 'B'), Math.SQRT2);
    close(d('S', 'A'), d('A', 'B'));
    expect(perp('B', 'M', 'A', 'C')).toBeLessThan(E);
  },
  S09: (s) => close(tools(s).d('S', 'A'), tools(s).d('S', 'B')),
  S10: (s) => {
    const {d} = tools(s);
    close(d('A', 'D') / d('A', 'B'), 2);
    close(d('A', "A'") / d('A', 'B'), 3);
  },
  S11: (s) => {
    const {d, perp} = tools(s);
    close(d('A', 'D') / d('A', 'B'), 2);
    close(d('B', 'C'), d('A', 'B'));
    expect(perp('C', 'D', 'A', 'C') + perp('A', 'H', 'C', 'D')).toBeLessThan(E);
  },
  S12: (s) => close(tools(s).d('A', "A'") / tools(s).d('A', 'B'), Math.sqrt(3)),
};

const MOVES: [number, number][] = [[28, -14], [-22, 18], [0, 35], [40, 6]];
/** Mọi trạng thái kéo được: từng đỉnh kéo được, mỗi đỉnh 4 hướng (độ dời chuột theo đơn vị khung vẽ). */
const dragged = (s: GeoScene): {who: string; t: GeoScene}[] =>
  freePoints(s).flatMap((n) => MOVES.map(([dx, dy]) => ({who: `${n} (${dx}, ${dy})`, t: moveFreePoint(s, n, dragTarget3(s, n, dx, dy))})));

describe('hình không gian khó: dựng đúng dữ kiện và các định lí cần chứng minh', () => {
  for (const id of Object.keys(SOLIDS)) {
    it(`${id}: số liệu và quan hệ trên hình vừa dựng`, () => {
      const s = buildScene(SOLIDS[id]).scene!;
      DATA[id]?.(s);
      KEEP[id](s);
    });
  }
});

describe('hình không gian: kéo đỉnh giữ tính chất', () => {
  for (const id of Object.keys(SOLIDS)) {
    it(`${id}: kéo từng đỉnh đáy / đỉnh chóp, mọi quan hệ vẫn đúng`, () => {
      const s = buildScene(SOLIDS[id]).scene!;
      expect(freePoints(s).length, 'có đỉnh kéo được').toBeGreaterThanOrEqual(2);
      for (const {who, t} of dragged(s)) {
        expect(t, `${who}: kéo được`).not.toBe(s);
        for (const q of Object.values(t.pts)) expect(q.every(Number.isFinite), who).toBe(true);
        KEEP[id](t);
      }
    });
  }

  it('kéo liên tiếp nhiều lần (đỉnh đáy, đỉnh chóp, đỉnh đáy khác…) và khi đã xoay hình: vẫn đúng', () => {
    for (const id of Object.keys(SOLIDS)) {
      for (const rot of [undefined, {yaw: 1.1, pitch: 0.5}]) {
        let s: GeoScene = {...buildScene(SOLIDS[id]).scene!, rot};
        for (let k = 0; k < 6; k++) {
          const free = freePoints(s);
          const n = free[k % free.length];
          s = moveFreePoint(s, n, dragTarget3(s, n, 15 * Math.cos(k), 15 * Math.sin(k)));
        }
        KEEP[id](s);
      }
    }
  });

  it('đỉnh đáy đi đúng theo con trỏ (phép chiếu xiên và khi đã xoay); đỉnh chóp chỉ lên/xuống, không lật', () => {
    for (const rot of [undefined, {yaw: 0.8, pitch: 0.35}]) {
      const s: GeoScene = {...buildScene(SOLIDS.S01).scene!, rot};
      const t = moveFreePoint(s, 'C', dragTarget3(s, 'C', 20, -12));
      const {pv} = makeProjector(s);
      const [a, b] = [pv(s.pts.C), pv(t.pts.C)];
      expect(Math.hypot(b.x - a.x - 20, b.y - a.y + 12)).toBeLessThan(0.5);
      const up = moveFreePoint(s, 'S', dragTarget3(s, 'S', 0, -30));
      expect(tools(up).d('S', 'A')).toBeGreaterThan(tools(s).d('S', 'A'));
      expect(tools(up).perp('S', 'A', 'A', 'B')).toBeLessThan(E);
      const down = moveFreePoint(s, 'S', dragTarget3(s, 'S', 0, 4000));
      expect(dot(sub(down.pts.S, down.pts.A), sub(s.pts.S, s.pts.A))).toBeGreaterThan(0);
    }
  });

  it('tứ diện đều và lập phương: kéo đỉnh đáy vẫn đều / vẫn lập phương, đỉnh trên không kéo riêng', () => {
    const tet = buildScene('Cho tứ diện đều ABCD cạnh a. Gọi M là trung điểm của CD, G là trọng tâm tam giác BCD.').scene!;
    const cube = buildScene(SOLIDS.S05).scene!;
    expect(freePoints(cube)).not.toContain("A'");
    expect(freePoints(tet).sort()).toEqual(['B', 'C', 'D']);
    for (const s of [tet, cube])
      for (const n of freePoints(s))
        for (const [dx, dy] of MOVES) {
          const t = moveFreePoint(s, n, dragTarget3(s, n, dx, dy));
          const {d} = tools(t);
          const edges = t.edges.map(([a, b]) => d(a, b));
          for (const e of edges) close(e, edges[0]); // mọi cạnh bằng nhau
        }
    const {p, same, cen} = tools(tet);
    expect(same(p('G'), cen('B', 'C', 'D'))).toBeLessThan(E);
  });

  it('khối tròn xoay không có tay kéo', () => {
    expect(freePoints(buildScene('Cho hình nón đỉnh S, đáy là đường tròn tâm O bán kính 3, chiều cao 4.').scene!)).toEqual([]);
  });
});

describe('vẽ từng phần (không gian)', () => {
  it('mỗi đề vẽ được từng phần: bấm nút phần nào thì vẽ thêm trên phần trước', () => {
    let withChips = 0;
    for (const id of Object.keys(SOLIDS)) {
      const s = buildScene(SOLIDS[id]).scene!;
      const chips = partChips(s);
      if (chips.length) withChips++;
      let t = showUpTo(s, 0);
      const size = (x: GeoScene) => {
        const f = renderScene(x);
        return f.verts.length + f.edges.length + f.polys.length;
      };
      let prev = size(t);
      for (const c of chips) {
        t = selectPartUpTo(t, c.index);
        expect(size(t), `${id} ${c.label}`).toBeGreaterThan(prev);
        prev = size(t);
      }
    }
    expect(withChips).toBe(Object.keys(SOLIDS).length);
  });
});
