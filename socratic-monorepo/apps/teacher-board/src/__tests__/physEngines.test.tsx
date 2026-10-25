import React from 'react';
import {describe, it, expect} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import type {SimulationBlueprint} from '@socratic/types';
import {GasEngine, DoublePendulumEngine, CoriolisEngine, FraunhoferEngine} from '../engines/PhysEngines';
import {routeLocally} from '../utils/localRouter';

const bp = (text: string) => routeLocally(text) as SimulationBlueprint;

describe('định tuyến Vật lí', () => {
  it('bốn mô hình mới', () => {
    expect(bp('chu trình Carnot').templateId).toBe('PHYS_GAS_STATE_PV');
    expect(bp('chu trình Carnot').meta).toEqual({cycle: 'carnot'});
    expect(bp('con lắc kép').templateId).toBe('PHYS_DOUBLE_PENDULUM');
    expect(bp('lực Coriolis').templateId).toBe('PHYS_CORIOLIS_FORCE');
    expect(bp('nhiễu xạ 7 khe').templateId).toBe('PHYS_FRAUNHOFER_DIFF');
    expect(bp('nhiễu xạ 7 khe').meta).toEqual({N: 7});
    expect(bp('con lắc kép').engine).toBe('PHYSICS');
  });
  it('không bắt nhầm biểu thức thông thường', () => {
    expect(routeLocally('F = ma')).toBeNull();
  });
});

describe('GasEngine', () => {
  it('Carnot: η khớp 1 − Tc/Th; đổi chu trình và loại khí', () => {
    render(<GasEngine blueprint={bp('chu trình Carnot')} />);
    const root = () => screen.getByTestId('gas-engine');
    expect(root().dataset.cycle).toBe('carnot');
    expect(parseFloat(root().dataset.eta!)).toBeCloseTo(0.5, 3); // Th = 600, Tc = 300
    expect(parseFloat(root().dataset.closure!)).toBeLessThan(1e-6);
    fireEvent.change(screen.getByTestId('gas-th'), {target: {value: '900'}});
    expect(parseFloat(root().dataset.eta!)).toBeCloseTo(1 - 300 / 900, 3);
    fireEvent.change(screen.getByTestId('gas-type'), {target: {value: 'di'}});
    expect(parseFloat(root().dataset.eta!)).toBeCloseTo(1 - 300 / 900, 3); // η Carnot không phụ thuộc loại khí
    fireEvent.click(screen.getByTestId('gas-cycle-otto'));
    expect(root().dataset.cycle).toBe('otto');
    expect(parseFloat(root().dataset.eta!)).toBeGreaterThan(0);
    expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(5);
  });
  it('tam giác: chiều thuận sinh công, chiều ngược nhận công (không phải động cơ)', () => {
    render(<GasEngine blueprint={bp('chu trình Carnot')} />);
    fireEvent.click(screen.getByTestId('gas-cycle-triangle'));
    expect(parseFloat(screen.getByTestId('gas-engine').dataset.wnet!)).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('gas-cycle-triangleRev'));
    expect(parseFloat(screen.getByTestId('gas-engine').dataset.wnet!)).toBeLessThan(0);
    expect(screen.getByTestId('gas-eta').textContent).toContain('không phải động cơ');
  });
});

describe('DoublePendulumEngine', () => {
  it('khởi tạo hai con lắc lệch 0,001 rad, có nút thả lại', () => {
    render(<DoublePendulumEngine blueprint={bp('con lắc kép')} />);
    expect(screen.getByTestId('dp-engine')).toBeTruthy();
    expect(screen.getByTestId('dp-svg')).toBeTruthy();
    fireEvent.click(screen.getByTestId('dp-small'));
    fireEvent.click(screen.getByTestId('dp-reset'));
    expect(screen.getByTestId('dp-verdict').textContent).toContain('Còn gần nhau');
  });
});

describe('CoriolisEngine', () => {
  it('đảo dấu ω đổi chiều lệch; hệ quán tính không cong', () => {
    render(<CoriolisEngine blueprint={bp('lực Coriolis')} />);
    const root = () => screen.getByTestId('coriolis-engine');
    expect(screen.getByTestId('cor-text').textContent).toContain('sang phải');
    expect(parseFloat(root().dataset.acor!)).toBeCloseTo(2 * 0.6 * 3, 2);
    fireEvent.change(screen.getByTestId('cor-omega'), {target: {value: '-1.5'}});
    expect(screen.getByTestId('cor-text').textContent).toContain('sang trái');
    fireEvent.click(screen.getByTestId('cor-frame-in'));
    expect(root().dataset.frame).toBe('in');
    expect(screen.getByTestId('cor-text').textContent).toContain('thẳng đều');
    fireEvent.change(screen.getByTestId('cor-omega'), {target: {value: '0'}});
    fireEvent.click(screen.getByTestId('cor-frame-rot'));
    expect(screen.getByTestId('cor-text').textContent).toContain('không lệch');
  });
});

describe('FraunhoferEngine', () => {
  it('N khe cho N − 2 cực đại phụ; d = 2b làm mất bậc 2', () => {
    render(<FraunhoferEngine blueprint={bp('nhiễu xạ 6 khe')} />);
    const root = () => screen.getByTestId('fraunhofer-engine');
    expect(root().dataset.n).toBe('6');
    expect(root().dataset.secondary).toBe('4');
    fireEvent.change(screen.getByTestId('fr-n'), {target: {value: '10'}});
    expect(root().dataset.secondary).toBe('8');
    fireEvent.change(screen.getByTestId('fr-d'), {target: {value: '4'}});
    fireEvent.change(screen.getByTestId('fr-b'), {target: {value: '2'}});
    fireEvent.change(screen.getByTestId('fr-lambda'), {target: {value: '500'}});
    expect(parseInt(root().dataset.missing!, 10)).toBeGreaterThan(0);
    expect(screen.getByTestId('fraunhofer-curve').getAttribute('d')!.length).toBeGreaterThan(100);
  });
});
