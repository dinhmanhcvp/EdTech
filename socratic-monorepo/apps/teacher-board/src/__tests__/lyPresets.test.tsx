import React from 'react';
import {describe, it, expect, afterEach, vi} from 'vitest';
import {render, cleanup, fireEvent, act} from '@testing-library/react';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import {makePresetBlueprint} from '../utils/presets';
import {atwood, boatDynamics, cartAccel, collide, measureStats, measurements, resultant, shmX, slideAccel, springEq, tensions, orbitPeriodH} from '../utils/presets/lyScene1';
import {alphaPath, bounce, chainPopulation, circuit, closestApproach, coulomb, criticalRod, effectiveK, emfPeak, fieldLines, lorentzRadius, scatterAngle} from '../utils/presets/lyScene2';
import {bindingPeak, bindingPerNucleon, fringeSpacing, heatCurve, heatStages, toF, toK, transmissionLoss, youngIntensity} from '../utils/presets/lyCurve';

afterEach(cleanup);
const mount = (id: string) => render(<SimulationWidget blueprint={makePresetBlueprint(id)} />);
const ro = (r: ReturnType<typeof mount>, i: number) => r.getByTestId(`scene-readout-${i}`).textContent!;

describe('Vật lí: công thức lõi', () => {
  it('lực: 3 N ⟂ 4 N cho 5 N; vật treo đối xứng 45° có T = P/√2; lệch góc thì dây gần ngang căng hơn', () => {
    expect(resultant(3, 4, 90)).toBeCloseTo(5, 10);
    expect(resultant(5, 5, 0)).toBeCloseTo(10, 10);
    expect(resultant(5, 5, 180)).toBeCloseTo(0, 10);
    const [a, b] = tensions(10, 45, 45);
    expect(a).toBeCloseTo(10 / Math.SQRT2, 10);
    expect(b).toBeCloseTo(a, 10);
    expect(tensions(10, 80, 80)[0]).toBeGreaterThan(tensions(10, 30, 30)[0]);
  });

  it('va chạm: hai vật bằng nhau đàn hồi đổi vận tốc; mềm thì cùng vận tốc; động lượng bảo toàn', () => {
    expect(collide(2, 5, 2, 0, 1)).toEqual([0, 5]);
    const [u1, u2] = collide(4, 5, 2, -1, 0);
    expect(u1).toBeCloseTo(u2, 10);
    expect(u1).toBeCloseTo((4 * 5 - 2) / 6, 10);
    const [v1, v2] = collide(4, 5, 2, -1, 0.6);
    expect(4 * v1 + 2 * v2).toBeCloseTo(4 * 5 - 2, 10);
  });

  it('Newton: Atwood a = (m₁−m₂)g/(m₁+m₂); xe không chuyển động khi F ≤ μmg; dốc không ma sát a = g sin α', () => {
    expect(atwood(3, 1).a).toBeCloseTo(4.9, 10);
    expect(atwood(2, 2).a).toBe(0);
    expect(cartAccel(5, 5, 0.2)).toBe(0);
    expect(cartAccel(30, 5, 0.2)).toBeCloseTo((30 - 9.8) / 5, 10);
    expect(slideAccel(30, 0)).toBeCloseTo(4.9, 10);
    expect(slideAccel(10, 0.5)).toBe(0);
  });

  it('lò xo: nối tiếp 100 và 200 cho 66,7; song song 300', () => {
    expect(springEq('series', 100, 200)).toBeCloseTo(66.667, 3);
    expect(springEq('parallel', 100, 200)).toBe(300);
    expect(springEq('single', 100, 200)).toBe(100);
  });

  it('thuyền: lái vuông góc thì qua nhanh nhất; lái ngược dòng với sin θ = −vr/vb thì không trôi', () => {
    const d = boatDynamics(5, 3, 0, 100);
    expect(d.T).toBeCloseTo(20, 10);
    expect(d.drift).toBeCloseTo(60, 10);
    const th = -(Math.asin(3 / 5) * 180) / Math.PI;
    expect(boatDynamics(5, 3, th, 100).drift).toBeCloseTo(0, 6);
    expect(boatDynamics(5, 3, th, 100).T).toBeGreaterThan(d.T);
  });

  it('sai số phép đo: ΔA toàn phần = trung bình |Aᵢ − Ā| + nửa độ chia; nhiều lần đo không làm tăng sai số dụng cụ', () => {
    const v = [9.9, 10.1, 10, 10.2, 9.8];
    const s = measureStats(v, 0.1);
    expect(s.mean).toBeCloseTo(10, 10);
    expect(s.dA).toBeCloseTo(0.12, 10);
    expect(s.total).toBeCloseTo(0.17, 10);
    expect(measurements(10, 0.1, 12, 0.2)).toHaveLength(12);
    expect(measurements(10, 0.1, 12, 0.2)).toEqual(measurements(10, 0.1, 12, 0.2));
  });

  it('dao động điều hòa: sau một chu kì li độ trở lại; tắt dần giảm biên độ; vệ tinh địa tĩnh chu kì ≈ 24 h', () => {
    expect(shmX(6, 2, 0, 0)).toBeCloseTo(6, 10);
    expect(shmX(6, 2, 0, 1)).toBeCloseTo(-6, 10);
    expect(shmX(6, 2, 0, 2)).toBeCloseTo(6, 10);
    expect(Math.abs(shmX(6, 2, 0, 4, 0.2))).toBeLessThan(6 * Math.exp(-0.8) + 1e-9);
    expect(orbitPeriodH(35786)).toBeCloseTo(23.93, 1);
  });

  it('điện: Coulomb 3 µC, −3 µC cách 0,5 m hút 0,324 N; công suất ngoài cực đại khi R = r; Ohm toàn mạch', () => {
    expect(coulomb(3, -3, 0.5)).toBeCloseTo(-0.324, 3);
    expect(Math.abs(coulomb(3, 3, 1.0))).toBeCloseTo(Math.abs(coulomb(3, 3, 0.5)) / 4, 10);
    const c = circuit('series', 12, 1, 10, 20);
    expect(c.I).toBeCloseTo(12 / 31, 10);
    expect(c.U).toBeCloseTo(12 - 12 / 31, 10);
    expect(circuit('parallel', 12, 1, 10, 10).Rn).toBe(5);
    let best = 0;
    let bestR = 0;
    for (let R = 0.1; R <= 10; R += 0.1) {
      const pw = circuit('series', 12, 2, R, 0).P;
      if (pw > best) [best, bestR] = [pw, R];
    }
    expect(bestR).toBeCloseTo(2, 1);
  });

  it('từ trường và cảm ứng: bán kính Lorentz electron, suất điện động cực đại, lực giữa hai dây', () => {
    expect(lorentzRadius(1e6, 1e-3)).toBeCloseTo(5.686e-3, 5);
    expect(emfPeak(100, 0.5, 200, 2)).toBeCloseTo(100 * 0.5 * 0.02 * 2 * Math.PI * 2, 8);
  });

  it('tán xạ Rutherford: d₀ = 45,5 fm với vàng 5 MeV; b = d₀/2 lệch 90°; b nhỏ bật ngược, b lớn gần như đi thẳng', () => {
    const d0 = closestApproach(79, 5);
    expect(d0).toBeCloseTo(45.5, 1);
    expect(scatterAngle(d0, d0 / 2)).toBeCloseTo(90, 6);
    const back = alphaPath(d0, 2.5);
    expect(back[back.length - 1][0]).toBeLessThan(0);
    const far = alphaPath(d0, 48);
    expect(far[far.length - 1][0]).toBeGreaterThan(100);
    const thomson = alphaPath(0.04, 10);
    expect(Math.abs(thomson[thomson.length - 1][1] - 10)).toBeLessThan(2);
  });

  it('phân hạch: k = 1 giữ nguyên, k > 1 tăng, thanh điều khiển đưa về tới hạn', () => {
    expect(chainPopulation(1, 8)).toBe(1);
    expect(chainPopulation(1.3, 5)).toBeCloseTo(3.71293, 5);
    const rod = criticalRod(1.3);
    expect(effectiveK(1.3, rod)).toBeCloseTo(1, 10);
    expect(effectiveK(1.3, 100)).toBeLessThan(1);
  });

  it('khí và đường sức: phản xạ qua thành, đường sức đi từ + sang −', () => {
    expect(bounce(5, 10)).toBe(5);
    expect(bounce(12, 10)).toBe(8);
    expect(bounce(25, 10)).toBe(5);
    const lines = fieldLines([{x: 100, y: 100, q: 3}, {x: 200, y: 100, q: -3}], [0, 0, 300, 200], 12);
    expect(lines.length).toBeGreaterThan(8);
    expect(lines.some((l) => Math.hypot(l[l.length - 1][0] - 200, l[l.length - 1][1] - 100) < 12)).toBe(true);
  });

  it('nhiệt: đồ thị đun băng có hai bậc thềm; thang nhiệt độ; Young; biến áp; liên kết hạt nhân', () => {
    const st = heatStages(1);
    expect(st.q[0]).toBeCloseTo(42, 6);
    expect(st.q[1]).toBeCloseTo(334, 6);
    expect(heatCurve(st.q[0] + 100, 1)).toBeCloseTo(0, 6);
    expect(heatCurve(st.q[0] + st.q[1] + st.q[2] / 2, 1)).toBeCloseTo(50, 3);
    expect(heatCurve(st.total, 1)).toBeCloseTo(120, 3);
    expect(toK(0)).toBeCloseTo(273.15, 10);
    expect(toF(100)).toBeCloseTo(212, 10);
    expect(fringeSpacing(600, 1, 2)).toBeCloseTo(1.2, 10);
    expect(youngIntensity(0, 600, 1, 2)).toBe(1);
    expect(youngIntensity(0.6, 600, 1, 2)).toBeCloseTo(0, 10);
    expect(transmissionLoss(100, 10, 110)).toBeCloseTo(0.0826, 3);
    expect(transmissionLoss(100, 10, 220)).toBeCloseTo(transmissionLoss(100, 10, 110) / 4, 10);
    const peak = bindingPeak();
    expect(peak.A).toBeGreaterThan(50);
    expect(peak.A).toBeLessThan(70);
    expect(peak.value).toBeGreaterThan(8.3);
    expect(bindingPerNucleon(238)).toBeLessThan(peak.value);
    expect(bindingPerNucleon(12)).toBeLessThan(peak.value);
  });
});

describe('Vật lí: giao diện', () => {
  it('chuyển động thẳng: rơi tự do từ 20 m mất 2,02 s, chạm đất 19,8 m/s', () => {
    const r = mount('PHYS_KINEMATICS_1D');
    fireEvent.change(r.getByTestId('scene-param-m'), {target: {value: 'fall'}});
    expect(ro(r, 2)).toContain('2,02');
    expect(ro(r, 2)).toContain('19,8');
    fireEvent.change(r.getByTestId('scene-time'), {target: {value: '1'}});
    expect(ro(r, 0)).toContain('9,8');
  });

  it('tổng hợp lực: hai lực vuông góc 6 N và 8 N cho 10 N', () => {
    const r = mount('PHYS_FORCE_COMPOSITION');
    fireEvent.change(r.getByTestId('scene-param-F1'), {target: {value: '6'}});
    fireEvent.change(r.getByTestId('scene-param-F2'), {target: {value: '8'}});
    fireEvent.change(r.getByTestId('scene-param-a'), {target: {value: '90'}});
    expect(ro(r, 0)).toContain('10');
  });

  it('đòn bẩy: m₁d₁ = m₂d₂ cho trạng thái cân bằng', () => {
    const r = mount('PHYS_MOMENT_LEVER');
    fireEvent.change(r.getByTestId('scene-param-m1'), {target: {value: '4'}});
    fireEvent.change(r.getByTestId('scene-param-d1'), {target: {value: '2'}});
    fireEvent.change(r.getByTestId('scene-param-m2'), {target: {value: '2'}});
    fireEvent.change(r.getByTestId('scene-param-d2'), {target: {value: '4'}});
    expect(ro(r, 2)).toMatch(/^0 N·m|^0,0 N·m/);
    expect(r.container.textContent).toContain('CÂN BẰNG');
  });

  it('nút Chạy làm thời gian tăng; kéo thanh thời gian thì dừng', () => {
    vi.useFakeTimers();
    try {
      const r = mount('PHYS_SHM');
      expect((r.getByTestId('scene-time') as HTMLInputElement).value).toBe('0');
      fireEvent.click(r.getByTestId('scene-play'));
      act(() => { vi.advanceTimersByTime(1000); });
      expect(Number((r.getByTestId('scene-time') as HTMLInputElement).value)).toBeGreaterThan(0.5);
      fireEvent.change(r.getByTestId('scene-time'), {target: {value: '1'}});
      expect(r.getByTestId('scene-play').textContent).toBe('Chạy');
      expect(ro(r, 0)).toContain('-6');
    } finally {
      vi.useRealTimers();
    }
  });

  it('máy Atwood và xe: đổi chế độ đổi gia tốc', () => {
    const r = mount('PHYS_NEWTON_LAWS');
    expect(ro(r, 0)).toContain('4,04');
    fireEvent.change(r.getByTestId('scene-param-mode'), {target: {value: 'atwood'}});
    expect(ro(r, 0)).toContain('2,45');
  });

  it('dao động kí: T thực 2 ms với 500 Hz; thang 0,5 ms/ô cho 4 ô', () => {
    const r = mount('PHYS_OSCILLOSCOPE');
    expect(ro(r, 0)).toContain('2 ms');
    expect(ro(r, 1)).toContain('4 ô');
  });

  it('thang sóng điện từ: chạm ô hồng ngoại hiện ứng dụng; tô theo bước sóng đổi chế độ màu', () => {
    const r = mount('PHYS_EM_SPECTRUM');
    expect(r.getByTestId('table-detail').textContent).toContain('Chạm một ô');
    fireEvent.click(r.getByTestId('table-cell-ir'));
    expect(r.getByTestId('table-detail').textContent).toContain('camera nhiệt');
    fireEvent.click(r.getByTestId('table-colorby-loglam'));
    expect(r.getByTestId('table-lab').getAttribute('data-colorby')).toBe('loglam');
    fireEvent.click(r.getByTestId('table-cell-ir'));
    expect(r.getByTestId('table-lab').getAttribute('data-selected')).toBe('');
  });

  it('Young: khoảng vân 1,2 mm với λ = 600 nm, a = 1 mm, D = 2 m', () => {
    const r = render(<SimulationWidget blueprint={makePresetBlueprint('PHYS_YOUNG_INTERFERENCE')} />);
    expect(r.getByTestId('curve-readout-0').textContent).toContain('1,2');
  });

  it('phân hạch: tăng độ cắm thanh đưa lò từ trên tới hạn xuống dưới tới hạn', () => {
    const r = mount('PHYS_FISSION_REACTOR');
    expect(r.container.textContent).toContain('trên tới hạn');
    fireEvent.change(r.getByTestId('scene-param-rod'), {target: {value: '100'}});
    expect(r.container.textContent).toContain('dưới tới hạn');
  });
});
