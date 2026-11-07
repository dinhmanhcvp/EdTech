import React from 'react';
import {describe, it, expect, afterEach} from 'vitest';
import {render, cleanup, fireEvent} from '@testing-library/react';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import {makePresetBlueprint} from '../utils/presets';
import {cross3, dot3, distPointLine, intersectAB, sinSolutions, solveSAS, solveSSA} from '../utils/presets/toanScene1';
import {CUBE_QUESTIONS, arrangement, combination, deltaFor, describe as stats, limitN, parseData, riemann, INT_FNS} from '../utils/presets/toanScene2';
import {boxVolume, compound, quadRoots} from '../utils/presets/toanCurve';
import {bayes} from '../utils/presets/toanTrial';

afterEach(cleanup);
const mount = (id: string) => render(<SimulationWidget blueprint={makePresetBlueprint(id)} />);
const ro = (r: ReturnType<typeof mount>, i: number) => r.getByTestId(`scene-readout-${i}`).textContent!;

describe('Toán: phép tính lõi', () => {
  it('sin x = 0,5 có nghiệm 30° và 150°; m = 1 chỉ một nghiệm', () => {
    expect(sinSolutions(0.5)).toEqual([30, 150]);
    expect(sinSolutions(1)).toEqual([90]);
  });

  it('giải tam giác: 3-4-90° cho a = 5; cho a, b, A đếm đúng 0, 1, 2 nghiệm', () => {
    expect(solveSAS(3, 4, 90).a).toBeCloseTo(5, 10);
    expect(solveSSA(6, 8, 40)).toHaveLength(2);
    expect(solveSSA(3, 8, 40)).toHaveLength(0);
    expect(solveSSA(9, 8, 40)).toHaveLength(1);
    const t = solveSSA(6, 8, 40);
    for (const x of t) expect(x.A + x.B + x.C).toBeCloseTo(180, 6);
  });

  it('vectơ: tích có hướng vuông góc cả hai; khoảng cách điểm–đường', () => {
    const a = [2, 0, 1];
    const b = [0, 2, 1];
    const c = cross3(a, b);
    expect(dot3(c, a)).toBe(0);
    expect(dot3(c, b)).toBe(0);
    expect(distPointLine(3, 4, 0, 3, 4)).toBeCloseTo(5, 10);
  });

  it('giao của A = [a1; a2] và B = (b1; b2) có đúng đầu mút đóng/mở', () => {
    expect(intersectAB({a1: -2, a2: 3, b1: 1, b2: 5})).toMatchObject({lo: 1, hi: 3, lc: false, uc: true, empty: false});
    expect(intersectAB({a1: -2, a2: 1, b1: 1, b2: 5}).empty).toBe(true);
  });

  it('đếm: C(5,2) = 10, A(5,2) = 20, C(n,k) = C(n−1,k−1) + C(n−1,k)', () => {
    expect(combination(5, 2)).toBe(10);
    expect(arrangement(5, 2)).toBe(20);
    expect(combination(7, 3)).toBe(combination(6, 2) + combination(6, 3));
  });

  it('thống kê: mẫu 4 5 5 6 7 7 7 8 9 10 12 có Q1 = 5, trung vị 7, Q3 = 9, mốt 7', () => {
    const d = stats(parseData('4 5 5 6 7 7 7 8 9 10 12'));
    expect(d.q1).toBe(5);
    expect(d.median).toBe(7);
    expect(d.q3).toBe(9);
    expect(d.modes).toEqual([7]);
    expect(d.mean).toBeCloseTo(80 / 11, 10);
    expect(parseData('1, 2;x 3.5')).toEqual([1, 2, 3.5]);
  });

  it('Riemann: trung điểm hội tụ về ∫₀⁴ x² dx = 64/3, đầu mút trái nhỏ hơn đầu mút phải với hàm tăng', () => {
    const f = INT_FNS.sq;
    expect(riemann(f, 0, 4, 2000, 'mid')).toBeCloseTo(64 / 3, 4);
    expect(riemann(f, 0, 4, 10, 'left')).toBeLessThan(riemann(f, 0, 4, 10, 'right'));
    expect(f.F(4) - f.F(0)).toBeCloseTo(64 / 3, 10);
  });

  it('ε–δ: với (x²−1)/(x−1), δ ≈ ε; dãy (2n+1)/(n+1) → 2 cần n > 1/ε − 1', () => {
    expect(deltaFor('hole', 0.3)).toBeCloseTo(0.3, 2);
    expect(deltaFor('step', 0.3)).toBe(0);
    expect(limitN(0.2)).toBe(4);
  });

  it('hình lập phương: góc đường–mặt, góc nhị diện, khoảng cách', () => {
    expect(CUBE_QUESTIONS.lineplane.value(1)).toBeCloseTo(35.264, 2);
    expect(CUBE_QUESTIONS.planes.value(1)).toBeCloseTo(54.736, 2);
    expect(CUBE_QUESTIONS.pointplane.value(2)).toBeCloseTo(Math.SQRT2, 6);
    expect(CUBE_QUESTIONS.skew.value(6)).toBeCloseTo(6 / Math.sqrt(6), 6);
  });

  it('tam thức, tối ưu, lãi kép, Bayes', () => {
    expect(quadRoots(1, -2, -3)).toEqual([-1, 3]);
    expect(quadRoots(1, 2, 5)).toEqual([]);
    const a = 18;
    let best = 0;
    let bx = 0;
    for (let x = 0; x <= a / 2; x += 0.01) if (boxVolume(x, a) > best) [best, bx] = [boxVolume(x, a), x];
    expect(bx).toBeCloseTo(a / 6, 1);
    expect(best).toBeCloseTo((2 * a ** 3) / 27, 0);
    expect(compound(100, 7, 10)).toBeCloseTo(196.715, 2);
    expect(bayes(0.01, 0.95, 0.9)).toBeCloseTo(0.0876, 3);
  });
});

describe('Toán: giao diện', () => {
  it('đường tròn lượng giác: α = 90° cho sin = 1; bật giải sin x = m vẽ thêm nghiệm', () => {
    const r = mount('MATH_UNIT_CIRCLE');
    fireEvent.change(r.getByTestId('scene-param-a'), {target: {value: '90'}});
    expect(ro(r, 1)).toMatch(/^1 · 0 · không xác định/);
    const n0 = Number(r.getByTestId('scene-svg').getAttribute('data-shapes'));
    fireEvent.click(r.getByTestId('scene-toggle-eq'));
    expect(Number(r.getByTestId('scene-svg').getAttribute('data-shapes'))).toBeGreaterThan(n0);
    expect(ro(r, 3)).toContain('30°');
  });

  it('giải tam giác: chuyển sang a, b, A mở ra hai tam giác', () => {
    const r = mount('MATH_TRIANGLE_SOLVER');
    fireEvent.change(r.getByTestId('scene-param-mode'), {target: {value: 'ssa'}});
    expect(ro(r, 0)).toBe('2');
    fireEvent.change(r.getByTestId('scene-param-a'), {target: {value: '2'}});
    expect(ro(r, 0)).toBe('0');
    expect(r.container.textContent).toContain('Không có tam giác');
  });

  it('elip: MF₁ + MF₂ luôn bằng 2a khi kéo điểm M', () => {
    const r = mount('MATH_CONIC_LAB');
    for (const t of ['-2', '0', '1.3']) {
      fireEvent.change(r.getByTestId('scene-param-t'), {target: {value: t}});
      const m = ro(r, 1).match(/= ([\d,]+) = 2a = ([\d,]+)/)!;
      expect(m[1]).toBe(m[2]);
    }
  });

  it('thống kê: gõ số mới đổi trung bình; thêm số rất lớn kéo trung bình hơn trung vị', () => {
    const r = mount('MATH_STAT_DESCRIPTIVE');
    const base = ro(r, 0);
    fireEvent.change(r.getByTestId('scene-param-data'), {target: {value: '4 5 5 6 7 7 7 8 9 10 12 100'}});
    const after = ro(r, 0);
    expect(after).not.toBe(base);
    const [, mean, med] = after.split(' · ').map((x) => Number(x.replace(',', '.')));
    expect(mean).toBeGreaterThan(med + 5);
  });

  it('đạo hàm: h nhỏ thì cát tuyến gần tiếp tuyến; Riemann: n lớn sai số nhỏ', () => {
    const r = mount('MATH_DERIVATIVE_LAB');
    fireEvent.change(r.getByTestId('scene-param-h'), {target: {value: '0.01'}});
    expect(Number(ro(r, 2).replace(',', '.'))).toBeLessThan(0.05);
    cleanup();
    const q = mount('MATH_INTEGRAL_AREA');
    fireEvent.change(q.getByTestId('scene-param-method'), {target: {value: 'left'}});
    fireEvent.change(q.getByTestId('scene-param-n'), {target: {value: '2'}});
    const e2 = Number(ro(q, 2).replace(',', '.'));
    fireEvent.change(q.getByTestId('scene-param-n'), {target: {value: '60'}});
    expect(Number(ro(q, 2).replace(',', '.'))).toBeLessThan(e2 / 5);
  });

  it('khảo sát hàm số: các bước hiện dần, bước 3 có bảng biến thiên', () => {
    const r = mount('MATH_FUNCTION_STUDY');
    fireEvent.change(r.getByTestId('scene-param-step'), {target: {value: '1'}});
    expect(r.container.textContent).not.toContain('Bước 2');
    fireEvent.change(r.getByTestId('scene-param-step'), {target: {value: '3'}});
    expect(r.container.textContent).toContain('Bước 2');
    expect(r.container.textContent).toContain('−∞');
  });

  it('mặt bậc hai: nút Chạy xoay (thời gian tăng)', async () => {
    const r = mount('MATH_QUADRIC_SURFACES');
    fireEvent.change(r.getByTestId('scene-time'), {target: {value: '3'}});
    expect(r.getByTestId('scene-svg').getAttribute('data-shapes')).toBeTruthy();
    fireEvent.change(r.getByTestId('scene-param-s'), {target: {value: 'mobius'}});
    expect(ro(r, 0)).toContain('một mặt');
  });

  it('xác suất: Monty Hall đổi cửa thắng gần 2/3, giữ nguyên gần 1/3; tung đồng xu hội tụ về 0,5', () => {
    const r = mount('MATH_PROBABILITY_LAB');
    const freq = () => Number(r.getByTestId('trial-bar-0').getAttribute('data-count')) / Number(r.getByTestId('trial-count').textContent);
    for (let i = 0; i < 3; i++) fireEvent.click(r.getByTestId('trial-run-1000'));
    expect(r.getByTestId('trial-count').textContent).toBe('3000');
    expect(Math.abs(freq() - 0.5)).toBeLessThan(0.05);
    fireEvent.change(r.getByTestId('trial-param-exp'), {target: {value: 'monty'}});
    expect(r.getByTestId('trial-count').textContent).toBe('0');
    for (let i = 0; i < 3; i++) fireEvent.click(r.getByTestId('trial-run-1000'));
    expect(Math.abs(freq() - 2 / 3)).toBeLessThan(0.04);
    fireEvent.change(r.getByTestId('trial-param-strategy'), {target: {value: 'stay'}});
    for (let i = 0; i < 3; i++) fireEvent.click(r.getByTestId('trial-run-1000'));
    expect(Math.abs(freq() - 1 / 3)).toBeLessThan(0.04);
    expect(r.getByTestId('trial-theory-0').textContent).toContain('33,3');
  });

  it('xác suất: tổng hai xúc xắc có 11 kết quả, lí thuyết tổng 7 là 16,7 %', () => {
    const r = mount('MATH_PROBABILITY_LAB');
    fireEvent.change(r.getByTestId('trial-param-exp'), {target: {value: 'sum'}});
    expect(r.container.querySelectorAll('[data-testid^="trial-bar-"]')).toHaveLength(11);
    expect(r.getByTestId('trial-theory-5').textContent).toContain('16,7');
  });
});
