import {describe, it, expect} from 'vitest';
import {VSEPR_LIBRARY, build3D, vseprGeometry, parseMolecule, matchChemKeywords, angleBetween, lcEquilibrium, lcView, lcRelax, kpAt, daniellCell, nernstE, daniellStep, ELECTRODES} from '../utils/chemModels';

const near = (a: number, b: number, d = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(d);
const mol = (f: string) => VSEPR_LIBRARY.find((m) => m.formula === f)!;

describe('VSEPR: hình học phân tử', () => {
  it('bảng AXE đúng dạng hình học và lai hóa', () => {
    expect(vseprGeometry(2, 2)).toMatchObject({shape: 'gấp khúc (chữ V)', hybrid: 'sp³', steric: 4});
    expect(vseprGeometry(3, 1)?.shape).toBe('chóp tam giác');
    expect(vseprGeometry(4, 2)?.shape).toBe('vuông phẳng');
    expect(vseprGeometry(5, 1)?.shape).toBe('chóp vuông');
    expect(vseprGeometry(7, 0)).toBeNull();
  });

  it('góc liên kết đúng với số liệu thực nghiệm', () => {
    const angle = (f: string) => build3D(mol(f))!.angles;
    near(angle('H2O')[0], 104.5, 0.2);
    near(angle('NH3')[0], 107.3, 0.2);
    near(angle('CH4')[0], 109.5, 0.1);
    expect(angle('CO2')).toEqual([180]);
    expect(angle('BF3')).toEqual([120]);
    near(angle('SO2')[0], 119, 0.2);
    expect(angle('SF6')).toEqual([90, 180]);
    expect(angle('XeF4')).toEqual([90, 180]);
    expect(angle('PCl5')).toEqual([90, 120, 180]);
    expect(angle('XeF2')).toEqual([180]);
  });

  it('cặp e riêng: nước có 2, amoniac 1; lưỡng chóp đặt cặp riêng ở xích đạo (ClF3 chữ T, SF4 bập bênh)', () => {
    expect(build3D(mol('H2O'))!.lone).toHaveLength(2);
    expect(build3D(mol('NH3'))!.lone).toHaveLength(1);
    const clf3 = build3D(mol('ClF3'))!;
    expect(clf3.geometry.shape).toBe('chữ T');
    expect(clf3.angles[0]).toBe(90); // F–Cl–F: 90° và 180° trong mô hình lí tưởng
    expect(clf3.angles).toContain(180);
    expect(build3D(mol('SF4'))!.geometry.shape).toBe('cái bập bênh');
  });

  it('khoảng cách và vị trí: nguyên tử trung tâm ở gốc, các phối tử cách đều', () => {
    const s = build3D(mol('CH4'))!;
    expect(s.atoms[0].pos).toEqual([0, 0, 0]);
    const d = s.atoms.slice(1).map((a) => Math.hypot(...a.pos));
    d.forEach((x) => near(x, d[0], 1e-9));
    near(angleBetween(s.atoms[1].pos, s.atoms[2].pos), 109.47, 0.05);
  });

  it('độ phân cực tính từ tổng vectơ lưỡng cực khớp kinh nghiệm', () => {
    const polar = (f: string) => build3D(mol(f))!.polar;
    for (const f of ['H2O', 'NH3', 'SO2', 'PCl3', 'SF4', 'ClF3', 'BrF5', 'H2S', 'CH2O', 'HCN', 'O3']) expect(polar(f), f).toBe(true);
    for (const f of ['CO2', 'CH4', 'BF3', 'CCl4', 'SF6', 'XeF4', 'XeF2', 'PCl5', 'SO3', 'BeCl2']) expect(polar(f), f).toBe(false);
  });

  it('nhận công thức viết nhiều kiểu và kí hiệu AXE', () => {
    expect(parseMolecule('H2O')?.formula).toBe('H2O');
    expect(parseMolecule('H_2O')?.formula).toBe('H2O');
    expect(parseMolecule('NH₃')?.formula).toBe('NH3');
    expect(parseMolecule('VSEPR CH4')?.formula).toBe('CH4');
    expect(parseMolecule('hình học phân tử của SF6')?.formula).toBe('SF6');
    expect(parseMolecule('AX2E2')).toMatchObject({lonePairs: 2});
    expect(parseMolecule('6CO2 + 6H2O → C6H12O6')).toBeNull(); // không nhầm phương trình quang hợp
    expect(parseMolecule('y = x^2')).toBeNull();
  });

  it('mọi phân tử trong thư viện dựng được cấu trúc 3D nhất quán (số phối tử, bậc liên kết)', () => {
    for (const m of VSEPR_LIBRARY) {
      const s = build3D(m)!;
      expect(s, m.formula).not.toBeNull();
      expect(s.atoms).toHaveLength(m.ligands.length + 1);
      expect(s.bonds).toHaveLength(m.ligands.length);
      expect(s.lone).toHaveLength(m.lonePairs);
    }
  });
});

describe('Le Chatelier: 2NO₂ ⇌ N₂O₄', () => {
  const N0 = 0.02;
  it('Kp phụ thuộc nhiệt độ: tăng T thì Kp giảm (thuận tỏa nhiệt); Kp(298) = 6,8', () => {
    near(kpAt(298.15), 6.8, 1e-9);
    expect(kpAt(350)).toBeLessThan(kpAt(298.15));
    expect(kpAt(250)).toBeGreaterThan(kpAt(298.15));
  });

  it('cân bằng thỏa Kp và bảo toàn nitơ', () => {
    const V = 1;
    const T = 298.15;
    const xi = lcEquilibrium(N0, V, T);
    const v = lcView(N0, V, T, xi);
    near(v.Q, v.Kp, v.Kp * 1e-6);
    near(v.nNO2 + 2 * v.nN2O4, N0, 1e-12);
  });

  it('nén piston (V giảm) → cân bằng chuyển về N₂O₄ (ít mol hơn)', () => {
    const big = lcEquilibrium(N0, 2, 298.15);
    const small = lcEquilibrium(N0, 0.5, 298.15);
    expect(small).toBeGreaterThan(big);
  });

  it('đun nóng → chuyển về NO₂ (màu đậm hơn); làm lạnh → N₂O₄', () => {
    const cold = lcView(N0, 1, 273, lcEquilibrium(N0, 1, 273));
    const hot = lcView(N0, 1, 373, lcEquilibrium(N0, 1, 373));
    expect(hot.cNO2).toBeGreaterThan(cold.cNO2);
    expect(hot.color).toBeGreaterThan(cold.color);
  });

  it('nén: màu đậm ngay lập tức rồi nhạt dần nhưng vẫn đậm hơn lúc đầu', () => {
    const T = 298.15;
    const xi0 = lcEquilibrium(N0, 2, T);
    const before = lcView(N0, 2, T, xi0).cNO2;
    const instant = lcView(N0, 1, T, xi0).cNO2; // thể tích giảm một nửa, chưa kịp chuyển dịch
    expect(instant).toBeCloseTo(before * (1 + 0) * 2, 6); // nồng độ tăng gấp đôi
    const eq = lcEquilibrium(N0, 1, T);
    let xi = xi0;
    for (let i = 0; i < 100; i++) xi = lcRelax(xi, eq, 0.1);
    const after = lcView(N0, 1, T, xi).cNO2;
    expect(after).toBeLessThan(instant);
    expect(after).toBeGreaterThan(before);
    near(xi, eq, 1e-6);
  });

  it('hướng chuyển dịch được báo đúng', () => {
    const T = 298.15;
    const xi = lcEquilibrium(N0, 2, T);
    expect(lcView(N0, 2, T, xi).shift).toBe('none');
    expect(lcView(N0, 0.5, T, xi).shift).toBe('forward'); // nén → thuận
    expect(lcView(N0, 4, T, xi).shift).toBe('reverse'); // giãn → nghịch
  });
});

describe('Pin điện hóa Daniell', () => {
  it('E° Zn–Cu = 1,10 V; anot là kim loại có E° thấp hơn', () => {
    const c = daniellCell('Cu', 'Zn')!;
    near(c.E0, 1.1, 1e-9);
    expect(c.anode.metal).toBe('Zn');
    expect(c.cathode.metal).toBe('Cu');
    near(daniellCell('Mg', 'Cu')!.E0, 2.71, 1e-9);
    near(daniellCell('Fe', 'Cu')!.E0, 0.78, 1e-9);
    expect(daniellCell('Zn', 'Zn')).toBeNull();
    expect(daniellCell('Zn', 'Au')).toBeNull();
  });

  it('Nernst: 1 M | 1 M → E°; tăng [Zn²⁺] giảm E; giảm [Cu²⁺] 10 lần giảm 29,6 mV', () => {
    const c = daniellCell('Zn', 'Cu')!;
    near(nernstE(c, 1, 1), 1.1, 1e-9);
    expect(nernstE(c, 2, 1)).toBeLessThan(1.1);
    near(nernstE(c, 1, 0.1), 1.1 - 0.02958, 1e-4);
    near(nernstE(c, 0.01, 1), 1.1 + 0.05916, 1e-4);
  });

  it('phóng điện: Zn²⁺ tăng, Cu²⁺ giảm, anot nhẹ đi, catot nặng lên; bảo toàn khối lượng mol', () => {
    const c = daniellCell('Zn', 'Cu')!;
    let s = {cAnode: 1, cCathode: 1, dmAnode: 0, dmCathode: 0, charge: 0, t: 0};
    const E0 = nernstE(c, s.cAnode, s.cCathode);
    for (let i = 0; i < 200; i++) s = daniellStep(s, c, 0.5, 60);
    expect(s.cAnode).toBeGreaterThan(1);
    expect(s.cCathode).toBeLessThan(1);
    expect(s.dmAnode).toBeLessThan(0);
    expect(s.dmCathode).toBeGreaterThan(0);
    expect(nernstE(c, s.cAnode, s.cCathode)).toBeLessThan(E0);
    // mol Zn tan = mol Cu bám (đối xứng điện tích): |dm|/M bằng nhau
    near(-s.dmAnode / 65.4, s.dmCathode / 63.5, 1e-9);
    near((s.cAnode - 1) * 0.1, (1 - s.cCathode) * 0.1, 1e-9);
  });

  it('khi Cu²⁺ cạn thì E giảm mạnh nhưng không ngoài khoảng hợp lý, và nồng độ không âm', () => {
    const c = daniellCell('Zn', 'Cu')!;
    let s = {cAnode: 1, cCathode: 0.05, dmAnode: 0, dmCathode: 0, charge: 0, t: 0};
    for (let i = 0; i < 2000; i++) s = daniellStep(s, c, 2, 60);
    expect(s.cCathode).toBeGreaterThanOrEqual(1e-6);
    const E = nernstE(c, s.cAnode, s.cCathode);
    expect(E).toBeLessThan(1.1);
    expect(E).toBeGreaterThan(0.8);
  });

  it('danh sách điện cực có thứ tự dãy hoạt động hóa học', () => {
    const e = ELECTRODES.map((x) => x.E0);
    expect([...e].sort((a, b) => a - b)).toEqual(e);
  });
});

describe('nhận từ khóa Hóa học', () => {
  it('Daniell, Le Chatelier, VSEPR', () => {
    expect(matchChemKeywords('Pin Daniell')).toMatchObject({templateId: 'CHEM_GALVANIC_DANIELL', meta: {anode: 'Zn', cathode: 'Cu'}});
    expect(matchChemKeywords('pin điện hóa Fe - Cu cầu muối')).toMatchObject({meta: {anode: 'Fe', cathode: 'Cu'}});
    expect(matchChemKeywords('Zn | Zn2+ || Cu2+ | Cu')?.templateId).toBe('CHEM_GALVANIC_DANIELL');
    expect(matchChemKeywords('2NO2 ⇌ N2O4')?.templateId).toBe('CHEM_LE_CHATELIER_GAS');
    expect(matchChemKeywords('Chuyển dịch cân bằng Le Chatelier')?.templateId).toBe('CHEM_LE_CHATELIER_GAS');
    expect(matchChemKeywords('NH3')).toMatchObject({templateId: 'CHEM_MOLECULE_3D'});
    expect(matchChemKeywords('Fe + O2 -> Fe2O3')).toBeNull();
    expect(matchChemKeywords('y = x^2')).toBeNull();
  });
});
