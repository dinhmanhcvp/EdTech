import React from 'react';
import {describe, it, expect, afterEach} from 'vitest';
import {render, cleanup, fireEvent} from '@testing-library/react';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import {makePresetBlueprint} from '../utils/presets';
import {ELEMENTS, configString, configuration, periodicPosition, unpaired, valenceElectrons} from '../utils/presets/hoaData';
import {MOLECULES, bondEN, bondKind, halogenResult, irTransmittance, testTubeResult, SPECTRA} from '../utils/presets/hoaScene1';
import {CELLS, POLYMERS, anodeLitres, molElectrons, polymerMass, productMass, waterReleased} from '../utils/presets/hoaScene2';
import {aminoCharge, arrhenius, bufferPH, boilingPoint, energyProfile, isoelectric, logQ, weakAcidPH} from '../utils/presets/hoaCurve';
import {SERIES, cellEmf} from '../utils/presets/hoaTable';

afterEach(cleanup);
// `lab`: hai bài ống nghiệm ảo chỉ dựng thật ở /lab
const mount = (id: string) => render(<SimulationWidget lab blueprint={makePresetBlueprint(id)} />);
const ro = (r: ReturnType<typeof mount>, i: number) => r.getByTestId(`scene-readout-${i}`).textContent!;

describe('Hóa: dữ liệu và công thức lõi', () => {
  it('cấu hình electron: Fe, Cr, Cu đúng; tổng electron bằng Z với mọi Z ≤ 36', () => {
    expect(configString(26)).toBe('1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²');
    expect(configString(24)).toBe('1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁵ 4s¹');
    expect(configString(29)).toBe('1s² 2s² 2p⁶ 3s² 3p⁶ 3d¹⁰ 4s¹');
    for (let z = 1; z <= 36; z++) expect(configuration(z).reduce((a, s) => a + s.e, 0), `Z=${z}`).toBe(z);
  });

  it('Hund và hóa trị: N có 3 e độc thân, Cr 6, Zn 0; Na 1, Cl 7, Fe 8 electron hóa trị', () => {
    expect(unpaired(7)).toBe(3);
    expect(unpaired(24)).toBe(6);
    expect(unpaired(30)).toBe(0);
    expect(unpaired(8)).toBe(2);
    expect(valenceElectrons(11)).toBe(1);
    expect(valenceElectrons(17)).toBe(7);
    expect(valenceElectrons(26)).toBe(8);
  });

  it('bảng tuần hoàn: vị trí các nguyên tố và xu hướng độ âm điện', () => {
    expect(periodicPosition(2)).toEqual({row: 0, col: 17});
    expect(periodicPosition(26)).toEqual({row: 3, col: 7});
    expect(periodicPosition(35)).toEqual({row: 3, col: 16});
    expect(periodicPosition(82)).toEqual({row: 5, col: 13});
    expect(periodicPosition(57)).toBeNull();
    const seen = new Set(ELEMENTS.map((e) => periodicPosition(e.z)).filter(Boolean).map((p) => `${p!.row},${p!.col}`));
    expect(seen.size).toBe(ELEMENTS.filter((e) => periodicPosition(e.z)).length);
    const en = (s: string) => ELEMENTS.find((e) => e.sym === s)!.en!;
    expect(en('F')).toBeGreaterThan(en('O'));
    expect(en('Cl')).toBeGreaterThan(en('Br'));
    expect(ELEMENTS.find((e) => e.sym === 'Cs')!.r).toBeGreaterThan(ELEMENTS.find((e) => e.sym === 'Li')!.r);
  });

  it('liên kết: H₂ không cực, H₂O có cực, NaCl ion', () => {
    const kind = (k: string) => {
      const [lo, hi] = bondEN(MOLECULES[k]);
      return bondKind(hi - lo);
    };
    expect(kind('H2')).toContain('không phân cực');
    expect(kind('H2O')).toContain('phân cực');
    expect(kind('NaCl')).toContain('ion');
  });

  it('ống nghiệm ảo: kết tủa, tan trong kiềm dư, khí', () => {
    expect(testTubeResult('Cu', 'naoh', false).precip).toBe('#2563EB');
    expect(testTubeResult('Al', 'naoh', false).precip).toBeTruthy();
    expect(testTubeResult('Al', 'naoh', true).precip).toBeUndefined();
    expect(testTubeResult('Mg', 'naoh', true).precip).toBeTruthy();
    expect(testTubeResult('NH4', 'naoh', false).gas).toBe(true);
    expect(testTubeResult('CO3', 'hcl', false).gas).toBe(true);
    expect(testTubeResult('SO4', 'bacl2', false).precip).toBe('#FFFFFF');
    expect(testTubeResult('Cl', 'bacl2', false).precip).toBeUndefined();
  });

  it('halogen: AgF tan, AgCl trắng; Cl₂ đẩy Br⁻ và I⁻ nhưng không đẩy Cl⁻; Br₂ không đẩy Cl⁻', () => {
    expect(halogenResult('F', 'ag').precip).toBeUndefined();
    expect(halogenResult('Cl', 'ag').precip).toBe('#FFFFFF');
    expect(halogenResult('I', 'ag').precip).toBe('#FACC15');
    expect(halogenResult('Br', 'cl2').text).toContain('Br₂');
    expect(halogenResult('Cl', 'cl2').text).toContain('không có phản ứng');
    expect(halogenResult('Cl', 'br2').text).toContain('không có phản ứng');
    expect(halogenResult('I', 'br2').text).toContain('I₂');
  });

  it('phổ IR: ethanol hấp thụ mạnh ở 3350 cm⁻¹, gần như không ở 2000; phổ khối có peak M⁺', () => {
    const e = SPECTRA.ethanol;
    expect(irTransmittance(e, 3350)).toBeLessThan(40);
    expect(irTransmittance(e, 2000)).toBeGreaterThan(99);
    for (const c of Object.values(SPECTRA)) expect(c.ms.some((p) => p[0] === c.M), c.label).toBe(true);
  });

  it('năng lượng: giản đồ bắt đầu 0, kết thúc ΔH, đỉnh bằng Ea; Arrhenius tăng theo nhiệt độ ≈ 1,9 lần mỗi 10 K với Ea = 50', () => {
    expect(energyProfile(0, 120, -90)).toBeCloseTo(0, 10);
    expect(energyProfile(1, 120, -90)).toBeCloseTo(-90, 10);
    expect(energyProfile(0.5, 120, -90)).toBeCloseTo(120, 10);
    expect(energyProfile(0.5, 100, 60)).toBeCloseTo(100, 10);
    expect(arrhenius(50, 310) / arrhenius(50, 300)).toBeCloseTo(1.91, 1);
    expect(arrhenius(30, 300)).toBeGreaterThan(arrhenius(50, 300));
  });

  it('cân bằng, acid–base, amino acid, nhiệt độ sôi', () => {
    expect(logQ(0, 1, -2)).toBe(-2);
    expect(logQ(100, 1, -2)).toBeCloseTo(1, 6);
    expect(weakAcidPH(4.76, -1)).toBeCloseTo(2.88, 10);
    expect(bufferPH(4.76, 1)).toBe(4.76);
    expect(bufferPH(4.76, 10)).toBeCloseTo(5.76, 10);
    expect(isoelectric(2.34, 9.6)).toBeCloseTo(5.97, 10);
    expect(aminoCharge(isoelectric(2.34, 9.6), 2.34, 9.6)).toBeCloseTo(0, 6);
    expect(aminoCharge(0, 2.34, 9.6)).toBeGreaterThan(0.95);
    expect(aminoCharge(14, 2.34, 9.6)).toBeLessThan(-0.95);
    expect(boilingPoint('alcohol', 3)).toBe(97);
    expect(boilingPoint('alcohol', 1.5)).toBeCloseTo(71.5, 6);
    expect(Number.isNaN(boilingPoint('aldehyde', 9))).toBe(true);
    expect(boilingPoint('acid', 3)).toBeGreaterThan(boilingPoint('alcohol', 3));
    expect(boilingPoint('alcohol', 3)).toBeGreaterThan(boilingPoint('alkane', 3) + 100);
  });

  it('điện phân Faraday và polymer; dãy điện hóa', () => {
    expect(molElectrons(2, 30)).toBeCloseTo(3600 / 96485, 10);
    expect(productMass(CELLS.cuso4, 2, 30)).toBeCloseTo(1.1855, 3);
    expect(productMass(CELLS.al2o3, 2, 30)).toBeCloseTo((3600 / 96485 / 3) * 26.982, 4);
    expect(anodeLitres(CELLS.cuso4, 2, 30)).toBeGreaterThan(0);
    expect(polymerMass(POLYMERS.pe, 10)).toBe(280);
    expect(waterReleased(POLYMERS.nylon, 4)).toBe(7);
    expect(waterReleased(POLYMERS.pe, 4)).toBe(0);
    const e0 = SERIES.map((s) => s[2]);
    expect([...e0].sort((a, b) => a - b)).toEqual(e0);
    expect(cellEmf(-0.76, 0.34)).toBeCloseTo(1.1, 10);
  });
});

describe('Hóa: giao diện', () => {
  it('cấu hình electron: đổi Z sang 24 hiện 3d⁵ 4s¹ và 6 electron độc thân', () => {
    const r = mount('CHEM_ATOM_STRUCTURE');
    fireEvent.change(r.getByTestId('scene-param-z'), {target: {value: '24'}});
    expect(ro(r, 0)).toContain('3d⁵ 4s¹');
    expect(ro(r, 1)).toMatch(/^6 ·/);
  });

  it('liên kết: CO₂ có liên kết phân cực; chọn NaCl hiện ion', () => {
    const r = mount('CHEM_BONDING');
    fireEvent.change(r.getByTestId('scene-param-m'), {target: {value: 'CO2'}});
    expect(ro(r, 1)).toContain('phân cực');
    expect(ro(r, 2)).toContain('thẳng');
    fireEvent.change(r.getByTestId('scene-param-m'), {target: {value: 'NaCl'}});
    expect(ro(r, 1)).toContain('ion');
  });

  it('bảng tuần hoàn: chạm Fe xem chi tiết; tô theo độ âm điện; chạm lại bỏ chọn', () => {
    const r = mount('CHEM_PERIODIC_TABLE');
    fireEvent.click(r.getByTestId('table-cell-Fe'));
    expect(r.getByTestId('table-detail').textContent).toContain('Iron');
    expect(r.getByTestId('table-detail').textContent).toContain('55,845');
    fireEvent.click(r.getByTestId('table-colorby-en'));
    expect(r.getByTestId('table-lab').getAttribute('data-colorby')).toBe('en');
    const bgF = (r.getByTestId('table-cell-F') as HTMLElement).style.background;
    const bgCs = (r.getByTestId('table-cell-Cs') as HTMLElement).style.background;
    expect(bgF).not.toBe(bgCs);
    fireEvent.click(r.getByTestId('table-cell-Fe'));
    expect(r.getByTestId('table-lab').getAttribute('data-selected')).toBe('');
  });

  it('ống nghiệm ảo: nhỏ NaOH vào Cu²⁺ ra Cu(OH)₂; cho dư thì Al(OH)₃ tan', () => {
    const r = mount('CHEM_VIRTUAL_TESTTUBE');
    expect(ro(r, 0)).toContain('chưa nhỏ');
    fireEvent.click(r.getByTestId('scene-toggle-mix'));
    expect(ro(r, 0)).toContain('Cu(OH)₂');
    fireEvent.change(r.getByTestId('scene-param-sol'), {target: {value: 'Al'}});
    expect(ro(r, 0)).toContain('tan khi cho NaOH dư');
    fireEvent.click(r.getByTestId('scene-toggle-excess'));
    expect(ro(r, 0)).toContain('tan trong NaOH dư');
  });

  it('halogen: Br⁻ + AgNO₃ ra AgBr vàng nhạt; Br⁻ + nước clo ra Br₂', () => {
    const r = mount('CHEM_HALOGEN_LAB');
    fireEvent.click(r.getByTestId('scene-toggle-mix'));
    expect(ro(r, 0)).toContain('AgBr');
    fireEvent.change(r.getByTestId('scene-param-reagent'), {target: {value: 'cl2'}});
    expect(ro(r, 0)).toContain('Br₂');
  });

  it('điện phân: tăng thời gian tăng khối lượng đồng; Al₂O₃ cho nhôm', () => {
    const r = mount('CHEM_ELECTROLYSIS');
    const m1 = Number(ro(r, 2).split(' g ')[0].replace(',', '.'));
    fireEvent.change(r.getByTestId('scene-param-tm'), {target: {value: '60'}});
    const m2 = Number(ro(r, 2).split(' g ')[0].replace(',', '.'));
    expect(m2).toBeCloseTo(2 * m1, 1);
    fireEvent.change(r.getByTestId('scene-param-cell'), {target: {value: 'al2o3'}});
    expect(ro(r, 2)).toContain('Al');
  });

  it('oxi hóa khử và polymer: nylon giải phóng nước', () => {
    const r = mount('CHEM_REDOX');
    expect(ro(r, 0)).toContain('Zn');
    fireEvent.change(r.getByTestId('scene-param-r'), {target: {value: 'mgo2'}});
    expect(ro(r, 1)).toBe('4');
    cleanup();
    const p = mount('CHEM_POLYMER');
    fireEvent.change(p.getByTestId('scene-param-p'), {target: {value: 'nylon'}});
    fireEvent.change(p.getByTestId('scene-param-n'), {target: {value: '4'}});
    expect(ro(p, 2)).toBe('7');
  });

  it('xà phòng: nước cứng làm giảm số phân tử bám dầu; thử màu ngọn lửa; phổ', () => {
    const r = mount('CHEM_LIPID_SOAP');
    expect(ro(r, 0)).toBe('24');
    fireEvent.click(r.getByTestId('scene-toggle-hard'));
    expect(Number(ro(r, 0))).toBeLessThan(24);
    cleanup();
    const f = mount('CHEM_ALKALI_EARTH');
    fireEvent.change(f.getByTestId('scene-param-ion'), {target: {value: 'K'}});
    expect(ro(f, 0)).toBe('tím');
    cleanup();
    const s = mount('CHEM_SPECTRA');
    fireEvent.change(s.getByTestId('scene-param-mode'), {target: {value: 'ms'}});
    expect(ro(s, 1)).toContain('m/z = 46');
  });

  it('các preset đồ thị hóa dựng đúng: năng lượng và Arrhenius đọc được giá trị', () => {
    const r = render(<SimulationWidget blueprint={makePresetBlueprint('CHEM_ENERGETICS')} />);
    expect(r.getByTestId('curve-readout-0').textContent).toContain('tỏa nhiệt');
    fireEvent.change(r.getByTestId('curve-param-dH'), {target: {value: '60'}});
    expect(r.getByTestId('curve-readout-0').textContent).toContain('thu nhiệt');
    cleanup();
    const k = render(<SimulationWidget blueprint={makePresetBlueprint('CHEM_KINETICS')} />);
    const before = k.getByTestId('curve-readout-0').textContent;
    fireEvent.change(k.getByTestId('curve-param-T'), {target: {value: '350'}});
    expect(k.getByTestId('curve-readout-0').textContent).not.toBe(before);
  });

  it('quy trình hóa: sản xuất H₂SO₄ có 5 bước và nhãn hơi/khí đổi theo bước', () => {
    const r = mount('CHEM_INDUSTRIAL_PROCESS');
    expect(r.getByTestId('process-item-gas').getAttribute('data-label')).toBe('SO₂');
    fireEvent.click(r.getByTestId('process-next'));
    expect(r.getByTestId('process-item-gas').getAttribute('data-label')).toBe('SO₃');
    fireEvent.click(r.getByTestId('process-next'));
    expect(r.getByTestId('process-item-gas').getAttribute('data-label')).toBe('oleum');
  });

  it('tháp chưng cất và lò cao: chạm phân đoạn hiện khoảng sôi / phản ứng', () => {
    const r = mount('CHEM_SEPARATION');
    fireEvent.click(r.getByTestId('anatomy-part-diesel'));
    expect(r.getByTestId('anatomy-info').textContent).toContain('250–350');
    cleanup();
    const f = mount('CHEM_METALLURGY');
    fireEvent.click(f.getByTestId('anatomy-part-zone3'));
    expect(f.getByTestId('anatomy-info').textContent).toContain('FeO + CO → Fe + CO₂');
  });
});
