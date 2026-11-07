import React from 'react';
import {describe, it, expect, afterEach} from 'vitest';
import {render, cleanup, fireEvent} from '@testing-library/react';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import {makePresetBlueprint} from '../utils/presets';
import {CODONS, CODON_AA, classifyMutation, mutate, transcribe, translate} from '../utils/presets/sinhData';
import {bioAccumulation, driftPath, energyAt, offspring, surfaceToVolume} from '../utils/presets/sinh2Scene';
import {auxinResponse, bacterialLog, conditioning, estrogen, fsh, lh, norm, ovulationDay, phaseOfGrowth, progesterone, respiration, yieldResponse} from '../utils/presets/sinh2Curve';
import {MENDEL_THEORY, testcrossFreq} from '../utils/presets/sinh2Misc';

afterEach(cleanup);
const mount = (id: string) => render(<SimulationWidget blueprint={makePresetBlueprint(id)} />);
const ro = (r: ReturnType<typeof mount>, i: number) => r.getByTestId(`scene-readout-${i}`).textContent!;
const TPL = 'TACGGACTTAAAATT';
const prot = (t: string) => translate(transcribe(t));

describe('Sinh: mã di truyền và đột biến', () => {
  it('bảng mã có 64 codon, 3 mã kết thúc, AUG là Met, UUU là Phe, thoái hóa 61 → 20', () => {
    expect(CODONS).toHaveLength(64);
    expect(CODONS.filter((c) => c.aa === '*').map((c) => c.codon).sort()).toEqual(['UAA', 'UAG', 'UGA']);
    expect(CODON_AA.AUG).toBe('M');
    expect(CODON_AA.UUU).toBe('F');
    expect(new Set(CODONS.filter((c) => c.aa !== '*').map((c) => c.aa)).size).toBe(20);
  });

  it('phiên mã và dịch mã: TAC GGA CTT AAA ATT → AUG CCU GAA UUU UAA → Met–Pro–Glu–Phe–Stop', () => {
    expect(transcribe(TPL)).toBe('AUGCCUGAAUUUUAA');
    expect(prot(TPL)).toEqual(['M', 'P', 'E', 'F', '*']);
  });

  it('đột biến điểm: nhầm nghĩa, vô nghĩa, im lặng và dịch khung', () => {
    const orig = prot(TPL);
    const mis = prot(mutate(TPL, 'sub', 5, 'C'));
    expect(mis.slice(0, 3)).toEqual(['M', 'R', 'E']);
    expect(classifyMutation(orig, mis, 'sub')).toContain('nhầm nghĩa');
    const non = prot(mutate(TPL, 'sub', 7, 'A'));
    expect(non).toEqual(['M', 'P', '*']);
    expect(classifyMutation(orig, non, 'sub')).toContain('vô nghĩa');
    const silent = prot(mutate(TPL, 'sub', 9, 'C'));
    expect(silent).toEqual(orig);
    expect(classifyMutation(orig, silent, 'sub')).toContain('im lặng');
    expect(classifyMutation(orig, prot(mutate(TPL, 'del', 4, 'A')), 'del')).toContain('dịch khung');
    expect(mutate(TPL, 'ins', 3, 'G')).toHaveLength(TPL.length + 1);
    expect(mutate(TPL, 'del', 3, 'G')).toHaveLength(TPL.length - 1);
  });
});

describe('Sinh: công thức lõi', () => {
  it('S/V, năng lượng 10 %, DDT', () => {
    expect(surfaceToVolume(5)).toBeCloseTo(1.2, 10);
    expect(surfaceToVolume(10)).toBeCloseTo(surfaceToVolume(5) / 2, 10);
    expect(energyAt(10000, 10, 2)).toBeCloseTo(100, 8);
    expect(bioAccumulation(0.04, 4)).toBeCloseTo(400, 8);
  });

  it('phả hệ: lặn thường 25 %, trội thường 75 %, liên kết X lặn con trai và con gái', () => {
    expect(offspring('ar', 'c1').affected).toBe(0.25);
    expect(offspring('ad', 'c1').affected).toBe(0.75);
    expect(offspring('ar', 'c3').affected).toBe(0);
    expect(offspring('xr', 'c1')).toMatchObject({son: 0.5, daughter: 0});
    expect(offspring('xr', 'c2')).toMatchObject({son: 0.5, daughter: 0.5});
    expect(offspring('xr', 'c4')).toMatchObject({son: 1, daughter: 0});
  });

  it('phiêu bạt: quần thể nhỏ dao động mạnh hơn lớn; chọn lọc mạnh đưa allele ưu thế gần cố định; kết quả lặp lại được', () => {
    const spread = (N: number) => {
      const finals = Array.from({length: 20}, (_, i) => driftPath(N, 0.5, 0, 0, 100, i + 1).slice(-1)[0]);
      const m = finals.reduce((a, b) => a + b, 0) / finals.length;
      return finals.reduce((a, b) => a + (b - m) ** 2, 0) / finals.length;
    };
    expect(spread(20)).toBeGreaterThan(spread(2000) * 8);
    expect(driftPath(5000, 0.5, 0.2, 0, 100, 1).slice(-1)[0]).toBeGreaterThan(0.95);
    expect(driftPath(50, 0.5, 0, 0, 30, 9)).toEqual(driftPath(50, 0.5, 0, 0, 30, 9));
  });

  it('auxin: rễ nhạy hơn thân, nồng độ cao ức chế', () => {
    expect(auxinResponse(-10, -10)).toBeGreaterThan(90);
    expect(auxinResponse(-5, -10)).toBeLessThan(0);
    expect(auxinResponse(-5, -5)).toBeGreaterThan(90);
    expect(auxinResponse(-1, -5)).toBeLessThan(-50);
  });

  it('chu kì kinh nguyệt: LH đỉnh ở ngày rụng trứng, progesterone đỉnh sau 7 ngày, chu kì dài hơn rụng trứng muộn hơn', () => {
    expect(ovulationDay(28)).toBe(14);
    expect(ovulationDay(35)).toBe(21);
    const argmax = (f: (d: number) => number, len: number) => {
      let best = 0;
      let bd = 0;
      for (let d = 0; d <= len; d += 0.25) if (f(d) > best) [best, bd] = [f(d), d];
      return bd;
    };
    expect(argmax((d) => lh(d, 28), 28)).toBeCloseTo(14, 0);
    expect(argmax((d) => progesterone(d, 28), 28)).toBeCloseTo(21, 0);
    expect(estrogen(13, 28)).toBeGreaterThan(estrogen(3, 28));
    expect(fsh(5, 28)).toBeGreaterThan(fsh(25, 28));
  });

  it('vi khuẩn: tiềm phát giữ nguyên, lũy thừa tăng log10(2)/g mỗi giờ, cân bằng ở sức chứa, suy vong giảm', () => {
    expect(bacterialLog(1, 2, 0.5, 9, 30)).toBe(4);
    expect(bacterialLog(2.5, 2, 0.5, 9, 30)).toBeCloseTo(4 + Math.log10(2), 8);
    expect(bacterialLog(20, 2, 0.5, 9, 30)).toBeCloseTo(9, 8);
    expect(bacterialLog(40, 2, 0.5, 9, 30)).toBeLessThan(9);
    expect(phaseOfGrowth(1, 2, 0.5, 9, 30)).toBe('tiềm phát');
    expect(phaseOfGrowth(5, 2, 0.5, 9, 30)).toBe('lũy thừa');
    expect(phaseOfGrowth(20, 2, 0.5, 9, 30)).toBe('cân bằng');
    expect(phaseOfGrowth(35, 2, 0.5, 9, 30)).toBe('suy vong');
  });

  it('phân bón, hô hấp, phản xạ, mức phản ứng', () => {
    const best = (km: number, kt: number) => Array.from({length: 301}, (_, x) => [x, yieldResponse(x, km, kt)]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    expect(best(30, 200)).toBeGreaterThan(30);
    expect(best(30, 200)).toBeLessThan(200);
    expect(yieldResponse(300, 30, 200)).toBeLessThan(yieldResponse(best(30, 200), 30, 200));
    expect(respiration(30, 2, 1)).toBeGreaterThan(respiration(20, 2, 1) * 1.8);
    expect(respiration(48, 2, 1)).toBeLessThan(respiration(36, 2, 1));
    expect(respiration(30, 2, 0.1)).toBeLessThan(respiration(30, 2, 1) / 5);
    expect(conditioning(10, 0.18, 20)).toBeLessThan(conditioning(20, 0.18, 20));
    expect(conditioning(30, 0.18, 20)).toBeLessThan(conditioning(20, 0.18, 20));
    expect(norm.himalaya(10, 25)).toBeGreaterThan(90);
    expect(norm.himalaya(35, 25)).toBeLessThan(10);
  });

  it('lai hoán vị: f = 0 là liên kết hoàn toàn; tổng xác suất bằng 1; mọi phép lai có tổng bằng 1', () => {
    expect(testcrossFreq(0)).toEqual([0.5, 0.5, 0, 0]);
    expect(testcrossFreq(0.2)).toEqual([0.4, 0.4, 0.1, 0.1]);
    for (const [k, v] of Object.entries(MENDEL_THEORY)) expect(v.probs(0.2).reduce((a, b) => a + b, 0), k).toBeCloseTo(1, 10);
  });
});

describe('Sinh: giao diện', () => {
  it('lai: phân li độc lập cho 9:3:3:1; hoán vị f = 0,2 cho tái tổ hợp ≈ 10 % mỗi loại', () => {
    const r = mount('BIO_MENDEL_EXTENDED');
    const freq = (i: number) => Number(r.getByTestId(`trial-bar-${i}`).getAttribute('data-count')) / Number(r.getByTestId('trial-count').textContent);
    for (let i = 0; i < 5; i++) fireEvent.click(r.getByTestId('trial-run-1000'));
    expect(Math.abs(freq(0) - 9 / 16)).toBeLessThan(0.03);
    expect(Math.abs(freq(3) - 1 / 16)).toBeLessThan(0.02);
    fireEvent.change(r.getByTestId('trial-param-cross'), {target: {value: 'linked'}});
    for (let i = 0; i < 5; i++) fireEvent.click(r.getByTestId('trial-run-1000'));
    expect(Math.abs(freq(0) - 0.4)).toBeLessThan(0.03);
    expect(Math.abs(freq(3) - 0.1)).toBeLessThan(0.03);
  });

  it('di truyền tế bào chất: con luôn theo mẹ', () => {
    const r = mount('BIO_CYTOPLASMIC_INHERITANCE');
    fireEvent.click(r.getByTestId('trial-run-100'));
    expect(r.getByTestId('trial-bar-1').getAttribute('data-count')).toBe('100');
    fireEvent.change(r.getByTestId('trial-param-mother'), {target: {value: 'green'}});
    fireEvent.click(r.getByTestId('trial-run-100'));
    expect(r.getByTestId('trial-bar-0').getAttribute('data-count')).toBe('100');
    expect(r.getByTestId('trial-bar-1').getAttribute('data-count')).toBe('0');
  });

  it('bảng mã: chạm AUG hiện methionine; UAA thuộc nhóm kết thúc; có 64 ô', () => {
    const r = mount('BIO_GENETIC_CODE_TABLE');
    expect(r.container.querySelectorAll('[data-testid^="table-cell-"]')).toHaveLength(64);
    fireEvent.click(r.getByTestId('table-cell-AUG'));
    expect(r.getByTestId('table-detail').textContent).toContain('methionine');
    expect(r.getByTestId('table-cell-UAA').getAttribute('data-group')).toBe('stop');
  });

  it('phiên mã – dịch mã: chuỗi bình thường, đột biến vô nghĩa cắt ngắn chuỗi', () => {
    const r = mount('BIO_TRANSCRIPTION_TRANSLATION');
    expect(ro(r, 0)).toBe('Met – Pro – Glu – Phe – Stop');
    fireEvent.change(r.getByTestId('scene-param-kind'), {target: {value: 'sub'}});
    fireEvent.change(r.getByTestId('scene-param-pos'), {target: {value: '7'}});
    expect(ro(r, 1)).toBe('Met – Pro – Stop');
    expect(ro(r, 2)).toContain('vô nghĩa');
    fireEvent.change(r.getByTestId('scene-param-dna'), {target: {value: 'TAC'}});
    expect(ro(r, 0)).toBe('Met');
  });

  it('phả hệ và nhiễm sắc thể: đổi chế độ đổi kiểu gene; thể ba có 7 NST', () => {
    const r = mount('BIO_PEDIGREE');
    expect(ro(r, 0)).toBe('Aa × Aa');
    fireEvent.change(r.getByTestId('scene-param-mode'), {target: {value: 'xr'}});
    expect(ro(r, 0)).toBe('XᴬXᵃ × XᴬY');
    expect(ro(r, 1)).toContain('50 % · 0 %');
    cleanup();
    const c = mount('BIO_CHROMOSOME');
    fireEvent.change(c.getByTestId('scene-param-k'), {target: {value: 'tri'}});
    expect(c.container.textContent).toContain('7 nhiễm sắc thể');
    fireEvent.change(c.getByTestId('scene-param-k'), {target: {value: 'del'}});
    expect(c.container.textContent).toContain('ABDEFG');
  });

  it('vận chuyển qua màng: thiếu ATP thì bơm không hoạt động; hướng tiến hóa dòng chảy; nhóm tế bào', () => {
    const r = mount('BIO_MEMBRANE_TRANSPORT');
    expect(ro(r, 0)).toContain('xuôi gradient');
    fireEvent.change(r.getByTestId('scene-param-m'), {target: {value: 'active'}});
    expect(ro(r, 0)).toContain('ngược chiều gradient');
    fireEvent.click(r.getByTestId('scene-toggle-atp'));
    expect(ro(r, 0)).toContain('không vận chuyển');
    cleanup();
    const s = mount('BIO_SCALE_CELL_TYPES');
    fireEvent.change(s.getByTestId('scene-param-mode'), {target: {value: 'sv'}});
    expect(ro(s, 0)).toContain('1,2');
  });

  it('hướng động: cắt đỉnh sinh trưởng thì không uốn; tiến hóa quần thể và tháp năng lượng dựng đúng', () => {
    const r = mount('BIO_PLANT_TROPISM');
    expect(ro(r, 0)).toContain('phía được che tối');
    fireEvent.click(r.getByTestId('scene-toggle-tip'));
    expect(ro(r, 0)).toContain('không có');
    cleanup();
    const e = mount('BIO_FOOD_WEB_ENERGY');
    expect(ro(e, 0)).toContain('1.000');
    fireEvent.change(e.getByTestId('scene-param-eff'), {target: {value: '20'}});
    expect(ro(e, 0)).toContain('2.000');
    cleanup();
    const p = mount('BIO_POPULATION_EVOLUTION');
    fireEvent.change(p.getByTestId('scene-param-N'), {target: {value: '1000'}});
    fireEvent.change(p.getByTestId('scene-param-s'), {target: {value: '0.3'}});
    expect(Number(ro(p, 1).split(' · ')[0].replace(',', '.'))).toBeGreaterThan(0.9);
  });

  it('giải phẫu hô hấp, rễ–thân–lá, mắt: chạm bộ phận hiện chú giải đúng', () => {
    const r = mount('BIO_RESPIRATORY_SYSTEM');
    fireEvent.click(r.getByTestId('anatomy-part-alveoli'));
    expect(r.getByTestId('anatomy-info').textContent).toContain('khuếch tán');
    cleanup();
    const w = mount('BIO_WATER_TRANSPORT_PLANT');
    fireEvent.click(w.getByTestId('anatomy-part-xylem'));
    expect(w.getByTestId('anatomy-info').textContent).toContain('ba lực');
    cleanup();
    const e = mount('BIO_SENSE_ORGANS');
    fireEvent.click(e.getByTestId('anatomy-part-lens'));
    expect(e.getByTestId('anatomy-info').textContent).toContain('điều tiết');
  });

  it('đồ thị sinh: chu kì kinh nguyệt đổi ngày rụng trứng theo độ dài chu kì; vi khuẩn đổi pha', () => {
    const r = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_HUMAN_REPRODUCTION')} />);
    expect(r.getByTestId('curve-readout-0').textContent).toContain('ngày 14');
    fireEvent.change(r.getByTestId('curve-param-len'), {target: {value: '32'}});
    expect(r.getByTestId('curve-readout-0').textContent).toContain('ngày 18');
    cleanup();
    const m = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_MICROBE_LAB')} />);
    expect(m.getByTestId('curve-readout-1').textContent).toBe('cân bằng');
  });

  it('quy trình sinh: lên men đi qua các bước và đủ nội dung', () => {
    const r = mount('BIO_METABOLISM_PATHWAYS');
    fireEvent.click(r.getByTestId('process-step-2'));
    expect(r.container.textContent).toContain('Không có O₂');
    fireEvent.click(r.getByTestId('process-step-3'));
    expect(r.container.textContent).toContain('lactate');
  });
});
