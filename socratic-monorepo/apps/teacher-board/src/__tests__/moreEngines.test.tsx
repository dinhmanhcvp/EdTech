import React from 'react';
import {describe, it, expect} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import type {SimulationBlueprint} from '@socratic/types';
import {StomataEngine, OsmosisEngine, OperonLacEngine, BoxplotEngine, VariationTableEngine} from '../engines/MoreStemEngines';
import {routeLocally} from '../utils/localRouter';

const bp = (text: string) => routeLocally(text) as SimulationBlueprint;

describe('MoreStemEngines: hiển thị và tương tác', () => {
  it('khí khổng: đổi nhiệt độ lên 47 °C thì đóng kín', () => {
    render(<StomataEngine blueprint={bp('Khí khổng')} />);
    expect(screen.getByTestId('stomata-engine').dataset.state).toBe('open');
    fireEvent.change(screen.getByTestId('stomata-temp'), {target: {value: '47'}});
    expect(screen.getByTestId('stomata-engine').dataset.state).toBe('closed');
  });

  it('thẩm thấu: thực vật 3 % co nguyên sinh; chuyển hồng cầu 0,1 % thì vỡ', () => {
    render(<OsmosisEngine blueprint={bp('Co nguyên sinh ưu trương 3% NaCl')} />);
    expect(screen.getByTestId('osmosis-engine').dataset.state).toBe('plasmolysis');
    fireEvent.click(screen.getByTestId('osmosis-type-rbc'));
    fireEvent.change(screen.getByTestId('osmosis-c'), {target: {value: '0.1'}});
    expect(screen.getByTestId('osmosis-engine').dataset.state).toBe('burst');
    expect(screen.getByTestId('rbc-burst')).toBeTruthy();
  });

  it('operon Lac: bật/tắt đường và đột biến đổi mức biểu hiện', () => {
    render(<OperonLacEngine blueprint={bp('Operon Lac')} />);
    const root = () => screen.getByTestId('lac-engine');
    expect(root().dataset.expression).toBe('1.00');
    fireEvent.click(screen.getByTestId('lac-glucose'));
    expect(root().dataset.expression).toBe('0.10');
    fireEvent.click(screen.getByTestId('lac-lactose'));
    expect(root().dataset.repressor).toBe('true');
    fireEvent.change(screen.getByTestId('lac-mutant'), {target: {value: 'lacI-'}});
    expect(root().dataset.repressor).toBe('false');
  });

  it('boxplot: phát hiện ngoại lai, kéo giá trị lớn nhất về trong rào thì hết', () => {
    render(<BoxplotEngine blueprint={bp('Biểu đồ hộp của mẫu số liệu: 3, 5, 7, 8, 12, 15, 18, 21, 24, 100')} />);
    expect(screen.getByTestId('boxplot-engine').dataset.outliers).toBe('1');
    fireEvent.change(screen.getByTestId('boxplot-max'), {target: {value: '30'}});
    expect(screen.getByTestId('boxplot-engine').dataset.outliers).toBe('0');
  });

  it('bảng biến thiên: dựng đồ thị, cực trị đúng loại; giá trị sai thì báo lỗi và ẩn đồ thị', () => {
    render(<VariationTableEngine blueprint={bp("bảng biến thiên; x | -∞ -1 1 +∞; y' | + 0 - 0 +; y | -∞ ↗ 3 ↘ -1 ↗ +∞")} />);
    const root = () => screen.getByTestId('variation-engine');
    expect(root().dataset.kinds).toBe('max,min');
    expect(screen.getByTestId('variation-curve')).toBeTruthy();
    fireEvent.change(screen.getByTestId('vt-x-1'), {target: {value: '-3'}}); // x không còn tăng dần
    expect(root().dataset.valid).toBe('false');
    expect(screen.getByTestId('vt-error').textContent).toMatch(/tăng dần/);
    expect(screen.queryByTestId('variation-graph')).toBeNull();
  });
});
