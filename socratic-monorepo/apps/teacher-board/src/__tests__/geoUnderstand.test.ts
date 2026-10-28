import {describe, expect, it} from 'vitest';
import {buildScene, expandRespectively, normalizeProblem, ratioOnSegment} from '../utils/geometryProblem';

const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const mid = (p: number[], q: number[]) => [0, 1, 2].map((i) => (p[i] + q[i]) / 2);

describe('"lần lượt": nhiều điểm trong một câu', () => {
  it('khai triển câu', () => {
    expect(expandRespectively(normalizeProblem("Gọi M, N lần lượt là trung điểm của AB và CC'"))).toContain("M là trung điểm AB; N là trung điểm CC'");
  });
  it("hình hộp: M, N lần lượt là trung điểm AB và CC'", () => {
    const sc = buildScene("Cho hình hộp ABCD.A'B'C'D'. Gọi M, N lần lượt là trung điểm của AB và CC'.").scene!;
    expect(dist(sc.pts.M, mid(sc.pts.A, sc.pts.B))).toBeLessThan(1e-9);
    expect(dist(sc.pts.N, mid(sc.pts.C, sc.pts["C'"]))).toBeLessThan(1e-9);
  });
  it('chóp: M, N, P lần lượt là trung điểm SA, SB, SC', () => {
    const sc = buildScene('Cho hình chóp S.ABCD đáy là hình bình hành tâm O. Gọi M, N, P lần lượt là trung điểm SA, SB, SC.').scene!;
    for (const [n, a] of [['M', 'A'], ['N', 'B'], ['P', 'C']]) expect(dist(sc.pts[n], mid(sc.pts.S, sc.pts[a]))).toBeLessThan(1e-9);
  });
  it('số tên khác số đối tượng thì không đoán bừa', () => {
    const sc = buildScene('Cho hình chóp S.ABC. Gọi M, N lần lượt là trung điểm SA.').scene!;
    expect(sc.pts.M).toBeUndefined();
  });
  it('trọng tâm hai tam giác', () => {
    const sc = buildScene('Cho hình chóp S.ABC. Gọi G, H lần lượt là trọng tâm tam giác SAB và tam giác SBC.').scene!;
    expect(sc.pts.G).toBeDefined();
    expect(sc.pts.H).toBeDefined();
  });
});

describe('tỉ lệ "sao cho"', () => {
  it('ratioOnSegment', () => {
    expect(ratioOnSegment('M thuộc SA sao cho SM = 2MA', 'S', 'A', 'M')).toBeCloseTo(2 / 3, 9);
    expect(ratioOnSegment('M thuộc SA sao cho SM = 2/3 SA', 'S', 'A', 'M')).toBeCloseTo(2 / 3, 9);
    expect(ratioOnSegment('M thuộc SA sao cho MA = 2SM', 'S', 'A', 'M')).toBeCloseTo(1 / 3, 9);
    expect(ratioOnSegment('M thuộc SA sao cho SM = (1/4)SA', 'S', 'A', 'M')).toBeCloseTo(0.25, 9);
    expect(ratioOnSegment('M thuộc SA', 'S', 'A', 'M')).toBeNull();
  });
  it('dựng điểm theo tỉ lệ', () => {
    const sc = buildScene('Cho hình chóp S.ABCD đáy ABCD là hình vuông cạnh a, SA vuông góc đáy, SA = a. Gọi M thuộc cạnh SC, sao cho SM = 2MC.').scene!;
    const sm = dist(sc.pts.S, sc.pts.M);
    const sc2 = dist(sc.pts.S, sc.pts.C);
    expect(sm / sc2).toBeCloseTo(2 / 3, 9);
  });
});

import {parseCoords, renderScene} from '../utils/geometryProblem';

describe('tọa độ trong đề', () => {
  it('đọc A(1;2;3), B(3, 4), tọa độ âm và thập phân', () => {
    const c = parseCoords('Cho A(1;2;3), B(-3;4,5;0) và C(0;1)');
    expect(c.get('A')).toEqual([1, 2, 3]);
    expect(c.get('B')).toEqual([-3, 4.5, 0]);
    expect(c.get('C')).toEqual([0, 1, 0]);
  });
  it('tam giác ABC với A(1;2), B(3;4), C(5;0): đặt đúng tọa độ', () => {
    const sc = buildScene('Cho tam giác ABC có A(1;2), B(3;4), C(5;0).').scene!;
    expect(sc.dim).toBe(2);
    expect(sc.pts.A).toEqual([1, 2, 0]);
    expect(sc.pts.B).toEqual([3, 4, 0]);
    expect(sc.pts.C).toEqual([5, 0, 0]);
    expect(renderScene(sc).verts).toHaveLength(3);
  });
  it('Oxyz: tứ diện ABCD với tọa độ cho sẵn', () => {
    const sc = buildScene('Trong không gian Oxyz cho tứ diện ABCD có A(0;0;0), B(1;0;0), C(0;2;0), D(0;0;3).').scene!;
    expect(sc.dim).toBe(3);
    expect(sc.pts.D).toEqual([0, 0, 3]);
    expect(sc.pts.C).toEqual([0, 2, 0]);
  });
  it('không nhận ra hình nhưng có ≥ 2 điểm tọa độ: vẽ các điểm, nối bằng "đoạn AB"', () => {
    const sc = buildScene('Trong không gian Oxyz cho A(1;0;0), B(0;2;0), C(0;0;3). Vẽ đoạn AB và đoạn BC.').scene!;
    expect(sc.title).toContain('Oxyz');
    expect(Object.keys(sc.pts)).toEqual(['A', 'B', 'C']);
    expect(sc.aux.map((a) => a.slice(0, 2).join(''))).toEqual(expect.arrayContaining(['AB', 'BC']));
    expect(renderScene(sc).edges.length).toBeGreaterThanOrEqual(2);
  });
  it('chỉ có một điểm thì không đoán hình', () => {
    expect(buildScene('Cho điểm A(1;2;3).').scene).toBeNull();
  });
});

describe('hình nón, hình trụ, hình cầu', () => {
  const allPts = (f: ReturnType<typeof renderScene>) => [...f.verts, ...f.curves.flatMap((c) => c.pts)];
  const inFrame = (f: ReturnType<typeof renderScene>) => {
    for (const p of allPts(f)) {
      expect(p.x).toBeGreaterThan(-40);
      expect(p.x).toBeLessThan(340);
      expect(p.y).toBeGreaterThan(-40);
      expect(p.y).toBeLessThan(340);
    }
  };
  it('hình nón: đỉnh S, tâm O, r = 3, h = 4 → đường sinh 5', () => {
    const sc = buildScene('Cho hình nón có đỉnh S, tâm đáy O, bán kính đáy r = 3, chiều cao h = 4.').scene!;
    expect(sc.title).toBe('Hình nón');
    expect(sc.pts.S).toEqual([0, 4, 0]);
    expect(sc.circles![0].r).toBe(3);
    expect(sc.notes.join(' ')).toContain('đường sinh 5');
    const f = renderScene(sc);
    expect(f.curves.some((c) => c.dashed)).toBe(true); // nửa sau đường tròn đáy là nét đứt
    expect(f.curves.some((c) => !c.dashed)).toBe(true);
    expect(f.edges.filter((e) => !e.aux)).toHaveLength(2);
    inFrame(f);
  });
  it('hình nón cho đường sinh: r = 3, l = 5 → h = 4', () => {
    const sc = buildScene('Hình nón có bán kính đáy r = 3, đường sinh l = 5.').scene!;
    expect(sc.pts.S[1]).toBeCloseTo(4, 9);
  });
  it('hình trụ: hai đường tròn đáy, hai đường sinh; chỉ đáy dưới có nét đứt', () => {
    const sc = buildScene('Cho hình trụ có bán kính đáy R = 2 và chiều cao h = 5.').scene!;
    expect(sc.title).toBe('Hình trụ');
    expect(sc.circles).toHaveLength(2);
    const f = renderScene(sc);
    expect(f.curves.filter((c) => c.dashed).length).toBe(1);
    expect(f.edges.filter((e) => !e.aux)).toHaveLength(2);
    inFrame(f);
  });
  it('hình cầu: đường viền, xích đạo nét đứt nửa sau', () => {
    const sc = buildScene('Cho hình cầu tâm O bán kính R = 2.').scene!;
    expect(sc.title).toBe('Hình cầu');
    const f = renderScene(sc);
    expect(f.curves.length).toBeGreaterThanOrEqual(3);
    inFrame(f);
  });
  it('xoay tự do vẫn nằm trong khung', () => {
    for (const t of ['Hình nón bán kính r = 2, chiều cao h = 3', 'Hình trụ r = 1, h = 2', 'Hình cầu tâm O R = 1']) {
      const sc = buildScene(t).scene!;
      for (const rot of [{yaw: 0.6, pitch: 0.4}, {yaw: 2, pitch: -0.8}]) inFrame(renderScene({...sc, rot}));
    }
  });
  it('mặt nón thiết diện qua trục "tam giác" không bị nhận nhầm thành hình tam giác', () => {
    expect(buildScene('Cho hình nón có thiết diện qua trục là tam giác vuông cân, bán kính đáy r = 2.').scene!.title).toBe('Hình nón');
  });
});

describe('giao điểm đường–mặt không cho tên, và báo câu chưa hiểu', () => {
  it("hình hộp: giao điểm của MN với mặt phẳng (A'B'C'D') tự đặt tên", () => {
    const sc = buildScene("Cho hình hộp ABCD.A'B'C'D'. Gọi M, N lần lượt là trung điểm của AB và CC'. Tìm giao điểm của MN với mặt phẳng (A'B'C'D').").scene!;
    expect(sc.pts.K).toBeDefined();
    expect(Math.abs(sc.pts.K[2] - sc.pts["A'"][2]) + Math.abs(sc.pts.K[1] - sc.pts["A'"][1])).toBeLessThan(10); // K nằm trong mặt phẳng trên
    expect(sc.ignored).toEqual([]);
  });
  it('đường song song mặt phẳng: báo không có giao điểm', () => {
    const sc = buildScene("Cho hình lập phương ABCD.A'B'C'D'. Tìm giao điểm của AA' với mặt phẳng (BCC'B').").scene!;
    expect(sc.pts.K).toBeUndefined();
    expect(sc.ignored.join(' ')).toContain('song song');
  });
  it('câu định nghĩa điểm mà không hiểu thì báo, không im lặng', () => {
    const sc = buildScene('Cho hình chóp S.ABC. Gọi H là hình chiếu thẳng đứng đẹp của S.').scene!;
    expect(sc.ignored.join(' ')).toContain('Chưa hiểu');
  });
  it('đề hiểu hết thì không báo gì (không báo nhầm)', () => {
    const sc = buildScene('Cho hình chóp S.ABCD đáy ABCD là hình vuông cạnh a, SA vuông góc đáy, SA = a. Gọi M là trung điểm SB. Gọi O là tâm của ABCD.').scene!;
    expect(sc.ignored).toEqual([]);
  });
});
