import {describe, it, expect} from 'vitest';
import {parseCross, gametesOf, punnett, toRatio, parseGenotypeFreqs, hardyWeinberg, parseLP, solveLP, linearForm, parseRecurrence, cobweb} from '../utils/stemModels';

const near = (a: number, b: number, d = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('Punnett: lai Menđen', () => {
  it('nhận cú pháp viết tay phổ biến', () => {
    expect(parseCross('P: AaBb x AaBb')).toEqual({p1: 'AaBb', p2: 'AaBb'});
    expect(parseCross('P: AaBb × aabb → F1')).toEqual({p1: 'AaBb', p2: 'aabb'});
    expect(parseCross('Aa X Aa')).toEqual({p1: 'Aa', p2: 'Aa'});
    expect(parseCross('P: Aa x Bb')).toBeNull(); // khác gen
    expect(parseCross('lai hai cặp tính trạng')).toBeNull();
  });

  it('giao tử: dị hợp 2 cặp phân li độc lập cho 4 loại 25%', () => {
    const g = gametesOf('AaBb');
    expect(g).toHaveLength(4);
    g.forEach((x) => near(x.p, 0.25));
    expect(new Set(g.map((x) => x.alleles))).toEqual(new Set(['AB', 'Ab', 'aB', 'ab']));
  });

  it('AaBb × AaBb → 16 ô, 9 kiểu gen, 4 kiểu hình, tỉ lệ 9:3:3:1', () => {
    const r = punnett('AaBb', 'AaBb')!;
    expect(r.cells.flat()).toHaveLength(16);
    expect(r.genotypes).toHaveLength(9);
    expect(r.phenotypes.map((x) => x.phenotype)).toEqual(['A-B-', 'A-bb', 'aaB-', 'aabb']);
    expect(r.ratio).toBe('9 : 3 : 3 : 1');
    near(r.phenotypes.reduce((s, x) => s + x.p, 0), 1);
  });

  it('Aa × Aa → 1AA : 2Aa : 1aa và 3 : 1; Aa × aa → 1 : 1', () => {
    const a = punnett('Aa', 'Aa')!;
    expect(a.genotypes.map((g) => [g.genotype, g.p])).toEqual([['Aa', 0.5], ['AA', 0.25], ['aa', 0.25]]);
    expect(a.ratio).toBe('3 : 1');
    expect(punnett('Aa', 'aa')!.ratio).toBe('1 : 1');
  });

  it('hoán vị gen f: AB/ab × ab/ab, f = 0,2 → 40 : 40 : 10 : 10; liên kết hoàn toàn (f = 0) → 1 : 1', () => {
    const r = punnett('AaBb', 'aabb', 0.2)!;
    const m = Object.fromEntries(r.phenotypes.map((x) => [x.phenotype, x.p]));
    near(m['A-B-'], 0.4);
    near(m['aabb'], 0.4);
    near(m['A-bb'], 0.1);
    near(m['aaB-'], 0.1);
    const linked = punnett('AaBb', 'aabb', 0)!;
    expect(linked.ratio).toBe('1 : 1');
    expect(linked.linkageAdjustable).toBe(false); // bố mẹ aabb không dị hợp → không chỉnh f
    expect(punnett('AaBb', 'AaBb')!.linkageAdjustable).toBe(true);
  });

  it('toRatio rút gọn và trả null khi không quy được số nguyên nhỏ', () => {
    expect(toRatio([0.5, 0.25, 0.25])).toBe('2 : 1 : 1');
    expect(toRatio([0.6, 0.4])).toBe('3 : 2');
    expect(toRatio([Math.SQRT1_2, 1 - Math.SQRT1_2], 12)).toBeNull();
  });
});

describe('Hardy–Weinberg', () => {
  it('đọc tần số kiểu gen viết tay (dấu phẩy thập phân, %, số đếm)', () => {
    expect(parseGenotypeFreqs('0,04AA + 0,32Aa + 0,64aa = 1')).toEqual({AA: 0.04, Aa: 0.32, aa: 0.64});
    const pct = parseGenotypeFreqs('4% AA, 32% Aa, 64% aa')!;
    near(pct.aa, 0.64);
    const cnt = parseGenotypeFreqs('100AA + 200Aa + 100aa')!;
    near(cnt.Aa, 0.5);
    near(cnt.AA + cnt.Aa + cnt.aa, 1);
  });

  it('thiếu một kiểu gen thì suy ra từ tổng = 1; chỉ cho q² thì dựng cả quần thể', () => {
    const r = parseGenotypeFreqs('0.25AA + 0.5Aa')!;
    near(r.aa, 0.25);
    const q = parseGenotypeFreqs('q^2 = 0,16')!;
    near(q.aa, 0.16);
    near(q.Aa, 2 * 0.6 * 0.4);
    near(q.AA, 0.36);
    expect(parseGenotypeFreqs('x + y = 3')).toBeNull();
  });

  it('quần thể 0,04AA + 0,32Aa + 0,64aa: p = 0,2, q = 0,8 và đang cân bằng', () => {
    const h = hardyWeinberg({AA: 0.04, Aa: 0.32, aa: 0.64});
    near(h.p, 0.2);
    near(h.q, 0.8);
    near(h.exp.Aa, 0.32);
    expect(h.equilibrium).toBe(true);
  });

  it('quần thể lệch cân bằng bị phát hiện', () => {
    const h = hardyWeinberg({AA: 0.5, Aa: 0, aa: 0.5});
    near(h.p, 0.5);
    expect(h.equilibrium).toBe(false);
    near(h.exp.Aa, 0.5);
  });
});

describe('Quy hoạch tuyến tính', () => {
  it('rút hệ số từ biểu thức tuyến tính, từ chối phi tuyến', () => {
    expect(linearForm('2x + 3y - 6')).toEqual([2, 3, -6]);
    expect(linearForm('x^2 + y')).toBeNull();
    expect(linearForm('x*y')).toBeNull();
  });

  it('đọc hệ bất phương trình + hàm mục tiêu', () => {
    const pb = parseLP('x + y <= 4; 2x + y <= 6; x >= 0; y >= 0; max F = 3x + 2y')!;
    expect(pb.constraints).toHaveLength(4);
    expect(pb.objective).toMatchObject({a: 3, b: 2, sense: 'max'});
    expect(pb.constraints[0]).toMatchObject({a: 1, b: 1, c: 4, op: '<='});
  });

  it('nhận ký hiệu ≤ ≥ và LaTeX \\le', () => {
    const a = parseLP('x + y ≤ 4, x ≥ 0, y ≥ 0')!;
    expect(a.constraints).toHaveLength(3);
    const b = parseLP(String.raw`x+2y \le 8 \\ x \ge 0 \\ y \ge 0`)!;
    expect(b.constraints).toHaveLength(3);
  });

  it('không nhầm: hàm số y = x^2 hay một bất phương trình phi tuyến không phải quy hoạch tuyến tính', () => {
    expect(parseLP('y = x^2 - 3')).toBeNull();
    expect(parseLP('x^2 + y^2 <= 4')).toBeNull();
    expect(parseLP('x + y <= 4')).toBeNull(); // chỉ một ràng buộc, không mục tiêu
  });

  it('tìm miền nghiệm, đỉnh và tối ưu: max 3x+2y trên x+y≤4, 2x+y≤6, x,y≥0 → (2,2) giá trị 10', () => {
    const sol = solveLP(parseLP('x + y <= 4; 2x + y <= 6; x >= 0; y >= 0; max F = 3x + 2y')!);
    expect(sol.feasible).toBe(true);
    expect(sol.unbounded).toBe(false);
    expect(sol.vertices).toHaveLength(4);
    near(sol.best!.x, 2, 1e-4);
    near(sol.best!.y, 2, 1e-4);
    near(sol.best!.value, 10, 1e-4);
    const vs = sol.vertices.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).sort();
    expect(vs).toEqual(['0.00,0.00', '0.00,4.00', '2.00,2.00', '3.00,0.00']);
  });

  it('min trên cùng miền → (0,0); miền vô nghiệm; miền không bị chặn', () => {
    expect(solveLP(parseLP('x + y <= 4; x >= 0; y >= 0; min F = x + y')!).best).toMatchObject({value: 0});
    const empty = solveLP(parseLP('x + y <= -1; x >= 0; y >= 0')!);
    expect(empty.feasible).toBe(false);
    const open = solveLP(parseLP('x + y >= 2; x >= 0; y >= 0; max F = x + y')!);
    expect(open.unbounded).toBe(true);
    expect(open.best).toBeNull(); // max không tồn tại trên miền mở
    const openMin = solveLP(parseLP('x + y >= 2; x >= 0; y >= 0; min F = x + y')!);
    near(openMin.best!.value, 2, 1e-4); // min tồn tại dù miền không bị chặn
  });
});

describe('Dãy số quy nạp & mạng nhện', () => {
  it('nhận x_{n+1} = ..., kể cả tên khác và tham số', () => {
    const r = parseRecurrence('x_{n+1} = r x_n (1 - x_n)')!;
    expect(r.params).toEqual(['r']);
    const u = parseRecurrence('u_{n+1} = (u_n + 2/u_n)/2')!;
    expect(u.params).toEqual([]);
    expect(parseRecurrence('y = x^2')).toBeNull();
  });

  it('logistic r = 2,8 hội tụ về 1 − 1/r; r = 3,2 chu kỳ 2; r = 3,9 hỗn loạn', () => {
    const r = parseRecurrence('x_{n+1} = r x_n (1 - x_n)')!;
    const a = cobweb(r.expr, {r: 2.8}, 0.2);
    expect(a.behavior).toBe('converges');
    near(a.limit!, 1 - 1 / 2.8, 1e-4);
    const b = cobweb(r.expr, {r: 3.2}, 0.2);
    expect(b.behavior).toBe('periodic');
    expect(b.period).toBe(2);
    expect(cobweb(r.expr, {r: 3.9}, 0.2).behavior).toBe('chaotic');
  });

  it('điểm bất động và tính ổn định: r = 2,8 có 0 (không ổn định) và 0,643 (ổn định)', () => {
    const f = cobweb('r*x*(1-x)', {r: 2.8}, 0.3);
    const zero = f.fixedPoints.find((p) => Math.abs(p.x) < 1e-3)!;
    const star = f.fixedPoints.find((p) => Math.abs(p.x - 0.6429) < 1e-3)!;
    expect(zero.stable).toBe(false);
    expect(star.stable).toBe(true);
  });

  it('căn 2 bằng Newton hội tụ về √2; hàm x → 2x phân kỳ', () => {
    const r = parseRecurrence('u_{n+1} = (u_n + 2/u_n)/2')!;
    const c = cobweb(r.expr, {}, 1);
    expect(c.behavior).toBe('converges');
    near(c.limit!, Math.SQRT2, 1e-6);
    expect(cobweb('3*x', {}, 1, 60).behavior).toBe('diverges');
  });
});
