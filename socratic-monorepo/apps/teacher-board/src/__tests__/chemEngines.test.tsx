import React from 'react';
import {describe, it, expect} from 'vitest';
import {render, screen, fireEvent, act} from '@testing-library/react';
import type {SimulationBlueprint} from '@socratic/types';
import {VseprEngine, LeChatelierEngine, DaniellEngine} from '../engines/ChemEngines';
import {routeLocally} from '../utils/localRouter';

const bp = (text: string) => routeLocally(text) as SimulationBlueprint;

describe('định tuyến Hóa học', () => {
  it('công thức, cân bằng NO₂/N₂O₄, pin Daniell', () => {
    expect(bp('H2O').templateId).toBe('CHEM_MOLECULE_3D');
    expect(bp('2NO2 ⇌ N2O4').templateId).toBe('CHEM_LE_CHATELIER_GAS');
    expect(bp('Pin Daniell').templateId).toBe('CHEM_GALVANIC_DANIELL');
    expect(bp('Pin Mg - Cu').meta).toEqual({anode: 'Mg', cathode: 'Cu'});
  });
  it('không bắt nhầm phương trình hóa học thường', () => {
    expect(routeLocally('Fe + O2 -> Fe2O3')).toBeNull();
    expect(routeLocally('6CO2 + 6H2O -> C6H12O6 + 6O2')).toBeNull();
  });
});

describe('VseprEngine', () => {
  it('H₂O: gấp khúc, phân cực, 2 cặp e riêng; đổi sang CO₂ → thẳng, không phân cực', () => {
    render(<VseprEngine blueprint={bp('H2O')} />);
    const root = () => screen.getByTestId('vsepr-engine');
    expect(root().dataset.shape).toBe('gấp khúc (chữ V)');
    expect(root().dataset.polar).toBe('true');
    expect(screen.getAllByTestId('lone-pair')).toHaveLength(2);
    expect(screen.getByTestId('vsepr-angle').textContent).toContain('104');
    fireEvent.change(screen.getByTestId('vsepr-select'), {target: {value: 'CO2'}});
    expect(root().dataset.shape).toBe('thẳng');
    expect(root().dataset.polar).toBe('false');
    expect(screen.queryAllByTestId('lone-pair')).toHaveLength(0);
  });

  it('bật/tắt cặp e riêng và vectơ lưỡng cực', () => {
    render(<VseprEngine blueprint={bp('NH3')} />);
    expect(screen.getAllByTestId('lone-pair')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('vsepr-lone'));
    expect(screen.queryAllByTestId('lone-pair')).toHaveLength(0);
    expect(screen.queryByTestId('dipole')).toBeNull();
    fireEvent.click(screen.getByTestId('vsepr-dipole'));
    expect(screen.getByTestId('dipole')).toBeTruthy();
  });
});

describe('LeChatelierEngine', () => {
  it('nén piston: màu đậm lên ngay rồi chuyển dịch thuận', async () => {
    render(<LeChatelierEngine blueprint={bp('Le Chatelier')} />);
    const root = () => screen.getByTestId('lc-engine');
    const before = parseFloat(root().dataset.color!);
    await act(async () => {
      fireEvent.click(screen.getByTestId('lc-compress'));
    });
    const now = root();
    expect(parseFloat(now.dataset.color!)).toBeGreaterThan(before); // nồng độ tăng ngay
    expect(now.dataset.shift).toBe('forward');
    expect(screen.getByTestId('lc-shift').textContent).toContain('THUẬN');
  });

  it('đun nóng chuyển dịch nghịch; đặt lại về cân bằng ban đầu', async () => {
    render(<LeChatelierEngine blueprint={bp('Le Chatelier')} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('lc-heat'));
    });
    expect(screen.getByTestId('lc-engine').dataset.shift).toBe('reverse');
    await act(async () => {
      fireEvent.click(screen.getByTestId('lc-reset'));
    });
    expect(screen.getByTestId('lc-engine').dataset.shift).toBe('none');
  });
});

describe('DaniellEngine', () => {
  it('Zn–Cu: E° = 1,100 V; tăng [Zn²⁺] làm E giảm; đổi cặp kim loại đổi E°', () => {
    render(<DaniellEngine blueprint={bp('Pin Daniell')} />);
    const root = () => screen.getByTestId('daniell-engine');
    expect(root().dataset.e0).toBe('1.100');
    expect(parseFloat(root().dataset.e!)).toBeCloseTo(1.1, 3);
    fireEvent.change(screen.getByTestId('daniell-can'), {target: {value: '0.3'}});
    expect(parseFloat(root().dataset.e!)).toBeLessThan(1.1);
    fireEvent.change(screen.getByTestId('daniell-anode'), {target: {value: 'Mg'}});
    expect(root().dataset.e0).toBe('2.710');
    expect(root().dataset.anode).toBe('Mg');
  });

  it('đóng mạch bật công tắc; cực trùng bị từ chối', () => {
    render(<DaniellEngine blueprint={bp('Pin Daniell')} />);
    expect(screen.getByTestId('daniell-engine').dataset.closed).toBe('false');
    fireEvent.click(screen.getByTestId('daniell-toggle'));
    expect(screen.getByTestId('daniell-engine').dataset.closed).toBe('true');
    fireEvent.change(screen.getByTestId('daniell-anode'), {target: {value: 'Cu'}}); // trùng với catot Cu
    expect(screen.getByTestId('daniell-engine').dataset.anode).toBe('Zn');
  });
});
